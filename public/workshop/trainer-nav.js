/* Trainer navigation, the same shape as the trainee pages: a top bar and a left menu with every
 * training event (and, for the event being viewed, its sections) plus the console sections.
 * The event's own sections are the horizontal tabs on event.html, not repeated here.
 * Used by admin.html and event.html. Needs account.js (WS) and event-info.js (EVI).
 *
 *   TrainerNav.mount({ page: "admin", tab: "events" })
 *   TrainerNav.mount({ page: "event", code: "AIEMP002", tab: "details" })
 *   TrainerNav.setCurrent({ tab: "results" })      // when the page switches tab itself
 *   TrainerNav.refresh()                            // after events change
 */
(function () {
  "use strict";
  var ADMIN = [
    ["users", "दर्ता र सहभागी"], ["packages", "प्रशिक्षण प्याकेज"], ["materials", "तालिम सामग्री"],
    ["results", "सबै इभेन्टको नतिजा र पृष्ठपोषण"], ["landing", "ल्यान्डिङ पेज"]
  ];
  var CACHE = "ws-trainer-nav";
  var state = { page: "admin", tab: "overview", code: "", events: [], packages: [], pending: 0 };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function status(ev) {
    var ds = (ev.event_dates || []).slice().sort(), t = today();
    if (!ds.length) return "";
    if (ds.indexOf(t) >= 0) return "आज";
    if (ds[0] > t) return "आगामी";
    if (ds[ds.length - 1] < t) return "सम्पन्न";
    return "चलिरहेको";
  }
  function courseLabel(ev) {
    var p = state.packages.filter(function (x) { return x.id === ev.package_id; })[0];
    if (!p) return "";
    var c = EVI.courseOf(p.key);
    if (c === "cso") return "AI for CSOs";
    return (c === "representative" ? "जनप्रतिनिधि" : "कर्मचारी") + " · " + (EVI.LEVEL_LABEL[EVI.levelOf(p.key)] || "");
  }
  function sortEvents(list) {
    return list.slice().sort(function (a, b) {
      if (!!b.is_active !== !!a.is_active) return b.is_active ? 1 : -1;
      var da = (a.event_dates || []).slice().sort().pop() || "", db = (b.event_dates || []).slice().sort().pop() || "";
      return db.localeCompare(da);
    });
  }
  function eventUrl(code, tab) { return "/workshop/event.html?event=" + encodeURIComponent(code) + "#" + (tab || "details"); }
  function reportUrl(code) { return "/workshop/assessment/index.html?report=" + encodeURIComponent(code); }

  function css() {
    if (document.getElementById("tn-css")) return;
    var s = document.createElement("style"); s.id = "tn-css";
    s.textContent =
      "body.tn-on{padding-top:56px;padding-left:288px}" +
      ".tn-top{position:fixed;top:0;left:0;right:0;height:56px;display:flex;align-items:center;gap:12px;padding:0 16px;background:var(--surface);border-bottom:1px solid var(--line);z-index:40}" +
      ".tn-brand{font-weight:800;font-size:19px;color:var(--accent);text-decoration:none;white-space:nowrap}" +
      ".tn-brand small{font-weight:600;color:var(--muted);font-size:14px;margin-left:6px}" +
      ".tn-org{color:var(--muted);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}" +
      ".tn-top .tn-act{display:flex;gap:8px;align-items:center;flex:none}" +
      ".tn-top .tn-act a,.tn-top .tn-act button{font:inherit;font-size:14px;border:1px solid var(--line);border-radius:8px;padding:5px 10px;background:var(--surface);color:var(--ink);text-decoration:none;cursor:pointer}" +
      ".tn-menu{display:none;font:inherit;border:1px solid var(--line);border-radius:8px;padding:5px 10px;background:var(--surface);color:var(--ink);cursor:pointer}" +
      ".tn-side{position:fixed;top:56px;bottom:0;left:0;width:288px;overflow-y:auto;background:var(--surface);border-right:1px solid var(--line);padding:12px 12px 48px;z-index:35}" +
      ".tn-side a{display:block;text-decoration:none;color:var(--ink);border-radius:8px;padding:7px 10px;line-height:1.35}" +
      ".tn-side a:hover{background:var(--soft)}.tn-side a.on{background:var(--soft);font-weight:700;color:var(--accent)}" +
      ".tn-h{display:flex;justify-content:space-between;align-items:center;margin:16px 4px 4px;font-size:13px;font-weight:700;color:var(--muted)}" +
      ".tn-h a{display:inline;padding:2px 8px;font-size:13px;color:var(--accent);border:1px solid var(--line);border-radius:999px}" +
      ".tn-ev{border:1px solid transparent}.tn-ev.cur{border-color:var(--line);background:var(--soft)}" +
      ".tn-ev b{display:block;font-size:15.5px}.tn-ev span{display:block;font-size:13px;color:var(--muted)}" +
      ".tn-tag{display:inline-block!important;font-size:11.5px!important;font-weight:700;border-radius:999px;padding:0 7px;margin-left:4px;vertical-align:1px;background:var(--surface);border:1px solid var(--line);color:var(--muted)!important}" +
      ".tn-tag.act{background:var(--ok,#2E7D4F);border-color:var(--ok,#2E7D4F);color:#fff!important}" +
      ".tn-count{float:right;background:var(--bad,#B3392F);color:#fff;border-radius:999px;font-size:12px;font-weight:700;padding:0 7px}" +
      ".tn-scrim{display:none}" +
      "body.tn-on .tabs{top:56px}" +
      "@media (min-width:901px){body.tn-on .tn-hide-wide{display:none!important}}" +
      "body.tn-on .tn-hide{display:none!important}" +
      "@media (max-width:900px){body.tn-on{padding-left:0}.tn-menu{display:inline-block}.tn-org{display:none}" +
      ".tn-side{transform:translateX(-100%);transition:transform .2s;box-shadow:none;width:min(300px,86vw)}" +
      "body.tn-open .tn-side{transform:none;box-shadow:0 0 0 100vmax rgba(0,0,0,.35)}" +
      "body.tn-open .tn-scrim{display:block;position:fixed;inset:56px 0 0 0;z-index:34}" +
      ".tn-top .tn-act .tn-wide{display:none}}" +
      "@media print{body.tn-on{padding:0}.tn-top,.tn-side{display:none}}";
    document.head.appendChild(s);
  }

  function shell() {
    if (document.getElementById("tnTop")) return;
    var top = document.createElement("header"); top.className = "tn-top"; top.id = "tnTop";
    top.innerHTML = '<button type="button" class="tn-menu" id="tnMenu" aria-controls="tnSide" aria-expanded="false">☰ मेनु</button>' +
      '<a class="tn-brand" href="/workshop/admin.html#overview">AI तालिम<small>प्रशिक्षक</small></a>' +
      '<span class="tn-org" id="tnOrg"></span>' +
      '<span class="tn-act"><a class="tn-wide" href="/ai-for-all" target="_blank" rel="noopener">सार्वजनिक पृष्ठ ↗</a><button type="button" id="tnSignOut">साइन आउट</button></span>';
    var side = document.createElement("nav"); side.className = "tn-side"; side.id = "tnSide"; side.setAttribute("aria-label", "प्रशिक्षक मेनु");
    var scrim = document.createElement("div"); scrim.className = "tn-scrim"; scrim.id = "tnScrim";
    document.body.insertBefore(scrim, document.body.firstChild);
    document.body.insertBefore(side, document.body.firstChild);
    document.body.insertBefore(top, document.body.firstChild);
    document.body.classList.add("tn-on");
    var close = function () { document.body.classList.remove("tn-open"); document.getElementById("tnMenu").setAttribute("aria-expanded", "false"); };
    document.getElementById("tnMenu").onclick = function () {
      var open = !document.body.classList.contains("tn-open");
      document.body.classList.toggle("tn-open", open); this.setAttribute("aria-expanded", String(open));
    };
    scrim.onclick = close;
    side.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.getElementById("tnSignOut").onclick = function () { WS.signOut().then(function () { location.href = "/workshop/login.html"; }); };
  }

  function render() {
    var side = document.getElementById("tnSide"); if (!side) return;
    var h = '<a href="/workshop/admin.html#overview" class="' + (state.page === "admin" && state.tab === "overview" ? "on" : "") + '">⌂ गृहपृष्ठ (सारांश)</a>';
    h += '<div class="tn-h"><span>तालिम इभेन्टहरू</span><a href="/workshop/admin.html#newevent">＋ नयाँ</a></div>';
    if (!state.events.length) h += '<p class="small muted" style="margin:4px 10px">' + (state.loaded ? "अहिलेसम्म कुनै इभेन्ट छैन।" : "लोड हुँदैछ…") + '</p>';
    sortEvents(state.events).forEach(function (ev) {
      var cur = state.page === "event" && state.code === ev.code, i = EVI.info(ev) || {}, st = status(ev);
      h += '<a class="tn-ev' + (cur ? ' cur' : '') + '" href="' + esc(eventUrl(ev.code, "details")) + '">' +
        '<b>' + esc(i.orgName || ev.organized_by || ev.name) + (ev.is_active ? ' <span class="tn-tag act">सक्रिय</span>' : (st ? ' <span class="tn-tag">' + st + '</span>' : '')) + '</b>' +
        '<span>' + esc([courseLabel(ev), i.dateRange].filter(Boolean).join(" · ")) + '</span><span>' + esc(ev.code) + '</span></a>';
    });
    h += '<div class="tn-h"><span>व्यवस्थापन</span></div>';
    ADMIN.forEach(function (a) {
      h += '<a href="/workshop/admin.html#' + a[0] + '" class="' + (state.page === "admin" && state.tab === a[0] ? "on" : "") + '">' + a[1] +
        (a[0] === "users" && state.pending ? ' <span class="tn-count" title="स्वीकृतिका लागि पर्खने">' + state.pending + '</span>' : '') + '</a>';
    });
    h += '<a href="/workshop/admin.html#events" class="' + (state.page === "admin" && state.tab === "events" ? "on" : "") + '">इभेन्ट सूची र सम्पादन</a>';
    var act = state.events.filter(function (e) { return e.is_active; })[0];
    h += '<div class="tn-h"><span>सहभागीले देख्ने</span></div>';
    if (act) {
      var p = state.packages.filter(function (x) { return x.id === act.package_id; })[0];
      h += '<a href="' + esc(EVI.eventLink(act.code, p && p.key)) + '" target="_blank" rel="noopener">सक्रिय इभेन्टको सामग्री ↗</a>';
    }
    h += '<a href="/ai-for-all" target="_blank" rel="noopener">सार्वजनिक गृहपृष्ठ ↗</a>';
    // the private portal of the same site: calendar, invitations, engagements, portfolio
    h += '<div class="tn-h"><span>Personal portal</span></div>';
    h += '<a href="/admin/calendar">My calendar &amp; schedule</a>';
    h += '<a href="/admin/requests">Invitations / appointments</a>';
    h += '<a href="/admin">Admin dashboard</a>';
    side.innerHTML = h;
    var org = document.getElementById("tnOrg");
    var shown = state.page === "event" ? state.events.filter(function (e) { return e.code === state.code; })[0] : act;
    if (org) org.textContent = shown ? [EVI.info(shown).org, EVI.info(shown).dateRange].filter(Boolean).join(" · ") : "";
    var curEl = side.querySelector("a.tn-ev.cur, a.on");
    if (curEl && curEl.scrollIntoView && !state.scrolled) { state.scrolled = true; try { curEl.scrollIntoView({ block: "nearest" }); } catch (e) {} }
  }

  async function load() {
    try {
      var r = await Promise.all([WS.listEvents(), WS.listPackages(), WS.listByStatus("pending")]);
      state.events = (r[0] && r[0].data) || state.events;
      state.packages = (r[1] && r[1].data) || state.packages;
      state.pending = ((r[2] && r[2].data) || []).length;
      state.loaded = true;
      try { sessionStorage.setItem(CACHE, JSON.stringify({ events: state.events, packages: state.packages, pending: state.pending })); } catch (e) {}
    } catch (e) {}
    render();
  }

  window.TrainerNav = {
    mount: function (o) {
      Object.assign(state, o || {});
      css(); shell();
      try { var c = JSON.parse(sessionStorage.getItem(CACHE) || "null"); if (c) { state.events = c.events || []; state.packages = c.packages || []; state.pending = c.pending || 0; } } catch (e) {}
      render();
      return load();
    },
    setCurrent: function (o) { Object.assign(state, o || {}); render(); },
    refresh: load,
    reportUrl: reportUrl
  };
})();
