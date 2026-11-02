// Spill civic-enrich: fills `details` (when / timing / where / level / do / valid_until) for
// power, water, weather, traffic and holiday alerts, with no AI and no paid API.
// Reads the article text (falls back to the scout summary) and extracts ONLY what is written there.
// Anything it cannot find is left out and the summary says so. Never guesses areas or times.
import { createClient } from "jsr:@supabase/supabase-js@2";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const AREAS = ["Madhapur","HITEC City","Hitech City","Gachibowli","Kondapur","Manikonda","Kukatpally","KPHB","Miyapur","Ameerpet","Banjara Hills","Jubilee Hills","Begumpet","Secunderabad","Uppal","LB Nagar","L B Nagar","Dilsukhnagar","Mehdipatnam","Old City","Shamshabad","Charminar","Tolichowki","Attapur","Rajendranagar","Narsingi","Nanakramguda","Financial District","Serilingampally","Chandanagar","Lingampally","Bachupally","Nizampet","Pragathi Nagar","Alwal","Bowenpally","Malkajgiri","Kompally","Medchal","Habsiguda","Tarnaka","Nacharam","Mallapur","Boduppal","Nagole","Vanasthalipuram","Hayathnagar","Saroornagar","Champapet","Santoshnagar","Malakpet","Chandrayangutta","Bahadurpura","Falaknuma","Golconda","Langar Houz","Shaikpet","Film Nagar","Yousufguda","Erragadda","Sanath Nagar","Balanagar","Moosapet","Sanathnagar","Kothapet","Hastinapuram","Gajularamaram","Patancheru","Ramachandrapuram","Lakdikapul","Nampally","Abids","Koti","Khairatabad","Panjagutta","SR Nagar","Somajiguda","Punjagutta","Gandipet","Kokapet","Puppalguda","Moinabad","Shamirpet","Ghatkesar","Keesara","Secunderabad Cantonment","Tarnaka","Musheerabad","Himayatnagar","Barkas","Amberpet","Ramanthapur","Chilkalguda","Sainikpuri","ECIL","Neredmet","AS Rao Nagar","Gachibowli","Raidurg","Tellapur","Osman Nagar","Kismatpur","Hafeezpet","Kothaguda","Masab Tank","Tarnaka"];
const DISTRICTS = ["Hyderabad","Rangareddy","Medchal-Malkajgiri","Medchal","Sangareddy","Vikarabad","Mahabubabad","Khammam","Suryapet","Nalgonda","Warangal","Hanumakonda","Jangaon","Bhadradri Kothagudem","Kothagudem","Mulugu","Jayashankar Bhupalpally","Karimnagar","Peddapalli","Jagtial","Nizamabad","Kamareddy","Medak","Siddipet","Mancherial","Adilabad","Nirmal","Nagarkurnool","Wanaparthy","Mahabubnagar","Narayanpet","Gadwal","Yadadri Bhuvanagiri","Rajanna Sircilla","Kumuram Bheem Asifabad"];
const MON = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const MI: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
const DAY = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const IST = 5.5 * 3600e3;

