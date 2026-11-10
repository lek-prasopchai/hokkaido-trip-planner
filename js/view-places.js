// แท็บ "ค้นหา": สถานที่ (ทุกฤดู), ร้านอาหาร, เทศกาล + หน้ารายละเอียด
const tripMonths = () => { const out = new Set(); for (let d = S.trip.start; d <= S.trip.end; d = addDays(d, 1)) out.add(monthOf(d)); return [...out]; };
const seasonBadges = (p) => seasonsOf(p).map((k) => `<span title="${SEASONS[k].name}">${I(SEASONS[k].ic)}</span>`).join("");
const inPlanMap = () => { const m = {}; if (S.plan) S.plan.days.forEach((d, i) => d.items.forEach((it) => (m[it.id] = i + 1))); return m; };
const addSelect = (id) => S.plan ? `<select data-addto="${esc(id)}" class="addsel"><option value="">+ ใส่ในแผน</option><option value="auto">วันที่เหมาะที่สุด</option><option value="wish">♡ อยากไป (เลือกวันทีหลัง)</option>${S.plan.days.map((_, i) => `<option value="${i}">วันที่ ${i + 1} (${esc(short(Planner.ends(i).to))})</option>`).join("")}</select>` : "";
// มุมมองรายการสั้น (ค่าเริ่มต้นบนมือถือ) / การ์ดมีรูป: จำไว้ใน S.set.view
const listView = () => (S.set.view || (matchMedia("(max-width: 899px)").matches ? "list" : "card")) === "list";
const viewToggle = (n) => `<div class="row list-head"><span class="mute">${n}</span><span class="spacer"></span><div class="seg no-print">${[["list", "รายการ"], ["card", "การ์ดมีรูป"]].map(([k, v]) => `<button data-view="${k}" class="${listView() === (k === "list") ? "on" : ""}">${v}</button>`).join("")}</div></div>`;
// แถวสั้น: รูปเล็ก ชื่อ ข้อมูลบรรทัดเดียว ปุ่มใส่แผน • กดชื่อ/รูป = เปิดรายละเอียด
const lrow = (x, attr, sub, inPlan) => `<div class="lrow ${inPlan ? "in" : ""}"><span class="lth" ${attr}>${x.img ? `<img src="${x.img}" alt="" loading="lazy">` : I(FOOD[x.id] ? "utensils" : "map-pin")}</span>
  <div class="lmain" ${attr}><b>${esc(names(x)[0])}</b><small>${sub}</small></div><div class="lact">${inPlan ? `<span class="badge b-good">วันที่ ${inPlan}</span>` : addSelect(x.id)}</div></div>`;
document.addEventListener("click", (e) => {
  const v = e.target.closest("[data-view]")?.dataset.view;
  if (!v) return;
  S.set.view = v; save(false);
  if (App.cur === "places") PlacesView.list(); else if (App.cur === "food") FoodView.list();
});
const reviewLinks = (p) => {
  const q = p.ja || p.name, qe = p.en || q;
  return `<a class="btn small" href="${mapsUrl(q)}" target="_blank" rel="noopener">${I("star")} รีวิว Google Maps</a>
    <a class="btn small" href="${ytUrl(qe + " Hokkaido")}" target="_blank" rel="noopener">${I("play")} YouTube</a>
    <a class="btn small" href="${ttUrl(p.name + " " + (p.en || ""))}" target="_blank" rel="noopener">${I("music")} TikTok</a>
    <a class="btn small" href="${gimgUrl(q)}" target="_blank" rel="noopener">${I("image")} รูปเพิ่ม</a>
    ${p.url ? `<a class="btn small" href="${esc(p.url)}" target="_blank" rel="noopener">${I("globe")} เว็บไซต์ทางการ</a>` : `<a class="btn small" href="${gUrl(q + " 公式")}" target="_blank" rel="noopener">${I("globe")} ค้นเว็บทางการ</a>`}`;
};

