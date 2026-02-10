

// Submit a score to global Firebase leaderboard
window.submitScore = async function submitScore(name, score, country) {
  try {
    // Don't add zero scores to leaderboard
    if (score === 0) {
      console.log("Score is zero, not adding to leaderboard");
      return;
    }

    // Wait for Firebase to be initialized
    let maxWait = 5000;
    let elapsed = 0;
    while (!window.db && elapsed < maxWait) {
      await new Promise(r => setTimeout(r, 100));
      elapsed += 100;
    }

    if (!window.db) {
      console.error("Firebase not initialized");
      return;
    }

    // Add score to Firestore
    const { addDoc } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
    const scoresCollection = window.collection(window.db, "scores");
    
    await addDoc(scoresCollection, {
      name: name,
      score: score,
      country: country,
      timestamp: Date.now()
    });

    console.log("Score submitted to Firebase:", { name, score, country });
  } catch (err) {
    console.error("Error submitting score:", err);
  }
};

// Load leaderboard from global Firebase database
window.loadLeaderboard = async function loadLeaderboard(limitCount = 50) {
  try {
    // Wait for Firebase to be initialized
    let maxWait = 5000;
    let elapsed = 0;
    while (!window.db && elapsed < maxWait) {
      await new Promise(r => setTimeout(r, 100));
      elapsed += 100;
    }

    if (!window.db) {
      console.error("Firebase not initialized");
      return [];
    }

    const { query, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js");
    
    const scoresCollection = window.collection(window.db, "scores");
    const q = query(
      scoresCollection,
      orderBy("score", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const leaderboard = [];

    querySnapshot.forEach((doc) => {
      leaderboard.push({
        name: doc.data().name,
        score: doc.data().score,
        country: doc.data().country,
        timestamp: doc.data().timestamp
      });
    });

    return leaderboard;
  } catch (err) {
    console.error("Leaderboard load error:", err);
    return [];
  }
};
