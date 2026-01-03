/**
 * ========================================
 * Approval Service v3.0 - The Automator
 * ========================================
 * 
 * 핵심 기능:
 * 1. 휴가 승인 시 스케줄 자동 변경 + Attendance 생성
 * 2. 연장근무 승인 시 overtimeCap 자동 설정
 * 3. 결재 거부 시 원상 복구
 * 
 * 이벤트 흐름:
 * approval:approved → [Schedule Update, Attendance Generation, Notification]
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
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
import NotificationService from './notificationService';

// ========================================
// 타입 정의
// ========================================

type ApprovalType = 'leave' | 'overtime' | 'schedule_change' | 'other';

interface ApprovalPayload {
  approvalId: string;
  type: ApprovalType;
  userId: string;
  companyId: string;
  storeId?: string;
  data: any; // 타입별 데이터
  approvedBy: string;
  approvedAt: Date;
}

interface LeaveData {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  leaveType: 'annual' | 'sick' | 'personal' | 'other';
  reason?: string;
}

interface OvertimeData {
  date: string; // YYYY-MM-DD
  requestedMinutes: number;
  reason?: string;
}

// ========================================
// 이벤트 핸들러 등록
// ========================================

export function registerApprovalEventHandlers(): void {
  EventBus.on('approval:approved', handleApprovalApproved);
  EventBus.on('approval:rejected', handleApprovalRejected);
  console.log('✅ Approval 이벤트 핸들러 등록 완료');
}

// ========================================
// 핵심 로직: 결재 승인 처리
// ========================================

/**
 * 결재 승인 이벤트 핸들러
 */
async function handleApprovalApproved(event: SystemEvent): Promise<void> {
  const payload = event.payload as ApprovalPayload;
  
  console.log(`📋 결재 승인 처리 시작 [${payload.type}]:`, payload.approvalId);
  
  // 타입별 처리
  switch (payload.type) {
    case 'leave':
      await handleLeaveApproval(payload);
      break;
    case 'overtime':
      await handleOvertimeApproval(payload);
      break;
    case 'schedule_change':
      await handleScheduleChangeApproval(payload);
      break;
    default:
      console.log(`⚠️ 알 수 없는 결재 타입: ${payload.type}`);
  }
  
  // 알림 발송
  await sendApprovalNotification(payload, 'approved');
  
  console.log('✅ 결재 승인 처리 완료');
}

/**
 * 결재 거부 이벤트 핸들러
 */
async function handleApprovalRejected(event: SystemEvent): Promise<void> {
  const payload = event.payload as ApprovalPayload;
  
  console.log(`📋 결재 거부 처리 시작:`, payload.approvalId);
  
  // 알림 발송
  await sendApprovalNotification(payload, 'rejected');
  
  console.log('✅ 결재 거부 처리 완료');
}

// ========================================
// Sub-Functions: 휴가 승인
// ========================================

/**
 * 휴가 승인 처리
 * 
 * 자동화 체인:
 * 1. 해당 날짜의 스케줄 삭제 또는 type: 'holiday'로 변경
 * 2. Attendance에 'paid_leave' 기록 생성
 */
async function handleLeaveApproval(payload: ApprovalPayload): Promise<void> {
  const leaveData = payload.data as LeaveData;
  
  console.log('  🏖️ 휴가 승인 처리:', leaveData);
  
  // 날짜 범위 계산
  const dates = getDatesInRange(leaveData.startDate, leaveData.endDate);
  
  console.log(`  📅 휴가 기간: ${dates.length}일`);
  
  // 트랜잭션으로 원자적 처리
  const result = await executeTransaction(
    'Leave-Approval-Chain',
    async (transaction) => {
      for (const date of dates) {
        // 1. 스케줄 삭제 또는 변경
        await updateScheduleForLeave(transaction, payload.userId, payload.companyId, date);
        
        // 2. Attendance 생성은 트랜잭션 밖에서 (read 후 write 불가)
      }
      
      return { success: true };
    }
  );
  
  if (result.success) {
    // 3. Attendance 생성 (트랜잭션 외부)
    for (const date of dates) {
      await createPaidLeaveAttendance(payload, date, leaveData);
    }
    
    console.log('  ✅ 휴가 승인 처리 완료');
  } else {
    console.error('  ❌ 휴가 승인 처리 실패:', result.error);
    throw new Error(result.error);
  }
}

