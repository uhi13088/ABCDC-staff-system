/**
 * Contract Service
 * Firebase Firestore 계약서 관련 CRUD 로직
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Contract } from '@/lib/types/contract';

/**
 * 계약서 목록 조회
 */
export async function getContracts(
  companyId: string,
  filters?: {
    storeId?: string;
    userId?: string;
    status?: string;
  }
): Promise<Contract[]> {
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

  constraints.push(orderBy('createdAt', 'desc'));

  const q = query(collection(db, COLLECTIONS.CONTRACTS), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Contract));
}

/**
 * 계약서 상세 조회
 */
export async function getContractById(contractId: string): Promise<Contract | null> {
  const docRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Contract;
}

/**
 * 직원의 계약서 목록 조회
 */
export async function getContractsByEmployee(
  companyId: string,
  employeeName: string,
  employeeBirth: string
): Promise<Contract[]> {
  const q = query(
    collection(db, COLLECTIONS.CONTRACTS),
    where('companyId', '==', companyId),
    where('employeeName', '==', employeeName),
    where('employeeBirth', '==', employeeBirth),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Contract));
}

/**
 * 계약서 생성
 */
export async function createContract(data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.CONTRACTS), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    status: data.status || 'draft',
    isSigned: false,
  });

  return docRef.id;
}

/**
 * 계약서 수정
 */
export async function updateContract(
  contractId: string,
  data: Partial<Contract>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 계약서 삭제
 */
export async function deleteContract(contractId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
  await deleteDoc(docRef);
}

/**
 * 계약서 서명 처리
 */
export async function signContract(contractId: string, signedBy: string): Promise<void> {
  await updateContract(contractId, {
    isSigned: true,
    signedAt: Timestamp.now(),
    signedBy,
    status: '서명완료',
  });
}
