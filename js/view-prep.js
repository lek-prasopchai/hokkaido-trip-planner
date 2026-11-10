// แท็บ "เตรียมตัว": สิ่งที่ต้องทำก่อนบิน และจัดกระเป๋า
const PrepView = {
  allTasks() {
    const m = Planner.usedModes();
    return [...PREP_TASKS, ...GUIDE.extraPrep].filter((x) => x.mode === "all" || m.has(x.mode))
      .sort((a, b) => b.days - a.days);
  },
  tasks() { return this.allTasks().filter((x) => !x.opt); },
  progress() {
    const T = this.tasks(), today = todayIso();
    const done = T.filter((x) => S.prep[x.id]).length;
    const overdue = T.filter((x) => !S.prep[x.id] && addDays(S.trip.start, -x.days) < today).length;
    const bookDone = T.filter((x) => /^จอง/.test(x.task)).every((x) => S.prep[x.id]);
    return { done, total: T.length, pct: T.length ? Math.round((done / T.length) * 100) : 0, overdue, bookDone };
  },
  render() {
    const T = this.tasks(), today = todayIso(), pr = this.progress(), O = this.allTasks().filter((x) => x.opt);
    const phases = [...new Set(T.map((x) => x.phase))];
    const row = (x) => { const due = addDays(S.trip.start, -x.days), d = !!S.prep[x.id];
      return `<tr class="${d ? "done" : due < today && !x.opt ? "over" : ""}"><td><input type="checkbox" data-task="${x.id}" ${d ? "checked" : ""} aria-label="เสร็จแล้ว"></td>
      <td>${thDate(due, false)}</td><td><b>${esc(x.task)}</b>${TASK_LINK[x.id] ? ` <a class="small no-print" href="#${TASK_LINK[x.id]}">ไปหน้า ${pageName(TASK_LINK[x.id])} →</a>` : ""}</td><td>${esc(x.detail)}</td><td><span class="badge b-mute">${esc(x.cat)}</span></td></tr>`; };
    const head = '<thead><tr><th style="width:34px"></th><th style="width:110px">ครบกำหนด</th><th>งาน</th><th>ทำไม / รายละเอียด</th><th>หมวด</th></tr></thead>';
    $('[data-sec="prep"]').innerHTML = `
      <div class="sec-head"><h1>สิ่งที่ต้องทำก่อนบิน</h1>
        <p class="lead">วันครบกำหนดคำนวณจากวันบิน ${thDate(S.trip.start)} ถ้าเลยกำหนดแล้วยังไม่เสร็จ แถวจะเป็นสีแดง งานแสดงตามวิธีเดินทางที่เลือก (${MODE[S.trip.mode]})</p></div>
      <div class="card"><div class="row"><b>เสร็จ ${pr.done}/${pr.total}</b>${pr.overdue ? `<span class="badge b-bad">เลยกำหนด ${pr.overdue}</span>` : ""}<div class="spacer"></div><span>${pr.pct}%</span></div>
        <div class="bar" style="margin-top:6px"><i style="width:${pr.pct}%"></i></div></div>
      ${phases.map((ph) => `<div class="card"><h2>${esc(ph)}</h2><div class="tbl-wrap"><table class="t">${head}<tbody>
        ${T.filter((x) => x.phase === ph).map(row).join("")}
      </tbody></table></div></div>`).join("")}
      ${O.length ? `<details class="card opt"><summary><b>ของเสริม (ไม่บังคับ)</b> <small>${O.length} งานพื้นฐาน ไม่นับในความคืบหน้า</small></summary>
        <div class="tbl-wrap"><table class="t">${head}<tbody>${O.map(row).join("")}</tbody></table></div></details>` : ""}`;
  },
  bind() {
    $('[data-sec="prep"]').addEventListener("change", (e) => {
      const id = e.target.dataset.task;
      if (!id) return;
      if (e.target.checked) S.prep[id] = true; else delete S.prep[id];
      save(); App.renderAll();
    });
  },
};

