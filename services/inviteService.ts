/**
 * Invite Service
 * 초대 코드 관련 Firestore 작업 처리
 * 
 * 컬렉션: company_invites (직원 초대용)
 * 타입: CompanyInvite
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, USER_STATUS } from '@/lib/constants';
import { CompanyInvite, CompanyInviteCreateOptions } from '@/lib/types/invite';

/**
 * 초대 코드 검증
 * @param code - 초대 코드
 * @returns 검증된 초대 정보
 */
export const verifyInviteCode = async (code: string): Promise<{
  valid: boolean;
  invite?: CompanyInvite;
  error?: string;
}> => {
  try {
    if (!code || code.trim() === '') {
      return { valid: false, error: '초대 코드를 입력해주세요.' };
    }

    // 초대 코드 조회
    const invitesQuery = query(
      collection(db, COLLECTIONS.COMPANY_INVITES),
      where('code', '==', code.trim().toUpperCase())
    );

    const snapshot = await getDocs(invitesQuery);

    if (snapshot.empty) {
      return { valid: false, error: '유효하지 않은 초대 코드입니다.' };
    }

    const inviteDoc = snapshot.docs[0];
    const inviteData = inviteDoc.data();

    const invite: CompanyInvite = {
      id: inviteDoc.id,
      code: inviteData.code,
      companyId: inviteData.companyId,
      companyName: inviteData.companyName,
      storeId: inviteData.storeId,
      storeName: inviteData.storeName,
      role: inviteData.role,
      position: inviteData.position, // 직무
      status: inviteData.status,
      maxUses: inviteData.maxUses,
      usedCount: inviteData.usedCount || 0,
      usedBy: inviteData.usedBy || [],
      expiresAt: inviteData.expiresAt,
      inviteUrl: inviteData.inviteUrl,
      createdAt: inviteData.createdAt,
      createdBy: inviteData.createdBy,
      updatedAt: inviteData.updatedAt,
    };

    // 상태 확인
    if (invite.status !== 'active') {
      return { valid: false, error: '비활성화된 초대 코드입니다.' };
    }

    // ⚠️ 사용 횟수 체크 제거 (무제한 사용)
    // ⚠️ 만료일 체크 제거 (영구 사용)

    return { valid: true, invite };
  } catch (error) {
    console.error('❌ 초대 코드 검증 실패:', error);
    return { valid: false, error: '초대 코드 검증 중 오류가 발생했습니다.' };
  }
};

/**
 * 초대 코드 사용 기록
 * @param inviteId - 초대 코드 문서 ID
 * @param userId - 사용한 사용자 UID
 */
export const recordInviteUse = async (inviteId: string, userId: string): Promise<void> => {
  try {
    const inviteRef = doc(db, COLLECTIONS.COMPANY_INVITES, inviteId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error('초대 코드를 찾을 수 없습니다.');
    }

    const inviteData = inviteSnap.data();
    const usedBy = inviteData.usedBy || [];
    const usedCount = inviteData.usedCount || 0;

    // 이미 사용한 사용자인지 확인
    if (usedBy.includes(userId)) {
      console.warn('⚠️ 이미 사용한 초대 코드입니다:', userId);
      return;
    }

    // 사용 기록 업데이트
    await updateDoc(inviteRef, {
      usedCount: usedCount + 1,
      usedBy: [...usedBy, userId],
      updatedAt: Timestamp.now(),
    });

    console.log('✅ 초대 코드 사용 기록 완료:', inviteId, userId);
  } catch (error) {
    console.error('❌ 초대 코드 사용 기록 실패:', error);
    throw error;
  }
};

/**
 * 초대 코드 조회 (단일)
 * @param inviteId - 초대 코드 문서 ID
 * @returns 초대 정보
 */
