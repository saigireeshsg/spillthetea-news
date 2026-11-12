#!/usr/bin/env python3
"""Build post-kit carousels from existing drops (no new research, no invented facts).
Usage: tools/mkcarousel.py <slot> <drop-id> [<drop-id> ...]     e.g. morning d20261112-hyd-musi-first-phase-1372-lakes
       tools/mkcarousel.py <slot> --auto [N]                     picks N (default 2) hottest city drops of the newest day that have an image
Writes content/carousels/<date>-<slot>-<n>.json, then run tools/build-data.py."""
import json, os, re, sys, glob, time
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cl = lambda s: re.sub(r"\s+", " ", str(s or "").replace("*", "")).strip()
def load(i):
    p = os.path.join(R, "content", "drops", i + ".json")
    return json.load(open(p, encoding="utf-8"))
def build(i, d):
    img = d.get("img") or {}; u = img.get("u") if isinstance(img, dict) else img; cr = img.get("c", "") if isinstance(img, dict) else ""
    srcs = d.get("sources") or []; src = srcs[0]["name"] if srcs else cr
    b = d.get("beats") or {}; viz = d.get("viz") or []; dig = next((c for c in d.get("cards", []) if c.get("k") == "dig"), {})
    area = next((a for a in d.get("areas", []) if a != "Hyderabad"), "Hyderabad")
    S = [{"k": "cover", "tag": area, "head": cl(d["hook"]), "body": "", "img": u, "credit": cr}]
    if b.get("what"): S.append({"k": "explain", "head": "What happened", "body": cl(b["what"]), "img": u, "credit": cr})
    if b.get("why"): S.append({"k": "explain", "head": "Why it matters", "body": cl(b["why"])})
    v = next((x for x in viz if x.get("t") == "big" and x.get("v")), None)
    f = (dig.get("facts") or [None])[0]
    if v: S.append({"k": "fact", "head": cl(v.get("l")), "big": cl(v["v"]), "body": cl(d.get("twist") or d.get("tldr"))})
    elif f: S.append({"k": "fact", "head": "Did you know", "big": cl(f.get("big")), "body": cl(f.get("t"))})
    if f and v: S.append({"k": "fact", "head": "Dig deeper", "big": cl(f.get("big")), "body": cl(f.get("t"))})
    qs = dig.get("qs") or []
    if d.get("watch") or qs: S.append({"k": "explain", "head": "What to watch", "body": cl(d.get("watch") or qs[0]) + ((" Ask: " + cl(qs[0])) if d.get("watch") and qs else "")})
    S.append({"k": "explain", "head": "Spill the tea, daily", "body": "Hyderabad news in 30 seconds, with the numbers and the questions. Follow for tomorrow's drop: spillthetea.news"})
    tags = "#Hyderabad #HyderabadNews #Telangana #Spill"
    cap_ig = f"{cl(d['hook'])}\n\n{cl(d.get('tldr'))}\n\nWhy it matters: {cl(b.get('why'))}\n\nSource: {src}. Image: {cr}\nMore at spillthetea.news\n\n{tags}"
    cap_x = "\n\n".join(["1/ " + cl(d["hook"]), "2/ " + cl(b.get("what") or d.get("tldr")), "3/ Why it matters: " + cl(b.get("why") or ""), "4/ Source: " + src + ". More Hyderabad news: spillthetea.news"])
    cap_yt = f"HOOK (0-3s): {cl(d['hook'])}\nWHAT (3-15s): {cl(b.get('what') or d.get('tldr'))}\nWHY (15-25s): {cl(b.get('why') or '')}\nCLOSE (25-30s): Follow Spill for Hyderabad's news, daily. Source: {src}."
    cap_li = f"{cl(d['hook'])}\n\n{cl(b.get('what') or d.get('tldr'))}\n\nWhy it matters: {cl(b.get('why') or '')}\n\nSource: {src}\n\n#Hyderabad #Telangana"
    return {"title": cl(d["hook"]), "ts": int(time.time() * 1000), "src": src, "drop": i, "slides": S, "captions": {"instagram": cap_ig, "x": cap_x, "youtube": cap_yt, "linkedin": cap_li}}
a = sys.argv[1:]
if len(a) < 2: sys.exit(__doc__)
slot, rest = a[0], a[1:]
if rest[0] == "--auto":
    n = int(rest[1]) if len(rest) > 1 else 2
    ds = sorted(((os.path.basename(p)[:-5], json.load(open(p, encoding="utf-8"))) for p in glob.glob(R + "/content/drops/*.json")), key=lambda x: x[1].get("sort", ""), reverse=True)
    ds = [x for x in ds if x[1].get("img") and x[1].get("layer", "city") == "city" and x[1].get("beats")]
    day = ds[0][1]["date"]; ids = [i for i, d in sorted((x for x in ds if x[1]["date"] == day), key=lambda x: -(x[1].get("heat") or 0))[:n]]
else: ids = rest
os.makedirs(R + "/content/carousels", exist_ok=True)
for k, i in enumerate(ids, 1):
    d = load(i); c = build(i, d); c["slot"] = slot
    out = f"{R}/content/carousels/{d.get('date', '')}-{slot}-{k}.json"; json.dump(c, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1); print(out)
