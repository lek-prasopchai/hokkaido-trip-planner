// ตัวช่วยกลาง: DOM, วันที่, เก็บข้อมูล, ระยะทาง/เวลาเดินทาง, เวลาพระอาทิตย์, แชร์ลิงก์, อากาศ, อัตราแลกเงิน
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtN = (n) => Math.round(n).toLocaleString("th-TH");
const fmtH = (h) => { const m = Math.round(h * 60); return m < 60 ? `${m} นาที` : `${Math.floor(m / 60)} ชม.${m % 60 ? ` ${m % 60} น.` : ""}`; };
const fmtT = (h) => { const m = Math.round(h * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const parseT = (s) => { const [a, b] = String(s || "0:0").split(":").map(Number); return a + (b || 0) / 60; };
const mapsUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const llUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
// เปิดผลค้นหาภายนอก (ไม่ดึงรูป/รีวิวมาเก็บ เพราะติดลิขสิทธิ์และข้อตกลงการใช้งาน)
const gimgUrl = (q) => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
const gUrl = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
const ytUrl = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
const ttUrl = (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`;
const dirUrl = (pts, mode) => `https://www.google.com/maps/dir/?api=1&origin=${pts[0].lat},${pts[0].lng}&destination=${pts[pts.length - 1].lat},${pts[pts.length - 1].lng}${pts.length > 2 ? `&waypoints=${pts.slice(1, -1).slice(0, 9).map((p) => `${p.lat},${p.lng}`).join("|")}` : ""}&travelmode=${mode === "transit" ? "transit" : "driving"}`;

// ---------- วันที่ ----------
const WD = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
const MO = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const toDate = (iso) => new Date(iso + "T00:00:00");
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (iso, n) => { const d = toDate(iso); d.setDate(d.getDate() + n); return isoOf(d); };
const thDate = (iso, wd = true) => { const d = toDate(iso); return `${wd ? WD[d.getDay()] + " " : ""}${d.getDate()} ${MO[d.getMonth()]} ${d.getFullYear() + 543 - 2500}`; };
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 864e5);
// เวลาญี่ปุ่น (JST) ไม่ขึ้นกับเขตเวลาของเครื่อง
const jstNow = () => { const d = new Date(Date.now() + 9 * 3600e3); return { iso: d.toISOString().slice(0, 10), h: d.getUTCHours() + d.getUTCMinutes() / 60 }; };
const todayIso = () => isoOf(new Date());
const monthOf = (iso) => +iso.slice(5, 7);

// ---------- เก็บข้อมูลในเบราว์เซอร์ ----------
const STORE_KEY = "hokkaido-planner-v2";
const BUF = { imm: 75, car: 45, pass: 30, dom: 20, before: 150, beforeDom: 60, ret: 45 }; // นาที
const Store = {
  defaults() {
    return {
      v: 2,
      trip: {
        start: "2027-01-15", end: "2027-01-22", nights: 7, arrive: "CTS", depart: "CTS", arriveTime: "08:30", departTime: "16:00",
        outFlight: { no: "", from: "BKK", dep: "", via: "" }, inFlight: { no: "", to: "BKK", via: "" }, domIn: false, domOut: false,
        adults: 2, kids: 0, drivers: 1, pace: "balanced", interests: ["city", "food", "nature", "onsen"], mode: "car", level: 1,
        firstDay: "auto", buf: { ...BUF },
      },
      plan: null, packing: {}, custom: [], prep: {}, budget: {}, spend: [], docs: [], rate: 0.23, rateAt: 0,
      set: { lang: "en", langV: 2, theme: "auto", font: "m", slack: 0, maxDrive: "", dayStart: "", dayEnd: "", rateAuto: true },
    };
  },
  merge(s) {
    const d = this.defaults();
    return { ...d, ...s, trip: { ...d.trip, ...s.trip, buf: { ...BUF, ...(s.trip || {}).buf } }, set: { ...d.set, ...s.set, ...(s.set?.langV ? {} : { lang: "en", langV: 2 }) } }; // langV: ค่า lang เดิมความหมายต่างจากตอนนี้ รีเซ็ตเป็นอังกฤษก่อน
  },
  load() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) return this.merge(JSON.parse(raw)); } catch (e) { console.warn("โหลดข้อมูลไม่ได้", e); }
    return this.defaults();
  },
  save() {
    if (App.viewOnly) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { toast("บันทึกในเบราว์เซอร์ไม่ได้: ใช้ปุ่มส่งออกไฟล์แทน"); }
  },
  export() {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hokkaido-plan-${S.trip.start}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  import(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!s || s.v !== 2 || !s.trip) throw new Error("ไม่ใช่ไฟล์แผนของเว็บนี้ (เวอร์ชัน 2)");
        S = Store.merge(s); App.viewOnly = false;
        Store.save(); App.renderAll(); toast("นำเข้าแผนแล้ว");
      } catch (e) { toast("นำเข้าไม่ได้: " + e.message); }
    };
    r.readAsText(file);
  },
};
let S = Store.load();
const save = () => Store.save();
const tripNights = () => Math.max(0, daysBetween(S.trip.start, S.trip.end));

