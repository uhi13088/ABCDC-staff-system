/**
 * 급여 계산 타입 정의
 * 
 * ⚠️ 주의: 클라이언트 계산 로직은 서버(Cloud Functions)로 완전 이관되었습니다.
 * 이 파일은 타입 정의만 남아있으며, 실제 계산은 calculateMonthlySalaryOnServer()를 사용하세요.
 * 
 * @deprecated 계산 함수들은 더 이상 사용하지 않습니다. 서버 API를 호출하세요.
 * @see services/cloudFunctionsSalaryService.ts - calculateMonthlySalaryOnServer()
 */

// ===========================================
// 타입 정의 (표준 필드명 준수)
// ===========================================

/**
 * 출퇴근 상세 정보
 */
export interface AttendanceDetail {
  date: string;
  clockIn: string;              // 🔥 표준 필드
  clockOut: string;             // 🔥 표준 필드
  adjustedClockIn: string;      // 조정된 출근시간
  adjustedClockOut: string;     // 조정된 퇴근시간
  workHours: string;
  nightHours: string;
  isHoliday: boolean;
  wageIncentive: number;        // 인센티브 시급
  isRealtime: boolean;          // 실시간 계산 여부
}

/**
 * 계약서 기준 정보
 */
export interface ContractInfo {
  weeklyHours: number;
  isWeeklyHolidayEligible: boolean;
  has4Insurance: boolean;
  hasPension: boolean;
  hasHealthInsurance: boolean;
  hasEmploymentInsurance: boolean;
  hasWorkCompInsurance: boolean;
}

/**
 * 급여 계산 결과
 * 
 * 🔥 표준 필드명 준수:
 * - userId (표준), employeeUid (하위 호환)
 * - salaryType, salaryAmount
 * - clockIn, clockOut
 */
export interface SalaryCalculationResult {
  // 기본 정보
  employeeName: string;
  userId: string;               // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
  employeeUid: string;          // 하위 호환성 (기존 코드 지원)
  storeName: string;
  yearMonth: string;
  salaryType: string;
  
  // 기본 정보
  hourlyWage: number;
  monthlyWage: number;
  annualWage: number;
  totalWorkHours: number;
  
  // 지급 항목
  basePay: number;
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  weeklyHolidayPay: number;
  incentivePay: number;          // Phase 5: 특별 근무 수당
  severancePay: number;          // 퇴직금
  totalAllowances: number;
  
  // 공제 항목
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  totalDeductions: number;
  
  // 최종 금액
  totalPay: number;
  netPay: number;
  
  // 상세 정보
  workDays: number;
  attendanceDetails: AttendanceDetail[];
  
  // 계약서 기준 정보
  contractInfo: ContractInfo;
  
  // 옵션: 시간 상세
  overtimeHours?: number;
  nightHours?: number;
  holidayHours?: number;
}

// ===========================================
// 유틸리티 함수 (UI 표시용만 남김)
// ===========================================

/**
 * 시간(소수점)을 "시간 분" 형식으로 변환
 * @param hours - 시간 (소수점)
 * @returns "X시간 Y분" 형식
 */
export function formatHoursAndMinutes(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

// ===========================================
// 더 이상 사용하지 않는 함수들 (서버로 이관됨)
// ===========================================

/**
 * @deprecated 서버의 calculateMonthlySalaryOnServer()를 사용하세요.
 * @see services/cloudFunctionsSalaryService.ts
 */
export function calculateMonthlySalary(): never {
  throw new Error(
    '❌ calculateMonthlySalary()는 더 이상 사용할 수 없습니다.\n' +
    '서버의 calculateMonthlySalaryOnServer()를 사용하세요.\n' +
    'import { calculateMonthlySalaryOnServer } from "@/services/cloudFunctionsSalaryService";'
  );
}

/**
 * @deprecated 공휴일 데이터는 서버에서 관리됩니다.
 */
export const publicHolidays2025 = [
  '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30',
  '2025-03-01', '2025-03-05', '2025-05-05', '2025-05-06',
  '2025-06-06', '2025-08-15', '2025-10-03', '2025-10-05',
  '2025-10-06', '2025-10-07', '2025-10-09', '2025-12-25'
];

/**
 * @deprecated 서버에서 계산됩니다.
 */
export function isPublicHoliday(dateStr: string): boolean {
  return publicHolidays2025.includes(dateStr);
}

/**
 * @deprecated 서버에서 계산됩니다.
 */
export function timeToMinutes(): never {
  throw new Error('❌ 이 함수는 서버로 이관되었습니다. 서버 API를 사용하세요.');
}

/**
 * @deprecated 서버에서 계산됩니다.
 */
export function calculateWorkHours(): never {
  throw new Error('❌ 이 함수는 서버로 이관되었습니다. 서버 API를 사용하세요.');
}

/**
 * @deprecated 서버에서 계산됩니다.
 */
export function calculateNightHours(): never {
  throw new Error('❌ 이 함수는 서버로 이관되었습니다. 서버 API를 사용하세요.');
}

/**
 * @deprecated 서버에서 계산됩니다.
 */
export function getWeekOfMonth(): never {
  throw new Error('❌ 이 함수는 서버로 이관되었습니다. 서버 API를 사용하세요.');
}

/**
 * @deprecated 서버에서 계산됩니다.
 */
export function calculateWeeklySalary(): never {
  throw new Error('❌ 이 함수는 서버로 이관되었습니다. 서버 API를 사용하세요.');
}
