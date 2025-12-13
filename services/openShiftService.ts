/**
 * Open Shift Service
 * Firebase Firestore 긴급 근무 모집 관련 CRUD 로직
 * 
 * 백업: admin-dashboard.html 라인 7710-7902
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
  orderBy,
  QueryConstraint,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

/**
 * Open Shift 타입 정의
 */
export interface OpenShift {
  id?: string;
  companyId: string;
  storeId: string;
  storeName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: 'replacement' | 'extra'; // 대체근무 | 추가근무
  status: 'open' | 'matched' | 'cancelled';
  wageIncentive: number; // 추가 시급 (원)
  matchedUserId: string | null;
  matchedUserName: string | null;
  matchedAt: Timestamp | null;
  description?: string;
  createdBy: string; // Admin UID
  createdByName: string; // Admin Name
  createdAt: Timestamp;
  cancelledAt: Timestamp | null;
  cancelledBy: string | null;
}

/**
 * Open Shift 생성 데이터
 */
export interface CreateOpenShiftData {
  companyId: string;
  storeId: string;
  storeName: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'replacement' | 'extra';
  wageIncentive: number;
  description?: string;
  createdBy: string;
  createdByName: string;
}

/**
 * 긴급 근무 모집 공고 생성
 * 백업: admin-dashboard.html 라인 7710-7752
 */
export async function createOpenShift(
  shiftData: CreateOpenShiftData
): Promise<string> {
  try {
    console.log('📢 근무 모집 공고 생성 시작:', shiftData);

    // 필수 필드 검증
    const requiredFields: (keyof CreateOpenShiftData)[] = [
      'companyId',
      'storeId',
      'storeName',
      'date',
      'startTime',
      'endTime',
      'type',
      'wageIncentive',
      'createdBy',
      'createdByName',
    ];

    for (const field of requiredFields) {
      if (!shiftData[field] && shiftData[field] !== 0) {
        throw new Error(`필수 필드 누락: ${field}`);
      }
    }

    // 공고 데이터 생성
    const openShiftData: Omit<OpenShift, 'id'> = {
      companyId: shiftData.companyId,
      storeId: shiftData.storeId,
      storeName: shiftData.storeName,
      date: shiftData.date,
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      type: shiftData.type,
      status: 'open',
      wageIncentive: Number(shiftData.wageIncentive),
      matchedUserId: null,
      matchedUserName: null,
      matchedAt: null,
      description: shiftData.description || '',
      createdBy: shiftData.createdBy,
      createdByName: shiftData.createdByName,
      createdAt: serverTimestamp() as Timestamp,
      cancelledAt: null,
      cancelledBy: null,
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.OPEN_SHIFTS), openShiftData);
    console.log('✅ 근무 모집 공고 생성 완료:', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('❌ 근무 모집 공고 생성 실패:', error);
    throw error;
  }
}

/**
 * Open Shift 목록 조회
 */
export async function getOpenShifts(
  companyId: string,
  filters?: {
    storeId?: string;
    status?: 'open' | 'matched' | 'cancelled';
    startDate?: string;
    endDate?: string;
  }
): Promise<OpenShift[]> {
  const constraints: QueryConstraint[] = [
    where('companyId', '==', companyId),
    orderBy('date', 'desc'),
  ];

  // 필터 조건 추가
  if (filters?.storeId) {
    constraints.push(where('storeId', '==', filters.storeId));
  }

  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  const q = query(collection(db, COLLECTIONS.OPEN_SHIFTS), ...constraints);
  const snapshot = await getDocs(q);

  let shifts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as OpenShift));

  // 날짜 범위 필터링 (클라이언트)
  if (filters?.startDate || filters?.endDate) {
    shifts = shifts.filter((shift) => {
      if (filters.startDate && shift.date < filters.startDate) return false;
      if (filters.endDate && shift.date > filters.endDate) return false;
      return true;
    });
  }

  return shifts;
}

/**
 * Open Shift 상세 조회
 */
export async function getOpenShiftById(shiftId: string): Promise<OpenShift | null> {
  const docRef = doc(db, COLLECTIONS.OPEN_SHIFTS, shiftId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as OpenShift;
}

/**
 * Open Shift 취소
 */
export async function cancelOpenShift(
  shiftId: string,
  cancelledBy: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.OPEN_SHIFTS, shiftId), {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
    cancelledBy,
  });
}

/**
 * Open Shift 매칭
 */
export async function matchOpenShift(
  shiftId: string,
  userId: string,
  userName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.OPEN_SHIFTS, shiftId), {
    status: 'matched',
    matchedUserId: userId,
    matchedUserName: userName,
    matchedAt: serverTimestamp(),
  });
}

/**
 * Open Shift 삭제
 */
export async function deleteOpenShift(shiftId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.OPEN_SHIFTS, shiftId));
}
