// Spill push alerts: one browser subscription, several topics ("news" = big Hyderabad/India news, "cricket").
// window.spillPush.has(topic) / add(topic) / remove(topic) / supported() / blocked() / iosNeedsInstall()
(function () {
  "use strict";
  const KEY = "spill.push.topics";
  const C = window.SPILL_CONFIG || {};
  const sb = window.spillSB;
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!C.vapidPublicKey && !!sb;
  const b64 = (s) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };

  function topics() {
    let t = []; try { t = JSON.parse(lsGet(KEY) || "[]"); } catch (_) {}
    if (lsGet("spill.alerts.cricket") === "1" && !t.includes("cricket")) t.push("cricket"); // older opt-ins
    return new Set(t);
  }
  async function apply(set) {
    const list = [...set];
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!list.length) {
      if (sub) { try { await sb.rpc("push_unsubscribe", { endpoint: sub.endpoint }); } catch (_) {} await sub.unsubscribe().catch(() => {}); }
      lsSet(KEY, "[]"); lsSet("spill.alerts.cricket", null); return true;
    }
    if (Notification.permission !== "granted") { const p = await Notification.requestPermission(); if (p !== "granted") return false; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(C.vapidPublicKey) });
    const { error } = await sb.rpc("push_subscribe", { sub: sub.toJSON(), topics: list });
    if (error) return false;
    lsSet(KEY, JSON.stringify(list)); lsSet("spill.alerts.cricket", list.includes("cricket") ? "1" : null);
    return true;
  }
  const track = (ev, p) => { try { window.spillTrack && window.spillTrack(ev, p || {}); } catch (_) {} };
  window.spillPush = {
    supported, iosNeedsInstall: () => isIOS && !standalone && !supported(),
    blocked: () => supported() && Notification.permission === "denied",
    has: (t) => supported() && Notification.permission === "granted" && topics().has(t),
    add: async (t) => { const s = topics(); s.add(t); const ok = await apply(s); track(ok ? "alerts_on" : "alerts_failed", { topic: t }); return ok; },
    remove: async (t) => { const s = topics(); s.delete(t); const ok = await apply(s); track("alerts_off", { topic: t }); return ok; },
  };

  // ---------- "Breaking news alerts" button on the Live page ----------
  const css = document.createElement("style");
  css.textContent = `.nbell{display:flex;align-items:center;gap:8px;width:100%;margin-top:8px;font:inherit;font-size:13.5px;font-weight:800;text-align:left;cursor:pointer;border-radius:12px;padding:10px 12px;border:1px dashed #b33a1a;background:transparent;color:#ffb38f}
.nbell.on{border-style:solid;border-color:#5a2a0e;background:#2a1405;color:#ffd7c4}.nbell small{font-weight:600;color:var(--muted,#a3acb0);margin-left:auto}`;
  document.head.appendChild(css);
  window.newsBellHTML = function () {
    const P = window.spillPush;
    if (P.has("news")) return `<button class="nbell on" data-nbell="off">🔔 Alerts on: power, water & big news <small>tap to turn off</small></button>`;
    if (P.iosNeedsInstall()) return `<button class="nbell" data-nbell="ios">🔔 Get alerts for big news <small>Add to Home Screen first</small></button>`;
    if (!P.supported()) return "";
    if (P.blocked()) return `<button class="nbell" data-nbell="blocked">🔕 Alerts are blocked in your browser settings</button>`;
    return `<button class="nbell" data-nbell="on">🔔 Alert me for power cuts, water & big news <small>max 3 a day</small></button>`;
  };
  function toastP(msg) {
    if (typeof window.toast === "function") return window.toast(msg);
    const t = document.createElement("div"); t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#1a1a1b;color:#fff;border:1px solid #343536;padding:10px 14px;border-radius:12px;z-index:99;font:600 13.5px system-ui;max-width:90vw";
    document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-nbell]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const v = b.dataset.nbell;
    if (v === "on") { const ok = await window.spillPush.add("news").catch(() => false); toastP(ok ? "🔔 Done. Power cuts, water alerts and big news only. Max 3 a day." : "Couldn't turn on alerts. Try again?"); }
    else if (v === "off") { await window.spillPush.remove("news").catch(() => {}); toastP("Alerts off"); }
    else if (v === "ios") toastP("Tap Share, then 'Add to Home Screen'. Open Spill from there to turn on alerts.");
    else if (v === "blocked") toastP("Allow notifications for spillthetea.news in your browser settings.");
    window.spillRerender && window.spillRerender();
  }, true);
})();
