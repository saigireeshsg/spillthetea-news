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
.wire .warch{opacity:.75;border-top:1px dashed var(--line,#343536);margin-top:6px}.wire .wdeep{display:block;width:100%;margin-top:10px;font:inherit;font-size:13.5px;font-weight:800;text-align:left;cursor:pointer;border:1px solid var(--line-2,#3a3a3c);background:var(--card-2,#202024);color:var(--fg);border-radius:12px;padding:10px 12px}
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
    return `<a class="wl" href="${E(x.url)}" target="_blank" rel="noopener"><span class="wt">${E(x.hook || x.title)}</span><span class="wm">${tags}<span>${REG[x.region] || ""}</span><span>· ${E(x.publisher || "")}</span><span>· ${ago(x.published_at)}</span></span></a>`;
  }

  // The wire keeps the day's most important stories (ranked server-side); the Live page shows them newest first.
  const byNew = (a, b) => Date.parse(b.published_at || 0) - Date.parse(a.published_at || 0);
  function pickFor(scope) {
    if (scope === "local") return W.filter((x) => x.region === "hyderabad" || x.region === "telangana").sort(byNew);
    if (scope === "national") return W.filter((x) => x.region === "india").sort(byNew);
    return W; // home: everything, already ranked
  }

  window.wireCount = (scope) => pickFor(scope).length;
  // ---------- Civic alerts (power, water, weather, traffic, holidays): detected automatically every 10 min ----------
  let CA = [];
  const KIND_ICON = { power: "⚡", water: "🚰", weather: "🌧️", traffic: "🚦", holiday: "🏫", metro: "🚇" };
  const KIND_NAME = { power: "Power cut", water: "Water supply", weather: "Weather alert", traffic: "Traffic", holiday: "Holiday", metro: "Metro" };
  const caLive = (a) => { const d = a.details || {}; const end = d.valid_until ? Date.parse(d.valid_until) : Date.parse(a.published_at || a.created_at) + 18 * 3600e3; return end > Date.now(); };
  window.civicHTML = function (scope) {
    if (scope && scope !== "local") return "";
    const list = CA.slice(0, 6);
    if (!list.length) return "";
    return `<section class="livebox calerts" aria-label="Alerts"><span class="lgrp">🚨 Alerts · power, water, weather</span>${list.map((a) => { const d = a.details || {};
      const meta = d.where ? `${E(d.when || "")}${d.when ? " · " : ""}${E(d.where.slice(0, 3).join(", "))}${d.where.length > 3 ? ` +${d.where.length - 3}` : ""}` : "Checking areas & timings…";
      return `<button class="ca" data-ca="${E(a.id)}"><span class="ci">${KIND_ICON[a.kind] || "🚨"}</span><span class="ct"><small>${E(d.level || KIND_NAME[a.kind] || "Alert")} · ${ago(a.published_at || a.created_at)}</small><b>${E(d.push_title ? d.push_title.replace(/^\S+\s/, "") : a.headline)}</b><span>${meta} · <u>full details</u></span></span></button>`; }).join("")}</section>`;
  };
  // In-app alert sheet: everything a reader needs (where, when, what to do, official link), no need to leave Spill.
  const caCss = document.createElement("style");
  caCss.textContent = `.calerts .ca{font:inherit;color:inherit;text-align:left;width:100%;cursor:pointer;background:none;border:0}
.casheet{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}
.casheet .cab{background:var(--card,#17171a);border:1px solid var(--line,#2e2e33);border-radius:20px 20px 0 0;width:100%;max-width:560px;max-height:88vh;overflow:auto;padding:18px 16px calc(20px + env(safe-area-inset-bottom,0px));display:grid;gap:12px}
.casheet .cak{font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#ff8a65}
.casheet h3{margin:0;font-size:21px;line-height:1.25}.casheet p{margin:0;font-size:15px;line-height:1.5}
.casheet .cag{display:grid;gap:6px;background:var(--card-2,#202024);border-radius:14px;padding:12px}
.casheet .cag small{font-size:12px;font-weight:800;color:var(--muted,#9aa5ad);text-transform:uppercase;letter-spacing:.04em}
.casheet .chips{display:flex;flex-wrap:wrap;gap:6px}.casheet .chips span{background:#3a1d10;color:#ffd7c4;border-radius:999px;padding:5px 11px;font-size:14px;font-weight:700}
.casheet ul{margin:0;padding-left:18px;display:grid;gap:6px;font-size:14.5px;line-height:1.45}
.casheet .ok{background:#0f2a18;color:#9be7b0;border-radius:12px;padding:10px 12px;font-size:14px;font-weight:600}
.casheet .off{display:block;text-align:center;font-weight:800;border-radius:999px;padding:12px;background:var(--orange,#ff4500);color:#fff;text-decoration:none}
.casheet .src{font-size:12.5px;color:var(--muted,#9aa5ad)}.casheet .src a{color:inherit}
.casheet .x{justify-self:end;font:inherit;font-weight:800;border:0;background:var(--card-2,#202024);color:inherit;border-radius:999px;padding:6px 12px;cursor:pointer}`;
  document.head.appendChild(caCss);
  function caOpen(id) {
    const a = CA.find((x) => String(x.id) === String(id)); if (!a) return false;
    const d = a.details || {};
    const el = document.createElement("div"); el.className = "casheet";
    el.innerHTML = `<div class="cab" role="dialog" aria-label="Alert details"><button class="x" data-cax>Close ✕</button>
      <span class="cak">${KIND_ICON[a.kind] || "🚨"} ${E(d.level || KIND_NAME[a.kind] || "Alert")}${d.when ? " · " + E(d.when) : ""}</span>
      <h3>${E(d.push_title ? d.push_title.replace(/^\S+\s/, "") : a.headline)}</h3>
      ${d.summary ? `<p>${E(d.summary)}</p>` : `<p>${E(a.headline)}</p><p class="src">We're checking the exact areas and timings. This updates here as soon as they're confirmed.</p>`}
      ${d.where ? `<div class="cag"><small>📍 ${E(d.where_label || "Where")}</small><div class="chips">${d.where.map((w) => `<span>${E(w)}</span>`).join("")}</div></div>` : ""}
      ${d.timing ? `<div class="cag"><small>⏰ When</small><p>${E(d.timing)}</p></div>` : ""}
      ${d.not_affected ? `<div class="ok">✅ ${E(d.not_affected)}</div>` : ""}
      ${(d.do || []).length ? `<div class="cag"><small>👉 What to do</small><ul>${d.do.map((x) => `<li>${E(x)}</li>`).join("")}</ul></div>` : ""}
      ${d.official ? `<a class="off" href="${E(d.official.url)}" target="_blank" rel="noopener">${E(d.official.label)} ↗</a>` : ""}
      <div class="src">Source: <a href="${E(a.url)}" target="_blank" rel="noopener">${E(a.publisher || "report")}</a> · ${ago(a.published_at || a.created_at)}</div></div>`;
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-cax]")) { el.remove(); if (/^#alert\//.test(location.hash)) history.replaceState(null, "", location.pathname + location.search); } });
    document.body.appendChild(el);
    try { window.spillTrack && window.spillTrack("alert_open", { id: a.id, kind: a.kind, enriched: !!a.details }); } catch (_) {}
    return true;
  }
  window.civicOpen = caOpen;
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-ca]"); if (!b) return; e.preventDefault(); e.stopPropagation(); caOpen(b.dataset.ca); }, true);
  let caDeep = (location.hash.match(/^#alert\/(\d+)/) || [])[1];
  window.addEventListener("hashchange", () => { const m = location.hash.match(/^#alert\/(\d+)/); if (m) caOpen(m[1]); });
  // Home ticker: just the single most important headline + how many more.
  window.wireList = () => W;
  window.wireTop = () => { const k = W.filter((x) => x.tier !== "spicy"); return k.length ? { item: k[0], count: k.length } : null; };
  const more = {};

  // Live page: only what matters. Reader-impact stories ("key") stay 12 h; spicy/other headlines get 3 h, max 3, then move to a collapsed archive.
  const ageH = (x) => (Date.now() - Date.parse(x.published_at || 0)) / 3600e3;
  window.wireHTML = function (scope, n) {
    const all = pickFor(scope);
    if (scope === "home") {
      const list = all.filter((x) => x.tier !== "spicy").slice(0, n || 6); if (!list.length) return "";
      return `<section class="livebox wire" aria-label="Live wire"><div class="lh"><span class="ldot" aria-hidden="true"></span><b>LIVE WIRE · HYDERABAD & INDIA</b><span class="upd">ranked ${fetchedAt ? ago(new Date(fetchedAt).toISOString()) : ""}</span></div>${list.map(item).join("")}<div class="wfoot"><span>Tap a headline to read it at the source</span><button data-act="live" data-key="local">More →</button></div></section>`;
    }
    const key = all.filter((x) => (x.tier || "key") === "key" && ageH(x) < 12);
    const cap = more[scope] ? key.length : Math.min(n || 6, 10);
    const top = key.slice(0, cap);
    const buzz = all.filter((x) => x.tier && x.tier !== "key" && ageH(x) < 3).slice(0, 3);
    const arch = all.filter((x) => !top.includes(x) && !buzz.includes(x) && !(key.includes(x) && !more[scope] && key.indexOf(x) >= cap));
    if (!top.length && !buzz.length) return "";
    let h = `<section class="livebox wire" aria-label="Live wire"><span class="lgrp">Matters today · newest first</span>${top.map(item).join("")}`;
    if (key.length > cap) h += `<div class="wfoot"><span></span><button data-wmore="${scope}">${key.length - cap} more that matter ↓</button></div>`;
    if (buzz.length) h += `<span class="lgrp" style="margin-top:10px;display:block">👀 Also buzzing · fades in 3 h</span>${buzz.map(item).join("")}`;
    h += `<div class="wfoot"><span>Updated every 10 min</span>${arch.length ? `<button data-warch="${scope}">📦 Archive · ${arch.length}</button>` : ""}</div>`;
    if (archOpen[scope] && arch.length) h += `<div class="warch">${arch.map(item).join("")}</div>`;
    h += `<button class="wdeep" data-wdeep="1">🧠 Want the why behind today's news? Read the explainers on Home →</button>`;
    return h + `</section>`;
  };
  const archOpen = {};
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-wdeep]"); if (!b) return; e.preventDefault(); e.stopPropagation(); try { window.spillTrack && window.spillTrack("live_go_deep"); } catch (_) {} const c = document.querySelector('[data-f="all"]'); if (c) { c.click(); window.scrollTo(0, 0); } }, true);
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-warch]"); if (!b) return; e.preventDefault(); e.stopPropagation(); archOpen[b.dataset.warch] = !archOpen[b.dataset.warch]; window.spillRerender && window.spillRerender(); }, true);

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
.calerts{border-color:#7a1f1f!important}
.ca{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:start;text-decoration:none;color:inherit;padding:9px 0;border-top:1px solid var(--line,#343536)}
.ca:first-of-type{border-top:0}
.ca .ci{width:34px;height:34px;border-radius:10px;background:#3a0f17;display:grid;place-items:center;font-size:17px}
.ca small{display:block;font-size:11.5px;font-weight:800;color:#ff8a8a;letter-spacing:.03em}
.ca b{display:block;font-size:14.5px;line-height:1.35;margin:2px 0}
.ca .ct span{font-size:12px;color:var(--muted,#a3acb0)}
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
    const items = W.filter((x) => x.tier !== "spicy").sort(byNew).slice(0, 10);
    const cr = window.cricTop ? window.cricTop() : null;
    const al = CA.slice(0, 3).map((a) => `<span class="hl-it cr" data-ca="${E(a.id)}" style="cursor:pointer">${KIND_ICON[a.kind] || "🚨"} ${E(a.details && a.details.push_title ? a.details.push_title.replace(/^\S+\s/, "") : a.headline)}</span>`);
    const parts = al.concat(cr ? [`<span class="hl-it cr">${E(cr)}</span>`] : []).concat(items.map((x) => `<span class="hl-it">${E(x.hook || x.title)} <small>${mins(x.published_at)}</small></span>`));
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
      const since = new Date(Date.now() - 5 * 86400e3).toISOString();
      sb.from("civic_alerts").select("id,kind,headline,publisher,url,lang,published_at,created_at,details,enriched_at,note").gte("created_at", since).order("published_at", { ascending: false }).limit(12)
        .then(({ data: ca }) => { if (ca) { ca = ca.filter((x) => caLive(x) && x.note !== "not for readers"); const changed = ca.map((x) => x.id + ":" + (x.enriched_at || "")).join() !== CA.map((x) => x.id + ":" + (x.enriched_at || "")).join(); CA = ca; if (changed) { hotline(); window.spillRerender && window.spillRerender(); } if (caDeep && caOpen(caDeep)) caDeep = null; } });
      const { data, error } = await sb.from("live_wire").select("id,title,hook,publisher,url,region,published_at,score,outlets,why,tier").order("score", { ascending: false }).limit(60);
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
