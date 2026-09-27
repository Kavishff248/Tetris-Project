console.log("Supabase Tetris client loading...");

const SUPABASE_URL = "https://lfpbrxsrvjizukugsvsq.supabase.co";
const SUPABASE_KEY = "sb_publishable_kSb7Sv1RWOq8bernfgXYLw_RPwLon9r";

try {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else if (typeof supabase !== "undefined" && typeof supabase.createClient === "function") {
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error("Supabase library not found.");
    window.supabase = null;
  }
} catch (err) {
  console.error("Supabase initialization failed:", err);
  window.supabase = null;
}
