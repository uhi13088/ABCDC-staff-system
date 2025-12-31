/**
 * Zod Validation Schemas
 * 
 * 모든 데이터 타입의 표준 스키마 정의
 * - FIELD_NAMING_STANDARD.md 기준 준수
 * - 런타임 유효성 검사 지원
 * - TypeScript 타입 자동 추론
 * 
 * @version 1.0.0
 * @date 2025-12-31
 */

import { z } from 'zod';

// ============================================
// 1. 공통 스키마 (Common Schemas)
// ============================================

/**
 * 사용자 역할 (UserRole)
 * 표준 필드: role
 */
export const UserRoleSchema = z.enum([
  'super_admin',    // 플랫폼 관리자
  'admin',          // 회사 관리자
  'manager',        // 매니저
  'store_manager',  // 매장 관리자
  'employee',       // 일반 직원
  'staff'           // 일반 직원 (Legacy 호환)
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * 사용자 상태 (UserStatus)
 */
export const UserStatusSchema = z.enum([
  'pending',    // 승인 대기
  'approved',   // 승인됨
  'rejected',   // 거부됨
  'active',     // 활성
  'inactive',   // 비활성
  'resigned'    // 퇴사
]);

export type UserStatus = z.infer<typeof UserStatusSchema>;

/**
 * 날짜 문자열 (YYYY-MM-DD)
 */
export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * 시간 문자열 (HH:mm 또는 HH:mm:ss)
 */
export const TimeStringSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/);

/**
 * 생년월일 (YYMMDD 또는 YYYY-MM-DD)
 */
export const BirthStringSchema = z.string().regex(/^(\d{6}|\d{4}-\d{2}-\d{2})$/);

/**
 * UUID 문자열
 */
export const UUIDSchema = z.string().min(1);

// ============================================
// 2. 직원 스키마 (Employee/User Schemas)
// ============================================

/**
 * 직원 정보 스키마
 * 표준 필드: userId, companyId, storeId, name, birth, phone, position
 */
export const EmployeeSchema = z.object({
  // 🔥 표준 필수 필드
  userId: UUIDSchema.describe('Firebase Auth UID'),
  companyId: UUIDSchema.describe('회사 UUID'),
  storeId: UUIDSchema.optional().describe('매장 UUID'),
  name: z.string().min(1).describe('직원 이름'),
  email: z.string().email().describe('이메일'),
  phone: z.string().optional().describe('전화번호'),
  birth: BirthStringSchema.optional().describe('생년월일 (YYMMDD 또는 YYYY-MM-DD)'),
  
  // 역할 및 상태
  role: UserRoleSchema.describe('역할'),
  status: UserStatusSchema.optional().describe('상태'),
  
  // 직무 정보
  position: z.string().optional().describe('직책'),
  employmentStatus: z.enum(['employed', 'resigned', 'leave']).optional().describe('재직 상태'),
  hireDate: DateStringSchema.optional().describe('입사일 (YYYY-MM-DD)'),
  resignDate: DateStringSchema.optional().describe('퇴사일 (YYYY-MM-DD)'),
  
  // 급여 정보
  baseSalary: z.number().optional().describe('기본급 (월급제)'),
  hourlyWage: z.number().optional().describe('시급 (시급제)'),
  
  // 메타데이터
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  
  // Legacy 호환 필드 (읽기 전용)
  uid: z.string().optional().describe('[Legacy] userId 대신 사용'),
  store: z.string().optional().describe('[Legacy] storeName 표시용'),
  storeName: z.string().optional().describe('매장명 (표시용)')
});

export type Employee = z.infer<typeof EmployeeSchema>;

// ============================================
// 3. 출퇴근 스키마 (Attendance Schemas)
// ============================================

/**
 * 출퇴근 기록 스키마
 * 표준 필드: userId, companyId, storeId, date, clockIn, clockOut
 */
export const AttendanceRecordSchema = z.object({
  // 🔥 표준 필수 필드
  userId: UUIDSchema.describe('직원 UID'),
  companyId: UUIDSchema.describe('회사 UUID'),
  storeId: UUIDSchema.optional().describe('매장 UUID'),
  date: DateStringSchema.describe('날짜 (YYYY-MM-DD)'),
  
  // 🔥 표준 출퇴근 시간 (clockIn/clockOut)
  clockIn: TimeStringSchema.optional().describe('출근 시간 (HH:mm)'),
  clockOut: TimeStringSchema.optional().describe('퇴근 시간 (HH:mm)'),
  
  // 상태
  status: z.string().optional().describe('상태 (present/absent/late/early_leave)'),
  
  // 근무 정보
  workType: z.string().optional().describe('근무 유형 (정규근무/긴급근무)'),
  workMinutes: z.number().optional().describe('근무 시간 (분)'),
  
  // 경고 및 사유
  warning: z.string().nullable().optional().describe('경고 메시지'),
  warningReason: z.string().nullable().optional().describe('경고 사유 (조기출근/지각/연장근무)'),
  warningReasonDetail: z.string().nullable().optional().describe('사용자 입력 상세 이유'),
  
  // 결근 사유
  absentReason: z.string().optional().describe('결근 사유'),
  reasonSubmittedAt: z.any().optional().describe('사유 제출 시간'),
  
  // 승인
  isApproved: z.boolean().optional().describe('승인 여부'),
  
  // 메타데이터
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  
  // Legacy 호환 필드 (읽기 전용)
  uid: z.string().optional().describe('[Legacy] userId 대신 사용'),
  checkIn: z.string().optional().describe('[Legacy] clockIn 대신 사용'),
  checkOut: z.string().optional().describe('[Legacy] clockOut 대신 사용'),
  store: z.string().optional().describe('[Legacy] storeName 표시용'),
  name: z.string().optional().describe('직원 이름'),
  employeeName: z.string().optional().describe('직원 이름')
});

export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;

// ============================================
// 4. 계약서 스키마 (Contract Schemas)
// ============================================

/**
 * 휴게시간 상세 스키마
 */
export const BreakTimeDetailSchema = z.object({
  hours: z.number().optional().describe('시간'),
  minutes: z.number().optional().describe('분'),
  isPaid: z.boolean().optional().describe('유급 여부'),
  description: z.string().optional().describe('설명')
});

/**
 * 요일별 근무 시간 스키마
 */
export const ContractScheduleSchema = z.object({
  day: z.string().describe('요일 (월/화/수/목/금/토/일)'),
  startTime: TimeStringSchema.describe('시작 시간 (HH:mm)'),
  endTime: TimeStringSchema.describe('종료 시간 (HH:mm)'),
  breakMinutes: z.number().optional().describe('휴게시간 (분)')
});

/**
 * 급여 지급 항목 스키마
 */
export const ContractAllowancesSchema = z.object({
  weeklyHoliday: z.boolean().optional().describe('주휴수당'),
  overtime: z.boolean().optional().describe('연장근무수당'),
  night: z.boolean().optional().describe('야간근무수당'),
  holiday: z.boolean().optional().describe('휴일근무수당')
});

/**
 * 4대보험 스키마
 */
export const ContractInsuranceSchema = z.object({
  type: z.string().optional().describe('보험 타입 (full/none)'),
  severancePay: z.boolean().optional().describe('퇴직금 적용')
});

/**
 * 계약서 스키마
 * 표준 필드: userId, employeeName, employeeBirth, storeId, storeName
 *           salaryType, salaryAmount, startDate, endDate
 */
export const ContractSchema = z.object({
  // Firestore ID
  id: z.string().optional().describe('Firestore 문서 ID'),
  companyId: UUIDSchema.optional().describe('회사 UUID'),
  
  // 🔥 직원 정보 (표준 필드)
  userId: UUIDSchema.optional().describe('직원 Firebase UID'),
  employeeName: z.string().min(1).describe('직원 이름'),
  employeeBirth: BirthStringSchema.describe('생년월일 (YYMMDD 또는 YYYY-MM-DD)'),
  employeePhone: z.string().optional().describe('전화번호'),
  employeeAddress: z.string().optional().describe('주소'),
  position: z.string().optional().describe('직책'),
  
  // 회사 정보
  companyName: z.string().optional(),
  companyCEO: z.string().optional(),
  companyBusinessNumber: z.string().optional(),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  
  // 🔥 계약 정보 (표준 필드)
  contractType: z.string().optional().describe('계약 유형'),
  storeId: UUIDSchema.optional().describe('매장 UUID'),
  storeName: z.string().optional().describe('매장명 (표시용)'),
  isAdditional: z.boolean().optional().describe('추가 계약서 여부'),
  
  // 🔥 계약 기간 (표준 필드)
  startDate: DateStringSchema.optional().describe('시작일 (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('종료일 (YYYY-MM-DD 또는 "기간의 정함이 없음")'),
  
  // 스케줄 정보
  schedules: z.array(ContractScheduleSchema).optional().describe('요일별 근무 시간 배열'),
  breakTime: BreakTimeDetailSchema.optional().describe('휴게시간 상세 객체'),
  
  // 🔥 급여 정보 (표준 필드)
  salaryType: z.enum(['hourly', 'monthly', 'annual', '시급', '월급', '연봉']).optional().describe('급여 타입'),
  salaryAmount: z.union([z.number(), z.string()]).optional().describe('급여 금액'),
  salaryPaymentDay: z.string().optional().describe('급여 지급일'),
  salaryCalculationType: z.string().optional().describe('급여 계산 방식'),
  paymentMethod: z.string().optional().describe('지급 방법'),
  
  // 급여 지급 항목
  allowances: ContractAllowancesSchema.optional(),
  
  // 4대보험
  insurance: ContractInsuranceSchema.optional(),
  
  // 계약서 내용
  contractContent: z.string().optional(),
  contractDate: z.string().optional(),
  
  // 서명 정보
  status: z.enum(['서명대기', '서명완료', '만료']).optional(),
  isSigned: z.boolean().optional(),
  signedAt: z.any().optional(),
  signedBy: z.string().optional(),
  signLink: z.string().optional(),
  
  // 메타 정보
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
  
  // 기타
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  
  // Legacy 호환 필드 (읽기 전용)
  workStore: z.string().optional().describe('[Legacy] storeName 대신 사용'),
  wageType: z.string().optional().describe('[Legacy] salaryType 대신 사용'),
  wageAmount: z.union([z.number(), z.string()]).optional().describe('[Legacy] salaryAmount 대신 사용')
});

export type Contract = z.infer<typeof ContractSchema>;

// ============================================
// 5. 급여 스키마 (Salary Schemas)
// ============================================

/**
 * 급여 타입 스키마
 */
export const SalaryTypeSchema = z.enum(['시급', '월급', '연봉', 'hourly', 'monthly', 'annual']);

/**
 * 급여 계산 결과 스키마
 */
export const SalaryCalculationResultSchema = z.object({
  // 기본 정보
  employeeName: z.string().describe('직원 이름'),
  userId: UUIDSchema.describe('직원 UID (표준)'),
  employeeUid: UUIDSchema.optional().describe('[Legacy] userId 호환'),
  storeName: z.string().optional().describe('매장명'),
  yearMonth: z.string().describe('급여 월 (YYYY-MM)'),
  salaryType: SalaryTypeSchema.describe('급여 타입'),
  
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
  attendanceDetails: z.array(z.any()).optional(),
  
  // 계약서 기준 정보
  contractInfo: z.object({
    weeklyHours: z.number(),
    isWeeklyHolidayEligible: z.boolean(),
    has4Insurance: z.boolean(),
    hasPension: z.boolean(),
    hasHealthInsurance: z.boolean(),
    hasEmploymentInsurance: z.boolean(),
    hasWorkCompInsurance: z.boolean()
  }).optional(),
  
  // 시간 상세
  overtimeHours: z.number().optional(),
  nightHours: z.number().optional(),
  holidayHours: z.number().optional()
});

export type SalaryCalculationResult = z.infer<typeof SalaryCalculationResultSchema>;

/**
 * 확정된 급여 정보 스키마 (Firestore salaries 컬렉션)
 */
export const ConfirmedSalarySchema = z.object({
  id: z.string().describe('Firestore 문서 ID'),
  
  // 🔥 표준 필드
  userId: UUIDSchema.describe('직원 UID'),
  employeeUid: UUIDSchema.optional().describe('[Legacy] userId 호환'),
  
  employeeName: z.string().describe('직원 이름'),
  companyId: UUIDSchema.describe('회사 UUID'),
  storeName: z.string().optional().describe('매장명'),
  
  // 급여 기간
  yearMonth: z.string().describe('급여 월 (YYYY-MM)'),
  
  // 급여 금액
  basePay: z.number().describe('기본급'),
  totalAllowances: z.number().describe('총 수당'),
  totalDeductions: z.number().describe('총 공제'),
  totalPay: z.number().describe('총 지급액'),
  netPay: z.number().describe('실지급액'),
  
  // 상태
  status: z.enum(['confirmed', 'paid']).describe('상태'),
  paid: z.boolean().optional().describe('지급 여부'),
  confirmedAt: z.any().optional().describe('확정 시간'),
  confirmedBy: z.string().optional().describe('확정자'),
  paidAt: z.any().optional().describe('지급 시간'),
  
  // 메타데이터
  createdAt: z.any().optional(),
  updatedAt: z.any().optional()
});

export type ConfirmedSalary = z.infer<typeof ConfirmedSalarySchema>;

// ============================================
// 6. 매장 스키마 (Store Schemas)
// ============================================

/**
 * 매장 정보 스키마
 * 표준 필드: storeId, storeName, companyId
 */
export const StoreSchema = z.object({
  // Firestore ID
  id: z.string().optional().describe('Firestore 문서 ID'),
  
  // 🔥 표준 필수 필드
  companyId: UUIDSchema.describe('회사 UUID'),
  storeId: UUIDSchema.optional().describe('매장 UUID (자동 생성)'),
  storeName: z.string().min(1).describe('매장 이름'),
  
  // 브랜드
  brandId: UUIDSchema.optional().describe('브랜드 UUID'),
  storeBrandId: UUIDSchema.optional().describe('[표준] 브랜드 UUID'),
  
  // 매장 정보
  address: z.string().optional().describe('주소'),
  storeAddress: z.string().optional().describe('[표준] 주소'),
  phone: z.string().optional().describe('전화번호'),
  storePhone: z.string().optional().describe('[표준] 전화번호'),
  ceo: z.string().optional().describe('대표자 이름'),
  storeCEO: z.string().optional().describe('[표준] 대표자 이름'),
  businessNumber: z.string().optional().describe('사업자등록번호'),
  storeBusinessNumber: z.string().optional().describe('[표준] 사업자등록번호'),
  
  // 급여 설정
  salaryPaymentDay: z.number().optional().describe('급여 지급일'),
  storeSalaryPaymentDay: z.number().optional().describe('[표준] 급여 지급일'),
  salaryCalculationType: z.string().optional().describe('급여 계산 방식'),
  
  // 수당 설정
  overtimeAllowance: z.boolean().optional(),
  nightAllowance: z.boolean().optional(),
  holidayAllowance: z.boolean().optional(),
  
  // 운영시간
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  
  // 출퇴근 허용시간
  earlyClockInThreshold: z.number().optional(),
  earlyClockOutThreshold: z.number().optional(),
  lateClockInThreshold: z.number().optional(),
  
  // QR 출퇴근 설정
  qrCode: z.string().optional(),
  qrCodeExpiry: z.any().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radius: z.number().optional()
  }).optional(),
  
  // 메타데이터
  isActive: z.boolean().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  
  // Legacy 호환 필드
  name: z.string().optional().describe('[Legacy] storeName 대신 사용')
});

