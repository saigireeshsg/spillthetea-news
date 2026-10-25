# SPILL: Audience, News Hunting & AI Newsroom Blueprint

Working strategy and operating playbook · 25 October 2026 · Version 1.0
(Reference doc for the owner and humans. Scheduled runs follow `AGENT_RUNBOOK.md`, which carries the operational rules from this blueprint in §28.)

**Product thesis:** An intelligence network for young urban Indians. Begin with their questions, identify verified developments that matter, explain consequences, and track what happens next. Participation should improve coverage for everyone.

## Executive decisions
- **Primary launch wedge:** English-comfortable urban adults aged 21–32, initially concentrated in Hyderabad among early-career professionals, postgraduate students, job seekers and young households. Segment by life stage and needs rather than age alone.
- **Editorial pillars:** What affects me today · What could improve my future · Why is this happening · What is everyone talking about · What happened next.
- **Core content object:** a living QUESTION or ISSUE with a timeline, evidence, perspectives, actions and follow-up triggers, not a standalone article.
- AI agents gather and triage leads; independent sources and human review establish truth. **No invented quotes, interviews, sources or first-hand reporting.**
- Measure retained usefulness and quality, not just clicks, scroll time, outrage or push opens.

## 1. First-principles user model
Users seek information to protect themselves, progress, save time or money, belong, understand, decide, anticipate, and express identity. The same person changes information jobs several times a day. Model stable context (life stage, city, goals, language) separately from situational intent (trigger, question, urgency, action).

| Life stage | Primary tension | Recurring questions |
| --- | --- | --- |
| 21–24 emerging independence | First jobs, postgraduate study, financial independence | Hiring, early career, postgraduate study, rent, safety, AI |
| 25–28 career acceleration | Career direction vs financial pressure | Career moves, skills, income growth, relationships, urban living |
| 29–32 life optimization | Growth vs lifestyle inflation | Job security, salary, housing, investments, AI, mobility |

These are hypotheses, not validated segments. Cross-cut by income/autonomy, city, education, occupation, language, mobility, trust orientation, accessibility and time available. Never infer sensitive characteristics from passive behavior.

## 2. User questions and real-life triggers
| Information job | Natural-language questions | Trigger |
| --- | --- | --- |
| Career | Which companies actually hire freshers? Will AI change my job? Is this offer genuine? | Layoff rumors, placement cancellations, peer salary |
| Money | Why is rent rising? What changed in tax rules? Is this UPI message a scam? | Rent notice, salary day, suspicious transaction |
| Education | Did the exam date change? Is this scholarship genuine? Which skill pays off? | Official notice, deadline, course ad |
| Local life | Why is this road flooded? When will metro work finish? Who fixes this? | Commute delay, rainfall, service failure |
| Health | Is this viral claim supported by evidence? Does the heat alert affect outdoor plans? | Viral claim, public health advisory |
| Tech / future | What can this new AI system actually do? What breakthrough is real? | Demo, new paper, product release |
| Civic | What does the new rule change for me? Who made this decision? | Policy announcement, enforcement |
| Culture | Why is this trending? Is the viral clip real? What is the context? | Friends, reels, group chats |
| Safety | Is this internship scam widespread? What can victims do? | Suspicious message, public warning |
| Follow-ups | Did the promise get delivered? What happened after the protest? | Unresolved issue previously followed |

Trigger taxonomy: environmental, social, economic, institutional, aspirational, emotional, curiosity. Collect the question, trigger, desired decision, urgency, chosen platform, evidence used, unresolved gap and follow-up need.

## 3. What should agents hunt? Editorial opportunity taxonomy
| Hunt class | Concrete signals | Expected user value |
| --- | --- | --- |
| Immediate impact | Verified transport closures, severe weather, local outages, application deadlines | Action now |
| Opportunity delta | New openings, scholarships, hiring changes, grants, free tools | Get ahead |
| Rule / price change | Government orders, college rules, fees, tax and consumer-policy changes | Understand consequence |
| Emerging pattern | Repeated local complaints, price shifts, repeated scam reports | Detect structural issue |
| Claim needing verification | Viral video, misleading statistic, extraordinary science/AI claim | Know what is true |
| Breakthrough with limits | Peer-reviewed results, credible trials, working demos | Understand possibility vs hype |
| Public accountability | Promises, budgets, milestones, outcomes, unresolved complaints | Track progress |
| Conversation gap | Fast-rising community question with poor existing answers | Explain and share |
| Human-scale story | Credible case illustrating a broader development | Connect emotionally without exploitation |
| Follow-up delta | Material new evidence, decision, correction, deadline, outcome | Close the loop |

