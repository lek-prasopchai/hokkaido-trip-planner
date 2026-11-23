// เติม MAPCODE (DENSO) ให้ทุกสถานที่ใน data/places.js จากพิกัด lat/lng ผ่าน API ของ japanmapcode.com
// API ไม่เปิด CORS ให้เว็บอื่น จึงดึงล่วงหน้าตอนแก้ข้อมูล ไม่ใช่ตอนใช้งาน • รันซ้ำ: node tools/mapcodes.js [--all]
// ค่าเดิมเก็บไว้ (ไม่ดึงซ้ำ) เว้นแต่ใส่ --all หรือพิกัดเปลี่ยน (mcLL ไม่ตรง lat,lng)
const fs = require("fs");
const FILE = __dirname + "/../data/places.js";
const src = fs.readFileSync(FILE, "utf8"), i = src.indexOf("window.PLACES = ") + 16, j = src.lastIndexOf(";");
const P = JSON.parse(src.slice(i, j));
const all = process.argv.includes("--all");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mapcode(lat, lng) {
  for (let n = 0; n < 5; n++) {
    const r = await fetch(`https://api.japanmapcode.com/mapcode?lat=${lat}&lng=${lng}`, { headers: { Origin: "https://japanmapcode.com", Referer: "https://japanmapcode.com/" } });
    if (r.status === 429) { await sleep(15000); continue; }
    const j = await r.json();
    if (j.success && /^\d{1,4} \d{3} \d{3}(\*\d{2})?$/.test(j.data?.mapcode)) return j.data.mapcode;
    throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  }
  throw new Error("rate limited");
}

(async () => {
  let done = 0;
  for (const p of P) {
    const ll = `${p.lat},${p.lng}`;
    if (!all && p.mapcode && p.mcLL === ll) continue;
    p.mapcode = await mapcode(p.lat, p.lng); p.mcLL = ll;
    if (++done % 50 === 0) { console.log(done); fs.writeFileSync(FILE, src.slice(0, i) + JSON.stringify(P, null, 1) + src.slice(j)); }
    await sleep(250); // API จำกัด 300 ครั้ง/นาที
  }
  fs.writeFileSync(FILE, src.slice(0, i) + JSON.stringify(P, null, 1) + src.slice(j));
  console.log("updated", done, "of", P.length);
})();