export type Store = z.infer<typeof StoreSchema>;

// ============================================
// 7. 브랜드 스키마 (Brand Schemas)
// ============================================

/**
 * 브랜드 정보 스키마
 */
export const BrandSchema = z.object({
  id: z.string().optional(),
  companyId: UUIDSchema.describe('회사 UUID'),
  brandName: z.string().min(1).describe('브랜드 이름'),
  brandDescription: z.string().optional().describe('브랜드 설명'),
  brandLogoUrl: z.string().optional().describe('브랜드 로고 URL'),
  brandPrimaryColor: z.string().optional().describe('주 색상 (HEX)'),
  brandSecondaryColor: z.string().optional().describe('보조 색상 (HEX)'),
  
  // 메타데이터
  isActive: z.boolean().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  
  // Legacy 호환 필드
  name: z.string().optional().describe('[Legacy] brandName 대신 사용'),
  description: z.string().optional().describe('[Legacy] brandDescription 대신 사용'),
  logoUrl: z.string().optional().describe('[Legacy] brandLogoUrl 대신 사용'),
  primaryColor: z.string().optional().describe('[Legacy] brandPrimaryColor 대신 사용'),
  secondaryColor: z.string().optional().describe('[Legacy] brandSecondaryColor 대신 사용')
});

export type Brand = z.infer<typeof BrandSchema>;

