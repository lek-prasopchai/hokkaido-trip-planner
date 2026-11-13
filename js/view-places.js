// แท็บ "ค้นหา": สถานที่ (ทุกฤดู รวมคาเฟ่/ของหวาน), เทศกาล + หน้ารายละเอียด
const tripMonths = () => { const out = new Set(); for (let d = S.trip.start; d <= S.trip.end; d = addDays(d, 1)) out.add(monthOf(d)); return [...out]; };
const seasonBadges = (p) => seasonsOf(p).map((k) => `<span title="${SEASONS[k].name}">${I(SEASONS[k].ic)}</span>`).join("");
const inPlanMap = () => { const m = {}; if (S.plan) S.plan.days.forEach((d, i) => d.items.forEach((it) => (m[it.id] = i + 1))); return m; };
const addSelect = (id) => S.plan ? `<select data-addto="${esc(id)}" class="addsel ${S.plan.wish.includes(id) ? "wished" : ""}"><option value="">${S.plan.wish.includes(id) ? "♡ อยากไปแล้ว" : "+ ใส่ในแผน"}</option><option value="auto">วันที่เหมาะที่สุด</option>${S.plan.wish.includes(id) ? "" : '<option value="wish">♡ อยากไป (เลือกวันทีหลัง)</option>'}${S.plan.days.map((_, i) => `<option value="${i}">วันที่ ${i + 1} (${esc(short(Planner.ends(i).to))})</option>`).join("")}${S.plan.wish.includes(id) ? '<option value="unwish">✕ เอาออกจากอยากไป</option>' : ""}</select>` : "";
// มุมมองรายการสั้น (ค่าเริ่มต้นบนมือถือ) / การ์ดมีรูป: จำไว้ใน S.set.view
const listView = () => (S.set.view || (matchMedia("(max-width: 899px)").matches ? "list" : "card")) === "list";
const viewToggle = (n) => `<div class="row list-head"><span class="mute">${n}</span><span class="spacer"></span><div class="seg no-print">${[["list", "รายการ"], ["card", "การ์ดมีรูป"]].map(([k, v]) => `<button data-view="${k}" class="${listView() === (k === "list") ? "on" : ""}">${v}</button>`).join("")}</div></div>`;
// แถวสั้น: รูปเล็ก ชื่อ ข้อมูลบรรทัดเดียว ปุ่มใส่แผน • กดชื่อ/รูป = เปิดรายละเอียด
const locBtn = (id) => `<button class="btn small loc" data-locate="${id}" title="ดูบนแผนที่" aria-label="ดูบนแผนที่">${I("map-pin")}</button>`;
const lrow = (x, attr, sub, inPlan) => `<div class="lrow ${inPlan ? "in" : ""}"><span class="lth" ${attr}>${x.img ? `<img src="${x.img}" alt="" loading="lazy">` : I("map-pin")}</span>
  <div class="lmain" ${attr}><b>${esc(names(x)[0])}</b><small>${sub}</small></div><div class="lact">${x.lat ? locBtn(x.id) : ""}${inPlan ? `<span class="badge b-good">วันที่ ${inPlan}</span>` : addSelect(x.id)}</div></div>`;
