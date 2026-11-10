"""v2: เติมข้อมูลสถานที่เดิม (ชื่ออังกฤษ ฤดู การเดินทาง เว็บทางการ) + เพิ่มสถานที่ยอดนิยมทุกฤดู

พิกัด: COORD (ใส่เอง ประมาณ) > Wikipedia ญี่ปุ่น > OpenStreetMap Nominatim  /  รูป: Wikipedia/Wikimedia Commons เท่านั้น
รันซ้ำได้: ข้ามสถานที่ที่มีอยู่แล้ว (เทียบชื่อ) และที่มีรูปแล้ว — ราคา/เวลาเป็นค่าประมาณ (≈) ตรวจ พ.ย. 2026
ใช้:  python tools/v2_places.py   แล้วต่อด้วย  python tools/fetch_gallery.py
"""
import json, re, sys, time, urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from enrich_places import ROOT, DATA, IMG, fetch, get, wiki_page, commons_image  # noqa: E402

ALL = list(range(1, 13))
W = [12, 1, 2, 3]

# ---------- เติมสถานที่เดิม (id → field) ----------
EN = {
    1: "Odori Park", 2: "Sapporo TV Tower", 3: "Sapporo Clock Tower", 4: "Susukino Ramen Yokocho", 5: "Nijo Market", 6: "Mt. Moiwa Ropeway",
    7: "Okurayama Ski Jump Stadium", 8: "Shiroi Koibito Park", 9: "Sapporo Beer Museum", 10: "Moerenuma Park", 11: "Hokkaido Jingu Shrine",
    12: "Historical Village of Hokkaido", 13: "Takino Suzuran Hillside Park", 14: "Sapporo Teine", 15: "Jozankei Onsen", 16: "Hoheikyo Onsen",
    17: "Otaru Canal", 18: "Otaru Music Box Museum", 19: "Kitaichi Hall", 20: "Sankaku Market", 21: "Mt. Tengu Ropeway", 22: "Nikka Whisky Yoichi Distillery",
    23: "Cape Kamui", 24: "Niseko Grand Hirafu", 25: "Milk Kobo (Takahashi Farm)", 26: "Rusutsu Resort", 27: "Fukidashi Park (Kyogoku)",
    28: "Chitose Salmon Aquarium", 29: "New Chitose Airport", 30: "Lake Shikotsu Ice Festival", 31: "Marukoma Onsen", 32: "Upopoy National Ainu Museum",
    33: "Noboribetsu Jigokudani (Hell Valley)", 34: "Noboribetsu Bear Park", 35: "Lake Oyunuma", 36: "Cape Chikyu", 37: "Mt. Usu Ropeway", 38: "Silo Observatory",
    39: "Mt. Hakodate Ropeway", 40: "Kanemori Red Brick Warehouse", 41: "Hakodate Morning Market", 42: "Goryokaku Tower", 43: "Hachimanzaka Slope",
    44: "Hakodate Tropical Botanical Garden", 45: "Onuma Quasi-National Park", 46: "Asahiyama Zoo", 47: "Asahikawa Ramen Village", 48: "Otokoyama Sake Brewery Museum",
    49: "Asahidake Ropeway", 50: "Shirogane Blue Pond", 51: "Ken & Mary Tree", 52: "Shikisai no Oka", 53: "Shirahige Waterfall",
    54: "Tokachidake Onsen Ryounkaku", 55: "Ningle Terrace", 56: "Furano Ski Resort", 57: "Furano Cheese Factory", 58: "Farm Tomita",
    59: "Sounkyo Ice Waterfall Festival", 60: "Ginga & Ryusei Falls", 61: "Kurodake Ropeway", 62: "Hoshino Resorts Tomamu Ice Village", 63: "Frost Tree Terrace",
    64: "Tokachigawa Onsen", 65: "Pancho (Butadon)", 66: "Lake Shikaribetsu Kotan", 67: "Hosooka Observatory (Kushiro Marsh)", 68: "Washo Market",
    69: "Tsurui-Ito Tancho Crane Sanctuary", 70: "Otowa Bridge", 71: "Akan International Crane Center", 72: "Lake Akan Ainu Kotan", 73: "Lake Mashu Observatory No.1",
    74: "Mt. Io (Iozan)", 75: "Sunayu (Lake Kussharo)", 76: "Bihoro Pass", 77: "Kawayu Onsen", 78: "Icebreaker Aurora (Abashiri)", 79: "Abashiri Prison Museum",
    80: "Okhotsk Drift Ice Museum", 81: "Garinko-go III Icebreaker", 82: "Utoro Drift Ice Walk", 83: "Oshinkoshin Falls", 84: "Shiretoko Five Lakes",
    85: "Rausu Drift Ice & Eagle Cruise", 86: "Cape Soya", 87: "Hitsujigaoka Observation Hill", 88: "Maruyama Zoo", 89: "Tanukikoji Shopping Street",
    90: "JR Tower Observatory T38", 91: "Sapporo Snow Festival Tsudome Site", 92: "LeTAO Main Store", 93: "Mt. Showa-shinzan", 94: "Yunokawa Onsen",
    95: "Trappistine Convent", 96: "Snow Crystal Museum", 97: "Furano Marche", 98: "Fukiage Open-Air Onsen", 99: "Rokkatei Obihiro Main Store",
    100: "Kushiro Fisherman's Wharf MOO (Robatayaki)", 101: "Akanko Ainu Theater Ikor", 102: "Cape Notoro", 103: "Furepe Falls", 104: "Okhotsk Tower",
}
MONTHS = {14: [12, 1, 2, 3, 4], 24: [12, 1, 2, 3, 4], 56: [12, 1, 2, 3], 62: W, 63: W, 30: [1, 2], 59: [1, 2, 3], 66: [1, 2, 3], 78: [1, 2, 3], 82: [2, 3],
          85: [2, 3], 91: [2], 69: [10, 11, 12, 1, 2, 3], 70: [11, 12, 1, 2, 3]}
