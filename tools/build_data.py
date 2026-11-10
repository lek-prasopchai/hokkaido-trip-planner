"""แปลงไฟล์ xlsx ต้นฉบับเป็น data/*.js (รันครั้งเดียวตอนเริ่มโปรเจกต์)

หลังจากนี้ให้แก้ข้อมูลที่ data/*.js โดยตรง ถ้ารันสคริปต์นี้ซ้ำจะเขียนทับไฟล์ที่สร้างจาก xlsx
(ไฟล์ที่เขียนมือ: hubs.js, transit.js, templates.js, guide.js จะไม่ถูกแตะ)

ใช้:  python tools/build_data.py [โฟลเดอร์ที่มี xlsx]   (ค่าเริ่มต้น ~/Downloads)
"""
import json, math, re, sys
from pathlib import Path
import openpyxl

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads"
OUT = Path(__file__).resolve().parent.parent / "data"
PREP = openpyxl.load_workbook(SRC / "Hokkaido_Winter_Drive_Prep.xlsx", data_only=True)
PLACES = openpyxl.load_workbook(SRC / "Hokkaido_Winter_Places.xlsx", data_only=True)


def rows(ws, start, min_filled=1):
    for r in ws.iter_rows(min_row=start, values_only=True):
        if sum(c is not None for c in r) >= min_filled:
            yield [("" if c is None else (c.strip() if isinstance(c, str) else c)) for c in r]


def write(name, var, data):
    OUT.mkdir(exist_ok=True)
    body = json.dumps(data, ensure_ascii=False, indent=1)
    (OUT / name).write_text(f"// สร้างจาก xlsx ด้วย tools/build_data.py แล้วแก้ต่อได้\nwindow.{var} = {body};\n", encoding="utf-8")
    print(name, len(data))


# ---------- สถานที่ ----------
AREA_HUB = {
    "ซัปโปโร": "sapporo", "โอตารุ": "otaru", "โยอิจิ": "otaru", "ชาโกตัน": "otaru",
    "โจซังเค": "jozankei", "นิเซโกะ": "niseko", "รุสุตสึ": "niseko", "เคียวโงกุ": "niseko",
    "จิโตเสะ": "chitose", "ทะเลสาบชิโกตสึ": "shikotsu", "ชิราโออิ": "noboribetsu",
    "โนโบริเบ็ตสึ": "noboribetsu", "มุโรรัน": "noboribetsu", "ทะเลสาบโทยะ": "toya",
    "ฮาโกดาเตะ": "hakodate", "โอนุมะ": "hakodate", "อาซาฮิคาวะ": "asahikawa",
    "อาซาฮิดาเกะ": "asahikawa", "บิเอ": "biei", "ชิโรงาเนะ (บิเอ)": "biei", "ฟูราโน่": "furano",
    "โซอุนเคียว": "sounkyo", "โทมามุ": "tomamu", "โอบิฮิโระ": "obihiro",
    "ทะเลสาบชิการิเบ็ตสึ": "obihiro", "คุชิโระ": "kushiro", "ทสึรุอิ": "kushiro",
    "ทะเลสาบอากัง": "akan", "มาชู / คาวายุ / คุชชาโระ": "kawayu", "อาบาชิริ": "abashiri",
    "อุโตโระ (ชิเรโตโกะ)": "utoro", "ราอุสุ": "utoro", "มนเบ็ตสึ": "monbetsu", "วักกาไน": "wakkanai",
}
INTERESTS = [
    ("festival", ["เทศกาล", "หมู่บ้านน้ำแข็ง"]),
    ("nature", ["ธรรมชาติ", "จุดชมวิว", "ภูเขา", "ล่องเรือ", "ถ่ายรูป"]),
    ("onsen", ["ออนเซ็น"]),
    ("snow", ["สกี", "เล่นหิมะ", "ฟาร์ม", "กิจกรรม"]),
    ("food", ["อาหาร", "ตลาด", "คาเฟ่", "ของหวาน", "โรงงาน"]),
    ("city", ["ช้อปปิ้ง", "เมือง", "พิพิธภัณฑ์", "ประวัติศาสตร์", "ศาลเจ้า", "ศิลปะ", "วัฒนธรรม", "ทัวร์"]),
    ("animals", ["สัตว์"]),
]


