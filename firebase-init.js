

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBtbmgNC82MEVTrsdQPfVdS58YS2MpRQik",
  authDomain: "tetris-leaderboard-1.firebaseapp.com",
  databaseURL: "https://tetris-leaderboard-1-default-rtdb.firebaseio.com",
  projectId: "tetris-leaderboard-1",
  storageBucket: "tetris-leaderboard-1.firebasestorage.app",
  messagingSenderId: "942317811026",
  appId: "1:942317811026:web:d87ea23d5a071403e2f68b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Expose Firestore helpers on window for the rest of the code to use
window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;
window.query = query;
window.orderBy = orderBy;
window.limit = limit;
