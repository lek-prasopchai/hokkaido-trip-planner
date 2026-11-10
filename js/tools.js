// เครื่องมือระหว่างทริป: บันทึกค่าใช้จ่ายจริง, แปลงเยน-บาท, ส่งออกปฏิทิน (.ics), กระเป๋าเอกสาร
// ข้อมูลเก็บใน S.spend / S.docs เฉพาะเครื่องนี้ ไม่ติดไปกับลิงก์แชร์ (มีเลขจอง/เบอร์ส่วนตัว)

// ---------- ค่าใช้จ่ายจริง ----------
const SPEND_CATS = ["อาหาร", "รถไฟ/บัส", "รถ", "ที่พัก", "เที่ยว", "ช้อปปิ้ง", "อื่นๆ"];
const Spend = {
  thb: (x) => (x.cur === "THB" ? x.amt : x.amt * (x.rate || S.rate)),
  total: () => S.spend.reduce((a, x) => a + Spend.thb(x), 0),

  open(i) {
    const x = S.spend[i] || { d: jstNow().iso, cat: "อาหาร", cur: "JPY", amt: "", note: "" };
    const d = Modal.open(`<h2>${i != null ? "แก้รายการ" : "บันทึกค่าใช้จ่าย"}</h2>
      <form id="spForm" class="form">
        <label class="f">จำนวนเงิน<input type="number" inputmode="decimal" min="0" step="any" name="amt" value="${esc(x.amt)}" required autofocus></label>
        <label class="f">สกุลเงิน<select name="cur"><option value="JPY" ${x.cur === "JPY" ? "selected" : ""}>เยน (¥)</option><option value="THB" ${x.cur === "THB" ? "selected" : ""}>บาท (฿)</option></select></label>
        <label class="f">หมวด<select name="cat">${SPEND_CATS.map((c) => `<option ${c === x.cat ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        <label class="f">วันที่<input type="date" name="d" value="${esc(x.d)}"></label>
        <label class="f" style="grid-column:1/-1">โน้ต<input type="text" name="note" value="${esc(x.note)}" placeholder="เช่น ราเมงร้าน Santouka"></label>
        <p class="mute small" id="spThb" style="grid-column:1/-1;margin:0"></p>
        <div class="row" style="grid-column:1/-1"><button class="btn primary">บันทึก</button>${i != null ? `<button type="button" class="btn red" id="spDel">ลบ</button>` : ""}</div>
      </form>`);
    const f = $("#spForm"), conv = () => { const a = +f.amt.value || 0; $("#spThb").textContent = f.cur.value === "JPY" ? `≈ ${fmtN(a * S.rate)} บาท (1 เยน = ${S.rate} บาท)` : `≈ ¥${fmtN(a / S.rate)}`; };
    f.oninput = conv; conv();
    f.onsubmit = (e) => {
      e.preventDefault();
      const amt = +f.amt.value;
      if (!(amt > 0)) return toast("ใส่จำนวนเงินก่อน");
      const y = { id: x.id || Date.now().toString(36), d: f.d.value || jstNow().iso, cat: f.cat.value, cur: f.cur.value, amt, note: f.note.value.trim(), rate: x.rate || S.rate };
      if (i != null) S.spend[i] = y; else S.spend.push(y);
      save(); Modal.close(); toast(`บันทึกแล้ว ${y.cur === "JPY" ? "¥" : "฿"}${fmtN(amt)}`); App.renderAll();
    };
    if ($("#spDel")) $("#spDel").onclick = () => { S.spend.splice(i, 1); save(); Modal.close(); App.renderAll(); };
    return d;
  },

  // ส่วนในหน้างบ: ใช้จริงเทียบงบที่ประมาณไว้ รายหมวด + รายการรายวัน
  section(B) {
    const L = S.spend, spent = this.total(), est = {}, by = {};
    B.lines.forEach((l) => (est[l.cat] = (est[l.cat] || 0) + l.thb));
    L.forEach((x) => (by[x.cat] = (by[x.cat] || 0) + this.thb(x)));
    const days = {};
    L.map((x, i) => ({ ...x, i })).sort((a, b) => b.d.localeCompare(a.d) || b.id.localeCompare(a.id)).forEach((x) => (days[x.d] ||= []).push(x));
    return `<div class="card" id="spend"><div class="row"><h2 style="margin:0">ใช้จริง</h2><span class="spacer"></span><button class="btn small primary" data-spend>+ บันทึกค่าใช้จ่าย</button></div>
      ${L.length ? `<div class="summary" style="margin-top:10px">
        <div class="k"><b>${fmtN(spent)} ฿</b><span>ใช้ไปแล้ว ${L.length} รายการ</span></div>
        <div class="k"><b>${fmtN(spent / B.ppl)} ฿</b><span>เฉลี่ยต่อคน</span></div>
        <div class="k"><b class="${spent > B.total ? "over" : ""}">${fmtN(B.total - spent)} ฿</b><span>${spent > B.total ? "เกินงบ" : "เหลือจากงบประมาณ"}</span></div></div>
      <table class="t" style="margin-top:12px"><tbody>${Object.entries(by).map(([c, v]) => `<tr><td>${esc(c)}</td><td class="num"><b>${fmtN(v)}</b>${est[c] ? ` <small class="mute">/ ${fmtN(est[c])}</small>` : ""}</td>
        <td style="width:40%">${est[c] ? `<div class="bar"><i class="${v > est[c] ? "over" : ""}" style="width:${Math.min(100, (v / est[c]) * 100)}%"></i></div>` : ""}</td></tr>`).join("")}</tbody></table>
      ${Object.entries(days).map(([d, xs]) => `<h3 class="sp-day">${thDate(d)} <small class="mute">${fmtN(xs.reduce((a, x) => a + this.thb(x), 0))} ฿</small></h3>
        <ul class="sp-list">${xs.map((x) => `<li><button class="linkbtn" data-spedit="${x.i}"><span>${esc(x.note || x.cat)} <small class="mute">${x.note ? esc(x.cat) : ""}</small></span>
          <b>${x.cur === "JPY" ? "¥" : "฿"}${fmtN(x.amt)}</b></button></li>`).join("")}</ul>`).join("")}`
      : `<p class="mute" style="margin:8px 0 0">ระหว่างทริปกด "+ บันทึกค่าใช้จ่าย" (มีในหน้าวันนี้ด้วย) ใส่เป็นเยนได้เลย ระบบแปลงเป็นบาทและเทียบกับงบให้</p>`}</div>`;
  },
};

// ---------- แปลงเยน-บาท ----------
const YenCalc = {
  open() {
    Modal.open(`<h2>แปลงเงิน</h2><div class="calc">
      <label class="f">เยน (¥)<input type="number" inputmode="decimal" id="cJpy" placeholder="0" autofocus></label>
      <label class="f">บาท (฿)<input type="number" inputmode="decimal" id="cThb" placeholder="0"></label></div>
      <div class="calc-quick">${[100, 500, 1000, 3000, 5000, 10000].map((y) => `<button class="btn small" data-y="${y}">¥${fmtN(y)}</button>`).join("")}</div>
      <p class="mute small">1 เยน = ${S.rate} บาท${S.rateAt ? ` (อัปเดต ${new Date(S.rateAt).toLocaleDateString("th-TH")})` : ""} • ร้าน tax-free ลด 10% ถ้าซื้อเกิน ¥5,000 ต่อร้านต่อวัน (โชว์พาสปอร์ต)</p>
      <div class="row"><button class="btn primary" id="cSave">บันทึกเป็นค่าใช้จ่าย</button></div>`);
    const j = $("#cJpy"), t = $("#cThb");
    j.oninput = () => (t.value = j.value ? Math.round(j.value * S.rate * 100) / 100 : "");
    t.oninput = () => (j.value = t.value ? Math.round(t.value / S.rate) : "");
    $(".calc-quick").onclick = (e) => { const y = e.target.dataset.y; if (y) { j.value = y; j.oninput(); } };
    $("#cSave").onclick = () => { const a = +j.value; Spend.open(); if (a) { $("#spForm").amt.value = a; $("#spForm").oninput(); } };
  },
};

// ---------- ส่งออกปฏิทิน (.ics) ----------
const Ics = {
  // เวลาในแผนเป็นเวลาญี่ปุ่น (UTC+9) แปลงเป็น UTC ให้ปฏิทินทุกเครื่องแสดงตรง
  utc(iso, h, tz = 9) {
    const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + (h - tz) * 3600e3);
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  },
  txt: (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n"),
  build() {
    const t = S.trip, ev = [], stamp = this.utc(todayIso(), 0, 0);
    const add = (uid, iso, h, dur, title, o = {}) => ev.push(["BEGIN:VEVENT", `UID:${uid}-${t.start}@hokkaido-trip`, `DTSTAMP:${stamp}`,
      `DTSTART:${this.utc(iso, h, o.tz)}`, `DTEND:${this.utc(iso, h + dur, o.tz)}`, `SUMMARY:${this.txt(title)}`,
      o.loc ? `LOCATION:${this.txt(o.loc)}` : "", o.geo ? `GEO:${o.geo.lat};${o.geo.lng}` : "", o.desc ? `DESCRIPTION:${this.txt(o.desc)}` : "",
      o.alarm ? `BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:${this.txt(title)}\r\nTRIGGER:-PT${o.alarm}M\r\nEND:VALARM` : "", "END:VEVENT"].filter(Boolean).join("\r\n"));
    const hm = (s) => { const [a, b] = (s || "0:0").split(":").map(Number); return a + b / 60; };
    if (t.outFlight.dep) add("out", t.outFlight.dep.slice(0, 10), hm(t.outFlight.dep.slice(11)), 1, `บินไปญี่ปุ่น ${t.outFlight.no}`, { tz: 7, alarm: 240, loc: t.outFlight.from });
    add("arr", t.start, hm(t.arriveTime), 0.5, `เครื่องลง ${t.arrive} ${t.outFlight.no || ""}`, { loc: pname(t.arrive) });
    add("dep", t.end, hm(t.departTime), 1, `บินกลับ ${t.inFlight.no || ""} จาก ${t.depart}`, { alarm: 240, loc: pname(t.depart) });
    Planner.evaluateAll().forEach((e) => {
      if (e.leaveBy != null) add(`lv${e.i}`, e.iso, e.leaveBy, 0.25, `ออกจากที่พักไม่เกิน ${fmtT(e.leaveBy)}`, { alarm: 30 });
      e.tl.forEach((x, k) => {
        const p = point(x.id);
        if (x.kind === "visit") add(`d${e.i}v${k}`, e.iso, x.t, x.h || 1, pname(x.id), { geo: p?.lat ? p : null, loc: p?.ja || p?.en || "", desc: p?.highlight || "" });
        if (x.kind === "hotel") { const h = hotelOf(x.id); add(`d${e.i}h`, e.iso, x.t, 0.5, `เช็กอิน ${h?.name || pname(x.id)}`, { loc: h?.addr || pname(x.id), desc: h?.ref ? `เลขจอง ${h.ref}` : "" }); }
      });
    });
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Hokkaido Trip Planner//TH", "CALSCALE:GREGORIAN", "X-WR-CALNAME:เที่ยวฮอกไกโด", ...ev, "END:VCALENDAR"].join("\r\n");
  },
  download() {
    if (!S.plan) return toast("สร้างแผนก่อน แล้วค่อยส่งออก");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([this.build()], { type: "text/calendar" }));
    a.download = `hokkaido-${S.trip.start}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("เปิดไฟล์ .ics เพื่อเพิ่มลงปฏิทินในมือถือ");
  },
};

// ---------- กระเป๋าเอกสาร ----------
const DOC_KINDS = ["รถเช่า", "ประกันเดินทาง", "ตั๋ว/ทัวร์", "เที่ยวบิน", "บัตร/อื่นๆ"];
const Docs = {
  open(i) {
    const x = S.docs[i] || { kind: "รถเช่า" };
    Modal.open(`<h2>${i != null ? "แก้เอกสาร" : "เพิ่มเอกสาร/การจอง"}</h2><form id="docForm" class="form">
      <label class="f">ประเภท<select name="kind">${DOC_KINDS.map((k) => `<option ${k === x.kind ? "selected" : ""}>${k}</option>`).join("")}</select></label>
      <label class="f">ชื่อ<input type="text" name="title" value="${esc(x.title)}" placeholder="เช่น Toyota Rent a Car สาขา CTS" required></label>
      <label class="f">เลขที่จอง / กรมธรรม์<input type="text" name="ref" value="${esc(x.ref)}"></label>
      <label class="f">เบอร์โทร<input type="tel" name="phone" value="${esc(x.phone)}"></label>
      <label class="f">ลิงก์<input type="url" name="url" value="${esc(x.url)}"></label>
      <label class="f">วันที่ / เวลา<input type="text" name="when" value="${esc(x.when)}" placeholder="เช่น รับรถ 15 ม.ค. 10:00"></label>
      <label class="f" style="grid-column:1/-1">โน้ต<input type="text" name="note" value="${esc(x.note)}"></label>
      <div class="row" style="grid-column:1/-1"><button class="btn primary">บันทึก</button>${i != null ? `<button type="button" class="btn red" id="docDel">ลบ</button>` : ""}</div></form>`);
    const f = $("#docForm");
    f.onsubmit = (e) => {
      e.preventDefault();
      const y = Object.fromEntries(["kind", "title", "ref", "phone", "url", "when", "note"].map((k) => [k, f[k].value.trim()]));
      if (i != null) S.docs[i] = y; else S.docs.push(y);
      save(); Modal.close(); App.renderAll();
    };
    if ($("#docDel")) $("#docDel").onclick = () => { if (confirm("ลบเอกสารนี้?")) { S.docs.splice(i, 1); save(); Modal.close(); App.renderAll(); } };
  },
  // รวมทุกอย่างที่ต้องโชว์/โทรหา: เที่ยวบิน ที่พัก (จากหน้าที่พัก) และที่เพิ่มเอง
  section() {
    const t = S.trip, link = (u) => /^https?:\/\//.test(u || "") ? ` <a href="${esc(u)}" target="_blank" rel="noopener">เปิด</a>` : "";
    const tel = (p) => p ? ` <a href="tel:${esc(p.replace(/[^\d+]/g, ""))}">${I("phone")} ${esc(p)}</a>` : "";
    const fl = (f, lbl, iso, tm, ap) => `<li><span class="dk">${I("plane")} ${lbl}</span><div><b>${esc(f.no || "ยังไม่กรอกเลขเที่ยวบิน")}</b> ${thDate(iso)} ${tm} ${ap}
      ${f.no ? `<br><a href="https://www.flightradar24.com/data/flights/${encodeURIComponent(f.no.replace(/\s/g, "").toLowerCase())}" target="_blank" rel="noopener">เช็กสถานะเที่ยวบิน</a>` : ""}</div></li>`;
    const hotels = S.plan ? Object.entries(S.plan.hotels || {}).filter(([, h]) => h.name) : [];
    return `<div class="card docs"><div class="row"><h2 style="margin:0">เอกสารและการจอง</h2><span class="spacer"></span><button class="btn small no-print" onclick="window.print()">${I("printer")} พิมพ์</button><button class="btn small primary no-print" data-doc>+ เพิ่ม</button></div>
      <ul class="doc-list">
        ${fl(t.outFlight, "ขาไป", t.start, `ลง ${t.arriveTime}`, t.arrive)}
        ${fl(t.inFlight, "ขากลับ", t.end, `ออก ${t.departTime}`, t.depart)}
        ${hotels.map(([id, h]) => `<li><span class="dk">${I("hotel")} ${esc(short(id))}</span><div><b>${esc(h.name)}</b>${h.nameJa ? ` (${esc(h.nameJa)})` : ""}${h.ref ? ` • จอง <b>${esc(h.ref)}</b>` : ""}${tel(h.phone)}${link(h.url)}
          ${h.addr ? `<br><small>${esc(h.addr)}</small>` : ""}</div></li>`).join("")}
        ${S.docs.map((d, i) => `<li><span class="dk">${I({ "รถเช่า": "car", "ประกันเดินทาง": "life-buoy", "เที่ยวบิน": "plane", "ตั๋ว/ทัวร์": "stamp" }[d.kind] || "file-text")} ${esc(d.kind)}</span><div><b>${esc(d.title)}</b>${d.ref ? ` • <b>${esc(d.ref)}</b>` : ""}${d.when ? ` • ${esc(d.when)}` : ""}${tel(d.phone)}${link(d.url)}
          ${d.note ? `<br><small>${esc(d.note)}</small>` : ""} <button class="linkbtn no-print" data-docedit="${i}">${I("pencil")} แก้</button></div></li>`).join("")}
      </ul><p class="mute small">ที่พักกรอกในหน้า <a href="#stays">ที่พัก</a> • เก็บในเครื่องนี้เท่านั้น ไม่ติดไปกับลิงก์แชร์ • ใช้ได้ตอนออฟไลน์</p></div>`;
  },
};

// ปุ่ม/ลิงก์ของเครื่องมือเหล่านี้ใช้ได้จากทุกหน้า
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-spend], [data-spedit], [data-doc], [data-docedit], [data-ics]");
  if (!el) return;
  const d = el.dataset;
  if (d.spend != null) Spend.open();
  else if (d.spedit != null) Spend.open(+d.spedit);
  else if (d.doc != null) Docs.open();
  else if (d.docedit != null) Docs.open(+d.docedit);
  else if (d.ics != null) Ics.download();
});
