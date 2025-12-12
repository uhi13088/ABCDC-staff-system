/**
 * Approval Service
 * Firebase Firestore 승인 요청 관련 CRUD 로직
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
  orderBy,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, APPROVAL_STATUS } from '@/lib/constants';

export interface ApprovalRequest {
  id?: string;
  companyId: string;
  userId: string;
  employeeName: string;
  storeId?: string;
  storeName?: string;
  type: string; // '휴가', '초과근무', '근무시간 조정'
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 승인 요청 목록 조회
 */
export async function getApprovalRequests(
  companyId: string,
  filters?: {
    storeId?: string;
    userId?: string;
    status?: string;
    type?: string;
  }
): Promise<ApprovalRequest[]> {
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

  if (filters?.type) {
    constraints.push(where('type', '==', filters.type));
  }

  constraints.push(orderBy('createdAt', 'desc'));

  const q = query(collection(db, COLLECTIONS.APPROVALS), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as ApprovalRequest));
}

/**
 * 승인 요청 상세 조회
 */
export async function getApprovalById(approvalId: string): Promise<ApprovalRequest | null> {
  const docRef = doc(db, COLLECTIONS.APPROVALS, approvalId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as ApprovalRequest;
}

/**
 * 승인 요청 생성
 */
export async function createApprovalRequest(
  data: Omit<ApprovalRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.APPROVALS), {
    ...data,
    status: APPROVAL_STATUS.PENDING,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}

/**
 * 승인 요청 수정
 */
export async function updateApprovalRequest(
  approvalId: string,
  data: Partial<ApprovalRequest>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.APPROVALS, approvalId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 승인 요청 삭제
 */
export async function deleteApprovalRequest(approvalId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.APPROVALS, approvalId);
  await deleteDoc(docRef);
}

/**
 * 승인 처리
 */
export async function approveRequest(
  approvalId: string,
  reviewedBy: string
): Promise<void> {
  await updateApprovalRequest(approvalId, {
    status: APPROVAL_STATUS.APPROVED,
    reviewedBy,
    reviewedAt: Timestamp.now(),
  });
}

/**
 * 거부 처리
 */
export async function rejectRequest(
  approvalId: string,
  reviewedBy: string
): Promise<void> {
  await updateApprovalRequest(approvalId, {
    status: APPROVAL_STATUS.REJECTED,
    reviewedBy,
    reviewedAt: Timestamp.now(),
  });
}

/**
 * 대기 중인 승인 요청 수 조회
 */
export async function getPendingApprovalCount(companyId: string): Promise<number> {
  const requests = await getApprovalRequests(companyId, {
    status: APPROVAL_STATUS.PENDING,
  });
  return requests.length;
}
