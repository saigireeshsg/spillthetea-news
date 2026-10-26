// Spill rituals: three short, finishable tap-throughs a day (IST).
//   ☀️ Morning (5:00–11:59)   "Start your day": weather, your area, water countdown, the big one, money, deadlines, plan from last night.
//   🍱 Afternoon (12:00–17:59) "Lunch break": what Hyderabad is talking about, tech, an opportunity, a poll, an explainer.
//   🌙 Night (18:00–4:59)      "Rethink & plan": today in 5, did-you-catch-today quiz, tomorrow, plan 3 things, one question to sit with.
// Hooks: daily streak, 3 dots for today's rituals, quiz score, last night's plan shows up next morning, tease of the next ritual.
// Content is assembled from published drops/opps/alerts; nothing here invents facts.
(function () {
  "use strict";
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rich = (s) => E(s).replace(/\*([^*]+)\*/g, "<b>$1</b>");
  const track = (ev, p) => { try { window.spillTrack && window.spillTrack(ev, p || {}); } catch (_) {} };
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (_) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const TZ = "Asia/Kolkata";
  const hour = () => +new Date().toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }) % 24;
  const dayKey = (t) => new Date(t || Date.now()).toLocaleDateString("en-CA", { timeZone: TZ });
  const ritualDay = () => dayKey(Date.now() - (hour() < 5 ? 86400e3 : 0)); // night ritual after midnight counts for the day before
  const SLOTS = {
    morning: { icon: "☀️", name: "Morning ritual", sub: "Start your day", next: "afternoon", nextAt: "1 pm" },
    afternoon: { icon: "🍱", name: "Lunch-break ritual", sub: "What changed since morning", next: "night", nextAt: "9 pm" },
    night: { icon: "🌙", name: "Night ritual", sub: "Rethink the day, plan tomorrow", next: "morning", nextAt: "8 am" },
  };
  const slotNow = () => { const h = hour(); return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : "night"; };

  let DROPS = [], OPPS = [];
  async function load() {
    try { DROPS = (await (await fetch("/data/drops.json?t=" + Math.floor(Date.now() / 300e3))).json()).map((x) => Object.assign({ id: x.id }, x.data || x)); } catch (_) {}
    try { OPPS = (await (await fetch("/data/opps.json?t=" + Math.floor(Date.now() / 300e3))).json()).map((x) => Object.assign({ id: x.id }, x.data || x)); } catch (_) {}
    window.spillRerender && window.spillRerender();
  }

  // ---------- state: done per day, streak, plan ----------
  const st = () => lsGet("spill.ritual", { days: {}, streak: 0, last: "", best: 0 });
  function markDone(slot, extra) {
    const s = st(), d = ritualDay();
    s.days[d] = s.days[d] || {}; const first = !Object.keys(s.days[d]).length;
    s.days[d][slot] = Object.assign({ at: Date.now() }, extra || {});
    if (first) {
      const y = dayKey(Date.parse(d + "T12:00:00+05:30") - 86400e3);
      s.streak = s.last === y ? s.streak + 1 : s.last === d ? s.streak : 1;
      s.last = d; s.best = Math.max(s.best || 0, s.streak);
    }
    const keys = Object.keys(s.days).sort(); while (keys.length > 21) delete s.days[keys.shift()];
    lsSet("spill.ritual", s); return s;
  }
  const doneToday = () => (st().days[ritualDay()] || {});
  const streakNow = () => { const s = st(), d = ritualDay(), y = dayKey(Date.parse(d + "T12:00:00+05:30") - 86400e3); return s.last === d || s.last === y ? s.streak : 0; };

  // ---------- picking content ----------
  const today = () => dayKey();
  // hrs <= 30 → today's drops (topped up with yesterday's if fewer than 4); longer windows use the date.
  const recent = (hrs) => {
    if (hrs <= 30) { const t = DROPS.filter((d) => d.date === today()); if (t.length >= 4) return t; const y = dayKey(Date.now() - 86400e3); return t.concat(DROPS.filter((d) => d.date === y)); }
    return DROPS.filter((d) => !d.date || Date.parse(d.date + "T23:59:00+05:30") > Date.now() - hrs * 3600e3);
  };
  const byHeat = (arr) => arr.slice().sort((a, b) => (b.heat || 0) - (a.heat || 0) || String(b.sort || "").localeCompare(String(a.sort || "")));
  const pick = (pred, hrs, skip) => byHeat(recent(hrs || 36).filter((d) => pred(d) && !(skip || []).includes(d.id)))[0];
  const care = (d) => (d.beats && d.beats.care) || d.tldr || "";
  const storyStep = (icon, kick, d) => d && { icon, kick, title: d.hook, body: care(d), open: d.id };

  function wxStep(tomorrow) {
    const w = window.spillWx && window.spillWx(); if (!w) return null;
    const area = (window.spillArea && window.spillArea()) || "Hyderabad";
    if (tomorrow) {
      const t = w.tmr || {}; const tips = [];
      if ((t.rain || 0) >= 50) tips.push("☔ Carry an umbrella"); if ((t.high || 0) >= 36) tips.push("🥤 Hot one, carry water");
      return { icon: t.icon || "🌤️", kick: "Tomorrow's weather", title: `*${t.high}°* high, ${t.low}° low · ${t.rain || 0}% chance of rain`, body: [t.cond, ...tips].filter(Boolean).join(" · ") };
    }
    const tips = [];
    if ((w.rainToday || 0) >= 50) tips.push("☔ Umbrella today"); if (w.aqi != null && w.aqi > 150) tips.push("😷 Mask if you're on a bike");
    if ((w.high || 0) >= 36) tips.push("🥤 Carry water");
    return { icon: w.icon || "🌤️", kick: `Your morning · ${area}`, title: `*${w.temp}°* now, high ${w.high}° · ${w.rainToday || 0}% rain`, body: [w.cond, w.aqi != null ? `AQI ${w.aqi} ${w.aqiLabel || ""}` : "", ...tips].filter(Boolean).join(" · ") };
  }
  function areaStep() {
    const area = window.spillArea && window.spillArea(); if (!area) return { icon: "📍", kick: "Your area", title: "Set your area for *your* water & power status", body: "One tap on the Live tab. Then every ritual starts with your area.", cta: ["Set my area", "area"] };
    const w = window.spillAreaInfo && window.spillAreaInfo(area);
    const al = ((window.spillAlerts && window.spillAlerts()) || []).filter((a) => Date.parse(a.published_at || a.created_at) > Date.now() - 20 * 3600e3);
    const mine = al.filter((a) => new RegExp(area.replace(/ /g, "\\s*"), "i").test([a.headline, JSON.stringify(a.details || {})].join(" ")));
    return { icon: "📍", kick: `Today in ${area}`, title: mine.length ? `*${mine.length} alert${mine.length > 1 ? "s" : ""}* name ${area} today` : `No power or water cut reported for *${area}* so far`, body: w ? `💧 ${w.t}. ${w.d}` : "" };
  }
  function waterStep() {
    const days = Math.ceil((Date.parse("2026-12-15T00:00:00+05:30") - Date.now()) / 86400e3);
    if (days < 1) return null;
    const d = DROPS.find((x) => x.storyline === "hyd-water-crisis");
    return { icon: "💧", kick: "Water countdown", title: `*~${days} days* to mid-December, when officials fear Singur could run dry`, body: "Singur feeds the IT corridor. Godavari water is being linked in at Velimela as backup.", open: d && d.id };
  }
  function deadlineStep(days) {
    const now = Date.now();
    const dl = OPPS.filter((o) => o.deadline && Date.parse(o.deadline) > now && Date.parse(o.deadline) - now < days * 86400e3).sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline)).slice(0, 3);
    if (!dl.length) return null;
    return { icon: "⏳", kick: days <= 2 ? "Deadlines tomorrow" : "Deadlines this week", title: dl.map((o) => o.title).slice(0, 1)[0], body: dl.map((o) => `• ${o.title} · ${new Date(o.deadline).toLocaleDateString("en-IN", { timeZone: TZ, day: "numeric", month: "short" })}`).join("\n"), cta: ["See all opportunities", "opps"] };
  }
  function oppStep() {
    const o = OPPS.filter((x) => x.pay40 && (!x.until || Date.parse(x.until) > Date.now()))[0] || OPPS[0]; if (!o) return null;
    return { icon: "💼", kick: "Opportunity of the day", title: o.title, body: [o.org, o.pay, o.where].filter(Boolean).join(" · "), link: o.apply && o.apply.url, cta: ["See all opportunities", "opps"] };
  }
  function quizStep() {
    const qs = byHeat(recent(30)).filter((d) => (d.cards || []).some((c) => c.k === "quiz")).slice(0, 3).map((d) => Object.assign({ id: d.id }, d.cards.find((c) => c.k === "quiz")));
    return qs.map((q, k) => ({ icon: "🧠", kick: `Did you catch today? · ${k + 1} of ${qs.length}`, quiz: [q] }));
  }
  function planStep() {
    const items = [];
    const now = Date.now();
    OPPS.filter((o) => o.deadline && Date.parse(o.deadline) > now && Date.parse(o.deadline) - now < 3 * 86400e3).slice(0, 2).forEach((o) => items.push(`${o.apply ? "Apply" : "Check"}: ${o.title}`));
    const area = window.spillArea && window.spillArea(), w = area && window.spillAreaInfo && window.spillAreaInfo(area);
    if (w && w.lvl === "high") items.push("Store a day's water and check for leaks at home");
    const t = (window.spillWx && window.spillWx() || {}).tmr; if (t && (t.rain || 0) >= 50) items.push("Keep an umbrella by the door");
    items.push("Open Spill's morning ritual at 8 am (2 min)");
    return { icon: "🗓️", kick: "Plan tomorrow", plan: items.slice(0, 4) };
  }
  function reflectStep(skip) {
    const d = byHeat(recent(30).filter((x) => !(skip || []).includes(x.id))).find((x) => (x.cards || []).some((c) => c.k === "poll"));
    if (!d) return null; const p = d.cards.find((c) => c.k === "poll");
    return { icon: "💭", kick: "One thing to sit with", title: p.q, body: `From: ${String(d.hook || "").replace(/\*/g, "")}`, open: d.id, openLabel: "Vote & see Hyderabad's answer" };
  }
  function lastNightPlan() {
    const s = st(), y = dayKey(Date.now() - 86400e3), p = s.days[y] && s.days[y].night && s.days[y].night.plan;
    if (!p || !p.length) return null;
    const ticked = (s.days[y].night.ticked || []);
    return { icon: "✅", kick: "Your plan from last night", plan: p, ticked, carry: y };
  }

  function steps(slot) {
    const used = [];
    const take = (s) => { if (s && s.open) used.push(s.open); return s; };
    let L = [];
    if (slot === "morning") {
      L = [wxStep(), lastNightPlan(), areaStep(), waterStep(),
        take(storyStep("📰", "The big one", pick((d) => ["local", "india"].includes(d.cat), 30, used))),
        take(storyStep("💸", "Money", pick((d) => d.cat === "money", 72, used))),
        deadlineStep(7)];
    } else if (slot === "afternoon") {
      L = [take(storyStep("🔥", "What Hyderabad is talking about", pick((d) => d.cat === "local", 24, used))),
        take(storyStep("🚀", "Tech & startups", pick((d) => d.cat === "tech", 96, used))),
        oppStep(),
        take(storyStep("🌍", "Beyond Hyderabad", pick((d) => ["india", "world"].includes(d.cat), 30, used))),
        take(storyStep("🧵", "The running story, explained", pick((d) => !!d.storyline, 48, used)))];
    } else {
      const top = byHeat(recent(26)).slice(0, 5);
      L = [top.length ? { icon: "🗞️", kick: "Today in 5", list: top.map((d) => [d.id, d.hook]) } : null,
        ...quizStep(), wxStep(true), deadlineStep(2), planStep(), reflectStep(top.map((d) => d.id).slice(0, 1))];
    }
    return L.filter(Boolean).slice(0, 7);
  }

  // ---------- entry card on Live / Home ----------
  const css = document.createElement("style");
  css.textContent = `.rit{display:flex;align-items:center;gap:12px;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;border-radius:16px;padding:12px 14px;margin:0 0 12px;border:1px solid #5a2a0e;background:linear-gradient(135deg,#2a1405,#17110d 70%)}
.rit .ri{font-size:30px}.rit b{display:block;font-size:16px}.rit small{display:block;font-size:12.5px;color:var(--muted)}.rit .rgo{margin-left:auto;font-weight:800;font-size:14px;background:var(--orange,#ff4500);color:#fff;border-radius:999px;padding:8px 13px;white-space:nowrap}
.rit.done{border-color:#1f5a3a;background:linear-gradient(135deg,#0d2318,#121614 70%)}.rit.done .rgo{background:#13301f;color:#7ee2a8}
.rdots{display:inline-flex;gap:4px;margin-left:6px;vertical-align:middle}.rdots i{width:7px;height:7px;border-radius:50%;background:#3a3a42}.rdots i.on{background:#ff8a3d}
.rov{position:fixed;inset:0;z-index:70;background:var(--bg,#0a0a0b);display:flex;flex-direction:column;padding:calc(10px + env(safe-area-inset-top,0px)) 16px calc(14px + env(safe-area-inset-bottom,0px))}
.rov .rtop{display:flex;align-items:center;gap:8px;font-weight:800}.rov .rtop small{color:var(--muted);font-weight:600}.rov .rx{margin-left:auto;font:inherit;font-size:22px;background:none;border:0;color:var(--muted);cursor:pointer}
.rov .rseg{display:flex;gap:4px;margin:10px 0 14px}.rov .rseg i{flex:1;height:4px;border-radius:9px;background:#2a2a30}.rov .rseg i.on{background:var(--orange,#ff4500)}
.rov .rbody{flex:1;overflow:auto;display:flex;flex-direction:column;justify-content:center;gap:12px;max-width:560px;width:100%;margin:0 auto}
.rov .rk{font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#ff8a65}.rov .ric{font-size:44px}
.rov h2{margin:0;font-size:26px;line-height:1.2;letter-spacing:-.02em}.rov h2 b{color:var(--orange,#ff4500)}.rov p{margin:0;font-size:16px;line-height:1.5;color:#cfd5d8;white-space:pre-line}
.rov .rl{display:grid;gap:8px}.rov .rl button{font:inherit;text-align:left;color:inherit;background:var(--card,#17171a);border:1px solid var(--line,#2e2e33);border-radius:12px;padding:10px 12px;cursor:pointer;font-size:15px}.rov .rl button b{color:var(--orange,#ff4500)}
.rov .rq button.opt{display:block;width:100%;font:inherit;text-align:left;color:inherit;background:var(--card,#17171a);border:1px solid var(--line,#2e2e33);border-radius:12px;padding:11px 12px;margin:6px 0;cursor:pointer}
.rov .rq button.ok{border-color:#2e8b57;background:#13301f}.rov .rq button.no{border-color:#8b2e2e;background:#301313}.rov .rq .why{font-size:14px;color:var(--muted)}
.rov .rp label{display:flex;gap:10px;align-items:flex-start;background:var(--card,#17171a);border:1px solid var(--line,#2e2e33);border-radius:12px;padding:11px 12px;margin:6px 0;font-size:15px;cursor:pointer}.rov .rp input{width:20px;height:20px;accent-color:#ff4500;flex:none}
.rov .ract{display:flex;gap:8px;max-width:560px;width:100%;margin:12px auto 0}.rov .ract button,.rov .ract a{flex:1;font:inherit;font-weight:800;font-size:15px;border:0;border-radius:14px;padding:13px;cursor:pointer;text-align:center;text-decoration:none}
.rov .rp1{background:var(--orange,#ff4500);color:#fff}.rov .rp2{background:#24242a;color:var(--fg,#eee)}
.rov .rfin{text-align:center;align-items:center}.rov .rbig{font-size:64px}.rov .rstreak{font-size:18px;font-weight:800;color:#ffb38f}`;
  document.head.appendChild(css);

  window.ritualCardHTML = function () {
    const slot = slotNow(), S = SLOTS[slot], dn = doneToday(), sk = streakNow();
    const dots = `<span class="rdots" aria-label="${Object.keys(dn).length} of 3 rituals today">${["morning", "afternoon", "night"].map((k) => `<i class="${dn[k] ? "on" : ""}"></i>`).join("")}</span>`;
    if (dn[slot]) {
      const N = SLOTS[S.next];
      return `<button class="rit done" data-ritual="${slot}"><span class="ri">✅</span><span><b>${S.name} done${sk > 1 ? ` · 🔥 ${sk}-day streak` : ""}${dots}</b><small>Next: ${N.icon} ${N.name} at ${S.nextAt}</small></span><span class="rgo">Replay</span></button>`;
    }
    const n = steps(slot).length; if (!n) return "";
    return `<button class="rit" data-ritual="${slot}"><span class="ri">${S.icon}</span><span><b>${S.name}${dots}</b><small>${S.sub} · ${n} cards · ~2 min${sk ? ` · 🔥 ${sk}` : ""}</small></span><span class="rgo">Start →</span></button>`;
  };

  // ---------- the tap-through ----------
  function play(slot) {
    document.querySelectorAll(".rov").forEach((x) => x.remove());
    const S = SLOTS[slot], L = steps(slot); if (!L.length) return;
    let i = 0, score = 0, answered = {}, plan = null, ticked = []; const qTotal = L.filter((x) => x.quiz).length;
    const el = document.createElement("div"); el.className = "rov"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", S.name);
    document.body.appendChild(el); document.body.style.overflow = "hidden";
    track("ritual_start", { id: slot });
    const close = () => { el.remove(); document.body.style.overflow = ""; window.spillRerender && window.spillRerender(); };
    function stepHTML(s) {
      let b = `<span class="ric">${s.icon}</span><span class="rk">${E(s.kick)}</span>`;
      if (s.title) b += `<h2>${rich(s.title)}</h2>`;
      if (s.body) b += `<p>${E(s.body)}</p>`;
      if (s.list) b += `<div class="rl">${s.list.map(([id, h], k) => `<button data-ropen="${E(id)}"><b>${k + 1}.</b> ${rich(h)}</button>`).join("")}</div>`;
      if (s.quiz) b += s.quiz.map((q, qi) => { const a = answered[i + ":" + qi]; return `<div class="rq"><h2 style="font-size:19px">${rich(q.q)}</h2>${q.opts.map((o, j) => `<button class="opt ${a != null ? (j === q.ans ? "ok" : j === a ? "no" : "") : ""}" data-rq="${qi}" data-ri="${j}" ${a != null ? "disabled" : ""}>${E(o)}</button>`).join("")}${a != null && q.why ? `<div class="why">${rich(q.why)}</div>` : ""}</div>`; }).join("");
      if (s.plan) { const tk = s.carry ? (s.ticked || []) : ticked; b += `<div class="rp">${s.plan.map((p, k) => `<label><input type="checkbox" data-rp="${k}" ${tk.includes(k) ? "checked" : ""}>${E(p)}</label>`).join("")}</div>${s.carry ? "" : `<p style="font-size:13.5px">We'll show this list in tomorrow's morning ritual.</p>`}`; }
      return b;
    }
    function draw() {
      const fin = i >= L.length;
      const seg = `<div class="rseg">${Array.from({ length: L.length + 1 }, (_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>`;
      let body, acts;
      if (!fin) {
        const s = L[i];
        body = stepHTML(s);
        const extra = s.open ? `<button class="rp2" data-ropen="${E(s.open)}">${E(s.openLabel || "Read it")}</button>` : s.link ? `<a class="rp2" href="${E(s.link)}" target="_blank" rel="noopener">Apply ↗</a>` : s.cta ? `<button class="rp2" data-rcta="${E(s.cta[1])}">${E(s.cta[0])}</button>` : "";
        acts = `${extra}<button class="rp1" data-rnext="1">${i < L.length - 1 ? "Next →" : "Finish →"}</button>`;
      } else {
        const s = markDone(slot, slot === "night" ? { plan, ticked, score } : { score });
        const N = SLOTS[S.next], on = window.spillPush && window.spillPush.has("news");
        const q = qTotal ? { quiz: { length: qTotal } } : null;
        track("ritual_done", { id: slot, variant: String(s.streak) });
        body = `<div class="rbody rfin" style="justify-content:center"><span class="rbig">${slot === "night" ? "🌙" : "✅"}</span><h2>${slot === "morning" ? "You're set for the day." : slot === "afternoon" ? "Caught up. Back to work." : "Day wrapped. Sleep easy."}</h2>${q ? `<p>You got <b>${score}/${q.quiz.length}</b> on today's quiz${score === q.quiz.length ? " 🏆" : ""}.</p>` : ""}<span class="rstreak">${s.streak > 1 ? `🔥 ${s.streak}-day streak` : "🔥 Day 1. Come back tomorrow to start a streak"}</span><p>Next: ${N.icon} <b>${N.name}</b> at ${S.nextAt}</p></div>`;
        const remind = slot === "morning" ? "🔔 Remind me for tonight's ritual (9 pm)" : slot === "afternoon" ? "🔔 Remind me at 9 pm" : "🔔 Remind me at 8 am";
        acts = on ? `<button class="rp2" data-rshare="1">↗ Share Spill</button><button class="rp1" data-rclose="1">Done</button>` : `<button class="rp2" data-rclose="1">Done</button><button class="rp1" data-alertme="ritual-${slot}">${remind}</button>`;
      }
      el.innerHTML = `<div class="rtop">${S.icon} ${S.name}<small>${fin ? "" : `· ${i + 1}/${L.length}`}</small><button class="rx" data-rclose="1" aria-label="Close">✕</button></div>${seg}${fin ? body : `<div class="rbody">${body}</div>`}<div class="ract">${acts}</div>`;
    }
    el.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("[data-rclose]")) { if (i < L.length) track("ritual_quit", { id: slot, variant: String(i) }); close(); return; }
      if (t.closest("[data-rnext]")) { if (L[i] && L[i].plan && !L[i].carry) plan = L[i].plan; i++; draw(); return; }
      const q = t.closest("[data-rq]"); if (q) { const qi = +q.dataset.rq, j = +q.dataset.ri, Q = L[i].quiz[qi]; if (answered[i + ":" + qi] == null) { answered[i + ":" + qi] = j; if (j === Q.ans) score++; track("ritual_quiz", { id: Q.id, variant: j === Q.ans ? "right" : "wrong" }); } draw(); return; }
      const o = t.closest("[data-ropen]"); if (o) { track("ritual_open", { id: o.dataset.ropen }); close(); const tmp = document.createElement("div"); tmp.dataset.open = o.dataset.ropen; tmp.hidden = true; document.body.appendChild(tmp); tmp.click(); tmp.remove(); return; }
      const c = t.closest("[data-rcta]"); if (c) { close(); if (c.dataset.rcta === "opps") { const b = document.querySelector('[data-f="opps"]'); if (b) b.click(); } else { const b = document.querySelector('[data-act="area"]'); if (b) b.click(); } return; }
      if (t.closest("[data-rshare]")) { const url = "https://spillthetea.news/?src=share&c=ritual"; const txt = `I start my day with Spill: Hyderabad's news, water & power alerts in 2 minutes 👉 ${url}`; track("ritual_share", { id: slot }); if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank", "noopener"); return; }
    });
    el.addEventListener("change", (e) => {
      const cb = e.target.closest("[data-rp]"); if (!cb) return; const k = +cb.dataset.rp, s = L[i];
      if (s.carry) { const all = st(); const n = all.days[s.carry] && all.days[s.carry].night; if (n) { n.ticked = n.ticked || []; cb.checked ? n.ticked.push(k) : (n.ticked = n.ticked.filter((x) => x !== k)); s.ticked = n.ticked; lsSet("spill.ritual", all); } }
      else { cb.checked ? ticked.push(k) : (ticked = ticked.filter((x) => x !== k)); }
      track("ritual_plan_tick", { id: slot });
    });
    draw();
  }
  window.spillRitual = play;
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-ritual]"); if (!b) return; e.preventDefault(); e.stopPropagation(); play(b.dataset.ritual); }, true);
  // Deep link from the ritual push: /?ritual=morning
  const q = new URLSearchParams(location.search).get("ritual");
  load().then(() => { if (q && SLOTS[q]) setTimeout(() => play(q), 600); });
  setInterval(load, 10 * 60e3);
})();
