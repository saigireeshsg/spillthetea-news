// Image proxy for the Spill post kit: lets the browser draw publisher images into a canvas (adds CORS).
// https only, no private hosts, images only, 6 MB cap.
const cors = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400" };
const bad = (s: number, m: string) => new Response(m, { status: s, headers: cors });
Deno.serve(async (req) => {
  const u = new URL(req.url).searchParams.get("u") || "";
  let t: URL; try { t = new URL(u); } catch (_) { return bad(400, "bad url"); }
  if (t.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(t.hostname) || !t.hostname.includes(".")) return bad(400, "blocked");
  const r = await fetch(t, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SpillBot/1.0)", Accept: "image/*" }, redirect: "follow" }).catch(() => null);
  if (!r || !r.ok) return bad(502, "fetch failed");
  const ct = r.headers.get("content-type") || "";
  if (!ct.startsWith("image/")) return bad(415, "not image");
  const buf = await r.arrayBuffer();
  if (buf.byteLength > 6e6) return bad(413, "too big");
  return new Response(buf, { headers: { ...cors, "Content-Type": ct } });
});
