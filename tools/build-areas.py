#!/usr/bin/env python3
"""Static SEO pages: /area/<slug> for "water cut / power cut today in <area>, Hyderabad".
Server-rendered facts (area water status + latest water-crisis timeline) + live civic alerts fetched in the browser.
Water notes mirror public/area.js (keep both in sync). Run by tools/build-data.py; also writes sitemap.xml and robots.txt."""
import json, os, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
SITE = "https://spillthetea.news"
SINGUR = ("high", "Singur-fed: first in line", "Your water comes mainly from Singur, now about 11% full. Officials fear it could run dry by mid-December (about 50 days). Godavari water is being linked in at Velimela as a backup.")
CITY = ("watch", "City is about 20% short", "No area-specific warning yet. Hyderabad needs 735 MGD of water a day and gets 585. Fix leaks and store a day's water.")
AREAS = {
 "Madhapur": SINGUR, "HITEC City": SINGUR, "Gachibowli": SINGUR, "Kondapur": SINGUR,
 "Manikonda": CITY, "Kukatpally": CITY, "Miyapur": CITY,
 "Ameerpet": ("high", "Groundwater red zone", "Ameerpet is over-exploited for groundwater; the city's deepest level, 34.99 m, was recorded near here. Borewells may fail first."),
 "Banjara Hills": ("watch", "Next to red-zone mandals", "Khairatabad (over-exploited) and Shaikpet (critical) groundwater zones are around you. Expect weaker borewells."),
 "Jubilee Hills": ("watch", "Next to a critical zone", "Shaikpet's groundwater is rated critical. No supply cut announced for Jubilee Hills yet."),
 "Begumpet": CITY,
 "Secunderabad": ("watch", "Groundwater critical", "Secunderabad's groundwater is rated critical. No supply cut announced yet."),
 "Uppal": CITY, "LB Nagar": CITY, "Dilsukhnagar": CITY,
 "Mehdipatnam": ("watch", "Next to red-zone mandals", "Asifnagar and Golconda groundwater zones nearby are over-exploited. No supply cut announced yet."),
 "Old City": ("high", "Osman Sagar-fed and a groundwater red zone", "Old City leans on Osman Sagar, down to about 2.2 TMC, and Charminar's groundwater is over-exploited."),
 "Shamshabad": CITY,
}
slug = lambda a: a.lower().replace(" ", "-")
E_ = html.escape

def main():
    cfg = open(os.path.join(PUB, "config.js")).read()
    tl = []
    try:
        s = json.load(open(os.path.join(ROOT, "content/storylines/hyd-water-crisis.json")))
        tl = s.get("timeline", [])[-6:][::-1]
    except Exception: pass
    today = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(hours=5, minutes=30)
    upd = today.strftime("%d %b %Y, %I:%M %p IST")
    urls = []
    for a, (lvl, t, d) in AREAS.items():
        sl = slug(a); urls.append(f"{SITE}/area/{sl}")
        title = f"Water cut & power cut today in {a}, Hyderabad | Spill"
        desc = f"{a} water status: {t}. Live power cut, water cut and weather alerts for {a}, Hyderabad, updated through the day."
        others = " · ".join(f'<a href="/area/{slug(x)}">{E_(x)}</a>' for x in AREAS if x != a)
        tlh = "".join(f"<li><b>{E_(x['when'])}</b> {E_(x['what'])}</li>" for x in tl)
        app = f"/?src=seo&c=area-{sl}"
        page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E_(title)}</title><meta name="description" content="{E_(desc)}"><link rel="canonical" href="{SITE}/area/{sl}">
