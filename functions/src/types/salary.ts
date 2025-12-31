/**
 * Cloud Functions 표준 타입 정의
 * 
 * ABC Staff System의 표준 타입을 Cloud Functions에서 사용
 * - FIELD_NAMING_STANDARD.md 준수
 * - Zod 스키마 기반 유효성 검사
 * - Legacy 필드 호환성 유지
 * 
 * @version 2.0.0
 * @date 2025-12-31
 */

import { z } from 'zod';

// ============================================
// 공통 스키마
// ============================================

export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const TimeStringSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);
export const BirthStringSchema = z.string().regex(/^(\d{6}|\d{4}-\d{2}-\d{2})$/);
export const UUIDSchema = z.string().min(1);

// ============================================
// 급여 계산용 타입
// ============================================

/**
 * 출퇴근 기록 (급여 계산용)
 * 표준 필드: userId, clockIn, clockOut
 */
export const AttendanceForSalarySchema = z.object({
  date: DateStringSchema.describe('날짜 (YYYY-MM-DD)'),
  userId: UUIDSchema.optional().describe('직원 UID (표준)'),
  uid: UUIDSchema.optional().describe('[Legacy] userId'),
  
  // 🔥 표준 출퇴근 시간
  clockIn: TimeStringSchema.optional().describe('출근 시간 (HH:mm)'),
  clockOut: TimeStringSchema.optional().describe('퇴근 시간 (HH:mm)'),
  
  // Legacy 호환
  checkIn: TimeStringSchema.optional().describe('[Legacy] clockIn'),
  checkOut: TimeStringSchema.optional().describe('[Legacy] clockOut'),
  
  // 인센티브
  wageIncentive: z.number().optional().describe('인센티브 시급')
});

export type AttendanceForSalary = z.infer<typeof AttendanceForSalarySchema>;

/**
 * 계약서 정보 (급여 계산용)
 * 표준 필드: userId, salaryType, salaryAmount, storeId
 */
export const ContractForSalarySchema = z.object({
  companyId: UUIDSchema.describe('회사 UUID'),
  
  // 직원 정보
  userId: UUIDSchema.optional().describe('직원 UID (표준)'),
  employeeName: z.string().describe('직원 이름'),
  
  // 매장 정보
  storeId: UUIDSchema.optional().describe('매장 UUID (표준)'),
  storeName: z.string().optional().describe('매장명 (표시용)'),
  workStore: z.string().optional().describe('[Legacy] storeName'),
  
  // 🔥 급여 정보 (표준 필드)
  salaryType: z.enum(['시급', '월급', '연봉', 'hourly', 'monthly', 'annual']).optional().describe('급여 타입'),
  salaryAmount: z.union([z.number(), z.string()]).optional().describe('급여 금액'),
  
  // Legacy 호환
  wageType: z.enum(['시급', '월급', '연봉']).optional().describe('[Legacy] salaryType'),
  wageAmount: z.union([z.number(), z.string()]).optional().describe('[Legacy] salaryAmount'),
  
  // 근무 정보
  workDays: z.string().optional().describe('근무 요일 (월,화,수,목,금)'),
  weeklyHours: z.union([z.number(), z.string()]).optional().describe('주당 근무시간'),
  workStartTime: TimeStringSchema.optional().describe('근무 시작 시간'),
  workEndTime: TimeStringSchema.optional().describe('근무 종료 시간'),
  
  // 급여 계산 기간
  salaryPaymentDay: z.union([z.number(), z.null()]).optional(),
  salaryCalculationType: z.string().optional(),
  salaryCalculationPeriod: z.any().optional(),
  
  // 수당 설정
  allowances: z.object({
    overtime: z.boolean().optional(),
    night: z.boolean().optional(),
    holiday: z.boolean().optional(),
    weeklyHoliday: z.boolean().optional()
  }).optional(),
  
  // 4대보험
  insurance: z.object({
    pension: z.boolean().optional(),
    health: z.boolean().optional(),
    employment: z.boolean().optional(),
    workComp: z.boolean().optional()
  }).optional(),
  
  // 계약 시작일 (퇴직금 계산용)
  startDate: z.any().optional(),
  createdAt: z.any().optional()
});

export type ContractForSalary = z.infer<typeof ContractForSalarySchema>;

/**
 * 급여 계산 결과
 * 표준 필드: userId
 */
