// Spill sign-in / sign-up: Google (Supabase OAuth) and Reddit (reddit-auth edge function).
// Everyone starts as an anonymous guest (progress saved). Signing up links Google to that guest so nothing is lost.
(function () {
  "use strict";
  const C = window.SPILL_CONFIG || {}, SB = () => window.spillSB;
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const REDIR = () => location.origin + "/";
  let user = null;
  const isGuest = (u) => !u || u.is_anonymous;
  const label = (u) => (u && !u.is_anonymous ? (u.user_metadata && (u.user_metadata.reddit_name ? "u/" + u.user_metadata.reddit_name : u.user_metadata.full_name || u.user_metadata.name)) || (u.email || "").split("@")[0] || "You" : "");
  const gSvg = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8a6 6 0 1 1 0-12c1.9 0 3.1.8 3.8 1.5l2.6-2.5A9.6 9.6 0 0 0 12 2.4a9.6 9.6 0 1 0 0 19.2c5.5 0 9.2-3.9 9.2-9.3 0-.6-.1-1.1-.2-1.6z"/></svg>';
  const rSvg = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#ff4500"/><path fill="#fff" d="M18.7 12a1.6 1.6 0 0 0-2.7-1.1 7.9 7.9 0 0 0-4.2-1.3l.8-2.6 2.2.5a1.2 1.2 0 1 0 .2-.8l-2.7-.6a.4.4 0 0 0-.5.3l-.9 3.2a8 8 0 0 0-4.3 1.3A1.6 1.6 0 1 0 5.8 13a3 3 0 0 0 0 .5c0 2.4 2.7 4.3 6.2 4.3s6.2-1.9 6.2-4.3a3 3 0 0 0 0-.5 1.6 1.6 0 0 0 .5-1zM9 13a1.1 1.1 0 1 1 2.2 0A1.1 1.1 0 0 1 9 13zm6 2.8c-.7.7-1.9 1-3 1s-2.300-.3-3-1a.3.3 0 0 1 .4-.4c.6.5 1.600.8 2.600.8s2-.3 2.600-.8a.3.3 0 0 1 .4.4zm-.2-1.700a1.100 1.100 0 1 1 0-2.200 1.100 1.100 0 0 1 0 2.200z"/></svg>';
  const css = `.aps{position:fixed;inset:0;z-index:9999;background:#000a;display:flex;align-items:flex-end;justify-content:center}.apc{width:100%;max-width:460px;background:#12161e;color:#fff;border:1px solid #ffffff22;border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));font-family:inherit}
.apc h2{margin:0 0 4px;font-size:22px;font-weight:900}.apc p{margin:0 0 12px;font-size:13.5px;opacity:.75;line-height:1.4}.apx{float:right;border:0;background:#ffffff14;color:#fff;border-radius:999px;padding:6px 12px;font:600 12px inherit;cursor:pointer}
.aptabs{display:grid;grid-template-columns:1fr 1fr;background:#ffffff10;border-radius:12px;padding:3px;margin:10px 0 14px}.aptabs button{border:0;background:transparent;color:#fff;padding:10px;border-radius:10px;font:800 14px inherit;cursor:pointer;opacity:.7}.aptabs button[aria-selected="true"]{background:#fff;color:#111;opacity:1}
.apb{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;border:0;border-radius:12px;padding:13px;margin:0 0 10px;font:800 15px inherit;cursor:pointer}.apb.g{background:#fff;color:#1f1f1f}.apb.r{background:#ff4500;color:#fff}.apb.r svg circle{fill:#fff}.apb.r svg path{fill:#ff4500}.apb[disabled]{opacity:.6}
.apsm{font-size:11.5px;opacity:.6;margin:6px 0 0;line-height:1.4}.apmsg{margin:0 0 10px;padding:8px 10px;border-radius:10px;background:#ff4d4d22;color:#ffb3b3;font-size:13px}.apok{background:#46d16022;color:#a8f0bb}
.apill{display:inline-flex;align-items:center;gap:6px;border:1px solid #ffffff44;background:#ffffff14;color:inherit;border-radius:999px;padding:5px 12px;font:800 12px/1 inherit;cursor:pointer;margin-left:6px}.apill i{font-style:normal;display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#ff4500;color:#fff;font-size:10px}`;
  function sheet(mode, msg) {
    document.querySelectorAll(".aps").forEach((x) => x.remove());
    const signed = !isGuest(user), up = mode === "up";
    const el = document.createElement("div"); el.className = "aps"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Sign in or sign up");
    if (signed) {
      el.innerHTML = `<div class="apc"><button class="apx" data-x>Close</button><h2>You're signed in</h2><p>${E(label(user))}. Your progress follows you to any device.</p><button class="apb g" data-out>Sign out</button></div>`;
    } else {
      el.innerHTML = `<div class="apc"><button class="apx" data-x>Close</button><h2>${up ? "Create your Spill account" : "Welcome back"}</h2><p>${up ? "Sign up in one tap. Your streak, votes and follows so far are kept." : "Sign in to get your streak, votes and follows on this device."}</p>
      <div class="aptabs" role="tablist"><button role="tab" data-m="up" aria-selected="${up}">Sign up</button><button role="tab" data-m="in" aria-selected="${!up}">Sign in</button></div>
      ${msg ? `<div class="apmsg ${msg[0] === "+" ? "apok" : ""}">${E(msg.replace(/^[+-]/, ""))}</div>` : ""}
      <button class="apb g" data-p="google">${gSvg}<span>${up ? "Sign up" : "Sign in"} with Google</span></button>
      <button class="apb r" data-p="reddit">${rSvg}<span>${up ? "Sign up" : "Sign in"} with Reddit</span></button>
      <p class="apsm">You'll go to Google or Reddit to approve, then come straight back here. We only get your name and a login id. We never post for you.</p></div>`;
    }
    el.addEventListener("click", async (e) => {
      if (e.target === el || e.target.closest("[data-x]")) return el.remove();
      const m = e.target.closest("[data-m]"); if (m) return sheet(m.dataset.m);
      if (e.target.closest("[data-out]")) { try { await SB().auth.signOut(); } catch (_) {} location.reload(); return; }
      const b = e.target.closest("[data-p]"); if (!b) return; b.disabled = true;
      try { b.dataset.p === "google" ? await google(up) : await reddit(); } catch (err) { sheet(mode, "-" + (err && err.message || "Couldn't start sign-in. Try again.")); }
    });
    document.body.appendChild(el);
  }
  function loadJs(u) { return new Promise((res, rej) => { const x = document.createElement("script"); x.src = u; x.onload = res; x.onerror = () => rej(new Error("Couldn't load Google sign-in. Check your connection.")); document.head.appendChild(x); }); }
  async function google(up) {
    const sb = SB(); if (!sb) throw new Error("Sign-in is offline right now.");
    if (C.firebase && C.firebase.apiKey) { // fast path: Firebase popup, no page reload until done
      const V = "10.12.2", B = "https://cdnjs.cloudflare.com/ajax/libs/firebase/" + V + "/";
      if (!window.firebase) { await loadJs(B + "firebase-app-compat.min.js"); await loadJs(B + "firebase-auth-compat.min.js"); }
      const fb = window.firebase; if (!fb.apps.length) fb.initializeApp(C.firebase);
      let cred; try { cred = await fb.auth().signInWithPopup(new fb.auth.GoogleAuthProvider()); } catch (e) { throw new Error(e && e.code === "auth/popup-closed-by-user" ? "Sign-in cancelled." : e && e.code === "auth/unauthorized-domain" ? "This site isn't authorised in Firebase yet." : "Google sign-in failed. Try again."); }
      const idt = await cred.user.getIdToken();
      const r = await fetch(C.supabaseUrl + "/functions/v1/firebase-auth", { method: "POST", headers: { "Content-Type": "application/json", apikey: C.supabaseAnonKey, Authorization: "Bearer " + C.supabaseAnonKey }, body: JSON.stringify({ id_token: idt }) });
      const j = await r.json().catch(() => ({})); if (!j.token_hash) throw new Error(j.error === "not_configured" ? "Google sign-in isn't switched on yet." : "Google sign-in failed. Try again.");
      const { error } = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: "magiclink" }); if (error) throw error;
      try { await fb.auth().signOut(); } catch (_) {}
      location.reload(); return;
    }
    const opts = { redirectTo: REDIR() };
    if (up && user && user.is_anonymous) { const { error } = await sb.auth.linkIdentity({ provider: "google", options: opts }); if (error) throw new Error(/manual linking|not enabled|provider/i.test(error.message) ? "Google sign-up isn't switched on yet." : error.message); return; }
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: opts });
    if (error) throw new Error(/not enabled|provider/i.test(error.message) ? "Google sign-in isn't switched on yet." : error.message);
  }
  async function reddit() {
    if (!C.redditClientId) throw new Error("Reddit sign-in isn't switched on yet.");
    const st = Array.from(crypto.getRandomValues(new Uint8Array(12))).map((b) => b.toString(16).padStart(2, "0")).join("");
    try { sessionStorage.setItem("spill.rst", st); } catch (_) {}
    location.href = "https://www.reddit.com/api/v1/authorize?" + new URLSearchParams({ client_id: C.redditClientId, response_type: "code", state: "spillrd" + st, redirect_uri: REDIR(), duration: "temporary", scope: "identity" });
  }
  async function finishReddit() {
    const q = new URLSearchParams(location.search), code = q.get("code"), st = q.get("state") || "";
    if (!code || st.indexOf("spillrd") !== 0) return;
    history.replaceState(null, "", location.pathname + location.hash);
    let ok = false; try { ok = sessionStorage.getItem("spill.rst") === st.slice(7); sessionStorage.removeItem("spill.rst"); } catch (_) {}
    const sb = SB(); if (!ok || !sb) return sheet("in", "-Reddit sign-in expired. Try again.");
    try {
      const r = await fetch(C.supabaseUrl + "/functions/v1/reddit-auth", { method: "POST", headers: { "Content-Type": "application/json", apikey: C.supabaseAnonKey, Authorization: "Bearer " + C.supabaseAnonKey }, body: JSON.stringify({ code, redirect_uri: REDIR() }) });
      const j = await r.json(); if (!j.token_hash) throw new Error(j.error === "not_configured" ? "Reddit sign-in isn't switched on yet." : "Reddit sign-in failed. Try again.");
      const { error } = await sb.auth.verifyOtp({ token_hash: j.token_hash, type: "magiclink" }); if (error) throw error;
      location.reload();
    } catch (e) { sheet("in", "-" + (e.message || "Reddit sign-in failed.")); }
  }
  function pill() {
    const host = document.getElementById("streak"); if (!host) return;
    let p = document.getElementById("apill");
    if (!p) { p = document.createElement("button"); p.id = "apill"; p.className = "apill"; host.insertAdjacentElement("afterend", p); p.addEventListener("click", () => sheet(isGuest(user) ? "up" : "in")); }
    p.innerHTML = isGuest(user) ? "Sign in" : `<i>${E((label(user) || "U").replace(/^u\//, "")[0].toUpperCase())}</i>${E(label(user).slice(0, 12))}`;
    p.setAttribute("aria-label", isGuest(user) ? "Sign in or sign up" : "Account");
  }
  window.spillAuth = { open: (m) => sheet(m || "up"), user: () => user };
  async function boot() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const sb = SB(); if (!sb) return;
    await finishReddit();
    try { const { data } = await sb.auth.getSession(); user = data.session && data.session.user; } catch (_) {}
    pill();
    sb.auth.onAuthStateChange((ev, s) => { user = s && s.user; pill(); });
    if (/error_description=/.test(location.hash + location.search)) { const m = decodeURIComponent((location.hash + location.search).match(/error_description=([^&]+)/)[1].replace(/\+/g, " ")); history.replaceState(null, "", location.pathname); sheet("in", "-" + m); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 0)); else setTimeout(boot, 0);
})();
