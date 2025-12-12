/**
 * 플랫폼 대시보드 비즈니스 로직
 * 기존 platform-dashboard.html의 JavaScript 로직을 TypeScript로 변환
 */

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ========================================
// 타입 정의
// ========================================

export interface Company {
  id: string;
  name: string;
  planType: string;
  planName?: string;
  maxUsers: number;
  currentUsers: number;
  status: 'active' | 'suspended';
  createdAt: Timestamp;
  adminEmail: string;
  adminName?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  maxUsers: number;
  features: string[];
  permissions: string[];
  isActive: boolean;
  isPopular: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InvitationCode {
  id: string;
  code: string;
  planId: string;
  planName: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}

// ========================================
// 회사 관리 로직
// ========================================

/**
 * 회사 목록 로드 (정렬 및 필터링 지원)
 */
export async function loadCompanies(filters?: {
  planType?: string;
  status?: string;
  searchTerm?: string;
}) {
  try {
    let q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));

    if (filters?.planType && filters.planType !== 'all') {
      q = query(q, where('planType', '==', filters.planType));
    }

    if (filters?.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }

    const snapshot = await getDocs(q);
    let companies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Company[];

    // 클라이언트 사이드 검색 (Firestore 제한)
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      companies = companies.filter(company =>
        company.name.toLowerCase().includes(term) ||
        company.adminEmail.toLowerCase().includes(term)
      );
    }

    return companies;
  } catch (error) {
    console.error('회사 목록 로드 실패:', error);
    throw error;
  }
}

/**
 * 회사 통계 계산
 */
export function calculateCompanyStats(companies: Company[]) {
  const totalUsers = companies.reduce((sum, c) => sum + (c.currentUsers || 0), 0);
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  
  return {
    totalCompanies: companies.length,
    totalUsers,
    activeCompanies,
    suspendedCompanies: companies.length - activeCompanies,
  };
}

/**
 * 회사 상태 업데이트
 */
