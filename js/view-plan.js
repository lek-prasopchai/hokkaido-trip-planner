// แท็บ "ทริปของฉัน": ภาพรวม + แผนรายวัน, ข้อมูลทริป/เที่ยวบิน, ที่พัก, โหมดวันนี้
const LVL_TXT = { good: "เวลาพอ", warn: "ค่อนข้างแน่น", bad: "แน่น/เสี่ยง" };
const LVL_ICON = { good: I("circle-check"), warn: I("triangle-alert"), bad: I("ban"), info: I("info"), fest: I("party-popper") };
const hubOptions = (sel) => {
  const groups = {};
  HUBS.forEach((h) => (groups[h.region] ||= []).push(h));
  return Object.entries(groups).map(([g, hs]) => `<optgroup label="${esc(g)}">${hs.map((h) => `<option value="${h.id}" ${h.id === sel ? "selected" : ""}>${esc(h.name)}</option>`).join("")}</optgroup>`).join("");
};
const airOptions = (sel) => AIRPORTS.map((a) => `<option value="${a.id}" ${a.id === sel ? "selected" : ""}>${esc(a.id)}: ${esc(a.name)}</option>`).join("");
const idOf = (s) => (isNaN(s) ? s : +s);
// กล่องพับที่จำสถานะเปิด/ปิดไว้ แม้หน้าวาดใหม่ทุกครั้งที่แก้แผน (ค่าเริ่มต้น: จอ >= 900px เปิด)
const FOLD = {};
const foldAttr = (k) => `data-keep="${k}" ${(FOLD[k] ?? matchMedia("(min-width: 900px)").matches) ? "open" : ""}`;
document.addEventListener("toggle", (e) => { const k = e.target.dataset?.keep; if (k) FOLD[k] = e.target.open; }, true);
const KIND_IC = (id) => I(isPlace(id) ? "map-pin" : S.plan.custom[id]?.meal ? "soup" : "star");
// ตัวเลือกวิธีเดินทางรายช่วง ("" = ค่าเริ่มต้นของทริป)
const legOpts = (cur) => `<option value="">${LEG_MODE[Planner.modeOf()].name} (ค่าเริ่มต้น)</option>${Object.entries(LEG_MODE).map(([v, m]) => `<option value="${v}" ${cur === v ? "selected" : ""}>${m.name}</option>`).join("")}`;
const STAY_TIPS = "จองล่วงหน้า 3-4 เดือน (ช่วงเทศกาลหิมะ 6 เดือน) • ขับรถ: เลือกที่มีที่จอด ถามค่าจอดและต้องจองไหม • นั่งรถไฟ: เลือกใกล้สถานี เดินลากกระเป๋าบนหิมะลำบาก • เรียวกังออนเซ็นมักรวมอาหารเย็น-เช้า และต้องเช็กอินก่อน ~18:00 • พักฐานเดิม 2 คืนขึ้นไปช่วยให้ไม่ต้องแพ็กกระเป๋าทุกวัน";

