/**
 * ========================================
 * NotificationService - 알림 자동화
 * ========================================
 * 
 * 역할:
 * 1. 시스템 이벤트를 알림으로 변환
 * 2. Firestore notifications 컬렉션에 저장
 * 3. 실시간 알림 발송 (앱 푸시)
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

// ========================================
// 타입 정의
// ========================================

export type NotificationType =
  | 'contract_signed'          // 계약 체결
  | 'schedule_updated'         // 스케줄 변경
  | 'approval_approved'        // 결재 승인
  | 'approval_rejected'        // 결재 거부
  | 'open_shift_available'     // 대타 모집
  | 'overtime_pending'         // 초과 근무 승인 대기
  | 'probation_ending'         // 수습 종료 예정
  | 'holiday_work'             // 공휴일 근무
  | 'system';                  // 시스템 공지

export interface NotificationData {
  userId: string;              // 수신자 ID
  companyId: string;           // 회사 ID
  type: NotificationType;      // 알림 유형
  title: string;               // 제목
  message: string;             // 내용
  data?: Record<string, any>;  // 추가 데이터
  isRead?: boolean;            // 읽음 여부
  createdAt?: any;             // 생성 시간
}

// ========================================
// 알림 생성
// ========================================

/**
 * 알림 생성 (Firestore에 저장)
 */
export async function createNotification(
  notificationData: NotificationData
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
      ...notificationData,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    
    console.log('🔔 알림 생성:', {
      id: docRef.id,
      type: notificationData.type,
      userId: notificationData.userId,
    });
    
    return docRef.id;
    
  } catch (error: any) {
    console.error('❌ 알림 생성 실패:', error);
    throw error;
  }
}

/**
 * 여러 사용자에게 동시 알림 발송
 */
export async function createBulkNotifications(
  userIds: string[],
  notification: Omit<NotificationData, 'userId'>
): Promise<string[]> {
  const notificationIds: string[] = [];
  
  for (const userId of userIds) {
    const id = await createNotification({
      ...notification,
      userId,
    });
    notificationIds.push(id);
  }
  
  console.log(`🔔 ${userIds.length}명에게 알림 발송 완료`);
  
  return notificationIds;
}

// ========================================
// 특정 이벤트별 알림 템플릿
// ========================================

/**
 * 계약 체결 완료 알림
 */
export async function notifyContractSigned(
  userId: string,
  companyId: string,
  contractId: string,
  employeeName: string
): Promise<void> {
  await createNotification({
    userId,
    companyId,
    type: 'contract_signed',
    title: '📝 계약이 완료되었습니다',
    message: `${employeeName}님의 전자근로계약서가 정상적으로 체결되었습니다.`,
    data: { contractId },
  });
}

/**
 * 스케줄 변경 알림
 */
export async function notifyScheduleUpdated(
  userId: string,
  companyId: string,
  scheduleId: string,
  date: string,
  changeType: 'added' | 'modified' | 'removed'
): Promise<void> {
  const messages = {
    added: `📅 ${date} 스케줄이 추가되었습니다.`,
    modified: `📅 ${date} 스케줄이 변경되었습니다.`,
    removed: `📅 ${date} 스케줄이 삭제되었습니다.`,
  };
  
  await createNotification({
    userId,
    companyId,
    type: 'schedule_updated',
    title: '📅 스케줄 변경',
    message: messages[changeType],
    data: { scheduleId, date, changeType },
  });
}

/**
 * 결재 승인 알림
 */
export async function notifyApprovalResult(
  userId: string,
  companyId: string,
  approvalId: string,
  approvalType: 'leave' | 'overtime',
  isApproved: boolean,
  rejectionReason?: string
): Promise<void> {
  const typeText = approvalType === 'leave' ? '휴가' : '연장근무';
  
  if (isApproved) {
    await createNotification({
      userId,
      companyId,
      type: 'approval_approved',
      title: `✅ ${typeText} 승인`,
      message: `${typeText} 신청이 승인되었습니다.`,
      data: { approvalId, approvalType },
    });
  } else {
    await createNotification({
      userId,
      companyId,
      type: 'approval_rejected',
      title: `❌ ${typeText} 반려`,
      message: rejectionReason || `${typeText} 신청이 반려되었습니다.`,
      data: { approvalId, approvalType, rejectionReason },
    });
  }
}

