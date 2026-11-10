// โครงแอป: แท็บหลัก 4 แท็บ + หัวข้อย่อย, ตั้งค่า, แชร์ลิงก์, ย้อนกลับ, PWA
const TABS = [
  { id: "mytrip", ic: "map", name: "ทริปของฉัน", subs: [["trip", "แผนรายวัน"], ["today", "วันนี้"], ["setup", "ข้อมูลทริป"], ["stays", "ที่พัก+จอง"]] },
  { id: "explore", ic: "search", name: "ค้นหา", subs: [["places", "สถานที่"], ["food", "ร้านอาหาร"]] },
  { id: "ready", ic: "backpack", name: "เตรียมตัว", subs: [["prep", "สิ่งที่ต้องทำ"], ["packing", "ของจำเป็น"], ["budget", "งบประมาณ"]] },
  { id: "guide", ic: "book-open", name: "คู่มือ", subs: [["guide", "คู่มือฉบับย่อ"], ["emergency", "เอกสาร + ฉุกเฉิน"]] },
];
const TAB_OF = Object.fromEntries(TABS.flatMap((t) => t.subs.map(([id]) => [id, t])));
const RENDER = {
  trip: () => PlanView.render(), setup: () => PlanView.renderSetup(), stays: () => PlanView.renderStays(), today: () => PlanView.renderToday(),
  places: () => PlacesView.render(), food: () => FoodView.render(),
  packing: () => PackingView.render(), prep: () => PrepView.render(), budget: () => BudgetView.render(),
  guide: () => GuideView.guide(),
  emergency: () => GuideView.emergency(),
};

// ---------- กันแผนหาย: แผนอยู่ในเบราว์เซอร์เครื่องเดียว ----------
// iPhone: Safari ลบข้อมูลเว็บที่ไม่ได้เปิด 7 วัน (ยกเว้นเพิ่มไว้หน้าจอโฮม) จึงชวนติดตั้ง + เตือนสำรองไฟล์
const Safety = {
  prompt: null, // beforeinstallprompt ของ Android/Chrome: กดติดตั้งได้ในปุ่มเดียว
  standalone: () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
  ios: () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
  banner() {
    if (!S.plan || App.viewOnly || Date.now() < (S.set.nagUntil || 0)) return "";
    const mobile = matchMedia("(pointer: coarse)").matches, n = S.bkN || 0;
    const install = mobile && !this.standalone(), backup = n >= 30 || (!S.bkAt && n >= 15);
    if (!install && !backup) return "";
    const how = this.prompt ? `<button class="btn small primary" data-safe="install">${I("download")} ติดตั้งเป็นแอป</button>`
      : this.ios() ? `<span class="small">Safari: กด <b>แชร์</b> (สี่เหลี่ยมลูกศรขึ้น) → <b>เพิ่มไปยังหน้าจอโฮม</b> แล้วเปิดจากไอคอนนั้น</span>`
      : `<span class="small">Chrome: กด <b>⋮</b> → <b>ติดตั้งแอป</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></span>`;
    return `<div class="callout warn safe no-print"><b>${I("triangle-alert")} ${install ? "กันแผนหาย: เพิ่มเว็บนี้ไว้หน้าจอโฮม" : `แก้แผนไป ${n} ครั้งแล้ว ยังไม่ได้สำรอง`}</b>
      <p class="small" style="margin:4px 0 8px">${install ? `แผนเก็บอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น${this.ios() ? " และ iPhone จะลบข้อมูลเว็บที่ไม่ได้เปิดเกิน 7 วัน" : " ถ้าล้างข้อมูลเบราว์เซอร์แผนจะหาย"} เปิดจากไอคอนหน้าจอโฮมจะปลอดภัยกว่า และใช้ออฟไลน์ได้` : "แผนอยู่ในเบราว์เซอร์เครื่องเดียว สำรองเป็นไฟล์ไว้ (ส่งเข้า LINE/อีเมลตัวเอง) ถ้าหายหรือเปลี่ยนเครื่อง นำเข้าได้ใน ตั้งค่า"}</p>
      <div class="row">${install ? how : ""}<button class="btn small" data-safe="backup">${I("download")} สำรองไฟล์ .json</button><span class="spacer"></span><button class="btn small" data-safe="later">ไว้ทีหลัง</button></div></div>`;
  },
  bind() {
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); this.prompt = e; App.renderAll(); });
    window.addEventListener("appinstalled", () => { this.prompt = null; App.renderAll(); });
    document.addEventListener("click", async (ev) => {
      const a = ev.target.closest("[data-safe]")?.dataset.safe;
      if (!a) return;
      if (a === "backup") { Store.export(); toast("สำรองแล้ว เก็บไฟล์ไว้ที่ปลอดภัย"); }
      else if (a === "later") { S.set.nagUntil = Date.now() + 3 * 864e5; save(false); toast("จะเตือนอีกครั้งใน 3 วัน"); }
      else if (a === "install" && this.prompt) { this.prompt.prompt(); await this.prompt.userChoice; this.prompt = null; }
      App.renderAll();
    });
    navigator.storage?.persist?.().catch(() => null); // ขอให้เบราว์เซอร์ไม่ลบข้อมูลเองเมื่อพื้นที่เหลือน้อย
  },
};

