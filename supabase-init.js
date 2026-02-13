console.log("supabase-init.js LOADED");

// Initialize Supabase client (support UMD bundles exposing either `supabase` or `Supabase`)
const SUPABASE_URL = "https://wsaqhwsjmdvyhgpbvnvr.supabase.co";
const SUPABASE_KEY = "sb_publishable_sT2R5zxJ7tBPl8kr5rgE9g_1LG4Dmo0";

try {
  if (typeof supabase !== "undefined" && typeof supabase.createClient === "function") {
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else if (typeof Supabase !== "undefined" && typeof Supabase.createClient === "function") {
    window.supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else if (typeof createClient === "function") {
    window.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error("Supabase library not found — include @supabase/supabase-js before this script");
    window.supabase = null;
  }
} catch (err) {
  console.error("Error initializing Supabase client:", err);
  window.supabase = null;
}

console.log("Supabase initialized:", window.supabase);
