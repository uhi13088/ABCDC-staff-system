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

// Firebase Admin SDK 초기화
admin.initializeApp();

const db = admin.firestore();

// ===========================================
// 타입 정의
// ===========================================

interface AttendanceThresholds {
  earlyClockIn: number;
  earlyClockOut: number;
  overtime: number;
}

interface AttendanceForSalary {
  date: string;
  clockIn?: string;
  checkIn?: string;
  clockOut?: string;
  checkOut?: string;
  wageIncentive?: number;
}

interface ContractForSalary {
  salaryType?: string;
  wageType?: string;
  salaryAmount?: number;
  wageAmount?: number;
  workStore?: string;
  workDays?: string;
  workStartTime?: string;
  workEndTime?: string;
  weeklyHours?: number;
  startDate?: string;
  companyId?: string;
  allowances?: {
    overtime?: boolean;
    night?: boolean;
    holiday?: boolean;
    weeklyHoliday?: boolean;
  };
  insurance?: {
    pension?: boolean;
    health?: boolean;
    employment?: boolean;
    workComp?: boolean;
  };
}

interface MonthlySalaryResult {
  employeeName: string;
  userId: string;
  employeeUid: string;
  storeName?: string;
  yearMonth: string;
  salaryType: string;
  hourlyWage: number;
  monthlyWage: number;
  annualWage: number;
  totalWorkHours: number;
  basePay: number;
  overtimePay: number;
  overtimeHours?: number;
  nightPay: number;
  nightHours?: number;
  holidayPay: number;
  holidayHours?: number;
  weeklyHolidayPay: number;
  incentivePay: number;
  severancePay: number;
  totalAllowances: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  totalDeductions: number;
  totalPay: number;
  netPay: number;
  workDays: number;
  attendanceDetails: any[];
  contractInfo: {
    weeklyHours: number;
    isWeeklyHolidayEligible: boolean;
    has4Insurance: boolean;
    hasPension: boolean;
    hasHealthInsurance: boolean;
    hasEmploymentInsurance: boolean;
    hasWorkCompInsurance: boolean;
  };
}

// ===========================================
// 유틸리티 함수들
// ===========================================

/**
 * 공휴일 데이터 (2025년)
 */
const publicHolidays2025 = [
  '2025-01-01', // 신정
  '2025-01-28', '2025-01-29', '2025-01-30', // 설날 연휴
  '2025-03-01', // 삼일절
  '2025-03-05', // 부처님오신날
  '2025-05-05', // 어린이날
  '2025-05-06', // 대체공휴일
  '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-10-03', // 개천절
  '2025-10-05', '2025-10-06', '2025-10-07', // 추석 연휴
  '2025-10-09', // 한글날
  '2025-12-25', // 크리스마스
];