/**
 * 대타 모집 알림
 */
export async function notifyOpenShiftAvailable(
  userIds: string[],
  companyId: string,
  openShiftId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<void> {
  await createBulkNotifications(userIds, {
    companyId,
    type: 'open_shift_available',
    title: '💼 대타 근무 모집',
    message: `${date} ${startTime}~${endTime} 근무 가능한 분을 찾고 있습니다.`,
    data: { openShiftId, date, startTime, endTime },
  });
}

/**
 * 초과 근무 승인 대기 알림 (관리자용)
 */
export async function notifyOvertimePending(
  adminUserId: string,
  companyId: string,
  attendanceId: string,
  employeeName: string,
  date: string,
  overBufferMinutes: number
): Promise<void> {
  await createNotification({
    userId: adminUserId,
    companyId,
    type: 'overtime_pending',
    title: '⚠️ 초과 근무 승인 필요',
    message: `${employeeName}님이 ${date}에 마감 시간을 ${overBufferMinutes}분 초과했습니다. 확인이 필요합니다.`,
    data: { attendanceId, employeeName, date, overBufferMinutes },
  });
}

/**
 * 수습 종료 예정 알림 (관리자용)
 */
export async function notifyProbationEnding(
  adminUserId: string,
  companyId: string,
  employeeId: string,
  employeeName: string,
  endDate: string
): Promise<void> {
  await createNotification({
    userId: adminUserId,
    companyId,
    type: 'probation_ending',
    title: '👶 수습 기간 종료 예정',
    message: `${employeeName}님의 수습 기간이 ${endDate}에 종료됩니다.`,
    data: { employeeId, employeeName, endDate },
  });
}

/**
 * 공휴일 근무 알림
 */
export async function notifyHolidayWork(
  userId: string,
  companyId: string,
  date: string,
  holidayMultiplier: number
): Promise<void> {
  await createNotification({
    userId,
    companyId,
    type: 'holiday_work',
    title: '🎉 공휴일 근무',
    message: `${date}는 공휴일입니다. 근무 시 급여 ${holidayMultiplier}배가 적용됩니다.`,
    data: { date, holidayMultiplier },
  });
}

// ========================================
// 알림 조회 및 관리
// ========================================

/**
 * 사용자 알림 목록 조회
 */
export async function getNotifications(
  userId: string,
  limit: number = 50
): Promise<NotificationData[]> {
  const notifQuery = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limit)
  );
  
  const snapshot = await getDocs(notifQuery);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as NotificationData[];
}

/**
 * 알림 읽음 처리
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const notifRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
  await updateDoc(notifRef, {
    isRead: true,
    readAt: serverTimestamp(),
  });
}

/**
 * 모든 알림 읽음 처리
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const notifQuery = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    where('isRead', '==', false)
  );
  
  const snapshot = await getDocs(notifQuery);
  
  const updates = snapshot.docs.map(doc => 
    updateDoc(doc.ref, {
      isRead: true,
      readAt: serverTimestamp(),
    })
  );
  
  await Promise.all(updates);
  
  console.log(`🔔 ${updates.length}개 알림 읽음 처리 완료`);
}

// ========================================
// Export
// ========================================

export default {
  createNotification,
  createBulkNotifications,
  
  // 특정 이벤트 알림
  notifyContractSigned,
  notifyScheduleUpdated,
  notifyApprovalResult,
  notifyOpenShiftAvailable,
  notifyOvertimePending,
  notifyProbationEnding,
  notifyHolidayWork,
  
  // 조회 및 관리
  getNotifications,
  markAsRead,
  markAllAsRead,
};
