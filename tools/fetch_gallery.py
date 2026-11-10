"""รูปเพิ่มต่อสถานที่ (แกลเลอรี สูงสุด 3 รูปรวมรูปหลัก) -> field imgs ใน data/places.js
ลำดับแหล่ง: รูปในบทความ Wikipedia (ja) ของที่นั้น -> ค้นใน Wikimedia Commons
รันซ้ำได้: ข้ามที่มีครบแล้ว   ใช้: cd tools && python fetch_gallery.py [noimg]   (noimg = เฉพาะที่ยังไม่มีรูปเลย)
"""
import json, re, sys, time, urllib.parse
from pathlib import Path
from enrich_places import ROOT, DATA, OVERRIDE, fetch, get

MAX = 3
SKIP = re.compile(r"map|logo|icon|flag|location|symbol|emblem|seal|地図|位置|紋章|signature|diagram|chart", re.I)
JA_API = "https://ja.wikipedia.org/w/api.php"
CM_API = "https://commons.wikimedia.org/w/api.php"


def infos(titles):
    """ชื่อไฟล์ -> (thumb, name) เฉพาะ jpeg/png ที่กว้างพอ"""
    if not titles:
        return []
    d = get(CM_API, {"action": "query", "titles": "|".join(titles[:20]), "prop": "imageinfo", "iiprop": "url|mime|size", "iiurlwidth": 640})
    out = []
    for p in (d.get("query") or {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") in ("image/jpeg", "image/png") and ii.get("width", 0) >= 400 and "thumburl" in ii:
            out.append((ii["thumburl"], p["title"].removeprefix("File:")))
    order = {t.removeprefix("File:"): i for i, t in enumerate(titles)}
    return sorted(out, key=lambda x: order.get(x[1], 99))


def candidates(p):
    o = OVERRIDE.get(p["ja"], {})
    files = []
    if "commons" not in o:
        title = o.get("ja")
        if not title:
            s = get(JA_API, {"action": "query", "list": "search", "srsearch": p["ja"], "srlimit": 1})["query"]["search"]
            title = s[0]["title"] if s else None
        if title:
            d = get(JA_API, {"action": "query", "prop": "images", "titles": title, "imlimit": 30, "redirects": 1})
            page = next(iter(d["query"]["pages"].values()))
            files = [i["title"].replace("ファイル:", "File:") for i in page.get("images", []) if not SKIP.search(i["title"])]
    found = infos(files)
    if len(found) < MAX:
        q = o.get("commons") or p["ja"]
        d = get(CM_API, {"action": "query", "list": "search", "srsearch": f"{q} filetype:bitmap", "srnamespace": 6, "srlimit": 8})
        found += infos([r["title"] for r in d["query"]["search"] if not SKIP.search(r["title"])])
    return found


def main():
    text = DATA.read_text(encoding="utf-8")
    head, body = text.split("window.PLACES = ", 1)
    places = json.loads(body.rstrip().rstrip(";"))
    for p in places:
        imgs = p.get("imgs") or ([{"img": p["img"], "credit": p["imgCredit"]}] if p.get("img") else [])
        if len(imgs) >= MAX or ("noimg" in sys.argv and imgs):
            continue
        have = {urllib.parse.unquote(i["credit"].rsplit("File:", 1)[1]).replace("_", " ") for i in imgs}
        try:
            for thumb, name in candidates(p):
                if len(imgs) >= MAX:
                    break
                if name.replace("_", " ") in have:
                    continue
                dest = ROOT / "img" / "places" / f"{p['id']}_{len(imgs) + 1}{'.png' if thumb.lower().endswith('.png') else '.jpg'}"
                dest.write_bytes(fetch(thumb))
                imgs.append({"img": f"img/places/{dest.name}", "credit": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(name.replace(" ", "_"))})
                have.add(name.replace("_", " "))
                time.sleep(2)
        except Exception as e:
            print("ERR", p["id"], e)
        p["imgs"] = imgs
        if imgs and not p.get("img"):
            p["img"], p["imgCredit"] = imgs[0]["img"], imgs[0]["credit"]
        print(p["id"], p["ja"], len(imgs), [i["credit"].rsplit("File:", 1)[1][:50] for i in imgs[1:]], flush=True)
        DATA.write_text(head + "window.PLACES = " + json.dumps(places, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