/**
 * 스케줄 업데이트 (휴가)
 */
async function updateScheduleForLeave(
  transaction: any,
  userId: string,
  companyId: string,
  date: string
): Promise<void> {
  // 해당 날짜의 스케줄 조회
  const scheduleQuery = query(
    collection(db, COLLECTIONS.SCHEDULES),
    where('userId', '==', userId),
    where('companyId', '==', companyId),
    where('date', '==', date)
  );
  
  const scheduleSnap = await getDocs(scheduleQuery);
  
  if (!scheduleSnap.empty) {
    // 스케줄이 있으면 삭제
    for (const doc of scheduleSnap.docs) {
      await deleteDoc(doc.ref);
      console.log(`    🗑️ 스케줄 삭제: ${date}`);
    }
  }
}

/**
 * 유급휴가 Attendance 생성
 */
async function createPaidLeaveAttendance(
  payload: ApprovalPayload,
  date: string,
  leaveData: LeaveData
): Promise<void> {
  // 기존 Attendance가 있는지 확인
  const existingQuery = query(
    collection(db, COLLECTIONS.ATTENDANCE),
    where('userId', '==', payload.userId),
    where('companyId', '==', payload.companyId),
    where('date', '==', date)
  );
  
  const existingSnap = await getDocs(existingQuery);
  
  if (!existingSnap.empty) {
    console.log(`    ⚠️ 이미 Attendance 존재: ${date} - 스킵`);
    return;
  }
  
  // 유급휴가 Attendance 생성
  await addDoc(collection(db, COLLECTIONS.ATTENDANCE), {
    userId: payload.userId,
    companyId: payload.companyId,
    storeId: payload.storeId || '',
    date,
    status: 'paid_leave',
    leaveType: leaveData.leaveType,
    reason: leaveData.reason || '',
    approvalId: payload.approvalId,
    
    // 급여 계산용 (8시간 기본 근무로 간주)
    workMinutes: 480,
    basePay: 0, // 추후 계약서 기준으로 계산
    dailyWage: 0, // 추후 계산
    
    createdAt: serverTime(),
    updatedAt: serverTime(),
  });
  
  console.log(`    ✅ 유급휴가 Attendance 생성: ${date}`);
}

// ========================================
// Sub-Functions: 연장근무 승인
// ========================================

/**
 * 연장근무 승인 처리
 * 
 * Attendance의 overtimeCap 필드 업데이트
 */
async function handleOvertimeApproval(payload: ApprovalPayload): Promise<void> {
  const overtimeData = payload.data as OvertimeData;
  
  console.log('  ⏰ 연장근무 승인 처리:', overtimeData);
  
  // 해당 날짜의 Attendance 조회
  const attendanceQuery = query(
    collection(db, COLLECTIONS.ATTENDANCE),
    where('userId', '==', payload.userId),
    where('companyId', '==', payload.companyId),
    where('date', '==', overtimeData.date)
  );
  
  const attendanceSnap = await getDocs(attendanceQuery);
  
  if (attendanceSnap.empty) {
    // Attendance가 아직 없으면 미리 생성
    await addDoc(collection(db, COLLECTIONS.ATTENDANCE), {
      userId: payload.userId,
      companyId: payload.companyId,
      storeId: payload.storeId || '',
      date: overtimeData.date,
      status: 'present',
      overtimeCap: overtimeData.requestedMinutes,
      overtimeApprovalId: payload.approvalId,
      createdAt: serverTime(),
      updatedAt: serverTime(),
    });
    
    console.log(`  ✅ Attendance 생성 및 overtimeCap 설정: ${overtimeData.requestedMinutes}분`);
  } else {
    // Attendance가 있으면 업데이트
    const attendanceRef = attendanceSnap.docs[0].ref;
    
    await updateDoc(attendanceRef, {
      overtimeCap: overtimeData.requestedMinutes,
      overtimeApprovalId: payload.approvalId,
      updatedAt: serverTime(),
    });
    
    console.log(`  ✅ overtimeCap 업데이트: ${overtimeData.requestedMinutes}분`);
  }
}

