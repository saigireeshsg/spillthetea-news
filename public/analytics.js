// Spill analytics (PostHog). Loads only when SPILL_CONFIG.posthogKey is set.
// Tracks page views, story opens, votes, shares, live wire / cricket use, alerts and installs.
(function () {
  "use strict";
  const C = window.SPILL_CONFIG || {};
  if (!C.posthogKey) return;

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

  // Install funnel.
  window.addEventListener("beforeinstallprompt", () => ph("pwa_install_prompt"));
  window.addEventListener("appinstalled", () => ph("pwa_installed"));
})();