def hours(txt):
    t = str(txt)
    if "ค้างคืน" in t and "ครึ่ง" not in t:
        return 3.0
    if "ครึ่ง" in t:
        return 4.0
    if "วัน" in t:
        return 6.0
    nums = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", t)]
    if not nums:
        return 1.0
    v = sum(nums[:2]) / len(nums[:2])
    return round(v / 60 if "นาที" in t and "ชม" not in t else v, 2)


def fee(txt):
    t = str(txt).replace(",", "")
    m = re.search(r"¥\s*(\d+)", t)
    return int(m.group(1)) if m else 0


ws = PLACES["สถานที่ท่องเที่ยว"]
places = []
for r in rows(ws, 5, 3):
    if not isinstance(r[0], int):
        continue
    typ = r[8]
    tags = [k for k, words in INTERESTS if any(w in typ for w in words)]
    if "น้ำแข็ง" in r[3] + r[13] and "nature" not in tags:
        tags.append("nature")
    best = str(r[15])
    places.append({
        "id": r[0], "region": r[1], "area": r[2], "hub": AREA_HUB[r[2]], "name": r[3],
        "stars": len(str(r[6])), "pop": r[7], "type": typ, "tags": tags,
        "open": r[9], "closed": r[10], "fee": r[11], "feeYen": fee(r[11]),
        "dur": r[12], "hours": hours(r[12]), "highlight": r[13], "caution": r[14],
        "best": best, "evening": bool(re.search(r"ค่ำ|พลบค่ำ|พระอาทิตย์ตก|เย็น", best)),
        "parking": r[16], "ja": r[17],
        "lat": r[19] if r[19] != "" else None, "lng": r[20] if r[20] != "" else None,
        "acc": r[21],
    })
write("places.js", "PLACES", places)

# ---------- เทศกาล (ใส่ช่วงวันที่โดยประมาณสำหรับฤดู 2026–27 ให้เครื่องคำนวณได้) ----------
FEST = {  # ชื่อขึ้นต้น -> (hub, start, end)
    "Sapporo White": ("sapporo", "2026-11-21", "2026-12-25"),
    "Hakodate Christmas": ("hakodate", "2026-12-01", "2026-12-25"),
    "Goryokaku": ("hakodate", "2026-12-01", "2027-02-28"),
    "Tomamu Ice": ("tomamu", "2026-12-15", "2027-03-14"),
    "ขบวนเพนกวิน": ("asahikawa", "2026-12-20", "2027-03-15"),
    "ให้อาหารนกกระเรียน": ("kushiro", "2026-11-01", "2027-02-28"),
    "เทศกาลน้ำตกน้ำแข็งโซอุนเคียว": ("sounkyo", "2027-01-23", "2027-03-07"),
    "Jozankei": ("jozankei", "2027-01-25", "2027-02-05"),
    "เทศกาลน้ำแข็งทะเลสาบชิโกตสึ": ("shikotsu", "2027-01-30", "2027-02-23"),
    "Tokachigawa": ("obihiro", "2027-01-25", "2027-02-25"),
    "Shikaribetsu": ("obihiro", "2027-01-25", "2027-03-25"),
    "เรือตัดน้ำแข็ง Aurora": ("abashiri", "2027-01-20", "2027-03-31"),
    "Garinko": ("monbetsu", "2027-01-15", "2027-03-25"),
    "Sapporo Snow Festival": ("sapporo", "2027-02-04", "2027-02-11"),
    "Otaru Snow Light": ("otaru", "2027-02-06", "2027-02-13"),
    "Asahikawa Winter": ("asahikawa", "2027-02-05", "2027-02-11"),
    "Abashiri Drift": ("abashiri", "2027-02-05", "2027-02-15"),
    "Monbetsu Okhotsk": ("monbetsu", "2027-02-11", "2027-02-14"),
    "Onuma Winter": ("hakodate", "2027-02-06", "2027-02-07"),
    "Akan Lake Ice": ("akan", "2027-01-05", "2027-03-31"),
    "Drift Ice Walk": ("utoro", "2027-02-01", "2027-03-10"),
}
fest = []
for r in rows(PLACES["เทศกาลหน้าหนาว"], 5, 3):
    key = next((k for k in FEST if r[0].startswith(k)), None)
    if not key:
        continue
    hub, s, e = FEST[key]
    fest.append({"name": r[0], "area": r[1], "dates": r[2], "status": r[3], "detail": r[4],
                 "hub": hub, "start": s, "end": e})
