#!/usr/bin/env python3
"""SEO build for the Cyclone Arnab desk.
Reads public/cyclone/arnab.json (+ places.json) and:
  1. pre-renders the desk's text (title, meta, JSON-LD, headline, briefing, updates, districts, trains,
     helplines, FAQ, sources) straight into public/cyclone/index.html so Google sees it without JS;
  2. writes one static page per district (/cyclone/<district>) and /cyclone/trains;
  3. leaves the sitemap to build-areas.py, which picks up every public/cyclone/*.html.
Run after every arnab.json change (build-data.py runs it too). Facts only come from arnab.json."""
import json, os, re, math, subprocess, html
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
CY = os.path.join(PUB, "cyclone")
SITE = "https://spillthetea.news"
IST = timezone(timedelta(hours=5, minutes=30))
E = lambda s: html.escape(str(s if s is not None else ""), quote=True)
slug = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
tel = lambda n: "tel:" + re.sub(r"[^\d+]", "", str(n))


def km(a, b, c, d):
    t = math.radians
    h = math.sin(t(c - a) / 2) ** 2 + math.cos(t(a)) * math.cos(t(c)) * math.sin(t(d - b) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def first_published():
    try:
        out = subprocess.run(["git", "log", "--diff-filter=A", "--format=%cI", "--", "public/cyclone/arnab.json"],
                             cwd=ROOT, capture_output=True, text=True).stdout.strip().splitlines()
        return out[-1] if out else None
    except Exception:
        return None


def ssr(doc, el_id, inner):
    """Put pre-rendered HTML inside the element with this id (between <!--ssr--> markers; JS replaces it on load)."""
    pat = re.compile(r'(id="%s"[^>]*>)(?:<!--ssr-->.*?<!--/ssr-->)?' % re.escape(el_id), re.S)
    doc, n = pat.subn(lambda m: m.group(1) + "<!--ssr-->" + inner + "<!--/ssr-->", doc, count=1)
    if not n:
        print("build-cyclone: missing #" + el_id)
    return doc


def lvl_word(l):
    return {"red": "red alert", "orange": "orange alert"}.get(l, "no cyclone alert")


def main():
    D = json.load(open(os.path.join(CY, "arnab.json")))
    try:
        SP = json.load(open(os.path.join(CY, "places.json")))
    except Exception:
        SP = {}
    name = D.get("name", "Cyclone Arnab")
    upd = D.get("updated") or datetime.now(IST).isoformat(timespec="seconds")
    try:
        upd_dt = datetime.fromisoformat(upd)
    except Exception:
        upd_dt = datetime.now(IST)
    upd_txt = upd_dt.astimezone(IST).strftime("%-d %b %Y, %-I:%M %p IST")
    pub = first_published() or upd
    places = [dict(p, state=s.get("state", ""), swhat=s.get("what", "")) for s in D.get("districts", []) for p in s.get("places", [])]
    hit = [p for p in places if p.get("lvl") in ("red", "orange")]
    reds = [p["n"] for p in places if p.get("lvl") == "red"]
    trains = (D.get("trains") or {}).get("list", [])
    over = (D.get("moving") or {}).get("state") == "dissipated"

    # ---------- desk page ----------
    title = f"{name} live: tracker, district alerts, trains cancelled, helplines | Spill"
    desc = f"{name} live ({upd_txt}): {D.get('headline','')} Red alert: {', '.join(reds[:8])}. Control room numbers, shelters, hospitals, cancelled trains, flights, buses and roads."
    desc = desc[:300]
    faq = D.get("faq", [])
    ld = [
        {"@context": "https://schema.org", "@type": "NewsArticle", "headline": f"{name} live: {D.get('level','')}"[:110],
         "description": D.get("headline", ""), "datePublished": pub, "dateModified": upd,
         "mainEntityOfPage": SITE + "/cyclone/", "image": [SITE + "/og.png"],
         "author": {"@type": "Organization", "name": "Spill", "url": SITE},
         "publisher": {"@type": "Organization", "name": "Spill", "logo": {"@type": "ImageObject", "url": SITE + "/favicon.svg"}},
         "about": [{"@type": "Event", "name": name, "eventStatus": "https://schema.org/EventScheduled",
                    "location": {"@type": "Place", "name": "Coastal Andhra Pradesh, South Odisha and East Telangana"},
                    "startDate": pub, "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"}],
         "keywords": f"{name}, cyclone live, cyclone tracker, cyclone alert, Andhra Pradesh cyclone, Odisha cyclone, trains cancelled, {', '.join(p['n'] for p in hit)}"},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Spill", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": f"{name} live", "item": SITE + "/cyclone/"}]},
    ]
    if faq:
        ld.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in faq]})
    head = (f'<!--seo--><title>{E(title)}</title>\n<meta name="description" content="{E(desc)}">\n'
            f'<link rel="canonical" href="{SITE}/cyclone/"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">\n'
            f'<meta property="og:type" content="article"><meta property="og:site_name" content="Spill"><meta property="og:url" content="{SITE}/cyclone/">\n'
            f'<meta property="og:title" content="🌀 {E(name)} live: check your district"><meta property="og:description" content="{E(D.get("headline",""))}">'
            f'<meta property="og:image" content="{SITE}/og.png"><meta name="twitter:card" content="summary_large_image">\n'
            f'<meta property="article:modified_time" content="{E(upd)}"><meta property="article:published_time" content="{E(pub)}">\n'
            + "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>\n' for x in ld) + "<!--/seo-->")
    p = os.path.join(CY, "index.html")
    doc = open(p).read()
    if "<!--seo-->" in doc:
        doc = re.sub(r"<!--seo-->.*?<!--/seo-->", lambda m: head, doc, count=1, flags=re.S)
    else:
        doc = re.sub(r"<title>.*?</title>\n<meta name=\"description\"[^>]*>\n<meta property=\"og:title\".*?og:image\"[^>]*>", lambda m: head, doc, count=1, flags=re.S)
    doc = ssr(doc, "lvl", E(D.get("level", "")))
    doc = ssr(doc, "mv", E((D.get("moving") or {}).get("text", "")))
    doc = ssr(doc, "headline", E(D.get("headline", "")) + f" <small>Updated {E(upd_txt)}.</small>")
    doc = ssr(doc, "pick", "".join(f'<a href="/cyclone/{slug(p["n"])}" data-n="{E(p["n"])}">{"🔴" if p.get("lvl")=="red" else "🟠" if p.get("lvl")=="orange" else "🟢"} {E(p["n"])}</a> ' for p in places))
    doc = ssr(doc, "brief", "".join(f'<div><i>{E(b.get("e"))}</i><span>{E(b.get("t"))}</span></div>' for b in D.get("briefing", [])))
    doc = ssr(doc, "tl", "".join(f'<div class="u"><small>{E(u.get("t"))}</small><p>{E(u.get("e"))} {E(u.get("x"))} <em>· {E(u.get("src"))}</em></p></div>' for u in D.get("updates", [])))
    doc = ssr(doc, "tlist", "".join(f'<div class="tr"><b>{E(t[0])}</b><span>{E(t[1])} · {E(t[2])}</span><span class="x">{E(t[3])}</span></div>' for t in trains))
    doc = ssr(doc, "contacts", "".join(f'<details class="cg" open><summary>{E(g["group"])}</summary>' + "".join(f'<div class="r"><span>{E(i[0])}</span><a href="{tel(i[1])}">📞 {E(i[1])}</a></div>' for i in g["items"]) + "</details>" for g in D.get("contacts", [])))
    doc = ssr(doc, "faq", "".join(f'<details><summary>{E(f["q"])}</summary><p>{E(f["a"])}</p></details>' for f in faq))
    doc = ssr(doc, "sources", "".join(f'<li><a href="{E(u)}" target="_blank" rel="noopener">{E(t)}</a></li>' for t, u in D.get("sources", [])))
    open(p, "w").write(doc)

    # ---------- per-district + trains pages ----------
    CSS = ("body{margin:0;background:#0a0a0b;color:#f2f2f2;font:16px/1.6 system-ui,-apple-system,sans-serif}main{max-width:680px;margin:0 auto;padding:16px 16px 40px}"
           "a{color:#4fbcff}h1{font-size:24px;line-height:1.25;margin:8px 0}h2{font-size:17px;margin:24px 0 8px}.b{display:inline-block;font-weight:900;font-size:13px;border-radius:999px;padding:3px 10px}"
           ".red{background:#3a0e0e;color:#ff6b6b}.orange{background:#3a1d06;color:#ffb020}.safe{background:#13301f;color:#7ee2a8}.c{background:#151518;border:1px solid #2a2a30;border-radius:14px;padding:12px 14px;margin:8px 0}"
           ".call{display:inline-block;margin:4px 6px 4px 0;font-weight:800;background:#13301f;color:#7ee2a8;text-decoration:none;border-radius:999px;padding:8px 13px}"
           ".cta{display:block;text-align:center;font-weight:900;background:#ff4500;color:#fff;text-decoration:none;border-radius:999px;padding:14px;margin:18px 0}"
           "small,.m{color:#a3acb0}table{width:100%;border-collapse:collapse;font-size:14.5px}td{border-top:1px solid #2a2a30;padding:7px 4px;vertical-align:top}ul{padding-left:18px}")
    P = D.get("position") or {}
    others = " · ".join(f'<a href="/cyclone/{slug(x["n"])}">{E(x["n"])}</a>' for x in places)
    contacts_all = "".join(f'<a class="call" href="{tel(i[1])}">📞 {E(i[0])}: {E(i[1])}</a>' for g in D.get("contacts", [])[:2] for i in g["items"])
    upd_list = "".join(f'<li><small>{E(u.get("t"))}</small> {E(u.get("x"))} <small>· {E(u.get("src"))}</small></li>' for u in D.get("updates", [])[:6])
    train_rows = "".join(f"<tr><td><b>{E(t[0])}</b></td><td>{E(t[1])}<br><small>{E(t[2])}</small></td><td>{E(t[3])}</td></tr>" for t in trains)
    train_rows_short = "".join(f"<tr><td><b>{E(t[0])}</b></td><td>{E(t[1])}<br><small>{E(t[2])}</small></td><td>{E(t[3])}</td></tr>" for t in trains[:8])
    written = []
    for d in places:
        s = slug(d["n"])
        lv = d.get("lvl", "safe")
        dist = round(km(P.get("lat", 0), P.get("lon", 0), d["lat"], d["lon"])) if P else None
        near = []
        for kind in ("shelter", "hospital"):
            for x in SP.get(kind, []) if isinstance(SP.get(kind), list) else []:
                k = km(d["lat"], d["lon"], x["lat"], x["lon"])
                if k <= 35:
                    near.append((k, kind, x))
        near.sort(key=lambda z: z[0])
        near_html = "".join(
            f'<tr><td>{"🏠" if kind=="shelter" else "🏥"} <b>{E(x["name"])}</b><br><small>{E(x.get("addr") or x.get("kind",""))} · {k:.0f} km from {E(d["n"])} town</small></td>'
            f'<td>{"<a href=" + chr(34) + tel(x["phone"].split(";")[0]) + chr(34) + ">📞 " + E(x["phone"].split(";")[0]) + "</a><br>" if x.get("phone") else ""}'
            f'<a href="https://www.google.com/maps/dir/?api=1&destination={x["lat"]},{x["lon"]}" rel="nofollow noopener" target="_blank">🧭 Directions</a></td></tr>'
            for k, kind, x in near[:12])
        t = f"{name} {d['n']} live: {lvl_word(lv)}, control room, shelters, hospitals | Spill"
        ds = f"{name} in {d['n']} ({d.get('state','')}), {upd_txt}: {lvl_word(lv)}. {d.get('note') or d.get('swhat','')} Control room {d.get('cr') or '112'}. Nearest shelters and hospitals, trains cancelled."[:300]
        ldd = [{"@context": "https://schema.org", "@type": "NewsArticle", "headline": f"{name} in {d['n']}: {lvl_word(lv)}"[:110], "description": ds,
                "datePublished": pub, "dateModified": upd, "mainEntityOfPage": f"{SITE}/cyclone/{s}", "image": [SITE + "/og.png"],
                "author": {"@type": "Organization", "name": "Spill"}, "publisher": {"@type": "Organization", "name": "Spill", "logo": {"@type": "ImageObject", "url": SITE + "/favicon.svg"}},
                "contentLocation": {"@type": "Place", "name": f"{d['n']}, {d.get('state','')}", "geo": {"@type": "GeoCoordinates", "latitude": d["lat"], "longitude": d["lon"]}}},
               {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
                   {"@type": "ListItem", "position": 1, "name": "Spill", "item": SITE + "/"},
                   {"@type": "ListItem", "position": 2, "name": f"{name} live", "item": SITE + "/cyclone/"},
                   {"@type": "ListItem", "position": 3, "name": d["n"], "item": f"{SITE}/cyclone/{s}"}]}]
        calls = (f'<a class="call" href="{tel(d["cr"])}">📞 {E(d["n"])} control room: {E(d["cr"])}</a>' if d.get("cr") else "") + \
                (f'<a class="call" href="{tel(d["crn"])}">📞 Control room (mobile): {E(d["crn"])}</a>' if d.get("crn") else "") + \
                '<a class="call" href="tel:112">🚨 Emergency 112</a><a class="call" href="tel:108">🚑 Ambulance 108</a>' + \
                ('<a class="call" href="tel:1070">📞 AP disaster control 1070</a>' if d.get("state") == "Andhra Pradesh" else "")
        page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(t)}</title><meta name="description" content="{E(ds)}"><link rel="canonical" href="{SITE}/cyclone/{s}">
