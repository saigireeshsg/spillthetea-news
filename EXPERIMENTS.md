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
- 2026-10-26 (hourly) · d20261024-hyd-el-nino-water: new A/B pair on update — A stake-first statement with number ("5 lakes hold 8.9 TMC; cut use 20%") vs B number-first + question ("Singur down 81%… can you cut 20%?") · running
- 2026-10-26 (hourly) · d20261024-aee-ssc-je-clash: A number-first statement ("50,000 engineers caught…") vs B second-person stake + date ("Writing both…? Nov 6 is a problem") · running

- 2026-10-26 (hourly) · d20261025-tg-graduate-voter-list (in-place update): A number-first local statement ("Hyderabad city: only 23,000 forms") vs B second-person eligibility + countdown ("Graduated by Oct 2023? 11 days to enrol") · running
- 2026-10-26 · evening · hook_b on IIIT Junction closure (stake-first vs question/date-first) and AEE update (fix-first vs documents-deadline) · running
- 2026-10-26 (hourly, 8:15 pm IST) · d20261024-bay-cyclone (in-place update): A number-first statement ("Kakinada evacuates 89,000") vs B second-person family stake ("Got family in Kakinada or Konaseema?") · running
- 2026-10-27 · morning · hook_b on water emergency rules: A rule-first number ('taps every 3 days, ₹1,000 fine') vs B second-person question ('Does your sump overflow?') · running
- 2026-10-27 (half-hourly, 8:45 am IST) · d20261027-tg-tummidihatti-152m: A number-first statement ('152 m on the table') vs B curiosity question ('fighting over 4 metres of a dam wall?') · running
- 2026-10-27 (half-hourly, 12:45 pm IST) · d20261027-aibe-22-last-day: A audience+deadline statement ('Law grads: closes today') vs B second-person aspiration question ('Want to practise law?') · running
- 2026-10-27 · cyclone card hook_b: question + destination-first ('Train to Vizag or Odisha this week?') vs stake-first statement · running
- 2026-10-27 (hourly, evening IST) · d20261024-bay-cyclone: hook_b test kept as is (evening update added, hook A/B unchanged so the comparison stays clean) · running
- 2026-10-27 (hourly, night IST) · d20261024-bay-cyclone: both hooks refreshed to the new 64-services number, styles unchanged (A stake-first statement vs B destination-first question) · running

- 2026-10-27 (evening) · d20261027-hyd-cantonment-skyways: A number-first statement ('5.4 km, pillars almost done') vs B commuter-pain question ('Stuck at Paradise Circle daily?') · running
- 2026-10-27 (half-hourly, 20:43 IST) · d20261024-bay-cyclone: both hooks refreshed to 95 trains cancelled, styles unchanged (A stake-first statement vs B destination-first question) · running
- 2026-10-27 (half-hourly, 22:13 IST) · d20261026-hyd-rice-90-a-kg: updated in place (trader warning); B hook switched to hoarding question ('Rice at ₹90/kg: are traders hoarding it?') vs A number-first statement · running
2026-10-28 · morning run blocked (Supabase SQL + WebFetch permission prompts unanswered) · only water-card update + 1 opp · n/a
- 2026-10-28 (hourly, ~07:15 IST) · d20261024-bay-cyclone: updated in place (landfall underway); A = place-first statement vs B = traveller question · running
- 2026-10-28 (hourly, ~12:30 IST) · d20261028-ugc-net-dec-oct31: A = deadline statement with date vs B = 'Missed the form?' question + countdown · running
- 2026-10-31 · midday · hook_b question-style on rain ("Did your area flood?") and AEE ("Is the AEE exam moving?") · running
- 2026-10-31 (hourly, ~14:30 IST) · d20261024-bay-cyclone: updated in place (new cyclone, landfall likely Nov 2); A = date-first statement vs B = traveller question 'this weekend?' · running
- 2026-10-31 (half-hourly, ~14:45 IST) · d20261027-hyd-water-emergency-rules: updated in place (waste videos, ₹5,000 tanker fine Nov 1); A = rule+fine number-first vs B = place-first naming localities (Maula Ali, SR Nagar) · running
- 2026-10-31 (hourly, ~15:45 IST) · d20261031-hyd-rain-keesara-112mm: updated in place (IMD heavy rain from Nov 1, fresh depression); A = number-first (112 mm) vs B = date-first 'From Nov 1' · running
