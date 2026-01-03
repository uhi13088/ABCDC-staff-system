/**
 * ========================================
 * Schedule Service v3.0 - The Notifier
 * ========================================
 * 
 * 핵심 기능:
 * 1. 스케줄 배포/수정 시 자동 알림
 * 2. 결원 발생 시 Open Shift 자동 생성
 * 3. 직원 퇴사 시 스케줄 정리
 * 
 * 이벤트 흐름:
 * schedule:published/updated → [Notification]
 * schedule:deleted + employee:resigned → [Open Shift Generation]
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
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import {
  EventBus,
  executeTransaction,
  createEvent,
  serverTime,
  type SystemEvent,
} from '@/lib/eventSystem';

// ========================================
// 타입 정의
// ========================================

interface ScheduleEventPayload {
  scheduleId?: string;
  userId: string;
  companyId: string;
  storeId?: string;
  storeName?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  action: 'published' | 'updated' | 'deleted';
  triggeredBy?: string;
}

interface OpenShiftPayload {
  companyId: string;
  storeId: string;
  storeName?: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: 'resignation' | 'manual_delete' | 'other';
  originalUserId?: string;
}

// ========================================
// 이벤트 핸들러 등록
// ========================================

export function registerScheduleEventHandlers(): void {
  EventBus.on('schedule:published', handleSchedulePublished);
  EventBus.on('schedule:updated', handleScheduleUpdated);
  EventBus.on('schedule:deleted', handleScheduleDeleted);
  EventBus.on('employee:resigned', handleEmployeeResigned);
  console.log('✅ Schedule 이벤트 핸들러 등록 완료');
}

// ========================================
// 핵심 로직: 스케줄 알림
// ========================================

/**
 * 스케줄 배포 이벤트 핸들러
 */
async function handleSchedulePublished(event: SystemEvent): Promise<void> {
  const payload = event.payload as ScheduleEventPayload;
  
  console.log('📅 스케줄 배포 알림 처리:', payload.date);
  
  await sendScheduleNotification(payload, 'published');
  
  console.log('✅ 스케줄 배포 알림 완료');
}

/**
 * 스케줄 수정 이벤트 핸들러
 */
async function handleScheduleUpdated(event: SystemEvent): Promise<void> {
  const payload = event.payload as ScheduleEventPayload;
  
  console.log('📅 스케줄 수정 알림 처리:', payload.date);
  
  await sendScheduleNotification(payload, 'updated');
  
  console.log('✅ 스케줄 수정 알림 완료');
}

/**
 * 스케줄 삭제 이벤트 핸들러 (Open Shift 생성)
 */
async function handleScheduleDeleted(event: SystemEvent): Promise<void> {
  const payload = event.payload as ScheduleEventPayload;
  
  console.log('🗑️ 스케줄 삭제 처리:', payload.date);
  
  // Open Shift 자동 생성 여부 확인 (설정에 따라)
  // 여기서는 자동 생성하지 않고, 관리자에게 알림만 발송
  await sendScheduleDeletionAlert(payload);
  
  console.log('✅ 스케줄 삭제 처리 완료');
}

/**
 * 직원 퇴사 이벤트 핸들러
 */
async function handleEmployeeResigned(event: SystemEvent): Promise<void> {
  const { userId, companyId } = event.payload;
  
  console.log('👋 직원 퇴사 처리 - 스케줄 정리:', userId);
  
  // 1. 미래 스케줄 조회
  const today = new Date().toISOString().split('T')[0];
  
  const futureSchedulesQuery = query(
    collection(db, COLLECTIONS.SCHEDULES),
    where('userId', '==', userId),
    where('companyId', '==', companyId),
    where('date', '>=', today)
  );
  
  const futureSchedulesSnap = await getDocs(futureSchedulesQuery);
  
  if (futureSchedulesSnap.empty) {
    console.log('⚠️ 미래 스케줄 없음');
    return;
  }
  
  console.log(`📋 미래 스케줄 ${futureSchedulesSnap.size}개 발견`);
  
  // 2. 각 스케줄을 Open Shift로 변환
  for (const doc of futureSchedulesSnap.docs) {
    const schedule = doc.data();
    
    // Open Shift 생성
    await createOpenShift({
      companyId,
      storeId: schedule.storeId || '',
      storeName: schedule.storeName || '',
      date: schedule.date,
      startTime: schedule.plannedTimes?.[0]?.startTime || '09:00',
      endTime: schedule.plannedTimes?.[0]?.endTime || '18:00',
      reason: 'resignation',
      originalUserId: userId,
    });
    
    // 스케줄 삭제
    await deleteDoc(doc.ref);
    
    console.log(`  ✅ Open Shift 생성 및 스케줄 삭제: ${schedule.date}`);
  }
  
  console.log('✅ 직원 퇴사 처리 완료');
}

