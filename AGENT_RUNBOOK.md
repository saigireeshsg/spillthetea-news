# Spill newsroom runbook (for scheduled Claude runs)

Spill publishes directly: what you push to `main` goes live on spillthetea.news within about a minute. Accuracy matters more than volume. If you are unsure of a fact, leave it out.

## 0. Setup
1. Attach the repo with push access (`add_repo` owner `saigireeshsg`, repo `spillthetea-news`, access `push`), clone it to `/home/claude/spillthetea-news`, and work there.
2. Commit as `Claude <noreply@anthropic.com>`: run `git config user.name Claude && git config user.email noreply@anthropic.com`.
3. Supabase project id: `tvhfqkvyfkqxxiqxavjp` (use the Supabase connector's `execute_sql`).

## 1. Scout (already running)
A Supabase cron job runs the `scout` edge function every 30 minutes (5:30 am–midnight IST) and stores headlines in `public.scout_items` (`url, title, summary, source, region, published_at, status`).
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
Group headlines about the same event. Prefer events reported by 2+ outlets. Skip crime gossip, celebrity news, ads and press-release puffery.

**Value test (every story must pass at least one):** a reader aged 15–30 in that city or in India can (a) *act* on it (deadline, exam, job, fee, scheme, traffic, water/power, safety, money), (b) *talk* about it (big national/world moment their friends will discuss), or (c) *understand* something that shapes their future (policy, economy, climate, tech, rights). If you can't write a concrete `beats.care` line, drop the story. Regional first: Hyderabad/Telangana, then the other six cities, then national, then world.

| Run | What to publish |
| --- | --- |
| Morning (by 7 am IST) | 14–18 stories dated today: 1 featured editorial (from The Hindu editorial feed), 5–7 Hyderabad/Telangana (`cat: "local"`, `city: "Hyderabad"`), 1–2 each for Bengaluru, Chennai, Delhi, Mumbai, Pune, Kolkata (`cat: "local"` with that `city`), 3–4 India, 1–2 money, 1–2 world, 1 sport or tech or planet. Plus a morning notification and fresh weather for each city. |
| Midday (around 12:30 pm) | Live alerts only: traffic, rain, power or water cuts, civic alerts, big breaking news, as `content/live/*.json`. Refresh `content/now/<city>.json` weather. Add a story only for real breaking news. |
| Evening (by 6 pm) | 4–6 new stories that broke during the day, updates to ongoing threads (reuse the same `thread`), an evening notification (`slot: "evening"`), and expire stale live alerts by setting `until`. |

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
