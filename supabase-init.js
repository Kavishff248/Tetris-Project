console.log("Tetris backend client loading...");

const SUPABASE_URL = "https://lfpbrxsrvjizukugsvsq.supabase.co";
const SUPABASE_KEY = "sb_publishable_kSb7Sv1RWOq8bernfgXYLw_RPwLon9r";

(function () {
  const REST_URL = SUPABASE_URL + "/rest/v1";
  const REALTIME_URL =
    "wss://lfpbrxsrvjizukugsvsq.supabase.co/realtime/v1/websocket?apikey=" +
    encodeURIComponent(SUPABASE_KEY) +
    "&vsn=1.0.0";

  function apiError(message, status, details) {
    const err = new Error(message);
    err.status = status;
    err.details = details;
    return err;
  }

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.orders = [];
      this.limitValue = null;
      this.selectColumns = null;
      this.returnData = false;
      this.method = "GET";
      this.body = undefined;
      this.singleMode = null;
    }

    select(columns = "*") {
      this.selectColumns = columns;
      if (this.method === "GET") this.method = "GET";
      this.returnData = true;
      return this;
    }

    eq(column, value) {
      this.filters.push([column, "eq", value]);
      return this;
    }

    order(column, options = {}) {
      this.orders.push([column, options.ascending === false ? "desc" : "asc"]);
      return this;
    }

    limit(value) {
      this.limitValue = Math.max(0, Number(value) || 0);
      return this;
    }

    maybeSingle() {
      this.singleMode = "maybe";
      return this;
    }

    single() {
      this.singleMode = "single";
      return this;
    }

    insert(values) {
      this.method = "POST";
      this.body = values;
      return this;
    }

    update(values) {
      this.method = "PATCH";
      this.body = values;
      return this;
    }

    delete() {
      this.method = "DELETE";
      return this;
    }

    then(resolve, reject) {
      return this.execute().then(resolve, reject);
    }

    catch(reject) {
      return this.execute().catch(reject);
    }

    async execute() {
      const params = new URLSearchParams();

      if (this.method === "GET" || this.method === "PATCH" || this.method === "DELETE") {
        if (this.selectColumns) params.set("select", this.selectColumns);
      } else if (this.returnData || this.singleMode) {
        params.set("select", this.selectColumns || "*");
      }

      for (const [column, operator, value] of this.filters) {
        params.set(column, operator + "." + String(value));
      }

      if (this.orders.length) {
        params.set(
          "order",
          this.orders.map(([column, direction]) => column + "." + direction).join(",")
        );
      }

      if (this.limitValue !== null) params.set("limit", String(this.limitValue));

      const url = REST_URL + "/" + encodeURIComponent(this.table) +
        (params.toString() ? "?" + params.toString() : "");

      const headers = {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json"
      };

      if (this.method === "POST") {
        headers.Prefer = this.returnData || this.singleMode
          ? "return=representation"
          : "return=minimal";
      } else if (this.method === "PATCH") {
        headers.Prefer = this.returnData || this.singleMode
          ? "return=representation"
          : "return=minimal";
      }

      try {
        const response = await fetch(url, {
          method: this.method,
          headers,
          body: this.body === undefined ? undefined : JSON.stringify(this.body)
        });

        const text = await response.text();
        let data = null;
        if (text) {
          try { data = JSON.parse(text); }
          catch (_) { data = text; }
        }

        if (!response.ok) {
          return { data: null, error: apiError(
            data?.message || data?.error_description || data?.hint || "Supabase request failed",
            response.status,
            data
          ) };
        }

        if (this.singleMode === "single") {
          if (!Array.isArray(data) || data.length !== 1) {
            return { data: null, error: apiError("Expected exactly one row.", response.status, data) };
          }
          data = data[0];
        } else if (this.singleMode === "maybe") {
          if (Array.isArray(data)) {
            if (data.length > 1) {
              return { data: null, error: apiError("Expected zero or one row.", response.status, data) };
            }
            data = data[0] ?? null;
          }
        }

        return { data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    }
  }

  class RealtimeChannel {
    constructor(client, name, options = {}) {
      this.client = client;
      this.name = name;
      this.topic = "realtime:" + name;
      this.options = options;
      this.handlers = [];
      this.socket = null;
      this.ref = 0;
      this.joined = false;
      this.closed = false;
      this.statusCallback = null;
    }

    on(type, filter, callback) {
      this.handlers.push({ type, filter: filter || {}, callback });
      return this;
    }

    subscribe(callback) {
      this.statusCallback = callback;
      this.connect();
      return this;
    }

    connect() {
      if (this.closed) return;

      try {
        this.socket = new WebSocket(REALTIME_URL);
      } catch (err) {
        this.statusCallback?.("CHANNEL_ERROR", err);
        return;
      }

      this.socket.onopen = () => {
        this.push("phx_join", {
          config: {
            broadcast: {
              self: false,
              ack: !!this.options?.config?.broadcast?.ack
            },
            presence: { key: "" },
            private: false
          },
          access_token: SUPABASE_KEY
        });
      };

      this.socket.onmessage = event => {
        let message;
        try { message = JSON.parse(event.data); } catch (_) { return; }

        if (message.topic !== this.topic && message.topic !== "phoenix") return;

        if (message.event === "phx_reply" && message.payload?.response?.status === "ok") {
          if (!this.joined) {
            this.joined = true;
            this.statusCallback?.("SUBSCRIBED", null);
          }
          return;
        }

        if (message.event === "broadcast") {
          const payload = message.payload || {};
          const eventName = payload.event;
          for (const handler of this.handlers) {
            if (handler.type !== "broadcast") continue;
            if (handler.filter?.event && handler.filter.event !== eventName) continue;
            handler.callback({
              payload: payload.payload,
              event: eventName
            });
          }
          return;
        }

        if (message.event === "phx_error") {
          const err = apiError("Realtime channel error", 0, message.payload);
          this.statusCallback?.("CHANNEL_ERROR", err);
        }
      };

      this.socket.onerror = () => {
        this.statusCallback?.("CHANNEL_ERROR", apiError("Realtime WebSocket error"));
      };

      this.socket.onclose = () => {
        if (!this.closed) {
          this.joined = false;
          this.statusCallback?.("CLOSED", null);
        }
      };
    }

    push(event, payload) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error("Realtime connection is not open."));
      }
      this.ref += 1;
      const message = {
        topic: this.topic,
        event,
        payload,
        ref: String(this.ref)
      };
      this.socket.send(JSON.stringify(message));
      return Promise.resolve({ ok: true });
    }

    send(message) {
      if (!this.joined) return Promise.reject(new Error("Realtime channel is not subscribed."));
      if (!message || message.type !== "broadcast") {
        return Promise.reject(new Error("Only broadcast messages are supported."));
      }
      return this.push("broadcast", {
        type: "broadcast",
        event: message.event,
        payload: message.payload
      });
    }

    unsubscribe() {
      this.closed = true;
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try { this.push("phx_leave", {}); } catch (_) {}
      }
      if (this.socket) {
        try { this.socket.close(); } catch (_) {}
      }
      this.socket = null;
      this.joined = false;
      return Promise.resolve("ok");
    }
  }

  const client = {
    from(table) {
      return new QueryBuilder(table);
    },

    channel(name, options) {
      const channel = new RealtimeChannel(client, name, options);
      client._channels.push(channel);
      return channel;
    },

    removeChannel(channel) {
      if (!channel) return Promise.resolve("ok");
      const index = client._channels.indexOf(channel);
      if (index >= 0) client._channels.splice(index, 1);
      return channel.unsubscribe();
    },

    _channels: []
  };

  window.supabase = client;
  console.log("Tetris backend client ready — no third-party Supabase script");
})();
