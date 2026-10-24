// Registers the service worker and shows an "Add Spill to your home screen" bar.
(function () {
  "use strict";
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }

  const KEY = "spill.install.dismissed";
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const dismissed = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
  if (standalone || dismissed()) return;

  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  let deferred = null;

  const css = document.createElement("style");
  css.textContent = `#installbar{position:fixed;left:8px;right:8px;bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:45;max-width:520px;margin-inline:auto;background:var(--card,#1a1a1b);border:1px solid var(--line,#343536);border-radius:16px;padding:12px 12px 12px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 30px #0008;font-family:var(--f-ui,system-ui);color:var(--fg,#d7dadc)}
#installbar .ic{width:38px;height:38px;border-radius:50%;background:#ff4500;display:grid;place-items:center;font-size:19px;flex:none}
#installbar .tx{flex:1;min-width:0}#installbar b{display:block;font-size:14.5px}#installbar span{display:block;font-size:12.5px;color:var(--muted,#a3acb0);line-height:1.35}
#installbar .go{border:0;background:#ff4500;color:#fff;font-weight:800;border-radius:999px;padding:9px 14px;font-size:13.5px;flex:none}
#installbar .x{border:0;background:none;color:var(--muted,#a3acb0);font-size:20px;padding:4px 6px;flex:none}
#installbar[hidden]{display:none}`;
  document.head.appendChild(css);

  const bar = document.createElement("div");
  bar.id = "installbar";
  bar.hidden = true;
  bar.setAttribute("role", "dialog");
  bar.setAttribute("aria-label", "Install Spill");

  function render() {
    bar.innerHTML = isIOS && !deferred
      ? `<span class="ic">☕</span><div class="tx"><b>Add Spill to your home screen</b><span>Tap Share <b style="display:inline">⬆️</b>, then “Add to Home Screen”.</span></div><button class="x" aria-label="Dismiss">×</button>`
      : `<span class="ic">☕</span><div class="tx"><b>Get the Spill app</b><span>Opens like an app. Today's tea, one tap away.</span></div><button class="go">Install</button><button class="x" aria-label="Dismiss">×</button>`;
  }

  function canShow() {
    // Stay out of the way while a story is open or a sheet is up.
    return !document.querySelector(".next,.sheet,.cu,.sv,.push") && (deferred || isIOS);
  }
  function update() { bar.hidden = !canShow(); }

  bar.addEventListener("click", async (e) => {
    if (e.target.closest(".x")) {
      try { localStorage.setItem(KEY, "1"); } catch (_) {}
      bar.remove();
      return;
    }
    if (e.target.closest(".go") && deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      deferred = null;
      if (choice && choice.outcome === "accepted") bar.remove();
      else update();
    }
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    render();
    update();
  });
  window.addEventListener("appinstalled", () => bar.remove());

  function start() {
    render();
    document.body.appendChild(bar);
    // Wait a little so first-time readers see the news before the ask.
    setTimeout(() => {
      update();
      new MutationObserver(update).observe(document.body, { childList: true });
    }, 8000);
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
