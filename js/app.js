// โครงแอป: แท็บหลัก 4 แท็บ + หัวข้อย่อย, ตั้งค่า, แชร์ลิงก์, ย้อนกลับ, PWA
const TABS = [
  { id: "mytrip", ic: "map", name: "ทริปของฉัน", subs: [["trip", "แผนรายวัน"], ["today", "วันนี้"], ["setup", "ข้อมูลทริป"], ["stays", "ที่พัก"]] },
  { id: "explore", ic: "search", name: "ค้นหา", subs: [["places", "สถานที่"], ["food", "ร้านอาหาร"], ["fest", "เทศกาล"]] },
  { id: "ready", ic: "backpack", name: "เตรียมตัว", subs: [["prep", "สิ่งที่ต้องทำ"], ["packing", "จัดกระเป๋า"], ["budget", "งบประมาณ"]] },
  { id: "guide", ic: "book-open", name: "คู่มือ", subs: [["know", "รู้จักฮอกไกโด"], ["transport", "การเดินทาง"], ["life", "ใช้ชีวิตที่นั่น"], ["apps", "แอป"], ["emergency", "เอกสาร + ฉุกเฉิน"]] },
];
const TAB_OF = Object.fromEntries(TABS.flatMap((t) => t.subs.map(([id]) => [id, t])));
const RENDER = {
  trip: () => PlanView.render(), setup: () => PlanView.renderSetup(), stays: () => PlanView.renderStays(), today: () => PlanView.renderToday(),
  places: () => PlacesView.render(), food: () => FoodView.render(), fest: () => PlacesView.renderFest(),
  packing: () => PackingView.render(), prep: () => PrepView.render(), budget: () => BudgetView.render(),
  know: () => GuideView.know(), transport: () => GuideView.transport(), life: () => GuideView.life(),
  apps: () => GuideView.apps(), emergency: () => GuideView.emergency(),
};

