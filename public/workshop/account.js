/* Shared account layer for the workshop pages.
 * Participants sign up, the trainer approves them, and approved participants sign in.
 * Uses the public (publishable) key only. Row-level security in the database decides what each user can read or write. */
(function () {
  var SB_URL = "https://htcfpqfqkskchdwjnoqo.supabase.co";
  var SB_KEY = "sb_publishable_-eezpn3nkJBKeNZ2lyINsg_g-pdsuLc";
  var SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  var client = null;
  var loading = null;

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

    init: async function () {
      await loadSdk();
      if (!client) {
        client = window.supabase.createClient(SB_URL, SB_KEY, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        client.auth.onAuthStateChange(function (_event, session) {
          WS.session = session || null;
          WS.profile = null;
          if (WS.session) {
            WS.loadProfile().then(function () { document.dispatchEvent(new Event("ws-auth")); });
          } else {
            document.dispatchEvent(new Event("ws-auth"));
          }
        });
      }
      var r = await client.auth.getSession();
      WS.session = r.data ? r.data.session : null;
      if (WS.session) await WS.loadProfile();
      WS.ready = true;
      return WS;
    },

    token: function () {
      return WS.session ? WS.session.access_token : SB_KEY;
    },

    loadProfile: async function () {
      var r = await client.from("profiles").select("*").eq("id", WS.session.user.id).maybeSingle();
      WS.profile = r.data || null;
      return WS.profile;
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
      return client.from("training_packages").select("*").order("created_at", { ascending: true });
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
    setActiveEvent: function (code) {
      return client.rpc("set_active_event", { p_code: code || "" });
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
