# Spill newsroom runbook (for scheduled Claude runs)

Spill publishes directly: what you push to `main` goes live on spillthetea.news within about a minute. Accuracy matters more than volume. If you are unsure of a fact, leave it out.

## Budget (read first — stay inside the owner's daily/weekly usage limits)
- Lean runs. No subagents, no screenshots, no headless browsers, no re-reading big files. Read only the 2–3 example drops you need, not the whole folder (`ls content/drops | grep <date>` for duplicates).
- Scout table first; web searches max **3** per run (morning), **2** (midday/evening).
- WebFetch: **1 article per story** (2 only if facts conflict). Skip any page that fails once — don't retry.
- Story caps: morning **6–7**, midday **0–2 live alerts + weather** (no stories unless major breaking), evening **2**. Readers said the app felt text-heavy and overwhelming: fewer, sharper stories beat more.
- Write each drop compactly: `cards` = tea + 1 extra + poll + quiz. Write all files in one script/Bash call where possible.
- If you hit a usage or rate limit: commit and push what's verified, report, stop. Never loop or retry heavy steps.
- Quiet day? Publish fewer. Zero is fine for midday.

## 0. Setup
1. Attach the repo with push access (`add_repo` owner `saigireeshsg`, repo `spillthetea-news`, access `push`), clone it to `/home/claude/spillthetea-news`, and work there.
2. Commit as `Claude <noreply@anthropic.com>`: run `git config user.name Claude && git config user.email noreply@anthropic.com`.
3. Supabase project id: `tvhfqkvyfkqxxiqxavjp` (use the Supabase connector's `execute_sql`).

## 1. Scout (already running)
A Supabase cron job runs the `scout` edge function every 10 minutes, round the clock and stores headlines in `public.scout_items` (`url, title, summary, source, region, published_at, status`).
Regions: `hyderabad, telangana, india, world, money, tech, sport, edit, bengaluru, chennai, delhi, mumbai, kolkata, pune`.

Read fresh candidates:
```sql
select id, region, source, title, summary, url, published_at
from public.scout_items
where status = 'new' and coalesce(published_at, fetched_at) > now() - interval '20 hours'
order by region, published_at desc nulls last;
```
If the newest `fetched_at` is older than 2 hours, check `select name,last_status from scout_sources where active` and trigger a run with `select net.http_post(...)` exactly as in the cron job (`select command from cron.job`).

## 2. Pick
**Local papers:** `scout_items` also carries Telangana papers — English (Telangana Today sections, Deccan Chronicle, Hans India, New Indian Express, The News Minute) and **Telugu** (Namasthe Telangana, Sakshi, Google News Telugu for Telangana/Hyderabad). Read the Telugu headlines for local stories the English press missed; verify from the article (and a second outlet where possible) and write the drop in English. Telugu headlines never appear in the app's Live wire.

Group headlines about the same event. Prefer events reported by 2+ outlets. Skip crime gossip, celebrity news, ads and press-release puffery.

**Value test (every story must pass at least one):** a reader aged 15–30 in that city or in India can (a) *act* on it (deadline, exam, job, fee, scheme, traffic, water/power, safety, money), (b) *talk* about it (big national/world moment their friends will discuss), or (c) *understand* something that shapes their future (policy, economy, climate, tech, rights). If you can't write a concrete `beats.care` line, drop the story. Regional first: Hyderabad/Telangana, then national, then world. (Other cities paused until the owner expands beyond Hyderabad.)

| Run | What to publish |
| --- | --- |
| Morning (by 7 am IST) | 6–7 stories dated today. **Hyderabad-only launch:** 1 featured editorial (from The Hindu editorial feed), 3 Hyderabad/Telangana (`cat: "local"`, `city: "Hyderabad"`), 2 India, 1 money or world. No other-city locals for now. Plus a morning notification and fresh Hyderabad weather (`content/now/hyderabad.json` only). |
| Midday (around 12:30 pm) | Live alerts only: traffic, rain, power or water cuts, civic alerts, big breaking news, as `content/live/*.json`. Refresh `content/now/hyderabad.json` weather (Hyderabad only for now). Add a story only for real breaking news. |
| Evening (by 6 pm) | 2 new stories that broke during the day, updates to ongoing threads (reuse the same `thread`), an evening notification (`slot: "evening"`), and expire stale live alerts by setting `until`. |

Before writing, list today's existing files in `content/drops/` so you never publish the same story twice. If a story moved forward, write a new drop on the same `thread` that says what changed.

## 3. Verify (never skip)
RSS summaries are not enough. Open the article (WebFetch) for every story and take facts only from what you read. Use 2 sources when possible. Put real article URLs in `sources` (`name`, `title`, `url`). Never invent numbers, names, dates or quotes. Rewrite everything in your own words; no copied sentences.

## 4. Write
Copy the shape of recent files exactly; good examples: `content/drops/d20261024-hyd-el-nino-water.json` (local with cover and calc), `d20261024-ed-in-the-crossfire.json` (featured editorial), `d20261024-lac-disturbed.json` (India).

Each drop needs: `date` (IST, `YYYY-MM-DD`), `cat` (`local|india|world|money|tech|sport|planet|edit|campus`), `hook` (≤12 words, key number wrapped in `*asterisks*`), `tldr`, `topic`, `map` {`causes` [1–2], `event`, `effects` [2]} with `icon`+`label`, `beats` {`what`, `why`, `care`}, `cards` (`tea`, plus 1–2 of `num`/`why`/`twist`/`sides`/`bars`, then `poll`, then `quiz`), `learn.t`, `watch`, `thread`, `heat` (1–5), `order`, `sort` (`"YYYY-MM-DD-NN"`, higher = more important; morning uses 98 down, evening 60 down), `readSecs`, `sources`. Local stories also need `city` and `areas`. Use `cover` on 3–5 big stories, `lead: "local"|"india"|"world"` on the top story of each kind, `featured: true` + `editorial` on the editorial. Existing storylines you may attach with `storyline`: `delimitation, sir, west-asia, rbi-inflation, russia-ukraine, pakistan-pti, us-work-visas`.

Voice: friendly, plain English, sentences under 15 words, explain every term, "what it means for you" in `beats.care`. Politics neutral and attributed. Heavy stories (deaths, disasters, violence): calm tone, no emoji jokes, no poll.

Files: `content/drops/d<YYYYMMDD>-<slug>.json`, `content/live/l<YYYYMMDD>-<slug>.json`, `content/notifs/n<YYYYMMDD>-am|pm.json` (`title`, `body`, `open` = drop id, `slot`, `ts` epoch ms), `content/now/<city>.json` (city ids: hyderabad, bengaluru, chennai, delhi, mumbai, pune, kolkata). Look at existing files for the live and weather shapes.

## 5. Publish
1. `python3 tools/build-data.py`
2. Check every new JSON parses: `python3 -c "import json,glob;[json.load(open(f)) for f in glob.glob('content/**/*.json',recursive=True)]"`
3. `git add -A && git commit -m "<run>: <n> stories, <m> live alerts"` with the trailers `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and the session line, then `git pull --rebase origin main && git push origin HEAD:main`.
4. Mark used scout items: `update public.scout_items set status='published', drop_id='<id>' where id in (...)`, and `status='skipped'` for ones you reviewed and rejected.

## 6. Report
Send the user a 2–4 line summary: how many stories and alerts went live, the top Hyderabad story, and anything you couldn't verify or publish.

## 7. Live cricket (automatic — no work needed)
India matches (men and women) are tracked automatically: Supabase cron `spill-cricket-30s` runs the `cricket` edge function every 30 s, reading ESPN's open scoreboard feed into `public.cricket_live`; the app shows a live card on Home with ball-by-ball lines we generate from the data (never copy ESPN's commentary prose). Runs don't touch it. If an India match finished today, the evening run may write one short drop on the result (`cat: "sport"`), verified from the match report.

## 8. Ranking rule (applies everywhere)
Order news by four factors, in this order of weight: **recency** (newer first), **relatability** (does it change a 15–30-year-old Hyderabadi's day: water, power, traffic, exams, jobs, prices, weather), **weightage** (how many reputable outlets carry it), **importance** (courts, government decisions, disasters, big national moments). Set each drop's `sort` to reflect this. The Live tab's wire (`public.live_wire`) is ranked automatically every 10 minutes by `refresh_live_wire()` using the same four factors; use its top items as the shortlist when picking stories.
Cricket alerts: readers opt in on the match card (Web Push). The `cricket` function stays awake during live India matches, re-reads ball-by-ball every 2.5 s, writes to `cricket_live` (readers get it instantly via Realtime) and pushes start, wickets, 50/100s, five-fors, innings break and result once each (`push_log`). VAPID keys live in `public.app_secrets` (server-only). Never push anything that isn't from the live data feed.

## 9. Keep it light (reader feedback, 24 Oct)
Readers found Spill text-heavy and overwhelming. Every drop: `hook` ≤ 10 words; `tldr` one sentence ≤ 20 words; each `beats` line ≤ 18 words; `cards` = `tea` + `poll` + `quiz` (add one `num` card only when a single number tells the story). Feed cards show only the headline, so the hook must carry the story. Prefer one strong story over two similar ones.
