// Spill live wire: ranked Hyderabad / Telangana / India headlines from public.live_wire.
// Ranked server-side every 10 min by recency, relatability, outlet coverage and importance.
(function () {
  "use strict";
  const sb = window.spillSB;
  if (!sb) return;
  let W = [];
  let sig = "";
  let fetchedAt = 0;
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ago = (t) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(t)) / 60000)); return m < 1 ? "just now" : m < 60 ? m + " min ago" : Math.round(m / 60) + " h ago"; };
  const REG = { hyderabad: "📍 Hyderabad", telangana: "🗺️ Telangana", india: "🇮🇳 India" };

  const css = document.createElement("style");
  css.textContent = `
.wire{margin:0 0 12px}
.wire .wl{display:block;text-decoration:none;color:inherit;padding:10px 2px;border-top:1px solid var(--line,#343536)}
.wire .wl:first-of-type{border-top:0}
.wire .wt{display:block;font-size:14.5px;font-weight:700;line-height:1.35;color:var(--fg,#d7dadc)}
.wire .wm{display:flex;flex-wrap:wrap;gap:4px 8px;margin-top:4px;font-size:12px;color:var(--muted,#a3acb0)}
.wire .tg{font-weight:800;border-radius:999px;padding:1px 7px;font-size:11px}
.wire .tg.new{background:#ff4500;color:#fff}.wire .tg.al{background:#e5383b;color:#fff}.wire .tg.cv{background:#1f3b57;color:#9fd3ff}
.wire .wfoot{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:12px;color:var(--muted,#a3acb0)}
.wire .wfoot button{border:0;background:none;color:#4fbcff;font-weight:800;font-size:13px;padding:4px 0}
`;
  document.head.appendChild(css);

  function item(x) {
    const why = x.why || [];
    const tags = [
      why.includes("new") ? `<span class="tg new">NEW</span>` : "",
      why.includes("alert") ? `<span class="tg al">ALERT</span>` : "",
      x.outlets >= 2 ? `<span class="tg cv">${E(x.outlets)} outlets</span>` : "",
    ].join("");
    return `<a class="wl" href="${E(x.url)}" target="_blank" rel="noopener"><span class="wt">${E(x.title)}</span><span class="wm">${tags}<span>${REG[x.region] || ""}</span><span>· ${E(x.publisher || "")}</span><span>· ${ago(x.published_at)}</span></span></a>`;
  }

  function pickFor(scope) {
    if (scope === "local") return W.filter((x) => x.region === "hyderabad" || x.region === "telangana");
    if (scope === "national") return W.filter((x) => x.region === "india");
    return W; // home: everything, already ranked
  }

  window.wireCount = (scope) => pickFor(scope).length;

  window.wireHTML = function (scope, n) {
    const list = pickFor(scope).slice(0, n || 6);
    if (!list.length) return "";
    const head = scope === "home"
      ? `<div class="lh"><span class="ldot" aria-hidden="true"></span><b>LIVE WIRE · HYDERABAD & INDIA</b><span class="upd">ranked ${fetchedAt ? ago(new Date(fetchedAt).toISOString()) : ""}</span></div>`
      : `<span class="lgrp">Latest headlines · ranked by what matters to you</span>`;
    const foot = scope === "home"
      ? `<div class="wfoot"><span>Tap a headline to read it at the source</span><button data-act="live" data-key="local">More →</button></div>`
      : `<div class="wfoot"><span>Updated every 10 min · headlines link to the original outlet</span></div>`;
    return `<section class="livebox wire" aria-label="Live wire">${head}${list.map(item).join("")}${foot}</section>`;
  };

  async function load() {
    try {
      const { data, error } = await sb.from("live_wire").select("id,title,publisher,url,region,published_at,score,outlets,why").order("score", { ascending: false }).limit(40);
      if (!error && data) {
        W = data;
        fetchedAt = Date.now();
        const s = data.map((x) => x.id).join(",");
        if (s !== sig && window.spillRerender) window.spillRerender();
        sig = s;
      }
    } catch (_) { /* keep last */ }
    setTimeout(load, document.hidden ? 300e3 : 120e3);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - fetchedAt > 60e3) load(); });
  load();
})();
