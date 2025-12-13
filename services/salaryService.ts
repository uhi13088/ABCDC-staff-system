/**
 * Salary Service
 * Firebase Firestore 급여 관련 CRUD 로직
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
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

export interface SalaryRecord {
  id?: string;
  companyId: string;
  userId: string;
  employeeName: string;
  storeId?: string;
  storeName?: string;
  yearMonth: string; // 'YYYY-MM'
  baseSalary: number;
  totalSalary: number;
  netSalary: number;
  allowances?: {
    overtime?: number;
    night?: number;
    holiday?: number;
    weeklyHoliday?: number;
  };
  deductions?: {
    nationalPension?: number;
    healthInsurance?: number;
    employmentInsurance?: number;
    incomeTax?: number;
  };
  workDays?: number;
  workHours?: number;
  status: 'pending' | 'confirmed' | 'paid';
  confirmedAt?: any;
  paidAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 급여 목록 조회
 */
export async function getSalaryRecords(
  companyId: string,
  filters?: {
    storeId?: string;
    userId?: string;
    yearMonth?: string;
    status?: string;
  }
): Promise<SalaryRecord[]> {
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

  if (filters?.yearMonth) {
    constraints.push(where('yearMonth', '==', filters.yearMonth));
  }

  if (filters?.status) {
    constraints.push(where('status', '==', filters.status));
  }

  const q = query(collection(db, COLLECTIONS.SALARY), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as SalaryRecord));
}

/**
 * 급여 상세 조회
 */
export async function getSalaryById(salaryId: string): Promise<SalaryRecord | null> {
  const docRef = doc(db, COLLECTIONS.SALARY, salaryId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as SalaryRecord;
}

/**
 * 급여 생성
 */
export async function createSalary(
  data: Omit<SalaryRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.SALARY), {
    ...data,
    status: data.status || 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * 급여 수정
 */
export async function updateSalary(
  salaryId: string,
  data: Partial<SalaryRecord>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SALARY, salaryId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 급여 삭제
 */
export async function deleteSalary(salaryId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SALARY, salaryId);
  await deleteDoc(docRef);
}

/**
 * 급여 확인 처리
 */
export async function confirmSalary(salaryId: string): Promise<void> {
  await updateSalary(salaryId, {
    status: 'confirmed',
    confirmedAt: serverTimestamp(),
  });
}

/**
 * 급여 지급 처리
 */
export async function paySalary(salaryId: string): Promise<void> {
  await updateSalary(salaryId, {
    status: 'paid',
    paidAt: serverTimestamp(),
  });
}

/**
 * 직원의 급여 내역 조회
 */
export async function getSalaryHistoryByUser(
  companyId: string,
  userId: string
): Promise<SalaryRecord[]> {
  const q = query(
    collection(db, COLLECTIONS.SALARY),
    where('companyId', '==', companyId),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as SalaryRecord)).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
}
