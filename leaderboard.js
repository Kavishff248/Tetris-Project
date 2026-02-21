console.log("leaderboard.js LOADED");

const SOLO_TABLE = "scores";
const VS_TABLE = "vs_leaderboard";

window.localQueue = JSON.parse(localStorage.getItem("offlineScores") || "[]");
window.localVsQueue = JSON.parse(localStorage.getItem("offlineVsResults") || "[]");
window.leaderboardMode = window.leaderboardMode || "solo";

window.saveQueue = function saveQueue() {
  localStorage.setItem("offlineScores", JSON.stringify(window.localQueue));
  localStorage.setItem("offlineVsResults", JSON.stringify(window.localVsQueue));
};

window.queueLocalScore = function queueLocalScore(entry) {
  window.localQueue.push(entry);
  window.saveQueue();
};

window.queueLocalVsResult = function queueLocalVsResult(entry) {
  window.localVsQueue.push(entry);
  window.saveQueue();
};

window.flushLocalQueue = async function flushLocalQueue() {
  if (!window.supabase || window.localQueue.length === 0) return;
  const pending = [...window.localQueue];
  window.localQueue = [];
  window.saveQueue();

  for (const entry of pending) {
    try {
      await window.submitScore(entry.name, entry.score, entry.country, { skipQueueOnFail: true });
    } catch (err) {
      console.error("Error flushing queued score:", err);
      window.queueLocalScore(entry);
    }
  }
};

window.flushLocalVsQueue = async function flushLocalVsQueue() {
  if (!window.supabase || window.localVsQueue.length === 0) return;
  const pending = [...window.localVsQueue];
  window.localVsQueue = [];
  window.saveQueue();

  for (const entry of pending) {
    try {
      await window.submitVsResult(
        entry.name,
        !!entry.didWin,
        entry.country,
        entry.opponentName || "BOT",
        entry.pointsFor || 0,
        entry.pointsAgainst || 0,
        { skipQueueOnFail: true }
      );
    } catch (err) {
      console.error("Error flushing queued 1v1 result:", err);
      window.queueLocalVsResult(entry);
    }
  }
};

