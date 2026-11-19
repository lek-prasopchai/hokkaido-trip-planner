// เมนู "เตรียมตัว": สิ่งที่ต้องทำ, จัดกระเป๋า (เตรียมตัว) + ขับรถหน้าหนาว, ใช้ชีวิตที่นั่น (คู่มือ)
// กรองตามทริป (วิธีเดินทาง ฤดู) เหมือนเดิม กด "แสดงทั้งหมด" ดูรายการที่ซ่อนได้
const PREP_SUBS = [["เตรียมตัว", [["prep", "สิ่งที่ต้องทำ"], ["packing", "จัดกระเป๋า"]]], ["คู่มือ", [["drive", "ขับรถหน้าหนาว"], ["life", "ใช้ชีวิตที่นั่น"]]]];
const PREP_IDS = PREP_SUBS.flatMap(([, s]) => s.map(([id]) => id));
const CAT_ICON = { "เอกสาร": "file-text", "เงิน": "banknote", "เสื้อผ้า-ชั้นใน/กลาง": "shirt", "เสื้อผ้า-ชั้นนอก": "shirt", "หัว-มือ-เท้า": "hand", "ผิวและร่างกาย": "droplet",
  "ยาและสุขภาพ": "pill", "อิเล็กทรอนิกส์": "plug", "ของในรถ": "car", "กระเป๋าและจัดเก็บ": "luggage", "ของจิปาถะ": "paperclip", "เด็กเล็ก": "baby" };
const TASK_LINK = { x2: "stays", x8: "trip", x9: "trip", x10: "packing", x11: "packing", x13: "drive", x18: "stays", x24: "packing", x33: "drive" };
const PAGE_NAME = { stays: "ที่พัก", trip: "แผนรายวัน", packing: "จัดกระเป๋า", drive: "ขับรถหน้าหนาว" };

const Prep = {
  all: false, // แสดงรายการที่ไม่เกี่ยวกับทริปนี้ด้วย (ไม่บันทึก)
  car: () => Planner.usedModes().has("car"),
  winter: () => isWinter(S.trip.start) || isWinter(S.trip.end),
  head(id, title, lead) {
    return `<nav class="subnav no-print">${PREP_SUBS.map(([g, s]) => `<div><span>${g}</span>${s.map(([k, n]) => `<a href="#${k}" class="${k === id ? "on" : ""}">${n}</a>`).join("")}</div>`).join("")}</nav>
      <div class="sec-head"><h1>${title}</h1><p class="lead">${lead}</p></div>`;
  },
  // แถบบอกว่าซ่อนกี่รายการ + ปุ่มสลับ
  hidden(n, why) {
    return n ? `<div class="row no-print" style="margin-bottom:12px"><span class="mute small">${this.all ? `แสดงทั้งหมด รวม ${n} รายการที่ไม่เกี่ยวกับทริปนี้` : `ซ่อน ${n} รายการที่ไม่เกี่ยวกับทริปนี้ (${why})`}</span>
      <button class="btn small" data-prep-all>${this.all ? "ซ่อนที่ไม่เกี่ยว" : "แสดงทั้งหมด"}</button></div>` : "";
  },
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
  render() {
    const A = this.allTasks(), T = this.tasks(), today = todayIso();
    const shown = A.filter((x) => !x.opt && (Prep.all || this.fits(x))), O = A.filter((x) => x.opt && (Prep.all || this.fits(x)));
    const done = T.filter((x) => S.prep[x.id]).length, pct = T.length ? Math.round((done / T.length) * 100) : 0;
    const overdue = T.filter((x) => !S.prep[x.id] && addDays(S.trip.start, -x.days) < today).length;
    const row = (x) => { const due = addDays(S.trip.start, -x.days), d = !!S.prep[x.id];
      return `<tr class="${d ? "done" : due < today && !x.opt ? "over" : ""}"><td><input type="checkbox" data-task="${x.id}" ${d ? "checked" : ""} aria-label="เสร็จแล้ว"></td>
      <td>${thDate(due, false)}</td><td><b>${esc(x.task)}</b>${this.fits(x) ? "" : " " + Prep.off}${TASK_LINK[x.id] ? ` <a class="small no-print" href="#${TASK_LINK[x.id]}">ไปหน้า ${PAGE_NAME[TASK_LINK[x.id]]} →</a>` : ""}</td><td>${esc(x.detail)}</td><td><span class="badge b-mute">${esc(x.cat)}</span></td></tr>`; };
    const head = '<thead><tr><th style="width:34px"></th><th style="width:110px">ครบกำหนด</th><th>งาน</th><th>ทำไม / รายละเอียด</th><th>หมวด</th></tr></thead>';
    $('[data-sec="prep"]').innerHTML = `${Prep.head("prep", "สิ่งที่ต้องทำก่อนบิน", `วันครบกำหนดคำนวณจากวันบิน ${thDate(S.trip.start)} ถ้าเลยกำหนดแล้วยังไม่เสร็จ แถวจะเป็นสีแดง งานแสดงตามวิธีเดินทางที่เลือก (${Planner.modeLabel()})`)}
      ${Prep.hidden(A.filter((x) => !this.fits(x)).length, Prep.car() ? "งานของคนนั่งรถไฟ" : "งานเรื่องรถเช่า")}
      <div class="card"><div class="row"><b>เสร็จ ${done}/${T.length}</b>${overdue ? `<span class="badge b-bad">เลยกำหนด ${overdue}</span>` : ""}<div class="spacer"></div><span>${pct}%</span></div>
        <div class="bar" style="margin-top:6px"><i style="width:${pct}%"></i></div></div>
      ${[...new Set(shown.map((x) => x.phase))].map((ph) => `<div class="card"><h2>${esc(ph)}</h2><div class="tbl-wrap"><table class="t">${head}<tbody>
        ${shown.filter((x) => x.phase === ph).map(row).join("")}
      </tbody></table></div></div>`).join("")}
      ${O.length ? `<details class="card opt"><summary><b>ของเสริม (ไม่บังคับ)</b> <small>${O.length} งานพื้นฐาน ไม่นับในความคืบหน้า</small></summary>
        <div class="tbl-wrap"><table class="t">${head}<tbody>${O.map(row).join("")}</tbody></table></div></details>` : ""}`;
  },
};

