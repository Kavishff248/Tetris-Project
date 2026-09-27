console.log("Tetris backend client loading...");

const SUPABASE_URL = "https://lfpbrxsrvjizukugsvsq.supabase.co";
const SUPABASE_KEY = "sb_publishable_kSb7Sv1RWOq8bernfgXYLw_RPwLon9r";

(function () {
  const REST_URL = SUPABASE_URL + "/rest/v1";
  const client = {
    from(table) {
      return new QueryBuilder(table);
    }
  };

  window.supabase = client;
  console.log("Tetris backend client ready — no third-party Supabase script");
})();
