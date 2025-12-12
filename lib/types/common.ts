/**
 * 공통 타입 정의 (Common Types)
 * Admin Dashboard 전체에서 사용되는 기본 타입
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Firebase Timestamp 타입
 */
export type FirebaseTimestamp = Timestamp;

/**
 * 날짜/시간 타입 (ISO string 또는 Timestamp)
 */
export type DateTimeType = string | Date | FirebaseTimestamp;

/**
 * 사용자 역할 (Role)
 */
export type UserRole = 
  | 'super_admin'     // 플랫폼 관리자
  | 'admin'           // 회사 관리자
  | 'manager'         // 매니저
  | 'store_manager'   // 매장 관리자
  | 'staff';          // 일반 직원

/**
 * 사용자 상태 (Status)
 */
export type UserStatus = 
  | 'pending'   // 승인 대기
  | 'approved'  // 승인됨
  | 'rejected'  // 거부됨
  | 'active'    // 활성
  | 'inactive'  // 비활성
  | 'resigned'; // 퇴사

/**
 * 기본 사용자 인터페이스
 */
export interface BaseUser {
  uid: string;
  email: string;
  name: string;
  displayName?: string;
  phone?: string;
  birth?: string;
  role: UserRole;
  status: UserStatus;
  companyId: string;
  storeId?: string;
  store?: string;
  position?: string;
  createdAt: DateTimeType;
  updatedAt?: DateTimeType;
}

/**
 * 회사 정보 (Company)
 */
export interface Company {
  id: string;
  name: string;
  brandName?: string;
  logoUrl?: string;
  adminEmail: string;
  planType: string;
  planName?: string;
  maxUsers: number;
  currentUsers: number;
  status: 'active' | 'suspended' | 'trial';
  createdAt: DateTimeType;
  updatedAt?: DateTimeType;
}

/**
 * 매장 정보 (Store)
 */
export interface Store {
  id: string;
  name: string;
  companyId: string;
  address?: string;
  phone?: string;
  managerName?: string;
  isActive: boolean;
  createdAt: DateTimeType;
  updatedAt?: DateTimeType;
}

/**
 * 브랜드 정보 (Brand)
 */
export interface Brand {
  id: string;
  name: string;
  companyId: string;
  logoUrl?: string;
  description?: string;
  isActive: boolean;
  createdAt: DateTimeType;
  updatedAt?: DateTimeType;
}

/**
 * 페이지네이션 (Pagination)
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * 필터 옵션 (Filter Options)
 */
export interface FilterOptions {
  store?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * 정렬 옵션 (Sort Options)
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}
