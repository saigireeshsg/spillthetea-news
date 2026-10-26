# Spill experiments log
One line per experiment: date · what · result.

- 2026-10-25 · Started: headline A/B via `hook_b` (variant_stats) · running
- 2026-10-25 · Live caveman digest (gist under every headline) vs tap-to-expand · shipped caveman per owner; watch wire_expand/wire_cta counts
- 2026-10-25 · A/B on K-Harmony Festa: A = event-first ('Free K-pop fest… today') vs B = band-hook ('The Tauba Tauba K-pop band…') · running
- 2026-10-25 · Calm feed cards (hook + 1 stat + Read; map/poll moved inside story) vs old heavy cards · shipped; compare card CTR (story_stats) vs Oct 25 morning baseline
- 2026-10-25 · Calm cards reverted by owner (explainer cards back) · closed
- 2026-10-25 · A/B on cyclone update: A = number-first ('…16 Telangana districts on alert Oct 28') vs B = place-question ('In Khammam, Mulugu or Kothagudem? Red alert…') · running
- 2026-10-25 · Contextual push opt-in sheet (after 2nd story read or any water/power/cyclone story; civic vs general copy) vs Live bell only · running; see optin_funnel
- 2026-10-25 · A/B on weekly AC bus pass: A = price-first ('…unlimited AC bus rides for ₹600') vs B = per-day question ('…all week for ₹86 a day?') · running
- 2026-10-25 · A/B on water emergency update: A = alert-first ('🚨 Water board declares emergency: Singur… ~50 days') vs B = area question ('Is your Hyderabad area on the Singur line?') · running
- 2026-10-25 · A/B on Miyapur parks: A = number-first ('HYDRAA wins back 2.64 acres…') vs B = reader question ('Is your colony park still a park?') · running
- 2026-10-25 · Cyclone A/B continued after 'very severe' upgrade: A = upgrade+number-first ('Upgraded to very severe: 140 kmph…') vs B = place-question ('In Khammam, Mulugu or Kothagudem?…') · running (hooks refreshed, styles kept)
- 2026-10-25 · Water A/B continued after Godavari diversion update: A = news-first ('Govt to divert Godavari water…') vs B = area question ('…Is your Hyderabad area one?') · running (hooks refreshed, styles kept)
- 2026-10-26 · morning · hook_b on bay-cyclone (district-question vs date-first) · running. Run limited: Supabase writes and WebFetch of non-search URLs needed approval (unattended), Indeed connector down.

## 2026-10-26 · Card interaction rethink + opt-in moments
- Replaced ▲/▼ vote on story cards with ONE context action + Share:
  - civic storylines/ids (water, power, cyclone, rain, flood, drought) → "🔔 Alert me" (direct push opt-in; event alert_me)
  - stories in a storyline/thread → "🔔 Follow" (existing follow; event story_follow, then opt-in sheet id=follow)
  - everything else → reactions 😮 😂 😡 🤔 (event story_react, variant = reaction)
- Opt-in sheet now fires at real moments, one per session, 3-day cooldown: alert (opened civic alert), story (opened civic story), follow, alertme, visit2 (2nd visit day), idle (20s after first scroll), read (2nd full read).
- Sheet shows "Max 3 a day" + an example notification. iPhone (not installed) gets Add-to-Home-Screen steps (optin_ios).
- Measure: read_events optin_shown/optin_yes/optin_no/alerts_on with id = trigger → conversion per moment. Baseline: 4 subs / 388 devices (1%). Target 20%.
