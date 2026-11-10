// เส้นทางรถไฟ/บัสระหว่างฐาน (ชั่วโมงโดยประมาณ รวมเดินต่อรถเล็กน้อย): เขียนมือ ตรวจตารางจริงที่ jrhokkaido.co.jp / Google Maps ก่อนเดินทาง
// pass = ใช้ JR Hokkaido Rail Pass ได้ไหม, freq = ความถี่โดยประมาณ
window.TRANSIT_EDGES = [
  { a: "CTS", b: "sapporo", h: 0.65, by: "JR Rapid Airport", pass: true, freq: "ทุก 12 นาที" },
  { a: "CTS", b: "chitose", h: 0.15, by: "JR", pass: true, freq: "บ่อย" },
  { a: "chitose", b: "shikotsu", h: 0.8, by: "บัส Chuo จากสถานีจิโตเสะ", pass: false, freq: "วันละ 4-5 เที่ยว" },
  { a: "sapporo", b: "otaru", h: 0.6, by: "JR Rapid", pass: true, freq: "ทุก 15 นาที" },
  { a: "sapporo", b: "jozankei", h: 1.1, by: "บัส Jotetsu / Kappa Liner", pass: false, freq: "ชั่วโมงละ 1-2 เที่ยว" },
  { a: "sapporo", b: "niseko", h: 2.7, by: "บัสสกี (ฤดูหนาว) หรือ JR ต่อที่โอตารุ+คุตจัง", pass: false, freq: "วันละหลายเที่ยว (จอง)" },
  { a: "CTS", b: "niseko", h: 2.8, by: "บัสสนามบิน-นิเซโกะ (ฤดูหนาว)", pass: false, freq: "วันละหลายเที่ยว (จอง)" },
  { a: "otaru", b: "niseko", h: 1.8, by: "JR สายท้องถิ่นถึงคุตจัง + บัส", pass: true, freq: "น้อย" },
  { a: "sapporo", b: "noboribetsu", h: 1.4, by: "JR Suzuran/Hokuto + บัส 15 นาที", pass: true, freq: "ชั่วโมงละ 1" },
  { a: "CTS", b: "noboribetsu", h: 1.3, by: "JR (ต่อที่มินามิจิโตเสะ) + บัส", pass: true, freq: "ชั่วโมงละ 1" },
  { a: "noboribetsu", b: "toya", h: 1.0, by: "JR Hokuto + บัส 20 นาที", pass: true, freq: "ชั่วโมงละ 1" },
  { a: "sapporo", b: "toya", h: 2.0, by: "JR Hokuto + บัส", pass: true, freq: "ชั่วโมงละ 1" },
  { a: "toya", b: "hakodate", h: 2.1, by: "JR Hokuto", pass: true, freq: "ชั่วโมงละ 1" },
  { a: "sapporo", b: "hakodate", h: 3.8, by: "JR Hokuto", pass: true, freq: "ชั่วโมงละ 1" },
  { a: "hakodate", b: "HKD", h: 0.4, by: "บัสสนามบิน", pass: false, freq: "ทุก 20-30 นาที" },
  { a: "sapporo", b: "asahikawa", h: 1.5, by: "JR Lilac / Kamui", pass: true, freq: "ทุก 30 นาที" },
  { a: "asahikawa", b: "AKJ", h: 0.6, by: "บัสสนามบิน", pass: false, freq: "ตามเที่ยวบิน" },
  { a: "asahikawa", b: "biei", h: 0.6, by: "JR Furano Line", pass: true, freq: "ชั่วโมงละ 1" },
  { a: "biei", b: "furano", h: 0.7, by: "JR Furano Line", pass: true, freq: "ชั่วโมงละ 1" },
  { a: "asahikawa", b: "sounkyo", h: 2.0, by: "บัส Dohoku (ต่อที่คามิคาวะ)", pass: false, freq: "วันละ 5-6 เที่ยว" },
  { a: "sapporo", b: "tomamu", h: 1.8, by: "JR Ozora / Tokachi", pass: true, freq: "วันละ ~10 เที่ยว" },
  { a: "tomamu", b: "obihiro", h: 1.1, by: "JR Ozora / Tokachi", pass: true, freq: "วันละ ~10 เที่ยว" },
  { a: "sapporo", b: "obihiro", h: 2.6, by: "JR Ozora / Tokachi", pass: true, freq: "วันละ ~11 เที่ยว" },
  { a: "obihiro", b: "OBO", h: 0.6, by: "บัสสนามบิน", pass: false, freq: "ตามเที่ยวบิน" },
  { a: "obihiro", b: "kushiro", h: 1.6, by: "JR Ozora", pass: true, freq: "วันละ 6 เที่ยว" },
  { a: "kushiro", b: "KUH", h: 0.75, by: "บัสสนามบิน", pass: false, freq: "ตามเที่ยวบิน" },
  { a: "kushiro", b: "akan", h: 2.0, by: "บัส Akan", pass: false, freq: "วันละ 4-5 เที่ยว" },
  { a: "kushiro", b: "kawayu", h: 1.7, by: "JR Senmo Line", pass: true, freq: "วันละ 5 เที่ยว" },
  { a: "kawayu", b: "abashiri", h: 1.6, by: "JR Senmo Line", pass: true, freq: "วันละ 5 เที่ยว" },
  { a: "asahikawa", b: "abashiri", h: 3.8, by: "JR Taisetsu / Okhotsk", pass: true, freq: "วันละ 4 เที่ยว" },
  { a: "abashiri", b: "MMB", h: 0.5, by: "บัสสนามบิน", pass: false, freq: "ตามเที่ยวบิน" },
  { a: "abashiri", b: "utoro", h: 2.0, by: "JR ถึงชิเรโตโกะชาริ + บัส", pass: false, freq: "วันละ 3-5 เที่ยว" },
  { a: "sapporo", b: "monbetsu", h: 4.3, by: "บัสด่วน Okhotsk Liner", pass: false, freq: "วันละ 2 เที่ยว" },
  { a: "sapporo", b: "wakkanai", h: 5.2, by: "JR Soya", pass: true, freq: "วันละ 3 เที่ยว" },
];

// ราคา JR Hokkaido Rail Pass (ผู้ใหญ่, ซื้อล่วงหน้า) ตรวจ พ.ย. 2026
window.JR_PASS = { 5: 22000, 7: 28000, 10: 37000 };
// Hokkaido Expressway Pass (HEP) ตรวจ พ.ย. 2026: 2-5, 13, 14 วันเป็นราคาจริง / 6-12 วันประมาณจากช่วงระหว่างกลาง
window.HEP_PRICE = { 2: 3700, 3: 5200, 4: 6300, 5: 6800, 6: 7600, 7: 8200, 8: 8800, 9: 9400, 10: 9900, 11: 10300, 12: 10700, 13: 11000, 14: 11500 };
