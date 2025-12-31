/**
 * 근무스케줄 관리 타입 정의
 * 백업: admin-dashboard.html 라인 11806-12155 (loadSchedules 함수)
 * 
 * v2.0: 계약서 기반 자동 스케줄 생성 지원
 * - 한 달 단위 생성
 * - 추가 계약서 병합 지원 (plannedTimes 배열)
 * - 실제 출퇴근 기록 반영 (actualTime)
 */

import { Timestamp } from 'firebase/firestore';

/**
 * 요일 타입
 */
export type DayOfWeek = '월' | '화' | '수' | '목' | '금' | '토' | '일';

/**
 * 표시 모드
 */
export type DisplayMode = 'schedule' | 'attendance';

/**
 * 휴게시간 상세 인터페이스 (계약서와 동일)
 */
export interface BreakTimeDetail {
  start?: string;         // 시작 시간 (HH:mm)
  end?: string;           // 종료 시간 (HH:mm)
  minutes?: number;       // 휴게시간 (분)
  hours?: number;         // 휴게시간 (시간)
  isPaid?: boolean;       // 유급 여부
  description?: string;   // 설명
}

/**
 * 계획 시간 (계약서 기반)
 * - 한 날짜에 여러 계약서의 근무시간 병합 가능
 */
export interface PlannedTime {
  contractId: string;           // 계약서 ID
  isAdditional: boolean;        // 추가 계약서 여부
  startTime: string;            // 시작 시간 (HH:mm)
  endTime: string;              // 종료 시간 (HH:mm)
  breakTime?: BreakTimeDetail;  // 휴게시간
  workHours?: number;           // 근무 시간 (시간)
  shiftType?: string;           // 교대 구분 (오픈/마감/...)
  isHoliday?: boolean;          // 휴가일 여부
}

/**
 * 실제 출퇴근 시간 (출퇴근 기록 기반)
 */
export interface ActualTime {
  clockIn?: string;             // 실제 출근 시간 (HH:mm)
  clockOut?: string;            // 실제 퇴근 시간 (HH:mm)
  attendanceId?: string;        // 출퇴근 기록 ID
  status?: 'late' | 'absent' | 'overtime' | 'early_leave' | 'on_time'; // 상태
  warning?: string;             // 경고 메시지
  warningReason?: string;       // 경고 사유
}

/**
 * 스케줄 인터페이스 (Firestore 'schedules' 컬렉션)
 * v2.0: 계약서 기반 자동 생성 + 실제 출퇴근 반영
 */
export interface Schedule {
  id?: string;                    // Firestore 문서 ID
  companyId: string;              // 회사 ID (멀티테넌트)
  storeId: string;                // 매장 ID
  storeName?: string;             // 매장명
  
  // 직원 정보
  userId: string;                 // 직원 UID
  userName?: string;              // 직원명
  
  // 근무 정보
  date: string;                   // 근무 날짜 (YYYY-MM-DD)
  
  // 🔥 계획 시간 (계약서 기반, 여러 계약서 병합 가능)
  plannedTimes: PlannedTime[];    // 계획된 근무시간 배열
  
  // 🔥 실제 시간 (출퇴근 기록 기반)
  actualTime?: ActualTime;        // 실제 출퇴궼 시간
  
  // 메타 정보
  createdAt?: Timestamp | Date;   // 생성 일시
  createdBy?: string;             // 생성자 (UID)
  updatedAt?: Timestamp | Date;   // 수정 일시
  updatedBy?: string;             // 수정자 (UID)
  
  // 기타
  notes?: string;                 // 특이사항
  
  // 🚧 Deprecated (하위 호환성 유지)
  startTime?: string;             // ⚠️ Legacy: plannedTimes[0].startTime 사용 권장
  endTime?: string;               // ⚠️ Legacy: plannedTimes[0].endTime 사용 권장
  contractId?: string;            // ⚠️ Legacy: plannedTimes[0].contractId 사용 권장
  isAdditional?: boolean;         // ⚠️ Legacy: plannedTimes[0].isAdditional 사용 권장
  isShiftReplacement?: boolean;   // ⚠️ Legacy: plannedTimes[0].shiftType 사용 권장
  breakTime?: BreakTime;          // ⚠️ Legacy: plannedTimes[0].breakTime 사용 권장
  workHours?: number;             // ⚠️ Legacy: plannedTimes[0].workHours 사용 권장
  isWorkDay?: boolean;            // ⚠️ Legacy: plannedTimes.length > 0 사용 권장
}

/**
 * 직원별 스케줄 (주간)
 */
export interface EmployeeWeekSchedule {
  uid: string;                    // 직원 UID
  name: string;                   // 직원명
  role?: string;                  // 역할
  schedules: {
    [key in DayOfWeek]: ScheduleDetail[];
  };
}

