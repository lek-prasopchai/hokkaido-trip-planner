// พิกัดจากหมุดแผนที่บนหน้าเว็บทางการ (furanotourism.com: maps?q=lat,lng • biei-hokkaido.jp: Google Maps embed !2d lng !3d lat)
// ใช้กับทุกสถานที่ที่ ref ชี้ไปสองเว็บนี้ • พิกัดที่ซ้ำกันหลายที่ (หมุดกลางเมือง) ไม่ใช้ • แคช tools/v6_pins.json
// ใช้:  node tools/v6_official_pins.js
const fs = require("fs"), path = require("path");
const DATA = path.join(__dirname, "../data/places.js"), CACHE = path.join(__dirname, "v6_pins.json");
const [head, body] = fs.readFileSync(DATA, "utf8").split("window.PLACES = ");
const places = JSON.parse(body.trim().replace(/;$/, ""));
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
const km = (a, b, c, d) => { const R = Math.PI / 180, x = Math.sin((c - a) * R / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin((d - b) * R / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
function pin(t) {
  const q = t.match(/maps\?q=(4[1-5]\.\d+),(14[0-5]\.\d+)/);
  if (q) return [+q[1], +q[2]];
  const e = t.match(/maps\/embed\?pb=[^"']*?!2d(14[0-5]\.\d+)!3d(4[1-5]\.\d+)/);
  return e ? [+e[2], +e[1]] : null;
}
(async () => {
  const todo = places.filter((p) => /furanotourism\.com\/jp\/spot\/spot_D|biei-hokkaido\.jp\/ja\/facility\//.test(p.ref || ""));
  let i = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (i < todo.length) {
      const p = todo[i++];
      if (p.ref in cache) continue;
      try { cache[p.ref] = pin(await (await fetch(p.ref, { headers: { "user-agent": "Mozilla/5.0" } })).text()); } catch { /* ลองใหม่รอบหน้า */ }
    }
  }));
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 0));
  const count = {};
  for (const c of Object.values(cache)) if (c) count[c.join()] = (count[c.join()] || 0) + 1;
  let moved = 0, same = 0, none = 0;
  for (const p of todo) {
    const c = cache[p.ref];
    if (!c || count[c.join()] > 2) { none++; continue; }
    const d = km(p.lat, p.lng, c[0], c[1]);
    if (d > 40) { console.log(`ข้าม (ไกลผิดปกติ ${d.toFixed(0)}km) #${p.id} ${p.ja}`); continue; }
    if (d > 0.15) { console.log(`${d.toFixed(2)}km #${p.id} ${p.ja}`); moved++; } else same++;
    p.lat = +c[0].toFixed(5); p.lng = +c[1].toFixed(5); p.acc = "จากหมุดแผนที่บนเว็บทางการ";
  }
  fs.writeFileSync(DATA, head + "window.PLACES = " + JSON.stringify(places, null, 1) + ";\n");
  console.log({ pages: todo.length, moved, same, none });
})();
