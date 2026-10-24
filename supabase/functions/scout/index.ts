// Spill Scout agent: pulls headlines from every active feed in scout_sources
// and stores new ones in scout_items (duplicates are ignored by URL).
// Google News throttles bursts, so its searches run one at a time, a few per pass, oldest first.
// Bing News RSS is the fallback when Google blocks: links are unwrapped, publisher kept as "Title - Publisher".
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const GN_PER_RUN = 7, GN_GAP_MS = 2200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;|&#8217;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#8211;|&#8212;/g, "-").replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, " ").trim();

function tag(name: string, xml: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

function parse(xml: string, source: string, region: string) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 50).map((it) => {
    let link = tag("link", it);
    if (!link) {
      const m = it.match(/<link[^>]*href="([^"]+)"/i);
      link = m ? m[1] : "";
    }
    if (/bing\.com\/news\/apiclick/i.test(link)) { try { link = new URL(link).searchParams.get("url") || link; } catch (_) { /* keep */ } }
    const bsrc = tag("News:Source", it);
    const pub = tag("pubDate", it) || tag("dc:date", it) || tag("updated", it) || tag("published", it);
    const d = pub ? new Date(pub) : null;
    return {
      url: link.trim(),
      title: (tag("title", it) + (bsrc ? " - " + bsrc : "")).slice(0, 300),
      summary: tag("description", it).slice(0, 800) || tag("summary", it).slice(0, 800),
      source,
      region,
      published_at: d && !isNaN(+d) ? d.toISOString() : null,
    };
  }).filter((x) => x.url.startsWith("http") && x.title);
}

async function pull(s: any, results: unknown[]) {
  let status = "";
  const gn = s.url.includes("news.google.com");
  try {
    const res = await fetch(s.url, {
      headers: gn
        ? { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": "en-IN,en;q=0.9" }
        : { "User-Agent": "Mozilla/5.0 (compatible; SpillScout/1.0; +https://spillthetea.news)" },
      signal: AbortSignal.timeout(15000),
    });
    const xml = await res.text();
    const items = parse(xml, s.name, s.region);
    let added = 0;
    if (items.length) {
      const { data, error: e } = await sb.from("scout_items").upsert(items, { onConflict: "url", ignoreDuplicates: true }).select("id");
      if (e) throw e;
      added = data?.length ?? 0;
    }
    status = `${res.status} · ${items.length} items · ${added} new`;
    results.push({ source: s.name, http: res.status, items: items.length, added });
  } catch (e) {
    status = "error: " + String(e).slice(0, 200);
    results.push({ source: s.name, error: String(e).slice(0, 200) });
  }
  await sb.from("scout_sources").update({ last_run: new Date().toISOString(), last_status: status }).eq("id", s.id);
}

Deno.serve(async () => {
  const { data: sources, error } = await sb.from("scout_sources").select("*").eq("active", true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const all = sources || [];
  const direct = all.filter((s: any) => !s.url.includes("news.google.com"));
  const gn = all.filter((s: any) => s.url.includes("news.google.com"))
    .sort((a: any, b: any) => (Date.parse(a.last_run || 0) || 0) - (Date.parse(b.last_run || 0) || 0))
    .slice(0, GN_PER_RUN);
  const results: unknown[] = [];
  const directDone = Promise.all(direct.map((s: any) => pull(s, results)));
  for (const s of gn) { await pull(s, results); await sleep(GN_GAP_MS); }
  await directDone;
  await sb.from("scout_runs").insert({ results });
  return new Response(JSON.stringify({ ok: true, results }), { headers: { "Content-Type": "application/json" } });
});
