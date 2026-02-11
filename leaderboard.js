console.log("leaderboard.js LOADED");

/* ============================================================
   LOCAL OFFLINE QUEUE (GLOBAL)
   ============================================================ */

window.localQueue = JSON.parse(localStorage.getItem("offlineScores") || "[]");

window.saveQueue = function saveQueue() {
  localStorage.setItem("offlineScores", JSON.stringify(window.localQueue));
};

window.queueLocalScore = function queueLocalScore(entry) {
  window.localQueue.push(entry);
  window.saveQueue();
};

/* ============================================================
   FLUSH QUEUE TO SUPABASE (GLOBAL)
   ============================================================ */

window.flushLocalQueue = async function flushLocalQueue() {
  if (!window.supabase || window.localQueue.length === 0) return;

  const pending = [...window.localQueue];
  window.localQueue = [];
  window.saveQueue();

  for (const entry of pending) {
    try {
      const { error } = await window.supabase
        .from("scores")
        .insert([entry]);

      if (error) {
        console.error("Failed to flush queued score:", error);
        window.queueLocalScore(entry);
      }
    } catch (err) {
      console.error("Error flushing queued score:", err);
      window.queueLocalScore(entry);
    }
  }
};

/* ============================================================
   LOAD LEADERBOARD (GLOBAL)
   ============================================================ */

window.loadLeaderboard = async function loadLeaderboard() {
  try {
    if (!window.supabase) {
      console.error("Supabase not initialized");
      return [];
    }

    // Flush offline scores first
    await window.flushLocalQueue();

    const { data, error } = await window.supabase
      .from("scores")
      .select("*")
      .order("score", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Leaderboard fetch failed:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    return [];
  }
};

/* ============================================================
   SUBMIT SCORE (GLOBAL)
   ============================================================ */

window.submitScore = async function submitScore(name, score, country) {
  try {
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
      console.error("Supabase not initialized — queueing locally");
      window.queueLocalScore(entry);
      return;
    }

    const { error } = await window.supabase
      .from("scores")
      .insert([entry]);

    if (error) {
      console.error("Supabase insert failed, queueing locally:", error);
      window.queueLocalScore(entry);
    } else {
      console.log("Score submitted to Supabase:", entry);
      await window.loadLeaderboard();
    }
  } catch (err) {
    console.error("Error submitting score:", err);
    window.queueLocalScore({
      name,
      score,
      country,
      timestamp: Date.now()
    });
  }
};
