// หน้า "งบประมาณ": ยอดรวมนับเฉพาะที่กรอกเอง ค่าประมาณจากแผนเป็นแค่ตัวช่วย (กด "ใช้ค่านี้" ได้)
const BudgetView = {
  calc() {
    const t = S.trip, D = GUIDE.budgetDefaults, ppl = t.adults + t.kids, ppl2 = t.adults + t.kids * 0.5;
    const N = tripNights(), rooms = Math.ceil(ppl / 2), lv = t.level, days = N + 1;
    const ev = S.plan ? Planner.evaluateAll() : [];
    const carIdx = ev.length ? ev.filter((e) => e.mode === "car").map((e) => e.i) : t.mode === "transit" ? [] : [...Array(days).keys()];
    const carDays = carIdx.length ? carIdx[carIdx.length - 1] - carIdx[0] + 1 : 0; // เช่าต่อเนื่องตั้งแต่วันแรกถึงวันสุดท้ายที่ใช้รถ
    const carKm = ev.filter((e) => e.mode === "car").reduce((a, e) => a + e.km, 0) || (S.plan ? 0 : 120 * carDays);
    const L = [];
    const add = (key, cat, name, cur, auto, note) => L.push({ key, cat, name, cur, auto: Math.round(auto), note });

    add("flight", "เดินทาง", "ตั๋วเครื่องบินไป-กลับ", "THB", D.flightTHB * ppl, `${fmtN(D.flightTHB)} × ${ppl} คน (ประมาณ บินตรงช่วงหน้าหนาว)`);
    add("ins", "เดินทาง", "ประกันเดินทาง", "THB", D.insuranceTHB * ppl, `${fmtN(D.insuranceTHB)} × ${ppl} คน`);
    add("esim", "เดินทาง", "eSIM / เน็ต", "THB", D.esimTHB * ppl, `${D.esimTHB} × ${ppl} คน`);
    // ที่พัก
    let hotel = 0, peak = 0;
    const nightsList = S.plan ? S.plan.bases : Array(N).fill("sapporo");
    nightsList.forEach((b, i) => {
      const iso = addDays(t.start, i), isPeak = ["sapporo", "otaru"].includes(b) && iso >= "2027-02-03" && iso <= "2027-02-12";
      hotel += HUB[b].price[lv] * rooms * (isPeak ? 1.8 : 1); if (isPeak) peak++;
    });
    add("hotel", "ที่พัก", "ที่พักทุกคืน", "JPY", hotel, `${N} คืน × ${rooms} ห้อง ตามราคาระดับ${["ประหยัด", "กลาง", "สบาย"][lv]}ของแต่ละฐาน${peak ? ` (${peak} คืนช่วงเทศกาลหิมะ ×1.8)` : ""}${S.plan ? "" : " (ยังไม่มีแผน คิดเป็นซัปโปโร)"}`);
    if (carDays) {
      add("idp", "รถ", "ใบขับขี่สากล (IDP)", "THB", D.idpTHB, `${D.idpTHB} บาท ต่อคนขับ 1 คน`);
      add("car", "รถ", "ค่าเช่ารถ 4WD ยางหิมะ", "JPY", D.carYenDay * carDays * Math.ceil(ppl / 5), `${carDays} วัน × ¥${fmtN(D.carYenDay)}${ppl > 5 ? " × " + Math.ceil(ppl / 5) + " คัน" : ""}`);
      add("carins", "รถ", "ประกันเต็ม + NOC", "JPY", D.carInsYenDay * carDays, `${carDays} วัน × ¥${fmtN(D.carInsYenDay)}`);
      add("hep", "รถ", "ETC card + Hokkaido Expressway Pass", "JPY", D.etcYen + (carDays >= 2 ? HEP_PRICE[Math.min(14, carDays)] : 0), `HEP ${Math.min(14, carDays)} วัน`);
      add("fuel", "รถ", "น้ำมัน", "JPY", (carKm / D.kmPerL) * D.fuelYenL, `${fmtN(carKm)} กม. ÷ ${D.kmPerL} กม./ลิตร × ¥${D.fuelYenL}`);
      const cityNights = nightsList.filter((b, i) => HUB[b].city && carIdx.includes(i) && carIdx.includes(i + 1)).length;
      if (cityNights) add("park", "รถ", "ที่จอดรถในเมือง", "JPY", cityNights * D.parkingCityYen, `${cityNights} คืน × ¥${fmtN(D.parkingCityYen)}`);
      const pick = carIdx[0] === 0 ? t.arrive : nightsList[carIdx[0] - 1], drop = carIdx[carIdx.length - 1] === days - 1 ? t.depart : nightsList[carIdx[carIdx.length - 1]];
      if (hubOf(pick) !== hubOf(drop) && !(AIR[pick] && AIR[drop] && pick === drop)) add("oneway", "รถ", "ค่าคืนรถต่างสาขา", "JPY", D.oneWayDropYen, `รับ ${pname(pick).split(" ")[0]} คืน ${pname(drop).split(" ")[0]} (ประมาณ)`);
    }
    // รถไฟ/บัส: ค่าตั๋วรายเที่ยว (ประมาณ ¥28/กม. รวมค่าด่วนพิเศษ) เทียบ JR Pass
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
      const passCost = pd ? JR_PASS[pd] * (t.adults + t.kids * 0.5) : Infinity, ticket = passFare * ppl2;
      const usePass = span > 0 && passCost < ticket;
      if (span) jr = { usePass, text: usePass ? `<b>JR Hokkaido Rail Pass ${pd} วันคุ้ม:</b> ¥${fmtN(passCost)} เทียบตั๋วรายเที่ยว ≈¥${fmtN(ticket)} (ช่วงใช้รถไฟ JR ${span} วัน)` : `<b>JR Pass ยังไม่คุ้ม:</b> ตั๋วรายเที่ยว ≈¥${fmtN(ticket)}${pd ? ` ถูกกว่า Pass ${pd} วัน ¥${fmtN(passCost)}` : ` ช่วงใช้รถไฟ ${span} วันยาวเกิน Pass 10 วัน`}` };
      add("rail", "รถไฟ/บัส", usePass ? `JR Hokkaido Rail Pass ${pd} วัน + บัส` : "ตั๋วรถไฟ/บัสรายเที่ยว", "JPY", (usePass ? passCost : ticket) + (fare - passFare) * ppl2, "ประมาณ ¥28/กม. รวมค่ารถด่วน");
      add("local", "รถไฟ/บัส", "รถไฟใต้ดิน/บัสในเมือง/แท็กซี่", "JPY", D.transitLocalYenDay * ppl * trEv.length, `¥${fmtN(D.transitLocalYenDay)} × ${ppl} คน × ${trEv.length} วัน`);
    }
    const fees = ev.flatMap((e) => e.stops).reduce((a, id) => a + PLACE[id].feeYen, 0);
    add("fees", "เที่ยว", "ค่าเข้า / กระเช้า / เรือ", "JPY", fees * ppl2, S.plan ? `รวมจาก ${ev.flatMap((e) => e.stops).length} สถานที่ในแผน (ประมาณ)` : "ยังไม่มีแผน");
    add("food", "อาหาร", "อาหาร", "JPY", D.foodYen[lv] * ppl * days, `¥${fmtN(D.foodYen[lv])} × ${ppl} คน × ${days} วัน`);
    add("souv", "ช้อปปิ้ง", "ของฝาก / ช้อปปิ้ง", "JPY", D.souvenirYen * t.adults, `¥${fmtN(D.souvenirYen)} × ${t.adults} ผู้ใหญ่`);
    add("gear", "ของ", "ของที่ต้องซื้อเตรียมตัว", "THB", 0, "กรอกเอง (เสื้อกันหนาว บูท ฯลฯ)");
    // รายการที่เพิ่มเอง (ทัวร์ ค่าสกี ฯลฯ): ไม่มีค่าประมาณ จำนวนเงินเก็บใน S.budget[id] เหมือนรายการอื่น
    S.budgetX.forEach((x) => { add(x.id, "อื่นๆ", x.name, "THB", 0, ""); L[L.length - 1].mine = true; });
    // แต่ละรายการจ่ายเป็นบาท เยน หรือทั้งสองได้: S.budget[key] = { b, y } (ค่าเก่าเป็นตัวเลขเดียว = สกุลเงินตั้งต้นของรายการ)
    const split = (l) => {
      const o = S.budget[l.key];
      if (typeof o === "number") return l.cur === "THB" ? { b: o, y: 0, own: true } : { b: 0, y: o, own: true };
      if (o && (o.b != null || o.y != null)) return { b: o.b || 0, y: o.y || 0, own: true };
      return { b: 0, y: 0, own: false };
    };
    const fill = (l) => { Object.assign(l, split(l)); l.thb = l.b + l.y * S.rate; l.estThb = l.cur === "THB" ? l.auto : l.auto * S.rate; };
    const hidden = new Set(S.budgetHide);
    const shown = L.filter((l) => !hidden.has(l.key)).map((l) => (fill(l), l));
    const sub = shown.reduce((a, l) => a + l.thb, 0), r = (sub * D.reservePct) / 100;
    add("reserve", "สำรอง", `เงินสำรอง ${D.reservePct}%`, "THB", 0, "คิดจากยอดที่กรอกแล้ว เผื่อพายุ เลื่อนไฟลต์ ค่ารักษา");
    const res = Object.assign(L[L.length - 1], { b: r, y: 0, thb: r, own: true, estThb: 0 });
    shown.push(res);
    const todo = shown.filter((l) => !l.own && l.auto > 0);
    return { lines: shown, hiddenN: hidden.size, total: sub + r, est: todo.reduce((a, l) => a + l.estThb, 0), todoN: todo.length,
      yen: shown.reduce((a, l) => a + l.y, 0), baht: shown.reduce((a, l) => a + l.b, 0), ppl, jr };
  },

  render() {
    const B = this.calc(), lv = S.trip.level;
    const cats = {};
    B.lines.forEach((l) => l.thb && (cats[l.cat] = (cats[l.cat] || 0) + l.thb));
    const inp = (l, c) => { const o = S.budget[l.key], v = typeof o === "number" ? ((l.cur === "THB") === (c === "b") ? o : "") : o?.[c] ?? "";
      return `<label class="bin"><span>${c === "b" ? "฿" : "¥"}</span><input type="number" min="0" data-bk="${l.key}" data-c="${c}" value="${v}" placeholder="0" aria-label="${esc(l.name)} ${c === "b" ? "บาท" : "เยน"}"></label>`; };
    const hint = (l) => !l.own && l.auto > 0 ? `<div class="bhint">ประมาณ ${l.cur === "JPY" ? `¥${fmtN(l.auto)}` : `${fmtN(l.auto)} ฿`}${l.note ? ` • ${esc(l.note)}` : ""} <button class="linkbtn" data-useauto="${l.key}">ใช้ค่านี้</button></div>`
      : l.note && !l.mine ? `<small class="bnote">${esc(l.note)}</small>` : "";
    const name = (l) => l.mine
      ? `<div class="row bx"><input type="text" data-bxname="${l.key}" value="${esc(l.name)}" placeholder="ชื่อรายการ เช่น ทัวร์ Drift Ice" aria-label="ชื่อรายการ"><button class="btn small ghost" data-bxdel="${l.key}" title="ลบรายการ" aria-label="ลบรายการ ${esc(l.name)}">${I("x")}</button></div>`
      : `<div class="row bx"><b>${esc(l.name)}</b>${l.key === "reserve" ? "" : `<span class="spacer"></span><button class="btn small ghost" data-bhide="${l.key}" title="ไม่ใช้รายการนี้" aria-label="ซ่อน ${esc(l.name)}">${I("x")}</button>`}</div>`;
    const colors = ["#2c6e9b", "#c8374a", "#2f8a57", "#b7791f", "#7b4fb5", "#0f8b8d", "#6a994e", "#3d5a80", "#8a817c"];
    $('[data-sec="budget"]').innerHTML = `
      <div class="sec-head"><h1>งบประมาณ</h1>
        <p class="lead">กรอกราคาจริงที่จองหรือคาดว่าจะจ่าย ยอดรวมนับเฉพาะที่กรอก • ตัวเลขเทา "ประมาณ" คิดจากแผน จำนวนคน และระดับที่พัก ไว้ดูคร่าวๆ กด "ใช้ค่านี้" ถ้ายังไม่รู้ราคาจริง</p></div>
      <div class="card"><div class="summary">
        <div class="k"><b>${fmtN(B.total)} ฿</b><span>กรอกแล้ว (รวมสำรอง)</span></div>
        <div class="k"><b>${fmtN(B.total / B.ppl)} ฿</b><span>เฉลี่ยต่อคน (${B.ppl} คน)</span></div>
        <div class="k"><b>${B.todoN ? `≈${fmtN(B.est)} ฿` : "ครบแล้ว"}</b><span>${B.todoN ? `ยังไม่ได้กรอก ${B.todoN} รายการ (ประมาณ)` : "ทุกรายการกรอกแล้ว"}</span></div>
        <div class="k"><b>¥${fmtN(B.yen)} + ${fmtN(B.baht)} ฿</b><span>จ่ายเป็นเยน + จ่ายเป็นบาท</span></div>
        <div class="k"><label class="f">1 เยน = ? บาท<input type="number" step="0.0001" id="rate" value="${S.rate}"></label>
          <label class="small"><input type="checkbox" id="rateAuto" ${S.set.rateAuto ? "checked" : ""}> อัปเดตอัตโนมัติวันละครั้ง</label></div></div>
        ${B.total ? `<div style="display:flex;height:14px;border-radius:99px;overflow:hidden;margin-top:14px">${Object.entries(cats).map(([c, v], i) => `<div title="${esc(c)} ${fmtN(v)} ฿" style="width:${(v / B.total) * 100}%;background:${colors[i % colors.length]}"></div>`).join("")}</div>
        <div class="row" style="margin-top:6px;font-size:.8rem">${Object.entries(cats).map(([c, v], i) => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${colors[i % colors.length]}"></span> ${esc(c)} ${Math.round((v / B.total) * 100)}%</span>`).join("")}</div>` : ""}
        <div class="row" style="margin-top:12px"><span class="mute small">ระดับที่พัก (ใช้คิดค่าประมาณที่พักและอาหาร):</span><div class="seg" id="lvlSeg">${["ประหยัด", "กลาง", "สบาย"].map((x, i) => `<button data-v="${i}" class="${lv === i ? "on" : ""}">${x}</button>`).join("")}</div></div></div>
      ${B.jr ? `<div class="callout info">${B.jr.text}</div>` : ""}
      <div class="card"><p class="mute small" style="margin:0 0 8px">แต่ละรายการกรอกได้ทั้ง ฿ และ ¥ (เช่น จองที่พักเป็นบาท แต่จ่ายภาษีที่พักเป็นเยน) • ขวาสุด = รวมเป็นบาท • ✕ = ไม่ใช้รายการนี้</p>
        <ul class="blist">${B.lines.map((l) => `${l.key === "reserve" ? `<li class="badd"><button class="btn small" id="bAdd">+ เพิ่มรายการเอง</button>${B.hiddenN ? ` <button class="linkbtn" id="bUnhide">แสดงรายการที่ซ่อน (${B.hiddenN})</button>` : ""}</li>` : ""}<li class="${l.own && !l.mine && l.key !== "reserve" ? "own" : ""}">
          <div>${name(l)}${hint(l)}</div>
          <div class="bamt">${l.key === "reserve" ? "" : inp(l, "b") + inp(l, "y")}<b class="bthb">${l.own ? `${fmtN(l.thb)} ฿` : '<span class="mute">-</span>'}</b></div></li>`).join("")}
          <li class="btot"><b>รวมที่กรอกแล้ว</b><div class="bamt"><span class="mute small">¥${fmtN(B.yen)} + ${fmtN(B.baht)} ฿</span><b class="bthb">${fmtN(B.total)} ฿</b></div></li></ul>
        <div class="row" style="margin-top:8px"><button class="btn small" id="bReset">ล้างจำนวนเงินที่กรอก</button><span class="mute" style="font-size:.8rem">ค่าประมาณอิงราคา พ.ย. 2026 ไว้ดูภาพรวม ไม่ใช่ใบเสนอราคา</span></div></div>`;
  },

  bind() {
    const sec = $('[data-sec="budget"]');
    sec.addEventListener("change", (e) => {
      const el = e.target;
      if (el.id === "rate") { S.rate = Math.max(0.01, +el.value || 0.23); S.set.rateAuto = false; save(); App.renderAll(); return; }
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
      else if (el.dataset.bhide) { S.budgetHide.push(el.dataset.bhide); delete S.budget[el.dataset.bhide]; save(); App.renderAll(); }
      else if (el.id === "bUnhide") { S.budgetHide = []; save(); App.renderAll(); }
      else if (el.parentElement?.id === "lvlSeg") { S.trip.level = +el.dataset.v; save(); App.renderAll(); }
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
