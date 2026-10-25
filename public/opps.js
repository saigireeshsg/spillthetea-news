// Spill "💼 Opportunities": walk-in interviews, jobs, internships, govt exams & deadlines in/for Hyderabad.
// Data: /data/opps.json (content/opps/*.json). Expired items drop off automatically. Every item has an apply/contact CTA.
(function () {
  "use strict";
  let OP = [], kind = "all";
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = (ev, p) => { try { window.spillTrack && window.spillTrack(ev, p || {}); } catch (_) {} };
  const TYPE = { walkin: "🚶 Walk-in", job: "🚀 Startup / product job", intern: "🎓 Internship", govt: "🏛️ Govt job", exam: "📝 Exam / deadline", scholarship: "🎖️ Scholarship", course: "📚 Free course", program: "🚀 Startup programme" };
  const TZ = { timeZone: "Asia/Kolkata" };
  const fmt = (t) => new Date(t).toLocaleDateString("en-IN", { ...TZ, day: "numeric", month: "short" });
  const daysLeft = (t) => Math.ceil((Date.parse(t) - Date.now()) / 86400e3);
  const live = (o) => !o.until || Date.parse(o.until) > Date.now();
  const list = () => OP.filter(live).sort((a, b) => ((b.pay40 ? 1 : 0) - (a.pay40 ? 1 : 0)) || ((b.pick ? 1 : 0) - (a.pick ? 1 : 0)) || (Date.parse(a.deadline || a.until || "2100") - Date.parse(b.deadline || b.until || "2100")) || String(b.posted || "").localeCompare(String(a.posted || "")));
  window.oppsAny = () => list().length > 0;
  window.oppsCount = () => list().length;

  const css = document.createElement("style");
  css.textContent = `
.oph{background:linear-gradient(135deg,#0d2318,#12301f);border:1px solid #1f5a3a;border-radius:16px;padding:14px 16px}
.oph h2{margin:0 0 4px;font-size:20px}.oph p{margin:0;font-size:14px;color:var(--muted)}
.opsafe{margin-top:8px;font-size:12.5px;font-weight:700;color:#ffd166}
.opf{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.opf::-webkit-scrollbar{display:none}
.opf button{flex:none;font:inherit;font-size:13px;font-weight:700;border:1px solid var(--line-2);background:var(--card);color:var(--fg);border-radius:999px;padding:6px 12px;cursor:pointer}
.opf button[aria-pressed="true"]{background:var(--fg);color:var(--card);border-color:var(--fg)}
.opc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:13px 14px;display:grid;gap:7px}
.opc .ot{display:flex;gap:6px;flex-wrap:wrap;font-size:12px;font-weight:800}
.opc .ot span{background:var(--card-2);color:var(--muted);border-radius:999px;padding:3px 9px}
.opc .ot .pay{background:var(--good-soft);color:var(--good)}.opc .ot .dl{background:#3a1d10;color:#ffb38f}.opc .ot .pk{background:var(--orange-soft);color:var(--orange)}
.opc h3{margin:0;font-size:17px;line-height:1.3}.opc .og{font-size:13.5px;color:var(--muted);line-height:1.45}
.opc .og b{color:var(--fg)}
.opc .on{font-size:13px;line-height:1.45;background:#2b2108;color:#ffd166;border-radius:10px;padding:7px 10px}
.opc .orow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.opc .ogo{font-weight:800;font-size:14px;border-radius:999px;padding:8px 14px;background:var(--orange);color:#fff;text-decoration:none}
.opc .oalt{font-weight:800;font-size:13.5px;color:var(--blue);background:none;border:0;padding:0;cursor:pointer;text-decoration:none}
.opc .osrc{font-size:12px;color:var(--dim)}
.opt{display:flex;gap:10px;align-items:center;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:linear-gradient(135deg,#0d2318,#12301f);border:1px solid #1f5a3a;border-radius:16px;padding:12px 14px;margin:0 0 12px}
.opt b{display:block;font-size:15px}.opt span{font-size:13px;color:var(--muted)}.opt i{font-style:normal;font-size:24px}.opt u{margin-left:auto;font-weight:800;text-decoration:none;color:#7ee2a8;white-space:nowrap}
.opempty{text-align:center;color:var(--muted);padding:24px 8px}`;
  document.head.appendChild(css);

  function card(o) {
    const dl = o.deadline ? daysLeft(o.deadline) : null;
    const dlTxt = dl == null ? "" : dl <= 0 ? "Closes today" : dl === 1 ? "1 day left" : dl <= 14 ? `${dl} days left` : `By ${fmt(o.deadline)}`;
    const g = [
      o.org ? `<b>${E(o.org)}</b>${o.about ? ` · ${E(o.about)}` : ""}` : "",
      o.where ? `📍 ${E(o.where)}` : "",
      o.when ? `🗓️ ${E(o.when)}` : "",
      o.who ? `✅ ${E(o.who)}` : "",
    ].filter(Boolean).join("<br>");
    return `<article class="opc" id="op-${E(o.id)}"><div class="ot"><span>${E(TYPE[o.type] || "💼 Opportunity")}</span>${o.pay40 ? `<span class="pay">💰 ${E(o.pay)}</span>` : o.pay ? `<span>${E(o.pay)}</span>` : ""}${dlTxt ? `<span class="dl">⏳ ${dlTxt}</span>` : ""}${o.pick ? `<span class="pk">⭐ Spill pick</span>` : ""}</div>
      <h3>${E(o.title)}</h3><div class="og">${g}</div>
      ${o.note ? `<div class="on">⚠️ ${E(o.note)}</div>` : ""}
      <div class="orow">${o.apply ? `<a class="ogo" href="${E(o.apply.url)}" target="_blank" rel="noopener" data-opgo="${E(o.id)}">${E(o.apply.label || "Apply")} ↗</a>` : ""}${o.call ? `<a class="oalt" href="tel:${E(o.call.replace(/[^0-9+]/g, ""))}" data-opcall="${E(o.id)}">📞 ${E(o.call)}</a>` : ""}${o.open ? `<button class="oalt" data-open="${E(o.open)}">Read the explainer →</button>` : ""}</div>
      <div class="osrc">${o.posted ? `Posted ${fmt(o.posted)} · ` : ""}via ${E(o.source || "official source")}</div></article>`;
  }

  window.oppsView = function () {
    const all = list();
    const used = [...new Set(all.map((o) => o.type))].filter((k) => TYPE[k]);
    const shown = all.filter((o) => kind === "all" || o.type === kind);
    let h = `<section class="oph"><h2>💼 Spill Opportunities</h2><p>Skilled roles at Hyderabad startups and product companies, plus internships and deadlines that matter. Apply straight from the company's own page.</p><div class="opsafe">🛡️ Never pay money to get a job or an interview. Real employers don't charge.</div></section>`;
    if (used.length > 1) h += `<div class="opf">${[["all", "All"]].concat(used.map((k) => [k, TYPE[k]])).map(([k, n]) => `<button data-opf="${k}" aria-pressed="${kind === k}">${E(n)}</button>`).join("")}</div>`;
    if (!shown.length) return h + `<div class="opempty">📭 Nothing open here right now. New walk-ins and openings land every few hours.</div>`;
    return h + shown.map(card).join("");
  };

  // Live page teaser
  window.oppsTeaser = function () {
    const all = list(); if (!all.length) return "";
    const wk = all.filter((o) => o.type === "walkin").length;
    const top = all[0];
    return `<button class="opt" data-opopen="1"><i>💼</i><span style="min-width:0"><b>${all.length} opportunities open${wk ? ` · ${wk} walk-in${wk > 1 ? "s" : ""}` : ""}</b><span>${E(top.title)}</span></span><u>See all →</u></button>`;
  };

  document.addEventListener("click", (e) => {
    const t = e.target;
    const f = t.closest("[data-opf]"); if (f) { e.preventDefault(); e.stopPropagation(); kind = f.dataset.opf; track("opps_filter", { kind }); window.spillRerender && window.spillRerender(); return; }
    const o = t.closest("[data-opopen]"); if (o) { e.preventDefault(); e.stopPropagation(); track("opps_teaser"); const c = document.querySelector('[data-f="opps"]'); if (c) { c.click(); window.scrollTo(0, 0); } return; }
    const g = t.closest("[data-opgo]"); if (g) track("opp_apply_click", { id: g.dataset.opgo });
    const c2 = t.closest("[data-opcall]"); if (c2) track("opp_call_click", { id: c2.dataset.opcall });
  }, true);

  async function load() {
    try {
      const r = await fetch("/data/opps.json?t=" + Math.floor(Date.now() / 120000));
      OP = (await r.json()).map((x) => Object.assign({ id: x.id }, x.data || x));
      window.spillRerender && window.spillRerender();
    } catch (_) { /* keep last */ }
    setTimeout(load, document.hidden ? 600e3 : 180e3);
  }
  load();
})();
