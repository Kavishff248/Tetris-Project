# Tetris-Project
A modern multiplayer falling-block puzzle game inspired by Tetr.io, built in JavaScript with competitive modes and bot play.\
Play Here:
https://kavishff248.github.io/Tetris-Project/

## Global leaderboard (Firebase)
This project now uses Firebase Realtime Database so scores are shared globally across devices.

### Configure Firebase
The Firebase config lives in `leaderboard.js`. If you want to use your own Firebase project, replace the `firebaseConfig` values there with your project’s settings from the Firebase console.

### Run locally
You can still serve the files locally (any static server works):
```bash
python -m http.server 8000
```

Then open: `http://localhost:8000`.