const PackingView = {
  // when = เงื่อนไขแสดง { mode, season: "winter"|"warm" } (ไม่มีจำนวนคน/เด็กในทริปแล้ว: ของเด็กแสดงเสมอ อยู่หมวดเด็กเล็ก)
  carOnly: (x) => ["คัน", "คนขับ"].includes(x.per) || x.cat === "ของในรถ" || /IDP|ใบขับขี่|รถเช่า|ETC/.test(x.name),
  fits(x) {
    const w = x.when || {}, winter = Prep.winter(), used = Planner.usedModes();
    if (!used.has("car") && this.carOnly(x)) return false;
    if (w.mode && !used.has(w.mode)) return false;
    if (w.season === "winter" && !winter) return false;
    if (w.season === "warm" && winter) return false;
    return true;
  },
  ok: (x) => { const s = S.packing[x.id]; return s === true || (!!s?.status && s.status !== "todo"); }, // {status} = ค่าจากเวอร์ชันเก่า
  qty(x) {
    const days = tripNights() + 1;
    return { "คน": `${x.qty} ต่อคน`, "คน×วัน": `${x.qty * days} ต่อคน (${x.qty}/วัน × ${days} วัน)`, "คนขับ": `${x.qty} ต่อคนขับ`, "คัน": `${x.qty} ต่อคัน`, "กลุ่ม": `${x.qty} ต่อกลุ่ม` }[x.per] ?? `×${x.qty}`;
  },
  render() {
    const L = PACKING.filter((x) => this.fits(x)), V = Prep.all ? PACKING : L, g = {};
    const ok = L.filter((x) => this.ok(x)).length, pct = L.length ? Math.round((ok / L.length) * 100) : 0;
    V.forEach((x) => (g[x.cat] ||= []).push(x));
    $('[data-sec="packing"]').innerHTML = `${Prep.head("packing", "จัดกระเป๋า", `${L.length} อย่างที่ขาดไม่ได้สำหรับทริปนี้ (${Planner.modeLabel()}${Prep.winter() ? ", หน้าหนาว" : ""})`)}
      ${Prep.hidden(PACKING.length - L.length, Prep.why())}
      <div class="card"><div class="row"><b>พร้อมแล้ว ${ok}/${L.length}</b><div class="spacer"></div><span>${pct}%</span></div><div class="bar" style="margin-top:6px"><i style="width:${pct}%"></i></div></div>
      ${Object.entries(g).map(([c, xs]) => `<div class="card pk-cat"><h3>${I(CAT_ICON[c] || "package")} ${esc(c)} <small>${xs.filter((x) => this.ok(x)).length}/${xs.length}</small></h3>
        ${xs.map((x) => `<label class="pk3 ${this.ok(x) ? "done" : ""}"><input type="checkbox" data-ok="${x.id}" ${this.ok(x) ? "checked" : ""}>
          <span><b>${esc(x.name)}</b> <span class="mute">${this.qty(x)}</span>${this.fits(x) ? "" : " " + Prep.off}${x.spec ? `<small>${esc(x.spec)}</small>` : ""}</span></label>`).join("")}</div>`).join("")}`;
  },
};

