/**
 * 매장 관리 Custom Hook
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Store } from '@/lib/types/common';
import { COLLECTIONS } from '@/lib/constants';

interface UseStoreLogicProps {
  companyId: string;
}

export function useStoreLogic({ companyId }: UseStoreLogicProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStores = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const q = query(collection(db, COLLECTIONS.STORES), where('companyId', '==', companyId));
      const snapshot = await getDocs(q);
      const storesList: Store[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        storesList.push({
          id: docSnap.id,
          name: data.name,
          companyId: data.companyId,
          address: data.address,
          phone: data.phone,
          managerName: data.managerName,
          isActive: data.isActive !== false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      setStores(storesList);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [companyId]);

  const addStore = useCallback(
    async (storeData: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        await addDoc(collection(db, COLLECTIONS.STORES), {
          ...storeData,
          companyId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        await loadStores();
        return { success: true, message: '매장이 추가되었습니다.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [companyId, loadStores]
  );

  const updateStore = useCallback(
    async (storeId: string, updates: Partial<Store>) => {
      try {
        await updateDoc(doc(db, 'stores', storeId), { ...updates, updatedAt: Timestamp.now() });
        await loadStores();
        return { success: true, message: '매장이 수정되었습니다.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [loadStores]
  );

  const deleteStore = useCallback(
    async (storeId: string) => {
      try {
        await deleteDoc(doc(db, 'stores', storeId));
        await loadStores();
        return { success: true, message: '매장이 삭제되었습니다.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [loadStores]
  );

  useEffect(() => {
    if (companyId) loadStores();
  }, [companyId, loadStores]);

  return { stores, loading, error, loadStores, addStore, updateStore, deleteStore };
}
