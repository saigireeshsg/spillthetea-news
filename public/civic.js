// Spill "📣 Speak up": public-interest actions in Hyderabad — petitions, public consultations,
// citizen drives on traffic, water, lakes, safety. Readers can check in ("I'm in"); counts are shared.
// Spill lists actions; it doesn't endorse them. Party-political protests are not listed.
(function () {
  "use strict";
  let A = [];
  let issue = "all";
  const open = {};
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const track = (ev, p) => { try { window.spillTrack && window.spillTrack(ev, p || {}); } catch (_) {} };
  const KIND = { petition: ["✍️", "Petition"], consultation: ["🗳️", "Public consultation"], drive: ["🤝", "Citizen drive"], campaign: ["📢", "Campaign"], event: ["📅", "Public meeting"] };
  const ISSUE = { traffic: ["🚦", "Traffic"], water: ["💧", "Water"], green: ["🌳", "Lakes & trees"], safety: ["🛡️", "Safety"], civic: ["🏙️", "City"] };
  const api = () => window.spillAct || { count: () => 0, mine: () => false, toggle: () => false, open: () => {} };

  const css = document.createElement("style");
  css.textContent = `
.acth{background:linear-gradient(135deg,#1d1208,#2a1405);border:1px solid #5a2a0e;border-radius:16px;padding:14px 16px}
.acth h2{margin:0 0 4px;font-size:20px}.acth p{margin:0;font-size:14px;line-height:1.45;color:var(--muted)}
.acth .disc{display:block;margin-top:8px;font-size:12px;color:var(--dim)}
.actf{display:flex;gap:6px;overflow-x:auto;padding:2px 0;scrollbar-width:none}.actf::-webkit-scrollbar{display:none}
.actf button{flex:none;font:inherit;font-size:13px;font-weight:700;border:1px solid var(--line-2);background:var(--card);color:var(--fg);border-radius:999px;padding:6px 12px;cursor:pointer}
.actf button[aria-pressed="true"]{background:var(--fg);color:var(--card);border-color:var(--fg)}
.actc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 16px;display:grid;gap:10px;scroll-margin-top:110px}
.actc .ak{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;font-weight:800}
.actc .ak span{border-radius:999px;padding:3px 9px;background:var(--card-2);color:var(--muted)}
.actc .ak .kd{background:var(--orange-soft);color:var(--orange)}.actc .ak .op{background:var(--good-soft);color:var(--good)}.actc .ak .cl{background:var(--card-2);color:var(--dim)}
.actc h3{margin:0;font-size:18px;line-height:1.3}
.actc .aw{margin:0;font-size:14.5px;line-height:1.5}
.actc .ao{font-size:13px;color:var(--muted);line-height:1.4}
.actc .ast{display:flex;gap:10px;align-items:baseline;background:var(--card-2);border-radius:12px;padding:8px 12px}.actc .ast b{font-size:22px;font-weight:900}.actc .ast span{font-size:13px;color:var(--muted)}
.actc .adl{font-size:13px;font-weight:700;color:#ffb38f}
.actc details{border-top:1px solid var(--line);padding-top:8px}.actc summary{cursor:pointer;font-weight:800;font-size:14px;list-style:none}.actc summary::-webkit-details-marker{display:none}.actc summary:after{content:" ▾";color:var(--muted)}
.actc ul{margin:8px 0 0;padding-left:18px;display:grid;gap:5px;font-size:14px;line-height:1.4}
.actc .anx{font-size:13.5px;line-height:1.45;color:var(--fg);background:var(--blue-soft);border-radius:12px;padding:8px 12px}
.actc .arow{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.actc .ain{font:inherit;font-weight:800;font-size:14px;border:1px solid var(--orange);color:var(--orange);background:transparent;border-radius:999px;padding:9px 14px;cursor:pointer}
.actc .ain.on{background:var(--orange);color:#fff}
.actc .acta{font:inherit;font-weight:800;font-size:14px;border:1px solid var(--line-2);color:var(--fg);background:var(--card-2);border-radius:999px;padding:9px 14px;text-decoration:none}
.actc .alink{border:0;background:none;color:var(--blue);font:inherit;font-weight:700;font-size:13.5px;padding:0;cursor:pointer}
.actc .asrc{font-size:12px;color:var(--dim)}.actc .asrc a{color:var(--muted)}
.actbox{margin:12px 0;border:1px solid #5a2a0e;background:linear-gradient(135deg,#1d1208,#22140a);border-radius:14px;padding:12px 14px;display:grid;gap:8px}
.actbox small{font-size:11.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#ffb38f}
.actbox b{font-size:15px;line-height:1.35}.actbox .arow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.actbox .ain{font:inherit;font-weight:800;font-size:13.5px;border:1px solid var(--orange);color:var(--orange);background:transparent;border-radius:999px;padding:7px 12px;cursor:pointer}.actbox .ain.on{background:var(--orange);color:#fff}
.actbox .alink{border:0;background:none;color:var(--blue);font:inherit;font-weight:700;font-size:13.5px;padding:0;cursor:pointer}
.actempty{text-align:center;color:var(--muted);padding:24px 8px}
`;
  document.head.appendChild(css);

  const isOpen = (a) => a.status !== "closed";
  window.actsOpen = () => A.filter(isOpen).length;

  function inBtn(a) {
    const on = api().mine(a.id), n = api().count(a.id);
    return `<button class="ain ${on ? "on" : ""}" data-actin="${E(a.id)}">${on ? "✓ " : "✋ "}${E(a.checkin || "I'm in")}${n ? ` · ${n}` : ""}</button>`;
  }

  function card(a) {
    const k = KIND[a.kind] || KIND.campaign, is = ISSUE[a.issue] || ISSUE.civic;
    return `<article class="actc" id="act-${E(a.id)}">
      <div class="ak"><span class="kd">${k[0]} ${k[1]}</span><span>${is[0]} ${is[1]}</span><span class="${isOpen(a) ? "op" : "cl"}">${isOpen(a) ? "Open" : "Closed"}</span></div>
      <h3>${E(a.title)}</h3>
      <p class="aw">${E(a.what)}</p>
      <div class="ao">By ${E(a.who)}</div>
      ${a.stat ? `<div class="ast"><b>${E(a.stat.v)}</b><span>${E(a.stat.l)}</span></div>` : ""}
      ${a.deadline ? `<div class="adl">⏳ ${E(a.deadline)}</div>` : ""}
      ${(a.asks || []).length ? `<details ${open[a.id] ? "open" : ""} data-actd="${E(a.id)}"><summary>${E(a.askTitle || "What they're asking for")} (${a.asks.length})</summary><ul>${a.asks.map((x) => `<li>${E(x)}</li>`).join("")}</ul></details>` : ""}
      ${a.next ? `<div class="anx">👀 ${E(a.next)}</div>` : ""}
      <div class="arow">${inBtn(a)}${a.cta ? `<a class="acta" href="${E(a.cta.url)}" target="_blank" rel="noopener" data-actcta="${E(a.id)}">${E(a.cta.label)} ↗</a>` : ""}${a.story ? `<button class="alink" data-open="${E(a.story)}">Read the story →</button>` : ""}</div>
      <div class="asrc">Sources: ${(a.sources || []).map((s) => `<a href="${E(s.url)}" target="_blank" rel="noopener">${E(s.name)}</a>`).join(" · ")}</div>
    </article>`;
  }

  window.actsView = function () {
    const used = [...new Set(A.map((a) => a.issue))].filter((x) => ISSUE[x]);
    const list = A.filter((a) => issue === "all" || a.issue === issue).sort((a, b) => (isOpen(b) - isOpen(a)) || ((b.pin || 0) - (a.pin || 0)) || String(b.added || "").localeCompare(String(a.added || "")));
    return `<section class="acth"><h2>📣 Speak up · Hyderabad</h2><p>Petitions, public consultations and citizen drives on traffic, water, lakes and more. Check in on the ones you back.</p><span class="disc">Spill lists public-interest actions from credible reports. We don't endorse them, and we don't list party protests.</span></section>
      ${used.length > 1 ? `<div class="actf">${[["all", "All"]].concat(used.map((u) => [u, ISSUE[u].join(" ")])).map(([k, n]) => `<button data-actf="${k}" aria-pressed="${issue === k}">${E(n)}</button>`).join("")}</div>` : ""}
      ${list.length ? list.map(card).join("") : `<div class="actempty">📭 Nothing open right now. New petitions and consultations land here as they come up.</div>`}`;
  };

  // Story page: if a story has a related action, invite readers to take part.
  window.actBoxHTML = function (d) {
    if (!(window.SPILL_CONFIG || {}).speakup) return "";
    const a = d && d.act && A.find((x) => x.id === d.act);
    if (!a || !isOpen(a)) return "";
    const k = KIND[a.kind] || KIND.campaign;
    return `<div class="actbox"><small>📣 Take part · ${k[1]}</small><b>${E(a.title)}</b><div class="arow">${inBtn(a)}<button class="alink" data-actgo="${E(a.id)}">See details →</button></div></div>`;
  };

  document.addEventListener("click", (e) => {
    const t = e.target;
    const inb = t.closest("[data-actin]");
    if (inb) {
      e.preventDefault(); e.stopPropagation();
      const id = inb.dataset.actin; const on = api().toggle(id);
      track(on ? "act_checkin" : "act_checkout", { act_id: id });
      document.querySelectorAll(`[data-actin="${CSS.escape(id)}"]`).forEach((b) => { const a = A.find((x) => x.id === id); if (a) b.outerHTML = inBtn(a); });
      return;
    }
    const f = t.closest("[data-actf]");
    if (f) { e.preventDefault(); e.stopPropagation(); issue = f.dataset.actf; window.spillRerender && window.spillRerender(); return; }
    const go = t.closest("[data-actgo]");
    if (go) { e.preventDefault(); e.stopPropagation(); track("act_open_from_story", { act_id: go.dataset.actgo }); api().open(go.dataset.actgo); return; }
    const cta = t.closest("[data-actcta]");
    if (cta) track("act_cta_click", { act_id: cta.dataset.actcta });
  }, true);
  document.addEventListener("toggle", (e) => { const d = e.target; if (d && d.dataset && d.dataset.actd) open[d.dataset.actd] = d.open; }, true);

  async function load() {
    try {
      const r = await fetch("/data/acts.json?t=" + Math.floor(Date.now() / 60000));
      A = (await r.json()).map((x) => Object.assign({ id: x.id }, x.data || x));
      window.spillRerender && window.spillRerender();
    } catch (_) { /* keep last */ }
    setTimeout(load, 10 * 60e3);
  }
  load();
})();
