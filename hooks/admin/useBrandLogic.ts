/**
 * 브랜드 관리 Custom Hook
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Brand } from '@/lib/types/common';

interface UseBrandLogicProps {
  companyId: string;
}

export function useBrandLogic({ companyId }: UseBrandLogicProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBrands = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'brands'), where('companyId', '==', companyId));
      const snapshot = await getDocs(q);
      const brandsList: Brand[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        brandsList.push({
          id: docSnap.id,
          name: data.name,
          companyId: data.companyId,
          logoUrl: data.logoUrl,
          description: data.description,
          isActive: data.isActive !== false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      setBrands(brandsList);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [companyId]);

  const addBrand = useCallback(
    async (brandData: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        await addDoc(collection(db, 'brands'), {
          ...brandData,
          companyId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        await loadBrands();
        return { success: true, message: '브랜드가 추가되었습니다.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [companyId, loadBrands]
  );

  const updateBrand = useCallback(
    async (brandId: string, updates: Partial<Brand>) => {
      try {
        await updateDoc(doc(db, 'brands', brandId), { ...updates, updatedAt: Timestamp.now() });
        await loadBrands();
        return { success: true, message: '브랜드가 수정되었습니다.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [loadBrands]
  );

  const deleteBrand = useCallback(
    async (brandId: string) => {
      try {
        await deleteDoc(doc(db, 'brands', brandId));
        await loadBrands();
        return { success: true, message: '브랜드가 삭제되었습니다.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [loadBrands]
  );

  useEffect(() => {
    if (companyId) loadBrands();
  }, [companyId, loadBrands]);

  return { brands, loading, error, loadBrands, addBrand, updateBrand, deleteBrand };
}