export const getCompanyInvite = async (inviteId: string): Promise<CompanyInvite | null> => {
  try {
    const inviteRef = doc(db, COLLECTIONS.COMPANY_INVITES, inviteId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      return null;
    }

    const inviteData = inviteSnap.data();

    return {
      id: inviteSnap.id,
      code: inviteData.code,
      companyId: inviteData.companyId,
      companyName: inviteData.companyName,
      storeId: inviteData.storeId,
      storeName: inviteData.storeName,
      role: inviteData.role,
      position: inviteData.position, // 직무
      status: inviteData.status,
      maxUses: inviteData.maxUses,
      usedCount: inviteData.usedCount || 0,
      usedBy: inviteData.usedBy || [],
      expiresAt: inviteData.expiresAt,
      inviteUrl: inviteData.inviteUrl,
      createdAt: inviteData.createdAt,
      createdBy: inviteData.createdBy,
      updatedAt: inviteData.updatedAt,
    };
  } catch (error) {
    console.error('❌ 초대 코드 조회 실패:', error);
    return null;
  }
};

/**
 * 회사별 초대 코드 목록 조회
 * @param companyId - 회사 ID
 * @returns 초대 코드 목록
 */
export const getCompanyInvites = async (companyId: string): Promise<CompanyInvite[]> => {
  try {
    const invitesQuery = query(
      collection(db, COLLECTIONS.COMPANY_INVITES),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(invitesQuery);
    const invites: CompanyInvite[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      invites.push({
        id: doc.id,
        code: data.code,
        companyId: data.companyId,
        companyName: data.companyName,
        storeId: data.storeId,
        storeName: data.storeName,
        role: data.role,
        position: data.position, // 직무
        status: data.status,
        maxUses: data.maxUses,
        usedCount: data.usedCount || 0,
        usedBy: data.usedBy || [],
        expiresAt: data.expiresAt,
        inviteUrl: data.inviteUrl,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        updatedAt: data.updatedAt,
      });
    });

    return invites;
  } catch (error) {
    console.error('❌ 초대 코드 목록 조회 실패:', error);
    return [];
  }
};

/**
 * 초대 코드 생성
 * @param options - 생성 옵션
 * @returns 생성된 초대 코드 정보
 */
export const createCompanyInvite = async (
  options: CompanyInviteCreateOptions
): Promise<CompanyInvite> => {
  try {
    // 6자리 랜덤 코드 생성
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Check if running in browser environment to avoid SSR errors
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://abcdc-staff-system.web.app';

    const inviteData = {
      code,
      companyId: options.companyId,
      storeId: options.storeId,
      storeName: options.storeName || '',
      role: options.role,
      position: options.position || '', // 직무 (선택)
      status: 'active' as const,
      maxUses: options.maxUses,
      usedCount: 0,
      usedBy: [],
      expiresAt: options.expiresAt ? Timestamp.fromDate(options.expiresAt) : null,
      inviteUrl: `${origin}/employee-register?code=${code}`,
      createdAt: Timestamp.now(),
      createdBy: options.companyId, // TODO: 실제 생성자 UID
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.COMPANY_INVITES), inviteData);

    console.log('✅ 초대 코드 생성 완료:', code);

    return {
      id: docRef.id,
      ...inviteData,
    };
  } catch (error) {
    console.error('❌ 초대 코드 생성 실패:', error);
    throw error;
  }
};

/**
 * 초대 코드 상태 변경
 * @param inviteId - 초대 코드 문서 ID
 * @param status - 새로운 상태
 */
export const updateInviteStatus = async (
  inviteId: string,
  status: 'active' | 'inactive'
): Promise<void> => {
  try {
    const inviteRef = doc(db, COLLECTIONS.COMPANY_INVITES, inviteId);

    await updateDoc(inviteRef, {
      status,
      updatedAt: Timestamp.now(),
    });

    console.log(`✅ 초대 코드 상태 변경 완료: ${status}`);
  } catch (error) {
    console.error('❌ 초대 코드 상태 변경 실패:', error);
    throw error;
  }
};
