// Spill on desktop: a landing page (live app inside a 3D phone + today's trending + QR to open on mobile)
// and a separate desktop reading view (centred feed with Trending and Get-the-app / Live rails).
(function () {
  "use strict";
  const html = document.documentElement;
  const inFrame = window.self !== window.top;
  if (inFrame) {                                              // the phone mockup's own copy of the app
    html.classList.add("embed");
    const st = document.createElement("style");
    st.textContent = "html.embed .push,html.embed #installbar{display:none!important}html.embed ::-webkit-scrollbar{display:none}html.embed{scrollbar-width:none}";
    document.head.appendChild(st);
    return;
  }
  const wide = window.matchMedia("(min-width: 1024px)");
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if (!wide.matches || standalone) return;
  html.classList.add("desk");

  const KEY = "spill.desk.read";
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plain = (s) => String(s ?? "").replace(/\*/g, "");
  const hl = (s) => E(s).replace(/\*([^*]+)\*/g, "<em>$1</em>");
  const track = (ev, p) => { try { window.spillTrack && window.spillTrack(ev, p || {}); } catch (_) {} };
  const CAT = { local: ["📍", "Hyderabad"], india: ["🇮🇳", "India"], world: ["🌍", "World"], money: ["💰", "Money"], tech: ["⚡", "Tech"], sport: ["🏏", "Sport"], planet: ["🌿", "Planet"], edit: ["📰", "Editorial"], campus: ["🎓", "Campus"] };

  const css = document.createElement("style");
  css.textContent = `
/* ---------- landing ---------- */
#landing{position:fixed;inset:0;z-index:200;overflow:auto;background:radial-gradient(1200px 700px at 78% 40%,#3a1405 0%,#140b07 45%,#070707 100%);color:#eef1f3;font-family:var(--f-ui,system-ui)}
#landing .lp{max-width:1240px;margin:0 auto;padding:36px 48px 48px;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:40px;align-items:center;min-height:100vh;box-sizing:border-box}
#landing .brand{display:flex;align-items:center;gap:10px;font-weight:900;font-size:24px;letter-spacing:-.02em}
#landing .brand i{width:40px;height:40px;border-radius:50%;background:#ff4500;display:grid;place-items:center;font-style:normal;font-size:20px}
#landing h1{font-size:54px;line-height:1.02;letter-spacing:-.035em;margin:26px 0 14px;font-weight:900}
#landing h1 em{font-style:normal;color:#ff6a2b}
#landing .sub{font-size:18px;line-height:1.5;color:#c4ccd2;max-width:520px;margin:0 0 26px}
#landing .tr{background:#ffffff0d;border:1px solid #ffffff1f;border-radius:18px;padding:14px 16px;max-width:560px}
#landing .tr h3{margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#ffb38f;display:flex;justify-content:space-between}
#landing .tr h3 span{color:#9aa5ad;letter-spacing:0;text-transform:none;font-weight:600}
#landing .ti{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;text-align:left;background:none;border:0;border-top:1px solid #ffffff14;padding:10px 0;color:inherit;font:inherit;cursor:pointer}
#landing .ti:first-of-type{border-top:0}
#landing .ti b{font-size:15.5px;line-height:1.35;font-weight:700}#landing .ti b em{font-style:normal;color:#ff8a57}
#landing .ti .n{font-weight:900;color:#ff6a2b;font-size:15px}
#landing .ti small{font-size:12px;color:#9aa5ad;white-space:nowrap}
#landing .ti:hover b{text-decoration:underline;text-underline-offset:3px}
#landing .cta{display:flex;gap:18px;align-items:center;margin-top:24px;flex-wrap:wrap}
#landing .qr{display:flex;gap:14px;align-items:center;background:#fff;color:#111;border-radius:18px;padding:12px 16px 12px 12px;box-shadow:0 12px 40px #ff45002e}
#landing .qr img{width:112px;height:112px;display:block;image-rendering:pixelated}
#landing .qr b{display:block;font-size:16px;font-weight:900}
#landing .qr span{display:block;font-size:13px;color:#4a545b;margin-top:4px;line-height:1.4}
#landing .qr .url{font-weight:800;color:#ff4500}
#landing .go{border:1px solid #ffffff38;background:#ffffff0f;color:#fff;border-radius:999px;padding:13px 20px;font:inherit;font-weight:800;font-size:15px;cursor:pointer}
#landing .go:hover{background:#ffffff1f}
#landing .meta{display:flex;gap:18px;margin-top:22px;color:#9aa5ad;font-size:13.5px;flex-wrap:wrap}
#landing .meta b{color:#eef1f3}
#landing .stage{position:relative;display:grid;place-items:center;perspective:1700px;min-height:700px}
#landing .glow{position:absolute;width:420px;height:420px;border-radius:50%;background:#ff4500;filter:blur(120px);opacity:.35}
#landing .phone{position:relative;width:390px;height:812px;border-radius:56px;background:#0b0b0c;padding:12px;box-sizing:border-box;box-shadow:0 0 0 2px #2b2b2e,0 0 0 9px #141416,0 40px 90px #000c,-30px 30px 80px #ff450026;transform:rotateY(-17deg) rotateX(7deg) rotateZ(1.5deg) scale(.86);transition:transform .7s cubic-bezier(.2,.8,.2,1);animation:lpfloat 6s ease-in-out infinite;transform-style:preserve-3d}
#landing .stage:hover .phone{transform:rotateY(-5deg) rotateX(3deg) rotateZ(0) scale(.88)}
@keyframes lpfloat{50%{translate:0 -12px}}
#landing .phone iframe{width:100%;height:100%;border:0;border-radius:44px;background:#030303;display:block}
#landing .phone .notch{position:absolute;top:22px;left:50%;transform:translateX(-50%);width:118px;height:32px;border-radius:20px;background:#000;z-index:2}
#landing .phone:after{content:"";position:absolute;inset:0;border-radius:56px;pointer-events:none;background:linear-gradient(115deg,#ffffff14 0%,transparent 32%,transparent 70%,#ffffff08 100%)}
#landing .chip{position:absolute;background:#121214ee;border:1px solid #ffffff22;border-radius:14px;padding:10px 12px;font-size:13px;box-shadow:0 12px 30px #0008;backdrop-filter:blur(6px);max-width:220px}
#landing .chip b{display:block;font-size:20px;font-weight:900;color:#ff6a2b}
#landing .c1{left:-6px;top:120px;transform:rotate(-4deg)}#landing .c2{right:-2px;bottom:150px;transform:rotate(3deg)}
@media (max-width:1180px){#landing h1{font-size:44px}#landing .lp{padding:28px 32px}}
/* ---------- desktop reading view ---------- */
html.desk .drail{position:fixed;top:118px;width:280px;max-height:calc(100vh - 140px);overflow:auto;display:grid;gap:12px;align-content:start;z-index:5}
html.desk .drail .rc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px}
html.desk .drail h4{margin:0 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
html.desk .drail .ri{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line);padding:9px 0;color:var(--fg);font:inherit;font-size:14px;line-height:1.35;font-weight:600;cursor:pointer;text-decoration:none}
html.desk .drail .ri:first-of-type{border-top:0}
html.desk .drail .ri .n{font-weight:900;color:var(--orange)}
html.desk .drail .ri small{display:block;font-size:11.5px;color:var(--muted);font-weight:500;margin-top:2px}
html.desk .drail .ri:hover{color:var(--blue)}
html.desk .drail .qrc{display:grid;grid-template-columns:96px 1fr;gap:12px;align-items:center}
html.desk .drail .qrc img{width:96px;height:96px;border-radius:10px;background:#fff;padding:4px;box-sizing:border-box;image-rendering:pixelated}
html.desk .drail .qrc b{font-size:15px;display:block}html.desk .drail .qrc span{font-size:12.5px;color:var(--muted);line-height:1.4;display:block;margin-top:4px}
html.desk .drail .dback{border:0;background:none;color:var(--blue);font:inherit;font-weight:700;font-size:13px;padding:0;cursor:pointer;justify-self:start}
@media (min-width:1300px){html.desk #dl{left:calc(50% - 350px - 24px - 280px)}html.desk #dr{left:calc(50% + 350px + 24px)}}
@media (min-width:1024px) and (max-width:1299px){html.desk main.wrap{margin-left:max(24px,calc(50% - 502px));margin-right:auto}html.desk #dl{display:none}html.desk #dr{left:calc(max(24px,50% - 502px) + 700px + 24px)}}
`;
  document.head.appendChild(css);

  let drops = [];
  async function loadDrops() {
    try {
      const r = await fetch("/data/drops.json?t=" + Math.floor(Date.now() / 60000));
      const j = await r.json();
      drops = j.map((x) => Object.assign({ id: x.id }, x.data || x)).filter((d) => d.hook);
    } catch (_) { drops = []; }
    return drops;
  }
  function trending(n) {
    const day = (drops[0] && drops[0].date) || "";
    const today = drops.filter((d) => d.date === day);
    return (today.length >= n ? today : drops).slice().sort((a, b) => String(b.sort || "").localeCompare(String(a.sort || ""))).slice(0, n);
  }

  // ---------- landing ----------
  function showLanding() {
    const el = document.createElement("div");
    el.id = "landing";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Spill — open on your phone");
    el.innerHTML = `<div class="lp">
      <div>
        <div class="brand"><i>☕</i>spill</div>
        <h1>The news,<br>minus the <em>boring.</em></h1>
        <p class="sub">Hyderabad's news in 60-second stories, with the why, the numbers and what it means for you. Live updates, India cricket, and a poll on every story.</p>
        <div class="tr" id="lptr"><h3>🔥 Trending today <span id="lpday"></span></h3><div id="lpl"><div class="ti"><span class="n">…</span><b>Loading today's tea</b><small></small></div></div></div>
        <div class="cta">
          <div class="qr"><img src="/qr.svg" alt="QR code to open spillthetea.news on your phone" width="112" height="112"><div><b>📲 Scan to open on your phone</b><span>Best on mobile — installs like an app.<br>Or visit <span class="url">spillthetea.news</span></span></div></div>
          <button class="go" data-lp="read">Read on desktop →</button>
        </div>
        <div class="meta"><span><b id="lpn">—</b> stories today</span><span>🔴 Live updates every 10 min</span><span>🏏 India matches ball-by-ball</span></div>
      </div>
      <div class="stage" aria-hidden="true"><div class="glow"></div>
        <div class="phone"><div class="notch"></div><iframe src="/?embed=1" title="Spill on a phone" loading="eager" tabindex="-1"></iframe></div>
        <div class="chip c1"><b>60 sec</b>a story, with the why</div>
        <div class="chip c2"><b>📊</b>numbers you can see, not read</div>
      </div></div>`;
    document.body.appendChild(el);
    document.body.style.overflow = "hidden";
    track("desktop_landing_view");
    loadDrops().then(() => {
      const t = trending(5);
      const day = (drops[0] && drops[0].date) || "";
      el.querySelector("#lpn").textContent = drops.filter((d) => d.date === day).length || t.length;
      if (day) el.querySelector("#lpday").textContent = new Date(day + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      el.querySelector("#lpl").innerHTML = t.map((d, i) => `<button class="ti" data-lp="open" data-id="${E(d.id)}"><span class="n">${i + 1}</span><b>${hl(d.hook)}</b><small>${(CAT[d.cat] || CAT.india).join(" ")}</small></button>`).join("");
    });
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lp]"); if (!b) return;
      if (b.dataset.lp === "read") { track("desktop_read_click"); closeLanding(); }
      if (b.dataset.lp === "open") { track("desktop_trending_click", { story_id: b.dataset.id }); closeLanding(b.dataset.id); }
    });
  }
  function closeLanding(openId) {
    lsSet(KEY, "1");
    const el = document.getElementById("landing"); if (el) el.remove();
    document.body.style.overflow = "";
    if (openId) openStory(openId);
  }
  function openStory(id) {
    // Reuse the app's own story links: a temporary [data-open] click goes through its normal handler.
    const a = document.createElement("button"); a.dataset.open = id; a.style.display = "none";
    document.getElementById("view").appendChild(a); a.click(); a.remove();
  }

  // ---------- desktop rails ----------
  function rails() {
    const L = document.createElement("aside"); L.id = "dl"; L.className = "drail"; L.setAttribute("aria-label", "Trending today");
    const R = document.createElement("aside"); R.id = "dr"; R.className = "drail"; R.setAttribute("aria-label", "Get the app and live updates");
    document.body.appendChild(L); document.body.appendChild(R);
    const drawL = () => {
      const t = trending(7);
      L.innerHTML = `<div class="rc"><h4>🔥 Trending today</h4>${t.map((d, i) => `<button class="ri" data-open="${E(d.id)}"><span class="n">${i + 1}</span><span>${E(plain(d.hook))}<small>${(CAT[d.cat] || CAT.india).join(" ")}</small></span></button>`).join("")}</div>`;
    };
    const drawR = () => {
      const W = (window.wireList && window.wireList()) || [];
      R.innerHTML = `<div class="rc qrc"><img src="/qr.svg" alt="QR code for spillthetea.news" width="96" height="96"><div><b>📲 Spill is best on your phone</b><span>Scan to open. Add it to your home screen for the 7am drop and cricket alerts.</span></div></div>
        ${W.length ? `<div class="rc"><h4>🔴 Live wire</h4>${W.slice(0, 6).map((x) => `<a class="ri" href="${E(x.url)}" target="_blank" rel="noopener"><span class="n">•</span><span>${E(x.title)}<small>${E(x.publisher || "")}</small></span></a>`).join("")}</div>` : ""}
        <button class="dback" data-lp="landing">← Back to the Spill homepage</button>`;
    };
    loadDrops().then(drawL);
    drawR();
    setInterval(drawR, 120000);
    setTimeout(drawR, 4000);
    R.addEventListener("click", (e) => { if (e.target.closest("[data-lp='landing']")) { showLanding(); } });
  }

  function start() {
    rails();
    const deep = /^#s\//.test(location.hash) || location.hash === "#cricket";
    if (!lsGet(KEY) && !deep) showLanding();
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
