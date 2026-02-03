import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  get,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9TSAr0KKD4TQaO2I7YkLOdc8K0hGmu3w",
  authDomain: "tetris-leaderboard-2548b.firebaseapp.com",
  databaseURL: "https://tetris-leaderboard-2548b-default-rtdb.firebaseio.com",
  projectId: "tetris-leaderboard-2548b",
  storageBucket: "tetris-leaderboard-2548b.firebasestorage.app",
  messagingSenderId: "233445861444",
  appId: "1:233445861444:web:aba831b5c61aba7cb2f411",
  measurementId: "G-B85YVGHMP5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const scoresRef = ref(db, "scores");

function normalizeEntry(entry) {
  return {
    name: entry?.name || "Player",
    score: Number(entry?.score) || 0,
    country: entry?.country || "N/A",
    ts: Number(entry?.ts) || Date.now()
  };
}

window.submitScore = async function submitScore(name, score, country) {
  if (score === 0) {
    console.log("Score is zero, not adding to leaderboard");
    return;
  }

  const entry = normalizeEntry({ name, score, country, ts: Date.now() });
  try {
    await push(scoresRef, entry);
    console.log("Score submitted globally:", entry);
  } catch (err) {
    console.error("Global leaderboard submit failed:", err);
  }
};

window.loadLeaderboard = async function loadLeaderboard(limitCount = 50) {
  try {
    const scoresQuery = query(scoresRef, orderByChild("score"), limitToLast(limitCount));
    const snapshot = await get(scoresQuery);
    if (!snapshot.exists()) return [];
    const raw = snapshot.val();
    const entries = Object.values(raw).map(normalizeEntry);
    return entries.sort((a, b) => b.score - a.score).slice(0, limitCount);
  } catch (err) {
    console.error("Leaderboard load error:", err);
    return [];
  }
};