const CAT_ICON = { "เอกสาร": "file-text", "เงิน": "banknote", "เสื้อผ้า-ชั้นใน/กลาง": "shirt", "เสื้อผ้า-ชั้นนอก": "shirt", "หัว-มือ-เท้า": "hand", "ผิวและร่างกาย": "droplet",
  "ยาและสุขภาพ": "pill", "อิเล็กทรอนิกส์": "plug", "แอปและข้อมูลในมือถือ": "smartphone", "ของในรถ": "car", "กระเป๋าและจัดเก็บ": "luggage", "ของจิปาถะ": "paperclip",
  "กิจกรรม": "cable-car", "กล้องและความทรงจำ": "camera", "เด็กเล็ก": "baby", "ขากลับ": "plane-takeoff" };

const TASK_LINK = { x2: "stays", x8: "trip", x9: "trip", x10: "packing", x11: "packing", x13: "guide", x18: "stays", x21: "emergency", x24: "packing", x33: "guide" };
const pageName = (id) => TAB_OF[id]?.subs.find(([k]) => k === id)?.[1] || id;

const PackingView = {
  carOnly: (x) => ["คัน", "คนขับ"].includes(x.per) || x.cat === "ของในรถ" || /IDP|ใบขับขี่|รถเช่า|ETC/.test(x.name),
  // when = เงื่อนไขแสดง { mode, kids, season: "winter"|"warm", tag } ไม่เข้าเงื่อนไขก็ซ่อน
  relevant(x) {
    const t = S.trip, w = x.when || {}, winter = isWinter(t.start) || isWinter(t.end);
    const used = Planner.usedModes();
    if (!used.has("car") && this.carOnly(x)) return false;
    if (w.mode && !used.has(w.mode)) return false;
    if (w.kids && !t.kids) return false;
    if (w.season === "winter" && !winter) return false;
    if (w.season === "warm" && winter) return false;
    if (w.tag && !t.interests.includes(w.tag)) return false;
    return true;
  },
  ok: (x) => { const s = S.packing[x.id]?.status; return !!s && s !== "todo"; }, // status: ค่าจากเวอร์ชันก่อน (ready/packed) ยังนับ
  qty(x) {
    const t = S.trip, ppl = t.adults + t.kids;
    return { "คน": x.qty * ppl, "คน×วัน": x.qty * ppl * (tripNights() + 1), "คนขับ": x.qty * Math.max(1, t.drivers) }[x.per] ?? x.qty;
  },
  list() { return PACKING.filter((x) => this.relevant(x)); },
  progress() {
    const L = this.list(), ok = L.filter((x) => this.ok(x)).length;
    return { ok, total: L.length, pct: L.length ? Math.round((ok / L.length) * 100) : 0 };
  },
  render() {
    const L = this.list(), pr = this.progress(), g = {};
    L.forEach((x) => (g[x.cat] ||= []).push(x));
    $('[data-sec="packing"]').innerHTML = `
      <div class="sec-head"><h1>ของจำเป็น</h1>
        <p class="lead">${L.length} อย่างที่ขาดไม่ได้สำหรับทริปนี้ (${[...Planner.usedModes()].map((m) => LEG_MODE[m]?.name || m).join(", ")}${isWinter(S.trip.start) ? ", หน้าหนาว" : ""}) จำนวนคิดจาก ${S.trip.adults + S.trip.kids} คน × ${tripNights() + 1} วัน • ของทั่วไปอื่นๆ จดในแอปโน้ตของคุณ</p></div>
      <div class="card"><div class="row"><b>พร้อมแล้ว ${pr.ok}/${pr.total}</b><div class="spacer"></div><span>${pr.pct}%</span></div><div class="bar" style="margin-top:6px"><i style="width:${pr.pct}%"></i></div></div>
      ${Object.entries(g).map(([c, xs]) => `<div class="card pk-cat"><h3>${I(CAT_ICON[c] || "package")} ${esc(c)} <small>${xs.filter((x) => this.ok(x)).length}/${xs.length}</small></h3>
        ${xs.map((x) => `<label class="pk3 ${this.ok(x) ? "done" : ""}"><input type="checkbox" data-ok="${x.id}" ${this.ok(x) ? "checked" : ""}>
          <span><b>${esc(x.name)}</b> <span class="mute">×${this.qty(x)}</span>${x.spec ? `<small>${esc(x.spec)}</small>` : ""}</span></label>`).join("")}</div>`).join("")}`;
  },
  bind() {
    $('[data-sec="packing"]').addEventListener("change", (e) => {
      const id = e.target.dataset.ok;
      if (!id) return;
      (S.packing[id] ||= {}).status = e.target.checked ? "ready" : "todo";
      save(); App.renderAll();
    });
  },
};