FLOWER = {13, 52, 58, 45}
SN = {
    1: dict(spring="ไลแลค ปลาย พ.ค.", summer="Beer Garden ก.ค.–ส.ค.", autumn="Autumn Fest อาหาร ก.ย.", winter="เทศกาลหิมะ ก.พ. • ไฟ White Illumination"),
    11: dict(spring="ซากุระ ต้น พ.ค.", winter="ศาลเจ้ากลางหิมะ ไหว้ปีใหม่"),
    13: dict(summer="ทุ่งดอกไม้ น้ำตก", winter="เล่นหิมะ สไลเดอร์ สกีครอสคันทรี"),
    33: dict(autumn="ใบไม้เปลี่ยนสีรอบหุบเขา ต.ค.", winter="ไอน้ำร้อนตัดกับหิมะ"),
    39: dict(winter="วิวกลางคืนใสสุด แต่ลมแรง", summer="ฟ้าเปิดบ่อย วิวกลางคืนอันดับต้นของญี่ปุ่น"),
    42: dict(spring="ซากุระรอบป้อมรูปดาว ต้น พ.ค.", winter="Hoshi-akari ไฟประดับป้อม ธ.ค.–ก.พ."),
    45: dict(summer="เรือ/จักรยานรอบทะเลสาบ", autumn="ใบไม้เปลี่ยนสี ปลาย ต.ค.", winter="ทะเลสาบน้ำแข็ง ตกปลาวากาซางิ"),
    49: dict(summer="ดอกไม้อัลไพน์ เดินรอบบ่อ", autumn="ใบไม้เปลี่ยนสีเร็วที่สุดในญี่ปุ่น กลาง–ปลาย ก.ย.", winter="สกีหิมะผง"),
    50: dict(summer="น้ำสีฟ้าใส สวยสุด พ.ค.–ต.ค.", winter="ไฟประดับกลางคืน บ่อคลุมหิมะ"),
    51: dict(summer="ทุ่งเนินสลับสีแพตช์เวิร์ก", winter="ต้นไม้เดี่ยวกลางทุ่งหิมะ"),
    52: dict(summer="ทุ่งดอกไม้หลากสีเป็นแถบ ก.ค.–ก.ย.", winter="Snow Land ขี่สโนว์โมบิล"),
    58: dict(summer="ทุ่งลาเวนเดอร์ม่วง กลาง ก.ค.", winter="ร้านเปิดบางส่วน ทุ่งเป็นหิมะ"),
    61: dict(autumn="ใบไม้เปลี่ยนสี กลาง ก.ย.", winter="สกี ชมหุบเขาหิมะ"),
    67: dict(summer="ทุ่งพรุเขียว ล่องเรือคานู", winter="ทุ่งหิมะ นกกระเรียน"),
    73: dict(summer="ทะเลสาบสีฟ้าจัด (หมอกลงบ่อย)", winter="ทะเลสาบไม่แข็ง วิวหิมะ"),
    76: dict(autumn="ทะเลหมอกยามเช้า", winter="วิวทะเลสาบคุชชาโระน้ำแข็ง"),
    84: dict(summer="ทางเดินยกระดับเหนือทุ่ง วิวเทือกเขา (ระวังหมี)", winter="เดินสโนว์ชูกับไกด์เท่านั้น"),
}
URL = {
    2: "https://www.tv-tower.co.jp/", 6: "https://mt-moiwa.jp/", 7: "https://okurayama-jump.jp/", 8: "https://www.shiroikoibitopark.jp/", 10: "https://moerenumapark.jp/",
    11: "https://www.hokkaidojingu.or.jp/", 12: "https://www.kaitaku.or.jp/", 13: "https://www.takinopark.com/", 22: "https://www.nikka.com/distilleries/yoichi/",
    24: "https://grand-hirafu.jp/", 26: "https://rusutsu.com/", 32: "https://ainu-upopoy.jp/", 34: "https://bearpark.jp/", 39: "https://334.co.jp/",
    42: "https://www.goryokaku-tower.co.jp/", 46: "https://www.city.asahikawa.hokkaido.jp/asahiyamazoo/", 49: "https://asahidake.hokkaido.jp/",
    58: "https://www.farm-tomita.co.jp/", 62: "https://www.snowtomamu.jp/", 79: "https://www.kangoku.jp/", 84: "https://www.goko.go.jp/",
    88: "https://www.city.sapporo.jp/zoo/", 92: "https://www.letao.jp/", 99: "https://www.rokkatei.co.jp/", 1: "https://www.snowfes.com/",
}
TR = {
    6: dict(lv="ok", t="รถรางถึงป้าย Ropeway-iriguchi แล้วรถรับส่งฟรี"), 7: dict(lv="limited", t="รถไฟใต้ดินสาย Tozai ถึง Maruyama-koen + บัส JR ~15 นาที"),
    8: dict(lv="ok", t="รถไฟใต้ดินสาย Tozai สถานี Miyanosawa เดิน 7 นาที"), 10: dict(lv="limited", t="รถไฟใต้ดินสาย Toho ถึง Kanjo-dori-higashi + บัส ~25 นาที"),
    12: dict(lv="limited", t="บัสจากสถานี Shin-Sapporo ~15 นาที"), 13: dict(lv="limited", t="รถไฟใต้ดินสาย Namboku ถึง Makomanai + บัส ~35 นาที"),
    14: dict(lv="limited", t="บัสสกีจากโรงแรมในซัปโปโร (หน้าหนาว)"), 15: dict(lv="ok", t="บัส Jotetsu / Kappa Liner จากสถานีซัปโปโร ~70 นาที"),
    16: dict(lv="limited", t="บัสต่อจากโจซังเค ~15 นาที"), 21: dict(lv="ok", t="บัสจากสถานีโอตารุ ~20 นาที"), 22: dict(lv="ok", t="JR ถึงสถานียอยจิ เดิน 3 นาที"),
    23: dict(lv="limited", t="บัส Chuo จากโอตารุ ~2 ชม. วันละไม่กี่เที่ยว"), 25: dict(lv="car"), 27: dict(lv="limited", t="บัสจากคุจจัง ~30 นาที"),
    32: dict(lv="ok", t="JR ถึงสถานีชิราโออิ เดิน 10 นาที"), 33: dict(lv="ok", t="บัสจาก JR โนโบริเบ็ตสึ ~15 นาที แล้วเดิน"), 34: dict(lv="ok", t="กระเช้าจากเมืองออนเซ็น"),
    37: dict(lv="limited", t="บัสจากโทยะออนเซ็น ~15 นาที วันละไม่กี่เที่ยว"), 93: dict(lv="limited", t="บัสจากโทยะออนเซ็น ~15 นาที วันละไม่กี่เที่ยว"),
    39: dict(lv="ok", t="รถรางถึง Jujigai เดิน 10 นาที"), 42: dict(lv="ok", t="รถรางถึง Goryokaku-koen-mae เดิน 15 นาที"), 44: dict(lv="ok", t="รถรางถึงยุโนคาวะออนเซ็น เดิน 15 นาที"),
    45: dict(lv="ok", t="JR ถึงสถานี Onuma-koen เดิน 3 นาที"), 46: dict(lv="ok", t="บัสสาย 41/47 จากสถานีอาซาฮิคาวะ ~40 นาที"),
    49: dict(lv="limited", t="บัส Ideyu จากสถานีอาซาฮิคาวะ ~1.5 ชม. วันละ 3–4 เที่ยว"), 50: dict(lv="limited", t="บัส Dohoku จากสถานีบิเอ ~20 นาที วันละไม่กี่เที่ยว"),
    51: dict(lv="car", t="ไม่มีบัส — แท็กซี่/ทัวร์/เช่าจักรยาน (หน้าร้อน) จากสถานีบิเอ"), 52: dict(lv="limited", t="JR ถึงสถานี Bibaushi เดิน 25 นาที / แท็กซี่"),
    55: dict(lv="limited", t="บัสจากสถานีฟูราโน่ ~15 นาที"), 58: dict(lv="limited", t="JR ถึงสถานีนากะฟูราโน่ เดิน 25 นาที (หน้าร้อนมีสถานีชั่วคราว Lavender Batake)"),
    60: dict(lv="limited", t="เดิน ~30 นาที/แท็กซี่จากเมืองโซอุนเคียว"), 61: dict(lv="ok", t="อยู่ในเมืองโซอุนเคียว"), 62: dict(lv="ok", t="JR ถึงสถานีโทมามุ + รถรับส่งรีสอร์ต"),
    63: dict(lv="ok", t="อยู่ในรีสอร์ตโทมามุ"), 67: dict(lv="limited", t="JR สาย Senmo ถึง Kushiro-Shitsugen เดิน 15 นาที (วันละไม่กี่เที่ยว)"),
    69: dict(lv="tour", t="บัสท่องเที่ยวหน้าหนาว (Akan Bus) / ทัวร์จากคุชิโระ"), 70: dict(lv="tour", t="ทัวร์เช้ามืดจากคุชิโระ/ทสึรุอิ"),
    73: dict(lv="tour", t="บัสท่องเที่ยวหน้าหนาวจากคาวายุ / แท็กซี่"), 74: dict(lv="limited", t="เดิน ~40 นาทีจากสถานีคาวายุออนเซ็น / แท็กซี่"),
    78: dict(lv="ok", t="บัสจากสถานีอาบาชิริ ~10 นาที"), 79: dict(lv="ok", t="บัสท่องเที่ยวจากสถานีอาบาชิริ ~10 นาที"), 81: dict(lv="ok", t="บัส/แท็กซี่จากใจกลางมนเบ็ตสึ"),
    82: dict(lv="tour", t="ทัวร์รับที่โรงแรมในอุโตโระ"), 84: dict(lv="tour", t="หน้าหนาวไปกับทัวร์สโนว์ชูเท่านั้น"), 85: dict(lv="ok", t="ท่าเรือในเมืองราอุสุ (เรือออกเช้า)"),
    86: dict(lv="limited", t="บัส Soya จากสถานีวักกาไน ~50 นาที วันละ 4–5 เที่ยว"), 88: dict(lv="ok", t="รถไฟใต้ดิน Maruyama-koen + เดิน 15 นาที"),
    91: dict(lv="ok", t="รถไฟใต้ดิน Sakaemachi + บัสรับส่ง"), 98: dict(lv="car"),
}

