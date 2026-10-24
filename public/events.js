// Spill "🎟️ Events": things to do in Hyderabad for 15–30s — startup & tech meetups, career, comedy, music, sports, fests.
// Data: /data/events.json (content/events/*.json). Past events drop off automatically.
(function () {
  "use strict";
  let EV = [], kind = "all";
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = (ev, p) => { try { window.spillTrack && window.spillTrack(ev, p || {}); } catch (_) {} };
  const KIND = { startup: "🚀 Startup", tech: "💻 Tech", career: "💼 Career", meetup: "🤝 Meetup", comedy: "😂 Comedy", music: "🎵 Music", sports: "🏏 Sports", food: "🍜 Food", art: "🎨 Art", fest: "🎉 Fest", outdoor: "🌳 Outdoor" };
  const TZ = { timeZone: "Asia/Kolkata" };
  const dayKey = (t) => new Date(t).toLocaleDateString("en-CA", TZ);
  const fmtDay = (t) => new Date(t).toLocaleDateString("en-IN", { ...TZ, weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (t) => new Date(t).toLocaleTimeString("en-IN", { ...TZ, hour: "numeric", minute: "2-digit" }).replace(":00", "");
  const endOf = (e) => Date.parse(e.end || e.start) + (e.end ? 0 : 3 * 3600e3);
  const upcoming = () => EV.filter((e) => endOf(e) > Date.now()).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

  function weekendRange() { // this Sat 00:00 → Sun 23:59 IST (or the coming one)
    const now = new Date(new Date().toLocaleString("en-US", TZ)); const d = now.getDay();
    const sat = new Date(now); sat.setHours(0, 0, 0, 0); sat.setDate(now.getDate() + (d === 0 ? -1 : 6 - d));
    const offset = Date.now() - now.getTime();
    return [sat.getTime() + offset, sat.getTime() + offset + 2 * 86400e3];
  }
  const isWeekend = (e) => { const [a, b] = weekendRange(); const t = Date.parse(e.start); return t >= a && t < b; };
  window.eventsAny = () => upcoming().length > 0;
  window.eventsSoon = () => upcoming().filter((e) => Date.parse(e.start) < Date.now() + 7 * 86400e3).length;

  const css = document.createElement("style");
  css.textContent = `
.evh{background:linear-gradient(135deg,#10172a,#1a1030);border:1px solid #2c2a55;border-radius:16px;padding:14px 16px}
.evh h2{margin:0 0 4px;font-size:20px}.evh p{margin:0;font-size:14px;color:var(--muted)}
.evf{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.evf::-webkit-scrollbar{display:none}
.evf button{flex:none;font:inherit;font-size:13px;font-weight:700;border:1px solid var(--line-2);background:var(--card);color:var(--fg);border-radius:999px;padding:6px 12px;cursor:pointer}
.evf button[aria-pressed="true"]{background:var(--fg);color:var(--card);border-color:var(--fg)}
.evd{font-size:12.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:6px 2px -2px}
.evc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:13px 14px;display:grid;gap:7px}
.evc .et{display:flex;gap:6px;flex-wrap:wrap;font-size:12px;font-weight:800}
.evc .et span{background:var(--card-2);color:var(--muted);border-radius:999px;padding:3px 9px}.evc .et .fr{background:var(--good-soft);color:var(--good)}.evc .et .pk{background:var(--orange-soft);color:var(--orange)}
.evc h3{margin:0;font-size:17px;line-height:1.3}.evc .ew{margin:0;font-size:14px;line-height:1.45}
.evc .em{font-size:13.5px;color:var(--muted)}
.evc .er{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.evc .ego{font-weight:800;font-size:14px;border-radius:999px;padding:8px 14px;background:var(--orange);color:#fff;text-decoration:none}
.evc .esrc{font-size:12px;color:var(--dim)}
.evt{display:flex;gap:10px;align-items:center;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:linear-gradient(135deg,#10172a,#1a1030);border:1px solid #2c2a55;border-radius:16px;padding:12px 14px}
.evt b{display:block;font-size:15px}.evt span{font-size:13px;color:var(--muted)}.evt i{font-style:normal;font-size:24px}.evt u{margin-left:auto;font-weight:800;text-decoration:none;color:#a9a4ff;white-space:nowrap}
.evempty{text-align:center;color:var(--muted);padding:24px 8px}`;
  document.head.appendChild(css);

  function card(e) {
    const free = /^free$/i.test(e.price || "");
    return `<article class="evc"><div class="et"><span>${E(KIND[e.kind] || "🎟️ Event")}</span>${e.price ? `<span class="${free ? "fr" : ""}">${E(e.price)}</span>` : ""}${e.pick ? `<span class="pk">⭐ Spill pick</span>` : ""}</div>
      <h3>${E(e.title)}</h3>${e.why ? `<p class="ew">${E(e.why)}</p>` : ""}
      <div class="em">🗓️ ${fmtDay(e.start)} · ${fmtTime(e.start)}${e.end && dayKey(e.end) === dayKey(e.start) ? "–" + fmtTime(e.end) : ""}<br>📍 ${E(e.venue || "")}${e.area ? ", " + E(e.area) : ""}</div>
      <div class="er">${e.url ? `<a class="ego" href="${E(e.url)}" target="_blank" rel="noopener" data-evgo="${E(e.id)}">${E(e.cta || "Register")} ↗</a>` : ""}<span class="esrc">via ${E(e.source || "organiser")}</span></div></article>`;
  }

  window.eventsView = function () {
    const all = upcoming();
    const used = [...new Set(all.map((e) => e.kind))].filter((k) => KIND[k]);
    const list = all.filter((e) => kind === "all" || (kind === "weekend" ? isWeekend(e) : e.kind === kind));
    let h = `<section class="evh"><h2>🎟️ Hyderabad this week</h2><p>Startup & tech meetups, career events, gigs and weekend plans worth your time. Picked by Spill, booked at the source.</p></section>`;
    h += `<div class="evf">${[["all", "All"], ["weekend", "🗓️ This weekend"]].concat(used.map((k) => [k, KIND[k]])).map(([k, n]) => `<button data-evf="${k}" aria-pressed="${kind === k}">${E(n)}</button>`).join("")}</div>`;
    if (!list.length) return h + `<div class="evempty">📭 Nothing listed here yet. New events land every Monday and Thursday.</div>`;
    let last = "";
    list.forEach((e) => { const k = dayKey(e.start); if (k !== last) { h += `<div class="evd">${fmtDay(e.start)}</div>`; last = k; } h += card(e); });
    return h;
  };

  // Live page teaser: shows the weekend count (or the next few days).
  window.eventsTeaser = function () {
    const up = upcoming(); if (!up.length) return "";
    const wk = up.filter(isWeekend);
    const n = wk.length || up.filter((e) => Date.parse(e.start) < Date.now() + 7 * 86400e3).length; if (!n) return "";
    const top = (wk[0] || up[0]);
    return `<button class="evt" data-evopen="1"><i>🎟️</i><span style="min-width:0"><b>${wk.length ? n + " things to do this weekend" : n + " events this week"}</b><span>${E(top.title)}${n > 1 ? " + more" : ""}</span></span><u>See all →</u></button>`;
  };

  document.addEventListener("click", (e) => {
    const t = e.target;
    const f = t.closest("[data-evf]"); if (f) { e.preventDefault(); e.stopPropagation(); kind = f.dataset.evf; track("events_filter", { kind }); window.spillRerender && window.spillRerender(); return; }
    const o = t.closest("[data-evopen]"); if (o) { e.preventDefault(); e.stopPropagation(); track("events_teaser"); const chip = document.querySelector('[data-f="events"]'); if (chip) chip.click(); return; }
    const g = t.closest("[data-evgo]"); if (g) track("event_register_click", { id: g.dataset.evgo });
  }, true);

  async function load() {
    try {
      const r = await fetch("/data/events.json?t=" + Math.floor(Date.now() / 600000));
      EV = (await r.json()).map((x) => Object.assign({ id: x.id }, x.data || x));
      window.spillRerender && window.spillRerender();
    } catch (_) { /* keep last */ }
    setTimeout(load, 30 * 60e3);
  }
  load();
})();
