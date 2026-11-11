// แผนที่ทั้งหมดของเว็บ
// - ภาพแผนที่: OpenStreetMap (เปิดผ่าน http เท่านั้น: file:// ไม่ส่ง Referer แล้วโดนบล็อก) / Esri / GSI
// - ไม่มีเน็ต: วาดโครงร่างเกาะจาก data/outline.js แทน
// - เส้นทางขับรถตามถนนจริงจาก OSRM (มีเน็ตเท่านั้น เก็บไว้ในเบราว์เซอร์) ไม่งั้นลากเส้นตรง
const DAY_COLORS = ["#c8374a", "#2c6e9b", "#2f8a57", "#b7791f", "#7b4fb5", "#0f8b8d", "#d1495b", "#3d5a80", "#6a994e", "#bc6c25", "#8338ec", "#1d3557", "#e76f51", "#457b9d", "#588157"];
const TILE_SOURCES = { // ตัวแรก = ค่าเริ่มต้น: Esri มีป้ายอังกฤษคู่ญี่ปุ่น (OSM เป็นญี่ปุ่นล้วน)
  "แผนที่ (อังกฤษ)": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", "Tiles &copy; Esri"],
  ...(location.protocol.startsWith("http") ? { "OpenStreetMap": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png", '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'] } : {}),
  "ภาพถ่ายดาวเทียม": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", "Imagery &copy; Esri"],
  "แผนที่ญี่ปุ่น (ป้ายญี่ปุ่น)": ["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'],
};
const TAG_ICON = { festival: "party-popper", nature: "mountain-snow", flower: "flower", onsen: "bath", snow: "cable-car", food: "soup", city: "building-2", culture: "landmark", animals: "paw-print" };
const REGION_COLORS = {};
[...new Set(HUBS.map((h) => h.region))].forEach((r, i) => (REGION_COLORS[r] = ["#c8374a", "#2c6e9b", "#2f8a57", "#b7791f", "#7b4fb5", "#0f8b8d", "#bc6c25", "#3d5a80", "#8338ec", "#6a994e"][i % 10]));
const MAPS = []; // แผนที่ทุกอันในหน้า ใช้ปรับขนาดใหม่เมื่อเปิดหน้านั้น

function makeMap(el, { small = false } = {}) {
  const map = L.map(el, { zoomSnap: 0.25, zoomControl: !small, attributionControl: !small, scrollWheelZoom: !small })
    .setView([43.4, 142.8], 6.25);
  const OFFLINE = { color: "#8aa4bb", weight: 1, fillColor: "#ffffff", fillOpacity: 1 };
  const outline = L.geoJSON({ type: "MultiPolygon", coordinates: HOKKAIDO_OUTLINE.map((r) => [r]) },
    { style: { weight: 0, fillOpacity: 0 }, interactive: false }).addTo(map);
  const offline = () => outline.setStyle(OFFLINE);
  if (navigator.onLine === false) offline();
  else {
    const bases = {};
    let errors = 0;
    for (const [name, [url, attribution]] of Object.entries(TILE_SOURCES)) {
      bases[name] = L.tileLayer(url, { maxZoom: 17, attribution })
        .on("tileerror", () => { if (++errors === 6) { Object.values(bases).forEach((b) => map.removeLayer(b)); offline(); if (!small) toast("ไม่มีเน็ต ใช้แผนที่โครงร่างแทน"); } });
    }
    Object.values(bases)[0].addTo(map);
    if (!small) L.control.layers(bases, null, { position: "topright" }).addTo(map);
  }
  const M = { map, layer: L.layerGroup().addTo(map), bounds: null, sec: el.closest("section")?.dataset.sec };
  MAPS.push(M);
  return M;
}

function refitMap(M) {
  M.map.invalidateSize();
  if (M.bounds && M.bounds.length) M.map.fitBounds(M.bounds, { padding: [40, 40], maxZoom: 11 });
}
function refitSection(sec) {
  for (let i = MAPS.length - 1; i >= 0; i--) {
    if (!document.body.contains(MAPS[i].map.getContainer())) { MAPS[i].map.remove(); MAPS.splice(i, 1); continue; }
    if (MAPS[i].sec === sec) refitMap(MAPS[i]);
  }
}

// ---------- หมุด ----------
function pin(html, color, cls = "") {
  return L.divIcon({ className: "", iconSize: null, html: `<div class="pin ${cls}" style="--c:${color}">${html}</div>` });
}
function labelIcon(html, bg = "#142033") {
  return L.divIcon({ className: "", iconSize: null, html: `<div class="maplbl" style="background:${bg}">${html}</div>` });
}
function placePopup(p, extra = "") {
  const n = placeImgs(p).length, id = JSON.stringify(p.id ?? "");
  if (!p.stars) return `<div class="pop"><b>${esc(p.name)}</b>${extra}</div>`; // จุดของฉัน
  const meta = `<span class="stars">${"★".repeat(p.stars)}</span> ${esc(p.type)} • ${I("timer")} ${esc(p.dur)} • ${esc(p.fee)}`;
  return `<div class="pop">${p.img ? `<img src="${p.img}" alt="" loading="lazy" onclick='Lightbox.place(${id})' title="กดดูรูปใหญ่${n > 1 ? ` (${n} รูป)` : ""}">` : ""}
    <b>${nameHtml(p)}</b><div>${meta}</div>
    <div>${esc(p.highlight || p.signature || "")}</div>${extra}
    <a href="#" onclick='PlacesView.detail(${id});return false'>รายละเอียด</a> • <a href="${mapsUrl(p.ja || p.name)}" target="_blank" rel="noopener">Google Maps</a></div>`;
}

// ---------- เส้นทางตามถนนจริง (OSRM) ----------
const Route = {
  KEY: "hokkaido-routes-v1",
  cache: (() => { try { return JSON.parse(localStorage.getItem("hokkaido-routes-v1")) || {}; } catch { return {}; } })(),
  pending: {},
  queue: Promise.resolve(), // ส่งทีละคำขอ ไม่ให้เซิร์ฟเวอร์ OSRM ตัดเพราะถี่เกิน
  key: (pts) => pts.map((p) => `${p.lng.toFixed(3)},${p.lat.toFixed(3)}`).join(";"),
  // คืนเส้นที่เคยโหลดไว้ หรือ null แล้วโหลดเบื้องหลังเรียก onReady เมื่อได้
  get(pts, onReady) {
    const k = this.key(pts);
    if (this.cache[k]) return this.cache[k];
    if (navigator.onLine === false || pts.length < 2) return null;
    if (!this.pending[k]) {
      const job = this.queue.then(() => fetch(`https://router.project-osrm.org/route/v1/driving/${k}?overview=simplified&geometries=geojson`));
      this.queue = job.catch(() => null);
      this.pending[k] = job
      .then((r) => r.json())
      .then((j) => {
        if (j.code !== "Ok") throw new Error(j.code);
        this.cache[k] = j.routes[0].geometry.coordinates.map(([x, y]) => [y, x]);
        try { localStorage.setItem(this.KEY, JSON.stringify(this.cache)); } catch { /* เต็มก็ไม่เป็นไร ใช้เส้นตรง */ }
        return this.cache[k];
      })
      .catch(() => null)
      .finally(() => delete this.pending[k]);
    }
    this.pending[k].then((g) => g && onReady(g));
    return null;
  },
};

// ลำดับจุดของวันนั้น (จุดเริ่ม → ที่เที่ยว → ที่พัก → ที่เที่ยวกลางคืน)
function dayPoints(e) {
  const pts = [point(e.from)];
  e.tl.filter((x) => x.kind === "move").forEach((x) => pts.push(point(x.to)));
  return pts;
}

function drawDayRoute(M, e, color, { faded = false, weight = 4 } = {}) {
  const pts = dayPoints(e);
  if (pts.length < 2) return;
  const style = { color, weight, opacity: faded ? 0.25 : 0.9, dashArray: e.mode === "transit" ? "2 9" : null, lineCap: "round" };
  const line = L.polyline(pts.map((p) => [p.lat, p.lng]), style).bindTooltip(`วันที่ ${e.i + 1}: ${pname(e.from).split(" ")[0]} → ${pname(e.to).split(" ")[0]}`, { sticky: true }).addTo(M.layer);
  if (e.mode === "car") {
    const geo = Route.get(pts, (g) => { if (M.map.hasLayer(line)) line.setLatLngs(g); });
    if (geo) line.setLatLngs(geo);
  }
}

function drawDayStops(M, e, color, { faded = false } = {}) {
  let n = 0;
  e.tl.filter((x) => x.kind === "visit").forEach((x) => {
    const p = point(x.id);
    n++;
    if (!p.lat) return;
    L.marker([p.lat, p.lng], { icon: pin(x.night ? I("moon") : n, color, "num" + (faded ? " faded" : "")), zIndexOffset: faded ? 0 : 500 })
      .bindPopup(placePopup(p, `<div class="mute">วันที่ ${e.i + 1} • จุดที่ ${n} • ${fmtT(x.t)}</div>`), { maxWidth: 260 }).addTo(M.layer);
    M.bounds.push([p.lat, p.lng]);
  });
}

const TripMap = {
  // แผนที่ใหญ่หน้าวางแผน: focus = เลขวัน หรือ null = ทั้งทริป
  // keep = แก้แผนแล้ววาดใหม่: ไม่ซูม/เลื่อนแผนที่กลับ (ผู้ใช้อาจซูมดูอยู่)
  drawPlan(M, evals, focus = null, keep = false) {
    M.layer.clearLayers();
    M.bounds = [];
    const inPlan = new Set(evals.flatMap((e) => e.stops));
    if (focus === null) {
      const iso = evals[0]?.iso || S.trip.start;
      for (const p of PLACES) {
        if (!inSeason(p, iso) && !inSeason(p, addDays(iso, evals.length - 1))) continue;
        if (!p.lat || inPlan.has(p.id)) continue;
        L.circleMarker([p.lat, p.lng], { radius: 4, color: "#fff", weight: 1, fillColor: "#7d8996", fillOpacity: 0.8 })
          .bindPopup(placePopup(p, `<button class="btn small" style="margin:4px 0" onclick="PlanView.quickAdd(${p.id})">+ เพิ่มเข้าแผน</button>`), { maxWidth: 260 }).addTo(M.layer);
      }
    }
    evals.forEach((e) => {
      const on = focus === null || focus === e.i;
      const color = DAY_COLORS[e.i % DAY_COLORS.length];
      if (!on && focus !== null) { drawDayRoute(M, e, color, { faded: true, weight: 3 }); return; }
      drawDayRoute(M, e, color);
      drawDayStops(M, e, color);
      dayPoints(e).forEach((p) => M.bounds.push([p.lat, p.lng]));
    });
    // ที่พัก + จำนวนคืน
    const nights = {};
    S.plan.bases.forEach((b, i) => (nights[b] ||= []).push(i + 1));
    Object.entries(nights).forEach(([id, ns]) => {
      const h = point(id);
      L.marker([h.lat, h.lng], { icon: labelIcon(`${I("hotel")} ${esc(short(id))} <small>${ns.length} คืน</small>`), zIndexOffset: 1000 })
        .bindTooltip(`คืนที่ ${ns.join(", ")}`).addTo(M.layer);
      if (focus === null) M.bounds.push([h.lat, h.lng]);
    });
    [...new Set([S.trip.arrive, S.trip.depart])].forEach((id) => {
      const a = AIR[id];
      L.marker([a.lat, a.lng], { icon: labelIcon(`${I("plane")} ${id}`, "#c8374a"), zIndexOffset: 1000 }).bindTooltip(a.name).addTo(M.layer);
      if (focus === null) M.bounds.push([a.lat, a.lng]);
    });
    if (!keep) refitMap(M);
  },

  // แผนที่เล็กในการ์ดแต่ละวัน
  drawDay(M, e) {
    M.layer.clearLayers();
    M.bounds = [];
    const color = DAY_COLORS[e.i % DAY_COLORS.length];
    drawDayRoute(M, e, color);
    drawDayStops(M, e, color);
    const from = point(e.from), to = point(e.to);
    L.marker([from.lat, from.lng], { icon: labelIcon(I(AIR[e.from] ? "plane" : "hotel"), "#142033") }).bindTooltip("เริ่ม: " + from.name).addTo(M.layer);
    L.marker([to.lat, to.lng], { icon: labelIcon(I(AIR[e.to] ? "plane" : "hotel"), "#c8374a") }).bindTooltip("ปลายทาง: " + to.name).addTo(M.layer);
    M.bounds.push([from.lat, from.lng], [to.lat, to.lng]);
    refitMap(M);
  },

  drawPlaces(M, list) {
    M.layer.clearLayers();
    M.bounds = [];
    const inPlan = new Set(S.plan ? S.plan.days.flatMap((d) => d.items.map((it) => it.id)) : []);
    // หมุดใกล้กันรวมเป็นกลุ่มบอกจำนวน ซูมเข้าแล้วแยกออก
    const group = L.markerClusterGroup({ maxClusterRadius: 38, showCoverageOnHover: false, spiderfyOnMaxZoom: true }).addTo(M.layer);
    for (const p of list) {
      if (!p.lat) continue;
      const border = inPlan.has(p.id) ? "#2f8a57" : p.stars === 3 ? "#c8374a" : p.stars === 2 ? "#2c6e9b" : "#9aa5b1";
      const ic = I(TAG_ICON[p.tags[0]] || "map-pin"), st = p.stars || 1;
      L.marker([p.lat, p.lng], { icon: pin(ic, border, "emo s" + st), zIndexOffset: st * 100 })
        .bindPopup(placePopup(p), { maxWidth: 260 }).addTo(group);
      M.bounds.push([p.lat, p.lng]);
    }
    refitMap(M);
  },

  drawBases(M) {
    M.layer.clearLayers();
    M.bounds = [];
    const ids = S.plan ? S.plan.bases : HUBS.map((h) => h.id);
    const nights = {};
    ids.forEach((b, i) => (nights[b] ||= []).push(i + 1));
    let prev = S.plan ? point(S.trip.arrive) : null;
    if (S.plan) {
      const seq = [point(S.trip.arrive), ...S.plan.bases.map((b) => point(b)), point(S.trip.depart)];
      L.polyline(seq.map((p) => [p.lat, p.lng]), { color: "#142033", weight: 2, dashArray: "6 6", opacity: 0.6 }).addTo(M.layer);
    }
    Object.entries(nights).forEach(([id, ns]) => {
      const h = point(id), lv = S.trip.level;
      L.marker([h.lat, h.lng], { icon: labelIcon(`${I("hotel")} ${esc(hotelOf(id)?.name || short(id))}<small>${S.plan ? ns.length + " คืน • " : ""}¥${fmtN(h.price[lv])}/คืน</small>`, REGION_COLORS[h.region]) })
        .bindPopup(`<b>${esc(h.name)}</b><br>${esc(h.stay)}<br>${I("thumbs-up")} ${esc(h.pros)}<br>${I("triangle-alert")} ${esc(h.cons)}`).addTo(M.layer);
      M.bounds.push([h.lat, h.lng]);
    });
    if (prev) M.bounds.push([prev.lat, prev.lng]);
    refitMap(M);
  },
};

// ---------- ช่องตำแหน่ง: วางลิงก์/พิกัด แตะบนแผนที่ หรือใช้ตำแหน่งตอนนี้ ----------
// มือถือ: ลิงก์แชร์ของ Google Maps เป็นลิงก์สั้นไม่มีพิกัด จึงต้องมีทางปักหมุดในเว็บเอง
const LocPick = {
  // ปักหมุดบนแผนที่ของช่องนี้ (zoom 0 = ไม่เลื่อนแผนที่)
  drop(box, lat, lng, zoom = 15) {
    const el = box.querySelector(".lp-map"), m = el._m;
    el._mk ? el._mk.setLatLng([lat, lng]) : (el._mk = L.marker([lat, lng], { icon: pin(I("map-pin"), "#c8374a") }).addTo(m));
    if (zoom) m.setView([lat, lng], zoom);
  },
  // ค้นชื่อ: สถานที่ในเว็บก่อน (ได้ทั้งชื่อไทย) แล้วต่อด้วย Photon (OpenStreetMap, ฟรี ไม่ต้องใช้คีย์ รับแค่อังกฤษ/ญี่ปุ่น) จำกัดในฮอกไกโด เรียงใกล้จุดกลางแผนที่ก่อน
  async find(box) {
    const q = box.querySelector(".lp-find input").value.trim(), res = box.querySelector(".lp-res");
    if (!q) return;
    const btn = (lat, lng, name, sub) => `<button type="button" class="btn" data-lp="res" data-ll="${lat},${lng}" data-name="${esc(name)}"><b>${esc(name)}</b><small>${esc(sub)}</small></button>`;
    const t = q.toLowerCase(), own = PLACES.filter((p) => p.lat && [p.name, p.en, p.ja].some((n) => n?.toLowerCase().includes(t))).slice(0, 4).map((p) => btn(p.lat, p.lng, names(p)[0], p.area || "")).join("");
    if (navigator.onLine === false) { res.innerHTML = own; return own || toast("ค้นหาต้องใช้เน็ต ใช้แตะบนแผนที่แทน"); }
    res.innerHTML = `${own}<p class="mute small">กำลังค้นหา…</p>`;
    const c = box.querySelector(".lp-map")._m.getCenter();
    try {
      const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lat=${c.lat}&lon=${c.lng}&bbox=139,41,146,46`);
      const F = (await r.json()).features || [];
      res.innerHTML = own + F.map((f) => { const p = f.properties, [lng, lat] = f.geometry.coordinates;
        return btn(lat, lng, p.name || p.street || q, [p.street && p.name ? p.street : "", p.district, p.city || p.county].filter(Boolean).join(", ")); }).join("")
        || `<p class="mute small">ไม่เจอ ชื่อไทยค้นได้เฉพาะสถานที่ที่มีในเว็บ: ลองพิมพ์ชื่ออังกฤษ/ญี่ปุ่น หรือแตะบนแผนที่แทน</p>`;
    } catch { res.innerHTML = own || `<p class="mute small">ค้นหาไม่ได้ตอนนี้ ใช้แตะบนแผนที่แทน</p>`; }
  },
  // attrs = แอตทริบิวต์ของ input (id/data-*), c = จุดกลางแผนที่ถ้ายังไม่มีพิกัด
  html(label, attrs, value = "", c = null) {
    return `<div class="lp"${c ? ` data-c="${c.lat},${c.lng}"` : ""}><label class="f">${label}<input type="text" ${attrs} value="${esc(value)}" placeholder="ลิงก์ Google Maps หรือ 43.06, 141.35"></label>
      <div class="row lp-btns"><button type="button" class="btn small" data-lp="map">${I("map-pin")} แตะบนแผนที่</button><button type="button" class="btn small" data-lp="gps">${I("navigation")} ตำแหน่งตอนนี้</button></div>
      <div class="lp-pick" hidden><div class="lp-find"><input type="search" placeholder="ชื่อร้าน/สถานที่/ที่อยู่ (อังกฤษ/ญี่ปุ่น)" enterkeyhint="search"><button type="button" class="btn small" data-lp="find">${I("search")}</button></div>
        <div class="lp-res"></div><div class="lp-map"></div></div></div>`;
  },
};
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-lp]");
  if (!b) return;
  const box = b.closest(".lp"), inp = box.querySelector("input");
  const set = (lat, lng) => { inp.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`; inp.dispatchEvent(new Event("change", { bubbles: true })); };
  if (b.dataset.lp === "gps") {
    if (!navigator.geolocation) return toast("เครื่องนี้หาตำแหน่งไม่ได้");
    toast("กำลังหาตำแหน่ง…");
    return navigator.geolocation.getCurrentPosition((p) => {
      if (!parseLatLng(`${p.coords.latitude}, ${p.coords.longitude}`)) return toast("ตำแหน่งตอนนี้อยู่นอกฮอกไกโด ใช้แตะบนแผนที่แทน");
      set(p.coords.latitude, p.coords.longitude); toast("ใส่ตำแหน่งตอนนี้แล้ว");
    }, () => toast("หาตำแหน่งไม่ได้ ต้องอนุญาตตำแหน่งในเบราว์เซอร์ก่อน"), { enableHighAccuracy: true, timeout: 15000 });
  }
  if (b.dataset.lp === "find") return LocPick.find(box);
  if (b.dataset.lp === "res") { const [lat, lng] = b.dataset.ll.split(",").map(Number); LocPick.drop(box, lat, lng, 16); set(lat, lng);
    const nm = box.closest(".modal-body")?.querySelector("#cName"); if (nm && !nm.value) nm.value = b.dataset.name;
    box.querySelector(".lp-res").innerHTML = ""; return; }
  const pick = box.querySelector(".lp-pick"), el = box.querySelector(".lp-map");
  pick.hidden = !pick.hidden;
  if (pick.hidden) return;
  if (!el._m) {
    const ll = parseLatLng(inp.value), [cLat, cLng] = (box.dataset.c || "43.0618,141.3545").split(",").map(Number);
    const m = L.map(el, { zoomSnap: 0.25 }).setView(ll ? [ll.lat, ll.lng] : [cLat, cLng], ll ? 15 : 12);
    const [url, attribution] = Object.values(TILE_SOURCES)[0];
    L.tileLayer(url, { maxZoom: 18, attribution }).addTo(m);
    el._m = m;
    if (ll) LocPick.drop(box, ll.lat, ll.lng);
    m.on("click", (e) => {
      if (!parseLatLng(`${e.latlng.lat}, ${e.latlng.lng}`)) return toast("จุดนี้อยู่นอกฮอกไกโด");
      LocPick.drop(box, e.latlng.lat, e.latlng.lng, 0);
      set(e.latlng.lat, e.latlng.lng);
    });
  }
  setTimeout(() => el._m.invalidateSize(), 0);
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter" && ev.target.closest(".lp-find")) { ev.preventDefault(); LocPick.find(ev.target.closest(".lp")); }
});
