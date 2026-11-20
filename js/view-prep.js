// เมนู "เตรียมตัว": สิ่งที่ต้องทำ, จัดกระเป๋า (เตรียมตัว) + ขับรถหน้าหนาว, ใช้ชีวิตที่นั่น (คู่มือ)
// กรองตามทริป (วิธีเดินทาง ฤดู) เหมือนเดิม กด "แสดงทั้งหมด" ดูรายการที่ซ่อนได้
const PREP_SUBS = [["เตรียมตัว", [["prep", "สิ่งที่ต้องทำ"], ["packing", "จัดกระเป๋า"]]], ["คู่มือ", [["drive", "ขับรถหน้าหนาว"], ["life", "ใช้ชีวิตที่นั่น"]]]];
const PREP_IDS = PREP_SUBS.flatMap(([, s]) => s.map(([id]) => id));
const CAT_ICON = { "เอกสาร": "file-text", "เงิน": "banknote", "เสื้อผ้า-ชั้นใน/กลาง": "shirt", "เสื้อผ้า-ชั้นนอก": "shirt", "หัว-มือ-เท้า": "hand", "ผิวและร่างกาย": "droplet",
  "ยาและสุขภาพ": "pill", "อิเล็กทรอนิกส์": "plug", "ของในรถ": "car", "กระเป๋าและจัดเก็บ": "luggage", "ของจิปาถะ": "paperclip", "เด็กเล็ก": "baby",
  "กิจกรรม": "cable-car", "กล้องและความทรงจำ": "camera", "ขากลับ": "plane-takeoff" };
const TASK_LINK = { t1: "budget", x0: "setup", x3: "drive", x26: "life", x2: "stays", x8: "trip", x9: "trip", x10: "packing", x11: "packing", x13: "drive", x18: "stays", x24: "packing", x33: "drive" };
const PAGE_NAME = { budget: "งบประมาณ", setup: "ข้อมูลทริป", life: "ใช้ชีวิตที่นั่น", stays: "ที่พัก", trip: "แผนรายวัน", packing: "จัดกระเป๋า", drive: "ขับรถหน้าหนาว" };
// งานที่ติ๊กเองจากข้อมูลในเว็บ: [เงื่อนไข, เหตุผลที่แสดง]
const TASK_AUTO = {
  x2: [() => tripNights() > 0 && Array.from({ length: tripNights() }, (_, k) => Planner.stayAt(k)).every(Boolean), "กรอกที่พักครบทุกคืนแล้ว"],
  x8: [() => !!S.plan, "มีแผนรายวันแล้ว"],
  x24: [() => { const p = PackingView.progress(); return p.total > 0 && p.ok === p.total; }, "ติ๊กครบในหน้าจัดกระเป๋าแล้ว"],
};

const Prep = {
  all: false, // แสดงรายการที่ไม่เกี่ยวกับทริปนี้ด้วย (ไม่บันทึก)
  car: () => Planner.usedModes().has("car"),
  winter: () => isWinter(S.trip.start) || isWinter(S.trip.end),
  head(id, title, lead) {
    return `<nav class="subnav no-print">${PREP_SUBS.map(([g, s]) => `<div><span>${g}</span>${s.map(([k, n]) => `<a href="#${k}" class="${k === id ? "on" : ""}">${n}${this.count(k)}</a>`).join("")}</div>`).join("")}</nav>
      <div class="sec-head"><h1>${title}</h1><p class="lead">${lead}</p></div>`;
  },
  // แถบบอกว่าซ่อนกี่รายการ + ปุ่มสลับ
  hidden(n, why) {
    return n ? `<div class="row no-print" style="margin-bottom:12px"><span class="mute small">${this.all ? `แสดงทั้งหมด รวม ${n} รายการที่ไม่เกี่ยวกับทริปนี้` : `ซ่อน ${n} รายการที่ไม่เกี่ยวกับทริปนี้ (${why})`}</span>
      <button class="btn small" data-prep-all>${this.all ? "ซ่อนที่ไม่เกี่ยว" : "แสดงทั้งหมด"}</button></div>` : "";
  },
  count(k) { const p = { prep: PrepView, packing: PackingView }[k]?.progress(); return p ? ` <small>${p.ok}/${p.total}</small>` : ""; },
  why() { return [this.car() ? "" : "ไม่ได้เช่ารถ", this.winter() ? "หน้าหนาว" : "ไม่ใช่หน้าหนาว"].filter(Boolean).join(", "); },
  off: '<span class="badge b-mute">ไม่เกี่ยวกับทริปนี้</span>',
  bind() {
    document.addEventListener("click", (e) => { if (e.target.closest("[data-prep-all]")) { this.all = !this.all; App.renderAll(); } });
    $('[data-sec="prep"]').addEventListener("change", (e) => {
      const id = e.target.dataset.task;
      if (!id) return;
      if (e.target.checked) S.prep[id] = true; else delete S.prep[id];
      save(); App.renderAll();
    });
    $('[data-sec="packing"]').addEventListener("change", (e) => {
      const id = e.target.dataset.ok;
      if (!id) return;
      if (e.target.checked) S.packing[id] = true; else delete S.packing[id];
      save(); App.renderAll();
    });
  },
};

