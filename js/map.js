// แผนที่ทั้งหมดของเว็บ
// - ภาพแผนที่: OpenStreetMap (เปิดผ่าน http เท่านั้น: file:// ไม่ส่ง Referer แล้วโดนบล็อก) / Esri / GSI
// - ไม่มีเน็ต: วาดโครงร่างเกาะจาก data/outline.js แทน
// - เส้นทางขับรถตามถนนจริงจาก OSRM (มีเน็ตเท่านั้น เก็บไว้ในเบราว์เซอร์) ไม่งั้นลากเส้นตรง
const DAY_COLORS = ["#c8374a", "#2c6e9b", "#2f8a57", "#b7791f", "#7b4fb5", "#0f8b8d", "#d1495b", "#3d5a80", "#6a994e", "#bc6c25", "#8338ec", "#1d3557", "#e76f51", "#457b9d", "#588157"];
const TILE_SOURCES = {
  ...(location.protocol.startsWith("http") ? { "OpenStreetMap": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png", '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'] } : {}),
  "แผนที่ (อังกฤษ)": ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", "Tiles &copy; Esri"],
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
  if (!p.stars && !FOOD[p.id]) return `<div class="pop"><b>${esc(p.name)}</b>${extra}</div>`; // จุดของฉัน
  const meta = FOOD[p.id] ? `${esc(p.cuisine)} • ¥${fmtN(p.price[0])}-${fmtN(p.price[1])} • ${I("clock")} ${esc(p.open)}` : `<span class="stars">${"★".repeat(p.stars)}</span> ${esc(p.type)} • ${I("timer")} ${esc(p.dur)} • ${esc(p.fee)}`;
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
    L.marker([p.lat, p.lng], { icon: pin(x.night ? I("moon") : FOOD[x.id] ? I("utensils") : n, color, "num" + (faded ? " faded" : "")), zIndexOffset: faded ? 0 : 500 })
      .bindPopup(placePopup(p, `<div class="mute">วันที่ ${e.i + 1} • จุดที่ ${n} • ${fmtT(x.t)}</div>`), { maxWidth: 260 }).addTo(M.layer);
    M.bounds.push([p.lat, p.lng]);
  });
}

