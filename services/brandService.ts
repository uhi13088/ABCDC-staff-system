/**
 * Brand Service
 * Firebase Firestore 브랜드 관련 CRUD 로직
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
import type { Brand } from '@/lib/types/brand';

/**
 * 브랜드 목록 조회
 */
export async function getBrands(companyId: string): Promise<Brand[]> {
  const q = query(
    collection(db, COLLECTIONS.BRANDS),
    where('companyId', '==', companyId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Brand));
}

/**
 * 브랜드 상세 조회
 */
export async function getBrandById(brandId: string): Promise<Brand | null> {
  const docRef = doc(db, COLLECTIONS.BRANDS, brandId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Brand;
}

/**
 * 브랜드 생성
 */
export async function createBrand(
  data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.BRANDS), {
    ...data,
    storeCount: 0,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * 브랜드 수정
 */
export async function updateBrand(
  brandId: string,
  data: Partial<Brand>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.BRANDS, brandId);
  const { id, ...updateData } = data as any;
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 브랜드 삭제
 */
export async function deleteBrand(brandId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.BRANDS, brandId);
  await deleteDoc(docRef);
}

/**
 * 브랜드의 매장 수 업데이트
 */
export async function updateBrandStoreCount(
  brandId: string,
  storeCount: number
): Promise<void> {
  await updateBrand(brandId, { storeCount });
}