write("festivals.js", "FESTIVALS", fest)

# ---------- ตารางระยะทางขับรถ ----------
NAME_ID = {
    "New Chitose Airport": "CTS", "Sapporo Station": "sapporo", "Otaru Canal": "otaru",
    "Jozankei Onsen": "jozankei", "Lake Toya Onsen": "toya", "Niseko Hirafu": "niseko",
    "Lake Shikotsu Onsen": "shikotsu", "Noboribetsu Onsen": "noboribetsu",
    "Hakodate Station": "hakodate", "Asahikawa Station": "asahikawa", "Biei Station": "biei",
    "Furano Station": "furano", "Sounkyo Onsen": "sounkyo", "Hoshino Resorts Tomamu": "tomamu",
    "Obihiro Station": "obihiro", "Kushiro Station": "kushiro", "Lake Akan Onsen": "akan",
    "Kawayu Onsen": "kawayu", "Abashiri Station": "abashiri", "Utoro Shiretoko": "utoro",
    "Monbetsu Port": "monbetsu", "Memanbetsu Airport": "MMB", "Wakkanai Cape Soya": "wakkanai",
}
drive = []
for r in rows(PLACES["ระยะทาง & เวลาขับ"], 5, 4):
    if r[0] in NAME_ID and r[1] in NAME_ID:
        drive.append({"a": NAME_ID[r[0]], "b": NAME_ID[r[1]], "km": r[2], "h": r[3],
                      "road": r[5], "risk": r[6], "high": str(r[6]).startswith("สูง")})
write("drive.js", "DRIVE_EDGES", drive)

# ---------- ถนนปิด ----------
roads = [{"road": r[0], "status": r[1], "effect": r[2], "alt": r[3]}
         for r in rows(PLACES["ถนนปิด & ช่องเขาเสี่ยง"], 5, 2) if not str(r[1]).startswith("http")]
write("roads.js", "ROADS", roads)

# ---------- รูทแนะนำจาก xlsx (ใช้เป็นข้อมูลอ้างอิงในหน้าการเดินทาง) ----------
routes, cur = [], None
for r in rows(PLACES["รูทแนะนำ"], 5):
    if isinstance(r[0], str) and re.match(r"^[A-E]\.", r[0]):
        cur = {"title": r[0], "desc": "", "days": []}
        routes.append(cur)
    elif cur and r[0] == "" and r[1] and r[1] != "รวม" and not cur["days"]:
        cur["desc"] = r[1]
    elif cur and isinstance(r[0], str) and r[0] and not r[1] and not cur["desc"]:
        cur["desc"] = r[0]
    elif cur and isinstance(r[0], int):
        cur["days"].append({"day": r[0], "route": r[1], "km": r[2], "h": r[3], "do": r[5], "stay": r[6]})
write("sample_routes.js", "SAMPLE_ROUTES", routes)

# ---------- เช็กลิสต์ของ ----------
packing = []
for r in rows(PREP["เช็กลิสต์ของ"], 5, 3):
    if not isinstance(r[0], int):
        continue
    packing.append({"id": r[0], "cat": r[1], "name": r[2], "prio": int(str(r[3])[0]),
                    "qty": r[4] or 1, "per": r[5], "source": r[8], "spec": r[13],
                    "shop": r[14], "bag": r[15]})
write("packing.js", "PACKING", packing)

