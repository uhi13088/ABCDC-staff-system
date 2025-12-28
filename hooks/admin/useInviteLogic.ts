import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CompanyInvite, CompanyInviteCreateOptions } from '@/lib/types/invite';
import { Store } from '@/lib/types/common';
import { COLLECTIONS } from '@/lib/constants';
import {
  getCompanyInvites,
  createCompanyInvite,
  updateInviteStatus,
} from '@/services/inviteService';

/**
 * Invite 관리 Hook
 * 원본 파일: admin-dashboard.html
 * 기존 함수: loadInvites, createInviteCode, toggleInviteStatus, copyInviteUrl
 */
export const useInviteLogic = (companyId: string) => {
  const [invites, setInvites] = useState<CompanyInvite[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ==================== 초대 코드 목록 로드 ====================
  const loadInvites = async () => {
    if (!companyId) {
      console.error('❌ companyId 없음');
      return;
    }

    setIsLoading(true);
    try {
      const loadedInvites = await getCompanyInvites(companyId);
      setInvites(loadedInvites);
      console.log(`✅ ${loadedInvites.length}개 초대 코드 로드 완료`);
    } catch (error) {
      console.error('❌ 초대 코드 로드 실패:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== 매장 목록 로드 ====================
  const loadStoresForInvite = async () => {
    if (!companyId) return;

    try {
      const storesQuery = query(
        collection(db, COLLECTIONS.STORES),
        where('companyId', '==', companyId)
      );

      const snapshot = await getDocs(storesQuery);
      const loadedStores: Store[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedStores.push({
          id: doc.id,
          name: data.name,
          companyId: data.companyId,
          brandId: data.brandId,
          brandName: data.brandName,
          address: data.address,
          status: data.status,
        });
      });

      setStores(loadedStores);
      console.log(`✅ ${loadedStores.length}개 매장 로드 완료`);
    } catch (error) {
      console.error('❌ 매장 로드 실패:', error);
    }
  };

  // ==================== 초대 코드 생성 ====================
  const createInviteCode = async (options: CompanyInviteCreateOptions) => {
    if (!companyId) throw new Error('companyId가 없습니다.');

    try {
      // 매장명 가져오기
      const selectedStore = stores.find(s => s.id === options.storeId);
      if (!selectedStore) throw new Error('매장을 선택해주세요.');

      // Service 함수 사용
      const invite = await createCompanyInvite({
        ...options,
        companyId,
        storeName: selectedStore.name,
      });

      console.log('✅ 초대 코드 생성 완료:', invite.code);
      
      // 목록 새로고침
      await loadInvites();

      return invite.code;
    } catch (error) {
      console.error('❌ 초대 코드 생성 실패:', error);
      throw error;
    }
  };

  // ==================== 초대 코드 상태 변경 (활성/비활성) ====================
  const toggleInviteStatus = async (inviteId: string, currentStatus: 'active' | 'inactive') => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      // Service 함수 사용
      await updateInviteStatus(inviteId, newStatus);

      console.log(`✅ 초대 코드 상태 변경 완료: ${currentStatus} → ${newStatus}`);
      
      // 목록 새로고침
      await loadInvites();
    } catch (error) {
      console.error('❌ 초대 코드 상태 변경 실패:', error);
      throw error;
    }
  };

  // ==================== 초대 URL 복사 ====================
  const copyInviteUrl = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('✅ 초대 링크가 클립보드에 복사되었습니다!');
        console.log('✅ URL 복사 완료:', url);
      })
      .catch((error) => {
        console.error('❌ 클립보드 복사 실패:', error);
        alert('❌ 복사에 실패했습니다. 수동으로 복사해주세요.');
      });
  };

  // ==================== 초대 코드 삭제 ====================
  const deleteInviteCode = async (inviteId: string) => {
    if (!confirm('이 초대 코드를 삭제하시겠습니까?\n\n⚠️ 주의: 이미 사용된 초대 코드는 직원 데이터에 영향을 주지 않습니다.')) {
      return;
    }

    try {
      const inviteRef = doc(db, COLLECTIONS.COMPANY_INVITES, inviteId);
      await deleteDoc(inviteRef);

      console.log('✅ 초대 코드 삭제 완료:', inviteId);
      alert('✅ 초대 코드가 삭제되었습니다.');
      
      // 목록 새로고침
      await loadInvites();
    } catch (error) {
      console.error('❌ 초대 코드 삭제 실패:', error);
      alert('❌ 초대 코드 삭제에 실패했습니다.');
      throw error;
    }
  };

  // 초기 로드
  useEffect(() => {
    if (companyId) {
      loadInvites();
      loadStoresForInvite();
    }
  }, [companyId]);

  return {
    invites,
    stores,
    isLoading,
    loadInvites,
    createInviteCode,
    toggleInviteStatus,
    copyInviteUrl,
    deleteInviteCode,
  };
};
