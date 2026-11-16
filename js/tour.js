// ทัวร์แนะนำหน้าแผนรายวัน (driver.js): ขึ้นเองครั้งเดียวหลังมีแผนแรก • เปิดซ้ำได้ที่ ตั้งค่า > วิธีใช้
const Tour = {
  KEY: "hk-tour-v1",

  steps() {
    // หาตัวตอนถึงขั้นนั้น (ฟังก์ชัน): หน้าแผนวาดใหม่ได้ระหว่างทัวร์ (เช่นได้เวลาถนนจริง) ตัวเก่าจะหลุดจาก DOM
    const vis = (sel) => () => { const el = $(sel); return el && el.checkVisibility() ? el : undefined; };
    return [
      [vis(".overview"), "ภาพรวมทริป", "จำนวนวัน เวลาขับรวม และรายการตรวจแผน ข้อที่เป็นสีเหลือง/แดงควรเปิดดูก่อน"],
      [vis(".tl li.it"), "หนึ่งแถว = หนึ่งที่เที่ยว", COARSE
        ? "ปัดแถวไปทางซ้าย = นำทาง / แก้ไข / เอาออก<br>กดค้างแล้วลาก = เรียงลำดับใหม่<br>แตะไอคอนรถระหว่างแถว = เปลี่ยนวิธีเดินทาง"
        : "ปุ่มท้ายแถว = นำทาง / แก้ไข / เอาออก<br>ลากแถว = เรียงลำดับใหม่<br>กดไอคอนรถระหว่างแถว = เปลี่ยนวิธีเดินทาง"],
      [vis("[data-addmenu]"), "เพิ่มที่เที่ยวหรือมื้ออาหาร", "ระบบคำนวณเวลาขับและเวลาถึงแต่ละที่ให้ใหม่ทันที"],
      [vis("[data-daymenu]"), "จัดการวัน", "ที่พักคืนนี้ เวลาเริ่ม เรียงเส้นทางอัตโนมัติ เปิด Google Maps ลิงก์ด่วน (ปั๊ม คอนบินิ สภาพถนน) และเบอร์ฉุกเฉิน"],
      [vis("#tabs"), "เมนูหลัก", "ข้อมูลทริป = แก้วันเดินทาง/รูท • สถานที่ = ค้นหาที่เที่ยว • งบประมาณ = คำนวณค่าใช้จ่าย<br>เปิดทัวร์นี้อีกครั้งได้ที่ ตั้งค่า > วิธีใช้"],
    ].filter(([el]) => el()).map(([element, title, description]) => ({ element, popover: { title, description } }));
  },

  start() {
    if (!window.driver || !S.plan) return;
    try { localStorage.setItem(this.KEY, "1"); localStorage.setItem("hk-swipe-hint", "1"); } catch { /* เก็บไม่ได้: ขึ้นอีกรอบก็ไม่พัง */ }
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    driver.js.driver({
      steps: this.steps(), showProgress: true, progressText: "{{current}}/{{total}}",
      nextBtnText: "ถัดไป", prevBtnText: "ย้อน", doneBtnText: "เข้าใจแล้ว",
      popoverClass: "hk-tour", stageRadius: 10, stagePadding: 6,
      disableActiveInteraction: true, // แตะจุดที่ชี้ต้องไม่เผลอปัด/ลาก/เปิดเมนู
      animate: !calm, smoothScroll: !calm,
    }).drive();
  },

  // ครั้งแรกที่เห็นแผน: ไม่ใช่แผนที่เพื่อนส่งมาดู • คนที่ใช้มาก่อน (เคยเห็นคำแนะนำปัดแถว) ไม่ต้องขึ้นเอง
  maybe() {
    if (App.viewOnly) return;
    try {
      if (localStorage.getItem(this.KEY)) return;
      if (localStorage.getItem("hk-swipe-hint")) return localStorage.setItem(this.KEY, "1");
    } catch { return; }
    setTimeout(() => App.cur === "trip" && !$("#modal[open]") && this.start(), 700);
  },
};
