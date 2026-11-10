// เอกสารและการจอง: รวมเที่ยวบิน ที่พัก จุดที่จองไว้ (จากแผน) + เอกสารที่เพิ่มเอง (ชื่อ เลขจอง เบอร์)
// ข้อมูลเก็บใน S.docs เฉพาะเครื่องนี้ ไม่ติดไปกับลิงก์แชร์ (มีเลขจอง/เบอร์ส่วนตัว)

// ---------- กระเป๋าเอกสาร ----------
const Docs = {
  open(i) {
    const x = S.docs[i] || {};
    Modal.open(`<h2>${i != null ? "แก้เอกสาร" : "เพิ่มเอกสาร/การจอง"}</h2><form id="docForm" class="form">
      <label class="f">ชื่อ<input type="text" name="title" value="${esc(x.title)}" placeholder="เช่น รถเช่า Toyota สาขา CTS, ประกันเดินทาง" required></label>
      <label class="f">เลขที่จอง / กรมธรรม์<input type="text" name="ref" value="${esc(x.ref)}"></label>
      <label class="f">เบอร์โทร<input type="tel" name="phone" value="${esc(x.phone)}"></label>
      <div class="row" style="grid-column:1/-1"><button class="btn primary">บันทึก</button>${i != null ? `<button type="button" class="btn red" id="docDel">ลบ</button>` : ""}</div></form>`);
    const f = $("#docForm");
    f.onsubmit = (e) => {
      e.preventDefault();
      const y = { ...x, ...Object.fromEntries(["title", "ref", "phone"].map((k) => [k, f[k].value.trim()])) }; // ช่องเก่า (โน้ต ลิงก์) ยังอยู่
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
    const noHotel = S.plan ? [...new Set(S.plan.bases)].filter((b) => !hotelOf(b)?.name) : [];
    // จุดที่ล็อกเวลา/มีโน้ต (จองรอบ จองร้าน) จากแผนรายวัน
    const booked = S.plan ? S.plan.days.flatMap((d, k) => d.items.filter((it) => it.at || it.note).map((it) => ({ it, k }))) : [];
    return `<div class="card docs"><div class="row"><h2 style="margin:0">เอกสารและการจอง</h2><span class="spacer"></span><button class="btn small no-print" onclick="window.print()">${I("printer")} พิมพ์</button><button class="btn small primary no-print" data-doc>+ เพิ่ม</button></div>
      <ul class="doc-list">
        ${fl(t.outFlight, "ขาไป", t.start, `ลง ${t.arriveTime}`, t.arrive)}
        ${fl(t.inFlight, "ขากลับ", t.end, `ออก ${t.departTime}`, t.depart)}
        ${hotels.map(([id, h]) => `<li><span class="dk">${I("hotel")} ${esc(short(id))}</span><div><b>${esc(h.name)}</b>${h.nameJa ? ` (${esc(h.nameJa)})` : ""}${h.ref ? ` • จอง <b>${esc(h.ref)}</b>` : ""}${tel(h.phone)}${link(h.url)}
          ${h.addr ? `<br><small>${esc(h.addr)}</small>` : ""}</div></li>`).join("")}
        ${noHotel.map((id) => `<li><span class="dk">${I("hotel")} ${esc(short(id))}</span><div class="mute">ยังไม่ใส่ที่พัก <a class="no-print" href="#stays">กรอก</a></div></li>`).join("")}
        ${booked.map(({ it, k }) => `<li><span class="dk">${KIND_IC(it.id)} ${thDate(Planner.dayIso(k), false)}</span><div><b>${esc(pname(it.id))}</b>${it.at ? ` • ${I("lock")} ${esc(it.at)}` : ""}${it.note ? `<br><small>${esc(it.note)}</small>` : ""}</div></li>`).join("")}
        ${S.docs.map((d, i) => `<li><span class="dk">${I("file-text")} ${esc(d.kind || "เอกสาร")}</span><div><b>${esc(d.title)}</b>${d.ref ? ` • <b>${esc(d.ref)}</b>` : ""}${d.when ? ` • ${esc(d.when)}` : ""}${tel(d.phone)}${link(d.url)}
          ${d.note ? `<br><small>${esc(d.note)}</small>` : ""} <button class="linkbtn no-print" data-docedit="${i}">${I("pencil")} แก้</button></div></li>`).join("")}
      </ul><p class="mute small">ที่พักกรอกในหน้า <a href="#stays">ที่พัก+จอง</a> • จองรอบ/ร้าน: ล็อกเวลาหรือใส่เลขจองในโน้ตของจุดนั้นในแผนรายวัน • เก็บในเครื่องนี้เท่านั้น ไม่ติดไปกับลิงก์แชร์ • ใช้ได้ตอนออฟไลน์</p></div>`;
  },
};

// ปุ่ม/ลิงก์ของเครื่องมือเหล่านี้ใช้ได้จากทุกหน้า
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-doc], [data-docedit]");
  if (!el) return;
  if (el.dataset.doc != null) Docs.open(); else Docs.open(+el.dataset.docedit);
});
