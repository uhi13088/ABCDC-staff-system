/**
 * 매장 관리 로직 훅
 */

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import type { StoreFormData } from '@/components/admin/modals/store-form-modal';
import { COLLECTIONS } from '@/lib/constants';
import { storeService } from '@/services';

interface UseStoresLogicProps {
  companyId: string;
}

export function useStoresLogic({ companyId }: UseStoresLogicProps) {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * 매장 목록 로드
   */
  const loadStores = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      // 🔥 Service Layer 사용
      const storeList = await storeService.getStores(companyId);
      
      // 브랜드 정보 조회
      for (const store of storeList) {
        if (store.brandId) {
          const brandDoc = await getDocs(query(collection(db, COLLECTIONS.BRANDS), where('__name__', '==', store.brandId)));
          if (!brandDoc.empty) {
            store.brandName = brandDoc.docs[0].data().name;
          }
        }
      }
      
      setStores(storeList);
    } catch (error) {
      console.error('매장 목록 로드 실패:', error);
      alert('매장 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  /**
   * 매장 추가
   */
  const addStore = useCallback(async (data: StoreFormData) => {
    try {
      await addDoc(collection(db, COLLECTIONS.STORES), {
        ...data,
        createdAt: serverTimestamp(),
      });
      
      console.log('매장 추가 성공');
      alert('✅ 매장이 추가되었습니다.');
      await loadStores();
    } catch (error) {
      console.error('매장 추가 실패:', error);
      throw error;
    }
  }, [loadStores]);

  /**
   * 매장 수정
   */
  const updateStore = useCallback(async (storeId: string, data: Partial<StoreFormData>) => {
    try {
      const storeRef = doc(db, 'stores', storeId);
      const { id, ...updateData } = data;
      await updateDoc(storeRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
      
      console.log('매장 수정 성공');
      alert('✅ 매장이 수정되었습니다.');
      await loadStores();
    } catch (error) {
      console.error('매장 수정 실패:', error);
      throw error;
    }
  }, [loadStores]);

  /**
   * 매장 삭제
   */
  const deleteStore = useCallback(async (storeId: string) => {
    try {
      const storeRef = doc(db, 'stores', storeId);
      await deleteDoc(storeRef);
      
      console.log('매장 삭제 성공');
      alert('✅ 매장이 삭제되었습니다.');
      await loadStores();
    } catch (error) {
      console.error('매장 삭제 실패:', error);
      throw error;
    }
  }, [loadStores]);

  return {
    stores,
    loading,
    loadStores,
    addStore,
    updateStore,
    deleteStore,
  };
}
