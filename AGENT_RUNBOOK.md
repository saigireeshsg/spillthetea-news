# Spill newsroom runbook (for scheduled Claude runs)

Spill publishes directly: what you push to `main` goes live on spillthetea.news within about a minute. Accuracy matters more than volume. If you are unsure of a fact, leave it out.

## Budget (read first — stay inside the owner's daily/weekly usage limits)
- Lean runs. No subagents, no screenshots, no headless browsers, no re-reading big files. Read only the 2–3 example drops you need, not the whole folder (`ls content/drops | grep <date>` for duplicates).
- Start from the ranked shortlist (section 1). Web searches only to fill a gap or verify: max **2** per run.
- WebFetch: **1 article per story** (2 only if facts conflict). Skip any page that fails once — don't retry.
- Story caps: morning **6–7**, midday **0–2 live alerts + weather** (no stories unless major breaking), evening **2**. Readers said the app felt text-heavy and overwhelming: fewer, sharper stories beat more.
- Write each drop compactly: `cards` = tea + 1 extra + poll + quiz. Write all files in one script/Bash call where possible.
- If you hit a usage or rate limit: commit and push what's verified, report, stop. Never loop or retry heavy steps.
- Quiet day? Publish fewer. Zero is fine for midday.

## 0. Setup
1. Attach the repo with push access (`add_repo` owner `saigireeshsg`, repo `spillthetea-news`, access `push`), clone it to `/home/claude/spillthetea-news`, and work there.
2. Commit as `Claude <noreply@anthropic.com>`: run `git config user.name Claude && git config user.email noreply@anthropic.com`.
3. Supabase project id: `tvhfqkvyfkqxxiqxavjp` (use the Supabase connector's `execute_sql`).

## 1. Scout (already running — use it, don't redo it)
Supabase scouts 36 feeds every 10 min into `public.scout_items` and, every 10 min, `refresh_live_wire()` groups duplicate headlines into stories and ranks them by **recency, relatability (Hyderabad > Telangana > India; daily-life impact), weightage (number of outlets) and importance** into `public.live_wire` (`members` = the scout item ids in each story). Your shortlist starts there — no broad web searching needed.

**A. Ranked shortlist (English, not yet covered):**
```sql
select w.id, w.region, w.score, w.outlets, w.why, w.title, w.publisher, w.url, w.sources, w.members,
       to_char(w.published_at at time zone 'Asia/Kolkata','DD Mon HH24:MI') ist
from public.live_wire w
where not exists (select 1 from public.scout_items s where s.id = any(w.members) and s.status in ('published','skipped'))
order by w.score desc limit 25;
```
**B. Telangana papers in Telugu** (local stories the English press may miss — read them, verify, write in English):
```sql
select id, source, title, url, to_char(coalesce(published_at,fetched_at) at time zone 'Asia/Kolkata','DD Mon HH24:MI') ist
from public.scout_items
where status = 'new' and title ~ '[\u0C00-\u0C7F]' and coalesce(published_at, fetched_at) > now() - interval '18 hours'
order by coalesce(published_at, fetched_at) desc limit 30;
```
**C. Editorial + money/world/tech/sport** (morning only; the wire covers Hyderabad/Telangana/India):
```sql
select id, region, source, title, url from public.scout_items
where status = 'new' and region in ('edit','money','world','tech','sport') and coalesce(published_at, fetched_at) > now() - interval '20 hours'
order by region, published_at desc nulls last;
```
If the newest `fetched_at` in `scout_items` is older than 1 hour, check `select name,last_status from scout_sources where active` and trigger the scout once with the `net.http_post` from `select command from cron.job where jobname like 'spill-scout%'`, then `select refresh_live_wire();`.

## 2. Pick
Work down list A from the top. A story earns its place if it is **new** (not already in `content/drops` from the last 3 days — `ls content/drops | tail -40`; if it moved forward, write an update on the same `thread`), **relatable** (passes the value test below) and **important** (prefer `outlets ≥ 2` or an official source). Swap in a Telugu-paper story (list B) when it is more relatable than the next English one. Skip crime gossip, celebrity, ads and press-release puffery even if they rank high.

**Value test (every story must pass at least one):** a reader aged 15–30 in that city or in India can (a) *act* on it (deadline, exam, job, fee, scheme, traffic, water/power, safety, money), (b) *talk* about it (big national/world moment their friends will discuss), or (c) *understand* something that shapes their future (policy, economy, climate, tech, rights). If you can't write a concrete `beats.care` line, drop the story. Regional first: Hyderabad/Telangana, then national, then world. (Other cities paused until the owner expands beyond Hyderabad.)

| Run | What to publish |
| --- | --- |
| Morning (by 7 am IST) | 6–7 stories dated today. **Hyderabad-only launch:** 1 featured editorial (from The Hindu editorial feed), 3 Hyderabad/Telangana (`cat: "local"`, `city: "Hyderabad"`), 2 India, 1 money or world. No other-city locals for now. Plus a morning notification and fresh Hyderabad weather (`content/now/hyderabad.json` only). |
| Midday (around 12:30 pm) | Live alerts only: traffic, rain, power or water cuts, civic alerts, big breaking news, as `content/live/*.json`. Refresh `content/now/hyderabad.json` weather (Hyderabad only for now). Add a story only for real breaking news. |
| Evening (by 6 pm) | 2 new stories that broke during the day, updates to ongoing threads (reuse the same `thread`), an evening notification (`slot: "evening"`), and expire stale live alerts by setting `until`. |


## 3. Verify (never skip)
RSS summaries are not enough. Open the article (WebFetch) for every story and take facts only from what you read. Use 2 sources when possible. Put real article URLs in `sources` (`name`, `title`, `url`). Never invent numbers, names, dates or quotes. Rewrite everything in your own words; no copied sentences.

## 4. Write
Copy the shape of recent files exactly; good examples: `content/drops/d20261024-hyd-el-nino-water.json` (local with cover; ignore its `calc` field), `d20261024-ed-in-the-crossfire.json` (featured editorial), `d20261024-lac-disturbed.json` (India).

Each drop needs: `date` (IST, `YYYY-MM-DD`), `cat` (`local|india|world|money|tech|sport|planet|edit|campus`), `hook` (≤12 words, key number wrapped in `*asterisks*`), `tldr`, `topic`, `map` {`causes` [1–2], `event`, `effects` [2]} with `icon`+`label`, `beats` {`what`, `why`, `care`}, `cards` (`tea`, plus 1–2 of `num`/`why`/`twist`/`sides`/`bars`, then `poll`, then `quiz`), `learn.t`, `watch`, `thread`, `heat` (1–5), `order`, `sort` (`"YYYY-MM-DD-NN"`, higher = more important; morning uses 98 down, evening 60 down), `readSecs`, `sources`. Local stories also need `city` and `areas`. Use `cover` on 3–5 big stories, `lead: "local"|"india"|"world"` on the top story of each kind, `featured: true` + `editorial` on the editorial. Existing storylines you may attach with `storyline`: `delimitation, sir, west-asia, rbi-inflation, russia-ukraine, pakistan-pti, us-work-visas`.

Voice: friendly, plain English, sentences under 15 words, explain every term, "what it means for you" in `beats.care`. Politics neutral and attributed. Heavy stories (deaths, disasters, violence): calm tone, no emoji jokes, no poll.

Files: `content/drops/d<YYYYMMDD>-<slug>.json`, `content/live/l<YYYYMMDD>-<slug>.json`, `content/notifs/n<YYYYMMDD>-am|pm.json` (`title`, `body`, `open` = drop id, `slot`, `ts` epoch ms), `content/now/<city>.json` (city ids: hyderabad, bengaluru, chennai, delhi, mumbai, pune, kolkata). Look at existing files for the live and weather shapes.

## 5. Publish
1. `python3 tools/build-data.py`
2. Check every new JSON parses: `python3 -c "import json,glob;[json.load(open(f)) for f in glob.glob('content/**/*.json',recursive=True)]"`
3. `git add -A && git commit -m "<run>: <n> stories, <m> live alerts"` with the trailers `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and the session line, then `git pull --rebase origin main && git push origin HEAD:main`.
4. Mark what you used **by story, not just one headline**: `update public.scout_items set status='published', drop_id='<drop id>' where id = any('<members array from list A>'::bigint[]);` (or `where id in (...)` for list B/C items). Mark stories you reviewed and rejected from the top of list A with `status='skipped'` the same way, so the next run sees fresh candidates.

## 6. Report
Send the user a 2–4 line summary: how many stories and alerts went live, the top Hyderabad story, and anything you couldn't verify or publish.

## 7. Live cricket (automatic — no work needed)
India matches (men and women) are tracked automatically: Supabase cron `spill-cricket-30s` runs the `cricket` edge function every 30 s, reading ESPN's open scoreboard feed into `public.cricket_live`; the app shows a live card on Home with ball-by-ball lines we generate from the data (never copy ESPN's commentary prose). Runs don't touch it. If an India match finished today, the evening run may write one short drop on the result (`cat: "sport"`), verified from the match report.

## 8. Ranking rule (applies everywhere)
Order news by four factors, in this order of weight: **recency** (newer first), **relatability** (does it change a 15–30-year-old Hyderabadi's day: water, power, traffic, exams, jobs, prices, weather), **weightage** (how many reputable outlets carry it), **importance** (courts, government decisions, disasters, big national moments). Set each drop's `sort` to reflect this. The Live tab's wire (`public.live_wire`) is ranked automatically every 10 minutes by `refresh_live_wire()` using the same four factors; use its top items as the shortlist when picking stories.
Cricket alerts: readers opt in on the match card (Web Push). The `cricket` function stays awake during live India matches, re-reads ball-by-ball every 2.5 s, writes to `cricket_live` (readers get it instantly via Realtime) and pushes start, wickets, 50/100s, five-fors, innings break and result once each (`push_log`). VAPID keys live in `public.app_secrets` (server-only). Never push anything that isn't from the live data feed.

## 9. Keep it light (reader feedback, 24 Oct)
Readers found Spill text-heavy and overwhelming. Every drop: `hook` ≤ 10 words; `tldr` one sentence ≤ 20 words; each `beats` line ≤ 18 words; `cards` = `tea` + `poll` + `quiz` (add one `num` card only when a single number tells the story). Feed cards show the headline plus the cause → event → effects explainer map, so keep `map` labels to 2–4 words each. Prefer one strong story over two similar ones.

No calculators: never add a `calc` field to drops (Money tab is news only).

## 10. Infographics on every story (`viz`)
Each drop gets a `viz` array of 2–4 visuals built **only from numbers you verified in the source articles** (no estimates, no made-up baselines). It renders as a "📊 By the numbers" strip under the map, and the first item becomes the stat badge on the feed card. Pick the type that fits the fact:
- `{"t":"big","v":"₹7.76 lakh","l":"worth of food seized","tone":"bad|good"}` — one striking number.
- `{"t":"compare","l":"Pass mark","a":{"v":60,"d":"60%","l":"Now"},"b":{"v":75,"d":"75%","l":"Proposed"},"goodIfUp":true}` — before/after, us/them, old record/new.
- `{"t":"meter","l":"Money spent","v":70.61,"max":96.9,"d":"₹70.61 cr of ₹96.9 cr","note":"…"}` — progress against a total or target.
- `{"t":"stack","l":"Medal mix","total":"114 medals","parts":[{"l":"Gold","v":30},{"l":"Silver","v":35}]}` — parts of a whole.
- `{"t":"timeline","l":"What happens when","now":0,"steps":[{"t":"Sat 24","e":"…"},{"t":"By Oct 28","e":"…"}]}` — dated sequence; `now` = index of today.
- `{"t":"icons","n":1,"of":4,"icon":"🏠","d":"1 in 4","l":"homes depend on tankers"}` — "X in Y" facts.
- `{"t":"trend","l":"AQI this week","pts":[["Mon",142],["Tue",120]],"unit":""}` — 3+ dated values.
- `{"t":"donut","v":62,"d":"62%","l":"of the budget goes to …"}` — one share.
Put the most surprising, relatable number first. Heavy stories (deaths, disasters): plain `big` tiles only, no `tone` colours. If a story truly has no numbers, use a `timeline`.
