/* Class-session bar for teaching (course pages opened with ?teach=1, as the event page's
 * "कक्षा सञ्चालन" tab does): every session and activity of the training, day by day, one tap
 * away, with previous / next, and a session number typed on the keyboard jumps to it
 * (5 → सत्र ५, 1 then 1 → सत्र ११). With ?embed=1 the page's own top bar and side list are
 * hidden, so inside the event page there is a single way to move between sessions.
 *
 *   TeachBar.mount({ days, titleOf, num, lead: [[id, label]], tail: [[id, label]] })
 *   TeachBar.update(currentId)          // from the page's route()
 */
(function () {
  "use strict";
  var q = new URLSearchParams(location.search);
  var TEACH = q.get("teach") === "1", EMBED = q.get("embed") === "1";
  var DEV = "०१२३४५६७८९";
  var toNum = function (v) { if (v == null) return null; var n = parseInt(String(v).replace(/[०-९]/g, function (d) { return DEV.indexOf(d); }), 10); return isNaN(n) ? null : n; };
  var dn = function (s) { return String(s).replace(/[0-9]/g, function (d) { return DEV[+d]; }); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var cfg = null, order = [], bar = null;

  function css() {
    var s = document.createElement("style");
    s.textContent =
      ".tb{position:sticky;top:56px;z-index:30;background:var(--surface);border-bottom:1px solid var(--line);padding:8px 12px;display:grid;grid-template-columns:auto 1fr auto auto auto;gap:8px;align-items:center}" +
      ".tb-size{display:flex;gap:4px;align-items:center}.tb-size button{font:inherit;font-size:14px;font-weight:700;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);min-width:36px;height:34px;cursor:pointer}" +
      ".tb-size span{font-size:12px;color:var(--muted);min-width:38px;text-align:center;font-variant-numeric:tabular-nums}" +
      "body.tb-fit main .wrap{margin-inline:auto}" +
      "body.tb-embed .tb{top:0}" +
      ".tb-rows{min-width:0;display:flex;flex-direction:column;gap:6px}" +
      ".tb-row{display:flex;gap:6px;align-items:center;overflow-x:auto;scrollbar-width:thin;padding-bottom:2px}" +
      ".tb-day{flex:none;font-size:12.5px;font-weight:700;color:var(--muted);min-width:44px}" +
      ".tb a{flex:none;display:inline-flex;align-items:center;gap:6px;max-width:230px;text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:4px 11px;font-size:14.5px;line-height:1.3;background:var(--surface);white-space:nowrap}" +
      ".tb a span{overflow:hidden;text-overflow:ellipsis}" +
      ".tb a b{flex:none;display:inline-grid;place-items:center;min-width:22px;height:22px;border-radius:999px;background:var(--soft,#eef);font-size:13px}" +
      ".tb a:hover{border-color:var(--accent)}" +
      ".tb a[aria-current]{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:700}" +
      ".tb a[aria-current] b{background:rgba(255,255,255,.25);color:#fff}" +
      ".tb a.tb-x{color:var(--muted)}" +
      ".tb-nav{font:inherit;font-size:20px;line-height:1;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);width:40px;height:40px;cursor:pointer}" +
      ".tb-nav[disabled]{opacity:.35;cursor:default}" +
      ".tb-fs{font:inherit;font-size:14px;font-weight:700;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);height:40px;padding:0 12px;cursor:pointer;white-space:nowrap}" +
      ".tb-fs.on{background:var(--accent);border-color:var(--accent);color:#fff}" +
      ".tb-jump{position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);background:rgba(20,30,50,.88);color:#fff;font-size:40px;font-weight:800;padding:14px 30px;border-radius:16px;z-index:99;pointer-events:none}" +
      "body.tb-embed .top,body.tb-embed .side,body.tb-embed .menu-btn{display:none!important}" +
      "body.tb-embed .shell{display:block!important;grid-template-columns:none!important}" +
      "body.tb-embed main .wrap{max-width:980px}" +
      "@media print{.tb{display:none}}";
    document.head.appendChild(s);
  }

  function render(cur) {
    if (!bar || !cfg) return;
    var h = "", idx = order.indexOf(cur);
    var chip = function (id, inner, title, cls) {
      return '<a href="#' + id + '"' + (cls ? ' class="' + cls + '"' : '') + (id === cur ? ' aria-current="page"' : '') + ' title="' + esc(title) + '">' + inner + '</a>';
    };
    var rows = cfg.days.map(function (d, di) {
      var r = '<div class="tb-row"><span class="tb-day">' + (cfg.days.length > 1 ? "दिन " + dn(di + 1) : "सत्रहरू") + '</span>';
      if (di === 0) (cfg.lead || []).forEach(function (x) { r += chip(x[0], '<span>' + esc(x[1]) + '</span>', x[1], "tb-x"); });
      d.items.forEach(function (it) {
        if (it.kind === "break") return;
        var n = cfg.num(it), t = cfg.titleOf(it).replace(/^सत्र\s*[0-9०-९]+\s*:\s*/, "");
        r += chip(it.id, (n != null ? '<b>' + dn(n) + '</b>' : '') + '<span>' + esc(t) + '</span>', (n != null ? "सत्र " + dn(n) + ": " : "") + t + " (" + dn(it.start) + ")");
      });
      if (di === cfg.days.length - 1) (cfg.tail || []).forEach(function (x) { r += chip(x[0], '<span>' + esc(x[1]) + '</span>', x[1], "tb-x"); });
      return r + '</div>';
    }).join("");
    h = '<button type="button" class="tb-nav" id="tbPrev" aria-label="अघिल्लो"' + (idx <= 0 ? ' disabled' : '') + '>‹</button>' +
      '<div class="tb-rows">' + rows + '</div>' +
      '<button type="button" class="tb-nav" id="tbNext" aria-label="अर्को"' + (idx < 0 || idx >= order.length - 1 ? ' disabled' : '') + '>›</button>' +
      '<button type="button" class="tb-fs' + (fsEl() ? ' on' : '') + '" id="tbFull" title="' + (fsEl() ? 'पूरा स्क्रिनबाट बाहिर (Esc)' : 'पूरा स्क्रिन') + '">' + (fsEl() ? '✕ पूरा स्क्रिन बन्द' : '⛶ पूरा स्क्रिन') + '</button>' +
      '<span class="tb-size" role="group" aria-label="अक्षरको आकार"><button type="button" id="tbSmaller" title="सानो (−)">A−</button><span id="tbZoom"></span><button type="button" id="tbBigger" title="ठूलो (+)">A+</button></span>';
    bar.innerHTML = h;
    var on = bar.querySelector("a[aria-current]");
    if (on) { try { on.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {} }
    document.getElementById("tbPrev").onclick = function () { go(idx - 1); };
    document.getElementById("tbNext").onclick = function () { go(idx + 1); };
    document.getElementById("tbSmaller").onclick = function () { setAdj(adj / 1.12); };
    document.getElementById("tbBigger").onclick = function () { setAdj(adj * 1.12); };
    document.getElementById("tbFull").onclick = toggleFull;
    fit();
  }

  /* Fill the screen: the lesson column (about 1000 px) is enlarged to the window's width and kept in the
     middle, so in full screen on a projector the text is large and there is no empty right half.
     A− / A+ (or the − and + keys) adjust it further; the choice is remembered on this device. */
  var adj = 1;
  try { adj = parseFloat(localStorage.getItem("tb-zoom")) || 1; } catch (e) {}
  function fit() {
    if (!bar) return;
    var base = Math.max(1, Math.min(2.4, window.innerWidth / 1100));
    var z = Math.max(0.7, Math.min(3, base * adj));
    var main = document.getElementById("main") || document.querySelector("main");
    document.body.classList.add("tb-fit");
    if (main) main.style.zoom = z.toFixed(3);
    bar.style.zoom = Math.min(z, 1.5).toFixed(3);
    var lab = document.getElementById("tbZoom"); if (lab) lab.textContent = dn(Math.round(z * 100)) + "%";
  }
  function setAdj(v) {
    adj = Math.max(0.6, Math.min(2.5, v));
    try { localStorage.setItem("tb-zoom", String(adj)); } catch (e) {}
    fit();
  }
  /* Full screen can be left at any time: the bar's button, or Esc. Inside the event page the frame is
     what goes full screen, so the parent page's state is checked (same origin). */
  function docs() {
    var list = [document];
    try { if (window.parent !== window && window.parent.document) list.push(window.parent.document); } catch (e) {}
    return list;
  }
  function fsEl() {
    var d = docs();
    for (var i = 0; i < d.length; i++) { var el = d[i].fullscreenElement || d[i].webkitFullscreenElement; if (el) return el; }
    return null;
  }
  function exitFull() {
    docs().forEach(function (d) {
      if (!(d.fullscreenElement || d.webkitFullscreenElement)) return;
      var f = d.exitFullscreen || d.webkitExitFullscreen;
      try { var r = f && f.call(d); if (r && r.catch) r.catch(function () {}); } catch (e) {}
    });
  }
  function toggleFull() {
    if (fsEl()) { exitFull(); return; }
    var el = window.frameElement || document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen;
    try { var r = f && f.call(el); if (r && r.catch) r.catch(function () {}); } catch (e) {}
  }
  function onFsChange() { var b = document.getElementById("tbFull"); if (b) { var on = !!fsEl(); b.classList.toggle("on", on); b.textContent = on ? "✕ पूरा स्क्रिन बन्द" : "⛶ पूरा स्क्रिन"; b.title = on ? "पूरा स्क्रिनबाट बाहिर (Esc)" : "पूरा स्क्रिन"; } fit(); }
  function go(i) { if (i >= 0 && i < order.length) location.hash = order[i]; }

  /* type a session number to jump there */
  var buf = "", timer = null, pop = null;
  function jumpTo(n) {
    var hit = null;
    cfg.days.forEach(function (d) { d.items.forEach(function (it) { if (it.kind !== "break" && toNum(cfg.num(it)) === n) hit = it; }); });
    if (!pop) { pop = document.createElement("div"); pop.className = "tb-jump"; document.body.appendChild(pop); }
    pop.textContent = hit ? "सत्र " + dn(n) : "सत्र " + dn(n) + " छैन"; pop.hidden = false;
    setTimeout(function () { pop.hidden = true; }, 900);
    if (hit) location.hash = hit.id;
  }
  function digit(k) {
    buf += k; clearTimeout(timer);
    timer = setTimeout(function () { var n = parseInt(buf, 10); buf = ""; if (n) jumpTo(n); }, 650);
  }
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var k = /^[0-9]$/.test(e.key) ? e.key : (DEV.indexOf(e.key) >= 0 ? String(DEV.indexOf(e.key)) : null);   // Nepali keyboards type ०-९
    if (e.key === "Escape" && fsEl()) { exitFull(); return; }
    if (k !== null) digit(k);
    else if (e.key === "+" || e.key === "=") setAdj(adj * 1.12);
    else if (e.key === "-" || e.key === "_") setAdj(adj / 1.12);
  }

  window.TeachBar = {
    on: TEACH,
    embed: EMBED,
    mount: function (c) {
      if (EMBED) document.body.classList.add("tb-embed");
      if (!TEACH || bar) return;
      cfg = c; order = [];
      (c.lead || []).forEach(function (x) { order.push(x[0]); });
      c.days.forEach(function (d) { d.items.forEach(function (it) { if (it.kind !== "break") order.push(it.id); }); });
      (c.tail || []).forEach(function (x) { order.push(x[0]); });
      css();
      bar = document.createElement("nav"); bar.className = "tb"; bar.setAttribute("aria-label", "कक्षाका सत्रहरू");
      var shell = document.querySelector(".shell") || document.getElementById("main");
      shell.parentNode.insertBefore(bar, shell);
      document.addEventListener("keydown", onKey);
      // inside the event page, links that leave the training open in a new tab
      if (EMBED) document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
        var href = a.getAttribute("href") || "";
        if (href.charAt(0) === "#" || a.target === "_blank" || a.hasAttribute("download") || /^(blob|data|javascript):/.test(href)) return;
        a.target = "_blank"; a.rel = "noopener";
      }, true);
      render((location.hash || "#home").slice(1) || "home");
      window.addEventListener("resize", fit);
      docs().forEach(function (d) { d.addEventListener("fullscreenchange", onFsChange); d.addEventListener("webkitfullscreenchange", onFsChange); });
    },
    update: function (cur) { if (TEACH) render(cur); },
    key: function (k) {
      if (!TEACH || !cfg) return;
      if (k === "+") setAdj(adj * 1.12); else if (k === "-") setAdj(adj / 1.12); else digit(String(k));
    }   // the event page passes on digits typed while it has the focus
  };
  if (EMBED) { if (document.body) document.body.classList.add("tb-embed"); else document.addEventListener("DOMContentLoaded", function () { document.body.classList.add("tb-embed"); }); }
})();
