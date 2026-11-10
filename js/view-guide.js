// แท็บ "คู่มือ": รู้จักฮอกไกโด, การเดินทาง, ฐานที่พัก, ใช้ชีวิต, แอป, ฉุกเฉิน
const usesCar = () => Planner.usedModes().has("car");
const usesTransit = () => Planner.usedModes().has("transit");

const STAY_TIPS = "จองล่วงหน้า 3-4 เดือน (ช่วงเทศกาลหิมะ 6 เดือน) • ขับรถ: เลือกที่มีที่จอด ถามค่าจอดและต้องจองไหม • นั่งรถไฟ: เลือกใกล้สถานี เดินลากกระเป๋าบนหิมะลำบาก • เรียวกังออนเซ็นมักรวมอาหารเย็น-เช้า และต้องเช็กอินก่อน ~18:00 • พักฐานเดิม 2 คืนขึ้นไปช่วยให้ไม่ต้องแพ็กกระเป๋าทุกวัน";

const GuideView = {
  know() {
    $('[data-sec="know"]').innerHTML = `
      <div class="sec-head"><h1>รู้จักฮอกไกโด</h1>
        <p class="lead">ฮอกไกโดคือเกาะเหนือสุดของญี่ปุ่น ขนาดใกล้เคียงภาคอีสานครึ่งหนึ่ง หน้าหนาวหิมะตกหนักตั้งแต่ ธ.ค. ถึง มี.ค. หน้าร้อนเย็นสบาย ทุ่งดอกไม้ ทริปแรกเลือกเที่ยวแค่ 2-3 ภูมิภาคก็พอ</p></div>
      <div class="card"><h2>รู้ไว้ก่อนไป</h2><div class="facts">${GUIDE.quick.map(([k, v]) => `<div class="fact"><b>${esc(k)}</b>${esc(v)}</div>`).join("")}</div></div>
      <div class="card"><h2>แผนที่ภูมิภาคและเวลาเดินทางจากสนามบิน</h2>
        <p class="mute" style="font-size:.85rem">วงสี = ภูมิภาค ป้ายบอกระยะจากสนามบิน New Chitose (CTS) และ ${I("star")} = เหมาะกับทริปแรก • จุดเล็ก = เมืองที่ใช้เป็นฐานพัก ชี้/แตะเพื่อดูเวลาขับ (หน้าหนาว) และรถไฟ</p>
        <div class="map" id="regionMap" style="height:560px"></div></div>
      <div class="card"><h2>อากาศทั้งปี (ค่าเฉลี่ย)</h2><div class="tbl-wrap"><table class="t climate">
        <thead><tr><th>เดือน</th>${CLIMATE.cities.map((c) => `<th class="num">${esc(c.name)}<br><small>สูง/ต่ำ °C</small></th>`).join("")}<th class="num">หิมะ/ฝน<br><small>วัน (ซัปโปโร)</small></th><th>เด่น</th></tr></thead>
        <tbody>${MO.map((m, i) => `<tr class="${tripMonths().includes(i + 1) ? "hit" : ""}"><td><b>${m}</b></td>${CLIMATE.cities.map((c) => `<td class="num">${c.hi[i]} / ${c.lo[i]}</td>`).join("")}<td class="num">${CLIMATE.wetDays[i]}</td><td class="small">${esc(CLIMATE.note[i])}</td></tr>`).join("")}</tbody></table></div>
        <p class="mute small">ค่าเฉลี่ยประมาณจากสถิติ JMA 1991-2020 (ปัดเศษ) แถวที่เน้น = เดือนที่คุณไป</p></div>
      <div class="card"><h2>หน้าหนาว: อากาศและแสงแดด</h2><div class="tbl-wrap"><table class="t">
        <thead><tr><th>เดือน</th><th class="num">สูงสุด °C</th><th class="num">ต่ำสุด °C</th><th>พระอาทิตย์ตก</th><th>ข้อสังเกต</th></tr></thead>
        <tbody>${SHEET.weather.map((w) => `<tr><td><b>${esc(w.month)}</b></td><td class="num">${esc(w.hi)}</td><td class="num">${esc(w.lo)}</td><td>${esc(w.sunset)}</td><td>${esc(w.note)}</td></tr>`).join("")}</tbody></table></div>
        <dl class="kv" style="margin-top:12px">${SHEET.facts.map((f) => `<dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd>`).join("")}</dl></div>
      <div class="card"><h2>เดือนไหนดี</h2><div class="grid g4">
        ${[["ธันวาคม", "ไฟประดับ คริสต์มาส หิมะเริ่มหนา มืดเร็วที่สุด ราคายังไม่แพง (ยกเว้นปลายเดือน)"],
          ["มกราคม", "หนาวที่สุด หิมะผงดีที่สุดสำหรับสกี ทุ่งขาวสวยสุด ปีใหม่ร้านปิดหลายวัน"],
          ["กุมภาพันธ์", "เทศกาลหิมะซัปโปโร 4-11 ก.พ. 2027 Snow Light Path ทะเลน้ำแข็ง คนเยอะ ที่พักแพง"],
          ["มีนาคม", "อุ่นขึ้น หิมะเริ่มละลาย ถนนเปียก/แฉะ ราคาถูกลง ทะเลน้ำแข็งเหลือถึงต้นเดือน"]]
          .map(([m, d]) => `<div class="fact"><b>${m}</b>${d}</div>`).join("")}</div></div>
      <div class="card"><h2>ภูมิภาค</h2><div class="tbl-wrap"><table class="t">
        <thead><tr><th>ภูมิภาค</th><th>ฐานพัก</th><th>จากสนามบิน CTS</th><th>เด่นเรื่อง</th><th>ทริปแรก?</th></tr></thead>
        <tbody>${GUIDE.regions.map((r) => `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.hubs)}</td><td>${esc(r.fromCTS)}</td><td>${esc(r.vibe)}</td>
          <td>${r.first ? '<span class="badge b-good">เหมาะ</span>' : '<span class="badge b-mute">ครั้งต่อไป/มีประสบการณ์</span>'}</td></tr>`).join("")}</tbody></table></div></div>`;
    TripMap.drawRegions(makeMap($("#regionMap")));
  },

  transport() {
    const car = usesCar(), tr = usesTransit();
    const B = BudgetView.calc();
    $('[data-sec="transport"]').innerHTML = `
      <div class="sec-head"><h1>การเดินทาง</h1>
        <p class="lead">ตอนนี้เลือก <b>${MODE[S.trip.mode]}</b> เปลี่ยนได้ใน <a href="#setup">ข้อมูลทริป</a> หน้านี้แสดงเนื้อหาตามวิธีเดินทางที่เลือก</p></div>
      <div class="grid g2">${GUIDE.travelModes.map((m) => `<div class="card ${m.id === S.trip.mode ? "tpl on" : ""}"><h3>${m.name}</h3>
        <ul class="tip-list">${m.good.map((x) => `<li>✓ ${esc(x)}</li>`).join("")}${m.bad.map((x) => `<li class="mute">✕ ${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>
      <div class="card"><h2>แผนที่เส้นทาง${car && tr ? "ถนนและรถไฟ" : car ? "ถนน" : "รถไฟ/บัส"}</h2>
        <div class="map" id="netMap" style="height:560px"></div>
        <div class="map-legend">${tr ? '<span><i style="background:#2c6e9b;height:4px"></i>รถไฟ JR (ใช้ JR Pass ได้)</span><span><i style="background:repeating-linear-gradient(90deg,#2c6e9b 0 4px,transparent 4px 10px)"></i>บัส / ไม่รวม JR Pass</span>' : ""}
          ${car ? '<span><i style="background:#2f8a57"></i>ถนนเสี่ยงต่ำ</span><span><i style="background:#d08c1a"></i>ปานกลาง</span><span><i style="background:#c8374a"></i>เสี่ยงสูง/ช่องเขา</span><span>' + I("ban") + ' ถนนปิดหน้าหนาว</span><span>' + I("triangle-alert") + ' ช่องเขาที่ต้องระวัง</span>' : ""}
          <span>เส้นลากตรงระหว่างเมือง ชี้เมาส์/แตะเพื่อดูเวลา</span></div></div>
      <div class="callout">ไม่มีใครในกลุ่มเคยขับบนหิมะ: เลือกรูท "มือใหม่" ขับวันละไม่เกิน 2 ชม. หรือใช้รถไฟช่วงไกล แล้วเช่ารถเฉพาะวันที่จำเป็น กฎข้อแรกของการขับหน้าหนาว: ถ้าอากาศแย่ ไม่ต้องไป</div>
      ${tr ? `<div class="card"><h2>รถไฟและบัส</h2>
        ${B.jr ? `<div class="callout info">${B.jr.text}</div>` : ""}
        <dl class="kv">${GUIDE.transitTips.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
        <h3 style="margin-top:14px">เส้นทางหลักระหว่างฐาน</h3><div class="tbl-wrap"><table class="t"><thead><tr><th>จาก</th><th>ถึง</th><th>เวลา</th><th>รถ</th><th>JR Pass</th><th>ความถี่</th></tr></thead>
        <tbody>${TRANSIT_EDGES.map((e) => `<tr><td>${esc(pname(e.a))}</td><td>${esc(pname(e.b))}</td><td>${fmtH(e.h)}</td><td>${esc(e.by)}</td><td>${e.pass ? "✓" : "-"}</td><td>${esc(e.freq)}</td></tr>`).join("")}</tbody></table></div>
        <p class="mute" style="font-size:.8rem">เวลาโดยประมาณ ตรวจตารางจริงที่ <a href="https://www.jrhokkaido.co.jp/global/" target="_blank" rel="noopener">JR Hokkaido</a> หรือ Google Maps</p></div>` : ""}
      ${car ? `<div class="card"><h2>ขับรถหน้าหนาว: อ่านให้จบก่อนรับรถ</h2>
        ${SHEET.driveTips.map((s, i) => `<details ${i < 3 ? "open" : ""} style="margin-bottom:8px"><summary><b>${esc(s.title)}</b></summary>
          <div class="tbl-wrap"><table class="t">${s.items.map((r) => `<tr><td style="width:28%"><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td class="mute">${esc(r[2])}</td></tr>`).join("")}</table></div></details>`).join("")}</div>
      <div class="card"><h2>ถนนปิดและช่องเขาเสี่ยง</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>ถนน / จุด</th><th>สถานะหน้าหนาว</th><th>ผล</th><th>ทางเลือก</th></tr></thead>
        <tbody>${ROADS.map((r) => `<tr><td><b>${esc(r.road)}</b></td><td>${esc(r.status)}</td><td>${esc(r.effect)}</td><td>${esc(r.alt)}</td></tr>`).join("")}</tbody></table></div>
        <p class="mute" style="font-size:.8rem">ตรวจสถานะถนนทุกเช้า: <a href="https://www.jartic.or.jp/" target="_blank" rel="noopener">JARTIC</a></p></div>
      <div class="card"><h2>ระยะทางและเวลาขับระหว่างจุดหลัก</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>จาก</th><th>ถึง</th><th class="num">กม.</th><th class="num">ปกติ</th><th class="num">หน้าหนาว ×1.5</th><th>ถนน</th><th>ความเสี่ยง</th></tr></thead>
        <tbody>${DRIVE_EDGES.map((e) => `<tr><td>${esc(pname(e.a))}</td><td>${esc(pname(e.b))}</td><td class="num">${e.km}</td><td class="num">${fmtH(e.h)}</td><td class="num"><b>${fmtH(e.h * WINTER)}</b></td><td>${esc(e.road)}</td>
          <td><span class="badge ${e.high ? "b-bad" : /ต่ำ/.test(e.risk) ? "b-good" : "b-warn"}">${esc(e.risk)}</span></td></tr>`).join("")}</tbody></table></div></div>` : ""}
      `;
    TripMap.drawNetwork(makeMap($("#netMap")), { car, transit: tr });
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
    $("#lvlSeg").onclick = (e) => { const v = e.target.dataset.v; if (v != null) { S.trip.level = +v; save(); this.stay(); } };
  },

  life() {
    const car = usesCar();
    $('[data-sec="life"]').innerHTML = `
      <div class="sec-head"><h1>ใช้ชีวิตที่นั่น</h1>
        <p class="lead">เรื่องในชีวิตประจำวันที่คนไทยมักไม่รู้ก่อนไป และเช็กลิสต์ที่ควรทำทุกวัน</p></div>
      <div class="grid g2">${GUIDE.life.map((c) => `<div class="card"><h3>${esc(c.title)}</h3><ul class="tip-list">${c.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>
      <div class="card"><h2>เช็กลิสต์ประจำวัน</h2><div class="grid g2">${SHEET.daily.filter((d) => car || !/รถ/.test(d.title)).map((d) => `<div><h3>${esc(d.title)}</h3>
        ${(() => { const xs = d.items.filter((x) => car || !/ปัดหิมะ|ท่อไอเสีย|นำทาง|น้ำมัน|ใบปัด|ไล่ฝ้า|ใบขับขี่/.test(x.text)), opt = xs.filter((x) => x.opt);
          const li = (x) => `<li>${esc(x.text)}${x.why ? ` <small>(${esc(x.why)})</small>` : ""}</li>`;
          return `<ul class="tip-list">${xs.filter((x) => !x.opt).map(li).join("")}</ul>${opt.length ? `<details class="more"><summary>ของเสริม (ไม่บังคับ) ${opt.length} ข้อ</summary><ul class="tip-list">${opt.map(li).join("")}</ul></details>` : ""}`; })()}</div>`).join("")}</div></div>
      <div class="card"><h2>กฎ ข้อห้าม และมารยาท</h2><div class="tbl-wrap"><table class="t"><thead><tr><th>เรื่อง</th><th>กฎ</th><th>รายละเอียด</th></tr></thead>
        <tbody>${SHEET.rules.filter((r) => car || !/ขับรถ|ใบขับขี่/.test(r.topic)).map((r) => `<tr><td><b>${esc(r.topic)}</b></td><td>${esc(r.rule)}</td><td>${esc(r.detail)}</td></tr>`).join("")}</tbody></table></div></div>
      <details class="card opt"><summary><b>ของเสริม (ไม่บังคับ): เก็บความทรงจำ</b> <small>เทคนิคถ่ายรูปหิมะและไอเดียบันทึกทริป</small></summary><div class="tbl-wrap"><table class="t"><thead><tr><th>หมวด</th><th>ทำอะไร</th><th>วิธี / เทคนิค</th></tr></thead>
        <tbody>${SHEET.memory.map((m) => `<tr><td>${esc(m.cat)}</td><td><b class="${m.prio === 1 ? "prio1" : ""}">${esc(m.item)}</b></td><td>${esc(m.how)}</td></tr>`).join("")}</tbody></table></div></details>`;
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

  apps() {
    const used = Planner.usedModes(), show = (a) => !a.mode || used.has(a.mode);
    const card = (a) => `<div class="card appcard"><div class="row"><span class="app-ic">${I(a.ic)}</span><div><h3 style="margin:0">${esc(a.name)}</h3><small class="mute">${esc(a.when)}</small></div></div>
      <p>${esc(a.what)}</p>${a.setup ? `<p class="small"><b>ตั้งค่าก่อนบิน:</b> ${esc(a.setup)}</p>` : ""}
      <div class="row">${a.web ? `<a class="btn small" href="${esc(a.web)}" target="_blank" rel="noopener">${I("globe")} เว็บไซต์</a>` : ""}
        ${a.play ? `<a class="btn small" href="https://play.google.com/store/search?q=${encodeURIComponent(a.play)}&c=apps" target="_blank" rel="noopener">${I("play")} Google Play</a>` : ""}
        ${a.ios ? `<a class="btn small" href="${gUrl(a.ios + " site:apps.apple.com")}" target="_blank" rel="noopener"> App Store</a>` : ""}</div></div>`;
    const groups = {};
    APPS.filter(show).forEach((a) => (groups[a.grp] ||= []).push(a));
    $('[data-sec="apps"]').innerHTML = `<div class="sec-head"><h1>แอปแนะนำ</h1><p class="lead">ลงและตั้งค่าที่บ้านก่อนบิน (ต้องใช้ Wi-Fi และบางแอปต้องยืนยันเบอร์ไทย) • แสดงตามวิธีเดินทางที่เลือก (${[...used].map((m) => LEG_MODE[m]?.name).join(" + ")}) • ลิงก์ร้านค้าแอปเป็นลิงก์ค้นหา ตรวจชื่อผู้พัฒนาก่อนติดตั้ง</p></div>
      ${Object.entries(groups).map(([g, xs]) => `<h2>${esc(g)}</h2><div class="grid g3">${xs.map(card).join("")}</div>`).join("")}`;
  },
};
