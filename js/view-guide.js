// แท็บ "คู่มือ": คู่มือฉบับย่อ, ฐานที่พัก (ก่อนมีแผน), เอกสาร + ฉุกเฉิน
const usesCar = () => Planner.usedModes().has("car");
const usesTransit = () => Planner.usedModes().has("transit");

const STAY_TIPS = "จองล่วงหน้า 3-4 เดือน (ช่วงเทศกาลหิมะ 6 เดือน) • ขับรถ: เลือกที่มีที่จอด ถามค่าจอดและต้องจองไหม • นั่งรถไฟ: เลือกใกล้สถานี เดินลากกระเป๋าบนหิมะลำบาก • เรียวกังออนเซ็นมักรวมอาหารเย็น-เช้า และต้องเช็กอินก่อน ~18:00 • พักฐานเดิม 2 คืนขึ้นไปช่วยให้ไม่ต้องแพ็กกระเป๋าทุกวัน";

const GuideView = {
  // คู่มือฉบับย่อ: เฉพาะเรื่องที่คนไทยไม่รู้และหาที่อื่นยาก กรองตามวิธีเดินทางและฤดูของทริป
  guide() {
    const car = usesCar(), tr = usesTransit(), winter = isWinter(S.trip.start) || isWinter(S.trip.end), B = tr ? BudgetView.calc() : null;
    $('[data-sec="guide"]').innerHTML = `
      <div class="sec-head"><h1>คู่มือฉบับย่อ</h1>
        <p class="lead">เรื่องที่คนไทยมักไม่รู้ก่อนไป กรองตามทริปนี้ (${MODE[S.trip.mode]}${winter ? ", หน้าหนาว" : ""}) • ข้อมูลทั่วไปเรื่องเมือง/ที่เที่ยว ดูในหน้าสถานที่หรือ Google</p></div>
      <div class="card"><h2>รู้ไว้ก่อนไป</h2><div class="facts">${GUIDE.quick.map(([k, v]) => `<div class="fact"><b>${esc(k)}</b>${esc(v)}</div>`).join("")}</div></div>
      ${winter ? `<div class="card"><h2>หน้าหนาว: อากาศและแสงแดด</h2><div class="tbl-wrap"><table class="t">
        <thead><tr><th>เดือน</th><th class="num">สูงสุด °C</th><th class="num">ต่ำสุด °C</th><th>พระอาทิตย์ตก</th><th>ข้อสังเกต</th></tr></thead>
        <tbody>${SHEET.weather.map((w) => `<tr><td><b>${esc(w.month)}</b></td><td class="num">${esc(w.hi)}</td><td class="num">${esc(w.lo)}</td><td>${esc(w.sunset)}</td><td>${esc(w.note)}</td></tr>`).join("")}</tbody></table></div>
        <dl class="kv" style="margin-top:12px">${SHEET.facts.map((f) => `<dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd>`).join("")}</dl></div>` : ""}
      ${car ? `<div class="card" id="g-drive"><h2>ขับรถหน้าหนาว: อ่านให้จบก่อนรับรถ</h2>
        ${SHEET.driveTips.map((s, i) => `<details ${i < 3 ? "open" : ""} style="margin-bottom:8px"><summary><b>${esc(s.title)}</b></summary>
          <div class="tbl-wrap"><table class="t">${s.items.map((r) => `<tr><td style="width:28%"><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td class="mute">${esc(r[2])}</td></tr>`).join("")}</table></div></details>`).join("")}</div>
      <div class="card"><h2>ถนนปิดและช่องเขาเสี่ยง</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>ถนน / จุด</th><th>สถานะหน้าหนาว</th><th>ผล</th><th>ทางเลือก</th></tr></thead>
        <tbody>${ROADS.map((r) => `<tr><td><b>${esc(r.road)}</b></td><td>${esc(r.status)}</td><td>${esc(r.effect)}</td><td>${esc(r.alt)}</td></tr>`).join("")}</tbody></table></div>
        <p class="mute" style="font-size:.8rem">ตรวจสถานะถนนทุกเช้า: <a href="https://www.jartic.or.jp/" target="_blank" rel="noopener">JARTIC</a></p></div>` : ""}
      ${tr ? `<div class="card" id="g-transit"><h2>รถไฟและบัส</h2>${B.jr ? `<div class="callout info">${B.jr.text}</div>` : ""}
        <dl class="kv">${GUIDE.transitTips.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
        <p class="mute" style="font-size:.8rem">ตารางจริง: <a href="https://www.jrhokkaido.co.jp/global/" target="_blank" rel="noopener">JR Hokkaido</a> หรือ Google Maps</p></div>` : ""}
      <h2 id="g-life" style="margin-top:20px">ใช้ชีวิตที่นั่น</h2>
      <div class="grid g2">${GUIDE.life.map((c) => `<div class="card"><h3>${esc(c.title)}</h3><ul class="tip-list">${c.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>
      <div class="card"><h2>เช็กลิสต์ประจำวัน</h2><div class="grid g2">${SHEET.daily.filter((d) => car || !/รถ/.test(d.title)).map((d) => `<div><h3>${esc(d.title)}</h3>
        <ul class="tip-list">${d.items.filter((x) => !x.opt && (car || !/ปัดหิมะ|ท่อไอเสีย|นำทาง|น้ำมัน|ใบปัด|ไล่ฝ้า|ใบขับขี่/.test(x.text))).map((x) => `<li>${esc(x.text)}${x.why ? ` <small>(${esc(x.why)})</small>` : ""}</li>`).join("")}</ul></div>`).join("")}</div></div>
      <div class="card"><h2>กฎ ข้อห้าม และมารยาท</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>เรื่อง</th><th>กฎ</th><th>รายละเอียด</th></tr></thead>
        <tbody>${SHEET.rules.filter((r) => car || !/ขับรถ|ใบขับขี่/.test(r.topic)).map((r) => `<tr><td><b>${esc(r.topic)}</b></td><td>${esc(r.rule)}</td><td>${esc(r.detail)}</td></tr>`).join("")}</tbody></table></div></div>`;
  },

  stay() {
    const ids = S.plan ? [...new Set(S.plan.bases)] : HUBS.map((h) => h.id);
    const nights = {};
    if (S.plan) S.plan.bases.forEach((b, i) => (nights[b] ||= []).push(i));
    const lv = S.trip.level, rooms = Math.ceil((S.trip.adults + S.trip.kids) / 2);
    $('[data-sec="stays"]').innerHTML = `
      <div class="sec-head"><h1>ที่พัก</h1>
        <p class="lead">${S.plan ? "ฐานที่พักตามแผนของคุณ" : "ฐานที่พักทั้งหมด (สร้างแผนก่อนเพื่อดูเฉพาะที่ใช้)"} ราคาเป็นช่วงโดยประมาณต่อห้องคู่ต่อคืนในหน้าหนาว ไม่ใช่ราคาจริงของโรงแรมใด กดลิงก์เพื่อค้นราคาจริง • <a href="#setup">สร้างแผน</a>แล้วกลับมากรอกที่พักที่จองได้ที่นี่</p></div>
      <div class="callout info"><b>หลักเลือกที่พักหน้าหนาว:</b> ${STAY_TIPS}</div>
      <div class="card"><h2>${S.plan ? "ที่พักตามแผน" : "ฐานที่พักทั้งหมด"}</h2><div class="map" id="hubMap"></div>
        <p class="map-note">${S.plan ? "เส้นประ = ลำดับการย้ายที่พัก • " : ""}ป้าย = ชื่อเมือง ${S.plan ? "จำนวนคืน " : ""}และราคาห้องต่อคืนตามระดับที่เลือก</p></div>
      <div class="row no-print" style="margin-bottom:12px"><span class="mute">ระดับที่พัก/งบ:</span><div class="seg" id="lvlSeg">${["ประหยัด", "กลาง", "สบาย"].map((x, i) => `<button data-v="${i}" class="${lv === i ? "on" : ""}">${x}</button>`).join("")}</div>
        <span class="mute">${rooms} ห้อง (ห้องละ 2 คน)</span></div>
      <div class="grid g2">${ids.map((id) => { const h = HUB[id], im = (window.HUB_IMG || {})[id]; return `<div class="card pcard">
        <div class="ph">${im ? `<img src="${im.img}" alt="${esc(h.name)}" loading="lazy">` : I("hotel")}</div>
        <div class="row"><h3 style="margin:0">${esc(h.name)}</h3>${nights[id] ? `<span class="badge b-info">${nights[id].length} คืน: คืนที่ ${nights[id].map((i) => i + 1).join(", ")}</span>` : ""}${h.rail ? '<span class="badge b-mute">' + I("train-front") + ' มีรถไฟ</span>' : ""}</div>
        <dl class="kv" style="margin-top:8px"><dt>พักย่านไหน</dt><dd>${esc(h.stay)}</dd><dt>ข้อดี</dt><dd>${esc(h.pros)}</dd><dt>ข้อควรรู้</dt><dd>${esc(h.cons)}</dd>
          <dt>ราคา/ห้อง/คืน</dt><dd>${h.price.map((p, i) => `<span style="${i === lv ? "font-weight:700" : "color:var(--mute)"}">¥${fmtN(p)}</span>`).join(" / ")} <small>(≈${fmtN(h.price[lv] * S.rate)} บาท)</small></dd>
          <dt>ช่วงพีค</dt><dd>${esc(h.peak)}</dd></dl>
        <div class="row" style="margin-top:8px">${BOOKING_SITES.map((b) => `<a class="btn small" target="_blank" rel="noopener" href="${b.url(HUB_EN[id])}">${b.name}</a>`).join("")}
          <a class="btn small" target="_blank" rel="noopener" href="${gimgUrl(HUB_EN[id] + " winter hotel")}">${I("image")} รูปที่พักใน Google</a></div>
        ${im ? `<a class="credit" href="${im.credit}" target="_blank" rel="noopener">ที่มาภาพ: Wikimedia Commons</a>` : ""}</div>`; }).join("")}</div>`;
    TripMap.drawBases(makeMap($("#hubMap")));
    $("#lvlSeg").onclick = (e) => { const v = e.target.dataset.v; if (v != null) { S.trip.level = +v; save(); App.renderAll(); } };
  },

  emergency() {
    $('[data-sec="emergency"]').innerHTML = `
      <div class="sec-head"><h1>เอกสารและฉุกเฉิน</h1>
        <p class="lead">เลขจอง เบอร์โทร และเบอร์ฉุกเฉินรวมไว้ที่เดียว ใช้ได้ตอนออฟไลน์ • พิมพ์หน้านี้ใส่กระเป๋าได้</p></div>
      ${Docs.section()}
      <div>
        <div class="card"><h2>เบอร์ฉุกเฉิน</h2><table class="t">${SHEET.contacts.filter((c) => usesCar() || !/รถเช่า|JAF/.test(c.who)).map((c) => `<tr><td><b>${esc(c.who)}</b></td><td style="font-size:1.05rem">${c.num ? esc(c.num) : '<span class="mute">กรอกเอง ______</span>'}</td><td class="mute">${esc(c.when)}</td></tr>`).join("")}</table></div>
      </div>
      <div class="card"><h2>ประโยคญี่ปุ่นจำเป็น</h2>${SHEET.phrases.filter((p) => usesCar() || !/น้ำมัน|ที่จอด|ถนน|รถขยับ/.test(p.th)).map((p) => `<div class="phrase"><div>${esc(p.th)}</div><div class="ja">${esc(p.ja)}</div><div class="mute">${esc(p.read)}</div></div>`).join("")}</div>
      <div class="card no-print"><h2>แหล่งข้อมูลทางการ</h2><ul class="tip-list">${SHEET.sources.map((s) => `<li>${/^https?:/.test(s.url) ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : `${esc(s.name)}: ${esc(s.url)}`}</li>`).join("")}</ul>
        <p class="mute" style="font-size:.8rem">ข้อมูลเพิ่มเติม (ตรวจ พ.ย. 2026): ราคา JR Hokkaido Rail Pass / HEP / มาตรการยกเว้นวีซ่าคนไทยถึง 30 มิ.ย. 2027 ราคาและกฎเปลี่ยนได้ ตรวจอีกครั้งก่อนจอง</p></div>`;
  },


};
