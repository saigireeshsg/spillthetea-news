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
  let M = null, layer = null, filter = "all", data = [];
  const css = `.lmap{position:relative;z-index:0;isolation:isolate;margin:10px 0 12px;border-radius:16px;overflow:hidden;border:1px solid #ffffff22;background:#0f1218}.lmap h3{margin:0;padding:11px 12px 4px;font-size:15px}.lmap .lsub{margin:0;padding:0 12px 8px;font-size:12px;opacity:.7}
.lmap #lmapc{height:330px;width:100%}.lmap .lchips{display:flex;gap:6px;overflow-x:auto;padding:8px 10px;scrollbar-width:none}.lmap .lchips::-webkit-scrollbar{display:none}
.lmap .lc{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;padding:6px 10px;border-radius:999px;border:1px solid #ffffff2a;background:transparent;color:inherit;font:600 12px/1 inherit;cursor:pointer}
.lmap .lc svg{width:14px;height:14px;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.lmap .lc[aria-pressed="true"]{background:#ffffff18;border-color:#ffffff66}
.lmap .llist{padding:6px 12px 12px;display:grid;gap:8px}.lmap .li{display:grid;grid-template-columns:22px 1fr;gap:8px;font-size:13px;line-height:1.35}.lmap .li svg{width:18px;height:18px;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;margin-top:1px}
.lmap .li b{display:block;font-weight:700}.lmap .li small{opacity:.7}.lmap .li a{color:inherit}.lmap .lnote{padding:0 12px 10px;font-size:11px;opacity:.6}.lmap .lh2{padding:2px 12px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;opacity:.6}
.leaflet-popup-content{font:13px/1.35 system-ui,sans-serif;color:#111}.leaflet-popup-content b{display:block}.lpin{border-radius:50%}`;
  const icon = (k) => `<svg viewBox="0 0 24 24" stroke="${KINDS[k].c}"><path d="${KINDS[k].i}"/></svg>`;
  const when = (ts) => { if (!ts) return ""; const h = Math.round((Date.now() - ts) / 3600e3); return h < 1 ? "just now" : h < 24 ? h + "h ago" : Math.round(h / 24) + "d ago"; };
  const li = (o) => `<div class="li">${icon(o.kind)}<div><b>${E(o.title)}</b><small>${E(KINDS[o.kind].n)}${o.where ? " · " + E(o.where) : ""}${o.when ? " · " + E(o.when) : ""}${o.ts ? " · " + when(o.ts) : ""}${o.src ? " · " + E(o.src) : ""}</small>${o.doThis ? `<small>👉 ${E(o.doThis)}</small>` : ""}${o.url ? ` <a href="${E(o.url)}" target="_blank" rel="noopener noreferrer"><small>Read ↗</small></a>` : ""}</div></div>`;
  function paint() {
    const box = document.querySelector("[data-lmap]"); if (!box) return;
    const sel = data.filter((o) => filter === "all" || o.kind === filter);
    const pinned = sel.filter((o) => o.where), unp = sel.filter((o) => !o.where);
    const list = box.querySelector(".llist"); if (list) list.innerHTML = (pinned.length ? `<div class="lh2">On the map · ${pinned.length}</div>` + pinned.map(li).join("") : "") + (unp.length ? `<div class="lh2">City-wide / no exact spot · ${unp.length}</div>` + unp.slice(0, 8).map(li).join("") : "") || `<div class="li"><div><b>Nothing active for this filter</b></div></div>`;
    if (!M || !layer) return;
    if (!M._loaded) { M.setView([17.385, 78.4867], 11); }
    layer.clearLayers(); const pts = [];
    const by = {}; pinned.forEach((o) => { (by[o.where] = by[o.where] || []).push(o); });
    Object.keys(by).forEach((p) => {
      const arr = by[p], c = G[p]; arr.forEach((o, i) => {
        const k = KINDS[o.kind], a = (i / arr.length) * Math.PI * 2, off = arr.length > 1 ? 0.004 : 0, ll = [c[0] + Math.sin(a) * off, c[1] + Math.cos(a) * off];
        const dot = L.divIcon({ className: "", iconSize: [64, 64], iconAnchor: [32, 32], html: `<span style="display:block;width:64px;height:64px;border-radius:50%;background:${k.c}33;border:1px solid ${k.c}88;position:relative"><i style="position:absolute;left:23px;top:23px;width:18px;height:18px;border-radius:50%;background:${k.c};border:2px solid #fff;box-sizing:border-box"></i></span>` });
        L.marker(ll, { icon: dot, keyboard: true, title: o.title }).addTo(layer).bindPopup(`<b>${E(o.title)}</b>${E(k.n)} · near ${E(p)} (approx.)${o.when ? "<br>" + E(o.when) : ""}${o.doThis ? "<br>👉 " + E(o.doThis) : ""}${o.url ? `<br><a href="${E(o.url)}" target="_blank" rel="noopener noreferrer">Read ↗</a>` : ""}`);
        pts.push(ll);
      });
    });
    try { const me = window.spillMe && window.spillMe(); const ar = me && me.area && G[me.area]; if (ar) L.marker(ar, { icon: L.divIcon({ className: "", iconSize: [14, 14], iconAnchor: [7, 7], html: '<i style="display:block;width:14px;height:14px;border-radius:50%;background:#1f6feb;border:2px solid #fff;box-sizing:border-box"></i>' }) }).addTo(layer).bindTooltip("Your area: " + me.area); } catch (_) {}
    if (pts.length > 1) M.fitBounds(pts, { padding: [28, 28], maxZoom: 13 }); else if (pts.length === 1) M.setView(pts[0], 13); else M.setView([17.385, 78.4867], 11);
  }
  function init() {
    const box = document.querySelector("[data-lmap]"); if (!box || box.dataset.ready) return; box.dataset.ready = "1";
    data = items().map((o) => Object.assign(o, { where: place(o.title, o.where) }));
    const ks = Object.keys(KINDS).filter((k) => data.some((o) => o.kind === k));
    box.innerHTML = `<style>${css}</style><h3>Live map · Hyderabad</h3><p class="lsub">Where today's traffic, water, power, air and incident reports land. Pins mark the area named in the report (about 1 km, not exact streets).</p><div id="lmapc" role="img" aria-label="Map of live Hyderabad alerts"></div><div class="lchips"><button class="lc" data-lk="all" aria-pressed="true">All · ${data.length}</button>${ks.map((k) => `<button class="lc" data-lk="${k}" aria-pressed="false">${icon(k)}${KINDS[k].n} · ${data.filter((o) => o.kind === k).length}</button>`).join("")}</div><div class="llist"></div><p class="lnote">Map © OpenStreetMap contributors © CARTO. Area centres are approximate. Headlines link to the original report.</p>`;
    const go = () => {
      try {
        M = L.map("lmapc", { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([17.385, 78.4867], 11);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 17, attribution: "&copy; OpenStreetMap &copy; CARTO" }).addTo(M);
        layer = L.layerGroup().addTo(M); paint(); setTimeout(() => { if (!M) return; try { M.invalidateSize(); paint(); } catch (_) {} }, 300);
      } catch (_) { const c = document.getElementById("lmapc"); if (c) c.remove(); paint(); }
    };
    if (window.L && window.L.map) go(); else {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/vendor/leaflet/leaflet.css"; document.head.appendChild(l);
      const s = document.createElement("script"); s.src = "/vendor/leaflet/leaflet.js"; s.onload = go; s.onerror = () => { const c = document.getElementById("lmapc"); if (c) c.remove(); paint(); }; document.head.appendChild(s);
    }
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-lk]"); if (!b) return; e.preventDefault(); e.stopPropagation(); filter = b.dataset.lk; document.querySelectorAll("[data-lk]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); paint(); }, true);
  window.liveMapHTML = (scope) => (scope === "local" ? `<section class="lmap" data-lmap></section>` : "");
  new MutationObserver(() => { const b = document.querySelector("[data-lmap]"); if (b && !b.dataset.ready) { M = null; layer = null; init(); } }).observe(document.documentElement, { childList: true, subtree: true });
})();