const App = {
  cur: null, viewOnly: false,
  renderAll() { if (this.cur) RENDER[this.cur](); this.refreshChrome(); },

  refreshChrome() {
    const t = S.trip, N = tripNights();
    const prep = PrepView.progress(), pack = PackingView.progress();
    const prog = { trip: S.plan ? "✓" : "", packing: pack.pct + "%", prep: prep.pct + "%" };
    const tab = TAB_OF[this.cur] || TABS[0];
    $("#tabs").innerHTML = TABS.map((x) => `<div class="tab-grp ${x === tab ? "on" : ""}">
      <a href="#${x.subs[0][0]}" class="tab ${x === tab ? "on" : ""}"><span class="ic">${I(x.ic)}</span><span>${x.name}</span></a>
      <div class="tab-subs">${x.subs.map(([id, nm]) => `<a href="#${id}" class="${id === this.cur ? "on" : ""}">${nm}${prog[id] ? `<span class="prog">${prog[id]}</span>` : ""}</a>`).join("")}</div></div>`).join("");
    $("#subnav").innerHTML = tab.subs.map(([id, nm]) => `<a href="#${id}" class="${id === this.cur ? "on" : ""}">${nm}</a>`).join("");
    const left = daysBetween(todayIso(), t.start);
    $("#topTrip").textContent = `${thDate(t.start, false)} - ${thDate(t.end, false)} • ${N + 1} วัน ${N} คืน • ${t.adults + t.kids} คน • ${MODE[t.mode]}${left > 0 ? ` • อีก ${left} วัน` : ""}`;
    document.documentElement.dataset.font = S.set.font;
    if (S.set.theme === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = S.set.theme;
  },

  show(id) {
    if (id.startsWith("share=")) return;
    if (id === "stay") id = "stays"; // หน้าเลือกเมืองเดิม รวมเข้าหน้าที่พักแล้ว
    if (!RENDER[id]) id = "trip";
    const prev = this.cur;
    this.cur = id;
    RENDER[id]();
    setTimeout(() => refitSection(id), 50);
    $$("section[data-sec]").forEach((s) => s.classList.toggle("on", s.dataset.sec === id));
    this.refreshChrome();
    if (prev !== id) window.scrollTo(0, 0);
  },

  // ---------- ตั้งค่า ----------
  settings() {
    const s = S.set, opt = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${l}</option>`;
    Modal.open(`<h2>ตั้งค่า</h2><div class="form set-form">
      <label class="f">ชื่อสถานที่แสดงภาษา<select data-s="lang">${opt("en", "English ก่อน + ไทย", s.lang)}${opt("th", "ไทยก่อน + English", s.lang)}${opt("ja", "English + 日本語 + ไทย", s.lang)}${opt("all", "ไทย + English + 日本語", s.lang)}</select></label>
      <label class="f">ธีม<select data-s="theme">${opt("auto", "ตามเครื่อง", s.theme)}${opt("light", "สว่าง", s.theme)}${opt("dark", "มืด", s.theme)}</select></label>
      <label class="f">ขนาดตัวอักษร<select data-s="font">${opt("s", "เล็ก", s.font)}${opt("m", "กลาง", s.font)}${opt("l", "ใหญ่", s.font)}</select></label>
      <label class="f">เผื่อเวลาเดินทางเพิ่ม (%)<input type="number" min="0" max="100" step="5" data-s="slack" value="${s.slack}"></label>
      <label class="f">ขับสูงสุดต่อวัน (ชม.) <small>ว่าง = ตามสไตล์</small><input type="number" min="1" max="10" step="0.5" data-s="maxDrive" value="${s.maxDrive}"></label>
      <label class="f">เริ่มวัน <small>ว่าง = ตามสไตล์</small><input type="time" data-s="dayStart" value="${s.dayStart}"></label>
      <label class="f">จบวัน <small>ว่าง = ตามสไตล์</small><input type="time" data-s="dayEnd" value="${s.dayEnd}"></label>
      <label class="f">อัตราแลกเงิน 1 เยน = ? บาท<input type="number" step="0.0001" data-s="rate" value="${S.rate}"></label>
      <label class="f row" style="flex-direction:row;align-items:center"><input type="checkbox" data-s="rateAuto" ${s.rateAuto ? "checked" : ""}> อัปเดตอัตราแลกเงินอัตโนมัติวันละครั้ง</label>
    </div>
    <h3 style="margin-top:16px">ข้อมูลและออฟไลน์</h3>
    <div class="row"><button class="btn" data-a="offline">${I("download")} ดาวน์โหลดรูปทั้งหมดไว้ใช้ออฟไลน์</button><button class="btn" data-a="export">ส่งออกไฟล์ .json</button>
      <label class="btn">นำเข้าไฟล์ .json<input type="file" data-a="import" accept=".json,application/json" hidden></label>
      <button class="btn" data-a="print">${I("printer")} พิมพ์ / PDF แผนรายวัน</button><button class="btn" data-ics>${I("calendar-plus")} ส่งออกลงปฏิทิน (.ics)</button><button class="btn red" data-a="reset">ล้างข้อมูลทั้งหมด</button></div>
    <p class="mute small" style="margin-top:12px">ข้อมูลสถานที่ ราคา เวลาเปิด ตารางรถ ตรวจล่าสุด พ.ย. 2026 เป็นค่าประมาณ ตรวจกับแหล่งทางการก่อนไป • แผนเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น</p>`);
    const d = $("#modal");
    d.onchange = (e) => {
      const el = e.target, k = el.dataset.s;
      if (el.dataset.a === "import" && el.files[0]) { Store.import(el.files[0]); Modal.close(); return; }
      if (!k) return;
      if (k === "rate") { S.rate = Math.max(0.01, +el.value || 0.23); S.set.rateAuto = false; }
      else S.set[k] = el.type === "checkbox" ? el.checked : el.type === "number" && el.value !== "" ? +el.value : el.value;
      if (k === "rateAuto" && el.checked) { S.rateAt = 0; refreshRate(); }
      save(); this.renderAll();
    };
    d.onclick = (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "export") Store.export();
      else if (a === "print") { Modal.close(); this.print(); }
      else if (a === "offline") this.downloadOffline();
      else if (a === "reset" && confirm("ล้างแผน รายการจัดกระเป๋า งาน และค่าตั้งทั้งหมด? ย้อนกลับไม่ได้")) { localStorage.removeItem(STORE_KEY); S = Store.defaults(); Modal.close(); location.hash = "#setup"; this.renderAll(); }
    };
  },

  print() {
    if (!S.plan) return toast("สร้างแผนก่อน แล้วค่อยพิมพ์");
    location.hash = "#trip";
    setTimeout(() => window.print(), 300);
  },

  async downloadOffline() {
    if (!("caches" in window)) return toast("เบราว์เซอร์นี้ไม่รองรับการเก็บออฟไลน์");
    const imgs = new Set();
    PLACES.forEach((p) => placeImgs(p).forEach((x) => imgs.add(x.img)));
    (window.FOODS || []).forEach((f) => f.img && imgs.add(f.img));
    Object.values(window.HUB_IMG || {}).forEach((x) => imgs.add(x.img));
    Object.values(window.ITEM_IMG || {}).forEach((x) => imgs.add(x.img));
    const list = [...imgs], c = await caches.open("hk-img-v1");
    let n = 0;
    for (let i = 0; i < list.length; i += 20) {
      await Promise.all(list.slice(i, i + 20).map((u) => c.add(u).then(() => n++).catch(() => null)));
      toast(`ดาวน์โหลดรูป ${Math.min(i + 20, list.length)}/${list.length}`);
    }
    toast(`เก็บรูป ${n} รูปไว้ใช้ออฟไลน์แล้ว`);
  },

  // ---------- แชร์ ----------
  async share() {
    if (!S.plan) return toast("สร้างแผนก่อน แล้วค่อยแชร์");
    const url = await Share.link();
    Modal.open(`<h2>แชร์แผนนี้</h2><p class="mute">คนที่เปิดลิงก์จะเห็นแผนเหมือนคุณ และกด "คัดลอกเป็นแผนของฉัน" เพื่อแก้ต่อได้ แก้ทีหลังต้องส่งลิงก์ใหม่ (ไม่ได้ซิงก์กัน)</p>
      <textarea readonly rows="4" style="width:100%" id="shareUrl">${esc(url)}</textarea>
      <div class="row" style="margin-top:8px"><button class="btn primary" id="shareCopy">คัดลอกลิงก์</button>${navigator.share ? '<button class="btn" id="shareNative">ส่งผ่านแอป…</button>' : ""}
      <span class="mute small">ลิงก์ยาว ${fmtN(url.length)} ตัวอักษร${url.length > 6000 ? ": ยาวมาก บางแอปแชตตัดลิงก์ ใช้ส่งออกไฟล์ .json ในหน้าตั้งค่าแทนได้" : ""}</span></div>`);
    $("#shareCopy").onclick = async () => { try { await navigator.clipboard.writeText(url); toast("คัดลอกลิงก์แล้ว"); } catch { $("#shareUrl").select(); document.execCommand("copy"); toast("คัดลอกแล้ว"); } };
    if ($("#shareNative")) $("#shareNative").onclick = () => navigator.share({ title: "แผนเที่ยวฮอกไกโด", url }).catch(() => null);
  },

  async loadShared(code) {
    try {
      const sh = await Share.unpack(code);
      if (!sh || sh.v !== 2 || !sh.trip) throw new Error("ลิงก์ไม่ถูกต้อง");
      this.shared = sh;
      this.viewOnly = true;
      S = Store.merge({ ...Store.load(), trip: sh.trip, plan: sh.plan });
      const b = $("#viewBanner");
      b.hidden = false;
      b.innerHTML = `<b>กำลังดูแผนที่แชร์มา</b> <span class="mute-inv">แก้ได้แต่ยังไม่บันทึก</span><button class="btn small primary" id="vbCopy">คัดลอกเป็นแผนของฉัน</button><button class="btn small" id="vbBack">กลับไปแผนของฉัน</button>`;
      $("#vbCopy").onclick = () => {
        if (Store.load().plan && !confirm("แทนที่แผนปัจจุบันของคุณด้วยแผนนี้?")) return;
        this.viewOnly = false; b.hidden = true; save(); toast("บันทึกเป็นแผนของคุณแล้ว"); this.renderAll();
      };
      $("#vbBack").onclick = () => { this.viewOnly = false; S = Store.load(); b.hidden = true; this.renderAll(); };
      history.replaceState(null, "", "#trip");
      this.show("trip");
    } catch (e) { toast("เปิดลิงก์แผนไม่ได้: " + e.message); this.show("trip"); }
  },

  init() {
    PlanView.bind(); PlacesView.bind(); FoodView.bind(); PrepView.bind(); PackingView.bind(); BudgetView.bind();
    window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h.startsWith("share=")) this.loadShared(h.slice(6)); else this.show(h); });
    const h = location.hash.slice(1);
    const N = tripNights(), now = jstNow().iso;
    const during = S.plan && now >= S.trip.start && now <= addDays(S.trip.start, N);
    if (h.startsWith("share=")) this.loadShared(h.slice(6));
    else this.show(h || (during ? "today" : S.plan ? "trip" : "setup"));
    $("#btnSet").onclick = () => this.settings();
    $("#btnCalc").innerHTML = I("calculator");
    $("#btnCalc").onclick = () => YenCalc.open();
    $("#btnShare").onclick = () => this.share();
    $("#btnUndo").onclick = () => Hist.undo();
    document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "z" && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); Hist.undo(); } });
    refreshRate();
    // ไม่ลง service worker ตอนพัฒนาบน localhost (ไฟล์เก่าค้าง cache): ใส่ ?sw=1 เพื่อทดสอบออฟไลน์
    const dev = /^(localhost|127\.)/.test(location.hostname) && !location.search.includes("sw=1");
    if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !dev) navigator.serviceWorker.register("sw.js").catch(() => null);
  },
};
App.init();
