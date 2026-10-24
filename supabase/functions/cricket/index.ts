// Spill live cricket.
// pg_cron calls this every 30 s. It finds India / India Women matches on ESPN's open
// scoreboard feed and writes a live card to public.cricket_live. While a match is live,
// it stays awake ~26 s and re-checks ball-by-ball every 2.5 s, so readers (subscribed via
// Supabase Realtime) see each ball within seconds. Big moments (start, wickets, 50s/100s,
// innings break, result) are sent as Web Push notifications to subscribed readers.
// Ball-by-ball lines are generated from match data; ESPN's commentary prose is never copied.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const H = { "user-agent": "Mozilla/5.0 (compatible; SpillBot/1.0; +https://spillthetea.news)" };
const B = "https://site.web.api.espn.com/apis/site/v2/sports/cricket";
const TEAMS = new Set(["India", "India Women"]);
const FAST_MS = 2500, AWAKE_MS = 26000;
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const j = async (u: string) => { const r = await fetch(u, { headers: H }); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
const nm = (a: any) => a?.athlete?.shortName || a?.athlete?.displayName || a?.athlete?.name || "";
const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];
const clean = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();
const ovs = (o: any) => (o == null ? "" : String(o));

// ---------- push ----------
let vapidReady: Promise<boolean> | null = null;
function vapid() {
  if (!vapidReady) vapidReady = (async () => {
    const { data } = await sb.from("app_secrets").select("name,value").in("name", ["vapid_public", "vapid_private", "vapid_subject"]);
    const m = Object.fromEntries((data || []).map((r: any) => [r.name, r.value]));
    if (!m.vapid_public || !m.vapid_private) return false;
    webpush.setVapidDetails(m.vapid_subject || "https://spillthetea.news", m.vapid_public, m.vapid_private);
    return true;
  })();
  return vapidReady;
}

async function pushOnce(key: string, title: string, body: string, matchId: string) {
  // push_log primary key makes every event fire at most once, even across overlapping runs.
  const { data: ins, error } = await sb.from("push_log").insert({ key, title, body }).select("key");
  if (error || !ins?.length) return 0;
  if (!(await vapid())) return 0;
  const { data: subs } = await sb.from("push_subs").select("endpoint,p256dh,auth").contains("topics", ["cricket"]).lt("fails", 5).limit(5000);
  const payload = JSON.stringify({ title, body, tag: "cricket-" + matchId, url: "/#cricket", renotify: true });
  let sent = 0;
  const dead: string[] = [];
  for (let i = 0; i < (subs || []).length; i += 50) {
    const batch = subs!.slice(i, i + 50);
    const res = await Promise.allSettled(batch.map((s: any) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 600, urgency: "high" })));
    res.forEach((r, k) => {
      if (r.status === "fulfilled") sent++;
      else { const code = (r.reason as any)?.statusCode; if (code === 404 || code === 410) dead.push(batch[k].endpoint); }
    });
  }
  if (dead.length) await sb.from("push_subs").delete().in("endpoint", dead);
  await sb.from("push_log").update({ sent }).eq("key", key);
  return sent;
}

// ---------- ball-by-ball ----------
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

function linkPrev(items: any[]) { for (let i = 1; i < items.length; i++) prevInn.set(items[i], items[i - 1].innings); }

// Fill the live parts of the card from the ball list.
function applyItems(base: any, items: any[]) {
  linkPrev(items);
  const last = items[items.length - 1];
  const balls: any[] = [];
  for (const it of items.slice(-36)) {
    const k = kindOf(it);
    balls.push({ ov: ovs(it.over?.overs), k, t: lineOf(it, k), inn: it.innings?.number || it.period });
    if (it.over?.complete && it.over?.balls >= 6 && it.innings) {
      const inn = it.innings;
      let msg = `End of over ${it.over.number}: ${it.over.runs} run${it.over.runs === 1 ? "" : "s"}${it.over.wickets ? ", " + it.over.wickets + " wkt" : ""}. ${it.team?.abbreviation || ""} ${inn.runs}/${inn.wickets}`;
      if (inn.target) msg += ` · need ${inn.remainingRuns} off ${inn.remainingBalls}`;
      balls.push({ ov: String(it.over.number), k: "eo", t: msg, inn: inn.number });
    }
  }
  base.balls = balls.reverse();
  if (!last) return;
  const inn = last.innings || {};
  base.batting = last.team?.displayName || "";
  base.overs = ovs(last.over?.overs);
  base.crr = inn.runRate ?? null;
  base.rrr = inn.target ? inn.requiredRunRate ?? null : null;
  base.target = inn.target || null;
  base.need = inn.target ? { runs: inn.remainingRuns, balls: inn.remainingBalls } : null;
  base.batters = [last.batsman, last.otherBatsman].filter((b: any) => b?.athlete).map((b: any) => ({ n: nm(b), r: b.totalRuns ?? 0, b: b.faced ?? 0, f: b.fours ?? 0, s: b.sixes ?? 0 }));
  base.bowler = last.bowler?.athlete ? { n: nm(last.bowler), o: last.bowler.overs, r: last.bowler.conceded, w: last.bowler.wickets } : null;
  base.recent = items.slice(-6).map((x) => kindOf(x));
  base.lastSeq = Number(last.sequence || 0);
  // Keep the batting side's score in step with the latest ball.
  (base.teams || []).forEach((t: any) => {
    t.batting = base.state === "in" && t.name === base.batting;
    if (t.batting && inn.runs != null) {
      const lim = inn.ballLimit ? `/${Math.round(inn.ballLimit / 6)} ov` : " ov";
      t.score = `${inn.runs}/${inn.wickets} (${base.overs}${lim}${inn.target ? ", target " + inn.target : ""})`;
    }
  });
  if (base.state === "in") {
    base.headline = inn.target
      ? `${base.batting} need ${inn.remainingRuns} off ${inn.remainingBalls} ball${inn.remainingBalls === 1 ? "" : "s"}`
      : `${base.batting} ${inn.runs}/${inn.wickets} (${base.overs} ov) · RR ${inn.runRate}`;
  }
}

