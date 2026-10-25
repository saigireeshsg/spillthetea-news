// Spill data layer for spillthetea.news.
// Gives the page the same small API it used inside claude.ai (window.claude.use("db"/"user")),
// backed by static JSON for stories and Supabase for votes, comments and reading progress.
(function () {
  "use strict";
  const STATIC = new Set(["drops", "storylines", "notifs", "live", "now", "weekly", "upsc"]);
  const POLL_MS = 2 * 60 * 1000; // auto-load: new stories appear within ~2 min, no manual refresh
  const C = window.SPILL_CONFIG || {};
  const sb = C.supabaseUrl && C.supabaseAnonKey && window.supabase
    ? window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;
  window.spillSB = sb;
  if (!sb) console.warn("Spill: Supabase not configured, votes and comments are off.");

  const snap = (rows) => ({
    docs: rows.map((r) => ({ id: r.id, exists: true, data: () => r.data })),
    size: rows.length,
    empty: !rows.length,
  });

  let uidP = null;
  function ensureUser() {
    if (!sb) return Promise.reject(new Error("offline"));
    if (uidP) return uidP;
    uidP = (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (session) return session.user.id;
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) throw error;
      return data.user.id;
    })().catch((e) => { uidP = null; throw e; });
    return uidP;
  }

  const cache = {};
  async function loadStatic(col) {
    const res = await fetch(`/data/${col}.json?t=${Math.floor(Date.now() / 60000)}`);
    if (!res.ok) return [];
    return res.json();
  }
  async function loadRemote(col) {
    if (!sb) return [];
    const out = [];
    const P = 1000;
    for (let from = 0; ; from += P) {
      const { data, error } = await sb.from("docs").select("id,data").eq("collection", col).range(from, from + P - 1);
      if (error) throw error;
      out.push(...data);
      if (data.length < P) break;
    }
    return out;
  }
  const load = (col) => (STATIC.has(col) ? loadStatic(col) : loadRemote(col));

  function query(col) {
    let order = null;
    let lim = null;
    const q = {
      orderBy(field, dir) { order = [field, dir]; return q; },
      limit(n) { lim = n; return q; },
      where() { return q; },
      async get() {
        let rows = (await load(col)).slice();
        if (order) {
          const [f, d] = order;
          rows.sort((a, b) => {
            const x = a.data?.[f], y = b.data?.[f];
            return (x > y ? 1 : x < y ? -1 : 0) * (d === "desc" ? -1 : 1);
          });
        }
        if (lim) rows = rows.slice(0, lim);
        cache[col] = rows;
        return snap(rows);
      },
      onSnapshot(cb, onErr) {
        let alive = true;
        let timer = null;
        const run = () => q.get().then((s) => alive && cb(s)).catch((e) => alive && onErr && onErr(e));
        run();
        let stop = () => {};
        if (STATIC.has(col)) {
          const iv = setInterval(() => { if (!document.hidden) run(); }, POLL_MS);
          const onVis = () => { if (!document.hidden) run(); }; // coming back to the app = instant refresh
          document.addEventListener("visibilitychange", onVis);
          stop = () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
        } else if (sb) {
          const ch = sb
            .channel(`docs:${col}:${Math.random().toString(36).slice(2)}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: `collection=eq.${col}` }, () => {
              clearTimeout(timer);
              timer = setTimeout(run, 400);
            })
            .subscribe();
          stop = () => sb.removeChannel(ch);
        }
        return () => { alive = false; stop(); };
      },
      doc(id) { return docRef(col, id); },
    };
    return q;
  }

  function docRef(col, id) {
    return {
      async get() {
        if (STATIC.has(col)) {
          const r = (await loadStatic(col)).find((x) => x.id === id);
          return { exists: !!r, data: () => (r ? r.data : undefined) };
        }
        if (!sb) return { exists: false, data: () => undefined };
        const { data, error } = await sb.from("docs").select("data").eq("collection", col).eq("id", id).maybeSingle();
        if (error) throw error;
        return { exists: !!data, data: () => (data ? data.data : undefined) };
      },
      async set(obj) {
        if (STATIC.has(col)) throw new Error("read-only");
        await ensureUser();
        const { error } = await sb.from("docs").upsert({ collection: col, id, data: obj, updated_at: new Date().toISOString() });
        if (error) throw error;
      },
      async delete() {
        if (STATIC.has(col)) throw new Error("read-only");
        await ensureUser();
        const { error } = await sb.from("docs").delete().eq("collection", col).eq("id", id);
        if (error) throw error;
      },
    };
  }

  const db = {
    collection: query,
    doc(path) {
      const i = path.lastIndexOf("/");
      return docRef(path.slice(0, i), path.slice(i + 1));
    },
  };
  const user = {
    id: () => ensureUser(),
    me: async () => ({ name: "" }),
  };

  window.claude = {
    use: async (name) => (name === "db" ? db : name === "user" ? (sb ? user : null) : null),
  };
})();
