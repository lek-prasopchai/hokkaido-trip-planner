"""รูปฐานที่พัก (เมือง) จาก Wikipedia/Wikimedia Commons -> data/extra_images.js
รันซ้ำได้: ข้ามที่มีรูปแล้ว   ใช้: python tools/fetch_more_images.py
"""
import json, time, urllib.parse
from pathlib import Path
from enrich_places import ROOT, fetch, wiki_page, commons_image

HUBS = {  # id -> ("ja", ชื่อหน้า ja.wikipedia) หรือ ("c", คำค้น Commons)
    "sapporo": ("ja", "札幌市"), "otaru": ("ja", "小樽運河"), "jozankei": ("ja", "定山渓温泉"), "chitose": ("ja", "千歳市"),
    "shikotsu": ("ja", "支笏湖"), "niseko": ("ja", "ニセコ町"), "noboribetsu": ("ja", "登別温泉"), "toya": ("ja", "洞爺湖温泉"),
    "hakodate": ("ja", "函館市"), "asahikawa": ("c", "Asahikawa Station"), "biei": ("ja", "美瑛町"), "furano": ("ja", "富良野市"),
    "sounkyo": ("c", "Sounkyo gorge"), "obihiro": ("ja", "帯広市"), "kushiro": ("ja", "釧路市"),
    "akan": ("ja", "阿寒湖温泉"), "kawayu": ("c", "Kawayu Onsen Teshikaga"), "abashiri": ("ja", "網走市"), "utoro": ("c", "Utoro Shiretoko"),
    "rausu": ("ja", "羅臼町"), "monbetsu": ("ja", "紋別市"), "wakkanai": ("ja", "稚内市"),
}
OUT = ROOT / "data" / "extra_images.js"


def grab(kind, key, src, folder, done):
    if key in done:
        return
    try:
        if src[0] == "ja":
            r = wiki_page(title=src[1])
            thumb, fname = (r[1], r[2]) if r and r[1] else (None, None)
        else:
            thumb, fname = commons_image(src[1]) or (None, None)
        if not thumb:
            print("none", kind, key); return
        d = ROOT / "img" / folder
        d.mkdir(parents=True, exist_ok=True)
        f = d / f"{key}{'.png' if thumb.lower().endswith('.png') else '.jpg'}"
        f.write_bytes(fetch(thumb))
        done[key] = {"img": f"img/{folder}/{f.name}", "credit": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(fname.replace(" ", "_"))}
        print(kind, key, fname)
    except Exception as e:
        print("ERR", kind, key, e)
    time.sleep(2)


def main():
    old = {"hubs": {}}
    if OUT.exists():
        t = OUT.read_text(encoding="utf-8")
        old["hubs"] = json.loads(t.split("window.HUB_IMG = ")[1].split(";\n")[0])
    for k, v in HUBS.items():
        grab("hub", k, v, "hubs", old["hubs"])
    OUT.write_text("// สร้างด้วย tools/fetch_more_images.py — รูปจาก Wikimedia Commons (credit = หน้าไฟล์ต้นทาง)\n"
                   f"window.HUB_IMG = {json.dumps(old['hubs'], ensure_ascii=False, indent=1)};\n", encoding="utf-8")
    print("hubs", len(old["hubs"]))


if __name__ == "__main__":
    main()