<meta property="og:title" content="🌀 {E(name)}: {E(d['n'])} {E(lvl_word(lv))}"><meta property="og:description" content="{E(ds)}"><meta property="og:image" content="{SITE}/og.png"><meta property="og:url" content="{SITE}/cyclone/{s}">
<link rel="icon" href="/favicon.svg"><meta name="theme-color" content="#0a0a0b">
{"".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in ldd)}
<style>{CSS}</style></head><body><main>
<p class="m"><a href="/">Spill</a> › <a href="/cyclone/">{E(name)} live</a> › {E(d['n'])}</p>
<h1>🌀 {E(name)} in {E(d['n'])}: <span class="b {E(lv)}">{E(lvl_word(lv).upper())}</span></h1>
<p class="m">{E(d.get('state',''))} · updated {E(upd_txt)}</p>
<div class="c"><p style="margin:0">{E(D.get('headline',''))}</p>{f'<p>The storm centre is about <b>{dist} km</b> from {E(d["n"])}. {E((D.get("moving") or {}).get("text",""))}</p>' if dist is not None and not over else ''}
<p>{E(d.get('swhat','') if lv != 'safe' else '')} {E(d.get('note',''))}</p>{f'<p>🏫 {E(d["school"])}</p>' if d.get('school') else ''}</div>
<h2>☎️ Who to call in {E(d['n'])}</h2><div>{calls}</div>
{f'<h2>🏠 Official safe places</h2><ul>' + ''.join(f'<li>{E(x)}</li>' for x in d.get('safe') or []) + '</ul>' if d.get('safe') else ''}
<a class="cta" href="/cyclone/?d={E(s)}&src=seo&c=district">📍 Open the live desk for {E(d['n'])}: map, wind, shelters near you</a>
{f'<h2>🏥 Shelters and hospitals near {E(d["n"])}</h2><table>{near_html}</table><p class="m">From OpenStreetMap (government hospitals and mapped cyclone shelters). Distances are from {E(d["n"])} town. For distances from where you are, use the live desk.</p>' if near_html else ''}
<h2>🚆 Trains cancelled or affected</h2>{f'<table>{train_rows_short}</table>' if train_rows_short else '<p>No cancellations listed.</p>'}<p class="m"><a href="/cyclone/trains"><b>See all {len(trains)} trains by number →</b></a> · Railway enquiry: <a href="tel:139">139</a></p>
<h2>📰 Latest updates</h2><ul>{upd_list}</ul>
<h2>☎️ Helplines</h2><div>{contacts_all}</div>
<h2>Other districts</h2><p>{others}</p>
<p class="m">Verified by Spill's agents from official statements and established outlets. In an emergency call 112.</p>
</main></body></html>"""
        open(os.path.join(CY, f"{s}.html"), "w").write(page)
        written.append(s)

    tp = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Trains cancelled due to {E(name)}: full list by train number | Spill</title>
<meta name="description" content="{E(f'{len(trains)} trains cancelled, diverted or affected by {name}, by train number and date ({upd_txt}). Check your train number; railway enquiry 139.')}">
<link rel="canonical" href="{SITE}/cyclone/trains"><link rel="icon" href="/favicon.svg">
<script type="application/ld+json">{json.dumps({"@context":"https://schema.org","@type":"NewsArticle","headline":f"Trains cancelled due to {name}","datePublished":pub,"dateModified":upd,"image":[SITE+"/og.png"],"author":{"@type":"Organization","name":"Spill"},"publisher":{"@type":"Organization","name":"Spill","logo":{"@type":"ImageObject","url":SITE+"/favicon.svg"}}}, ensure_ascii=False)}</script>
<style>{CSS}</style></head><body><main>
<p class="m"><a href="/">Spill</a> › <a href="/cyclone/">{E(name)} live</a> › Trains</p>
<h1>🚆 Trains cancelled due to {E(name)}</h1><p class="m">Updated {E(upd_txt)} · {E((D.get('trains') or {}).get('note',''))}</p>
<table>{train_rows}</table>
{('<h2>Local / MEMU routes suspended</h2><ul>' + ''.join(f'<li>{E(r)}</li>' for r in (D.get('trains') or {}).get('local', [])) + '</ul>') if (D.get('trains') or {}).get('local') else ''}
<p>Railway enquiry: <a class="call" href="tel:139">📞 139</a></p>
<a class="cta" href="/cyclone/?src=seo&c=trains#travel">Check your train number on the live desk</a>
<h2>Districts</h2><p>{others}</p></main></body></html>"""
    open(os.path.join(CY, "trains.html"), "w").write(tp)
    print(f"cyclone: desk pre-rendered, {len(written)} district pages + trains page")


if __name__ == "__main__":
    main()