// ============================================
// 8. 스케줄 스키마 (Schedule Schemas)
// ============================================

/**
 * 계획 시간 스키마 (계약서 기반)
 */
export const PlannedTimeSchema = z.object({
  contractId: z.string().describe('계약서 ID'),
  isAdditional: z.boolean().describe('추가 계약서 여부'),
  startTime: TimeStringSchema.describe('시작 시간 (HH:mm)'),
  endTime: TimeStringSchema.describe('종료 시간 (HH:mm)'),
  breakTime: BreakTimeDetailSchema.optional(),
  workHours: z.number().optional(),
  shiftType: z.string().optional(),
  isHoliday: z.boolean().optional()
});

/**
 * 실제 출퇴근 시간 스키마
 */
export const ActualTimeSchema = z.object({
  clockIn: TimeStringSchema.optional().describe('실제 출근 시간'),
  clockOut: TimeStringSchema.optional().describe('실제 퇴근 시간'),
  attendanceId: z.string().optional(),
  status: z.enum(['late', 'absent', 'overtime', 'early_leave', 'on_time']).optional(),
  warning: z.string().optional(),
  warningReason: z.string().optional()
});

/**
 * 스케줄 스키마
 * 표준 필드: userId, companyId, storeId, date, plannedTimes, actualTime
 */
