(function () {
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  const DEFAULT_URL = isLocalHost
    ? "ws://localhost:8080"
    : ((window.location.protocol === "https:" ? "wss" : "ws") + "://localhost:8080");

  const state = {
    serverUrl: window.ONLINE_SERVER_URL || DEFAULT_URL,
    connected: false,
    queueing: false,
    matched: false,
    connecting: false,
    status: "Disconnected",
    region: "global",
    roomId: null,
    clientId: null,
    opponent: null,
    ws: null,
    lastPongAt: 0,
    lastError: null,
    shouldQueueAfterConnect: false
  };

  function emit(evt, payload) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return false;
    state.ws.send(JSON.stringify({ type: evt, ...payload }));
    return true;
  }

  function baseIdentity() {
    const name = (window.getActiveProfileName && window.getActiveProfileName()) || "Player";
    const country = "US";
    return { name, country };
  }

  function connect() {
    if (state.connected || state.connecting) return;

    state.connecting = true;
    state.status = "Connecting...";
    state.lastError = null;

    const ws = new WebSocket(state.serverUrl);
    state.ws = ws;

    ws.onopen = function () {
      state.connected = true;
      state.connecting = false;
      state.status = "Connected";
      const id = baseIdentity();
      emit("hello", { name: id.name, country: id.country, region: state.region });
      if (state.shouldQueueAfterConnect) {
        emit("queue_join", { region: state.region });
      }
    };

    ws.onmessage = function (ev) {
      let msg = null;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (msg.type === "connected") {
        state.clientId = msg.clientId;
        return;
      }

      if (msg.type === "hello_ack") {
        state.status = "Ready";
        return;
      }

      if (msg.type === "queue_joined") {
        state.queueing = true;
        state.status = "Searching for opponent...";
        return;
      }

      if (msg.type === "queue_left") {
        state.queueing = false;
        state.status = "Ready";
        return;
      }

      if (msg.type === "match_found") {
        state.matched = true;
        state.queueing = false;
        state.roomId = msg.roomId || null;
        state.opponent = msg.opponent || null;
        state.status = `Matched vs ${(state.opponent && state.opponent.name) || "Opponent"}`;
        if (window.onOnlineMatchFound) window.onOnlineMatchFound(msg);
        return;
      }

      if (msg.type === "match_ended") {
        state.matched = false;
        state.roomId = null;
        state.status = "Match ended";
        if (window.onOnlineMatchEnded) window.onOnlineMatchEnded(msg.result || null);
        return;
      }

      if (msg.type === "opponent_disconnected") {
        state.matched = false;
        state.queueing = false;
        state.roomId = null;
        state.status = "Opponent disconnected";
        return;
      }

      if (msg.type === "pong") {
        state.lastPongAt = Date.now();
        return;
      }

      if (msg.type === "error") {
        state.lastError = msg.message || "Unknown server error";
        state.status = `Error: ${state.lastError}`;
        return;
      }

      if (msg.type === "opponent_input" && window.onOnlineOpponentInput) {
        window.onOnlineOpponentInput(msg);
      }
      if (msg.type === "opponent_state" && window.onOnlineOpponentState) {
        window.onOnlineOpponentState(msg);
      }
    };

    ws.onerror = function () {
      state.lastError = `Socket error (${state.serverUrl})`;
      state.status = "Connection failed";
    };

    ws.onclose = function (ev) {
      state.connected = false;
      state.connecting = false;
      state.queueing = false;
      state.matched = false;
      state.roomId = null;
      const reason = ev && ev.reason ? ` - ${ev.reason}` : "";
      const code = ev && ev.code ? ` (code ${ev.code})` : "";
      state.status = `Disconnected${code}${reason}`;
    };
  }

  function disconnect() {
    if (!state.ws) return;
    try { emit("queue_leave", {}); } catch (e) {}
    try { state.ws.close(); } catch (e) {}
  }

  function joinQueue() {
    state.shouldQueueAfterConnect = true;
    if (!state.connected) connect();
    const id = baseIdentity();
    emit("hello", { name: id.name, country: id.country, region: state.region });
    emit("queue_join", { region: state.region });
  }

  function leaveQueue() {
    state.shouldQueueAfterConnect = false;
    emit("queue_leave", {});
    state.queueing = false;
    if (!state.matched) state.status = "Ready";
  }

  function reportResult(didWin, pointsFor, pointsAgainst) {
    if (!state.roomId) return;
    emit("match_result", {
      roomId: state.roomId,
      didWin: !!didWin,
      pointsFor: Math.max(0, Number(pointsFor) || 0),
      pointsAgainst: Math.max(0, Number(pointsAgainst) || 0)
    });
  }

  function sendInput(frame, payload) {
    if (!state.roomId) return;
    emit("input", { roomId: state.roomId, frame: Number(frame) || 0, payload: payload || {} });
  }

  function sendState(frame, payload) {
    if (!state.roomId) return;
    emit("state", { roomId: state.roomId, frame: Number(frame) || 0, payload: payload || {} });
  }

  window.online1v1 = {
    connect,
    disconnect,
    joinQueue,
    leaveQueue,
    reportResult,
    sendInput,
    sendState,
    getState: function () {
      return {
        serverUrl: state.serverUrl,
        connected: state.connected,
        queueing: state.queueing,
        matched: state.matched,
        connecting: state.connecting,
        status: state.status,
        region: state.region,
        roomId: state.roomId,
        clientId: state.clientId,
        opponent: state.opponent,
        lastPongAt: state.lastPongAt,
        lastError: state.lastError
      };
    }
  };
})();
