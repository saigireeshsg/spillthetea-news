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

  // The wire keeps the day's most important stories (ranked server-side); the Live page shows them newest first.
  const byNew = (a, b) => Date.parse(b.published_at || 0) - Date.parse(a.published_at || 0);
  function pickFor(scope) {
    if (scope === "local") return W.filter((x) => x.region === "hyderabad" || x.region === "telangana").sort(byNew);
    if (scope === "national") return W.filter((x) => x.region === "india").sort(byNew);
    return W; // home: everything, already ranked
  }

  window.wireCount = (scope) => pickFor(scope).length;
  // Home ticker: just the single most important headline + how many more.
  window.wireList = () => W;
  window.wireTop = () => (W.length ? { item: W[0], count: W.length } : null);
  const more = {};

  window.wireHTML = function (scope, n) {
    const all = pickFor(scope);
    const cap = more[scope] ? all.length : Math.min(n || 6, 15);
    const list = all.slice(0, cap);
    if (!list.length) return "";
    const head = scope === "home"
      ? `<div class="lh"><span class="ldot" aria-hidden="true"></span><b>LIVE WIRE · HYDERABAD & INDIA</b><span class="upd">ranked ${fetchedAt ? ago(new Date(fetchedAt).toISOString()) : ""}</span></div>`
      : `<span class="lgrp">Latest first · the day's stories that matter most</span>`;
    const foot = scope === "home"
      ? `<div class="wfoot"><span>Tap a headline to read it at the source</span><button data-act="live" data-key="local">More →</button></div>`
      : `<div class="wfoot"><span>Updated every 10 min · tap to read at the source</span>${all.length > cap ? `<button data-wmore="${scope}">Show ${all.length - cap} more ↓</button>` : ""}</div>`;
    return `<section class="livebox wire" aria-label="Live wire">${head}${list.map(item).join("")}${foot}</section>`;
  };

  document.addEventListener("click", (e) => { const b = e.target.closest("[data-wmore]"); if (b) { e.preventDefault(); e.stopPropagation(); more[b.dataset.wmore] = true; window.spillRerender && window.spillRerender(); } }, true);

  // ---------- Hotline: an always-on LIVE ticker under the menu, on every screen ----------
  const hcss = document.createElement("style");
  hcss.textContent = `
#hotline{display:flex;align-items:center;gap:0;height:34px;border-top:1px solid var(--line,#343536);background:var(--card,#1a1a1b);overflow:hidden;cursor:pointer;font-family:var(--f-ui,system-ui)}
#hotline .hl-tag{flex:none;display:flex;align-items:center;gap:6px;height:100%;padding:0 10px 0 12px;background:#e5383b;color:#fff;font-weight:900;font-size:11.5px;letter-spacing:.08em}
#hotline .hl-tag i{width:7px;height:7px;border-radius:50%;background:#fff;animation:hlp 1.2s infinite}
@keyframes hlp{50%{opacity:.3}}
#hotline .hl-vp{flex:1;min-width:0;overflow:hidden;position:relative;height:100%;mask-image:linear-gradient(90deg,transparent,#000 14px,#000 calc(100% - 24px),transparent)}
#hotline .hl-run{position:absolute;left:0;top:0;height:100%;display:flex;align-items:center;white-space:nowrap;animation:hlrun var(--hl-dur,60s) linear infinite;will-change:transform}
#hotline:hover .hl-run{animation-play-state:paused}
#hotline .hl-it{display:inline-flex;align-items:center;gap:6px;padding:0 18px 0 0;font-size:13px;font-weight:700;color:var(--fg,#d7dadc)}
#hotline .hl-it small{font-size:11px;font-weight:700;color:var(--muted,#a3acb0)}
#hotline .hl-it.cr{color:#ffd166}
#hotline .hl-sep{color:#e5383b;padding-right:18px;font-size:10px}
@keyframes hlrun{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){#hotline .hl-run{animation:none}}
html.embed #hotline{display:none}
#hotline.inflow{max-width:676px;margin:10px auto 0;border:1px solid var(--line,#343536);border-radius:12px;width:calc(100% - 24px)}
html.desk #hotline.inflow{max-width:676px}
`;
  document.head.appendChild(hcss);
  const mins = (t) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(t)) / 60000)); return m < 1 ? "now" : m < 60 ? m + "m" : Math.round(m / 60) + "h"; };
  let hlSig = "";
  // Pinned under the menu on the Live page; everywhere else it sits at the top of the page and scrolls away.
  const onLive = () => { const p = document.querySelector('#subs [aria-pressed="true"]'); const back = document.getElementById("back"); return !!p && p.dataset.f === "live" && (!back || back.hidden); };
  function place(el) {
    const bar = document.querySelector("header.bar"), view = document.getElementById("view");
    if (onLive()) { if (el.parentNode !== bar) { bar.appendChild(el); } el.classList.remove("inflow"); }
    else if (view && el.nextSibling !== view) { view.parentNode.insertBefore(el, view); el.classList.add("inflow"); }
    else if (view) el.classList.add("inflow");
  }
  function hotline() {
    const bar = document.querySelector("header.bar"); if (!bar) return;
    let el = document.getElementById("hotline");
    if (!el) {
      el = document.createElement("div"); el.id = "hotline"; el.setAttribute("role", "link"); el.setAttribute("aria-label", "Live updates: open the Live page");
      el.innerHTML = `<span class="hl-tag"><i></i>LIVE</span><div class="hl-vp"><div class="hl-run"></div></div>`;
      el.addEventListener("click", () => { try { window.spillTrack && window.spillTrack("hotline_click"); } catch (_) {} const b = document.querySelector('[data-f="live"]'); if (b) b.click(); window.scrollTo(0, 0); });
      bar.appendChild(el);
      const subs = document.getElementById("subs"), back = document.getElementById("back");
      const mo = new MutationObserver(() => place(el));
      if (subs) mo.observe(subs, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
      if (back) mo.observe(back, { attributes: true, attributeFilter: ["hidden"] });
    }
    place(el);
    const items = W.slice().sort(byNew).slice(0, 10);
    const cr = window.cricTop ? window.cricTop() : null;
    const parts = (cr ? [`<span class="hl-it cr">${E(cr)}</span>`] : []).concat(items.map((x) => `<span class="hl-it">${E(x.title)} <small>${mins(x.published_at)}</small></span>`));
    if (!parts.length) { el.hidden = true; return; }
    el.hidden = false;
    const sig = parts.join("");
    if (sig === hlSig) return; hlSig = sig;
    const one = parts.join('<span class="hl-sep">●</span>') + '<span class="hl-sep">●</span>';
    const run = el.querySelector(".hl-run");
    run.innerHTML = one + one; // duplicated for a seamless loop
    run.style.setProperty("--hl-dur", Math.max(30, parts.length * 7) + "s");
  }
  window.hotlineRefresh = hotline;
  setInterval(() => { hlSig = ""; hotline(); }, 60000); // keep the "Xm" ages fresh

  async function load() {
    try {
      const { data, error } = await sb.from("live_wire").select("id,title,publisher,url,region,published_at,score,outlets,why").order("score", { ascending: false }).limit(60);
      if (!error && data) {
        W = data;
        fetchedAt = Date.now();
        const s = data.map((x) => x.id).join(",");
        if (s !== sig && window.spillRerender) window.spillRerender();
        sig = s;
        hotline();
      }
    } catch (_) { /* keep last */ }
    setTimeout(load, document.hidden ? 300e3 : 120e3);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - fetchedAt > 60e3) load(); });
  load();
})();
