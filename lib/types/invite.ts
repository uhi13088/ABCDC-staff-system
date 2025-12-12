/**
 * 초대 코드 관련 타입 정의 (Invite Types)
 * Platform Dashboard의 InvitationCode와 통합
 */

import { DateTimeType } from './common';

/**
 * 초대 코드 (Invitation Code)
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
 * 초대 코드 생성 옵션
 */
export interface InviteGenerateOptions {
  planId: string;
  count: number;
  expiresInDays?: number;
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
