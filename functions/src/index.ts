/**
 * Cloud Functions for ABC Staff System - 급여 계산 로직
 * 
 * 보안 강화: 급여 계산 로직을 클라이언트에서 서버로 완전 이관
 * 목적: 
 * - 급여 금액 변조 방지
 * - 민감한 비즈니스 로직 서버 보호
 * - Firestore Rules를 우회하여 안전한 데이터 처리
 * 
 * 원본 로직: lib/utils/calculate-monthly-salary.ts (430줄)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { 
  AttendanceForSalary, 
  ContractForSalary, 
  SalaryCalculationResult as MonthlySalaryResult,
  parseMoney,
  safeParseDate
} from './types/salary';

// Firebase Admin SDK 초기화
admin.initializeApp();

const db = admin.firestore();

// ===========================================
// 날짜 변환 헬퍼 함수
// ===========================================

/**
 * 안전한 날짜 변환 (Timestamp/Date/string 모두 처리)
 * Firestore Timestamp를 Date로 변환하여 NaN 방지
 */

// ===========================================
// 🔒 안전한 계산 헬퍼 (NaN/Infinity 방지)
// ===========================================

/**
 * 안전한 숫자 변환 - NaN 또는 Infinity를 0으로 변환
 * Firestore에 저장할 때 NaN/Infinity로 인한 500 에러 방지
 * 
 * @param value - 검증할 숫자 값
 * @returns 유효한 숫자 또는 0
 * 
 * @example
 * safeNumber(10 / 0) // 0 (Infinity 방지)
 * safeNumber(0 / 0)  // 0 (NaN 방지)
 * safeNumber(1000)   // 1000 (정상값 유지)
 */
function safeNumber(value: number): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return 0;
  }
  return value;
}

/**
 * Firestore 안전 데이터 정제 - undefined 값 제거
 * Firestore는 undefined 저장을 허용하지 않으므로 JSON 직렬화로 제거
 * 
 * @param data - 정제할 객체
 * @returns undefined가 제거된 객체
 * 
 * @deprecated 현재 코드에서는 JSON.parse(JSON.stringify())를 직접 사용하고 있어 불필요
 * 하지만 향후 재사용 가능성을 위해 보존 (언더스코어로 "사용 안 함" 표시)
 */
function _sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// ===========================================
// 유틸리티 함수들
// ===========================================

/**
 * 출퇴근 허용시간 설정
 */
interface AttendanceThresholds {
  earlyClockIn: number;
  earlyClockOut: number;
  overtime: number;
}

function timeToMinutes(timeStr: string | undefined | null): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function calculateWorkHours(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

function calculateNightHours(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  
  if (end < start) end += 24 * 60;
  
  const nightStart = 22 * 60;
  const nightEnd = 6 * 60;
  
  let nightMinutes = 0;
  
  const overlap1Start = Math.max(start, nightStart);
  const overlap1End = Math.min(end, 24 * 60);
  if (overlap1Start < overlap1End) {
    nightMinutes += overlap1End - overlap1Start;
  }
  
  if (end > 24 * 60) {
    const overlap2Start = Math.max(start, 24 * 60);
    const overlap2End = Math.min(end, 24 * 60 + nightEnd);
    if (overlap2Start < overlap2End) {
      nightMinutes += overlap2End - overlap2Start;
    }
  }
  
  if (end <= 24 * 60 && start < nightEnd) {
    const overlap3Start = start;
    const overlap3End = Math.min(end, nightEnd);
    if (overlap3Start < overlap3End) {
      nightMinutes += overlap3End - overlap3Start;
    }
  }
  
  return nightMinutes / 60;
}

function getWeekOfMonth(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekNum = Math.ceil(day / 7);
  return `${year}-${month.toString().padStart(2, '0')}-W${weekNum}`;
}

function nowKST(): Date {
  // KST = UTC+9
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (9 * 3600000));
}

// ===========================================
// 메인 급여 계산 함수
// ===========================================

/**
 * 서버 급여 계산 함수 (표준 타입 적용)
 * - 클라이언트 lib/utils/salary-calculator.ts 로직 이관
 * - FIELD_NAMING_STANDARD.md 표준 필드명 준수
 * - parseMoney, safeParseDate 방어 로직 포함
 */
