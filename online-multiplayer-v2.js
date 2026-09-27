(() => {
  const state = {
    id: localStorage.getItem("tetris_client_id") || crypto.randomUUID(),
    roomCode: null,
    side: null,
    opponentName: "Opponent",
    channel: null,
    poll: null,
    stateTimer: null,
    started: false,
    finished: false,
    resultRecorded: false,
    connected: false
  };
  localStorage.setItem("tetris_client_id", state.id);

  function name() {
    return (window.getActiveProfileName && window.getActiveProfileName()) || "Player";
  }

  function code() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function makeModal() {
    if (document.getElementById("onlineLobby")) return;
    const style = document.createElement("style");
    style.textContent = `
      #onlineLobby{position:fixed;inset:0;z-index:20;display:none;align-items:center;justify-content:center;background:rgba(2,5,13,.82);backdrop-filter:blur(10px);font-family:Rajdhani,Segoe UI,sans-serif}
      #onlineLobby .ol-card{width:min(520px,92vw);padding:28px;border:1px solid rgba(160,220,255,.28);border-radius:20px;background:linear-gradient(150deg,rgba(20,32,58,.98),rgba(7,12,28,.98));box-shadow:0 25px 70px rgba(0,0,0,.6),0 0 45px rgba(77,170,255,.28);color:#fff}
      #onlineLobby h2{margin:0 0 6px;font:900 34px Orbitron,Arial,sans-serif;letter-spacing:.04em}
      #onlineLobby p{color:rgba(225,240,255,.72);margin:7px 0 20px}
      #onlineLobby .ol-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      #onlineLobby button,#onlineLobby input{width:100%;height:46px;border-radius:10px;border:1px solid rgba(170,220,255,.3);background:rgba(255,255,255,.06);color:#fff;font:700 16px Rajdhani,Arial,sans-serif;padding:0 14px}
      #onlineLobby button{cursor:pointer;background:linear-gradient(180deg,rgba(76,176,255,.85),rgba(21,89,208,.85))}
      #onlineLobby input{text-transform:uppercase}
      #onlineLobby .ol-code{font:900 42px Orbitron,Arial,sans-serif;letter-spacing:.16em;text-align:center;padding:16px 8px;border:1px dashed rgba(120,210,255,.5);border-radius:12px;margin:14px 0}
      #onlineLobby .ol-status{min-height:24px;text-align:center;color:#9edcff;margin:12px 0}
      #onlineLobby .ol-back{background:rgba(255,255,255,.06)}
      @media(max-width:600px){#onlineLobby .ol-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
    const modal = document.createElement("div");
    modal.id = "onlineLobby";
    modal.innerHTML = `
      <div class="ol-card">
        <h2>ONLINE 1V1</h2>
        <p>Create a private room or join a friend with a 6-character room code.</p>
        <div class="ol-grid">
          <button id="olCreate">CREATE ROOM</button>
          <button id="olBack" class="ol-back">BACK</button>
        </div>
        <div id="olCode" class="ol-code" style="display:none"></div>
        <div id="olStatus" class="ol-status">Ready</div>
        <div class="ol-grid">
          <input id="olJoinCode" maxlength="6" placeholder="ROOM CODE" aria-label="Room code">
          <button id="olJoin">JOIN ROOM</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById("olCreate").onclick = createRoom;
    document.getElementById("olJoin").onclick = () => joinRoom(document.getElementById("olJoinCode").value);
    document.getElementById("olBack").onclick = closeLobby;
  }

  function status(message) {
    makeModal();
    document.getElementById("olStatus").textContent = message;
  }

  function openLobby() {
    makeModal();
    document.getElementById("onlineLobby").style.display = "flex";
    status("Create a room or enter a room code.");
  }

  function closeLobby() {
    const el = document.getElementById("onlineLobby");
    if (el) el.style.display = "none";
    if (state.poll) clearInterval(state.poll);
    state.poll = null;
  }

  function subscribe(codeValue) {
    return new Promise((resolve, reject) => {
      if (!window.supabase) {
        reject(new Error("Supabase is not initialized."));
        return;
      }

      if (state.channel) {
        window.supabase.removeChannel(state.channel).catch(() => {});
        state.channel = null;
      }

      state.connected = false;
      const channel = window.supabase.channel("tetris-room-" + codeValue, {
        config: { broadcast: { ack: true } }
      });
      state.channel = channel;

      channel
        .on("broadcast", { event: "start" }, ({ payload }) => {
          if (!state.started) beginMatch(payload || {});
        })
        .on("broadcast", { event: "state" }, ({ payload }) => {
          if (payload && payload.from !== state.id && window.receiveOnlineState) window.receiveOnlineState(payload);
        })
        .on("broadcast", { event: "attack" }, ({ payload }) => {
          if (payload && payload.from !== state.id && window.receiveOnlineAttack) window.receiveOnlineAttack(payload);
        })
        .on("broadcast", { event: "gameover" }, ({ payload }) => {
          if (payload && payload.from !== state.id && window.receiveOnlineGameover) window.receiveOnlineGameover(payload);
        })
        .on("broadcast", { event: "ready" }, ({ payload }) => {
          if (payload && state.side === "host" && payload.from !== state.id) {
            startRoom(payload.name || "Opponent");
          }
        })
        .subscribe((channelStatus, err) => {
          if (channelStatus === "SUBSCRIBED") {
            state.connected = true;
            status("Connected. Starting 1v1...");
            resolve(true);
          } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
            state.connected = false;
            console.error("Tetris Realtime channel error:", channelStatus, err);
            status("Realtime connection failed. Retrying...");
            reject(err || new Error(channelStatus));
          } else if (channelStatus === "CLOSED") {
            state.connected = false;
          }
        });
    });
  }

  function startRoom(opponent) {
    if (state.started) return;
    state.started = true;
    state.opponentName = opponent || "Opponent";
    if (state.channel && state.connected) {
      state.channel.send({
        type: "broadcast",
        event: "start",
        payload: {
          roomCode: state.roomCode,
          side: state.side,
          opponentName: state.opponentName
        }
      }).catch(err => console.error("Start broadcast failed:", err));
    }
    closeLobby();
    if (window.startOnlineMatch) {
      window.startOnlineMatch(state.side, state.roomCode, state.opponentName);
    }
  }

  function beginMatch(payload) {
    if (state.started) return;
    state.started = true;
    state.opponentName = payload.opponentName || "Opponent";
    state.side = payload.side === "host" ? "guest" : "host";
    closeLobby();
    if (window.startOnlineMatch) {
      window.startOnlineMatch(state.side, state.roomCode || payload.roomCode, state.opponentName);
    }
  }

  async function createRoom() {
    try {
      if (!window.supabase) throw new Error("Supabase is not initialized.");
      const roomCode = code();
      const { error } = await window.supabase.from("tetris_rooms").insert({
        code: roomCode,
        host_id: state.id,
        host_name: name(),
        status: "waiting"
      });
      if (error) throw error;

      state.roomCode = roomCode;
      state.side = "host";
      state.started = false;
      state.finished = false;
      state.resultRecorded = false;

      const codeEl = document.getElementById("olCode");
      codeEl.textContent = roomCode;
      codeEl.style.display = "block";
      status("Connecting to room...");
      try { await subscribe(roomCode); } catch (_) {}

      if (!state.connected) {
        status("Room created. Retrying connection...");
      } else {
        status("Waiting for the other player...");
      }

      if (state.poll) clearInterval(state.poll);
      state.poll = setInterval(checkRoom, 1000);
    } catch (err) {
      console.error("Create room failed:", err);
      status("Could not create room: " + (err.message || "unknown error"));
    }
  }

  async function checkRoom() {
    if (!state.roomCode || state.started) return;

    const { data, error } = await window.supabase
      .from("tetris_rooms")
      .select("guest_id,guest_name,host_name,status")
      .eq("code", state.roomCode)
      .maybeSingle();

    if (error) {
      console.error("Room check failed:", error);
      return;
    }

    if (state.side === "host" && data && data.guest_id) {
      if (!state.started) startRoom(data.guest_name || "Opponent");
      return;
    }

    if (state.side === "guest" && data && data.host_id && data.guest_id === state.id && data.status === "ready") {
      if (!state.started) startRoom(data.host_name || "Host");
    }
  }

  async function joinRoom(rawCode) {
    const roomCode = String(rawCode || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
      status("Enter a 6-character room code.");
      return;
    }

    try {
      if (!window.supabase) throw new Error("Supabase is not initialized.");

      const { data, error } = await window.supabase
        .from("tetris_rooms")
        .select("id,code,host_id,host_name,guest_id,status")
        .eq("code", roomCode)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Room not found.");
      if (data.guest_id && data.guest_id !== state.id) throw new Error("Room is already full.");
      if (data.status === "finished") throw new Error("Room has ended.");

      state.roomCode = roomCode;
      state.side = "guest";
      state.started = false;
      state.finished = false;
      state.resultRecorded = false;

      const { error: joinError } = await window.supabase
        .from("tetris_rooms")
        .update({
          guest_id: state.id,
          guest_name: name(),
          status: "ready",
          updated_at: new Date().toISOString()
        })
        .eq("code", roomCode);

      if (joinError) throw joinError;

      status("Joined. Connecting to 1v1...");
      try { await subscribe(roomCode); } catch (_) {}

      if (state.connected) {
        state.channel.send({
          type: "broadcast",
          event: "ready",
          payload: { from: state.id, name: name() }
        }).catch(err => console.error("Ready broadcast failed:", err));
      }

      startRoom(data.host_name || "Host");

      if (state.poll) clearInterval(state.poll);
      state.poll = setInterval(checkRoom, 1000);
    } catch (err) {
      console.error("Join room failed:", err);
      status(err.message || "Could not join room.");
    }
  }

  function startStateLoop() {
    if (state.stateTimer) clearInterval(state.stateTimer);
    state.stateTimer = setInterval(() => {
      if (window.gameMode !== "online" || !window.player || !state.channel || !state.connected) return;
      const p = window.player;

      if (!p.alive && !state.finished) {
        sendGameover(Number(p.score) || 0, Number(p.lines) || 0).catch(err => console.error("Gameover broadcast failed:", err));
        recordResult("loss", Number(p.score) || 0, 0, Number(p.lines) || 0).catch(err => console.error("Online result save failed:", err));
        return;
      }

      const snapshot = {
        from: state.id,
        score: Number(p.score) || 0,
        lines: Number(p.lines) || 0,
        level: Number(p.level) || 1,
        alive: !!p.alive,
        piece: p.piece,
        pieceX: p.pieceX,
        pieceY: p.pieceY,
        rotation: p.rotation,
        hold: p.hold,
        queue: Array.isArray(p.queue) ? p.queue.slice(0, 5) : [],
        garbageQueue: Number(p.garbageQueue) || 0,
        board: p.board
      };

      state.channel.send({
        type: "broadcast",
        event: "state",
        payload: snapshot
      }).catch(err => console.error("Online state broadcast failed:", err));
    }, 70);
  }

  function stopStateLoop() {
    if (state.stateTimer) clearInterval(state.stateTimer);
    state.stateTimer = null;
  }

  async function sendAttack(amount) {
    if (!state.channel || !state.connected || !amount) return;
    await state.channel.send({
      type: "broadcast",
      event: "attack",
      payload: { from: state.id, amount: Number(amount) || 0 }
    });
  }

  async function sendGameover(score, lines) {
    if (!state.channel || !state.connected) return;
    await state.channel.send({
      type: "broadcast",
      event: "gameover",
      payload: { from: state.id, score: Number(score) || 0, lines: Number(lines) || 0 }
    });
  }

  async function recordResult(result, score, opponentScore, lines) {
    if (!window.supabase || !state.roomCode || state.resultRecorded) return;
    state.resultRecorded = true;

    const { error } = await window.supabase.from("tetris_matches").insert({
      room_code: state.roomCode,
      player_name: name(),
      opponent_name: state.opponentName || "Opponent",
      result,
      score: Math.max(0, Number(score) || 0),
      opponent_score: Math.max(0, Number(opponentScore) || 0),
      lines: Math.max(0, Number(lines) || 0)
    });

    if (error) {
      state.resultRecorded = false;
      throw error;
    }

    await window.supabase.from("tetris_rooms").update({
      status: "finished",
      updated_at: new Date().toISOString()
    }).eq("code", state.roomCode);

    state.finished = true;
  }

  function leave() {
    stopStateLoop();
    if (state.poll) clearInterval(state.poll);
    state.poll = null;
    if (state.channel && window.supabase) window.supabase.removeChannel(state.channel).catch(() => {});
    state.channel = null;
    state.roomCode = null;
    state.side = null;
    state.started = false;
    state.finished = false;
    state.resultRecorded = false;
    state.connected = false;
  }

  window.online1v1 = {
    openLobby,
    closeLobby,
    createRoom,
    joinRoom,
    startStateLoop,
    stopStateLoop,
    sendAttack,
    sendGameover,
    recordResult,
    leave,
    getState: () => ({ ...state })
  };
})();