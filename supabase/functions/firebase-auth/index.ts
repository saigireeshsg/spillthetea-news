// Google sign-in via Firebase. Browser signs in with Firebase (popup), sends the Firebase ID token here.
// We verify it against Google's public keys, create/find the matching Supabase user, and return a one-time
// token hash the browser trades for a Supabase session (verifyOtp). Env: FIREBASE_PROJECT_ID.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const out = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const pid = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!pid) return out({ error: "not_configured" }, 503);
  let idToken = "";
  try { idToken = (await req.json()).id_token || ""; } catch (_) { return out({ error: "bad_request" }, 400); }
  if (!idToken) return out({ error: "bad_request" }, 400);
  let p: Record<string, unknown>;
  try {
    ({ payload: p } = await jwtVerify(idToken, JWKS, { issuer: "https://securetoken.google.com/" + pid, audience: pid }));
  } catch (_) { return out({ error: "invalid_token" }, 401); }
  const email = String(p.email || "").toLowerCase();
  if (!email || p.email_verified !== true) return out({ error: "email_unverified" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const meta = { provider: "google", name: p.name || "", full_name: p.name || "", avatar_url: p.picture || "" };
  const cr = await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: meta });
  if (cr.error && !/already|registered|exists/i.test(cr.error.message)) return out({ error: "user_failed" }, 500);
  const lk = await sb.auth.admin.generateLink({ type: "magiclink", email });
  const th = lk.data?.properties?.hashed_token;
  if (!th) return out({ error: "link_failed" }, 500);
  return out({ token_hash: th, name: p.name || "" });
});