const strip = (h: string) => h.replace(/<(script|style|nav|footer|header|aside)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&nbsp;|&#160;/g, " ").replace(/&#8211;|&ndash;/g, "-").replace(/&#8217;|&#39;/g, "'").replace(/\s+/g, " ").trim();
const rx = (a: string[]) => new RegExp("\\b(" + [...new Set(a)].sort((x, y) => y.length - x.length).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b", "gi");
const AR = rx(AREAS), DR = rx(DISTRICTS);
const canon = (s: string) => { const l = s.toLowerCase(); const hit = AREAS.find((a) => a.toLowerCase() === l); return hit === "Hitech City" ? "HITEC City" : hit === "L B Nagar" ? "LB Nagar" : hit === "Punjagutta" ? "Panjagutta" : hit === "Sanathnagar" ? "Sanath Nagar" : hit || s; };
const uniq = (a: string[]) => [...new Set(a)];

const T = "(\\d{1,2})(?::(\\d{2}))?\\s?([ap])\\.?m\\.?";
const fmt = (h: number, m: string | undefined, ap: string) => `${h}${m && m !== "00" ? ":" + m : ""} ${ap.toLowerCase()}m`;
function timing(t: string): { label: string; endH?: number; endM?: number } | null {
  const m = t.match(new RegExp(`(?:from |between )?${T}\\s*(?:to|-|–|till|until|and)\\s*${T}`, "i"));
  if (!m) return null;
  const eh = +m[4] % 12 + (m[6].toLowerCase() === "p" ? 12 : 0);
  return { label: `${fmt(+m[1], m[2], m[3])} – ${fmt(+m[4], m[5], m[6])}`, endH: eh, endM: +(m[5] || 0) };
}
function dates(t: string, pub: Date): Date[] {
  const out: Date[] = []; const y = new Date(pub.getTime() + IST).getUTCFullYear();
  const r1 = new RegExp(`\\b(${MON})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "gi"), r2 = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MON})\\b`, "gi");
  for (const m of t.matchAll(r1)) out.push(new Date(Date.UTC(y, MI[m[1].slice(0, 3).toLowerCase()], +m[2])));
  for (const m of t.matchAll(r2)) out.push(new Date(Date.UTC(y, MI[m[2].slice(0, 3).toLowerCase()], +m[1])));
  const p = new Date(pub.getTime() + IST), pd = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate()));
  if (!out.length) { if (/\btomorrow\b/i.test(t)) out.push(new Date(pd.getTime() + 86400e3)); else if (/\b(today|tonight)\b/i.test(t)) out.push(pd); }
  return out.filter((d) => Math.abs(d.getTime() - pd.getTime()) < 14 * 86400e3).sort((a, b) => a.getTime() - b.getTime());
}
const dl = (d: Date) => `${DAY[d.getUTCDay()]}, ${MN[d.getUTCMonth()]} ${d.getUTCDate()}`;

async function articleText(url: string, fallback: string): Promise<{ text: string; from: string }> {
  try {
    if (url && !/news\.google\.com|bing\.com\/news/.test(url)) {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SpillBot/1.0)" }, signal: AbortSignal.timeout(9000), redirect: "follow" });
      if (r.ok) { const t = strip(await r.text()); if (t.length > 400) return { text: t.slice(0, 20000), from: "article" }; }
    }
  } catch (_) { /* fall through */ }
  return { text: fallback, from: "summary" };
}

// keep only text near the alert's own subject so sidebar links don't leak in
function focus(text: string, kind: string): string {
  const key: Record<string, RegExp> = { power: /power|electric|outage|tgspdcl|supply/i, water: /water|hmwssb|pipeline|supply/i, weather: /rain|alert|cyclone|imd|wind/i, traffic: /traffic|diversion|road/i, holiday: /holiday|school|closed/i, metro: /metro/i };
  const i = text.search(key[kind] || /./);
  return i < 0 ? text.slice(0, 3000) : text.slice(Math.max(0, i - 200), i + 3500);
}

