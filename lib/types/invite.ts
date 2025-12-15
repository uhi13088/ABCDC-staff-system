/**
 * 초대 코드 관련 타입 정의 (Invite Types)
 * 
 * 2가지 초대 코드 시스템:
 * 1. InvitationCode: 플랫폼 가입용 (회사가 플랫폼에 가입할 때)
 * 2. CompanyInvite: 직원 초대용 (관리자가 직원을 초대할 때) ⭐
 */

import { DateTimeType } from './common';

/**
 * 플랫폼 가입 초대 코드 (Invitation Code)
 * 컬렉션: invitation_codes
 * 용도: 회사가 플랫폼에 가입할 때 사용
 */
export interface InvitationCode {
  id: string;
  code: string;
  
  // 플랜 정보
  planId: string;
  planName: string;
  
  // 사용 여부
  isUsed: boolean;
  usedBy?: string;
  usedByName?: string;
  usedAt?: DateTimeType;
  
  // 만료 정보
  expiresAt?: DateTimeType;
  isExpired?: boolean;
  
  // 회사 정보 (사용 후)
  companyId?: string;
  companyName?: string;
  
  // 생성자
  createdBy: string;
  createdAt: DateTimeType;
  updatedAt?: DateTimeType;
}

/**
 * 직원 초대 코드 (Company Invite) ⭐
 * 컬렉션: company_invites
 * 용도: 관리자가 직원을 초대할 때 사용
 */
export interface CompanyInvite {
  id: string;
  code: string;                   // 초대 코드 (6자리 영문+숫자)
  
  // 회사/매장 정보
  companyId: string;
  companyName?: string;
  storeId: string;
  storeName: string;
  
  // 권한 정보
  role: 'staff' | 'store_manager' | 'manager';
  
  // 사용 정보
  status: 'active' | 'inactive';
  maxUses: number;                // 최대 사용 횟수
  usedCount: number;              // 현재 사용 횟수
  usedBy?: string[];              // 사용한 사용자 UID 목록
  
  // 만료 정보
  expiresAt?: DateTimeType;
  
  // 초대 URL
  inviteUrl: string;              // 예: https://example.com/employee-register?code=ABC123
  
  createdAt: DateTimeType;
  createdBy?: string;
  updatedAt?: DateTimeType;
}

/**
 * 플랫폼 가입 초대 코드 생성 옵션
 */
export interface InviteGenerateOptions {
  planId: string;
  count: number;
  expiresInDays?: number;
}

/**
 * 직원 초대 코드 생성 옵션
 */
export interface CompanyInviteCreateOptions {
  companyId: string;
  storeId: string;
  storeName?: string;             // 자동으로 채워짐
  role: 'staff' | 'store_manager' | 'manager';
  maxUses: number;
  expiresAt?: Date;
}

/**
 * 초대 코드 통계
 */
export interface InviteStats {
  total: number;
  unused: number;
  used: number;
  expired: number;
  byPlan: Record<string, {
    total: number;
    unused: number;
  }>;
}
