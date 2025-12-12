/**
 * 근태 관련 타입 정의 (Attendance Types)
 * FIELD_NAMING_STANDARD.md 기준 (듀얼 필드 포함)
 */

import { DateTimeType } from './common';

/**
 * 근태 상태
 */
export type AttendanceStatus = 
  | 'present'     // 정상 출근
  | 'absent'      // 결근
  | 'late'        // 지각
  | 'early_leave' // 조퇴
  | 'leave';      // 휴가

/**
 * 근태 기록 (Attendance Record)
 * 백업: /home/user/webapp-backup/admin-dashboard.html 라인 3316~3473
 * 원본 HTML 기준 필드명 사용
 */
export interface AttendanceRecord {
  id: string;
  
  // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
  userId: string;
  
  // 하위 호환성 필드
  uid: string;
  
  // 직원 정보
  name?: string;              // 직원 이름 (백업에서 employeeName 또는 name)
  employeeName?: string;      // 백업에서 사용 (name과 동일)
  companyId: string;
  storeId?: string;
  store?: string;
  
  // 날짜/시간 (원본 HTML 기준)
  date: string;               // YYYY-MM-DD
  clockIn?: string;           // HH:MM 형식
  clockOut?: string;          // HH:MM 형식
  
  // 근무 유형
  workType?: string;          // '정규근무', '긴급근무' 등
  
  // 근무시간 (원본 HTML에서는 계산됨)
  workMinutes?: number;
  
  // 상태 (백업에서 자동 계산됨)
  status?: AttendanceStatus | string;  // 'present', 'absent', 'late', 'early_leave' 등
  
  // 결근 사유
  absentReason?: string;
  reasonSubmittedAt?: DateTimeType;
  
  // 메타데이터
  createdAt?: DateTimeType;
  updatedAt?: DateTimeType;
}

/**
 * 근태 상태 계산 결과 (백업: calculateAttendanceStatus 함수)
 */
export interface AttendanceStatusResult {
  text: string;    // '정상', '지각', '조퇴', '지각+조퇴', '결근', '근무중'
  class: string;   // 'success', 'danger', 'info'
}

/**
 * 휴가 유형
 */
export type LeaveType = 
  | 'annual'      // 연차
  | 'sick'        // 병가
  | 'personal'    // 개인사유
  | 'maternity'   // 출산휴가
  | 'other';      // 기타

/**
 * 휴가 신청
 */
export interface LeaveRequest {
  id: string;
  
  // 🔥 표준 필드
  userId: string;
  
  // 하위 호환성 필드
  employeeId?: string;
  
  employeeName: string;
  companyId: string;
  storeId?: string;
  
  // 휴가 정보
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  
  // 상태
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: DateTimeType;
  rejectedReason?: string;
  
  // 메타데이터
  createdAt: DateTimeType;
  updatedAt?: DateTimeType;
}

/**
 * 긴급 모집 (Emergency Recruitment)
 */
export interface EmergencyRecruitment {
  id: string;
  companyId: string;
  storeId: string;
  store: string;
  
  // 근무 정보
  date: string;
  startTime: string;
  endTime: string;
  requiredCount: number;
  currentCount: number;
  
  // 상태
  status: 'open' | 'closed' | 'cancelled';
  
  // 신청자 목록
  applicants: Array<{
    userId: string;
    userName: string;
    appliedAt: DateTimeType;
  }>;
  
  // 메타데이터
  createdAt: DateTimeType;
  updatedAt?: DateTimeType;
}

/**
 * 근태 통계
 */
export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  leaveDays: number;
  totalWorkHours: number;
}

/**
 * 근태 필터 옵션 (백업 기준)
 */
export interface AttendanceFilterOptions {
  month?: string;                    // YYYY-MM (attendanceMonth)
  store?: string;                    // 매장명
  storeId?: string;                  // 매장 ID (attendanceStoreFilter)
  employmentStatus?: 'active' | 'resigned' | '';  // 근무상태 필터 (attendanceEmploymentStatusFilter)
  status?: AttendanceStatus | string;
  userId?: string;
}