/**
 * 스케줄 상세 (요일별)
 * - UI 표시용 데이터 구조
 */
export interface ScheduleDetail {
  isWorkDay: boolean;             // 근무일 여부
  
  // 계획 시간 (여러 계약서 가능)
  plannedTimes?: PlannedTime[];   // 계획된 근무시간 배열
  
  // 실제 시간
  actualTime?: ActualTime;        // 실제 출퇴근 시간
  
  // 🚧 Deprecated (하위 호환성)
  startTime?: string;             // ⚠️ Legacy
  endTime?: string;               // ⚠️ Legacy
  hours?: number;                 // ⚠️ Legacy
  breakTime?: BreakTime;          // ⚠️ Legacy
  isShiftReplacement?: boolean;   // ⚠️ Legacy
  status?: string;                // 상태 (출퇴근 기록 모드)
  statusText?: string;            // 상태 텍스트
}

/**
 * 주간 스케줄 데이터
 */
export interface WeekScheduleData {
  type: DisplayMode;              // 표시 모드
  year: number;                   // 년도
  weekNum: number;                // 주차
  monday: string;                 // 월요일 날짜 (YYYY-MM-DD)
  employees: EmployeeWeekSchedule[]; // 직원별 스케줄
}

/**
 * 스케줄 필터
 */
export interface ScheduleFilters {
  storeId: string;                // 매장 ID (전체: '')
  displayMode: DisplayMode;       // 표시 모드
  currentWeek: Date;              // 현재 주 (월요일 기준)
}

/**
 * 출퇴근 기록 (attendance 컬렉션)
 */
export interface AttendanceRecord {
  id?: string;                    // Firestore 문서 ID
  companyId: string;              // 회사 ID
  uid: string;                    // 직원 UID
  date: string;                   // 날짜 (YYYY-MM-DD)
  
  // 출퇴근 시간
  clockIn?: string;               // 출근 시간 (HH:mm:ss)
  clockOut?: string;              // 퇴근 시간 (HH:mm:ss)
  
  // 상태
  status?: 'normal' | 'late' | 'early' | 'absent'; // 상태
  statusText?: string;            // 상태 텍스트
  
  // 예정 시간 (스케줄 기준)
  scheduledStart?: string;        // 예정 출근
  scheduledEnd?: string;          // 예정 퇴근
  
  // 계산
  workHours?: number;             // 실제 근무 시간
  
  createdAt?: Timestamp | Date;   // 생성 일시
  updatedAt?: Timestamp | Date;   // 수정 일시
}

/**
 * 주차 정보
 */
export interface WeekInfo {
  year: number;                   // 년도
  weekNum: number;                // 주차
  monday: Date;                   // 월요일
  sunday: Date;                   // 일요일
  displayText: string;            // 표시 텍스트 (예: "2025년 1월 1주차 (1/6 ~ 1/12)")
}

// ============================================
// 스케줄 시뮬레이터 타입 (Phase 4)
// 백업: admin-dashboard.html 라인 13036-13819
// ============================================

/**
 * 근무일 그룹 (스케줄 시뮬레이터)
 */
export interface ScheduleGroup {
  id: string;                     // 그룹 ID (고유)
  days: DayOfWeek[];              // 근무 요일
  startTime: string;              // 시작 시간 (HH:mm)
  endTime: string;                // 종료 시간 (HH:mm)
  breakMinutes?: number;          // 휴게시간 (분)
}

/**
 * 가상 인원 (스케줄 시뮬레이터)
 */
export interface SimulatorPerson {
  id: string;                     // 인원 ID (고유)
  name: string;                   // 인원 이름 (A, B, C...)
  
  // 급여 설정
  salaryType?: 'hourly' | 'monthly' | 'none'; // 급여 타입
  salaryAmount?: number;          // 급여 금액
  
  // 근무 스케줄 그룹
  scheduleGroups: ScheduleGroup[]; // 근무일 그룹 배열
}

/**
 * 시뮬레이터 스케줄 (주별, 인원별)
 */
export interface SimulatorSchedule {
  [personId: string]: {
    [weekKey: string]: {          // 'YYYY-WW' 형식
      [key in DayOfWeek]: ScheduleDetail | null;
    };
  };
}

/**
 * 스케줄 시뮬레이터 (Firestore 'simulators' 컬렉션)
 */
export interface Simulator {
  id?: string;                    // Firestore 문서 ID
  name: string;                   // 시뮬레이터 이름
  companyId?: string;             // 회사 ID (멀티테넌트)
  
  // 가상 인원
  persons: SimulatorPerson[];     // 가상 인원 배열
  
  // 메타 정보
  createdAt?: Timestamp | Date;   // 생성 일시
  updatedAt?: Timestamp | Date;   // 수정 일시
}
