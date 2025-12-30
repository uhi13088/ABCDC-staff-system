/**
 * Approval Types
 * 승인 관리 타입 정의
 * 
 * @source /home/user/webapp-backup/admin-dashboard.html (lines 4446~4645)
 */

import type { TimestampInput } from '@/lib/utils/timestamp';

export type ApprovalType = 'vacation' | 'overtime' | 'absence' | 'shift' | 'purchase' | 'disposal' | 'resignation';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// 휴가 승인 데이터
export interface VacationData {
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

// 연장근무 승인 데이터
export interface OvertimeData {
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

// 구매 승인 데이터
export interface PurchaseData {
  item: string;
  quantity: number;
  price?: number;
  reason?: string;
}

// 폐기 승인 데이터
export interface DisposalData {
  category: string;
  description?: string;
  quantity?: number;
}

// 퇴직서 승인 데이터
export interface ResignationData {
  resignationDate: string;
  reason?: string;
}

// 결근 승인 데이터
export interface AbsenceData {
  date: string;
  startTime: string;
  endTime: string;
  storeName: string;
  reason?: string;
}

// 교대근무 승인 데이터
export interface ShiftData {
  requesterName: string;
  matchedUserName: string;
  workDate: string;
  workStartTime: string;
  workEndTime: string;
  store: string;
  reason?: string;
}

// 승인 문서
export interface Approval {
  id: string;
  type: ApprovalType;
  applicantName: string;
  status: ApprovalStatus;
  createdAt: TimestampInput;
  companyId?: string;
  data: VacationData | OvertimeData | PurchaseData | DisposalData | ResignationData | AbsenceData | ShiftData;
}

// 교대근무 요청 (shift_requests 컬렉션)
export interface ShiftRequest {
  id: string;
  requesterName: string;
  matchedUserName: string;
  workDate: string;
  workStartTime: string;
  workEndTime: string;
  store: string;
  reason?: string;
  approvedByAdmin: boolean;
  status: string;
  companyId?: string;
  matchedAt?: TimestampInput;
  createdAt?: TimestampInput;
}

// 승인 요청 (관리자용)
export interface ApprovalRequest {
  id: string;
  companyId: string;
  userId: string;  // 표준 필드명 (요청자 UID)
  requesterId?: string;  // Legacy 호환
  requesterName: string;
  requesterEmail?: string;
  type: string;
  title?: string;
  content?: string;
  amount?: number;
  attachments?: string[];
  relatedId?: string;
  metadata?: Record<string, unknown>;
  status: ApprovalStatus;
  approverId?: string;
  approverName?: string;
  approvedAt?: TimestampInput;
  rejectionReason?: string;
  createdAt?: TimestampInput;
  updatedAt?: TimestampInput;
}

// 승인 필터
export interface ApprovalFilterOptions {
  type: ApprovalType | '';
  status: ApprovalStatus | '';
}

// 승인 요약 통계
export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  byType: Record<ApprovalType, number>;
}
