// หน้า "งบประมาณ": ประมาณจากแผนอัตโนมัติ แก้ทับได้ทุกบรรทัด
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
      add("idp", "รถ", "ใบขับขี่สากล (IDP)", "THB", D.idpTHB * Math.max(1, t.drivers), `${D.idpTHB} × ${Math.max(1, t.drivers)} คนขับ`);
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
    const val = (l) => (S.budget[l.key] ?? l.auto);
    const thb = (l) => (l.cur === "THB" ? val(l) : val(l) * S.rate);
    const sub = L.reduce((a, l) => a + thb(l), 0);
    add("reserve", "สำรอง", `เงินสำรอง ${D.reservePct}%`, "THB", (sub * D.reservePct) / 100, "เผื่อพายุ เลื่อนไฟลต์ ค่ารักษา");
    L.forEach((l) => (l.thb = thb(l)));
    return { lines: L, total: L.reduce((a, l) => a + l.thb, 0), ppl, jr };
  },

  render() {
    const B = this.calc();
    const cats = {};
    B.lines.forEach((l) => (cats[l.cat] = (cats[l.cat] || 0) + l.thb));
    const colors = ["#2c6e9b", "#c8374a", "#2f8a57", "#b7791f", "#7b4fb5", "#0f8b8d", "#6a994e", "#3d5a80", "#8a817c"];
    $('[data-sec="budget"]').innerHTML = `
      <div class="sec-head"><h1>งบประมาณ</h1>
        <p class="lead">ประมาณจากแผนการเดินทาง จำนวนคน และระดับที่พักโดยอัตโนมัติ ใส่ราคาจริงทับในช่องได้ ช่องว่างใช้ค่าประมาณ</p></div>
      <div class="card"><div class="summary">
        <div class="k"><b>${fmtN(B.total)} ฿</b><span>รวมทั้งทริป</span></div>
        <div class="k"><b>${fmtN(B.total / B.ppl)} ฿</b><span>เฉลี่ยต่อคน</span></div>
        <div class="k"><b>¥${fmtN(B.total / S.rate)}</b><span>เทียบเป็นเยน</span></div>
        <div class="k"><label class="f">อัตรา 1 เยน = ? บาท ${S.set.rateAuto ? "<small>(อัปเดตอัตโนมัติ)</small>" : ""}<input type="number" step="0.0001" id="rate" value="${S.rate}"></label></div></div>
        <div style="display:flex;height:14px;border-radius:99px;overflow:hidden;margin-top:14px">${Object.entries(cats).map(([c, v], i) => `<div title="${esc(c)} ${fmtN(v)} ฿" style="width:${(v / B.total) * 100}%;background:${colors[i % colors.length]}"></div>`).join("")}</div>
        <div class="row" style="margin-top:6px;font-size:.8rem">${Object.entries(cats).map(([c, v], i) => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${colors[i % colors.length]}"></span> ${esc(c)} ${Math.round((v / B.total) * 100)}%</span>`).join("")}</div></div>
      ${Spend.section(B)}
      ${B.jr ? `<div class="callout info">${B.jr.text}</div>` : ""}
      <div class="card"><div class="tbl-wrap"><table class="t bt"><thead><tr><th>หมวด</th><th>รายการ</th><th class="num">จำนวนเงิน</th><th class="num">บาท</th></tr></thead><tbody>
        ${B.lines.map((l) => `<tr><td>${esc(l.cat)}</td><td><b>${esc(l.name)}</b>${l.note ? `<small class="bnote">${esc(l.note)}</small>` : ""}</td>
          <td class="num" style="white-space:nowrap">${l.cur === "JPY" ? "¥" : "฿"} <input type="number" data-bk="${l.key}" placeholder="${l.auto}" value="${S.budget[l.key] ?? ""}" style="width:100px;text-align:right" ${l.key === "reserve" ? "disabled" : ""}></td>
          <td class="num"><b>${fmtN(l.thb)}</b></td></tr>`).join("")}
        <tr><td></td><td colspan="2"><b>รวม</b></td><td class="num"><b>${fmtN(B.total)}</b></td></tr></tbody></table></div>
        <div class="row" style="margin-top:8px"><button class="btn small" id="bReset">ล้างค่าที่กรอกเอง</button><span class="mute" style="font-size:.8rem">ราคาเป็นค่าประมาณ (พ.ย. 2026) ใช้เพื่อดูภาพรวม ไม่ใช่ใบเสนอราคา</span></div></div>`;
  },

  bind() {
    const sec = $('[data-sec="budget"]');
    sec.addEventListener("change", (e) => {
      const el = e.target;
      if (el.id === "rate") { S.rate = Math.max(0.01, +el.value || 0.23); S.set.rateAuto = false; save(); this.render(); return; }
      if (el.dataset.bk) { if (el.value === "") delete S.budget[el.dataset.bk]; else S.budget[el.dataset.bk] = +el.value; save(); this.render(); }
    });
    sec.addEventListener("click", (e) => { if (e.target.id === "bReset" && confirm("ล้างค่าที่กรอกเองทั้งหมด?")) { S.budget = {}; save(); this.render(); } });
  },
};
