#!/usr/bin/env python3
"""Bundle content/<collection>/*.json into public/data/<collection>.json for the site.

Run after adding or editing any story:  python3 tools/build-data.py
Each output file is a list of {"id": ..., "data": {...}}.
"""
import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLLECTIONS = ["drops", "storylines", "live", "weekly", "now", "notifs", "acts"]
# Only the newest stories ship to readers; older ones stay in content/ as the archive.
LIMITS = {"drops": 160, "notifs": 30, "live": 80, "weekly": 40}
SORT_KEY = {"drops": "sort", "notifs": "ts", "live": "ts", "weekly": "date", "acts": "added"}

os.makedirs(os.path.join(ROOT, "public", "data"), exist_ok=True)
for col in COLLECTIONS:
    rows = []
    for path in glob.glob(os.path.join(ROOT, "content", col, "*.json")):
        with open(path, encoding="utf-8") as f:
            rows.append({"id": os.path.basename(path)[:-5], "data": json.load(f)})
    key = SORT_KEY.get(col)
    if key:
        rows.sort(key=lambda r: str(r["data"].get(key, "")) if key in ("sort", "date", "added") else (r["data"].get(key) or 0), reverse=True)
    if col in LIMITS:
        rows = rows[: LIMITS[col]]
    out = os.path.join(ROOT, "public", "data", f"{col}.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{col}: {len(rows)} -> public/data/{col}.json")
