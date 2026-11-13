// แท็บ "ทริปของฉัน": ภาพรวม + แผนรายวัน, ข้อมูลทริป/เที่ยวบิน, ที่พัก, โหมดวันนี้
const LVL_TXT = { good: "เวลาพอ", warn: "มีข้อควรระวัง", bad: "มีจุดเสี่ยง" };
const TIGHT_TXT = { warn: "ค่อนข้างแน่น", bad: "แน่นเกินไป" }; // ป้ายวัน: ใช้เมื่อข้อเตือนระดับนั้นเป็นเรื่องเวลา
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
// เวลาที่ใช้: กรอก ชม. + นาที เก็บเป็นชั่วโมง • ว่างทั้งคู่ = null (ใช้ค่าปกติ)
const durField = (id, h, def) => {
  const v = h == null || h === "" ? null : Math.round(+h * 60), d = def == null ? null : Math.round(def * 60);
  const box = (k, max, step, val, ph, unit) => `<input type="number" id="${id}${k}" min="0" max="${max}" step="${step}" inputmode="numeric" value="${val ?? ""}" placeholder="${ph ?? ""}" aria-label="${unit}"> ${unit}`;
  return `<span class="dur-in">${box("H", 12, 1, v == null ? null : Math.floor(v / 60), d == null ? null : Math.floor(d / 60), "ชม.")} ${box("M", 55, 5, v == null ? null : v % 60, d == null ? null : d % 60, "นาที")}</span>`;
};
// ว่าง/0 ทั้งคู่ = ใช้ค่าที่ระบบคำนวณ (ช่อง ชม. มักค้าง 0 ตอนลบแค่นาที) • ต่ำสุด 5 นาที
const durVal = (id) => { const v = (+$(`#${id}H`).value || 0) + (+$(`#${id}M`).value || 0) / 60; return v ? Math.max(5 / 60, v) : null; };
const legOpts = (cur, def) => `<option value="">${LEG_MODE[def].name} (ค่าเริ่มต้น)</option>${Object.entries(LEG_MODE).map(([v, m]) => `<option value="${v}" ${cur === v ? "selected" : ""}>${m.name}</option>`).join("")}`;
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

  // ปุ่มย้อน/ทำซ้ำลอยมุมซ้ายล่าง (ฝั่งเวลา ไม่บังปุ่มแก้/ลบของแถว): หน้าที่แก้แผนได้ • ขึ้นเมื่อมีอะไรให้ย้อน/ทำซ้ำ (ประวัติหายเมื่อรีเฟรช)
  undoBtn() {
    const u = Hist.stack.length, r = Hist.fut.length;
    return u || r ? `<div class="undo-fab no-print"><button class="btn" data-hist="undo" ${u ? "" : "disabled"} title="ย้อนการแก้แผน (Ctrl+Z)" aria-label="ย้อนการแก้แผน">${I("undo-2")}</button>${r ? `<button class="btn" data-hist="redo" title="ทำซ้ำ (Ctrl+Y)" aria-label="ทำซ้ำการแก้แผน">${I("redo-2")}</button>` : ""}</div>` : "";
  },

  // ================= ข้อมูลทริป =================
  // ยังไม่มีแผน: เลือกวิธีเริ่ม (ช่วยจัดให้ = รูทแนะนำ / จัดเอง = แผนเปล่า) • มีแผนแล้ว: หน้าแก้ข้อมูลธรรมดา เปลี่ยนรูทพับไว้ล่างสุด
  start: null,
  renderSetup() {
    const t = S.trip, N = tripNights(), b = t.buf, of = t.outFlight, how = S.plan ? null : this.start;
    const modeSeg = `<div class="seg" data-seg="mode">${Object.entries(MODE).map(([k, v]) => `<button data-v="${k}" class="${t.mode === k ? "on" : ""}">${I(k === "car" ? "car" : "train-front")} ${v}</button>`).join("")}</div>`;
    const modeHelp = (isWinter(t.start) || isWinter(t.end) ? `<details class="callout info mode-help"><summary><b>หน้าหนาว ขับรถเองหรือนั่งรถไฟ?</b></summary><ul class="small" style="margin:6px 0 0;padding-left:18px">
        <li><b>ขับรถ</b>: ไปได้ทุกที่ แต่ถนนเป็นน้ำแข็ง มืดตั้งแต่ ~16:00 ช่องเขาบางเส้นปิดทั้งฤดู ต้องมีใบขับขี่สากล (IDP) และขอยาง studless ตอนจองรถ</li>
        <li><b>รถไฟ/บัส</b>: ปลอดภัย พักระหว่างทางได้ แต่รอบน้อย บางที่ไม่มีรถถึง พายุหิมะทำให้รถไฟหยุดได้ เหมาะกับเมืองหลัก (ซัปโปโร โอตารุ อาซาฮิกาวะ ฮาโกดาเตะ)</li>
        <li><b>ไม่เคยขับบนหิมะ</b>: นั่งรถไฟระหว่างเมือง แล้วเช่ารถเฉพาะช่วงชนบท (ตั้งวันรับ-คืนรถด้านล่าง) • แผนจะเตือนเองถ้าขับตอนมืดหรือข้ามช่องเขาเสี่ยง</li></ul></details>` : "");
    const num = (k, v, min, max, lbl) => `<label class="f">${lbl}<input type="number" min="${min}" max="${max}" data-buf="${k}" value="${v}"></label>`;
    const head = (n, txt, sub = "", id = "") => `<h2 class="step-h"${id ? ` id="${id}"` : ""}>${n ? `<b>${n}</b> ` : ""}${txt}${sub ? ` <small class="mute">${sub}</small>` : ""}</h2>`;
    const flights = `<div class="grid g2">
        <div class="card"><h2>${I("plane")} ขาไป</h2><div class="form">
          <label class="f" style="grid-column:1/-1">ลงที่สนามบิน<select data-k="arrive">${airOptions(t.arrive)}</select></label>
          <label class="f">วันที่ลง (เวลาญี่ปุ่น)<input type="date" data-k="start" value="${t.start}"></label>
          <label class="f">เวลาเครื่องลง<input type="time" data-k="arriveTime" value="${t.arriveTime}"></label>
          <label class="f" style="grid-column:1/-1">ออกจากไทย (เวลาไทย)<input type="datetime-local" data-of="dep" value="${esc(of.dep)}"></label>
          <label class="f chk"><input type="checkbox" data-k="domIn" ${t.domIn ? "checked" : ""}> เที่ยวบินในประเทศ (ผ่าน ตม. ที่โตเกียว/โอซาก้าแล้ว)</label>
          ${t.domIn ? num("dom", b.dom, 0, 120, "ลงเครื่องถึงออกอาคาร (นาที)") : num("imm", b.imm, 15, 240, "ตม. + รับกระเป๋า (นาที)")}
          ${Planner.rent()?.pd === 0 ? "" : num("pass", b.pass, 0, 120, "ซื้อตั๋ว/IC/ซิม (นาที)")}
        </div></div>
        <div class="card"><h2>${I("plane")} ขากลับ</h2><div class="form">
          <label class="f" style="grid-column:1/-1">ออกจากสนามบิน<select data-k="depart">${airOptions(t.depart)}</select></label>
          <label class="f">วันที่บินกลับ<input type="date" data-k="end" value="${t.end}"></label>
          <label class="f">เวลาเครื่องออก<input type="time" data-k="departTime" value="${t.departTime}"></label>
          <label class="f chk"><input type="checkbox" data-k="domOut" ${t.domOut ? "checked" : ""}> ขาออกจากฮอกไกโดเป็นเที่ยวบินในประเทศ</label>
          ${t.domOut ? num("beforeDom", b.beforeDom, 30, 180, "ถึงสนามบินก่อนบิน (นาที)") : num("before", b.before, 60, 300, "ถึงสนามบินก่อนบิน (นาที)")}
        </div></div>
      </div>
      <div class="callout ${N < 1 ? "" : "info"}">${N < 1 ? "วันกลับต้องหลังวันไปอย่างน้อย 1 วัน" : `เที่ยว <b>${N + 1} วัน ${N} คืน</b> (${thDate(t.start)} - ${thDate(t.end)})${Planner.overnight() ? " • บินกลางคืนมาถึงเช้า" : ""} •
        ออกจากสนามบินได้ราว <b>${fmtT(Planner.leaveAirport(t.mode === "transit" ? "transit" : "car"))}</b> • วันกลับต้องถึงสนามบินก่อน <b>${fmtT(Planner.needAirport(t.mode === "transit" ? "transit" : "car"))}</b>`}</div>`;
    const dates = `<div class="card"><div class="form"><label class="f">วันถึงฮอกไกโด<input type="date" data-k="start" value="${t.start}"></label><label class="f">วันบินกลับ<input type="date" data-k="end" value="${t.end}"></label></div>
      <p class="mute small" style="margin:8px 0 0">${N >= 1 ? `${N + 1} วัน ${N} คืน • ` : ""}มีตั๋วแล้ว? กรอกเที่ยวบินทีหลังได้ในหน้านี้</p></div>`;
    const transport = `<div class="card"><div class="row" style="gap:6px 14px">${modeSeg}<small class="mute">${t.mode === "car" ? "เช่าทั้งทริปหรือบางช่วงก็ได้: ตั้งวันรับ-คืนรถด้านล่าง วันที่ไม่มีรถใช้รถไฟ/บัสให้เอง" : "รถไฟ/บัสทั้งทริป เปลี่ยนบางช่วงเป็นแท็กซี่/เดินได้ในแผนรายวัน"}</small></div>${modeHelp}
        ${t.mode === "car" ? this.rentHtml() : `<p class="mute small" style="margin:10px 0 0">อยากเช่ารถแค่บางวัน (เช่น ช่วงชนบท): เลือก "เช่ารถ" แล้วตั้งวันรับ-คืนรถ</p>`}</div>`;
    const paceSeg = `<div><div class="seg" data-seg="pace">${Object.entries(PACE).map(([k, v]) => `<button data-v="${k}" class="${t.pace === k ? "on" : ""}">${v.name}</button>`).join("")}</div>
            <small class="mute" style="display:block;margin-top:4px">ขับไม่เกิน ${fmtH(pace().maxDrive)}/วัน · ${pace().maxStops} ที่ · จบวัน ${fmtT(pace().end)}</small></div>`;
    const style = `<div class="card"><div class="row" style="align-items:flex-end;gap:12px 24px"><div><div class="mute small">สไตล์</div>${paceSeg}</div>${this.firstDayHtml()}</div>
        <div style="margin-top:14px">${this.interestsHtml()}</div></div>`;
    const back = `<button class="btn small ghost" data-start="">← เปลี่ยนวิธีเริ่ม</button>`;
    let body;
    if (S.plan) body = `${head(0, `${I("plane")} เที่ยวบิน`)}${flights}
      ${head(0, `${I("car")} การเดินทาง`)}${transport}
      ${head(0, `${I("hotel")} ที่พัก`, "", "stays")}${this.staysHtml()}
      ${head(0, `${I("sliders-horizontal")} ความแน่นต่อวัน`, "ใช้ตรวจว่าวันไหนแน่นเกิน มีผลกับคำเตือนในแผนทันที")}<div class="card">${paceSeg}</div>
      ${this.routesHtml()}`;
    else if (how === "auto") body = `${back}
      ${head(1, "วันเที่ยว")}${dates}
      ${head(2, "การเดินทาง")}${transport}
      ${head(3, "สไตล์และความสนใจ", "ใช้เรียงรูทและเลือกที่เที่ยวให้")}${style}
      ${head(4, "เลือกรูท", "กดการ์ดแล้วระบบจัดเมืองที่พักและที่เที่ยวรายวันให้ทันที", "routes")}
      <div class="grid g3">${t.stays?.length ? this.fromStaysCard() : ""}${Planner.rankTemplates().map((r) => this.tplCard(r)).join("")}</div>`;
    else if (how === "manual") body = `${back}
      ${head(1, "วันและเที่ยวบิน", "ยังไม่มีตั๋ว: ใส่แค่วันที่ลงและวันบินกลับ")}${flights}
      ${head(2, "การเดินทาง")}${transport}
      ${head(3, "ที่พักที่จองแล้ว", "ไม่บังคับ: ยังไม่จองก็เลือกเมืองที่พักรายคืนในแผนรายวันได้", "stays")}${this.staysHtml()}
      <div class="row" style="margin-top:8px"><button class="btn primary" data-blank>สร้างแผนเปล่า →</button>
        ${t.stays?.length ? `<button class="btn" data-fromstays>สร้างแผนและเติมที่เที่ยวตามที่พักให้</button>` : ""}</div>`;
    else body = `<div class="grid g2 start-pick">
        <div class="card tpl" data-start="auto" tabindex="0" role="button"><h3>${I("route")} ช่วยจัดให้</h3><p>บอกวันเที่ยว วิธีเดินทาง สไตล์ และสิ่งที่สนใจ แล้วเลือกรูทแนะนำ ระบบจัดเมืองที่พักและที่เที่ยวรายวันให้ แก้ต่อได้ทุกจุด</p><span class="btn primary small">เริ่มแบบนี้ →</span></div>
        <div class="card tpl" data-start="manual" tabindex="0" role="button"><h3>${I("pencil")} จัดเองตั้งแต่ต้น</h3><p>มีที่พัก/แผนในใจอยู่แล้ว: กรอกวันและที่พักที่จอง แล้วได้แผนเปล่า เลือกที่เที่ยวเองทีละวัน (ให้ระบบช่วยเติมบางวันได้)</p><span class="btn small">เริ่มแบบนี้ →</span></div></div>
      <p class="mute small">เริ่มแบบไหนก็ได้แผนรายวันแบบเดียวกัน ตรวจเวลาและเตือนความเสี่ยงเหมือนกัน</p>`;
    $('[data-sec="setup"]').innerHTML = `<div class="sec-head"><h1>ข้อมูลทริป</h1>
        <p class="lead">${S.plan ? "แก้เที่ยวบิน การเดินทาง ที่พัก และสไตล์ แผนรายวันคำนวณใหม่ทันที" : "เริ่มวางแผนเที่ยวฮอกไกโด ยังไม่ต้องมีตั๋วเครื่องบิน"}</p></div>${body}${this.undoBtn()}`;
  },

  fromStaysCard() { return `<div class="card tpl blank" data-fromstays tabindex="0" role="button"><h3>${I("hotel")} จัดแผนจากที่พักที่จองไว้</h3><p class="small">ใช้เมืองตามที่พัก ${S.trip.stays.length} ที่ แล้วเลือกที่เที่ยวรายวันให้</p></div>`; },

  firstDayHtml() { const t = S.trip; return `<label class="f">วันแรก<select data-k="firstDay"><option value="auto" ${t.firstDay === "auto" ? "selected" : ""}>อัตโนมัติ (บินกลางคืน = เบาๆ)</option><option value="light" ${t.firstDay === "light" ? "selected" : ""}>เบาๆ 1 ที่</option><option value="full" ${t.firstDay === "full" ? "selected" : ""}>เที่ยวเต็มที่</option></select></label>`; },
  interestsHtml() { const t = S.trip; return `<div class="mute small">สนใจอะไร (เลือกได้หลายข้อ)</div>
      <div class="chips">${Object.entries(INTEREST).map(([k, v]) => `<button class="chip ${t.interests.includes(k) ? "on" : ""}" data-int="${k}">${v}</button>`).join("")}</div>`; },

  // มีแผนแล้ว: ให้ระบบจัดใหม่ (ความสนใจ/วันแรกใช้ตรงนี้เท่านั้น) • เปลี่ยนรูท = แทนที่แผนเดิม ใช้ไม่บ่อย พับไว้
  routesHtml() {
    return `<details class="card routes-box" data-keep="reroute" ${FOLD.reroute ? "open" : ""} style="margin-top:18px"><summary><b>${I("refresh-ccw")} ให้ระบบจัดใหม่ / เปลี่ยนรูท</b> <span class="mute">รูทตอนนี้: ${esc(TEMPLATES.find((x) => x.id === S.plan.tpl)?.name || "แผนที่จัดเอง")}</span></summary>
        <p class="mute small" style="margin-top:10px">ความสนใจและวันแรกใช้ตอนระบบเลือกที่เที่ยวให้เท่านั้น แก้แล้วแผนเดิมไม่เปลี่ยน จนกว่าจะกดจัดใหม่ (หรือ "จัดวันนี้ใหม่" ทีละวันในแผนรายวัน)</p>
        ${this.interestsHtml()}<div class="row" style="margin-top:10px;align-items:flex-end;gap:10px 16px">${this.firstDayHtml()}
          <button class="btn" data-act="refillAll" title="ที่ใส่เองและที่ล็อกเวลาไว้จะไม่ถูกลบ">${I("refresh-ccw")} จัดที่เที่ยวใหม่ทั้งทริป (รูทเดิม)</button></div>
        <h3 style="margin-top:18px">เปลี่ยนรูท</h3>
        <p class="mute"><b>กดการ์ด = แผนรายวันเดิมถูกแทนที่</b> (ที่พักที่กรอกไว้ยังอยู่ คืนที่จองแล้วใช้เมืองตามที่พัก กด ↶ ย้อนได้) ถ้าแค่แก้วันหรือเที่ยวบิน ไม่ต้องกดอะไรที่นี่</p>
        <div class="grid g3">${S.trip.stays?.length ? this.fromStaysCard() : ""}${Planner.rankTemplates().map((r) => this.tplCard(r)).join("")}
          <div class="card tpl blank" data-blank tabindex="0" role="button"><h3>เริ่มแผนเปล่า</h3><p class="small">เลือกเมืองที่พักแต่ละคืนและที่เที่ยวเองทั้งหมด</p></div></div>
      </details>`;
  },

  // รถเช่า: วัน/เวลา/สาขาที่รับ-คืน (ไม่ปักหมุด = สนามบิน)
  rentHtml() {
    const t = S.trip, N = tripNights(), R = Planner.rent(), b = t.buf;
    const dayOpts = (v, min) => Array.from({ length: N + 1 }, (_, i) => i < min ? "" : `<option value="${i}" ${v === i ? "selected" : ""}>วันที่ ${i + 1} · ${thDate(Planner.dayIso(i), false).replace(/ \d+$/, "")}</option>`).join("");
    const side = (k, x, d, air, airNow, min) => `<div class="rent-side" data-rentk="${k}"><h4>${k === "p" ? "รับรถ" : "คืนรถ"}</h4><div class="form ed-form">
        <label class="f">วัน<select data-rent="day">${dayOpts(d, min)}</select></label>
        ${airNow ? `<div class="f"><span>${k === "p" ? "เวลารับ" : "เวลาคืน"}</span><div class="ro">${k === "p" ? "ทันทีที่เครื่องลง" : "ก่อนเช็กอินเที่ยวบิน"}</div></div>` : `<label class="f">${k === "p" ? "เวลานัดรับ" : "ต้องคืนก่อน"}<input type="time" data-rent="time" value="${esc(x.time || "")}"></label>`}
        ${num(k === "p" ? "car" : "ret", k === "p" ? b.car : b.ret, 0, 180, k === "p" ? "ใช้เวลารับรถ (นาที)" : "คืนรถ + เติมน้ำมัน (นาที)")}
        <div class="full">${LocPick.html("สาขา", 'data-rent="loc"', x.loc || "", air)}</div>
        <small class="hint full">${x.lat ? `${I("map-pin")} ใช้สาขาที่ปักหมุด` : `ไม่ปักหมุด = ${esc(names(air)[0])}`}</small>
      </div></div>`;
    const num = (k, v, min, max, lbl) => `<label class="f">${lbl}<input type="number" min="${min}" max="${max}" data-buf="${k}" value="${v}"></label>`;
    return `<div class="rent-box"><h3>${I("car")} ช่วงที่เช่ารถ <small class="mute">${R.pd === 0 && R.rd === N ? "ทั้งทริป" : `วันที่ ${R.pd + 1}-${R.rd + 1} · วันอื่นใช้รถไฟ/บัส`}</small></h3>
      <p class="mute small" style="margin:0 0 10px">รับ-คืนที่สาขาหรือวันอื่น ระบบใส่ "รับรถ/คืนรถ" ในแผนรายวันให้ ก่อนรับและหลังคืนรถใช้รถไฟ/บัส • ช่วงที่มีรถ เปลี่ยนบางช่วงเป็นรถไฟได้ในแผนรายวัน</p>
      <div class="rent-grid">${side("p", R.p, R.pd, AIR[t.arrive], R.pAir, 0)}${side("r", R.r, R.rd, AIR[t.depart], R.rAir, R.pd)}</div>
      <div class="form ed-form" style="margin-top:12px"><label class="f">เคยขับบนหิมะไหม<select data-snow>${[["new", "ไม่เคย (เวลาขับ ×1.5)"], ["some", "เคยมาบ้าง (×1.3)"], ["dry", "ถนนส่วนใหญ่แห้ง (×1.1)"]].map(([v, l]) => `<option value="${v}" ${S.set.snow === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div></div>`;
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
      sec.innerHTML = `<div class="hero"><h1>เริ่มวางแผนเที่ยวฮอกไกโด</h1><p>ให้ระบบช่วยจัดจากรูทแนะนำ หรือจัดเองตั้งแต่ต้น แผนรายวันตรวจเวลาให้ทั้งสองแบบ ขับรถหรือนั่งรถไฟก็ได้</p>
        <a class="btn primary" href="#setup">เริ่มวางแผน →</a></div>`;
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
            <button class="btn small" data-act="share">${I("link")} ส่งแผนให้เพื่อน (ลิงก์)</button>
            <button class="btn small" data-act="print">${I("printer")} พิมพ์ / PDF</button></div></details></div></div>
        <p class="print-only">${thDate(t.start)} - ${thDate(t.end)} • ${Planner.modeLabel()} • สไตล์${PACE[t.pace].name} • ลง ${t.arrive} ${t.arriveTime} • ออก ${t.depart} ${t.departTime}</p>
        <div class="summary" style="margin-top:10px">
          <div class="k"><b>${N + 1} วัน ${N} คืน</b><span>${thDate(t.start, false)} - ${thDate(t.end, false)} • ${I("plane")} ${t.arrive} ${t.arriveTime} → ${t.depart} ${t.departTime}</span></div>
          ${dT ? `<div class="k"><b>${fmtH(dT)}</b><span>ขับรวม ${fmtN(kmT)} กม.</span></div>` : ""}
          ${trT ? `<div class="k"><b>${fmtH(trT)}</b><span>นั่งรถไฟ/บัสรวม</span></div>` : ""}
          <div class="k"><b>${nPlaces} ที่</b><span>${nightsBy.map((x) => `${esc(short(x.b))} ${x.n}`).join(" • ")}</span></div>
        </div>
        <details class="gantt-box" ${matchMedia("(min-width: 900px)").matches ? "open" : ""}><summary>${I("clock")} แถบเวลาทั้งทริป <small class="mute">ดูว่าวันไหนแน่น</small></summary>${this.gantt(evals)}</details>
        <ul class="checks">${sum.map((c) => `<li class="${c.lvl}">${esc(c.text)}</li>`).join("")}</ul>
      </div></div>
      <aside class="split-side no-print"><details class="card fold-card" ${foldAttr("map")} id="mapCard"><summary><h2>${I("map")} แผนที่</h2></summary>
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
    RoadTime.flush(() => App.renderAll());
    // มือถือ: ท่าปัด/กดค้างมองไม่เห็น บอกครั้งเดียว
    if (COARSE && $(".tl li.it", sec)) try {
      if (!localStorage.getItem("hk-swipe-hint")) { localStorage.setItem("hk-swipe-hint", "1"); setTimeout(() => toast("ปัดแถวไปทางซ้าย = แก้ไข/เอาออก • กดค้างแล้วลาก = เรียงลำดับ"), 600); }
    } catch { /* เก็บไม่ได้ก็ไม่ต้องบอก */ }
  },

  // ---- รายการอยากไป: เก็บไว้ก่อน ค่อยลากลงวันหรือให้ระบบจัด ----
  wishCard() {
    const W = S.plan.wish, days = S.plan.days.map((_, k) => `<option value="${k}">วันที่ ${k + 1} (${esc(short(Planner.ends(k).to))})</option>`).join("");
    return `<details class="card no-print wish fold-card" ${foldAttr("wish")}><summary><h2>${I("heart")} อยากไป</h2><span class="mute small">${W.length} ที่ ยังไม่ลงวัน</span></summary>
      ${W.length ? '<button class="btn small primary" data-act="placeWish">จัดลงวันที่เหมาะให้ทั้งหมด</button>' : ""}
      <p class="mute small">ลากลงวัน หรือเลือกวันจากช่องข้างชื่อ</p>
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

  itemRow(e, x) {
    const i = e.i, it = x.it, p = point(x.id);
    const idx = S.plan.days[i].items.indexOf(it);
    const cu = S.plan.custom[x.id], meta = esc(fmtH(x.h)) + (cu && !cu.meal && !p.lat ? " · ยังไม่ปักหมุด ไม่ได้คิดเวลาเดินทาง" : ""); // ดาว ค่าเข้า อยู่ในหน้ารายละเอียด (แตะแถว)
    const nm = esc(pname(x.id)), open = p.stars ? `data-detail="${esc(x.id)}"` : `data-edit="${i}:${idx}"`;
    // แตะแถว = รายละเอียดสถานที่ (มื้อ/จุดของฉัน = กล่องแก้ไข) • ✏️ แก้ไข • ✕ เอาออก • ลากแถวเรียงลำดับ (มือถือ: ปัดซ้ายโชว์ปุ่ม กดค้างแล้วลาก)
    return `<li class="it" ${COARSE ? "" : 'draggable="true"'} data-i="${i}" data-idx="${idx}"><span class="tm">${fmtT(x.t)}</span><span class="ic">${x.night ? I("moon") : KIND_IC(x.id)}</span>
      <span class="visit" ${open} data-row="${i}:${idx}" role="button" tabindex="0" title="${p.stars ? "ดูรายละเอียด" : "แก้ไข"} (Alt+↑/↓ = เลื่อนลำดับ)">
        <b class="nm">${nm}</b>${it.at ? ` <span class="badge b-info">${I("lock")} ${esc(it.at)}</span>` : ""}
        <small>${x.onWay ? `กินระหว่างทาง: ${x.onWay === "car" ? "แวะจุดพักรถ/มิจิโนะเอกิ ~30 นาที" : "ซื้อข้าวกล่อง (เอกิเบ็น)/คอนบินีกินบนรถ"}` : meta}</small>${it.note ? `<div class="note">📝 ${esc(it.note)}</div>` : ""}</span>
      <span class="it-tools no-print"><button class="ied" data-edit="${i}:${idx}" aria-label="แก้ไข ${nm}" title="แก้ไข: ย้ายวัน ล็อกเวลา โน้ต">${I("pencil")}</button><button class="irm" data-rm="${i}:${idx}" aria-label="เอาออก ${nm}" title="เอาออก">${I("x")}</button></span></li>`;
  },

  // วันที่เปิดค้างไว้ (มีผลเฉพาะจอเล็ก): เริ่มที่วันนี้ระหว่างทริป ไม่งั้นวันแรก
  isOpen(i) {
    if (!this.opened) { const k = daysBetween(S.trip.start, jstNow().iso); this.opened = new Set([k >= 0 && k <= tripNights() ? k : 0]); }
    return this.opened.has(i);
  },
  openDay(i, on = true) {
    this.isOpen(i);
    on ? this.opened.add(i) : this.opened.delete(i);
    const c = $(`#day-${i}`);
    if (!c) return;
    c.classList.toggle("fold", !on);
    c.querySelector(".day-head").setAttribute("aria-expanded", on);
  },

  dayCard(e) {
    const N = tripNights(), i = e.i, day = S.plan.days[i];
    const mvIcon = (x) => I(x.city || x.walk ? "footprints" : LEG_MODE[x.mode]?.ic || "car");
    const rows = e.tl.map((x, k0) => {
      if (x.kind === "move") {
        if (x.est) RoadTime.ask(point(x.from), point(x.to)); // เส้นตรง × 1.3: ขอเวลาถนนจริงมาแทน
        // ค่าแท็กซี่ฮอกไกโด: เริ่ม ~¥600-700 แล้ว ~¥300-400/กม. (ยังไม่รวมรอ/ติดหิมะ) ปัดหลักร้อย
        const fare = (b, k) => (Math.round((b + x.km * k) / 100) * 100).toLocaleString();
        const what = x.walk ? `เดิน ${fmtH(x.h)} · ${x.km} กม.` : x.taxi ? `แท็กซี่ ${fmtH(x.h)} · ${x.km} กม. · ≈¥${fare(600, 300)}-${fare(700, 400)}` : x.city ? `เดิน/รถไฟใต้ดิน/แท็กซี่ ${fmtH(x.h)} (จอดรถไว้ที่พัก)` : x.mode === "car" ? `ขับ ${fmtH(x.h)} · ${x.km} กม.${x.est ? " (≈)" : ""}` : x.noTransit ? `ไม่มีรถไฟ/บัสตรง ${fmtH(x.h)} (แท็กซี่/รถ)` : x.local ? `รถไฟ/บัสในเมือง ${fmtH(x.h)} (≈)` : `รถไฟ/บัส ${fmtH(x.h)}${x.by ? " · " + esc(x.by.join(" → ")) : ""}`;
        const rk = x.it?.rent, k = x.it && !rk ? S.plan.days[i].items.indexOf(x.it) : -1, cur = rk ? day[`r${rk}m`] : k >= 0 ? x.it.m : x.home === "back" ? day.bm : x.home ? day.hm : null;
        const lm = LEG_MODE[cur || x.mode];
        // แสดงแค่ไอคอน มี select โปร่งใสทับไว้ให้กดเปลี่ยน
        const pick = k >= 0 || x.home || rk ? `<span class="legmode no-print ${cur ? "set" : ""}" title="วิธีเดินทางช่วงนี้: ${esc(lm.name)}${cur ? "" : " (ค่าเริ่มต้น)"}: กดเพื่อเปลี่ยน">${mvIcon(x)}<select ${rk ? `data-rentm="${i}:${rk}"` : k >= 0 ? `data-legmode="${i}:${k}"` : x.home === "back" ? `data-bm="${i}"` : `data-hm="${i}"`} aria-label="วิธีเดินทางช่วงนี้ ไป ${esc(short(x.to))}">${legOpts(cur, !cur ? x.mode : rk ? (rk === "p" ? "transit" : "car") : Planner.modeOf(i))}</select></span>` : "";
        // ปลายทางคือแถวถัดไปอยู่แล้ว: แถวเดินทางเหลือแค่วิธีไปและเวลา
        return `<li class="mv"><span class="tm"></span><span class="ic">${pick || mvIcon(x)}</span><span class="move">${x.fixed ? what.replace(" (≈)", "") + " (กำหนดเอง)" : what}${x.high ? `<br><span class="risk">${I("triangle-alert")} ${esc(x.risk)}</span>` : ""}</span></li>`;
      }
      if (x.kind === "visit" && x.it.rent) {
        // คืนรถ: ผู้ใช้เลือกเองว่าไปคืนหลังที่ไหน (ระบบไม่ย้ายให้ ไม่ทันเวลา = เตือน)
        const dI = day.items.filter((it) => point(it.id) && !it.maybe && !(it.night && i < N)), rr = Math.min(day.rr ?? dI.length, dI.length);
        const pickR = x.it.rent === "r" && dI.length ? `<label class="rr-pick no-print">ไปคืนหลัง <select data-rr="${i}" aria-label="ไปคืนรถหลังที่ไหน">${["ออกจากที่พัก", ...dI.map((it) => pname(it.id))].map((n, k) => `<option value="${k}" ${k === rr ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>` : "";
        return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I("car")}</span><span class="row-b"><b>${esc(pname(x.id))}</b><small>${fmtH(x.h)}${x.it.at ? ` · นัด ${esc(x.it.at)}` : ""} · แก้ใน <a href="#setup">ข้อมูลทริป</a></small>${pickR}</span></li>`;
      }
      if (x.kind === "visit") return this.itemRow(e, x);
      if (x.kind === "wait") { // รอที่จุดก่อนหน้าแล้วค่อยออก
        const home = x.at && (x.at === e.to || x.at === e.from) && !AIR[x.at];
        const head = home ? `ว่างที่ที่พัก ${fmtH(x.h)}` : x.at && !AIR[x.at] ? `อยู่ต่อได้อีก ${fmtH(x.h)}` : `ว่าง ${fmtH(x.h)}`;
        const sub = x.at ? [x.why, `ออก${home ? "จากที่พัก" : ""} ${fmtT(x.t + x.h)}`].filter(Boolean).join(" · ") : "ก่อนเวลาที่ล็อก";
        return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I("hourglass")}</span><span class="row-b"><b>${head}</b><small>${esc(sub)}</small></span></li>`;
      }
      if (x.kind === "checkout") return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I("hotel")}</span><span class="row-b"><b>เช็กเอาท์ ${esc(stayOf(x.id)?.name || short(pname(x.id)))}</b><small>${x.go > parseT(x.co) + 0.1 ? `ฝากกระเป๋า/ใส่รถ ออกเดินทาง ${fmtT(x.go)}` : `เช็กเอาท์ภายใน ${esc(x.co)}`}</small></span></li>`;
      if (x.kind === "back") return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I("hotel")}</span><span class="row-b"><b>กลับถึงที่พัก ${esc(stayOf(x.id)?.name || short(pname(x.id)))}</b></span></li>`;
      if (x.kind === "hotel") {
        // เวลาเช็กอินแสดงเฉพาะวันที่ย้ายเข้า (พักต่อจากเมื่อคืน = กลับที่พัก) • ว่าง = 15:00 ตามค่าที่ช่องกรอกแสดง
        const fresh = e.from !== x.id, out = e.tl.slice(0, k0).some((y) => y.kind === "visit"), // ยังไม่ได้ออกไปไหน = อยู่ที่พัก ไม่ใช่กลับ
          h = stayOf(x.id), ci = fresh && h && (h.checkIn || "15:00"), nx = e.tl[k0 + 1], rest = nx?.kind === "info" && nx.ic === "hotel" ? nx.text.split(" • ")[0] : "";
        return `<li class="stay"><span class="tm">${fmtT(x.t)}</span><span class="ic">${I("hotel")}</span><span class="row-b"><b>${fresh ? "ถึงที่พัก" : out ? "กลับที่พัก" : "อยู่ที่พัก"} ${esc(h?.name || pname(x.id))}</b>${ci || rest ? `<small>${[ci ? `เช็กอิน ${esc(ci)}` : "", esc(ci ? rest.replace(/^เช็กอิน /, "") : rest)].filter(Boolean).join(" · ")}</small>` : ""}</span></li>`;
      }
      if (x.kind === "info" && x.ic === "hotel" && e.tl[k0 - 1]?.kind === "hotel") return ""; // รวมไว้ในแถวที่พักแล้ว
      if (x.kind === "airport") return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I("plane")}</span><span class="row-b"><b>ถึงสนามบิน ${esc(pname(x.id))}</b><small>เครื่องออก ${S.trip.departTime}</small></span></li>`;
      // ข้อความแจ้ง: ท่อนแรกเป็นหัวข้อ ที่เหลือเป็นรายละเอียด
      const [h0, ...more] = String(x.text).split(" • ");
      return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I(x.ic || "info")}</span><span class="row-b"><b>${esc(h0)}</b>${more.length ? `<small>${esc(more.join(" · "))}</small>` : ""}</span></li>`;
    }).join("");
    const ref = point(e.to);
    const open = this.isOpen(i);
    // คำเตือน: แสดงข้อหนักสุดบรรทัดเดียว แตะเพื่อดูทั้งหมด
    const RANK = { bad: 0, warn: 1, fest: 2, info: 3, good: 4 };
    const ck = [...e.checks].sort((a, b) => (RANK[a.lvl] ?? 5) - (RANK[b.lvl] ?? 5));
    const ckLi = (c) => `<li class="${c.lvl}">${LVL_ICON[c.lvl] || ""} ${esc(c.text)}</li>`;
    const checks = ck.length === 1 ? `<ul class="checks">${ckLi(ck[0])}</ul>`
      : ck.length ? `<details class="checks-box ${ck[0].lvl}" ${foldAttr("chk" + i)}><summary>${LVL_ICON[ck[0].lvl] || ""} <span class="c1">${esc(ck[0].text)}</span><span class="call">ข้อควรรู้ ${ck.length} ข้อ</span> <b class="cn">+${ck.length - 1}</b></summary><ul class="checks">${ck.map(ckLi).join("")}</ul></details>` : "";
    return `<div class="card day ${e.lvl} ${open ? "" : "fold"}" id="day-${i}">
      <div class="day-head" data-tog="${i}" aria-expanded="${open}"><h3>วันที่ ${i + 1}</h3><span class="day-meta">${thDate(e.iso)}</span>
        <span class="wx" data-wx="${ref.lat},${ref.lng},${e.iso}"></span>
        <button class="btn small map-focus no-print" data-dmap="${i}" title="ดูเส้นทางวันนี้บนแผนที่" aria-label="ดูเส้นทางวันที่ ${i + 1} บนแผนที่">${I("map")}</button>
</div>
      <div class="day-meta day-route">${short(e.from) === short(e.to) ? `เที่ยวรอบ <b>${esc(short(e.to))}</b>` : `<b>${esc(short(e.from))}</b> → <b>${esc(short(e.to))}</b>`} · ${e.leave != null ? `ออก ~${fmtT(e.leave)} · ` : ""}จบ ~${fmtT(e.end)}${e.leaveBy != null ? ` · <b>ออกจากที่พักไม่เกิน ${fmtT(e.leaveBy)}</b>` : ""}${e.lvl !== "good" ? ` · <b class="lvl-${e.lvl}">${(e.tight ? TIGHT_TXT : LVL_TXT)[e.lvl]}</b>` : ""}</div>
      ${checks}
      <div class="day-body">
        <ul class="tl" data-day="${i}">${rows}</ul>${this.maybeBox(i)}
        <details class="no-print daynote" ${day.note || day.planB ? "open" : ""}><summary>${day.note || day.planB ? `${I("notebook-pen")} โน้ต / แผนสำรอง` : "+ โน้ต / แผนสำรอง"}</summary>
          <textarea data-dnote="${i}" rows="2" placeholder="โน้ตวันนี้ เช่น เลขจองทัวร์">${esc(day.note || "")}</textarea>
          <textarea data-dplanb="${i}" rows="2" placeholder="แผนสำรองถ้าถนนปิด/พายุหิมะ">${esc(day.planB || "")}</textarea></details>
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
  },

  unswipe() { this.swiped?.classList.remove("swiped"); this.swiped = null; },
  // มือถือ: ปัดแถวไปซ้าย = โชว์ปุ่ม ✏️ ✕ • กดค้าง ~0.4 วิ แล้วลาก = เรียงลำดับในวัน • ขยับนิ้วก่อนครบเวลา = เลื่อนหน้าปกติ
  // ใช้ touch event (ไม่ใช่ pointer) เพราะต้อง preventDefault กันหน้าเลื่อนตอนลาก/ปัด
  bindTouch(trip, placeBefore) {
    const W = 96;
    let g = null;
    const done = () => { this.noClick = Date.now(); };
    const drag = () => {
      const ul = g.li.closest("ul");
      g.mode = "drag"; g.rows = [...ul.querySelectorAll("li.it, li.stay")]; g.to = g.rows.indexOf(g.li);
      this.unswipe(); g.li.classList.add("dragging"); navigator.vibrate?.(12);
    };
    trip.addEventListener("touchstart", (ev) => {
      const li = ev.target.closest("li.it");
      this.noClick = 0;
      if (this.swiped && this.swiped !== li) this.unswipe();
      if (!li || ev.touches.length > 1 || ev.target.closest(".it-tools")) return (g = null);
      const t = ev.touches[0];
      g = { li, x0: t.clientX, y0: t.clientY, mode: null, base: li.classList.contains("swiped") ? -W : 0, sx: 0 };
      g.timer = setTimeout(drag, 400);
    }, { passive: true });
    trip.addEventListener("touchmove", (ev) => {
      if (!g) return;
      const t = ev.touches[0], dx = t.clientX - g.x0, dy = t.clientY - g.y0;
      if (g.mode === "drag") {
        ev.preventDefault();
        const y = t.clientY;
        if (y < 70) scrollBy(0, -12); else if (y > innerHeight - 110) scrollBy(0, 12);
        g.to = g.rows.filter((r) => r.getBoundingClientRect().top + r.offsetHeight / 2 < y).length;
        g.rows.forEach((r, n) => { r.classList.toggle("drop-before", n === g.to && r !== g.li); r.classList.toggle("drop-after", n === g.rows.length - 1 && g.to === g.rows.length && r !== g.li); });
        return;
      }
      if (!g.mode) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        clearTimeout(g.timer);
        g.mode = Math.abs(dx) > Math.abs(dy) ? "swipe" : "scroll";
        if (g.mode === "swipe") g.li.classList.add("swiping");
      }
      if (g.mode !== "swipe") return;
      ev.preventDefault();
      g.sx = Math.max(-W, Math.min(0, g.base + dx));
      g.li.style.setProperty("--sx", g.sx + "px");
    }, { passive: false });
    const end = () => {
      if (!g) return;
      clearTimeout(g.timer);
      const { li, mode } = g;
      if (mode === "swipe") {
        li.classList.remove("swiping"); li.style.removeProperty("--sx");
        this.unswipe();
        if (g.sx < -W / 2) { li.classList.add("swiped"); this.swiped = li; }
        done();
      } else if (mode === "drag") {
        g.rows.forEach((r) => r.classList.remove("dragging", "drop-before", "drop-after"));
        done();
        const from = g.rows.indexOf(li), i = +li.dataset.i, st = g.rows.findIndex((r) => r.classList.contains("stay"));
        if (g.to !== from && g.to !== from + 1) {
          const items = S.plan.days[i].items, t = g.rows[g.to];
          placeBefore(i, +li.dataset.idx, t?.dataset.idx ? items[+t.dataset.idx] : null, st >= 0 && g.to > st);
        }
      }
      g = null;
    };
    trip.addEventListener("touchend", end);
    trip.addEventListener("touchcancel", end);
    // กดค้างบนมือถือ: ไม่ให้เมนูของเบราว์เซอร์เด้ง
    trip.addEventListener("contextmenu", (ev) => { if (ev.target.closest("li.it")) ev.preventDefault(); });
  },

  // ลากเรียงลำดับในวันเดียวกัน / ข้ามวัน
  bindDrag(sec) {
    let src = null;
    sec.ondragstart = (e) => { const li = e.target.closest?.("li.it, .wchip"); if (!li) return; src = li; li.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; };
    sec.ondragend = () => { src?.classList.remove("dragging"); $$(".drop-before, .drop-after", sec).forEach((x) => x.classList.remove("drop-before", "drop-after")); src = null; };
    // จุดวาง = นับแถวที่กึ่งกลางอยู่เหนือเมาส์ (เหมือนลากด้วยนิ้ว) • ใต้แถวที่พัก = หลังเช็กอิน (ตอนค่ำ) • ใต้แถวสุดท้าย = ท้ายสุด
    const slot = (ul, e) => {
      const rows = [...ul.querySelectorAll("li.it, li.stay")].filter((r) => r !== src);
      const k = rows.filter((r) => { const b = r.getBoundingClientRect(); return b.top + b.height / 2 < e.clientY; }).length;
      const st = rows.findIndex((r) => r.classList.contains("stay"));
      return { rows, k, night: st >= 0 && k > st };
    };
    sec.ondragover = (e) => {
      if (!src) return;
      const ul = e.target.closest?.("ul.tl"); if (!ul) return;
      e.preventDefault();
      $$(".drop-before, .drop-after", sec).forEach((x) => x.classList.remove("drop-before", "drop-after"));
      const { rows, k } = slot(ul, e);
      if (rows[k]) rows[k].classList.add("drop-before"); else rows[rows.length - 1]?.classList.add("drop-after");
    };
    sec.ondrop = (e) => {
      if (!src) return;
      const ul = e.target.closest("ul.tl"); if (!ul) return;
      e.preventDefault();
      const fi = +src.dataset.i, fidx = +src.dataset.idx, ti = +ul.dataset.day, wid = src.dataset.wish;
      // หาจุดเป้าก่อนดึงตัวที่ลากออก (ดึงออกแล้วเลขลำดับเลื่อน)
      const { rows, k, night } = slot(ul, e), t = rows[k];
      const tgt = t?.dataset.idx ? S.plan.days[ti].items[+t.dataset.idx] : null;
      this.mut(() => {
        const it = wid != null ? Planner.mkItem(ti, idOf(wid), true) : S.plan.days[fi].items.splice(fidx, 1)[0];
        if (wid != null) S.plan.wish = S.plan.wish.filter((x) => String(x) !== wid);
        const dst = S.plan.days[ti].items;
        if (tgt === it) return dst.splice(fidx, 0, it); // วางที่เดิม
        let k = tgt ? dst.indexOf(tgt) : night ? dst.length : dst.filter((x) => !x.night).length;
        if (k < 0) k = dst.length;
        if (wid == null && fi !== ti) delete it.st;
        it.night = (night && ti < tripNights()) || undefined;
        it.u = true;
        dst.splice(k, 0, it);
      });
    };
  },

  // ---- กล่องแก้รายการ: ล็อกเวลา เวลาที่ใช้ หลังเช็กอิน โน้ต ย้ายวัน ----
  editItem(i, idx) {
    const it = S.plan.days[i].items[idx], p = point(it.id), N = tripNights(), cu = S.plan.custom[it.id];
    const mv = Planner.evaluate(i).tl.find((x) => x.kind === "move" && x.it === it), auto = mv && (mv.auto ?? mv.h);
    // คำอธิบายอยู่ใต้ช่อง (ไม่อยู่ในหัวช่อง) ช่องคู่กันจะตรงแนว • จอแคบเรียงคอลัมน์เดียว
    Modal.open(`<h2>${nameHtml(p)}</h2><div class="form ed-form">
      ${cu ? `<label class="f full">ชื่อ<input type="text" id="eName" value="${esc(cu.name)}"></label>
      <div class="full">${LocPick.html("ตำแหน่ง", 'id="eLoc"', cu.lat ? `${cu.lat}, ${cu.lng}` : cu.url || "", point(Planner.ends(i).to))}</div>` : ""}
      <label class="f">วิธีไปที่นี่<select id="eMode">${legOpts(it.m, Planner.modeOf(i))}</select></label>
      <div class="f">เวลาเดินทางมาที่นี่${durField("eLeg", it.lh, auto)}<small class="hint">${auto ? `ระบบคำนวณ ${fmtH(auto)} • ` : ""}เว้นว่าง = ให้ระบบคำนวณ</small></div>
      <label class="f">ย้ายไปวัน<select id="eDay">${S.plan.days.map((_, k) => `<option value="${k}" ${k === i ? "selected" : ""}>วันที่ ${k + 1} (${esc(short(Planner.ends(k).to))})</option>`).join("")}</select></label>
      <label class="f">ล็อกเวลาเริ่ม<input type="time" id="eAt" value="${esc(it.at || "")}"><small class="hint">ใช้เมื่อจองรอบหรือจองร้านไว้</small></label>
      <div class="f">เวลาที่ใช้${durField("eDur", it.dur, p.hours ?? p.dur ?? 1)}<small class="hint">ปกติ ${fmtH(p.hours ?? p.dur ?? 1)}</small></div>
      <div class="full chks"><label class="chk"><input type="checkbox" id="eMaybe" ${it.maybe ? "checked" : ""}> ถ้ามีเวลา (จุดสำรอง ไม่นับเวลา)</label>
      ${i < N ? `<label class="chk"><input type="checkbox" id="eNight" ${it.night ? "checked" : ""}> ไปหลังเช็กอินที่พัก (ตอนค่ำ)</label>` : ""}</div>
      <label class="f full">โน้ต<textarea id="eNote" rows="2">${esc(it.note || "")}</textarea></label>
    </div>
    <div class="ed-actions"><button class="btn primary" id="eSave">บันทึก</button><button class="btn" id="eWish">${I("heart")} เก็บไว้ในอยากไป</button><button class="btn red" id="eDel">เอาออกจากแผน</button></div>`);
    $("#eSave").onclick = () => {
      const at = $("#eAt").value, dur = durVal("eDur"), to = +$("#eDay").value;
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
        Object.assign(it, { m: $("#eMode").value || undefined, lh: durVal("eLeg") ?? undefined, at: at || undefined, dur: dur ?? undefined, note: $("#eNote").value.trim() || undefined, night: $("#eNight")?.checked || undefined, maybe: $("#eMaybe").checked || undefined, u: true });
        if (to !== i) { d.splice(d.indexOf(it), 1); it.night = undefined; Planner.insertBest(to, it); }
      });
      Modal.close();
    };
    $("#eWish").onclick = () => { this.mut(() => { Planner.toWish(i, it); Planner.resoft(i); }); Modal.close(); toast("ย้ายไปกล่อง อยากไป แล้ว"); };
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
      <p class="mute small" style="margin:-4px 0 12px">${thDate(e.iso)} • ${I("sun")} ขึ้น ${fmtT(e.sun.rise)} ตก ${fmtT(e.sun.set)}${e.driveH ? ` • ${I("car")} ขับรวม ${fmtH(e.driveH)} · ${fmtN(Math.round(e.km))} กม.` : ""}</p>
      <div class="form">
        ${i < N ? (Planner.stayAt(i) ? `<p class="f">คืนนี้พัก <b>${esc(Planner.stayAt(i).name || short(Planner.stayAt(i).hub))}</b> <a class="small" href="#stays" onclick="Modal.close()">แก้ที่พัก</a></p>` : `<label class="f">คืนนี้พักเมือง <small>ยังไม่ได้จอง: กรอกในข้อมูลทริป › ที่พัก</small><select data-mbase>${hubOptions(S.plan.bases[i])}</select></label>`) : ""}
        ${i > 0 ? `<label class="f">เริ่มวัน <small>ไม่ใส่ก็ได้</small><input type="time" data-mstart value="${esc(day.start || "")}"></label>` : ""}</div>
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
      <div class="form ed-form"><label class="f full">ชื่อ<input type="text" id="cName" placeholder="เช่น ร้านราเมนที่เพื่อนแนะนำ"></label>
        <div class="full">${LocPick.html("ตำแหน่ง", 'id="cLoc"', "", point(Planner.ends(i).to))}</div>
        <div class="f">เวลาที่ใช้${durField("cDur", 1)}</div>
        <label class="f">ล็อกเวลา<input type="time" id="cAt"><small class="hint">ไม่ใส่ก็ได้</small></label></div>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="cSave">เพิ่มในวันที่ ${i + 1}</button></div>`);
    $("#cSave").onclick = () => {
      const name = $("#cName").value.trim(), raw = $("#cLoc").value.trim(), ll = parseLatLng(raw);
      if (!name) return toast("ใส่ชื่อก่อน");
      if (raw && !ll && !/^https?:/.test(raw)) return toast("อ่านพิกัดไม่ได้ หรืออยู่นอกฮอกไกโด ลองกด แตะบนแผนที่");
      if (raw && !ll) toast("เก็บลิงก์ไว้แล้ว แต่ลิงก์นี้ไม่มีพิกัด จึงไม่คิดเวลาเดินทาง");
      const id = "c" + Date.now().toString(36);
      this.mut(() => {
        S.plan.custom[id] = { name, hours: durVal("cDur") ?? 1, url: /^https?:/.test(raw) ? raw : "", ...(ll || {}) };
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
    if (i === "unwish") { this.mut(() => { S.plan.wish = S.plan.wish.filter((x) => x !== id); }); return toast(`เอา ${pname(id)} ออกจากรายการอยากไปแล้ว`); }
    if (i === "wish") {
      if (!S.plan) return toast("สร้างแผนก่อน");
      if (S.plan.days.some((d) => d.items.some((it) => it.id === id))) return toast(`${pname(id)} อยู่ในแผนแล้ว`);
      if (S.plan.wish.includes(id)) return toast(`${pname(id)} อยู่ในรายการอยากไปแล้ว`);
      this.mut(() => S.plan.wish.push(id));
      return toast(`เก็บ ${pname(id)} ไว้ในรายการอยากไปแล้ว`);
    }
    this.mut(() => S.plan.days[+i].items.push(Planner.mkItem(+i, id, true))); // ต่อท้าย: อยากได้ลำดับสั้นสุดกด เรียงเส้นทาง
    toast(`ใส่ท้ายวันที่ ${+i + 1} แล้ว`);
  },

  // ================= ที่พัก (ส่วนท้ายของหน้าข้อมูลทริป) =================
  // ที่พักที่จอง = ตัวกำหนดเมืองของคืนนั้น • คืนที่ยังไม่จองแสดงเมืองจากรูท (เปลี่ยนเมือง/กรอกที่พักได้)
  staysHtml() {
    const t = S.trip, N = tripNights(), st = [...(t.stays || [])].sort((a, b) => a.from.localeCompare(b.from));
    const nightTxt = (k0, n) => `คืน ${thDate(Planner.dayIso(k0), false)}${n > 1 ? ` - ${thDate(Planner.dayIso(k0 + n - 1), false)}` : ""} · ${n} คืน`;
    const info = (hb) => `<details class="hubinfo"><summary>ย่านที่ควรพักใน${esc(short(hb.id))} • ¥${fmtN(hb.price[0])}–${fmtN(hb.price[2])}/ห้อง/คืน (ประมาณ)</summary>
      <dl class="kv"><dt>พักย่านไหน</dt><dd>${esc(hb.stay)}</dd><dt>ข้อดี</dt><dd>${esc(hb.pros)}</dd><dt>ข้อควรรู้</dt><dd>${esc(hb.cons)}</dd><dt>ช่วงพีค</dt><dd>${esc(hb.peak)}</dd></dl></details>`;
    const booked = (s) => { const n = daysBetween(s.from, s.to), out = s.to <= t.start || s.from >= t.end;
      return `<div class="card stay-card" data-stay="${s.id}">
      <div class="row"><h2 style="margin:0">${I("hotel")} ${esc(s.name || "ที่พัก")}</h2><span class="badge ${out ? "b-warn" : "b-mute"}">${out ? "อยู่นอกวันเที่ยว" : `${esc(short(s.hub))} · ${n} คืน`}</span>
        <span class="spacer"></span><button type="button" class="btn small ghost" data-stdel="${s.id}" aria-label="ลบที่พักนี้" title="ลบที่พักนี้">${I("x")}</button></div>
      <div class="form ed-form stay-form">
        <label class="f full">ชื่อที่พัก<input type="text" data-s="name" value="${esc(s.name || "")}" placeholder="ชื่อโรงแรม/เรียวกังที่จองไว้"></label>
        <label class="f">วันเช็กอิน<input type="date" data-s="from" min="${t.start}" max="${addDays(t.end, -1)}" value="${s.from}"></label>
        <label class="f">วันเช็กเอาท์<input type="date" data-s="to" min="${addDays(t.start, 1)}" max="${t.end}" value="${s.to}"></label>
        <label class="f">เวลาเช็กอิน<input type="time" data-s="checkIn" value="${esc(s.checkIn || "15:00")}"></label>
        <label class="f">เวลาเช็กเอาท์<input type="time" data-s="checkOut" value="${esc(s.checkOut || "10:00")}"></label>
        ${LocPick.html("ตำแหน่งที่พัก", 'data-s="loc"', s.loc || "", HUB[s.hub])}
        <small class="hint full lp-state">${s.lat ? `${I("map-pin")} ใช้พิกัดจริงคำนวณเวลาเดินทาง` : "ยังไม่มีพิกัด: ระบบใช้จุดกลางเมืองแทน"}</small>
        <label class="f">เมือง<select data-s="hub">${hubOptions(s.hub)}</select><small class="hint">ปักหมุดแล้วเลือกให้เอง</small></label>
      </div>${info(HUB[s.hub])}</div>`; };
    // คืนที่ยังไม่จอง (มีแผนแล้ว): รวมคืนติดกันที่เมืองเดียวกัน
    const open = [];
    if (S.plan) for (let k = 0; k < N; k++) { if (Planner.stayAt(k)) continue; const l = open[open.length - 1], b = S.plan.bases[k]; if (l && l.b === b && l.k0 + l.n === k) l.n++; else open.push({ b, k0: k, n: 1 }); }
    const todo = (o) => `<div class="card stay-card todo"><div class="row"><h2 style="margin:0">${I("hotel")} ${esc(short(o.b))}</h2><span class="badge b-warn">ยังไม่ได้จอง</span><span class="mute small">${nightTxt(o.k0, o.n)}</span></div>
      <div class="row todo-row"><label class="f">เมือง<select data-blockhub="${o.k0}:${o.n}">${hubOptions(o.b)}</select></label>
        <button type="button" class="btn" data-stadd="${o.k0}:${o.n}">${I("pencil")} กรอกที่พักที่จองแล้ว</button></div>${info(HUB[o.b])}</div>`;
    const cards = [...st.map((s) => ({ at: s.from, h: booked(s) })), ...open.map((o) => ({ at: Planner.dayIso(o.k0), h: todo(o) }))].sort((a, b) => a.at.localeCompare(b.at));
    return `<p class="mute small" style="margin:0 0 10px">จองแล้ว: กรอกชื่อ วันเช็กอิน-เช็กเอาท์ และปักหมุด ระบบใช้เป็นเมืองที่พักคืนนั้นและจุดเริ่ม/จบของแต่ละวัน${S.plan ? " • คืนที่ยังไม่จอง (กรอบเส้นประ) เปลี่ยนเมืองได้" : ""}</p>
      <details class="adv" data-keep="staytips" ${FOLD.staytips ? "open" : ""}><summary>หลักเลือกที่พักหน้าหนาว</summary><div class="callout info">${STAY_TIPS}</div></details>
      <div class="stay-grid">${cards.map((c) => c.h).join("")}</div>
      <button type="button" class="btn" data-stnew style="margin:4px 0 14px">${I("hotel")} + เพิ่มที่พัก</button>`;
  },

  // ================= event =================
  bind() {
    const trip = $('[data-sec="trip"]'), setup = $('[data-sec="setup"]');
    // ---- ข้อมูลทริป ----
    setup.addEventListener("change", (ev) => {
      const el = ev.target, t = S.trip;
      // มือถือส่ง change ทุกครั้งที่หมุนวงล้อวัน/เวลา: วาดหน้าใหม่ตอนนั้นจะปิดตัวเลือกทิ้ง จึงรอให้ออกจากช่องก่อน
      if (/^(date|time|datetime-local)$/.test(el.type) && document.activeElement === el) {
        if (!el._wait) { el._wait = true; el.addEventListener("blur", () => { el._wait = false; el.dispatchEvent(new Event("change", { bubbles: true })); }, { once: true }); }
        return;
      }
      if (el.dataset.s) return this.setStay(el);
      if (el.dataset.blockhub) { const [k0, n] = el.dataset.blockhub.split(":").map(Number); return this.mut(() => { for (let k = k0; k < k0 + n; k++) S.plan.bases[k] = el.value; }); }
      if (el.dataset.rent) return this.setRent(el);
      const start0 = t.start;
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
        // เลื่อนวันเริ่มทริป: ถามว่าจะเลื่อนที่พักที่กรอกไว้ตามไปด้วยไหม (เช่น ตั๋วเครื่องบินเปลี่ยนวัน)
        const dd = daysBetween(start0, t.start);
        if (dd && t.stays.length && confirm(`เลื่อนวันเช็กอิน/เช็กเอาท์ของที่พักทั้ง ${t.stays.length} ที่ ตามวันเริ่มทริปไปด้วย ${dd > 0 ? "+" : ""}${dd} วัน?`)) {
          t.stays.forEach((s) => { s.from = addDays(s.from, dd); s.to = addDays(s.to, dd); });
          Planner.syncDays();
        }
      });
    });
    setup.addEventListener("lp-done", () => App.renderAll());
    setup.addEventListener("click", (ev) => {
      const el = ev.target.closest("button, [data-tpl], [data-blank], [data-fromstays], [data-start]");
      if (!el) return;
      if (el.dataset.act === "refillAll") { if (!confirm("จัดที่เที่ยวใหม่ทั้งทริป? จุดที่ระบบเลือกให้จะถูกแทนที่ (ที่ใส่เอง/ล็อกเวลาไว้ยังอยู่ กด ↶ ย้อนได้)")) return; this.mut(() => Planner.autofillAll()); return toast("จัดที่เที่ยวใหม่แล้ว"); }
      if (el.dataset.scroll) return $("#" + el.dataset.scroll).scrollIntoView({ behavior: "smooth" });
      const t = S.trip, d = el.dataset;
      if (d.start !== undefined) { this.start = d.start || null; this.renderSetup(); return window.scrollTo(0, 0); }
      if (d.stdel) {
        const s = stayOf(d.stdel);
        if (s.name && !confirm(`ลบที่พัก ${s.name}?`)) return;
        return this.mut(() => { t.stays = t.stays.filter((x) => x !== s); Planner.syncDays(); });
      }
      if (d.stadd || d.stnew !== undefined) { // กรอกที่พักของคืนที่ยังไม่จอง / เพิ่มที่พักใหม่ที่คืนแรกที่ยังว่าง
        const N = tripNights(), free = Array.from({ length: N }, (_, k) => k).find((k) => !Planner.stayAt(k)) ?? 0;
        const [k0, n] = d.stadd ? d.stadd.split(":").map(Number) : [free, 1];
        let s;
        this.mut(() => { s = Planner.newStay({ hub: S.plan?.bases[k0] || AIR[t.arrive].hub, from: Planner.dayIso(k0), to: Planner.dayIso(k0 + n) }); Planner.syncDays(); });
        return setTimeout(() => $(`[data-stay="${s.id}"] [data-s="name"]`)?.focus(), 50);
      }
      if (d.fromstays !== undefined) {
        if (S.plan && !confirm("จัดแผนใหม่จากที่พักที่จองไว้? แผนรายวันเดิมจะถูกแทนที่ (กด ↶ ย้อนได้)")) return;
        this.mut(() => Planner.createFromStays()); location.hash = "#trip"; return;
      }
      if (el.dataset.tpl) {
        if (S.plan && !confirm("สร้างแผนใหม่จากรูทนี้? แผนรายวันเดิมจะถูกแทนที่ (กด ↶ ย้อนได้)")) return;
        this.mut(() => Planner.create(el.dataset.tpl)); location.hash = "#trip";
      } else if (el.dataset.blank !== undefined) {
        if (S.plan && !confirm("เริ่มแผนเปล่า? แผนรายวันเดิมจะถูกแทนที่")) return;
        this.mut(() => Planner.createFromStays(false));
        location.hash = "#trip";
      } else if (el.parentElement.dataset.seg) {
        this.mut(() => { t[el.parentElement.dataset.seg] = el.dataset.v; });
      } else if (el.dataset.int) {
        const k = el.dataset.int;
        this.mut(() => { t.interests = t.interests.includes(k) ? t.interests.filter((x) => x !== k) : [...t.interests, k]; });
      }
    });
    setup.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && (ev.target.dataset.tpl || ev.target.dataset.blank !== undefined || ev.target.dataset.fromstays !== undefined || ev.target.dataset.start)) ev.target.click(); });

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
      else if (d.bm) this.mut(() => { S.plan.days[+d.bm].bm = el.value || undefined; });
      else if (d.rr) { const v = +el.value, last = v === el.options.length - 1; this.mut(() => { S.plan.days[+d.rr].rr = last ? undefined : v; }); } // หลังสุด = ไม่ล็อกตำแหน่ง (เพิ่มที่ใหม่ก็ยังคืนท้ายวัน)
      else if (d.rentm) { const [i, k] = d.rentm.split(":"); this.mut(() => { S.plan.days[+i][`r${k}m`] = el.value || undefined; }); }
      else if (d.legmode) { const [i, k] = d.legmode.split(":").map(Number); this.mut(() => { const it = S.plan.days[i].items[k]; it.m = el.value || undefined; it.lh = undefined; it.u = true; }); } // เปลี่ยนวิธี = เวลาที่กำหนดเองไม่ตรงแล้ว
      else if (d.dnote) { S.plan.days[+d.dnote].note = el.value; save(); }
      else if (d.dplanb) { S.plan.days[+d.dplanb].planB = el.value; save(); }
    });
    // เลื่อนจุดในวันเดียวกัน: ขึ้น/ลงทีละช่อง (คีย์บอร์ด) หรือแทรกก่อนจุด tgt (ลาก; null = ท้ายวัน)
    const stepItem = (i, idx, dir) => {
      const items = S.plan.days[i].items, day = items.filter((x) => !x.night && !x.maybe), a = items[idx], b = day[day.indexOf(a) + dir];
      if (!b) return false;
      this.mut(() => { const ia = items.indexOf(a), ib = items.indexOf(b); [items[ia], items[ib]] = [items[ib], items[ia]]; a.u = true; });
      return true;
    };
    const placeBefore = (i, idx, tgt, night = false) => {
      const items = S.plan.days[i].items, a = items[idx];
      if (a === tgt && !!a.night === night) return;
      this.mut(() => {
        items.splice(items.indexOf(a), 1);
        a.night = night || undefined;
        let k = tgt ? items.indexOf(tgt) : night ? items.length : items.filter((x) => !x.night).length;
        if (k < 0) k = items.length;
        a.u = true; items.splice(k, 0, a);
      });
    };
    trip.addEventListener("keydown", (ev) => {
      const t = ev.target;
      if (t.dataset?.row && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); t.click(); }
      else if (t.dataset?.row && ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) {
        ev.preventDefault();
        const [i, idx] = t.dataset.row.split(":").map(Number), id = S.plan.days[i].items[idx];
        if (stepItem(i, idx, ev.key === "ArrowUp" ? -1 : 1)) $(`[data-row="${i}:${S.plan.days[i].items.indexOf(id)}"]`)?.focus();
      }
    });
    if (COARSE) this.bindTouch(trip, placeBefore);
    trip.addEventListener("click", (ev) => {
      if (this.noClick && Date.now() - this.noClick < 800) { this.noClick = 0; return ev.preventDefault(); } // คลิกที่ตามมาจากการปัด/ลาก ไม่ใช่การแตะ
      const sw = ev.target.closest("li.swiped");
      if (sw && !ev.target.closest(".it-tools")) return this.unswipe(); // แตะแถวที่เปิดปุ่มอยู่ = ปิดกลับ
      if (sw) this.unswipe(); // กด ✏️/✕ แล้ว แถวกลับที่เดิม (ปิดกล่องโดยไม่แก้ก็ไม่ค้าง)
      const el = ev.target.closest("button, a, select, [data-goto], [data-detail], [data-lb], [data-edit], [data-tog]");
      if (!el) return;
      const d = el.dataset, pair = (s) => s.split(":").map(Number);
      if (d.lb) Lightbox.place(isNaN(d.lb) ? d.lb : +d.lb);
      else if (d.detail) PlacesView.detail(isNaN(d.detail) ? d.detail : +d.detail);
      else if (d.mapday) {
        this.focus = d.mapday === "all" ? null : +d.mapday;
        $$(".map-days [data-mapday]").forEach((b) => b.classList.toggle("on", b.dataset.mapday === d.mapday));
        TripMap.drawPlan(this.M, this.evals, this.focus);
      } else if (d.goto) { this.openDay(+d.goto); $(`#day-${d.goto}`).scrollIntoView({ behavior: "smooth", block: "start" }); }
      else if (d.tog) { if (matchMedia("(max-width: 899px)").matches) this.openDay(+d.tog, !this.opened.has(+d.tog)); }
      else if (d.dmap) {
        // แผนที่ใหญ่แสดงวันนี้ จอแคบเลื่อนขึ้นไปที่แผนที่ด้วย
        this.focus = +d.dmap; $$(".map-days [data-mapday]").forEach((b) => b.classList.toggle("on", b.dataset.mapday === d.dmap));
        const mc = $("#mapCard"); if (!mc.open) mc.open = true; else TripMap.drawPlan(this.M, this.evals, this.focus);
        if (!matchMedia("(min-width: 1200px)").matches) mc.scrollIntoView({ behavior: "smooth", block: "start" });
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
      else if (d.act === "print") App.print();
      else if (d.act === "share") App.share();
    });
    trip.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.dataset.goto) ev.target.click(); });
  },

  // ---- ที่พัก (ในหน้าข้อมูลทริป): ชื่อ ตำแหน่ง เช็กอิน/เอาท์ ----
  setRent(el) {
    const k = el.closest("[data-rentk]").dataset.rentk, f = el.dataset.rent, N = tripNights();
    const picking = el.closest(".lp")?.querySelector(".lp-pick:not([hidden])");
    (picking ? (fn) => { Hist.push(); fn(); save(); } : (fn) => this.mut(fn))(() => {
      const r = (S.trip.rent ||= {}), x = (r[k] ||= {});
      if (f === "day") {
        if (S.plan) setTimeout(() => toast("เปลี่ยนวันเช่ารถแล้ว ที่เที่ยวเดิมยังอยู่: วันที่รถไฟไปไม่ถึงจะมีคำเตือน กด จัดวันนี้ใหม่ ได้"), 0);
        x.day = k === "r" && +el.value === N ? undefined : +el.value; // คืนวันสุดท้าย: ไม่เก็บเลขวัน เลื่อนตามวันกลับ
        if (k === "p" && r.r?.day != null && r.r.day < x.day) r.r.day = x.day;
      } else x[f] = el.value.trim();
      if (f === "loc") { const ll = parseLatLng(x.loc); if (ll) Object.assign(x, ll); else { delete x.lat; delete x.lng; if (x.loc) toast("ลิงก์นี้ไม่มีพิกัด (ลิงก์แชร์แบบสั้น) ใช้ปุ่ม แตะบนแผนที่ แทน"); } }
    });
  },
  setStay(el) {
    const s = stayOf(el.closest("[data-stay]")?.dataset.stay), k = el.dataset.s;
    if (!s) return;
    // ระหว่างปักหมุดบนแผนที่: บันทึกอย่างเดียว ไม่วาดหน้าใหม่ (ไม่งั้นแผนที่ถูกสร้างใหม่ ปิดไป หมุดหาย) วาดใหม่ตอนปิดแผนที่
    const picking = el.closest(".lp")?.querySelector(".lp-pick:not([hidden])");
    (picking ? (fn) => { Hist.push(); fn(); save(); } : (fn) => this.mut(fn))(() => {
      s[k] = el.value.trim();
      if (k === "from" && s.to <= s.from) s.to = addDays(s.from, 1);
      if (k === "to" && s.to <= s.from) s.from = addDays(s.to, -1);
      if (k === "loc") { const ll = parseLatLng(s.loc); if (ll) Object.assign(s, ll, { hub: nearestHub(ll) }); else { delete s.lat; delete s.lng; if (s.loc) toast("ลิงก์นี้ไม่มีพิกัด (ลิงก์แชร์แบบสั้น) ใช้ปุ่ม แตะบนแผนที่ แทน"); } }
      Planner.syncDays();
    });
  },
};
