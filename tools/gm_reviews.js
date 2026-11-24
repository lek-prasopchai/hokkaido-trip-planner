// จำนวนรีวิว Google Maps ของแต่ละสถานที่ → p.rv (ปัด 2 หลักแรก) + p.gr คะแนนดาว ใช้กรอง/เรียง "คนไปเยอะ" ในหน้าสถานที่
// เปิด Google Maps ทีละที่ด้วยเบราว์เซอร์จริง (โหมดซ่อนหน้าต่าง Google ซ่อนจำนวนรีวิว) ช้าๆ หยุดเองถ้าเจอหน้าบล็อก
// ต้องมี playwright-core (npm i playwright-core ที่อื่น แล้ว NODE_PATH ชี้ไป) + Chromium ของ Playwright
// node tools/gm_reviews.js [id,id|all]  = ดึงต่อจากที่ค้าง (แคชใน tools/gm_reviews.json)
// node tools/gm_reviews.js retry        = ลองซ้ำด้วยชื่ออังกฤษ เฉพาะที่ไม่ได้ตัวเลข/จับคู่ไกลเกิน 2 กม. (เก็บผลใหม่เมื่อดีกว่า)
// node tools/gm_reviews.js "39=函館山ロープウェイ山麓駅"  = ค้นใหม่ด้วยคำที่กำหนดเอง (แก้ที่จับคู่ผิด)
// node tools/gm_reviews.js verify       = เปิดซ้ำเฉพาะที่ยังไม่มีพิกัดยืนยัน (km ว่าง) เพื่อตัดที่ชื่อซ้ำนอกพื้นที่
// node tools/gm_reviews.js --merge      = เขียน rv ลง data/places.js
const fs = require("fs");
const FILE = __dirname + "/../data/places.js", OUT = __dirname + "/gm_reviews.json";
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
if (process.argv[2] === "--merge") {
  const src = fs.readFileSync(FILE, "utf8"), i = src.indexOf("window.PLACES = ") + 16, j = src.lastIndexOf(";");
  const P = JSON.parse(src.slice(i, j));
  const round2 = (n) => { const k = 10 ** Math.max(0, String(n).length - 2); return Math.round(n / k) * k; };
  let c = 0;
  // ไกลเกิน 2 กม. = อาจเป็นคนละที่: ใช้เฉพาะเมื่อชื่อตรงกันและไม่เกิน 10 กม. (ทะเลสาบ/สวน/แหลม กว้าง หรือหมุดเราคลาดเคลื่อน)
  const N = (t) => String(t || "").normalize("NFKC").replace(/[s・()（）「」『』〜~-]/g, "").toLowerCase();
  const same = (x) => { const a = N(x.q), b = N(x.gname); return a && b && (a.includes(b) || b.includes(a)); };
  const ok = (x) => x.n && (!(x.km > 2) || (x.km <= 10 && same(x)));
  for (const p of P) { const x = done[p.id] || {}; delete p.rv; delete p.gr; if (ok(x)) { p.rv = round2(x.n); if (x.g) p.gr = x.g; c++; } }
  fs.writeFileSync(FILE, src.slice(0, i) + JSON.stringify(P, null, 1) + src.slice(j));
  console.log("rv set on", c, "of", P.length);
  process.exit();
}
const { chromium } = require("playwright-core");
global.window = global;
require(FILE);
const arg = process.argv[2] || "";
let list = PLACES.filter((p) => !p.gone && p.lat);
const custom = arg.includes("=") ? Object.fromEntries(arg.split(",").map((t) => t.split("=")).map(([k, v]) => [+k, v])) : null;
const bad = (x) => !x.n || x.km > 2;
if (custom) list = list.filter((p) => p.id in custom);
else if (arg === "verify") list = list.filter((p) => done[p.id]?.n && done[p.id].km == null);
else if (arg === "retry") list = list.filter((p) => done[p.id] && bad(done[p.id]) && !done[p.id].retried && p.en);
else if (arg && arg !== "all") { const ids = new Set(arg.split(",").map(Number)); list = list.filter((p) => ids.has(p.id)); }
else if (arg !== "all") list = list.filter((p) => !(p.id in done));

