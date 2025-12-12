/**
 * 급여 관련 타입 정의 (Salary Types)
 * 백업: /home/user/webapp-backup/js/salary-calculator.js
 * 원본 HTML의 loadSalaryList 함수 + calculateMonthlySalary 함수 기준
 */

import { DateTimeType } from './common';

/**
 * 급여 유형
 */
export type SalaryType = '시급' | '월급' | '연봉';

/**
 * 계산 기간 타입
 */
export type CalculationType = 'prev_month_full' | 'current_month_full' | 'custom';

/**
 * 사용자 지정 계산 기간
 */
export interface CalculationPeriod {
  startMonth: 'prev' | 'current';
  startDay: number;
  endMonth: 'prev' | 'current';
  endDay: number | 'last';
}

/**
 * 계약서 정보 (급여 계산용)
 * 백업: /home/user/webapp-backup/js/salary-calculator.js calculateMonthlySalary 함수
 */
export interface ContractForSalary {
  companyId: string;
  employeeName: string;
  workStore?: string;
  
  // 급여 정보
  salaryType?: SalaryType;
  wageType?: SalaryType;           // 호환성 (salaryType 대체)
  salaryAmount?: number;
  wageAmount?: number;              // 호환성 (salaryAmount 대체)
  
  // 근무 정보
  workDays?: string;                // "월,화,수,목,금" 형식
  weeklyHours?: number;             // 주당 근무시간
  workStartTime?: string;           // "HH:MM"
  workEndTime?: string;             // "HH:MM"
  
  // 급여 계산 기간
  salaryPaymentDay?: number | null;
  salaryCalculationType?: CalculationType;
  salaryCalculationPeriod?: CalculationPeriod | null;
  
  // 수당 설정
  allowances?: {
    overtime?: boolean;             // 연장근로수당
    night?: boolean;                // 야간근로수당
    holiday?: boolean;              // 휴일근로수당
    weeklyHoliday?: boolean;        // 주휴수당
  };
  
  // 4대보험
  insurance?: {
    pension?: boolean;              // 국민연금
    health?: boolean;               // 건강보험
    employment?: boolean;           // 고용보험
    workComp?: boolean;             // 산재보험
  };
  
  // 계약 시작일 (퇴직금 계산용)
  startDate?: string;
  createdAt?: DateTimeType;
}

/**
 * 출퇴근 기록 (급여 계산용)
 */
export interface AttendanceForSalary {
  date: string;                     // YYYY-MM-DD
  uid: string;
  checkIn?: string;                 // HH:MM
  clockIn?: string;                 // HH:MM (호환성)
  checkOut?: string;                // HH:MM
  clockOut?: string;                // HH:MM (호환성)
  wageIncentive?: number;           // 🆕 Phase 5: 인센티브 시급
}

/**
 * 출퇴근 상세 (급여 계산 결과에 포함)
 */
export interface AttendanceDetail {
  date: string;
  checkIn: string;
  checkOut: string;
  adjustedCheckIn: string;          // 조정된 출근시간
  adjustedCheckOut: string;         // 조정된 퇴근시간
  workHours: string;
  nightHours: string;
  isHoliday: boolean;
  wageIncentive: number;            // 🆕 Phase 5
  isRealtime: boolean;              // 실시간 계산 여부
}

/**
 * 급여 계산 결과 (월 단위)
 * 백업: /home/user/webapp-backup/js/salary-calculator.js calculateMonthlySalary 함수 반환값
 */
export interface MonthlySalaryResult {
  employeeName: string;
  userId: string;                   // 🔥 표준 필드
  employeeUid: string;              // 하위 호환성
  storeName?: string;
  yearMonth: string;                // YYYY-MM
  salaryType: SalaryType;
  
  // 기본 정보
  hourlyWage: number;
  monthlyWage: number;
  annualWage: number;
  totalWorkHours: number;
  
  // 지급 항목
  basePay: number;                  // 기본급
  overtimePay: number;              // 연장근로수당
  nightPay: number;                 // 야간근로수당
  holidayPay: number;               // 휴일근로수당
  weeklyHolidayPay: number;         // 주휴수당
  incentivePay: number;             // 🆕 Phase 5: 특별 근무 수당
  severancePay: number;             // 퇴직금
  totalAllowances: number;          // 총 수당
  
  // 공제 항목
  nationalPension: number;          // 국민연금
  healthInsurance: number;          // 건강보험
  longTermCare: number;             // 장기요양보험
  employmentInsurance: number;      // 고용보험
  incomeTax: number;                // 소득세
  totalDeductions: number;          // 총 공제
  
  // 최종 금액
  totalPay: number;                 // 총 지급액 (공제 전)
  netPay: number;                   // 실지급액 (공제 후)
  
  // 상세 정보
  workDays: number;
  attendanceDetails: AttendanceDetail[];
  
  // 계약서 기준 정보
  contractInfo: {
    weeklyHours: number;
    isWeeklyHolidayEligible: boolean;
    has4Insurance: boolean;
    hasPension: boolean;
    hasHealthInsurance: boolean;
    hasEmploymentInsurance: boolean;
    hasWorkCompInsurance: boolean;
  };
  
  // 시간 상세
  overtimeHours?: number;
  nightHours?: number;
  holidayHours?: number;
}

/**
 * 확정된 급여 정보 (Firestore salaries 컬렉션)
 * 백업: loadSalaryList 함수에서 confirmedSalaries 객체
 */
export interface ConfirmedSalary {
  id: string;
  
  // 🔥 표준 필드
  userId: string;
  
  // 하위 호환성
  employeeUid: string;
  
  employeeName: string;
  companyId: string;
  storeName?: string;
  
  // 급여 기간
  yearMonth: string;                // YYYY-MM
  
  // 급여 금액
  basePay: number;
  totalAllowances: number;
  totalDeductions: number;
  totalPay: number;
  netPay: number;
  
  // 상태
  status: 'confirmed' | 'paid';
  paid?: boolean;
  confirmedAt?: DateTimeType;
  confirmedBy?: string;
  paidAt?: DateTimeType;
  
  // 메타데이터
  createdAt?: DateTimeType;
  updatedAt?: DateTimeType;
}

/**
 * 매장 출퇴근 허용시간 설정
 * 백업: salary-calculator.js 라인 202~206
 */
export interface AttendanceThresholds {
  earlyClockIn: number;             // 조기출근 수당 적용 기준 (분)
  earlyClockOut: number;            // 조기퇴근 허용 시간 (분)
  overtime: number;                 // 초과근무 수당 적용 기준 (분)
}

/**
 * 급여 필터 옵션
 * 백업: loadSalaryList 함수 필터
 */
export interface SalaryFilterOptions {
  month?: string;                   // YYYY-MM
  store?: string;                   // 매장명
  storeId?: string;                 // 매장 ID
  employmentStatus?: 'active' | 'resigned' | '';  // 근무상태
}

/**
 * 급여 통계
 */
export interface SalaryStats {
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  averageNetPay: number;
  byStore: Record<string, {
    count: number;
    totalPay: number;
  }>;
}
