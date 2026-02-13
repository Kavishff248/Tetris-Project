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
      await window.submitScore(entry.name, entry.score, entry.country);
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
      console.error("Supabase not initialized — queueing locally");
      window.queueLocalScore(entry);
      return;
    }

    // Check for existing player by name
    const { data: rows, error: selectError } = await window.supabase
      .from("scores")
      .select("*")
      .eq("name", name)
      .limit(1);

    if (selectError) {
      console.error("Supabase select failed, queueing locally:", selectError);
      window.queueLocalScore(entry);
      return;
    }

    if (rows && rows.length > 0) {
      const existing = rows[0];
      if (score > existing.score) {
        const { error: updateError } = await window.supabase
          .from("scores")
          .update({ score: entry.score, country: entry.country, timestamp: entry.timestamp })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Supabase update failed, queueing locally:", updateError);
          window.queueLocalScore(entry);
        } else {
          console.log("Score updated for player:", name);
          await window.loadLeaderboard();
        }
      } else {
        console.log("Existing score is higher or equal — not updating leaderboard for:", name);
      }
    } else {
      const { error: insertError } = await window.supabase
        .from("scores")
        .insert([entry]);

      if (insertError) {
        console.error("Supabase insert failed, queueing locally:", insertError);
        window.queueLocalScore(entry);
      } else {
        console.log("Score submitted to Supabase:", entry);
        await window.loadLeaderboard();
      }
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
