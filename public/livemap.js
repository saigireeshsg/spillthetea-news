// Spill Live map: puts live alerts (traffic, water, power, air, weather, incidents, events) on a Hyderabad map.
// Location = the area NAMED in the report (matched against a locality list, approx. centre, ~1 km circle).
// We never guess streets. Items with no named area are listed under the map as "City-wide / no exact spot".
(function () {
  "use strict";
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // [lat, lon] approximate locality centres
  const G = {
    "Charminar": [17.3616, 78.4747], "Old City": [17.361, 78.474], "Falaknuma": [17.332, 78.467], "Malakpet": [17.375, 78.512], "Dilsukhnagar": [17.369, 78.526],
    "Kothapet": [17.368, 78.54], "LB Nagar": [17.347, 78.552], "Nagole": [17.377, 78.56], "Uppal": [17.405, 78.559], "Habsiguda": [17.409, 78.54], "Tarnaka": [17.43, 78.537],
    "Kapra": [17.474, 78.565], "Malkajgiri": [17.45, 78.528], "Alwal": [17.5, 78.51], "Secunderabad": [17.439, 78.498], "Kachiguda": [17.395, 78.498], "Kavadiguda": [17.411, 78.497],
    "Narayanaguda": [17.395, 78.486], "Himayatnagar": [17.4, 78.485], "Abids": [17.392, 78.474], "Koti": [17.385, 78.48], "Nampally": [17.3925, 78.4693], "Lakdikapul": [17.405, 78.462],
    "Khairatabad": [17.412, 78.462], "Somajiguda": [17.425, 78.458], "Punjagutta": [17.426, 78.451], "Ameerpet": [17.437, 78.448], "SR Nagar": [17.444, 78.441], "Sanathnagar": [17.456, 78.441],
    "Begumpet": [17.444, 78.467], "Banjara Hills": [17.414, 78.439], "Jubilee Hills": [17.43, 78.407], "Mehdipatnam": [17.396, 78.441], "Tolichowki": [17.4, 78.418], "Golconda": [17.383, 78.401],
    "Attapur": [17.368, 78.429], "Rajendranagar": [17.327, 78.397], "Manikonda": [17.402, 78.386], "Madhapur": [17.448, 78.391], "HITEC City": [17.447, 78.376], "Hitech City": [17.447, 78.376],
    "Gachibowli": [17.44, 78.349], "Kondapur": [17.466, 78.358], "Miyapur": [17.496, 78.357], "Kukatpally": [17.494, 78.399], "KPHB": [17.485, 78.388], "Kokapet": [17.398, 78.33],
    "Financial District": [17.418, 78.342], "Hussain Sagar": [17.4239, 78.4738], "Tank Bund": [17.426, 78.472], "Shamshabad": [17.253, 78.43], "Patancheru": [17.533, 78.265]
  };
  const NAMES = Object.keys(G).sort((a, b) => b.length - a.length);
  const RX = NAMES.map((n) => [n, new RegExp("\\b" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i")]);
  const KINDS = {
    traffic: { n: "Traffic", c: "#ff9f1a", i: "M3 17l3-9h12l3 9M7 17v2M17 17v2M6 12h12" },
    water: { n: "Water", c: "#3aa0ff", i: "M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3z" },
    power: { n: "Power", c: "#ffd21f", i: "M13 2L4 14h7l-1 8 9-12h-7z" },
    air: { n: "Air", c: "#b48cff", i: "M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7" },
    weather: { n: "Weather", c: "#37d6c5", i: "M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5 1A3.5 3.5 0 0 1 16 18zM9 21l1-2M13 21l1-2" },
    incident: { n: "Incident", c: "#ff4d4d", i: "M12 3l10 18H2zM12 10v5M12 18v.5" },
    civic: { n: "Civic", c: "#4cd07d", i: "M4 21V9l8-5 8 5v12M9 21v-6h6v6" },
    event: { n: "Event", c: "#ff6fb5", i: "M5 6h14v13H5zM5 10h14M9 3v4M15 3v4" }
  };
  const CLS = [
    ["traffic", /(traffic|diversion|diverted|restriction|road closure|closed for|jam|flyover|metro|procession|rally|padayatra|vip movement|advisory)/i],
    ["water", /(water (supply|cut|crisis|board|woes)|hmwssb|jalamandali|pipeline|mgd|godavari|manjira|krishna water|borewell|groundwater|reservoir|sagar|dam)/i],
    ["power", /(power cut|power outage|electricity|tgspdcl|substation|load shedding|transformer|outage)/i],
    ["air", /(\baqi\b|air quality|air pollution|smog|haze|pm2\.5|pollution)/i],
    ["weather", /(rain|cyclone|flood|waterlog|thunder|heatwave|cold wave|imd|weather|storm)/i],
    ["incident", /(fire|blaze|accident|collision|killed|crash|blast|gas leak|collapse|stampede|drown)/i],
    ["civic", /(ghmc|sanitation|garbage|drive|hydraa|demolition|encroach|clean)/i],
    ["event", /(festival|mela|utsav|expo|exhibition|concert|match|marathon|fair|theatre|show|passport mela)/i]
  ];
  const kindOf = (t, k) => (KINDS[k] ? k : (CLS.find(([, r]) => r.test(t)) || [null])[0]);
  const place = (t, where) => {
    const w = (where || []).concat(String(t || ""));
    for (const s of w) for (const [n, r] of RX) if (r.test(String(s))) return n;
    return null;
  };
  const items = () => {
    const out = [], seen = new Set(), now = Date.now();
    const add = (o) => { const key = (o.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 60); if (!key || seen.has(key)) return; seen.add(key); out.push(o); };
    try { (window.spillAlerts ? window.spillAlerts() : []).forEach((a) => { const d = a.details || {}; if (d.valid_until && Date.parse(d.valid_until) < now) return; const t = a.headline || a.title; const k = kindOf(t, a.kind); if (!k) return; add({ title: t, kind: k, when: d.when || "", doThis: (d.do || [])[0] || "", where: d.where || [], url: a.url, src: (d.level || "").split("·").pop().trim(), ts: Date.parse(a.published_at || 0) || 0, conf: d.confidence }); }); } catch (_) {}
    try { (window.spillLiveItems ? window.spillLiveItems() : []).forEach((x) => { if (x.until && x.until < now) return; if (now - (x.ts || 0) > 48 * 3600e3) return; const k = kindOf((x.title || "") + " " + (x.body || ""), x.kind); if (!k) return; const s = (x.src || [])[0] || {}; add({ title: x.title, kind: k, when: "", doThis: "", where: x.areas || [], url: s.url, src: s.name || "", ts: x.ts || 0 }); }); } catch (_) {}
    try { (window.wireList ? window.wireList() : []).forEach((w) => { const ageH = (now - Date.parse(w.published_at || 0)) / 3600e3; if (ageH > 24 || w.tier === "spicy") return; const t = w.title || ""; const k = kindOf(t); if (!k) return; add({ title: t, kind: k, when: "", doThis: "", where: [], url: w.url, src: w.publisher || "", ts: Date.parse(w.published_at || 0) || 0 }); }); } catch (_) {}
    return out.sort((a, b) => b.ts - a.ts);
  };
  let filter = "all", data = [];
  const css = `.lmap{position:relative;z-index:0;isolation:isolate;margin:10px 0 12px;border-radius:16px;overflow:hidden;border:1px solid #ffffff22;background:#0f1218}.lmap h3{margin:0;padding:11px 12px 4px;font-size:15px}.lmap .lsub{margin:0;padding:0 12px 8px;font-size:12px;opacity:.7}
.lmap #lmapc{display:block;width:100%;height:auto}.lmap .lchips{display:flex;gap:6px;overflow-x:auto;padding:8px 10px;scrollbar-width:none}.lmap .lchips::-webkit-scrollbar{display:none}
.lmap .lc{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;padding:6px 10px;border-radius:999px;border:1px solid #ffffff2a;background:transparent;color:inherit;font:600 12px/1 inherit;cursor:pointer}
.lmap .lc svg{width:14px;height:14px;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.lmap .lc[aria-pressed="true"]{background:#ffffff18;border-color:#ffffff66}
.lmap .llist{padding:6px 12px 12px;display:grid;gap:8px}.lmap .li{display:grid;grid-template-columns:22px 1fr;gap:8px;font-size:13px;line-height:1.35}.lmap .li svg{width:18px;height:18px;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;margin-top:1px}
.lmap .li b{display:block;font-weight:700}.lmap .li small{opacity:.7}.lmap .li a{color:inherit}.lmap .lnote{padding:0 12px 10px;font-size:11px;opacity:.6}.lmap .lh2{padding:2px 12px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.6}
.lmap #lmapc{background:#0d1017;border-top:1px solid #ffffff14;border-bottom:1px solid #ffffff14}.lmap #lmapc::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:500;box-shadow:inset 0 0 48px 6px #0d1017cc}
.lmap .lm-tint{filter:invert(1) hue-rotate(188deg) saturate(.55) brightness(.92) contrast(.95)}
.lmap .leaflet-control-zoom{border:0!important;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px #0008}.lmap .leaflet-control-zoom a{background:#141922ee;color:#fff;border:0;border-bottom:1px solid #ffffff1a;width:32px;height:32px;line-height:32px;backdrop-filter:blur(6px)}.lmap .leaflet-control-zoom a:hover{background:#222a38}
.lmap .leaflet-control-attribution{background:#0d1017b3!important;color:#ffffff88;font-size:9px;border-radius:8px 0 0 0}.lmap .leaflet-control-attribution a{color:#ffffffaa}
.lmap .leaflet-popup-content-wrapper{background:#141922f2;color:#fff;border:1px solid #ffffff22;border-radius:14px;box-shadow:0 8px 24px #000a;backdrop-filter:blur(8px)}.lmap .leaflet-popup-tip{background:#141922f2}.lmap .leaflet-popup-close-button{color:#fff9!important}
.lmap .leaflet-popup-content{font:13px/1.4 system-ui,sans-serif;margin:11px 14px}.lmap .leaflet-popup-content b{display:block;font-weight:800;margin-bottom:2px}.lmap .leaflet-popup-content a{color:#8ec5ff}
.lmap .lpg{cursor:pointer;outline:none}.lmap .lpg:focus-visible circle{stroke:#fff}.lmap .lpl{transform-box:fill-box;transform-origin:center;animation:lpl 2.4s ease-out infinite}@keyframes lpl{0%{transform:scale(.7);opacity:.9}100%{transform:scale(1.5);opacity:0}}.lmap .lx{margin-left:8px;border:0;background:#ffffff18;color:inherit;border-radius:8px;padding:2px 8px;font:600 10px inherit;cursor:pointer;text-transform:none;letter-spacing:0}@media(prefers-reduced-motion:reduce){.lmap .lpl{animation:none}}.lpin{position:relative;width:64px;height:64px}.lpin .halo{position:absolute;inset:0;border-radius:50%}.lpin .pls{position:absolute;inset:0;border-radius:50%;animation:lpls 2.4s ease-out infinite}.lpin .dot{position:absolute;left:19px;top:19px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 2px 8px #0009}.lpin .dot svg{width:14px;height:14px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
@keyframes lpls{0%{transform:scale(.45);opacity:.7}100%{transform:scale(1.15);opacity:0}}@media(prefers-reduced-motion:reduce){.lpin .pls{animation:none;opacity:0}}`;
  const icon = (k) => `<svg viewBox="0 0 24 24" stroke="${KINDS[k].c}"><path d="${KINDS[k].i}"/></svg>`;
  const when = (ts) => { if (!ts) return ""; const h = Math.round((Date.now() - ts) / 3600e3); return h < 1 ? "just now" : h < 24 ? h + "h ago" : Math.round(h / 24) + "d ago"; };
  const li = (o) => `<div class="li">${icon(o.kind)}<div><b>${E(o.title)}</b><small>${E(KINDS[o.kind].n)}${o.where ? " · " + E(o.where) : ""}${o.when ? " · " + E(o.when) : ""}${o.ts ? " · " + when(o.ts) : ""}${o.src ? " · " + E(o.src) : ""}</small>${o.doThis ? `<small>👉 ${E(o.doThis)}</small>` : ""}${o.url ? ` <a href="${E(o.url)}" target="_blank" rel="noopener noreferrer"><small>Read ↗</small></a>` : ""}</div></div>`;
  // Schematic SVG map of Hyderabad (not to scale; locality centres approximate)
  const W = 400, H = 340, px = (ll) => [((ll[1] - 78.28) / 0.34) * W, ((17.56 - ll[0]) / 0.32) * H];
  const MAJOR = ["Secunderabad", "Charminar", "Madhapur", "Gachibowli", "Kukatpally", "Uppal", "LB Nagar", "Banjara Hills", "Miyapur", "Shamshabad", "Ameerpet", "Dilsukhnagar", "Kapra", "Mehdipatnam"];
  let sel = null;
  const base = () => {
    const P = (n) => px(G[n]).map((v) => v.toFixed(1)).join(",");
    const musi = `M${px([17.40, 78.30]).join(",")} C ${px([17.39, 78.38]).join(" ")} ${px([17.385, 78.43]).join(" ")} ${px([17.375, 78.47]).join(" ")} S ${px([17.36, 78.53]).join(" ")} ${px([17.355, 78.62]).join(" ")}`;
    const hs = px(G["Hussain Sagar"]);
    return `<defs><radialGradient id="lbg" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#1a2130"/><stop offset="1" stop-color="#0b0e14"/></radialGradient><filter id="lgl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5"/></filter></defs>
<rect width="${W}" height="${H}" fill="url(#lbg)"/>
<g stroke="#ffffff0d" stroke-width="1">${[1, 2, 3, 4, 5, 6, 7].map((i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="${H}"/>`).join("")}${[1, 2, 3, 4, 5].map((i) => `<line x1="0" y1="${i * 57}" x2="${W}" y2="${i * 57}"/>`).join("")}</g>
<ellipse cx="${(px([17.42, 78.45])[0]).toFixed(0)}" cy="${(px([17.42, 78.45])[1]).toFixed(0)}" rx="${(0.2 / 0.34 * W).toFixed(0)}" ry="${(0.155 / 0.32 * H).toFixed(0)}" fill="#ffffff06" stroke="#ffffff30" stroke-dasharray="4 5"/>
<text x="${(px([17.42, 78.45])[0] + 0.2 / 0.34 * W - 6).toFixed(0)}" y="${(px([17.3, 78.45])[1] + 20).toFixed(0)}" font-size="8" fill="#ffffff55" text-anchor="end">ORR ring (approx.)</text>
<path d="${musi}" fill="none" stroke="#3aa0ff55" stroke-width="3" stroke-linecap="round"/><text x="${px([17.37, 78.56])[0].toFixed(0)}" y="${(px([17.37, 78.56])[1] + 12).toFixed(0)}" font-size="8" fill="#3aa0ffaa" font-style="italic">Musi</text>
<ellipse cx="${hs[0].toFixed(1)}" cy="${hs[1].toFixed(1)}" rx="11" ry="7" fill="#3aa0ff40" stroke="#3aa0ff99"/><text x="${(hs[0]).toFixed(1)}" y="${(hs[1] - 10).toFixed(1)}" font-size="8" fill="#9cc9ff" text-anchor="middle">Hussain Sagar</text>`;
  };
  function drawMap(sel2, by) {
    const svg = document.getElementById("lmapc"); if (!svg) return;
    let g = base();
    const act = Object.keys(by);
    Object.keys(G).forEach((n) => { if (by[n] || n === "Old City" || n === "Hitech City" || n === "Hussain Sagar" || n === "Tank Bund") return; const [x, y] = px(G[n]); g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.8" fill="#ffffff40"/>`; if (MAJOR.includes(n)) g += `<text x="${(x + 4).toFixed(1)}" y="${(y + 3).toFixed(1)}" font-size="7.5" fill="#ffffff70">${E(n)}</text>`; });
    let me = null; try { const m = window.spillMe && window.spillMe(); me = m && m.area && G[m.area]; } catch (_) {}
    if (me) { const [x, y] = px(me); g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#4a8cff" stroke="#fff" stroke-width="2"/><text x="${(x + 8).toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="8" fill="#9cc2ff" font-weight="700">you</text>`; }
    let glow = "", pins = "";
    act.forEach((n) => {
      const arr = by[n], [x, y] = px(G[n]), kinds = [...new Set(arr.map((o) => o.kind))], k = KINDS[kinds[0]], r = 15 + Math.min(arr.length, 4) * 4, on = sel2 === n;
      glow += kinds.map((kk, i) => `<circle cx="${(x + (i - (kinds.length - 1) / 2) * 7).toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${KINDS[kk].c}" opacity=".38" filter="url(#lgl)"/>`).join("");
      pins += `<g class="lpg" data-lp="${E(n)}" tabindex="0" role="button" aria-label="${E(n)}: ${arr.length} report${arr.length > 1 ? "s" : ""}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle class="lpl" r="${r - 4}" fill="none" stroke="${k.c}" stroke-width="1.5"/><circle r="${r - 4}" fill="${k.c}" opacity=".16" stroke="${k.c}" stroke-opacity=".7"/>${on ? `<circle r="${r + 3}" fill="none" stroke="#fff" stroke-width="1.5"/>` : ""}<circle r="10" fill="${k.c}" stroke="#fff" stroke-width="2"/><g transform="translate(-6 -6) scale(.5)" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${k.i}"/></g>${kinds.slice(1).map((kk, i) => `<circle cx="${12 + i * 7}" cy="-9" r="3.2" fill="${KINDS[kk].c}" stroke="#fff"/>`).join("")}${arr.length > 1 ? `<g transform="translate(8 8)"><circle r="6.5" fill="#fff"/><text y="3" font-size="8.5" font-weight="800" fill="#111" text-anchor="middle">${arr.length}</text></g>` : ""}<text y="${r + 7}" font-size="8.5" font-weight="700" fill="#fff" text-anchor="middle" paint-order="stroke" stroke="#0b0e14" stroke-width="3">${E(n)}</text></g>`;
    });
    svg.innerHTML = g + glow + pins;
  }
  function paint() {
    const box = document.querySelector("[data-lmap]"); if (!box) return;
    const sel0 = data.filter((o) => filter === "all" || o.kind === filter);
    const pinned = sel0.filter((o) => o.where), unp = sel0.filter((o) => !o.where);
    const by = {}; pinned.forEach((o) => { (by[o.where] = by[o.where] || []).push(o); });
    if (sel && !by[sel]) sel = null;
    drawMap(sel, by);
    const shown = sel ? by[sel] : pinned;
    const list = box.querySelector(".llist"); if (list) list.innerHTML = (shown.length ? `<div class="lh2">${sel ? "Near " + E(sel) + " · " + shown.length + ' <button class="lx" data-lp="">show all</button>' : "On the map · " + pinned.length}</div>` + shown.map(li).join("") : "") + (!sel && unp.length ? `<div class="lh2">City-wide / no exact spot · ${unp.length}</div>` + unp.slice(0, 8).map(li).join("") : "") || `<div class="li"><div><b>Nothing active for this filter</b></div></div>`;
  }
  function init() {
    const box = document.querySelector("[data-lmap]"); if (!box || box.dataset.ready) return; box.dataset.ready = "1";
    data = items().map((o) => Object.assign(o, { where: place(o.title, o.where) }));
    const ks = Object.keys(KINDS).filter((k) => data.some((o) => o.kind === k));
    box.innerHTML = `<style>${css}</style><h3>Live map · Hyderabad</h3><p class="lsub">Glowing spots = areas named in today's reports. Tap one to see what's happening there.</p><svg id="lmapc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Schematic map of live Hyderabad alerts"></svg><div class="lchips"><button class="lc" data-lk="all" aria-pressed="true">All · ${data.length}</button>${ks.map((k) => `<button class="lc" data-lk="${k}" aria-pressed="false">${icon(k)}${KINDS[k].n} · ${data.filter((o) => o.kind === k).length}</button>`).join("")}</div><div class="llist"></div><p class="lnote">Schematic map, not to scale. Area centres are approximate (no exact streets). Headlines link to the original report.</p>`;
    paint();
  }
  document.addEventListener("click", (e) => { const g = e.target.closest("[data-lp]"); if (!g) return; e.preventDefault(); e.stopPropagation(); sel = g.dataset.lp || null; paint(); const l = document.querySelector(".lmap .llist"); if (l && sel) l.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, true);
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest(".lpg")) { e.preventDefault(); e.target.closest(".lpg").dispatchEvent(new MouseEvent("click", { bubbles: true })); } });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-lk]"); if (!b) return; e.preventDefault(); e.stopPropagation(); filter = b.dataset.lk; document.querySelectorAll("[data-lk]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); paint(); }, true);
  window.liveMapHTML = (scope) => (scope === "local" ? `<section class="lmap" data-lmap></section>` : "");
  new MutationObserver(() => { const b = document.querySelector("[data-lmap]"); if (b && !b.dataset.ready) { init(); } }).observe(document.documentElement, { childList: true, subtree: true });
})();
