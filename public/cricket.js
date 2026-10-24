// Spill live cricket: India match card on the home feed + ball-by-ball sheet.
// Data comes from public.cricket_live (filled every 30s by the Supabase "cricket" function).
(function () {
  "use strict";
  const sb = window.spillSB;
  if (!sb) return;
  let M = [];
  let timer = null;
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const css = document.createElement("style");
  css.textContent = `
.crick{display:block;width:100%;text-align:left;font:inherit;color:var(--fg,#d7dadc);background:linear-gradient(135deg,#0b2a1c,#123b5c);border:1px solid #1f5f86;border-radius:16px;padding:12px 14px;margin:0 0 12px;cursor:pointer}
.crick .top{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#9fd3ff}
.crick .top .lv{margin-left:auto;display:flex;align-items:center;gap:5px;color:#ff6b6b}
.crick .top .lv i{width:8px;height:8px;border-radius:50%;background:#ff4b4b;animation:pulse 1.4s infinite}
.crick .row{display:flex;align-items:baseline;gap:10px;margin-top:6px;font-size:15px}
.crick .row b{min-width:42px;font-weight:800}
.crick .row span{font-variant-numeric:tabular-nums}
.crick .row.on{color:#fff}.crick .row.off{color:#a9b8c4}
.crick .hl{margin-top:8px;font-weight:800;font-size:14.5px;color:#ffd166}
.crick .rc{display:flex;gap:5px;margin-top:9px;align-items:center;flex-wrap:wrap}
.crick .cmore{margin-top:8px;font-size:12.5px;color:#9fd3ff;font-weight:700}
.bc{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 5px;border-radius:999px;font-size:12px;font-weight:800;background:#2a3540;color:#dfe7ee;flex:none}
.bc.k6{background:#7b3fe4;color:#fff}.bc.k4{background:#0f9d58;color:#fff}.bc.kW{background:#e5383b;color:#fff}.bc.kd{background:#1f2a33;color:#8a98a5}.bc.kx{background:#b7791f;color:#fff}
.csheet .sheet-in{max-height:86vh;overflow:auto}
.csheet h2{margin:0 0 2px;font-size:18px}.csheet .sub{color:var(--muted,#a3acb0);font-size:12.5px;margin-bottom:10px}
.csheet .sc{background:#0f1b24;border:1px solid #20313f;border-radius:14px;padding:10px 12px;margin-bottom:10px}
.csheet .sc .row{display:flex;justify-content:space-between;font-size:15px;padding:3px 0}.csheet .sc .row.on b{color:#fff}.csheet .sc .row.off{color:#a9b8c4}
.csheet .hl{font-weight:800;color:#ffd166;margin-top:6px}
.csheet .eq{display:flex;gap:14px;font-size:12.5px;color:var(--muted,#a3acb0);margin-top:4px}
.csheet table{width:100%;border-collapse:collapse;font-size:13.5px;margin:4px 0 10px}
.csheet th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#a3acb0);text-align:right;font-weight:700;padding:4px}
.csheet th:first-child,.csheet td:first-child{text-align:left}.csheet td{text-align:right;padding:5px 4px;border-top:1px solid #222c34;font-variant-numeric:tabular-nums}
.csheet h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#a3acb0);margin:12px 0 6px}
.csheet ul{list-style:none;margin:0;padding:0}
.csheet li{display:flex;gap:9px;align-items:flex-start;padding:7px 0;border-top:1px solid #1f282f;font-size:14px;line-height:1.35}
.csheet li .ov{min-width:34px;color:var(--muted,#a3acb0);font-size:12.5px;padding-top:3px;font-variant-numeric:tabular-nums}
.csheet li.eo{background:#13202a;border-radius:10px;padding:8px 10px;margin:6px 0;border:0;font-weight:700;font-size:13px;color:#9fd3ff}
.csheet li.kW .t{color:#ff8a8a;font-weight:700}.csheet li.k6 .t,.csheet li.k4 .t{font-weight:700}
.csheet .notes li{font-size:13px;color:#c9d3db}
.csheet .src{font-size:11.5px;color:var(--muted,#a3acb0);margin-top:12px}.csheet .src a{color:#9fd3ff}
`;
  document.head.appendChild(css);

  const chip = (k) => {
    const cls = k === "6" ? "k6" : k === "4" ? "k4" : k === "W" ? "kW" : k === "." ? "kd" : ["wd", "nb", "lb", "b"].includes(k) ? "kx" : "";
    return `<span class="bc ${cls}">${k === "." ? "•" : E(k)}</span>`;
  };
  const shortDesc = (m) => {
    const d = String(m.desc || "");
    const what = d.split(",")[0].replace(/\s*\((N|D\/N)\)/, "").trim();
    const at = (d.match(/ at ([^,]+)/) || [])[1];
    return [what, at].filter(Boolean).join(" · ");
  };
  const ago = (t) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? s + "s ago" : Math.round(s / 60) + " min ago"; };
  const label = (m) => (m.state === "in" ? "LIVE" : m.state === "post" ? "RESULT" : "TODAY");

  function teamRows(m, cls) {
    return (m.teams || []).map((t) => `<div class="row ${t.batting ? "on" : m.state === "in" ? "off" : ""}"><b>${E(t.abbr || t.name)}</b><span>${E(t.score || (m.state === "pre" ? "yet to bat" : "—"))}</span></div>`).join("");
  }

  window.cricHTML = function () {
    if (!M.length) return "";
    const m = M[0];
    return `<button id="crick" class="crick" data-crick="${E(m.id)}" aria-label="Live cricket: ${E(m.title)}">
      <div class="top">🏏 ${label(m)} · ${E(shortDesc(m) || m.short)}${m.state === "in" ? `<span class="lv"><i></i>LIVE</span>` : ""}</div>
      ${teamRows(m)}
      ${m.headline ? `<div class="hl">${E(m.headline)}${m.state === "in" && m.rrr ? ` · RRR ${E(m.rrr)}` : ""}</div>` : ""}
      ${m.state === "in" && (m.recent || []).length ? `<div class="rc">${m.recent.map(chip).join("")}</div>` : ""}
      <div class="cmore">${m.state === "pre" ? "Match centre →" : "Ball-by-ball →"}</div></button>`;
  };

  function sheetInner(m) {
    if (!m) return `<h2>Match over</h2><p>This match is no longer live.</p>`;
    const bat = (m.batters || []).map((b) => `<tr><td>${E(b.n)}</td><td><b>${E(b.r)}</b></td><td>${E(b.b)}</td><td>${E(b.f)}</td><td>${E(b.s)}</td></tr>`).join("");
    const bw = m.bowler ? `<tr><td>${E(m.bowler.n)}</td><td>${E(m.bowler.o)}</td><td>${E(m.bowler.r)}</td><td><b>${E(m.bowler.w)}</b></td></tr>` : "";
    const balls = (m.balls || []).map((x) => x.k === "eo"
      ? `<li class="eo">${E(x.t)}</li>`
      : `<li class="k${E(x.k === "." ? "d" : x.k)}"><span class="ov">${E(x.ov)}</span>${chip(x.k)}<span class="t">${E(x.t)}</span></li>`).join("");
    return `<h2>🏏 ${E(m.title)}</h2><div class="sub">${E(shortDesc(m))}${m.toss ? " · Toss: " + E(m.toss) : ""}</div>
      <div class="sc">${teamRows(m)}${m.headline ? `<div class="hl">${E(m.headline)}</div>` : ""}
      ${m.state === "in" ? `<div class="eq">${m.crr != null ? `<span>Run rate ${E(m.crr)}</span>` : ""}${m.rrr ? `<span>Required ${E(m.rrr)}</span>` : ""}${m.overs ? `<span>${E(m.overs)} ov</span>` : ""}</div>` : ""}</div>
      ${m.state === "in" && bat ? `<table><tr><th>Batting</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr>${bat}</table>` : ""}
      ${m.state === "in" && bw ? `<table><tr><th>Bowling</th><th>O</th><th>R</th><th>W</th></tr>${bw}</table>` : ""}
      ${balls ? `<h3>Ball by ball</h3><ul>${balls}</ul>` : m.state === "pre" ? `<p>Ball-by-ball starts when the match does. This page updates by itself.</p>` : ""}
      ${(m.notes || []).length ? `<h3>Milestones</h3><ul class="notes">${m.notes.slice().reverse().map((n) => `<li>${E(n)}</li>`).join("")}</ul>` : ""}
      <div class="src">Updated ${ago(m.updated || Date.now())} · auto-refreshes · Data: <a href="${E(m.link)}" target="_blank" rel="noopener">ESPNcricinfo</a></div>
      <button class="go-btn" data-cclose="1">Close</button>`;
  }

  function openSheet(id) {
    document.querySelectorAll(".sheet").forEach((x) => x.remove());
    const el = document.createElement("div");
    el.className = "sheet csheet";
    el.id = "cricsheet";
    el.dataset.id = id;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Live cricket");
    el.innerHTML = `<div class="sheet-in">${sheetInner(M.find((m) => m.id === id))}</div>`;
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-cclose]")) el.remove(); });
    document.body.appendChild(el);
    load();
  }

  function render() {
    const card = document.getElementById("crick");
    if (card) {
      if (M.length) card.outerHTML = window.cricHTML(); else card.remove();
    } else if (M.length && window.spillRerender) {
      window.spillRerender();
    }
    const sh = document.getElementById("cricsheet");
    if (sh) { const inner = sh.querySelector(".sheet-in"); const st = inner.scrollTop; inner.innerHTML = sheetInner(M.find((m) => m.id === sh.dataset.id)); inner.scrollTop = st; }
  }

  async function load() {
    clearTimeout(timer);
    try {
      const { data, error } = await sb.from("cricket_live").select("id,state,data,updated_at").eq("active", true).order("updated_at", { ascending: false });
      if (!error) {
        const rank = { in: 0, pre: 1, post: 2 };
        M = (data || []).map((r) => r.data).filter(Boolean).sort((a, b) => (rank[a.state] ?? 3) - (rank[b.state] ?? 3));
        render();
      }
    } catch (_) { /* offline: keep last */ }
    const live = M.some((m) => m.state === "in");
    timer = setTimeout(load, document.hidden ? 180e3 : live ? 20e3 : 120e3);
  }

  document.addEventListener("click", (e) => { const b = e.target.closest("[data-crick]"); if (b) { e.preventDefault(); e.stopPropagation(); openSheet(b.dataset.crick); } }, true);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
  load();
})();
