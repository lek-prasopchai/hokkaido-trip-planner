// เปลี่ยนเลขรุ่นไฟล์เว็บพร้อมกันทั้งสองที่ (รันทุกครั้งหลังแก้โค้ด/ก่อนอัปโหลด): node tools/bump.js
// - ?v=N ใน index.html: ให้เบราว์เซอร์โหลดไฟล์ใหม่ ไม่ใช้ของที่จำไว้
// - V = "hk-v2-N" ใน sw.js: ให้มือถือโหลดชุดออฟไลน์ใหม่และลบชุดเก่า
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), html = path.join(root, "index.html"), sw = path.join(root, "sw.js");
let h = fs.readFileSync(html, "utf8"), s = fs.readFileSync(sw, "utf8");
const vs = [...h.matchAll(/\?v=(\d+)/g)].map((m) => +m[1]), sm = s.match(/const V = "hk-v2-(\d+)"/);
if (!vs.length || !sm) throw new Error("หา ?v= ใน index.html หรือ V ใน sw.js ไม่เจอ");
const v = Math.max(...vs) + 1, sv = +sm[1] + 1;
h = h.replace(/\?v=\d+/g, `?v=${v}`);
s = s.replace(sm[0], `const V = "hk-v2-${sv}"`);
// ไฟล์ js ที่ index.html โหลด ต้องอยู่ในรายการออฟไลน์ของ sw.js ด้วย
const missing = [...h.matchAll(/src="(js|data)\/([\w-]+)\.js/g)].filter(([, , f]) => !s.includes(`"${f}"`)).map(([, d, f]) => `${d}/${f}.js`);
if (missing.length) throw new Error("ไฟล์ยังไม่อยู่ในรายการ SHELL ของ sw.js (จะใช้ออฟไลน์ไม่ได้): " + missing.join(", "));
fs.writeFileSync(html, h);
fs.writeFileSync(sw, s);
console.log(`index.html ?v=${v} (${vs.length} ไฟล์) • sw.js hk-v2-${sv}`);