// ย้อนกลับ (undo) เก็บสำเนาทริป+แผนก่อนแก้แต่ละครั้ง
const Hist = {
  stack: [],
  push() { this.stack.push(JSON.stringify({ trip: S.trip, plan: S.plan })); if (this.stack.length > 30) this.stack.shift(); },
  undo() {
    const s = this.stack.pop();
    if (!s) return toast("ไม่มีอะไรให้ย้อนกลับ");
    Object.assign(S, JSON.parse(s)); save(); App.renderAll(); toast("ย้อนกลับแล้ว");
  },
};

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2800);
}

// ---------- จุด/ระยะทาง ----------
const HUB = Object.fromEntries(HUBS.map((h) => [h.id, h]));
const AIR = Object.fromEntries(AIRPORTS.map((a) => [a.id, a]));
const PLACE = Object.fromEntries(PLACES.map((p) => [p.id, p]));
const FOOD = Object.fromEntries((window.FOODS || []).map((f) => [f.id, f]));
const isPlace = (id) => typeof id === "number";
// ที่พักที่ผู้ใช้กรอก (พิกัดจริง) ทับจุดกลางเมืองของฐาน
const hotelOf = (hub) => S.plan?.hotels?.[hub];
function point(id) {
  if (HUB[id]) { const h = hotelOf(id); return h && h.lat ? { ...HUB[id], lat: h.lat, lng: h.lng, hotel: h.name } : HUB[id]; }
  return AIR[id] || PLACE[id] || FOOD[id] || S.plan?.custom?.[id];
}
function nearestHub(p) {
  let best = null, d = Infinity;
  for (const h of HUBS) { const x = km(h, p); if (x < d) { d = x; best = h.id; } }
  return best;
}
const hubOf = (id) => {
  if (HUB[id]) return id;
  if (AIR[id]) return AIR[id].hub;
  const p = point(id);
  if (!p) return null;
  return p.hub || (p.lat ? (p.hub = nearestHub(p)) : null);
};
const pname = (id) => { const p = point(id); return p ? names(p)[0] : id; };
const short = (id) => pname(id).split(/ [(\/]/)[0];

// พิกัดจากลิงก์ Google Maps หรือข้อความ "lat, lng": รับเฉพาะในฮอกไกโด
function parseLatLng(s) {
  const m = String(s || "").match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || String(s || "").match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || String(s || "").match(/(-?\d{2}\.\d+)\s*,\s*(-?\d{3}\.\d+)/);
  if (!m) return null;
  const lat = +m[1], lng = +m[2];
  return lat > 41 && lat < 46 && lng > 139 && lng < 146 ? { lat, lng } : null;
}

function km(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const WINTER = 1.5; // ตัวคูณเวลาขับหน้าหนาว (ธ.ค.-มี.ค.)
// ตัวคูณตามเดือน: หนาวจัด ×1.5, ต้น/ปลายหนาว ×1.2, ฤดูอื่นขับปกติ
const winterF = (iso) => { const m = monthOf(iso); return [12, 1, 2, 3].includes(m) ? WINTER : [11, 4].includes(m) ? 1.2 : 1; };
const isWinter = (iso) => [12, 1, 2, 3].includes(monthOf(iso));
const DRIVE_KEY = Object.fromEntries(DRIVE_EDGES.flatMap((e) => [[e.a + ">" + e.b, e], [e.b + ">" + e.a, e]]));

// เวลาขับปกติ (ชม.): ใช้ตารางถ้ามี ไม่งั้นประมาณจากเส้นตรง × 1.3
function driveLeg(aId, bId) {
  if (aId === bId) return { km: 0, h: 0 };
  const e = DRIVE_KEY[aId + ">" + bId];
  if (e) return { km: e.km, h: e.h, high: e.high, risk: e.risk, road: e.road, noFuel: e.noFuel, closed: e.closed };
  const a = point(aId), b = point(bId);
  if (!a?.lat || !b?.lat) return { km: 0, h: 0, none: true };
  const d = km(a, b) * 1.3;
  const speed = d > 80 ? 70 : d > 30 ? 50 : 35;
  return { km: Math.round(d), h: d / speed + (d > 3 ? 0.1 : 0.05), est: true };
}

// กราฟรถไฟ/บัสระหว่างฐาน: หาเส้นทางสั้นสุด (Dijkstra) บวกเวลาต่อรถ 0.3 ชม.
const TGRAPH = {};
for (const e of TRANSIT_EDGES) {
  (TGRAPH[e.a] ||= []).push({ to: e.b, e });
  (TGRAPH[e.b] ||= []).push({ to: e.a, e });
}
const _tCache = {};
function transitPath(a, b) {
  if (a === b) return { h: 0, legs: [] };
  const key = a + ">" + b;
  if (key in _tCache) return _tCache[key];
  const dist = { [a]: 0 }, prev = {}, done = new Set();
  while (true) {
    let u = null;
    for (const k in dist) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k;
    if (u === null || u === b) break;
    done.add(u);
    for (const { to, e } of TGRAPH[u] || []) {
      const nd = dist[u] + e.h + 0.3;
      if (!(to in dist) || nd < dist[to]) { dist[to] = nd; prev[to] = { from: u, e }; }
    }
  }
  if (!(b in dist)) return (_tCache[key] = null);
  const legs = [];
  for (let k = b; k !== a; k = prev[k].from) legs.unshift(prev[k].e);
  return (_tCache[key] = { h: dist[b] - 0.3, legs });
}

// การเข้าถึงด้วยขนส่งสาธารณะ: ใช้ข้อมูล tr.lv ของสถานที่ถ้ามี ไม่งั้นประมาณจากระยะห่างจากใจกลางฐาน
function access(p) {
  if (p.tr?.lv) return p.tr.lv;
  const h = HUB[p.hub];
  if (!h || !p.lat) return "limited";
  const d = km(h, p);
  return d <= 4 ? "ok" : d <= 20 ? "limited" : "car";
}
const ACCESS_TXT = { ok: "รถไฟ/บัส/เดินได้", limited: "บัสน้อยเที่ยว/แท็กซี่", car: "ต้องมีรถ/ทัวร์", tour: "ไปกับทัวร์/บัสท่องเที่ยว" };

// ฤดู: season = ช่วง MM-DD ของงาน (ข้ามปีได้), months = เดือนที่เปิด/มีอะไรให้ดู
const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const SEASONS = { spring: { name: "ใบไม้ผลิ", ic: "flower-2", m: [4, 5] }, summer: { name: "ร้อน", ic: "sun", m: [6, 7, 8] }, autumn: { name: "ใบไม้ร่วง", ic: "leaf", m: [9, 10, 11] }, winter: { name: "หนาว", ic: "snowflake", m: [12, 1, 2, 3] } };
const monthsOf = (p) => p.months || ALL_MONTHS;
function inSeason(p, iso) {
  if (!monthsOf(p).includes(monthOf(iso))) return false;
  if (!p.season) return true;
  const md = iso.slice(5), [s, e] = p.season;
  return s <= e ? md >= s && md <= e : md >= s || md <= e;
}
const seasonsOf = (p) => Object.entries(SEASONS).filter(([, s]) => s.m.some((m) => monthsOf(p).includes(m))).map(([k]) => k);
const monthRange = (ms) => {
  if (ms.length === 12) return "ทั้งปี";
  const s = new Set(ms), start = ms.find((m) => !s.has(m === 1 ? 12 : m - 1)) ?? ms[0];
  let end = start; while (s.has(end === 12 ? 1 : end + 1) && (end === 12 ? 1 : end + 1) !== start) end = end === 12 ? 1 : end + 1;
  return start === end ? MO[start - 1] : `${MO[start - 1]}-${MO[end - 1]}`;
};

// ---------- เวลาพระอาทิตย์ขึ้น/ตก (สูตร NOAA แบบย่อ, เวลา JST) ----------
function sunTimes(iso, lat, lng) {
  const d = toDate(iso);
  const N = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const g = (2 * Math.PI / 365) * (N - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g);
  const r = Math.PI / 180;
  const ha = Math.acos(Math.cos(90.833 * r) / (Math.cos(lat * r) * Math.cos(decl)) - Math.tan(lat * r) * Math.tan(decl)) / r;
  const noon = 720 - 4 * lng - eq + 540; // นาทีตามเวลา JST
  return { rise: (noon - 4 * ha) / 60, set: (noon + 4 * ha) / 60 };
}

const INTEREST = {
  festival: "เทศกาล/ไฟประดับ", nature: "ธรรมชาติ/วิว", flower: "ทุ่งดอกไม้", onsen: "ออนเซ็น", snow: "สกี/เล่นหิมะ",
  food: "อาหาร/ตลาด", city: "เมือง/ช้อปปิ้ง/พิพิธภัณฑ์", culture: "วัด/ศาลเจ้า/ประวัติศาสตร์", animals: "สัตว์",
};
const PACE = {
  chill: { name: "ชิล", start: 9.5, end: 18, maxDrive: 2, maxStops: 3 },
  balanced: { name: "กลางๆ", start: 8.5, end: 19.5, maxDrive: 3.5, maxStops: 4 },
  packed: { name: "แน่น", start: 7.5, end: 21, maxDrive: 5, maxStops: 6 },
};
// ค่า pace หลังทับด้วยหน้าตั้งค่า
const pace = () => {
  const p = { ...PACE[S.trip.pace] }, s = S.set;
  if (s.maxDrive !== "" && s.maxDrive != null) p.maxDrive = +s.maxDrive;
  if (s.dayStart) p.start = parseT(s.dayStart);
  if (s.dayEnd) p.end = parseT(s.dayEnd);
  return p;
};
const MODE = { car: "ขับรถเอง", transit: "รถไฟ + บัส" };
// วิธีเดินทางรายช่วง (เลือกแยกต่อจุดได้ ทับค่าของวัน)
const LEG_MODE = { car: { ic: "car", name: "ขับรถ" }, transit: { ic: "train-front", name: "รถไฟ/บัส" }, taxi: { ic: "car-taxi-front", name: "แท็กซี่" }, walk: { ic: "footprints", name: "เดิน" } };

// ---------- ชื่อหลายภาษา ----------
// lang: ชื่อตัวหนาใช้ภาษาไหน: "en" อังกฤษ (ชื่อที่คนส่วนใหญ่เรียก) + ไทย | "th" ไทย + อังกฤษ | "ja" อังกฤษ + 日本語 + ไทย | "all" ไทย + อังกฤษ + 日本語
function names(p) {
  const l = S.set.lang, en = p.en || p.name;
  const out = l === "th" ? [p.name, p.en] : l === "ja" ? [en, p.ja, p.name] : l === "all" ? [p.name, p.en, p.ja] : [en, p.name];
  return out.filter((x, k) => x && out.indexOf(x) === k);
}
const nameHtml = (p) => { const [a, ...b] = names(p); return `${esc(a)}${b.map((x) => `<span class="alt">${esc(x)}</span>`).join("")}`; };

// ---------- ดูรูปใหญ่ (หลายรูปต่อสถานที่) ----------
const placeImgs = (p) => p.imgs?.length ? p.imgs : p.img ? [{ img: p.img, credit: p.imgCredit }] : [];
const Lightbox = {
  list: [], i: 0, title: "",
  open(list, i = 0, title = "") {
    if (!list.length) return;
    Object.assign(this, { list, i, title });
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.className = "lb";
      this.el.innerHTML = `<button class="lb-x" aria-label="ปิด">✕</button><button class="lb-p" aria-label="รูปก่อนหน้า">‹</button>
        <figure><img alt=""><figcaption></figcaption></figure><button class="lb-n" aria-label="รูปถัดไป">›</button>`;
      this.el.onclick = (e) => {
        if (e.target === this.el || e.target.classList.contains("lb-x")) this.close();
        else if (e.target.classList.contains("lb-p")) this.go(-1);
        else if (e.target.classList.contains("lb-n")) this.go(1);
      };
      document.addEventListener("keydown", (e) => {
        if (!this.el.classList.contains("show")) return;
        if (e.key === "Escape") this.close(); else if (e.key === "ArrowLeft") this.go(-1); else if (e.key === "ArrowRight") this.go(1);
      });
      document.body.appendChild(this.el);
    }
    this.show();
    this.el.classList.add("show");
  },
  go(d) { this.i = (this.i + d + this.list.length) % this.list.length; this.show(); },
  show() {
    const it = this.list[this.i];
    $("img", this.el).src = it.img;
    $("figcaption", this.el).innerHTML = `${esc(this.title)} • ${this.i + 1}/${this.list.length}${it.credit ? ` • <a href="${esc(it.credit)}" target="_blank" rel="noopener">ที่มาภาพ (Wikimedia Commons)</a>` : ""}`;
    $$(".lb-p, .lb-n", this.el).forEach((b) => (b.style.display = this.list.length > 1 ? "" : "none"));
  },
  close() { this.el.classList.remove("show"); },
  place(id) { const p = point(id); this.open(placeImgs(p), 0, p.name); },
};

// ---------- กล่องโต้ตอบ (dialog) ใช้ร่วมกันทุกหน้า ----------
const Modal = {
  open(html, cls = "") {
    let d = $("#modal");
    if (!d) {
      d = document.createElement("dialog"); d.id = "modal";
      d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
      document.body.appendChild(d);
    }
    d.className = cls;
    d.innerHTML = `<button class="modal-x" data-close aria-label="ปิด">✕</button><div class="modal-body">${html}</div>`;
    if (!d.open) d.showModal();
    return d;
  },
  close() { $("#modal")?.close(); },
};
// การ์ดโชว์คนขับแท็กซี่/คนท้องถิ่น: ชื่อญี่ปุ่นตัวใหญ่
function showCard(p) {
  Modal.open(`<div class="showcard"><p class="mute">ขอไปที่นี่ครับ/ค่ะ: ここへ行きたいです</p><div class="big-ja">${esc(p.ja || p.name)}</div>
    ${p.addrJa ? `<div class="addr-ja">${esc(p.addrJa)}</div>` : ""}${p.phone ? `<div class="addr-ja">${I("phone")} ${esc(p.phone)}</div>` : ""}
    <p>${esc(p.name)}${p.en ? ` • ${esc(p.en)}` : ""}</p></div>`, "wide");
}

// ---------- แชร์แผนเป็นลิงก์ (บีบอัดใส่ใน #share=) ----------
const b64u = { enc: (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)) };
const Share = {
  async pack(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (!window.CompressionStream) return "j" + b64u.enc(bytes);
    const out = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
    return "z" + b64u.enc(new Uint8Array(out));
  },
  async unpack(s) {
    const bytes = b64u.dec(s.slice(1));
    const txt = s[0] === "z" ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text() : new TextDecoder().decode(bytes);
    return JSON.parse(txt);
  },
  async link() {
    const code = await this.pack({ v: 2, trip: S.trip, plan: S.plan });
    return `${location.origin}${location.pathname}#share=${code}`;
  },
};

