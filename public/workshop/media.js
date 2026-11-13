/* Event gallery (trainer): upload photos and short videos for an event, caption them, and mark the
 * ones that should appear on the landing page. Needs account.js (window.WS).
 *
 * Photos are made smaller in the browser before upload, so phone photos of several MB become a few
 * hundred KB: longest side at most 1600 px, WebP (JPEG where the browser cannot write WebP), plus a
 * 480 px thumbnail for the grids. Videos must be short (MAX_VIDEO_SECONDS, MAX_VIDEO_BYTES); they are
 * uploaded as they are, with a still frame as the thumbnail. */
(function () {
  var MAX_SIDE = 1600, THUMB_SIDE = 480, QUALITY = 0.82, THUMB_QUALITY = 0.72;
  var MAX_VIDEO_SECONDS = 90, MAX_VIDEO_BYTES = 40 * 1024 * 1024;
  var DEV = "०१२३४५६७८९";
  var dn = function (s) { return String(s).replace(/[0-9]/g, function (d) { return DEV[d]; }); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var uid = function () { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); };
  var kb = function (n) { return n >= 1048576 ? dn((n / 1048576).toFixed(1)) + " MB" : dn(Math.max(1, Math.round(n / 1024))) + " KB"; };

  function canvasBlob(canvas, type, quality) {
    return new Promise(function (res) { canvas.toBlob(function (b) { res(b); }, type, quality); });
  }
  /* Draw `src` (image bitmap, image or video frame) scaled to fit `side`, and encode it. */
  async function encode(src, w, h, side, quality) {
    var scale = Math.min(1, side / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    var c = document.createElement("canvas"); c.width = cw; c.height = ch;
    var g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(src, 0, 0, cw, ch);
    var blob = await canvasBlob(c, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await canvasBlob(c, "image/jpeg", Math.min(0.9, quality + 0.05));
    return { blob: blob, width: cw, height: ch };
  }
  async function loadImage(file) {
    if (window.createImageBitmap) {
      try { var bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); return { src: bmp, w: bmp.width, h: bmp.height }; } catch (e) {}
    }
    return new Promise(function (res, rej) {
      var img = new Image(); var url = URL.createObjectURL(file);
      img.onload = function () { res({ src: img, w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("यो फोटो पढ्न सकिएन")); };
      img.src = url;
    });
  }
  /* A photo file → { full, thumb } (smaller blobs) with sizes. */
  async function preparePhoto(file) {
    var im = await loadImage(file);
    var full = await encode(im.src, im.w, im.h, MAX_SIDE, QUALITY);
    var thumb = await encode(im.src, im.w, im.h, THUMB_SIDE, THUMB_QUALITY);
    if (im.src.close) im.src.close();
    return { full: full, thumb: thumb };
  }
  /* Any image file → one smaller copy, longest side at most `side` px. */
  async function resize(file, side, quality) {
    var im = await loadImage(file);
    var out = await encode(im.src, im.w, im.h, side, quality || QUALITY);
    if (im.src.close) im.src.close();
    return out;
  }
  /* A video file → duration, size and a still frame as thumbnail (checked against the limits). */
  function prepareVideo(file) {
    return new Promise(function (res, rej) {
      if (file.size > MAX_VIDEO_BYTES) { rej(new Error("भिडियो धेरै ठूलो छ (" + kb(file.size) + ")। " + dn(40) + " MB भन्दा सानो छोटो भिडियो राख्नुहोस्।")); return; }
      var v = document.createElement("video"); var url = URL.createObjectURL(file);
      v.preload = "metadata"; v.muted = true; v.playsInline = true;
      var done = function (err, val) { URL.revokeObjectURL(url); err ? rej(err) : res(val); };
      v.onerror = function () { done(new Error("यो भिडियो खोल्न सकिएन")); };
      v.onloadedmetadata = function () {
        if (v.duration > MAX_VIDEO_SECONDS + 1) { done(new Error("भिडियो लामो छ (" + dn(Math.round(v.duration)) + " सेकेन्ड)। " + dn(MAX_VIDEO_SECONDS) + " सेकेन्डभन्दा छोटो राख्नुहोस्।")); return; }
        v.currentTime = Math.min(1, v.duration / 2);
      };
      v.onseeked = async function () {
        try { var t = await encode(v, v.videoWidth, v.videoHeight, THUMB_SIDE, THUMB_QUALITY); done(null, { width: v.videoWidth, height: v.videoHeight, duration: v.duration, thumb: t }); }
        catch (e) { done(null, { width: v.videoWidth, height: v.videoHeight, duration: v.duration, thumb: null }); }
      };
      v.src = url;
    });
  }

  /* Upload one file for an event; returns the new event_media row. */
  async function uploadOne(eventId, file, onStep) {
    var id = uid(), base = eventId + "/" + id, row;
    if (/^image\//.test(file.type)) {
      onStep("सानो बनाउँदै…");
      var ph = await preparePhoto(file);
      var ext = ph.full.blob.type === "image/webp" ? "webp" : "jpg";
      onStep("अपलोड हुँदैछ… (" + kb(file.size) + " → " + kb(ph.full.blob.size) + ")");
      var u1 = await WS.uploadMedia(base + "." + ext, ph.full.blob, ph.full.blob.type); if (u1.error) throw u1.error;
      var u2 = await WS.uploadMedia(base + "-t." + ext, ph.thumb.blob, ph.thumb.blob.type); if (u2.error) throw u2.error;
      row = { event_id: eventId, kind: "photo", path: base + "." + ext, thumb_path: base + "-t." + ext, width: ph.full.width, height: ph.full.height, bytes: ph.full.blob.size };
    } else if (/^video\//.test(file.type)) {
      onStep("भिडियो जाँच्दै…");
      var vi = await prepareVideo(file);
      var vext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      onStep("अपलोड हुँदैछ… (" + kb(file.size) + ")");
      var v1 = await WS.uploadMedia(base + "." + vext, file, file.type); if (v1.error) throw v1.error;
      var thumbPath = "";
      if (vi.thumb) { var ttype = vi.thumb.blob.type; var t1 = await WS.uploadMedia(base + "-t." + (ttype === "image/webp" ? "webp" : "jpg"), vi.thumb.blob, ttype); if (!t1.error) thumbPath = base + "-t." + (ttype === "image/webp" ? "webp" : "jpg"); }
      row = { event_id: eventId, kind: "video", path: base + "." + vext, thumb_path: thumbPath, width: vi.width, height: vi.height, bytes: file.size };
    } else {
      throw new Error("फोटो वा भिडियो मात्र राख्न मिल्छ");
    }
    var r = await WS.addMedia(row);
    if (r.error) { WS.removeMediaFiles([row.path, row.thumb_path]); throw r.error; }
    return r.data;
  }

  /* ---------- gallery panel ---------- */
  function mount(el, eventId) {
    var items = [];
    el.innerHTML =
      '<div class="gal-drop" id="galDrop"><p><strong>फोटो वा छोटो भिडियो थप्नुहोस्</strong></p>' +
      '<p class="small muted">फोटो अपलोड हुनुअघि यही ब्राउजरमा सानो बनाइन्छ (लामो छेउ ' + dn(MAX_SIDE) + ' px)। भिडियो ' + dn(MAX_VIDEO_SECONDS) + ' सेकेन्ड र ' + dn(40) + ' MB भन्दा सानो हुनुपर्छ। ★ लगाएका मात्र ल्यान्डिङ पेजको ग्यालरीमा देखिन्छन्।</p>' +
      '<label class="btn pri">फाइल छान्नुहोस्<input type="file" id="galFiles" accept="image/*,video/*" multiple hidden></label></div>' +
      '<ul class="gal-queue" id="galQueue"></ul>' +
      '<p class="small muted" id="galCount"></p><div class="gal-grid" id="galGrid">लोड हुँदैछ…</div>';
    var $ = function (id) { return el.querySelector("#" + id); };

    function render() {
      var f = items.filter(function (m) { return m.featured; }).length;
      $("galCount").textContent = items.length ? dn(items.length) + " फाइल · ल्यान्डिङ पेजमा देखिने: " + dn(f) : "";
      if (!items.length) { $("galGrid").innerHTML = '<p class="muted">अहिलेसम्म कुनै फोटो वा भिडियो छैन।</p>'; return; }
      $("galGrid").innerHTML = items.map(function (m) {
        var thumb = WS.publicUrl(m.thumb_path || (m.kind === "photo" ? m.path : ""));
        var media = m.kind === "video"
          ? '<a href="' + esc(WS.publicUrl(m.path)) + '" target="_blank" rel="noopener" class="gal-media gal-video">' + (thumb ? '<img src="' + esc(thumb) + '" alt="" loading="lazy">' : '') + '<span class="gal-play">▶</span></a>'
          : '<a href="' + esc(WS.publicUrl(m.path)) + '" target="_blank" rel="noopener" class="gal-media"><img src="' + esc(thumb) + '" alt="' + esc(m.caption) + '" loading="lazy"></a>';
        return '<figure class="gal-item' + (m.featured ? ' on' : '') + '" data-id="' + esc(m.id) + '">' + media +
          '<figcaption><input type="text" maxlength="140" placeholder="छोटो विवरण (ऐच्छिक)" value="' + esc(m.caption) + '" data-cap="' + esc(m.id) + '">' +
          '<span class="gal-actions"><button type="button" class="gal-star" data-feat="' + esc(m.id) + '" aria-pressed="' + m.featured + '" title="ल्यान्डिङ पेजमा देखाउने">' + (m.featured ? '★ ल्यान्डिङमा' : '☆ ल्यान्डिङमा राख्ने') + '</button>' +
          '<button type="button" class="gal-del" data-del="' + esc(m.id) + '" title="हटाउनुहोस्">हटाउनुहोस्</button></span></figcaption></figure>';
      }).join("");
    }
    async function load() {
      var r = await WS.listMedia(eventId);
      if (r.error) { $("galGrid").textContent = "लोड हुन सकेन: " + r.error.message; return; }
      items = r.data || []; render();
    }
    async function addFiles(files) {
      var list = Array.prototype.slice.call(files);
      for (var i = 0; i < list.length; i++) {
        var file = list[i];
        var li = document.createElement("li"); li.innerHTML = '<span>' + esc(file.name) + '</span> <span class="small muted">पर्खँदै…</span>';
        $("galQueue").appendChild(li);
        var status = li.lastChild;
        try {
          var row = await uploadOne(eventId, file, function (t) { status.textContent = t; });
          status.textContent = "✓ थपियो"; li.className = "ok";
          items.unshift(row); render();
        } catch (e) { status.textContent = "✗ " + ((e && e.message) || e); li.className = "bad"; }
      }
    }
    $("galFiles").addEventListener("change", function (e) { addFiles(e.target.files); e.target.value = ""; });
    var drop = $("galDrop");
    ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

    el.addEventListener("click", async function (e) {
      var f = e.target.closest("[data-feat]"), d = e.target.closest("[data-del]");
      if (f) {
        var m = items.filter(function (x) { return x.id === f.dataset.feat; })[0]; if (!m) return;
        f.disabled = true; var r = await WS.updateMedia(m.id, { featured: !m.featured }); f.disabled = false;
        if (!r.error) { m.featured = !m.featured; render(); }
      }
      if (d) {
        var m2 = items.filter(function (x) { return x.id === d.dataset.del; })[0]; if (!m2) return;
        if (!confirm("यो फाइल हटाउने हो? ल्यान्डिङ पेजबाट पनि हट्छ।")) return;
        var r2 = await WS.deleteMedia(m2.id);
        if (!r2.error) { WS.removeMediaFiles([m2.path, m2.thumb_path]); items = items.filter(function (x) { return x !== m2; }); render(); }
      }
    });
    async function saveCaption(input) {
      var m = items.filter(function (x) { return x.id === input.dataset.cap; })[0]; if (!m || m.caption === input.value.trim()) return;
      var r = await WS.updateMedia(m.id, { caption: input.value.trim() });
      if (!r.error) { m.caption = input.value.trim(); input.classList.add("saved"); setTimeout(function () { input.classList.remove("saved"); }, 1200); }
    }
    el.addEventListener("change", function (e) { if (e.target.dataset && e.target.dataset.cap) saveCaption(e.target); });
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.dataset && e.target.dataset.cap) { e.preventDefault(); e.target.blur(); } });
    load();
  }

  window.EventMedia = { mount: mount, preparePhoto: preparePhoto, resize: resize, prepareVideo: prepareVideo, MAX_SIDE: MAX_SIDE, MAX_VIDEO_SECONDS: MAX_VIDEO_SECONDS };
})();