const PlacesView = {
  M: null, lim: 30, f: { region: "", tag: "", stars: 0, q: "", season: "trip", transit: false, free: false, inplan: false, sort: "stars" },

  render() {
    const sec = $('[data-sec="places"]');
    const regions = [...new Set(PLACES.map((p) => p.region))], f = this.f;
    sec.innerHTML = `
      <div class="sec-head"><h1>สถานที่เที่ยว</h1>
        <p class="lead">${PLACES.length} สถานที่ทั่วฮอกไกโด ทุกฤดู ★★★ = ห้ามพลาด • ไอคอน ${Object.values(SEASONS).map((s) => I(s.ic)).join("")} = ฤดูที่ไปได้ • เวลาเปิด/ราคาที่มี ≈ เป็นค่าประมาณ ตรวจก่อนไป</p></div>
      ${this.festBox()}
      <div class="filters no-print"><div class="row">
        <input type="search" aria-label="ค้นหาสถานที่" placeholder="ค้นหาชื่อ ไทย/อังกฤษ/ญี่ปุ่น..." data-f="q" value="${esc(f.q)}" style="flex:1;min-width:160px">
        <select data-f="season"><option value="trip" ${f.season === "trip" ? "selected" : ""}>ช่วงทริปของฉัน (${tripMonths().map((m) => MO[m - 1]).join(", ")})</option><option value="" ${!f.season ? "selected" : ""}>ทุกฤดู</option>
          ${Object.entries(SEASONS).map(([k, s]) => `<option value="${k}" ${f.season === k ? "selected" : ""}>${s.name}</option>`).join("")}</select>
        <select data-f="region"><option value="">ทุกภูมิภาค</option>${regions.map((r) => `<option ${r === f.region ? "selected" : ""}>${esc(r)}</option>`).join("")}</select>
        <select data-f="tag"><option value="">ทุกความสนใจ</option>${Object.entries(INTEREST).map(([k, v]) => `<option value="${k}" ${k === f.tag ? "selected" : ""}>${v}</option>`).join("")}</select>
        <select data-f="stars"><option value="0">ทุกระดับ</option><option value="3" ${f.stars == 3 ? "selected" : ""}>★★★ เท่านั้น</option><option value="2" ${f.stars == 2 ? "selected" : ""}>★★ ขึ้นไป</option></select>
        <select data-f="sort"><option value="stars" ${f.sort === "stars" ? "selected" : ""}>เรียง: ดังสุด</option><option value="near" ${f.sort === "near" ? "selected" : ""}>เรียง: ใกล้ที่พักในแผน</option></select>
      </div><div class="row" style="margin-top:6px">
        <label class="chk"><input type="checkbox" data-f="transit" ${f.transit ? "checked" : ""}> ไปด้วยรถไฟ/บัสได้</label>
        <label class="chk"><input type="checkbox" data-f="free" ${f.free ? "checked" : ""}> ฟรี</label>
        ${S.plan ? `<label class="chk"><input type="checkbox" data-f="inplan" ${f.inplan ? "checked" : ""}> เฉพาะที่อยู่ในแผน</label>` : ""}</div></div>
      <details class="card mapbox" open><summary><b>แผนที่</b></summary><div class="map" id="placesMap"></div>
      <div class="map-legend">${Object.entries(TAG_ICON).map(([k, v]) => `<span>${I(v)} ${INTEREST[k]}</span>`).join("")}
        <span><i class="ring" style="border-color:#c8374a"></i>ขอบแดง = ★★★</span><span><i class="ring" style="border-color:#2c6e9b"></i>ขอบน้ำเงิน = ★★</span><span><i class="ring" style="border-color:#2f8a57"></i>ขอบเขียว = อยู่ในแผนแล้ว</span></div></details>
      <div id="placeList"></div>`;
    this.M = makeMap($("#placesMap"));
    this.list();
  },

  filtered() {
    const f = this.f, q = f.q.trim().toLowerCase(), plan = inPlanMap();
    const ms = f.season === "trip" ? tripMonths() : f.season ? SEASONS[f.season].m : null;
    const bases = S.plan ? [...new Set(S.plan.bases)].map((b) => point(b)) : [HUB.sapporo];
    const near = (p) => Math.min(...bases.map((b) => km(b, p)));
    return PLACES.filter((p) => (!f.region || p.region === f.region) && (!f.tag || p.tags.includes(f.tag)) && p.stars >= f.stars
      && (!q || [p.name, p.area, p.ja, p.en, p.type, p.highlight, p.kw].join(" ").toLowerCase().includes(q))
      && (!ms || ms.some((m) => monthsOf(p).includes(m)))
      && (!f.transit || ["ok", "limited", "tour"].includes(access(p))) && (!f.free || !p.feeYen) && (!f.inplan || plan[p.id]))
      .sort((a, b) => f.sort === "near" ? near(a) - near(b) : b.stars - a.stars || ({ "ดังมาก": 0, "ดัง": 1 }[a.pop] ?? 2) - ({ "ดังมาก": 0, "ดัง": 1 }[b.pop] ?? 2) || a.id - b.id);
  },

  card(p, plan) {
    const n = placeImgs(p).length;
    return `<div class="card pcard ${plan[p.id] ? "in" : ""}" id="pl-${p.id}">
      <div class="ph" data-lb="${p.id}">${p.img ? `<img src="${p.img}" alt="${esc(p.name)}" loading="lazy">${n > 1 ? `<span class="cnt">${I("camera")} ${n}</span>` : ""}` : I(TAG_ICON[p.tags[0]] || "map-pin")}<span class="sea">${seasonBadges(p)}</span></div>
      <div class="row" style="gap:6px"><span class="stars">${"★".repeat(p.stars)}</span><span class="badge b-mute">${esc(p.type)}</span>
        ${p.pop === "คนรู้จักน้อย" ? '<span class="badge b-info">คนรู้จักน้อย</span>' : ""}${p.season ? `<span class="badge b-fest">เฉพาะ ${esc(p.season.join("-"))}</span>` : monthsOf(p).length < 12 ? `<span class="badge b-warn">${monthRange(monthsOf(p))}</span>` : ""}</div>
      <h4 data-detail="${p.id}">${nameHtml(p)}</h4>
      <div class="meta"><span>${I("map-pin")} ${esc(p.area)}</span><span>${I("timer")} ${esc(p.dur)}</span><span>${I("banknote")} ${esc(p.fee)}</span><span>${access(p) === "ok" ? I("train-front") + " รถไฟ/บัสได้" : access(p) === "car" ? I("car") + " ต้องมีรถ/ทัวร์" : I("bus") + " " + ACCESS_TXT[access(p)]}</span></div>
      <div class="hl">${esc(p.highlight)}</div>
      <div class="act"><button class="btn small" data-detail="${p.id}">รายละเอียด</button><a class="btn small" href="${mapsUrl(p.ja || p.name)}" target="_blank" rel="noopener">${I("star")} รีวิว</a>
        ${plan[p.id] ? `<span class="badge b-good">อยู่ในวันที่ ${plan[p.id]}</span>` : addSelect(p.id)}</div></div>`;
  },

  list() {
    const L = this.filtered(), plan = inPlanMap();
    const rows = L.slice(0, this.lim);
    $("#placeList").innerHTML = `${viewToggle(L.length + " ที่")}${listView()
      ? `<div class="card llist">${rows.map((p) => lrow(p, `data-detail="${p.id}"`, `<span class="stars">${"★".repeat(p.stars)}</span> ${esc(p.area)} • ${esc(p.dur)} • ${esc(p.fee)}`, plan[p.id])).join("")}</div>`
      : `<div class="grid g3">${rows.map((p) => this.card(p, plan)).join("")}</div>`}
      ${L.length > this.lim ? `<div class="more"><button class="btn" data-more>แสดงเพิ่ม (เหลืออีก ${L.length - this.lim} ที่)</button></div>` : ""}`;
    setTimeout(() => TripMap.drawPlaces(this.M, L), 30);
  },

  // ---- หน้ารายละเอียด (ใช้ได้ทั้งสถานที่และร้านอาหาร/จุดของฉัน) ----
  detail(id) {
    const p = point(id);
    if (!p) return;
    if (!p.stars && !FOOD[id]) return Modal.open(`<h2>${I("star")} ${esc(p.name)}</h2>${p.url ? `<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">เปิดลิงก์</a>` : ""}${p.lat ? ` <a class="btn" href="${llUrl(p)}" target="_blank" rel="noopener">Google Maps</a>` : ""}`);
    const imgs = placeImgs(p), plan = inPlanMap(), food = !!FOOD[id];
    const sn = p.sn || {};
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
    Modal.open(`
      ${imgs.length ? `<div class="gal">${imgs.map((x, i) => `<img src="${x.img}" alt="" loading="lazy" data-gi="${i}">`).join("")}</div>` : ""}
      <h2 style="margin-top:10px">${nameHtml(p)}</h2>
      <div class="row" style="gap:6px">${p.stars ? `<span class="stars">${"★".repeat(p.stars)}</span>` : ""}<span class="badge b-mute">${esc(p.type || p.cuisine)}</span><span class="badge b-mute">${I("map-pin")} ${esc(p.area || HUB[p.hub]?.name || "")}</span>
        <span class="sea-inline">${seasonBadges(p)} ${monthRange(monthsOf(p))}</span>${plan[id] ? `<span class="badge b-good">อยู่ในวันที่ ${plan[id]}</span>` : ""}</div>
      <p style="margin-top:8px">${esc(p.highlight || p.signature || "")}</p>
      ${Object.keys(sn).length ? `<div class="sn">${Object.entries(SEASONS).filter(([k]) => sn[k]).map(([k, s]) => `<div><b>${I(s.ic)} ${s.name}</b> ${esc(sn[k])}</div>`).join("")}</div>` : ""}
      ${p.caution ? `<div class="callout">${I("triangle-alert")} ${esc(p.caution)}</div>` : ""}
      <dl class="kv">
        ${row("เวลาเปิด", esc(p.open))}${row("วันหยุด", esc(p.closed === "-" ? "" : p.closed || p.closedDays))}${row(food ? "ราคา" : "ค่าเข้า", food ? `¥${fmtN(p.price[0])}-${fmtN(p.price[1])} ต่อคน` : esc(p.fee))}
        ${row("ใช้เวลา", esc(p.dur ? p.dur : fmtH(p.hours || 1)))}${row("ช่วงที่ดีที่สุด", esc(p.best))}${row("เมนูเด่น", esc(food ? p.signature : ""))}
        ${row("คิว / จอง", esc(p.queue || (p.reserve ? "ควรจอง" : "")))}${row("จ่ายเงิน", esc({ cash: "เงินสดเท่านั้น", card: "รับบัตร", ic: "บัตร + IC" }[p.pay] || ""))}
        ${Planner.usedModes().has("car") ? row("ที่จอดรถ", esc(p.parking === "-" ? "" : p.parking)) : ""}
        ${!food ? row("รถไฟ/บัส", `${ACCESS_TXT[access(p)]}${p.tr?.t ? `: ${esc(p.tr.t)}` : " (ประมาณจากระยะทาง ตรวจตารางจริง)"}${p.tr?.last ? `<br><b>รถเที่ยวสุดท้ายกลับ ~${esc(p.tr.last)}</b>` : ""}`) : ""}
        ${String(p.acc || "").startsWith("ประมาณ") ? row("ตำแหน่งบนแผนที่", "ประมาณ: ใช้ปุ่มรีวิว Google Maps เพื่อดูตำแหน่งจริง") : ""}${row("ชื่อญี่ปุ่น", esc(p.ja))}${row("ที่อยู่", esc(p.addrJa))}${row("โทร", esc(p.phone))}${row("MAPCODE", esc(p.mapcode))}
        ${row("ตรวจข้อมูล", esc(p.checked || "พ.ย. 2026 (ประมาณ)"))}</dl>
      ${(p.videos || []).length ? `<div class="vids">${p.videos.map((v) => `<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${esc(v)}" title="YouTube" allowfullscreen></iframe>`).join("")}</div>` : ""}
      <div class="row" style="margin-top:10px">${reviewLinks(p)}<button class="btn small" data-show="1">${I("car-taxi-front")} การ์ดโชว์คนขับ</button></div>
      ${S.plan && !plan[id] ? `<div class="row" style="margin-top:10px">${addSelect(id)}</div>` : ""}
      ${imgs[0]?.credit ? `<p class="credit">รูป: Wikimedia Commons (กดรูปเพื่อดูที่มา)</p>` : ""}`, "wide");
    const d = $("#modal");
    d.onclick = (e) => {
      if (e.target === d || e.target.closest("[data-close]")) return d.close();
      if (e.target.dataset.gi) Lightbox.open(imgs, +e.target.dataset.gi, p.name);
      if (e.target.dataset.show) showCard(p);
    };
    d.onchange = (e) => { const v = e.target.value; if (e.target.dataset.addto && v !== "") { PlanView.addTo(id, /^(auto|wish)$/.test(v) ? v : +v); d.close(); } };
  },

  // ---- เทศกาล ----
  // เทศกาล (เดิมเป็นหน้าแยก): รายการสั้นในหน้าสถานที่ งานที่ตรงช่วงทริปขึ้นก่อน • แผนรายวันบอกงานที่ตรงอยู่แล้ว
  festBox() {
    const y = monthOf(S.trip.start) >= 6 ? +S.trip.start.slice(0, 4) : +S.trip.start.slice(0, 4) - 1;
    const shift = (iso) => `${+iso.slice(0, 4) + (y - 2026)}${iso.slice(4)}`; // วันที่ใน data เป็นฤดู 2026-27
    const L = FESTIVALS.map((f) => ({ f, hit: shift(f.start) <= S.trip.end && shift(f.end) >= S.trip.start }))
      .sort((a, b) => b.hit - a.hit || a.f.start.localeCompare(b.f.start));
    const n = L.filter((x) => x.hit).length;
    return `<details class="card fest-box" ${n ? "open" : ""}><summary><b>${I("party-popper")} เทศกาลหน้าหนาว</b> <span class="mute">${n ? `${n} งานตรงช่วงทริปคุณ` : "ไม่มีงานตรงช่วงทริป"} • ทั้งหมด ${L.length} งาน</span></summary>
      <ul class="fest-list">${L.map(({ f, hit }) => `<li class="${hit ? "hit" : ""}"><b>${esc(f.name)}</b> <span class="mute">${esc(f.area)} • ${esc(f.dates)}</span>${hit ? ' <span class="badge b-fest">ตรงทริป</span>' : ""}<small>${esc(f.detail)}</small></li>`).join("")}</ul></details>`;
  },

  bind() {
    $('[data-sec="places"]').addEventListener("click", (e) => { if (e.target.closest("[data-more]")) { this.lim += 60; this.list(); } });
    const sec = $('[data-sec="places"]');
    const upd = (el) => { this.f[el.dataset.f] = el.type === "checkbox" ? el.checked : el.dataset.f === "stars" ? +el.value : el.value; this.lim = 30; this.list(); };
    sec.addEventListener("input", (ev) => { if (ev.target.dataset.f === "q") upd(ev.target); });
    sec.addEventListener("change", (ev) => {
      const el = ev.target;
      if (el.dataset.f && el.dataset.f !== "q") upd(el);
      if (el.dataset.addto && el.value !== "") { PlanView.addTo(+el.dataset.addto, /^(auto|wish)$/.test(el.value) ? el.value : +el.value); }
    });
    sec.addEventListener("click", (ev) => {
      const el = ev.target.closest("[data-detail], [data-lb]");
      if (el?.dataset.detail) this.detail(+el.dataset.detail);
      else if (el?.dataset.lb) Lightbox.place(+el.dataset.lb);
    });
  },
};

// ---------- ร้านอาหาร ----------
const FoodView = {
  M: null, f: { hub: "", cuisine: "", q: "", tag: "" },
  render() {
    const sec = $('[data-sec="food"]'), F = window.FOODS || [], f = this.f;
    const hubs = [...new Set(F.map((x) => x.hub))], cuis = [...new Set(F.map((x) => x.cuisine))];
    sec.innerHTML = `<div class="sec-head"><h1>ร้านอาหาร</h1><p class="lead">${F.length} ร้านดังและอาหารประจำถิ่น เวลาเปิด/ราคาเป็นค่าประมาณ ร้านดังคิวยาว ตรวจรีวิวและเวลาล่าสุดใน Google Maps ก่อนไป • ใส่ร้านในแผนรายวันได้ ระบบจะใช้แทนช่วงกินข้าวที่กันไว้อัตโนมัติ</p></div>
      <div class="filters no-print"><div class="row"><input type="search" aria-label="ค้นหาร้านอาหาร" placeholder="ค้นหาร้าน/เมนู..." data-ff="q" value="${esc(f.q)}" style="flex:1;min-width:160px">
        <select data-ff="hub"><option value="">ทุกเมือง</option>${hubs.map((h) => `<option value="${h}" ${f.hub === h ? "selected" : ""}>${esc(HUB[h]?.name || h)}</option>`).join("")}</select>
        <select data-ff="cuisine"><option value="">ทุกประเภท</option>${cuis.map((c) => `<option ${f.cuisine === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
        <select data-ff="tag"><option value="">ทั้งหมด</option><option value="halal" ${f.tag === "halal" ? "selected" : ""}>ฮาลาล/ไม่มีหมู</option><option value="veg" ${f.tag === "veg" ? "selected" : ""}>มีเมนูมังสวิรัติ</option><option value="kids" ${f.tag === "kids" ? "selected" : ""}>เหมาะกับเด็ก</option><option value="late" ${f.tag === "late" ? "selected" : ""}>เปิดดึก</option></select></div></div>
      <details class="card mapbox"><summary><b>แผนที่ร้าน</b></summary><div class="map" id="foodMap"></div></details>
      <div id="foodList"></div>`;
    this.M = makeMap($("#foodMap"));
    this.list();
  },
  filtered() {
    const f = this.f, q = f.q.trim().toLowerCase();
    return (window.FOODS || []).filter((x) => (!f.hub || x.hub === f.hub) && (!f.cuisine || x.cuisine === f.cuisine) && (!f.tag || (x.tags || []).includes(f.tag))
      && (!q || [x.name, x.en, x.ja, x.signature, x.cuisine, x.area].join(" ").toLowerCase().includes(q)));
  },
  list() {
    const L = this.filtered(), plan = inPlanMap();
    const by = {};
    L.forEach((x) => (by[x.hub] ||= []).push(x));
    if (listView()) {
      $("#foodList").innerHTML = `${viewToggle(L.length + " ร้าน")}${Object.entries(by).map(([h, xs]) => `<h3>${esc(HUB[h]?.name || h)}</h3><div class="card llist">${xs.map((x) =>
        lrow(x, `data-fdetail="${x.id}"`, `${esc(x.cuisine)} • ${esc(x.signature || "")} • ¥${fmtN(x.price[0])}-${fmtN(x.price[1])}`, plan[x.id])).join("")}</div>`).join("") || '<p class="empty">ไม่พบร้าน</p>'}`;
      return setTimeout(() => TripMap.drawPlaces(this.M, L), 30);
    }
    $("#foodList").innerHTML = `${viewToggle(L.length + " ร้าน")}${Object.entries(by).map(([h, xs]) => `<h3>${esc(HUB[h]?.name || h)}</h3><div class="grid g3">${xs.map((x) => `
      <div class="card fcard ${plan[x.id] ? "in" : ""}">
        <div class="ph" data-fdetail="${x.id}">${x.img ? `<img src="${x.img}" alt="${esc(x.name)}" loading="lazy">${x.imgNote ? `<span class="cnt">${esc(x.imgNote)}</span>` : ""}` : I("utensils")}</div>
        <div class="row" style="gap:6px"><span class="badge b-mute">${esc(x.cuisine)}</span>${(x.tags || []).map((t) => `<span class="badge b-info">${{ halal: "ฮาลาล/ไม่มีหมู", veg: "มังสวิรัติ", kids: "เด็ก", late: "ดึก", famous: "ดังมาก" }[t] || t}</span>`).join("")}</div>
        <h4 data-fdetail="${x.id}">${nameHtml(x)}</h4>
        <div class="hl">${I("utensils")} ${esc(x.signature)}</div>
        <div class="meta"><span>${I("banknote")} ¥${fmtN(x.price[0])}-${fmtN(x.price[1])}</span><span>${I("clock")} ${esc(x.open)}</span>${x.closedDays ? `<span>หยุด ${esc(x.closedDays)}</span>` : ""}<span>${I("map-pin")} ${esc(x.area)}</span></div>
        ${x.queue ? `<div class="cau">${I("hourglass")} ${esc(x.queue)}</div>` : ""}
        <div class="act"><button class="btn small" data-fdetail="${x.id}">รายละเอียด</button><a class="btn small" href="${mapsUrl(x.ja || x.name)}" target="_blank" rel="noopener">${I("star")} รีวิว</a>
          ${x.tabelog ? `<a class="btn small" href="${esc(x.tabelog)}" target="_blank" rel="noopener">Tabelog</a>` : `<a class="btn small" href="https://tabelog.com/en/rstLst/?sk=${encodeURIComponent(x.ja || x.name)}" target="_blank" rel="noopener">Tabelog</a>`}
          ${plan[x.id] ? `<span class="badge b-good">วันที่ ${plan[x.id]}</span>` : addSelect(x.id)}</div></div>`).join("")}</div>`).join("") || '<p class="empty">ไม่พบร้าน</p>'}`;
    setTimeout(() => TripMap.drawPlaces(this.M, L), 30);
  },
  bind() {
    const sec = $('[data-sec="food"]');
    sec.addEventListener("input", (e) => { if (e.target.dataset.ff === "q") { this.f.q = e.target.value; this.list(); } });
    sec.addEventListener("change", (e) => {
      const el = e.target;
      if (el.dataset.ff && el.dataset.ff !== "q") { this.f[el.dataset.ff] = el.value; this.list(); }
      if (el.dataset.addto && el.value !== "") PlanView.addTo(el.dataset.addto, /^(auto|wish)$/.test(el.value) ? el.value : +el.value);
    });
    sec.addEventListener("click", (e) => { const id = e.target.closest("[data-fdetail]")?.dataset.fdetail; if (id) PlacesView.detail(id); });
  },
};