const km = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r; return Math.hypot(x, y) * 6371; };
const num = (s) => +String(s).replace(/[^\d]/g, "");

(async () => {
  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + "/ms-playwright/chromium-1243/chrome-win64/chrome.exe", headless: false });
  const page = await (await br.newContext({ locale: "ja-JP", viewport: { width: 1200, height: 900 } })).newPage();
  for (const p of list) {
    const q = custom ? custom[p.id] : arg === "retry" ? p.en : p.ja || p.en || p.name;
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(q)}/@${p.lat},${p.lng},15z?hl=ja`, { waitUntil: "domcontentloaded" });
    if (/sorry|consent/.test(page.url())) { console.log("BLOCKED at", p.id, page.url()); break; }
    await page.waitForSelector('h1.DUwDvf, a.hfpxzc, div[role="feed"]', { timeout: 12000 }).catch(() => {});
    // place panel: review count renders a moment after the h1
    await page.waitForFunction(() => !document.querySelector("h1.DUwDvf") || [...document.querySelectorAll("[aria-label]")].some((e) => /件のクチコミ/.test(e.getAttribute("aria-label"))) || /(d[d,]*)/.test(document.querySelector("div[role=main]")?.innerText || ""), null, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(800);
    // place panel: URL gets !3d!4d (pin) a moment later; needed to reject same-name places elsewhere in Japan
    if (await page.$("h1.DUwDvf")) await page.waitForURL(/!3d/, { timeout: 5000 }).catch(() => {});
    const r = await page.evaluate(() => {
      const ll = (u) => { const m = u.match(/!3d(-?[\d.]+)!4d(-?[\d.]+)/); return m ? [+m[1], +m[2]] : null; };
      const h1 = document.querySelector("h1.DUwDvf");
      if (h1) {
        const labs = [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")), lab = labs.find((a) => /件のクチコミ/.test(a));
        const m = (h1.closest("div[role=main]")?.innerText || "").match(/d.ds*(([d,]+))/);
        return { kind: "place", name: h1.textContent, n: lab || (m ? m[1] : ""), g: m ? m[0].slice(0, 3) : labs.map((t) => t.match(/^\s*(\d\.\d)\s*つ星\s*$/)).find(Boolean)?.[1] || "", ll: ll(location.href) };
      }
      return { kind: "list", items: [...document.querySelectorAll("a.hfpxzc")].slice(0, 5).map((a) => {
        const box = a.parentElement; const m = box.innerText.match(/\d\.\d\s*\(([\d,]+)\)/);
        return { name: a.getAttribute("aria-label"), n: m ? m[1] : "", g: m ? m[0].slice(0, 3) : "", ll: ll(a.href) };
      }) };
    });
    let hit = null;
    if (r.kind === "place") hit = { name: r.name, n: num(r.n), g: r.g, ll: r.ll };
    else {
      // prefer a result whose name matches the query (大通公園 vs 大通公園西１丁目), then the nearest
      const norm = (t) => String(t || "").replace(/[s（）()・･]/g, "").normalize("NFKC");
      const c = r.items.filter((x) => x.ll).map((x) => ({ ...x, n: num(x.n), d: km(p.lat, p.lng, ...x.ll), exact: norm(x.name) === norm(q) || norm(x.name).startsWith(norm(q) + "(") }));
      hit = c.filter((x) => x.exact)[0] || c.filter((x) => x.d < 3).sort((a, b) => b.n - a.n)[0] || null;
    }
    const d = hit?.ll ? km(p.lat, p.lng, ...hit.ll) : null;
    const res = hit ? { q, gname: hit.name, n: hit.n || null, g: +hit.g || null, km: d && +d.toFixed(2), kind: r.kind } : { q, n: null };
    done[p.id] = arg === "retry" && bad(res) ? { ...done[p.id], retried: true } : res;
    console.log(p.id, q, "→", JSON.stringify(done[p.id]));
    fs.writeFileSync(OUT, JSON.stringify(done, null, 1));
    await page.waitForTimeout(2500 + Math.random() * 2500);
  }
  await br.close();
})();