const PrepView = {
  fits(x) { const m = Planner.usedModes(); return x.mode === "all" || m.has(x.mode); },
  allTasks: () => [...PREP_TASKS, ...GUIDE.extraPrep].sort((a, b) => b.days - a.days),
  tasks() { return this.allTasks().filter((x) => !x.opt && this.fits(x)); },
  auto: (x) => TASK_AUTO[x.id]?.[0]() || false,
  done(x) { return !!S.prep[x.id] || this.auto(x); },
  progress() { const T = this.tasks(); return { ok: T.filter((x) => this.done(x)).length, total: T.length }; },
  render() {
    const A = this.allTasks(), T = this.tasks(), today = todayIso(), soon = addDays(today, 14);
    const shown = A.filter((x) => !x.opt && (Prep.all || this.fits(x))), O = A.filter((x) => x.opt && (Prep.all || this.fits(x)));
    const due = (x) => addDays(S.trip.start, -x.days);
    const { ok, total } = this.progress(), pct = total ? Math.round((ok / total) * 100) : 0;
    const next = T.filter((x) => !this.done(x) && due(x) <= soon), overdue = next.filter((x) => due(x) < today).length;
    // รายการแบบเดียวกับหน้าจัดกระเป๋า: อ่านง่ายบนมือถือ สีแดง/เหลืองเฉพาะป้ายวันที่ (เลยกำหนด/ภายใน 14 วัน)
    const row = (x) => { const d = due(x), dn = this.done(x), au = this.auto(x), late = !dn && !x.opt && d < today, near = !dn && !x.opt && !late && d <= soon;
      return `<label class="pk3 ${dn ? "done" : ""}"><input type="checkbox" data-task="${x.id}" ${dn ? "checked" : ""} ${au ? "disabled" : ""} aria-label="เสร็จแล้ว">
        <span><b>${esc(x.task)}</b> <span class="due ${late ? "late" : near ? "near" : ""}">${late ? "เลยกำหนด " : "ภายใน "}${thDate(d, false)}</span>${this.fits(x) ? "" : " " + Prep.off}
        ${au ? `<small class="auto">${I("circle-check")} ติ๊กให้แล้ว: ${TASK_AUTO[x.id][1]}</small>` : ""}<small>${esc(x.detail)} <span class="mute">• ${esc(x.cat)}</span>${TASK_LINK[x.id] ? ` <a class="no-print" href="#${TASK_LINK[x.id]}">ไปหน้า ${PAGE_NAME[TASK_LINK[x.id]]} →</a>` : ""}</small></span></label>`; };
    $('[data-sec="prep"]').innerHTML = `${Prep.head("prep", "สิ่งที่ต้องทำก่อนบิน", `วันครบกำหนดนับจากวันบิน ${thDate(S.trip.start)} งานแสดงตามวิธีเดินทางที่เลือก (${Planner.modeLabel()}) บางงานติ๊กให้เองเมื่อทำในเว็บนี้แล้ว`)}
      ${Prep.hidden(A.filter((x) => !this.fits(x)).length, Prep.car() ? "งานของคนนั่งรถไฟ" : "งานเรื่องรถเช่า")}
      <div class="card"><div class="row"><b>เสร็จ ${ok}/${total}</b>${overdue ? `<span class="badge b-bad">เลยกำหนด ${overdue}</span>` : ""}<div class="spacer"></div><span>${pct}%</span></div>
        <div class="bar" style="margin-top:6px"><i style="width:${pct}%"></i></div></div>
      ${next.length ? `<div class="card next-up"><h2>${I("clock")} ทำต่อเลย <small>${next.length} งานที่เลยกำหนดหรือถึงกำหนดใน 14 วัน</small></h2>${next.map(row).join("")}</div>` : ""}
      ${[...new Set(shown.map((x) => x.phase))].map((ph) => `<div class="card"><h2>${esc(ph)}</h2>${shown.filter((x) => x.phase === ph).map(row).join("")}</div>`).join("")}
      ${O.length ? `<details class="card opt"><summary><b>ของเสริม (ไม่บังคับ)</b> <small>${O.length} งานพื้นฐาน ไม่นับในความคืบหน้า</small></summary>${O.map(row).join("")}</details>` : ""}`;
  },
};

