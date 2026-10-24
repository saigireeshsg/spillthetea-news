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

  const ph = (ev, props) => { try { posthog.capture(ev, props || {}); } catch (_) {} };
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
      const map = { post: "story_vote", poll: "poll_vote", pred: "prediction_vote", quiz: "quiz_answer", share: "story_share", pshare: "poll_share", pcard: "poll_card", live: "live_open", ltab: "live_tab", catchup: "top3_play", recap: "recap_open", follow: "story_follow" };
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
          ph("card_impression", { story_id: id, position: cards.indexOf(el) + 1, has_teaser: !!el.querySelector(".tq"), has_stat: !!el.querySelector(".statchip") });
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
