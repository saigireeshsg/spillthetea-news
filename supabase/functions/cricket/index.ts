// Spill live cricket: tracks India matches from ESPN's open scoreboard feed and writes
// a compact live card + our own ball-by-ball lines (generated from match data, not copied
// commentary) to public.cricket_live. Runs every 30s via pg_cron; idle cost is one fetch.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const H = { "user-agent": "Mozilla/5.0 (compatible; SpillBot/1.0; +https://spillthetea.news)" };
const B = "https://site.web.api.espn.com/apis/site/v2/sports/cricket";
const TEAMS = new Set(["India", "India Women"]);
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const j = async (u: string) => { const r = await fetch(u, { headers: H }); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
const nm = (a: any) => a?.athlete?.shortName || a?.athlete?.displayName || a?.athlete?.name || "";
const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];
const clean = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();

// Extras are inferred from the innings counters moving between consecutive balls.
const prevInn = new WeakMap<any, any>();
function kindOf(it: any): string {
  const d = String(it.playType?.description || "").toLowerCase();
  if (it.dismissal?.dismissal) return "W";
  const p = prevInn.get(it), c = it.innings;
  if (p && c && p.number === c.number) {
    if ((c.wides ?? 0) > (p.wides ?? 0)) return "wd";
    if ((c.noBalls ?? 0) > (p.noBalls ?? 0)) return "nb";
    if ((c.legByes ?? 0) > (p.legByes ?? 0)) return "lb";
    if ((c.byes ?? 0) > (p.byes ?? 0)) return "b";
  }
  if (d.includes("six")) return "6";
  if (d.includes("four")) return "4";
  if (d.includes("wide")) return "wd";
  if (d.includes("no ball") || d.includes("noball")) return "nb";
  if (d.includes("leg bye")) return "lb";
  if (d.includes("bye")) return "b";
  const v = Number(it.scoreValue || 0);
  return v ? String(v) : ".";
}

function lineOf(it: any, k: string): string {
  const bw = nm(it.bowler), bt = nm(it.batsman), s = Number(it.sequence || 0), v = Number(it.scoreValue || 0);
  switch (k) {
    case "6": return pick([`SIX 💥 ${bt} sends ${bw} over the rope`, `SIX 💥 ${bt} clears the boundary off ${bw}`, `SIX 💥 Huge hit from ${bt} off ${bw}`], s);
    case "4": return pick([`FOUR 🔥 ${bt} finds the rope off ${bw}`, `FOUR 🔥 ${bt} beats the field off ${bw}`, `FOUR 🔥 Boundary for ${bt} off ${bw}`], s);
    case "W": {
      const how = clean(it.dismissal?.text).replace(/\s*SR:.*$/, "");
      return how ? `OUT ☝️ ${how}` : `OUT ☝️ ${nm(it.dismissal?.batsman) || bt} goes. Wicket for ${nm(it.dismissal?.bowler) || bw}`;
    }
    case "wd": return `Wide from ${bw}. Extra run${v > 1 ? "s" : ""} for ${it.team?.abbreviation || "the batting side"}`;
    case "nb": return `No-ball from ${bw}${v > 1 ? ` · ${v} runs off it` : ""}`;
    case "lb": return `${v} leg bye${v === 1 ? "" : "s"}. ${bw} to ${bt}`;
    case "b": return `${v} bye${v === 1 ? "" : "s"}. ${bw} to ${bt}`;
    case ".": return pick([`Dot ball. ${bw} keeps ${bt} quiet`, `No run. ${bw} to ${bt}`, `Dot. ${bt} can't get it away off ${bw}`], s);
    default: return `${v} run${v === 1 ? "" : "s"}. ${bw} to ${bt}`;
  }
}

const ovs = (o: any) => (o == null ? "" : String(o));