## 4. Agent operating architecture
Pipeline: source registry → scouting → event extraction → deduplication → user-question mapping → evidence verification → impact ranking → editorial decision → writing → quality and safety review → publication → follow-up watch → outcome analytics.

| Agent | Responsibility | Output / guardrail |
| --- | --- | --- |
| Source scout | Monitor approved official, credible reporting, research, local and community feeds | Lead + source URL + timestamp; respect terms and rate limits |
| Signal normalizer | Extract actors, location, dates, event, claims and changes | Structured event; preserve original wording |
| Question mapper | Connect lead to actual or hypothesized user questions | Question, persona, trigger, urgency, action |
| Verifier | Cross-check primary documents and independent reporting | Claim-level evidence ledger; unsupported remains unverified |
| Impact editor | Score novelty, relevance, consequence, timeliness and coverage gaps | Prioritized queue with rationale |
| Explainer writer | Draft human-readable, question-first story | Source-linked draft, uncertainty, next update |
| Standards reviewer | Check claims, quotes, defamation, minors, privacy, medical/legal/financial risk | Approve, hold or escalate to human |
| Story tracker | Watch for verified developments in followed issues | Material-change alerts, corrections and closures |
| Learning analyst | Compare usefulness, repeat visits, shares, corrections and complaints | Experiment report; no automatic editorial manipulation |

## 5. Lead intake and ranking
Every lead carries: lead_id, event_id, question_id, headline candidate, who/what/where/when, event time, discovery time, source URLs, primary-source status, evidence excerpts, affected users, geography, urgency, uncertainty, next expected milestone, rights/licensing status, verification state, editorial owner.

Illustrative ranking score (0–100): 20 personal consequence + 15 timeliness + 15 question demand + 15 actionability + 10 novelty + 10 local specificity + 10 follow-up potential + 5 social explainability. Subtract penalties for duplication, weak evidence, sensational framing and insufficient sourcing. This is a hypothesis to calibrate, not an objective truth score.
- Publish fast only when evidence is strong; high urgency with low confidence goes to verification, not automatic publishing.
- An interesting story is not automatically an important one; protect a quota for high-impact, low-virality public-interest reporting.
- Separate event timestamp from publication timestamp. Mark old stories recirculating as new.
- Maintain a watchlist of promised dates, pending decisions, hearings, recruitment results, project milestones and corrections.

## 6. Source hierarchy and verification policy
- **Tier 1:** primary evidence: official orders, filings, original research, direct public statements, verifiable datasets. Primary does not automatically mean unbiased or complete.
- **Tier 2:** independent credible reporting with named sources and editorial accountability.
- **Tier 3:** public community reports, social posts and tip submissions: leads, not established facts.
- Require claim-by-claim attribution. Seek independent corroboration for consequential contested claims. Distinguish allegation, opinion, forecast and confirmed fact.
- Do not fabricate interviews, quotes, photographs, expert opinions or on-the-ground observations. Never present an AI-generated synthesis as eyewitness reporting.
- Do not reproduce copyrighted articles; summarize facts independently and link to sources. Respect robots.txt, API licenses, paywalls and publishers' terms.
- Medical, legal, finance, elections, emergencies, allegations about identifiable people and stories involving minors need stronger review and qualified context.
- Maintain a public corrections log; notify followers of substantive corrections, not only exciting updates.

## 7. How Spill should write news
Sharp, curious, skeptical, warm; not cynical, falsely certain or outrage-driven. Plain English. Every story answers: What changed? Why should this user care? What do we know? What is disputed or unknown? What can the user do? What happens next?

