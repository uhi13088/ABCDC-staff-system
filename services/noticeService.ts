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
} serverTimestamp,
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
 */
export async function createNotice(
  data: Omit<Notice, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.NOTICES), {
    ...data,
    important: data.important || false,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
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