// แผนที่เล็กของรูท: เกาะฮอกไกโด (SVG จาก outline) + เมืองที่พักเรียงตามลำดับ ไม่โหลด Leaflet ต่อการ์ด
const MINI = { x0: 139.3, y0: 45.65, k: 72, cos: 0.725 };
const miniXY = (lng, lat) => [((lng - MINI.x0) * MINI.cos * MINI.k).toFixed(1), ((MINI.y0 - lat) * MINI.k).toFixed(1)];
let MINI_LAND = null;
function routeSvg(ids) {
  MINI_LAND ||= HOKKAIDO_OUTLINE.map((r) => "M" + r.filter((_, i) => r.length < 150 || i % 3 === 0).map(([x, y]) => miniXY(x, y).join(" ")).join("L") + "Z").join("");
  const pts = ids.filter((id, i) => id !== ids[i - 1]).map(point).filter((p) => p?.lat);
  const xy = pts.map((p) => miniXY(p.lng, p.lat));
  return `<svg class="tpl-map" viewBox="0 0 ${Math.ceil(9.7 * MINI.cos * MINI.k)} ${Math.ceil(4.35 * MINI.k)}" aria-hidden="true"><path class="land" d="${MINI_LAND}"/>
    <polyline class="rt" points="${xy.map((p) => p.join(",")).join(" ")}"/>${xy.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 0 || i === xy.length - 1 ? 5 : 7}" class="${i === 0 || i === xy.length - 1 ? "air" : ""}"/>`).join("")}</svg>`;
}

const PlanView = {
  M: null, mapEl: null, focus: null,

  // แก้แผน: เก็บประวัติให้ย้อนกลับได้ → บันทึก → วาดใหม่
  mut(fn) { Hist.push(); fn(); save(); App.renderAll(); },

  // ปุ่มย้อนลอย: เฉพาะหน้าที่แก้แผน (แผนรายวัน + ข้อมูลทริป) แสดงตลอดให้รู้ว่ามี กดได้เมื่อมีอะไรให้ย้อน (ประวัติหายเมื่อรีเฟรช)
  undoBtn() { return `<button class="btn undo-fab no-print" data-act="undo" ${Hist.stack.length ? "" : "disabled"} title="ย้อนการแก้แผนครั้งล่าสุด (Ctrl+Z)">${I("undo-2")} ย้อน</button>`; },

  // ================= ข้อมูลทริป / เที่ยวบิน / เลือกรูท =================
  renderSetup() {
    const t = S.trip, N = tripNights(), b = t.buf, of = t.outFlight;
    const fresh = !S.plan; // คนใหม่: เริ่มจากกล่องสั้นๆ เที่ยวบิน/สไตล์พับไว้ (ไม่ต้องมีตั๋วก็วางแผนได้)
    const modeSeg = `<div class="seg" data-seg="mode">${Object.entries(MODE).map(([k, v]) => `<button data-v="${k}" class="${t.mode === k ? "on" : ""}">${I(k === "car" ? "car" : "train-front")} ${v}</button>`).join("")}</div>`;
    // ช่วยเลือกวิธีเดินทาง: แสดงครั้งเดียวต่อหน้า (คนใหม่อยู่ในกล่องเริ่ม ไม่งั้นอยู่ใต้ตัวเลือกการเดินทาง)
    const modeHelp = (isWinter(t.start) || isWinter(t.end) ? `<details class="callout info mode-help"><summary><b>หน้าหนาว ขับรถเองหรือนั่งรถไฟ?</b></summary><ul class="small" style="margin:6px 0 0;padding-left:18px">
        <li><b>ขับรถ</b>: ไปได้ทุกที่ แต่ถนนเป็นน้ำแข็ง มืดตั้งแต่ ~16:00 ช่องเขาบางเส้นปิดทั้งฤดู ต้องมีใบขับขี่สากล (IDP) และขอยาง studless ตอนจองรถ</li>
        <li><b>รถไฟ/บัส</b>: ปลอดภัย พักระหว่างทางได้ แต่รอบน้อย บางที่ไม่มีรถถึง พายุหิมะทำให้รถไฟหยุดได้ เหมาะกับเมืองหลัก (ซัปโปโร โอตารุ อาซาฮิกาวะ ฮาโกดาเตะ)</li>
        <li><b>ไม่เคยขับบนหิมะ</b>: นั่งรถไฟระหว่างเมือง แล้วเช่ารถเฉพาะช่วงชนบท เปลี่ยนรายช่วงได้ในแผนรายวัน • แผนจะเตือนเองถ้าขับตอนมืดหรือข้ามช่องเขาเสี่ยง</li></ul></details>` : "");
    const num = (k, v, min, max, lbl) => `<label class="f">${lbl}<input type="number" min="${min}" max="${max}" data-buf="${k}" value="${v}"></label>`;
    $('[data-sec="setup"]').innerHTML = `
      <div class="sec-head"><h1>ข้อมูลทริปและเที่ยวบิน</h1>
        <p class="lead">กรอกเที่ยวบินแล้วเลือกรูท ระบบจะจัดที่พักและที่เที่ยวรายวัน พร้อมคิดเวลาเผื่อที่สนามบินให้</p></div>
      ${fresh ? `<div class="card start"><h2>เริ่มวางแผนใน 1 นาที</h2>
        <p>ใส่วันเที่ยวและวิธีเดินทาง แล้วเลือกรูทด้านล่าง ระบบจะจัดแผนรายวันพร้อมเวลาขับหน้าหนาวให้ทันที <b>ยังไม่ต้องมีตั๋วเครื่องบิน</b></p>
        <div class="form"><label class="f">วันถึงฮอกไกโด<input type="date" data-k="start" value="${t.start}"></label><label class="f">วันบินกลับ<input type="date" data-k="end" value="${t.end}"></label></div>
        <div style="margin-top:12px">${modeSeg}${modeHelp}</div>
        <p class="mute small" style="margin:10px 0">วันที่ใส่ไว้เป็นตัวอย่าง แก้ได้ • เที่ยวบิน สไตล์ และความสนใจ ปรับทีหลังได้ (ด้านล่าง)</p>
        <button class="btn primary" data-scroll="routes">ดูรูทแนะนำ ↓</button></div>
      <details class="fold-sec"><summary><b>${I("plane")} เที่ยวบิน</b> <span class="mute">กรอกหลังจองตั๋ว ไม่บังคับ</span></summary>` : `<h2 class="step-h"><b>1</b> วันและเที่ยวบิน</h2>`}
      <div class="grid g2">
        <div class="card"><h2>${I("plane")} ขาไป</h2><div class="form">
          <label class="f">ออกจากไทย (ถ้ามี เวลาไทย)<input type="datetime-local" data-of="dep" value="${esc(of.dep)}"></label>
          <label class="f">ลงที่สนามบิน<select data-k="arrive">${airOptions(t.arrive)}</select></label>
          <label class="f">วันที่ลง (เวลาญี่ปุ่น)<input type="date" data-k="start" value="${t.start}"></label>
          <label class="f">เวลาเครื่องลง<input type="time" data-k="arriveTime" value="${t.arriveTime}"></label>
          <label class="f chk"><input type="checkbox" data-k="domIn" ${t.domIn ? "checked" : ""}> เที่ยวบินในประเทศ (ผ่าน ตม. ที่โตเกียว/โอซาก้าแล้ว)</label>
        </div></div>
        <div class="card"><h2>${I("plane")} ขากลับ</h2><div class="form">
          <label class="f">ออกจากสนามบิน<select data-k="depart">${airOptions(t.depart)}</select></label>
          <label class="f">วันที่บินกลับ<input type="date" data-k="end" value="${t.end}"></label>
          <label class="f">เวลาเครื่องออก<input type="time" data-k="departTime" value="${t.departTime}"></label>
          <label class="f chk"><input type="checkbox" data-k="domOut" ${t.domOut ? "checked" : ""}> ขาออกจากฮอกไกโดเป็นเที่ยวบินในประเทศ</label>
        </div></div>
      </div>
      <div class="callout ${N < 1 ? "" : "info"}">${N < 1 ? "วันกลับต้องหลังวันไปอย่างน้อย 1 วัน" : `เที่ยว <b>${N + 1} วัน ${N} คืน</b> (${thDate(t.start)} - ${thDate(t.end)})${Planner.overnight() ? " • บินกลางคืนมาถึงเช้า" : ""} •
        ออกจากสนามบินได้ราว <b>${fmtT(Planner.leaveAirport(t.mode === "transit" ? "transit" : "car"))}</b> • วันกลับต้องถึงสนามบินก่อน <b>${fmtT(Planner.needAirport(t.mode === "transit" ? "transit" : "car"))}</b>`}</div>
      <details class="card"><summary><b>เวลาเผื่อที่สนามบิน + รับ/คืนรถ</b> <span class="mute">(แก้ได้)</span></summary><div class="form" style="margin-top:10px">
        ${num("imm", b.imm, 15, 240, "ตม. + รับกระเป๋า (นาที)")}${num("dom", b.dom, 0, 120, "ลงจากเที่ยวบินในประเทศ (นาที)")}
        ${num("pass", b.pass, 0, 120, "ซื้อพาส/IC/ซิม (นาที)")}
        ${num("before", b.before, 60, 300, "ถึงสนามบินก่อนเครื่องออก ระหว่างประเทศ (นาที)")}${num("beforeDom", b.beforeDom, 30, 180, "…ในประเทศ (นาที)")}
        <label class="f chk"><input type="checkbox" data-k="carPick" ${t.carPick ? "checked" : ""}> รับรถเช่าที่สนามบินทันทีที่ถึง</label>
        ${t.carPick ? num("car", b.car, 0, 180, "…ใช้เวลารับรถ (นาที)") : ""}
        <label class="f chk"><input type="checkbox" data-k="carRet" ${t.carRet ? "checked" : ""}> คืนรถที่สนามบินก่อนบินกลับ</label>
        ${t.carRet ? num("ret", b.ret, 0, 120, "…คืนรถ + เติมน้ำมัน (นาที)") : ""}
        <p class="mute small" style="grid-column:1/-1;margin:0">รับ/คืนรถที่อื่นหรือวันอื่น: เอาติ๊กออก แล้วเพิ่ม <b>จุดของฉัน</b> ชื่อ "รับรถ" / "คืนรถ" ในวันนั้น ปักหมุดสาขา ล็อกเวลา และใส่เวลาที่ใช้เอง • ช่วงก่อนมีรถ เปลี่ยนวิธีเดินทางรายช่วงเป็นรถไฟ/บัสได้ในแผนรายวัน</p>
        <label class="f">วันแรก<select data-k="firstDay"><option value="auto" ${t.firstDay === "auto" ? "selected" : ""}>อัตโนมัติ (บินกลางคืน = เบาๆ)</option><option value="light" ${t.firstDay === "light" ? "selected" : ""}>เบาๆ 1 ที่</option><option value="full" ${t.firstDay === "full" ? "selected" : ""}>เที่ยวเต็มที่</option></select></label>
      </div></details>
      ${fresh ? `</details><details class="fold-sec"><summary><b>${I("settings")} สไตล์และความสนใจ</b> <span class="mute">ไม่บังคับ: กำหนดว่าวันหนึ่งเที่ยวกี่ที่ ขับกี่ชั่วโมง</span></summary>` : `<h2 class="step-h"><b>2</b> สไตล์และการเดินทาง <small class="mute">กำหนดว่าวันหนึ่งเที่ยวกี่ที่ ขับกี่ชั่วโมง</small></h2>`}
      <div class="card">
        ${t.mode === "car" ? `<div class="form"><label class="f">เคยขับบนหิมะไหม<select data-snow>${[["new", "ไม่เคย (เวลาขับ ×1.5)"], ["some", "เคยมาบ้าง (×1.3)"], ["dry", "ถนนส่วนใหญ่แห้ง (×1.1)"]].map(([v, l]) => `<option value="${v}" ${S.set.snow === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>` : ""}
        <div class="row" style="margin-top:14px;align-items:flex-start;gap:12px 24px">
          <div><div class="mute small">สไตล์</div><div class="seg" data-seg="pace">${Object.entries(PACE).map(([k, v]) => `<button data-v="${k}" class="${t.pace === k ? "on" : ""}">${v.name}</button>`).join("")}</div></div>
          <div><div class="mute small">การเดินทาง</div>${modeSeg}<small class="mute">ค่าเริ่มต้นของทุกช่วง เปลี่ยนรายช่วงได้ในแผนรายวัน</small>${fresh ? "" : modeHelp}</div>
        </div>
        <details class="adv" data-keep="interests" ${FOLD.interests ? "open" : ""}><summary>สนใจอะไร <span class="mute">(${t.interests.length} ข้อ) และรายละเอียดแต่ละสไตล์</span></summary>
        <div><div class="mute small">เลือกได้หลายข้อ ระบบจะเลือกที่เที่ยวตามนี้</div>
          <div class="chips">${Object.entries(INTEREST).map(([k, v]) => `<button class="chip ${t.interests.includes(k) ? "on" : ""}" data-int="${k}">${v}</button>`).join("")}</div></div>
        <p class="mute small" style="margin:10px 0 0">ชิล: ขับ ≤2 ชม./วัน ≤3 ที่ จบวัน 18:00 • กลางๆ: ≤3.5 ชม. ≤4 ที่ จบ 19:30 • แน่น: ≤5 ชม. ≤6 ที่ จบ 21:00 • ทับค่าได้ใน ${I("settings")} ตั้งค่า</p></details>
      </div>
      ${fresh ? "</details>" : ""}<h2 class="step-h" id="routes"><b>${fresh ? 2 : 3}</b> เลือกรูท = สร้างแผนรายวัน</h2>
      <details class="card routes-box" ${S.plan ? "" : "open"}><summary>${S.plan ? `<b>รูทตอนนี้: ${esc(TEMPLATES.find((x) => x.id === S.plan.tpl)?.name || "แผนที่จัดเอง")}</b> <span class="mute">กดเพื่อดู/เปลี่ยนรูท (สร้างแผนใหม่)</span>` : "<b>รูทแนะนำ</b> <span class=\"mute\">แผนที่เล็ก = เมืองที่พักและลำดับการเดินทาง</span>"}</summary>
        <p class="mute">รูทคือลำดับเมืองที่จะพักแต่ละคืน เรียงตามความเหมาะกับข้อ 1-2 กดการ์ดแล้วระบบจะจัดที่พักรายคืนและที่เที่ยวรายวันให้ทันที แล้วพาไปหน้าแผนรายวัน${S.plan ? ` <b>มีแผนอยู่แล้ว: กดรูทใหม่ = แผนเดิมถูกแทนที่</b> (ที่พักที่กรอกไว้ยังอยู่ กด ↶ ย้อนได้) ถ้าแค่แก้วันหรือเที่ยวบิน ไม่ต้องกดรูทใหม่` : ""}</p>
        <div class="grid g3">${Planner.rankTemplates().map((r) => this.tplCard(r)).join("")}
          <div class="card tpl blank" data-blank tabindex="0" role="button"><h3>เริ่มแผนเปล่า</h3><p class="small">เลือกเมืองที่พักแต่ละคืนและที่เที่ยวเองทั้งหมด</p></div></div>
      </details>${S.plan ? this.staysHtml() : ""}${this.undoBtn()}`;
    if (S.plan) TripMap.drawBases(makeMap($("#stayMap")));
  },

  tplCard({ tp, score, min, ideal, why }) {
    const route = [tp.in, ...tp.stops.map((s) => s[0]), tp.out].map(short).join(" → ");
    return `<div class="card tpl ${S.plan?.tpl === tp.id ? "on" : ""}" data-tpl="${tp.id}" tabindex="0" role="button">
      <div class="score">${score}%</div><h3 style="padding-right:46px">${esc(tp.name)}</h3>
      ${routeSvg([tp.in, ...tp.stops.map((s) => s[0]), tp.out])}<div class="route">${esc(route)}</div><p class="small" style="margin:6px 0 0">${esc(tp.desc)}</p>
      <div class="row" style="margin-top:6px"><span class="badge b-mute">${min}-${ideal} คืน</span><span class="badge b-mute">ขับ: ${tp.level}</span>
      <span class="badge ${tp.transit === 2 ? "b-good" : tp.transit === 1 ? "b-warn" : "b-bad"}">รถไฟ: ${["ยาก", "พอได้", "สะดวก"][tp.transit]}</span></div>
      ${why.length ? `<div class="why">${why.map(esc).join(" • ")}</div>` : ""}</div>`;
  },

  // ================= แผนรายวัน =================
  render() {
    const sec = $('[data-sec="trip"]');
    if (!S.plan) {
      sec.innerHTML = `<div class="hero"><h1>เริ่มวางแผนเที่ยวฮอกไกโด</h1><p>กรอกวันและเที่ยวบิน เลือกรูท แล้วระบบจะจัดแผนรายวันพร้อมตรวจเวลาให้ ขับรถหรือนั่งรถไฟก็ได้</p>
        <a class="btn primary" href="#setup">เริ่มกรอกข้อมูลทริป →</a></div>`;
      return;
    }
    Planner.syncDays();
    const evals = (this.evals = Planner.evaluateAll());
    const sum = Planner.summary(evals);
    const t = S.trip, N = tripNights();
    const kmT = evals.reduce((a, e) => a + e.km, 0), dT = evals.reduce((a, e) => a + e.driveH, 0);
    const trT = evals.reduce((a, e) => a + e.tl.filter((x) => x.kind === "move" && x.mode === "transit").reduce((s, x) => s + x.h, 0), 0);
    const nPlaces = evals.reduce((a, e) => a + e.stops.length, 0);
    const overall = sum.some((x) => x.lvl === "bad") ? "bad" : sum.some((x) => x.lvl === "warn") ? "warn" : "good";
    const nightsBy = [];
    S.plan.bases.forEach((b) => { const l = nightsBy[nightsBy.length - 1]; if (l && l.b === b) l.n++; else nightsBy.push({ b, n: 1 }); });
    sec.innerHTML = `${Safety.banner()}<div class="split"><div class="split-top">
      <div class="card overview"><div class="row"><h1 style="margin:0">แผนทริป</h1><span class="badge b-${overall}">${LVL_ICON[overall]} ${LVL_TXT[overall]}</span>
        <div class="spacer"></div><div class="row no-print"><a class="btn small" href="#setup">${I("pencil")} ข้อมูลทริป</a>
          <details class="more-menu"><summary class="btn small" aria-label="เมนูเพิ่มเติม">⋯ เพิ่มเติม</summary><div class="menu-pop">
            <button class="btn small" data-act="refillAll" title="ที่ใส่เองและที่ล็อกเวลาไว้จะไม่ถูกลบ">${I("refresh-ccw")} จัดสถานที่ใหม่ทั้งทริป</button>
            <button class="btn small" data-act="print">${I("printer")} พิมพ์ / PDF</button></div></details></div></div>
        <p class="print-only">${thDate(t.start)} - ${thDate(t.end)} • ${MODE[t.mode]} • สไตล์${PACE[t.pace].name} • ลง ${t.arrive} ${t.arriveTime} • ออก ${t.depart} ${t.departTime}</p>
        <div class="summary" style="margin-top:10px">
          <div class="k"><b>${N + 1} วัน ${N} คืน</b><span>${thDate(t.start, false)} - ${thDate(t.end, false)} • ${I("plane")} ${t.arrive} ${t.arriveTime} → ${t.depart} ${t.departTime}</span></div>
          ${dT ? `<div class="k"><b>${fmtH(dT)}</b><span>ขับรวม ${fmtN(kmT)} กม.</span></div>` : ""}
          ${trT ? `<div class="k"><b>${fmtH(trT)}</b><span>นั่งรถไฟ/บัสรวม</span></div>` : ""}
          <div class="k"><b>${nPlaces} ที่</b><span>${nightsBy.map((x) => `${esc(short(x.b))} ${x.n}`).join(" • ")}</span></div>
        </div>
        <details class="gantt-box" ${matchMedia("(min-width: 900px)").matches ? "open" : ""}><summary>${I("clock")} แถบเวลาทั้งทริป <small class="mute">ดูว่าวันไหนแน่น</small></summary>${this.gantt(evals)}</details>
        <ul class="checks">${sum.map((c) => `<li class="${c.lvl}">${esc(c.text)}</li>`).join("")}</ul>
      </div></div>
      <aside class="split-side no-print"><details class="card fold-card" ${foldAttr("map")} id="mapCard"><summary><h2>${I("map")} แผนที่</h2><span class="mute small">กด D1-D8 ดูลำดับรายวัน • จุดสีเทา = กดเพิ่มเข้าแผน</span></summary>
        <div class="map-days"><button data-mapday="all" class="${this.focus === null ? "on" : ""}">ทั้งทริป</button>${evals.map((e) => `<button data-mapday="${e.i}" style="--c:${DAY_COLORS[e.i % DAY_COLORS.length]}" class="${this.focus === e.i ? "on" : ""}">D${e.i + 1}</button>`).join("")}</div>
        <div id="planMapHost"></div>
        <div class="map-legend"><span><span class="pin num" style="--c:#2c6e9b;display:inline-grid;margin:0;width:18px;height:18px;font-size:10px">1</span> ลำดับในวันนั้น</span>
          <span><i style="background:#2c6e9b"></i>ขับรถ</span><span><i style="background:repeating-linear-gradient(90deg,#2c6e9b 0 3px,transparent 3px 8px)"></i>รถไฟ/บัส</span>
          <span>${I("moon")} หลังเช็กอิน</span><span>${I("hotel")} ที่พัก</span></div></details></aside>
      <div class="split-main">${this.wishCard()}
      ${evals.map((e) => this.dayCard(e)).join("")}</div></div>
      ${this.undoBtn()}`;
    this.mountMap(evals);
    // แผนที่ที่สร้างตอนกล่องพับอยู่มีขนาด 0: เปิดแล้วต้องวัดขนาดใหม่
    $("#mapCard").addEventListener("toggle", (e) => { if (e.target.open) setTimeout(() => { this.M.map.invalidateSize(); TripMap.drawPlan(this.M, this.evals, this.focus); }, 0); });
    Weather.fill(sec);
    this.bindDrag(sec);
  },

  // ---- รายการอยากไป: เก็บไว้ก่อน ค่อยลากลงวันหรือให้ระบบจัด ----
  wishCard() {
    const W = S.plan.wish, days = S.plan.days.map((_, k) => `<option value="${k}">วันที่ ${k + 1} (${esc(short(Planner.ends(k).to))})</option>`).join("");
    return `<details class="card no-print wish fold-card" ${foldAttr("wish")}><summary><h2>${I("heart")} อยากไป</h2><span class="mute small">${W.length} ที่ ยังไม่ลงวัน</span></summary>
      ${W.length ? '<button class="btn small primary" data-act="placeWish">จัดลงวันที่เหมาะให้ทั้งหมด</button>' : ""}
      <p class="mute small">ลากลงวัน หรือเลือกวันจากช่องข้างชื่อ • "วันที่เหมาะสุด" = ให้ระบบเลือกวันที่ไปได้ดีที่สุด</p>
      ${W.length ? `<div class="wish-list">${W.map((id) => `<div class="wchip" draggable="true" data-wish="${esc(id)}"><span>${KIND_IC(id)}</span><b class="nm" data-detail="${esc(id)}">${esc(pname(id))}</b>
        <select data-wishday="${esc(id)}" aria-label="ใส่วัน"><option value="">ใส่วัน…</option><option value="auto">วันที่เหมาะสุด</option>${days}</select><button class="x" data-wishrm="${esc(id)}" aria-label="ลบ">✕</button></div>`).join("")}</div>` : ""}
      <button class="btn small" data-wishpick>${I("search")} เพิ่มที่อยากไป</button></details>`;
  },

  // ---- เลือกสถานที่จากฐานข้อมูล: ขึ้นรายการให้เลือกทันที พิมพ์กรองได้ทั้งไทย/อังกฤษ/ญี่ปุ่น ----
  pickPlace(head, recs, skip, onPick, onOther) {
    const row = (p) => `<button class="btn" data-pick="${p.id}">${p.img ? `<img src="${p.img}" alt="" loading="lazy">` : `<span>${I("map-pin")}</span>`}<b>${nameHtml(p)}</b><small>${esc(p.area || "")}${p.stars ? " • " + "★".repeat(p.stars) : ""}</small></button>`;
    const list = (q) => {
      const t = q.trim().toLowerCase();
      const L = t ? PLACES.filter((p) => !skip.has(p.id) && [p.name, p.en, p.ja, p.area].some((n) => n?.toLowerCase().includes(t))).slice(0, 40) : recs;
      return L.length ? L.map(row).join("") : `<p class="mute small">ไม่พบชื่อนี้ ลองพิมพ์ชื่ออื่น หรือเพิ่มเป็นจุดของฉัน</p>`;
    };
    const d = Modal.open(`${head}<input type="search" class="find" id="pkQ" placeholder="พิมพ์ชื่อ ไทย/อังกฤษ/ญี่ปุ่น หรือชื่อเมือง" aria-label="ค้นหาสถานที่">
      <p class="mute small" id="pkH" style="margin:8px 0">แนะนำ (ใกล้เส้นทาง ตรงฤดู ตรงความสนใจ) หรือพิมพ์ค้นด้านบน</p><div class="menu-list pick-list" id="pkL">${list("")}</div>`);
    d.oninput = (ev) => { if (ev.target.id === "pkQ") { $("#pkL").innerHTML = list(ev.target.value); $("#pkH").hidden = !!ev.target.value.trim(); } };
    d.onclick = (ev) => {
      if (ev.target === d || ev.target.closest("[data-close]")) return Modal.close();
      const id = ev.target.closest("[data-pick]")?.dataset.pick;
      if (id) { Modal.close(); onPick(+id); } else onOther?.(ev);
    };
  },
  pickWish() {
    const skip = new Set([...Planner.usedSet(-1), ...S.plan.wish]);
    this.pickPlace(`<h2>${I("heart")} เพิ่มที่อยากไป</h2>`, PLACES.filter((p) => !skip.has(p.id)).sort((a, b) => b.stars - a.stars).slice(0, 30), skip, (id) => this.addTo(id, "wish"));
  },

  // แถบเวลาทั้งทริป 06:00-24:00 ต่อวัน (ยืดถึงตีสองถ้ามีวันที่จบหลังเที่ยงคืน)
  gantt(evals) {
    const x0 = 6, x1 = Math.min(26, Math.max(24, Math.ceil(Math.max(...evals.map((e) => e.end))))), span = x1 - x0, pos = (h) => Math.max(0, Math.min(100, ((h - x0) / span) * 100));
    const seg = (cls, a, h, title) => h > 0.02 ? `<i class="${cls}" style="left:${pos(a)}%;width:${Math.max(0.4, pos(a + h) - pos(a))}%" title="${esc(title)}"></i>` : "";
    return `<div class="gantt-trip" role="img" aria-label="แถบเวลารายวัน">
      <div class="gt-axis"><span></span><div>${[6, 9, 12, 15, 18, 21, 24, ...(x1 > 24 ? [x1] : [])].map((h) => `<b style="left:${pos(h)}%">${h > 24 ? "+" + (h - 24) : h}</b>`).join("")}</div></div>
      ${evals.map((e) => `<div class="gt-row" data-goto="${e.i}" tabindex="0"><span class="gt-lbl ${e.lvl}">D${e.i + 1} <small>${thDate(e.iso, false).replace(/ \d+$/, "")}</small></span>
        <div class="gt-track"><i class="dark" style="left:${pos(e.sun.set)}%;right:0"></i><i class="dark" style="left:0;width:${pos(e.sun.rise)}%"></i>
        ${e.tl.map((x) => x.kind === "move" ? seg(x.mode === "car" && !x.city ? "mv" : "mv tr", x.t, x.h, `${fmtT(x.t)} ${LEG_MODE[x.mode]?.name || ""} ${fmtH(x.h)} → ${short(x.to)}`)
          : x.kind === "visit" ? seg(S.plan.custom[x.id]?.meal ? "ml" : x.night ? "vs nt" : "vs", x.t, x.h, `${fmtT(x.t)} ${pname(x.id)}`)
          : x.kind === "wait" ? seg("wt", x.t, x.h, `${fmtT(x.t)} รอ ${fmtH(x.h)}`) : "").join("")}
        <i class="end" style="left:${pos(e.end)}%" title="จบวัน ${fmtT(e.end)}"></i></div>
        <span class="gt-to">${esc(short(e.to))}</span></div>`).join("")}
      <div class="map-legend"><span><i style="background:var(--ice)"></i>ขับรถ</span><span><i style="background:repeating-linear-gradient(90deg,var(--ice) 0 3px,transparent 3px 6px)"></i>รถไฟ/บัส</span><span><i style="background:var(--good)"></i>เที่ยว</span><span><i style="background:var(--warn)"></i>กิน</span><span><i style="background:var(--fest)"></i>กลางคืน</span><span><i style="background:var(--dark-band)"></i>ฟ้ามืด</span></div></div>`;
  },

  itemRow(e, x, n) {
    const i = e.i, it = x.it, p = point(x.id), last = e.items.filter((y) => !y.night).length;
    const idx = S.plan.days[i].items.indexOf(it);
    const meta = [fmtH(x.h), p.fee, e.mode === "transit" && isPlace(x.id) ? ACCESS_TXT[access(p)] : ""].filter(Boolean).map(esc).join(" • ");
    return `<li class="it" draggable="true" data-i="${i}" data-idx="${idx}"><span class="tm">${fmtT(x.t)}</span><span class="ic">${x.night ? I("moon") : KIND_IC(x.id)}</span>
      <span class="visit ${x.night ? "night" : ""}">${p.img ? `<img class="thumb" src="${p.img}" alt="" loading="lazy" data-lb="${x.id}">` : ""}
        <b class="nm" data-detail="${x.id}">${nameHtml(p)}</b>${p.stars ? ` <span class="stars">${"★".repeat(p.stars)}</span>` : ""}
        ${it.at ? ` <span class="badge b-info">${I("lock")} ${esc(it.at)}</span>` : ""}
        <br><small>${x.onWay ? `กินระหว่างทาง: ${x.onWay === "car" ? "แวะจุดพักรถ/มิจิโนะเอกิ ~30 นาที" : "ซื้อข้าวกล่อง (เอกิเบ็น)/คอนบินีกินบนรถ"}` : meta}</small>${it.note ? `<div class="note">📝 ${esc(it.note)}</div>` : ""}</span>
      <span class="it-tools no-print"><button data-up="${i}:${idx}" ${n === 0 || x.night ? "disabled" : ""} aria-label="เลื่อนขึ้น">${I("arrow-up")}</button><button data-down="${i}:${idx}" ${n >= last - 1 || x.night ? "disabled" : ""} aria-label="เลื่อนลง">${I("arrow-down")}</button>
        <button data-move="${i}:${idx}" aria-label="ย้าย" title="ย้ายวัน / เป็นจุดสำรอง / เก็บไว้ในอยากไป">${I("arrow-left-right")}</button><button data-edit="${i}:${idx}" aria-label="แก้ไข" title="ล็อกเวลา/เวลาที่ใช้/โน้ต/ย้ายวัน">${I("pencil")}</button><button data-rm="${i}:${idx}" aria-label="เอาออก" title="เอาออก">${I("x")}</button></span></li>`;
  },

  // วันที่เปิดค้างไว้ (มีผลเฉพาะจอเล็ก): เริ่มที่วันนี้ระหว่างทริป ไม่งั้นวันแรก
  isOpen(i) {
    if (!this.opened) { const k = daysBetween(S.trip.start, jstNow().iso); this.opened = new Set([k >= 0 && k <= tripNights() ? k : 0]); }
    return this.opened.has(i);
  },
  openDay(i, on = true) {
    this.isOpen(i);
    on ? this.opened.add(i) : this.opened.delete(i);
    const c = $(`#day-${i}`), b = c?.querySelector(".day-tog");
    if (!c) return;
    c.classList.toggle("fold", !on);
    b.setAttribute("aria-expanded", on); b.textContent = on ? "ย่อ" : "ดูทั้งวัน";
  },

  dayCard(e) {
    const N = tripNights(), i = e.i, day = S.plan.days[i];
    const mvIcon = (x) => I(x.city || x.walk ? "footprints" : LEG_MODE[x.mode]?.ic || "car");
    let n = 0;
    const rows = e.tl.map((x) => {
      if (x.kind === "move") {
        const what = x.walk ? `เดิน ≈${fmtH(x.h)} • ${x.km} กม.` : x.taxi ? `แท็กซี่ ≈${fmtH(x.h)} • ${x.km} กม. (≈¥${Math.round(500 + x.km * 400).toLocaleString()})` : x.city ? `เดิน/รถไฟใต้ดิน/แท็กซี่ ≈${fmtH(x.h)} (จอดรถไว้ที่พัก)` : x.mode === "car" ? `ขับ ${fmtH(x.h)} • ${x.km} กม.${x.est ? " (≈)" : ""}` : x.noTransit ? `ไม่มีรถไฟ/บัสตรง ≈${fmtH(x.h)} (แท็กซี่/รถ)` : x.local ? `เดิน/บัส/แท็กซี่ ≈${fmtH(x.h)}` : `รถไฟ/บัส ≈${fmtH(x.h)}${x.by ? " • " + esc(x.by.join(" → ")) : ""}`;
        const k = x.it ? S.plan.days[i].items.indexOf(x.it) : -1, cur = k >= 0 ? x.it.m : x.home ? day.hm : null;
        const lm = LEG_MODE[cur || Planner.modeOf()];
        // แสดงแค่ไอคอน มี select โปร่งใสทับไว้ให้กดเปลี่ยน
        const pick = k >= 0 || x.home ? `<span class="legmode no-print ${cur ? "set" : ""}" title="วิธีเดินทางช่วงนี้: ${esc(lm.name)}${cur ? "" : " (ค่าเริ่มต้น)"}: กดเพื่อเปลี่ยน">${mvIcon(x)}<select ${k >= 0 ? `data-legmode="${i}:${k}"` : `data-hm="${i}"`} aria-label="วิธีเดินทางช่วงนี้">${legOpts(cur)}</select></span>` : "";
        return `<li class="mv"><span class="tm">${fmtT(x.t)}</span><span class="ic">${pick || mvIcon(x)}</span><span class="move">→ ${esc(short(x.to))}: ${what}${x.high ? `<br><span class="risk">${I("triangle-alert")} ${esc(x.risk)}</span>` : ""}</span></li>`;
      }
      if (x.kind === "visit") return this.itemRow(e, x, n++);
      if (x.kind === "wait") return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I("hourglass")}</span><span class="mute">ว่าง ${fmtH(x.h)} ก่อนเวลาที่ล็อก</span></li>`;
      if (x.kind === "hotel") { const h = hotelOf(x.id); return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I("hotel")}</span><span><b>ถึงที่พัก ${esc(h?.name || pname(x.id))}</b>${h?.checkIn ? ` <small>(เช็กอิน ${esc(h.checkIn)})</small>` : ""}</span></li>`; }
      if (x.kind === "airport") return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I("plane")}</span><span><b>ถึงสนามบิน ${esc(pname(x.id))}</b> (เครื่องออก ${S.trip.departTime})</span></li>`;
      return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I(x.ic || "info")}</span><span class="mute">${esc(x.text)}</span></li>`;
    }).join("");
    const pts = [point(e.from), ...e.items.map((it) => point(it.id)).filter((p) => p.lat), point(e.to)];
    const ref = point(e.to);
    const open = this.isOpen(i);
    return `<div class="card day ${e.lvl} ${open ? "" : "fold"}" id="day-${i}">
      <div class="day-head"><h3>วันที่ ${i + 1}</h3><span class="day-meta">${thDate(e.iso)} • ${I("sun")} ${fmtT(e.sun.rise)}-${fmtT(e.sun.set)}</span>
        <span class="wx" data-wx="${ref.lat},${ref.lng},${e.iso}"></span>
        <span class="badge b-${e.lvl}">${LVL_ICON[e.lvl]} ${LVL_TXT[e.lvl]}</span>
        <button class="btn small map-focus no-print" data-mapday="${i}" title="แสดงวันนี้บนแผนที่ด้านขวา">${I("map")} ดูบนแผนที่</button>
        <button class="btn small day-tog no-print" data-tog="${i}" aria-expanded="${open}">${open ? "ย่อ" : "ดูทั้งวัน"}</button></div>
      <div class="day-meta" style="margin-top:2px"><b>${esc(short(e.from))}</b> → <b>${esc(short(e.to))}</b>${e.driveH ? ` • ขับรวม ${fmtH(e.driveH)}` : ""} • จบวัน ~${fmtT(e.end)}${e.leaveBy != null ? ` • <b>ออกจากที่พักไม่เกิน ${fmtT(e.leaveBy)}</b>` : ""}</div>
      <div class="day-body">
        <div><ul class="tl" data-day="${i}">${rows}</ul>${this.maybeBox(i)}</div>
        <div><details class="no-print daymap-box" ${matchMedia("(min-width: 900px) and (max-width: 1199px)").matches ? "open" : ""}><summary>${I("map")} แผนที่วันนี้</summary><div class="daymap" data-daymap="${i}"></div></details>
          <ul class="checks">${e.checks.length ? e.checks.map((c) => `<li class="${c.lvl}">${LVL_ICON[c.lvl] || ""} ${esc(c.text)}</li>`).join("") : `<li class="good">${I("circle-check")} เวลาพอ${e.mode === "car" ? " ไม่ขับตอนมืด" : ""}</li>`}</ul>
          <details class="no-print daynote" ${day.note || day.planB ? "open" : ""}><summary>${I("notebook-pen")} โน้ต / แผนสำรอง</summary>
            <textarea data-dnote="${i}" rows="2" placeholder="โน้ตวันนี้ เช่น เลขจองทัวร์">${esc(day.note || "")}</textarea>
            <textarea data-dplanb="${i}" rows="2" placeholder="แผนสำรองถ้าถนนปิด/พายุหิมะ">${esc(day.planB || "")}</textarea></details>
        </div>
      </div>
      <div class="day-tools no-print">
        <button class="btn small primary" data-addmenu="${i}">+ เพิ่มสถานที่/มื้อ</button>
        <button class="btn small" data-daymenu="${i}" title="ที่พักคืนนี้ เวลาเริ่ม เรียงเส้นทาง Google Maps สลับวัน">⋯ จัดการวัน</button>
      </div></div>`;
  },

  // จุดสำรอง "ถ้ามีเวลา": อยู่ในวันนั้นแต่ไม่นับเวลา กดใส่ในแผนเมื่อว่าง
  maybeBox(i) {
    const items = S.plan.days[i].items, M = items.filter((it) => it.maybe);
    if (!M.length) return "";
    return `<div class="maybe"><b>${I("circle-pause")} ถ้ามีเวลา</b> <small class="mute">ไม่นับในเวลาวันนี้</small><ul>${M.map((it) => { const k = items.indexOf(it);
      return `<li><span>${KIND_IC(it.id)}</span><b class="nm" data-detail="${esc(it.id)}">${esc(pname(it.id))}</b> <small class="mute">${fmtH(Planner.dur(it, point(it.id)))}</small>
        <span class="spacer"></span><button class="btn small no-print" data-maybe="${i}:${k}">ใส่ในแผน</button><button class="btn small no-print" data-move="${i}:${k}" aria-label="ย้าย">${I("arrow-left-right")}</button><button class="btn small no-print" data-rm="${i}:${k}" aria-label="เอาออก">${I("x")}</button></li>`; }).join("")}</ul></div>`;
  },

  // ---- ย้ายจุด: ไปวันอื่น / เป็นจุดสำรอง / เก็บไว้ในอยากไป (ใช้แทนการลากบนมือถือ) ----
  moveItem(i, idx) {
    const it = S.plan.days[i].items[idx];
    Modal.open(`<h2>${I("arrow-left-right")} ย้าย ${nameHtml(point(it.id))}</h2><div class="move-days">
      ${S.plan.days.map((_, k) => `<button class="btn ${k === i ? "primary" : ""}" data-to="${k}" ${k === i && !it.maybe ? "disabled" : ""}>วันที่ ${k + 1}<small>${esc(short(Planner.ends(k).to))}</small></button>`).join("")}</div>
      <div class="row" style="margin-top:12px">${it.maybe ? "" : '<button class="btn" data-to="maybe">' + I("circle-pause") + ' เป็นจุดสำรอง (ถ้ามีเวลา)</button>'}<button class="btn" data-to="wish">${I("heart")} เก็บไว้ในอยากไป</button></div>`);
    $("#modal").onclick = (ev) => {
      if (ev.target === $("#modal") || ev.target.closest("[data-close]")) return Modal.close();
      const to = ev.target.closest("[data-to]")?.dataset.to;
      if (to === undefined) return;
      this.mut(() => {
        const d = S.plan.days[i].items;
        if (to === "wish") Planner.toWish(i, it);
        else if (to === "maybe") Object.assign(it, { maybe: true, u: true });
        else {
          d.splice(d.indexOf(it), 1);
          Object.assign(it, { maybe: undefined, night: undefined, st: undefined, u: true });
          Planner.insertBest(+to, it);
          Planner.resoft(+to);
        }
        Planner.resoft(i);
      });
      Modal.close();
      if (to === "maybe") toast(`ย้ายไปกล่อง "ถ้ามีเวลา" ท้ายรายการวันที่ ${i + 1} แล้ว`);
    };
  },

  mountMap(evals) {
    if (!this.mapEl) { this.mapEl = document.createElement("div"); this.mapEl.id = "map"; }
    $("#planMapHost").appendChild(this.mapEl);
    if (!this.M) this.M = makeMap(this.mapEl);
    this.M.sec = "trip";
    if (this.focus !== null && this.focus >= evals.length) this.focus = null;
    const keep = this.M.drawn && this.M.drawnFocus === this.focus; // วาดซ้ำมุมเดิม = ไม่ซูมกลับ
    this.M.drawn = true; this.M.drawnFocus = this.focus;
    setTimeout(() => TripMap.drawPlan(this.M, evals, this.focus, keep), 30);
    // แผนที่เล็กรายวัน: สร้างเมื่อเลื่อนมาเห็นเท่านั้น
    this.io?.disconnect();
    this.io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return;
      this.io.unobserve(en.target);
      TripMap.drawDay(makeMap(en.target, { small: true }), evals[+en.target.dataset.daymap]);
    }), { rootMargin: "200px" });
    $$("[data-daymap]").forEach((el) => this.io.observe(el));
  },

  // ลากเรียงลำดับในวันเดียวกัน / ข้ามวัน
  bindDrag(sec) {
    let src = null;
    sec.ondragstart = (e) => { const li = e.target.closest?.("li.it, .wchip"); if (!li) return; src = li; li.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; };
    sec.ondragend = () => { src?.classList.remove("dragging"); $$(".drop-before", sec).forEach((x) => x.classList.remove("drop-before")); src = null; };
    sec.ondragover = (e) => { if (!src) return; const li = e.target.closest?.("li.it"), ul = e.target.closest?.("ul.tl"); if (!ul) return; e.preventDefault(); $$(".drop-before", sec).forEach((x) => x.classList.remove("drop-before")); li?.classList.add("drop-before"); };
    sec.ondrop = (e) => {
      if (!src) return;
      const ul = e.target.closest("ul.tl"); if (!ul) return;
      e.preventDefault();
      const li = e.target.closest("li.it");
      const fi = +src.dataset.i, fidx = +src.dataset.idx, ti = +ul.dataset.day, wid = src.dataset.wish;
      this.mut(() => {
        const it = wid != null ? Planner.mkItem(ti, idOf(wid), true) : S.plan.days[fi].items.splice(fidx, 1)[0];
        if (wid != null) S.plan.wish = S.plan.wish.filter((x) => String(x) !== wid);
        const dst = S.plan.days[ti].items;
        let k = li ? dst.indexOf(S.plan.days[+li.dataset.i].items[+li.dataset.idx]) : dst.filter((x) => !x.night).length;
        if (k < 0) k = dst.length;
        if (wid == null && fi !== ti) { delete it.st; it.night = it.night && ti < tripNights() && point(it.id).hub === hubOf(Planner.ends(ti).to); }
        it.u = true;
        dst.splice(k, 0, it);
      });
    };
  },

  // ---- กล่องแก้รายการ: ล็อกเวลา เวลาที่ใช้ หลังเช็กอิน โน้ต ย้ายวัน ----
  editItem(i, idx) {
    const it = S.plan.days[i].items[idx], p = point(it.id), N = tripNights(), cu = S.plan.custom[it.id];
    Modal.open(`<h2>${nameHtml(p)}</h2><div class="form">
      ${cu ? `<label class="f">ชื่อ<input type="text" id="eName" value="${esc(cu.name)}"></label>
      ${LocPick.html("ตำแหน่ง", 'id="eLoc"', cu.lat ? `${cu.lat}, ${cu.lng}` : cu.url || "", point(Planner.ends(i).to))}` : ""}
      <label class="f">วิธีไปที่นี่<select id="eMode">${legOpts(it.m)}</select></label>
      <label class="f">ล็อกเวลาเริ่ม (จองรอบ/จองร้าน) <small>ว่าง = ให้ระบบคำนวณ</small><input type="time" id="eAt" value="${esc(it.at || "")}"></label>
      <label class="f">เวลาที่ใช้ (ชม.) <small>ปกติ ${fmtH(p.hours ?? p.dur ?? 1)}</small><input type="number" step="0.25" min="0.25" max="12" id="eDur" value="${it.dur ?? ""}"></label>
      <label class="f">ย้ายไปวัน<select id="eDay">${S.plan.days.map((_, k) => `<option value="${k}" ${k === i ? "selected" : ""}>วันที่ ${k + 1} (${esc(short(Planner.ends(k).to))})</option>`).join("")}</select></label>
      <label class="f chk"><input type="checkbox" id="eMaybe" ${it.maybe ? "checked" : ""}> ถ้ามีเวลา (จุดสำรอง ไม่นับเวลา)</label>
      ${i < N ? `<label class="f chk"><input type="checkbox" id="eNight" ${it.night ? "checked" : ""}> ไปหลังเช็กอินที่พัก (ตอนค่ำ)</label>` : ""}
    </div><label class="f" style="margin-top:10px">โน้ต<textarea id="eNote" rows="2">${esc(it.note || "")}</textarea></label>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="eSave">บันทึก</button><button class="btn" data-detail="${esc(it.id)}">ดูรายละเอียดสถานที่</button><div class="spacer"></div><button class="btn red" id="eDel">เอาออกจากแผน</button></div>`);
    $("#eSave").onclick = () => {
      const at = $("#eAt").value, dur = $("#eDur").value, to = +$("#eDay").value;
      let ll;
      if (cu) {
        const name = $("#eName").value.trim(), raw = $("#eLoc").value.trim();
        ll = parseLatLng(raw);
        if (!name) return toast("ใส่ชื่อก่อน");
        if (raw && !ll && !/^https?:/.test(raw)) return toast("อ่านพิกัดไม่ได้ หรืออยู่นอกฮอกไกโด ลองกด แตะบนแผนที่");
        if (raw && !ll) { toast("เก็บลิงก์ไว้แล้ว แต่ลิงก์นี้ไม่มีพิกัด จึงไม่คิดเวลาเดินทาง (กด แตะบนแผนที่ เพื่อปักหมุด)"); delete cu.lat; delete cu.lng; }
        delete cu.hub; // ฐานใกล้สุดคิดใหม่จากพิกัดใหม่
        if (!raw) { delete cu.lat; delete cu.lng; }
        Object.assign(cu, { name, url: /^https?:/.test(raw) ? raw : "" }, ll || {});
      }
      this.mut(() => {
        const d = S.plan.days[i].items;
        Object.assign(it, { m: $("#eMode").value || undefined, at: at || undefined, dur: dur ? +dur : undefined, note: $("#eNote").value.trim() || undefined, night: $("#eNight")?.checked || undefined, maybe: $("#eMaybe").checked || undefined, u: true });
        if (to !== i) { d.splice(d.indexOf(it), 1); it.night = undefined; Planner.insertBest(to, it); }
      });
      Modal.close();
    };
    $("#eDel").onclick = () => { this.mut(() => S.plan.days[i].items.splice(S.plan.days[i].items.indexOf(it), 1)); Modal.close(); };
  },

  // ---- เมนู "+ เพิ่ม": สถานที่ในฐานข้อมูล (แนะนำของวันนี้ขึ้นก่อน) + มื้อ/จุดของฉัน ----
  addMenu(i) {
    const hasMeal = S.plan.days[i].items.some((x) => S.plan.custom[x.id]?.meal);
    const skip = Planner.usedSet(-1);
    const recs = Planner.candidates(i, skip).filter((c) => c.s > -50).slice(0, 20).map((c) => c.p);
    this.pickPlace(`<h2>+ เพิ่มในวันที่ ${i + 1}</h2><div class="row" style="margin-bottom:10px">
      <button class="btn small" data-m="meal">${I("soup")} เวลากินข้าว</button><button class="btn small" data-m="custom">${I("star")} จุดของฉัน (ร้าน/ปักหมุดเอง)</button></div>`,
      recs, skip, (id) => this.addTo(id, i), (ev) => {
        const m = ev.target.closest("[data-m]")?.dataset.m;
        if (!m) return;
        Modal.close();
        if (m === "meal") this.addMeal(i, hasMeal);
        else this.addCustom(i);
      });
  },
  // ---- กันเวลากินข้าว: เวลาโดยประมาณ ระบบหาช่องใกล้เวลานั้นให้ (ไม่บังคับรอ) ----
  addMeal(i, hasMeal) {
    Modal.open(`<h2>${I("soup")} เวลากินข้าว วันที่ ${i + 1}</h2><p class="mute small">ระบบจะแทรกช่วงกินข้าว ~45 นาที ใกล้เวลานี้ที่สุดในเส้นทาง ใส่ร้านทีหลังได้ (กด ${I("pencil")} เปลี่ยนชื่อ)</p>
      <div class="form"><label class="f">ประมาณกี่โมง<input type="time" id="mlT" value="${hasMeal ? "18:00" : "12:00"}"></label>
        <label class="f">ชื่อ <small>ไม่ใส่ก็ได้</small><input type="text" id="mlN" placeholder="กินข้าว"></label></div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="mlSave">เพิ่มในวันที่ ${i + 1}</button></div>`);
    $("#mlSave").onclick = () => {
      const t = $("#mlT").value || "12:00";
      this.mut(() => { S.plan.days[i].items = Planner.softPlace(i, S.plan.days[i].items, Planner.newMeal($("#mlN").value.trim() || "กินข้าว", t)); });
      Modal.close();
    };
  },
  // ---- เมนู ⋯ ของวัน: สลับวัน (เช่น พายุเข้า) / จัดวันนี้ใหม่ ----
  dayMenu(i) {
    const N = tripNights(), day = S.plan.days[i], e = this.evals[i];
    const pts = [point(e.from), ...e.items.map((it) => point(it.id)).filter((p) => p.lat), point(e.to)];
    Modal.open(`<h2>วันที่ ${i + 1}</h2>
      <div class="form">
        ${i < N ? `<label class="f">คืนนี้พักเมือง <small>${hotelOf(S.plan.bases[i])?.name ? esc(hotelOf(S.plan.bases[i]).name) : "ใส่โรงแรมจริงในหน้าข้อมูลทริป"}</small><select data-mbase>${hubOptions(S.plan.bases[i])}</select></label>` : ""}
        ${i > 0 ? `<label class="f">เริ่มวัน <small>ว่าง = เวลาปกติ</small><input type="time" data-mstart value="${esc(day.start || "")}"></label>` : ""}</div>
      <div class="row" style="margin-top:12px">
        <button class="btn" data-mopt title="เรียงจุดใหม่ให้ระยะทางสั้นสุด: เริ่มจากที่พักเมื่อคืน ไปจุดที่ใกล้สุดก่อนทีละจุด จุดที่ล็อกเวลาแทรกตามเวลา">${I("arrow-up-down")} เรียงเส้นทางให้สั้นสุด</button>
        <a class="btn" target="_blank" rel="noopener" href="${dirUrl(pts, e.mode)}">${I("navigation")} เปิดเส้นทางใน Google Maps</a></div>
      <h3 style="margin-top:18px">${I("arrow-left-right")} สลับแผนกับวันอื่น</h3><p class="mute small">สลับที่เที่ยว โน้ต และแผนสำรองทั้งวัน ที่พักแต่ละคืนคงเดิม ระบบจะเตือนถ้าไกลจากที่พักเกินไป</p>
      <div class="move-days">${S.plan.days.map((_, k) => k === i ? "" : `<button class="btn" data-swap="${k}">วันที่ ${k + 1}<small>${esc(short(Planner.ends(k).to))}</small></button>`).join("")}</div>
      <h3 style="margin-top:14px">${I("refresh-ccw")} จัดวันนี้ใหม่</h3><p class="mute small">เปลี่ยนจุดที่ระบบเลือกให้ ที่ใส่เองและที่ล็อกเวลาไว้ยังอยู่</p>
      <button class="btn" data-refill>${I("refresh-ccw")} จัดวันนี้ใหม่</button>`);
    $("#modal").onclick = (ev) => {
      if (ev.target === $("#modal") || ev.target.closest("[data-close]")) return Modal.close();
      const sw = ev.target.closest("[data-swap]")?.dataset.swap;
      if (sw !== undefined) { this.mut(() => Planner.swapDays(i, +sw)); Modal.close(); return toast(`สลับวันที่ ${i + 1} กับ ${+sw + 1} แล้ว (กด ↶ ย้อนได้)`); }
      if (ev.target.closest("[data-refill]")) { this.mut(() => Planner.autofillDay(i, Planner.usedSet(i))); Modal.close(); }
      if (ev.target.closest("[data-mopt]")) { this.mut(() => Planner.optimize(i)); Modal.close(); toast("เรียงเส้นทางแล้ว"); }
    };
    $("#modal").onchange = (ev) => {
      const el = ev.target;
      if (el.matches("[data-mbase]")) { this.mut(() => { S.plan.bases[i] = el.value; }); Modal.close(); toast(`คืนที่ ${i + 1} พัก ${short(el.value)} (กด ↶ ย้อนได้)`); }
      else if (el.matches("[data-mstart]")) this.mut(() => { day.start = el.value || undefined; });
    };
  },

  // ---- เพิ่มจุดของฉัน (ร้านที่เพื่อนแนะนำ ปักหมุดเอง) ----
  addCustom(i) {
    Modal.open(`<h2>${I("star")} เพิ่มจุดของฉัน</h2><p class="mute small">บนมือถือ: กด <b>แตะบนแผนที่</b> แล้วจิ้มจุดที่จะไป หรือ <b>ตำแหน่งตอนนี้</b> ถ้ายืนอยู่ตรงนั้น • วางลิงก์ Google Maps ได้ด้วย (ลิงก์แชร์แบบสั้นไม่มีพิกัด ระบบจะเก็บไว้เป็นลิงก์ แต่ไม่คิดเวลาเดินทาง)</p>
      <div class="form"><label class="f">ชื่อ<input type="text" id="cName" placeholder="เช่น ร้านราเมนที่เพื่อนแนะนำ"></label>
        ${LocPick.html("ตำแหน่ง", 'id="cLoc"', "", point(Planner.ends(i).to))}
        <label class="f">เวลาที่ใช้ (ชม.)<input type="number" id="cDur" step="0.25" min="0.25" value="1"></label>
        <label class="f">ล็อกเวลา (ถ้ามี)<input type="time" id="cAt"></label></div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="cSave">เพิ่มในวันที่ ${i + 1}</button></div>`);
    $("#cSave").onclick = () => {
      const name = $("#cName").value.trim(), raw = $("#cLoc").value.trim(), ll = parseLatLng(raw);
      if (!name) return toast("ใส่ชื่อก่อน");
      if (raw && !ll && !/^https?:/.test(raw)) return toast("อ่านพิกัดไม่ได้ หรืออยู่นอกฮอกไกโด ลองกด แตะบนแผนที่");
      if (raw && !ll) toast("เก็บลิงก์ไว้แล้ว แต่ลิงก์นี้ไม่มีพิกัด จึงไม่คิดเวลาเดินทาง");
      const id = "c" + Date.now().toString(36);
      this.mut(() => {
        S.plan.custom[id] = { name, hours: Math.max(0.25, +$("#cDur").value || 1), url: /^https?:/.test(raw) ? raw : "", ...(ll || {}) };
        S.plan.days[i].items.push({ id, u: true, at: $("#cAt").value || undefined });
      });
      Modal.close();
    };
  },

  quickAdd(id) {
    if (!S.plan) return toast("สร้างแผนก่อน");
    let d = -1;
    this.mut(() => { d = Planner.quickAdd(id); });
    if (d >= 0) { toast(`เพิ่ม ${pname(id)} ในวันที่ ${d + 1}`); if (App.cur === "trip") this.openDay(d), $(`#day-${d}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  },
  addTo(id, i) {
    if (i === "auto") return this.quickAdd(id);
    if (i === "wish") {
      if (!S.plan) return toast("สร้างแผนก่อน");
      if (S.plan.days.some((d) => d.items.some((it) => it.id === id))) return toast(`${pname(id)} อยู่ในแผนแล้ว`);
      this.mut(() => { if (!S.plan.wish.includes(id)) S.plan.wish.push(id); });
      return toast(`เก็บ ${pname(id)} ไว้ในรายการอยากไปแล้ว`);
    }
    this.mut(() => S.plan.days[+i].items.push(Planner.mkItem(+i, id, true))); // ต่อท้าย: อยากได้ลำดับสั้นสุดกด เรียงเส้นทาง
    toast(`ใส่ท้ายวันที่ ${+i + 1} แล้ว`);
  },

  // ================= ที่พัก (ส่วนท้ายของหน้าข้อมูลทริป) =================
  staysHtml() {
    const blocks = [];
    S.plan.bases.forEach((b, i) => { const l = blocks[blocks.length - 1]; if (l && l.b === b) l.n.push(i); else blocks.push({ b, n: [i] }); });
    const ids = [...new Set(S.plan.bases)];
    return `<h2 class="step-h" id="stays"><b>4</b> ที่พักที่จองแล้ว <small class="mute">ไม่บังคับ</small></h2><p class="mute small" style="margin:0 0 8px"> ทำหลังจองแล้ว: ไม่กรอก ระบบใช้จุดกลางเมืองเป็นจุดเริ่ม/จบของแต่ละวันแทน • เมืองที่พักแต่ละคืนเลือกในหน้า <a href="#trip">แผนรายวัน</a> (คืนนี้พักเมือง)</p>
        <ul class="small mute" style="margin:0 0 10px;padding-left:18px"><li><b>ชื่อ</b>: แสดงในแผนรายวัน "ถึงที่พัก…"</li><li><b>ตำแหน่ง</b>: ใช้เป็นจุดออกตอนเช้า/กลับตอนเย็นแทนกลางเมือง เวลาเดินทางแม่นขึ้น</li><li><b>เช็กอิน/เช็กเอาท์</b>: เตือนถ้าถึงก่อนเช็กอิน/ออกหลังเช็กเอาท์ และเวลาออกไปเที่ยวหลังเช็กอิน</li></ul>
      <details class="callout info"><summary><b>หลักเลือกที่พักหน้าหนาว</b></summary>${STAY_TIPS}</details>
      <div class="card"><h3 style="margin:0 0 6px">ภาพรวมรูทนี้</h3><div class="map" id="stayMap"></div><p class="map-note">เส้นประ = ลำดับการย้ายที่พัก • ป้าย = เมือง จำนวนคืน และราคาห้องโดยประมาณ</p></div>
      ${ids.map((id) => { const h = hotelOf(id) || {}, nights = blocks.filter((x) => x.b === id).flatMap((x) => x.n), hb = HUB[id]; return `<div class="card stay-card" data-hub="${id}">
        <div class="row"><h2 style="margin:0">${I("hotel")} ${esc(hb.name)}</h2><span class="badge b-info">${nights.length} คืน: ${nights.map((k) => thDate(Planner.dayIso(k), false).replace(/ \d+$/, "")).join(", ")}</span>${h.name ? '<span class="badge b-good">กรอกแล้ว</span>' : '<span class="badge b-warn">ยังไม่ได้กรอก</span>'}</div>
        <div class="form" style="margin-top:10px">
          <label class="f">ชื่อที่พัก<input type="text" data-h="name" value="${esc(h.name || "")}"></label>
          ${LocPick.html("ตำแหน่งที่พัก", 'data-h="loc"', h.loc || "", hb)}
          <label class="f">เช็กอิน<input type="time" data-h="checkIn" value="${esc(h.checkIn || "15:00")}"></label>
          <label class="f">เช็กเอาท์<input type="time" data-h="checkOut" value="${esc(h.checkOut || "10:00")}"></label>
        </div>
        <div class="row" style="margin-top:8px">${h.lat ? `<span class="badge b-good">${I("map-pin")} ใช้พิกัดจริง</span>` : '<span class="mute small">ยังไม่มีพิกัด ใช้จุดกลางเมือง</span>'}          <span class="spacer"></span><span class="mute small">ค้นที่พัก:</span>${BOOKING_SITES.map((b) => `<a class="btn small" target="_blank" rel="noopener" href="${b.url(HUB_EN[id] || hb.name)}">${b.name}</a>`).join("")}</div>
        <details class="hubinfo"><summary>ย่านที่ควรพัก ข้อดี ข้อควรรู้ • ¥${fmtN(hb.price[0])}–${fmtN(hb.price[2])}/ห้อง/คืน (ประมาณ)</summary>
          <dl class="kv"><dt>พักย่านไหน</dt><dd>${esc(hb.stay)}</dd><dt>ข้อดี</dt><dd>${esc(hb.pros)}</dd><dt>ข้อควรรู้</dt><dd>${esc(hb.cons)}</dd><dt>ช่วงพีค</dt><dd>${esc(hb.peak)}</dd></dl></details></div>`; }).join("")}`;
  },

  // ================= event =================
  bind() {
    const trip = $('[data-sec="trip"]'), setup = $('[data-sec="setup"]');
    // ---- ข้อมูลทริป ----
    setup.addEventListener("change", (ev) => {
      const el = ev.target, t = S.trip;
      if (el.dataset.h) return this.setHotel(el);
      this.mut(() => {
        if (el.dataset.k) {
          const k = el.dataset.k;
          t[k] = el.type === "checkbox" ? el.checked : el.type === "number" ? Math.max(+el.min || 0, Math.min(+el.max || 99, +el.value || 0)) : k === "level" ? +el.value : el.value;
          if (k === "start" && t.end <= t.start) t.end = addDays(t.start, Math.max(1, t.nights));
          if (k === "start" || k === "end") Planner.syncDays();
        } else if (el.dataset.of) t.outFlight[el.dataset.of] = el.value;
        else if (el.dataset.buf) t.buf[el.dataset.buf] = Math.max(0, +el.value || 0);
        else if (el.dataset.snow !== undefined) S.set.snow = el.value;
        // ขาไปถึงอีกวัน: เดาวันลงจากเวลาออก (ไทย +2 ชม. + ~7 ชม.บิน) ถ้าวันลงยังไม่ได้แก้
        if (el.dataset.of === "dep" && el.value) { const d = new Date(el.value); d.setHours(d.getHours() + 2 + 7); const iso = isoOf(d); if (iso !== t.start) { const n = tripNights(); t.start = iso; t.end = addDays(iso, Math.max(1, n)); Planner.syncDays(); toast(`ตั้งวันลงเป็น ${thDate(iso)} ตามเวลาออก (ตรวจเวลาเครื่องลงอีกครั้ง)`); } }
      });
    });
    setup.addEventListener("click", (ev) => {
      const el = ev.target.closest("button, [data-tpl], [data-blank]");
      if (!el) return;
      if (el.dataset.act === "undo") return Hist.undo();
      if (el.dataset.scroll) return $("#" + el.dataset.scroll).scrollIntoView({ behavior: "smooth" });
      const t = S.trip;
      if (el.dataset.tpl) {
        if (S.plan && !confirm("สร้างแผนใหม่จากรูทนี้? แผนรายวันเดิมจะถูกแทนที่ (กด ↶ ย้อนได้)")) return;
        this.mut(() => Planner.create(el.dataset.tpl)); location.hash = "#trip";
      } else if (el.dataset.blank !== undefined) {
        if (S.plan && !confirm("เริ่มแผนเปล่า? แผนรายวันเดิมจะถูกแทนที่")) return;
        this.mut(() => { S.plan = { tpl: null, bases: Array(tripNights()).fill(AIR[t.arrive].hub), days: [], hotels: S.plan?.hotels || {}, custom: S.plan?.custom || {}, wish: S.plan?.wish || [] }; Planner.syncDays(); });
        location.hash = "#trip";
      } else if (el.parentElement.dataset.seg) {
        this.mut(() => { t[el.parentElement.dataset.seg] = el.dataset.v; });
      } else if (el.dataset.int) {
        const k = el.dataset.int;
        this.mut(() => { t.interests = t.interests.includes(k) ? t.interests.filter((x) => x !== k) : [...t.interests, k]; });
      }
    });
    setup.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && (ev.target.dataset.tpl || ev.target.dataset.blank !== undefined)) ev.target.click(); });

    // ---- แผนรายวัน ----
    trip.addEventListener("change", (ev) => {
      const el = ev.target, d = el.dataset;
      if (d.base) this.mut(() => { S.plan.bases[+d.base] = el.value; });
      else if (d.wishday && el.value !== "") {
        const id = idOf(d.wishday);
        S.plan.wish = S.plan.wish.filter((x) => x !== id);
        this.addTo(id, el.value === "auto" ? "auto" : +el.value);
      }
      else if (d.dstart) this.mut(() => { S.plan.days[+d.dstart].start = el.value || undefined; });
      else if (d.hm) this.mut(() => { S.plan.days[+d.hm].hm = el.value || undefined; });
      else if (d.legmode) { const [i, k] = d.legmode.split(":").map(Number); this.mut(() => { const it = S.plan.days[i].items[k]; it.m = el.value || undefined; it.u = true; }); }
      else if (d.dnote) { S.plan.days[+d.dnote].note = el.value; save(); }
      else if (d.dplanb) { S.plan.days[+d.dplanb].planB = el.value; save(); }
    });
    trip.addEventListener("click", (ev) => {
      const el = ev.target.closest("button, [data-goto], [data-detail], [data-lb]");
      if (!el) return;
      const d = el.dataset, pair = (s) => s.split(":").map(Number);
      if (d.lb) Lightbox.place(isNaN(d.lb) ? d.lb : +d.lb);
      else if (d.detail) PlacesView.detail(isNaN(d.detail) ? d.detail : +d.detail);
      else if (d.mapday) {
        this.focus = d.mapday === "all" ? null : +d.mapday;
        $$(".map-days [data-mapday]").forEach((b) => b.classList.toggle("on", b.dataset.mapday === d.mapday));
        TripMap.drawPlan(this.M, this.evals, this.focus);
      } else if (d.goto) { this.openDay(+d.goto); $(`#day-${d.goto}`).scrollIntoView({ behavior: "smooth", block: "start" }); }
      else if (d.tog) this.openDay(+d.tog, !this.opened.has(+d.tog));
      else if (d.up || d.down) {
        const [i, idx] = pair(d.up || d.down), items = S.plan.days[i].items;
        const day = items.filter((x) => !x.night && !x.maybe), a = items[idx], b = day[day.indexOf(a) + (d.up ? -1 : 1)];
        if (!b) return;
        this.mut(() => { const ia = items.indexOf(a), ib = items.indexOf(b); [items[ia], items[ib]] = [items[ib], items[ia]]; a.u = true; });
      } else if (d.rm) { const [i, idx] = pair(d.rm); this.mut(() => { S.plan.days[i].items.splice(idx, 1); Planner.resoft(i); }); }
      else if (d.edit) { const [i, idx] = pair(d.edit); this.editItem(i, idx); }
      else if (d.move) { const [i, idx] = pair(d.move); this.moveItem(i, idx); }
      else if (d.maybe) { const [i, idx] = pair(d.maybe); this.mut(() => { const it = S.plan.days[i].items.splice(idx, 1)[0]; delete it.maybe; Planner.insertBest(i, it); Planner.resoft(i); }); }
      else if (d.wishrm) this.mut(() => { S.plan.wish = S.plan.wish.filter((x) => x !== idOf(d.wishrm)); });
      else if (d.act === "placeWish") { let n = 0; this.mut(() => { n = Planner.placeWish(); }); toast(`ลงวันให้แล้ว ${n} ที่`); }
      else if (d.addmenu) this.addMenu(+d.addmenu);
      else if (d.wishpick !== undefined) this.pickWish();
      else if (d.daymenu) this.dayMenu(+d.daymenu);
      else if (d.addcustom) this.addCustom(+d.addcustom);
      else if (d.act === "opt") { this.mut(() => Planner.optimize(+d.i)); toast("เรียงเส้นทางแล้ว"); }
      else if (d.act === "refill") { const i = +d.i; this.mut(() => Planner.autofillDay(i, Planner.usedSet(i))); }
      else if (d.act === "refillAll") { if (!confirm("จัดสถานที่ใหม่ทั้งทริป? จุดที่ระบบเลือกให้จะถูกแทนที่ (ที่ใส่เอง/ล็อกเวลาไว้ยังอยู่ กด ↶ ย้อนได้)")) return; this.mut(() => Planner.autofillAll()); toast("จัดสถานที่ใหม่แล้ว"); }
      else if (d.act === "print") App.print();
      else if (d.act === "undo") Hist.undo();
    });
    trip.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.dataset.goto) ev.target.click(); });
  },

  // ---- ที่พัก (ในหน้าข้อมูลทริป): ชื่อ ตำแหน่ง เช็กอิน/เอาท์ ----
  setHotel(el) {
    const k = el.dataset.h, hub = el.closest("[data-hub]")?.dataset.hub;
    if (!hub) return;
    this.mut(() => {
      const h = (S.plan.hotels[hub] ||= {});
      h[k] = el.value.trim();
      if (k === "loc") { const ll = parseLatLng(h.loc); if (ll) Object.assign(h, ll); else { delete h.lat; delete h.lng; if (h.loc) toast("ลิงก์นี้ไม่มีพิกัด (ลิงก์แชร์แบบสั้น) ใช้ปุ่ม แตะบนแผนที่ แทน"); } }
    });
  },
};
