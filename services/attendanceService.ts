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
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { AttendanceRecord } from '@/lib/types/attendance';

/**
 * 출퇴근 기록 목록 조회 (최적화됨)
 * 🚀 변경점: 날짜 필터링을 Firestore 쿼리 단계에서 수행하여 읽기 비용 절감
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

  // 1. 기본 필터 조건 추가
  if (filters?.storeId) {
    constraints.push(where('storeId', '==', filters.storeId));
  }

  if (filters?.userId) {
    constraints.push(where('userId', '==', filters.userId));
  }

  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  // 2. 🚀 핵심 변경: 날짜 범위 쿼리를 DB 레벨에서 수행
  if (filters?.startDate) {
    constraints.push(where('date', '>=', filters.startDate));
  }
  
  if (filters?.endDate) {
    constraints.push(where('date', '<=', filters.endDate));
  }

  // 3. 정렬 (날짜 내림차순)
  // 주의: where('date') 범위 쿼리와 orderBy('date')를 함께 사용하려면 복합 색인 필요
  constraints.push(orderBy('date', 'desc'));

  try {
    const q = query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints);
    const snapshot = await getDocs(q);

    // 4. 이미 DB에서 필터링되었으므로 매핑만 수행 (메모리 필터링 제거됨)
    const records = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as AttendanceRecord));

    return records;

  } catch (error: any) {
    // ⚠️ 중요: 복합 색인(Composite Index)이 없을 때 발생하는 에러 처리
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      console.error('🚨 [Firestore Index Error] 쿼리를 실행하려면 인덱스가 필요합니다.');
      console.error('아래 링크를 클릭하여 Firebase 콘솔에서 인덱스를 생성해주세요:');
      console.error(error.message); // 이 메시지 안에 인덱스 생성 링크가 포함되어 있습니다.
    }
    throw error;
  }
}

// ... (나머지 함수들은 기존과 동일하게 유지)
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

  if (options?.sendNotification && options?.editorId) {
    try {
      const originalDoc = await getDoc(docRef);
      if (originalDoc.exists()) {
        const originalData = originalDoc.data() as AttendanceRecord;
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
      }
    } catch (error) {
      console.error('❌ 출퇴근 수정 알림 전송 실패:', error);
    }
  }
}

/**
 * 요일 이름 변환 헬퍼 (date 문자열 → "월", "화", ... )
 */
const getDayName = (dateStr: string): string => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateStr).getDay()];
};

export async function clockIn(
  userId: string,
  companyId: string,
  storeId: string,
  date: string,
  location?: { latitude: number; longitude: number }
): Promise<string> {
  console.log('🕐 clockIn 시작:', { userId, companyId, storeId, date });
  
  // 1. 오늘 요일 파악
  const dayName = getDayName(date);
  console.log(`📅 오늘 요일: ${dayName}`);
  
  // 2. 활성 계약서 조회 (스케줄 시간 가져오기)
  let scheduledStartTime: string | undefined;
  let scheduledEndTime: string | undefined;
  
  try {
    // 계약서 조회: userId 기준, 최신순 1개
    const contractQuery = query(
      collection(db, COLLECTIONS.CONTRACTS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const contractSnap = await getDocs(contractQuery);
    
    if (!contractSnap.empty) {
      const contractDoc = contractSnap.docs[0];
      const contract = contractDoc.data();
      console.log('✅ 활성 계약서 발견:', contractDoc.id);
      
      // 계약서에서 근무 시간 추출
      // 우선순위: schedules 배열 (신규) > workStartTime/workEndTime (레거시)
      if (contract.schedules && Array.isArray(contract.schedules)) {
        const todaySchedule = contract.schedules.find((s: any) => s.day === dayName);
        
        if (todaySchedule) {
          scheduledStartTime = todaySchedule.startTime;
          scheduledEndTime = todaySchedule.endTime;
          console.log(`📅 오늘(${dayName}) 스케줄:`, scheduledStartTime, '~', scheduledEndTime);
        } else {
          console.warn(`⚠️ 오늘(${dayName}) 스케줄이 없음 (계약서에 없는 요일)`);
        }
      } else if (contract.workStartTime && contract.workEndTime) {
        // 레거시: workStartTime/workEndTime 사용
        scheduledStartTime = contract.workStartTime;
        scheduledEndTime = contract.workEndTime;
        console.log('📋 레거시 근무시간:', scheduledStartTime, '~', scheduledEndTime);
      } else {
        console.warn('⚠️ 계약서에 근무 시간 정보가 없음');
      }
    } else {
      console.warn('⚠️ 활성 계약서가 없음 (스케줄 시간 없이 저장됨)');
    }
  } catch (error) {
    console.error('❌ 계약서 조회 실패 (스케줄 시간 없이 저장됨):', error);
  }
  
  // 3. 출근 기록 생성 (스케줄 시간 포함)
  const attendanceData: any = {
    userId,
    companyId,
    storeId,
    date,
    clockIn: serverTimestamp(),
    status: 'present',
  };
  
  // 🔥 스케줄 시간 추가 (있을 때만)
  if (scheduledStartTime) {
    attendanceData.scheduledStartTime = scheduledStartTime;
  }
  if (scheduledEndTime) {
    attendanceData.scheduledEndTime = scheduledEndTime;
  }

  // location이 있을 때만 추가
  if (location) {
    attendanceData.location = location;
  }
  
  console.log('💾 출근 기록 저장:', attendanceData);
  return createAttendance(attendanceData);
}

export async function clockOut(
  attendanceId: string
): Promise<void> {
  await updateAttendance(attendanceId, {
    clockOut: serverTimestamp() as any,
  });
}

export async function deleteAttendance(attendanceId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
  await deleteDoc(docRef);
}

export async function approveAttendance(attendanceId: string): Promise<void> {
  await updateAttendance(attendanceId, {
    isApproved: true,
  });
}
