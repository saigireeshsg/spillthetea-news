// Spill photo cards: every story gets an openly licensed photo (Wikimedia Commons / Openverse, via the `img`
// edge function) with WHY → WHAT → SO WHAT laid over it, and a visible credit line.
// Priority: drop.img (picked by the writer) → drop.img_q (writer's search query) → topic. Results cached per story.
(function () {
  "use strict";
  const C = window.SPILL_CONFIG || {};
  const FN = (C.supabaseUrl || "") + "/functions/v1/img?q=";
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = "spill.img.v1";
  let cache = {}; try { cache = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) {}
  const save = () => { try { const k = Object.keys(cache); if (k.length > 250) k.slice(0, k.length - 250).forEach((x) => delete cache[x]); localStorage.setItem(KEY, JSON.stringify(cache)); } catch (_) {} };
  const pending = new Set(); let rr = null;
  const rerender = () => { clearTimeout(rr); rr = setTimeout(() => window.spillRerender && window.spillRerender(), 400); };
  const qOf = (d) => d.img_q || ""; // runtime lookup only for writer-chosen queries; topic guesses can mismatch

  window.spillImg = function (d) {
    if (!d || !C.supabaseUrl) return null;
    if (d.img && d.img.thumb) return d.img;
    const q = qOf(d); if (!q) return null;
    const hit = cache[d.id];
    if (hit && hit.q === q) return hit.none ? null : hit;
    if (!pending.has(d.id) && pending.size < 6) {
      pending.add(d.id);
      fetch(FN + encodeURIComponent(q)).then((r) => r.json()).then((j) => {
        cache[d.id] = j && j.thumb ? Object.assign({ q }, j) : { q, none: 1, at: Date.now() };
        save(); if (j && j.thumb) rerender();
      }).catch(() => {}).finally(() => { pending.delete(d.id); });
    }
    return null;
  };

  const short = (s, n) => { s = String(s || "").replace(/\*/g, ""); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
  window.photoCardHTML = function (d, img) {
    const m = d.map || {};
    const why = m.causes && m.causes[0] ? [m.causes[0].icon, m.causes[0].label] : ["", short(d.beats && d.beats.why, 40)];
    const what = m.event ? [m.event.icon, m.event.label] : ["", short(d.beats && d.beats.what, 40)];
    const fx = m.effects && m.effects[0] ? [m.effects[0].icon, m.effects[0].label] : ["", short(d.beats && d.beats.care, 40)];
    const step = (k, v, cls) => v[1] ? `<li class="${cls}"><small>${k}</small><span>${v[0] ? E(v[0]) + " " : ""}${E(v[1])}</span></li>` : "";
    return `<figure class="phc"><img src="${E(img.thumb)}" alt="${E(img.title || d.topic || "")}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.phc').remove()"><a class="phcr" href="${E(img.page || "#")}" target="_blank" rel="noopener nofollow" aria-label="Photo credit">📷 ${E(img.artist || "Unknown")} · ${E(img.license || "")}</a></figure>
      <ol class="pstep">${step("Why", why, "w")}${step("What", what, "h")}${step("So what", fx, "f")}</ol>`;
  };

  const css = document.createElement("style");
  css.textContent = `.phc{position:relative;margin:10px 0 0;border-radius:14px;overflow:hidden;aspect-ratio:16/9;width:100%;background:#151517}
.phc img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.phc .phcr{position:absolute;right:6px;bottom:6px;max-width:70%;font-size:10px;line-height:1.2;color:#fff;background:rgba(0,0,0,.55);padding:3px 7px;border-radius:999px;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pstep{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;counter-reset:s}
.pstep li{background:var(--card-2,#202024);border-radius:12px;padding:8px 9px;font-size:13px;font-weight:700;line-height:1.3;position:relative}
.pstep li small{display:block;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}
.pstep li.w small{color:#ffd166}.pstep li.h small{color:#ff8a5c}.pstep li.f small{color:#7fd6ff}
.pstep li.h{background:#2a1508;box-shadow:inset 0 0 0 1px #5a2a0e}
.pstep li+li:before{content:"›";position:absolute;left:-6px;top:50%;transform:translate(-50%,-50%);color:var(--muted,#888);font-weight:900;font-size:14px}
.acts{flex-wrap:nowrap!important}.acts .mom{min-width:0;max-width:52%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.acts .readcta{margin-left:auto;white-space:nowrap}`;
  document.head.appendChild(css);
  // Credit links open the photo page, not the story.
  document.addEventListener("click", (e) => { if (e.target.closest(".phcr")) { e.stopPropagation(); try { window.spillTrack && window.spillTrack("photo_credit", {}); } catch (_) {} } }, true);
})();