async function trackMatch(league: string, ev: any) {
  const id = String(ev.id);
  const comps = ev.competitions?.[0]?.competitors || [];
  const state = ev.status?.type?.state || "pre";
  const base: any = {
    id, league, title: ev.name, short: ev.shortName, start: ev.date, state,
    teams: comps.map((c: any) => ({ name: c.team?.displayName, abbr: c.team?.abbreviation, score: c.score || "", logo: c.team?.logos?.[0]?.href || "" })),
    link: `https://www.espncricinfo.com/ci/engine/match/${id}.html`,
  };
  let summary: any = null;
  try { summary = await j(`${B}/${league}/summary?event=${id}`); } catch (_) { /* score panel data is enough */ }
  const hc = summary?.header?.competitions?.[0];
  base.desc = clean(summary?.header?.description || "");
  base.result = clean(hc?.status?.summary || hc?.status?.type?.description || ev.status?.type?.detail || "");
  if (hc?.competitors) base.teams = hc.competitors.map((c: any) => ({ name: c.team?.displayName, abbr: c.team?.abbreviation, score: c.score || "", logo: c.team?.logos?.[0]?.href || "" }));
  const notes = summary?.notes || [];
  base.toss = clean((notes.find((n: any) => n.type === "toss") || {}).text);
  base.notes = notes.filter((n: any) => n.type === "matchnote").slice(-4).map((n: any) => clean(n.text));

  if (state === "in" || state === "post") {
    try {
      const p1 = await j(`${B}/${league}/playbyplay?event=${id}&page=1`);
      const pc = p1.commentary?.pageCount || 1;
      let items: any[] = [];
      if (pc <= 1) items = p1.commentary?.items || [];
      else {
        const [a, b] = await Promise.all([j(`${B}/${league}/playbyplay?event=${id}&page=${pc - 1}`), j(`${B}/${league}/playbyplay?event=${id}&page=${pc}`)]);
        items = [...(a.commentary?.items || []), ...(b.commentary?.items || [])];
      }
      items = items.filter((x) => x.over && x.bowler).sort((x, y) => Number(x.sequence) - Number(y.sequence));
      for (let i = 1; i < items.length; i++) prevInn.set(items[i], items[i - 1].innings);
      const last = items[items.length - 1];
      const balls: any[] = [];
      for (const it of items.slice(-36)) {
        const k = kindOf(it);
        balls.push({ ov: ovs(it.over?.overs), k, t: lineOf(it, k), sc: it.awayScore && it.awayScore !== "0" ? it.awayScore : it.homeScore, inn: it.innings?.number || it.period });
        if (it.over?.complete && it.over?.balls >= 6 && it.innings) {
          const inn = it.innings;
          let msg = `End of over ${it.over.number}: ${it.over.runs} run${it.over.runs === 1 ? "" : "s"}${it.over.wickets ? ", " + it.over.wickets + " wkt" : ""}. ${it.team?.abbreviation || ""} ${inn.runs}/${inn.wickets}`;
          if (inn.target) msg += ` · need ${inn.remainingRuns} off ${inn.remainingBalls}`;
          balls.push({ ov: String(it.over.number), k: "eo", t: msg, inn: inn.number });
        }
      }
      base.balls = balls.reverse();
      if (last) {
        const inn = last.innings || {};
        base.batting = last.team?.displayName || "";
        base.teams.forEach((t: any) => { t.batting = state === "in" && t.name === base.batting; });
        base.overs = ovs(last.over?.overs);
        base.crr = inn.runRate ?? null;
        base.rrr = inn.target ? inn.requiredRunRate ?? null : null;
        base.target = inn.target || null;
        base.need = inn.target ? { runs: inn.remainingRuns, balls: inn.remainingBalls } : null;
        base.batters = [last.batsman, last.otherBatsman].filter((b: any) => b?.athlete).map((b: any) => ({ n: nm(b), r: b.totalRuns ?? 0, b: b.faced ?? 0, f: b.fours ?? 0, s: b.sixes ?? 0 }));
        base.bowler = last.bowler?.athlete ? { n: nm(last.bowler), o: last.bowler.overs, r: last.bowler.conceded, w: last.bowler.wickets } : null;
        base.recent = items.slice(-6).map((x) => kindOf(x));
        if (state === "in") {
          base.headline = inn.target
            ? `${base.batting} need ${inn.remainingRuns} off ${inn.remainingBalls} ball${inn.remainingBalls === 1 ? "" : "s"}`
            : `${base.batting} ${inn.runs}/${inn.wickets} (${base.overs} ov) · RR ${inn.runRate}`;
        }
      }
    } catch (e) { base.err = String(e).slice(0, 200); }
  }
  if (state === "post") base.headline = base.result;
  if (state === "pre") base.headline = `Starts ${new Date(ev.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST`;
  base.updated = Date.now();
  const { error } = await sb.from("cricket_live").upsert({ id, league, state, active: true, data: base, updated_at: new Date().toISOString() });
  if (error) throw error;
  return { id, state, headline: base.headline };
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const out: any[] = [];
  try {
    const forceE = u.searchParams.get("event");
    const panel = await j(`${B}/scorepanel?lang=en`);
    const now = Date.now();
    const keep = new Set<string>();
    for (const s of panel.scores || []) {
      const league = String(s.leagues?.[0]?.id || "");
      for (const ev of s.events || []) {
        const names = (ev.competitions?.[0]?.competitors || []).map((c: any) => c.team?.displayName);
        const forced = forceE && String(ev.id) === forceE;
        if (!names.some((n: string) => TEAMS.has(n)) && !forced) continue;
        const st = ev.status?.type?.state;
        const t = Date.parse(ev.date);
        // Show from 3h before start until ~12h after the match ends.
        const relevant = forced || st === "in" || (st === "pre" && t - now < 3 * 3600e3) || (st === "post" && now - t < 18 * 3600e3);
        if (!relevant) continue;
        keep.add(String(ev.id));
        out.push(await trackMatch(league, ev));
      }
    }
    const { data: rows } = await sb.from("cricket_live").select("id").eq("active", true);
    for (const r of rows || []) if (!keep.has(r.id)) await sb.from("cricket_live").update({ active: false }).eq("id", r.id);
    return Response.json({ ok: true, tracked: out });
  } catch (e) {
    return Response.json({ ok: false, error: String(e), tracked: out }, { status: 500 });
  }
});
