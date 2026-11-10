/* Event details for the workshop pages: organiser (municipality), place and dates come from the
 * event record (trainer console → इभेन्ट मास्टर) instead of being written into the pages.
 *
 * Which event a page shows:
 *   1. ?event=CODE (or ?e=CODE) in the address; remembered on this device for later visits.
 *   2. The signed-in participant's own event.
 *   3. For the trainer: the newest event of the page's training package.
 *   4. A remembered code, for visitors who are not signed in (needs public_event_brand in the database).
 * Needs account.js (window.WS) loaded first. Without an event, pages keep their written defaults. */
(function () {
  var DEV = "०१२३४५६७८९";
  var dn = function (s) { return String(s).replace(/[0-9]/g, function (d) { return DEV[d]; }); };
  var MONTHS = ["बैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"];

  /* Days in each Bikram Sambat month, 2080–2090 (2080/01/01 = 2023-04-14).
     Checked day by day against two published converters for 2020–2033; later years are projections. */
  var BS_START = 2080, AD_ANCHOR = Date.UTC(2023, 3, 14);
  var BS_DAYS = [
    [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 2080
    [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2081
    [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2082
    [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2083
    [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], // 2084
    [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30], // 2085
    [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2086
    [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30], // 2087
    [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30], // 2088
    [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2089
    [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30]  // 2090
  ];

  /* "2026-10-10" -> {y:2083, m:6, d:24}, or null outside the table. */
  function toBS(iso) {
    var p = String(iso || "").slice(0, 10).split("-").map(Number);
    if (p.length !== 3 || p.some(isNaN)) return null;
    var days = Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - AD_ANCHOR) / 86400000);
    if (days < 0) return null;
    for (var yi = 0; yi < BS_DAYS.length; yi++) {
      for (var mi = 0; mi < 12; mi++) {
        if (days < BS_DAYS[yi][mi]) return { y: BS_START + yi, m: mi + 1, d: days + 1 };
        days -= BS_DAYS[yi][mi];
      }
    }
    return null;
  }
  function fmtFull(b) { return dn(b.y) + " " + MONTHS[b.m - 1] + " " + dn(b.d); }
  function fmtShort(b) { return MONTHS[b.m - 1] + " " + dn(b.d); }
  /* All dates of an event in one phrase: "२०८३ असोज २४ र २५", "२०८३ असोज ३० र कात्तिक १". */
  function fmtRange(list) {
    if (!list.length) return "";
    if (list.length === 1) return fmtFull(list[0]);
    var first = list[0], out = fmtFull(first), prev = first;
    var rest = list.slice(1).map(function (b) {
      var s = b.y !== prev.y ? fmtFull(b) : b.m !== prev.m ? fmtShort(b) : dn(b.d);
      prev = b; return s;
    });
    return out + (rest.length === 1 ? " र " + rest[0] : ", " + rest.slice(0, -1).join(", ") + " र " + rest[rest.length - 1]);
  }

  function info(ev) {
    if (!ev) return null;
    /* org: the organiser as entered ("पाणिनी गाउँपालिका, अर्घाखाँची"); orgName: just the
       municipality ("पाणिनी गाउँपालिका"), used inside the material text; orgShort: "पाणिनी". */
    var org = String(ev.organized_by || "").trim().replace(/\s+/g, " ");
    if (org && !/पालिका/.test(org)) org += " पालिका";
    var m = org.match(/^(.*?)\s*(उपमहानगरपालिका|महानगरपालिका|नगरपालिका|गाउँपालिका|पालिका)/);
    var orgName = m ? (m[1] ? m[1].trim() + " " : "") + m[2] : org;
    var short = m ? m[1].replace(/[,\s]+$/, "").trim() : "";
    var iso = (ev.event_dates || []).slice().sort();
    var dates = iso.map(toBS).filter(Boolean);
    return {
      code: ev.code || "",
      name: ev.name || "",
      org: org,
      orgName: orgName,
      orgShort: short || orgName,
      rural: /गाउँपालिका/.test(orgName),
      active: !!ev.is_active,
      place: String(ev.address || "").trim(),
      iso: iso,
      dates: dates,
      dateFull: dates.map(fmtFull),
      dateShort: dates.map(fmtShort),
      dateRange: fmtRange(dates)
    };
  }

  /* ?event=CODE in the address; remembered per package (and generally) for later visits. */
  function urlCode(packageKey) {
    var code = String(new URLSearchParams(location.search).get("event") || "").trim().toUpperCase();
    if (code) {
      try {
        localStorage.setItem("ws-event" + (packageKey ? ":" + packageKey : ""), code);
        localStorage.setItem("ws-event", code);
      } catch (e) {}
    }
    return code;
  }
  function storedCode(packageKey) {
    try { return localStorage.getItem("ws-event" + (packageKey ? ":" + packageKey : "")) || ""; } catch (e) { return ""; }
  }

  async function rpc(name, body) {
    try {
      var res = await fetch(WS.SB_URL + "/rest/v1/rpc/" + name, {
        method: "POST",
        headers: { apikey: WS.SB_KEY, Authorization: "Bearer " + WS.SB_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(body || {})
      });
      if (!res.ok) return null;
      var rows = await res.json();
      return rows && rows[0] ? rows[0] : null;
    } catch (e) { return null; }
  }
  async function publicBrand(code) {
    var row = await rpc("public_event_brand", { p_code: code });
    return row ? Object.assign({ code: code }, row) : null;
  }

  /* Which event a page shows. packageKey: "employee" or "representative" (optional).
     Signed in:  ?event=CODE → the participant's own event → the active event → a remembered code
                 → (trainer) the newest event; each only if it belongs to the page's package.
     Not signed in: ?event=CODE → the active event → a remembered code. */
  async function resolve(packageKey) {
    var code = urlCode(packageKey);
    try { if (!WS.ready) await WS.init(); } catch (e) {}
    if (WS.session) {
      var pkgs = null;
      var inPkg = async function (ev) {
        if (!ev) return false;
        if (!packageKey) return true;
        if (!pkgs) pkgs = ((await WS.listPackages()).data || []).filter(function (p) { return p.key === packageKey; }).map(function (p) { return p.id; });
        return pkgs.indexOf(ev.package_id) !== -1;
      };
      if (code) { var byCode = await WS.loadEventByCode(code); if (await inPkg(byCode)) return byCode; }
      if (WS.profile && WS.profile.event_id) { var own = await WS.loadEventForProfile(); if (await inPkg(own)) return own; }
      var all = (await WS.listEvents()).data || [];
      var active = all.filter(function (e) { return e.is_active; })[0];
      if (await inPkg(active)) return active;
      var stored = storedCode(packageKey);
      var byStored = stored && all.filter(function (e) { return e.code === stored; })[0];
      if (await inPkg(byStored)) return byStored;
      if (WS.isTrainer()) {
        for (var k = 0; k < all.length; k++) if (await inPkg(all[k])) return all[k];
      }
      return null;
    }
    if (code) { var pub = await publicBrand(code); if (pub) return pub; }
    var act = await rpc("active_event_brand");
    if (act && (!packageKey || !act.package_key || act.package_key === packageKey)) return Object.assign({ is_active: true }, act);
    var st = storedCode(packageKey);
    return st ? publicBrand(st) : null;
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* Replace written defaults with the event's details. rules: [[RegExp|string, value], ...];
     a rule whose value is empty is skipped, so the default stays. Values are HTML-escaped. */
  function fill(text, rules) {
    if (typeof text !== "string") return text;
    rules.forEach(function (r) {
      if (!r[1]) return;
      var v = esc(r[1]);
      text = typeof r[0] === "string" ? text.split(r[0]).join(v) : text.replace(r[0], function () { return v; });
    });
    return text;
  }
  /* Apply fill() to every string inside an object (data files). */
  function fillDeep(obj, rules, skip) {
    if (!obj || typeof obj !== "object") return obj;
    Object.keys(obj).forEach(function (k) {
      if (skip && skip.indexOf(k) !== -1) return;
      var v = obj[k];
      if (typeof v === "string") obj[k] = fill(v, rules);
      else if (v && typeof v === "object") fillDeep(v, rules, skip);
    });
    return obj;
  }

  /* Rules for the employee programme, whose text was written for सन्धिखर्क नगरपालिका, २०८३ असोज २४–२५. */
  function employeeRules(i) {
    var b = i.dates.slice();
    if (b.length === 1) { // two-day programme with only the first date entered: the second day is the next day
      var p = i.iso[0].slice(0, 10).split("-").map(Number), next = new Date(Date.UTC(p[0], p[1] - 1, p[2] + 1));
      var nb = toBS(next.toISOString().slice(0, 10)); if (nb) b.push(nb);
    }
    var d1 = b[0] ? fmtFull(b[0]) : "", d2 = b[1] ? fmtFull(b[1]) : "", s1 = b[0] ? fmtShort(b[0]) : "", s2 = b[1] ? fmtShort(b[1]) : "";
    var rules = [
      ["२०८३ असोज २४ र २५", b.length > 1 ? fmtRange(b) : ""],
      ["२०८३ असोज २४", d1], ["२०८३ असोज २५", d2],
      ["असोज २४", s1], ["असोज २५", s2],
      ["सन्धिखर्क नगरपालिकाको सभाहल [पुष्टि गर्नुपर्ने]", i.place],
      ["सन्धिखर्क, अर्घाखाँची", i.place],
      ["सन्धिखर्क नगरपालिका", i.orgName],
      ["सन्धिखर्क", i.orgShort]
    ];
    if (i.rural) rules.push(["नगर कार्यपालिका", "गाउँ कार्यपालिका"], ["नगर उपप्रमुख", "उपाध्यक्ष"], ["नगर प्रमुख", "अध्यक्ष"], ["नगरसभा", "गाउँसभा"]);
    return rules;
  }

  /* Rules for the representative workshop, whose text has blank lines ("…………") and २०८३ कात्तिक २७. */
  function representativeRules(i) {
    var BL = "[…][…\\.]*";
    return [
      [new RegExp(BL + "\\s*(?:पालिका|लिका)", "g"), i.orgName],
      [new RegExp(BL + "(?=को सञ्चार अधिकृत)", "g"), i.orgName],
      [new RegExp(BL + "(?= AI सहायता)", "g"), i.orgShort],
      [new RegExp("(, )" + BL + "(?= · मिति)", "g"), i.place ? ", " + i.place : ""],
      [new RegExp("(मिति: )" + BL, "g"), i.dateRange ? "मिति: " + i.dateRange : ""],
      [new RegExp("मिति " + BL + " हुने", "g"), i.dateRange ? "मिति " + i.dateRange + " हुने" : ""],
      ["गाउँपालिकाको सभाहल (यकिन गर्न बाँकी)", i.place],
      ["२०८३ कात्तिक २७", i.dateRange]
    ];
  }

  /* Where "home" is for this visitor: the trainer console for the trainer, the participant's own
     course materials for a signed-in participant, otherwise the materials of the active event's
     course (the main materials page when no event is active). */
  var homePromise = null;
  function home() {
    if (homePromise) return homePromise;
    homePromise = (async function () {
      var fallback = { href: "/workshop/index.html", label: "गृहपृष्ठ" };
      try { if (!WS.ready) await WS.init(); } catch (e) { return fallback; }
      if (WS.isTrainer()) return { href: "/workshop/admin.html", label: "प्रशिक्षक गृहपृष्ठ" };
      var rep = { href: "/workshop/representative/index.html", label: "गृहपृष्ठ" };
      if (WS.session && WS.profile && WS.profile.event_id) {
        try {
          var ev = await WS.loadEventForProfile();
          var pk = ((await WS.listPackages()).data || []).filter(function (p) { return ev && p.id === ev.package_id; })[0];
          if (pk) return pk.key === "representative" ? rep : fallback;
        } catch (e) {}
      }
      // Otherwise home is the course of the active event.
      var act = await rpc("active_event_brand");
      return act && act.package_key === "representative" ? rep : fallback;
    })();
    return homePromise;
  }
  function samePage(href) {
    var here = location.pathname.replace(/\/index\.html$/, "/");
    return here === href.replace(/\/index\.html$/, "/");
  }
  /* Point every <a data-home> at the visitor's home (opened in the top window, so it also works
     from a page shown inside the trainer console). A link to the page itself is hidden. */
  function mountHome(h) {
    if (!h) return;
    document.querySelectorAll("a[data-home]").forEach(function (a) {
      a.href = h.href;
      a.target = "_top";
      a.textContent = "⌂ " + h.label;
      a.hidden = samePage(h.href);
    });
  }

  window.EVI = { home: home, mountHome: mountHome, resolve: resolve, info: info, toBS: toBS, fmtFull: fmtFull, fmtRange: fmtRange, fill: fill, fillDeep: fillDeep, employeeRules: employeeRules, representativeRules: representativeRules, dn: dn };
})();
