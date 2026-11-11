// หน้า "งบประมาณ": ยอดรวมนับเฉพาะที่กรอกเอง ค่าประมาณจากแผนเป็นแค่ตัวช่วย (กด "ใช้ค่านี้" ได้)
const BudgetView = {
  calc() {
    // ไม่ถามจำนวนคน/ระดับที่พัก: รายการที่ขึ้นกับคนแสดงราคาต่อหน่วยเป็นตัวช่วย มีค่ารวม (auto) เฉพาะที่ไม่ขึ้นกับคน เช่น รถ
    const t = S.trip, D = GUIDE.budgetDefaults, N = tripNights(), days = N + 1;
    const ev = S.plan ? Planner.evaluateAll() : [];
    const carIdx = ev.length ? ev.filter((e) => e.mode === "car").map((e) => e.i) : t.mode === "transit" ? [] : [...Array(days).keys()];
    const carDays = carIdx.length ? carIdx[carIdx.length - 1] - carIdx[0] + 1 : 0; // เช่าต่อเนื่องตั้งแต่วันแรกถึงวันสุดท้ายที่ใช้รถ
    const carKm = ev.filter((e) => e.mode === "car").reduce((a, e) => a + e.km, 0) || (S.plan ? 0 : 120 * carDays);
    const L = [];
    const add = (key, cat, name, cur, auto, note) => L.push({ key, cat, name, cur, auto: Math.round(auto), note });
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
      const pick = carIdx[0] === 0 ? t.arrive : nightsList[carIdx[0] - 1], drop = carIdx[carIdx.length - 1] === days - 1 ? t.depart : nightsList[carIdx[carIdx.length - 1]];
      if (hubOf(pick) !== hubOf(drop) && !(AIR[pick] && AIR[drop] && pick === drop)) add("oneway", "รถ", "ค่าคืนรถต่างสาขา", "JPY", D.oneWayDropYen, `รับ ${pname(pick).split(" ")[0]} คืน ${pname(drop).split(" ")[0]} (ประมาณ)`);
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
    add("fees", "เที่ยว", "ค่าเข้า / กระเช้า / เรือ", "JPY", 0, S.plan ? `≈¥${fmtN(fees)} ต่อผู้ใหญ่ รวม ${stops.length} ที่ในแผน` : "ยังไม่มีแผน");
    add("food", "อาหาร", "อาหาร", "JPY", 0, `≈${yr(D.foodYen[0], D.foodYen[2])} ต่อคนต่อวัน × ${days} วัน`);
    add("souv", "ช้อปปิ้ง", "ของฝาก / ช้อปปิ้ง", "JPY", 0, `≈¥${fmtN(D.souvenirYen)} ต่อคน`);
    add("gear", "ของ", "ของที่ต้องซื้อเตรียมตัว", "THB", 0, "เสื้อกันหนาว บูท ฯลฯ");
    // รายการที่เพิ่มเอง (ทัวร์ ค่าสกี ฯลฯ): ไม่มีค่าประมาณ จำนวนเงินเก็บใน S.budget[id] เหมือนรายการอื่น
    S.budgetX.forEach((x) => { add(x.id, "อื่นๆ", x.name, "THB", 0, ""); L[L.length - 1].mine = true; });
    // แต่ละรายการจ่ายเป็นบาท เยน หรือทั้งสองได้: S.budget[key] = { b, y } (ค่าเก่าเป็นตัวเลขเดียว = สกุลเงินตั้งต้นของรายการ)
    const split = (l) => {
      const o = S.budget[l.key];
      if (typeof o === "number") return l.cur === "THB" ? { b: o, y: 0, own: true } : { b: 0, y: o, own: true };
      if (o && (o.b != null || o.y != null)) return { b: o.b || 0, y: o.y || 0, own: true };
      return { b: 0, y: 0, own: false };
    };
    const fill = (l) => { Object.assign(l, split(l)); l.thb = l.b + l.y * S.rate; };
    const hidden = new Set(S.budgetHide);
    // ลำดับที่ผู้ใช้จัดเอง (S.budgetOrder) ก่อน รายการที่ยังไม่เคยจัด (เช่น ค่ารถเพิ่งมีเพราะเปลี่ยนแผน) ต่อท้ายตามลำดับเดิม
    const pos = (k) => { const i = S.budgetOrder.indexOf(k); return i < 0 ? 1e3 + L.findIndex((l) => l.key === k) : i; };
    const shown = L.filter((l) => !hidden.has(l.key)).sort((a, b) => pos(a.key) - pos(b.key)).map((l) => (fill(l), l));
    const sub = shown.reduce((a, l) => a + l.thb, 0), r = S.budgetReserve ? (sub * D.reservePct) / 100 : 0;
    add("reserve", "สำรอง", `เงินสำรอง ${D.reservePct}%`, "THB", 0, S.budgetReserve ? "คิดจากยอดที่กรอกแล้ว เผื่อพายุ เลื่อนไฟลต์ ค่ารักษา" : "ไม่นับรวม (ติ๊กเพื่อนับ)");
    const res = Object.assign(L[L.length - 1], { b: r, y: 0, thb: r, own: true });
    shown.push(res);
    return { lines: shown, hiddenN: hidden.size, total: sub + r, todoN: shown.filter((l) => !l.own).length,
      yen: shown.reduce((a, l) => a + l.y, 0), baht: shown.reduce((a, l) => a + l.b, 0), jr };
  },

  render() {
    const B = this.calc();
    const cats = {};
    B.lines.forEach((l) => l.thb && (cats[l.cat] = (cats[l.cat] || 0) + l.thb));
    const inp = (l, c) => { const o = S.budget[l.key], v = typeof o === "number" ? ((l.cur === "THB") === (c === "b") ? o : "") : o?.[c] ?? "";
      return `<label class="bin"><span>${c === "b" ? "฿" : "¥"}</span><input type="number" min="0" data-bk="${l.key}" data-c="${c}" value="${v}" placeholder="0" aria-label="${esc(l.name)} ${c === "b" ? "บาท" : "เยน"}"></label>`; };
    const hint = (l) => l.own || l.mine || !l.note ? (l.key === "reserve" ? `<small class="bnote">${esc(l.note)}</small>` : "")
      : `<div class="bhint">${l.auto > 0 ? `ประมาณ ${l.cur === "JPY" ? `¥${fmtN(l.auto)}` : `${fmtN(l.auto)} ฿`} • ` : ""}${esc(l.note)}${l.auto > 0 ? ` <button class="linkbtn" data-useauto="${l.key}">ใช้ค่านี้</button>` : ""}</div>`;
    const keys = B.lines.filter((l) => l.key !== "reserve").map((l) => l.key);
    const tools = (l, x) => { const i = keys.indexOf(l.key); return `<span class="it-tools"><button data-bmv="${l.key}:-1" ${i === 0 ? "disabled" : ""} aria-label="เลื่อนขึ้น" title="เลื่อนขึ้น">${I("arrow-up")}</button><button data-bmv="${l.key}:1" ${i === keys.length - 1 ? "disabled" : ""} aria-label="เลื่อนลง" title="เลื่อนลง">${I("arrow-down")}</button>${x}</span>`; };
    const name = (l) => l.key === "reserve"
      ? `<label class="row bx"><input type="checkbox" id="bRes" ${S.budgetReserve ? "checked" : ""}> <b>${esc(l.name)}</b></label>`
      : l.mine
      ? `<div class="row bx"><input type="text" data-bxname="${l.key}" value="${esc(l.name)}" placeholder="ชื่อรายการ เช่น ทัวร์ Drift Ice" aria-label="ชื่อรายการ">${tools(l, `<button data-bxdel="${l.key}" title="ลบรายการ" aria-label="ลบรายการ ${esc(l.name)}">${I("x")}</button>`)}</div>`
      : `<div class="row bx"><b>${esc(l.name)}</b><span class="spacer"></span>${tools(l, `<button data-bhide="${l.key}" title="ไม่ใช้รายการนี้" aria-label="ซ่อน ${esc(l.name)}">${I("x")}</button>`)}</div>`;
    const colors = ["#2c6e9b", "#c8374a", "#2f8a57", "#b7791f", "#7b4fb5", "#0f8b8d", "#6a994e", "#3d5a80", "#8a817c"];
    $('[data-sec="budget"]').innerHTML = `
      <div class="sec-head"><h1>งบประมาณ</h1>
        <p class="lead">กรอกราคาจริงที่จองหรือคาดว่าจะจ่าย ยอดรวมนับเฉพาะที่กรอก • ตัวเทาใต้รายการคือราคาประมาณ (ต่อคน/ต่อห้อง หรือคิดจากแผนสำหรับค่ารถ กด "ใช้ค่านี้" ได้)</p></div>
      <div class="card"><div class="summary">
        <div class="k"><b>${fmtN(B.total)} ฿</b><span>กรอกแล้ว${S.budgetReserve ? " (รวมสำรอง)" : ""}</span></div>
        <div class="k"><b>${B.todoN ? `${B.todoN} รายการ` : "ครบแล้ว"}</b><span>${B.todoN ? "ยังไม่ได้กรอก" : "ทุกรายการกรอกแล้ว"}</span></div>
        <div class="k"><b>¥${fmtN(B.yen)} + ${fmtN(B.baht)} ฿</b><span>จ่ายเป็นเยน + จ่ายเป็นบาท</span></div>
        <div class="k"><label class="f">1 เยน = ? บาท<input type="number" step="0.0001" id="rate" value="${S.rate}"></label>
          <label class="small"><input type="checkbox" id="rateAuto" ${S.set.rateAuto ? "checked" : ""}> อัปเดตอัตโนมัติวันละครั้ง</label></div></div>
        ${B.total ? `<div style="display:flex;height:14px;border-radius:99px;overflow:hidden;margin-top:14px">${Object.entries(cats).map(([c, v], i) => `<div title="${esc(c)} ${fmtN(v)} ฿" style="width:${(v / B.total) * 100}%;background:${colors[i % colors.length]}"></div>`).join("")}</div>
        <div class="row" style="margin-top:6px;font-size:.8rem">${Object.entries(cats).map(([c, v], i) => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${colors[i % colors.length]}"></span> ${esc(c)} ${Math.round((v / B.total) * 100)}%</span>`).join("")}</div>` : ""}</div>
      ${B.jr ? `<div class="callout info">${B.jr.text}</div>` : ""}
      <div class="card"><p class="mute small" style="margin:0 0 8px">แต่ละรายการกรอกได้ทั้ง ฿ และ ¥ (เช่น จองที่พักเป็นบาท แต่จ่ายภาษีที่พักเป็นเยน) • ขวาสุด = รวมเป็นบาท • ✕ = ไม่ใช้รายการนี้</p>
        <ul class="blist">${B.lines.map((l) => `${l.key === "reserve" ? `<li class="badd"><button class="btn small" id="bAdd">+ เพิ่มรายการเอง</button>${B.hiddenN ? ` <button class="linkbtn" id="bUnhide">แสดงรายการที่ซ่อน (${B.hiddenN})</button>` : ""}</li>` : ""}<li class="${l.own && !l.mine && l.key !== "reserve" ? "own" : ""}">
          <div>${name(l)}${hint(l)}</div>
          <div class="bamt">${l.key === "reserve" ? "" : inp(l, "b") + inp(l, "y")}<b class="bthb">${l.own && (l.key !== "reserve" || S.budgetReserve) ? `${fmtN(l.thb)} ฿` : '<span class="mute">-</span>'}</b></div></li>`).join("")}
          <li class="btot"><b>รวมที่กรอกแล้ว${S.budgetReserve ? " + สำรอง" : ""}</b><div class="bamt"><span class="mute small">¥${fmtN(B.yen)} + ${fmtN(B.baht)} ฿</span><b class="bthb">${fmtN(B.total)} ฿</b></div></li></ul>
        <div class="row" style="margin-top:8px"><button class="btn small" id="bReset">ล้างจำนวนเงินที่กรอก</button><span class="mute" style="font-size:.8rem">ค่าประมาณอิงราคา พ.ย. 2026 ไว้ดูภาพรวม ไม่ใช่ใบเสนอราคา</span></div></div>`;
  },

  bind() {
    const sec = $('[data-sec="budget"]');
    sec.addEventListener("change", (e) => {
      const el = e.target;
      if (el.id === "rate") { S.rate = Math.max(0.01, +el.value || 0.23); S.set.rateAuto = false; save(); App.renderAll(); return; }
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
    sec.addEventListener("input", (e) => { const id = e.target.dataset.bxname, x = id && S.budgetX.find((y) => y.id === id); if (x) { x.name = e.target.value; save(false); } });
    sec.addEventListener("click", (e) => {
      const el = e.target.closest("button"); if (!el) return;
      if (el.id === "bReset" && confirm("ล้างจำนวนเงินที่กรอกทั้งหมด? (รายการที่เพิ่มเองยังอยู่)")) { S.budget = {}; save(); App.renderAll(); }
      else if (el.dataset.useauto) { const l = this.calc().lines.find((x) => x.key === el.dataset.useauto); S.budget[l.key] = { [l.cur === "THB" ? "b" : "y"]: l.auto }; save(); App.renderAll(); }
      else if (el.dataset.bmv) {
        const [k, d] = el.dataset.bmv.split(":"), keys = this.calc().lines.filter((l) => l.key !== "reserve").map((l) => l.key), i = keys.indexOf(k), j = i + +d;
        if (j < 0 || j >= keys.length) return;
        [keys[i], keys[j]] = [keys[j], keys[i]];
        S.budgetOrder = [...keys, ...S.budgetOrder.filter((x) => !keys.includes(x))]; // เก็บลำดับของรายการที่ซ่อนอยู่ไว้ด้วย
        save(); App.renderAll();
        sec.querySelector(`[data-bmv="${k}:${d}"]:not(:disabled)`)?.focus();
      }
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
