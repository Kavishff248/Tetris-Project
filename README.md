# Tetris-Project

Play: https://kavishff248.github.io/Tetris-Project/

## Modes

- Single Player — casual play.
- Competitive Single Player — scores are saved to Supabase.
- Online 1v1 — create a room, get a 6-character code, and share it with another player.

## Inspiration

The project is inspired by the fast, competitive feel and real-time multiplayer style of TETR.IO. The game uses its own code, interface, scoring, and multiplayer implementation.

## Online technology

Supabase Realtime is used for low-latency game events and board updates. Supabase Postgres stores scores, rooms, and match results.

The GitHub Pages version does not need the old local WebSocket server for Online 1v1.
