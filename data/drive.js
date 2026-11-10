// สร้างจาก xlsx ด้วย tools/build_data.py แล้วแก้ต่อได้
window.DRIVE_EDGES = [
 {
  "a": "CTS",
  "b": "sapporo",
  "km": 50,
  "h": 0.9,
  "road": "ทางด่วน Doo (道央道)",
  "risk": "ต่ำ",
  "high": false
 },
 {
  "a": "sapporo",
  "b": "otaru",
  "km": 40,
  "h": 0.75,
  "road": "ทางด่วน Sasson (札樽道)",
  "risk": "ต่ำ: ถนนเลียบทะเลลมแรงบางวัน",
  "high": false
 },
 {
  "a": "sapporo",
  "b": "jozankei",
  "km": 30,
  "h": 0.8,
  "road": "R230",
  "risk": "ปานกลาง: ขึ้นเขา หิมะหนา",
  "high": false
 },
 {
  "a": "jozankei",
  "b": "toya",
  "km": 70,
  "h": 1.5,
  "road": "R230 ช่องเขานากายามะ (中山峠)",
  "risk": "สูง: ช่องเขาสูง whiteout บ่อย",
  "high": true
 },
 {
  "a": "sapporo",
  "b": "niseko",
  "km": 100,
  "h": 2,
  "road": "R230 ช่องเขานากายามะ หรือ อ้อมทางโอตารุ R5",
  "risk": "สูง: มือใหม่ควรอ้อมทางโอตารุ (ไกลกว่าแต่ต่ำกว่า)",
  "high": true
 },
 {
  "a": "otaru",
  "b": "niseko",
  "km": 75,
  "h": 1.5,
  "road": "R5 ช่องเขาอินาโฮะ (稲穂峠)",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "CTS",
  "b": "shikotsu",
  "km": 30,
  "h": 0.6,
  "road": "ถนนผ่านป่า (道道16)",
  "risk": "ปานกลาง: ป่ามืด กลางคืน black ice",
  "high": false
 },
 {
  "a": "sapporo",
  "b": "shikotsu",
  "km": 45,
  "h": 1,
  "road": "R453",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "CTS",
  "b": "noboribetsu",
  "km": 65,
  "h": 0.9,
  "road": "ทางด่วน Doo",
  "risk": "ต่ำ",
  "high": false
 },
 {
  "a": "noboribetsu",
  "b": "toya",
  "km": 50,
  "h": 1,
  "road": "ทางด่วน Doo (เลี่ยงช่องเขาโอโรฟุเระ)",
  "risk": "ปานกลาง: ช่องเขาโอโรฟุเระอันตรายหน้าหนาว",
  "high": false
 },
 {
  "a": "toya",
  "b": "hakodate",
  "km": 170,
  "h": 2.5,
  "road": "ทางด่วน Doo ถึง Onuma Koen IC",
  "risk": "ปานกลาง: ระยะไกล ออกเช้า",
  "high": false
 },
 {
  "a": "sapporo",
  "b": "hakodate",
  "km": 300,
  "h": 4,
  "road": "ทางด่วน Doo",
  "risk": "ปานกลาง: ขับวันเดียวเหนื่อย พิจารณารถไฟ/เครื่องบิน",
  "high": false
 },
 {
  "a": "sapporo",
  "b": "asahikawa",
  "km": 140,
  "h": 2,
  "road": "ทางด่วน Doo",
  "risk": "ต่ำ: ทางด่วนกำจัดหิมะดี",
  "high": false
 },
 {
  "a": "CTS",
  "b": "asahikawa",
  "km": 175,
  "h": 2.3,
  "road": "ทางด่วน Doo",
  "risk": "ต่ำ",
  "high": false
 },
 {
  "a": "asahikawa",
  "b": "biei",
  "km": 25,
  "h": 0.6,
  "road": "R237",
  "risk": "ต่ำ",
  "high": false
 },
 {
  "a": "biei",
  "b": "furano",
  "km": 35,
  "h": 0.75,
  "road": "R237",
  "risk": "ต่ำ",
  "high": false
 },
 {
  "a": "sapporo",
  "b": "furano",
  "km": 115,
  "h": 2,
  "road": "ทางด่วน Doo ถึงทากิคาวะ + R38",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "asahikawa",
  "b": "sounkyo", "noFuel": "เลยคามิกาวะแล้วไม่มีปั๊ม",
  "km": 70,
  "h": 1.2,
  "road": "R39 / ทางด่วนอาซาฮิคาวะ-มนเบ็ตสึ (ฟรี)",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "furano",
  "b": "tomamu",
  "km": 60,
  "h": 1,
  "road": "R237 ช่องเขาคานายามะ",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "sapporo",
  "b": "tomamu",
  "km": 150,
  "h": 1.8,
  "road": "ทางด่วน Doto (道東道)",
  "risk": "ปานกลาง: ช่วงอุโมงค์/ภูเขา",
  "high": false
 },
 {
  "a": "tomamu",
  "b": "obihiro", "noFuel": "ข้ามเขา ~1 ชม. ไม่มีปั๊ม",
  "km": 80,
  "h": 1.2,
  "road": "ทางด่วน Doto",
  "risk": "ปานกลาง: เลี่ยง R274 ช่องเขานิชโช (日勝峠) ปิดบ่อย",
  "high": false
 },
 {
  "a": "CTS",
  "b": "obihiro",
  "km": 190,
  "h": 2.3,
  "road": "ทางด่วน Doto",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "obihiro",
  "b": "kushiro",
  "km": 120,
  "h": 2,
  "road": "ทางด่วน Doto + R38/R240",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "kushiro",
  "b": "akan", "noFuel": "ทางเข้าป่าอากังปั๊มน้อย",
  "km": 75,
  "h": 1.3,
  "road": "R240",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "akan",
  "b": "kawayu", "noFuel": "ข้ามเขาอากัง-มาชู ~1 ชม. ไม่มีปั๊ม",
  "km": 55,
  "h": 1,
  "road": "R241 (阿寒横断道路)",
  "risk": "สูง: ถนนข้ามเขา whiteout",
  "high": true
 },
 {
  "a": "kawayu",
  "b": "abashiri",
  "km": 80,
  "h": 1.4,
  "road": "R391",
  "risk": "ปานกลาง: หรือ R243 ช่องเขาบิโฮโระ (เสี่ยงกว่า)",
  "high": false
 },
 {
  "a": "abashiri",
  "b": "utoro",
  "km": 75,
  "h": 1.3,
  "road": "R244 / R334 เลียบทะเล",
  "risk": "ปานกลาง: ลมทะเลพัดหิมะ (whiteout ระดับต่ำ)",
  "high": false
 },
 {
  "a": "abashiri",
  "b": "monbetsu",
  "km": 110,
  "h": 2,
  "road": "R238 เลียบทะเลโอค็อตสค์",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "monbetsu",
  "b": "asahikawa",
  "km": 140,
  "h": 2.2,
  "road": "ทางด่วนอาซาฮิคาวะ-มนเบ็ตสึ (ฟรี)",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "abashiri",
  "b": "sounkyo", "noFuel": "ช่องเขาเซกิโฮกุ ~1.5 ชม. ไม่มีปั๊ม",
  "km": 140,
  "h": 2.5,
  "road": "R39 ช่องเขาอิชิกิตะ (石北峠)",
  "risk": "สูง: ช่องเขาสูง ปิดเมื่อพายุ",
  "high": true
 },
 {
  "a": "abashiri",
  "b": "MMB",
  "km": 20,
  "h": 0.4,
  "road": "R39",
  "risk": "ต่ำ: บินออกจากที่นี่แทนการขับกลับซัปโปโร",
  "high": false
 },
 {
  "a": "sapporo",
  "b": "wakkanai", "noFuel": "ช่วงชายทะเลตะวันตกปั๊มห่างกันมาก",
  "km": 330,
  "h": 4.8,
  "road": "ทางด่วน Doo + R40/R238",
  "risk": "สูง: ไกลมาก พายุหิมะเหนือสุด",
  "high": true
 },
 {
  "a": "utoro",
  "b": "rausu", "noFuel": "ทางอ้อมเลียบทะเลไกล ปั๊มน้อย",
  "km": 160,
  "h": 3,
  "road": "อ้อม R244/R335 ผ่านชิเบ็ตสึ",
  "risk": "สูง: ช่องเขาชิเรโตโกะ R334 ปิดหน้าหนาว ต้องอ้อม",
  "high": true
 },
 {
  "a": "abashiri",
  "b": "rausu",
  "km": 170,
  "h": 3,
  "road": "R244 / R335 ผ่านชาริ-ชิเบ็ตสึ",
  "risk": "ปานกลาง: ลมทะเลพัดหิมะ",
  "high": false
 },
 {
  "a": "kawayu",
  "b": "rausu",
  "km": 90,
  "h": 1.7,
  "road": "R243/R272 ผ่านนากาชิเบ็ตสึ",
  "risk": "ปานกลาง",
  "high": false
 },
 {
  "a": "kushiro",
  "b": "rausu",
  "km": 160,
  "h": 2.8,
  "road": "R272/R244",
  "risk": "ปานกลาง: ระยะไกล",
  "high": false
 }
];
