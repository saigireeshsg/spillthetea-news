// Spill live weather + AQI: real numbers for the reader's location (Open-Meteo forecast + air quality, refreshed every 15 min).
// Default: Hyderabad. Readers can share their location (one tap, browser permission) for street-level accuracy.
// AQI = Indian NAQI estimated from 24 h average PM2.5 / PM10 (CAMS model), so it's labelled "est.".
// Also: window.spillDaypart() → morning / afternoon / evening / night / sleep (IST).
(function () {
  "use strict";
  const DEF = { lat: 17.385, lon: 78.4867, name: "Hyderabad", precise: false };
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = (ev, p) => { try { window.spillTrack && window.spillTrack(ev, p || {}); } catch (_) {} };
  let loc = lsGet("spill.loc") || DEF;
  let WX = lsGet("spill.wx");
  if (WX && Date.now() - WX.ts > 3 * 3600e3) WX = null;
  window.spillWx = () => WX;

  // ---------- time of day (IST) ----------
  const istHour = () => +new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }) % 24;
  const PARTS = {
    morning: ["🌅", "Good morning", "What you need before you head out"],
    afternoon: ["🌤️", "Afternoon check-in", "What changed since morning"],
    evening: ["🌆", "Evening", "The day's big moves, and tonight"],
    night: ["🌙", "Tonight", "What to know before tomorrow"],
    sleep: ["😴", "Late night", "Only what can't wait. Go sleep 💤"],
  };
  window.spillDaypart = function () {
    const h = istHour();
    const k = h >= 5 && h < 12 ? "morning" : h < 17 && h >= 12 ? "afternoon" : h >= 17 && h < 21 ? "evening" : h >= 21 ? "night" : "sleep";
    const p = PARTS[k];
    return { key: k, icon: p[0], title: p[1], line: p[2] };
  };

  // ---------- WMO weather codes ----------
  function cond(code, day) {
    const c = +code;
    if (c === 0) return [day ? "☀️" : "🌙", "Clear"];
    if (c <= 2) return [day ? "🌤️" : "☁️", "Partly cloudy"];
    if (c === 3) return ["☁️", "Overcast"];
    if (c === 45 || c === 48) return ["🌫️", "Foggy"];
    if (c >= 51 && c <= 57) return ["🌦️", "Drizzle"];
    if (c === 61 || c === 80) return ["🌦️", "Light rain"];
    if (c === 63 || c === 81) return ["🌧️", "Rain"];
    if (c === 65 || c === 82) return ["🌧️", "Heavy rain"];
    if (c >= 95) return ["⛈️", "Thunderstorm"];
    return ["🌥️", "Cloudy"];
  }
  // ---------- Indian AQI (NAQI) from PM sub-indices ----------
  function sub(v, bp) {
    for (const [lo, hi, ilo, ihi] of bp) if (v <= hi) return ilo + ((ihi - ilo) * (v - lo)) / (hi - lo || 1);
    return 500;
  }
  const PM25 = [[0, 30, 0, 50], [30, 60, 50, 100], [60, 90, 100, 200], [90, 120, 200, 300], [120, 250, 300, 400], [250, 500, 400, 500]];
  const PM10 = [[0, 50, 0, 50], [50, 100, 50, 100], [100, 250, 100, 200], [250, 350, 200, 300], [350, 430, 300, 400], [430, 600, 400, 500]];
  const aqiLabel = (n) => n <= 50 ? "Good" : n <= 100 ? "Satisfactory" : n <= 200 ? "Moderate" : n <= 300 ? "Poor" : n <= 400 ? "Very poor" : "Severe";
  const avg = (a) => { const v = a.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

  async function refresh() {
    try {
      const q = `latitude=${loc.lat}&longitude=${loc.lon}&timezone=Asia%2FKolkata`;
      const [f, a] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?${q}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,precipitation&hourly=temperature_2m,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=2`).then((r) => r.json()),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&hourly=pm2_5,pm10&past_days=1&forecast_days=1`).then((r) => r.json()).catch(() => null),
      ]);
      if (!f || !f.current) return;
      const cur = f.current, H = f.hourly, D = f.daily;
      const nowIdx = Math.max(0, H.time.findIndex((t) => t >= cur.time.slice(0, 13)));
      const next = (n) => H.precipitation_probability.slice(nowIdx, nowIdx + n);
      const at = (dayOffset, hour) => { const d = D.time[dayOffset]; const i = H.time.indexOf(`${d}T${String(hour).padStart(2, "0")}:00`); return i >= 0 ? { t: Math.round(H.temperature_2m[i]), c: H.weather_code[i] } : null; };
      let aqi = null, pm25 = null;
      if (a && a.hourly) {
        const k = a.hourly.time.findIndex((t) => t >= cur.time.slice(0, 13));
        const end = k > 0 ? k + 1 : a.hourly.time.length;
        pm25 = avg(a.hourly.pm2_5.slice(Math.max(0, end - 24), end));
        const pm10 = avg(a.hourly.pm10.slice(Math.max(0, end - 24), end));
        if (pm25 != null || pm10 != null) aqi = Math.round(Math.max(pm25 != null ? sub(pm25, PM25) : 0, pm10 != null ? sub(pm10, PM10) : 0));
      }
      const [icon, cnd] = cond(cur.weather_code, cur.is_day);
      WX = {
        ts: Date.now(), place: loc.name, precise: !!loc.precise,
        temp: Math.round(cur.temperature_2m), feels: Math.round(cur.apparent_temperature), hum: cur.relative_humidity_2m,
        icon, cond: cnd, raining: cur.precipitation > 0,
        high: Math.round(D.temperature_2m_max[0]), low: Math.round(D.temperature_2m_min[0]), rainToday: D.precipitation_probability_max[0],
        rain6: Math.max(0, ...next(6).filter((x) => x != null)), rainEve: Math.max(0, ...H.precipitation_probability.slice(H.time.indexOf(`${D.time[0]}T17:00`), H.time.indexOf(`${D.time[0]}T22:00`)).filter((x) => x != null)),
        tonight: Math.round(Math.min(...H.temperature_2m.slice(nowIdx, nowIdx + 12))),
        tmr: { high: Math.round(D.temperature_2m_max[1]), low: Math.round(D.temperature_2m_min[1]), rain: D.precipitation_probability_max[1], icon: cond(D.weather_code[1], 1)[0], cond: cond(D.weather_code[1], 1)[1], am: at(1, 8) },
        eve: at(0, 19),
        aqi, aqiLabel: aqi != null ? aqiLabel(aqi) : "", pm25: pm25 != null ? Math.round(pm25) : null,
      };
      lsSet("spill.wx", WX);
      window.spillRerender && window.spillRerender();
    } catch (_) { /* keep last */ }
  }

  function tip(w, part) {
    const r = part === "night" || part === "sleep" ? w.tmr.rain : w.rain6;
    if (r >= 60) return "☔ Carry an umbrella" + (part === "night" || part === "sleep" ? " tomorrow" : "");
    if (w.aqi > 200) return "😷 Air is poor. Mask up outdoors, skip the outdoor run";
    if ((part === "night" || part === "sleep" ? w.tmr.high : w.high) >= 36) return "🥵 Hot one. Water bottle, and avoid the 12–3 pm sun";
    if (r >= 30) return "🌦️ Some chance of rain. Keep an umbrella handy";
    if (w.aqi > 100) return "Air is moderate. Sensitive lungs, go easy outdoors";
    return "";
  }
  const aqiCls = (n) => n <= 100 ? "" : n <= 200 ? "m" : "p";

  // Weather card, shaped by the time of day.
  window.wxCardHTML = function (advisory) {
    const w = WX; if (!w) return "";
    const p = window.spillDaypart().key;
    let main, sub2;
    if (p === "morning") { main = `${w.temp}° now · ${w.cond}`; sub2 = `Today ${w.low}°–${w.high}° · rain ${w.rainToday}% · feels ${w.feels}°`; }
    else if (p === "afternoon") { main = `${w.temp}° now · ${w.cond}`; sub2 = `Feels ${w.feels}° · evening ${w.eve ? w.eve.t + "°" : "–"}, rain ${w.rainEve}%`; }
    else if (p === "evening") { main = `${w.temp}° now · ${w.cond}`; sub2 = `Tonight ${w.tonight}° · Tomorrow ${w.tmr.high}°, ${w.tmr.cond.toLowerCase()}, rain ${w.tmr.rain}%`; }
    else if (p === "night") { main = `Tomorrow: ${w.tmr.low}°–${w.tmr.high}° · ${w.tmr.cond}`; sub2 = `Rain ${w.tmr.rain}% · right now ${w.temp}°`; }
    else { main = `Morning: ${w.tmr.am ? w.tmr.am.t + "° at 8 am" : w.tmr.low + "°"} · ${w.tmr.cond}`; sub2 = `High ${w.tmr.high}° tomorrow · rain ${w.tmr.rain}%`; }
    const icon = p === "night" || p === "sleep" ? w.tmr.icon : w.icon;
    const t = tip(w, p);
    return `<div class="wx"><span class="wi" aria-hidden="true">${icon}</span><div class="tx"><b>${E(main)}</b><span class="s">${E(sub2)}${t ? " · " + E(t) : ""}${advisory ? `<br>⚠️ ${E(advisory)}` : ""}</span></div>${w.aqi != null ? `<span class="aqi ${aqiCls(w.aqi)}" title="Estimated from PM2.5/PM10 (CAMS model)">AQI ${w.aqi} · ${E(w.aqiLabel)} <small>est.</small></span>` : ""}</div>
      <button class="wxloc" data-wxloc="1">${w.precise ? `📍 ${E(w.place)} · update location` : `📍 Showing ${E(w.place)}. Use my location for exact weather & AQI`}</button>`;
  };
  window.wxTickerHTML = function () {
    const w = WX; if (!w) return "";
    return `<button class="tk-wx" data-act="live" data-key="local" aria-label="Weather">${w.icon} <b>${w.temp}°</b>${w.aqi != null ? ` · AQI ${w.aqi}` : ""}</button>`;
  };

  const css = document.createElement("style");
  css.textContent = `.wxloc{display:block;width:100%;margin-top:6px;font:inherit;font-size:12.5px;font-weight:700;color:var(--blue,#7cb7ff);background:none;border:0;text-align:left;cursor:pointer;padding:2px}
.aqi small{font-weight:600;opacity:.7}`;
  document.head.appendChild(css);

  async function placeName(lat, lon) {
    try {
      const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`).then((x) => x.json());
      return r.locality || r.city || r.principalSubdivision || "Your location";
    } catch (_) { return "Your location"; }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-wxloc]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (!navigator.geolocation) return;
    b.textContent = "📍 Finding you…";
    track("wx_locate_tap");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = +pos.coords.latitude.toFixed(3), lon = +pos.coords.longitude.toFixed(3); // ~100 m, never sent to Spill's servers
      loc = { lat, lon, name: await placeName(lat, lon), precise: true };
      lsSet("spill.loc", loc); track("wx_locate_ok");
      refresh();
    }, () => { b.textContent = "📍 Location is off. Allow it in browser settings for exact weather"; track("wx_locate_denied"); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60e3 });
  }, true);

  window.spillSetLoc = (l) => { loc = l; lsSet("spill.loc", loc); WX = null; refresh(); };
  refresh();
  setInterval(refresh, 15 * 60e3);
})();