const GuideView = {
  // แสดงเสมอ ไม่ว่าทริปจะเช่ารถหรือไม่
  drive() {
    $('[data-sec="drive"]').innerHTML = `${Prep.head("drive", "ขับรถหน้าหนาว", "อ่านให้จบก่อนรับรถ ตั้งแต่ตอนจองรถจนถึงรถติดหิมะกลางทาง")}
      ${Prep.car() ? "" : `<div class="callout info">ทริปนี้ไม่ได้เช่ารถ อ่านไว้เผื่อเปลี่ยนใจหรือเช่ารถบางวัน</div>`}
      <div class="card">${SHEET.driveTips.map((s, i) => `<details ${i < 3 ? "open" : ""} style="margin-bottom:8px"><summary><b>${esc(s.title)}</b></summary>
        <div class="tbl-wrap"><table class="t">${s.items.map((r) => `<tr><td style="width:28%"><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td class="mute">${esc(r[2])}</td></tr>`).join("")}</table></div></details>`).join("")}</div>`;
  },
  life() {
    const car = Prep.car() || Prep.all;
    const carDay = /ปัดหิมะ|ท่อไอเสีย|นำทาง|น้ำมัน|ใบปัด|ไล่ฝ้า|ใบขับขี่/, carRule = /ขับรถ|ใบขับขี่/;
    const days = SHEET.daily.filter((d) => car || !/รถ/.test(d.title)).map((d) => ({ ...d, items: d.items.filter((x) => car || !carDay.test(x.text)) }));
    const rules = SHEET.rules.filter((r) => car || !carRule.test(r.topic));
    const nHidden = Prep.car() ? 0 : SHEET.daily.reduce((n, d) => n + (/รถ/.test(d.title) ? d.items.length : d.items.filter((x) => carDay.test(x.text)).length), 0) + SHEET.rules.filter((r) => carRule.test(r.topic)).length;
    const li = (x) => `<li>${esc(x.text)}${x.why ? ` <small>(${esc(x.why)})</small>` : ""}</li>`;
    $('[data-sec="life"]').innerHTML = `${Prep.head("life", "ใช้ชีวิตที่นั่น", "เรื่องในชีวิตประจำวันที่คนไทยมักไม่รู้ก่อนไป และเช็กลิสต์ที่ควรทำทุกวัน")}
      ${Prep.hidden(nHidden, "เรื่องขับรถ")}
      <div class="grid g2">${GUIDE.life.map((c) => `<div class="card"><h3>${esc(c.title)}</h3><ul class="tip-list">${c.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>
      <div class="card"><h2>เช็กลิสต์ประจำวัน</h2><div class="grid g2">${days.map((d) => { const opt = d.items.filter((x) => x.opt);
        return `<div><h3>${esc(d.title)}</h3><ul class="tip-list">${d.items.filter((x) => !x.opt).map(li).join("")}</ul>${opt.length ? `<details class="more"><summary>ของเสริม (ไม่บังคับ) ${opt.length} ข้อ</summary><ul class="tip-list">${opt.map(li).join("")}</ul></details>` : ""}</div>`; }).join("")}</div></div>
      <div class="card"><h2>กฎ ข้อห้าม และมารยาท</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>เรื่อง</th><th>กฎ</th><th>รายละเอียด</th></tr></thead>
        <tbody>${rules.map((r) => `<tr><td><b>${esc(r.topic)}</b></td><td>${esc(r.rule)}</td><td>${esc(r.detail)}</td></tr>`).join("")}</tbody></table></div></div>
      <details class="card opt"><summary><b>ของเสริม (ไม่บังคับ): เก็บความทรงจำ</b> <small>เทคนิคถ่ายรูปหิมะและไอเดียบันทึกทริป</small></summary><div class="tbl-wrap"><table class="t"><thead><tr><th>หมวด</th><th>ทำอะไร</th><th>วิธี / เทคนิค</th></tr></thead>
        <tbody>${SHEET.memory.map((m) => `<tr><td>${esc(m.cat)}</td><td><b>${esc(m.item)}</b></td><td>${esc(m.how)}</td></tr>`).join("")}</tbody></table></div></details>`;
  },
};
