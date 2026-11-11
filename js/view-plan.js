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
const KIND_IC = (id) => I(isPlace(id) ? "map-pin" : S.plan.custom[id]?.meal ? "soup" : "star");
// ตัวเลือกวิธีเดินทางรายช่วง ("" = ค่าเริ่มต้นของทริป)
const legOpts = (cur) => `<option value="">${LEG_MODE[Planner.modeOf()].name} (ค่าเริ่มต้น)</option>${Object.entries(LEG_MODE).map(([v, m]) => `<option value="${v}" ${cur === v ? "selected" : ""}>${m.name}</option>`).join("")}`;
const PlanView = {
  M: null, mapEl: null, focus: null,

  // แก้แผน: เก็บประวัติให้ย้อนกลับได้ → บันทึก → วาดใหม่
  mut(fn) { Hist.push(); fn(); save(); App.renderAll(); },

  // แถบลำดับการใช้งาน: บอกคนใหม่ว่าต้องทำอะไรก่อนหลัง และขั้นไหนทำแล้ว
  steps(cur) {
    const P = S.plan, pr = PrepView.progress();
    const hotelsDone = !!P && P.bases.slice(0, tripNights()).every((b) => hotelOf(b)?.name);
    const st = [["setup", "ข้อมูลทริป + เลือกรูท", !!P], ["trip", "ปรับแผนรายวัน", false], ["stays", "ใส่ที่พักที่จองแล้ว", hotelsDone], ["prep", `เตรียมตัว ${pr.pct}%`, pr.pct === 100]];
    return `<ol class="steps no-print">${st.map(([id, t, done], k) => `<li class="${done ? "done" : ""} ${id === cur ? "cur" : ""}"><a href="#${id}"><b>${done ? I("circle-check") : k + 1}</b>${t}</a></li>`).join("")}</ol>`;
  },

  // ================= ข้อมูลทริป / เที่ยวบิน / เลือกรูท =================
  renderSetup() {
    const t = S.trip, N = tripNights(), b = t.buf, of = t.outFlight, inf = t.inFlight;
    const fresh = !S.plan; // คนใหม่: เริ่มจากกล่องสั้นๆ เที่ยวบิน/สไตล์พับไว้ (ไม่ต้องมีตั๋วก็วางแผนได้)
    const modeSeg = `<div class="seg" data-seg="mode">${Object.entries(MODE).map(([k, v]) => `<button data-v="${k}" class="${t.mode === k ? "on" : ""}">${I(k === "car" ? "car" : "train-front")} ${v}</button>`).join("")}</div>`;
    const num = (k, v, min, max, lbl) => `<label class="f">${lbl}<input type="number" min="${min}" max="${max}" data-buf="${k}" value="${v}"></label>`;
    $('[data-sec="setup"]').innerHTML = `${this.steps("setup")}
      <div class="sec-head"><h1>ข้อมูลทริปและเที่ยวบิน</h1>
        <p class="lead">กรอกเที่ยวบินขาไป-ขากลับ แล้วเลือกรูท ระบบจะจัดที่พักรายคืนและที่เที่ยวรายวันให้ คำนวณเวลาเผื่อตรวจคนเข้าเมือง รับรถ และเวลาที่ต้องถึงสนามบินให้เอง</p></div>
      ${fresh ? `<div class="card start"><h2>เริ่มวางแผนใน 1 นาที</h2>
        <p>ใส่วันเที่ยว จำนวนคน และวิธีเดินทาง แล้วเลือกรูทด้านล่าง ระบบจะจัดแผนรายวันพร้อมเวลาขับหน้าหนาวให้ทันที <b>ยังไม่ต้องมีตั๋วเครื่องบิน</b></p>
        <div class="form"><label class="f">วันถึงฮอกไกโด<input type="date" data-k="start" value="${t.start}"></label><label class="f">วันบินกลับ<input type="date" data-k="end" value="${t.end}"></label>
          <label class="f">ผู้ใหญ่<input type="number" min="1" max="20" data-k="adults" value="${t.adults}"></label><label class="f">เด็ก (≤11 ปี)<input type="number" min="0" max="10" data-k="kids" value="${t.kids}"></label></div>
        <div style="margin-top:12px">${modeSeg}</div>
        <p class="mute small" style="margin:10px 0">วันที่ใส่ไว้เป็นตัวอย่าง แก้ได้ • เที่ยวบิน สไตล์ และความสนใจ ปรับทีหลังได้ (ด้านล่าง)</p>
        <button class="btn primary" data-scroll="routes">ดูรูทแนะนำ ↓</button></div>
      <details class="fold-sec"><summary><b>${I("plane")} เที่ยวบิน</b> <span class="mute">กรอกหลังจองตั๋ว ไม่บังคับ</span></summary>` : `<h2 class="step-h"><b>1</b> วันและเที่ยวบิน</h2>`}
      <div class="grid g2">
        <div class="card"><h2>${I("plane")} ขาไป</h2><div class="form">
          <label class="f">เลขเที่ยวบิน<input type="text" data-of="no" value="${esc(of.no)}" placeholder="เช่น TG670"></label>
          <label class="f">บินจาก<input type="text" data-of="from" value="${esc(of.from)}" placeholder="BKK"></label>
          <label class="f">ออกจากไทย (ถ้ามี เวลาไทย)<input type="datetime-local" data-of="dep" value="${esc(of.dep)}"></label>
          <label class="f">ต่อเครื่องที่ (ถ้ามี)<input type="text" data-of="via" value="${esc(of.via)}" placeholder="เช่น HND"></label>
          <label class="f">ลงที่สนามบิน<select data-k="arrive">${airOptions(t.arrive)}</select></label>
          <label class="f">วันที่ลง (เวลาญี่ปุ่น)<input type="date" data-k="start" value="${t.start}"></label>
          <label class="f">เวลาเครื่องลง<input type="time" data-k="arriveTime" value="${t.arriveTime}"></label>
          <label class="f chk"><input type="checkbox" data-k="domIn" ${t.domIn ? "checked" : ""}> เที่ยวบินในประเทศ (ผ่าน ตม. ที่โตเกียว/โอซาก้าแล้ว)</label>
        </div></div>
        <div class="card"><h2>${I("plane")} ขากลับ</h2><div class="form">
          <label class="f">เลขเที่ยวบิน<input type="text" data-if="no" value="${esc(inf.no)}" placeholder="เช่น TG671"></label>
          <label class="f">บินไป<input type="text" data-if="to" value="${esc(inf.to)}" placeholder="BKK"></label>
          <label class="f">ออกจากสนามบิน<select data-k="depart">${airOptions(t.depart)}</select></label>
          <label class="f">วันที่บินกลับ<input type="date" data-k="end" value="${t.end}"></label>
          <label class="f">เวลาเครื่องออก<input type="time" data-k="departTime" value="${t.departTime}"></label>
          <label class="f">ต่อเครื่องที่ (ถ้ามี)<input type="text" data-if="via" value="${esc(inf.via)}" placeholder="เช่น NRT"></label>
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
      ${fresh ? `</details><details class="fold-sec"><summary><b>${I("settings")} สไตล์และความสนใจ</b> <span class="mute">ไม่บังคับ: กำหนดว่าวันหนึ่งเที่ยวกี่ที่ ขับกี่ชั่วโมง</span></summary>` : `<h2 class="step-h"><b>2</b> คนและสไตล์ <small class="mute">ใช้กำหนดว่าวันหนึ่งเที่ยวกี่ที่ ขับกี่ชั่วโมง และคิดงบ</small></h2>`}
      <div class="card">
        <div class="form">
          <label class="f">ผู้ใหญ่<input type="number" min="1" max="20" data-k="adults" value="${t.adults}"></label>
          <label class="f">เด็ก (≤11 ปี)<input type="number" min="0" max="10" data-k="kids" value="${t.kids}"></label>
          <label class="f">คนขับ (มี IDP)<input type="number" min="0" max="6" data-k="drivers" value="${t.drivers}"></label>
          <label class="f">ระดับที่พัก/งบ<select data-k="level">${["ประหยัด", "กลาง", "สบาย"].map((x, i) => `<option value="${i}" ${t.level === i ? "selected" : ""}>${x}</option>`).join("")}</select></label>
        </div>
        <div class="row" style="margin-top:14px">
          <div><div class="mute small">สไตล์</div><div class="seg" data-seg="pace">${Object.entries(PACE).map(([k, v]) => `<button data-v="${k}" class="${t.pace === k ? "on" : ""}">${v.name}</button>`).join("")}</div></div>
          <div><div class="mute small">การเดินทาง</div>${modeSeg}<small class="mute">ค่าเริ่มต้นของทุกช่วง เปลี่ยนรายช่วงได้ในแผนรายวัน</small></div>
        </div>
        <div style="margin-top:12px"><div class="mute small">สนใจอะไร (เลือกได้หลายข้อ)</div>
          <div class="chips">${Object.entries(INTEREST).map(([k, v]) => `<button class="chip ${t.interests.includes(k) ? "on" : ""}" data-int="${k}">${v}</button>`).join("")}</div></div>
        <p class="mute small" style="margin:10px 0 0">ชิล: ขับ ≤2 ชม./วัน ≤3 ที่ จบวัน 18:00 • กลางๆ: ≤3.5 ชม. ≤4 ที่ จบ 19:30 • แน่น: ≤5 ชม. ≤6 ที่ จบ 21:00 • หน้าหนาวเวลาขับคูณ ${SNOW_F[S.set.snow]?.[0] ?? 1.5} เผื่อหิมะให้แล้ว • ทับค่าได้ใน ${I("settings")} ตั้งค่า</p>
      </div>
      ${fresh ? "</details>" : ""}<h2 class="step-h" id="routes"><b>${fresh ? 2 : 3}</b> เลือกรูท = สร้างแผนรายวัน</h2>
      <div class="card">
        <p class="mute">รูทคือลำดับเมืองที่จะพักแต่ละคืน เรียงตามความเหมาะกับข้อ 1-2 กดการ์ดแล้วระบบจะจัดที่พักรายคืนและที่เที่ยวรายวันให้ทันที แล้วพาไปหน้าแผนรายวัน${S.plan ? ` <b>มีแผนอยู่แล้ว: กดรูทใหม่ = แผนเดิมถูกแทนที่</b> (ที่พักที่กรอกไว้ยังอยู่ กด ↶ ย้อนได้) ถ้าแค่แก้วันหรือเที่ยวบิน ไม่ต้องกดรูทใหม่` : ""}</p>
        <div class="grid g3">${Planner.rankTemplates().map((r) => this.tplCard(r)).join("")}
          <div class="card tpl blank" data-blank tabindex="0" role="button"><h3>เริ่มแผนเปล่า</h3><p class="small">เลือกเมืองที่พักแต่ละคืนและที่เที่ยวเองทั้งหมด</p></div></div>
      </div>`;
  },

  tplCard({ tp, score, min, ideal, why }) {
    const route = [tp.in, ...tp.stops.map((s) => s[0]), tp.out].map(short).join(" → ");
    return `<div class="card tpl ${S.plan?.tpl === tp.id ? "on" : ""}" data-tpl="${tp.id}" tabindex="0" role="button">
      <div class="score">${score}%</div><h3 style="padding-right:46px">${esc(tp.name)}</h3>
      <div class="route">${esc(route)}</div><p class="small" style="margin:6px 0 0">${esc(tp.desc)}</p>
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
    const left = daysBetween(todayIso(), t.start), B = BudgetView.calc();
    sec.innerHTML = `${this.steps("trip")}${Safety.banner()}
      <div class="card overview"><div class="row"><h1 style="margin:0">แผนทริป</h1><span class="badge b-${overall}">${LVL_ICON[overall]} ${LVL_TXT[overall]}</span>
        <div class="spacer"></div><div class="row no-print"><a class="btn small" href="#setup">${I("pencil")} ข้อมูลทริป</a>
          <details class="more-menu"><summary class="btn small" aria-label="เมนูเพิ่มเติม">⋯ เพิ่มเติม</summary><div class="menu-pop">
            <button class="btn small" data-act="refillAll" title="ที่ใส่เองและที่ล็อกเวลาไว้จะไม่ถูกลบ">${I("refresh-ccw")} จัดสถานที่ใหม่ทั้งทริป</button>
            <button class="btn small" data-act="print">${I("printer")} พิมพ์ / PDF</button></div></details></div></div>
        <p class="print-only">${thDate(t.start)} - ${thDate(t.end)} • ${t.adults + t.kids} คน • ${MODE[t.mode]} • สไตล์${PACE[t.pace].name}${t.outFlight.no ? ` • ขาไป ${esc(t.outFlight.no)} ลง ${t.arrive} ${t.arriveTime}` : ""}${t.inFlight.no ? ` • ขากลับ ${esc(t.inFlight.no)} ออก ${t.depart} ${t.departTime}` : ""}</p>
        <div class="summary" style="margin-top:10px">
          <div class="k"><b>${left > 0 ? `อีก ${fmtN(left)} วัน` : left === 0 ? "วันนี้!" : "กำลังเที่ยว/จบแล้ว"}</b><span>${thDate(t.start, false)} - ${thDate(t.end, false)}</span></div>
          <div class="k"><b>${N + 1} วัน ${N} คืน</b><span>${I("plane")} ${t.arrive} ${t.arriveTime} → ${t.depart} ${t.departTime}</span></div>
          ${dT ? `<div class="k"><b>${fmtH(dT)}</b><span>ขับรวม ${fmtN(kmT)} กม.</span></div>` : ""}
          ${trT ? `<div class="k"><b>${fmtH(trT)}</b><span>นั่งรถไฟ/บัสรวม</span></div>` : ""}
          <div class="k"><b>${nPlaces} ที่</b><span>${nightsBy.map((x) => `${esc(short(x.b))} ${x.n}`).join(" • ")}</span></div>
          <div class="k"><b>${fmtN(B.total / B.ppl)} ฿</b><span><a href="#budget">งบต่อคนโดยประมาณ</a></span></div>
        </div>
        <details class="gantt-box" ${matchMedia("(min-width: 900px)").matches ? "open" : ""}><summary>${I("clock")} แถบเวลาทั้งทริป <small class="mute">ดูว่าวันไหนแน่น</small></summary>${this.gantt(evals)}</details>
        <ul class="checks">${sum.map((c) => `<li class="${c.lvl}">${esc(c.text)}</li>`).join("")}</ul>
      </div>
      <div class="card no-print"><div class="row"><h2 style="margin:0">แผนที่</h2><div class="spacer"></div><span class="mute small">กดจุดสีเทาเพื่อเพิ่มเข้าแผน</span></div>
        <div class="map-days"><button data-mapday="all" class="${this.focus === null ? "on" : ""}">ทั้งทริป</button>${evals.map((e) => `<button data-mapday="${e.i}" style="--c:${DAY_COLORS[e.i % DAY_COLORS.length]}" class="${this.focus === e.i ? "on" : ""}">D${e.i + 1}</button>`).join("")}</div>
        <div id="planMapHost"></div>
        <div class="map-legend"><span><span class="pin num" style="--c:#2c6e9b;display:inline-grid;margin:0;width:18px;height:18px;font-size:10px">1</span> ลำดับในวันนั้น</span>
          <span><i style="background:#2c6e9b"></i>ขับรถ</span><span><i style="background:repeating-linear-gradient(90deg,#2c6e9b 0 3px,transparent 3px 8px)"></i>รถไฟ/บัส</span>
          <span>${I("moon")} หลังเช็กอิน</span><span>${I("hotel")} ที่พัก</span><span>${I("utensils")} ร้านอาหาร</span></div></div>
      ${this.wishCard()}
      ${evals.map((e) => this.dayCard(e)).join("")}`;
    this.mountMap(evals);
    Weather.fill(sec);
    this.bindDrag(sec);
  },

  // ---- รายการอยากไป: เก็บไว้ก่อน ค่อยลากลงวันหรือให้ระบบจัด ----
  wishCard() {
    const W = S.plan.wish, days = S.plan.days.map((_, k) => `<option value="${k}">วันที่ ${k + 1} (${esc(short(Planner.ends(k).to))})</option>`).join("");
    return `<div class="card no-print wish"><div class="row"><h2 style="margin:0">${I("heart")} อยากไป <small class="mute">${W.length} ที่ ยังไม่ลงวัน</small></h2><div class="spacer"></div>
        ${W.length ? '<button class="btn small primary" data-act="placeWish">จัดลงวันที่เหมาะให้ทั้งหมด</button>' : ""}</div>
      <p class="mute small">ลากลงวันที่ต้องการ หรือเลือกวันจากช่องข้างชื่อ • "วันที่เหมาะสุด" = ลองใส่ทุกวันแล้วเลือกวันที่ปัญหาน้อยสุดและขับเพิ่มน้อยสุด (ตรงฤดูด้วย) • เพิ่มได้จากหน้าสถานที่ (♡ อยากไป) หรือปุ่มด้านล่าง</p>
      ${W.length ? `<div class="wish-list">${W.map((id) => `<div class="wchip" draggable="true" data-wish="${esc(id)}"><span>${KIND_IC(id)}</span><b class="nm" data-detail="${esc(id)}">${esc(pname(id))}</b>
        <select data-wishday="${esc(id)}" aria-label="ใส่วัน"><option value="">ใส่วัน…</option><option value="auto">วันที่เหมาะสุด</option>${days}</select><button class="x" data-wishrm="${esc(id)}" aria-label="ลบ">✕</button></div>`).join("")}</div>` : ""}
      <button class="btn small" data-wishpick>${I("search")} เพิ่มที่อยากไป</button></div>`;
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
      if (x.kind === "airport") return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I("plane")}</span><span><b>ถึงสนามบิน ${esc(pname(x.id))}</b> (เครื่องออก ${S.trip.departTime}${S.trip.inFlight.no ? ` • ${esc(S.trip.inFlight.no)}` : ""})</span></li>`;
      return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I(x.ic || "info")}</span><span class="mute">${esc(x.text)}</span></li>`;
    }).join("");
    const pts = [point(e.from), ...e.items.map((it) => point(it.id)).filter((p) => p.lat), point(e.to)];
    const ref = point(e.to);
    const open = this.isOpen(i);
    return `<div class="card day ${e.lvl} ${open ? "" : "fold"}" id="day-${i}">
      <div class="day-head"><h3>วันที่ ${i + 1}</h3><span class="day-meta">${thDate(e.iso)} • ${I("sun")} ${fmtT(e.sun.rise)}-${fmtT(e.sun.set)}</span>
        <span class="wx" data-wx="${ref.lat},${ref.lng},${e.iso}"></span>
        <span class="badge b-${e.lvl}">${LVL_ICON[e.lvl]} ${LVL_TXT[e.lvl]}</span>
        <button class="btn small day-tog no-print" data-tog="${i}" aria-expanded="${open}">${open ? "ย่อ" : "ดูทั้งวัน"}</button></div>
      <div class="day-meta" style="margin-top:2px"><b>${esc(short(e.from))}</b> → <b>${esc(short(e.to))}</b>${i < N && !hotelOf(e.to)?.name ? ` <a class="badge b-warn no-print" href="#stays">${I("hotel")} ยังไม่ใส่ที่พัก</a>` : ""}${e.driveH ? ` • ขับรวม ${fmtH(e.driveH)}` : ""} • จบวัน ~${fmtT(e.end)}${e.leaveBy != null ? ` • <b>ออกจากที่พักไม่เกิน ${fmtT(e.leaveBy)}</b>` : ""}</div>
      <div class="day-body">
        <div><ul class="tl" data-day="${i}">${rows}</ul>${this.maybeBox(i)}</div>
        <div><details class="no-print daymap-box" ${matchMedia("(min-width: 900px)").matches ? "open" : ""}><summary>${I("map")} แผนที่วันนี้</summary><div class="daymap" data-daymap="${i}"></div></details>
          <ul class="checks">${e.checks.length ? e.checks.map((c) => `<li class="${c.lvl}">${LVL_ICON[c.lvl] || ""} ${esc(c.text)}</li>`).join("") : `<li class="good">${I("circle-check")} เวลาพอ${e.mode === "car" ? " ไม่ขับตอนมืด" : ""}</li>`}</ul>
          ${i === N ? `<details class="lastday" open><summary><b>เช็กลิสต์วันกลับ</b></summary><ul class="tip-list small">
            <li>เช็กเอาท์ ตรวจของในห้อง/ตู้เย็น/ที่ชาร์จ</li>${e.mode === "car" ? "<li>เติมน้ำมันเต็มถังใกล้ร้านคืนรถ (เก็บใบเสร็จ)</li><li>คืนรถ + นั่งรถรับส่งไปอาคารผู้โดยสาร</li>" : "<li>เช็กเวลารถไฟ/บัสไปสนามบิน เผื่อหิมะ</li>"}
            <li>ของเหลว/มีด/สเปรย์ ใส่กระเป๋าโหลด • ชั่งน้ำหนักกระเป๋า</li><li>ของ tax-free ห้ามแกะก่อนออกนอกประเทศ</li><li>เงินเยนเหลือ: ใช้ในสนามบิน หรือเติม IC card</li></ul></details>` : ""}
          <details class="no-print daynote" ${day.note || day.planB ? "open" : ""}><summary>${I("notebook-pen")} โน้ต / แผนสำรอง</summary>
            <textarea data-dnote="${i}" rows="2" placeholder="โน้ตวันนี้ เช่น เลขจองทัวร์">${esc(day.note || "")}</textarea>
            <textarea data-dplanb="${i}" rows="2" placeholder="แผนสำรองถ้าถนนปิด/พายุหิมะ">${esc(day.planB || "")}</textarea></details>
        </div>
      </div>
      <div class="day-tools no-print">
        ${i < N ? `<label class="f">คืนนี้พักเมือง <small>${hotelOf(S.plan.bases[i])?.name ? esc(hotelOf(S.plan.bases[i]).name) : "ใส่โรงแรมจริงในหน้าที่พัก"}</small><select data-base="${i}">${hubOptions(S.plan.bases[i])}</select></label>` : ""}
        ${i > 0 ? `<label class="f">เริ่มวัน<input type="time" data-dstart="${i}" value="${esc(day.start || "")}"></label>` : ""}
        <div class="row" style="align-self:end">
          <button class="btn small primary" data-addmenu="${i}">+ เพิ่มสถานที่/มื้อ</button>
          <button class="btn small" data-act="opt" data-i="${i}" title="เรียงจุดใหม่ให้ระยะทางสั้นสุด: เริ่มจากที่พักเมื่อคืน ไปจุดที่ใกล้สุดก่อนทีละจุด จุดที่ล็อกเวลาแทรกตามเวลา">${I("arrow-up-down")} เรียงเส้นทาง</button>
          <a class="btn small" target="_blank" rel="noopener" href="${dirUrl(pts, e.mode)}">${I("navigation")} Google Maps</a>
          <button class="btn small" data-daymenu="${i}" aria-label="เพิ่มเติม" title="สลับวัน / จัดวันนี้ใหม่">⋯</button></div>
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
    Modal.open(`<h2>วันที่ ${i + 1}</h2>
      <h3>${I("arrow-left-right")} สลับแผนกับวันอื่น</h3><p class="mute small">สลับที่เที่ยว โน้ต และแผนสำรองทั้งวัน ที่พักแต่ละคืนคงเดิม ระบบจะเตือนถ้าไกลจากที่พักเกินไป</p>
      <div class="move-days">${S.plan.days.map((_, k) => k === i ? "" : `<button class="btn" data-swap="${k}">วันที่ ${k + 1}<small>${esc(short(Planner.ends(k).to))}</small></button>`).join("")}</div>
      <h3 style="margin-top:14px">${I("refresh-ccw")} จัดวันนี้ใหม่</h3><p class="mute small">เปลี่ยนจุดที่ระบบเลือกให้ ที่ใส่เองและที่ล็อกเวลาไว้ยังอยู่</p>
      <button class="btn" data-refill>${I("refresh-ccw")} จัดวันนี้ใหม่</button>`);
    $("#modal").onclick = (ev) => {
      if (ev.target === $("#modal") || ev.target.closest("[data-close]")) return Modal.close();
      const sw = ev.target.closest("[data-swap]")?.dataset.swap;
      if (sw !== undefined) { this.mut(() => Planner.swapDays(i, +sw)); Modal.close(); return toast(`สลับวันที่ ${i + 1} กับ ${+sw + 1} แล้ว (กด ↶ ย้อนได้)`); }
      if (ev.target.closest("[data-refill]")) { this.mut(() => Planner.autofillDay(i, Planner.usedSet(i))); Modal.close(); }
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
        const it = { id, u: true, at: $("#cAt").value || undefined };
        Planner.insertBest(i, it);
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
    this.mut(() => Planner.insertBest(+i, Planner.mkItem(+i, id, true)));
    toast(`ใส่ในวันที่ ${+i + 1} แล้ว`);
  },

  // ================= ที่พัก =================
  renderStays() {
    const sec = $('[data-sec="stays"]');
    if (!S.plan) return GuideView.stay();
    const blocks = [];
    S.plan.bases.forEach((b, i) => { const l = blocks[blocks.length - 1]; if (l && l.b === b) l.n.push(i); else blocks.push({ b, n: [i] }); });
    const ids = [...new Set(S.plan.bases)];
    sec.innerHTML = `${this.steps("stays")}<div class="sec-head"><h1>ที่พักและการจอง</h1><p class="lead"><b>ไม่บังคับ</b> ทำหลังจองแล้ว: ไม่กรอก ระบบใช้จุดกลางเมืองเป็นจุดเริ่ม/จบของแต่ละวันแทน • เมืองที่พักแต่ละคืนเลือกในหน้า <a href="#trip">แผนรายวัน</a> (คืนนี้พักเมือง)</p>
        <ul class="small mute" style="margin:6px 0 0;padding-left:18px"><li><b>ชื่อ</b>: แสดงในแผนรายวัน "ถึงที่พัก…"</li><li><b>ตำแหน่ง</b>: ใช้เป็นจุดออกตอนเช้า/กลับตอนเย็นแทนกลางเมือง เวลาเดินทางแม่นขึ้น</li><li><b>เช็กอิน/เช็กเอาท์</b>: เตือนถ้าถึงก่อนเช็กอิน/ออกหลังเช็กเอาท์ และเวลาออกไปเที่ยวหลังเช็กอิน</li><li>ที่เหลือ (ชื่อญี่ปุ่น ที่อยู่ เลขจอง ฯลฯ): ใช้ทำการ์ดโชว์แท็กซี่ และสรุปการจองตอนเช็กอิน</li></ul></div>
      <a class="callout info" href="#emergency" style="display:block;text-decoration:none;color:inherit">${I("clipboard-list")} <b>สรุปการจองทั้งหมด</b> (เที่ยวบิน ที่พัก รอบที่จอง เอกสาร) อยู่ที่หน้า <u>เอกสาร + ฉุกเฉิน</u> เปิดโชว์พนักงานได้ ใช้ออฟไลน์ได้ →</a>
      <details class="callout info"><summary><b>หลักเลือกที่พักหน้าหนาว</b></summary>${STAY_TIPS}</details>
      <div class="card"><div class="map" id="stayMap"></div></div>
      ${ids.map((id) => { const h = hotelOf(id) || {}, nights = blocks.filter((x) => x.b === id).flatMap((x) => x.n), hb = HUB[id]; return `<div class="card stay-card" data-hub="${id}">
        <div class="row"><h2 style="margin:0">${I("hotel")} ${esc(hb.name)}</h2><span class="badge b-info">${nights.length} คืน: ${nights.map((k) => thDate(Planner.dayIso(k), false).replace(/ \d+$/, "")).join(", ")}</span>${h.name ? '<span class="badge b-good">กรอกแล้ว</span>' : '<span class="badge b-warn">ยังไม่ได้กรอก</span>'}</div>
        <div class="form" style="margin-top:10px">
          <label class="f">ชื่อที่พัก<input type="text" data-h="name" value="${esc(h.name || "")}"></label>
          ${LocPick.html("ตำแหน่งที่พัก", 'data-h="loc"', h.loc || "", hb)}
          <label class="f">เช็กอิน<input type="time" data-h="checkIn" value="${esc(h.checkIn || "15:00")}"></label>
          <label class="f">เช็กเอาท์<input type="time" data-h="checkOut" value="${esc(h.checkOut || "10:00")}"></label>
        </div>
        <details style="margin-top:8px" ${h.nameJa || h.addr || h.ref || h.phone || h.url || h.note ? "open" : ""}><summary>ข้อมูลการจอง <span class="mute small">ไม่บังคับ: การ์ดโชว์แท็กซี่ + สรุปการจอง</span></summary><div class="form" style="margin-top:8px">
          <label class="f">ชื่อญี่ปุ่น (โชว์แท็กซี่)<input type="text" data-h="nameJa" value="${esc(h.nameJa || "")}"></label>
          <label class="f">ที่อยู่<input type="text" data-h="addr" value="${esc(h.addr || "")}"></label>
          <label class="f">เลขที่จอง<input type="text" data-h="ref" value="${esc(h.ref || "")}"></label>
          <label class="f">เบอร์โทร<input type="text" data-h="phone" value="${esc(h.phone || "")}"></label>
          <label class="f">ลิงก์การจอง<input type="url" data-h="url" value="${esc(h.url || "")}"></label>
          <label class="f">โน้ต (ที่จอดรถ อาหารเย็น ฯลฯ)<input type="text" data-h="note" value="${esc(h.note || "")}"></label>
        </div></details>
        <div class="row" style="margin-top:8px">${h.lat ? `<span class="badge b-good">${I("map-pin")} ใช้พิกัดจริง</span>` : '<span class="mute small">ยังไม่มีพิกัด ใช้จุดกลางเมือง</span>'}
          ${h.nameJa || h.addr ? `<button class="btn small" data-showcard="${id}">${I("car-taxi-front")} การ์ดโชว์คนขับ</button>` : ""}${h.url ? `<a class="btn small" href="${esc(h.url)}" target="_blank" rel="noopener">เปิดการจอง</a>` : ""}
          <span class="spacer"></span><span class="mute small">ค้นที่พัก:</span>${BOOKING_SITES.map((b) => `<a class="btn small" target="_blank" rel="noopener" href="${b.url(HUB_EN[id] || hb.name)}">${b.name}</a>`).join("")}</div>
        <details class="hubinfo"><summary>ย่านที่ควรพัก ข้อดี ข้อควรรู้ • ¥${fmtN(hb.price[S.trip.level])}/ห้อง/คืน (ประมาณ ระดับ${["ประหยัด", "กลาง", "สบาย"][S.trip.level]})</summary>
          <dl class="kv"><dt>พักย่านไหน</dt><dd>${esc(hb.stay)}</dd><dt>ข้อดี</dt><dd>${esc(hb.pros)}</dd><dt>ข้อควรรู้</dt><dd>${esc(hb.cons)}</dd><dt>ช่วงพีค</dt><dd>${esc(hb.peak)}</dd></dl></details></div>`; }).join("")}`;
    TripMap.drawBases(makeMap($("#stayMap")));
  },

  // ================= โหมดวันนี้ =================
  renderToday() {
    const sec = $('[data-sec="today"]');
    if (!S.plan) { sec.innerHTML = `<div class="card empty">สร้างแผนก่อน <a href="#setup">ไปหน้าข้อมูลทริป</a></div>`; return; }
    const now = jstNow(), N = tripNights();
    const real = daysBetween(S.trip.start, now.iso), during = real >= 0 && real <= N;
    const i = this.todayI ?? (during ? real : 0);
    const day = S.plan.days[i];
    const live = (this.live ?? true) && during && i === real; // ระหว่างทริปคิดเวลาจากตอนนี้เลย (ตื่นสาย/รถช้าก็เห็นทันที)
    let from = Planner.ends(i).from;
    day.items.forEach((it) => { if (it.st === "done" && point(it.id)?.lat) from = it.id; });
    const e = live ? Planner.evaluate(i, null, { live: { t: Math.max(now.h, i === 0 ? Planner.leaveAirport(Planner.modeOf(i)) : 0), from } }) : Planner.evaluate(i);
    const nowH = during && i === real ? now.h : null;
    const visits = e.tl.filter((x) => x.kind === "visit");
    const next = visits.find((x) => !x.it.st && (nowH == null || x.t + x.h > nowH)) || null;
    const np = next ? point(next.id) : null, ref = point(e.to);
    const legM = next?.it.m || Planner.modeOf();
    const navUrl = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=${{ transit: "transit", walk: "walking" }[legM] || "driving"}`;
    sec.innerHTML = `<div class="sec-head"><h1>วันนี้</h1>
      <p class="lead">${during ? `วันที่ ${real + 1} ของทริป • ตอนนี้ ${fmtT(now.h)} (เวลาญี่ปุ่น)` : real < 0 ? `ทริปเริ่มอีก ${-real} วัน: ดูตัวอย่างหน้าวันนี้ได้ด้านล่าง` : "ทริปจบแล้ว"}</p>
      <div class="row"><label class="f">ดูวัน<select id="tdDay">${S.plan.days.map((_, k) => `<option value="${k}" ${k === i ? "selected" : ""}>วันที่ ${k + 1} • ${thDate(Planner.dayIso(k), false)}</option>`).join("")}</select></label></div></div>
      ${(() => { const h = hotelOf(e.to);
        return `<div class="quick no-print">${h?.nameJa || h?.addr ? `<button class="btn" data-showcard="${esc(e.to)}">${I("car-taxi-front")}<span>การ์ดที่พัก</span></button>` : ""}
          <a class="btn" href="#emergency">${I("clipboard-list")}<span>การจอง</span></a><a class="btn red" href="#emergency">${I("life-buoy")}<span>ฉุกเฉิน</span></a></div>`; })()}
      <div class="card today-head"><div class="row"><b>${thDate(e.iso)}</b><span>${I("sun")} ${fmtT(e.sun.rise)}-${fmtT(e.sun.set)}</span><span class="wx" data-wx="${ref.lat},${ref.lng},${e.iso}"></span><span class="badge b-${e.lvl}">${LVL_TXT[e.lvl]}</span></div>
        <div class="day-meta">${esc(short(e.from))} → ${esc(short(e.to))}${e.leaveBy != null ? ` • ต้องออกจากที่พักไม่เกิน <b>${fmtT(e.leaveBy)}</b>` : ""}</div></div>
      ${np ? `<div class="card next-card"><div class="kicker">ถัดไป ${fmtT(next.t)}</div>
        ${np.img ? `<img src="${np.img}" alt="" class="next-img">` : ""}<h2>${nameHtml(np)}</h2>
        <p class="small">${esc(np.highlight || np.signature || "")}</p>${np.caution ? `<p class="small cau">${I("triangle-alert")} ${esc(np.caution)}</p>` : ""}
        <div class="row">${np.lat ? `<a class="btn primary" href="${navUrl(np)}" target="_blank" rel="noopener">${I(LEG_MODE[legM].ic)} นำทางจากตำแหน่งฉัน</a>` : ""}${np.ja ? `<button class="btn" data-showcard-id="${esc(next.id)}">${I("car-taxi-front")} การ์ดโชว์คนขับ</button>` : ""}
          <button class="btn" data-st="${i}:done:${esc(next.id)}">✓ ไปแล้ว</button><button class="btn" data-st="${i}:skip:${esc(next.id)}">ข้าม</button></div></div>`
        : `<div class="card empty">ไม่มีที่เที่ยวที่เหลือในวันนี้${e.items.length ? "" : ": เพิ่มได้ในหน้าแผนรายวัน"}</div>`}
      <div class="card"><div class="row"><h3 style="margin:0">ทั้งวัน</h3><div class="spacer"></div>${during && i === real ? `<button class="btn small ${live ? "primary" : ""}" id="tdLive">${live ? I("circle-check") + " คำนวณจากตอนนี้" : I("refresh-ccw") + " คำนวณเวลาที่เหลือจากตอนนี้"}</button>` : ""}</div>
        <ul class="tl today-tl">${e.tl.map((x) => {
          const past = nowH != null && x.t + (x.h || 0) < nowH;
          if (x.kind === "visit") { const p = point(x.id), st = x.it.st; return `<li class="${past ? "past" : ""} ${x === next ? "is-next" : ""}"><span class="tm">${fmtT(x.t)}</span><span class="ic">${st === "done" ? I("circle-check") : st === "skip" ? I("skip-forward") : KIND_IC(x.id)}</span><span><b>${nameHtml(p)}</b> <small>${fmtH(x.h)}</small>${x.it.note ? `<div class="note">📝 ${esc(x.it.note)}</div>` : ""}</span></li>`; }
          if (x.kind === "move") return `<li class="mv ${past ? "past" : ""}"><span class="tm">${fmtT(x.t)}</span><span class="ic">${I(LEG_MODE[x.mode]?.ic || "car")}</span><span class="move">→ ${esc(short(x.to))} ${fmtH(x.h)}${x.by ? " • " + esc(x.by.join(" → ")) : ""}</span></li>`;
          if (x.kind === "hotel" || x.kind === "airport") return `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I(x.kind === "hotel" ? "hotel" : "plane")}</span><span><b>${x.kind === "hotel" ? "ถึงที่พัก" : "ถึงสนามบิน"} ${esc(hotelOf(x.id)?.name || pname(x.id))}</b></span></li>`;
          return x.text ? `<li><span class="tm">${fmtT(x.t)}</span><span class="ic">${I(x.ic || "info")}</span><span class="mute">${esc(x.text)}</span></li>` : "";
        }).join("")}</ul>
        ${day.items.some((it) => it.st) ? `<button class="btn small" id="tdReset">ล้างสถานะไปแล้ว/ข้าม</button>` : ""}
        <ul class="checks">${e.checks.map((c) => `<li class="${c.lvl}">${LVL_ICON[c.lvl] || ""} ${esc(c.text)}</li>`).join("")}</ul>
        ${day.note || day.planB ? `<div class="callout info">${day.note ? `${I("notebook-pen")} ${esc(day.note)}` : ""}${day.planB ? `<br>${I("route")} แผนสำรอง: ${esc(day.planB)}` : ""}</div>` : ""}</div>
      <div class="card"><h3>ลิงก์ด่วน</h3><div class="row">
        ${Planner.modeOf(i) === "car" && isWinter(e.iso) ? `<a class="btn small" href="#guide">${I("snowflake")} ขับบนหิมะ อ่านก่อนออก</a>` : ""}
        <a class="btn small" href="#guide">${I("store")} คอนบินิ ห้องน้ำ ภาษี ทิป</a>
        <a class="btn small" href="https://www.jartic.or.jp/" target="_blank" rel="noopener">สภาพถนน (JARTIC)</a>
        <a class="btn small" href="https://tenki.jp/forecast/1/" target="_blank" rel="noopener">พยากรณ์ tenki.jp</a>
        <a class="btn small" href="https://www.jrhokkaido.co.jp/global/english/" target="_blank" rel="noopener">JR Hokkaido (รถเลื่อน/ยกเลิก)</a>
        <a class="btn small" href="https://www.google.com/maps/search/コンビニ/" target="_blank" rel="noopener">${I("store")} คอนบินิใกล้ฉัน</a>
        <a class="btn small" href="https://www.google.com/maps/search/ガソリンスタンド/" target="_blank" rel="noopener">${I("fuel")} ปั๊มใกล้ฉัน</a></div></div>`;
    Weather.fill(sec);
  },

  // ================= event =================
  bind() {
    const trip = $('[data-sec="trip"]'), setup = $('[data-sec="setup"]'), stays = $('[data-sec="stays"]'), today = $('[data-sec="today"]');
    // ---- ข้อมูลทริป ----
    setup.addEventListener("change", (ev) => {
      const el = ev.target, t = S.trip;
      this.mut(() => {
        if (el.dataset.k) {
          const k = el.dataset.k;
          t[k] = el.type === "checkbox" ? el.checked : el.type === "number" ? Math.max(+el.min || 0, Math.min(+el.max || 99, +el.value || 0)) : k === "level" ? +el.value : el.value;
          if (k === "start" && t.end <= t.start) t.end = addDays(t.start, Math.max(1, t.nights));
          if (k === "start" || k === "end") Planner.syncDays();
        } else if (el.dataset.of) t.outFlight[el.dataset.of] = el.value;
        else if (el.dataset.if) t.inFlight[el.dataset.if] = el.value;
        else if (el.dataset.buf) t.buf[el.dataset.buf] = Math.max(0, +el.value || 0);
        // ขาไปถึงอีกวัน: เดาวันลงจากเวลาออก (ไทย +2 ชม. + ~7 ชม.บิน) ถ้าวันลงยังไม่ได้แก้
        if (el.dataset.of === "dep" && el.value) { const d = new Date(el.value); d.setHours(d.getHours() + 2 + 7); const iso = isoOf(d); if (iso !== t.start) { const n = tripNights(); t.start = iso; t.end = addDays(iso, Math.max(1, n)); Planner.syncDays(); toast(`ตั้งวันลงเป็น ${thDate(iso)} ตามเวลาออก (ตรวจเวลาเครื่องลงอีกครั้ง)`); } }
      });
    });
    setup.addEventListener("click", (ev) => {
      const el = ev.target.closest("button, [data-tpl], [data-blank]");
      if (!el) return;
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
        $$("[data-mapday]").forEach((b) => b.classList.toggle("on", b === el));
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
    });
    trip.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.dataset.goto) ev.target.click(); });

    // ---- ที่พัก ----
    stays.addEventListener("change", (ev) => {
      const el = ev.target, k = el.dataset.h, hub = el.closest("[data-hub]")?.dataset.hub;
      if (!k || !hub) return;
      this.mut(() => {
        const h = (S.plan.hotels[hub] ||= {});
        h[k] = el.value.trim();
        if (k === "loc") { const ll = parseLatLng(h.loc); if (ll) Object.assign(h, ll); else { delete h.lat; delete h.lng; if (h.loc) toast("ลิงก์นี้ไม่มีพิกัด (ลิงก์แชร์แบบสั้น) ใช้ปุ่ม แตะบนแผนที่ แทน"); } }
      });
    });
    stays.addEventListener("click", (ev) => {
      const id = ev.target.closest("[data-showcard]")?.dataset.showcard;
      if (id) { const h = hotelOf(id); showCard({ name: h.name, ja: h.nameJa || h.name, addrJa: h.addr, phone: h.phone }); }
    });

    // ---- วันนี้ ----
    today.addEventListener("change", (ev) => { if (ev.target.id === "tdDay") { this.todayI = +ev.target.value; App.renderAll(); } });
    today.addEventListener("click", (ev) => {
      const el = ev.target.closest("button"); if (!el) return;
      if (el.dataset.st) {
        const [i, st, ...rest] = el.dataset.st.split(":"), raw = rest.join(":"), id = isNaN(raw) ? raw : +raw;
        const it = S.plan.days[+i].items.find((x) => x.id === id);
        if (it) { it.st = st; save(); App.renderAll(); }
      } else if (el.id === "tdLive") { this.live = !(this.live ?? true); App.renderAll(); }
      else if (el.id === "tdReset") { S.plan.days.forEach((d) => d.items.forEach((x) => delete x.st)); save(); App.renderAll(); }
      else if (el.dataset.showcardId) { const raw = el.dataset.showcardId; showCard(point(isNaN(raw) ? raw : +raw)); }
      else if (el.dataset.showcard) { const h = hotelOf(el.dataset.showcard); showCard({ name: h.name, ja: h.nameJa || h.name, addrJa: h.addr, phone: h.phone }); }
    });
  },
};
