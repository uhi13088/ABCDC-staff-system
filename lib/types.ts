import { Timestamp } from 'firebase/firestore';

/**
 * 구독 플랜
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  maxUsers: number;
  features: string[];
  description?: string;
  permissions: string[];
  isActive: boolean;
  isPopular: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * 초대 코드
 */
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

/**
 * 사용자 정보
 */
export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'store_manager' | 'employee';
  companyId: string;
  storeId?: string;
  store?: string;
  position?: string;
  planId?: string;
  planName?: string;
  status: 'pending' | 'active' | 'suspended';
  createdAt?: Timestamp;
}

/**
 * 회사 정보
 */
export interface Company {
  id: string;
  name: string;
  planType: string;
  maxUsers: number;
  currentUsers: number;
  status: 'active' | 'suspended';
  createdAt: Timestamp;
  adminEmail: string;
}
