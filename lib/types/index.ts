/**
 * 타입 정의 통합 Export
 * 
 * ABC Staff System의 모든 타입을 여기서 한 번에 import 가능
 * - Zod 스키마를 통한 런타임 유효성 검사 지원
 * - FIELD_NAMING_STANDARD.md 준수
 * - Legacy 필드 호환성 유지
 * 
 * @version 2.0.0
 * @date 2025-12-31
 */

// ============================================
// 1. Zod 스키마 및 타입 (우선순위 1)
// ============================================

export * from './schemas';

// ============================================
// 2. 기존 타입 정의 (하위 호환성)
// ============================================

// Common Types (공통 타입)
export type {
  FirebaseTimestamp,
  DateTimeType,
  UserRole,
  UserStatus,
  BaseUser,
  Company,
  Store as CommonStore,
  Brand as CommonBrand,
  Pagination,
  FilterOptions,
  SortOptions
} from './common';

// Employee Types (직원 타입)
export type {
  Employee as LegacyEmployee,
  EmployeeFormData,
  EmployeeFilterOptions,
  EmployeeStats
} from './employee';

// Attendance Types (출퇴근 타입)
export type {
  AttendanceStatus,
  AttendanceRecord as LegacyAttendanceRecord,
  AttendanceStatusResult,
  LeaveType,
  LeaveRequest,
  EmergencyRecruitment,
  AttendanceStats,
  AttendanceFilterOptions
} from './attendance';

// Contract Types (계약서 타입)
export type {
  BreakTimeDetail,
  SalaryCalculationPeriod,
  ContractType,
  ContractStatus,
  ContractSchedule,
  ContractAllowances,
  ContractInsurance,
  Contract as LegacyContract,
  ContractGroup,
  ContractFilters,
  ContractFormData
} from './contract';

// Salary Types (급여 타입)
export type {
  SalaryType,
  CalculationType,
  CalculationPeriod,
  ContractForSalary,
  AttendanceForSalary,
  AttendanceDetail,
  MonthlySalaryResult,
  ConfirmedSalary as LegacyConfirmedSalary,
  AttendanceThresholds,
  SalaryFilterOptions,
  SalaryStats
} from './salary';

// Schedule Types (스케줄 타입)
export type {
  DayOfWeek,
  DisplayMode,
  BreakTimeDetail as ScheduleBreakTimeDetail,
  PlannedTime,
  ActualTime,
  Schedule as LegacySchedule,
  EmployeeWeekSchedule,
  ScheduleDetail,
  WeekScheduleData,
  ScheduleFilters,
  AttendanceRecord as ScheduleAttendanceRecord,
  WeekInfo,
  ScheduleGroup,
  SimulatorPerson,
  SimulatorSchedule,
  Simulator
} from './schedule';

// Approval Types (승인 타입)
export type {
  ApprovalType,
  ApprovalStatus,
  VacationData,
  OvertimeData,
  PurchaseData,
  DisposalData,
  ResignationData,
  AbsenceData,
  ShiftData,
  Approval,
  ShiftRequest,
  ApprovalRequest as LegacyApprovalRequest,
  ApprovalFilterOptions,
  ApprovalStats
} from './approval';

// Store & Brand Types (매장 및 브랜드 타입)
export type {
  Brand as LegacyBrand,
  Store as LegacyStore,
  BrandFormData,
  StoreFormData
} from './store';

// Notice Types (공지사항 타입)
export type {
  Notice
} from './notice';

// Notification Types (알림 타입)
export type {
  Notification,
  NotificationType,
  NotificationFilterOptions
} from './notification';

// Invite Types (초대 타입)
export type {
  Invite,
  InviteStatus,
  InviteFormData
} from './invite';

// ============================================
// 3. 타입 별칭 (Type Aliases)
// ============================================

/**
 * 표준 필드명 기준 타입 (Zod 스키마 기반)
 * 
 * 새 코드에서는 이 타입들을 사용하세요!
 */
export type {
  Employee,
  AttendanceRecord,
  Contract,
  SalaryCalculationResult,
  ConfirmedSalary,
  Store,
  Brand,
  Schedule,
  ApprovalRequest
} from './schemas';

// ============================================
// 4. 유효성 검사 헬퍼 함수
// ============================================

export {
  // Zod 스키마
  UserRoleSchema,
  UserStatusSchema,
  DateStringSchema,
  TimeStringSchema,
  BirthStringSchema,
  UUIDSchema,
  EmployeeSchema,
  AttendanceRecordSchema,
  ContractSchema,
  SalaryCalculationResultSchema,
  ConfirmedSalarySchema,
  StoreSchema,
  BrandSchema,
  ScheduleSchema,
  ApprovalRequestSchema,
  
  // 헬퍼 함수
  validate,
  validatePartial,
  validateArray
} from './schemas';

// ============================================
// 5. 사용 가이드
// ============================================

/**
 * ## 사용 예제
 * 
 * ### 1. 기본 타입 import
 * ```typescript
 * import { Employee, Contract, AttendanceRecord } from '@/lib/types';
 * ```
 * 
 * ### 2. 유효성 검사
 * ```typescript
 * import { EmployeeSchema, validate } from '@/lib/types';
 * 
 * const result = validate(EmployeeSchema, employeeData);
 * if (result.success) {
 *   console.log('Valid employee:', result.data);
 * } else {
 *   console.error('Validation error:', result.error);
 * }
 * ```
 * 
 * ### 3. Legacy 타입 호환
 * ```typescript
 * import { LegacyEmployee } from '@/lib/types';
 * 
 * // 기존 코드와 호환되는 타입
 * const employee: LegacyEmployee = { ... };
 * ```
 * 
 * ### 4. Zod 스키마로 타입 추론
 * ```typescript
 * import { EmployeeSchema } from '@/lib/types';
 * import { z } from 'zod';
 * 
 * type Employee = z.infer<typeof EmployeeSchema>;
 * ```
 * 
 * ## 표준 필드명 가이드
 * 
 * | 기능 | 표준 필드 | Legacy 필드 |
 * |------|-----------|-------------|
 * | 사용자 ID | `userId` | `uid`, `employeeId` |
 * | 매장 ID | `storeId` | `store` (매장명) |
 * | 출근 시간 | `clockIn` | `checkIn` |
 * | 퇴근 시간 | `clockOut` | `checkOut` |
 * | 급여 타입 | `salaryType` | `wageType` |
 * | 급여 금액 | `salaryAmount` | `wageAmount` |
 * 
 * 자세한 내용은 `FIELD_NAMING_STANDARD.md`를 참조하세요.
 */