# ---------- สถานที่ใหม่ (ทุกฤดู) ----------
def P(hub, area, name, en, ja, stars, pop, type_, tags, open_, closed, fee, dur, hours, hl, caution, best, parking, months=ALL, sn=None, url="", tr=None, evening=False, wiki=None):
    return dict(hub=hub, area=area, name=name, en=en, ja=ja, stars=stars, pop=pop, type=type_, tags=tags, open=open_, closed=closed, fee=fee, dur=dur, hours=hours,
                highlight=hl, caution=caution, best=best, parking=parking, months=months, sn=sn or {}, url=url, tr=tr, evening=evening, wiki=wiki)

NEW = [
    P("sapporo", "ซัปโปโร (มาโกมาไน)", "เนินหัวพระใหญ่ มาโกมาไน", "Hill of the Buddha", "頭大仏", 3, "ดังมาก", "ศิลปะ / ศาสนา", ["city", "nature", "flower"],
      "≈9:00–16:00 (หน้าหนาว) / ≈9:00–17:00", "-", "≈¥300–500 (ค่าบูชา)", "1 ชม.", 1, "พระใหญ่โผล่หัวเหนือเนินลาเวนเดอร์ ออกแบบโดยทาดาโอะ อันโดะ ในสุสานมีโมอายและสโตนเฮนจ์",
      "หน้าหนาวเนินคลุมหิมะ ทางเดินลื่น", "ก.ค. (ลาเวนเดอร์) / หิมะคลุมหัวพระ", "ฟรี", sn=dict(summer="ลาเวนเดอร์คลุมเนิน ก.ค.", winter="หิมะคลุมเนิน เหลือแต่หัวพระ", spring="เนินหญ้าเขียว"),
      url="https://www.takinoreien.com/", tr=dict(lv="limited", t="รถไฟใต้ดินสาย Namboku ถึง Makomanai + บัส Chuo ~25 นาที"), wiki="真駒内滝野霊園"),
    P("sapporo", "ซัปโปโร", "Sapporo Factory (ห้างในโรงเบียร์เก่า)", "Sapporo Factory", "サッポロファクトリー", 1, "ดัง", "ช้อปปิ้ง", ["city", "food"],
      "≈10:00–20:00", "-", "ฟรี", "1.5 ชม.", 1.5, "ห้างในอาคารโรงเบียร์อิฐเก่า ต้นคริสต์มาสยักษ์ในโดมกระจก", "", "บ่าย–ค่ำ", "มี (เสียเงิน)",
      tr=dict(lv="ok", t="รถไฟใต้ดินสาย Tozai สถานี Bus Center-mae เดิน 5 นาที")),
    P("sapporo", "ซัปโปโร", "อาคารรัฐบาลเก่าอิฐแดง (Akarenga)", "Former Hokkaido Government Office (Akarenga)", "北海道庁旧本庁舎", 2, "ดัง", "ประวัติศาสตร์", ["city"],
      "≈8:45–18:00", "ตรวจ", "ฟรี", "30 นาที", 0.5, "อาคารอิฐแดงสไตล์นีโอบาโรก ปี 1888 สัญลักษณ์ของซัปโปโร สวนด้านหน้าสวยทุกฤดู", "ปิดปรับปรุงใหญ่ช่วงปี 2019–2025 ตรวจว่าเปิดเต็มแล้วหรือยัง",
      "กลางวัน", "ไม่มี (เดินจากสถานี)", tr=dict(lv="ok", t="เดิน 7 นาทีจากสถานีซัปโปโร")),
    P("sapporo", "ซัปโปโร (มาโกมาไน)", "สวนศิลปะซัปโปโร (Sapporo Art Park)", "Sapporo Art Park", "札幌芸術の森", 1, "คนรู้จักน้อย", "ศิลปะ / สวน", ["city", "nature"],
      "≈9:45–17:00", "ตรวจ", "≈¥700 (สวนประติมากรรม)", "1.5 ชม.", 1.5, "สวนประติมากรรมกลางแจ้งในป่า 70 ชิ้น พิพิธภัณฑ์ศิลปะ", "สวนประติมากรรมปิดหน้าหนาว", "กลางวัน", "เสียเงิน",
      months=[4, 5, 6, 7, 8, 9, 10, 11], sn=dict(autumn="ใบไม้เปลี่ยนสีในสวน ต.ค."), tr=dict(lv="limited", t="รถไฟใต้ดิน Makomanai + บัส ~15 นาที")),
    P("sapporo", "ซัปโปโร", "มหาวิทยาลัยฮอกไกโด (ถนนต้นแปะก๊วย)", "Hokkaido University Ginkgo Avenue", "北海道大学", 2, "ดัง", "สวน / ใบไม้เปลี่ยนสี", ["nature", "city"],
      "ตลอดเวลา", "-", "ฟรี", "1 ชม.", 1, "วิทยาเขตกว้างใจกลางเมือง ถนนแปะก๊วยเหลืองทอง ถนนต้นป็อปลาร์ รูปปั้นดร.คลาร์ก", "เป็นสถานศึกษา เงียบ ไม่เข้าอาคารเรียน", "ปลาย ต.ค.", "ไม่มี",
      sn=dict(autumn="ถนนแปะก๊วยสีทอง ปลาย ต.ค.–ต้น พ.ย.", summer="สนามหญ้า ต้นป็อปลาร์", winter="วิทยาเขตในหิมะ"), tr=dict(lv="ok", t="เดิน 10 นาทีจากสถานีซัปโปโร")),
    P("sapporo", "คิตะฮิโรชิมะ", "Mitsui Outlet Park ซัปโปโร คิตะฮิโรชิมะ", "Mitsui Outlet Park Sapporo Kitahiroshima", "三井アウトレットパーク 札幌北広島", 1, "ดัง", "ช้อปปิ้ง", ["city"],
      "≈10:00–20:00", "-", "ฟรี", "2 ชม.", 2, "เอาท์เล็ตใหญ่สุดในฮอกไกโด แบรนด์ญี่ปุ่น/ต่างประเทศ ฟู้ดคอร์ต อยู่ระหว่างซัปโปโรกับสนามบิน", "", "กลางวัน", "ฟรี",
      tr=dict(lv="limited", t="บัสจากสถานีชินซัปโปโร/สนามบิน ~30 นาที"), wiki="三井アウトレットパーク札幌北広島"),
    P("sapporo", "คิตะฮิโรชิมะ", "ES CON Field Hokkaido (สนามเบสบอล)", "ES CON Field Hokkaido", "エスコンフィールドHOKKAIDO", 2, "ดัง", "กีฬา / ช้อปปิ้ง", ["city", "food"],
      "วันแข่ง/ทัวร์สนาม (ตรวจตาราง)", "ตรวจ", "ทัวร์ ≈¥2,000 / ตั๋วแข่ง", "3 ชม.", 3, "สนามเบสบอลหลังคาเปิดได้ของ Fighters มีออนเซ็นและโรงเบียร์ในสนาม", "วันแข่งคนแน่นมาก", "ค่ำ (วันแข่ง)", "เสียเงิน",
      months=[3, 4, 5, 6, 7, 8, 9, 10], sn=dict(summer="ฤดูเบสบอล มี.ค.–ก.ย."), tr=dict(lv="limited", t="JR ถึงสถานีคิตะฮิโรชิมะ + บัสรับส่ง ~5 นาที"), evening=True),
    P("sapporo", "ซัปโปโร", "ตลาดนอกซัปโปโร (Jogai Ichiba)", "Sapporo Curb Market", "札幌場外市場", 2, "ดัง", "ตลาด / อาหาร", ["food"],
      "≈6:00–14:00", "ร้านส่วนใหญ่เปิดทุกวัน", "ค่าอาหาร", "1 ชม.", 1, "ปูขน ข้าวหน้าซีฟู้ด ร้านอาหารเช้า ราคาถูกกว่าตลาดนิโจ", "ร้านปิดเร็ว ไปก่อนเที่ยง", "เช้า", "มีลานจอด",
      tr=dict(lv="ok", t="รถไฟใต้ดินสาย Tozai Nijuyonken เดิน 7 นาที")),
    P("jozankei", "ซัปโปโร (ภูเขา)", "Sapporo Kokusai (สกี)", "Sapporo Kokusai Ski Resort", "札幌国際スキー場", 2, "ดัง", "สกี", ["snow"],
      "≈9:00–17:00 (พ.ย.–พ.ค.)", "-", "ลิฟต์ ≈¥6,000/วัน", "1 วัน", 5, "ลานสกีใกล้ซัปโปโร หิมะดี เหมาะมือใหม่ เช่าชุดครบ", "ถนนขึ้นเขาหิมะหนา", "กลางวัน", "ฟรี",
      months=[12, 1, 2, 3, 4], tr=dict(lv="ok", t="บัสสกีจากใจกลางซัปโปโร ~90 นาที")),
    P("otaru", "โอตารุ", "Otaru Aquarium", "Otaru Aquarium", "おたる水族館", 2, "ดัง", "สวนสัตว์", ["animals"],
      "≈9:00–16:00", "ปิดปรับปรุงช่วงปลาย พ.ย.–กลาง ธ.ค. (ตรวจ)", "≈¥1,800", "2 ชม.", 2, "หน้าหนาว: ขบวนเพนกวินเดินบนหิมะ / หน้าร้อน: โชว์สิงโตทะเลในทะเลจริง", "", "กลางวัน", "เสียเงิน",
      sn=dict(winter="ขบวนเพนกวินเดินบนหิมะ", summer="โชว์สิงโตทะเล/วอลรัสในทะเลจริง"), tr=dict(lv="ok", t="บัสจากสถานีโอตารุ ~25 นาที")),
    P("otaru", "ชาโกตัน", "หาดชิมามุย (Shakotan Blue)", "Shimamui Coast (Shakotan Blue)", "島武意海岸", 2, "ดัง", "ธรรมชาติ / จุดชมวิว", ["nature", "food"],
      "ตลอดเวลา", "-", "ฟรี", "45 นาที", 0.75, "อ่าวน้ำทะเลสีฟ้า 'ชาโกตันบลู' ผ่านอุโมงค์เล็ก • ฤดูหอยเม่น (อูนิ) มิ.ย.–ส.ค.", "ทางลงหาดชัน", "กลางวัน แดดออก", "ฟรี",
      months=[5, 6, 7, 8, 9, 10], sn=dict(summer="น้ำฟ้าใสสุด + อูนิสด"), tr=dict(lv="limited", t="บัสจากโอตารุ ~1.5 ชม. วันละไม่กี่เที่ยว")),
    P("otaru", "อาไกกาวะ", "Kiroro Resort (สกี)", "Kiroro Resort", "キロロリゾート", 2, "ดัง", "สกี / รีสอร์ต", ["snow"],
      "≈9:00–16:30", "-", "ลิฟต์ ≈¥7,000/วัน", "1 วัน", 5, "หิมะตกเยอะที่สุดแห่งหนึ่งในฮอกไกโด หิมะผงลึก", "ถนนขึ้นเขาหิมะหนา", "กลางวัน", "ฟรี",
      months=[12, 1, 2, 3, 4], tr=dict(lv="limited", t="บัสจากซัปโปโร/โอตารุ (หน้าหนาว)")),
    P("otaru", "โอตารุ", "ล่องเรือคลองโอตารุ", "Otaru Canal Cruise", "小樽運河クルーズ", 2, "ดัง", "ล่องเรือ", ["city"],
      "≈9:30–21:00 (รอบค่ำสวยสุด)", "-", "≈¥2,000", "45 นาที", 0.75, "ล่องเรือ 40 นาทีผ่านโกดังเก่า ตะเกียงแก๊ส ไกด์เล่าประวัติ", "หน้าหนาวลมเย็นมาก", "ค่ำ", "ลานจอดเสียเงิน",
      tr=dict(lv="ok", t="เดิน 10 นาทีจากสถานีโอตารุ"), evening=True),
    P("otaru", "โอตารุ", "ธนาคารแห่งญี่ปุ่นเก่า สาขาโอตารุ", "Former Bank of Japan Otaru Museum", "日本銀行旧小樽支店金融資料館", 1, "คนรู้จักน้อย", "พิพิธภัณฑ์", ["city"],
      "≈9:30–17:00", "พุธ", "ฟรี", "45 นาที", 0.75, "อาคารธนาคารหินยุคเมจิ ห้องนิรภัย ลองยกเงิน 100 ล้านเยน", "", "กลางวัน", "ไม่มี",
      tr=dict(lv="ok", t="เดิน 10 นาทีจากสถานีโอตารุ")),
    P("niseko", "นิเซโกะ", "บึงชินเซนนุมะ", "Shinsen-numa Pond", "神仙沼", 2, "คนรู้จักน้อย", "ธรรมชาติ", ["nature"],
      "ตลอดเวลา (ถนนเปิด มิ.ย.–ต.ค.)", "-", "ฟรี", "1 ชม.", 1, "ทางเดินไม้ในพรุบนภูเขา บึงสะท้อนท้องฟ้า", "ถนนปิดหน้าหนาว มีหมี", "กลางวัน", "ฟรี",
      months=[6, 7, 8, 9, 10], sn=dict(autumn="ใบไม้เปลี่ยนสี ปลาย ก.ย.–ต้น ต.ค.", summer="ดอกไม้ในพรุ"), tr=dict(lv="car")),
    P("niseko", "นิเซโกะ", "ล่องแก่งแม่น้ำชิริเบ็ตสึ", "Niseko Rafting", "尻別川", 2, "ดัง", "ธรรมชาติ / กิจกรรม", ["nature"],
      "รอบเช้า/บ่าย (จองล่วงหน้า)", "-", "≈¥7,000", "3 ชม.", 3, "ล่องแก่งในแม่น้ำใสใต้ภูเขาโยเทย์ แรงสุดช่วงหิมะละลาย พ.ค.", "ต้องว่ายน้ำได้ เด็กเล็กมีขั้นต่ำอายุ", "พ.ค.–มิ.ย.", "ที่บริษัททัวร์",
      months=[4, 5, 6, 7, 8, 9, 10], sn=dict(spring="น้ำแรงสุดช่วงหิมะละลาย"), tr=dict(lv="tour", t="บริษัททัวร์รับที่โรงแรมฮิราฟุ")),
    P("chitose", "จิโตเสะ", "Chitose Outlet Mall Rera", "Chitose Outlet Mall Rera", "千歳アウトレットモール・レラ", 1, "ดัง", "ช้อปปิ้ง", ["city"],
      "≈10:00–20:00", "-", "ฟรี", "1.5 ชม.", 1.5, "เอาท์เล็ตใกล้สนามบินนิวจิโตเสะ 10 นาที แวะวันกลับได้", "", "วันกลับ", "ฟรี",
      tr=dict(lv="ok", t="JR ถึงสถานีมินามิจิโตเสะ เดิน 3 นาที")),
    P("shikotsu", "ทะเลสาบชิโกตสึ", "ทะเลสาบชิโกตสึ (เรือท้องกระจก/คายัค)", "Lake Shikotsu", "支笏湖", 2, "ดัง", "ธรรมชาติ", ["nature"],
      "เรือ ≈ เม.ย.–พ.ย.", "-", "เรือ ≈¥1,650", "1.5 ชม.", 1.5, "ทะเลสาบใสที่สุดในญี่ปุ่น เรือท้องกระจกเห็นหินใต้น้ำ คายัค", "", "กลางวัน", "เสียเงิน",
      sn=dict(summer="น้ำใสสีฟ้า เรือท้องกระจก/คายัค", autumn="ใบไม้เปลี่ยนสีริมทะเลสาบ", winter="ทะเลสาบไม่แข็ง ไอหมอกเช้า"), tr=dict(lv="ok", t="บัส Chuo จากสถานีจิโตเสะ ~45 นาที")),
    P("noboribetsu", "โนโบริเบ็ตสึ", "Noboribetsu Date Jidaimura (หมู่บ้านเอโดะ)", "Noboribetsu Date Jidaimura (Edo Wonderland)", "登別伊達時代村", 1, "ดัง", "สวนสนุก / วัฒนธรรม", ["city"],
      "≈9:00–16:00", "-", "≈¥3,300", "2.5 ชม.", 2.5, "หมู่บ้านยุคเอโดะ โชว์นินจา แต่งชุดซามูไร/เกอิชา", "", "กลางวัน", "ฟรี", tr=dict(lv="limited", t="บัสจากสถานี JR โนโบริเบ็ตสึ ~10 นาที")),
    P("noboribetsu", "โนโบริเบ็ตสึ", "แช่เท้าลำธารร้อนธรรมชาติ (โอยุนุมะ)", "Oyunuma River Natural Footbath", "大湯沼川天然足湯", 2, "ดัง", "ออนเซ็น / ธรรมชาติ", ["onsen", "nature"],
      "ตลอดเวลา (ทางเดินปิดหน้าหนาว)", "-", "ฟรี", "1 ชม.", 1, "ลำธารน้ำพุร้อนกลางป่า นั่งแช่เท้าบนแท่นไม้", "เตรียมผ้าเช็ดเท้า", "กลางวัน", "ลานโอยุนุมะ",
      months=[5, 6, 7, 8, 9, 10, 11], sn=dict(autumn="ใบไม้เปลี่ยนสี ต.ค."), tr=dict(lv="limited", t="เดิน ~30 นาทีจากเมืองออนเซ็น")),
    P("noboribetsu", "โนโบริเบ็ตสึ", "Noboribetsu Marine Park Nixe", "Noboribetsu Marine Park Nixe", "登別マリンパークニクス", 1, "ดัง", "สวนสัตว์", ["animals"],
      "≈9:00–17:00", "ตรวจ", "≈¥2,900", "2 ชม.", 2, "อควาเรียมในปราสาทสไตล์เดนมาร์ก ขบวนเพนกวิน", "", "กลางวัน", "เสียเงิน",
      tr=dict(lv="ok", t="เดิน 5 นาทีจากสถานี JR โนโบริเบ็ตสึ")),
    P("toya", "ทะเลสาบโทยะ", "ดอกไม้ไฟทะเลสาบโทยะ (ทุกคืน)", "Lake Toya Long-Run Fireworks", "洞爺湖ロングラン花火大会", 2, "ดัง", "เทศกาล", ["festival"],
      "≈20:45 ทุกคืน 20 นาที (ปลาย เม.ย.–ต.ค.)", "-", "ฟรี", "30 นาที", 0.5, "ดอกไม้ไฟจากเรือกลางทะเลสาบทุกคืน 6 เดือน ดูจากริมทะเลสาบหน้าโรงแรม", "", "ค่ำ", "ใช้ที่จอดโรงแรม",
      months=[4, 5, 6, 7, 8, 9, 10], tr=dict(lv="ok", t="เดินจากโรงแรมโทยะออนเซ็น"), evening=True),
    P("hakodate", "มัตสึมาเอะ", "ปราสาทมัตสึมาเอะ (ซากุระ)", "Matsumae Castle", "松前城", 2, "ดัง", "ประวัติศาสตร์ / ซากุระ", ["city", "flower"],
      "≈9:00–17:00 (เม.ย.–ธ.ค.)", "ปิด ธ.ค.–เม.ย.", "≈¥360", "1.5 ชม.", 1.5, "ปราสาทญี่ปุ่นแห่งเดียวในฮอกไกโด ซากุระ 250 สายพันธุ์", "ไกลจากฮาโกดาเตะ ~2 ชม.", "ปลาย เม.ย.–พ.ค.", "ฟรี",
      months=[4, 5, 6, 7, 8, 9, 10, 11], sn=dict(spring="ซากุระ ปลาย เม.ย.–กลาง พ.ค."), tr=dict(lv="limited", t="บัสจาก JR Kikonai ~1.5 ชม.")),
    P("hakodate", "ฮาโกดาเตะ (โมโตมาจิ)", "หอประชุมเมืองฮาโกดาเตะเก่า", "Old Public Hall of Hakodate Ward", "旧函館区公会堂", 2, "ดัง", "ประวัติศาสตร์", ["city"],
      "≈9:00–17:00", "ตรวจ", "≈¥300", "45 นาที", 0.75, "อาคารไม้สีฟ้า-เหลืองยุคเมจิ เช่าชุดฮาคามะ/ชุดราตรีถ่ายรูป วิวอ่าว", "", "กลางวัน", "ไม่มี",
      tr=dict(lv="ok", t="รถรางถึง Suehirocho เดิน 7 นาที")),
    P("biei", "บิเอ", "สวนชมวิวชินเออิโนะโอกะ", "Shinei no Oka Observation Park", "新栄の丘展望公園", 2, "ดัง", "จุดชมวิว", ["nature", "flower"],
      "ตลอดเวลา", "-", "ฟรี", "30 นาที", 0.5, "เนินดูพระอาทิตย์ตกที่ดีที่สุดในบิเอ ทุ่งดอกไม้ วิวเทือกเขาโทคาจิ", "", "เย็น", "ฟรี",
      sn=dict(summer="ทุ่งดอกไม้ พระอาทิตย์ตก", winter="ทุ่งหิมะสีชมพูตอนเย็น"), tr=dict(lv="car", t="แท็กซี่/จักรยานจากสถานีบิเอ")),
    P("biei", "บิเอ", "สวนชมวิวโฮคุเซโนะโอกะ (พีระมิด)", "Hokusei no Oka Observation Park", "北西の丘展望公園", 1, "คนรู้จักน้อย", "จุดชมวิว", ["nature"],
      "ตลอดเวลา (ศูนย์ข้อมูล เม.ย.–ต.ค.)", "-", "ฟรี", "30 นาที", 0.5, "หอชมวิวทรงพีระมิด มองทุ่งแพตช์เวิร์กและเทือกเขาไทเซ็ตสึ", "", "กลางวัน", "ฟรี",
      tr=dict(lv="limited", t="เดิน ~20 นาทีจากสถานีบิเอ")),
    P("furano", "คามิฟูราโน่", "Jet Coaster Road (ถนนขึ้นลงเนิน)", "Jet Coaster Road", "ジェットコースターの路", 2, "ดัง", "จุดชมวิว / ถ่ายรูป", ["nature"],
      "ตลอดเวลา", "-", "ฟรี", "20 นาที", 0.35, "ถนนตรงขึ้นลงเนินยาว 4 กม. ระหว่างทุ่งนา", "ห้ามหยุดรถกลางถนนถ่ายรูป จอดในจุดที่กำหนด", "กลางวัน", "จุดจอดเล็ก",
      months=[5, 6, 7, 8, 9, 10], tr=dict(lv="car")),
    P("biei", "คามิฟูราโน่", "Kanno Farm (ทุ่งดอกไม้)", "Kanno Farm", "かんのファーム", 2, "ดัง", "ทุ่งดอกไม้", ["flower", "nature"],
      "≈9:00–17:00 (มิ.ย.–ก.ย.)", "-", "ฟรี", "45 นาที", 0.75, "ทุ่งดอกไม้เป็นแถบสีบนเนิน วิวเทือกเขาโทคาจิ ไม่แออัดเท่าฟาร์มโทมิตะ", "", "ก.ค.", "ฟรี",
      months=[6, 7, 8, 9], sn=dict(summer="ลาเวนเดอร์ + ดอกไม้หลากสี ก.ค.–ส.ค."), tr=dict(lv="limited", t="JR ถึงสถานี Bibaushi เดิน 30 นาที / แท็กซี่")),
    P("biei", "ชิโรงาเนะ", "ชิโรงาเนะ ออนเซ็น", "Shirogane Onsen", "白金温泉", 2, "ดัง", "ออนเซ็น", ["onsen"],
      "ออนเซ็นไปกลับ ≈¥800–1,500", "แต่ละที่", "≈¥800–1,500", "1–2 ชม.", 1.5, "เมืองออนเซ็นเชิงภูเขาไฟโทคาจิ ใกล้บ่อสีฟ้าและน้ำตกชิราฮิเกะ", "", "เย็น", "ตามโรงแรม",
      tr=dict(lv="limited", t="บัส Dohoku จากสถานีบิเอ ~30 นาที")),
    P("furano", "คามิฟูราโน่", "Flower Land Kamifurano", "Flower Land Kamifurano", "フラワーランドかみふらの", 2, "ดัง", "ทุ่งดอกไม้", ["flower", "nature"],
      "≈9:00–17:00", "-", "ฟรี (รถชมทุ่งเสียเงิน)", "1 ชม.", 1, "ทุ่งดอกไม้ 15 เฮกตาร์ ลาเวนเดอร์ ทิวลิป ทานตะวัน รถแทรกเตอร์ชมทุ่ง", "", "ก.ค.", "ฟรี",
      months=[5, 6, 7, 8, 9, 10], sn=dict(summer="ลาเวนเดอร์ ก.ค.", spring="ทิวลิป พ.ค."), tr=dict(lv="car", t="แท็กซี่จากสถานีคามิฟูราโน่")),
    P("furano", "คามิฟูราโน่", "สวนฮิโนเดะ (ลาเวนเดอร์)", "Hinode Park", "日の出公園 (上富良野町)", 1, "ดัง", "ทุ่งดอกไม้", ["flower"],
      "ตลอดเวลา", "-", "ฟรี", "45 นาที", 0.75, "เนินลาเวนเดอร์ หอระฆังแต่งงาน วิวเมืองคามิฟูราโน่", "", "ก.ค.", "ฟรี",
      months=[6, 7, 8], sn=dict(summer="ลาเวนเดอร์ ต้น–กลาง ก.ค."), tr=dict(lv="ok", t="เดิน 15 นาทีจากสถานี JR คามิฟูราโน่"), wiki="日の出公園 (上富良野町)"),
    P("furano", "คามิฟูราโน่", "Lavender East (ทุ่งลาเวนเดอร์ใหญ่สุด)", "Lavender East", "ラベンダーイースト", 1, "คนรู้จักน้อย", "ทุ่งดอกไม้", ["flower"],
      "≈9:00–16:30 (ก.ค. เท่านั้น)", "-", "ฟรี (รถแทรกเตอร์เสียเงิน)", "45 นาที", 0.75, "ทุ่งลาเวนเดอร์ใหญ่สุดในญี่ปุ่นของฟาร์มโทมิตะ ม่วงสุดสายตา", "เปิดเฉพาะเดือน ก.ค.", "ก.ค.", "ฟรี",
      months=[7], tr=dict(lv="car")),
    P("sounkyo", "คามิกาวะ", "Hokkaido Ice Pavilion (ห้องน้ำแข็ง -20°C)", "Hokkaido Ice Pavilion", "北海道アイスパビリオン", 1, "คนรู้จักน้อย", "พิพิธภัณฑ์", ["city"],
      "≈8:30–17:30", "-", "≈¥1,000", "45 นาที", 0.75, "ห้องน้ำแข็ง -20°C ทั้งปี เดินในถ้ำน้ำแข็ง (ให้ยืมเสื้อกันหนาว)", "", "หน้าร้อน (คลายร้อน)", "ฟรี",
      tr=dict(lv="limited", t="แท็กซี่จากสถานีคามิกาวะ")),
    P("asahikawa", "โฮคุริว", "หมู่บ้านทานตะวันโฮคุริว", "Hokuryu Sunflower Village", "北竜町ひまわりの里", 2, "ดัง", "ทุ่งดอกไม้", ["flower", "nature"],
      "ตลอดเวลา (ช่วงเทศกาล ส.ค.)", "-", "ฟรี", "1 ชม.", 1, "ทานตะวัน 1.5 ล้านต้นเต็มเนิน เขาวงกตทานตะวัน", "ไกลจากอาซาฮิคาวะ ~1 ชม.", "ปลาย ก.ค.–กลาง ส.ค.", "ฟรี",
      months=[7, 8], sn=dict(summer="ทานตะวันบาน ปลาย ก.ค.–ส.ค."), tr=dict(lv="limited", t="บัสจาก JR Fukagawa ~25 นาที")),
    P("asahikawa", "อาซาฮิคาวะ", "Ueno Farm (สวนอังกฤษ)", "Ueno Farm", "上野ファーム", 1, "คนรู้จักน้อย", "สวน / ดอกไม้", ["flower", "nature"],
      "≈10:00–17:00 (ปลาย เม.ย.–ต.ค.)", "-", "≈¥1,000", "1 ชม.", 1, "สวนดอกไม้สไตล์อังกฤษของฮอกไกโด คาเฟ่ในโรงนา", "", "มิ.ย.–ส.ค.", "ฟรี",
      months=[5, 6, 7, 8, 9, 10], tr=dict(lv="car")),
    P("biei", "บิเอ", "Zerubu no Oka (ทุ่งดอกไม้)", "Zerubu no Oka", "ぜるぶの丘", 1, "ดัง", "ทุ่งดอกไม้", ["flower"],
      "≈8:30–17:00 (พ.ค.–ต.ค.)", "-", "ฟรี", "30 นาที", 0.5, "ทุ่งดอกไม้แถบสีริมถนนแพตช์เวิร์ก รถบักกี้ชมทุ่ง", "", "ก.ค.", "ฟรี",
      months=[5, 6, 7, 8, 9, 10], tr=dict(lv="limited", t="เดิน ~25 นาทีจากสถานีบิเอ / จักรยาน")),
    P("monbetsu", "ทากิโนะอุเอะ", "ชิบะซากุระทากิโนะอุเอะ", "Takinoue Park Shibazakura", "滝上公園芝ざくら", 2, "ดัง", "ทุ่งดอกไม้", ["flower"],
      "≈8:00–17:00 (ช่วงเทศกาล)", "-", "≈¥500", "1 ชม.", 1, "เนินดอกชิบะซากุระสีชมพูทั้งลูก 10 เฮกตาร์", "บานช่วงสั้น ตรวจรายงานการบาน", "กลาง พ.ค.–ต้น มิ.ย.", "ฟรี",
      months=[5, 6], sn=dict(spring="ชิบะซากุระชมพูทั้งเนิน"), tr=dict(lv="car")),
    P("tomamu", "โทมามุ", "Unkai Terrace (ทะเลหมอก)", "Unkai Terrace", "雲海テラス", 3, "ดังมาก", "จุดชมวิว", ["nature"],
      "≈5:00–8:00 (พ.ค.–ต.ค.)", "-", "กระเช้า ≈¥2,500", "1.5 ชม.", 1.5, "ขึ้นกระเช้าเช้ามืดดูทะเลหมอกไหลข้ามภูเขา เกิดราว 30–40% ของวัน", "ต้องตื่นตี 4 มีโอกาสไม่เจอหมอก ตรวจพยากรณ์หมอกของรีสอร์ต", "เช้ามืด", "รีสอร์ต",
      months=[5, 6, 7, 8, 9, 10], sn=dict(summer="ทะเลหมอกบ่อยสุด มิ.ย.–ส.ค."), tr=dict(lv="ok", t="อยู่ในรีสอร์ตโทมามุ")),
    P("obihiro", "ชิมิซุ", "Tokachi Millennium Forest", "Tokachi Millennium Forest", "十勝千年の森", 2, "คนรู้จักน้อย", "สวน", ["nature", "flower"],
      "≈9:30–17:00 (ปลาย เม.ย.–ต.ค.)", "-", "≈¥1,200", "2 ชม.", 2, "สวนภูมิทัศน์ระดับโลก Earth Garden เนินหญ้าเป็นคลื่น", "", "มิ.ย.–ก.ย.", "ฟรี", months=[5, 6, 7, 8, 9, 10], tr=dict(lv="car")),
    P("obihiro", "โอบิฮิโระ", "Manabe Garden", "Manabe Garden", "真鍋庭園", 1, "คนรู้จักน้อย", "สวน", ["nature", "flower"],
      "≈8:00–17:30 (เม.ย.–พ.ย.)", "-", "≈¥1,000", "1 ชม.", 1, "สวนต้นสนสไตล์ญี่ปุ่น-ยุโรป แห่งแรกของญี่ปุ่นที่เป็นสวนสนโคนิเฟอร์", "", "ต.ค. (ใบไม้เปลี่ยนสี)", "ฟรี",
      months=[4, 5, 6, 7, 8, 9, 10, 11], tr=dict(lv="limited", t="บัส/แท็กซี่จากสถานีโอบิฮิโระ ~15 นาที")),
    P("obihiro", "นุคาบิระ", "สะพานทาอุชุเบ็ตสึ (สะพานผี)", "Taushubetsu River Bridge", "タウシュベツ川橋梁", 2, "คนรู้จักน้อย", "ประวัติศาสตร์ / ธรรมชาติ", ["nature"],
      "ดูได้เมื่อน้ำลด (ม.ค.–มิ.ย.)", "-", "ทัวร์ ≈¥3,000–5,000", "2 ชม.", 2, "สะพานคอนกรีตโค้งเก่าที่จมและโผล่ตามระดับน้ำ หน้าหนาวเดินบนทะเลสาบน้ำแข็งไปดู", "เข้าใกล้ต้องไปกับทัวร์ (ถนนป่าต้องขออนุญาต)", "ม.ค.–พ.ค.", "จุดชมวิวฟรี",
      months=[1, 2, 3, 4, 5, 6], sn=dict(winter="เดินบนทะเลสาบน้ำแข็งไปดู (ทัวร์)"), tr=dict(lv="tour", t="ทัวร์จากนุคาบิระออนเซ็น")),
    P("obihiro", "โอบิฮิโระ", "แข่งม้าลากเลื่อน Ban'ei Tokachi", "Ban'ei Tokachi (Draft Horse Racing)", "帯広競馬場", 2, "คนรู้จักน้อย", "วัฒนธรรม / สัตว์", ["animals", "city"],
      "เสาร์–จันทร์ ≈14:00–20:45", "อังคาร พุธ พฤหัส ศุกร์", "≈¥100", "1.5 ชม.", 1.5, "ม้ายักษ์ 1 ตันลากเลื่อนเหล็กขึ้นเนิน แข่งที่เดียวในโลก ตลาดอาหารท้องถิ่นข้างสนาม", "", "ค่ำ", "ฟรี",
      tr=dict(lv="ok", t="บัส/เดิน 15 นาทีจากสถานีโอบิฮิโระ"), evening=True),
    P("kushiro", "คุชิโระ", "รถไฟไอน้ำ SL ฤดูหนาว (คุชิโระ–ชิเบชะ)", "SL Fuyu-no-Shitsugen-go", "SL冬の湿原号", 2, "ดัง", "รถไฟ / ธรรมชาติ", ["nature", "animals"],
      "วิ่งบางวัน ม.ค.–ก.พ. (ตรวจตาราง)", "วันไม่วิ่ง", "≈¥1,700 + ที่นั่งจอง", "1.5 ชม.", 1.5, "รถจักรไอน้ำแล่นผ่านทุ่งพรุหิมะคุชิโระ มีเตาย่างปลาหมึกในตู้ เห็นนกกระเรียน", "ต้องจองที่นั่ง ตรวจว่าฤดูนี้ยังวิ่ง", "กลางวัน", "สถานีคุชิโระ",
      months=[1, 2], tr=dict(lv="ok", t="ขึ้นที่สถานี JR คุชิโระ")),
    P("kawayu", "คิโยซาโตะ", "บ่อคามิโนโกะ (บ่อน้ำเทพ)", "Kaminoko-ike Pond", "神の子池", 2, "ดัง", "ธรรมชาติ", ["nature"],
      "ตลอดเวลา (ถนนปิดหน้าหนาว)", "-", "ฟรี", "30 นาที", 0.5, "บ่อน้ำผุดจากทะเลสาบมาชู สีฟ้าโคบอลต์ใส เห็นซุงใต้น้ำ", "ถนนลูกรัง 2 กม. ปิดหน้าหนาว", "กลางวัน แดดออก", "ฟรี",
      months=[5, 6, 7, 8, 9, 10, 11], tr=dict(lv="car")),
    P("akan", "ทะเลสาบอากัง", "ทะเลสาบออนเนโตะ", "Lake Onneto", "オンネトー", 2, "คนรู้จักน้อย", "ธรรมชาติ", ["nature"],
      "ตลอดเวลา (ถนนปิดหน้าหนาว)", "-", "ฟรี", "45 นาที", 0.75, "ทะเลสาบเปลี่ยนสีตามแสง วิวภูเขาไฟเมอาคัง", "ถนนปิด ธ.ค.–เม.ย.", "ต.ค. (ใบไม้เปลี่ยนสี)", "ฟรี",
      months=[5, 6, 7, 8, 9, 10], sn=dict(autumn="ใบไม้เปลี่ยนสี ต้น ต.ค."), tr=dict(lv="car")),
    P("utoro", "ชิเรโตโกะ", "ช่องเขาชิเรโตโกะ", "Shiretoko Pass", "知床峠", 2, "ดัง", "จุดชมวิว", ["nature"],
      "ถนนเปิด ≈ ปลาย เม.ย.–ต้น พ.ย.", "ปิดหน้าหนาว", "ฟรี", "30 นาที", 0.5, "จุดสูงสุดถนนข้ามคาบสมุทร วิวภูเขาราอุสุและเกาะคุนาชิริ", "หมอกลงบ่อย", "กลางวัน", "ฟรี",
      months=[5, 6, 7, 8, 9, 10], tr=dict(lv="limited", t="บัสอุโตโระ–ราอุสุ (หน้าร้อน) วันละไม่กี่เที่ยว")),
    P("utoro", "อุโตโระ", "ล่องเรือชิเรโตโกะ (ดูหมีสีน้ำตาล)", "Shiretoko Sightseeing Cruise", "知床半島", 2, "ดัง", "ล่องเรือ สัตว์ป่า", ["nature", "animals"],
      "≈ เม.ย.–ต.ค. หลายรอบต่อวัน", "-", "≈¥4,000–8,000", "1.5–3 ชม.", 2, "ล่องเรือเลียบหน้าผามรดกโลก น้ำตกตกลงทะเล มีโอกาสเห็นหมีสีน้ำตาลริมฝั่ง", "เลือกบริษัทที่ได้มาตรฐานความปลอดภัย ทะเลแรงเรืองดบ่อย", "กลางวัน", "ท่าเรืออุโตโระ",
      months=[4, 5, 6, 7, 8, 9, 10], tr=dict(lv="ok", t="ท่าเรือในเมืองอุโตโระ")),
    P("abashiri", "ทะเลสาบโนโทโระ", "ทุ่งหญ้าทะเลสีแดง Sangosou", "Lake Notoro Coral Grass", "能取湖", 2, "คนรู้จักน้อย", "ธรรมชาติ", ["nature", "flower"],
      "ตลอดเวลา", "-", "ฟรี", "30 นาที", 0.5, "ทุ่งหญ้าเกลือ (ซังโกโซ) เปลี่ยนเป็นสีแดงสดริมทะเลสาบ", "", "กลาง–ปลาย ก.ย.", "ฟรี",
      months=[8, 9, 10], sn=dict(autumn="สีแดงสด กลาง–ปลาย ก.ย."), tr=dict(lv="limited", t="บัส/แท็กซี่จากสถานีอาบาชิริ ~20 นาที")),
    P("abashiri", "ฮิกาชิโมโคโตะ", "ชิบะซากุระฮิกาชิโมโคโตะ", "Higashimokoto Shibazakura Park", "東藻琴芝桜公園", 2, "ดัง", "ทุ่งดอกไม้", ["flower"],
      "≈8:00–17:00 (ช่วงเทศกาล)", "-", "≈¥600", "1 ชม.", 1, "เนินชิบะซากุระชมพูทั้งเนิน วิวทะเลโอค็อตสค์", "บานช่วงสั้น", "กลาง พ.ค.–ต้น มิ.ย.", "ฟรี",
      months=[5, 6], sn=dict(spring="ชิบะซากุระชมพูทั้งเนิน"), tr=dict(lv="limited", t="บัสพิเศษช่วงเทศกาลจากสถานีอาบาชิริ")),
    P("abashiri", "อาบาชิริ", "รถไฟชมทะเลน้ำแข็ง Ryuhyo Monogatari", "Ryuhyo Monogatari Train", "流氷物語号", 2, "ดัง", "รถไฟ / ธรรมชาติ", ["nature"],
      "วิ่ง ก.พ.–ต้น มี.ค. (ตรวจตาราง)", "-", "ค่าโดยสาร JR ≈¥1,000", "1.5 ชม.", 1.5, "รถไฟวิ่งเลียบทะเลน้ำแข็งอาบาชิริ–ชิเรโตโกะชาริ จอดสถานีคิตะฮามะริมทะเล", "ตรวจว่าปีนี้วิ่งหรือไม่", "กลางวัน", "สถานีอาบาชิริ",
      months=[2, 3], tr=dict(lv="ok", t="ขึ้นที่สถานี JR อาบาชิริ")),
    P("abashiri", "โคชิมิซุ", "ทุ่งดอกไม้ป่าโคชิมิซุ", "Koshimizu Gensei Kaen", "小清水原生花園", 1, "คนรู้จักน้อย", "ทุ่งดอกไม้", ["flower", "nature"],
      "ตลอดเวลา", "-", "ฟรี", "45 นาที", 0.75, "ทุ่งดอกไม้ป่าริมทะเลโอค็อตสค์ ดอกลิลลี่ส้ม กุหลาบป่า", "", "มิ.ย.–ก.ค.", "ฟรี",
      months=[6, 7, 8], tr=dict(lv="ok", t="สถานี JR Gensei-Kaen (เปิดเฉพาะหน้าร้อน)")),
    P("wakkanai", "วักกาไน", "เกาะรีชิริ–เรบุน (เรือเฟอร์รี่)", "Rishiri & Rebun Islands", "利尻島", 2, "ดัง", "ธรรมชาติ / เกาะ", ["nature", "flower", "food"],
      "เรือหลายเที่ยว/วัน (หน้าหนาวลดเที่ยว)", "-", "เรือ ≈¥2,500+ เที่ยวเดียว", "1 วัน", 7, "ภูเขาไฟรูปกรวยกลางทะเล ดอกไม้อัลไพน์บนเกาะเรบุน อูนิสด", "ควรค้างบนเกาะ 1 คืน เรือหยุดเมื่อทะเลแรง", "มิ.ย.–ส.ค.", "ท่าเรือวักกาไน",
      months=[5, 6, 7, 8, 9], sn=dict(summer="ดอกไม้อัลไพน์ อูนิ"), tr=dict(lv="ok", t="เรือเฟอร์รี่จากท่าวักกาไน ~1 ชม. 40 นาที")),
    P("wakkanai", "วักกาไน", "โดมกันคลื่นท่าเรือวักกาไน", "Wakkanai Port North Breakwater Dome", "稚内港北防波堤ドーム", 1, "คนรู้จักน้อย", "ประวัติศาสตร์", ["city"],
      "ตลอดเวลา", "-", "ฟรี", "20 นาที", 0.35, "แนวเสาโค้งแบบโรมันยาว 427 ม. ยุคปี 1936", "", "กลางวัน", "ฟรี", tr=dict(lv="ok", t="เดิน 5 นาทีจากสถานีวักกาไน")),
]

