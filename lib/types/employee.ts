/**
 * 직원 관련 타입 정의 (Employee Types)
 * 원본 HTML 기준 + FIELD_NAMING_STANDARD.md
 */

import { BaseUser, DateTimeType } from './common';

/**
 * 직원 정보 (Employee)
 * 원본 HTML의 users 컬렉션 구조 기준
 */
export interface Employee extends BaseUser {
  // BaseUser에서 상속:
  // uid, email, name, phone, birth, role, status
  // companyId, storeId, store, position
  
  // 추가 필드
  id: string;           // uid와 동일 (React 컴포넌트에서 key로 사용)
  storeName?: string;   // 매장명 (store와 동일, 표시용)
  address?: string;     // 주소
  
  // 추가 직원 정보
  employeeNumber?: string;
  
  // 근무 정보
  hireDate?: DateTimeType;
  joinedAt?: DateTimeType;       // 입사일 (표준 필드)
  resignDate?: DateTimeType;
  employmentStatus?: 'active' | 'resigned' | 'leave';
  
  // 급여 정보
  baseSalary?: number;
  hourlyWage?: number;
  
  // 계약 정보
  contractId?: string;
  contractType?: 'regular' | 'contract' | 'part_time';
  
  // 기타
  profileImageUrl?: string;
  notes?: string;
}

/**
 * 직원 등록 폼 데이터
 */
export interface EmployeeFormData {
  name: string;
  email: string;
  phone: string;
  birth: string;
  store: string;
  storeId?: string;
  position: string;
  hireDate: string;
  baseSalary?: number;
  hourlyWage?: number;
  contractType?: string;
}

/**
 * 직원 필터 옵션
 * 원본 HTML에서 실제 사용되는 필터
 */
export interface EmployeeFilterOptions {
  store?: string;
  storeId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'active' | 'resigned';
  employmentStatus?: 'active' | 'resigned';
  search?: string;
}

/**
 * 직원 통계
 */
export interface EmployeeStats {
  total: number;
  active: number;
  resigned: number;
  pending: number;
  byStore: Record<string, number>;
  byPosition: Record<string, number>;
}
