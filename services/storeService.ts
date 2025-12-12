/**
 * Store Service
 * Firebase Firestore 매장 관련 CRUD 로직
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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Store } from '@/lib/types/store';

/**
 * 매장 목록 조회
 */
export async function getStores(
  companyId: string,
  filters?: {
    brandId?: string;
  }
): Promise<Store[]> {
  let q = query(
    collection(db, COLLECTIONS.STORES),
    where('companyId', '==', companyId)
  );

  // 브랜드 필터
  if (filters?.brandId) {
    q = query(q, where('brandId', '==', filters.brandId));
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Store));
}

/**
 * 매장 상세 조회
 */
export async function getStoreById(storeId: string): Promise<Store | null> {
  const docRef = doc(db, COLLECTIONS.STORES, storeId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Store;
}

/**
 * 매장 생성
 */
export async function createStore(
  data: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.STORES), {
    ...data,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * 매장 수정
 */
export async function updateStore(
  storeId: string,
  data: Partial<Store>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.STORES, storeId);
  const { id, ...updateData } = data as any;
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 매장 삭제
 */
export async function deleteStore(storeId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.STORES, storeId);
  await deleteDoc(docRef);
}

/**
 * 브랜드별 매장 수 조회
 */
export async function getStoreCountByBrand(
  companyId: string,
  brandId: string
): Promise<number> {
  const stores = await getStores(companyId, { brandId });
  return stores.length;
}