# พิกัดที่ใส่เอง (ประมาณจากแผนที่) สำหรับที่ไม่มีใน Wikipedia หรือหน้าเป็นพื้นที่กว้าง
COORD = {
    "頭大仏": (42.9236, 141.3538), "ジェットコースターの路": (43.4685, 142.4733), "かんのファーム": (43.5277, 142.4927), "ぜるぶの丘": (43.5683, 142.4549),
    "新栄の丘展望公園": (43.5463, 142.4733), "北西の丘展望公園": (43.6005, 142.4596), "日の出公園 (上富良野町)": (43.4645, 142.4705), "ラベンダーイースト": (43.4297, 142.4846),
    "フラワーランドかみふらの": (43.4813, 142.4580), "雲海テラス": (43.0680, 142.6070), "流氷物語号": (44.0207, 144.2557), "SL冬の湿原号": (42.9906, 144.3822),
    "知床半島": (44.0700, 144.9930), "尻別川": (42.8800, 140.7300), "能取湖": (44.0519, 144.1653), "タウシュベツ川橋梁": (43.4256, 143.1614), "帯広競馬場": (42.9294, 143.1831),
    "利尻島": (45.4155, 141.6797), "支笏湖": (42.7740, 141.4050), "北海道大学": (43.0770, 141.3410),
}


