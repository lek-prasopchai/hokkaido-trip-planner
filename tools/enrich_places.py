"""เพิ่มสถานที่ใหม่ + ดึงรูป/พิกัดจาก Wikipedia (ภาษาญี่ปุ่น) / Wikimedia Commons แล้วเก็บไว้ใน img/places/

รันซ้ำได้: ข้ามสถานที่ที่มีรูปแล้ว (ลบ field img ใน data/places.js ถ้าอยากดึงใหม่)
ใช้:  python tools/enrich_places.py
"""
import json, re, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "places.js"
IMG = ROOT / "img" / "places"
UA = {"User-Agent": "hokkaido-trip-planner/1.0 (personal trip planner)"}

# ---------- สถานที่ที่เพิ่ม (ราคา/เวลาเป็นค่าประมาณ ≈ ตรวจก่อนไป) ----------
NEW = [
    dict(hub="sapporo", area="ซัปโปโร", name="เนินฮิตสึจิงาโอกะ (รูปปั้นคลาร์ก)", stars=2, pop="ดัง", type="จุดชมวิว / ประวัติศาสตร์", tags=["city", "nature"],
         open="≈9:00–17:00", closed="-", fee="≈¥1,000", dur="45 นาที", highlight="รูปปั้นดร.คลาร์ก 'Boys, be ambitious' ทุ่งหิมะมองเมือง", caution="ลมแรง ทางเดินลื่น", best="กลางวัน", parking="ฟรี", ja="さっぽろ羊ヶ丘展望台"),
    dict(hub="sapporo", area="ซัปโปโร", name="สวนสัตว์มารุยามะ (หมีขั้วโลก)", stars=2, pop="ดัง", type="สวนสัตว์", tags=["animals"],
         open="≈9:30–16:00 (หน้าหนาว)", closed="พุธที่ 2 และ 4 (ตรวจ)", fee="≈¥800", dur="2 ชม.", highlight="หมีขั้วโลกว่ายใต้น้ำ เสือดาวหิมะ อาคารในร่มอุ่น", caution="ทางเดินขึ้นลงเนินลื่น", best="กลางวัน", parking="มี (เสียเงิน)", ja="札幌市円山動物園"),
    dict(hub="sapporo", area="ซัปโปโร", name="ถนนช้อปปิ้งทานุกิโคจิ", stars=1, pop="ดังมาก", type="ช้อปปิ้ง", tags=["city", "food"],
         open="ร้านส่วนใหญ่ ≈10:00–21:00", closed="แต่ละร้าน", fee="ฟรี", dur="1 ชม.", highlight="อาเขตมีหลังคา 900 ม. ร้านยา ของฝาก ร้านอาหาร เดินได้ไม่โดนหิมะ", caution="", best="เย็น–ค่ำ", parking="ลานจอดเสียเงิน", ja="狸小路商店街"),
    dict(hub="sapporo", area="ซัปโปโร", name="จุดชมวิว JR Tower T38", stars=2, pop="ดัง", type="จุดชมวิว", tags=["city", "nature"],
         open="≈10:00–22:00", closed="-", fee="≈¥1,000", dur="45 นาที", highlight="วิวกลางคืนซัปโปโร 360° จากชั้น 38 ติดสถานี JR ไม่ต้องออกไปหนาวข้างนอก", caution="", best="ค่ำ", parking="ห้าง JR Tower (เสียเงิน)", ja="JRタワー展望室 T38"),
    dict(hub="sapporo", area="ซัปโปโร", name="งานเทศกาลหิมะ สนามสึโดเมะ (เล่นหิมะ)", stars=2, pop="ดัง", type="เทศกาล / เล่นหิมะ", tags=["festival", "snow"],
         open="≈9:00–17:00 (ช่วงงาน)", closed="-", fee="ฟรี (บางกิจกรรมเสียเงิน)", dur="2 ชม.", highlight="สไลเดอร์หิมะยักษ์ snow rafting เหมาะกับเด็กและคนเห็นหิมะครั้งแรก", caution="เฉพาะช่วงเทศกาลหิมะ คนเยอะ", best="กลางวัน", parking="จำกัด ใช้รถไฟใต้ดิน+บัสรับส่ง", ja="さっぽろ雪まつり つどーむ会場", season=["02-04", "02-11"]),
    dict(hub="otaru", area="โอตารุ", name="LeTAO สาขาหลัก (ชีสเค้ก)", stars=2, pop="ดังมาก", type="คาเฟ่ / ของหวาน", tags=["food"],
         open="≈9:00–18:00", closed="-", fee="ฟรี (ค่าขนม)", dur="45 นาที", highlight="ชีสเค้ก Double Fromage ต้นตำรับ หอคอยชมวิวถนนซาไกมาจิ", caution="", best="กลางวัน", parking="ลานจอดเสียเงินใกล้เคียง", ja="小樽洋菓子舗ルタオ 本店"),
    dict(hub="toya", area="ทะเลสาบโทยะ", name="ภูเขาไฟโชวะชินซัง", stars=2, pop="ดัง", type="ธรรมชาติ / ภูเขาไฟ", tags=["nature"],
         open="ดูได้ตลอด", closed="-", fee="ฟรี (ค่าจอด ≈¥500)", dur="30 นาที", highlight="ภูเขาไฟอายุไม่ถึง 100 ปี ยังมีควันขึ้น อยู่ติดสถานีกระเช้าอุสุ", caution="", best="กลางวัน", parking="เสียเงิน", ja="昭和新山"),
    dict(hub="hakodate", area="ฮาโกดาเตะ", name="ยุโนคาวะ ออนเซ็น", stars=2, pop="ดัง", type="ออนเซ็น", tags=["onsen"],
         open="ออนเซ็นไปกลับ ≈¥500–1,500", closed="แต่ละที่", fee="≈¥500–1,500", dur="1–2 ชม.", highlight="เมืองออนเซ็นริมทะเล ใกล้สนามบินฮาโกดาเตะ 10 นาที", caution="", best="เย็น", parking="มีตามโรงแรม", ja="湯の川温泉"),
    dict(hub="hakodate", area="ฮาโกดาเตะ", name="อารามแม่ชีแทรปปิสทีน", stars=1, pop="ดัง", type="ประวัติศาสตร์", tags=["city"],
         open="≈8:00–16:30", closed="ปลาย ธ.ค.–ต้น ม.ค. (ตรวจ)", fee="ฟรี", dur="30 นาที", highlight="อารามอิฐแดงกลางหิมะ สวนสงบ ร้านคุกกี้ของแม่ชี", caution="", best="กลางวัน", parking="มี", ja="トラピスチヌ修道院"),
    dict(hub="asahikawa", area="อาซาฮิคาวะ", name="พิพิธภัณฑ์ผลึกหิมะ (Snow Crystal Museum)", stars=2, pop="คนรู้จักน้อย", type="พิพิธภัณฑ์", tags=["city"],
         open="≈9:00–17:00", closed="ตรวจ", fee="≈¥700", dur="1 ชม.", highlight="ทางเดินน้ำแข็งใต้ดิน ห้องโถงสไตล์ปราสาท ผลึกหิมะขยายใหญ่", caution="", best="กลางวัน", parking="ฟรี", ja="雪の美術館"),
    dict(hub="furano", area="ฟูราโน่", name="ฟูราโน่ มาร์เช่", stars=1, pop="ดัง", type="ช้อปปิ้ง / อาหาร", tags=["food", "city"],
         open="≈10:00–18:00", closed="-", fee="ฟรี", dur="45 นาที", highlight="ตลาดของฝากและของกินท้องถิ่น ขนมชีส แวะพักรถ", caution="", best="กลางวัน", parking="ฟรี", ja="フラノマルシェ"),
    dict(hub="biei", area="ชิโรงาเนะ (บิเอ)", name="ฟุคิอาเกะ บ่อออนเซ็นกลางแจ้ง (ฟรี)", stars=2, pop="คนรู้จักน้อย", type="ออนเซ็น / ธรรมชาติ", tags=["onsen", "nature"],
         open="ตลอดเวลา", closed="-", fee="ฟรี", dur="45 นาที", highlight="บ่อน้ำพุร้อนธรรมชาติกลางป่าหิมะ ไม่มีห้องเปลี่ยนชุด", caution="บ่อรวมชาย-หญิง ไม่มีสิ่งอำนวยความสะดวก ถนนขึ้นเขาหิมะหนา", best="กลางวัน", parking="ลานเล็ก ฟรี", ja="吹上露天の湯"),
    dict(hub="obihiro", area="โอบิฮิโระ", name="ร็อกกะเต สาขาหลักโอบิฮิโระ", stars=2, pop="ดังมาก", type="คาเฟ่ / ของหวาน", tags=["food"],
         open="≈9:00–18:00 (คาเฟ่ ≈11:00–)", closed="-", fee="ฟรี (ค่าขนม)", dur="45 นาที", highlight="Marusei Butter Sandwich ต้นตำรับ คาเฟ่ชั้นบน ขนมเฉพาะสาขา", caution="", best="กลางวัน", parking="มี", ja="六花亭 帯広本店"),
    dict(hub="kushiro", area="คุชิโระ", name="โรบาตะยากิคุชิโระ (ปิ้งย่างซีฟู้ด)", stars=2, pop="ดัง", type="อาหาร / กลางคืน", tags=["food"],
         open="≈17:00–23:00", closed="แต่ละร้าน", fee="ค่าอาหาร", dur="1.5 ชม.", highlight="ต้นกำเนิดโรบาตะยากิ ปิ้งปลา หอยบนเตาถ่านต่อหน้า (Fisherman's Wharf MOO / ร้านดั้งเดิม)", caution="ร้านดังควรจอง", best="ค่ำ", parking="ลานจอดเสียเงิน", ja="釧路フィッシャーマンズワーフMOO"),
    dict(hub="akan", area="ทะเลสาบอากัง", name="โรงละครไอนุ อิโคโระ", stars=2, pop="คนรู้จักน้อย", type="วัฒนธรรม", tags=["city"],
         open="รอบการแสดงค่ำ (ตรวจตาราง)", closed="ตรวจ", fee="≈¥2,200", dur="1 ชม.", highlight="การแสดงระบำไอนุและดิจิทัลอาร์ต ในหมู่บ้านไอนุริมทะเลสาบ", caution="", best="ค่ำ", parking="ใช้ลานจอดโรงแรม", ja="阿寒湖アイヌシアター イコロ"),
    dict(hub="abashiri", area="อาบาชิริ", name="แหลมโนโทโระ (ดูน้ำแข็งทะเลจากหน้าผา)", stars=2, pop="คนรู้จักน้อย", type="ธรรมชาติ / จุดชมวิว", tags=["nature"],
         open="ดูได้ตลอด", closed="-", fee="ฟรี", dur="30–45 นาที", highlight="หน้าผาสูงมองทะเลน้ำแข็งเต็มสายตา ประภาคาร", caution="ลมแรงมาก ถนนหิมะพัด", best="เช้าฟ้าใส", parking="ฟรี", ja="能取岬"),
    dict(hub="utoro", area="อุโตโระ (ชิเรโตโกะ)", name="น้ำตกฟูเรเปะ (เดินสโนว์ชู)", stars=2, pop="คนรู้จักน้อย", type="ธรรมชาติ", tags=["nature", "snow"],
         open="ศูนย์ธรรมชาติ ≈9:00–16:00", closed="-", fee="ฟรี (เช่าสโนว์ชู)", dur="1–1.5 ชม.", highlight="เดินทุ่งหิมะ 1 กม. ถึงหน้าผาน้ำตกน้ำแข็งริมทะเล เจอกวางบ่อย", caution="เช่าสโนว์ชูที่ศูนย์ อย่าเข้าใกล้ขอบหน้าผา", best="กลางวัน", parking="ฟรี (ศูนย์ธรรมชาติชิเรโตโกะ)", ja="フレペの滝"),
    dict(hub="monbetsu", area="มนเบ็ตสึ", name="โอค็อตสค์ทาวเวอร์ (ดูน้ำแข็งใต้ทะเล)", stars=2, pop="คนรู้จักน้อย", type="พิพิธภัณฑ์ / จุดชมวิว", tags=["nature", "animals"],
         open="≈10:00–17:00", closed="ตรวจ", fee="≈¥800", dur="1 ชม.", highlight="หอคอยกลางทะเล ชั้นใต้น้ำมองน้ำแข็งและสัตว์ทะเลจากข้างใต้", caution="", best="ก.พ.", parking="ฟรี", ja="オホーツクタワー"),
]