// ========================================
// Sub-Functions
// ========================================

/**
 * 스케줄 알림 발송
 */
async function sendScheduleNotification(
  payload: ScheduleEventPayload,
  action: 'published' | 'updated'
): Promise<void> {
  const { userId, companyId, date, startTime, endTime } = payload;
  
  // 직원 정보 조회
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
  const userName = userDoc.exists() ? userDoc.data().name : '직원';
  
  const actionText = action === 'published' ? '등록' : '변경';
  const timeText = startTime && endTime ? ` (${startTime} ~ ${endTime})` : '';
  
  // 알림 생성
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    companyId,
    userId,
    type: `schedule_${action}`,
    title: `근무 스케줄 ${actionText}`,
    message: `${date} 근무 스케줄이 ${actionText}되었습니다${timeText}. 앱에서 확인해주세요.`,
    actionUrl: `/schedule?date=${date}`,
    read: false,
    createdAt: serverTime(),
  });
  
  console.log(`  🔔 알림 발송: ${userName}님에게 스케줄 ${actionText} 알림`);
}

/**
 * 스케줄 삭제 알림 (관리자에게)
 */
async function sendScheduleDeletionAlert(payload: ScheduleEventPayload): Promise<void> {
  const { companyId, storeId, date, startTime, endTime } = payload;
  
  // 매장의 매니저 조회
  const managersQuery = query(
    collection(db, COLLECTIONS.USERS),
    where('companyId', '==', companyId),
    where('role', 'in', ['admin', 'store_manager'])
  );
  
  if (storeId) {
    // storeId 필터 추가는 복합 쿼리 제약으로 클라이언트에서 필터링
  }
  
  const managersSnap = await getDocs(managersQuery);
  
  const timeText = startTime && endTime ? `${startTime} ~ ${endTime}` : '';
  
  // 각 매니저에게 알림
  for (const doc of managersSnap.docs) {
    const manager = doc.data();
    
    // 매장 필터링
    if (storeId && manager.store !== storeId) {
      continue;
    }
    
    await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
      companyId,
      userId: manager.uid,
      type: 'schedule_deleted_alert',
      title: '스케줄 결원 발생',
      message: `${date} ${timeText} 스케줄에 결원이 발생했습니다. 대타 모집을 고려해주세요.`,
      actionUrl: `/open-shifts?date=${date}`,
      read: false,
      createdAt: serverTime(),
    });
  }
  
  console.log(`  🔔 관리자 알림 발송: ${managersSnap.size}명`);
}

/**
 * Open Shift 생성
 */
async function createOpenShift(payload: OpenShiftPayload): Promise<void> {
  const {
    companyId,
    storeId,
    storeName,
    date,
    startTime,
    endTime,
    reason,
    originalUserId,
  } = payload;
  
  // Open Shift 문서 생성
  await addDoc(collection(db, COLLECTIONS.OPEN_SHIFTS), {
    companyId,
    storeId,
    storeName: storeName || '',
    date,
    startTime,
    endTime,
    status: 'open',
    reason,
    originalUserId: originalUserId || '',
    applicants: [],
    selectedUserId: null,
    requiredCount: 1,
    currentCount: 0,
    createdAt: serverTime(),
    updatedAt: serverTime(),
  });
  
  console.log(`  ✅ Open Shift 생성: ${date} ${startTime}~${endTime}`);
}

// ========================================
// Public API
// ========================================

/**
 * 스케줄 배포
 */