export const ScheduleSchema = z.object({
  id: z.string().optional(),
  companyId: UUIDSchema.describe('회사 UUID'),
  storeId: UUIDSchema.describe('매장 UUID'),
  storeName: z.string().optional(),
  
  // 직원 정보
  userId: UUIDSchema.describe('직원 UID'),
  userName: z.string().optional(),
  
  // 근무 정보
  date: DateStringSchema.describe('근무 날짜 (YYYY-MM-DD)'),
  
  // 🔥 계획 시간 (계약서 기반, 여러 계약서 병합 가능)
  plannedTimes: z.array(PlannedTimeSchema).describe('계획된 근무시간 배열'),
  
  // 🔥 실제 시간 (출퇴근 기록 기반)
  actualTime: ActualTimeSchema.optional().describe('실제 출퇴근 시간'),
  
  // 메타 정보
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
  
  // 기타
  notes: z.string().optional(),
  
  // Legacy 호환 필드 (읽기 전용)
  startTime: z.string().optional().describe('[Legacy] plannedTimes[0].startTime 사용 권장'),
  endTime: z.string().optional().describe('[Legacy] plannedTimes[0].endTime 사용 권장'),
  contractId: z.string().optional(),
  isAdditional: z.boolean().optional(),
  isShiftReplacement: z.boolean().optional(),
  breakTime: BreakTimeDetailSchema.optional(),
  workHours: z.number().optional(),
  isWorkDay: z.boolean().optional()
});

