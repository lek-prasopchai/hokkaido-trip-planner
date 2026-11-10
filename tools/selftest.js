// ทดสอบตรรกะวางแผนแบบเร็ว: node tools/selftest.js
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {} };
global.App = { viewOnly: false };
const root = path.join(__dirname, "..");
for (const f of ["places", "foods", "festivals", "drive", "hubs", "transit", "templates", "guide"]) vm.runInThisContext(fs.readFileSync(`${root}/data/${f}.js`, "utf8"));
for (const f of ["core", "planner"]) vm.runInThisContext(fs.readFileSync(`${root}/js/${f}.js`, "utf8").replace(/^(const|let) /gm, "var "));
const trip = (o) => { S = Store.defaults(); Object.assign(S.trip, o); S.trip.nights = tripNights(); };

// เวลาพระอาทิตย์ตกซัปโปโร 15 ม.ค. ≈ 16:20
const sun = sunTimes("2027-01-15", 43.06, 141.35);
assert(Math.abs(sun.set - 16.35) < 0.25, "sunset " + fmtT(sun.set));
assert(transitPath("CTS", "hakodate"), "ต้องมีเส้นทางรถไฟ CTS→ฮาโกดาเตะ");
assert(PLACES.every((p) => HUB[p.hub] && p.lat), "ทุกสถานที่ต้องมีฐานและพิกัด");
assert(new Set(PLACES.map((p) => p.id)).size === PLACES.length, "id สถานที่ซ้ำ");
assert(FOODS.every((f) => HUB[f.hub] && f.lat && f.id.startsWith("f")), "ทุกร้านต้องมีฐาน พิกัด และ id ขึ้นต้น f");
assert(PLACES.every((p) => !p.months || p.months.every((m) => m >= 1 && m <= 12)), "months ต้องเป็น 1–12");

// ทุกรูท × จำนวนคืน × โหมด สร้างแผนได้ เวลาไม่พัง
for (const tp of TEMPLATES) for (const nights of [3, 5, 7, 10]) for (const mode of ["car", "transit", "mixed"]) {
  trip({ start: "2027-02-01", end: addDays("2027-02-01", nights), mode });
  Planner.create(tp.id);
  const ev = Planner.evaluateAll();
  assert.strictEqual(ev.length, nights + 1);
  assert.strictEqual(S.plan.bases.length, nights);
  ev.forEach((e) => assert(e.end >= e.arrive && isFinite(e.end), `${tp.id} day ${e.i} time`));
}
// รูทมือใหม่ขับรถ 5 คืน ต้องไม่มีวันสีแดง
trip({ start: "2027-01-15", end: "2027-01-20", mode: "car", arriveTime: "11:00", departTime: "17:00" });
Planner.create("starter");
assert(Planner.evaluateAll().every((e) => e.lvl !== "bad"), "starter ไม่ควรมีวันแดง: " + Planner.evaluateAll().filter((e) => e.lvl === "bad").map((e) => e.checks.map((c) => c.text).join("|")).join(" / "));

// ล็อกเวลา: ถ้าล็อกเร็วเกินไปต้องเตือน, ถ้าล็อกช้าต้องรอ
const d1 = 1, it = S.plan.days[d1].items;
it.push({ id: S.plan.days[d1].items[0]?.id ?? 3, at: "06:00", u: true });
assert(Planner.evaluate(d1).checks.some((c) => /ไม่ทัน/.test(c.text)), "ล็อก 06:00 ต้องไปไม่ทัน");
it[it.length - 1].at = "16:00";
assert(Planner.evaluate(d1).tl.some((x) => x.kind === "wait" || x.t >= 16), "ล็อก 16:00 ต้องรอ");
it.pop();

// จัดใหม่ไม่ลบรายการที่ผู้ใช้ใส่เอง
S.plan.days[2].items.push({ id: 8, u: true });
Planner.autofillDay(2, Planner.usedSet(2));
assert(S.plan.days[2].items.some((x) => x.id === 8), "autofill ต้องเก็บรายการที่ผู้ใช้ใส่");

// จุดของฉันไม่มีพิกัด: ไม่คิดเวลาเดินทาง ไม่พัง
S.plan.custom.cX = { name: "test", hours: 1 };
S.plan.days[2].items.push({ id: "cX", u: true });
assert(isFinite(Planner.evaluate(2).end), "custom ไม่มีพิกัด");

// เที่ยวบิน: บินกลางคืน → วันแรกเบา, เครื่องออกเช้า → แจ้ง
trip({ start: "2027-01-15", end: "2027-01-19", arriveTime: "07:30", departTime: "10:30", outFlight: { no: "TG670", from: "BKK", dep: "2027-01-14T23:30", via: "" } });
Planner.create("starter");
assert(Planner.firstDayLight(), "บินกลางคืนถึงเช้า = วันแรกเบา");
assert(Planner.evaluate(0).stops.length <= 1, "วันแรกเบา ≤1 ที่");
const last = Planner.evaluate(tripNights());
assert(last.leaveBy != null && last.leaveBy < 8.5, "เครื่องออก 10:30 ต้องออกจากที่พักเช้า");

