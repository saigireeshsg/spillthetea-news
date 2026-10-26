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
    const why = m.causes && m.causes[0] ? `${m.causes[0].icon || ""} ${m.causes[0].label}` : short(d.beats && d.beats.why, 70);
    const what = m.event ? `${m.event.icon || ""} ${m.event.label}` : short(d.beats && d.beats.what, 70);
    const fx = m.effects && m.effects[0] ? `${m.effects[0].icon || ""} ${m.effects[0].label}` : short(d.beats && d.beats.care, 70);
    const cell = (k, t, cls) => t ? `<span class="pc ${cls}"><small>${k}</small>${E(t)}</span>` : "";
    const credit = `📷 ${E(img.artist || "Unknown")} · ${E(img.license || "")} · ${E(img.source || "")}`;
    return `<figure class="phc"><img src="${E(img.thumb)}" alt="${E(img.title || d.topic || "")}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.phc').classList.add('noimg')"><div class="phg" aria-hidden="true"></div>
      <div class="pflow">${cell("WHY", why, "w")}${why && what ? `<i>↓</i>` : ""}${cell("WHAT", what, "h")}${fx ? `<i>↓</i>` : ""}${cell("SO WHAT", fx, "f")}</div>
      <figcaption><a class="phcr" href="${E(img.page || "#")}" target="_blank" rel="noopener nofollow">${credit}</a></figcaption></figure>`;
  };

  const css = document.createElement("style");
  css.textContent = `.phc{position:relative;margin:10px 0 2px;border-radius:14px;overflow:hidden;aspect-ratio:4/3;max-height:360px;width:100%;background:#151517}
.phc img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.05)}
.phc .phg{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.35) 40%,rgba(0,0,0,.85) 100%)}
.phc .pflow{position:absolute;left:10px;right:10px;bottom:28px;display:grid;gap:3px;justify-items:start}
.phc .pflow i{font-style:normal;font-size:11px;color:#ffd7c4;margin-left:12px;line-height:1}
.phc .pc{display:block;max-width:100%;font-size:13.5px;font-weight:700;line-height:1.3;color:#fff;padding:6px 10px;border-radius:10px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);background:rgba(20,20,22,.62);border:1px solid rgba(255,255,255,.12)}
.phc .pc small{display:block;font-size:10px;font-weight:900;letter-spacing:.09em;opacity:.8;margin-bottom:1px}
.phc .pc.w small{color:#ffd166}.phc .pc.h{background:rgba(255,69,0,.88);border-color:rgba(255,140,90,.6)}.phc .pc.h small{color:#ffe6da}.phc .pc.f small{color:#7fd6ff}
.phc figcaption{position:absolute;left:0;right:0;bottom:0;padding:5px 10px;font-size:10.5px;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.phc figcaption a{color:inherit;text-decoration:none}
.phc.noimg img{display:none}.phc.noimg{aspect-ratio:auto;padding-top:120px}`;
  document.head.appendChild(css);
  // Credit links open the photo page, not the story.
  document.addEventListener("click", (e) => { if (e.target.closest(".phcr")) { e.stopPropagation(); try { window.spillTrack && window.spillTrack("photo_credit", {}); } catch (_) {} } }, true);
})();
