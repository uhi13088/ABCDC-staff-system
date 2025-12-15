/**
 * 전역 상수 정의
 * 하드코딩 문자열 제거 및 타입 안전성 확보
 */

/**
 * Firestore Collection 이름
 */
export const COLLECTIONS = {
  USERS: 'users',
  COMPANIES: 'companies',
  CONTRACTS: 'contracts',
  SIGNED_CONTRACTS: 'signedContracts', // 서명 완료된 계약서
  ATTENDANCE: 'attendance',
  SCHEDULES: 'schedules',
  SALARY: 'salary',
  APPROVALS: 'approvals',
  NOTICES: 'notices',
  BRANDS: 'brands',
  STORES: 'stores',
  
  // 초대 코드 (2가지 시스템)
  INVITATION_CODES: 'invitation_codes', // 플랫폼 가입용 (회사 가입)
  COMPANY_INVITES: 'company_invites',   // 직원 초대용 (관리자가 직원 초대) ⭐
  
  OPEN_SHIFTS: 'open_shifts', // 긴급 근무 모집
  NOTIFICATIONS: 'notifications', // 알림
  HOLIDAYS: 'holidays', // 공휴일 (Phase C-2)
} as const;

/**
 * 사용자 역할
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STORE_MANAGER: 'store_manager',
  EMPLOYEE: 'employee',
  STAFF: 'staff',
} as const;

/**
 * 사용자 상태
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  RESIGNED: 'resigned',
  APPROVED: 'approved',
} as const;

/**
 * 계약서 상태
 */
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  PENDING: '서명대기',
  SIGNED: '서명완료',
  COMPLETED: '완료',
  EXPIRED: '만료',
} as const;

/**
 * 계약 유형
 */
export const CONTRACT_TYPES = {
  HOURLY: '시급제',
  MONTHLY: '월급제',
  ANNUAL: '연봉제',
  CONTRACT: '계약직',
  INTERN: '인턴',
  FULL_TIME: '정규직',
  PART_TIME: '시간제',
} as const;

/**
 * 급여 타입
 */
export const SALARY_TYPES = {
  HOURLY: 'hourly',
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
} as const;

/**
 * 출퇴근 상태
 */
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EARLY_LEAVE: 'early_leave',
  ON_LEAVE: 'on_leave',
} as const;

/**
 * 승인 요청 유형
 */
export const APPROVAL_TYPES = {
  LEAVE: '휴가',
  OVERTIME: '초과근무',
  TIME_ADJUSTMENT: '근무시간 조정',
} as const;

/**
 * 승인 상태
 */
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

/**
 * 근무 상태 (고용 상태)
 */
export const EMPLOYMENT_STATUS = {
  ACTIVE: 'active',
  EMPLOYED: 'employed',
  RESIGNED: 'resigned',
} as const;

/**
 * 급여 지급일
 */
export const SALARY_PAYMENT_DAYS = {
  DAY_5: '5',
  DAY_10: '10',
  DAY_15: '15',
  DAY_20: '20',
  DAY_25: '25',
  MONTH_END: '28',
} as const;

/**
 * 급여 계산 방식
 */
export const SALARY_CALCULATION_TYPES = {
  PREV_MONTH_FULL: 'prev_month_full',
  CURRENT_MONTH_FULL: 'current_month_full',
  CUSTOM: 'custom',
} as const;

/**
 * 4대보험 타입
 */
export const INSURANCE_TYPES = {
  ALL: 'all',
  EMPLOYMENT_ONLY: 'employment_only',
  FREELANCER: 'freelancer',
  NONE: 'none',
} as const;

/**
 * 지급 방법
 */
export const PAYMENT_METHODS = {
  BANK_TRANSFER: '계좌이체',
  CASH: '현금',
} as const;

/**
 * 구독 플랜
 */
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
} as const;

/**
 * 요일 (한글)
 */
export const WEEKDAYS_KR = {
  MONDAY: '월',
  TUESDAY: '화',
  WEDNESDAY: '수',
  THURSDAY: '목',
  FRIDAY: '금',
  SATURDAY: '토',
  SUNDAY: '일',
} as const;

/**
 * 요일 (영문)
 */
export const WEEKDAYS_EN = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
} as const;

/**
 * 타입 추론 헬퍼
 */
export type Collection = typeof COLLECTIONS[keyof typeof COLLECTIONS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
export type ContractStatus = typeof CONTRACT_STATUS[keyof typeof CONTRACT_STATUS];
export type ContractType = typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES];
export type SalaryType = typeof SALARY_TYPES[keyof typeof SALARY_TYPES];
export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];
export type ApprovalType = typeof APPROVAL_TYPES[keyof typeof APPROVAL_TYPES];
export type ApprovalStatus = typeof APPROVAL_STATUS[keyof typeof APPROVAL_STATUS];
export type EmploymentStatus = typeof EMPLOYMENT_STATUS[keyof typeof EMPLOYMENT_STATUS];
export type InsuranceType = typeof INSURANCE_TYPES[keyof typeof INSURANCE_TYPES];
export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[keyof typeof SUBSCRIPTION_PLANS];