// นอกหน้าหนาว: ขับเร็วกว่า และสถานที่ปิดฤดูถูกเตือน
trip({ start: "2027-07-10", end: "2027-07-15", mode: "car" });
Planner.create("central");
assert(Planner.leg("sapporo", "asahikawa", "car", "2027-07-10").h < Planner.leg("sapporo", "asahikawa", "car", "2027-01-10").h, "หน้าร้อนขับเร็วกว่า");
const winterOnly = PLACES.find((p) => p.months && !p.months.includes(7));
if (winterOnly) {
  S.plan.days[1].items.push({ id: winterOnly.id, u: true });
  assert(Planner.evaluate(1).checks.some((c) => c.text.includes(pname(winterOnly.id))), "ต้องเตือนสถานที่ปิดฤดู");
}
// มื้ออาหารเป็นรายการปกติ วางช่วงเที่ยง; วิธีเดินทางเลือกรายช่วง
Planner.create("central");
const meals = S.plan.days.map((d, i) => Planner.evaluate(i).tl.find((x) => x.kind === "visit" && S.plan.custom[x.id]?.meal)).filter(Boolean);
assert(meals.length >= S.plan.days.length - 2, "มื้อกลางวันเกือบทุกวัน");
assert(meals.every((x) => x.t >= 10.5 && x.t <= 15), "มื้อกลางวันอยู่ช่วงเที่ยง " + meals.map((x) => fmtT(x.t)));
{
  const d = S.plan.days[2], it = d.items.find((x) => isPlace(x.id));
  const before = Planner.evaluate(2).driveH;
  it.m = "taxi"; d.hm = "taxi";
  assert(Planner.evaluate(2).driveH < before || before === 0, "แท็กซี่ไม่นับเวลาขับ");
  assert(Planner.evaluate(2).tl.some((x) => x.kind === "move" && x.home && x.mode === "taxi"), "ช่วงกลับที่พักใช้ day.hm");
  delete it.m; delete d.hm;
}
// จุดสำรองไม่นับเวลา; รายการอยากไปลงวันได้และหายจากรายการ
{
  const d = S.plan.days[2], it = d.items.find((x) => isPlace(x.id) && !x.night);
  it.maybe = true;
  assert(!Planner.evaluate(2).tl.some((x) => x.kind === "visit" && x.it === it), "จุดสำรองไม่อยู่ในไทม์ไลน์");
  delete it.maybe;
  Planner.toWish(2, it);
  assert(S.plan.wish.includes(it.id) && !d.items.includes(it), "ย้ายไปอยากไป");
  assert(Planner.placeWish() === 1 && !S.plan.wish.length, "จัดอยากไปลงวัน");
  assert(S.plan.days.some((x) => x.items.some((y) => y.id === it.id)), "ลงวันแล้วอยู่ในแผน");
}
// สลับวัน: ที่เที่ยวสลับกัน ที่พักคงเดิม
{
  const a = S.plan.days[1].items.map((x) => x.id), b = S.plan.days[2].items.map((x) => x.id), bases = [...S.plan.bases];
  Planner.swapDays(1, 2);
  assert.deepStrictEqual(S.plan.days[1].items.map((x) => x.id), b, "สลับวัน");
  assert.deepStrictEqual(S.plan.days[2].items.map((x) => x.id), a, "สลับวัน");
  assert.deepStrictEqual(S.plan.bases, bases, "ที่พักคงเดิม");
}
// ปฏิทิน .ics: เวลาญี่ปุ่น → UTC, ทุกวันมีกิจกรรม; ค่าใช้จ่ายแปลงตามอัตราตอนบันทึก
global.document = { addEventListener() {} }; global.I = () => "";
vm.runInThisContext(fs.readFileSync(`${root}/js/tools.js`, "utf8").replace(/^(const|let) /gm, "var "));
assert.strictEqual(Ics.utc("2027-01-15", 8.5), "20270114T233000Z");
assert.strictEqual(Ics.utc("2027-01-14", 23.5, 7), "20270114T163000Z");
{ const ics = Ics.build(); assert(ics.startsWith("BEGIN:VCALENDAR") && ics.endsWith("END:VCALENDAR"), "ics frame"); assert((ics.match(/BEGIN:VEVENT/g) || []).length > S.plan.days.length, "ics events"); assert(ics.split(String.fromCharCode(13, 10)).every((l) => !l.includes(String.fromCharCode(10))), "ics CRLF"); }
S.spend = [{ cur: "JPY", amt: 1000, rate: 0.2 }, { cur: "THB", amt: 50 }];
assert.strictEqual(Spend.total(), 250, "spend total");
// แชร์ลิงก์: แพ็กแล้วแกะได้เหมือนเดิม (แบบไม่บีบอัด ใน node)
(async () => {
  const code = await Share.pack({ v: 2, trip: S.trip, plan: S.plan });
  const back = await Share.unpack(code);
  assert.deepStrictEqual(back.plan, JSON.parse(JSON.stringify(S.plan)), "share round-trip");
  assert.deepStrictEqual(parseLatLng("https://www.google.com/maps/place/x/@43.0621,141.3544,17z"), { lat: 43.0621, lng: 141.3544 });
  console.log("selftest ok");
})().catch((e) => { console.error(e); process.exit(1); });