export type Schedule = z.infer<typeof ScheduleSchema>;

// ============================================
// 9. 승인 스키마 (Approval Schemas)
// ============================================

/**
 * 승인 타입
 */
export const ApprovalTypeSchema = z.enum([
  'vacation',
  'overtime',
  'absence',
  'shift',
  'purchase',
  'disposal',
  'resignation'
]);

/**
 * 승인 상태
 */
export const ApprovalStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected'
]);

/**
 * 승인 요청 스키마
 * 표준 필드: userId, companyId, storeId
 */
export const ApprovalRequestSchema = z.object({
  id: z.string().describe('Firestore 문서 ID'),
  companyId: UUIDSchema.describe('회사 UUID'),
  
  // 🔥 표준 필드
  userId: UUIDSchema.describe('요청자 UID'),
  requesterId: UUIDSchema.optional().describe('[Legacy] userId 호환'),
  
  requesterName: z.string().describe('요청자 이름'),
  requesterEmail: z.string().optional(),
  
  // 승인 정보
  type: ApprovalTypeSchema.describe('요청 유형'),
  title: z.string().optional(),
  content: z.string().optional(),
  amount: z.number().optional(),
  attachments: z.array(z.string()).optional(),
  relatedId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  
  // 상태
  status: ApprovalStatusSchema.describe('상태'),
  approverId: z.string().optional(),
  approverName: z.string().optional(),
  approvedAt: z.any().optional(),
  rejectionReason: z.string().optional(),
  
  // 메타데이터
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  
  // Legacy 호환
  storeId: UUIDSchema.optional().describe('매장 UUID')
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

// ============================================
// 10. 유효성 검사 헬퍼 함수
// ============================================

/**
 * 스키마 유효성 검사 헬퍼
 * @param schema Zod 스키마
 * @param data 검증할 데이터
 * @returns 검증 결과 { success: boolean, data?: T, error?: string }
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

/**
 * 부분 유효성 검사 (선택적 필드만 검증)
 * @param schema Zod 스키마
 * @param data 검증할 데이터
 * @returns 검증 결과
 */
export function validatePartial<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: Partial<T> } | { success: false; error: string } {
  return validate(schema.partial(), data) as any;
}

/**
 * 배열 유효성 검사
 * @param schema Zod 스키마
 * @param dataArray 검증할 데이터 배열
 * @returns 검증 결과
 */
export function validateArray<T>(
  schema: z.ZodSchema<T>,
  dataArray: unknown[]
): { success: true; data: T[] } | { success: false; error: string; index: number } {
  const results: T[] = [];
  
  for (let i = 0; i < dataArray.length; i++) {
    const result = validate(schema, dataArray[i]);
    if (!result.success) {
      return { success: false, error: result.error, index: i };
    }
    results.push(result.data);
  }
  
  return { success: true, data: results };
}
