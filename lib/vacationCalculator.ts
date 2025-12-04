/**
 * คำนวณสิทธิ์ลาพักร้อนตามเงื่อนไข:
 * 1. ปีที่เข้าทำงาน: จำนวนเดือนที่เหลือจนถึงสิ้นปี / 2 = วันลาพักร้อน (ปัดลง)
 *    - ไม่นับเดือนที่เข้าทำงาน
 *    - ตัวอย่าง: เข้า 1/9/2024 → เหลือ 3 เดือน (ต.ค., พ.ย., ธ.ค.) → 3/2 = 1 วัน
 * 2. ปีถัดไป: ต้องทำงานครบ 1 ปีก่อน ถึงจะได้สิทธิ์เต็ม 6 วัน
 *    - ก่อนครบ 1 ปี: 0 วัน
 *    - หลังครบ 1 ปี: 6 วัน
 */

/**
 * คำนวณสิทธิ์ลาพักร้อนสำหรับปีที่ระบุ
 * @param startDate วันที่เริ่มงานของพนักงาน
 * @param year ปีที่ต้องการคำนวณ (ค.ศ.)
 * @param maxDaysPerYear จำนวนวันลาพักร้อนสูงสุดต่อปี (default = 6)
 * @returns จำนวนวันลาพักร้อนที่มีสิทธิ์
 */
export function calculateVacationDays(
  startDate: Date | string,
  year: number,
  maxDaysPerYear: number = 6
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const startYear = start.getFullYear();
  const startMonth = start.getMonth(); // 0-indexed (0 = January)

  // ปีก่อนเข้างาน - ไม่มีสิทธิ์
  if (year < startYear) {
    return 0;
  }

  // ปีที่เข้าทำงาน
  if (year === startYear) {
    // คำนวณจำนวนเดือนที่เหลือในปีนั้น (ไม่นับเดือนที่เข้างาน)
    // เข้าเดือน 9 (September, index 8) → เหลือ 12 - 9 = 3 เดือน (ต.ค., พ.ย., ธ.ค.)
    const remainingMonths = 12 - (startMonth + 1);
    const vacationDays = Math.floor(remainingMonths / 2);
    return Math.min(vacationDays, maxDaysPerYear);
  }

  // ปีที่ครบ 1 ปี (ปีถัดจากปีเข้างาน)
  if (year === startYear + 1) {
    // วันครบ 1 ปี = วันที่เดียวกับวันเริ่มงาน ในปีถัดไป
    const oneYearAnniversary = new Date(start);
    oneYearAnniversary.setFullYear(startYear + 1);
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // ถ้าปีปัจจุบันเท่ากับปีที่ขอ
    if (currentYear === year) {
      // ยังไม่ถึงวันครบรอบ 1 ปี → 0 วัน
      if (today < oneYearAnniversary) {
        return 0;
      }
      // ครบ 1 ปีแล้ว → สิทธิ์เต็ม
      return maxDaysPerYear;
    }
    
    // ถ้าดูปีอนาคต (เช่น ตอนนี้ปี 2024 แต่ดูปี 2025)
    if (currentYear < year) {
      // ยังไม่ถึงปีนั้น แสดงว่ายังไม่ครบ 1 ปี
      return 0;
    }
    
    // ถ้าเป็นปีอดีต (currentYear > year) แสดงว่าปีนั้นครบ 1 ปีไปแล้ว
    return maxDaysPerYear;
  }

  // ปีที่ 3 เป็นต้นไป (ทำงานครบ 1 ปีแน่นอนแล้ว)
  if (year > startYear + 1) {
    return maxDaysPerYear;
  }

  return 0;
}

/**
 * ตรวจสอบว่าพนักงานมีสิทธิ์ลาพักร้อนหรือไม่ ณ วันที่ระบุ
 * @param startDate วันที่เริ่มงาน
 * @param checkDate วันที่ต้องการตรวจสอบ
 * @returns true ถ้ามีสิทธิ์
 */
export function hasVacationEligibility(
  startDate: Date | string,
  checkDate: Date = new Date()
): boolean {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const check = checkDate;
  const year = check.getFullYear();
  
  return calculateVacationDays(start, year) > 0;
}

/**
 * คำนวณวันที่จะมีสิทธิ์ลาพักร้อนเต็มสิทธิ์
 * @param startDate วันที่เริ่มงาน
 * @returns วันที่จะมีสิทธิ์เต็ม
 */
export function getFullVacationEligibilityDate(startDate: Date | string): Date {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const eligibilityDate = new Date(start);
  eligibilityDate.setFullYear(start.getFullYear() + 1);
  return eligibilityDate;
}
