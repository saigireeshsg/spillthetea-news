#!/usr/bin/env python3
"""Compact drop builder. Usage: python3 tools/mkdrop.py specs.json   (list of specs)
Spec keys: slug, cat, city?, sort (0-99), heat?, hook (insight-led, 12 words max, *key number*), insight (one 'oh wow' line), hook_b, tldr, why, what, care, tea, poll{vt,q,opts}, src{name,title,url}|srcs[],
 img{u,c}?, big, bl, map{cause, event, effects[2]}, emoji[3]?, learn?, watch?
Writes content/drops/d<date>-<slug>.json with map, cover, viz filled from these fields."""
import json,sys,time,datetime
BG={"local":["#10243d","#2a6fb0"],"india":["#14281a","#3a8a52"],"world":["#0d1b2e","#25508a"],"money":["#2b0f0f","#c0392b"],"tech":["#1a1030","#6a3fb5"],"sport":["#2b1a10","#b5651d"],"planet":["#0f2a2a","#2e8b7a"],"edit":["#1c2340","#4a5fb0"],"campus":["#1c2340","#4a5fb0"]}
def build(s):
    today=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5,minutes=30))).strftime("%Y-%m-%d")
    em=s.get("emoji",["📰","📌","👥"]);m=s["map"]
    d={"cat":s["cat"],"lead":s["cat"],"date":today,"sort":f"{today}-{int(s.get('sort',60)):02d}","order":1,"heat":s.get("heat",3),"readSecs":30,
     "topic":s.get("topic",s["hook"][:40]),"hook":s["hook"],"hook_b":s.get("hook_b",s["hook"]),"tldr":s["tldr"],
     "beats":{"what":s["what"],"why":s["why"],"care":s["care"]},
     "map":{"causes":[{"icon":em[0],"label":m["cause"]}],"event":{"icon":em[1],"label":m["event"]},"effects":[{"icon":em[2],"label":x} for x in m["effects"]]},
     "cards":[{"k":"tea","title":"🆕 What's new","body":s["tea"]},{"k":"poll","vt":s["poll"].get("vt","stance"),"q":s["poll"]["q"],"opts":s["poll"]["opts"]}],
     "viz":[{"t":"big","v":s["big"],"l":s["bl"]}],"cover":{"bg":BG.get(s["cat"],BG["india"]),"big":s["big"],"label":s["bl"],"motion":"drift","scene":em},
     "insight":s.get("insight",""),"learn":{"t":s.get("learn","")},"watch":s.get("watch",""),"thread":s["slug"],"sources":s.get("srcs") or [s["src"]],"updated":int(time.time()*1000)}
    if s.get("city"):d["city"]=s["city"]
    if s.get("img"):d["img"]=s["img"]
    if not d["insight"]:del d["insight"]
    if not d["learn"]["t"]:del d["learn"]
    if not d["watch"]:del d["watch"]
    fn=f"content/drops/d{today.replace('-','')}-{s['slug']}.json";json.dump(d,open(fn,"w"),indent=1,ensure_ascii=False);return fn
if __name__=="__main__":
    for s in json.load(open(sys.argv[1])):print(build(s))
