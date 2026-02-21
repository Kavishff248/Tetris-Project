require("dotenv").config();

const { WebSocketServer } = require("ws");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");

const PORT = Number(process.env.PORT || 8080);
const DEFAULT_REGION = process.env.DEFAULT_REGION || "global";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
  : null;

const wss = new WebSocketServer({ port: PORT });

const clients = new Map(); // ws -> player session
const queueByRegion = new Map(); // region -> [ws]
const matches = new Map(); // roomId -> match object

function safeSend(ws, payload) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function nowIso() {
  return new Date().toISOString();
}

function removeFromQueues(ws) {
  for (const [region, arr] of queueByRegion.entries()) {
    const idx = arr.indexOf(ws);
    if (idx >= 0) {
      arr.splice(idx, 1);
      if (arr.length === 0) queueByRegion.delete(region);
      return true;
    }
  }
  return false;
}

function ensureQueue(region) {
  if (!queueByRegion.has(region)) queueByRegion.set(region, []);
  return queueByRegion.get(region);
}

function pickTwoFromQueue(region) {
  const q = ensureQueue(region);
  if (q.length < 2) return null;
  const a = q.shift();
  const b = q.shift();
  return [a, b];
}

function opponentWs(room, ws) {
  return room.players.find((p) => p !== ws) || null;
}

async function loadOrCreateLeaderboardRow(name, country) {
  if (!supabase) {
    return { id: null, name, country, rating: 1000, wins: 0, losses: 0, matches: 0, draws: 0, win_rate: 0 };
  }

  const { data: existing, error: selErr } = await supabase
    .from("vs_leaderboard")
    .select("*")
    .eq("name", name)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing;

  const seed = {
    name,
    country: country || "US",
    rating: 1000,
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    win_rate: 0,
    points_for: 0,
    points_against: 0,
    last_result: null,
    last_opponent: null,
    last_match_at: nowIso()
  };

  const { data: inserted, error: insErr } = await supabase
    .from("vs_leaderboard")
    .insert([seed])
    .select("*")
    .single();

  if (insErr) throw insErr;
  return inserted;
}

function computeElo(rA, rB, scoreA, k = 24) {
  const expectedA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
  const expectedB = 1 - expectedA;
  const scoreB = 1 - scoreA;

  const nextA = Math.round(rA + k * (scoreA - expectedA));
  const nextB = Math.round(rB + k * (scoreB - expectedB));
  return [Math.max(100, nextA), Math.max(100, nextB)];
}

async function persistMatchOutcome(room, winnerClientId, reports) {
  const [wsA, wsB] = room.players;
  const a = clients.get(wsA);
  const b = clients.get(wsB);
  if (!a || !b) return null;

  const rowA = await loadOrCreateLeaderboardRow(a.name, a.country);
  const rowB = await loadOrCreateLeaderboardRow(b.name, b.country);

  const aWin = winnerClientId === a.id ? 1 : 0;
  const [nextA, nextB] = computeElo(Number(rowA.rating) || 1000, Number(rowB.rating) || 1000, aWin);

  const repA = reports[a.id] || {};
  const repB = reports[b.id] || {};
  const aFor = Math.max(0, Number(repA.pointsFor) || 0);
  const bFor = Math.max(0, Number(repB.pointsFor) || 0);

  const nextMatchesA = (Number(rowA.matches) || 0) + 1;
  const nextMatchesB = (Number(rowB.matches) || 0) + 1;
  const nextWinsA = (Number(rowA.wins) || 0) + (aWin ? 1 : 0);
  const nextWinsB = (Number(rowB.wins) || 0) + (aWin ? 0 : 1);
  const nextLossesA = (Number(rowA.losses) || 0) + (aWin ? 0 : 1);
  const nextLossesB = (Number(rowB.losses) || 0) + (aWin ? 1 : 0);

  if (supabase) {
    const payloadA = {
      country: a.country || rowA.country || "US",
      rating: nextA,
      matches: nextMatchesA,
      wins: nextWinsA,
      losses: nextLossesA,
      draws: Number(rowA.draws) || 0,
      win_rate: Number(((nextWinsA / nextMatchesA) * 100).toFixed(2)),
      points_for: (Number(rowA.points_for) || 0) + aFor,
      points_against: (Number(rowA.points_against) || 0) + bFor,
      last_result: aWin ? "W" : "L",
      last_opponent: b.name,
      last_match_at: nowIso()
    };

    const payloadB = {
      country: b.country || rowB.country || "US",
      rating: nextB,
      matches: nextMatchesB,
      wins: nextWinsB,
      losses: nextLossesB,
      draws: Number(rowB.draws) || 0,
      win_rate: Number(((nextWinsB / nextMatchesB) * 100).toFixed(2)),
      points_for: (Number(rowB.points_for) || 0) + bFor,
      points_against: (Number(rowB.points_against) || 0) + aFor,
      last_result: aWin ? "L" : "W",
      last_opponent: a.name,
      last_match_at: nowIso()
    };

    const { error: upErrA } = await supabase.from("vs_leaderboard").update(payloadA).eq("name", a.name);
    if (upErrA) throw upErrA;
    const { error: upErrB } = await supabase.from("vs_leaderboard").update(payloadB).eq("name", b.name);
    if (upErrB) throw upErrB;
  }

  return {
    roomId: room.id,
    winnerClientId,
    rating: {
      [a.id]: nextA,
      [b.id]: nextB
    }
  };
}

