/**
 * 브랜드 관리 로직 훅
 * 백업: admin-dashboard.html 라인 6089-6417
 */

'use client';

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
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import type { Brand, BrandFormData } from '@/lib/types/store';

interface UseBrandsLogicProps {
  companyId: string;
}

export function useBrandsLogic({ companyId }: UseBrandsLogicProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * 브랜드 목록 로드
   */
  const loadBrands = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, 'brands'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const brandList: Brand[] = [];
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        brandList.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || undefined,
        } as Brand);
      });
      
      setBrands(brandList);
    } catch (error) {
      console.error('브랜드 로드 실패:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  /**
   * 브랜드 추가
   */
  const addBrand = async (formData: BrandFormData) => {
    try {
      const brandData = {
        ...formData,
        companyId,
        createdAt: serverTimestamp(),
        primaryColor: formData.primaryColor || '#4CAF50',
        secondaryColor: formData.secondaryColor || '#2196F3',
      };
      
      await addDoc(collection(db, 'brands'), brandData);
      await loadBrands();
    } catch (error) {
      console.error('브랜드 추가 실패:', error);
      throw error;
    }
  };

  /**
   * 브랜드 수정
   */
  const updateBrand = async (brandId: string, formData: BrandFormData) => {
    try {
      const brandData = {
        ...formData,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(doc(db, 'brands', brandId), brandData);
      await loadBrands();
    } catch (error) {
      console.error('브랜드 수정 실패:', error);
      throw error;
    }
  };

  /**
   * 브랜드 삭제
   */
  const deleteBrand = async (brandId: string, storeCount: number) => {
    if (storeCount > 0) {
      throw new Error(`이 브랜드에 ${storeCount}개의 매장이 연결되어 있어 삭제할 수 없습니다.`);
    }
    
    try {
      await deleteDoc(doc(db, 'brands', brandId));
      await loadBrands();
    } catch (error) {
      console.error('브랜드 삭제 실패:', error);
      throw error;
    }
  };

  /**
   * 브랜드별 매장 수 조회
   */
  const getBrandStoreCounts = useCallback(async () => {
    if (!companyId) return {};
    
    try {
      const q = query(
        collection(db, 'stores'),
        where('companyId', '==', companyId)
      );
      
      const snapshot = await getDocs(q);
      const counts: Record<string, number> = {};
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const brandId = data.brandId || '';
        counts[brandId] = (counts[brandId] || 0) + 1;
      });
      
      return counts;
    } catch (error) {
      console.error('브랜드 매장 수 조회 실패:', error);
      return {};
    }
  }, [companyId]);

  return {
    brands,
    loading,
    loadBrands,
    addBrand,
    updateBrand,
    deleteBrand,
    getBrandStoreCounts,
  };
}
