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
  const playerName = String(name || "").trim().slice(0,24);
  if (!playerName) return false;
  const entry = {
    name: playerName, didWin: !!didWin, country: String(country || "US").slice(0,3),
    opponentName: String(opponentName || "BOT").slice(0,24),
    pointsFor: Math.max(0, Number(pointsFor) || 0),
    pointsAgainst: Math.max(0, Number(pointsAgainst) || 0),
    timestamp: Date.now()
  };
  try {
    if (!window.supabase) throw new Error("Supabase unavailable");
    const { error } = await window.supabase.rpc("record_tetris_vs_result", {
      p_name: entry.name, p_country: entry.country, p_did_win: entry.didWin,
      p_points_for: entry.pointsFor, p_points_against: entry.pointsAgainst,
      p_opponent_name: entry.opponentName
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("VS result save failed:", err);
    if (!options.skipQueueOnFail) window.queueLocalVsResult(entry);
    return false;
  }
};