// Big moments in balls bowled in the last few minutes (never replays history).
async function detectEvents(base: any, fresh: any[]) {
  const id = base.id, sh = base.short || base.title;
  for (const it of fresh) {
    if (Date.now() - Number(it.bbbTimestamp || 0) > 4 * 60e3) continue;
    const inn = it.innings || {};
    const sc = `${it.team?.abbreviation || ""} ${inn.runs}/${inn.wickets} (${ovs(it.over?.overs)})`;
    if (it.dismissal?.dismissal) {
      const how = clean(it.dismissal?.text).replace(/\s*SR:.*$/, "") || `${nm(it.dismissal?.batsman)} out`;
      await pushOnce(`${id}:${it.sequence}:W`, `☝️ WICKET · ${sh}`, `${how}\n${sc}`, id);
    }
    const b = it.batsman;
    const v = Number(it.scoreValue || 0);
    if (b?.athlete && !it.dismissal?.dismissal) {
      for (const m of [50, 100, 150, 200]) {
        if ((b.totalRuns ?? 0) >= m && (b.totalRuns ?? 0) - v < m) {
          await pushOnce(`${id}:${b.athlete.id}:${m}`, `${m >= 100 ? "💯" : "🔥"} ${nm(b)} brings up ${m} · ${sh}`, `${b.totalRuns} off ${b.faced} balls · ${sc}`, id);
        }
      }
    }
    const bw = it.bowler;
    if (it.dismissal?.dismissal && bw?.athlete && bw.wickets === 5) {
      await pushOnce(`${id}:${bw.athlete.id}:5w`, `🎯 Five-for! ${nm(bw)} · ${sh}`, `${bw.wickets}/${bw.conceded} in ${bw.overs} overs · ${sc}`, id);
    }
    const p = prevInn.get(it);
    if (p && inn.number && p.number && inn.number > p.number) {
      await pushOnce(`${id}:inn${inn.number}`, `🏏 Innings break · ${sh}`, inn.target ? `${it.team?.displayName} need ${inn.target} to win` : `${it.team?.displayName} are batting now`, id);
    }
  }
}

// ---------- match ----------
type Track = { base: any; items: any[]; pc: number; league: string };

async function fetchPages(league: string, id: string, pc: number) {
  const pages = pc <= 1 ? [1] : [pc - 1, pc];
  const res = await Promise.all(pages.map((p) => j(`${B}/${league}/playbyplay?event=${id}&page=${p}`)));
  let items: any[] = [];
  res.forEach((r) => (items = items.concat(r.commentary?.items || [])));
  return { items, pc: res[res.length - 1]?.commentary?.pageCount || pc };
}

async function trackMatch(league: string, ev: any, prevState?: string): Promise<Track> {
  const id = String(ev.id);
  const comps = ev.competitions?.[0]?.competitors || [];
  const state = ev.status?.type?.state || "pre";
  const base: any = {
    id, league, title: ev.name, short: ev.shortName, start: ev.date, state,
    teams: comps.map((c: any) => ({ name: c.team?.displayName, abbr: c.team?.abbreviation, score: c.score || "", logo: c.team?.logos?.[0]?.href || "" })),
    link: `https://www.espncricinfo.com/ci/engine/match/${id}.html`,
  };
  let summary: any = null;
  try { summary = await j(`${B}/${league}/summary?event=${id}`); } catch (_) { /* score panel is enough */ }
  const hc = summary?.header?.competitions?.[0];
  base.desc = clean(summary?.header?.description || "");
  base.result = clean(hc?.status?.summary || hc?.status?.type?.description || ev.status?.type?.detail || "");
  if (hc?.competitors) base.teams = hc.competitors.map((c: any) => ({ name: c.team?.displayName, abbr: c.team?.abbreviation, score: c.score || "", logo: c.team?.logos?.[0]?.href || "" }));
  const notes = summary?.notes || [];
  base.toss = clean((notes.find((n: any) => n.type === "toss") || {}).text);
  base.notes = notes.filter((n: any) => n.type === "matchnote").slice(-4).map((n: any) => clean(n.text));

  let items: any[] = [], pc = 1;
  if (state === "in" || state === "post") {
    try {
      const p1 = await j(`${B}/${league}/playbyplay?event=${id}&page=1`);
      pc = p1.commentary?.pageCount || 1;
      const r = pc <= 1 ? { items: p1.commentary?.items || [], pc } : await fetchPages(league, id, pc);
      items = r.items.filter((x: any) => x.over && x.bowler).sort((x: any, y: any) => Number(x.sequence) - Number(y.sequence));
      applyItems(base, items);
    } catch (e) { base.err = String(e).slice(0, 200); }
  }
  if (state === "post") base.headline = base.result;
  if (state === "pre") base.headline = `Starts ${new Date(ev.date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST`;

  const sh = base.short || base.title;
  if (state === "in" && prevState === "pre") await pushOnce(`${id}:start`, `🏏 Live now · ${sh}`, [base.desc.split(",")[0], base.toss && "Toss: " + base.toss].filter(Boolean).join(" · "), id);
  if (state === "post" && prevState === "in" && base.result) await pushOnce(`${id}:result`, `🏆 ${sh} · Result`, base.result, id);

  base.updated = Date.now();
  await save(base);
  return { base, items, pc, league };
}

