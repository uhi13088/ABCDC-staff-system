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
  serverTimestamp,
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
 * 🔔 Phase J: 알림 연동 - 계약서 서명 요청 시 직원에게 알림
 */
export async function createContract(
  data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>,
  options?: {
    sendNotification?: boolean;
    creatorId?: string;
    creatorName?: string;
    creatorRole?: string;
  }
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.CONTRACTS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: data.status || 'draft',
    isSigned: false,
  });

  const contractId = docRef.id;

  // 알림 전송 (계약서 서명 요청 시 직원에게 알림)
  if (options?.sendNotification && data.userId) {
    try {
      const { createNotification } = await import('./notificationService');
      
      await createNotification({
        companyId: data.companyId,
        userId: data.userId,
        type: 'contract_signature_request',
        title: '계약서 서명 요청',
        message: `${options.creatorName || '관리자'}님이 ${data.contractType || '근로'} 계약서 서명을 요청했습니다.`,
        relatedId: contractId,
        relatedType: 'contract',
        senderId: options.creatorId,
        senderName: options.creatorName,
        senderRole: options.creatorRole,
        storeId: data.storeId,
        storeName: data.storeName,
        actionUrl: `/contract-sign?id=${contractId}`,
        actionLabel: '계약서 확인 및 서명',
      });
      console.log('✅ 계약서 서명 요청 알림 전송 완료');
    } catch (error) {
      console.error('❌ 계약서 서명 요청 알림 전송 실패:', error);
      // 알림 실패해도 메인 기능은 성공 처리
    }
  }

  return contractId;
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
    updatedAt: serverTimestamp(),
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
    signedAt: serverTimestamp(),
    signedBy,
    status: '서명완료',
  });
}
