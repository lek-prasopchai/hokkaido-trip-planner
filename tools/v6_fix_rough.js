// พิกัดระดับตำบล (จากที่อยู่ทางการที่ไม่มีเลขที่) → หาจุดจริงจากชื่อใน OpenStreetMap (Nominatim) รอบ ๆ ตำบลนั้น ±6 กม.
// แคชผลไว้ใน tools/v6_rough.json (null = หาไม่เจอ) • ใช้:  node tools/v6_fix_rough.js
const fs = require("fs"), path = require("path");
const DATA = path.join(__dirname, "../data/places.js"), CACHE = path.join(__dirname, "v6_rough.json");
const [head, body] = fs.readFileSync(DATA, "utf8").split("window.PLACES = ");
const places = JSON.parse(body.trim().replace(/;$/, ""));
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
const km = (a, b, c, d) => { const R = Math.PI / 180, x = Math.sin((c - a) * R / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin((d - b) * R / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const names = (p) => {
  const j = p.ja.normalize("NFKC");
  return [...new Set([j, j.replace(/[(（].*?[)）]/g, "").trim(), j.split(/[\s/／]/).filter((s) => s.length >= 2).sort((a, b) => b.length - a.length)[0], p.en])].filter(Boolean);
};
async function nominatim(q, p) {
  const d = 0.06, vb = [p.lng - d, p.lat + d, p.lng + d, p.lat - d].join(",");
  const u = `https://nominatim.openstreetmap.org/search?format=json&limit=3&countrycodes=jp&bounded=1&viewbox=${vb}&q=${encodeURIComponent(q)}`;
  const r = await fetch(u, { headers: { "user-agent": "hokkaido-trip-planner (personal trip planner)" } });
  await new Promise((s) => setTimeout(s, 1100));
  return r.ok ? r.json() : [];
}
(async () => {
  let fixed = 0;
  const miss = [];
  for (const p of places.filter((p) => /ระดับตำบล/.test(p.acc || ""))) {
    if (!(p.id in cache)) {
      cache[p.id] = null;
      for (const q of names(p)) {
        const r = (await nominatim(q, p))[0];
        if (r) { cache[p.id] = [+(+r.lat).toFixed(5), +(+r.lon).toFixed(5), q, r.display_name.slice(0, 60)]; break; }
      }
      fs.writeFileSync(CACHE, JSON.stringify(cache, null, 0));
    }
    const c = cache[p.id];
    if (!c) { miss.push(`${p.id} ${p.ja} (${p.addrJa || ""})`); continue; }
    console.log(`${km(p.lat, p.lng, c[0], c[1]).toFixed(1)}km #${p.id} ${p.ja} ← ${c[3]}`);
    Object.assign(p, { lat: c[0], lng: c[1], acc: "จาก OpenStreetMap (ชื่อสถานที่)" });
    fixed++;
  }
  fs.writeFileSync(DATA, head + "window.PLACES = " + JSON.stringify(places, null, 1) + ";\n");
  console.log({ fixed, miss: miss.length });
  console.log(miss.join("\n"));
})();
