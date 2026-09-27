console.log("Supabase Tetris client loading...");

const SUPABASE_URL = "https://lfpbrxsrvjizukugsvsq.supabase.co";
const SUPABASE_KEY = "sb_publishable_kSb7Sv1RWOq8bernfgXYLw_RPwLon9r";

try {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    const createClient = window.supabase.createClient;
    window.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      realtime: {
        params: {
          eventsPerSecond: 100
        }
      }
    });
    console.log("Supabase Tetris client ready");
  } else {
    console.error("Supabase library not found.");
    window.supabase = null;
  }
} catch (err) {
  console.error("Supabase initialization failed:", err);
  window.supabase = null;
}