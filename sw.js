// Service worker: ใช้ออฟไลน์ได้หลังเปิดครั้งแรก
// - หน้าเว็บ (HTML): network-first ออนไลน์ได้ index.html ล่าสุดเสมอ (อ้าง ?v= ใหม่) ออฟไลน์ค่อยใช้ cache
// - โค้ด/ข้อมูล: ไฟล์มี ?v= ไม่เปลี่ยนเนื้อหา จึง cache ตรงเวอร์ชัน (ไม่ ignoreSearch ไม่งั้นได้ไฟล์เก่ามาแทนเวอร์ชันใหม่)
// - รูป: cache-first (ปุ่ม "ดาวน์โหลดรูปทั้งหมด" ในตั้งค่าเติมให้ครบ)
// - tile แผนที่: cache-first จำกัดจำนวน / API (อากาศ อัตราแลกเงิน เส้นทาง): network-first
const V = "hk-v2-68"; // เปลี่ยนด้วย node tools/bump.js (พร้อม ?v= ใน index.html)
const SHELL = [
  "./", "index.html", "css/style.css", "manifest.webmanifest", "img/icon.svg", "img/icon-192.png",
  "vendor/leaflet/leaflet.css", "vendor/leaflet/leaflet.js", "vendor/markercluster/leaflet.markercluster.js",
  "vendor/markercluster/MarkerCluster.css", "vendor/markercluster/MarkerCluster.Default.css",
  ...["icons", "core", "planner", "map", "view-plan", "view-places", "view-budget", "app"].map((f) => `js/${f}.js`),
  ...["places", "drive", "outline", "hubs", "transit", "templates", "guide"].map((f) => `data/${f}.js`),
];
const TILE_MAX = 1500;

// cache: "reload"/"no-cache" = ข้าม HTTP cache ของเบราว์เซอร์ ไม่งั้นติดไฟล์เก่าหลังเปลี่ยนเวอร์ชัน
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("hk-v") && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function page(req) {
  const c = await caches.open(V);
  try { const r = await fetch(req, { cache: "no-cache" }); if (r.ok) c.put("index.html", r.clone()); return r; }
  catch { return (await c.match("index.html")) || (await c.match("./")) || new Response("offline", { status: 503 }); }
}
async function versioned(req) {
  const c = await caches.open(V), hit = await c.match(req);
  if (hit) return hit;
  try { const r = await fetch(req, { cache: "no-cache" }); if (r.ok) c.put(req, r.clone()); return r; }
  catch { return (await c.match(req, { ignoreSearch: true })) || new Response("offline", { status: 503 }); } // ออฟไลน์: ใช้ไฟล์ที่ precache ไว้ (ไม่มี ?v)
}
async function cacheFirst(name, req, max) {
  const c = await caches.open(name), hit = await c.match(req);
  if (hit) return hit;
  try {
    const r = await fetch(req);
    if (r.ok || r.type === "opaque") {
      c.put(req, r.clone());
      if (max) c.keys().then((ks) => { if (ks.length > max) ks.slice(0, ks.length - max).forEach((k) => c.delete(k)); });
    }
    return r;
  } catch { return new Response("", { status: 504 }); }
}
async function netFirst(req) {
  const c = await caches.open("hk-api");
  try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }
  catch { return (await c.match(req)) || new Response("{}", { status: 504, headers: { "Content-Type": "application/json" } }); }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (/\/img\//.test(u.pathname)) e.respondWith(cacheFirst("hk-img-v1", req));
    else if (req.mode === "navigate") e.respondWith(page(req));
    else e.respondWith(versioned(req));
  } else if (/tile\.openstreetmap|arcgisonline|cyberjapandata/.test(u.host)) e.respondWith(cacheFirst("hk-tiles", req, TILE_MAX));
  else if (/open-meteo|er-api|project-osrm/.test(u.host)) e.respondWith(netFirst(req));
});