const App = {
  cur: null, viewOnly: false,
  renderAll() {
    if (this.cur) {
      // วาดใหม่ทั้งหน้าแล้วกล่องพับ (details) จะกลับเป็นค่าเริ่มต้น: จำสถานะเปิด/ปิดไว้แล้วคืนให้ (key = id หรือหัวข้อไม่รวมตัวเลข เพราะตัวเลขนับเปลี่ยนได้)
      const sec = $(`[data-sec="${this.cur}"]`), key = (d) => d.id || d.querySelector("summary")?.textContent.replace(/[\d\s]/g, "").slice(0, 40);
      const st = new Map(sec ? $$("details", sec).map((d) => [key(d), d.open]) : []);
      RENDER[this.cur]();
      if (sec) $$("details", sec).forEach((d) => { const k = key(d); if (st.has(k)) d.open = st.get(k); });
    }
    this.refreshChrome();
  },

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
    </div><details class="adv"><summary>ขั้นสูง: เวลาเดินทาง ขับบนหิมะ จำนวนที่ต่อวัน มื้ออัตโนมัติ อัตราแลกเงิน</summary><div class="form set-form">
      <label class="f">เผื่อเวลาเดินทางเพิ่ม (%)<input type="number" min="0" max="100" step="5" data-s="slack" value="${s.slack}"></label>
      <label class="f">ขับสูงสุดต่อวัน (ชม.) <small>ว่าง = ตามสไตล์</small><input type="number" min="1" max="10" step="0.5" data-s="maxDrive" value="${s.maxDrive}"></label>
      <label class="f">เริ่มวัน <small>ว่าง = ตามสไตล์</small><input type="time" data-s="dayStart" value="${s.dayStart}"></label>
      <label class="f">จบวัน <small>ว่าง = ตามสไตล์</small><input type="time" data-s="dayEnd" value="${s.dayEnd}"></label>
      <label class="f">ขับบนหิมะ <small>ตัวคูณเวลาขับหน้าหนาว</small><select data-s="snow">${opt("new", "ไม่เคยขับ ×1.5 (ปลอดภัยสุด)", s.snow)}${opt("some", "เคยขับมาบ้าง ×1.3", s.snow)}${opt("dry", "ถนนส่วนใหญ่แห้ง ×1.1", s.snow)}</select></label>
      <label class="f">ที่เที่ยวสูงสุดต่อวัน <small>ว่าง = ตามสไตล์</small><input type="number" min="1" max="12" data-s="maxStops" value="${s.maxStops}"></label>
      <label class="f row" style="flex-direction:row;align-items:center"><input type="checkbox" data-s="autoMeal" ${s.autoMeal !== false ? "checked" : ""}> ใส่ช่วงกินข้าวกลางวันให้อัตโนมัติตอนสร้างแผน</label>
      <label class="f">อัตราแลกเงิน 1 เยน = ? บาท<input type="number" step="0.0001" data-s="rate" value="${S.rate}"></label>
      <label class="f row" style="flex-direction:row;align-items:center"><input type="checkbox" data-s="rateAuto" ${s.rateAuto ? "checked" : ""}> อัปเดตอัตราแลกเงินอัตโนมัติวันละครั้ง</label>
    </div></details>
    <h3 style="margin-top:16px">ข้อมูลและออฟไลน์</h3>
    <div class="row"><button class="btn" data-a="export">ส่งออกไฟล์ .json</button>
      <label class="btn">นำเข้าไฟล์ .json<input type="file" data-a="import" accept=".json,application/json" hidden></label>
      <button class="btn" data-a="print">${I("printer")} พิมพ์ / PDF แผนรายวัน</button><button class="btn red" data-a="reset">ล้างข้อมูลทั้งหมด</button></div>
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
      else if (a === "reset" && confirm("ล้างแผน รายการจัดกระเป๋า งาน และค่าตั้งทั้งหมด? ย้อนกลับไม่ได้")) { localStorage.removeItem(STORE_KEY); S = Store.defaults(); Modal.close(); location.hash = "#setup"; this.renderAll(); }
    };
  },

  print() {
    if (!S.plan) return toast("สร้างแผนก่อน แล้วค่อยพิมพ์");
    location.hash = "#trip";
    setTimeout(() => { $$(".gantt-box").forEach((d) => (d.open = true)); window.print(); }, 300);
  },

  // ---------- แชร์ ----------
  async share() {
    if (!S.plan) return toast("สร้างแผนก่อน แล้วค่อยแชร์");
    const url = await Share.link();
    Modal.open(`<h2>ส่งแผนให้เพื่อนดู</h2><p class="mute">คนที่เปิดลิงก์จะเห็นแผนเหมือนคุณ และกด "คัดลอกเป็นแผนของฉัน" เพื่อแก้ต่อได้ แก้ทีหลังต้องส่งลิงก์ใหม่ (ไม่ได้ซิงก์กัน)</p>
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
    Safety.bind(); PlanView.bind(); PlacesView.bind(); FoodView.bind(); PrepView.bind(); PackingView.bind(); BudgetView.bind();
    window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h.startsWith("share=")) this.loadShared(h.slice(6)); else this.show(h); });
    const h = location.hash.slice(1);
    const N = tripNights(), now = jstNow().iso;
    const during = S.plan && now >= S.trip.start && now <= addDays(S.trip.start, N);
    if (h.startsWith("share=")) this.loadShared(h.slice(6));
    else this.show(h || (during ? "today" : S.plan ? "trip" : "setup"));
    $("#btnSet").onclick = () => this.settings();
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