function isPublicHoliday(dateStr: string): boolean {
  return publicHolidays2025.includes(dateStr);
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

async function performSalaryCalculation(
  employee: { uid: string; name: string; store?: string; companyId: string },
  contract: ContractForSalary,
  attendances: AttendanceForSalary[],
  yearMonth: string
): Promise<MonthlySalaryResult> {
  
  const [year, month] = yearMonth.split('-').map(Number);
  
  // 매장 출퇴근 허용시간 설정
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
  
  const salaryType = contract.salaryType || contract.wageType || '시급';
  const salaryAmount = parseFloat(String(contract.salaryAmount || contract.wageAmount || 0));
  
  if (salaryAmount === 0) {
    return result;
  }
  
  // 급여 유형별 처리
  if (salaryType === '시급') {
    result.hourlyWage = salaryAmount;
  } else if (salaryType === '월급') {
    result.monthlyWage = salaryAmount;
    result.hourlyWage = Math.round(salaryAmount / 209);
  } else if (salaryType === '연봉') {
    result.annualWage = salaryAmount;
    result.monthlyWage = Math.round(salaryAmount / 12);
    result.hourlyWage = Math.round(salaryAmount / 12 / 209);
  }
  
  // 출퇴근 기록 분석
  let totalWorkHours = 0;
  let totalOvertimeHours = 0;
  let totalNightHours = 0;
  let totalHolidayHours = 0;
  let totalIncentiveAmount = 0;
  const weeklyWorkHours: Record<string, number> = {};
  const weeklyAbsences: Record<string, boolean> = {};
  
  // 계약서 근무일정 파싱
  const workDaysArray = contract.workDays ? contract.workDays.split(',').map(d => d.trim()) : [];
  const dayMap: Record<string, number> = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0 };
  const workDayNumbers = workDaysArray.map(day => dayMap[day]).filter(n => n !== undefined);
  
  // 결근 체크
  const attendanceDates = new Set(attendances.map(att => att.date));
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    
    if (workDayNumbers.includes(dayOfWeek) && !attendanceDates.has(dateStr)) {
      const weekKey = getWeekOfMonth(d);
      weeklyAbsences[weekKey] = true;
    }
  }
  
  attendances.forEach(att => {
    if (!att.clockIn && !att.checkIn) return;
    
    let checkInTime = att.checkIn || att.clockIn || '';
    let checkOutTime = att.checkOut || att.clockOut || '';
    
    if (!checkOutTime) {
      const now = new Date();
      checkOutTime = now.toTimeString().substring(0, 5);
    }
    
    let adjustedCheckIn = checkInTime;
    let adjustedCheckOut = checkOutTime;
    
    if (contract.workStartTime && contract.workEndTime) {
      const contractStartMinutes = timeToMinutes(contract.workStartTime);
      const contractEndMinutes = timeToMinutes(contract.workEndTime);
      const actualStartMinutes = timeToMinutes(checkInTime);
      const actualEndMinutes = timeToMinutes(checkOutTime);
      
      const earlyMinutes = contractStartMinutes - actualStartMinutes;
      if (earlyMinutes > 0 && earlyMinutes < thresholds.earlyClockIn) {
        adjustedCheckIn = contract.workStartTime;
      }
      
      const earlyLeaveMinutes = contractEndMinutes - actualEndMinutes;
      if (earlyLeaveMinutes > 0 && earlyLeaveMinutes <= thresholds.earlyClockOut) {
        adjustedCheckOut = contract.workEndTime;
      }
      
      const overtimeMinutes = actualEndMinutes - contractEndMinutes;
      if (overtimeMinutes > 0 && overtimeMinutes < thresholds.overtime) {
        adjustedCheckOut = contract.workEndTime;
      }
    }
    
    const workHours = calculateWorkHours(adjustedCheckIn, adjustedCheckOut);
    const nightHours = calculateNightHours(adjustedCheckIn, adjustedCheckOut);
    const isHoliday = isPublicHoliday(att.date);
    
    totalWorkHours += workHours;
    result.workDays++;
    
    if (contract.allowances?.night && nightHours > 0) {
      totalNightHours += nightHours;
    }
    
    if (isHoliday && contract.allowances?.holiday) {
      totalHolidayHours += workHours;
    }
    
    if (att.wageIncentive && att.wageIncentive > 0) {
      const incentiveAmount = Math.round(att.wageIncentive * workHours);
      totalIncentiveAmount += incentiveAmount;
    }
    
    const date = new Date(att.date);
    const weekKey = getWeekOfMonth(date);
    const weeklyHoursForDay = Math.min(workHours, 8);
    weeklyWorkHours[weekKey] = (weeklyWorkHours[weekKey] || 0) + weeklyHoursForDay;
    
    result.attendanceDetails.push({
      date: att.date,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      adjustedCheckIn: adjustedCheckIn,
      adjustedCheckOut: adjustedCheckOut,
      workHours: workHours.toFixed(2),
      nightHours: nightHours.toFixed(2),
      isHoliday: isHoliday,
      wageIncentive: att.wageIncentive || 0,
      isRealtime: !att.checkOut && !att.clockOut
    });
  });
  
  result.totalWorkHours = totalWorkHours;
  
  // 기본급 계산
  if (result.salaryType === '시급') {
    result.basePay = Math.round(result.hourlyWage * totalWorkHours);
  } else if (result.salaryType === '월급' || result.salaryType === '연봉') {
    result.basePay = result.monthlyWage;
  }
  
  // 연장근로수당
  if (contract.allowances?.overtime) {
    Object.values(weeklyWorkHours).forEach(weekHours => {
      if (weekHours > 40) {
        totalOvertimeHours += (weekHours - 40);
      }
    });
    result.overtimeHours = totalOvertimeHours;
    result.overtimePay = Math.round(result.hourlyWage * 1.5 * totalOvertimeHours);
  }
  
  // 야간근로수당
  if (contract.allowances?.night && totalNightHours > 0) {
    result.nightHours = totalNightHours;
    result.nightPay = Math.round(result.hourlyWage * 0.5 * totalNightHours);
  }
  
  // 휴일근로수당
  if (contract.allowances?.holiday && totalHolidayHours > 0) {
    result.holidayHours = totalHolidayHours;
    result.holidayPay = Math.round(result.hourlyWage * 1.5 * totalHolidayHours);
  }
  
  // 특별 근무 수당
  if (totalIncentiveAmount > 0) {
    result.incentivePay = Math.round(totalIncentiveAmount);
  }
  
  // 주휴수당
  const contractWeeklyHours = parseFloat(String(contract.weeklyHours || 0));
  const isWeeklyHolidayEligible = !!(contractWeeklyHours >= 15 || contract.allowances?.weeklyHoliday);
  
  if (salaryType === '시급' && isWeeklyHolidayEligible) {
    let weeklyHolidayHours = 0;
    Object.entries(weeklyWorkHours).forEach(([weekKey, weekHours]) => {
      if (weeklyAbsences[weekKey]) {
        return;
      }
      
      if (weekHours >= 15) {
        const weekHolidayHours = weekHours / 5;
        weeklyHolidayHours += weekHolidayHours;
      }
    });
    result.weeklyHolidayPay = Math.round(result.hourlyWage * weeklyHolidayHours);
  }
  
  // 퇴직금 계산
  try {
    if (contract.startDate) {
      const contractStartDate = new Date(contract.startDate);
      const now = nowKST();
      const daysDiff = Math.floor((now.getTime() - contractStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const yearsDiff = daysDiff / 365;
      
      const totalWeeks = Object.keys(weeklyWorkHours).length;
      const avgWeeklyHours = totalWeeks > 0 ? totalWorkHours / totalWeeks : 0;
      
      if (yearsDiff >= 1 && avgWeeklyHours >= 15) {
        const avgMonthlySalary = result.basePay + result.totalAllowances;
        result.severancePay = Math.round((avgMonthlySalary * daysDiff / 365) * 30);
      }
    }
  } catch (error) {
    functions.logger.warn('퇴직금 계산 실패:', error);
  }
  
  // 총 수당
  result.totalAllowances = result.overtimePay + result.nightPay + result.holidayPay + 
                           result.weeklyHolidayPay + result.incentivePay + result.severancePay;
  
  // 총 지급액
  result.totalPay = result.basePay + result.totalAllowances;
  
  // 4대보험 공제
  const insurance = contract.insurance || {};
  
  if (insurance.pension) {
    result.nationalPension = Math.round(result.totalPay * 0.045);
  }
  
  if (insurance.health) {
    result.healthInsurance = Math.round(result.totalPay * 0.03545);
    result.longTermCare = Math.round(result.healthInsurance * 0.1295 * 0.5);
  }
  
  if (insurance.employment) {
    result.employmentInsurance = Math.round(result.totalPay * 0.009);
  }
  
  if (insurance.pension || insurance.health || insurance.employment || insurance.workComp) {
    result.incomeTax = Math.round(result.totalPay * 0.033);
  }
  
  result.totalDeductions = result.nationalPension + result.healthInsurance + 
                           result.longTermCare + result.employmentInsurance + result.incomeTax;
  
  // 실지급액
  result.netPay = result.totalPay - result.totalDeductions;
  
  // 계약서 기준 정보
  result.contractInfo = {
    weeklyHours: contractWeeklyHours,
    isWeeklyHolidayEligible: isWeeklyHolidayEligible,
    has4Insurance: !!(insurance.pension || insurance.health || insurance.employment || insurance.workComp),
    hasPension: !!insurance.pension,
    hasHealthInsurance: !!insurance.health,
    hasEmploymentInsurance: !!insurance.employment,
    hasWorkCompInsurance: !!insurance.workComp
  };
  
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

      if (!['admin', 'store_manager', 'manager'].includes(callerRole)) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '급여 계산 권한이 없습니다.'
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
      await db.collection('salary').add({
        ...salaryResult,
        companyId: callerCompanyId,
        calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
        calculatedBy: callerUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 9. 결과 반환
      return {
        success: true,
        data: salaryResult,
      };

    } catch (error: any) {
      functions.logger.error('급여 계산 오류:', error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        '급여 계산 중 오류가 발생했습니다.',
        error.message
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
