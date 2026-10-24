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

## 11. One visual hook per feed card
Each feed card shows ONE hook under the explainer map, picked automatically: (1) "🧠 Can you guess?" **only** if you set `"teaser": true` — use it on at most 1–2 stories a day, when the quiz question is genuinely intriguing and the story has no strong numbers; (2) otherwise **how readers are leaning** — the poll's live vote split (appears once 5+ people vote), so write polls that genuinely divide opinion; (3) otherwise the first non-`big` item in `viz` (compare, stack, meter, timeline, icons, trend, donut). Single `big` numbers show as the stat badge under the headline. So: put the most visual chart first among non-`big` viz items.

## 12. 📣 Speak up (civic actions) — PAUSED (hidden in the app; skip this section until the owner turns it back on)
`content/acts/<slug>.json` holds public-interest actions in Hyderabad/Telangana that readers can join: **petitions, public consultations / draft rules open for feedback, citizen drives (lake clean-ups, water saving, tree walks), public hearings and ward meetings** on traffic, water, lakes & trees, safety and civic amenities. Find candidates:
```sql
select id, source, title, url from public.scout_items
where coalesce(published_at,fetched_at) > now() - interval '3 days' and title !~ '[\u0C00-\u0C7F]'
  and title ~* '(petition|campaign|signature|public hearing|objection|suggestions|consultation|feedback|volunteer|clean-?up|plantation|citizens|residents (demand|oppose|seek)|lake|tree felling|decongest|unchoke|ward sabha|public meeting|draft (rules|policy|notification)|pledge|drive)'
  and (region in ('hyderabad','telangana','india') or title ~* '(hyderabad|telangana)')
order by coalesce(published_at,fetched_at) desc limit 30;
```
Rules: verify from the article (organiser, demands/what's proposed, deadline, numbers); **non-partisan only** — never list party rallies, dharnas or protests led by political parties, and never endorse; link a petition/consultation page in `cta` only if the article names it (otherwise point to the official site or leave `cta` out). Fields: `title, kind (petition|consultation|drive|campaign|event), issue (traffic|water|green|safety|civic), status (open|closed), added (YYYY-MM-DD), who, what, asks[] (+ optional askTitle), stat {v,l}, deadline, next, checkin (button text, e.g. "I support this"), cta {label,url}, story (related drop id), sources[], pin (0-2)`. Add at most 1 new action per run; set `"act": "<slug>"` on the related drop; mark actions `closed` once the deadline passes or the issue is resolved, and update `stat`/`next` when there's news. Model files: `unchoke-hyderabad.json`, `every-drop-counts.json`, `dl-draft-rules-feedback.json`.

## 13. Live: context for big news, direct links, and pushes
**Need-to-know explainers.** Every run (morning, midday, evening, night) checks the top of `live_wire` (section 1, list A). For the 2–4 most important *new* items — high score, `alert` tag, `outlets ≥ 2`, or anything that changes a Hyderabadi's day (water/power cuts, traffic diversions, exam changes, weather warnings, big court/government decisions) — write a live alert `content/live/l<YYYYMMDD>-<slug>.json` instead of leaving a bare headline:
- `title` (≤ 14 words, plain), `body` = 2–3 short sentences of context in Spill's voice (what happened, why, the key number), `care` = one line "what it means for you / what to do" (start with an action when there is one), `kind` (water|power|traffic|weather|exam|civic|health|alert|metro), `scope` (`local` + `city: "Hyderabad"`, or `national`), `sev` 1–3 (3 = act now; shows as the red BREAKING banner, use sparingly), `ts` (epoch ms), `until` when it expires, `src` [{name,url}] = the articles you verified, `open` = a related drop id if one exists.
- **Direct links**: if the story has an action, add `links: [{"label":"Check the area list","url":"…"}]` (max 3) pointing to the **official page named in the article** — application portals, results, helplines, outage lists, traffic advisories, official orders/notifications, petition pages. Never guess URLs; if the article doesn't name one, link the official department's home page or leave `links` out.
- Mark the scout items you covered (section 5) so the next run moves on.

**Push notifications** (readers opt in on the Live page; owner can also send from spillthetea.news/admin):
- **3 automatic pushes a day, total.** `send_push()` enforces it (counts `push_log` `auto:%` for the IST day) and returns null when the cap is hit; manual /admin sends don't count.
- **Civic alerts are automatic:** `detect_civic_alerts()` (every 10 min) turns fresh power / water / weather / holiday / metro / major-traffic headlines (English + Telugu) into `civic_alerts`; `dispatch_civic_alerts()` pushes them. Priority power > water > weather > holiday > metro > traffic. Minor traffic diversions go to Live only. Quiet hours 22:00–06:30 IST, 30 min spacing, stale after 18 h.
- Before any run push: `select title, created_at from push_log where created_at > now() - interval '12 hours';`. Skip if the same topic already went out, or if 2 auto pushes have already gone out (keep 1 slot for civic emergencies).
- Morning run: after publishing → `select public.send_push('<title>', '<body>', '/#s/<drop id>', 'news');`. Evening run: the same, only if a slot is left.
- Push copy follows Hooked (trigger → action): title ≤ 60 chars, one emoji, specific what + where + when ("⚡ Power cut 10am–2pm in Kukatpally, Miyapur"). Body = what to do + why tap ("Charge up now. Full area list inside"). Never unverified, never clickbait.


## 14. Civic alert details (do this FIRST in every run — cheap, high value)
Readers must get everything inside Spill: no reason to leave. An alert is pushed **only after you fill `details`**.
1. `select id, kind, headline, publisher, url, published_at from civic_alerts where details is null and push_status = 'pending' order by published_at desc;`
2. For each: open the article (1 fetch). Fill in only what the article or official notice says:
```sql
update civic_alerts set enriched_at = now(), details = jsonb_build_object(
 'summary','2 lines in Spill voice: what is happening and why',
 'level','e.g. Scheduled power cut · TGSPDCL / IMD orange alert',
 'when','Sun, Oct 26', 'timing','10 am – 2 pm',
 'where_label','Affected areas', 'where', jsonb_build_array('Kukatpally','Miyapur'),
 'not_affected','optional: who is safe, e.g. Hyderabad: no alert',
 'do', jsonb_build_array('Charge phones tonight','Store water'),
 'official', jsonb_build_object('label','TGSPDCL notice','url','<official url, only if the article names it>'),
 'push_title','⚡ Power cut 10am–2pm: Kukatpally, Miyapur',  -- ≤ 60 chars, specific
 'push_body','Sunday. Charge up tonight. Full area list inside',  -- ≤ 110 chars
 'valid_until','<ISO time the alert stops mattering>'
) where id = <id>;
```
3. Not a public alert (political, an office-only cut, an old story)? → `update civic_alerts set details = '{"push":"no"}', note = 'not for readers' where id = <id>;`
4. Never guess areas or times. If the article has none, leave `where`/`timing` out and say so in `summary`.


## 15. Need to know = insight, not headlines (applies to every live alert you write)
Readers should get the main news inside Spill. Each "Need to know" item has:
- `title`: specific (what + who + when). `tag`: the reader's stake, e.g. "💼 Jobs", "📚 Exams", "💸 Money", "🏠 Rent", "🚇 Commute", "📱 Tech", "🏏 Cricket", "🎬 Movies", "🛡️ Safety".
- `body`: 2–3 lines of context in Spill's voice: what happened, why it happened, what changes now.
- `means`: 1–3 bullets on what it means for a 15–30 reader (an action, a deadline, money saved or lost).
- `viz`: 1–2 tiles (same format as stories, §10) whenever the article has a real number: `big`, `compare`, `meter`, `icons`, `trend`. Never invent numbers.
- `poll`: a quick vote on every Need to know item with a real choice or opinion angle: `{"q":"Will you take the metro instead?","opts":["Yes","Already do","No, bike/cab"]}`. Use 2–4 short options. Make it about the reader's own life (would you, will you, how affected are you). No polls on deaths, crimes or tragedies, and none on parties or leaders.
- `care`, `links` (official only), `src`, `verified` as before.
Pick topics by reader pain points and desires: jobs, hiring and layoffs, exams and results, fees, prices, rent, fuel, UPI and banking, commute, weather and civic issues, tech and startups, cricket, movies and OTT, safety.
**Politics:** cover it only when it changes daily life (a new rule, a fee, a holiday, a ban). Never make an infographic about party politics, polls, seat counts or leaders.

## 16. 🎟️ Events — PAUSED (removed from the app; skip this section)
The Events tab is hidden while it has no upcoming events. Keep 6–15 upcoming Hyderabad events at all times.
- Leads: `select title, url, published_at from scout_items where region = 'events' and published_at > now() - interval '5 days' order by published_at desc limit 30;` plus up to 3 web searches (Luma, Meetup, T-Hub, BookMyShow/District, AllEvents, college fests).
- What to pick, for 15–30s: startup and tech meetups, hackathons, career and job fairs, college fests, stand-up, gigs, sports screenings, food and flea markets, workshops, outdoor plans. Weekend events first. No political rallies.
- Each event is `content/events/e<YYYYMMDD>-<slug>.json`:
```json
{"title":"…","kind":"startup|tech|career|meetup|comedy|music|sports|food|art|fest|outdoor","start":"2026-10-31T11:00:00+05:30","end":"2026-10-31T14:00:00+05:30","venue":"T-Hub","area":"Raidurg","price":"Free | ₹499 onwards","why":"one line on why it's worth going, Spill voice","url":"<official registration/ticket page>","cta":"Register | Book","source":"Luma","pick":true}
```
- Verify the date, venue and price on the official page. If the date isn't confirmed, skip it. Delete files for past events.


## 17. Live → feed: grow developing stories into full stories (every morning and evening run)
Home shows "🔴 Developing now": rich Need-to-know items, plus live_wire headlines with 3+ outlets. Once a story has depth, it becomes a regular feed story:
1. Candidates: active live items with `sev >= 2` or 2+ updates, and `select title, outlets, url from live_wire where outlets >= 3 and published_at > now() - interval '12 hours' order by score desc limit 5;`
2. For the top 1–2 not already in content/drops, write a full drop (counts toward the Pick table) and set the live item's `"open": "<drop id>"` so Live links to it and Home stops showing it as Developing.
3. Every feed story must pass all three:
   - **Novelty:** new today, or a real new development (not a rerun of yesterday). Lead with what changed.
   - **Depth:** answers why it's happening, what happens next, and who decides. Has explainer cards, 1+ `viz` with real numbers, and a poll.
   - **Relatability:** a concrete stake for a 15–30 year old in Hyderabad (money, time, commute, job, exam, safety, plans). Say it in the hook.
4. Keep politics to what changes daily life; no politics infographics (§15).


## 18. Weather is automatic
Live temperature, forecast and AQI come from Open-Meteo in the reader's browser (their location if they share it, otherwise Hyderabad), refreshed every 15 min, and shaped by time of day (morning: today; evening: tonight + tomorrow; night/late: tomorrow). Don't write temperatures or AQI by hand. In `content/now/hyderabad.json` keep only `rain` for official advisories (IMD alerts, cyclone, heatwave warnings), e.g. "IMD orange alert: heavy rain Mon–Tue". Clear it once the advisory ends.


## 19. Keep Live lean
- Live wire headlines are tagged by `wire_tier()`: **key** (reader impact: civic, exams, jobs, prices, transport, tech, alerts) stays up to 12 h; **spicy** (party spats, crime, protests, statues) and **other** show for 3 h under "Also buzzing" (max 3), then move to a collapsed Archive.
- "Need to know" is only for key stories. Never write a live alert for a political spat or a crime story unless it changes daily life (curfew, bandh, road closure, safety advisory).
- Set `until` on every live alert, and keep at most 5 active at a time. Older ones fold into "📦 Earlier alerts".
- Depth goes to the feed: if a key story needs the why, write a drop (§17). Live links to it with `open`.


## 20. Named, visual, hooked + live ↔ flair cards (applies to everything you write)
The app layout is unchanged: Live, Home and the flairs (r/Hyderabad, r/IndiaRN, …) stay as they are.
**Live news that needs a detailed explanation → use the flair card:**
- Write (or reuse) a full story card (drop) in its flair (`cat`) and set the live item's `"open": "<drop id>"`. Live then shows that exact card inside the alert, labelled "🧠 Explained · this card updates as the story moves".
- When the story moves, **update the same drop file**: refresh the hook, cards and viz with the new facts, add the new development, bump `updated`. Don't make a new drop for every twist (use `thread`/storylines only when it's a new chapter). The flair card and the Live card stay in sync automatically.
**Wire headline copy (every run, before anything else, SQL only, no web fetches):**
```sql
select w.id, w.title, left(s.summary,300) from live_wire w join scout_items s on s.id = w.id
 where w.tier = 'key' and w.hook is null order by w.published_at desc limit 15;
update scout_items set hook = '<new headline>' where id = <id>;   -- then: select refresh_live_wire();
```
Rules for the `hook` (≤ 90 chars, starts with one fitting emoji):
- Use only facts in the headline/summary. Never add a number, name or claim.
- **Name it:** the place (area, district), the person with their role, the number. No suspense ("You won't believe…", "This city…"), unless the punchline really is the point.
- **Hooked:** lead with the reader's stake or the most concrete detail: what changes, for whom, by when. Active voice, plain words, Gen-Z tone, no clickbait.
- Example: "HYDRAA busts water racket in Sunnam Cheruvu" → "💧 HYDRAA finds borewells inside bedrooms near Sunnam Cheruvu lake, removes 15".
**Short live alerts:** add `steps` (2–4: what happened → why → what's next) and `viz` tiles when there are numbers. Anything deeper becomes a flair card (above).
**Names everywhere:** live titles, drops and notifs name the place and the person. Don't write "a city", "a minister" or "a top university".
