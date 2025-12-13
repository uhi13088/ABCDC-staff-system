/**
 * Employee Service
 * Firebase Firestore 직원 관련 CRUD 로직
 * Hook에서 Firebase 코드 분리
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
  QueryConstraint,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, USER_ROLES, USER_STATUS } from '@/lib/constants';
import type { Employee } from '@/lib/types/employee';

/**
 * 직원 목록 조회
 */
export async function getEmployees(
  companyId: string,
  filters?: {
    storeId?: string;
    status?: string;
    role?: string;
  }
): Promise<Employee[]> {
  const constraints: QueryConstraint[] = [
    where('role', 'in', [USER_ROLES.STAFF, USER_ROLES.STORE_MANAGER, USER_ROLES.MANAGER]),
    where('companyId', '==', companyId),
  ];

  // 🔥 DB Query 필터: status 조건 추가
  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  // 🔥 DB Query 필터: storeId 조건 추가
  if (filters?.storeId) {
    constraints.push(where('storeId', '==', filters.storeId));
  }

  const q = query(collection(db, COLLECTIONS.USERS), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    uid: doc.id,
    ...doc.data(),
  } as Employee));
}

/**
 * 직원 상세 조회
 */
export async function getEmployeeById(userId: string): Promise<Employee | null> {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    uid: docSnap.id,
    ...docSnap.data(),
  } as Employee;
}

/**
 * 직원 생성
 */
export async function createEmployee(data: Partial<Employee>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.USERS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * 직원 정보 수정
 */
export async function updateEmployee(
  userId: string,
  data: Partial<Employee>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 직원 삭제
 */
export async function deleteEmployee(userId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  await deleteDoc(docRef);
}

/**
 * 직원 승인
 */
export async function approveEmployee(userId: string): Promise<void> {
  await updateEmployee(userId, {
    status: USER_STATUS.APPROVED,
  });
}

/**
 * 직원 거부
 */
export async function rejectEmployee(userId: string): Promise<void> {
  await updateEmployee(userId, {
    status: USER_STATUS.REJECTED,
  });
}

/**
 * 퇴사 처리
 */
export async function resignEmployee(userId: string, resignDate: string): Promise<void> {
  await updateEmployee(userId, {
    status: USER_STATUS.RESIGNED,
    employmentStatus: 'resigned',
    resignDate,
  });
}
