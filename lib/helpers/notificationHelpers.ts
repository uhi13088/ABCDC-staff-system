/**
 * Notification Helper Functions
 * 9가지 알림 시나리오를 쉽게 생성할 수 있는 헬퍼 함수들
 */

import {
  createNotification,
  createNotifications,
  getStoreEmployees,
  getCompanyEmployees,
  getCompanyAdmins,
} from '@/services/notificationService';
import { NOTIFICATION_TEMPLATES } from '@/lib/types/notification';
import type { CreateNotificationParams } from '@/lib/types/notification';

/**
 * 1. 관리자가 출퇴근 기록 수정 → 직원에게 알림
 */
export async function notifyAttendanceUpdatedByAdmin(params: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  adminId: string;
  adminName: string;
  date: string;
  attendanceId: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.ATTENDANCE_UPDATED_BY_ADMIN;
  
  await createNotification({
    companyId: params.companyId,
    userId: params.employeeId,
    type: 'ATTENDANCE_UPDATED_BY_ADMIN',
    title: template.title,
    message: template.message(params.adminName, params.date),
    relatedId: params.attendanceId,
    relatedType: 'attendance',
    senderId: params.adminId,
    senderName: params.adminName,
    senderRole: 'admin',
    actionUrl: `/admin-dashboard?tab=attendance`,
    actionLabel: template.actionLabel,
  });
  
  console.log(`✅ 알림 전송: 관리자 출퇴근 수정 (직원: ${params.employeeName})`);
}

/**
 * 2. 직원이 출퇴근 기록 수정 → 관리자에게 알림
 */
export async function notifyAttendanceUpdatedByEmployee(params: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  attendanceId: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.ATTENDANCE_UPDATED_BY_EMPLOYEE;
  
  // 관리자 목록 조회
  const adminIds = await getCompanyAdmins(params.companyId);
  
  if (adminIds.length === 0) {
    console.warn('⚠️ 관리자가 없어서 알림을 보낼 수 없습니다');
    return;
  }
  
  await createNotifications(adminIds, {
    companyId: params.companyId,
    type: 'ATTENDANCE_UPDATED_BY_EMPLOYEE',
    title: template.title,
    message: template.message(params.employeeName, params.date),
    relatedId: params.attendanceId,
    relatedType: 'attendance',
    senderId: params.employeeId,
    senderName: params.employeeName,
    senderRole: 'employee',
    actionUrl: `/admin-dashboard?tab=attendance`,
    actionLabel: template.actionLabel,
  });
  
  console.log(`✅ 알림 전송: 직원 출퇴근 수정 (관리자 ${adminIds.length}명)`);
}

/**
 * 3. 관리자에게 승인 요청 → 관리자에게 알림
 */
export async function notifyApprovalRequested(params: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  approvalType: string; // '휴가', '초과근무', '근무시간 조정'
  approvalId: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.APPROVAL_REQUESTED;
  
  // 관리자 목록 조회
  const adminIds = await getCompanyAdmins(params.companyId);
  
  if (adminIds.length === 0) {
    console.warn('⚠️ 관리자가 없어서 알림을 보낼 수 없습니다');
    return;
  }
  
  await createNotifications(adminIds, {
    companyId: params.companyId,
    type: 'APPROVAL_REQUESTED',
    title: template.title,
    message: template.message(params.employeeName, params.approvalType),
    relatedId: params.approvalId,
    relatedType: 'approval',
    senderId: params.employeeId,
    senderName: params.employeeName,
    senderRole: 'employee',
    actionUrl: `/admin-dashboard?tab=approvals`,
    actionLabel: template.actionLabel,
  });
  
  console.log(`✅ 알림 전송: 승인 요청 (관리자 ${adminIds.length}명)`);
}

/**
 * 4. 승인 요청 처리 → 신청자에게 알림
 */