function build(a: any, text: string, src: string) {
  const pub = new Date(a.published_at || a.created_at), f = focus(text, a.kind);
  const tm = timing(f), ds = dates(f, pub);
  let where = uniq((f.match(AR) || []).map(canon));
  const dist = a.kind === "weather" ? uniq((f.match(DR) || []).map((s) => DISTRICTS.find((d) => d.toLowerCase() === s.toLowerCase()) || s)) : [];
  if (a.kind === "weather") where = where.length ? where : dist;
  const level = (f.match(/\b(red|orange|yellow)\s+(?:alert|warning)/i) || [])[0];
  const doList: string[] = [];
  const add = (c: boolean, s: string) => c && doList.push(s);
  if (a.kind === "power") { add(true, "Charge phones and power banks beforehand"); add(true, "Keep a torch handy"); add(/lift|elevator/i.test(f), "Expect lifts to stop in the window"); }
  if (a.kind === "water") { add(true, "Store drinking water beforehand"); add(true, "Use stored water sparingly until supply resumes"); }
  if (a.kind === "weather") { add(true, "Avoid low-lying roads, causeways and tanks"); add(/tree|pole|hoarding/i.test(f), "Stay away from trees, poles and hoardings"); add(/helpline|control room/i.test(f), "Save the district control-room number"); }
  if (a.kind === "traffic") add(true, "Leave early; take the alternate routes listed");
  const bits: string[] = [];
  const label = ({ power: "Power cut", water: "Water supply cut", weather: "Weather alert", traffic: "Traffic restriction", holiday: "School holiday", metro: "Metro change" } as any)[a.kind] || "Alert";
  const known = [ds[0] && dl(ds[0]), tm?.label, where.length && `${where.length} area${where.length > 1 ? "s" : ""}`].filter(Boolean);
  const missing = [!ds.length && "date", !tm && a.kind !== "weather" && a.kind !== "holiday" && "timing", !where.length && "areas"].filter(Boolean);
  const summary = (a.headline || "").replace(/\s+/g, " ").trim().replace(/[.!?]*$/, ".") + (missing.length ? ` The report doesn't give the ${missing.join(", ")}.` : "");
  const conf = ds.length && (tm || where.length || a.kind === "holiday") ? "high" : ds.length || where.length ? "medium" : "low";
  // valid_until: end of the (last) date + timing end, else 18 h after publication
  let until = new Date(pub.getTime() + 18 * 3600e3);
  if (ds.length) { const last = ds[ds.length - 1]; until = new Date(last.getTime() - IST + (tm?.endH != null ? tm.endH * 3600e3 + (tm.endM || 0) * 60e3 + 3600e3 : 24 * 3600e3 - 1)); if (!tm?.endH) until = new Date(last.getTime() - IST + 24 * 3600e3); }
  const d: Record<string, unknown> = { summary, level: [label, level && level.replace(/^./, (c) => c.toUpperCase()), a.publisher].filter(Boolean).join(" · "), auto: true, confidence: conf, source_text: src, valid_until: until.toISOString() };
  if (ds.length) d.when = ds.length > 1 ? `${dl(ds[0])} – ${dl(ds[ds.length - 1])}` : dl(ds[0]);
  if (tm) d.timing = tm.label;
  if (where.length) { d.where = where.slice(0, 30); d.where_label = a.kind === "weather" ? "Districts / areas named" : "Affected areas"; }
  if (doList.length) d.do = doList;
  if (a.url && !/news\.google\.com|bing\.com/.test(a.url)) d.official = { label: `${a.publisher || "Source"} report`, url: a.url };
  if (conf === "high") { d.push_title = `${({ power: "⚡", water: "🚰", weather: "🌧️", traffic: "🚦", holiday: "🏫", metro: "🚇" } as any)[a.kind] || ""} ${label}${tm ? " " + tm.label : ""}${where.length ? ": " + where.slice(0, 3).join(", ") : ""}`.slice(0, 60); d.push_body = `${d.when || ""}${where.length ? ". " + where.length + " area" + (where.length > 1 ? "s" : "") + " listed inside" : ""}`.slice(0, 110); }
  return { details: d, conf, known };
}

Deno.serve(async () => {
  const { data: rows } = await sb.from("civic_alerts").select("id,kind,headline,publisher,url,lang,published_at,created_at,scout_id,note")
    .is("details", null).gte("created_at", new Date(Date.now() - 48 * 3600e3).toISOString()).order("created_at", { ascending: false }).limit(12);
  const out: any[] = [];
  for (const a of rows || []) {
    if (a.note === "not for readers") continue;
    let fb = ""; if (a.scout_id) { const { data: s } = await sb.from("scout_items").select("summary,title").eq("id", a.scout_id).maybeSingle(); fb = `${s?.title || ""}. ${s?.summary || ""}`; }
    const { text, from } = await articleText(a.url, fb || a.headline);
    const r = build(a, `${a.headline}. ${text}`, from);
    const up: Record<string, unknown> = { details: r.details, enriched_at: new Date().toISOString() };
    if (r.conf !== "high") { up.push_status = "skipped"; up.note = "live only (details incomplete)"; } // push only when date + timing/areas are confirmed
    await sb.from("civic_alerts").update(up).eq("id", a.id);
    out.push({ id: a.id, kind: a.kind, conf: r.conf, from, known: r.known });
  }
  return new Response(JSON.stringify({ n: out.length, out }), { headers: { "Content-Type": "application/json" } });
});