const PackingView = {
  // when = เงื่อนไขแสดง { mode, season: "winter"|"warm", tag } (ไม่มีจำนวนคน/เด็กในทริปแล้ว: ของเด็กแสดงเสมอ อยู่หมวดเด็กเล็ก)
  carOnly: (x) => ["คัน", "คนขับ"].includes(x.per) || x.cat === "ของในรถ" || /IDP|ใบขับขี่|รถเช่า|ETC/.test(x.name),
  fits(x) {
    const w = x.when || {}, winter = Prep.winter(), used = Planner.usedModes();
    if (!used.has("car") && this.carOnly(x)) return false;
    if (w.mode && !used.has(w.mode)) return false;
    if (w.season === "winter" && !winter) return false;
    if (w.season === "warm" && winter) return false;
    if (w.tag && !S.trip.interests.includes(w.tag)) return false;
    return true;
  },
  ok: (x) => { const s = S.packing[x.id]; return s === true || (!!s?.status && s.status !== "todo"); }, // {status} = ค่าจากเวอร์ชันเก่า
  qty(x) {
    const days = tripNights() + 1;
    return { "คน": `${x.qty} ต่อคน`, "คน×วัน": `${x.qty * days} ต่อคน (${x.qty}/วัน × ${days} วัน)`, "คนขับ": `${x.qty} ต่อคนขับ`, "คัน": `${x.qty} ต่อคัน`, "กลุ่ม": `${x.qty} ต่อกลุ่ม` }[x.per] ?? `×${x.qty}`;
  },
  // รายการแยกหมวด: การ์ดละหมวด (รายการหลัก) หรือหัวข้อย่อยในกล่องของเสริม
  cats(xs, sub) {
    const g = {};
    xs.forEach((x) => (g[x.cat] ||= []).push(x));
    return Object.entries(g).map(([c, ys]) => `<div class="${sub ? "pk-sub" : "card"} pk-cat"><h3>${I(CAT_ICON[c] || "package")} ${esc(c)} <small>${ys.filter((x) => this.ok(x)).length}/${ys.length}</small></h3>
      ${ys.map((x) => `<label class="pk3 ${this.ok(x) ? "done" : ""}"><input type="checkbox" data-ok="${x.id}" ${this.ok(x) ? "checked" : ""}>
        <span><b>${esc(x.name)}</b> <span class="mute">${this.qty(x)}</span>${this.fits(x) ? "" : " " + Prep.off}${x.spec ? `<small>${esc(x.spec)}</small>` : ""}</span></label>`).join("")}</div>`).join("");
  },
  progress() { const L = PACKING.filter((x) => !x.opt && this.fits(x)); return { ok: L.filter((x) => this.ok(x)).length, total: L.length }; },
  render() {
    const V = PACKING.filter((x) => Prep.all || this.fits(x)), L = V.filter((x) => !x.opt && this.fits(x)), O = V.filter((x) => x.opt);
    const ok = L.filter((x) => this.ok(x)).length, pct = L.length ? Math.round((ok / L.length) * 100) : 0;
    $('[data-sec="packing"]').innerHTML = `${Prep.head("packing", "จัดกระเป๋า", `${L.length} อย่างที่ควรมีสำหรับทริปนี้ (${Planner.modeLabel()}${Prep.winter() ? ", หน้าหนาว" : ""}) ของเสริมพับไว้ท้ายหน้า`)}
      ${Prep.hidden(PACKING.filter((x) => !this.fits(x)).length, Prep.why())}
      <div class="card"><div class="row"><b>พร้อมแล้ว ${ok}/${L.length}</b><div class="spacer"></div><span>${pct}%</span></div><div class="bar" style="margin-top:6px"><i style="width:${pct}%"></i></div></div>
      ${this.cats(V.filter((x) => !x.opt), false)}
      ${O.length ? `<details class="card opt"><summary><b>ของเสริม (ไม่บังคับ)</b> <small>${O.length} อย่าง: มีก็ดี ของใช้พื้นฐาน อุปกรณ์กล้อง ไม่นับในความคืบหน้า</small></summary>${this.cats(O, true)}</details>` : ""}`;
  },
};