# ชื่อบทความ Wikipedia ที่ระบุเอง (กรณีค้นอัตโนมัติไม่ตรง) — ja: ชื่อหน้า ja.wikipedia, commons: คำค้นใน Commons
OVERRIDE = {
    "元祖ラーメン横丁": {"ja": "すすきの"},
    "小樽オルゴール堂 本館": {"ja": "小樽オルゴール堂"},
    "北一ホール": {"commons": "Kitaichi Hall Otaru"},
    "サッポロテイネ": {"ja": "サッポロテイネ"},
    "ニセコ高橋牧場 ミルク工房": {"commons": "Niseko Takahashi farm"},
    "サケのふるさと 千歳水族館": {"ja": "サケのふるさと 千歳水族館"},
    "支笏湖氷濤まつり": {"commons": "Lake Shikotsu Ice Festival"},
    "丸駒温泉旅館": {"ja": "丸駒温泉"},
    "有珠山ロープウェイ": {"ja": "有珠山"},
    "サイロ展望台": {"ja": "洞爺湖"},
    "函館山ロープウェイ": {"ja": "函館山"},
    "五稜郭タワー": {"ja": "五稜郭"},
    "函館市熱帯植物園": {"commons": "Hakodate tropical botanical garden monkeys"},
    "白金青い池": {"ja": "青い池"},
    "ケンとメリーの木": {"commons": "Ken and Mary tree Biei"},
    "十勝岳温泉 湯元 凌雲閣": {"ja": "十勝岳温泉"},
    "ニングルテラス": {"commons": "Ningle Terrace"},
    "富良野スキー場": {"ja": "富良野スキー場"},
    "富良野チーズ工房": {"commons": "Furano cheese factory"},
    "層雲峡温泉氷瀑まつり": {"commons": "Sounkyo Ice Fall Festival"},
    "銀河・流星の滝": {"ja": "銀河の滝・流星の滝"},
    "大雪山層雲峡・黒岳ロープウェイ": {"ja": "黒岳"},
    "星野リゾート トマム アイスヴィレッジ": {"commons": "Tomamu Ice Village"},
    "霧氷テラス": {"commons": "Tomamu Unkai Terrace"},
    "ぱんちょう": {"ja": "豚丼"},
    "しかりべつ湖コタン": {"ja": "然別湖"},
    "細岡展望台": {"ja": "釧路湿原"},
    "鶴居・伊藤タンチョウサンクチュアリ": {"ja": "鶴居・伊藤タンチョウサンクチュアリ"},
    "音羽橋": {"commons": "Otowa bridge Tsurui crane"},
    "阿寒国際ツルセンター": {"commons": "Akan International Crane Center"},
    "阿寒湖アイヌコタン": {"ja": "阿寒湖アイヌコタン"},
    "摩周湖第一展望台": {"ja": "摩周湖"},
    "砂湯": {"ja": "屈斜路湖"},
    "道の駅 流氷街道網走": {"commons": "Aurora icebreaker Abashiri"},
    "ガリンコ号": {"ja": "ガリンコ号"},
    "ウトロ 流氷ウォーク": {"commons": "Drift ice Shiretoko Utoro"},
    "羅臼 流氷とワシ クルーズ": {"commons": "Steller's sea eagle Rausu"},
    "新千歳空港": {"ja": "新千歳空港"},
    "JRタワー展望室 T38": {"ja": "JRタワー"},
    "さっぽろ雪まつり つどーむ会場": {"ja": "さっぽろ雪まつり"},
    "小樽洋菓子舗ルタオ 本店": {"commons": "LeTAO Otaru"},
    "六花亭 帯広本店": {"commons": "Rokkatei Obihiro"},
    "釧路フィッシャーマンズワーフMOO": {"ja": "釧路フィッシャーマンズワーフMOO"},
    "阿寒湖アイヌシアター イコロ": {"commons": "Akanko Ainu Theater Ikor"},
    "フラノマルシェ": {"commons": "Furano Marche"},
    "北一ホール": {"commons": "Kitaichi Glass Otaru"},
    "三角市場": {"commons": "Sankaku Market Otaru"},
    "小樽天狗山ロープウエイ": {"commons": "Mount Tengu Otaru ropeway"},
    "ニッカウヰスキー余市蒸溜所": {"commons": "Nikka Yoichi Distillery"},
    "ニセコ高橋牧場 ミルク工房": {"commons": "Niseko Milk Kobo"},
    "大湯沼": {"commons": "Oyunuma Noboribetsu"},
    "八幡坂": {"commons": "Hachimanzaka Hakodate"},
    "男山酒造り資料舎": {"commons": "Otokoyama sake brewery Asahikawa"},
    "層雲峡温泉氷瀑まつり": {"commons": "Sounkyo ice fall festival"},
    "星野リゾート トマム アイスヴィレッジ": {"commons": "Tomamu Ice Village"},
    "硫黄山": {"commons": "Iozan Teshikaga"},
    "川湯温泉": {"commons": "Kawayu Onsen Teshikaga"},
    "ウトロ 流氷ウォーク": {"commons": "Drift ice Shiretoko"},
    "湯の川温泉": {"commons": "Yunokawa Onsen Hakodate"},
    "吹上露天の湯": {"commons": "Fukiage onsen Kamifurano"},
    "六花亭 帯広本店": {"commons": "Rokkatei Obihiro"},
    "阿寒湖アイヌシアター イコロ": {"commons": "Akanko Ainu Kotan theater"},
    "能取岬": {"commons": "Cape Notoro Abashiri"},
    "オホーツクタワー": {"commons": "Okhotsk Tower Monbetsu"},
    "北一ホール": {"commons": "Kitaichi Glass Otaru"},
    "三角市場": {"commons": "Sankaku Market Otaru"},
    "小樽天狗山ロープウエイ": {"commons": "Mount Tengu Otaru ropeway"},
    "ニッカウヰスキー余市蒸溜所": {"commons": "Nikka Yoichi Distillery"},
    "ニセコ高橋牧場 ミルク工房": {"commons": "Niseko Milk Kobo"},
    "大湯沼": {"commons": "Oyunuma Noboribetsu"},
    "八幡坂": {"commons": "Hachimanzaka Hakodate"},
    "男山酒造り資料舎": {"commons": "Otokoyama sake brewery Asahikawa"},
    "層雲峡温泉氷瀑まつり": {"commons": "Sounkyo ice fall festival"},
    "星野リゾート トマム アイスヴィレッジ": {"commons": "Tomamu Ice Village"},
    "硫黄山": {"commons": "Iozan Teshikaga"},
    "川湯温泉": {"commons": "Kawayu Onsen Teshikaga"},
    "ウトロ 流氷ウォーク": {"commons": "Drift ice Shiretoko"},
    "湯の川温泉": {"commons": "Yunokawa Onsen Hakodate"},
    "吹上露天の湯": {"commons": "Fukiage onsen Kamifurano"},
    "六花亭 帯広本店": {"commons": "Rokkatei Obihiro"},
    "阿寒湖アイヌシアター イコロ": {"commons": "Akanko Ainu Kotan theater"},
    "能取岬": {"commons": "Cape Notoro Abashiri"},
    "オホーツクタワー": {"commons": "Okhotsk Tower Monbetsu"},
    "小樽天狗山ロープウエイ": {"commons": "Tenguyama Otaru"},
    "ニセコ高橋牧場 ミルク工房": {"commons": "Niseko Takahashi"},
    "層雲峡温泉氷瀑まつり": {"commons": "Sounkyo winter"},
    "星野リゾート トマム アイスヴィレッジ": {"commons": "Tomamu ice"},
    "鶴居・伊藤タンチョウサンクチュアリ": {"commons": "Tancho Tsurui"},
    "硫黄山": {"commons": "Atosanupuri"},
    "吹上露天の湯": {"commons": "Fukiage Kamifurano"},
    "六花亭 帯広本店": {"commons": "Rokkatei"},
    "阿寒湖アイヌシアター イコロ": {"commons": "Ainu Kotan Akan"},
}


