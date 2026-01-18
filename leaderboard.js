

// Local storage key for leaderboard data
const LEADERBOARD_KEY = "tetris_leaderboard";

// Submit a score to local leaderboard
window.submitScore = function submitScore(name, score, country) {
  try {
    // Don't add zero scores to leaderboard
    if (score === 0) {
      console.log("Score is zero, not adding to leaderboard");
      return;
    }
    
    // Get existing leaderboard
    let leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
    
    // Add new entry
    leaderboard.push({
      name: name,
      score: score,
      country: country,
      ts: Date.now()
    });
    
    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top 100
    leaderboard = leaderboard.slice(0, 100);
    
    // Save back to storage
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    console.log("Score submitted:", { name, score, country });
  } catch (err) {
    console.error("Error submitting score:", err);
  }
};

// Load leaderboard from local storage
window.loadLeaderboard = function loadLeaderboard(limitCount = 50) {
  try {
    const leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
    return Promise.resolve(leaderboard.slice(0, limitCount));
  } catch (err) {
    console.error("Leaderboard load error:", err);
    return Promise.resolve([]);
  }
};