export async function publishSchedule(
  scheduleId: string,
  publishedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📅 스케줄 배포 시작:', scheduleId);
    
    // 1. 스케줄 조회
    const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, scheduleId);
    const scheduleDoc = await getDoc(scheduleRef);
    
    if (!scheduleDoc.exists()) {
      throw new Error('스케줄을 찾을 수 없습니다.');
    }
    
    const schedule = scheduleDoc.data();
    
    // 2. 상태 업데이트
    await updateDoc(scheduleRef, {
      status: 'published',
      publishedBy,
      publishedAt: serverTime(),
      updatedAt: serverTime(),
    });
    
    console.log('✅ 스케줄 상태 업데이트 완료');
    
    // 3. 이벤트 발행
    await EventBus.emit(createEvent(
      'schedule:published',
      {
        scheduleId,
        userId: schedule.userId,
        companyId: schedule.companyId,
        storeId: schedule.storeId,
        storeName: schedule.storeName,
        date: schedule.date,
        startTime: schedule.plannedTimes?.[0]?.startTime,
        endTime: schedule.plannedTimes?.[0]?.endTime,
        action: 'published',
        triggeredBy: publishedBy,
      } as ScheduleEventPayload,
      {
        userId: schedule.userId,
        companyId: schedule.companyId,
        triggeredBy: publishedBy,
      }
    ));
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ 스케줄 배포 실패:', error);
    return {
      success: false,
      error: error.message || '스케줄 배포 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 스케줄 수정
 */
export async function updateSchedule(
  scheduleId: string,
  updates: any,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📅 스케줄 수정 시작:', scheduleId);
    
    const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, scheduleId);
    const scheduleDoc = await getDoc(scheduleRef);
    
    if (!scheduleDoc.exists()) {
      throw new Error('스케줄을 찾을 수 없습니다.');
    }
    
    const schedule = scheduleDoc.data();
    
    // 업데이트
    await updateDoc(scheduleRef, {
      ...updates,
      updatedBy,
      updatedAt: serverTime(),
    });
    
    // 이벤트 발행
    await EventBus.emit(createEvent(
      'schedule:updated',
      {
        scheduleId,
        userId: schedule.userId,
        companyId: schedule.companyId,
        storeId: schedule.storeId,
        date: schedule.date,
        startTime: updates.startTime || schedule.plannedTimes?.[0]?.startTime,
        endTime: updates.endTime || schedule.plannedTimes?.[0]?.endTime,
        action: 'updated',
        triggeredBy: updatedBy,
      } as ScheduleEventPayload
    ));
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ 스케줄 수정 실패:', error);
    return {
      success: false,
      error: error.message || '스케줄 수정 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 스케줄 삭제
 */
export async function deleteSchedule(
  scheduleId: string,
  deletedBy: string,
  createOpenShift: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ 스케줄 삭제 시작:', scheduleId);
    
    const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, scheduleId);
    const scheduleDoc = await getDoc(scheduleRef);
    
    if (!scheduleDoc.exists()) {
      throw new Error('스케줄을 찾을 수 없습니다.');
    }
    
    const schedule = scheduleDoc.data();
    
    // 이벤트 발행
    await EventBus.emit(createEvent(
      'schedule:deleted',
      {
        scheduleId,
        userId: schedule.userId,
        companyId: schedule.companyId,
        storeId: schedule.storeId,
        storeName: schedule.storeName,
        date: schedule.date,
        startTime: schedule.plannedTimes?.[0]?.startTime,
        endTime: schedule.plannedTimes?.[0]?.endTime,
        action: 'deleted',
        triggeredBy: deletedBy,
      } as ScheduleEventPayload
    ));
    
    // Open Shift 생성 옵션
    if (createOpenShift) {
      await createOpenShift({
        companyId: schedule.companyId,
        storeId: schedule.storeId || '',
        storeName: schedule.storeName || '',
        date: schedule.date,
        startTime: schedule.plannedTimes?.[0]?.startTime || '09:00',
        endTime: schedule.plannedTimes?.[0]?.endTime || '18:00',
        reason: 'manual_delete',
        originalUserId: schedule.userId,
      });
    }
    
    // 삭제
    await deleteDoc(scheduleRef);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ 스케줄 삭제 실패:', error);
    return {
      success: false,
      error: error.message || '스케줄 삭제 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 직원 퇴사 처리
 */
export async function resignEmployee(
  userId: string,
  companyId: string,
  resignedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('👋 직원 퇴사 처리 시작:', userId);
    
    // 직원 상태 업데이트
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    
    await updateDoc(userRef, {
      employmentStatus: 'resigned',
      resignedAt: serverTime(),
      resignedBy,
      updatedAt: serverTime(),
    });
    
    // 이벤트 발행 (스케줄 정리 트리거)
    await EventBus.emit(createEvent(
      'employee:resigned',
      {
        userId,
        companyId,
        resignedBy,
        resignedAt: new Date(),
      },
      {
        userId,
        companyId,
        triggeredBy: resignedBy,
      }
    ));
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ 직원 퇴사 처리 실패:', error);
    return {
      success: false,
      error: error.message || '직원 퇴사 처리 중 오류가 발생했습니다.',
    };
  }
}

// ========================================
// 초기화
// ========================================

registerScheduleEventHandlers();