# ---------- ไทม์ไลน์เตรียมตัว ----------
DRIVE_WORDS = ("ขับ", "รถ", "IDP", "Mapcode", "HEP")
prep = []
for i, r in enumerate(rows(PREP["ไทม์ไลน์เตรียมตัว"], 5, 3)):
    if not isinstance(r[1], int):
        continue
    prep.append({"id": f"x{i}", "phase": r[0], "days": r[1], "task": r[3], "detail": r[4], "cat": r[5],
                 "mode": "car" if r[5] == "ขับรถ" or any(w in r[3] for w in DRIVE_WORDS) else "all"})
write("prep.js", "PREP_TASKS", prep)

# ---------- เนื้อหาอ่านประกอบ ----------
def sectioned(ws, start, ncols):
    out, cur = [], None
    for r in rows(ws, start):
        filled = [c for c in r[:ncols] if c != ""]
        if len(filled) == 1 and re.match(r"^[A-G]\.", str(r[0])):
            cur = {"title": r[0], "items": []}
            out.append(cur)
        elif cur is not None and len(filled) >= 2:
            cur["items"].append([str(c) for c in r[:3]])
    return out

drive_tips = sectioned(PREP["ขับรถหน้าหนาว"], 5, 4)

daily, cur = [], None
for r in rows(PREP["เช็กประจำวัน"], 5):
    if r[0]:
        cur = {"title": r[0], "items": []}
        daily.append(cur)
    cur["items"].append({"text": r[1].replace("☐", "").strip(), "why": r[2]})

em = list(rows(PREP["ฉุกเฉิน & แอป"], 5))
contacts = [{"who": r[0], "num": str(r[1]), "when": r[2]} for r in em[:11]]
i_app = next(i for i, r in enumerate(em) if r[0] == "แอป")
i_ph = next(i for i, r in enumerate(em) if r[0] == "ภาษาไทย")
apps = [{"name": r[0], "use": r[1], "setup": r[2]} for r in em[i_app + 1:i_ph - 1]]
phrases = [{"th": r[0], "ja": r[1], "read": r[2]} for r in em[i_ph + 1:]]

rules = [{"topic": r[0], "rule": r[1], "detail": r[2]} for r in rows(PREP["กฎ & ข้อห้าม"], 5, 2)]
w = list(rows(PREP["อากาศ & ข้อมูล"], 5))
weather = [{"month": r[0], "hi": r[1], "lo": r[2], "sunset": r[3], "note": r[4]} for r in w[:4]]
facts = [{"k": r[0], "v": r[1]} for r in w[4:]]
memory = [{"cat": r[0], "item": r[1], "prio": int(str(r[2])[0]), "how": r[3]} for r in rows(PREP["เก็บความทรงจำ"], 5, 3)]
sources = [{"name": r[0], "url": r[1]} for r in rows(PREP["แหล่งข้อมูล"], 5, 2)] + \
          [{"name": r[0], "url": r[1]} for r in rows(PLACES["แหล่งข้อมูล"], 5, 2)]

write("sheet_content.js", "SHEET", {
    "driveTips": drive_tips, "daily": daily, "contacts": contacts, "apps": apps,
    "phrases": phrases, "rules": rules, "weather": weather, "facts": facts,
    "memory": memory, "sources": sources,
})

# ---------- เส้นขอบเกาะฮอกไกโด (ใช้ตอนออฟไลน์) ----------
geo = Path(__file__).resolve().parent / "japan.geojson"
if geo.exists():
    g = json.loads(geo.read_text(encoding="utf-8"))
    feat = next(f for f in g["features"] if f["properties"].get("id") == 1 or "北海道" in str(f["properties"]))
    polys = feat["geometry"]["coordinates"]
    if feat["geometry"]["type"] == "Polygon":
        polys = [polys]
    keep = []
    for p in polys:
        ring = p[0]
        if len(ring) < 60:  # ตัดเกาะเล็กมากทิ้ง
            continue
        step = max(1, len(ring) // 600)
        keep.append([[round(x, 3), round(y, 3)] for x, y in ring[::step]])
    write("outline.js", "HOKKAIDO_OUTLINE", keep)
else:
    print("ข้าม outline: ไม่พบ tools/japan.geojson")
