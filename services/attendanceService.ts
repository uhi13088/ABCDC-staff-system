/**
 * Attendance Service
 * Firebase Firestore 출퇴근 관련 CRUD 로직
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
  serverTimestamp,
  orderBy,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { AttendanceRecord } from '@/lib/types/attendance';

/**
 * 출퇴근 기록 목록 조회
 */
export async function getAttendanceRecords(
  companyId: string,
  filters?: {
    storeId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }
): Promise<AttendanceRecord[]> {
  const constraints: QueryConstraint[] = [
    where('companyId', '==', companyId),
  ];

  // 필터 조건 추가
  if (filters?.storeId) {
    constraints.push(where('storeId', '==', filters.storeId));
  }

  if (filters?.userId) {
    constraints.push(where('userId', '==', filters.userId));
  }

  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  // 날짜 범위는 클라이언트에서 필터링 (Firestore 제약)
  constraints.push(orderBy('date', 'desc'));

  const q = query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints);
  const snapshot = await getDocs(q);

  let records = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as AttendanceRecord));

  // 날짜 범위 필터링 (클라이언트)
  if (filters?.startDate || filters?.endDate) {
    records = records.filter(record => {
      if (filters.startDate && record.date < filters.startDate) return false;
      if (filters.endDate && record.date > filters.endDate) return false;
      return true;
    });
  }

  return records;
}

/**
 * 출퇴근 기록 상세 조회
 */
export async function getAttendanceById(attendanceId: string): Promise<AttendanceRecord | null> {
  const docRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as AttendanceRecord;
}

/**
 * 특정 날짜의 직원 출퇴근 기록 조회
 */
export async function getAttendanceByUserAndDate(
  userId: string,
  date: string
): Promise<AttendanceRecord | null> {
  const q = query(
    collection(db, COLLECTIONS.ATTENDANCE),
    where('userId', '==', userId),
    where('date', '==', date)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as AttendanceRecord;
}

/**
 * 출근 기록 생성
 */
export async function createAttendance(
  data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.ATTENDANCE), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * 출퇴근 기록 수정
 * 🔔 Phase J: 알림 연동 - 관리자가 수정 시 직원에게 알림
 */
export async function updateAttendance(
  attendanceId: string,
  data: Partial<AttendanceRecord>,
  options?: {
    sendNotification?: boolean;
    editorId?: string;
    editorName?: string;
    editorRole?: string;
  }
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });

  // 알림 전송 (관리자가 직원 출퇴근 기록 수정 시)
  if (options?.sendNotification && options?.editorId) {
    try {
      // 원본 데이터 가져오기
      const originalDoc = await getDoc(docRef);
      if (originalDoc.exists()) {
        const originalData = originalDoc.data() as AttendanceRecord;
        
        // notificationService는 dynamic import로 처리 (순환 참조 방지)
        const { createNotification } = await import('./notificationService');
        
        await createNotification({
          companyId: originalData.companyId,
          userId: originalData.userId,
          type: 'attendance_edited_by_admin',
          title: '출퇴근 기록이 수정되었습니다',
          message: `${options.editorName || '관리자'}님이 ${originalData.date} 출퇴근 기록을 수정했습니다.`,
          relatedId: attendanceId,
          relatedType: 'attendance',
          senderId: options.editorId,
          senderName: options.editorName,
          senderRole: options.editorRole,
          storeId: originalData.storeId,
          actionUrl: `/employee-dashboard?tab=attendance&id=${attendanceId}`,
          actionLabel: '확인하기',
        });
        console.log('✅ 출퇴근 수정 알림 전송 완료');
      }
    } catch (error) {
      console.error('❌ 출퇴근 수정 알림 전송 실패:', error);
      // 알림 실패해도 메인 기능은 성공 처리
    }
  }
}

/**
 * 출근 처리
 * 🔒 Phase G: 서버 시간 자동 할당 (시간 조작 방지)
 * clockInTime 파라미터 제거 → serverTimestamp() 사용
 */
export async function clockIn(
  userId: string,
  companyId: string,
  storeId: string,
  date: string,
  location?: { latitude: number; longitude: number }
): Promise<string> {
  return createAttendance({
    userId,
    companyId,
    storeId,
    date,
    clockIn: serverTimestamp() as any,  // 서버 시간 자동 할당
    status: 'present',
    location,
  });
}

/**
 * 퇴근 처리
 * 🔒 Phase G: 서버 시간 자동 할당 (시간 조작 방지)
 * clockOutTime 파라미터 제거 → serverTimestamp() 사용
 */
export async function clockOut(
  attendanceId: string
): Promise<void> {
  await updateAttendance(attendanceId, {
    clockOut: serverTimestamp() as any,  // 서버 시간 자동 할당
  });
}

/**
 * 출퇴근 기록 삭제
 */
export async function deleteAttendance(attendanceId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
  await deleteDoc(docRef);
}

/**
 * 출퇴근 승인
 */
export async function approveAttendance(attendanceId: string): Promise<void> {
  await updateAttendance(attendanceId, {
    isApproved: true,
  });
}
