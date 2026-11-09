// Reddit sign-in for Spill. Supabase has no built-in Reddit provider, so:
// browser -> Reddit authorize -> back to spillthetea.news/?code=... -> this function exchanges the code,
// reads the Reddit identity, creates/finds the matching Supabase user and returns a one-time token hash
// that the browser trades for a session (verifyOtp). Secrets needed: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED = ["https://spillthetea.news/", "https://www.spillthetea.news/"];
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const out = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const id = Deno.env.get("REDDIT_CLIENT_ID"), secret = Deno.env.get("REDDIT_CLIENT_SECRET");
  if (!id || !secret) return out({ error: "not_configured" }, 503);
  let body: { code?: string; redirect_uri?: string } = {};
  try { body = await req.json(); } catch (_) { return out({ error: "bad_request" }, 400); }
  const { code, redirect_uri } = body;
  if (!code || !redirect_uri || !ALLOWED.includes(redirect_uri)) return out({ error: "bad_request" }, 400);
  const UA = "web:spillthetea-news:v1 (by /u/spillthetea)";
  const tr = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(id + ":" + secret), "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri }),
  });
  const tok = await tr.json().catch(() => ({}));
  if (!tok.access_token) return out({ error: "reddit_exchange_failed" }, 401);
  const mr = await fetch("https://oauth.reddit.com/api/v1/me", { headers: { Authorization: "Bearer " + tok.access_token, "User-Agent": UA } });
  const me = await mr.json().catch(() => ({}));
  if (!me.id || !me.name) return out({ error: "reddit_profile_failed" }, 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const email = `reddit-${String(me.id).toLowerCase()}@users.spillthetea.news`;
  const meta = { provider: "reddit", reddit_id: me.id, reddit_name: me.name, name: me.name };
  const cr = await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: meta });
  if (cr.error && !/already|registered|exists/i.test(cr.error.message)) return out({ error: "user_failed" }, 500);
  const lk = await sb.auth.admin.generateLink({ type: "magiclink", email });
  const th = lk.data?.properties?.hashed_token;
  if (!th) return out({ error: "link_failed" }, 500);
  return out({ token_hash: th, name: me.name });
});
