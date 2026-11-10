// แท็บ "เตรียมตัว": สิ่งที่ต้องทำก่อนบิน และจัดกระเป๋า
const PrepView = {
  allTasks() {
    const m = Planner.usedModes();
    return [...PREP_TASKS, ...GUIDE.extraPrep].filter((x) => x.mode === "all" || m.has(x.mode))
      .sort((a, b) => b.days - a.days);
  },
  tasks() { return this.allTasks().filter((x) => !x.opt); },
  progress() {
    const T = this.tasks(), today = todayIso();
    const done = T.filter((x) => S.prep[x.id]).length;
    const overdue = T.filter((x) => !S.prep[x.id] && addDays(S.trip.start, -x.days) < today).length;
    const bookDone = T.filter((x) => /^จอง/.test(x.task)).every((x) => S.prep[x.id]);
    return { done, total: T.length, pct: T.length ? Math.round((done / T.length) * 100) : 0, overdue, bookDone };
  },
  render() {
    const T = this.tasks(), today = todayIso(), pr = this.progress(), O = this.allTasks().filter((x) => x.opt);
    const phases = [...new Set(T.map((x) => x.phase))];
    const row = (x) => { const due = addDays(S.trip.start, -x.days), d = !!S.prep[x.id];
      return `<tr class="${d ? "done" : due < today && !x.opt ? "over" : ""}"><td><input type="checkbox" data-task="${x.id}" ${d ? "checked" : ""} aria-label="เสร็จแล้ว"></td>
      <td>${thDate(due, false)}</td><td><b>${esc(x.task)}</b></td><td>${esc(x.detail)}</td><td><span class="badge b-mute">${esc(x.cat)}</span></td></tr>`; };
    const head = '<thead><tr><th style="width:34px"></th><th style="width:110px">ครบกำหนด</th><th>งาน</th><th>ทำไม / รายละเอียด</th><th>หมวด</th></tr></thead>';
    $('[data-sec="prep"]').innerHTML = `
      <div class="sec-head"><h1>สิ่งที่ต้องทำก่อนบิน</h1>
        <p class="lead">วันครบกำหนดคำนวณจากวันบิน ${thDate(S.trip.start)} ถ้าเลยกำหนดแล้วยังไม่เสร็จ แถวจะเป็นสีแดง งานแสดงตามวิธีเดินทางที่เลือก (${MODE[S.trip.mode]})</p></div>
      <div class="card"><div class="row"><b>เสร็จ ${pr.done}/${pr.total}</b>${pr.overdue ? `<span class="badge b-bad">เลยกำหนด ${pr.overdue}</span>` : ""}<div class="spacer"></div><span>${pr.pct}%</span></div>
        <div class="bar" style="margin-top:6px"><i style="width:${pr.pct}%"></i></div></div>
      ${phases.map((ph) => `<div class="card"><h2>${esc(ph)}</h2><div class="tbl-wrap"><table class="t">${head}<tbody>
        ${T.filter((x) => x.phase === ph).map(row).join("")}
      </tbody></table></div></div>`).join("")}
      ${O.length ? `<details class="card opt"><summary><b>ของเสริม (ไม่บังคับ)</b> <small>${O.length} งานพื้นฐาน ไม่นับในความคืบหน้า</small></summary>
        <div class="tbl-wrap"><table class="t">${head}<tbody>${O.map(row).join("")}</tbody></table></div></details>` : ""}`;
  },
  bind() {
    $('[data-sec="prep"]').addEventListener("change", (e) => {
      const id = e.target.dataset.task;
      if (!id) return;
      if (e.target.checked) S.prep[id] = true; else delete S.prep[id];
      save(); this.render(); App.refreshChrome();
    });
  },
};

const SOURCES = ["มีอยู่แล้ว", "ซื้อที่ไทย", "ซื้อที่ญี่ปุ่น", "ทำออนไลน์", "เช่า", "ขอจากรถเช่า"];
const CAT_ICON = { "เอกสาร": "file-text", "เงิน": "banknote", "เสื้อผ้า-ชั้นใน/กลาง": "shirt", "เสื้อผ้า-ชั้นนอก": "shirt", "หัว-มือ-เท้า": "hand", "ผิวและร่างกาย": "droplet",
  "ยาและสุขภาพ": "pill", "อิเล็กทรอนิกส์": "plug", "แอปและข้อมูลในมือถือ": "smartphone", "ของในรถ": "car", "กระเป๋าและจัดเก็บ": "luggage", "ของจิปาถะ": "paperclip",
  "กิจกรรม": "cable-car", "กล้องและความทรงจำ": "camera", "เด็กเล็ก": "baby", "ขากลับ": "plane-takeoff" };
