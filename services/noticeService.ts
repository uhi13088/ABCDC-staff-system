/**
 * Notice Service
 * Firebase Firestore 공지사항 관련 CRUD 로직
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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Notice } from '@/lib/types/notice';

/**
 * 공지사항 목록 조회
 */
export async function getNotices(companyId: string): Promise<Notice[]> {
  const q = query(
    collection(db, COLLECTIONS.NOTICES),
    where('companyId', '==', companyId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Notice));
}

/**
 * 공지사항 상세 조회
 */
export async function getNoticeById(noticeId: string): Promise<Notice | null> {
  const docRef = doc(db, COLLECTIONS.NOTICES, noticeId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Notice;
}

/**
 * 공지사항 생성
 * 🔔 Phase J: 알림 연동 - 공지사항 등록 시 전체 직원에게 알림
 */
export async function createNotice(
  data: Omit<Notice, 'id' | 'createdAt' | 'updatedAt'>,
  options?: {
    sendNotification?: boolean;
    authorId?: string;
    authorName?: string;
    authorRole?: string;
  }
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.NOTICES), {
    ...data,
    important: data.important || false,
    createdAt: serverTimestamp(),
  });

  const noticeId = docRef.id;

  // 알림 전송 (공지사항 등록 시 전체 직원에게 알림)
  if (options?.sendNotification) {
    try {
      const { getCompanyEmployees, createNotifications } = await import('./notificationService');
      
      // 회사 전체 직원 조회
      const employeeIds = await getCompanyEmployees(data.companyId);
      
      if (employeeIds.length > 0) {
        // 전체 직원에게 알림 전송
        await createNotifications(employeeIds, {
          companyId: data.companyId,
          type: 'new_notice',
          title: data.important ? '🔔 중요 공지사항' : '새 공지사항',
          message: data.title,
          relatedId: noticeId,
          relatedType: 'notice',
          senderId: options.authorId,
          senderName: options.authorName,
          senderRole: options.authorRole,
          actionUrl: `/employee-dashboard?tab=notices&id=${noticeId}`,
          actionLabel: '공지사항 확인',
        });
        console.log(`✅ 공지사항 알림 전송 완료 (${employeeIds.length}명)`);
      }
    } catch (error) {
      console.error('❌ 공지사항 알림 전송 실패:', error);
      // 알림 실패해도 메인 기능은 성공 처리
    }
  }

  return noticeId;
}

/**
 * 공지사항 수정
 */
export async function updateNotice(
  noticeId: string,
  data: Partial<Notice>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.NOTICES, noticeId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 공지사항 삭제
 */
export async function deleteNotice(noticeId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.NOTICES, noticeId);
  await deleteDoc(docRef);
}

/**
 * 중요 공지사항 목록 조회
 */
export async function getImportantNotices(companyId: string): Promise<Notice[]> {
  const q = query(
    collection(db, COLLECTIONS.NOTICES),
    where('companyId', '==', companyId),
    where('important', '==', true),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Notice));
}