export async function updateCompanyStatus(companyId: string, status: 'active' | 'suspended') {
  try {
    await updateDoc(doc(db, 'companies', companyId), {
      status,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('회사 상태 업데이트 실패:', error);
    throw error;
  }
}

/**
 * 회사 삭제
 */
export async function deleteCompany(companyId: string) {
  try {
    await deleteDoc(doc(db, 'companies', companyId));
  } catch (error) {
    console.error('회사 삭제 실패:', error);
    throw error;
  }
}

// ========================================
// 구독 플랜 관리 로직
// ========================================

/**
 * 플랜 목록 로드
 */
export async function loadPlans() {
  try {
    const q = query(
      collection(db, 'subscription_plans'),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SubscriptionPlan[];

    plans.sort((a, b) => a.price - b.price);
    return plans;
  } catch (error) {
    console.error('플랜 로드 실패:', error);
    throw error;
  }
}

/**
 * 플랜 저장 (생성/수정)
 */
export async function savePlan(planData: Omit<SubscriptionPlan, 'createdAt' | 'updatedAt'>, existingId?: string) {
  try {
    const data = {
      ...planData,
      updatedAt: Timestamp.now(),
    };

    if (existingId) {
      // 수정
      await updateDoc(doc(db, 'subscription_plans', existingId), data);
      return existingId;
    } else {
      // 새로 생성
      const docRef = await addDoc(collection(db, 'subscription_plans'), {
        ...data,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    }
  } catch (error) {
    console.error('플랜 저장 실패:', error);
    throw error;
  }
}

/**
 * 플랜 삭제
 */
export async function deletePlan(planId: string) {
  try {
    await deleteDoc(doc(db, 'subscription_plans', planId));
  } catch (error) {
    console.error('플랜 삭제 실패:', error);
    throw error;
  }
}

/**
 * 샘플 플랜 4개 생성
 */
export async function seedInitialPlans() {
  const samplePlans = [
    {
      id: 'plan_free',
      name: 'Starter',
      description: '소규모 팀을 위한 무료 플랜',
      price: 0,
      billingCycle: 'monthly' as const,
      maxUsers: 5,
      permissions: [],
      isPopular: false,
      isActive: true,
      features: ['레시피 관리', '직원 관리', '급여 관리'],
    },
    {
      id: 'plan_basic',
      name: 'Basic',
      description: '성장하는 팀을 위한 기본 플랜',
      price: 9900,
      billingCycle: 'monthly' as const,
      maxUsers: 15,
      permissions: ['recipe.print', 'recipe.view_secret'],
      isPopular: false,
      isActive: true,
      features: ['레시피 관리', '직원 관리', '급여 관리'],
    },
    {
      id: 'plan_pro',
      name: 'Pro',
      description: '전문적인 관리가 필요한 팀',
      price: 29000,
      billingCycle: 'monthly' as const,
      maxUsers: 50,
      permissions: [
        'recipe.print',
        'recipe.view_secret',
        'recipe.share_external',
        'staff.manage_contract',
        'staff.schedule_manage',
      ],
      isPopular: true,
      isActive: true,
      features: ['레시피 관리', '직원 관리', '급여 관리'],
    },
    {
      id: 'plan_enterprise',
      name: 'Master',
      description: '대규모 조직을 위한 완벽한 솔루션',
      price: 59000,
      billingCycle: 'monthly' as const,
      maxUsers: 9999,
      permissions: [
        'recipe.print',
        'recipe.view_secret',
        'recipe.share_external',
        'staff.manage_contract',
        'staff.invite_email',
        'staff.schedule_manage',
        'data.export_all',
        'data.bulk_update',
      ],
      isPopular: false,
      isActive: true,
      features: ['레시피 관리', '직원 관리', '급여 관리'],
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const plan of samplePlans) {
    try {
      // 중복 체크
      const existingQuery = query(
        collection(db, 'subscription_plans'),
        where('id', '==', plan.id)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (existingSnapshot.empty) {
        await addDoc(collection(db, 'subscription_plans'), {
          ...plan,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        created++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`플랜 ${plan.id} 생성 실패:`, error);
    }
  }

  return { created, skipped };
}

// ========================================
// 초대 코드 관리 로직
// ========================================

/**
 * 초대 코드 목록 로드
 */
export async function loadInviteCodes() {
  try {
    const q = query(
      collection(db, 'invitation_codes'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InvitationCode[];
  } catch (error) {
    console.error('초대 코드 로드 실패:', error);
    throw error;
  }
}

/**
 * 랜덤 코드 생성 (ABC-XXXX-XXXX 형식)
 */
export function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 초대 코드 생성
 */
export async function generateInviteCodes(planId: string, planName: string, count: number, createdBy: string) {
  try {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = generateRandomCode();
      await addDoc(collection(db, 'invitation_codes'), {
        code,
        planId,
        planName,
        isUsed: false,
        createdAt: Timestamp.now(),
        createdBy,
      });
      codes.push(code);
    }

    return codes;
  } catch (error) {
    console.error('초대 코드 생성 실패:', error);
    throw error;
  }
}

/**
 * 초대 코드 삭제
 */
export async function deleteInviteCode(codeId: string) {
  try {
    await deleteDoc(doc(db, 'invitation_codes', codeId));
  } catch (error) {
    console.error('초대 코드 삭제 실패:', error);
    throw error;
  }
}

// ========================================
// 유틸리티 함수
// ========================================

/**
 * 날짜 포맷팅
 */
export function formatDate(timestamp: Timestamp | undefined): string {
  if (!timestamp) return '-';
  return timestamp.toDate().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 가격 포맷팅
 */
export function formatPrice(price: number): string {
  return price === 0 ? '무료' : `${price.toLocaleString()}원`;
}

/**
 * 사용률 계산 및 상태 반환
 */
export function getUsageStatus(current: number, max: number): {
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
} {
  const percentage = (current / max) * 100;
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  
  if (percentage >= 90) status = 'danger';
  else if (percentage >= 70) status = 'warning';
  
  return { percentage, status };
}
