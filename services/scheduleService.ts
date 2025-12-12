/**
 * Schedule Service
 * Firebase Firestore 근무스케줄 관련 CRUD 로직
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Schedule } from '@/lib/types/schedule';

/**
 * 스케줄 목록 조회
 */
export async function getSchedules(
  companyId: string,
  filters?: {
    storeId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<Schedule[]> {
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

  const q = query(collection(db, COLLECTIONS.SCHEDULES), ...constraints);
  const snapshot = await getDocs(q);

  let schedules = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Schedule));

  // 날짜 범위 필터링 (클라이언트)
  if (filters?.startDate || filters?.endDate) {
    schedules = schedules.filter(schedule => {
      if (filters.startDate && schedule.date < filters.startDate) return false;
      if (filters.endDate && schedule.date > filters.endDate) return false;
      return true;
    });
  }

  return schedules;
}

/**
 * 주간 스케줄 조회
 */
export async function getWeeklySchedules(
  companyId: string,
  storeId: string,
  weekStart: string,
  weekEnd: string
): Promise<Schedule[]> {
  const q = query(
    collection(db, COLLECTIONS.SCHEDULES),
    where('companyId', '==', companyId),
    where('storeId', '==', storeId),
    where('date', '>=', weekStart),
    where('date', '<=', weekEnd)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Schedule));
}

/**
 * 스케줄 생성
 */
export async function createSchedule(
  data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.SCHEDULES), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return docRef.id;
}

/**
 * 스케줄 수정
 */
export async function updateSchedule(
  scheduleId: string,
  data: Partial<Schedule>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SCHEDULES, scheduleId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 스케줄 삭제
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SCHEDULES, scheduleId);
  await deleteDoc(docRef);
}

/**
 * 다중 스케줄 생성 (배치)
 */
export async function createSchedulesBatch(
  schedules: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<void> {
  const batch = writeBatch(db);

  schedules.forEach((schedule) => {
    const docRef = doc(collection(db, COLLECTIONS.SCHEDULES));
    batch.set(docRef, {
      ...schedule,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  await batch.commit();
}

/**
 * 특정 기간 스케줄 삭제 (배치)
 */
export async function deleteSchedulesByDateRange(
  companyId: string,
  storeId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const schedules = await getSchedules(companyId, {
    storeId,
    startDate,
    endDate,
  });

  const batch = writeBatch(db);

  schedules.forEach((schedule) => {
    if (schedule.id) {
      const docRef = doc(db, COLLECTIONS.SCHEDULES, schedule.id);
      batch.delete(docRef);
    }
  });

  await batch.commit();
}

/**
 * 직원의 월간 스케줄 조회
 */
export async function getMonthlySchedulesByUser(
  companyId: string,
  userId: string,
  yearMonth: string // 'YYYY-MM' 형식
): Promise<Schedule[]> {
  const startDate = `${yearMonth}-01`;
  const endDate = `${yearMonth}-31`;

  return getSchedules(companyId, {
    userId,
    startDate,
    endDate,
  });
}
