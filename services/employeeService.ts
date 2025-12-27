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
import { createNotification } from '@/services/notificationService';
import { NOTIFICATION_TEMPLATES } from '@/lib/types/notification';
import { deleteEmployeeAccount as deleteEmployeeAccountFromAuth } from '@/services/cloudFunctionsEmployeeService';

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
    // STAFF로 통일 (호환성 위해 'employee'도 포함)
    where('role', 'in', [
      USER_ROLES.STAFF,         // 표준
      'employee',               // 기존 데이터 호환성 (상수 제거됨)
      USER_ROLES.STORE_MANAGER, 
      USER_ROLES.MANAGER
    ]),
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
 * 직원 완전 삭제 (Auth + Firestore)
 * 
 * @description
 * Firebase Auth 계정과 Firestore 문서를 모두 삭제합니다.
 * Cloud Functions (Admin SDK)를 사용하여 다른 사용자의 Auth 계정을 삭제합니다.
 */
export async function deleteEmployee(userId: string): Promise<void> {
  try {
    // Cloud Functions를 통해 Auth + Firestore 모두 삭제
    await deleteEmployeeAccountFromAuth(userId);
    console.log('✅ 직원 완전 삭제 완료 (Auth + Firestore):', userId);
  } catch (error) {
    console.error('❌ 직원 삭제 실패:', error);
    throw error;
  }
}

/**
 * 직원 승인
 */
export async function approveEmployee(userId: string): Promise<void> {
  // 1. 상태 업데이트
  await updateEmployee(userId, {
    status: USER_STATUS.APPROVED,
  });

  // 2. 직원 정보 조회
  const employee = await getEmployeeById(userId);
  if (!employee) {
    throw new Error('직원 정보를 찾을 수 없습니다.');
  }

  // 3. 알림 전송
  try {
    const template = NOTIFICATION_TEMPLATES.EMPLOYEE_APPROVED;
    await createNotification({
      companyId: employee.companyId,
      userId: employee.uid,
      type: 'EMPLOYEE_APPROVED',
      title: template.title,
      message: template.message(employee.companyName || '회사'),
      actionUrl: '/employee-login',
      actionLabel: template.actionLabel,
    });
    console.log('✅ 직원 승인 알림 전송 완료:', employee.name);
  } catch (error) {
    console.error('⚠️ 알림 전송 실패 (무시하고 진행):', error);
  }
}

/**
 * 직원 거부
 */
export async function rejectEmployee(userId: string): Promise<void> {
  // 1. 상태 업데이트
  await updateEmployee(userId, {
    status: USER_STATUS.REJECTED,
  });

  // 2. 직원 정보 조회
  const employee = await getEmployeeById(userId);
  if (!employee) {
    throw new Error('직원 정보를 찾을 수 없습니다.');
  }

  // 3. 알림 전송
  try {
    const template = NOTIFICATION_TEMPLATES.EMPLOYEE_REJECTED;
    await createNotification({
      companyId: employee.companyId,
      userId: employee.uid,
      type: 'EMPLOYEE_REJECTED',
      title: template.title,
      message: template.message(employee.companyName || '회사'),
      actionLabel: template.actionLabel,
    });
    console.log('✅ 직원 거부 알림 전송 완료:', employee.name);
  } catch (error) {
    console.error('⚠️ 알림 전송 실패 (무시하고 진행):', error);
  }
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
