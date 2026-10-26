// Spill "Today in <area>": the first-visit aha. One tap picks your area, then one card tells you
// water status for that area, any power/water/weather alert that names it, and weather for that spot.
// Facts only: water notes come from the Hyderabad water-crisis storyline (Telangana Today, The Hindu,
// Deccan Chronicle, Siasat, Oct 2026). Areas without a named warning say so plainly.
(function () {
  "use strict";
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = (ev, p) => { try { window.spillTrack && window.spillTrack(ev, p || {}); } catch (_) {} };
  const SINGUR = { lvl: "high", t: "Singur-fed: first in line", d: "Your water comes mainly from Singur, now ~11% full. Officials fear it could run dry by mid-December (~50 days). Godavari water is being linked in at Velimela as backup." };
  const CITY = { lvl: "watch", t: "City is ~20% short", d: "No area-specific warning yet. Hyderabad needs 735 MGD and gets 585. Fix leaks and store a day's water." };
  // [lat, lon, water note]
  const A = {
    "Madhapur": [17.448, 78.391, SINGUR], "HITEC City": [17.447, 78.376, SINGUR], "Gachibowli": [17.440, 78.349, SINGUR], "Kondapur": [17.466, 78.358, SINGUR],
    "Manikonda": [17.402, 78.386, CITY], "Kukatpally": [17.494, 78.399, CITY], "Miyapur": [17.496, 78.357, CITY],
    "Ameerpet": [17.437, 78.448, { lvl: "high", t: "Groundwater red zone", d: "Ameerpet is over-exploited for groundwater; the city's deepest level, 34.99 m, was recorded near here. Borewells may fail first." }],
    "Banjara Hills": [17.414, 78.439, { lvl: "watch", t: "Next to red-zone mandals", d: "Khairatabad (over-exploited) and Shaikpet (critical) groundwater zones are around you. Expect weaker borewells." }],
    "Jubilee Hills": [17.430, 78.407, { lvl: "watch", t: "Next to a critical zone", d: "Shaikpet's groundwater is rated critical. No supply cut announced for Jubilee Hills yet." }],
    "Begumpet": [17.444, 78.467, CITY],
    "Secunderabad": [17.439, 78.498, { lvl: "watch", t: "Groundwater critical", d: "Secunderabad's groundwater is rated critical. No supply cut announced yet." }],
    "Uppal": [17.405, 78.559, CITY], "LB Nagar": [17.347, 78.552, CITY], "Dilsukhnagar": [17.369, 78.526, CITY],
    "Mehdipatnam": [17.396, 78.441, { lvl: "watch", t: "Next to red-zone mandals", d: "Asifnagar and Golconda groundwater zones nearby are over-exploited. No supply cut announced yet." }],
    "Old City": [17.361, 78.474, { lvl: "high", t: "Osman Sagar-fed + red zone", d: "Old City leans on Osman Sagar, down to about 2.2 TMC, and Charminar's groundwater is over-exploited." }],
    "Shamshabad": [17.253, 78.430, CITY],
  };
  window.spillAreaList = () => Object.keys(A);
  window.spillAreaLoc = (name) => { const c = A[name]; if (!c || !window.spillSetLoc) return; let L = null; try { L = JSON.parse(localStorage.getItem("spill.loc") || "null"); } catch (_) {} if (!L || !L.precise) window.spillSetLoc({ lat: c[0], lon: c[1], name, precise: false }); };
  const LV = { high: ["🔴", "#ff6b4a"], watch: ["🟡", "#ffd166"] };
  const css = document.createElement("style");
  css.textContent = `.atd{background:linear-gradient(160deg,#1d1208,#141416 60%);border:1px solid #3a2410;border-radius:16px;padding:13px 14px;display:grid;gap:9px;margin:0 0 12px}
.atd h3{margin:0;font-size:17px;display:flex;align-items:center;gap:8px}.atd h3 small{margin-left:auto;font-size:12px;font-weight:700;color:var(--muted)}
.atd .ar{display:grid;grid-template-columns:26px 1fr;gap:8px;align-items:start;font-size:14px;line-height:1.4}
.atd .ar i{font-style:normal;font-size:18px;text-align:center}.atd .ar b{display:block;font-size:14.5px}.atd .ar span{color:var(--muted)}
.atd .arow{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.atd .ago{font:inherit;font-weight:800;font-size:13.5px;border:0;border-radius:999px;padding:8px 13px;background:var(--orange,#ff4500);color:#fff;cursor:pointer}
.atd .ago.on{background:#13301f;color:#7ee2a8}
.atd .alt{font:inherit;font-weight:700;font-size:13px;background:none;border:0;color:var(--blue,#4fbcff);cursor:pointer;padding:4px}
.apk{background:linear-gradient(160deg,#1d1208,#141416 60%);border:1px solid #5a2a0e;border-radius:16px;padding:14px;margin:0 0 12px;display:grid;gap:8px}
.apk b{font-size:17px}.apk p{margin:0;font-size:13.5px;color:var(--muted)}
.apk .ach{display:flex;flex-wrap:wrap;gap:6px}.apk .ach button{font:inherit;font-size:13.5px;font-weight:700;border:1px solid var(--line-2,#3a3a42);background:var(--card,#17171a);color:var(--fg,#eee);border-radius:999px;padding:7px 11px;cursor:pointer}
.apk .ach button:hover{border-color:#ff4500}`;
  document.head.appendChild(css);

  function alertsFor(area) {
    const all = (window.spillAlerts && window.spillAlerts()) || [];
    const re = new RegExp(area.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s*"), "i");
    const today = Date.now() - 20 * 3600e3;
    const fresh = all.filter((a) => Date.parse(a.published_at || a.created_at) > today);
    const mine = fresh.filter((a) => re.test([a.headline, a.title, JSON.stringify(a.details || {})].join(" ")));
    return { mine, city: fresh.length };
  }

  window.areaPickHTML = function () {
    return `<section class="apk"><b>📍 Where in Hyderabad are you?</b><p>One tap. Get your area's water status, alerts and weather, every time you open Spill.</p><div class="ach">${Object.keys(A).map((a) => `<button data-pickarea="${E(a)}">${E(a)}</button>`).join("")}</div></section>`;
  };

  window.areaTodayHTML = function (area) {
    const a = A[area]; if (!a) return "";
    const [, , w] = a, lv = LV[w.lvl] || LV.watch;
    const al = alertsFor(area), wx = window.spillWx && window.spillWx();
    const on = window.spillPush && window.spillPush.has("news");
    const rows = [];
    rows.push(`<div class="ar"><i>💧</i><div><b style="color:${lv[1]}">${lv[0]} ${E(w.t)}</b><span>${E(w.d)}</span></div></div>`);
    if (al.mine.length) rows.push(`<div class="ar"><i>🚨</i><div><b>${al.mine.length} alert${al.mine.length > 1 ? "s" : ""} name ${E(area)} today</b><span>${al.mine.slice(0, 2).map((x) => `<a href="#alert/${E(x.id)}" data-ca="${E(x.id)}" style="color:inherit">${E((x.details && x.details.push_title) || x.headline)}</a>`).join("<br>")}</span></div></div>`);
    else rows.push(`<div class="ar"><i>⚡</i><div><b>No power or water cut reported for ${E(area)} so far today</b><span>${al.city ? `${al.city} city-wide alert${al.city > 1 ? "s" : ""} below.` : "We check the news and official notices through the day."}</span></div></div>`);
    if (wx && wx.temp != null) rows.push(`<div class="ar"><i>${E(wx.icon || "🌤️")}</i><div><b>${E(wx.temp)}° now · high ${E(wx.high)}°${wx.aqi != null ? ` · AQI ${E(wx.aqi)} ${E(wx.aqiLabel || "")}` : ""}</b><span>${E(wx.cond || "")}${wx.rainToday != null ? ` · ${E(wx.rainToday)}% chance of rain today` : ""}${wx.place ? ` · ${E(wx.place)}` : ""}</span></div></div>`);
    return `<section class="atd" aria-label="Today in ${E(area)}"><h3>📍 Today in ${E(area)}<small>${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" })}</small></h3>${rows.join("")}
      <div class="arow"><button class="ago${on ? " on" : ""}" data-alertme="area-${E(area)}">${on ? "✓ Alerts on" : `🔔 Alert me for ${E(area)}`}</button><button class="alt" data-act="area">Change area</button><button class="alt" data-areashare="${E(area)}">↗ Send to my society group</button></div></section>`;
  };

  document.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pickarea]");
    if (p) {
      e.preventDefault(); e.stopPropagation();
      const name = p.dataset.pickarea, c = A[name];
      track("area_pick", { id: name });
      window.spillSetArea && window.spillSetArea(name);
      return;
    }
    const s = e.target.closest("[data-areashare]");
    if (s) {
      e.preventDefault(); e.stopPropagation();
      const area = s.dataset.areashare, w = (A[area] || [])[2] || CITY;
      const url = `https://spillthetea.news/?src=wa&c=area-${encodeURIComponent(area.toLowerCase().replace(/\s+/g, "-"))}`;
      const txt = `📍 ${area} water update: ${w.t}. ${w.d}\n\nArea-wise water, power & weather alerts for Hyderabad 👉 ${url}`;
      track("area_share", { id: area });
      window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank", "noopener");
    }
  }, true);
})();
