/* EN | नेपाली switch for the workshop pages. The choice is the same one the main site uses
 * (localStorage "lang"), so switching here, on the public site or in the admin changes all of them.
 *
 * Each page is written in one language (its <html lang>). When the chosen language differs,
 * every text and placeholder that has a translation below is swapped, including text the page's
 * own scripts add later (watched with a MutationObserver). Course content written in only one
 * language stays as it is; the page chrome (menus, buttons, forms, messages) follows the switch. */
(function () {
  "use strict";
  var KEY = "lang";
  var base = (document.documentElement.getAttribute("lang") || "ne").slice(0, 2) === "en" ? "en" : "ne";
  var chosen;
  try { chosen = localStorage.getItem(KEY); } catch (e) {}
  if (chosen !== "en" && chosen !== "ne") chosen = base;
  window.LANG = chosen;

  /* [Nepali, English] */
  var PAIRS = [
    // site frame
    ["← मुख्य पृष्ठ", "← Main site"], ["तालिम सामग्री", "Training materials"], ["⌂ गृहपृष्ठ", "⌂ Home"],
    ["मुख्य पृष्ठमा फर्कनुहोस्", "Back to the main site"], ["ग्यालरी", "Gallery"], ["AI तालिम", "AI training"],
    ["AI for ALL · सबैका लागि AI तालिम", "AI for ALL · AI training for everyone"], ["⌂ Home", "⌂ गृहपृष्ठ"],
    // sign in / sign up
    ["खाता · AI तालिम", "Account · AI training"], ["सहभागी खाता", "Participant account"],
    ["दर्ता गरेपछि प्रशिक्षकले स्वीकृत गरेपछि मात्र परीक्षा र सामग्री हेर्न सकिन्छ।", "After you register, the trainer approves you; then you can see the tests and materials."],
    ["साइन इन", "Sign in"], ["नयाँ दर्ता", "Register"], ["इमेल", "E-mail"], ["पासवर्ड", "Password"],
    ["साइन इन गर्नुहोस्", "Sign in"], ["पूरा नाम", "Full name"], ["पासवर्ड (कम्तीमा ८ अक्षर)", "Password (at least 8 characters)"],
    ["पासवर्ड फेरि टाइप गर्नुहोस् (Re-type password)", "Re-type password"],
    ["दुवै पासवर्ड मिलेनन्। फेरि टाइप गर्नुहोस्। (The two passwords do not match.)", "The two passwords do not match. Type them again."],
    ["लिङ्ग", "Gender"], ["— छान्नुहोस् —", "— Choose —"], ["पुरुष (Male)", "Male"], ["महिला (Female)", "Female"], ["अन्य (Others)", "Others"],
    ["उमेर समूह", "Age group"], ["२० वर्षभन्दा कम (Below 20)", "Below 20"], ["२०–३० (20-30)", "20–30"], ["३०–४० (30-40)", "30–40"],
    ["४०–५० (40-50)", "40–50"], ["५० वर्षभन्दा माथि (50 above)", "50 and above"],
    ["शैक्षिक योग्यता", "Education"], ["हाई स्कुल (High School)", "High School"], ["स्नातक (Undergraduate)", "Undergraduate"],
    ["स्नातकोत्तर र माथि (Masters and Above)", "Masters and Above"],
    ["कार्यालय / शाखा / विभाग (Office / Section / Department)", "Office / Section / Department"], ["दर्ता गर्नुहोस्", "Register"],
    ["इमेल वा पासवर्ड मिलेन।", "The e-mail or password is wrong."],
    ["जडानमा समस्या। इन्टरनेट जाँचेर फेरि प्रयास गर्नुहोस्।", "Connection problem. Check the internet and try again."],
    ["जडानमा समस्या। फेरि प्रयास गर्नुहोस्।", "Connection problem. Try again."],
    ["तपाईंको दर्ता प्रशिक्षकद्वारा स्वीकृत हुन बाँकी छ। स्वीकृत भएपछि साइन इन गर्नुहोस्।", "Your registration is waiting for the trainer's approval. Sign in after you are approved."],
    ["तपाईंको दर्ता स्वीकृत भएन। थप जानकारीका लागि प्रशिक्षकसँग सम्पर्क गर्नुहोस्।", "Your registration was not approved. Contact the trainer for more information."],
    ["दर्ता भयो। प्रशिक्षकले स्वीकृत गरेपछि साइन इन गर्न सकिन्छ। इमेल पुष्टि माग्छ भने इमेल जाँच्नुहोस्।", "Registered. You can sign in once the trainer approves you. If a confirmation e-mail is asked for, check your e-mail."],
    ["दर्ता हुन सकेन: ", "Could not register: "], ["छान्न सकिएन: ", "Could not choose: "],
    ["कुन तालिम?", "Which training?"], ["(अहिलेको)", "(current)"],
    ["जनप्रतिनिधिका लागि AI", "AI for representatives"], ["कर्मचारीका लागि AI", "AI for employees"],
    // profile
    ["मेरो विवरण", "My details"], ["मेरो विवरण · AI तालिम", "My details · AI training"], ["सुरक्षित गर्नुहोस्", "Save"], ["साइन आउट", "Sign out"],
    ["तपाईंको खाता प्रशिक्षकले बनाइदिनुभएको हो। कृपया आफ्नो विवरण भरेर सुरक्षित गर्नुहोस्। नाम अनिवार्य छ।", "The trainer created your account. Please fill in your details and save. The name is required."],
    ["पूरा नाम *", "Full name *"], ["युजरनेम: ", "User name: "], ["सुरक्षित भयो। अब जारी राख्न सकिन्छ।", "Saved. You can continue now."],
    ["सुरक्षित हुन सकेन: ", "Could not save: "], ["सुरक्षित हुन सकेन। फेरि प्रयास गर्नुहोस्।", "Could not save. Try again."],
    // Nepali course pages: navigation
    ["ड्यासबोर्ड", "Dashboard"], ["कार्यक्रम तालिका र सत्र योजना", "Programme and session plan"], ["सन्दर्भ सामग्री", "Reference materials"],
    ["डाउनलोड", "Downloads"], ["पृष्ठपोषण फाराम", "Feedback form"], ["AI ज्ञान परीक्षा", "AI knowledge test"],
    ["पहिलो दिन", "Day 1"], ["दोस्रो दिन", "Day 2"], ["छिटो पहुँच", "Quick access"], ["दुई दिनको कार्यतालिका", "Two-day timetable"],
    ["आज पहिलो दिन", "Today is day 1"], ["आज दोस्रो दिन", "Today is day 2"], ["अहिले चलिरहेको", "Now"], ["त्यसपछि", "Next"],
    ["आजको कार्यक्रम सकियो", "Today's programme is over"], ["आज थप सत्र छैन", "No more sessions today"],
    ["सहभागी दर्ता", "Registration"], ["उद्घाटन सत्र", "Opening session"], ["चिया", "Tea"], ["खाना", "Lunch"],
    ["अघिल्लो दिनको पुनरावलोकन", "Review of the previous day"], ["समापन सत्र", "Closing session"],
    ["खोज्नुहोस्: प्रम्प्ट, Excel, गोपनीयता...", "Search: prompts, Excel, privacy..."],
    ["अहिले कुनै सत्र चलिरहेको छैन", "No session is running now"], ["पूरा भएका सत्र: ", "Sessions done: "],
    ["खोज्नुहोस्: प्रम्प्ट, Excel, गोपनीयता…", "Search: prompts, Excel, privacy…"],
    ["खोज्नुहोस्: सूचना, माइन्युट, आयोजना छनौट…", "Search: notices, minutes, project selection…"],
    ["सामग्री खुल्न सकेन", "The materials could not load"], ["फेरि प्रयास गर्नुहोस्", "Try again"],
    // English course pages: navigation and forms
    ["Overview & agenda", "सारांश र कार्यतालिका"], ["Printable handout", "छाप्न मिल्ने ह्यान्डआउट"], ["Feedback form", "पृष्ठपोषण फाराम"],
    ["Facilitator checklist", "सहजकर्ता चेकलिस्ट"], ["Group exercises", "समूह अभ्यास"], ["Sample case papers", "नमुना मुद्दा कागजात"],
    ["2-hour session", "२ घण्टाको सत्र"], ["80-minute session", "८० मिनेटको सत्र"], ["Fictional", "काल्पनिक"],
    ["Search prompts, exercises, case papers…", "प्रम्प्ट, अभ्यास, मुद्दा कागजात खोज्नुहोस्…"], ["Search prompts, modules…", "प्रम्प्ट, मोड्युल खोज्नुहोस्…"], ["Search: minutes, logframe, voice typing…", "खोज्नुहोस्: माइन्युट, लगफ्रेम, भ्वाइस टाइपिङ…"],
    ["Mark as done", "सकियो भनी चिन्ह लगाउनुहोस्"], ["✓ Done", "✓ सकियो"], ["Done", "सकियो"], ["Copy", "कपी"], ["Copied", "कपी भयो"],
    ["What happens", "के हुन्छ"], ["What to do", "के गर्ने"], ["Steps", "चरणहरू"], ["English gloss", "अंग्रेजी सारांश"],
    ["Session goal", "सत्रको लक्ष्य"], ["Learning outcomes", "सिकाइ उपलब्धि"], ["Before the session", "सत्रअघि"],
    ["Session Feedback", "सत्रको पृष्ठपोषण"], ["Event code", "कार्यक्रम कोड"], ["Submit feedback", "पृष्ठपोषण पठाउनुहोस्"],
    ["Anonymous and takes 1 minute. Rate each statement from 1 (strongly disagree) to 5 (strongly agree).", "नाम नखुल्ने र १ मिनेट लाग्ने। हरेक भनाइलाई १ (पूर्ण असहमत) देखि ५ (पूर्ण सहमत) सम्म अङ्क दिनुहोस्।"],
    ["I would recommend this session to colleagues.", "यो सत्र सहकर्मीलाई सिफारिस गर्छु।"],
    ["Thank you! Your feedback has been recorded.", "धन्यवाद! तपाईंको पृष्ठपोषण सुरक्षित भयो।"],
    ["Please enter the event code and rate all 6 items.", "कार्यक्रम कोड लेख्नुहोस् र सबै ६ भनाइमा अङ्क दिनुहोस्।"],
    ["Submitting…", "पठाउँदै…"], ["Loading…", "लोड हुँदै…"], ["Nothing found.", "केही भेटिएन।"],
    ["Private materials", "निजी सामग्री"], ["Sign in to see the materials", "सामग्री हेर्न साइन इन गर्नुहोस्"],
    ["You are not registered for this training", "तपाईं यो तालिममा दर्ता हुनुहुन्न"],
    ["These materials are private for now. Participants registered for this training can sign in to see them.", "यी सामग्री अहिले निजी छन्। यो तालिममा दर्ता भएका सहभागीले साइन इन गरेर हेर्न सक्नुहुन्छ।"],
    ["Sign in", "साइन इन"], ["Register", "दर्ता"], ["Slow connection", "ढिलो जडान"],
    ["The materials could not load", "सामग्री खुल्न सकेन"], ["Check the internet and try again.", "इन्टरनेट जाँचेर फेरि प्रयास गर्नुहोस्।"],
    ["Try again", "फेरि प्रयास गर्नुहोस्"], ["🖨 Print / Save as PDF", "🖨 छाप्नुहोस् / PDF बनाउनुहोस्"],
    ["Download: the policy itself", "डाउनलोड: नीति आफैँ"], ["⬇ Download the policy (PDF)", "⬇ नीति डाउनलोड गर्नुहोस् (PDF)"],
    ["Start →", "सुरु गर्नुहोस् →"], ["Feedback form →", "पृष्ठपोषण फाराम →"], ["← Overview", "← सारांश"]
  ];
  var fromIdx = base === "ne" ? 0 : 1, toIdx = 1 - fromIdx;
  var MAP = {}, PREFIX = [];
  var DEV = /[\u0900-\u097F]/;
  PAIRS.forEach(function (p) {
    if (!DEV.test(p[0]) && DEV.test(p[1])) p = [p[1], p[0]]; // always [Nepali, English]
    var a = p[fromIdx], b = p[toIdx];
    if (/:\s$/.test(a)) PREFIX.push([a, b]); else MAP[a.trim()] = b;
  });

  function tr(s) {
    var t = s.trim();
    if (!t) return null;
    if (Object.prototype.hasOwnProperty.call(MAP, t)) return s.replace(t, MAP[t]);
    for (var i = 0; i < PREFIX.length; i++) if (t.indexOf(PREFIX[i][0].trim()) === 0) return s.replace(PREFIX[i][0].trim(), PREFIX[i][1].trim());
    return null;
  }
  /** For page scripts: L("नेपाली", "English") gives the text in the chosen language. */
  window.L = function (ne, en) { return chosen === "en" ? en : ne; };

  var ATTRS = ["placeholder", "aria-label", "title"];
  function apply(root) {
    if (chosen === base) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n, out;
    while ((n = w.nextNode())) {
      var p = n.parentNode;
      if (!p || /^(SCRIPT|STYLE|PRE|TEXTAREA|CODE)$/.test(p.nodeName) || (p.closest && p.closest("[data-no-tr]"))) continue;
      if ((out = tr(n.nodeValue)) != null && out !== n.nodeValue) n.nodeValue = out;
    }
    if (root.querySelectorAll) {
      var els = [root].concat(Array.prototype.slice.call(root.querySelectorAll("[placeholder],[aria-label],[title]")));
      els.forEach(function (el) {
        if (!el.getAttribute) return;
        ATTRS.forEach(function (a) { var v = el.getAttribute(a); if (v && (out = tr(v)) != null) el.setAttribute(a, out); });
      });
    }
  }

  function toggle() {
    var box = document.createElement("div");
    box.className = "lang-switch"; box.setAttribute("role", "group"); box.setAttribute("aria-label", "Language"); box.setAttribute("data-no-tr", "");
    [["en", "EN"], ["ne", "नेपाली"]].forEach(function (x) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = x[1]; b.setAttribute("aria-pressed", String(chosen === x[0]));
      b.addEventListener("click", function () {
        if (x[0] === chosen) return;
        try { localStorage.setItem(KEY, x[0]); } catch (e) {}
        location.reload();
      });
      box.appendChild(b);
    });
    return box;
  }
  function mount() {
    var css = document.createElement("style");
    css.textContent = ".lang-switch{display:inline-flex;gap:2px;padding:2px;border:1px solid var(--line,#ddd);border-radius:999px;background:var(--surface,#fff);font-size:13px;line-height:1;white-space:nowrap;flex:none}" +
      ".lang-switch button{border:0;background:transparent;color:var(--muted,#555);padding:5px 10px;border-radius:999px;cursor:pointer;font:inherit}" +
      ".lang-switch button[aria-pressed=true]{background:var(--navy,var(--accent,#1C3A66));color:#fff}" +
      ".lang-switch.floating{position:fixed;top:10px;right:12px;z-index:60;box-shadow:0 2px 8px rgba(0,0,0,.12)}" +
      "@media print{.lang-switch{display:none}}";
    document.head.appendChild(css);
    var t = toggle();
    var nav = document.querySelector("header.site-top nav");
    var top = document.querySelector("header.top, header.topbar, .top");
    if (nav) nav.appendChild(t);
    else if (top) { var s = top.querySelector(".search"); if (s) top.insertBefore(t, s); else top.appendChild(t); t.style.marginLeft = "auto"; }
    else { t.classList.add("floating"); document.body.appendChild(t); }
    if (chosen !== base) {
      document.documentElement.setAttribute("lang", chosen);
      var tt = tr(document.title); if (tt) document.title = tt;
      apply(document.body);
      new MutationObserver(function (ms) {
        ms.forEach(function (m) {
          if (m.type === "characterData") { var o = tr(m.target.nodeValue); if (o != null && o !== m.target.nodeValue) m.target.nodeValue = o; }
          else m.addedNodes.forEach(function (x) { if (x.nodeType === 1) apply(x); else if (x.nodeType === 3) { var o2 = tr(x.nodeValue); if (o2 != null && o2 !== x.nodeValue) x.nodeValue = o2; } });
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