// ========================================
// Sub-Functions: 스케줄 변경 승인
// ========================================

async function handleScheduleChangeApproval(payload: ApprovalPayload): Promise<void> {
  console.log('  📅 스케줄 변경 승인 처리');
  
  // 스케줄 변경 로직 (추후 구현)
  // ...
}

// ========================================
// Utility Functions
// ========================================

/**
 * 날짜 범위 계산
 */
function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * 알림 발송
 */
async function sendApprovalNotification(
  payload: ApprovalPayload,
  status: 'approved' | 'rejected'
): Promise<void> {
  console.log('  🔔 알림 발송 시작');
  
  const { userId, companyId, type, approvalId } = payload;
  
  // NotificationService 사용
  await NotificationService.notifyApprovalResult(
    userId,
    companyId,
    approvalId,
    type === 'leave' ? 'leave' : 'overtime',
    status === 'approved',
    status === 'rejected' ? '관리자가 거부하였습니다.' : undefined
  );
  
  console.log('  ✅ 알림 발송 완료');
}

// ========================================
// Public API
// ========================================

/**
 * 결재 승인
 */
export async function approveRequest(
  approvalId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('✅ 결재 승인 시작:', approvalId);
    
    // 1. Approval 문서 조회
    const approvalRef = doc(db, COLLECTIONS.APPROVALS, approvalId);
    const approvalDoc = await getDoc(approvalRef);
    
    if (!approvalDoc.exists()) {
      throw new Error('결재 요청을 찾을 수 없습니다.');
    }
    
    const approval = approvalDoc.data();
    
    // 2. 상태 업데이트
    await updateDoc(approvalRef, {
      status: 'approved',
      approvedBy,
      approvedAt: serverTime(),
      updatedAt: serverTime(),
    });
    
    console.log('✅ 결재 상태 업데이트 완료');
    
    // 3. 이벤트 발행 (자동화 체인 시작!)
    await EventBus.emit(createEvent(
      'approval:approved',
      {
        approvalId,
        type: approval.type || 'other',
        userId: approval.userId,
        companyId: approval.companyId,
        storeId: approval.storeId,
        data: approval.data,
        approvedBy,
        approvedAt: new Date(),
      } as ApprovalPayload,
      {
        userId: approval.userId,
        companyId: approval.companyId,
        triggeredBy: approvedBy,
      }
    ));
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ 결재 승인 실패:', error);
    return {
      success: false,
      error: error.message || '결재 승인 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 결재 거부
 */
export async function rejectRequest(
  approvalId: string,
  rejectedBy: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('❌ 결재 거부 시작:', approvalId);
    
    const approvalRef = doc(db, COLLECTIONS.APPROVALS, approvalId);
    const approvalDoc = await getDoc(approvalRef);
    
    if (!approvalDoc.exists()) {
      throw new Error('결재 요청을 찾을 수 없습니다.');
    }
    
    const approval = approvalDoc.data();
    
    await updateDoc(approvalRef, {
      status: 'rejected',
      rejectedBy,
      rejectedAt: serverTime(),
      rejectionReason: reason || '',
      updatedAt: serverTime(),
    });
    
    // 이벤트 발행
    await EventBus.emit(createEvent(
      'approval:rejected',
      {
        approvalId,
        type: approval.type || 'other',
        userId: approval.userId,
        companyId: approval.companyId,
        data: approval.data,
        rejectedBy,
        rejectedAt: new Date(),
        reason,
      } as ApprovalPayload,
      {
        userId: approval.userId,
        companyId: approval.companyId,
        triggeredBy: rejectedBy,
      }
    ));
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ 결재 거부 실패:', error);
    return {
      success: false,
      error: error.message || '결재 거부 중 오류가 발생했습니다.',
    };
  }
}

// ========================================
// 초기화
// ========================================

registerApprovalEventHandlers();