def nominatim(q):
    r = get("https://nominatim.openstreetmap.org/search", {"q": q, "format": "json", "limit": 1, "countrycodes": "jp"})
    time.sleep(1.2)
    return (float(r[0]["lat"]), float(r[0]["lon"])) if r else None


COORD_FIRST = True  # False = ใช้พิกัด Wikipedia/OSM ก่อน COORD เป็นแค่สำรอง


def main():
    text = DATA.read_text(encoding="utf-8")
    head = text.split("window.PLACES = ")[0]
    places = json.loads(text.split("window.PLACES = ", 1)[1].rstrip().rstrip(";"))
    hubs_js = (ROOT / "data" / "hubs.js").read_text(encoding="utf-8")
    region = dict(re.findall(r'id: "(\w+)",[^}]*?region: "([^"]+)"', hubs_js))
    hub_ll = {h: (float(a), float(b)) for h, a, b in re.findall(r'id: "(\w+)",[^}]*?lat: ([\d.]+), lng: ([\d.]+)', hubs_js)}
    for p in places:
        i = p["id"]
        p["en"] = EN.get(i, p.get("en", ""))
        if i in MONTHS: p["months"] = MONTHS[i]
        if i in SN: p["sn"] = SN[i]
        if i in URL: p["url"] = URL[i]
        if i in TR: p["tr"] = TR[i]
        if i in FLOWER and "flower" not in p["tags"]: p["tags"].append("flower")
    names = {p["name"] for p in places}
    nid = max(p["id"] for p in places) + 1
    first_new = nid  # รูปที่ลบทิ้งเพราะผิด (สถานที่เก่า) ห้ามค้นกลับมาใหม่
    for n in NEW:
        if n["name"] in names:
            continue
        n = {k: v for k, v in n.items() if v not in (None, "") or k in ("caution",)}
        wiki = n.pop("wiki", None)
        n.update(id=nid, region=region[n["hub"]], feeYen=int(re.search(r"¥([\d,]+)", n["fee"]).group(1).replace(",", "")) if "¥" in n["fee"] else 0,
                 lat=None, lng=None, checked="2026-11")
        if not n.get("sn"): n.pop("sn", None)
        if n["ja"] in COORD and COORD_FIRST:
            n["lat"], n["lng"] = COORD[n["ja"]]; n["acc"] = "ประมาณ"
        n["_wiki"] = wiki
        places.append(n)
        nid += 1
    IMG.mkdir(parents=True, exist_ok=True)
    for p in places:
        wiki = p.pop("_wiki", None)
        if p["id"] < first_new or (p.get("img") and p.get("lat")):
            continue
        res, thumb, fname = None, None, None
        try:
            res = wiki_page(title=wiki) if wiki else wiki_page(search=p["ja"])
            if res and res[1]: thumb, fname = res[1], res[2]
            if p["lat"] is None and res and res[3]:
                p["lat"], p["lng"] = round(res[3], 6), round(res[4], 6); p["acc"] = "จาก Wikipedia"
            if p["lat"] is None:
                ll = nominatim(p["ja"])
                if ll: p["lat"], p["lng"] = round(ll[0], 6), round(ll[1], 6); p["acc"] = "จาก OpenStreetMap"
            if p["lat"] is None and p["ja"] in COORD:
                p["lat"], p["lng"] = COORD[p["ja"]]; p["acc"] = "ประมาณ"
            if not thumb:
                c = commons_image(p["ja"]) or (commons_image(p["en"]) if p.get("en") else None)
                if c: thumb, fname = c
        except Exception as e:  # เน็ต/API ล่ม: ข้ามไป รันใหม่ได้
            print("ERR", p["id"], p["ja"], e)
        if thumb and not p.get("img"):
            ext = ".png" if thumb.lower().endswith(".png") else ".jpg"
            dest = IMG / f"{p['id']}{ext}"
            dest.write_bytes(fetch(thumb))
            p["img"] = f"img/places/{dest.name}"
            p["imgCredit"] = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(fname.replace(" ", "_"))
        # พิกัดต้องอยู่ไม่ไกลจากฐาน (กันผลค้นหาผิดที่)
        if p["lat"] is not None:
            h = hub_ll[p["hub"]]
            if abs(p["lat"] - h[0]) > 1.2 or abs(p["lng"] - h[1]) > 1.6:
                print("FAR", p["id"], p["ja"], p["lat"], p["lng"]); p["lat"] = p["lng"] = None
                if p["ja"] in COORD: p["lat"], p["lng"] = COORD[p["ja"]]; p["acc"] = "ประมาณ"
        print(p["id"], p["ja"], p.get("lat"), "|", fname)
        time.sleep(1.5)
    DATA.write_text(head + "window.PLACES = " + json.dumps(places, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    missing = [(p["id"], p["ja"]) for p in places if p["lat"] is None]
    print("total", len(places), "with img", sum(1 for p in places if p.get("img")), "missing coords", missing)


if __name__ == "__main__":
    main()