| Format | Length | Best use |
| --- | --- | --- |
| Signal card | 40–80 words | Time-sensitive verified change |
| Quick explainer | 150–250 words | Context and consequence |
| Deep dive | 500–900 words | Complex contested or systemic issue |
| Living issue page | Continuously updated | Unresolved story with evidence timeline |
| Claim check | 100–300 words + evidence | Viral assertions and misinformation |
| Decision guide | 300–600 words | Practical comparison with tradeoffs |

Story template: (1) question headline, (2) one-sentence verified answer, (3) what happened and when, (4) why it matters for whom, (5) evidence and links, (6) what remains uncertain, (7) what to do / what to watch, (8) last verified update. Use a question headline only if the article actually answers it.

## 8. Example editorial transformation (fictional scenario)
Raw hypothetical lead: "A university publishes an updated internship eligibility notice." Do not publish as a real event without an official notice.
- Weak headline: "Big internship update shocks students!"
- Spill headline: "Did internship eligibility change for second-year students?"
- Sample lead: "A newly issued university notice appears to revise who can apply for the internship program. Before you apply, compare the eligibility table in the official notice with the previous version. We have not yet confirmed whether current applicants are grandfathered in."
- Useful sections: What changed (before/after table) · Who is affected · Application deadline · Official source · Open question · Follow this issue. Update only when a material change is verified.

## 9. Built-in network effects
| Mechanism | User action | Value for others | Safety constraint |
| --- | --- | --- | --- |
| Collective curiosity | Ask or endorse an unresolved question | Demand signals guide investigation | Prevent vote brigading |
| Local intelligence | Submit observation or public document | Better coverage of underreported issues | Verify; protect locations and identities |
| Evidence network | Add credible source or correction | Higher-quality answer | Reputation is not proof |
| Campus circles | Share verified opportunities and notices | Denser timely utility | Anti-harassment and minor safeguards |
| Living stories | Follow and contribute material updates | Longitudinal public knowledge | Correction history and source traceability |

Core graph: User ↔ Question ↔ Issue ↔ Event ↔ Evidence ↔ Community ↔ Follow-up. Don't build generic follower counts as the primary product. A network effect exists only if incremental participation measurably improves another user's experience.

## 10. Experiment program: first 30 days
| Week | Experiment | Success / failure signal |
| --- | --- | --- |
| 1 | Interview 12 people in each of four life stages; collect 500+ public questions; recruit a local pilot | Repeated urgent jobs and clear unmet gaps |
| 2 | Test three editorial promises: get ahead / affects me / understand conversation | User-rated usefulness and voluntary follow-through |
| 3 | Randomize question-first vs headline-first; brief vs explainer; finite digest vs feed | Meaningful read completion, comprehension, voluntary D7 return |
| 4 | Pilot living-story follows and collective question requests in one community | Verified contributions, return-to-story rate, D7/D30 directional trend |

Suggested exploratory program: 48 interviews, 60 opt-in seven-day diary participants, 500+ public questions, then a limited live cohort. These are proposed targets, not completed studies. Minors require appropriate consent and safeguards.

## 11. Experiment cards to run continuously
| Hypothesis | A/B treatment | Primary metric | Guardrail |
| --- | --- | --- | --- |
| Question-first earns attention | Question headline vs conventional headline | Qualified open / comprehension | Misleading click gap |
| Finite daily edition builds habit | Five-story digest vs infinite feed | Voluntary 7-day return | User satisfaction |
| Personal impact raises value | General summary vs consequence module | Reported usefulness / action | Accuracy and overpersonalization |
| Living follow-ups improve retention | Standalone story vs followable issue | Follow-up return rate | Unnecessary notifications |
| Community demand improves selection | Editor-only queue vs question voting | Answered high-value questions | Manipulation / popularity bias |
| Local density helps network effect | Concentrated campus vs scattered rollout | Useful verified updates per 100 users | Privacy and moderation incidents |

Cohort retention: D1, D7, D30 = percentage of acquired users active on the specified day; also track WAU/MAU, four voluntary active days per week, follow-up return, usefulness, trust, correction rate, verified contribution yield and notification-free retention. Page views are not retained value.