// ---------- อากาศ (Open-Meteo ฟรี ไม่ต้องใช้ key, ล่วงหน้าได้ 16 วัน) ----------
const WX_ICON = (c) => c >= 71 && c <= 86 ? "cloud-snow" : c >= 51 && c <= 67 || c >= 80 ? "cloud-rain" : c >= 45 && c <= 48 ? "cloud-fog" : c >= 2 ? "cloud-sun" : "sun";
const Weather = {
  mem: {},
  inRange: (iso) => { const d = daysBetween(todayIso(), iso); return d >= 0 && d <= 15; },
  async get(lat, lng) {
    const k = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (!this.mem[k]) {
      this.mem[k] = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_probability_max,weather_code&timezone=Asia%2FTokyo&forecast_days=16`)
        .then((r) => r.json()).catch(() => null);
    }
    return this.mem[k];
  },
  // เติมข้อมูลให้ทุก element ที่มี data-wx="lat,lng,iso"
  fill(root = document) {
    if (navigator.onLine === false) return;
    $$("[data-wx]", root).forEach(async (el) => {
      const [lat, lng, iso] = el.dataset.wx.split(",");
      if (!this.inRange(iso)) return;
      const j = await this.get(+lat, +lng);
      const i = j?.daily?.time?.indexOf(iso);
      if (i == null || i < 0) return;
      const d = j.daily;
      el.innerHTML = `${I(WX_ICON(d.weather_code[i]))} ${Math.round(d.temperature_2m_max[i])}°/${Math.round(d.temperature_2m_min[i])}°${d.snowfall_sum[i] > 0.4 ? ` • หิมะ ${Math.round(d.snowfall_sum[i])} ซม.` : ""}${d.precipitation_probability_max[i] >= 50 ? ` • ฝน/หิมะ ${d.precipitation_probability_max[i]}%` : ""}`;
      el.classList.add("on");
    });
  },
};

// ---------- อัตราแลกเงิน (วันละครั้ง) ----------
async function refreshRate() {
  if (!S.set.rateAuto || Date.now() - (S.rateAt || 0) < 864e5 || navigator.onLine === false) return;
  try {
    const j = await (await fetch("https://open.er-api.com/v6/latest/JPY")).json();
    if (j.result === "success" && j.rates.THB) { S.rate = +j.rates.THB.toFixed(4); S.rateAt = Date.now(); save(); App.renderAll(); }
  } catch { /* ไม่มีเน็ต ใช้ค่าเดิม */ }
}
