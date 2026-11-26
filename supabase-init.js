console.log("Tetris backend client loading...");

const SUPABASE_URL = "https://lfpbrxsrvjizukugsvsq.supabase.co";
const SUPABASE_KEY = "sb_publishable_kSb7Sv1RWOq8bernfgXYLw_RPwLon9r";

(function () {
  const REST_URL = SUPABASE_URL + "/rest/v1";

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this._select = "*";
      this._filters = [];
      this._order = [];
      this._limit = null;
      this._method = "GET";
      this._body = null;
      this._maybeSingle = false;
      this._isUpdate = false;
      this._isInsert = false;
    }

    select(cols) {
      this._select = cols || "*";
      this._method = "GET";
      return this;
    }

    eq(col, val) {
      this._filters.push(`${col}=eq.${encodeURIComponent(val)}`);
      return this;
    }

    order(col, opts) {
      const asc = opts && opts.ascending === false ? "desc" : "asc";
      this._order.push(`${col}.${asc}`);
      return this;
    }

    limit(n) {
      this._limit = n;
      return this;
    }

    maybeSingle() {
      this._maybeSingle = true;
      return this;
    }

    insert(rows) {
      this._method = "POST";
      this._isInsert = true;
      this._body = rows;
      return this;
    }

    update(payload) {
      this._method = "PATCH";
      this._isUpdate = true;
      this._body = payload;
      return this;
    }

    async then(resolve, reject) {
      try {
        const result = await this._execute();
        if (resolve) return resolve(result);
        return result;
      } catch (e) {
        if (reject) return reject(e);
        throw e;
      }
    }

    async _execute() {
      let url = `${REST_URL}/${this.table}`;
      const params = [];
      if (this._method === "GET" || this._isUpdate) {
        params.push(`select=${encodeURIComponent(this._select)}`);
        this._filters.forEach(f => params.push(f));
        if (this._order.length) params.push(`order=${this._order.join(",")}`);
        if (this._limit != null) params.push(`limit=${this._limit}`);
      }
      if (params.length) url += "?" + params.join("&");

      const headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      };
      if (this._maybeSingle) {
        headers["Accept"] = "application/vnd.pgrst.object+json";
      }

      const opts = { method: this._method, headers };
      if (this._body != null) {
        opts.body = JSON.stringify(this._body);
      }

      const res = await fetch(url, opts);
      let data = null;
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }
      }

      if (!res.ok) {
        const err = {
          message: (data && data.message) || res.statusText || "Request failed",
          code: data && data.code,
          details: data && data.details,
          status: res.status
        };
        return { data: null, error: err };
      }

      if (this._maybeSingle) {
        if (Array.isArray(data)) data = data[0] || null;
        return { data, error: null };
      }

      return { data, error: null };
    }
  }

  const client = {
    from(table) {
      return new QueryBuilder(table);
    }
  };

  window.supabase = client;
  console.log("Tetris backend client ready — no third-party Supabase script");
})();
