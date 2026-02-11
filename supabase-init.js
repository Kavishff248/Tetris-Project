console.log("supabase-init.js LOADED");

window.supabase = Supabase.createClient(
  "https://wsaqhwsjmdvyhgpbvnvr.supabase.co",
  "sb_publishable_sT2R5zxJ7tBPl8kr5rgE9g_1LG4Dmo0"
);

console.log("Supabase initialized:", window.supabase);