const STATUS = { todo: "ยังไม่พร้อม", ready: "พร้อมแล้ว", packed: "แพ็กแล้ว" };
const PackingView = {
  tab: "cat",
  items() { return [...PACKING, ...S.custom]; },
  carOnly: (x) => ["คัน", "คนขับ"].includes(x.per) || x.cat === "ของในรถ" || /IDP|ใบขับขี่|รถเช่า|ETC/.test(x.name),
  // when = เงื่อนไขแสดง { mode, kids, season: "winter"|"warm", tag } ไม่เข้าเงื่อนไขก็ซ่อน
  relevant(x) {
    const t = S.trip, w = x.when || {}, winter = isWinter(t.start) || isWinter(t.end);
    const used = Planner.usedModes();
    if (!used.has("car") && this.carOnly(x)) return false;
    if (w.mode && !used.has(w.mode)) return false;
    if (w.kids && !t.kids) return false;
    if (w.season === "winter" && !winter) return false;
    if (w.season === "warm" && winter) return false;
    if (w.tag && !t.interests.includes(w.tag)) return false;
    return true;
  },
  st(x) {
    const s = S.packing[x.id] || {};
    return { on: s.on ?? (!x.opt && x.prio <= 3 || (!x.opt && x.prio === 4 && S.trip.interests.includes("snow"))), status: s.status || "todo", src: s.src || x.source || "ซื้อที่ไทย" };
  },
  qty(x) {
    const t = S.trip, ppl = t.adults + t.kids;
    return { "คน": x.qty * ppl, "คน×วัน": x.qty * ppl * (tripNights() + 1), "คนขับ": x.qty * Math.max(1, t.drivers) }[x.per] ?? x.qty;
  },
  progress() {
    const L = this.items().filter((x) => this.relevant(x) && this.st(x).on);
    const ok = L.filter((x) => this.st(x).status !== "todo").length;
    return { ok, total: L.length, pct: L.length ? Math.round((ok / L.length) * 100) : 0 };
  },
  row(x) {
    const s = this.st(x);
    const im = (window.ITEM_IMG || {})[x.id], q = x.name.replace(/\(.*?\)/g, "").trim();
    return `<div class="pk ${s.on ? "" : "off"} ${s.status === "packed" ? "packed" : ""}">
      <input type="checkbox" data-on="${x.id}" ${s.on ? "checked" : ""} aria-label="เอาไป">
      ${im ? `<span class="pk-img" role="button" tabindex="0" title="ดูรูปใหญ่" onclick='Lightbox.open([${esc(JSON.stringify(im))}], 0, ${esc(JSON.stringify(x.name))})'><img src="${im.img}" alt="" loading="lazy"></span>`
        : `<a class="pk-img noimg" href="${gimgUrl(q)}" target="_blank" rel="noopener" title="ดูรูปใน Google">${I(CAT_ICON[x.cat] || "package")}</a>`}
      <div class="nm"><span class="${x.prio === 1 ? "prio1" : ""}">${esc(x.name)}</span>${x.prio === 1 ? ' <span class="badge b-bad">ขาดไม่ได้</span>' : x.prio === 4 ? ' <span class="badge b-mute">ตามกิจกรรม</span>' : ""}
        ${x.spec ? `<small>${esc(x.spec)}${x.shop ? ` • ร้าน: ${esc(x.shop)}` : ""}${x.bag ? ` • เก็บ: ${esc(x.bag)}` : ""}</small>` : ""}${x.custom ? ` <button class="btn small" data-del="${x.id}">ลบ</button>` : ""}
        <a class="gimg" href="${gimgUrl(q)}" target="_blank" rel="noopener">${I("image")} ดูรูปใน Google</a></div>
      <div class="num"><b>${this.qty(x)}</b> <small>${esc(x.per === "คน×วัน" ? "ชิ้น" : x.per === "คัน" ? "/คัน" : "ชิ้น")}</small></div>
      <select data-src="${x.id}" aria-label="หาที่ไหน">${SOURCES.map((v) => `<option ${v === s.src ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select data-st="${x.id}" aria-label="สถานะ">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === s.status ? "selected" : ""}>${v}</option>`).join("")}</select></div>`;
  },
  render() {
    const L = this.items().filter((x) => this.relevant(x));
    const pr = this.progress();
    const group = (key) => { const g = {}; L.forEach((x) => (g[key(x)] ||= []).push(x)); return g; };
    let body;
    if (this.tab === "cat") body = Object.entries(group((x) => x.cat)).map(([c, xs]) => [c, xs.filter((x) => !x.opt)]).filter(([, xs]) => xs.length)
      .map(([c, xs]) => `<div class="pk-cat card"><h3>${I(CAT_ICON[c] || "package")} ${esc(c)} <small>${xs.filter((x) => this.st(x).on).length} รายการ</small></h3>${xs.map((x) => this.row(x)).join("")}</div>`).join("") + this.optBox(L.filter((x) => x.opt));
    else if (this.tab === "bag") body = Object.entries(group((x) => x.bag || "ไม่ระบุ")).map(([c, xs]) => { xs = xs.filter((x) => this.st(x).on); return xs.length ? `<div class="pk-cat card"><h3>${I("backpack")} ${esc(c)} <small>${xs.length} รายการ</small></h3>${xs.map((x) => this.row(x)).join("")}</div>` : ""; }).join("");
    else {
      const where = this.tab === "buyTH" ? "ซื้อที่ไทย" : "ซื้อที่ญี่ปุ่น";
      const xs = L.filter((x) => { const s = this.st(x); return s.on && s.src === where && s.status === "todo"; });
      body = `<div class="card"><h3>${where}: ยังต้องซื้อ ${xs.length} รายการ</h3>${xs.length ? xs.map((x) => this.row(x)).join("") : '<p class="empty">ซื้อครบแล้ว</p>'}
        <p class="mute" style="font-size:.8rem;margin-top:8px">ซื้อแล้วเปลี่ยนสถานะเป็น "พร้อมแล้ว" รายการจะหายจากลิสต์นี้</p></div>`;
    }
    $('[data-sec="packing"]').innerHTML = `
      <div class="sec-head"><h1>จัดกระเป๋า</h1>
        <p class="lead">ติ๊กช่องซ้ายเพื่อเลือกว่าจะเอาไป จำนวนคำนวณจาก ${S.trip.adults + S.trip.kids} คน × ${tripNights() + 1} วันให้อัตโนมัติ • แสดงตามแผน (${MODE[S.trip.mode]}${S.trip.kids ? ", มีเด็ก" : ""}, ${isWinter(S.trip.start) ? "หน้าหนาว" : "นอกหน้าหนาว"}) ซ่อนของที่ไม่เกี่ยวให้แล้ว</p></div>
      <div class="card"><div class="row"><b>พร้อมแล้ว ${pr.ok}/${pr.total}</b><div class="spacer"></div><span>${pr.pct}%</span></div><div class="bar" style="margin-top:6px"><i style="width:${pr.pct}%"></i></div></div>
      <div class="row no-print" style="margin-bottom:12px"><div class="seg" id="pkTabs">${[["cat", "ตามหมวด"], ["buyTH", I("shopping-cart") + " ซื้อที่ไทย"], ["buyJP", I("shopping-cart") + " ซื้อที่ญี่ปุ่น"], ["bag", I("backpack") + " แยกกระเป๋า"]].map(([k, v]) => `<button data-v="${k}" class="${this.tab === k ? "on" : ""}">${v}</button>`).join("")}</div></div>
      ${body}
      <div class="card no-print"><h3>เพิ่มของเอง</h3><div class="row"><input type="text" id="pkName" aria-label="ชื่อของที่จะเพิ่ม" placeholder="ชื่อของ" style="flex:1;min-width:160px">
        <select id="pkCat">${[...new Set(PACKING.map((x) => x.cat))].map((c) => `<option>${esc(c)}</option>`).join("")}</select>
        <input type="number" id="pkQty" value="1" min="1"><select id="pkPer"><option>กลุ่ม</option><option>คน</option></select><button class="btn primary" id="pkAdd">เพิ่ม</button></div></div>`;
  },
  optOpen: false,
  optBox(xs) {
    if (!xs.length) return "";
    const g = {}; xs.forEach((x) => (g[x.cat] ||= []).push(x));
    return `<details class="card opt" id="pkOpt" ${this.optOpen ? "open" : ""}><summary><b>ของเสริม (ไม่บังคับ)</b> <small>${xs.length} รายการ • เลือกแล้ว ${xs.filter((x) => this.st(x).on).length} • ของพื้นฐาน/ตามความชอบ ติ๊กเพื่อเอาไป</small></summary>
      ${Object.entries(g).map(([c, ys]) => `<h3 style="margin-top:12px">${esc(c)}</h3>${ys.map((x) => this.row(x)).join("")}`).join("")}</details>`;
  },
  set(id, k, v) { (S.packing[id] ||= {})[k] = v; save(); this.render(); App.refreshChrome(); },
  bind() {
    const sec = $('[data-sec="packing"]');
    sec.addEventListener("change", (e) => {
      const d = e.target.dataset;
      if (d.on) this.set(isNaN(d.on) ? d.on : +d.on, "on", e.target.checked);
      else if (d.src) this.set(isNaN(d.src) ? d.src : +d.src, "src", e.target.value);
      else if (d.st) this.set(isNaN(d.st) ? d.st : +d.st, "status", e.target.value);
    });
    sec.addEventListener("toggle", (e) => { if (e.target.id === "pkOpt") this.optOpen = e.target.open; }, true);
    sec.addEventListener("click", (e) => {
      const el = e.target;
      if (el.closest("#pkTabs") && el.dataset.v) { this.tab = el.dataset.v; this.render(); }
      else if (el.id === "pkAdd") {
        const name = $("#pkName").value.trim();
        if (!name) return toast("ใส่ชื่อของก่อน");
        S.custom.push({ id: "c" + Date.now(), custom: true, cat: $("#pkCat").value, name, prio: 2, qty: Math.max(1, +$("#pkQty").value || 1), per: $("#pkPer").value, source: "ซื้อที่ไทย", spec: "", bag: "" });
        save(); this.render();
      } else if (el.dataset.del) {
        S.custom = S.custom.filter((x) => x.id !== el.dataset.del); delete S.packing[el.dataset.del]; save(); this.render();
      }
    });
  },
};