window.loadSoloLeaderboard = async function loadSoloLeaderboard() {
  const { data, error } = await window.supabase
    .from(SOLO_TABLE)
    .select("*")
    .order("score", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
};

window.loadVsLeaderboard = async function loadVsLeaderboard() {
  const { data, error } = await window.supabase
    .from(VS_TABLE)
    .select("*")
    .order("rating", { ascending: false })
    .order("wins", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
};

window.loadLeaderboard = async function loadLeaderboard(mode = "solo") {
  try {
    if (!window.supabase) {
      console.error("Supabase not initialized");
      return [];
    }

    window.leaderboardMode = mode === "vs1v1" ? "vs1v1" : "solo";

    await window.flushLocalQueue();
    await window.flushLocalVsQueue();

    if (window.leaderboardMode === "vs1v1") {
      return await window.loadVsLeaderboard();
    }

    return await window.loadSoloLeaderboard();
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    return [];
  }
};

window.submitScore = async function submitScore(name, score, country, options = {}) {
  try {
    if (!name || !name.toString().trim()) {
      console.log("Name required to submit to leaderboard");
      return;
    }

    if (score === 0) {
      console.log("Score is zero, not adding to leaderboard");
      return;
    }

    const entry = {
      name,
      score,
      country,
      timestamp: Date.now()
    };

    if (!window.supabase) {
      console.error("Supabase not initialized - queueing locally");
      if (!options.skipQueueOnFail) window.queueLocalScore(entry);
      return;
    }

    const { data: rows, error: selectError } = await window.supabase
      .from(SOLO_TABLE)
      .select("*")
      .eq("name", name)
      .limit(1);

    if (selectError) {
      console.error("Supabase select failed, queueing locally:", selectError);
      if (!options.skipQueueOnFail) window.queueLocalScore(entry);
      return;
    }

    if (rows && rows.length > 0) {
      const existing = rows[0];
      if (score > existing.score) {
        const { error: updateError } = await window.supabase
          .from(SOLO_TABLE)
          .update({ score: entry.score, country: entry.country, timestamp: entry.timestamp })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Supabase update failed, queueing locally:", updateError);
          if (!options.skipQueueOnFail) window.queueLocalScore(entry);
        } else {
          console.log("Score updated for player:", name);
          await window.loadLeaderboard(window.leaderboardMode);
        }
      } else {
        console.log("Existing score is higher or equal - not updating leaderboard for:", name);
      }
    } else {
      const { error: insertError } = await window.supabase
        .from(SOLO_TABLE)
        .insert([entry]);

      if (insertError) {
        console.error("Supabase insert failed, queueing locally:", insertError);
        if (!options.skipQueueOnFail) window.queueLocalScore(entry);
      } else {
        console.log("Score submitted to Supabase:", entry);
        await window.loadLeaderboard(window.leaderboardMode);
      }
    }
  } catch (err) {
    console.error("Error submitting score:", err);
    if (!options.skipQueueOnFail) {
      window.queueLocalScore({
        name,
        score,
        country,
        timestamp: Date.now()
      });
    }
  }
};

window.submitVsResult = async function submitVsResult(
  name,
  didWin,
  country = "US",
  opponentName = "BOT",
  pointsFor = 0,
  pointsAgainst = 0,
  options = {}
) {
  const playerName = (name || "").toString().trim();
  if (!playerName) return;

  const entry = {
    name: playerName,
    didWin: !!didWin,
    country: country || "US",
    opponentName: opponentName || "BOT",
    pointsFor: Math.max(0, Number(pointsFor) || 0),
    pointsAgainst: Math.max(0, Number(pointsAgainst) || 0),
    timestamp: Date.now()
  };

  try {
    if (!window.supabase) {
      if (!options.skipQueueOnFail) window.queueLocalVsResult(entry);
      return;
    }

    const { data: existing, error: selectError } = await window.supabase
      .from(VS_TABLE)
      .select("*")
      .eq("name", entry.name)
      .maybeSingle();

    if (selectError) {
      console.error("Supabase 1v1 select failed, queueing locally:", selectError);
      if (!options.skipQueueOnFail) window.queueLocalVsResult(entry);
      return;
    }

    const baselineRating = Number(existing?.rating) || 1000;
    const kFactor = 24;
    const ratingDelta = entry.didWin ? kFactor : -kFactor;
    const nextMatches = (Number(existing?.matches) || 0) + 1;
    const nextWins = (Number(existing?.wins) || 0) + (entry.didWin ? 1 : 0);
    const nextLosses = (Number(existing?.losses) || 0) + (entry.didWin ? 0 : 1);
    const nextDraws = Number(existing?.draws) || 0;
    const nextRating = Math.max(100, baselineRating + ratingDelta);

    const payload = {
      name: entry.name,
      country: entry.country,
      rating: nextRating,
      matches: nextMatches,
      wins: nextWins,
      losses: nextLosses,
      draws: nextDraws,
      win_rate: nextMatches > 0 ? Number(((nextWins / nextMatches) * 100).toFixed(2)) : 0,
      points_for: (Number(existing?.points_for) || 0) + entry.pointsFor,
      points_against: (Number(existing?.points_against) || 0) + entry.pointsAgainst,
      last_result: entry.didWin ? "W" : "L",
      last_opponent: entry.opponentName,
      last_match_at: new Date(entry.timestamp).toISOString()
    };

    let writeError = null;
    if (existing && existing.id) {
      const { error } = await window.supabase
        .from(VS_TABLE)
        .update(payload)
        .eq("id", existing.id);
      writeError = error;
    } else {
      const { error } = await window.supabase
        .from(VS_TABLE)
        .insert([payload]);
      writeError = error;
    }

    if (writeError) {
      console.error("Supabase 1v1 write failed, queueing locally:", writeError);
      if (!options.skipQueueOnFail) window.queueLocalVsResult(entry);
      return;
    }

    if (window.leaderboardMode === "vs1v1") {
      await window.loadLeaderboard("vs1v1");
    }
  } catch (err) {
    console.error("Error submitting 1v1 result:", err);
    if (!options.skipQueueOnFail) window.queueLocalVsResult(entry);
  }
};