export const SalaryCalculationResultSchema = z.object({
  // 기본 정보
  employeeName: z.string().describe('직원 이름'),
  userId: UUIDSchema.describe('직원 UID (표준)'),
  employeeUid: UUIDSchema.optional().describe('[Legacy] userId'),
  storeName: z.string().optional().describe('매장명'),
  yearMonth: z.string().describe('급여 월 (YYYY-MM)'),
  salaryType: z.string().describe('급여 타입'),
  
  // 기본 정보
  hourlyWage: z.number().describe('시급'),
  monthlyWage: z.number().describe('월급'),
  annualWage: z.number().describe('연봉'),
  totalWorkHours: z.number().describe('총 근무시간'),
  
  // 지급 항목
  basePay: z.number().describe('기본급'),
  overtimePay: z.number().describe('연장근로수당'),
  nightPay: z.number().describe('야간근로수당'),
  holidayPay: z.number().describe('휴일근로수당'),
  weeklyHolidayPay: z.number().describe('주휴수당'),
  incentivePay: z.number().describe('특별 근무 수당'),
  severancePay: z.number().describe('퇴직금'),
  totalAllowances: z.number().describe('총 수당'),
  
  // 공제 항목
  nationalPension: z.number().describe('국민연금'),
  healthInsurance: z.number().describe('건강보험'),
  longTermCare: z.number().describe('장기요양보험'),
  employmentInsurance: z.number().describe('고용보험'),
  incomeTax: z.number().describe('소득세'),
  totalDeductions: z.number().describe('총 공제'),
  
  // 최종 금액
  totalPay: z.number().describe('총 지급액 (공제 전)'),
  netPay: z.number().describe('실지급액 (공제 후)'),
  
  // 상세 정보
  workDays: z.number().describe('근무 일수'),
  attendanceDetails: z.array(z.any()).describe('출퇴근 상세'),
  
  // 계약서 기준 정보
  contractInfo: z.object({
    weeklyHours: z.number(),
    isWeeklyHolidayEligible: z.boolean(),
    has4Insurance: z.boolean(),
    hasPension: z.boolean(),
    hasHealthInsurance: z.boolean(),
    hasEmploymentInsurance: z.boolean(),
    hasWorkCompInsurance: z.boolean()
  }),
  
  // 시간 상세
  overtimeHours: z.number().optional(),
  nightHours: z.number().optional(),
  holidayHours: z.number().optional()
});

export type SalaryCalculationResult = z.infer<typeof SalaryCalculationResultSchema>;

// ============================================
// 유효성 검사 헬퍼
// ============================================

/**
 * 안전한 숫자 파싱 (콤마 제거, NaN 방지)
 * @param value 파싱할 값
 * @returns 숫자 (실패 시 0)
 */
export function parseMoney(value: any): number {
  if (!value) return 0;
  
  const strVal = String(value).replace(/,/g, '').trim();
  const num = parseFloat(strVal);
  
  if (isNaN(num)) {
    console.warn('⚠️ Invalid number:', value);
    return 0;
  }
  
  return num;
}

/**
 * 안전한 날짜 파싱 (Timestamp/Date/string 처리)
 * @param value 파싱할 값
 * @returns Date 또는 null
 */
export function safeParseDate(value: any): Date | null {
  if (!value) return null;
  
  // Firestore Timestamp 객체 처리
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch (error) {
      console.warn('⚠️ Timestamp.toDate() 실패:', error);
      return null;
    }
  }
  
  // 이미 Date 객체인 경우
  if (value instanceof Date) {
    return value;
  }
  
  // 문자열 또는 숫자인 경우
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      console.warn('⚠️ Invalid Date:', value);
      return null;
    }
    return date;
  } catch (error) {
    console.warn('⚠️ 날짜 변환 실패:', value, error);
    return null;
  }
}

/**
 * 표준 필드 추출 헬퍼
 * Legacy 필드를 표준 필드로 변환
 */
export function normalizeAttendance(att: any): AttendanceForSalary {
  return {
    date: att.date,
    userId: att.userId || att.uid,
    uid: att.uid || att.userId,
    clockIn: att.clockIn || att.checkIn,
    clockOut: att.clockOut || att.checkOut,
    checkIn: att.checkIn || att.clockIn,
    checkOut: att.checkOut || att.clockOut,
    wageIncentive: parseMoney(att.wageIncentive || 0)
  };
}

/**
 * 계약서 표준 필드 추출
 */
export function normalizeContract(contract: any): ContractForSalary {
  return {
    companyId: contract.companyId,
    userId: contract.userId,
    employeeName: contract.employeeName,
    storeId: contract.storeId,
    storeName: contract.storeName || contract.workStore,
    workStore: contract.workStore || contract.storeName,
    salaryType: contract.salaryType || contract.wageType,
    salaryAmount: contract.salaryAmount || contract.wageAmount,
    wageType: contract.wageType || contract.salaryType,
    wageAmount: contract.wageAmount || contract.salaryAmount,
    workDays: contract.workDays,
    weeklyHours: contract.weeklyHours,
    workStartTime: contract.workStartTime,
    workEndTime: contract.workEndTime,
    salaryPaymentDay: contract.salaryPaymentDay,
    salaryCalculationType: contract.salaryCalculationType,
    salaryCalculationPeriod: contract.salaryCalculationPeriod,
    allowances: contract.allowances,
    insurance: contract.insurance,
    startDate: contract.startDate,
    createdAt: contract.createdAt
  };
}
