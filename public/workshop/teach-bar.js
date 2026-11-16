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
      ".tb{position:sticky;top:56px;z-index:30;background:var(--surface);border-bottom:1px solid var(--line);padding:8px 12px;display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center}" +
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
      '<button type="button" class="tb-nav" id="tbNext" aria-label="अर्को"' + (idx < 0 || idx >= order.length - 1 ? ' disabled' : '') + '>›</button>';
    bar.innerHTML = h;
    var on = bar.querySelector("a[aria-current]");
    if (on) { try { on.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {} }
    document.getElementById("tbPrev").onclick = function () { go(idx - 1); };
    document.getElementById("tbNext").onclick = function () { go(idx + 1); };
  }
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
    if (k !== null) digit(k);
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
    },
    update: function (cur) { if (TEACH) render(cur); },
    key: function (k) { if (TEACH && cfg) digit(String(k)); }   // the event page passes on digits typed while it has the focus
  };
  if (EMBED) { if (document.body) document.body.classList.add("tb-embed"); else document.addEventListener("DOMContentLoaded", function () { document.body.classList.add("tb-embed"); }); }
})();