async function save(base: any) {
  const { error } = await sb.from("cricket_live").upsert({ id: base.id, league: base.league, state: base.state, active: true, data: base, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// Fast follow: re-read only the newest ball-by-ball page every 2.5 s.
async function follow(t: Track, until: number) {
  while (Date.now() + FAST_MS < until) {
    await sleep(FAST_MS);
    try {
      let r = await j(`${B}/${t.league}/playbyplay?event=${t.base.id}&page=${t.pc}`);
      let got: any[] = r.commentary?.items || [];
      const total = r.commentary?.pageCount || t.pc;
      if (total > t.pc) { t.pc = total; r = await j(`${B}/${t.league}/playbyplay?event=${t.base.id}&page=${t.pc}`); got = got.concat(r.commentary?.items || []); }
      const lastSeq = Number(t.base.lastSeq || 0);
      const fresh = got.filter((x: any) => x.over && x.bowler && Number(x.sequence) > lastSeq).sort((x: any, y: any) => Number(x.sequence) - Number(y.sequence));
      if (!fresh.length) continue;
      t.items = t.items.concat(fresh).slice(-80);
      applyItems(t.base, t.items);
      t.base.updated = Date.now();
      await save(t.base);
      await detectEvents(t.base, fresh);
    } catch (_) { /* transient: try again next tick */ }
  }
}

Deno.serve(async (req) => {
  const started = Date.now();
  const u = new URL(req.url);
  const out: any[] = [];
  try {
    if (u.searchParams.get("selftest") === "push") {
      // Encrypt + sign a push to a dummy endpoint to prove the push stack works here.
      await vapid();
      try {
        await webpush.sendNotification(JSON.parse(u.searchParams.get("sub") || "{}"), JSON.stringify({ title: "test" }), { TTL: 60 });
        return Response.json({ ok: true, note: "sent" });
      } catch (e: any) { return Response.json({ ok: true, statusCode: e?.statusCode ?? null, msg: String(e?.body || e?.message || e).slice(0, 200) }); }
    }
    const forceE = u.searchParams.get("event");
    const panel = await j(`${B}/scorepanel?lang=en`);
    const now = Date.now();
    const keep = new Set<string>();
    const { data: prevRows } = await sb.from("cricket_live").select("id,state");
    const prev = Object.fromEntries((prevRows || []).map((r: any) => [r.id, r.state]));
    const live: Track[] = [];
    for (const s of panel.scores || []) {
      const league = String(s.leagues?.[0]?.id || "");
      for (const ev of s.events || []) {
        const names = (ev.competitions?.[0]?.competitors || []).map((c: any) => c.team?.displayName);
        const forced = forceE && String(ev.id) === forceE;
        if (!names.some((n: string) => TEAMS.has(n)) && !forced) continue;
        const st = ev.status?.type?.state;
        const t = Date.parse(ev.date);
        const relevant = forced || st === "in" || (st === "pre" && t - now < 3 * 3600e3) || (st === "post" && now - t < 18 * 3600e3);
        if (!relevant) continue;
        keep.add(String(ev.id));
        const tr = await trackMatch(league, ev, prev[String(ev.id)]);
        out.push({ id: tr.base.id, state: tr.base.state, headline: tr.base.headline });
        if (tr.base.state === "in") live.push(tr);
      }
    }
    for (const r of prevRows || []) if (!keep.has(r.id)) await sb.from("cricket_live").update({ active: false }).eq("id", r.id).eq("active", true);
    if (live.length) await Promise.all(live.map((t) => follow(t, started + AWAKE_MS)));
    return Response.json({ ok: true, tracked: out, ms: Date.now() - started });
  } catch (e) {
    return Response.json({ ok: false, error: String(e), tracked: out }, { status: 500 });
  }
});