## 12. Launch playbook and cold start
- Choose one dense launch community: 2–3 Hyderabad colleges or a concentrated early-career neighborhood. Start with 3–5 issue categories, not a nationwide firehose.
- Seed 30–50 evergreen question pages and 10–20 genuinely active living issues, all with sources and clear last-updated dates.
- Recruit trusted local contributors and subject-matter reviewers; create clear submission and verification paths.
- Offer an immediate standalone answer before asking users to register. Ask for a follow only after a question proves useful.
- Make sharing convey a useful answer, not a generic referral plea. Preserve source attribution in shared previews.
- Set editorial service levels: urgent alerts reviewed promptly, routine digest daily, unresolved issues checked against explicit milestones.
- Publish community health dashboards: verified updates, questions resolved, corrections, median time to answer.

## 13. Production-ready agent instructions
**Scout:** "Monitor only approved sources for material developments affecting urban Indians aged 21–32. Look for immediate disruptions, opportunities, rules, costs, safety, credible breakthroughs, civic accountability, cultural context and follow-ups. For each candidate return structured fields: what changed, exact timestamp, affected people, location, original source, corroboration, plausible user questions, urgency, and what remains unverified. Do not invent details. Flag old or duplicated stories."

**Verifier:** "For every factual claim in the candidate, identify a source and supporting passage. Label confirmed, disputed, uncertain, opinion or forecast. Prefer primary records and independent corroboration for high-impact claims. Identify missing context and contradictions. Never fabricate quotations or citations. Return publish / hold / escalate with reasons."

**Writer:** "Write for an urban Indian aged 21–32 who wants to understand how this development affects their life. Lead with a truthful question or clear consequence, then answer directly. Include what changed, why it matters, evidence, uncertainty, practical next steps, and what to watch. Use concise conversational English without clickbait, manufactured outrage or unsupported certainty. Attribute every consequential claim. Preserve source links and update timestamp."

**Editor:** "Check the draft against the evidence ledger. Flag unsupported implications, incorrect dates, exaggeration, privacy risks, defamation, stereotypes, missing opposing context, stale information, and absent corrections. For high-risk topics require human sign-off. Output an explicit revision checklist and a final publication recommendation."

## 14. Data model and operating economics
Minimum entities: sources, raw_leads, events, claims, evidence, questions, issues, stories, revisions, communities, contributions, user_follows, notifications, experiments, outcomes, corrections. Preserve provenance and version history. Use unique event fingerprints for deduplication and per-source fetch schedules for cost control.

Lean architecture: scheduled source polling and approved feeds → queue → inexpensive extraction and dedupe → selective LLM verification / writing → human editorial queue → database and cache → app / digest. Spend expensive model calls on high-impact or ambiguous leads; cache source extracts and reuse evidence across versions. Estimate cost with real pilot volumes rather than claiming a fixed monthly figure.

## 15. Risks, governance and editorial red lines
- No automated publishing of high-risk allegations or unverified emergency information.
- Do not use engagement optimization to encourage fear, compulsive checking, polarization or harassment.
- Minimize data collected about users; special protections for under-18 users. Do not expose precise user locations or private submissions.
- Distinguish sponsored material from reporting; never let sponsors dictate verification outcomes.
- Offer accessible reporting, corrections, appeals and opt-outs; clearly disclose AI assistance.
- Evaluate disparate coverage: unpopular but important civic issues should not disappear because of low engagement.

## 16. Open questions and decisions
- Which launch cohort shows strongest repeated need: campus opportunity seekers or early-career urban professionals?
- What share of user value comes from fresh alerts vs evergreen explanations vs follow-up tracking?
- Can community contributions reliably improve accuracy and speed after verification costs?
- What is the minimum viable set of sources for trustworthy hyperlocal coverage?
- Which one metric best predicts sustained value: voluntary repeat visits, question resolution, or story-follow returns?

## Appendix: research notes and evidence boundaries
This document consolidates earlier strategic discussion and proposes a testable plan. Persona patterns, priority scores, network-effect strength, experiment targets and agent performance are hypotheses, not observed Spill results. Public sources useful for future validation: Reuters Institute Digital News Report (reutersinstitute.politics.ox.ac.uk), India government digital-access surveys (mospi.gov.in), Google Trends (trends.google.com), and publisher primary statements. Validate current statistics and source access terms before external publication.

**Editorial north star:** "What changed in the world that helps this person understand, decide, protect themselves, or get ahead, and how can their participation make the next answer better?"
