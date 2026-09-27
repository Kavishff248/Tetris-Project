console.log("leaderboard.js LOADED");

const SOLO_TABLE = "tetris_scores";
const VS_TABLE = "vs_leaderboard";

window.localQueue = JSON.parse(localStorage.getItem("offlineScores") || "[]");
window.localVsQueue = JSON.parse(localStorage.getItem("offlineVsResults") || "[]");
window.leaderboardMode = window.leaderboardMode || "solo";

window.saveQueue = () => {
  localStorage.setItem("offlineScores", JSON.stringify(window.localQueue));
  localStorage.setItem("offlineVsResults", JSON.stringify(window.localVsQueue));
};
window.queueLocalScore = entry => { window.localQueue.push(entry); window.saveQueue(); };
window.queueLocalVsResult = entry => { window.localVsQueue.push(entry); window.saveQueue(); };

window.loadSoloLeaderboard = async function() {
  if (!window.supabase) return [];
  const { data, error } = await window.supabase.from(SOLO_TABLE)
    .select("*").eq("mode","competitive").order("score",{ascending:false}).limit(50);
  if (error) throw error;
  return data || [];
};

window.loadVsLeaderboard = async function() {
  if (!window.supabase) return [];
  const { data, error } = await window.supabase.from(VS_TABLE)
    .select("*").order("rating",{ascending:false}).order("wins",{ascending:false}).limit(50);
  if (error) throw error;
  return data || [];
};

window.loadLeaderboard = async function(mode="solo") {
  window.leaderboardMode = mode === "vs1v1" ? "vs1v1" : "solo";
  try {
    return window.leaderboardMode === "vs1v1"
      ? await window.loadVsLeaderboard()
      : await window.loadSoloLeaderboard();
  } catch (err) {
    console.error("Leaderboard load failed:", err);
    return [];
  }
};

window.submitScore = async function(name, score, country, options={}) {
  const playerName = String(name || "").trim().slice(0,24);
  const value = Math.max(0, Number(score) || 0);
  if (!playerName || value <= 0) return;
  const entry = {
    player_name: playerName,
    score: value,
    lines: Number(options.lines) || 0,
    level: Number(options.level) || 1,
    mode: "competitive",
    created_at: new Date().toISOString()
  };
  try {
    if (!window.supabase) throw new Error("Supabase unavailable");
    const { error } = await window.supabase.from(SOLO_TABLE).insert([entry]);
    if (error) throw error;
    await window.loadLeaderboard("solo");
  } catch (err) {
    console.error("Score save failed:", err);
    if (!options.skipQueueOnFail) window.queueLocalScore(entry);
  }
};

window.submitVsResult = async function(name,didWin,country="US",opponentName="BOT",pointsFor=0,pointsAgainst=0,options={}) {
  const playerName=String(name||"").trim().slice(0,24);
  if(!playerName)return;
  const entry={name:playerName,didWin:!!didWin,country,opponentName,pointsFor:Number(pointsFor)||0,pointsAgainst:Number(pointsAgainst)||0,timestamp:Date.now()};
  try {
    if(!window.supabase)throw new Error("Supabase unavailable");
    const {data:existing,error:selectError}=await window.supabase.from(VS_TABLE).select("*").eq("name",playerName).maybeSingle();
    if(selectError)throw selectError;
    const matches=(Number(existing?.matches)||0)+1;
    const wins=(Number(existing?.wins)||0)+(entry.didWin?1:0);
    const losses=(Number(existing?.losses)||0)+(entry.didWin?0:1);
    const payload={
      name:playerName,country:country||"US",
      rating:Math.max(100,(Number(existing?.rating)||1000)+(entry.didWin?24:-24)),
      matches,wins,losses,draws:Number(existing?.draws)||0,
      win_rate:Number(((wins/matches)*100).toFixed(2)),
      points_for:(Number(existing?.points_for)||0)+entry.pointsFor,
      points_against:(Number(existing?.points_against)||0)+entry.pointsAgainst,
      last_result:entry.didWin?"W":"L",last_opponent:entry.opponentName,
      last_match_at:new Date(entry.timestamp).toISOString()
    };
    const result=existing?.id
      ? await window.supabase.from(VS_TABLE).update(payload).eq("id",existing.id)
      : await window.supabase.from(VS_TABLE).insert([payload]);
    if(result.error)throw result.error;
  } catch(err) {
    console.error("VS result save failed:",err);
    if(!options.skipQueueOnFail)window.queueLocalVsResult(entry);
  }
};
