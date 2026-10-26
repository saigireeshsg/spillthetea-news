// Spill analytics (PostHog). Loads only when SPILL_CONFIG.posthogKey is set.
// Tracks page views, story opens, votes, shares, live wire / cricket use, alerts and installs.
(function () {
  "use strict";
  const C = window.SPILL_CONFIG || {};
  if (!C.posthogKey) return;
  if (window.self !== window.top) return; // the phone mockup on the desktop landing: don't double count

  // Official PostHog loader (array stub until the library arrives).
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify alias set_config reset opt_in_capturing opt_out_capturing has_opted_out_capturing get_distinct_id getFeatureFlag isFeatureEnabled onFeatureFlags reloadFeatureFlags group setPersonProperties".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  posthog.init(C.posthogKey, {
    api_host: C.posthogHost || "https://us.i.posthog.com",
    person_profiles: "always",
    capture_pageview: false,          // single-page app: we send our own page views below
    capture_pageleave: true,
    autocapture: true,
    session_recording: { maskAllInputs: true },
  });
  posthog.register({ app: "spill-web", installed_pwa: standalone, city: "Hyderabad" });

  // ---------- Mirror key events to Spill's own DB (agents read story_stats / variant_stats to learn what readers want) ----------
  const SB = window.spillSB, Q = [];
  const MIRROR = { optin_shown: 1, optin_yes: 1, optin_no: 1, alerts_on: 1, app_open: 1, opp_apply_click: 1, opp_call_click: 1, card_impression: 1, story_open: 1, story_read: 1, wire_expand: 1, wire_cta: 1, wire_source: 1, live_vote: 1, poll_vote: 1, quiz_answer: 1, story_share: 1, tab_open: 1, alert_open: 1, story_follow: 1, story_react: 1, alert_me: 1, optin_ios: 1, area_pick: 1, area_set: 1, area_share: 1, alert_forward: 1 };
  let anon = ""; try { anon = localStorage.getItem("spill.anon") || ""; if (!anon) { anon = Math.random().toString(36).slice(2, 12); localStorage.setItem("spill.anon", anon); } } catch (_) {}
  const flush = () => { if (!SB || !Q.length) return; const batch = Q.splice(0, 50); SB.rpc("track_events", { evs: batch }).then(() => {}, () => {}); };
  setInterval(flush, 8000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  const mirrorEv = (ev, p) => {
    if (!MIRROR[ev]) return;
    p = p || {};
    const id = p.story_id || p.id || p.key || p.tab || null;
    let v = p.variant || null;
    if (!v && id) { const el = document.querySelector(`[data-open="${CSS.escape(String(id))}"][data-v]`); if (el) v = el.dataset.v; }
    Q.push({ ev, id: id ? String(id) : null, v, a: anon });
    if (Q.length >= 20) flush();
  };
  const ph = (ev, props) => { try { posthog.capture(ev, props || {}); } catch (_) {} mirrorEv(ev, props); if (ev === "story_open" || ev === "alert_open") { try { window.dispatchEvent(new CustomEvent("spill:moment", { detail: { kind: ev, id: String((props || {}).story_id || (props || {}).id || "") } })); } catch (_) {} } if (ev === "story_read") { try { window.dispatchEvent(new CustomEvent("spill:read", { detail: { id: (props || {}).story_id } })); } catch (_) {} } };
  // Visits: one app_open per session (load, or coming back after 30 min away) → retention_daily / retention_cohorts
  let lastOpen = 0;
  const qs = new URLSearchParams(location.search), camp = qs.get("src") ? qs.get("src").slice(0, 12) + ":" + (qs.get("c") || "x").slice(0, 24) : null;
  const appOpen = (how) => { if (Date.now() - lastOpen < 30 * 60e3) return; lastOpen = Date.now(); ph("app_open", { how, standalone, id: how === "load" && camp ? camp : undefined }); flush(); };
  appOpen("load");
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") appOpen("return"); });
  window.spillTrack = ph;

  // Page views: initial load + story deep links (#s/<id>) + #cricket.
  const view = () => {
    const h = location.hash || "";
    const story = (h.match(/^#s\/(.+)$/) || [])[1];
    ph("$pageview", story ? { screen: "story", story_id: decodeURIComponent(story) } : { screen: h === "#cricket" ? "cricket" : "home" });
  };
  view();
  window.addEventListener("hashchange", view);

  // Key interactions via the app's data attributes (no changes needed in the main app).
  document.addEventListener("click", (e) => {
    const t = e.target;
    const open = t.closest("[data-open]");
    if (open) ph("story_open", { story_id: open.dataset.open, from: "feed" });
    const act = t.closest("[data-act]");
    if (act) {
      const a = act.dataset.act, key = act.dataset.key || "";
      const map = { post: "story_vote", poll: "poll_vote", pred: "prediction_vote", quiz: "quiz_answer", share: "story_share", pshare: "poll_share", pcard: "poll_card", live: "live_open", ltab: "live_tab", catchup: "top3_play", recap: "recap_open", follow: "story_follow_old" };
      ph(map[a] || "action_" + a, { key });
    }
    const f = t.closest("[data-f]");
    if (f) ph("tab_open", { tab: f.dataset.f });
    const wl = t.closest(".wire .wl");
    if (wl) ph("wire_click", { url: wl.getAttribute("href"), title: (wl.querySelector(".wt") || {}).textContent || "" });
    const cr = t.closest("[data-crick]");
    if (cr) ph("cricket_open", { match_id: cr.dataset.crick });
    const bell = t.closest("[data-cbell]");
    if (bell) ph("cricket_alerts_" + bell.dataset.cbell);
  }, true);


  // ---------- Reading funnel: card seen → card tapped → story read ----------
  // card_impression: a feed card was ≥60% visible for 1 s (once per card per page load).
  const seen = new Set();
  const timers = new Map();
  const io = "IntersectionObserver" in window ? new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      const el = en.target, id = el.dataset.open;
      if (!id || seen.has(id)) return;
      if (en.isIntersecting && en.intersectionRatio >= 0.6) {
        if (!timers.has(id)) timers.set(id, setTimeout(() => {
          seen.add(id); timers.delete(id);
          const cards = Array.from(document.querySelectorAll("#view article.post.click[data-open]"));
          ph("card_impression", { story_id: id, variant: el.dataset.v || null, position: cards.indexOf(el) + 1, has_teaser: !!el.querySelector(".tq"), has_stat: !!el.querySelector(".statchip") });
        }, 1000));
      } else if (timers.has(id)) { clearTimeout(timers.get(id)); timers.delete(id); }
    });
  }, { threshold: [0, 0.6] }) : null;
  const watch = () => { if (!io) return; document.querySelectorAll("#view article.post.click[data-open]").forEach((el) => { if (!el.__phw) { el.__phw = 1; io.observe(el); } }); };
  const viewEl = document.getElementById("view");
  if (viewEl) new MutationObserver(watch).observe(viewEl, { childList: true, subtree: true });
  watch();

  // story_read: reader scrolled through 75% of an open story (once per story).
  const readDone = new Set();
  let storyStart = 0, storyId = "";
  function currentStory() {
    const a = document.querySelector("#view > article.post:not(.click)");
    if (!a) return null;
    const k = a.querySelector("[data-act='share'][data-key], [data-act='poll'][data-key], [data-act='quiz'][data-key]");
    return k ? { el: a, id: k.dataset.key } : null;
  }
  window.addEventListener("scroll", () => {
    const s = currentStory(); if (!s) return;
    if (s.id !== storyId) { storyId = s.id; storyStart = Date.now(); }
    if (readDone.has(s.id)) return;
    const r = s.el.getBoundingClientRect();
    const depth = (window.innerHeight - r.top) / Math.max(r.height, 1);
    if (depth >= 0.75) { readDone.add(s.id); ph("story_read", { story_id: s.id, secs: Math.round((Date.now() - storyStart) / 1000) }); }
  }, { passive: true });

  // Install funnel.
  window.addEventListener("beforeinstallprompt", () => ph("pwa_install_prompt"));
  window.addEventListener("appinstalled", () => ph("pwa_installed"));
})();