async function finalizeMatch(room, winnerClientId) {
  if (!room || room.finished) return;
  room.finished = true;

  try {
    const result = await persistMatchOutcome(room, winnerClientId, room.reports);
    safeSend(room.players[0], { type: "match_ended", result });
    safeSend(room.players[1], { type: "match_ended", result });
  } catch (err) {
    safeSend(room.players[0], { type: "error", message: `match finalize failed: ${err.message}` });
    safeSend(room.players[1], { type: "error", message: `match finalize failed: ${err.message}` });
  }

  for (const ws of room.players) {
    const c = clients.get(ws);
    if (c) c.roomId = null;
  }
  matches.delete(room.id);
}

function tryMatchmaking(region) {
  while (ensureQueue(region).length >= 2) {
    const pair = pickTwoFromQueue(region);
    if (!pair) break;

    const [wsA, wsB] = pair;
    if (!clients.has(wsA) || !clients.has(wsB)) continue;

    const a = clients.get(wsA);
    const b = clients.get(wsB);
    if (a.roomId || b.roomId) continue;

    const roomId = uuidv4();
    const room = {
      id: roomId,
      players: [wsA, wsB],
      createdAt: Date.now(),
      reports: {},
      finished: false
    };
    matches.set(roomId, room);

    a.roomId = roomId;
    b.roomId = roomId;

    safeSend(wsA, {
      type: "match_found",
      roomId,
      side: "A",
      opponent: { id: b.id, name: b.name, country: b.country },
      serverTime: Date.now()
    });
    safeSend(wsB, {
      type: "match_found",
      roomId,
      side: "B",
      opponent: { id: a.id, name: a.name, country: a.country },
      serverTime: Date.now()
    });
  }
}

wss.on("connection", (ws) => {
  const clientId = uuidv4();

  clients.set(ws, {
    id: clientId,
    name: `Player-${clientId.slice(0, 6)}`,
    country: "US",
    region: DEFAULT_REGION,
    rating: 1000,
    roomId: null,
    queueing: false,
    lastSeenAt: Date.now()
  });

  safeSend(ws, { type: "connected", clientId, serverTime: Date.now() });

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      safeSend(ws, { type: "error", message: "invalid JSON" });
      return;
    }

    const c = clients.get(ws);
    if (!c) return;
    c.lastSeenAt = Date.now();

    if (msg.type === "hello") {
      c.name = String(msg.name || c.name).trim().slice(0, 24) || c.name;
      c.country = String(msg.country || c.country).trim().slice(0, 8) || "US";
      c.region = String(msg.region || c.region || DEFAULT_REGION).trim().slice(0, 24) || DEFAULT_REGION;
      safeSend(ws, { type: "hello_ack", clientId: c.id, name: c.name, region: c.region });
      return;
    }

    if (msg.type === "queue_join") {
      if (c.roomId) return;
      removeFromQueues(ws);
      const region = String(msg.region || c.region || DEFAULT_REGION).trim().slice(0, 24) || DEFAULT_REGION;
      c.region = region;
      c.queueing = true;
      ensureQueue(region).push(ws);
      safeSend(ws, { type: "queue_joined", region, queuedAt: Date.now() });
      tryMatchmaking(region);
      return;
    }

    if (msg.type === "queue_leave") {
      c.queueing = false;
      removeFromQueues(ws);
      safeSend(ws, { type: "queue_left" });
      return;
    }

    if (msg.type === "input" || msg.type === "state") {
      const roomId = String(msg.roomId || c.roomId || "");
      if (!roomId || !matches.has(roomId)) return;
      const room = matches.get(roomId);
      const other = opponentWs(room, ws);
      if (!other) return;
      safeSend(other, {
        type: msg.type === "input" ? "opponent_input" : "opponent_state",
        roomId,
        fromClientId: c.id,
        payload: msg.payload || {},
        frame: Number(msg.frame) || 0,
        serverTime: Date.now()
      });
      return;
    }

    if (msg.type === "match_result") {
      const roomId = String(msg.roomId || c.roomId || "");
      if (!roomId || !matches.has(roomId)) return;
      const room = matches.get(roomId);
      room.reports[c.id] = {
        didWin: !!msg.didWin,
        pointsFor: Math.max(0, Number(msg.pointsFor) || 0),
        pointsAgainst: Math.max(0, Number(msg.pointsAgainst) || 0),
        at: Date.now()
      };

      const reports = Object.entries(room.reports);
      const declaredWinner = reports.find(([, r]) => r.didWin === true);

      if (declaredWinner) {
        await finalizeMatch(room, declaredWinner[0]);
      } else if (reports.length >= 2) {
        const [firstClientId] = reports[0];
        await finalizeMatch(room, firstClientId);
      }
      return;
    }

    if (msg.type === "ping") {
      safeSend(ws, { type: "pong", ts: Date.now(), echo: msg.ts || null });
      return;
    }
  });

  ws.on("close", async () => {
    const c = clients.get(ws);
    if (!c) return;

    removeFromQueues(ws);

    if (c.roomId && matches.has(c.roomId)) {
      const room = matches.get(c.roomId);
      const other = opponentWs(room, ws);
      const otherClient = other ? clients.get(other) : null;

      if (otherClient) {
        safeSend(other, { type: "opponent_disconnected", roomId: room.id });
        await finalizeMatch(room, otherClient.id);
      } else {
        matches.delete(c.roomId);
      }
    }

    clients.delete(ws);
  });
});

console.log(`[online-1v1] websocket server running on ws://localhost:${PORT}`);