const TripMap = {
  // แผนที่ใหญ่หน้าวางแผน: focus = เลขวัน หรือ null = ทั้งทริป
  drawPlan(M, evals, focus = null) {
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
    refitMap(M);
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
      const ic = I(FOOD[p.id] ? "utensils" : TAG_ICON[p.tags[0]] || "map-pin"), st = p.stars || 1;
      L.marker([p.lat, p.lng], { icon: pin(ic, border, "emo s" + st), zIndexOffset: st * 100 })
        .bindPopup(placePopup(p), { maxWidth: 260 }).addTo(group);
      M.bounds.push([p.lat, p.lng]);
    }
    refitMap(M);
  },

  // ภูมิภาค + ฐานที่พัก + เวลาขับจากสนามบิน CTS (หน้ารู้จักฮอกไกโด)
  drawRegions(M) {
    M.layer.clearLayers();
    M.bounds = [];
    const groups = {};
    HUBS.forEach((h) => (groups[h.region] ||= []).push(h));
    for (const [region, hs] of Object.entries(groups)) {
      const c = REGION_COLORS[region];
      const g = GUIDE.regions.find((r) => region.startsWith(r.name.split(" /")[0]));
      const lat = hs.reduce((a, h) => a + h.lat, 0) / hs.length, lng = hs.reduce((a, h) => a + h.lng, 0) / hs.length;
      L.circle([lat, lng], { radius: hs.length > 2 ? 45000 : 30000, color: c, weight: 1.5, fillColor: c, fillOpacity: 0.15, interactive: false }).addTo(M.layer);
      for (const h of hs) {
        const d = driveLeg("CTS", h.id), t = transitPath("CTS", h.id); // ป้ายเวลาขับใช้ค่าหน้าหนาว
        L.circleMarker([h.lat, h.lng], { radius: 5, color: "#fff", weight: 1.5, fillColor: c, fillOpacity: 1 })
          .bindTooltip(`<b>${esc(h.name)}</b><br>จาก CTS: ${I("car")} ${fmtH(d.h * WINTER)}${t ? ` • ${I("train-front")} ${fmtH(t.h)}` : " • ไม่มีรถไฟ/บัสตรง"}`)
          .bindPopup(`<b>${esc(h.name)}</b><br>จากสนามบิน CTS: ขับ ≈${fmtH(d.h * WINTER)} (หน้าหนาว)${t ? `<br>รถไฟ/บัส ≈${fmtH(t.h)}` : "<br>ไม่มีรถไฟ/บัสตรง"}<br>${I("thumbs-up")} ${esc(h.pros)}`).addTo(M.layer);
        M.bounds.push([h.lat, h.lng]);
      }
      L.marker([lat, lng], { icon: labelIcon(`${esc(region.split(" /")[0])}${g ? `<small>${g.first ? I("star") + " ทริปแรก • " : ""}${esc(g.fromCTS)}</small>` : ""}`, c), zIndexOffset: 500 }).addTo(M.layer);
    }
    for (const a of AIRPORTS) L.marker([a.lat, a.lng], { icon: pin(I("plane"), "#142033", "emo s1") }).bindTooltip(a.name + ": " + a.note).addTo(M.layer);
    refitMap(M);
  },

  // เครือข่ายถนน/รถไฟ + จุดเสี่ยง (หน้าการเดินทาง)
  drawNetwork(M, { car = true, transit = true } = {}) {
    M.layer.clearLayers();
    M.bounds = [];
    if (transit) for (const e of TRANSIT_EDGES) {
      const a = point(e.a), b = point(e.b);
      L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color: "#2c6e9b", weight: e.pass ? 4 : 2.5, dashArray: e.pass ? null : "4 6", opacity: 0.75 })
        .bindTooltip(`${I("train-front")} ${esc(pname(e.a))} ↔ ${esc(pname(e.b))}: ${fmtH(e.h)} • ${esc(e.by)} • ${esc(e.freq)}`, { sticky: true }).addTo(M.layer);
    }
    if (car) for (const e of DRIVE_EDGES) {
      const a = point(e.a), b = point(e.b);
      const color = e.high ? "#c8374a" : /ต่ำ/.test(e.risk) ? "#2f8a57" : "#d08c1a";
      const line = L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color, weight: 5, opacity: 0.6 })
        .bindTooltip(`${I("car")} ${esc(pname(e.a))} ↔ ${esc(pname(e.b))}: ${e.km} กม. • หน้าหนาว ${fmtH(e.h * WINTER)}<br>${esc(e.road)}<br>${esc(e.risk)}`, { sticky: true }).addTo(M.layer);
      // utoro-rausu ต้องอ้อมช่องเขาที่ปิด OSRM ไม่รู้ ให้คงเป็นเส้นตรง
      if (!(e.high && /ปิด/.test(e.risk))) { const g = Route.get([a, b], (geo) => line.setLatLngs(geo)); if (g) line.setLatLngs(g); }
    }
    if (car) for (const r of ROADS) {
      const closed = !/^เปิด/.test(r.status) && /ปิด/.test(r.status);
      L.marker([r.lat, r.lng], { icon: pin(I(closed ? "ban" : "triangle-alert"), closed ? "#c8374a" : "#d08c1a", "emo s1") })
        .bindPopup(`<b>${esc(r.road)}</b><br>${esc(r.status)}<br>${esc(r.effect || "")}<br><b>ทางเลือก:</b> ${esc(r.alt)}`).addTo(M.layer);
    }
    for (const h of HUBS) {
      L.circleMarker([h.lat, h.lng], { radius: 5, color: "#142033", weight: 2, fillColor: "#fff", fillOpacity: 1 }).bindTooltip(h.name).addTo(M.layer);
      M.bounds.push([h.lat, h.lng]);
    }
    for (const a of AIRPORTS) L.marker([a.lat, a.lng], { icon: labelIcon(`${I("plane")} ${a.id}`, "#142033") }).bindTooltip(a.name).addTo(M.layer);
    refitMap(M);
  },

  // ฐานที่พักในแผน (หน้าที่พัก)
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
  // attrs = แอตทริบิวต์ของ input (id/data-*), c = จุดกลางแผนที่ถ้ายังไม่มีพิกัด
  html(label, attrs, value = "", c = null) {
    return `<div class="lp"${c ? ` data-c="${c.lat},${c.lng}"` : ""}><label class="f">${label}<input type="text" ${attrs} value="${esc(value)}" placeholder="ลิงก์ Google Maps หรือ 43.06, 141.35"></label>
      <div class="row lp-btns"><button type="button" class="btn small" data-lp="map">${I("map-pin")} แตะบนแผนที่</button><button type="button" class="btn small" data-lp="gps">${I("navigation")} ตำแหน่งตอนนี้</button></div>
      <div class="lp-map" hidden></div></div>`;
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
  const el = box.querySelector(".lp-map");
  el.hidden = !el.hidden;
  if (el.hidden) return;
  if (!el._m) {
    const ll = parseLatLng(inp.value), [cLat, cLng] = (box.dataset.c || "43.0618,141.3545").split(",").map(Number);
    const m = L.map(el, { zoomSnap: 0.25 }).setView(ll ? [ll.lat, ll.lng] : [cLat, cLng], ll ? 15 : 12);
    const [url, attribution] = Object.values(TILE_SOURCES)[0];
    L.tileLayer(url, { maxZoom: 18, attribution }).addTo(m);
    let mk = ll ? L.marker([ll.lat, ll.lng], { icon: pin(I("map-pin"), "#c8374a") }).addTo(m) : null;
    m.on("click", (e) => {
      if (!parseLatLng(`${e.latlng.lat}, ${e.latlng.lng}`)) return toast("จุดนี้อยู่นอกฮอกไกโด");
      mk ? mk.setLatLng(e.latlng) : (mk = L.marker(e.latlng, { icon: pin(I("map-pin"), "#c8374a") }).addTo(m));
      set(e.latlng.lat, e.latlng.lng);
    });
    el._m = m;
  }
  setTimeout(() => el._m.invalidateSize(), 0);
});