document.addEventListener("click", (e) => {
  const v = e.target.closest("[data-view]")?.dataset.view;
  if (!v) return;
  S.set.view = v; save(false);
  if (App.cur === "places") PlacesView.list();
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
  M: null, lim: 30, f: { region: "", tag: "", stars: 0, q: "", season: "trip", transit: false, free: false, inplan: false, wish: false, evening: false, sort: "stars" },
  F0: { region: "", tag: "", stars: 0, season: "trip", transit: false, free: false, inplan: false, wish: false, evening: false, sort: "stars" },

  // มุมมองแผนที่ตอนนี้ (ยังไม่วาดหมุด/พับอยู่ = null → ซูมให้เห็นผลทั้งหมด)
  view() { const m = this.M?.map; return this.M?.drawn && m.getContainer().isConnected && m.getSize().x ? { c: m.getCenter(), z: m.getZoom() } : null; },

  // refit: เปลี่ยนตัวกรอง/ล้างตัวกรอง = ชุดผลใหม่ ซูมให้เห็นทั้งหมด • นอกนั้น (ใส่/เอาออกจากแผน) คงมุมมองเดิม
  render(refit = false) {
    const sec = $('[data-sec="places"]');
    const regions = [...new Set(PLACES.map((p) => p.region))], f = this.f;
    this.keep = refit ? null : this.view();
    const nOn = Object.keys(this.F0).filter((k) => f[k] !== this.F0[k]).length;
    sec.innerHTML = `
      <div class="sec-head"><h1>สถานที่เที่ยว</h1>
        <p class="lead">${PLACES.length} สถานที่ทั่วฮอกไกโด · เวลาและราคาเป็นค่าประมาณ</p></div>
      <div class="split"><div class="split-top filters no-print">
        <input type="search" class="f-q" aria-label="ค้นหาสถานที่" placeholder="ค้นหาชื่อ ไทย/อังกฤษ/ญี่ปุ่น..." data-f="q" value="${esc(f.q)}">
        <details class="f-more" ${foldAttr("pfilter")}><summary>${I("sliders-horizontal")} ตัวกรอง <span class="badge b-info f-n" ${nOn ? "" : "hidden"}>${nOn}</span></summary><div class="row">
        <select data-f="season"><option value="trip" ${f.season === "trip" ? "selected" : ""}>ช่วงทริป (${tripMonths().map((m) => MO[m - 1]).join(", ")})</option><option value="" ${!f.season ? "selected" : ""}>ทุกฤดู</option>
          ${Object.entries(SEASONS).map(([k, s]) => `<option value="${k}" ${f.season === k ? "selected" : ""}>${s.name}</option>`).join("")}</select>
        <select data-f="region"><option value="">ทุกภูมิภาค</option>${regions.map((r) => `<option ${r === f.region ? "selected" : ""}>${esc(r)}</option>`).join("")}</select>
        <select data-f="tag"><option value="">ทุกความสนใจ</option>${Object.entries(INTEREST).map(([k, v]) => `<option value="${k}" ${k === f.tag ? "selected" : ""}>${v}</option>`).join("")}</select>
        <select data-f="stars"><option value="0">ทุกระดับ</option><option value="3" ${f.stars == 3 ? "selected" : ""}>★★★ ไฮไลต์เท่านั้น</option><option value="2" ${f.stars == 2 ? "selected" : ""}>★★ ขึ้นไป</option></select>
        <select data-f="sort"><option value="stars" ${f.sort === "stars" ? "selected" : ""}>เรียง: ดังสุด</option><option value="near" ${f.sort === "near" ? "selected" : ""}>เรียง: ใกล้ที่พักในแผน</option></select>
      </div><div class="row" style="margin-top:6px">
        <label class="chk"><input type="checkbox" data-f="transit" ${f.transit ? "checked" : ""}> ไปด้วยรถไฟ/บัสได้</label>
        <label class="chk"><input type="checkbox" data-f="free" ${f.free ? "checked" : ""}> ฟรี</label>
        <label class="chk"><input type="checkbox" data-f="evening" ${f.evening ? "checked" : ""}> เที่ยวตอนค่ำได้</label>
        ${S.plan ? `<label class="chk"><input type="checkbox" data-f="inplan" ${f.inplan ? "checked" : ""}> เฉพาะที่อยู่ในแผน</label>
        <label class="chk"><input type="checkbox" data-f="wish" ${f.wish ? "checked" : ""}> เฉพาะที่อยากไป</label>` : ""}
        <button class="linkbtn" data-freset ${nOn ? "" : "hidden"}>ล้างตัวกรอง</button></div></details></div>
      <aside class="split-side"><details class="card mapbox fold-card" ${foldAttr("pmap")} id="pMapCard"><summary><h2>${I("map")} แผนที่</h2></summary><div class="map" id="placesMap"></div>
      <div class="map-legend">${Object.entries(TAG_ICON).map(([k, v]) => `<span>${I(v)} ${INTEREST[k]}</span>`).join("")}
        <span><i class="ring" style="border-color:#c8374a"></i>★★★ ไฮไลต์</span><span><i class="ring" style="border-color:#2c6e9b"></i>★★ ดีถ้าผ่าน</span><span><i class="ring" style="border-color:#9aa5b1"></i>★ ถ้ามีเวลา</span>
        <span><i class="ring" style="border-color:${WISH_C}"></i>อยากไป</span><span><i class="ring" style="border-color:#2f8a57"></i>อยู่ในแผนแล้ว</span>
        <small class="mute legend-note">ดาว = ความเห็นของเว็บว่าคุ้มแค่ไหน ไม่ใช่คะแนนรีวิว (ดูรีวิวจริงที่ปุ่ม รีวิว Google Maps)</small></div></details></aside>
      <div class="split-main" id="placeList"></div></div>${PlanView.undoBtn()}`;
    this.M = makeMap($("#placesMap"));
    $("#pMapCard").addEventListener("toggle", (e) => { if (e.target.open) setTimeout(() => TripMap.drawPlaces(this.M, this.filtered(), this.view() || this.keep), 0); }); // สร้างตอนพับอยู่ ขนาด 0
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
      && (!f.transit || ["ok", "limited", "tour"].includes(access(p))) && (!f.free || !p.feeYen) && (!f.inplan || plan[p.id]) && (!f.wish || S.plan?.wish.includes(p.id)) && (!f.evening || p.evening))
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
      <div class="act"><button class="btn small" data-detail="${p.id}">รายละเอียด</button>${p.lat ? locBtn(p.id) : ""}<a class="btn small" href="${mapsUrl(p.ja || p.name)}" target="_blank" rel="noopener">${I("star")} รีวิว</a>
        ${plan[p.id] ? `<span class="badge b-good">อยู่ในวันที่ ${plan[p.id]}</span>` : addSelect(p.id)}</div></div>`;
  },

  list(refit = false) {
    const L = this.filtered(), plan = inPlanMap();
    const rows = L.slice(0, this.lim);
    $("#placeList").innerHTML = `${viewToggle(L.length + " ที่")}${listView()
      ? `<div class="card llist">${rows.map((p) => lrow(p, `data-detail="${p.id}"`, `<span class="stars">${"★".repeat(p.stars)}</span> ${esc(p.area)} • ${esc(p.dur)} • ${esc(p.fee)}`, plan[p.id])).join("")}</div>`
      : `<div class="grid g3">${rows.map((p) => this.card(p, plan)).join("")}</div>`}
      ${L.length > this.lim ? `<div class="more"><button class="btn" data-more>แสดงเพิ่ม (เหลืออีก ${L.length - this.lim} ที่)</button></div>` : ""}`;
    if (refit) this.keep = null;
    setTimeout(() => TripMap.drawPlaces(this.M, L, refit ? null : this.view() || this.keep), 30);
  },

  // ---- หน้ารายละเอียด (ใช้ได้ทั้งสถานที่และจุดของฉัน) ----
  detail(id) {
    const p = point(id);
    if (!p) return;
    if (!p.stars) return Modal.open(`<h2>${I("star")} ${esc(p.name)}</h2>${p.url ? `<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">เปิดลิงก์</a>` : ""}${p.lat ? ` <a class="btn" href="${llUrl(p)}" target="_blank" rel="noopener">Google Maps</a>` : ""}`);
    const imgs = placeImgs(p), plan = inPlanMap();
    const sn = p.sn || {};
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
    const fact = (ic, k, v) => v ? `<div class="fact"><span>${I(ic)} ${k}</span><b>${v}</b></div>` : "";
    const transit = Planner.usedModes().has("transit");
    const trTxt = `${ACCESS_TXT[access(p)]}${p.tr?.t ? `: ${esc(p.tr.t)}` : " (ประมาณจากระยะทาง ตรวจตารางจริง)"}${p.tr?.last ? `<br><b>รถเที่ยวสุดท้ายกลับ ~${esc(p.tr.last)}</b>` : ""}`;
    const more = [row("วันหยุด", esc(p.closed === "-" ? "" : p.closed || p.closedDays)),
      Planner.usedModes().has("car") ? row("ที่จอดรถ", esc(p.parking === "-" ? "" : p.parking)) : "", transit ? "" : row("รถไฟ/บัส", trTxt),
      String(p.acc || "").startsWith("ประมาณ") ? row("ตำแหน่งบนแผนที่", "ประมาณ: ใช้ปุ่มรีวิว Google Maps เพื่อดูตำแหน่งจริง") : "",
      row("ชื่อญี่ปุ่น", esc(p.ja)), row("ที่อยู่", esc(p.addrJa)), row("โทร", esc(p.phone)), row("MAPCODE", esc(p.mapcode)),
      row("ตรวจข้อมูล", esc(p.checked || "พ.ย. 2026 (ประมาณ)"))].join("");
    Modal.open(`
      ${imgs.length ? `<div class="gal">${imgs.map((x, i) => `<img src="${x.img}" alt="" loading="lazy" data-gi="${i}">`).join("")}</div>` : ""}
      <h2 style="margin-top:12px">${nameHtml(p)}</h2>
      <div class="row" style="gap:6px">${p.stars ? `<span class="stars">${"★".repeat(p.stars)}</span>` : ""}<span class="badge b-mute">${esc(p.type)}</span><span class="badge b-mute">${I("map-pin")} ${esc(p.area || HUB[p.hub]?.name || "")}</span>
        <span class="sea-inline">${seasonBadges(p)} ${monthRange(monthsOf(p))}</span>${plan[id] ? `<span class="badge b-good">อยู่ในวันที่ ${plan[id]}</span>` : ""}</div>
      <p class="d-hl">${esc(p.highlight || "")}</p>
      ${(S.plan && !plan[id]) || (App.cur === "places" && p.lat) ? `<div class="row d-act">${S.plan && !plan[id] ? addSelect(id) : ""}${App.cur === "places" && p.lat ? `<button class="btn small" data-locate="${p.id}">${I("map-pin")} ดูบนแผนที่</button>` : ""}</div>` : ""}
      <div class="facts">${fact("clock", "เวลาเปิด", esc(p.open))}${fact("banknote", "ค่าเข้า", esc(p.fee))}${fact("timer", "ใช้เวลา", esc(p.dur ? p.dur : fmtH(p.hours || 1)))}${fact("sun", "ช่วงที่ดีที่สุด", esc(p.best))}${transit ? fact("train-front", "รถไฟ/บัส", trTxt) : ""}</div>
      ${p.caution ? `<div class="callout">${I("triangle-alert")} ${esc(p.caution)}</div>` : ""}
      ${Object.keys(sn).length ? `<div class="sn">${Object.entries(SEASONS).filter(([k]) => sn[k]).map(([k, s]) => `<div><b>${I(s.ic)} ${s.name}</b> ${esc(sn[k])}</div>`).join("")}</div>` : ""}
      ${more ? `<details class="adv d-more"><summary>ข้อมูลเพิ่มเติม <span class="mute">วันหยุด ที่จอดรถ ที่อยู่ โทร</span></summary><dl class="kv">${more}</dl></details>` : ""}
      ${(p.videos || []).length ? `<div class="vids">${p.videos.map((v) => `<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${esc(v)}" title="YouTube" allowfullscreen></iframe>`).join("")}</div>` : ""}
      <div class="row d-links">${reviewLinks(p)}</div>
      ${imgs[0]?.credit ? `<p class="credit">รูป: Wikimedia Commons / Flickr สัญญาอนุญาต CC (กดรูปเพื่อดูที่มาและผู้ถ่าย)</p>` : ""}`, "wide");
    const d = $("#modal");
    d.onclick = (e) => {
      if (e.target === d || e.target.closest("[data-close]")) return d.close();
      if (e.target.dataset.gi) Lightbox.open(imgs, +e.target.dataset.gi, p.name);
      if (e.target.closest("[data-locate]")) { d.close(); this.locate(id); }
    };
    d.onchange = (e) => { const v = e.target.value; if (e.target.dataset.addto && v !== "") { PlanView.addTo(id, /^(auto|wish|unwish)$/.test(v) ? v : +v); d.close(); } };
  },

  // ซูมไปที่สถานที่บนแผนที่แล้วเปิดป๊อปอัป (แผนที่พับอยู่: เปิดก่อน รอวาดหมุด)
  locate(id) {
    const card = $("#pMapCard"), wasOpen = card.open;
    card.open = true;
    const r = card.getBoundingClientRect(), top = 64;
    if (r.top < top || r.top > innerHeight * 0.4) scrollTo({ top: r.top + scrollY - top, behavior: "smooth" });
    setTimeout(() => {
      const mk = this.M.markers?.[id];
      if (!mk) return toast("ไม่อยู่ในผลค้นหาตอนนี้ ล้างตัวกรองแล้วลองใหม่");
      // เริ่มระดับเมือง (เห็นที่ใกล้ๆ) ยังรวมกลุ่มอยู่ก็ซูมเพิ่มทีละขั้น โดยให้สถานที่อยู่กลางจอตลอด • สุดแล้วยังทับ: กางกลุ่มออก
      const map = this.M.map, g = this.M.group, ll = mk.getLatLng();
      const step = (z) => {
        map.setView(ll, z, { animate: false });
        setTimeout(() => {
          const vp = g.getVisibleParent(mk);
          if (vp === mk) return mk.openPopup();
          if (z < map.getMaxZoom()) return step(z + 1);
          setTimeout(() => { g.getVisibleParent(mk)?.spiderfy?.(); setTimeout(() => mk.openPopup(), 300); }, 250); // รอกลุ่มถูกวาดก่อนกาง
        }, 80);
      };
      step(13);
    }, wasOpen ? 0 : 120);
  },

  bind() {
    $('[data-sec="places"]').addEventListener("click", (e) => {
      if (e.target.closest("[data-more]")) { this.lim += 60; this.list(); }
      if (e.target.closest("[data-freset]")) { Object.assign(this.f, this.F0); this.lim = 30; this.render(true); } });
    this.syncF = () => { const n = Object.keys(this.F0).filter((k) => this.f[k] !== this.F0[k]).length, b = sec.querySelector(".f-n"); b.hidden = !n; b.textContent = n; sec.querySelector("[data-freset]").hidden = !n; };
    const sec = $('[data-sec="places"]');
    const upd = (el) => { this.f[el.dataset.f] = el.type === "checkbox" ? el.checked : el.dataset.f === "stars" ? +el.value : el.value; this.lim = 30; this.list(true); this.syncF(); };
    sec.addEventListener("input", (ev) => { if (ev.target.dataset.f === "q") upd(ev.target); });
    sec.addEventListener("change", (ev) => {
      const el = ev.target;
      if (el.dataset.f && el.dataset.f !== "q") upd(el);
      if (el.dataset.addto && el.value !== "") { PlanView.addTo(+el.dataset.addto, /^(auto|wish|unwish)$/.test(el.value) ? el.value : +el.value); }
    });
    sec.addEventListener("click", (ev) => {
      const el = ev.target.closest("[data-locate], [data-detail], [data-lb]");
      if (el?.dataset.locate) this.locate(+el.dataset.locate);
      else if (el?.dataset.detail) this.detail(+el.dataset.detail);
      else if (el?.dataset.lb) Lightbox.place(+el.dataset.lb);
    });
  },
};