const GuideView = {
  // เช็กลิสต์เป็นกลุ่ม: ข้อไม่บังคับพับไว้ใต้แต่ละกลุ่ม
  checklists(L) {
    const li = (x) => `<li>${esc(x.text)}${x.why ? ` <small>(${esc(x.why)})</small>` : ""}</li>`;
    return `<div class="grid g2">${L.map((d) => { const opt = d.items.filter((x) => x.opt);
      return `<div><h3>${esc(d.title)}</h3><ul class="tip-list">${d.items.filter((x) => !x.opt).map(li).join("")}</ul>${opt.length ? `<details class="more"><summary>ของเสริม (ไม่บังคับ) ${opt.length} ข้อ</summary><ul class="tip-list">${opt.map(li).join("")}</ul></details>` : ""}</div>`; }).join("")}</div>`;
  },
  // แสดงเสมอ ไม่ว่าทริปจะเช่ารถหรือไม่
  drive() {
    $('[data-sec="drive"]').innerHTML = `${Prep.head("drive", "ขับรถหน้าหนาว", "อ่านให้จบก่อนรับรถ ตั้งแต่ตอนจองรถจนถึงรถติดหิมะกลางทาง")}
      ${Prep.car() ? "" : `<div class="callout info">ทริปนี้ไม่ได้เช่ารถ อ่านไว้เผื่อเปลี่ยนใจหรือเช่ารถบางวัน</div>`}
      <div class="card">${SHEET.driveTips.map((s, i) => `<details ${i < 3 ? "open" : ""} style="margin-bottom:8px"><summary><b>${esc(s.title)}</b></summary>
        <div class="tbl-wrap"><table class="t">${s.items.map((r) => `<tr><td style="width:28%"><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td class="mute">${esc(r[2])}</td></tr>`).join("")}</table></div></details>`).join("")}</div>
      <div class="card"><h2>เช็กลิสต์คนขับ</h2>${this.checklists(SHEET.driveDaily)}</div>`;
  },
  life() {
    $('[data-sec="life"]').innerHTML = `${Prep.head("life", "ใช้ชีวิตที่นั่น", "เรื่องในชีวิตประจำวันที่คนไทยมักไม่รู้ก่อนไป และเช็กลิสต์ที่ควรทำทุกวัน (เรื่องรถอยู่ในหน้าขับรถหน้าหนาว)")}
      <div class="grid g2">${GUIDE.life.map((c) => `<div class="card"><h3>${esc(c.title)}</h3><ul class="tip-list">${c.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>
      <div class="card"><h2>เช็กลิสต์ประจำวัน</h2>${this.checklists(SHEET.daily)}</div>
      <div class="card"><h2>กฎ ข้อห้าม และมารยาท</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>เรื่อง</th><th>กฎ</th><th>รายละเอียด</th></tr></thead>
        <tbody>${SHEET.rules.map((r) => `<tr><td><b>${esc(r.topic)}</b></td><td>${esc(r.rule)}</td><td>${esc(r.detail)}</td></tr>`).join("")}</tbody></table></div></div>
      <details class="card opt"><summary><b>ของเสริม (ไม่บังคับ): เก็บความทรงจำ</b> <small>เทคนิคถ่ายรูปหิมะและไอเดียบันทึกทริป</small></summary><div class="tbl-wrap"><table class="t"><thead><tr><th>หมวด</th><th>ทำอะไร</th><th>วิธี / เทคนิค</th></tr></thead>
        <tbody>${SHEET.memory.map((m) => `<tr><td>${esc(m.cat)}</td><td><b>${esc(m.item)}</b></td><td>${esc(m.how)}</td></tr>`).join("")}</tbody></table></div></details>`;
  },
};
