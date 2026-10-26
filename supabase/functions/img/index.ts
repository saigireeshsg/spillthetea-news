// Spill image finder: openly licensed photos with credits for a story.
// GET /functions/v1/img?q=<query>  →  { thumb, page, title, artist, license, license_url, source } or { none: true }
// 1) Wikimedia Commons (CC BY / CC BY-SA / CC0 / public domain), 2) Openverse fallback. Responses are cached for a week.
const H = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=604800, s-maxage=604800" };
const UA = { "User-Agent": "SpillNews/1.0 (https://spillthetea.news; image credits shown in app)" };
const BAD = /(logo|map|diagram|chart|flag|coat[_ ]of[_ ]arms|seal|emblem|signature|icon|graph|plan|svg|screenshot|poster|banner|cartoon|stamp|locator|\.tif)/i;
const OK_LIC = /^(cc[- ]?by(-sa)?|cc0|public domain|pd|attribution)/i;
const strip = (s: string) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

async function commons(q: string) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q + " filetype:bitmap")}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=960&origin=*`;
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(8000) });
  const j = await r.json();
  const pages = Object.values(j?.query?.pages || {}) as any[];
  pages.sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const p of pages) {
    const ii = p.imageinfo?.[0]; if (!ii) continue;
    const m = ii.extmetadata || {};
    const lic = strip(m.LicenseShortName?.value);
    if (!OK_LIC.test(lic)) continue;
    if (BAD.test(p.title)) continue;
    if (!ii.width || ii.width < 640 || ii.height > ii.width * 1.25) continue;
    return { thumb: ii.thumburl || ii.url, page: ii.descriptionurl, title: strip(p.title.replace(/^File:/, "").replace(/\.\w+$/, "")), artist: strip(m.Artist?.value) || "Unknown", license: lic, license_url: m.LicenseUrl?.value || "", source: "Wikimedia Commons" };
  }
  return null;
}
async function openverse(q: string) {
  const u = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license_type=commercial,modification&aspect_ratio=wide&page_size=10&mature=false`;
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(8000) });
  const j = await r.json();
  for (const x of (j.results || [])) {
    if (BAD.test(x.title || "")) continue;
    return { thumb: x.thumbnail || x.url, page: x.foreign_landing_url, title: strip(x.title), artist: strip(x.creator) || "Unknown", license: `CC ${String(x.license || "").toUpperCase()} ${x.license_version || ""}`.trim(), license_url: x.license_url || "", source: x.source ? `Openverse / ${x.source}` : "Openverse" };
  }
  return null;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: H });
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 120);
  if (!q) return new Response(JSON.stringify({ none: true }), { headers: H, status: 400 });
  let out = null;
  try { out = await commons(q); } catch (_) { /* fall through */ }
  if (!out) { try { out = await openverse(q); } catch (_) { /* none */ } }
  return new Response(JSON.stringify(out || { none: true, q }), { headers: H });
});
