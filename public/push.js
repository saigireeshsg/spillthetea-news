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
  // ---------- Contextual opt-in at moments that actually happen ----------
  // Triggers: alert (opened a civic alert), story (opened a water/power/cyclone story), follow (followed a story),
  // alertme (tapped 🔔 Alert me), visit2 (2nd visit day), idle (20s on page after a scroll), read (2nd full read).
  // Tracked as optin_shown / optin_yes / optin_no with id = trigger, so each moment's conversion is measurable.
  const OPT = "spill.optin.last", READS = "spill.reads.n", VIS = "spill.visit.days";
  const CIV = /water|power|cyclone|rain|civic|flood|drought|outage/i;
  function canAsk(force) {
    const P = window.spillPush;
    if (P.has("news")) return false;
    if (P.iosNeedsInstall()) return force || Date.now() - +(lsGet(OPT) || 0) > 3 * 86400e3;
    if (!P.supported() || Notification.permission !== "default") return false;
    return force || Date.now() - +(lsGet(OPT) || 0) > 3 * 86400e3;
  }
  const COPY = {
    alert: ["🔔 Get the next alert before it hits your area?", "💧 Madhapur: no water 6am–2pm tomorrow"],
    story: ["💧 Get the alert before your area's water is cut", "💧 Water cut tomorrow in your area: 6am–2pm"],
    follow: ["🔔 Get a ping when this story changes?", "🧵 Update: the story you follow just moved"],
    alertme: ["🔔 Alerts for power cuts, water cuts & storms", "⚡ Power cut in Gachibowli: 10am–1pm today"],
    visit2: ["👋 Welcome back. Want Hyderabad Today at 8am?", "☀️ Hyderabad Today: 3 things before you head out"],
    idle: ["💧 Know before your area's water is cut", "💧 Water cut tomorrow in your area: 6am–2pm"],
    read: ["🔔 Know first when Hyderabad news hits you", "🌧️ Heavy rain alert for Hyderabad tonight"],
  };
  let shownThisSession = false;
  function optinSheet(trigger, force) {
    if (document.querySelector(".optin") || (shownThisSession && !force) || !canAsk(force)) return;
    shownThisSession = true; lsSet(OPT, String(Date.now()));
    const P = window.spillPush, ios = P.iosNeedsInstall();
    const [title, sample] = COPY[trigger] || COPY.read;
    const el = document.createElement("div"); el.className = "optin"; el.setAttribute("role", "dialog");
    el.innerHTML = ios
      ? `<div class="oi-in"><b>📲 Add Spill to your Home Screen to get alerts</b><span>iPhone only sends alerts to apps on your Home Screen.</span><ol class="oi-ios"><li>Tap <b>Share</b> <span aria-hidden="true">⬆️</span> at the bottom of Safari</li><li>Tap <b>Add to Home Screen</b>, then open Spill from there</li></ol><div class="oi-row"><button class="oi-no">Got it</button></div></div>`
      : `<div class="oi-in"><b>${title}</b><div class="oi-ntf"><i>spill</i><span><small style="color:#9aa">Example · </small>${sample}</span></div><span>Power, water, rain & big Hyderabad news. <b>Max 3 a day.</b> Only what affects you.</span><div class="oi-row"><button class="oi-yes">🔔 Yes, alert me</button><button class="oi-no">Not now</button></div></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("on"));
    track(ios ? "optin_ios" : "optin_shown", { id: trigger, variant: ios ? "ios" : trigger });
    const close = () => { el.classList.remove("on"); setTimeout(() => el.remove(), 250); };
    el.querySelector(".oi-no").onclick = () => { if (!ios) track("optin_no", { id: trigger, variant: trigger }); close(); };
    const y = el.querySelector(".oi-yes");
    if (y) y.onclick = async () => { track("optin_yes", { id: trigger, variant: trigger }); close(); const ok = await window.spillPush.add("news").catch(() => false); if (ok) track("alerts_on", { id: trigger, variant: trigger }); toastP(ok ? "🔔 Done. You'll hear first. Max 3 a day." : "Alerts are off in your browser settings."); window.spillRerender && window.spillRerender(); };
  }
  window.spillOptin = optinSheet;
  // 1) Opened a civic alert, or a water/power/cyclone story
  window.addEventListener("spill:moment", (e) => {
    const d = e.detail || {};
    if (d.kind === "alert_open") setTimeout(() => optinSheet("alert"), 1800);
    else if (d.kind === "story_open" && CIV.test(d.id || "")) setTimeout(() => optinSheet("story"), 4000);
  });
  // 2) Second full read (old trigger, kept)
  window.addEventListener("spill:read", () => {
    const n = (+(lsGet(READS) || 0)) + 1; lsSet(READS, String(n));
    if (n >= 2) setTimeout(() => optinSheet("read"), 900);
  });
  // 3) Second visit day
  (function () {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    let days = []; try { days = JSON.parse(lsGet(VIS) || "[]"); } catch (_) {}
    if (!days.includes(today)) { days.push(today); lsSet(VIS, JSON.stringify(days.slice(-30))); }
    if (days.length >= 2) setTimeout(() => optinSheet("visit2"), 6000);
  })();
  // 4) Fallback: 20s on the page after the first scroll
  let idleArmed = false;
  window.addEventListener("scroll", () => { if (idleArmed) return; idleArmed = true; setTimeout(() => { if (document.visibilityState === "visible") optinSheet("idle"); }, 20000); }, { passive: true });
  const css2 = document.createElement("style");
  css2.textContent = `.optin{position:fixed;left:0;right:0;bottom:0;z-index:90;display:flex;justify-content:center;padding:0 12px calc(12px + env(safe-area-inset-bottom,0px));transform:translateY(110%);transition:transform .25s ease}
.optin.on{transform:none}.optin .oi-in{width:100%;max-width:520px;background:#1d1d20;border:1px solid #3a3a42;border-radius:18px;padding:14px 16px;display:grid;gap:6px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.optin b{font-size:16px;line-height:1.3}.optin span{font-size:13.5px;color:var(--muted,#a3acb0)}
.optin .oi-row{display:flex;gap:8px;margin-top:6px}.optin button{font:inherit;font-weight:800;border:0;border-radius:999px;padding:10px 14px;cursor:pointer}
.optin .oi-ntf{display:flex;gap:8px;align-items:center;background:#2a2a30;border-radius:12px;padding:8px 10px;font-size:13px;color:#eee}.optin .oi-ntf i{font-style:normal;font-weight:900;font-size:11px;background:#ff4500;color:#fff;border-radius:6px;padding:2px 5px}.optin .oi-ios{margin:2px 0 0;padding-left:20px;font-size:13.5px;color:#ddd;display:grid;gap:4px}
.optin .oi-yes{background:var(--orange,#ff4500);color:#fff;flex:1}.optin .oi-no{background:#2a2a30;color:var(--fg,#eee)}`;
  document.head.appendChild(css2);

  function toastP(msg) {
    if (typeof window.toast === "function") return window.toast(msg);
    const t = document.createElement("div"); t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#1a1a1b;color:#fff;border:1px solid #343536;padding:10px 14px;border-radius:12px;z-index:99;font:600 13.5px system-ui;max-width:90vw";
    document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  }
  document.addEventListener("click", async (e) => {
    const am = e.target.closest("[data-alertme]");
    if (am) { e.preventDefault(); e.stopPropagation(); track("alert_me", { id: am.dataset.alertme });
      if (window.spillPush.has("news")) { toastP("✓ Alerts are on. Max 3 a day."); return; }
      if (window.spillPush.supported() && Notification.permission === "default" && !window.spillPush.iosNeedsInstall()) { const ok = await window.spillPush.add("news").catch(() => false); if (ok) track("alerts_on", { id: am.dataset.alertme.split("-")[0], variant: "alertme" }); toastP(ok ? "🔔 Done. Water, power & storm alerts. Max 3 a day." : "Alerts are off in your browser settings."); window.spillRerender && window.spillRerender(); }
      else if (window.spillPush.blocked()) toastP("Allow notifications for spillthetea.news in your browser settings.");
      else optinSheet("alertme", true);
      return; }
    const rx = e.target.closest("[data-react]");
    if (rx) { e.preventDefault(); e.stopPropagation(); const id = rx.dataset.key; let m = {}; try { m = JSON.parse(lsGet("spill.react") || "{}"); } catch (_) {}
      if (m[id]) delete m[id]; else { m[id] = rx.dataset.react; track("story_react", { id, variant: rx.dataset.react }); }
      lsSet("spill.react", JSON.stringify(m)); rx.classList.toggle("on", !!m[id]); return; }
    const fo = e.target.closest('[data-act="follow"]');
    if (fo && !/Following/.test(fo.textContent)) { track("story_follow", { id: fo.dataset.key }); setTimeout(() => optinSheet("follow", true), 700); }
  }, true);
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
