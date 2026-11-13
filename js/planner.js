// ตรรกะวางแผน: เลือกรูท, แจกคืน, เติมสถานที่, จัดลำดับ, ตรวจว่าเวลาพอไหม
// รายการในแต่ละวัน (day.items) = [{ id, at?, dur?, note?, night?, u?, st? }]
//   id: ตัวเลข = สถานที่, "c…" = จุดที่ผู้ใช้เพิ่มเอง (S.plan.custom)
//   at = ล็อกเวลา "HH:MM", dur = ทับเวลาที่ใช้ (ชม.), night = ไปหลังเช็กอิน, u = ผู้ใช้ใส่เอง (จัดอัตโนมัติไม่ลบ), st = done/skip (โหมดวันนี้)
const SEV = { bad: 10, warn: 1 };
const sevOf = (ev) => ev.checks.reduce((a, c) => a + (SEV[c.lvl] || 0), 0);

const Planner = {
  days: () => tripNights() + 1,
  dayIso: (i) => addDays(S.trip.start, i),

  // คะแนนความเหมาะของแต่ละรูทกับสิ่งที่ผู้ใช้เลือก (0-100)
  rankTemplates() {
    const t = S.trip, N = tripNights(), m = monthOf(t.start);
    return TEMPLATES.map((tp) => {
      const min = tp.stops.reduce((a, s) => a + s[1], 0), ideal = tp.stops.reduce((a, s) => a + s[2], 0);
      let score = 50; const why = [];
      const hit = t.interests.reduce((a, k) => a + (tp.interests[k] || 0), 0);
      score += (hit / (t.interests.length * 3 || 1)) * 35;
      if (N < min) { score -= 15 * (min - N); why.push(`ต้องการอย่างน้อย ${min} คืน`); }
      else if (N > ideal + 2) { score -= 4 * (N - ideal - 2); why.push(`คืนเยอะกว่ารูท (เหมาะ ${ideal} คืน) จะเพิ่มคืนที่ฐานหลัก`); }
      if (t.mode === "transit" && tp.transit === 0) { score -= 40; why.push("รถไฟ/บัสไปไม่สะดวก"); }
      if (t.mode === "transit" && tp.transit === 2) score += 8;
      if (t.mode === "car" && tp.carOnly === false) score -= 6;
      if (t.mode === "car" && tp.level === "ยาก") why.push("ขับไกล ทางห่างไกล");
      if (tp.drift) {
        if (m === 2 || (m === 3 && toDate(t.start).getDate() < 10)) { score += 8; why.push("ตรงช่วงทะเลน้ำแข็ง"); }
        else { score -= 10; why.push("ทะเลน้ำแข็งมาช่วงปลาย ม.ค.-ต้น มี.ค."); }
      }
      if (t.pace === "chill" && tp.stops.length > N) score -= 8;
      return { tp, score: Math.max(0, Math.min(100, Math.round(score))), min, ideal, why };
    }).sort((a, b) => b.score - a.score);
  },

  // แจกจำนวนคืนให้ฐานในรูท แล้วคืน array ฐานรายคืน
  allocate(tp, N) {
    const stops = tp.stops.map(([hub, min, ideal]) => ({ hub, min, ideal, n: min }));
    const total = () => stops.reduce((a, s) => a + s.n, 0);
    // คืนไม่พอ: ตัดฐานท้ายรูทออกทีละฐาน (ฐานแรกเก็บไว้เสมอ)
    for (let j = stops.length - 1; total() > N && j > 0; j--) { stops[j].n = 0; stops[j].ideal = 0; }
    if (total() > N) stops[0].n = N;
    for (let grew = true; total() < N && grew;) {
      grew = false;
      for (const s of stops) if (total() < N && s.n < s.ideal) { s.n++; grew = true; }
    }
    // คืนเหลือ: เพิ่มที่ฐานเมือง (ฐานที่ ideal มากสุด) ก่อน
    const main = [...stops].sort((a, b) => b.ideal - a.ideal);
    for (let i = 0; total() < N; i++) main[i % Math.min(2, main.length)].n++;
    return stops.filter((s) => s.n > 0).flatMap((s) => Array(s.n).fill(s.hub));
  },

  create(tpId) {
    const tp = TEMPLATES.find((x) => x.id === tpId);
    const old = S.plan;
    S.trip.arrive = tp.in; S.trip.depart = tp.out;
    S.plan = { tpl: tpId, bases: this.allocate(tp, tripNights()), days: [], hotels: old?.hotels || {}, custom: old?.custom || {}, wish: old?.wish || [] };
    this.syncDays();
    this.autofillAll();
    S.plan.days.forEach((d, i) => { if (!d.items.some((it) => S.plan.custom[it.id]?.meal)) this.placeMeal(i); }); // หลังเติมที่เที่ยว ถึงรู้ว่าเที่ยงอยู่ตรงไหน
  },


  // ให้จำนวนวันในแผนตรงกับวันเดินทาง (เมื่อผู้ใช้เปลี่ยนวัน)
  syncDays() {
    const P = S.plan, N = tripNights();
    S.trip.nights = N;
    if (!P) return;
    P.hotels ||= {}; P.custom ||= {};
    const inPlan = new Set(P.days.flatMap((d) => (d.items || []).map((it) => it.id)));
    P.wish = (P.wish || []).filter((id) => point(id) && !inPlan.has(id)); // ที่ลงวันไปแล้วไม่ต้องค้างในรายการอยากไป
    while (P.bases.length < N) P.bases.push(P.bases[P.bases.length - 1] || "sapporo");
    P.bases.length = N;
    while (P.days.length < N + 1) P.days.push({ items: [] });
    P.days.length = N + 1;
    P.days.forEach((d) => { d.items ||= []; });
    if (S.trip.mode === "mixed") { // แผนเก่าเลือกโหมดรายวัน → ย้ายไปเป็นรายช่วง
      S.trip.mode = "car";
      P.days.forEach((d) => { if (d.mode === "transit") { d.hm ||= "transit"; d.items.forEach((it) => (it.m ||= "transit")); } delete d.mode; });
    }
    P.days.forEach((d, i) => { if (!d.mealInit) this.placeMeal(i); });
  },

  ends(i) {
    const P = S.plan, N = tripNights();
    return { from: i === 0 ? S.trip.arrive : P.bases[i - 1], to: i === N ? S.trip.depart : P.bases[i] };
  },

  // ค่าเริ่มต้นของทุกช่วง (เลือกแยกรายช่วงได้: it.m / day.hm) • วันนอกช่วงเช่ารถ = รถไฟ/บัส
  modeOf(i) { const r = this.rent(); return !r ? "transit" : i == null || (i >= r.pd && i <= r.rd) ? "car" : "transit"; },

  // รถเช่า: วันรับ/คืน (index วัน) • ไม่ปักหมุด = สนามบินขาไป/ขากลับ • pAir/rAir = รับตอนเครื่องลง/คืนก่อนบิน (บวกเวลาในเวลาสนามบิน ไม่เป็นจุดในแผน)
  rent() {
    const t = S.trip, N = tripNights(), p = t.rent?.p || {}, r = t.rent?.r || {};
    if (t.mode === "transit") return null;
    const pd = Math.min(Math.max(p.day ?? 0, 0), N), rd = Math.min(Math.max(r.day ?? N, pd), N);
    return { pd, rd, p, r, pAir: pd === 0 && !p.lat, rAir: rd === N && !r.lat };
  },
  rentPoint(k) {
    const x = S.trip.rent?.[k] || {}, air = AIR[k === "p" ? S.trip.arrive : S.trip.depart];
    return { ...(x.lat ? { lat: x.lat, lng: x.lng } : air), name: (k === "p" ? "รับรถเช่า" : "คืนรถเช่า") + (x.lat ? "" : ` (${names(air)[0]})`) };
  },

  // ทุกวิธีเดินทางที่แผนใช้ (ค่าเริ่มต้น + ที่เลือกรายช่วง): ใช้กรองของเตรียม/แอป
  usedModes() {
    const s = new Set([this.modeOf()]);
    S.plan?.days.forEach((d) => { if (d.hm) s.add(d.hm); d.items.forEach((it) => it.m && s.add(it.m)); });
    return s;
  },

  // มื้ออาหาร = รายการธรรมดาในวัน (จุดของฉันไม่มีพิกัด) ย้าย/ลบ/เพิ่มเองได้; near = เวลาประมาณ ใช้ตอนจัดลำดับ ไม่บังคับรอ
  newMeal(name = "กินข้าว", near = "12:00") {
    const id = "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    S.plan.custom[id] = { name, hours: 0.75, meal: true };
    return { id, u: true, near };
  },
  placeMeal(i) {
    const d = S.plan.days[i], N = tripNights();
    d.mealInit = true;
    if (S.set.autoMeal === false) return; // ปิดในตั้งค่า: ผู้ใช้ใส่เวลากินข้าวเอง
    if (i === N && this.needAirport(this.modeOf()) < 13) return; // เช้าวันกลับรีบไปสนามบิน
    if (i === 0 && this.leaveAirport(this.modeOf()) > 13.5) return;
    const meal = this.newMeal(), items = this.softPlace(i, d.items, meal);
    const v = this.evaluate(i, items).tl.find((x) => x.kind === "visit" && x.it === meal);
    if (v && v.t >= 10.5 && v.t <= 15) d.items = items; // ไม่มีช่องช่วงเที่ยง (เช่น ถึงสนามบินก่อนเที่ยง) ไม่ใส่ให้ เพิ่มเองได้
    else delete S.plan.custom[meal.id];
  },
  // แทรกรายการที่มี near ในช่องที่ทำให้เริ่มใกล้เวลานั้นที่สุด (ไม่เปลี่ยนลำดับที่เหลือ)
  // มื้อที่วางตามเวลา (near) หาที่ใหม่ หลังจุดอื่นในวันนั้นถูกเอาออก/ย้าย
  resoft(i) {
    const d = S.plan.days[i], soft = d.items.filter((x) => x.near && !x.at && !x.night);
    let out = d.items.filter((x) => !soft.includes(x));
    for (const it of soft) out = this.softPlace(i, out, it);
    d.items = out;
  },
  softPlace(i, items, it) {
    const day = items.filter((x) => !x.night), night = items.filter((x) => x.night), want = parseT(it.near);
    let best = null;
    for (let k = 0; k <= day.length; k++) {
      const trial = [...day]; trial.splice(k, 0, it);
      const ev = this.evaluate(i, [...trial, ...night]), v = ev.tl.find((y) => y.kind === "visit" && y.it === it);
      const cost = v ? Math.abs(v.t - want) + sevOf(ev) * 3 : 99;
      if (!best || cost < best.cost) best = { cost, trial };
    }
    return [...best.trial, ...night];
  },


  // ---- เที่ยวบิน: เวลาที่ออกจากสนามบินได้ / ต้องถึงสนามบิน ----
  overnight() { const d = S.trip.outFlight?.dep; return !!d && d.slice(0, 10) < S.trip.start; },
  firstDayLight() { const t = S.trip; return t.firstDay === "light" || (t.firstDay === "auto" && this.overnight() && parseT(t.arriveTime) < 10); },
  // รับ/คืนรถบวกเวลาเฉพาะเมื่อรับตอนเครื่องลง/คืนก่อนบินที่สนามบิน ที่อื่น/วันอื่นเป็นจุด "รับรถ/คืนรถ" ในแผนรายวัน
  leaveAirport(mode) { const t = S.trip, b = t.buf, r = this.rent(); return parseT(t.arriveTime) + ((t.domIn ? b.dom : b.imm) + (r?.pAir ? b.car : r?.pd === 0 ? 0 : b.pass)) / 60; },
  needAirport(mode) { const t = S.trip, b = t.buf; return parseT(t.departTime) - ((t.domOut ? b.beforeDom : b.before) + (this.rent()?.rAir ? b.ret : 0)) / 60; },

  // เวลาเดินทางระหว่าง 2 จุด ตามโหมด (รวมตัวคูณหิมะตามเดือน + เวลาเผื่อจากหน้าตั้งค่า)
  leg(a, b, mode, iso) {
    if (a === b) return { h: 0, km: 0, drive: 0 };
    const pa = point(a), pb = point(b);
    if (!pa?.lat || !pb?.lat) return { h: 0, km: 0, drive: 0 };
    const slack = 1 + (+S.set.slack || 0) / 100;
    const ha0 = hubOf(a), d0 = km(pa, pb);
    if (mode === "walk") return { h: (d0 * 1.3 / 4 + 0.05) * slack, km: Math.round(d0 * 10) / 10, drive: 0, walk: true };
    if (mode === "taxi") { const d = driveLeg(a, b), f = winterF(iso || S.trip.start, "some") * slack; return { h: d.h * f + 0.1, km: d.km, drive: 0, taxi: true, est: d.est }; }
    // ในเมืองใหญ่ (ซัปโปโร ฮาโกดาเตะ ฯลฯ) จอดรถที่พักแล้วเดิน/รถไฟใต้ดิน ไม่นับเป็นเวลาขับ
    if (mode === "car" && HUB[ha0]?.city && ha0 === hubOf(b) && d0 < 8 && !AIR[a] && !AIR[b]) return { h: (d0 / 15 + 0.2) * slack, km: Math.round(d0), drive: 0, local: true, city: true };
    if (mode === "car") {
      const d = driveLeg(a, b), f = winterF(iso || S.trip.start) * slack;
      return { h: d.h * f, km: d.km, drive: d.h * f, high: d.high && isWinter(iso || S.trip.start), risk: d.risk, est: d.est, noFuel: d.noFuel };
    }
    const ha = hubOf(a), hb = hubOf(b);
    const local = (id, hub) => (!HUB[id] && !AIR[id] ? km(point(id), HUB[hub]) / 20 + 0.2 : 0);
    if (ha === hb) {
      const d = km(pa, pb);
      if (d * 1.3 <= 1.2) return { h: (d * 1.3 / 4 + 0.05) * slack, km: Math.round(d * 13) / 10, drive: 0, walk: true }; // ใกล้: เดินเร็วกว่ารอรถ
      return { h: (d / 20 + 0.25) * slack, km: Math.round(d), local: true };
    }
    const t = transitPath(AIR[a] ? a : ha, AIR[b] ? b : hb);
    if (!t) { const d = driveLeg(a, b); return { h: (d.h * winterF(iso || S.trip.start, "some") + 0.5) * slack, km: d.km, noTransit: true }; }
    return { h: (local(a, ha) + t.h + local(b, hb)) * slack, km: driveLeg(a, b).km, by: t.legs.map((e) => e.by), pass: t.legs.some((e) => e.pass), rural: t.legs.some((e) => !e.pass),
      sparse: t.legs.filter((e) => freqMin(e) >= 120).map((e) => `${e.by} ${e.freq}`) }; // เที่ยวห่าง: ต้องดูตารางจริง
  },

  dur(it, p) { return it.dur ?? p.hours ?? p.dur ?? 1; },

  // จำลองวันนั้นทั้งวันตามลำดับที่ผู้ใช้จัด → timeline + ผลตรวจ
  // opts.live = { t, from } เริ่มคำนวณใหม่จากเวลาและจุดปัจจุบัน (โหมดวันนี้)
  evaluate(i, itemsOverride, opts = {}) {
    const P = S.plan, t = S.trip, N = tripNights(), pc = pace();
    const iso = this.dayIso(i), { from, to } = this.ends(i), mode = this.modeOf(i), day = P.days[i];
    let items = (itemsOverride || day.items).filter((it) => point(it.id) && !it.maybe); // maybe = จุดสำรอง ไม่นับเวลา
    if (opts.live) items = items.filter((it) => !it.st);
    // รับ/คืนรถที่สาขาหรือวันอื่น: จุดอัตโนมัติ ต้นวัน (ล็อกเวลาได้) / ท้ายช่วงกลางวัน • ก่อนรับ/หลังคืน ใช้รถไฟ/บัส
    const R = this.rent(), b0 = t.buf;
    let dm = R && R.pd === i && !R.pAir ? "transit" : mode;
    const rentP = R && R.pd === i && !R.pAir ? { id: "rent:p", dur: b0.car / 60, at: R.p.time || undefined, rent: "p" } : null;
    const rentR = R && R.rd === i && !R.rAir ? { id: "rent:r", dur: b0.ret / 60, rent: "r" } : null;
    const toHub = hubOf(to), ref = point(to);
    const sun = sunTimes(iso, ref.lat, ref.lng);
    const dayI = [rentP, ...items.filter((it) => !(it.night && i < N)), rentR].filter(Boolean), nightI = items.filter((it) => it.night && i < N);
    let time = opts.live ? opts.live.t : i === 0 ? this.leaveAirport(mode) : day.start ? parseT(day.start) : pc.start;
    const tl = [], checks = [];
    const add = (lvl, text) => checks.push({ lvl, text });
    let driveH = 0, kmSum = 0, darkRisk = false, prev = opts.live ? opts.live.from : from, lateRural = false, noFuel = false;
    const move = (toId, m = mode, it, home) => {
      const L = this.leg(prev, toId, m, iso);
      if (L.h > 0) {
        tl.push({ t: time, kind: "move", from: prev, to: toId, ...L, mode: m, it, home });
        if (m === "car") driveH += L.drive;
        kmSum += L.km;
        if (L.rural && time + L.h > 18.5) lateRural = true;
        if (L.noFuel) noFuel = L.noFuel;
        time += L.h;
        if (L.high && time > sun.set) darkRisk = L.risk;
        if (wayMeal) { // กินระหว่างทาง ~เที่ยง: บนรถไฟไม่เสียเวลา / ขับรถแวะจุดพัก 30 นาที
          const h = m === "car" ? 0.5 : 0;
          tl.push({ t: Math.min(Math.max(time - L.h, 12), time), kind: "visit", id: wayMeal.id, h, night: false, it: wayMeal, onWay: m });
          time += h; wayMeal = null;
        }
      }
      if (point(toId)?.lat) prev = toId;
    };
    if (i === 0 && !opts.live) {
      const b = t.buf;
      tl.push({ t: parseT(t.arriveTime), kind: "info", ic: "plane", text: `เครื่องลง ${t.arriveTime} • ${t.domIn ? "เที่ยวบินในประเทศ" : "ตรวจคนเข้าเมือง + รับกระเป๋า"} ~${t.domIn ? b.dom : b.imm} นาที • ${R?.pAir ? `รับรถเช่า ~${b.car} นาที` : R?.pd === 0 ? "ไปรับรถที่สาขา" : `ซื้อพาส/IC/ซิม ~${b.pass} นาที`}` });
    }
    const atOf = (it, night) => parseT(it.at) + (night && parseT(it.at) < 6 ? 24 : 0); // ตอนค่ำล็อก 00:30 = หลังเที่ยงคืนคืนนั้น (เช่น เคาท์ดาวน์)
    // ล็อกเวลา: รอที่จุดก่อนหน้า (ที่พัก/ที่เที่ยว) แล้วค่อยออก ให้ไปถึงก่อนเวลา ~10 นาที แทนไปยืนรอที่ปลายทาง
    const lead = (it, m, night) => {
      if (!it.at) return;
      const gap = atOf(it, night) - 1 / 6 - this.leg(prev, it.id, m, iso).h - time;
      if (gap >= 0.08) { tl.push({ t: time, kind: "wait", h: gap, at: prev }); time += gap; }
    };
    const visit = (it, night) => {
      const p = point(it.id);
      if (it.at) {
        const at = atOf(it, night);
        if (time < at - 0.08) { if (at - time > 0.25) tl.push({ t: time, kind: "wait", h: at - time }); time = at; }
        else if (time > at + 0.1) add("bad", `ไปถึง ${pname(it.id)} ${fmtT(time)} ไม่ทันเวลาที่ล็อกไว้ ${it.at}`);
      }
      const h = this.dur(it, p);
      tl.push({ t: time, kind: "visit", id: it.id, h, night, it });
      time += h;
      return p;
    };
    let wayMeal = null;
    dayI.forEach((it, k) => {
      if (P.custom[it.id]?.meal && !it.at && time < 11.25) { // ช่วงถัดไปยาวคร่อมเที่ยง → กินระหว่างทาง
        const nx = dayI[k + 1], L = this.leg(prev, nx ? nx.id : to, nx ? nx.m || dm : day.hm || dm, iso);
        if (L.h >= 1.5 && time + L.h > 12.5) { wayMeal = it; return; }
      }
      lead(it, it.m || dm, false); move(it.id, it.m || dm, it); visit(it, false);
      if (it === rentP) dm = "car";
      if (it === rentR) { dm = "transit"; if (R.r.time && time > parseT(R.r.time) + 0.05) add("warn", `คืนรถ ${fmtT(time)} เลยเวลาที่ต้องคืน ${R.r.time}`); }
    });
    const hm = day.hm || dm; // วิธีไปที่พัก/สนามบินช่วงสุดท้าย
    move(to, hm, null, true);
    const arrive = time;
    tl.push({ t: time, kind: i === N ? "airport" : "hotel", id: to });
    if (nightI.length) { // เช็กอิน วางกระเป๋า ~30 นาที (ไม่ก่อนเวลาเช็กอิน) แล้วค่อยออกไปต่อ
      const ci = parseT(hotelOf(toHub)?.checkIn || "15:00"), go = Math.max(time + 0.5, ci);
      tl.push({ t: time, kind: "info", ic: "hotel", text: `${go - time > 0.6 ? `รอเช็กอิน ${fmtT(ci)} (ฝากกระเป๋า/พักผ่อน)` : "เช็กอิน วางกระเป๋า อย่างน้อย ~30 นาที"} • อยากพักนานกว่านี้: ล็อกเวลาเริ่มของที่ถัดไป` });
      time = go;
    }
    if (nightI.length && !nightI.some((it) => it.at) && sun.set - 0.25 > time && nightI.some((it) => point(it.id).evening)) { // รอให้มืด ไฟประดับ/วิวกลางคืนถึงสวย
      if (sun.set - 0.25 - time >= 0.08) tl.push({ t: time, kind: "wait", h: sun.set - 0.25 - time, at: to, why: "รอให้มืด ไฟ/วิวกลางคืนสวยกว่า" });
      time = sun.set - 0.25;
    }
    for (const it of nightI) { lead(it, it.m || dm, true); move(it.id, it.m || dm, it); visit(it, true); }
    // bm = วิธีกลับที่พักหลังเที่ยวค่ำ (ว่าง = แบบเดียวกับขาไปที่สุดท้าย)
    if (nightI.length) { move(to, day.bm || nightI[nightI.length - 1].m || hm, null, "back"); tl.push({ t: time, kind: "back", id: to }); }
    const end = time;

    // ---- ตรวจ ----
    if (driveH > pc.maxDrive + 1.5) add("bad", `ขับ ${fmtH(driveH)}${isWinter(iso) ? " (รวมเผื่อหิมะ)" : ""} เกินขีด ${pc.maxDrive} ชม./วัน มาก`);
    else if (driveH > pc.maxDrive) add("warn", `ขับ ${fmtH(driveH)} เกินขีด ${pc.maxDrive} ชม./วัน`);
    if (darkRisk) add("bad", `ข้ามช่องเขา/ถนนเสี่ยงหลังมืด: ${darkRisk}`);
    else if (hm === "car" && isWinter(iso) && arrive > sun.set + 0.25 && i < N) add("warn", `ถึงที่พัก ${fmtT(arrive)} หลังพระอาทิตย์ตก (${fmtT(sun.set)}) ขับตอนมืดถนนเป็นน้ำแข็ง`);
    let leaveBy = null;
    if (i === N) {
      const need = this.needAirport(mode);
      leaveBy = need - this.leg(from, to, mode, iso).h;
      if (arrive > need + 0.01) add("bad", `ถึงสนามบิน ${fmtT(arrive)} ช้าไป ต้องถึงก่อน ${fmtT(need)} (${mode === "car" ? "คืนรถ + " : ""}เช็กอิน${t.domOut ? "ในประเทศ" : "ระหว่างประเทศ"})`);
      if (parseT(t.departTime) <= 11.5 && !opts.live) add("info", `เครื่องออก ${t.departTime} วันสุดท้ายแทบไม่มีเวลาเที่ยว ต้องออกจากที่พักไม่เกิน ${fmtT(leaveBy)}`);
    } else if (nightI.some((it) => it.at) && end > pc.end) add("info", `กลับถึงที่พัก ~${fmtT(end)} (ล็อกเวลาตอนค่ำไว้เอง)${end >= 24 ? " ข้ามเที่ยงคืน ตั้ง เริ่มวัน ของพรุ่งนี้ให้สายหน่อย" : ""}`);
    else if (end > pc.end + 1) add("bad", `จบวัน ${fmtT(end)} ดึกเกินไปสำหรับสไตล์${pc.name}`);
    else if (end > pc.end) add("warn", `จบวัน ${fmtT(end)} ค่อนข้างดึก`);
    if (i === 0 && !opts.live) {
      if (R?.pAir && parseT(t.arriveTime) >= 20) add("warn", `เครื่องลง ${t.arriveTime} ร้านรถเช่าส่วนใหญ่ปิด ~20:00-21:00 คืนแรกพักใกล้สนามบินแล้วรับรถเช้า`);
      if (this.overnight()) add("info", "บินกลางคืนมา นอนน้อย วันแรกเที่ยวเบาๆ ฝากกระเป๋าที่โรงแรมได้ก่อนเช็กอิน");
    }
    const nVisit = items.filter((it) => isPlace(it.id)).length;
    if (nVisit > pc.maxStops) add("warn", `${nVisit} ที่ในวันเดียว เยอะสำหรับสไตล์${pc.name}`);
    const wd = WD[toDate(iso).getDay()];
    for (const it of items) {
      const p = point(it.id), nm = pname(it.id);
      const closed = p.closed || p.closedDays;
      if (closed && String(closed).includes(wd)) add("warn", `${nm}: อาจปิดวัน${wd} (${closed})`);
      if (isPlace(it.id) && !inSeason(p, iso)) add(p.season ? "warn" : "bad", p.season ? `${nm}: วันนี้นอกช่วงงาน (${p.season.join(" ถึง ")})` : `${nm}: ปิด/ไม่มีอะไรให้ดูช่วงนี้ (เปิด ${monthRange(monthsOf(p))})`);
      if ((it.m || mode) === "transit" && isPlace(it.id)) {
        const a = access(p);
        if (a === "car") add("bad", `${nm}: รถไฟ/บัสไปไม่ถึง ต้องใช้ทัวร์/แท็กซี่ หรือเปลี่ยนวิธีไปช่วงนี้เป็นขับรถ/แท็กซี่`);
        else if (a === "limited" || a === "tour") add("info", `${nm}: ${ACCESS_TXT[a]}${p.tr?.t ? `: ${p.tr.t}` : ""}`);
        const v = tl.find((x) => x.kind === "visit" && x.id === it.id);
        if (p.tr?.last && v && v.t + v.h > parseT(p.tr.last)) add("bad", `${nm}: ออก ${fmtT(v.t + v.h)} เลยรถเที่ยวสุดท้าย ~${p.tr.last}`);
      }
    }
    // เวลาเปิด-ปิด (ไม่ตรวจจุดที่ล็อกเวลาเอง: ผู้ใช้รู้ดีกว่า เช่น จองรอบพิเศษ)
    for (const v of tl) {
      if (v.kind !== "visit" || v.it?.at || v.onWay) continue;
      const r = openRange(point(v.id));
      if (!r) continue;
      const nm = pname(v.id);
      if (v.t >= r[1] - 0.25) add("warn", `${nm}: ไปถึง ${fmtT(v.t)} ปิดแล้ว (เปิด ~${fmtT(r[0])}-${fmtT(r[1])})`);
      else if (v.t < r[0] - 0.1) add("warn", `${nm}: ไปถึง ${fmtT(v.t)} ยังไม่เปิด (เปิด ~${fmtT(r[0])}) ล็อกเวลาหรือสลับลำดับ`);
      else if (v.t + v.h > r[1] + 0.1) add("info", `${nm}: ปิด ~${fmtT(r[1])} อยู่ได้ ${fmtH(r[1] - v.t)} (ตั้งไว้ ${fmtH(v.h)})`);
    }
    [...new Set(tl.flatMap((x) => (x.kind === "move" && x.sparse) || []))].forEach((s) => add("info", `${s}: รถห่าง ตรวจตารางจริงแล้วล็อกเวลาจุดถัดไป`));
    // วันย้ายที่พัก: ออกจากที่พักหลังเวลาเช็กเอาท์
    const hf = i > 0 && hubOf(from) !== toHub ? hotelOf(from) : null, dayStart = tl.find((x) => x.kind === "move")?.t;
    const co = hf?.name || hf?.checkOut ? hf.checkOut || "10:00" : null; // ช่องเช็กเอาท์แสดง 10:00 เป็นค่าเริ่มต้น
    if (co && dayStart != null && !opts.live) {
      tl.unshift({ t: Math.min(dayStart, parseT(co)), kind: "checkout", id: from, co, go: dayStart });
      if (dayStart > parseT(co) + 0.1) add("warn", `ออกจากที่พัก ${fmtT(dayStart)} หลังเช็กเอาท์ ${co}: เช็กเอาท์ก่อนแล้วฝากกระเป๋า/ใส่รถ`);
      else if (mode === "transit" && dayI.some((it) => hubOf(it.id) === hubOf(from))) add("info", `เช็กเอาท์ ${co} แล้วเที่ยว ${short(from)} ต่อ: ฝากกระเป๋าที่ล็อกเกอร์สถานี/โรงแรม`);
    }
    if (lateRural) add("warn", "มีช่วงนั่งบัส/รถไฟท้องถิ่นหลัง 18:30 รถเที่ยวสุดท้ายต่างจังหวัดหมดเร็ว ตรวจตารางจริง");
    if (noFuel) add("info", `${noFuel} เติมน้ำมันก่อนออก`);
    else if (driveH > 2.5) add("info", "เติมน้ำมันให้เกินครึ่งถังก่อนออก ปั๊มต่างจังหวัดปิด ~19:00");
    const ht = hotelOf(toHub);
    if (i < N && ht?.checkIn && hubOf(from) !== toHub && arrive < parseT(ht.checkIn) - 0.25) add("info", `ถึงที่พัก ${fmtT(arrive)} ก่อนเวลาเช็กอิน ${ht.checkIn} ฝากกระเป๋าได้`);
    const md = iso.slice(5);
    if (md >= "12-30" || md <= "01-03") add("info", "ช่วงปีใหม่ ร้าน/สถานที่หลายแห่งปิด ตรวจก่อนไป");
    tl.filter((x) => x.kind === "move" && x.noTransit).forEach((x) => add("warn", `${short(x.from)} → ${short(x.to)} ไม่มีรถไฟ/บัสตรง ใช้รถ/แท็กซี่`));
    if (!items.length && i > 0 && i < N && hubOf(from) === toHub) add("info", "วันนี้ยังว่าง เพิ่มสถานที่ หรือพักผ่อน/เผื่อพายุ");
    const lvl = checks.some((c) => c.lvl === "bad") ? "bad" : checks.some((c) => c.lvl === "warn") ? "warn" : "good";
    return { i, iso, from, to, mode, sun, tl, checks, lvl, driveH, km: kmSum, arrive, end, leaveBy, stops: items.filter((it) => isPlace(it.id)).map((it) => it.id), items };
  },

  evaluateAll() { return S.plan ? S.plan.days.map((_, i) => this.evaluate(i)) : []; },

  // ภาพรวมทั้งทริป
  summary(evals) {
    const t = S.trip, out = [], N = tripNights();
    if (N < 1) out.push({ lvl: "bad", text: "วันกลับต้องหลังวันไปอย่างน้อย 1 คืน" });
    if (!isWinter(t.start) || !isWinter(t.end)) out.push({ lvl: "info", text: "ทริปอยู่นอกหน้าหนาว เวลาขับใช้ค่าปกติ และระบบจะเตือนสถานที่ที่ปิดตามฤดู (คู่มือในเว็บเน้นหน้าหนาว)" });
    if (N + 1 > 15) out.push({ lvl: "bad", text: `${N + 1} วัน เกินสิทธิ์ยกเว้นวีซ่า 15 วันของพาสปอร์ตไทย` });
    if (S.plan) {
      const moves = S.plan.bases.filter((b, i) => i > 0 && b !== S.plan.bases[i - 1]).length;
      if (t.pace === "chill" && moves >= Math.max(3, N * 0.6)) out.push({ lvl: "warn", text: `ย้ายที่พัก ${moves} ครั้งใน ${N} คืน เหนื่อยสำหรับสไตล์ชิล ลองพักฐานละ 2 คืน` });
      if (this.rent() && hubOf("rent:p") !== hubOf("rent:r")) out.push({ lvl: "info", text: "รับ-คืนรถคนละเมือง มีค่าคืนรถต่างสาขา (one-way fee)" });
      const bad = evals.filter((e) => e.lvl === "bad").length, warn = evals.filter((e) => e.lvl === "warn").length;
      const days = (l) => "วันที่ " + evals.filter((e) => e.lvl === l).map((e) => e.i + 1).join(", ");
      if (bad) out.push({ lvl: "bad", text: `${days("bad")} แน่น/เสี่ยงเกินไป` });
      else if (warn) out.push({ lvl: "warn", text: `${days("warn")} ค่อนข้างแน่น` });
      else out.push({ lvl: "good", text: "ทุกวันเวลาพอ ไม่ขับตอนมืด ไม่เกินขีดที่ตั้งไว้" });
      const last = evals[evals.length - 1];
      if (last && last.mode === "car" && last.driveH > 2.5 && isWinter(last.iso)) out.push({ lvl: "warn", text: "วันบินกลับขับไกล ถ้าพายุหิมะอาจตกเครื่อง ลองพักคืนสุดท้ายใกล้สนามบิน" });
      const missing = Object.keys(Object.fromEntries(S.plan.bases.map((b) => [b, 1]))).filter((b) => !hotelOf(b)?.name);
      if (missing.length) out.push({ lvl: "info", text: `ยังไม่ได้กรอกที่พัก: ${missing.map(short).join(", ")} (ข้อมูลทริป › ที่พัก)` });
    }
    return out;
  },

  // ---- เติมสถานที่อัตโนมัติ ----
  placeScore(p, i) {
    const t = S.trip, iso = this.dayIso(i);
    let s = p.stars * 10 + ({ "ดังมาก": 3, "ดัง": 2 }[p.pop] || 1);
    s += p.tags.filter((k) => t.interests.includes(k)).length * 8;
    if (this.modeOf(i) === "transit") { const a = access(p); s -= a === "car" ? 100 : a === "limited" ? 6 : a === "tour" ? 3 : 0; }
    if (p.best && /หน้าร้อน|นอกฤดูหนาว/.test(p.best) && isWinter(iso)) s -= 30;
    if (!inSeason(p, iso)) s -= 100;
    if (p.peak && p.peak.includes(monthOf(iso))) s += 6;
    if (p.best === "วันกลับ") s += i === tripNights() ? 15 : -100;
    return s;
  },

  candidates(i, used) {
    const { from, to } = this.ends(i);
    const hubs = new Set([hubOf(from), hubOf(to)]);
    const mode = this.modeOf(i);
    if (hubOf(from) === hubOf(to)) { // วันพักฐานเดิม: รวมที่เที่ยวแบบไปกลับในวันเดียว
      for (const h of HUBS) {
        const lim = mode === "car" ? driveLeg(hubOf(to), h.id).h <= 1.3 : (transitPath(hubOf(to), h.id)?.h ?? 9) <= 1.2;
        if (lim) hubs.add(h.id);
      }
    }
    // ที่เที่ยวกลางคืนควรอยู่เมืองที่ค้างคืนนั้น ไม่งั้นต้องขับ/นั่งรถกลับตอนมืด
    const nightPenalty = (p) => (p.evening && !/กลางวัน|เช้า/.test(p.best) && p.hub !== hubOf(to) ? 12 : 0);
    return PLACES.filter((p) => hubs.has(p.hub) && !used.has(p.id) && p.lat)
      .map((p) => ({ p, s: this.placeScore(p, i) - nightPenalty(p) - (hubOf(to) === p.hub || hubOf(from) === p.hub ? 0 : 6) }))
      .sort((a, b) => b.s - a.s);
  },

  // สร้างรายการใหม่: ที่เที่ยวกลางคืนในเมืองที่ค้าง = ไปหลังเช็กอิน
  mkItem(i, id, u) {
    const p = point(id), it = { id };
    if (u) it.u = true;
    if (p.evening && !/กลางวัน|เช้า/.test(p.best || "") && hubOf(id) === hubOf(this.ends(i).to) && i < tripNights()) it.night = true;
    return it;
  },

  // เรียงเส้นทางให้สั้นสุด (เพื่อนบ้านใกล้สุด) แล้วแทรกจุดที่ล็อกเวลาตามเวลา
  ordered(i, items) {
    const night = items.filter((it) => it.night), day = items.filter((it) => !it.night);
    const free = day.filter((it) => !it.at && !it.near && point(it.id)?.lat), nopos = day.filter((it) => !it.at && !it.near && !point(it.id)?.lat);
    const soft = day.filter((it) => !it.at && it.near);
    const locked = day.filter((it) => it.at).sort((a, b) => parseT(a.at) - parseT(b.at));
    const seq = [];
    let cur = point(this.ends(i).from);
    while (free.length) {
      free.sort((a, b) => km(cur, point(a.id)) - km(cur, point(b.id)));
      const n = free.shift(); seq.push(n); cur = point(n.id);
    }
    seq.push(...nopos);
    for (const L of locked) {
      const ev = this.evaluate(i, [...seq, ...night]);
      const at = parseT(L.at);
      const k = seq.findIndex((it) => { const v = ev.tl.find((x) => x.kind === "visit" && x.it === it); return v && v.t + 0.01 >= at; });
      seq.splice(k < 0 ? seq.length : k, 0, L);
    }
    let out = [...seq, ...night];
    for (const it of soft) out = this.softPlace(i, out, it);
    return out;
  },
  optimize(i) { const d = S.plan.days[i]; d.items = this.ordered(i, d.items); },

  // แทรกรายการในตำแหน่งที่ทำให้วันนั้นดีที่สุด (ปัญหาน้อย จบเร็ว)
  insertBest(i, it) {
    const d = S.plan.days[i];
    if (it.night) { d.items.push(it); return; }
    const nDay = d.items.filter((x) => !x.night).length;
    let best = null;
    for (let k = 0; k <= nDay; k++) {
      const trial = [...d.items]; trial.splice(k, 0, it);
      const ev = this.evaluate(i, trial), cost = sevOf(ev) * 100 + ev.end + ev.driveH * 0.3;
      if (!best || cost < best.cost) best = { k, cost };
    }
    d.items.splice(best.k, 0, it);
  },

  autofillDay(i, used) {
    const day = S.plan.days[i], pc = pace(), N = tripNights();
    day.items = day.items.filter((it) => it.u || it.at || !isPlace(it.id));
    const base = this.evaluate(i);
    if (base.lvl === "bad") return; // วันเดินทางยาว ไม่เติมเพิ่ม
    // ขับรวมไม่เกินขีดของสไตล์ (วันพักฐานเดิม 85% เผื่อขับกลับ): เวลาจบวัน/มืดตรวจใน evaluate อยู่แล้ว
    const stay = hubOf(base.from) === hubOf(base.to);
    const driveCap = stay ? pc.maxDrive * 0.85 : pc.maxDrive;
    const maxStops = i === 0 ? (this.firstDayLight() ? 1 : Math.ceil(pc.maxStops / 2)) : i === N ? Math.ceil(pc.maxStops / 2) : pc.maxStops;
    // ที่เที่ยวกลางวันกับกลางคืนนับแยกกัน: กลางคืนไม่เกิน 1 ที่ (แน่น 2)
    const maxNight = i === 0 && this.firstDayLight() ? 0 : S.trip.pace === "packed" ? 2 : 1;
    let cur = sevOf(base), n = day.items.filter((it) => isPlace(it.id) && !it.night).length, nN = day.items.filter((it) => it.night).length;
    for (const { p, s } of this.candidates(i, used)) {
      if (n >= maxStops || s < 15) break;
      const item = this.mkItem(i, p.id);
      if (item.night && nN >= maxNight) continue;
      const trial = this.ordered(i, [...day.items, item]);
      const ev = this.evaluate(i, trial);
      const okDark = ev.mode !== "car" || i === N || !isWinter(ev.iso) || ev.arrive <= ev.sun.set;
      if (sevOf(ev) <= cur && ev.driveH <= Math.max(driveCap, base.driveH + 0.25) && okDark) {
        day.items = trial; used.add(p.id); cur = sevOf(ev);
        if (item.night) nN++; else n++;
      }
    }
  },

  autofillAll() {
    const used = this.usedSet(-1, true);
    // เติมวันพักฐานเดิมทีหลัง ให้วันย้ายเมืองได้จุดระหว่างทางก่อน
    const order = S.plan.days.map((_, i) => i).sort((a, b) => {
      const sa = hubOf(this.ends(a).from) === hubOf(this.ends(a).to), sb = hubOf(this.ends(b).from) === hubOf(this.ends(b).to);
      return sa - sb || a - b;
    });
    for (const i of order) this.autofillDay(i, used);
  },

  // สถานที่ที่ใช้แล้วในวันอื่น (keepOnly = เฉพาะที่ผู้ใช้ใส่เอง/ล็อก ซึ่งจัดใหม่แล้วยังอยู่)
  usedSet(except, keepOnly) {
    return new Set(S.plan.days.flatMap((d, i) => (i === except ? [] : d.items.filter((it) => isPlace(it.id) && (!keepOnly || it.u || it.at)).map((it) => it.id))));
  },
  dayOf(id) { return S.plan ? S.plan.days.findIndex((d) => d.items.some((it) => it.id === id)) : -1; },

  // เพิ่มเข้าวันที่เหมาะที่สุด
  // สลับแผนทั้งวัน (ที่พักคงเดิม) เช่น เลื่อนวันเที่ยวไกลหนีพายุ
  swapDays(a, b) {
    const A = S.plan.days[a], B = S.plan.days[b];
    for (const k of ["items", "note", "planB"]) [A[k], B[k]] = [B[k], A[k]];
    for (const d of [A, B]) d.items.forEach((it) => { delete it.st; it.night = undefined; });
  },
  // ย้ายจุดออกจากวัน ไปเก็บในรายการอยากไป
  toWish(i, it) {
    const d = S.plan.days[i].items;
    d.splice(d.indexOf(it), 1);
    if (!S.plan.wish.includes(it.id)) S.plan.wish.push(it.id);
  },
  // ลงทุกรายการอยากไปในวันที่เหมาะสุด คืนจำนวนที่ลงได้
  placeWish() {
    const done = S.plan.wish.filter((id) => this.quickAdd(id) >= 0);
    S.plan.wish = S.plan.wish.filter((id) => !done.includes(id));
    return done.length;
  },
  quickAdd(id) {
    let best = null;
    S.plan.days.forEach((d, i) => {
      if (d.items.some((it) => it.id === id)) return;
      const it = this.mkItem(i, id, true);
      const before = this.evaluate(i), trial = [...d.items, it];
      const ev = this.evaluate(i, this.ordered(i, trial));
      const cost = (sevOf(ev) - sevOf(before)) * 100 + ev.driveH - before.driveH + (inSeason(point(id), ev.iso) ? 0 : 1000);
      if (!best || cost < best.cost) best = { i, cost };
    });
    if (!best) return -1;
    this.insertBest(best.i, this.mkItem(best.i, id, true));
    return best.i;
  },
};
