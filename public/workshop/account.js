/* Shared account layer for the workshop pages.
 * Participants sign up, the trainer approves them, and approved participants sign in.
 * Uses the public (publishable) key only. Row-level security in the database decides what each user can read or write. */
(function () {
  var SB_URL = "https://htcfpqfqkskchdwjnoqo.supabase.co";
  var SB_KEY = "sb_publishable_-eezpn3nkJBKeNZ2lyINsg_g-pdsuLc";
  var SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  var client = null;
  var loading = null;
  var initPromise = null;
  var profilePromise = null, profileFor = null;

  function loadSdk() {
    if (window.supabase) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = SDK_URL;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("sdk-load-failed")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  var WS = {
    SB_URL: SB_URL,
    SB_KEY: SB_KEY,
    session: null,
    profile: null,
    ready: false,

    /* Safe to call many times and from several places at once: all callers share one start-up. */
    init: function () {
      if (initPromise) return initPromise;
      initPromise = (async function () {
        await loadSdk();
        if (!client) {
          client = window.supabase.createClient(SB_URL, SB_KEY, {
            auth: { persistSession: true, autoRefreshToken: true }
          });
          client.auth.onAuthStateChange(function (_event, session) {
            var before = WS.session && WS.session.user ? WS.session.user.id : null;
            var after = session && session.user ? session.user.id : null;
            WS.session = session || null;
            // The same person (initial session, token refresh): keep the loaded profile. Clearing it
            // here made pages briefly treat a signed-in trainer or participant as signed out.
            if (after && after === before && WS.profile) return;
            if (!after) { WS.profile = null; document.dispatchEvent(new Event("ws-auth")); return; }
            // Supabase runs this callback while it holds its auth lock; a query made inside it can stall
            // or go out without the session. Load the profile just after the callback instead.
            setTimeout(function () {
              WS.loadProfile().then(function () { document.dispatchEvent(new Event("ws-auth")); }, function () {});
            }, 0);
          });
        }
        var r = await client.auth.getSession();
        WS.session = r.data ? r.data.session : null;
        if (WS.session && !(WS.profile && WS.profile.id === WS.session.user.id)) await WS.loadProfile();
        WS.ready = true;
        return WS;
      })();
      initPromise.catch(function () { initPromise = null; });
      return initPromise;
    },

    token: function () {
      return WS.session ? WS.session.access_token : SB_KEY;
    },

    /* One request at a time per user; an empty answer (e.g. a request that went out before the
       session was attached) never replaces a profile already loaded for the same user. */
    loadProfile: function () {
      var uid = WS.session && WS.session.user ? WS.session.user.id : null;
      if (!uid) { WS.profile = null; return Promise.resolve(null); }
      if (profilePromise && profileFor === uid) return profilePromise;
      profileFor = uid;
      profilePromise = client.from("profiles").select("*").eq("id", uid).maybeSingle().then(function (r) {
        var current = WS.session && WS.session.user ? WS.session.user.id : null;
        if (current !== uid) return WS.profile;              // signed out or switched user meanwhile
        if (r.data) { WS.profile = r.data; return WS.profile; }   // fresh profile
        if (WS.profile && WS.profile.id === uid) return WS.profile; // keep a loaded one
        // Signed in but no row came back: usually a request sent before the session was ready.
        // Ask once more before concluding there is no profile.
        return new Promise(function (res) { setTimeout(res, 400); }).then(function () {
          return client.from("profiles").select("*").eq("id", uid).maybeSingle();
        }).then(function (r2) {
          var now = WS.session && WS.session.user ? WS.session.user.id : null;
          if (now === uid) WS.profile = (r2 && r2.data) || (WS.profile && WS.profile.id === uid ? WS.profile : null);
          return WS.profile;
        });
      }).then(function (p) { profilePromise = null; return p; }, function (e) { profilePromise = null; throw e; });
      return profilePromise;
    },

    signUp: function (email, password, details) {
      return client.auth.signUp({
        email: email,
        password: password,
        options: { data: details }
      });
    },

    signIn: function (email, password) {
      return client.auth.signInWithPassword({ email: email, password: password });
    },

    signOut: function () {
      return client.auth.signOut();
    },

    isTrainer: function () {
      return !!(WS.profile && WS.profile.role === "trainer" && WS.profile.status === "approved");
    },

    isApproved: function () {
      return !!(WS.profile && WS.profile.status === "approved");
    },

    /* Whether the training material is public right now (set by the trainer). */
    materialsPublic: async function () {
      await loadSdk();
      if (!client) await WS.init();
      var r = await client.from("app_settings").select("value").eq("key", "materials_public").maybeSingle();
      return !!(r.data && r.data.value);
    },

    setMaterialsPublic: function (value) {
      return client.from("app_settings").update({ value: value }).eq("key", "materials_public");
    },

    listByStatus: function (status) {
      return client.from("profiles").select("*").eq("status", status).order("created_at", { ascending: true });
    },

    /* Approve or reject a participant. Approval also links them to one event. */
    setStatus: function (id, status, eventId) {
      var patch = { status: status };
      patch.event_id = status === "approved" ? (eventId || null) : null;
      return client.from("profiles").update(patch).eq("id", id);
    },

    /* Event master (trainer only; RLS enforces this). */
    /* Training packages (AI for Municipal Employee / Representative). */
    listPackages: function () {
      return client.from("training_packages").select("*").order("created_at", { ascending: true }).order("key", { ascending: true });
    },

    /* Participant fills in their own details (after a manual registration, or any time). */
    saveMyProfile: function (d) {
      return client.rpc("save_my_profile", {
        p_full_name: d.full_name, p_gender: d.gender || "", p_age_group: d.age_group || "",
        p_education: d.education || "", p_office: d.office || ""
      });
    },

    /* Participant workshop feedback (section 12). Anyone may insert; the database checks the event code. */
    submitFeedback: function (row) {
      return client.from("workshop_feedback").insert(row);
    },

    updatePackage: function (id, patch) {
      return client.from("training_packages").update(patch).eq("id", id);
    },

    /* Ideal answers to the exercises of one package (trainer only; RLS returns no rows to anyone else). */
    listAnswers: function (packageKey) {
      return client.from("exercise_answers").select("key,html").eq("package_key", packageKey);
    },

    /* Feedback rows (trainer only; RLS enforces this). */
    listFeedback: function () {
      return client.from("workshop_feedback").select("*").order("created_at", { ascending: false });
    },

    listEvents: function () {
      return client.from("events").select("*").order("created_at", { ascending: false });
    },

    saveEvent: function (ev) {
      return client.from("events").upsert(ev, { onConflict: "id" }).select();
    },

    updateEvent: function (id, patch) {
      return client.from("events").update(patch).eq("id", id);
    },

    deleteEvent: function (id) {
      return client.from("events").delete().eq("id", id);
    },

    /* Make one event the active event (trainer only; the database checks). Empty code clears it. */
    setActiveEvent: async function (code) {
      var r = await client.rpc("set_active_event", { p_code: code || "" });
      // If the API has not picked up the function yet (PGRST202 "not found in the schema cache"),
      // do the same with two updates; row-level security still limits this to the trainer and
      // the unique index still allows only one active event.
      if (r.error && (r.error.code === "PGRST202" || /schema cache|could not find the function/i.test(r.error.message || ""))) {
        var off = await client.from("events").update({ is_active: false }).eq("is_active", true);
        if (off.error) return off;
        if (!code) return off;
        return client.from("events").update({ is_active: true }).eq("code", String(code).toUpperCase()).select("code");
      }
      return r;
    },

    /* One event by its code (signed-in users only; RLS enforces this). */
    loadEventByCode: async function (code) {
      var r = await client.from("events").select("*").eq("code", String(code || "").trim().toUpperCase()).maybeSingle();
      return r.data || null;
    },

    /* The event a participant is linked to (for the test page). */
    loadEventForProfile: async function () {
      if (!WS.profile || !WS.profile.event_id) return null;
      var r = await client.from("events").select("*").eq("id", WS.profile.event_id).maybeSingle();
      return r.data || null;
    }
  };

  window.WS = WS;
})();
