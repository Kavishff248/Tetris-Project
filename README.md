# Online 1v1 Server (MVP Scaffold)

## 1. Install

```bash
cd server
npm install
```

## 2. Configure

Copy `.env.example` to `.env` and fill values:

- `PORT` (default `8080`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEFAULT_REGION` (default `global`)

## 3. Run

```bash
npm start
```

Server will run at `ws://localhost:8080`.

## Client Notes

- Frontend file: `online-1v1.js`
- Menu path: `Main Menu -> Online 1v1`
- Queue screen supports:
  - `Enter` to join/leave queue
  - `Esc` to go back

## Current MVP Scope

- WebSocket connection + identity handshake
- Global queue + pair matchmaking
- Match room creation and events (`match_found`)
- Input/state relay events (`input`, `state`)
- Match result persistence to `vs_leaderboard` with Elo updates

## Next Step To Be Fully Playable

Wire authoritative in-match simulation on server and bind real gameplay input/state to `online1v1.sendInput` / `online1v1.sendState`.
