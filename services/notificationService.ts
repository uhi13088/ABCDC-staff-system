/**
 * Notification Service
 * Firebase Firestore 알림 관련 CRUD 로직
 * 
 * 9가지 알림 타입 지원:
 * 1. 관리자가 출퇴근 기록 수정 → 직원에게 알림
 * 2. 직원이 출퇴근 기록 수정 → 관리자에게 알림
 * 3. 관리자에게 승인 요청 → 관리자에게 알림
 * 4. 승인 요청 처리 시 → 신청자에게 알림
 * 5. 계약서 서명 요청 시 → 직원에게 알림
 * 6. 급여 지급 완료 시 → 직원에게 알림
 * 7. 긴급 근무 모집 시 → 해당 매장 전 직원에게 알림
 * 8. 새로운 공지 등록 시 → 모든 직원에게 알림
 * 9. 결근/지각 시 → 로그인 시 해당 직원에게 알림
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, USER_ROLES } from '@/lib/constants';
import type { 
  Notification, 
  CreateNotificationParams, 
  NotificationType 
} from '@/lib/types/notification';

/**
 * 알림 생성 (단일 사용자)
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<string> {
  try {
    const notificationData: Omit<Notification, 'id'> = {
      companyId: params.companyId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      relatedId: params.relatedId,
      relatedType: params.relatedType,
      senderId: params.senderId,
      senderName: params.senderName,
      senderRole: params.senderRole,
      storeId: params.storeId,
      storeName: params.storeName,
      actionUrl: params.actionUrl,
      actionLabel: params.actionLabel,
      isRead: false,
      createdAt: new Date().toISOString(), // serverTimestamp() 대신 ISO 문자열
      expiresAt: params.expiresAt,
    };
    
    const docRef = await addDoc(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      notificationData
    );
    
    console.log('✅ 알림 생성 완료:', docRef.id, params.type);
    return docRef.id;
  } catch (error) {
    console.error('❌ 알림 생성 실패:', error);
    throw error;
  }
}

/**
 * 알림 생성 (여러 사용자에게 동시 전송)
 */
export async function createNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<string[]> {
  try {
    const notificationIds: string[] = [];
    
    for (const userId of userIds) {
      const id = await createNotification({
        ...params,
        userId,
      });
      notificationIds.push(id);
    }
    
    console.log(`✅ 알림 ${notificationIds.length}건 생성 완료:`, params.type);
    return notificationIds;
  } catch (error) {
    console.error('❌ 알림 생성 실패:', error);
    throw error;
  }
}

/**
 * 사용자 알림 목록 조회
 */
export async function getNotifications(
  userId: string,
  options?: {
    companyId?: string;
    isRead?: boolean;
    limit?: number;
  }
): Promise<Notification[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    ];
    
    if (options?.companyId) {
      constraints.push(where('companyId', '==', options.companyId));
    }
    
    if (options?.isRead !== undefined) {
      constraints.push(where('isRead', '==', options.isRead));
    }
    
    if (options?.limit) {
      constraints.push(limit(options.limit));
    }
    
    const q = query(collection(db, COLLECTIONS.NOTIFICATIONS), ...constraints);
    const snapshot = await getDocs(q);
    
    const notifications: Notification[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Notification));
    
    console.log(`✅ 알림 ${notifications.length}건 조회 완료 (userId: ${userId})`);
    return notifications;
  } catch (error) {
    console.error('❌ 알림 조회 실패:', error);
    throw error;
  }
}

/**
 * 읽지 않은 알림 개수 조회
 */
export async function getUnreadCount(
  userId: string,
  companyId?: string
): Promise<number> {
  try {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      where('isRead', '==', false),
    ];
    
    if (companyId) {
      constraints.push(where('companyId', '==', companyId));
    }
    
    const q = query(collection(db, COLLECTIONS.NOTIFICATIONS), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.size;
  } catch (error) {
    console.error('❌ 읽지 않은 알림 개수 조회 실패:', error);
    throw error;
  }
}

/**
 * 알림 읽음 처리
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
    await updateDoc(docRef, {
      isRead: true,
      readAt: new Date().toISOString(),
    });
    
    console.log('✅ 알림 읽음 처리 완료:', notificationId);
  } catch (error) {
    console.error('❌ 알림 읽음 처리 실패:', error);
    throw error;
  }
}

/**
 * 모든 알림 읽음 처리
 */
export async function markAllAsRead(
  userId: string,
  companyId?: string
): Promise<void> {
  try {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      where('isRead', '==', false),
    ];
    
    if (companyId) {
      constraints.push(where('companyId', '==', companyId));
    }
    
    const q = query(collection(db, COLLECTIONS.NOTIFICATIONS), ...constraints);
    const snapshot = await getDocs(q);
    
    const updatePromises = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, {
        isRead: true,
        readAt: new Date().toISOString(),
      })
    );
    
    await Promise.all(updatePromises);
    
    console.log(`✅ 모든 알림 읽음 처리 완료 (${snapshot.size}건)`);
  } catch (error) {
    console.error('❌ 모든 알림 읽음 처리 실패:', error);
    throw error;
  }
}

/**
 * 알림 삭제
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId));
    console.log('✅ 알림 삭제 완료:', notificationId);
  } catch (error) {
    console.error('❌ 알림 삭제 실패:', error);
    throw error;
  }
}

/**
 * 특정 매장의 모든 직원 조회 (긴급 근무 모집 알림용)
 */
export async function getStoreEmployees(
  companyId: string,
  storeId: string
): Promise<string[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('companyId', '==', companyId),
      where('storeId', '==', storeId),
      where('role', '==', USER_ROLES.EMPLOYEE),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(q);
    const userIds = snapshot.docs.map((doc) => doc.data().userId || doc.id);
    
    console.log(`✅ 매장 직원 ${userIds.length}명 조회 완료 (storeId: ${storeId})`);
    return userIds;
  } catch (error) {
    console.error('❌ 매장 직원 조회 실패:', error);
    throw error;
  }
}

/**
 * 회사의 모든 직원 조회 (공지사항 알림용)
 */
export async function getCompanyEmployees(companyId: string): Promise<string[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('companyId', '==', companyId),
      where('role', '==', USER_ROLES.EMPLOYEE),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(q);
    const userIds = snapshot.docs.map((doc) => doc.data().userId || doc.id);
    
    console.log(`✅ 회사 전체 직원 ${userIds.length}명 조회 완료 (companyId: ${companyId})`);
    return userIds;
  } catch (error) {
    console.error('❌ 회사 전체 직원 조회 실패:', error);
    throw error;
  }
}

/**
 * 회사의 모든 관리자 조회 (직원 승인 요청 알림용)
 */
export async function getCompanyAdmins(companyId: string): Promise<string[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('companyId', '==', companyId),
      where('role', 'in', [USER_ROLES.ADMIN, USER_ROLES.MANAGER]),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(q);
    const userIds = snapshot.docs.map((doc) => doc.data().userId || doc.id);
    
    console.log(`✅ 관리자 ${userIds.length}명 조회 완료 (companyId: ${companyId})`);
    return userIds;
  } catch (error) {
    console.error('❌ 관리자 조회 실패:', error);
    throw error;
  }
}
