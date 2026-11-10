// สร้าง js/icons.js จาก Lucide (ISC license): node tools/build_icons.js
// เพิ่มไอคอน: ใส่ชื่อจาก https://lucide.dev/icons ใน NAMES แล้วรันใหม่
const fs = require("fs"), path = require("path");
const VER = "0.460.0";
const NAMES = `map search backpack book-open download printer settings car train-front car-taxi-front footprints flower-2 sun leaf
snowflake cloud-rain cloud-fog cloud-sun phone party-popper mountain-snow flower bath cable-car utensils building-2
landmark paw-print map-pin star moon hotel plane clock timer ban triangle-alert thumbs-up lock info hourglass
navigation heart notebook-pen circle-pause arrow-left-right clipboard-list store fuel life-buoy circle-check
skip-forward image globe play music camera banknote bus soup file-text shirt hand droplet pill plug smartphone
luggage paperclip baby plane-takeoff package refresh-ccw arrow-up-down stamp cloud-snow route arrow-up arrow-down
pencil x`.split(/\s+/);

(async () => {
  const out = {};
  for (const n of NAMES) {
    const r = await fetch(`https://cdn.jsdelivr.net/npm/lucide-static@${VER}/icons/${n}.svg`);
    if (!r.ok) throw new Error(`${n}: ${r.status}`);
    const svg = await r.text();
    out[n] = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "").replace(/\s*\n\s*/g, "").trim();
  }
  const js = `// ไอคอนลายเส้น Lucide ${VER} (ISC license) — สร้างโดย tools/build_icons.js ห้ามแก้มือ
const ICONS = ${JSON.stringify(out)};
const I = (n, c = "") => \`<svg class="i\${c ? " " + c : ""}" viewBox="0 0 24 24" aria-hidden="true">\${ICONS[n] || ""}</svg>\`;
`;
  fs.writeFileSync(path.join(__dirname, "../js/icons.js"), js);
  console.log(NAMES.length, "icons,", js.length, "bytes");
})().catch((e) => { console.error(e.message); process.exit(1); });
