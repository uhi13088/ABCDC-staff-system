import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InvitationCode, InviteGenerateOptions } from '@/lib/types/invite';
import { Store } from '@/lib/types/common';

/**
 * Invite 관리 Hook
 * 원본 파일: admin-dashboard.html
 * 기존 함수: loadInvites, createInviteCode, toggleInviteStatus, copyInviteUrl
 */
export const useInviteLogic = (companyId: string) => {
  const [invites, setInvites] = useState<InvitationCode[]>([]);
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
      const invitesQuery = query(
        collection(db, 'company_invites'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(invitesQuery);
      const loadedInvites: InvitationCode[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        loadedInvites.push({
          id: doc.id,
          code: data.code,
          companyId: data.companyId,
          storeId: data.storeId,
          storeName: data.storeName,
          role: data.role,
          status: data.status,
          maxUses: data.maxUses,
          usedCount: data.usedCount || 0,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          inviteUrl: data.inviteUrl,
        });
      });

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
        collection(db, 'stores'),
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
  const createInviteCode = async (options: InviteGenerateOptions) => {
    if (!companyId) throw new Error('companyId가 없습니다.');

    try {
      // 초대 코드 생성 (6자리 랜덤 영문+숫자)
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 매장명 가져오기
      const selectedStore = stores.find(s => s.id === options.storeId);
      if (!selectedStore) throw new Error('매장을 선택해주세요.');

      // Firestore에 저장
      const inviteData = {
        code,
        companyId,
        storeId: options.storeId,
        storeName: selectedStore.name,
        role: options.role,
        status: 'active' as const,
        maxUses: options.maxUses,
        usedCount: 0,
        createdAt: new Date(),
        expiresAt: options.expiresAt || null,
        inviteUrl: `${window.location.origin}/register?code=${code}`, // 실제 가입 URL
      };

      await addDoc(collection(db, 'company_invites'), inviteData);

      console.log('✅ 초대 코드 생성 완료:', code);
      
      // 목록 새로고침
      await loadInvites();

      return code;
    } catch (error) {
      console.error('❌ 초대 코드 생성 실패:', error);
      throw error;
    }
  };

  // ==================== 초대 코드 상태 변경 (활성/비활성) ====================
  const toggleInviteStatus = async (inviteId: string, currentStatus: 'active' | 'inactive') => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const inviteRef = doc(db, 'company_invites', inviteId);

      await updateDoc(inviteRef, {
        status: newStatus,
      });

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
  };
};
