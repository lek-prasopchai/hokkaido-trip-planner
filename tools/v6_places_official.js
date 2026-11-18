// รอบ 6: ข้อมูลจากเว็บท่องเที่ยวทางการ 5 เมือง (sapporo.travel, otaru.gr.jp, atca.jp, furanotourism.com, biei-hokkaido.jp) ดึงเมื่อ พ.ย. 2026
// - เพิ่มที่เที่ยว/ร้านอาหาร/ร้านค้าใหม่ (tools/v6_official.json: add) ชื่อไทย/ไฮไลต์เขียนเอง เวลา/วันหยุด/ราคา แปลงจากเว็บทางการ
// - จุดเดิมที่ตรงกับเว็บทางการ (existing): ใส่ ref (หน้าที่ใช้ตรวจ) url addrJa phone • จุดรอบ 5 (เดาไว้) ใช้เวลา/วันหยุดทางการแทน • FIX = แก้มือหลังเทียบทีละจุด
// - พิกัด: ที่อยู่ทางการ → GSI (แคช tools/v6_coords.json) ถ้าได้แค่ระดับตำบลติด acc "ประมาณ"
// ใช้:  node tools/v6_places_official.js
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), DATA = path.join(ROOT, "data/places.js"), CACHE = path.join(__dirname, "v6_coords.json");
const SRC = JSON.parse(fs.readFileSync(path.join(__dirname, "v6_official.json"), "utf8"));
const text = fs.readFileSync(DATA, "utf8");
const [head, body] = text.split("window.PLACES = ");
const places = JSON.parse(body.trim().replace(/;$/, ""));
const hubsTxt = fs.readFileSync(path.join(ROOT, "data/hubs.js"), "utf8");
const HUBS = [...hubsTxt.matchAll(/id: "(\w+)", name: "([^"]+)", en: "[^"]*", lat: ([\d.]+), lng: ([\d.]+), region: "([^"]+)"/g)].map((m) => ({ id: m[1], name: m[2], lat: +m[3], lng: +m[4], region: m[5] }));
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};

