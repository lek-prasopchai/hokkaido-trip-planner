// หน้า "งบประมาณ": ยอดรวมนับเฉพาะที่กรอกเอง ค่าประมาณจากแผนเป็นแค่ตัวช่วย (กด "ใช้ค่านี้" ได้)
// เงิน: แสดงทศนิยมได้ถึง 2 ตำแหน่ง (fmtN ปัดเป็นจำนวนเต็ม)
const fmtM = (n) => (+n).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const BudgetView = {
  calc() {
    // ไม่ถามจำนวนคน/ระดับที่พัก: รายการที่ขึ้นกับคนแสดงราคาต่อหน่วยเป็นตัวช่วย มีค่ารวม (auto) เฉพาะที่ไม่ขึ้นกับคน เช่น รถ
    const t = S.trip, D = GUIDE.budgetDefaults, N = tripNights(), days = N + 1;
    const ev = S.plan ? Planner.evaluateAll() : [];
    const carIdx = ev.length ? ev.filter((e) => e.mode === "car").map((e) => e.i) : t.mode === "transit" ? [] : [...Array(days).keys()];
    const carDays = carIdx.length ? carIdx[carIdx.length - 1] - carIdx[0] + 1 : 0; // เช่าต่อเนื่องตั้งแต่วันแรกถึงวันสุดท้ายที่ใช้รถ
    const carKm = ev.filter((e) => e.mode === "car").reduce((a, e) => a + e.km, 0) || (S.plan ? 0 : 120 * carDays);
    const L = [];
    // per = รายการที่ปกติจ่ายต่อคน (ตั๋ว ประกัน อาหาร ฯลฯ) กรอกราคาคนเดียวแล้วคูณจำนวนคน • นอกนั้นกรอกยอดทั้งกลุ่ม • สลับเองได้ (S.budgetPer)
    const PER = ["flight", "ins", "esim", "rail", "local", "fees", "food", "souv", "gear"];
    const add = (key, cat, name, cur, auto, note) => L.push({ key, cat, name, cur, auto: Math.round(auto), note, per: S.budgetPer[key] ?? PER.includes(key) });
    const yr = (a, b) => `¥${fmtN(a)}–${fmtN(b)}`;

    add("flight", "เดินทาง", "ตั๋วเครื่องบินไป-กลับ", "THB", 0, `≈${fmtN(D.flightTHB)} บาท ต่อคน (บินตรงช่วงหน้าหนาว)`);
    add("ins", "เดินทาง", "ประกันเดินทาง", "THB", 0, `≈${fmtN(D.insuranceTHB)} บาท ต่อคน`);
    add("esim", "เดินทาง", "eSIM / เน็ต", "THB", 0, `≈${fmtN(D.esimTHB)} บาท ต่อคน`);
    // ที่พัก: ช่วงราคาต่อห้อง (ประหยัด-สบาย) รวมทุกคืนตามเมืองในแผน
    let lo = 0, hi = 0, peak = 0;
    const nightsList = S.plan ? S.plan.bases : Array(N).fill("sapporo");
    nightsList.forEach((b, i) => {
      const iso = addDays(t.start, i), f = ["sapporo", "otaru"].includes(b) && iso >= "2027-02-03" && iso <= "2027-02-12" ? 1.8 : 1;
      lo += HUB[b].price[0] * f; hi += HUB[b].price[2] * f; if (f > 1) peak++;
    });
    add("hotel", "ที่พัก", "ที่พักทุกคืน", "JPY", 0, `${N} คืน ≈${yr(lo, hi)} ต่อห้อง (ห้องคู่ ประหยัด-สบาย)${peak ? ` รวม ${peak} คืนช่วงเทศกาลหิมะ ×1.8` : ""}${S.plan ? "" : " • ยังไม่มีแผน คิดเป็นซัปโปโร"}`);
    if (carDays) {
      add("idp", "รถ", "ใบขับขี่สากล (IDP)", "THB", 0, `≈${D.idpTHB} บาท ต่อคนขับ`);
      add("car", "รถ", "ค่าเช่ารถ 4WD ยางหิมะ", "JPY", D.carYenDay * carDays, `${carDays} วัน × ¥${fmtN(D.carYenDay)} (1 คัน ≤5 คน)`);
      add("carins", "รถ", "ประกันเต็ม + NOC", "JPY", D.carInsYenDay * carDays, `${carDays} วัน × ¥${fmtN(D.carInsYenDay)}`);
      add("hep", "รถ", "ETC card + Hokkaido Expressway Pass", "JPY", D.etcYen + (carDays >= 2 ? HEP_PRICE[Math.min(14, carDays)] : 0), `HEP ${Math.min(14, carDays)} วัน`);
      add("fuel", "รถ", "น้ำมัน", "JPY", (carKm / D.kmPerL) * D.fuelYenL, `${fmtN(carKm)} กม. ÷ ${D.kmPerL} กม./ลิตร × ¥${D.fuelYenL}`);
      const cityNights = nightsList.filter((b, i) => HUB[b].city && carIdx.includes(i) && carIdx.includes(i + 1)).length;
      if (cityNights) add("park", "รถ", "ที่จอดรถในเมือง", "JPY", cityNights * D.parkingCityYen, `${cityNights} คืน × ¥${fmtN(D.parkingCityYen)}`);
      // รับ-คืนตามการ์ดรถเช่า (ไม่ปักหมุด = สนามบิน)
      if (Planner.rent() && hubOf("rent:p") !== hubOf("rent:r")) add("oneway", "รถ", "ค่าคืนรถต่างสาขา", "JPY", D.oneWayDropYen, `รับ ${short(hubOf("rent:p"))} คืน ${short(hubOf("rent:r"))} (ประมาณ)`);
    }
    // รถไฟ/บัส: ค่าตั๋วรายเที่ยว (ประมาณ ¥28/กม. รวมค่าด่วนพิเศษ) เทียบ JR Pass ต่อผู้ใหญ่ 1 คน (เด็กครึ่งราคา)
    let jr = null;
    const trEv = ev.filter((e) => e.mode === "transit");
    if (trEv.length) {
      let fare = 0, passFare = 0;
      const jrDays = [];
      trEv.forEach((e) => e.tl.filter((x) => x.kind === "move" && !x.local && !x.noTransit && x.by).forEach((x) => {
        const f = Math.max(300, x.km * 28); fare += f; if (x.pass) { passFare += f; jrDays.push(e.i); }
      }));
      const span = jrDays.length ? jrDays[jrDays.length - 1] - jrDays[0] + 1 : 0;
      const pd = [5, 7, 10].find((d) => d >= span);
      const passCost = pd ? JR_PASS[pd] : Infinity, ticket = passFare;
      const usePass = span > 0 && passCost < ticket;
      if (span) jr = { usePass, text: usePass ? `<b>JR Hokkaido Rail Pass ${pd} วันคุ้ม:</b> ¥${fmtN(passCost)} ต่อผู้ใหญ่ เทียบตั๋วรายเที่ยว ≈¥${fmtN(ticket)} (ช่วงใช้รถไฟ JR ${span} วัน)` : `<b>JR Pass ยังไม่คุ้ม:</b> ตั๋วรายเที่ยว ≈¥${fmtN(ticket)} ต่อผู้ใหญ่${pd ? ` ถูกกว่า Pass ${pd} วัน ¥${fmtN(passCost)}` : ` ช่วงใช้รถไฟ ${span} วันยาวเกิน Pass 10 วัน`}` };
      add("rail", "รถไฟ/บัส", usePass ? `JR Hokkaido Rail Pass ${pd} วัน + บัส` : "ตั๋วรถไฟ/บัสรายเที่ยว", "JPY", 0, `≈¥${fmtN((usePass ? passCost : ticket) + fare - passFare)} ต่อผู้ใหญ่ (เด็กครึ่งราคา ¥28/กม. รวมค่ารถด่วน)`);
      add("local", "รถไฟ/บัส", "รถไฟใต้ดิน/บัสในเมือง/แท็กซี่", "JPY", 0, `≈¥${fmtN(D.transitLocalYenDay)} ต่อคนต่อวัน × ${trEv.length} วัน`);
    }
    const stops = ev.flatMap((e) => e.stops), fees = stops.reduce((a, id) => a + PLACE[id].feeYen, 0);
    add("fees", "กิน เที่ยว ช้อป", "ค่าเข้า / กระเช้า / เรือ", "JPY", 0, S.plan ? `≈¥${fmtN(fees)} ต่อผู้ใหญ่ รวม ${stops.length} ที่ในแผน` : "ยังไม่มีแผน");
    add("food", "กิน เที่ยว ช้อป", "อาหาร", "JPY", 0, `≈${yr(D.foodYen[0], D.foodYen[2])} ต่อคนต่อวัน × ${days} วัน`);
    add("souv", "กิน เที่ยว ช้อป", "ของฝาก / ช้อปปิ้ง", "JPY", 0, `≈¥${fmtN(D.souvenirYen)} ต่อคน`);
    add("gear", "อื่นๆ", "ของที่ต้องซื้อเตรียมตัว", "THB", 0, "เสื้อกันหนาว บูท ฯลฯ");
    // รายการที่เพิ่มเอง (ทัวร์ ค่าสกี ฯลฯ): ไม่มีค่าประมาณ จำนวนเงินเก็บใน S.budget[id] เหมือนรายการอื่น
    S.budgetX.forEach((x) => { add(x.id, "อื่นๆ", x.name, "THB", 0, ""); L[L.length - 1].mine = true; });
    // แต่ละรายการจ่ายเป็นบาท เยน หรือทั้งสองได้: S.budget[key] = { b, y } (ค่าเก่าเป็นตัวเลขเดียว = สกุลเงินตั้งต้นของรายการ)
    const split = (l) => {
      const o = S.budget[l.key];
      if (typeof o === "number") return l.cur === "THB" ? { b: o, y: 0, own: true } : { b: 0, y: o, own: true };
      if (o && (o.b != null || o.y != null)) return { b: o.b || 0, y: o.y || 0, own: true };
      return { b: 0, y: 0, own: false };
    };
    const ppl = Math.max(1, S.budgetPeople || 1);
    const fill = (l) => { Object.assign(l, split(l)); l.x = l.per ? ppl : 1; l.b *= l.x; l.y *= l.x; l.thb = l.b + l.y * S.rate; }; // b/y/thb = ยอดทั้งกลุ่ม
    const hidden = new Set(S.budgetHide);
    // ลำดับที่ผู้ใช้จัดเอง (S.budgetOrder) ก่อน รายการที่ยังไม่เคยจัด (เช่น ค่ารถเพิ่งมีเพราะเปลี่ยนแผน) ต่อท้ายตามลำดับเดิม
    const pos = (k) => { const i = S.budgetOrder.indexOf(k); return i < 0 ? 1e3 + L.findIndex((l) => l.key === k) : i; };
    const shown = L.filter((l) => !hidden.has(l.key)).sort((a, b) => pos(a.key) - pos(b.key)).map((l) => (fill(l), l));
    const sub = shown.reduce((a, l) => a + l.thb, 0), r = S.budgetReserve ? (sub * D.reservePct) / 100 : 0;
    add("reserve", "สำรอง", `เงินสำรอง ${D.reservePct}%`, "THB", 0, S.budgetReserve ? "คิดจากยอดที่กรอกแล้ว เผื่อพายุ เลื่อนไฟลต์ ค่ารักษา" : "ไม่นับรวม (ติ๊กเพื่อนับ)");
    const res = Object.assign(L[L.length - 1], { b: r, y: 0, thb: r, own: true, per: false, x: 1 });
    shown.push(res);
    return { lines: shown, hiddenN: hidden.size, total: sub + r, ppl, todoN: shown.filter((l) => !l.own).length,
      yen: shown.reduce((a, l) => a + l.y, 0), baht: shown.reduce((a, l) => a + l.b, 0), jr };
  },

  render() {
    const B = this.calc(), ppl = B.ppl, list = B.lines.filter((l) => l.key !== "reserve"), res = B.lines.find((l) => l.key === "reserve");
    const raw = (l) => { const o = S.budget[l.key]; return typeof o === "number" ? { [l.cur === "THB" ? "b" : "y"]: o } : o || {}; };
    const sym = (c) => (c === "b" ? "฿" : "¥"), word = (c) => (c === "b" ? "บาท" : "เยน");
    // ช่องเดียวต่อรายการ + ปุ่มสลับ ฿/¥ • จ่ายสองสกุลจริง: "+ เยน/บาท" เปิดช่องที่สอง
    const field = (l, c, sw) => `<label class="bin">${sw ? `<button type="button" class="bcur" data-bcur="${l.key}" title="กดสลับบาท/เยน" aria-label="สกุลเงิน${word(c)} กดเพื่อสลับ">${sym(c)}</button>` : `<span class="bcur">${sym(c)}</span>`}<input type="number" inputmode="decimal" min="0" step="any" data-bk="${l.key}" data-c="${c}" value="${raw(l)[c] ?? ""}" placeholder="0" aria-label="${esc(l.name)} ${word(c)}${l.per && ppl > 1 ? " ต่อคน" : ""}"></label>`;
    const inputs = (l) => {
      const o = raw(l), has = ["b", "y"].filter((c) => o[c] != null);
      if (has.length === 2 || (has.length && this.more === l.key)) return field(l, "b") + field(l, "y");
      const c = has[0] || S.budgetCur[l.key] || (l.cur === "THB" ? "b" : "y"), d = c === "b" ? "y" : "b";
      return field(l, c, true) + (has.length ? `<button type="button" class="linkbtn bmore" data-bmore="${l.key}" data-c="${d}" title="จ่ายบางส่วนเป็น${word(d)}">+ ${word(d)}</button>` : "");
    };
    const hint = (l) => l.own || l.mine || !l.note ? "" : `<div class="bhint">${l.auto > 0 ? `ประมาณ ${l.cur === "JPY" ? `¥${fmtN(l.auto)}` : `${fmtN(l.auto)} ฿`} • ` : ""}${esc(l.note)}${l.auto > 0 ? ` <button class="linkbtn" data-useauto="${l.key}">ใช้ค่านี้</button>` : ""}</div>`;
    const perBtn = (l) => ppl < 2 ? "" : `<button type="button" class="bper ${l.per ? "on" : ""}" data-bper="${l.key}" title="กดสลับ: ช่องที่กรอกเป็นราคาต่อคน หรือยอดทั้งกลุ่ม">${l.per ? `ต่อคน ×${ppl}` : "ทั้งกลุ่ม"}</button>`;
    const grip = (l) => `<button class="bgrip" data-bgrip="${l.key}" aria-label="ย้ายลำดับ ${esc(l.name)} (ลาก หรือกดลูกศรขึ้น/ลง)" title="ลากเพื่อเปลี่ยนลำดับ">${I("grip-vertical")}</button>`;
    const del = (l) => l.mine ? `<button class="bdel" data-bxdel="${l.key}" title="ลบรายการ" aria-label="ลบรายการ ${esc(l.name)}">${I("x")}</button>`
      : `<button class="bdel" data-bhide="${l.key}" title="ไม่ใช้รายการนี้" aria-label="ซ่อน ${esc(l.name)}">${I("x")}</button>`;
    const name = (l) => l.mine ? `<input type="text" class="bxname" data-bxname="${l.key}" value="${esc(l.name)}" placeholder="ชื่อรายการ เช่น ทัวร์ Drift Ice" aria-label="ชื่อรายการ">` : `<b>${esc(l.name)}</b>`;
    const row = (l) => `<li class="${l.own ? "own" : ""}" data-key="${l.key}">${grip(l)}
      <div class="bmain">${name(l)}${perBtn(l)}${hint(l)}</div>
      <div class="bamt">${inputs(l)}<b class="bthb">${l.own ? `${fmtM(l.thb)} ฿` : ""}</b></div>${del(l)}</li>`;
    const filled = list.filter((l) => l.own).length;
    $('[data-sec="budget"]').innerHTML = `
      <div class="sec-head"><h1>งบประมาณ</h1>
        <p class="lead">กรอกราคาที่จองแล้วหรือคาดว่าจะจ่าย ยอดรวมนับเฉพาะช่องที่กรอก</p></div>
      <div class="split split-r"><aside class="split-side"><div class="card bsum">
        <div class="bsum-total"><span>รวม${ppl > 1 ? "ทั้งกลุ่ม" : ""}${S.budgetReserve ? " (รวมสำรอง)" : ""}</span><b>${fmtM(B.total)} ฿</b>
          ${ppl > 1 ? `<div class="bsum-each">ตกคนละ <b>${fmtM(B.total / ppl)} ฿</b></div>` : ""}
          ${B.yen && B.baht ? `<small class="mute">จ่ายเป็นเยน ¥${fmtM(B.yen)} + บาท ${fmtM(B.baht)} ฿</small>` : ""}</div>
        <div class="bsum-row"><span>ไปกี่คน</span><div class="bstep"><button type="button" data-ppl="-1" aria-label="ลดจำนวนคน" ${ppl < 2 ? "disabled" : ""}>−</button><input type="number" min="1" step="1" inputmode="numeric" id="bPpl" value="${ppl}" aria-label="จำนวนคน"><button type="button" data-ppl="1" aria-label="เพิ่มจำนวนคน">+</button></div></div>
        <div class="bsum-row bprog"><span>กรอกแล้ว ${filled} จาก ${list.length} รายการ</span><i><em style="width:${list.length ? (filled / list.length) * 100 : 0}%"></em></i></div></div></aside>
      <div class="split-main">${B.jr ? `<div class="callout info">${B.jr.text}</div>` : ""}
      <div class="card bcard">
        <ul class="blist">${list.map(row).join("")}</ul>
        <div class="badd"><button class="btn small" id="bAdd">+ เพิ่มรายการเอง</button>${B.hiddenN ? ` <button class="linkbtn" id="bUnhide">แสดงรายการที่ซ่อน (${B.hiddenN})</button>` : ""}</div>
        <div class="bres"><label class="row"><input type="checkbox" id="bRes" ${S.budgetReserve ? "checked" : ""}> <b>${esc(res.name)}</b></label><b class="bthb">${S.budgetReserve && res.thb ? `${fmtM(res.thb)} ฿` : ""}</b><small class="mute">${esc(res.note)}</small></div>
        <div class="btot"><b>รวม${ppl > 1 ? "ทั้งกลุ่ม" : ""}${S.budgetReserve ? " + สำรอง" : ""}</b><b class="bthb">${fmtM(B.total)} ฿</b></div>
        <div class="bfoot"><label class="brate">1 เยน = <input type="number" step="0.0001" id="rate" value="${S.rate}" aria-label="อัตราแลกเปลี่ยน บาทต่อเยน"> บาท</label>
          <label class="small"><input type="checkbox" id="rateAuto" ${S.set.rateAuto ? "checked" : ""}> อัปเดตอัตโนมัติวันละครั้ง</label>
          <button class="linkbtn" id="bReset">ล้างจำนวนเงินที่กรอก</button></div>
        <p class="mute small bnote">ค่าประมาณอิงราคา พ.ย. 2026 ไว้ดูภาพรวม ไม่ใช่ใบเสนอราคา</p></div>
      <div class="bbar"><span>รวม <b>${fmtM(B.total)} ฿</b></span>${ppl > 1 ? `<span>คนละ <b>${fmtM(B.total / ppl)} ฿</b></span>` : ""}</div></div></div>`;
  },

  setPpl(n) { S.budgetPeople = Math.max(1, Math.min(50, Math.round(n) || 1)); save(); App.renderAll(); },

  bind() {
    const sec = $('[data-sec="budget"]');
    sec.addEventListener("change", (e) => {
      const el = e.target;
      if (el.id === "rate") { S.rate = Math.max(0.01, +el.value || 0.23); S.set.rateAuto = false; save(); App.renderAll(); return; }
      if (el.id === "bPpl") { this.setPpl(+el.value); return; }
      if (el.id === "bRes") { S.budgetReserve = el.checked; save(); App.renderAll(); return; }
      if (el.id === "rateAuto") { S.set.rateAuto = el.checked; if (el.checked) { S.rateAt = 0; refreshRate(); } save(); App.renderAll(); return; }
      if (el.dataset.bk) {
        const k = el.dataset.bk, l = this.calc().lines.find((x) => x.key === k), old = S.budget[k];
        const o = typeof old === "number" ? { [l.cur === "THB" ? "b" : "y"]: old } : { ...old };
        if (el.value === "") delete o[el.dataset.c]; else o[el.dataset.c] = Math.max(0, +el.value);
        if (o.b == null && o.y == null) delete S.budget[k]; else S.budget[k] = o;
        save(); App.renderAll();
      }
    });
    // เปลี่ยนลำดับ: ลากที่จับ (เมาส์/นิ้ว) หรือกดลูกศรขึ้น/ลงบนที่จับ
    const keysNow = () => this.calc().lines.filter((l) => l.key !== "reserve").map((l) => l.key);
    // ย้าย k ไปไว้ก่อน/หลัง ref
    const place = (k, ref, after) => {
      if (!ref || ref === k) return false;
      const keys = keysNow().filter((x) => x !== k), i = keys.indexOf(ref);
      if (i < 0) return false;
      keys.splice(after ? i + 1 : i, 0, k);
      S.budgetOrder = [...keys, ...S.budgetOrder.filter((x) => !keys.includes(x))]; // เก็บลำดับของรายการที่ซ่อนอยู่ไว้ด้วย
      save(); App.renderAll(); return true;
    };
    const grpKeys = (k) => [...sec.querySelector(`li[data-key="${k}"]`).parentElement.children].map((r) => r.dataset.key);
    sec.addEventListener("keydown", (e) => {
      const k = e.target.dataset?.bgrip; if (!k || !["ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      const g = grpKeys(k), i = g.indexOf(k), up = e.key === "ArrowUp";
      if (place(k, g[i + (up ? -1 : 1)], !up)) sec.querySelector(`[data-bgrip="${k}"]`)?.focus();
    });
    sec.addEventListener("pointerdown", (e) => {
      const g = e.target.closest("[data-bgrip]"); if (!g || e.button > 0) return;
      e.preventDefault();
      const k = g.dataset.bgrip, li = g.closest("li"), rows = [...li.parentElement.children];
      let to = rows.indexOf(li);
      li.classList.add("dragging"); g.setPointerCapture(e.pointerId);
      const mark = (y) => {
        if (y < 70) scrollBy(0, -12); else if (y > innerHeight - 110) scrollBy(0, 12); // เลื่อนจอตามเมื่อลากถึงขอบ
        to = rows.filter((r) => r.getBoundingClientRect().top + r.offsetHeight / 2 < y).length; // ตำแหน่งแทรก 0..n
        rows.forEach((r, n) => { r.classList.toggle("drop-before", n === to && r !== li); r.classList.toggle("drop-after", n === rows.length - 1 && to === rows.length && r !== li); });
      };
      const up = () => {
        g.removeEventListener("pointermove", mv); g.removeEventListener("pointerup", up); g.removeEventListener("pointercancel", up);
        rows.forEach((r) => r.classList.remove("dragging", "drop-before", "drop-after"));
        const ref = rows[to], last = rows.filter((r) => r !== li).pop();
        if (ref) place(k, ref.dataset.key, false); else if (last) place(k, last.dataset.key, true);
      };
      const mv = (ev) => mark(ev.clientY);
      g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up); g.addEventListener("pointercancel", up);
    });
    sec.addEventListener("input", (e) => { const id = e.target.dataset.bxname, x = id && S.budgetX.find((y) => y.id === id); if (x) { x.name = e.target.value; save(false); } });
    sec.addEventListener("click", (e) => {
      const el = e.target.closest("button"); if (!el) return;
      if (el.id === "bReset" && confirm("ล้างจำนวนเงินที่กรอกทั้งหมด? (รายการที่เพิ่มเองยังอยู่)")) { S.budget = {}; save(); App.renderAll(); }
      else if (el.dataset.ppl) this.setPpl(Math.max(1, S.budgetPeople || 1) + +el.dataset.ppl);
      else if (el.dataset.bcur) { // สลับสกุล: มีตัวเลขแล้ว = ย้ายตัวเลขไปอีกสกุล • ยังว่าง = จำว่าจะกรอกสกุลไหน
        const k = el.dataset.bcur, l = this.calc().lines.find((x) => x.key === k), old = S.budget[k];
        const o = typeof old === "number" ? { [l.cur === "THB" ? "b" : "y"]: old } : { ...old };
        const c = o.b != null ? "b" : o.y != null ? "y" : S.budgetCur[k] || (l.cur === "THB" ? "b" : "y"), d = c === "b" ? "y" : "b";
        if (o[c] != null) { o[d] = o[c]; delete o[c]; S.budget[k] = o; }
        S.budgetCur[k] = d; save(); App.renderAll(); sec.querySelector(`[data-bcur="${k}"]`)?.focus();
      } else if (el.dataset.bmore) { this.more = el.dataset.bmore; App.renderAll(); sec.querySelector(`[data-bk="${el.dataset.bmore}"][data-c="${el.dataset.c}"]`)?.focus(); }
      else if (el.dataset.bper) { const l = this.calc().lines.find((x) => x.key === el.dataset.bper); S.budgetPer[l.key] = !l.per; save(); App.renderAll(); }
      else if (el.dataset.useauto) { const l = this.calc().lines.find((x) => x.key === el.dataset.useauto); S.budget[l.key] = { [l.cur === "THB" ? "b" : "y"]: l.auto }; save(); App.renderAll(); }
      else if (el.dataset.bhide) { S.budgetHide.push(el.dataset.bhide); delete S.budget[el.dataset.bhide]; save(); App.renderAll(); }
      else if (el.id === "bUnhide") { S.budgetHide = []; save(); App.renderAll(); }
      else if (el.id === "bAdd") {
        const id = "x" + Date.now().toString(36);
        S.budgetX.push({ id, name: "" }); save(); App.renderAll();
        sec.querySelector(`[data-bxname="${id}"]`)?.focus();
      } else if (el.dataset.bxdel) {
        const id = el.dataset.bxdel;
        if (S.budget[id] && !confirm("ลบรายการนี้และจำนวนเงิน?")) return;
        S.budgetX = S.budgetX.filter((x) => x.id !== id); delete S.budget[id]; save(); App.renderAll();
      }
    });
  },
};
