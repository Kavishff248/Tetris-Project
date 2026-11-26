(() => {
  "use strict";
  const SUPABASE_URL = "https://lfpbrxsrvjizukugsvsq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_kSb7Sv1RWOq8bernfgXYLw_RPwLon9r";
  const sdk = window.supabaseJs || window.supabase;
  if (!sdk || typeof sdk.createClient !== "function") {
    console.error("Supabase JS failed to load. Online play and leaderboards are unavailable.");
    window.supabase = null;
    return;
  }
  try {
    window.supabase = sdk.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 30 } },
      global: { headers: { "x-application-name": "tetris-plus" } }
    });
    console.info("Supabase client ready (database + Realtime).");
  } catch (error) {
    console.error("Supabase initialization failed:", error);
    window.supabase = null;
  }
})();
