/**
 * 근무스케줄 관리 타입 정의
 * 백업: admin-dashboard.html 라인 11806-12155 (loadSchedules 함수)
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
 * 휴게시간 인터페이스
 */
export interface BreakTime {
  start: string;          // 시작 시간 (HH:mm)
  end: string;            // 종료 시간 (HH:mm)
  minutes: number;        // 휴게시간 (분)
}

/**
 * 스케줄 인터페이스 (Firestore 'schedules' 컬렉션)
 */
export interface Schedule {
  id?: string;                    // Firestore 문서 ID
  companyId: string;              // 회사 ID (멀티테넌트)
  storeId?: string;               // 매장 ID
  storeName?: string;             // 매장명
  
  // 직원 정보
  userId: string;                 // 직원 UID
  userName?: string;              // 직원명
  
  // 계약 정보
  contractId?: string;            // 계약서 ID (연동)
  isAdditional?: boolean;         // 추가 계약서 여부
  isShiftReplacement?: boolean;   // 대체근무 여부 (교대)
  
  // 근무 정보
  date: string;                   // 근무 날짜 (YYYY-MM-DD)
  startTime: string;              // 시작 시간 (HH:mm)
  endTime: string;                // 종료 시간 (HH:mm)
  workHours?: number;             // 근무 시간 (시간)
  
  // 휴게시간
  breakTime?: BreakTime;          // 휴게시간 정보
  
  // 메타 정보
  createdAt?: Timestamp | Date;   // 생성 일시
  createdBy?: string;             // 생성자 (UID)
  updatedAt?: Timestamp | Date;   // 수정 일시
  updatedBy?: string;             // 수정자 (UID)
  
  // 기타
  notes?: string;                 // 특이사항
  isWorkDay?: boolean;            // 근무일 여부
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
 */
export interface ScheduleDetail {
  isWorkDay: boolean;             // 근무일 여부
  startTime: string;              // 시작 시간
  endTime: string;                // 종료 시간
  hours?: number;                 // 근무 시간
  breakTime?: BreakTime;          // 휴게시간
  isShiftReplacement?: boolean;   // 대체근무 여부
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