<meta property="og:title" content="{E_(title)}"><meta property="og:description" content="{E_(desc)}"><meta property="og:image" content="{SITE}/og.png">
<link rel="icon" href="/favicon.svg"><meta name="theme-color" content="#0a0a0b">
<script type="application/ld+json">{json.dumps({"@context":"https://schema.org","@type":"WebPage","name":title,"description":desc,"dateModified":today.strftime("%Y-%m-%d"),"about":{"@type":"Place","name":f"{a}, Hyderabad"}})}</script>
<style>:root{{--bg:#0a0a0b;--card:#17171a;--fg:#f2f2f2;--muted:#a3acb0;--line:#2e2e33;--o:#ff4500}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}}
main{{max-width:640px;margin:0 auto;padding:16px}}header{{display:flex;align-items:center;gap:8px;margin-bottom:14px}}header img{{width:34px;height:34px}}header b{{font-size:22px;font-weight:900;letter-spacing:-.03em}}
h1{{font-size:26px;line-height:1.2;margin:0 0 6px}}.u{{color:var(--muted);font-size:13px;margin:0 0 14px}}
.c{{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin:0 0 12px}}.c h2{{margin:0 0 6px;font-size:17px}}
.lv-high{{color:#ff6b4a}}.lv-watch{{color:#ffd166}}ul{{margin:0;padding-left:18px}}li{{margin:4px 0}}a{{color:#4fbcff}}
.cta{{display:block;text-align:center;background:var(--o);color:#fff;text-decoration:none;font-weight:800;border-radius:999px;padding:13px;margin:14px 0}}
.al{{border-top:1px solid var(--line);padding:8px 0}}.al:first-child{{border:0}}.al small{{color:var(--muted)}}.o{{font-size:13.5px;color:var(--muted)}}</style></head>
<body><main><header><img src="/favicon.svg" alt=""><b>spill</b></header>
<h1>Water cut &amp; power cut today in {E_(a)}</h1><p class="u">Hyderabad · page updated {upd}</p>
<section class="c"><h2>💧 Water status: <span class="lv-{lvl}">{E_(t)}</span></h2><p style="margin:0">{E_(d)}</p></section>
<section class="c" id="alerts"><h2>🚨 Alerts today</h2><p class="o" id="al-load">Checking today's power, water and weather alerts…</p></section>
<a class="cta" href="{app}">🔔 Get {E_(a)} alerts on Spill, free</a>
<section class="c"><h2>📈 Hyderabad water crisis: latest</h2><ul>{tlh}</ul></section>
<section class="c"><h2>Other areas</h2><p class="o" style="margin:0">{others}</p></section>
<p class="o">Sources: Telangana Today, The Hindu, Deccan Chronicle, The Siasat Daily and official notices, summarised by Spill. Every alert links to the original report.</p>
</main>
<script>{cfg}
(function(){{var C=window.SPILL_CONFIG,A={json.dumps(a)},box=document.getElementById("alerts"),ld=document.getElementById("al-load");
var since=new Date(Date.now()-20*3600e3).toISOString();
function esc(s){{return String(s==null?"":s).replace(/[&<>"']/g,function(c){{return{{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}}[c]}})}}
fetch(C.supabaseUrl+"/rest/v1/civic_alerts?select=id,kind,headline,publisher,url,published_at,created_at,details,note&created_at=gte."+since+"&order=published_at.desc&limit=12",{{headers:{{apikey:C.supabaseAnonKey,Authorization:"Bearer "+C.supabaseAnonKey}}}}).then(function(r){{return r.json()}}).then(function(L){{
 L=(L||[]).filter(function(x){{return x.note!=="not for readers"}});var re=new RegExp(A.replace(/ /g,"\\\\s*"),"i");
 var mine=L.filter(function(x){{return re.test([x.headline,JSON.stringify(x.details||{{}})].join(" "))}});
 var h=mine.length?"<p><b>"+mine.length+" alert"+(mine.length>1?"s":"")+" mention "+esc(A)+"</b></p>":"<p><b>✅ No power or water cut reported for "+esc(A)+" so far today.</b></p>";
 var show=(mine.length?mine:L).slice(0,5);if(show.length&&!mine.length)h+="<p class='o'>City-wide alerts:</p>";
 h+=show.map(function(x){{var d=x.details||{{}};return "<div class='al'><b>"+esc(d.push_title||x.headline)+"</b><br><small>"+esc(d.when||"")+(d.where?" · "+esc(d.where.slice(0,5).join(", ")):"")+" · <a href='"+esc(x.url)+"' rel='nofollow noopener' target='_blank'>source</a></small></div>"}}).join("");
 ld.remove();box.insertAdjacentHTML("beforeend",h)}}).catch(function(){{ld.textContent="Couldn't load live alerts. Open Spill for the latest."}})}})();
</script></body></html>"""
        os.makedirs(os.path.join(PUB, "area"), exist_ok=True)
        open(os.path.join(PUB, "area", f"{sl}.html"), "w").write(page)
    idx = "".join(f'<li><a href="/area/{slug(a)}">{E_(a)}</a> · {E_(v[1])}</li>' for a, v in AREAS.items())
    open(os.path.join(PUB, "area", "index.html"), "w").write(f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hyderabad water cut &amp; power cut today, area-wise | Spill</title><meta name="description" content="Area-wise water status, power cuts and water cuts today across Hyderabad: Madhapur, Gachibowli, Kukatpally, Ameerpet, Old City and more."><link rel="canonical" href="{SITE}/area/"><style>body{{margin:0;background:#0a0a0b;color:#f2f2f2;font:16px/1.6 system-ui,sans-serif}}main{{max-width:640px;margin:0 auto;padding:16px}}a{{color:#4fbcff}}</style></head><body><main><h1>Hyderabad water &amp; power cuts today, area-wise</h1><p>Updated {upd}. Pick your area:</p><ul>{idx}</ul><p><a href="/?src=seo&c=area-index">Open Spill for live alerts →</a></p></main></body></html>""")
    urls = [SITE + "/", SITE + "/area/"] + urls
    cy = os.path.join(PUB, "cyclone")
    if os.path.isdir(cy):  # Cyclone desk + district pages (tools/build-cyclone.py)
        urls = urls[:1] + [SITE + "/cyclone/"] + [SITE + "/cyclone/" + f[:-5] for f in sorted(os.listdir(cy)) if f.endswith(".html") and f != "index.html"] + urls[1:]
    open(os.path.join(PUB, "sitemap.xml"), "w").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"<url><loc>{u}</loc><lastmod>{today.strftime('%Y-%m-%d')}</lastmod><changefreq>hourly</changefreq></url>\n" for u in urls) + "</urlset>\n")
    open(os.path.join(PUB, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\nDisallow: /admin.html\nSitemap: {SITE}/sitemap.xml\n")
    print(f"areas: {len(AREAS)} -> public/area/")
if __name__ == "__main__": main()