const km = (a, b, c, d) => { const R = Math.PI / 180, x = Math.sin((c - a) * R / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin((d - b) * R / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const hw = (s) => String(s || "").normalize("NFKC");

// ---------- แปลงข้อความญี่ปุ่น → ไทย ----------
function hours(s) {
  s = hw(s).replace(/(\d{1,2})時(\d{2})分/g, "$1:$2").replace(/(\d{1,2})時/g, "$1:00").replace(/翌/g, "");
  s = s.replace(/(AM|PM)\s*(\d{1,2}):(\d{2})/gi, (_, ap, h, m) => `${(+h % 12) + (/pm/i.test(ap) ? 12 : 0)}:${m}`).replace(/(\d{1,2}):(\d{2})\s*P\.?M\.?/gi, (_, h, m) => `${(+h % 12) + 12}:${m}`).replace(/(\d{1,2}):(\d{2})\s*A\.?M\.?/gi, "$1:$2").replace(/12:00MID\.?/i, "24:00");
  const r = [...s.matchAll(/(\d{1,2}:\d{2})\s*[~〜～\-ー－]\s*(\d{1,2}:\d{2})/g)].map((m) => `${m[1]}-${m[2]}`);
  const uniq = [...new Set(r)];
  if (!uniq.length) return /24時間|24h/i.test(s) ? "24 ชม." : /通年|年中|散策可能|自由|常時/.test(s) ? "ตลอดเวลา" : "";
  const season = /月|季|冬|夏|期間|曜|土|祝/.test(s.replace(/\d+月\d+日/g, "")) && uniq.length > 1;
  return "≈" + uniq.slice(0, 2).join(", ") + (season ? " (ตามฤดู/วัน)" : "");
}
const WD = { 月: "จันทร์", 火: "อังคาร", 水: "พุธ", 木: "พฤหัส", 金: "ศุกร์", 土: "เสาร์", 日: "อาทิตย์" };
function closed(s) {
  s = hw(s);
  if (!s) return "";
  const out = [];
  const norest = /年中無休|^無休|^なし|^無し|期間中は?無休|^特になし|無休$|定休日なし|休館日なし|^通年営業|まで営業/.test(s);
  const days = [...s.matchAll(/([月火水木金土日])曜/g)].map((m) => WD[m[1]]);
  if (days.length) out.push([...new Set(days)].join(", ") + (/第\d|最終/.test(s) ? " (บางสัปดาห์)" : ""));
  if (/不定休/.test(s)) out.push("ไม่แน่นอน");
  if (/年末年始|12月3[01]|1月1日|^1\/1$/.test(s)) out.push("ช่วงปีใหม่");
  if (/冬季休業|冬期間|冬季閉鎖|冬期閉鎖|冬季休館|冬季休園/.test(s)) out.push("ปิดหน้าหนาว");
  if (/店舗により|各店/.test(s)) out.push("แต่ละร้าน");
  return out.join(", ") || (norest ? "-" : "ตรวจ"); // "無休" แต่มีปีใหม่/ปิดหน้าหนาว ให้แสดงอย่างหลัง
}
function fee(s, food) {
  s = hw(s);
  if (food) return "ค่าอาหาร";
  const m = s.match(/(?:大人|一般|入館料|入場料)[^\d]{0,12}([\d,]+)\s*円/) || s.match(/([\d,]+)\s*円/);
  if (m) return `≈¥${(+m[1].replace(/,/g, "")).toLocaleString("en-US")}`; // หาราคาก่อน: "เด็กเล็กฟรี" ท้ายข้อความไม่ใช่ราคาผู้ใหญ่
  return /入(場|館|園)無料|^無料|無料$|料[:：／\s]*(見学)?無料|見学無料/.test(s) ? "ฟรี" : "";
}
const parking = (s) => { s = hw(s); return /有料/.test(s) ? "เสียเงิน" : /無料/.test(s) ? "ฟรี" : /^(あり|有)/.test(s) ? "มี" : /^(なし|無)/.test(s) ? "ไม่มี" : ""; };
function transit(s) {
  const m = hw(s).match(/(駅|停)[^。]{0,25}?徒歩(?:約)?(\d+)分/) || hw(s).match(/徒歩(?:約)?(\d+)分/);
  const n = m && +(m[2] || m[1]);
  return n && n <= 15 && /駅|停/.test(hw(s)) ? { lv: "ok", t: `เดิน ~${n} นาทีจากสถานี/ป้ายรถใกล้สุด (ตามเว็บทางการ)` } : undefined;
}
const cleanAddr = (a, city) => {
  a = hw(a).replace(/〒?\d{3}-\d{4}/, "").replace(/\(.*?\)|（.*?）/g, "").trim().split(/\s/)[0].replace(/MAP$/, "");
  if (!a) return "";
  if (!/^北海道/.test(a)) a = (/^(札幌|小樽|旭川|富良野|美瑛|上川|空知|余市|石狩|江別|芦別|千歳|函館|北斗|亀田|茅部|帯広|河東|河西|幕別|新得|清水|中札内|上士幌|虻田|磯谷)/.test(a) ? "北海道" : { hakodate: "北海道函館市", obihiro: "北海道", niseko: "北海道虻田郡", sapporo: "北海道札幌市", otaru: "北海道小樽市", asahikawa: "北海道旭川市", furano: "北海道", biei: "北海道上川郡美瑛町" }[city]) + a;
  return a;
};
async function gsi(a) {
  if (!a) return null;
  if (!(a in cache)) {
    const r = await (await fetch("https://msearch.gsi.go.jp/address-search/AddressSearch?q=" + encodeURIComponent(a))).json();
    cache[a] = r[0] ? [r[0].geometry.coordinates[1], r[0].geometry.coordinates[0], r[0].properties.title] : null;
    await new Promise((r) => setTimeout(r, 150));
  }
  return cache[a];
}
const precise = (g, a) => /[0-9０-９一二三四五六七八九十]+(番|号|丁目)|番地/.test(g[2]) && /\d/.test(hw(a));

// ---------- แก้จุดเดิมหลังเทียบกับเว็บทางการทีละจุด (พ.ย. 2026) ----------
const FIX = {
  924: { closed: "อังคาร (ยกเว้นวันหยุด/ปีใหม่/GW)" },
  917: { lat: 42.85333, lng: 140.64861, acc: "ฐานลานสกีอันนุปุริ (จุดขึ้นกระเช้า)", open: "ตรวจเวลาเปิด (ดูเว็บ)", fee: "ตรวจ", caution: "วันและเวลาเดินกระเช้าดูปฏิทินบนเว็บ งดเมื่ออากาศแย่" }, // กระเช้านิเซโกะ: เว็บไม่ระบุเวลา/ราคา
  // โอบิฮิโระ (obikan.jp): ข้อความที่ตัวแปลงอ่านไม่ได้
  875: { open: "≈18:00-21:00 (รอบ 18 19 20 น. นั่งราว 50 นาที)", closed: "พุธ, พฤหัส, อาทิตย์", fee: "≈¥3,300 (รวม 1 ดริงก์+กับแกล้ม)", feeYen: 3300, caution: "ต้องจองล่วงหน้า" },
  880: { open: "ตลอดเวลา", closed: "-", caution: "" },
  883: { closed: "หน้าหนาว (ธ.ค.-ก.พ.) เปิดเฉพาะวันหยุดสัปดาห์: ปิด จันทร์ อังคาร พุธ พฤหัส ศุกร์ เสาร์" },
  887: { closed: "พุธ (เฉพาะหน้าหนาว), ช่วงปีใหม่" },
  901: { open: "ตรวจเวลาเปิด (ดูเว็บ)", caution: "เว็บทางการไม่ระบุเวลาเปิด ตรวจก่อนไป" },
  218: { lat: 42.93219, lng: 143.20877, acc: "จาก Wikipedia/OSM (หมุดบนเว็บทางการคลาดเคลื่อน)" },
  2: { fee: "≈¥1,200" }, 3: { fee: "¥350" }, 7: { open: "≈9:00-17:00 (พ.ย.-เม.ย.) / 8:30-18:00 (เม.ย.-ต.ค.)", closed: "- (ลิฟต์งดวันแข่ง/ซ้อมกระโดด)" },
  8: { open: "≈10:00-18:00 (โซนเสียเงินเข้าได้ถึง 16:30)" }, 9: { fee: "≈¥1,000 (ทัวร์ไกด์+ชิม ≈¥2,000)", closed: "31 ธ.ค.-1 ม.ค. (ทัวร์ไกด์หยุดวันจันทร์)" },
  12: { open: "≈9:00-16:30 (ต.ค.-เม.ย.) / 9:00-17:00 (พ.ค.-ก.ย.)", closed: "จันทร์ (ต.ค.-เม.ย.), 29 ธ.ค.-3 ม.ค." }, 19: { open: "≈9:00-17:30" }, 20: { open: "≈6:00-17:00 (ร้านอาหาร 7:00-17:00)" },
  57: { open: "≈9:00-16:00 (พ.ย.-มี.ค.) / 9:00-17:00 (เม.ย.-ต.ค.)" }, 58: { open: "≈10:00-16:30 (หน้าหนาว) / หน้าร้อนเปิดเช้ากว่า" },
  90: { fee: "≈¥740", closed: "31 ธ.ค.-1 ม.ค." }, 97: { closed: "31 ธ.ค.-1 ม.ค. (ปิดซ่อมราวกลาง พ.ย.)", open: "≈10:00-18:00 (ปลาย มิ.ย.-ส.ค. ถึง 19:00)" },
  108: { closed: "จันทร์ (4 พ.ย.-28 เม.ย.)", fee: "≈¥800 (สวนประติมากรรม)" }, 114: { closed: "ปิด 24 พ.ย.-11 ธ.ค. 2026 และ 24 ก.พ.-13 มี.ค. 2027" }, 117: { closed: "31 ธ.ค.-1 ม.ค." },
  118: { open: "≈10:00-17:00 (ธ.ค.-มี.ค.) / 9:30-17:00 (เม.ย.-พ.ย.)", closed: "พุธ, 29 ธ.ค.-5 ม.ค." }, 169: { fee: "≈¥800", open: "≈9:30-16:30 (ต.ค.-เม.ย.) / 9:30-17:00 (พ.ค.-ก.ย.)", closed: "จันทร์, 29 ธ.ค.-3 ม.ค." },
  175: { open: "≈9:00-16:00 (พ.ย.-มี.ค.) / 9:00-17:00 (เม.ย.-ต.ค.)", closed: "1-7 ม.ค." }, 176: { closed: "อังคาร, 29 ธ.ค.-3 ม.ค." }, 241: { open: "≈ทางเดิน 5:45-24:30 (ร้าน ≈10:00-20:00)" },
  250: { open: "≈10:00-17:00 (พ.ย.-เม.ย.) / 9:30-17:00 (พ.ค.-ต.ค.)", closed: "พุธ (พ.ย.-เม.ย.) / พุธที่ 4 ของเดือน (พ.ค.-ต.ค.), ช่วงปีใหม่" },
  275: { open: "≈10:00-17:00 (ธ.ค.-ก.พ.) / 9:00-18:00 (มิ.ย.-ส.ค.)", closed: "31 ธ.ค.-2 ม.ค." }, 280: { open: "≈13:00-24:00 (ศ.-ส. ถึง 1:00)", closed: "ไม่แน่นอน" },
  281: { open: "≈10:00-18:00", closed: "1 ม.ค." }, 284: { open: "≈10:00-18:00", closed: "อังคาร (วันที่ 1 และวันหยุดราชการเปิด)" }, 285: { months: [6, 7, 8, 9], closed: "ปิด ต.ค.-พ.ค." },
  287: { open: "≈12:00-21:00" }, 289: { open: "≈10:00-17:30" }, 294: { months: [5, 6, 7, 8, 9], open: "≈9:00-16:00 (ออกเรือเป็นรอบ พ.ค.-ก.ย.)" },
  // ฮาโกดาเตะ (hakobura.jp)
  39: { open: "≈10:00-21:00 (ต.ค.-เม.ย.) / 10:00-22:00 (ปลาย เม.ย.-ก.ย.)", closed: "- (งดวิ่งเมื่ออากาศแย่)" }, 41: { open: "≈6:00-14:00 (ม.ค.-เม.ย.) / 5:00-14:00" }, 42: { fee: "≈¥1,200" },
  44: { open: "≈9:30-16:30 (พ.ย.-มี.ค.) / 9:30-18:00 (เม.ย.-ต.ค.)", closed: "29 ธ.ค.-1 ม.ค." }, 95: { open: "≈9:00-16:00 (ธ.ค.-ก.พ.) / 8:30-17:00 (พ.ค.-ก.ย.)", closed: "29 ธ.ค.-2 ม.ค." },
  127: { closed: "ปิด 11 ธ.ค.-10 เม.ย." }, 128: { open: "≈9:00-17:00 (พ.ย.-มี.ค.) / 9:00-18:00 (เม.ย.-ต.ค.)", closed: "31 ธ.ค.-3 ม.ค." },
  186: { open: "≈10:00-17:00 (เสาร์ถึง 16:00, อาทิตย์ 13:00-16:00)", closed: "ภายในปิด 25 ธ.ค.-24 มี.ค. (ดูภายนอกได้)" }, 187: { closed: "30 ธ.ค.-5 ม.ค., ช่วงพิธี" },
  188: { open: "≈9:00-17:00 (พ.ย.-มี.ค.) / 9:00-19:00 (เม.ย.-ต.ค.)", closed: "31 ธ.ค.-1 ม.ค." }, 189: { open: "≈9:00-17:00 (พ.ย.-มี.ค.) / 9:00-18:00 (เม.ย.-ต.ค.)", closed: "31 ธ.ค.-1 ม.ค." },
  221: { open: "≈7:00-17:00" }, 291: { open: "≈10:00-22:00", closed: "31 ธ.ค." },
  4: { type: "ย่าน / อาหาร / กลางคืน" }, 47: { type: "ย่าน / อาหาร" }, 249: { type: "ย่าน / อาหาร" }, 257: { type: "ย่าน / อาหาร / กลางคืน" }, 260: { type: "ย่าน / อาหาร / กลางคืน" },
  335: { months: [9, 10], sn: { autumn: "11 ก.ย.-3 ต.ค. 2026" } }, 337: { ref: "https://www.sapporo.travel/event/event-list/yukitouro/" },
};

(async () => {
  const byId = Object.fromEntries(places.map((p) => [p.id, p]));
  let nFix = 0, nRef = 0, nGeo = 0;
  // จุดเดิม: ลิงก์อ้างอิง + ข้อมูลติดต่อ + พิกัดจากที่อยู่ทางการ
  for (const [id, s] of Object.entries(SRC.existing)) {
    const p = byId[id];
    if (!p) continue;
    p.ref = s.ref; nRef++;
    if (!p.url && s.site) p.url = s.site;
    if (s.addr && !p.addrJa) p.addrJa = hw(s.addr).replace(/〒?\d{3}-\d{4}\s*/, "").slice(0, 60);
    if (s.phone && !p.phone) p.phone = hw(s.phone).match(/[\d\-()]{9,}/)?.[0] || undefined;
    if (+id >= 303) { // รอบ 5 (ค่าเดา): ใช้เวลา/วันหยุดทางการ
      const food = /อาหาร|คาเฟ่/.test(p.type);
      const o = hours(s.hours), c = closed(s.closed), f = fee(s.fee, false);
      if (o) p.open = o;
      if (c) p.closed = c;
      if (f && !food) p.fee = f;
    }
    if (s.ll) { // หมุดแผนที่ทางการ (hakobura.jp) แม่นกว่าที่อยู่ • พื้นที่กว้าง (สวนโอนุมะ ยุโนะคาวะ ย่านวัดมัตสึมาเอะ ถนนเอซาชิ) คงเดิม
      if (km(p.lat, p.lng, s.ll[0], s.ll[1]) > 0.15 && ![45, 94, 218, 224, 259].includes(+id)) { p.lat = +s.ll[0].toFixed(5); p.lng = +s.ll[1].toFixed(5); p.acc = "จากหมุดแผนที่บนเว็บทางการ"; nGeo++; }
      p.checked = SRC.checked;
      continue;
    }
    const a = cleanAddr(s.addr, s.city), g = await gsi(a);
    if (g && precise(g, a) && km(p.lat, p.lng, g[0], g[1]) > 0.3 && ![10, 17, 21, 46, 87, 109, 117, 171, 302].includes(+id)) {
      p.lat = +g[0].toFixed(5); p.lng = +g[1].toFixed(5); p.acc = "จากที่อยู่ทางการ (GSI)"; nGeo++;
    }
    p.checked = SRC.checked;
  }
  for (const [id, f] of Object.entries(FIX)) { Object.assign(byId[id], f); nFix++; }
  // จุดที่ไม่มีในเว็บท่องเที่ยวของเมือง: ลิงก์เว็บทางการของสถานที่/สมาคมท่องเที่ยวพื้นที่ (เปิดตรวจแล้วว่าใช้ได้)
  for (const [id, u] of Object.entries(SRC.refs || {})) if (byId[id] && !byId[id].ref) { byId[id].ref = u; byId[id].url ||= u; nRef++; }

  // จุดใหม่
  const N = (s) => hw(s).replace(/[\s・「」『』()（）\-〜~、。]/g, "").replace(/(本店|総本店|本館)$/, "").toLowerCase();
  const have = places.map((p) => [N(p.ja), p.lat, p.lng]);
  let nid = Math.max(...places.map((p) => p.id)) + 1, added = 0, rough = 0, refreshed = 0;
  const skipped = [];
  for (const r of SRC.add) {
    const s = r.src, ja = hw(s.name).replace(/&#0?38;/g, "&");
    const a = cleanAddr(s.addr, s.city), g = s.ll ? [s.ll[0], s.ll[1], "pin"] : await gsi(a);
    if (!g) { skipped.push(ja + " (ไม่มีพิกัด)"); continue; }
    const hub = HUBS.reduce((b, h) => (km(g[0], g[1], h.lat, h.lng) < km(g[0], g[1], b.lat, b.lng) ? h : b));
    // ซ้ำ = ชื่อเดียวกัน/ซ้อนกัน และอยู่ห่างไม่เกิน 30 กม. (ร้านชื่อเดียวกันคนละเมืองไม่นับ • ฐานอาจถูกคำนวณใหม่ภายหลัง จึงเทียบระยะแทนฐาน)
    const food = /อาหาร|คาเฟ่/.test(r.type) && !/พิพิธ|ฟาร์ม|ตลาด/.test(r.type);
    const open24 = /สวน|จุดชมวิว|ธรรมชาติ|ย่าน|ถ่ายรูป/.test(r.type) && !/พิพิธ/.test(r.type); // ที่โล่งไม่มีเวลาเปิด = เข้าได้ตลอด
    const op = hours(s.hours) || (open24 ? "ตลอดเวลา" : "");
    const conv = { open: op || "ตรวจเวลาเปิด (ดูเว็บ)", closed: closed(s.closed) || (op ? "-" : "ตรวจ"), fee: fee(s.fee, food) || (/ช้อปปิ้ง|สวน|ธรรมชาติ|จุดชมวิว|ประวัติ/.test(r.type) && !/กิจกรรม|สกี|ออนเซ็น|สวนสัตว์/.test(r.type) ? "ฟรี" : "ตรวจ"), caution: op ? "" : "เว็บทางการไม่ระบุเวลาเปิด ตรวจก่อนไป" };
    conv.feeYen = /¥([\d,]+)/.test(conv.fee) ? +conv.fee.match(/¥([\d,]+)/)[1].replace(/,/g, "") : 0;
    const dup = have.findIndex(([h, la, ln]) => h === N(ja) || km(la, ln, g[0], g[1]) < 30 && (h.length >= 3 && (N(ja).length >= 4 && (h.includes(N(ja)) || N(ja).includes(h)))));
    if (dup >= 0) {
      // จุดที่เคยเพิ่มจากหน้าทางการเดียวกัน: อัปเดตเวลา/วันปิด/ค่าเข้าตามตัวแปลงล่าสุด แล้วทับด้วยที่แก้มือใน FIX
      const e = places[dup];
      const want = { ...conv, ...FIX[e.id] };
      if (e.ref === s.ref && ["open", "closed", "fee", "feeYen", "caution"].some((k) => (e[k] || "") !== (want[k] || ""))) {
        Object.assign(e, want);
        if (!e.caution) delete e.caution;
        refreshed++;
      }
      skipped.push(ja); continue;
    }
    const pin = g[2] === "pin", pre = pin || precise(g, a);
    if (!pre) rough++;
    const o = Object.fromEntries(r.opts.split(",").filter(Boolean).map((x) => [x[0], x.slice(1)]));
    const dur = +(o.d || (food ? (/คาเฟ่/.test(r.type) ? 0.75 : 1) : 1));
    // m12-3 = ธ.ค.-มี.ค. (ข้ามปี)
    const months = o.m ? (([a1, b1 = a1]) => Array.from({ length: ((b1 - a1 + 12) % 12) + 1 }, (_, i) => ((a1 - 1 + i) % 12) + 1))(o.m.split("-").map(Number)) : undefined;
    const p = {
      id: nid++, region: hub.region, area: hub.name.replace(/ \(.*\)$/, ""), hub: hub.id, name: r.th, en: r.en, ja,
      stars: +(o.s || 1), pop: o.p || "คนรู้จักน้อย", type: r.type, tags: r.tags,
      open: conv.open, closed: conv.closed, fee: conv.fee,
      dur: dur >= 1 ? `${dur} ชม.` : `${Math.round(dur * 60)} นาที`, hours: dur, highlight: r.hl, caution: conv.caution,
      best: o.b || (r.opts.includes("ev") ? "ค่ำ" : food ? (/คาเฟ่/.test(r.type) ? "บ่าย" : "เที่ยง") : "กลางวัน"),
      parking: parking(s.park), months, tr: transit(s.access), evening: r.opts.split(",").includes("ev"),
      feeYen: 0, lat: +g[0].toFixed(5), lng: +g[1].toFixed(5), acc: pin ? "จากหมุดแผนที่บนเว็บทางการ" : pre ? "จากที่อยู่ทางการ (GSI)" : "ประมาณ (ระดับตำบลจากที่อยู่ทางการ)",
      addrJa: hw(s.addr).replace(/〒?\d{3}-\d{4}\s*/, "").slice(0, 60), phone: hw(s.phone).match(/[\d\-()]{9,}/)?.[0], url: s.site || undefined, ref: s.ref, checked: SRC.checked,
    };
    p.feeYen = conv.feeYen;
    for (const k of Object.keys(p)) if (p[k] === undefined || p[k] === "") if (k !== "caution" && k !== "parking") delete p[k];
    places.push(p); have.push([N(ja), p.lat, p.lng]); added++;
  }
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  fs.writeFileSync(DATA, head + "window.PLACES = " + JSON.stringify(places, null, 1) + ";\n");
  console.log({ added, refreshed, rough, skipped: skipped.length, refs: nRef, fixed: nFix, regeo: nGeo, total: places.length });
  if (skipped.length) console.log("ข้าม (ซ้ำ/ไม่มีพิกัด):", skipped.join(" / "));
})();