async function performSalaryCalculation(
  employee: { uid: string; name: string; store?: string; companyId: string },
  contract: ContractForSalary,
  attendances: AttendanceForSalary[],
  yearMonth: string
): Promise<MonthlySalaryResult> {
  functions.logger.info('💰 [서버] 급여 계산 시작:', employee.name, yearMonth);
  
  const [year, month] = yearMonth.split('-').map(Number);
  
  // ===========================================
  // 1️⃣ 공휴일 데이터 로드 (2025년 하드코딩)
  // ===========================================
  const publicHolidays2025 = [
    '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30',
    '2025-03-01', '2025-03-05', '2025-05-05', '2025-05-06',
    '2025-06-06', '2025-08-15', '2025-10-03', '2025-10-05',
    '2025-10-06', '2025-10-07', '2025-10-09', '2025-12-25'
  ];
  
  // ===========================================
  // 2️⃣ 매장 출퇴근 허용시간 설정 조회
  // ===========================================
  let thresholds: AttendanceThresholds = {
    earlyClockIn: 15,
    earlyClockOut: 5,
    overtime: 5
  };
  
  try {
    const storeName = employee.store || contract.workStore;
    if (storeName) {
      const storesSnapshot = await db.collection('stores')
        .where('name', '==', storeName)
        .where('companyId', '==', employee.companyId || contract.companyId)
        .limit(1)
        .get();
      
      if (!storesSnapshot.empty) {
        const storeData = storesSnapshot.docs[0].data();
        if (storeData.attendanceThresholds) {
          thresholds = storeData.attendanceThresholds as AttendanceThresholds;
        }
      }
    }
  } catch (error) {
    functions.logger.warn('매장 설정 조회 실패:', error);
  }
  
  const result: MonthlySalaryResult = {
    employeeName: employee.name,
    userId: employee.uid,
    employeeUid: employee.uid,
    storeName: employee.store || contract.workStore,
    yearMonth: yearMonth,
    salaryType: contract.salaryType || contract.wageType || '시급',
    hourlyWage: 0,
    monthlyWage: 0,
    annualWage: 0,
    totalWorkHours: 0,
    basePay: 0,
    overtimePay: 0,
    nightPay: 0,
    holidayPay: 0,
    weeklyHolidayPay: 0,
    incentivePay: 0,
    severancePay: 0,
    totalAllowances: 0,
    nationalPension: 0,
    healthInsurance: 0,
    longTermCare: 0,
    employmentInsurance: 0,
    incomeTax: 0,
    totalDeductions: 0,
    totalPay: 0,
    netPay: 0,
    workDays: 0,
    attendanceDetails: [],
    contractInfo: {
      weeklyHours: 0,
      isWeeklyHolidayEligible: false,
      has4Insurance: false,
      hasPension: false,
      hasHealthInsurance: false,
      hasEmploymentInsurance: false,
      hasWorkCompInsurance: false
    }
  };
  
  // ===========================================
  // 3️⃣ 급여 기본 정보 파싱 (표준 필드명 + 방어 로직)
  // ===========================================
  const salaryType = contract.salaryType || contract.wageType || '시급';
  // 🔒 안전한 금액 파싱 (콤마 제거 및 NaN 방지)
  const salaryAmount = parseMoney(contract.salaryAmount || contract.wageAmount);
  
  if (salaryAmount === 0) {
    functions.logger.warn('⚠️ 급여액이 0원, 계산 중단');
    return result;
  }
  
  functions.logger.info(`📋 급여 타입: ${salaryType}, 금액: ${salaryAmount.toLocaleString()}원`);
  
  // 급여 유형별 처리
  if (salaryType === '시급') {
    result.hourlyWage = safeNumber(salaryAmount);
  } else if (salaryType === '월급') {
    result.monthlyWage = safeNumber(salaryAmount);
    result.hourlyWage = safeNumber(Math.round(salaryAmount / 209));
  } else if (salaryType === '연봉') {
    result.annualWage = safeNumber(salaryAmount);
    result.monthlyWage = safeNumber(Math.round(salaryAmount / 12));
    result.hourlyWage = safeNumber(Math.round(salaryAmount / 12 / 209));
  }
  
  // ===========================================
  // 4️⃣ 출퇴근 기록 분석 준비
  // ===========================================
  let totalWorkHours = 0;
  let totalOvertimeHours = 0;
  let totalNightHours = 0;
  let totalHolidayHours = 0;
  let totalIncentiveAmount = 0; // 🆕 Phase 5: 총 인센티브 금액
  const weeklyWorkHours: Record<string, number> = {}; // 주차별 근무시간
  const weeklyAbsences: Record<string, boolean> = {}; // 주차별 결근 여부
  
  // 계약서의 근무일정 파싱
  const workDaysArray = contract.workDays ? contract.workDays.split(',').map((d: string) => d.trim()) : [];
  const dayMap: Record<string, number> = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0 };
  const workDayNumbers = workDaysArray.map((day: string) => dayMap[day]).filter((n: number | undefined) => n !== undefined);
  
  // 출근해야 하는 날짜들을 먼저 파악 (결근 체크용)
  const attendanceDates = new Set(attendances.map(att => att.date));
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    
    // 근무일인데 출근 기록이 없으면 결근
    if (workDayNumbers.includes(dayOfWeek) && !attendanceDates.has(dateStr)) {
      const weekKey = getWeekOfMonth(d);
      weeklyAbsences[weekKey] = true; // 이 주는 결근이 있음
      functions.logger.warn(`⚠️ 결근 감지: ${dateStr} (${weekKey})`);
    }
  }
  
  // ===========================================
  // 5️⃣ 출퇴근 기록 순회 및 계산 (표준 필드명 사용)
  // ===========================================
  // ===========================================
  // 5️⃣ 출퇴근 기록 순회 및 계산 (표준 필드명 사용)
  // ===========================================
  attendances.forEach(att => {
    // 🔥 표준 필드명: clockIn/clockOut 우선 사용, 하위 호환성으로 checkIn/checkOut 지원
    const clockIn = att.clockIn || att.checkIn;
    if (!clockIn) return; // 출근 기록 없으면 스킵
    
    let clockOut = att.clockOut || att.checkOut;
    if (!clockOut) {
      // 퇴근 기록이 없으면 현재 시간 사용 (실시간 급여 계산)
      const now = nowKST();
      clockOut = now.toTimeString().substring(0, 5); // "HH:MM"
      functions.logger.info(`⏰ [${att.date}] 퇴근 기록 없음 - 현재 시간(${clockOut})까지 계산`);
    }
    
    // 계약서 근무시간과 비교해서 실제 근무시간 조정
    let adjustedClockIn = clockIn;
    let adjustedClockOut = clockOut;
    
    if (contract.workStartTime && contract.workEndTime) {
      const contractStartMinutes = timeToMinutes(contract.workStartTime);
      const contractEndMinutes = timeToMinutes(contract.workEndTime);
      const actualStartMinutes = timeToMinutes(clockIn);
      const actualEndMinutes = timeToMinutes(clockOut);
      
      // 조기출근 처리
      const earlyMinutes = contractStartMinutes - actualStartMinutes;
      if (earlyMinutes > 0 && earlyMinutes < thresholds.earlyClockIn) {
        adjustedClockIn = contract.workStartTime;
        functions.logger.info(`⏰ [${att.date}] 조기출근 ${earlyMinutes}분 (허용시간 ${thresholds.earlyClockIn}분 미만) → 수당 미적용`);
      }
      
      // 조기퇴근 처리
      const earlyLeaveMinutes = contractEndMinutes - actualEndMinutes;
      if (earlyLeaveMinutes > 0 && earlyLeaveMinutes <= thresholds.earlyClockOut) {
        adjustedClockOut = contract.workEndTime;
        functions.logger.info(`⏰ [${att.date}] 조기퇴근 ${earlyLeaveMinutes}분 (허용시간 ${thresholds.earlyClockOut}분 이내) → 차감 없음`);
      } else if (earlyLeaveMinutes > thresholds.earlyClockOut) {
        functions.logger.warn(`⚠️ [${att.date}] 조기퇴근 ${earlyLeaveMinutes}분 (허용시간 ${thresholds.earlyClockOut}분 초과) → 차감`);
      }
      
      // 초과근무 처리
      const overtimeMinutes = actualEndMinutes - contractEndMinutes;
      if (overtimeMinutes > 0 && overtimeMinutes < thresholds.overtime) {
        adjustedClockOut = contract.workEndTime;
        functions.logger.info(`⏰ [${att.date}] 초과근무 ${overtimeMinutes}분 (허용시간 ${thresholds.overtime}분 미만) → 수당 미적용`);
      }
    }
    
    const workHours = calculateWorkHours(adjustedClockIn, adjustedClockOut);
    const nightHours = calculateNightHours(adjustedClockIn, adjustedClockOut);
    // 🔥 2025년 하드코딩 공휴일 체크
    const isHoliday = publicHolidays2025.includes(att.date);
    
    totalWorkHours += workHours;
    result.workDays++;
    
    // 야간 근무 시간 (휴게시간 차감 포함)
    if (contract.allowances?.night && nightHours > 0) {
      let adjustedNightHours = nightHours;
      
      // 휴게시간이 야간시간(22:00~06:00)에 겹치면 차감
      if (contract.breakTime) {
        const breakStart = contract.breakTime.startHour * 60 + (contract.breakTime.startMinute || 0);
        const breakEnd = contract.breakTime.endHour * 60 + (contract.breakTime.endMinute || 0);
        const nightStart = 22 * 60;
        const nightEnd = 6 * 60;
        
        let breakNightMinutes = 0;
        
        // Case 1: 휴게시간이 22:00~24:00 사이에 겹침
        if (breakStart < 24 * 60 && breakEnd < 24 * 60) {
          const overlapStart = Math.max(breakStart, nightStart);
          const overlapEnd = Math.min(breakEnd, 24 * 60);
          if (overlapStart < overlapEnd) {
            breakNightMinutes += overlapEnd - overlapStart;
          }
        }
        
        // Case 2: 휴게시간이 00:00~06:00 사이에 겹침
        if (breakEnd > 0 && breakEnd <= nightEnd) {
          const overlapStart = Math.max(breakStart, 0);
          const overlapEnd = Math.min(breakEnd, nightEnd);
          if (overlapStart < overlapEnd) {
            breakNightMinutes += overlapEnd - overlapStart;
          }
        }
        
        adjustedNightHours = Math.max(0, nightHours - breakNightMinutes / 60);
        
        if (breakNightMinutes > 0) {
          functions.logger.info(`🌙 [${att.date}] 야간 휴게시간 차감: ${nightHours.toFixed(2)}h - ${(breakNightMinutes / 60).toFixed(2)}h = ${adjustedNightHours.toFixed(2)}h`);
        }
      }
      
      totalNightHours += adjustedNightHours;
    }
    
    // 공휴일 근무 시간
    if (isHoliday && contract.allowances?.holiday) {
      totalHolidayHours += workHours;
      functions.logger.info(`🎉 [${att.date}] 공휴일 근무 감지: ${workHours.toFixed(2)}시간`);
    }
    
    // 🆕 Phase 5: 인센티브 수당 계산 (wageIncentive × 근무시간)
    // 🔒 안전한 파싱 (콤마 제거 및 NaN 방지)
    const incentiveValue = parseMoney(att.wageIncentive);
    if (incentiveValue > 0) {
      const incentiveAmount = incentiveValue * workHours;
      totalIncentiveAmount += incentiveAmount;
      functions.logger.info(`💰 [${att.date}] 인센티브 수당: ${incentiveValue.toLocaleString()}원/시간 × ${workHours.toFixed(2)}h = ${incentiveAmount.toLocaleString()}원`);
    }
    
    // 주차별 근무시간 누적 (주휴수당 계산용)
    // 🔒 하루 최대 8시간만 주휴수당 계산에 포함 (법정 근로시간 기준)
    const date = new Date(att.date);
    const weekKey = getWeekOfMonth(date);
    const weeklyHoursForDay = Math.min(workHours, 8);
    weeklyWorkHours[weekKey] = (weeklyWorkHours[weekKey] || 0) + weeklyHoursForDay;
    
    if (workHours > 8) {
      functions.logger.info(`⚠️ [${att.date}] 근무시간 ${workHours.toFixed(2)}h → 주휴수당 계산용 ${weeklyHoursForDay}h (8시간 초과분 제외)`);
    }
    
    // 출퇴근 상세 저장
    result.attendanceDetails.push({
      date: att.date,
      clockIn: clockIn,                     // 🔥 표준 필드명
      clockOut: clockOut,                   // 🔥 표준 필드명
      adjustedClockIn: adjustedClockIn,
      adjustedClockOut: adjustedClockOut,
      workHours: workHours.toFixed(2),
      nightHours: nightHours.toFixed(2),
      isHoliday: isHoliday,
      wageIncentive: incentiveValue,
      isRealtime: !att.clockOut && !att.checkOut
    });
  });
  
  result.totalWorkHours = totalWorkHours;
  
  
  // ===========================================
  // 6️⃣ 기본급 계산 (급여 유형별)
  // ===========================================
  if (result.salaryType === '시급') {
    result.basePay = safeNumber(Math.round(result.hourlyWage * totalWorkHours));
  } else if (result.salaryType === '월급' || result.salaryType === '연봉') {
    result.basePay = safeNumber(result.monthlyWage);
  }
  
  // ===========================================
  // 7️⃣ 연장근로수당 계산 (1일 8시간 초과 + 주 40시간 초과)
  // ===========================================
  if (contract.allowances?.overtime) {
    let totalDailyOvertimeHours = 0; // 일별 연장 누적
    let totalWeeklyOvertimeHours = 0; // 주별 연장 누적
    
    // Step 1: 일별 연장근로 계산 (각 출근일마다 8시간 초과 체크)
    result.attendanceDetails.forEach(detail => {
      const dailyWork = parseFloat(detail.workHours) || 0;
      const dailyOvertime = Math.max(dailyWork - 8, 0);
      
      if (dailyOvertime > 0) {
        totalDailyOvertimeHours += dailyOvertime;
        
        if (dailyWork > 12) {
          functions.logger.warn(`⚠️ [${detail.date}] 1일 12시간 초과 근무: ${dailyWork.toFixed(2)}h (법정 한도: 12h)`);
        }
        
        functions.logger.info(`📊 [${detail.date}] 일별 연장: ${dailyWork.toFixed(2)}h - 8h = ${dailyOvertime.toFixed(2)}h`);
      }
    });
    
    // Step 2: 주별 연장근로 계산 (주 40시간 초과 체크)
    Object.entries(weeklyWorkHours).forEach(([weekKey, weekHours]) => {
      const weeklyOvertime = Math.max(weekHours - 40, 0);
      
      if (weeklyOvertime > 0) {
        totalWeeklyOvertimeHours += weeklyOvertime;
        
        if (weekHours > 52) {
          functions.logger.warn(`⚠️ [${weekKey}] 주 52시간 초과 근무: ${weekHours.toFixed(2)}h (법정 한도: 52h)`);
        }
        
        functions.logger.info(`📊 [${weekKey}] 주별 연장: ${weekHours.toFixed(2)}h - 40h = ${weeklyOvertime.toFixed(2)}h`);
      }
    });
    
    // Step 3: 중복 제거 (법적으로 유리한 쪽 적용)
    totalOvertimeHours = Math.max(totalDailyOvertimeHours, totalWeeklyOvertimeHours);
    
    result.overtimeHours = safeNumber(totalOvertimeHours);
    result.overtimePay = safeNumber(Math.round(result.hourlyWage * 1.5 * totalOvertimeHours));
    
    functions.logger.info(`💰 연장근로수당 최종: 일별 ${totalDailyOvertimeHours.toFixed(2)}h vs 주별 ${totalWeeklyOvertimeHours.toFixed(2)}h → ${totalOvertimeHours.toFixed(2)}h × ${result.hourlyWage}원 × 1.5 = ${result.overtimePay.toLocaleString()}원`);
  }
  
  // ===========================================
  // 8️⃣ 야간/휴일/특별 근무 수당
  // ===========================================
  if (contract.allowances?.night && totalNightHours > 0) {
    result.nightHours = safeNumber(totalNightHours);
    result.nightPay = safeNumber(Math.round(result.hourlyWage * 0.5 * totalNightHours));
    functions.logger.info(`🌙 야간근로수당: ${totalNightHours.toFixed(2)}h × ${result.hourlyWage}원 × 0.5 = ${result.nightPay.toLocaleString()}원`);
  }
  
  if (contract.allowances?.holiday && totalHolidayHours > 0) {
    result.holidayHours = safeNumber(totalHolidayHours);
    result.holidayPay = safeNumber(Math.round(result.hourlyWage * 1.5 * totalHolidayHours));
    functions.logger.info(`🎉 휴일근로수당: ${totalHolidayHours.toFixed(2)}h × ${result.hourlyWage}원 × 1.5 = ${result.holidayPay.toLocaleString()}원`);
  }
  
  if (totalIncentiveAmount > 0) {
    result.incentivePay = safeNumber(Math.round(totalIncentiveAmount));
    functions.logger.info(`💰 특별 근무 수당: ${result.incentivePay.toLocaleString()}원`);
  }
  
  // ===========================================
  // 9️⃣ 주휴수당 계산 (법원 판결 기준: 주휴수당 = 시급 × 주 근무시간 ÷ 5)
  // ===========================================
  // 🔒 주간 근무시간 안전 파싱 (콤마/문자열/NaN 방지)
  const contractWeeklyHours = parseMoney(contract.weeklyHours);
  const isWeeklyHolidayEligible = !!(contractWeeklyHours >= 15 || contract.allowances?.weeklyHoliday);
  
  if (salaryType === '시급' && isWeeklyHolidayEligible) {
    let weeklyHolidayHours = 0;
    Object.entries(weeklyWorkHours).forEach(([weekKey, weekHours]) => {
      // 결근이 있는 주는 주휴수당 제외
      if (weeklyAbsences[weekKey]) {
        functions.logger.info(`❌ ${weekKey}: 결근으로 주휴수당 제외 (근무시간: ${weekHours.toFixed(2)}h)`);
        return;
      }
      
      if (weekHours >= 15) {
        // 법원 판결 기준: 주휴수당 시간 = 주 근무시간 ÷ 5 (최대 8시간)
        const weekHolidayHours = Math.min(weekHours / 5, 8);
        weeklyHolidayHours += weekHolidayHours;
        functions.logger.info(`✅ ${weekKey}: 주휴수당 적용 (근무: ${weekHours.toFixed(2)}h, 주휴: ${weekHolidayHours.toFixed(2)}h, 금액: ${Math.round(result.hourlyWage * weekHolidayHours).toLocaleString()}원)`);
      } else {
        functions.logger.info(`⚠️ ${weekKey}: 15시간 미만으로 주휴수당 제외 (근무: ${weekHours.toFixed(2)}h)`);
      }
    });
    result.weeklyHolidayPay = safeNumber(Math.round(result.hourlyWage * weeklyHolidayHours));
    functions.logger.info(`💰 총 주휴수당: ${weeklyHolidayHours.toFixed(2)}h × ${result.hourlyWage.toLocaleString()}원 = ${result.weeklyHolidayPay.toLocaleString()}원`);
  } else {
    functions.logger.info(`⚠️ 주휴수당 미적용 - 사유: ${salaryType !== '시급' ? '시급제 아님' : `주 ${contractWeeklyHours}시간 (15시간 미만)`}`);
  }
  
  // ===========================================
  // 🔟 퇴직금 계산 (1년 이상 근속, 주 15시간 이상 근무)
  // ===========================================
  try {
    if (contract.startDate) {
      // 🔒 안전한 날짜 변환 (Timestamp → Date, NaN 방지)
      const contractStartDate = safeParseDate(contract.startDate);
      
      if (!contractStartDate) {
        functions.logger.warn('⚠️ 계약 시작일 변환 실패, 퇴직금 계산 스킵');
      } else {
        const now = nowKST();
        const daysDiff = Math.floor((now.getTime() - contractStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const yearsDiff = daysDiff / 365;
        
        const totalWeeks = Object.keys(weeklyWorkHours).length;
        const avgWeeklyHours = totalWeeks > 0 ? totalWorkHours / totalWeeks : 0;
        
        if (yearsDiff >= 1 && avgWeeklyHours >= 15) {
          const avgMonthlySalary = result.basePay + result.totalAllowances;
          result.severancePay = safeNumber(Math.round((avgMonthlySalary * daysDiff / 365) * 30));
          functions.logger.info(`💼 퇴직금 계산: 근속 ${daysDiff}일(${yearsDiff.toFixed(1)}년), 주평균 ${avgWeeklyHours.toFixed(1)}h, 퇴직금 ${result.severancePay.toLocaleString()}원`);
        }
      }
    }
  } catch (error) {
    functions.logger.warn('❌ 퇴직금 계산 실패:', error);
  }
  
  // ===========================================
  // 1️⃣1️⃣ 총 수당 및 총 지급액 계산
  // ===========================================
  result.totalAllowances = safeNumber(
    result.overtimePay + result.nightPay + result.holidayPay + 
    result.weeklyHolidayPay + result.incentivePay + result.severancePay
  );
  
  result.totalPay = safeNumber(result.basePay + result.totalAllowances);
  
  // ===========================================
  // 1️⃣2️⃣ 4대보험 공제 계산 (계약서 개별 체크박스 기준)
  // ===========================================
  const insurance = contract.insurance || {};
  
  // 국민연금 (4.5% 근로자 부담)
  if (insurance.pension) {
    result.nationalPension = safeNumber(Math.round(result.totalPay * 0.045));
  }
  
  // 건강보험 (3.545% 근로자 부담)
  if (insurance.health) {
    result.healthInsurance = safeNumber(Math.round(result.totalPay * 0.03545));
    // 장기요양보험 (건강보험의 12.95%의 50% 근로자 부담)
    result.longTermCare = safeNumber(Math.round(result.healthInsurance * 0.1295 * 0.5));
  }
  
  // 고용보험 (0.9% 근로자 부담)
  if (insurance.employment) {
    result.employmentInsurance = safeNumber(Math.round(result.totalPay * 0.009));
  }
  
  // 소득세 (3.3% 근로자 전액 부담) - 어떤 보험이든 하나라도 있으면 적용
  if (insurance.pension || insurance.health || insurance.employment || insurance.workComp) {
    result.incomeTax = safeNumber(Math.round(result.totalPay * 0.033));
  }
  
  // ===========================================
  // 1️⃣3️⃣ 총 공제액 및 실지급액 계산
  // ===========================================
  result.totalDeductions = safeNumber(
    result.nationalPension + result.healthInsurance + 
    result.longTermCare + result.employmentInsurance + result.incomeTax
  );
  
  result.netPay = safeNumber(result.totalPay - result.totalDeductions);
  
  // ===========================================
  // 1️⃣4️⃣ 계약서 기준 정보 추가 (렌더링 시 조건부 표시용)
  // ===========================================
  result.contractInfo = {
    weeklyHours: contractWeeklyHours,
    isWeeklyHolidayEligible: isWeeklyHolidayEligible,
    has4Insurance: !!(insurance.pension || insurance.health || insurance.employment || insurance.workComp),
    hasPension: !!insurance.pension,
    hasHealthInsurance: !!insurance.health,
    hasEmploymentInsurance: !!insurance.employment,
    hasWorkCompInsurance: !!insurance.workComp
  };
  
  functions.logger.info('✅ [서버] 급여 계산 완료:', {
    employee: employee.name,
    yearMonth: yearMonth,
    basePay: result.basePay.toLocaleString(),
    totalAllowances: result.totalAllowances.toLocaleString(),
    totalDeductions: result.totalDeductions.toLocaleString(),
    netPay: result.netPay.toLocaleString()
  });
  
  return result;
}

// ===========================================
// Cloud Function 정의
// ===========================================

/**
 * 급여 계산 Cloud Function
 * 
 * 호출 방법: 클라이언트에서 Firebase Functions SDK 사용
 * 
 * @example
 * const calculateSalary = httpsCallable(functions, 'calculateMonthlySalary');
 * const result = await calculateSalary({
 *   employeeUid: 'abc123',
 *   yearMonth: '2025-01'
 * });
 */
export const calculateMonthlySalary = functions
  .region('asia-northeast3')
  .https.onCall(async (data, context) => {
    // 1. 인증 확인
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        '로그인이 필요합니다.'
      );
    }

    const callerUid = context.auth.uid;
    const { employeeUid, yearMonth } = data;

    // 2. 입력 검증
    if (!employeeUid || !yearMonth) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '직원 UID와 계산 연월이 필요합니다.'
      );
    }

    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '연월 형식이 올바르지 않습니다. (YYYY-MM)'
      );
    }

    try {
      // 3. 권한 확인
      const callerDoc = await db.collection('users').doc(callerUid).get();
      
      if (!callerDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          '호출자 정보를 찾을 수 없습니다.'
        );
      }

      const callerData = callerDoc.data()!;
      const callerRole = callerData.role;
      const callerCompanyId = callerData.companyId;

      // 권한 검사: super_admin, admin, manager, store_manager, 또는 본인인 employee/staff
      const isAuthorized = 
        ['super_admin', 'admin', 'store_manager', 'manager'].includes(callerRole) ||
        (['employee', 'staff'].includes(callerRole) && employeeUid === callerUid);

      if (!isAuthorized) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '급여 계산 권한이 없습니다. 본인의 급여만 조회할 수 있습니다.'
        );
      }

      // 4. 직원 정보 조회
      const employeeDoc = await db.collection('users').doc(employeeUid).get();
      
      if (!employeeDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          '직원 정보를 찾을 수 없습니다.'
        );
      }

      const employeeData = employeeDoc.data()!;

      if (employeeData.companyId !== callerCompanyId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '다른 회사 직원의 급여는 계산할 수 없습니다.'
        );
      }

      // 5. 계약서 조회
      const contractsSnapshot = await db
        .collection('contracts')
        .where('userId', '==', employeeUid)
        .where('companyId', '==', callerCompanyId)
        .orderBy('startDate', 'desc')
        .limit(1)
        .get();

      if (contractsSnapshot.empty) {
        throw new functions.https.HttpsError(
          'not-found',
          '직원의 계약서를 찾을 수 없습니다.'
        );
      }

      const contractData = contractsSnapshot.docs[0].data() as ContractForSalary;

      // 6. 출퇴근 기록 조회
      const [year, month] = yearMonth.split('-');
      const attendancesSnapshot = await db
        .collection('attendance')
        .where('userId', '==', employeeUid)
        .where('companyId', '==', callerCompanyId)
        .where('date', '>=', `${year}-${month}-01`)
        .where('date', '<=', `${year}-${month}-31`)
        .get();

      const attendances = attendancesSnapshot.docs.map(doc => doc.data() as AttendanceForSalary);

      // 7. 급여 계산 실행
      const employee = {
        uid: employeeUid,
        name: employeeData.name,
        store: employeeData.store,
        companyId: callerCompanyId
      };

      const salaryResult = await performSalaryCalculation(
        employee,
        contractData,
        attendances,
        yearMonth
      );

      // 8. 계산 결과 Firestore에 저장
      // 🔒 1단계: undefined 제거 및 중첩 객체 정제 (JSON 직렬화)
      functions.logger.info('💾 [저장 준비] 급여 계산 결과 정제 시작...');
      
      const sanitizedSalaryResult = JSON.parse(JSON.stringify({
        ...salaryResult,
        companyId: callerCompanyId,
        calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
        calculatedBy: callerUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }));
      
      // 🔒 2단계: NaN/Infinity 최종 검증 (로그 출력)
      const invalidFields: string[] = [];
      
      // 중첩 객체 포함 전체 필드 검증
      const validateObject = (obj: any, path: string = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const fullPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
            invalidFields.push(`${fullPath}=${value}`);
            functions.logger.error(`❌ [NaN 감지] ${fullPath}=${value}`);
          } else if (value === undefined) {
            invalidFields.push(`${fullPath}=undefined`);
            functions.logger.error(`❌ [undefined 감지] ${fullPath}=undefined`);
          } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            // 중첩 객체 재귀 검증 (attendanceDetails, contractInfo 등)
            validateObject(value, fullPath);
          } else if (Array.isArray(value)) {
            // 배열 내부 객체 검증
            value.forEach((item, index) => {
              if (item && typeof item === 'object') {
                validateObject(item, `${fullPath}[${index}]`);
              }
            });
          }
        });
      };
      
      validateObject(sanitizedSalaryResult);
      
      // 🔒 3단계: 유효하지 않은 값 발견 시 차단
      if (invalidFields.length > 0) {
        functions.logger.error(`❌ [저장 차단] 유효하지 않은 필드 ${invalidFields.length}개 발견:`, invalidFields);
        throw new functions.https.HttpsError(
          'internal',
          `급여 계산 결과에 유효하지 않은 값이 포함되어 있습니다. 필드: ${invalidFields.join(', ')}`
        );
      }
      
      // 🔒 4단계: 저장 전 최종 로그
      functions.logger.info('✅ [저장 검증 통과] 모든 필드 정상. Firestore 저장 시작...');
      functions.logger.info(`💰 [급여 요약] 직원: ${salaryResult.employeeName}, 총지급액: ${salaryResult.totalPay?.toLocaleString() || 0}원, 실수령액: ${salaryResult.netPay?.toLocaleString() || 0}원`);
      
      await db.collection('salary').add(sanitizedSalaryResult);
      
      functions.logger.info('🎉 [저장 완료] salary 컬렉션에 저장 성공!');

      // 9. 결과 반환
      return {
        success: true,
        data: salaryResult,
      };

    } catch (error: any) {
      // 🔒 상세 에러 로깅 (디버깅용)
      functions.logger.error('❌ [급여 계산 실패] 오류 발생:', {
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack?.substring(0, 500), // 스택 트레이스 일부만
        employeeUid: data.employeeUid,
        yearMonth: data.yearMonth,
        callerUid: context.auth?.uid,
      });
      
      // HttpsError는 그대로 전달
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // 일반 에러는 internal로 변환 (상세 메시지 포함)
      throw new functions.https.HttpsError(
        'internal',
        `급여 계산 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
        {
          originalError: error.message,
          errorType: error.constructor.name,
        }
      );
    }
  });

// ===========================================
// 직원 삭제 (Auth + Firestore)
// ===========================================

/**
 * 직원 완전 삭제 (Firebase Auth + Firestore)
 * 
 * @description
 * 클라이언트에서는 다른 사용자의 Auth 계정을 삭제할 수 없으므로
 * Admin SDK를 사용하여 서버에서 삭제 처리
 * 
 * @param {string} uid - 삭제할 직원의 UID
 * @returns {Promise<{ success: boolean }>}
 */
export const deleteEmployeeAccount = functions
  .region('asia-northeast3')
  .https.onCall(async (data, context) => {
    try {
      // 1. 인증 확인
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          '인증이 필요합니다.'
        );
      }

      // 2. 관리자 권한 확인
      const callerUid = context.auth.uid;
      const callerDoc = await db.collection('users').doc(callerUid).get();
      
      if (!callerDoc.exists) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '사용자 정보를 찾을 수 없습니다.'
        );
      }

      const callerData = callerDoc.data();
      
      if (!callerData) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '사용자 데이터를 찾을 수 없습니다.'
        );
      }
      
      const callerRole = callerData.role;

      // Admin 또는 Manager만 삭제 가능
      if (!['admin', 'super_admin', 'manager'].includes(callerRole)) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '직원 삭제 권한이 없습니다.'
        );
      }

      const { uid } = data;

      if (!uid || typeof uid !== 'string') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'uid가 필요합니다.'
        );
      }

      functions.logger.info(`🔄 직원 삭제 시작: ${uid}`);

      // 3. 삭제할 직원 정보 조회
      const employeeDoc = await db.collection('users').doc(uid).get();
      
      if (!employeeDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          '직원 정보를 찾을 수 없습니다.'
        );
      }

      const employeeData = employeeDoc.data();

      // 4. 같은 회사 직원인지 확인
      if (callerData.companyId !== employeeData?.companyId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '같은 회사의 직원만 삭제할 수 있습니다.'
        );
      }

      // 5. Firebase Auth 계정 삭제
      try {
        await admin.auth().deleteUser(uid);
        functions.logger.info(`✅ Auth 계정 삭제 완료: ${uid}`);
      } catch (authError: any) {
        // Auth 계정이 이미 없는 경우 무시
        if (authError.code === 'auth/user-not-found') {
          functions.logger.warn(`⚠️ Auth 계정이 이미 삭제됨: ${uid}`);
        } else {
          throw authError;
        }
      }

      // 6. Firestore 문서 삭제
      await db.collection('users').doc(uid).delete();
      functions.logger.info(`✅ Firestore 문서 삭제 완료: ${uid}`);

      return {
        success: true,
        message: `${employeeData?.name || '직원'}님이 완전히 삭제되었습니다.`,
      };

    } catch (error: any) {
      functions.logger.error('❌ 직원 삭제 오류:', error);

      // HttpsError는 그대로 전달
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        '직원 삭제 중 오류가 발생했습니다.',
        error.message
      );
    }
  });

// ===========================================
// 공휴일 자동 동기화 스케줄러
// ===========================================

/**
 * 행정안전부 공공 API에서 공휴일 데이터 가져오기
 * @param year 연도 (예: 2025)
 * @param apiKey 공공데이터포털 인증키
 */
async function fetchHolidaysFromAPI(
  year: number,
  apiKey: string
): Promise<Array<{ date: string; name: string; year: number }>> {
  try {
    const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=${year}&numOfRows=50&ServiceKey=${apiKey}&_type=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // API 응답 구조 확인
    const items = data?.response?.body?.items?.item;
    if (!items) {
      functions.logger.error('❌ 공휴일 API 응답 오류:', data);
      return [];
    }
    
    // 배열로 변환 (단일 항목인 경우 배열로 감싸기)
    const itemsArray = Array.isArray(items) ? items : [items];
    
    // Holiday 형식으로 변환
    const holidays = itemsArray.map((item: any) => {
      const dateStr = String(item.locdate); // YYYYMMDD 형식
      const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      
      return {
        date: formattedDate,
        name: item.dateName || '공휴일',
        year: year,
      };
    });
    
    functions.logger.info(`✅ ${year}년 공휴일 ${holidays.length}개 불러옴 (공공 API)`);
    return holidays;
  } catch (error) {
    functions.logger.error('❌ 공휴일 API 호출 실패:', error);
    return [];
  }
}

/**
 * 공휴일 자동 동기화 스케줄러
 * 매년 1월 1일 00:00 (KST) 자동 실행
 * - 올해 공휴일 동기화
 * - 내년 공휴일 미리 동기화
 * 
 * Cron: "0 0 1 1 *" = 매년 1월 1일 00:00 UTC (한국시간 09:00)
 * Timezone: Asia/Seoul
 */
export const syncHolidaysScheduled = functions
  .region('asia-northeast3') // 서울 리전
  .pubsub
  .schedule('0 0 1 1 *') // 매년 1월 1일 00:00 UTC
  .timeZone('Asia/Seoul') // 한국 시간대
  .onRun(async (context) => {
    try {
      functions.logger.info('🔄 공휴일 자동 동기화 시작...');

      // 환경변수에서 API 키 가져오기
      const apiKey = process.env.HOLIDAY_API_KEY;
      if (!apiKey) {
        functions.logger.error('❌ HOLIDAY_API_KEY 환경변수가 설정되지 않았습니다.');
        return;
      }

      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      // 올해 + 내년 공휴일 동기화
      const years = [currentYear, nextYear];
      let totalSynced = 0;

      for (const year of years) {
        functions.logger.info(`📅 ${year}년 공휴일 동기화 중...`);

        // API에서 공휴일 가져오기
        const holidays = await fetchHolidaysFromAPI(year, apiKey);

        if (holidays.length === 0) {
          functions.logger.warn(`⚠️ ${year}년 공휴일을 불러올 수 없습니다.`);
          continue;
        }

        // Firestore에 저장 (중복 체크)
        let syncedCount = 0;
        for (const holiday of holidays) {
          try {
            // 중복 체크 (날짜로 조회)
            const snapshot = await db
              .collection('holidays')
              .where('date', '==', holiday.date)
              .limit(1)
              .get();

            if (snapshot.empty) {
              // 신규 공휴일 추가
              await db.collection('holidays').add({
                ...holiday,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              syncedCount++;
              functions.logger.info(`✅ 공휴일 추가: ${holiday.date} - ${holiday.name}`);
            } else {
              functions.logger.info(`⏭️ 이미 존재: ${holiday.date} - ${holiday.name}`);
            }
          } catch (error) {
            functions.logger.error(`❌ 공휴일 추가 실패: ${holiday.date}`, error);
          }
        }

        functions.logger.info(`✅ ${year}년 공휴일 동기화 완료: ${syncedCount}개 추가`);
        totalSynced += syncedCount;
      }

      functions.logger.info(`🎉 공휴일 자동 동기화 완료: 총 ${totalSynced}개 추가`);
      return null;

    } catch (error) {
      functions.logger.error('❌ 공휴일 자동 동기화 실패:', error);
      throw error;
    }
  });

/**
 * 공휴일 수동 동기화 API (테스트 및 긴급 동기화용)
 * POST /syncHolidays
 * Body: { year: 2025 }
 */
export const syncHolidays = functions
  .region('asia-northeast3')
  .https
  .onCall(async (data, context) => {
    try {
      // 인증 체크 (관리자만 실행 가능)
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          '인증이 필요합니다.'
        );
      }

      const year = data.year || new Date().getFullYear();

      // 환경변수에서 API 키 가져오기
      const apiKey = process.env.HOLIDAY_API_KEY;
      if (!apiKey) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'HOLIDAY_API_KEY 환경변수가 설정되지 않았습니다.'
        );
      }

      functions.logger.info(`📅 ${year}년 공휴일 수동 동기화 시작...`);

      // API에서 공휴일 가져오기
      const holidays = await fetchHolidaysFromAPI(year, apiKey);

      if (holidays.length === 0) {
        throw new functions.https.HttpsError(
          'not-found',
          `${year}년 공휴일을 불러올 수 없습니다.`
        );
      }

      // Firestore에 저장 (중복 체크)
      let syncedCount = 0;
      for (const holiday of holidays) {
        try {
          // 중복 체크
          const snapshot = await db
            .collection('holidays')
            .where('date', '==', holiday.date)
            .limit(1)
            .get();

          if (snapshot.empty) {
            await db.collection('holidays').add({
              ...holiday,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            syncedCount++;
          }
        } catch (error) {
          functions.logger.error(`공휴일 추가 실패: ${holiday.date}`, error);
        }
      }

      functions.logger.info(`✅ ${year}년 공휴일 동기화 완료: ${syncedCount}개 추가`);

      return {
        success: true,
        year,
        totalCount: holidays.length,
        syncedCount,
        message: `${year}년 공휴일 ${syncedCount}개가 동기화되었습니다.`,
      };

    } catch (error: any) {
      functions.logger.error('공휴일 동기화 오류:', error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        '공휴일 동기화 중 오류가 발생했습니다.',
        error.message
      );
    }
  });

// ===========================================
// 건강진단서 만료 알림 스케줄러
// ===========================================

/**
 * 건강진단서 만료 알림 스케줄러
 * 매일 09:00 (KST) 실행
 * - 30일 이내 만료 예정인 직원에게 알림
 * - 이미 만료된 직원에게 긴급 알림
 * 
 * Cron: "0 0 * * *" = 매일 00:00 UTC (한국시간 09:00)
 * Timezone: Asia/Seoul
 */
export const checkHealthCertExpiry = functions
  .region('asia-northeast3')
  .pubsub
  .schedule('0 0 * * *') // 매일 00:00 UTC
  .timeZone('Asia/Seoul') // 한국 시간대
  .onRun(async (context) => {
    try {
      functions.logger.info('🔄 건강진단서 만료 알림 체크 시작...');

      const today = new Date();
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(today.getDate() + 30);

      // 만료일이 30일 이내인 직원 조회
      const usersSnapshot = await db.collection('users')
        .where('role', 'in', ['staff', 'store_manager', 'employee'])
        .get();

      let notificationsSent = 0;
      let expiredCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const healthCertExpiry = userData.healthCertExpiry;

        if (!healthCertExpiry) continue;

        const expiryDate = new Date(healthCertExpiry);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // 이미 만료된 경우
        if (daysUntilExpiry < 0) {
          try {
            await db.collection('notifications').add({
              companyId: userData.companyId || '',
              userId: userDoc.id,
              type: 'health_cert_expired',
              title: '⚠️ 건강진단서가 만료되었습니다',
              message: `건강진단서가 ${Math.abs(daysUntilExpiry)}일 전에 만료되었습니다. 즉시 갱신이 필요합니다!`,
              priority: 'high',
              isRead: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              actionUrl: '/employee-dashboard?tab=profile',
              actionLabel: '프로필에서 갱신하기',
            });
            expiredCount++;
            notificationsSent++;
            functions.logger.info(`⚠️ 만료 알림 전송: ${userData.name} (${Math.abs(daysUntilExpiry)}일 전 만료)`);
          } catch (error) {
            functions.logger.error(`알림 전송 실패: ${userData.name}`, error);
          }
        }
        // 30일 이내 만료 예정
        else if (daysUntilExpiry <= 30) {
          try {
            await db.collection('notifications').add({
              companyId: userData.companyId || '',
              userId: userDoc.id,
              type: 'health_cert_expiring',
              title: '⏰ 건강진단서 만료 예정',
              message: `건강진단서가 ${daysUntilExpiry}일 후에 만료됩니다. 미리 갱신을 준비하세요.`,
              priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
              isRead: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              actionUrl: '/employee-dashboard?tab=profile',
              actionLabel: '프로필에서 확인하기',
            });
            notificationsSent++;
            functions.logger.info(`⏰ 만료 예정 알림 전송: ${userData.name} (${daysUntilExpiry}일 후)`);
          } catch (error) {
            functions.logger.error(`알림 전송 실패: ${userData.name}`, error);
          }
        }
      }

      functions.logger.info(`✅ 건강진단서 알림 체크 완료: ${notificationsSent}개 전송 (만료: ${expiredCount}, 예정: ${notificationsSent - expiredCount})`);

    } catch (error: any) {
      functions.logger.error('건강진단서 알림 체크 오류:', error);
    }
  });

// ===========================================
// 🔄 급여 실시간 자동 정산 트리거
// ===========================================

/**
 * 출퇴근 기록 변경 시 자동 급여 재계산
 * 
 * 트리거: attendance/{docId} onWrite (생성/수정/삭제)
 * 
 * 동작:
 * 1. 출퇴근 기록이 생성/수정/삭제될 때 자동 실행
 * 2. 해당 직원의 해당 월 급여를 다시 계산
 * 3. salary 컬렉션에 자동으로 덮어쓰기
 * 4. 단, 이미 지급 완료(paid)된 급여는 건드리지 않음
 * 
 * 효과:
 * - 관리자가 정산 버튼을 누르지 않아도 급여가 실시간으로 최신 상태 유지
 * - 출퇴근 기록 수정 시 즉시 급여에 반영
 */
export const autoCalculateSalaryOnAttendance = functions
  .region('asia-northeast3')
  .firestore
  .document('attendance/{docId}')
  .onWrite(async (change, context) => {
    try {
      // 삭제된 경우도 처리 (before 데이터 사용)
      const attendanceData = change.after.exists ? change.after.data() : change.before.data();
      
      if (!attendanceData) {
        functions.logger.warn('⚠️ 출퇴근 기록 데이터가 없음');
        return;
      }
      
      const userId = attendanceData.uid || attendanceData.userId;
      const date = attendanceData.date; // YYYY-MM-DD 형식
      const companyId = attendanceData.companyId;
      
      if (!userId || !date || !companyId) {
        functions.logger.warn('⚠️ 필수 필드 누락:', { userId, date, companyId });
        return;
      }
      
      // 해당 월 추출 (YYYY-MM)
      const yearMonth = date.substring(0, 7); // "2025-01-15" → "2025-01"
      
      functions.logger.info(`🔄 급여 자동 재계산 시작: userId=${userId}, yearMonth=${yearMonth}`);
      
      // 1. 해당 직원의 해당 월 급여 문서 찾기
      const salaryQuery = await db.collection('salary')
        .where('userId', '==', userId)
        .where('yearMonth', '==', yearMonth)
        .where('companyId', '==', companyId)
        .limit(1)
        .get();
      
      // 2. 이미 지급 완료된 급여는 건드리지 않음
      if (!salaryQuery.empty) {
        const existingSalary = salaryQuery.docs[0].data();
        if (existingSalary.status === 'paid' || existingSalary.paid === true) {
          functions.logger.info(`⏸️ 지급 완료된 급여는 재계산하지 않음: userId=${userId}, yearMonth=${yearMonth}`);
          return;
        }
      }
      
      // 3. 급여 재계산 실행
      try {
        // performSalaryCalculation 함수를 직접 호출하여 급여 계산
        const employee = await db.collection('users').doc(userId).get();
        if (!employee.exists) {
          functions.logger.warn(`⚠️ 직원 정보를 찾을 수 없음: userId=${userId}`);
          return;
        }
        
        const employeeData = employee.data()!;
        
        // 계약서 조회
        const contractsQuery = await db.collection('contracts')
          .where('userId', '==', userId)
          .where('companyId', '==', companyId)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        
        if (contractsQuery.empty) {
          functions.logger.warn(`⚠️ 계약서를 찾을 수 없음: userId=${userId}`);
          return;
        }
        
        const contract = contractsQuery.docs[0].data();
        
        // 출퇴근 기록 조회
        const [year, month] = yearMonth.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        
        const attendancesQuery = await db.collection('attendance')
          .where('uid', '==', userId)
          .where('date', '>=', startDate)
          .where('date', '<=', endDate)
          .where('companyId', '==', companyId)
          .get();
        
        const attendances: AttendanceForSalary[] = [];
        attendancesQuery.forEach(doc => {
          const data = doc.data();
          attendances.push({
            date: data.date,
            checkIn: data.checkIn || data.clockIn,
            checkOut: data.checkOut || data.clockOut,
            clockIn: data.clockIn,
            clockOut: data.clockOut,
            wageIncentive: data.wageIncentive || 0
          });
        });
        
        // 급여 계산 실행
        const salaryResult = await performSalaryCalculation(
          { uid: userId, name: employeeData.name, store: employeeData.store, companyId },
          contract as ContractForSalary,
          attendances,
          yearMonth
        );
        
        // 4. 급여 문서 업데이트 또는 생성
        if (!salaryQuery.empty) {
          // 기존 문서 업데이트 (덮어쓰기)
          const docId = salaryQuery.docs[0].id;
          await db.collection('salary').doc(docId).update({
            ...salaryResult,
            autoCalculated: true,
            autoCalculatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          functions.logger.info(`✅ 급여 자동 재계산 완료 (업데이트): userId=${userId}, yearMonth=${yearMonth}, netPay=${salaryResult.netPay}`);
        } else {
          // 새 문서 생성 (미확정 상태)
          await db.collection('salary').add({
            ...salaryResult,
            companyId,
            userId,
            employeeUid: userId,
            employeeName: employeeData.name,
            yearMonth,
            status: 'unconfirmed',
            paid: false,
            autoCalculated: true,
            autoCalculatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          functions.logger.info(`✅ 급여 자동 계산 완료 (신규): userId=${userId}, yearMonth=${yearMonth}, netPay=${salaryResult.netPay}`);
        }
        
      } catch (calcError: any) {
        functions.logger.error(`❌ 급여 계산 실패: userId=${userId}, yearMonth=${yearMonth}`, calcError);
        // 계산 실패는 로그만 남기고 트리거 자체는 실패시키지 않음
      }
      
    } catch (error: any) {
      functions.logger.error('❌ 급여 자동 정산 트리거 오류:', error);
      // 트리거 실패해도 출퇴근 기록 저장은 성공해야 하므로 에러 throw 안 함
    }
  });

// ============================================================================
// 🤖 매월 1일 자동 급여 정산 스케줄러
// ============================================================================

/**
 * 매월 1일 새벽 4시(KST)에 전월 급여를 자동으로 정산
 * Cron: "0 19 1 * *" (UTC 19:00 = KST 04:00, 매월 1일)
 */
export const scheduledMonthlySalaryCalculation = functions
  .region('asia-northeast3')
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .pubsub.schedule('0 19 1 * *')  // 매월 1일 UTC 19:00 (KST 04:00)
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    functions.logger.info('🤖 매월 자동 급여 정산 시작');
    
    try {
      // 1. 전월 계산 (YYYY-MM 형식)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-11
      const prevYear = month === 0 ? year - 1 : year;
      const prevMonth = month === 0 ? 12 : month;
      const yearMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      
      functions.logger.info(`📅 정산 대상 월: ${yearMonth}`);
      
      // 2. 전체 회사 목록 가져오기
      const companiesSnapshot = await db.collection('companies').get();
      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalFailed = 0;
      
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        const companyData = companyDoc.data();
        functions.logger.info(`🏢 회사 처리 시작: ${companyData.name || companyId}`);
        
        try {
          // 3. 해당 회사의 활성 직원 목록 가져오기
          const usersSnapshot = await db.collection('users')
            .where('companyId', '==', companyId)
            .where('role', 'in', ['staff', 'employee', 'store_manager', 'manager'])
            .get();
          
          functions.logger.info(`👥 활성 직원 수: ${usersSnapshot.size}명`);
          
          // 4. 각 직원에 대해 급여 계산
          for (const userDoc of usersSnapshot.docs) {
            totalProcessed++;
            const userId = userDoc.id;
            const userData = userDoc.data();
            
            try {
              // 계약서 조회
              const contractsSnapshot = await db.collection('contracts')
                .where('userId', '==', userId)
                .where('companyId', '==', companyId)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
              
              if (contractsSnapshot.empty) {
                functions.logger.warn(`⚠️ 계약서 없음: ${userData.name} (${userId})`);
                continue;
              }
              
              const contract = contractsSnapshot.docs[0].data() as ContractForSalary;
              
              // 출퇴근 기록 조회
              const startDate = `${yearMonth}-01`;
              const lastDay = new Date(prevYear, prevMonth, 0).getDate();
              const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
              
              const attendancesSnapshot = await db.collection('attendance')
                .where('userId', '==', userId)
                .where('companyId', '==', companyId)
                .where('date', '>=', startDate)
                .where('date', '<=', endDate)
                .get();
              
              const attendances: AttendanceForSalary[] = [];
              attendancesSnapshot.docs.forEach(doc => {
                const data = doc.data();
                attendances.push({
                  date: data.date,
                  checkIn: data.checkIn || data.clockIn,
                  checkOut: data.checkOut || data.clockOut,
                  clockIn: data.clockIn,
                  clockOut: data.clockOut,
                  wageIncentive: data.wageIncentive || 0
                });
              });
              
              // 급여 계산 실행
              const salaryResult = await performSalaryCalculation(
                { uid: userId, name: userData.name, store: userData.store, companyId },
                contract,
                attendances,
                yearMonth
              );
              
              // 기존 급여 문서 확인
              const salaryQuery = await db.collection('salary')
                .where('userId', '==', userId)
                .where('companyId', '==', companyId)
                .where('yearMonth', '==', yearMonth)
                .limit(1)
                .get();
              
              if (!salaryQuery.empty) {
                // 기존 문서가 있으면 업데이트 (지급 완료가 아닌 경우만)
                const existingDoc = salaryQuery.docs[0];
                const existingData = existingDoc.data();
                
                if (existingData.status === 'paid') {
                  functions.logger.info(`⏭️ 이미 지급 완료: ${userData.name} (${userId})`);
                  continue;
                }
                
                await db.collection('salary').doc(existingDoc.id).update({
                  ...salaryResult,
                  autoCalculated: true,
                  autoCalculatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                functions.logger.info(`✅ 급여 업데이트: ${userData.name} (${userId}), ${salaryResult.netPay}원`);
              } else {
                // 새 문서 생성
                await db.collection('salary').add({
                  ...salaryResult,
                  companyId,
                  userId,
                  employeeUid: userId,
                  employeeName: userData.name,
                  yearMonth,
                  status: 'unconfirmed',
                  paid: false,
                  autoCalculated: true,
                  autoCalculatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                functions.logger.info(`✅ 급여 생성: ${userData.name} (${userId}), ${salaryResult.netPay}원`);
              }
              
              totalSuccess++;
              
            } catch (userError: any) {
              totalFailed++;
              functions.logger.error(`❌ 직원 급여 계산 실패: ${userData.name} (${userId})`, userError);
            }
          }
          
          functions.logger.info(`✅ 회사 처리 완료: ${companyData.name || companyId}`);
          
        } catch (companyError: any) {
          functions.logger.error(`❌ 회사 처리 실패: ${companyId}`, companyError);
        }
      }
      
      // 5. 최종 결과 로그
      functions.logger.info(`
🎉 매월 자동 급여 정산 완료
- 대상 월: ${yearMonth}
- 처리 직원 수: ${totalProcessed}명
- 성공: ${totalSuccess}명
- 실패: ${totalFailed}명
      `);
      
      return { success: true, yearMonth, totalProcessed, totalSuccess, totalFailed };
      
    } catch (error: any) {
      functions.logger.error('❌ 매월 자동 급여 정산 실패:', error);
      throw error;
    }
  });