def fetch(url):
    """ดาวน์โหลดพร้อมรอแล้วลองใหม่เมื่อโดนจำกัดความถี่ (HTTP 429)"""
    for wait in (5, 15, 30, 60, None):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or wait is None:
                raise
            time.sleep(wait)


def get(url, params):
    return json.loads(fetch(url + "?" + urllib.parse.urlencode({**params, "format": "json"})))


def wiki_page(title=None, search=None):
    """คืน (title, thumb_url, file_name, lat, lng) จาก ja.wikipedia"""
    api = "https://ja.wikipedia.org/w/api.php"
    if search:
        s = get(api, {"action": "query", "list": "search", "srsearch": search, "srlimit": 1})["query"]["search"]
        if not s:
            return None
        title = s[0]["title"]
    d = get(api, {"action": "query", "prop": "pageimages|coordinates", "piprop": "thumbnail|name", "pithumbsize": 640,
                  "titles": title, "redirects": 1})
    page = next(iter(d["query"]["pages"].values()))
    if "thumbnail" not in page:
        return (page.get("title"), None, None, None, None)
    c = (page.get("coordinates") or [{}])[0]
    return (page["title"], page["thumbnail"]["source"], page.get("pageimage"), c.get("lat"), c.get("lon"))


def commons_image(query):
    """ค้นรูปใน Wikimedia Commons คืน (thumb_url, file_name)"""
    d = get("https://commons.wikimedia.org/w/api.php", {"action": "query", "generator": "search", "gsrsearch": f"{query} filetype:bitmap",
             "gsrnamespace": 6, "gsrlimit": 5, "prop": "imageinfo", "iiprop": "url|mime", "iiurlwidth": 640})
    pages = sorted((d.get("query") or {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
    for p in pages:
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("mime") in ("image/jpeg", "image/png"):
            return ii["thumburl"], p["title"].removeprefix("File:")
    return None


def main():
    text = DATA.read_text(encoding="utf-8")
    head = text.split("window.PLACES = ")[0]
    places = json.loads(text.split("window.PLACES = ", 1)[1].rstrip().rstrip(";"))
    hubs_js = (ROOT / "data" / "hubs.js").read_text(encoding="utf-8")
    region = dict(re.findall(r'id: "(\w+)",[^}]*?region: "([^"]+)"', hubs_js))
    names = {p["name"] for p in places}
    nid = max(p["id"] for p in places) + 1
    for n in NEW:
        if n["name"] in names:
            continue
        n.update(id=nid, region=region[n["hub"]], feeYen=int(re.search(r"¥([\d,]+)", n["fee"]).group(1).replace(",", "")) if "¥" in n["fee"] else 0,
                 hours={"30 นาที": .5, "45 นาที": .75, "1 ชม.": 1, "1.5 ชม.": 1.5, "2 ชม.": 2, "1–2 ชม.": 1.5, "1–1.5 ชม.": 1.25, "30–45 นาที": .6}[n["dur"]],
                 evening=bool(re.search(r"ค่ำ|เย็น", n["best"])), lat=None, lng=None, acc="จาก Wikipedia")
        places.append(n)
        nid += 1
    IMG.mkdir(parents=True, exist_ok=True)
    for p in places:
        if p.get("img"):
            continue
        o = OVERRIDE.get(p["ja"], {})
        res, thumb, fname = None, None, None
        try:
            if "commons" not in o:
                res = wiki_page(title=o["ja"]) if "ja" in o else wiki_page(search=p["ja"])
                if res and res[1]:
                    thumb, fname = res[1], res[2]
                    if p["lat"] is None and res[3]:
                        p["lat"], p["lng"] = round(res[3], 6), round(res[4], 6)
            if not thumb:
                c = commons_image(o.get("commons") or p["ja"])
                if c:
                    thumb, fname = c
        except Exception as e:  # เน็ต/API ล่ม: ข้ามไป รันใหม่ได้
            print("ERR", p["id"], p["ja"], e)
            continue
        if thumb:
            ext = ".png" if thumb.lower().endswith(".png") else ".jpg"
            dest = IMG / f"{p['id']}{ext}"
            dest.write_bytes(fetch(thumb))
            p["img"] = f"img/places/{dest.name}"
            p["imgCredit"] = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(fname.replace(" ", "_"))
        print(p["id"], p["ja"], "->", (res or [None])[0], "|", fname)
        time.sleep(2)
    DATA.write_text(head + "window.PLACES = " + json.dumps(places, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    missing = [p["name"] for p in places if p["lat"] is None]
    print("total", len(places), "with img", sum(1 for p in places if p.get("img")), "missing coords", missing)


if __name__ == "__main__":
    main()