export async function notifyApprovalProcessed(params: {
  companyId: string;
  employeeId: string;
  approvalType: string; // '휴가', '초과근무', '근무시간 조정'
  status: string; // '승인' or '거부'
  approvalId: string;
  adminId: string;
  adminName: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.APPROVAL_PROCESSED;
  
  await createNotification({
    companyId: params.companyId,
    userId: params.employeeId,
    type: 'APPROVAL_PROCESSED',
    title: template.title,
    message: template.message(params.approvalType, params.status),
    relatedId: params.approvalId,
    relatedType: 'approval',
    senderId: params.adminId,
    senderName: params.adminName,
    senderRole: 'admin',
    actionUrl: `/admin-dashboard?tab=approvals`,
    actionLabel: template.actionLabel,
  });
  
  console.log(`✅ 알림 전송: 승인 처리 (직원: ${params.employeeId})`);
}

/**
 * 5. 계약서 서명 요청 → 직원에게 알림
 */
export async function notifyContractSignRequested(params: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  companyName: string;
  contractId: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.CONTRACT_SIGN_REQUESTED;
  
  await createNotification({
    companyId: params.companyId,
    userId: params.employeeId,
    type: 'CONTRACT_SIGN_REQUESTED',
    title: template.title,
    message: template.message(params.companyName),
    relatedId: params.contractId,
    relatedType: 'contract',
    actionUrl: `/contract-sign?id=${params.contractId}`,
    actionLabel: template.actionLabel,
  });
  
  console.log(`✅ 알림 전송: 계약서 서명 요청 (직원: ${params.employeeName})`);
}

/**
 * 6. 급여 지급 완료 → 직원에게 알림
 */
export async function notifySalaryPaid(params: {
  companyId: string;
  employeeId: string;
  employeeName: string;
  month: string; // '2024-12'
  amount: number;
  salaryId: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.SALARY_PAID;
  
  await createNotification({
    companyId: params.companyId,
    userId: params.employeeId,
    type: 'SALARY_PAID',
    title: template.title,
    message: template.message(params.month, params.amount.toLocaleString()),
    relatedId: params.salaryId,
    relatedType: 'salary',
    actionUrl: `/admin-dashboard?tab=salary`,
    actionLabel: template.actionLabel,
  });
  
  console.log(`✅ 알림 전송: 급여 지급 (직원: ${params.employeeName})`);
}

/**
 * 7. 긴급 근무 모집 → 해당 매장 전 직원에게 알림
 */
export async function notifyEmergencyShiftPosted(params: {
  companyId: string;
  storeId: string;
  storeName: string;
  date: string; // '2024-12-15'
  time: string; // '09:00-18:00'
  incentive: number; // 추가 시급
  openShiftId: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.EMERGENCY_SHIFT_POSTED;
  
  // 해당 매장 직원 목록 조회
  const employeeIds = await getStoreEmployees(params.companyId, params.storeId);
  
  if (employeeIds.length === 0) {
    console.warn('⚠️ 해당 매장에 직원이 없어서 알림을 보낼 수 없습니다');
    return;
  }
  
  await createNotifications(employeeIds, {
    companyId: params.companyId,
    type: 'EMERGENCY_SHIFT_POSTED',
    title: template.title,
    message: template.message(
      params.storeName,
      params.date,
      params.time,
      params.incentive.toLocaleString()
    ),
    relatedId: params.openShiftId,
    relatedType: 'openShift',
    storeId: params.storeId,
    storeName: params.storeName,
    actionUrl: `/admin-dashboard?tab=attendance`,
    actionLabel: template.actionLabel,
  });
  
  console.log(`✅ 알림 전송: 긴급 근무 모집 (직원 ${employeeIds.length}명)`);
}

/**
 * 8. 새 공지사항 → 모든 직원에게 알림
 */
export async function notifyNoticeCreated(params: {
  companyId: string;
  noticeTitle: string;
  noticeId: string;
  adminId: string;
  adminName: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.NOTICE_CREATED;
  
  // 회사 전체 직원 조회
  const employeeIds = await getCompanyEmployees(params.companyId);
  
  if (employeeIds.length === 0) {
    console.warn('⚠️ 직원이 없어서 알림을 보낼 수 없습니다');
    return;
  }
  
  await createNotifications(employeeIds, {
    companyId: params.companyId,
    type: 'NOTICE_CREATED',
    title: template.title,
    message: template.message(params.noticeTitle),
    relatedId: params.noticeId,
    relatedType: 'notice',
    senderId: params.adminId,
    senderName: params.adminName,
    senderRole: 'admin',
    actionUrl: `/admin-dashboard?tab=notices`,
    actionLabel: template.actionLabel,
  });
  
  console.log(`✅ 알림 전송: 새 공지사항 (직원 ${employeeIds.length}명)`);
}

/**
 * 9. 결근/지각 알림 → 로그인 시 해당 직원에게 알림
 */
export async function notifyAttendanceAlert(params: {
  companyId: string;
  employeeId: string;
  date: string; // '2024-12-15'
  status: string; // '결근' or '지각'
  attendanceId: string;
}): Promise<void> {
  const template = NOTIFICATION_TEMPLATES.ATTENDANCE_ALERT;
  
  await createNotification({
    companyId: params.companyId,
    userId: params.employeeId,
    type: 'ATTENDANCE_ALERT',
    title: template.title,
    message: template.message(params.date, params.status),
    relatedId: params.attendanceId,
    relatedType: 'attendance',
    actionUrl: `/admin-dashboard?tab=attendance`,
    actionLabel: template.actionLabel,
  });
  
  console.log(`✅ 알림 전송: 결근/지각 알림 (직원: ${params.employeeId})`);
}
