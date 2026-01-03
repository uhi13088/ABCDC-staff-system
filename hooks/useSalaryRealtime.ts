/**
 * ========================================
 * useSalaryRealtime Hook v2.0
 * ========================================
 * 
 * 핵심 철학: Real-time First
 * - onSnapshot으로 실시간 동기화
 * - 무한 루프 완전 제거
 * - View-only (계산 없음)
 * 
 * 사용법:
 * const { salary, loading } = useSalaryRealtime(userId, companyId, yearMonth);
 */

'use client';

import { useState, useEffect } from 'react';
import { Unsubscribe } from 'firebase/firestore';
import { 
  MonthlySalarySummary, 
  subscribeMonthlySalary 
} from '@/services/salaryService.v2';

interface UseSalaryRealtimeParams {
  userId: string;
  companyId: string;
  yearMonth: string;
  enabled?: boolean; // 구독 활성화 여부
}

export function useSalaryRealtime(params: UseSalaryRealtimeParams) {
  const { userId, companyId, yearMonth, enabled = true } = params;
  
  const [salary, setSalary] = useState<MonthlySalarySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // 구독 비활성화 시 리턴
    if (!enabled || !userId || !companyId || !yearMonth) {
      setLoading(false);
      return;
    }
    
    console.log('🔔 급여 실시간 구독 시작:', { userId, yearMonth });
    
    let unsubscribe: Unsubscribe | null = null;
    
    try {
      // onSnapshot으로 실시간 리스너 등록
      unsubscribe = subscribeMonthlySalary(
        userId,
        companyId,
        yearMonth,
        (updatedSalary) => {
          console.log('📡 급여 실시간 업데이트:', updatedSalary);
          setSalary(updatedSalary);
          setLoading(false);
          setError(null);
        }
      );
      
    } catch (err: any) {
      console.error('❌ 급여 구독 실패:', err);
      setError(err.message || '급여 조회에 실패했습니다.');
      setLoading(false);
    }
    
    // Cleanup: 컴포넌트 언마운트 시 구독 해제
    return () => {
      if (unsubscribe) {
        console.log('🔕 급여 구독 해제');
        unsubscribe();
      }
    };
    
    // 의존성 배열: userId, companyId, yearMonth, enabled만 포함
    // ✅ 함수가 아닌 값만 포함하여 무한 루프 방지
  }, [userId, companyId, yearMonth, enabled]);
  
  return {
    salary,
    loading,
    error,
  };
}

/**
 * 회사 전체 직원 급여 실시간 Hook
 */
export function useCompanySalaryRealtime(
  companyId: string,
  yearMonth: string,
  filters?: {
    storeId?: string;
  },
  enabled = true
) {
  const [salaries, setSalaries] = useState<MonthlySalarySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!enabled || !companyId || !yearMonth) {
      setLoading(false);
      return;
    }
    
    console.log('🔔 회사 급여 실시간 구독:', { companyId, yearMonth });
    
    let unsubscribe: Unsubscribe | null = null;
    
    // 동적으로 import (코드 스플리팅)
    import('@/services/salaryService.v2').then(({ subscribeCompanySalaries }) => {
      unsubscribe = subscribeCompanySalaries(
        companyId,
        yearMonth,
        filters || {},
        (updatedSalaries) => {
          console.log('📡 회사 급여 실시간 업데이트:', updatedSalaries.length, '명');
          setSalaries(updatedSalaries);
          setLoading(false);
          setError(null);
        }
      );
    }).catch((err) => {
      console.error('❌ 회사 급여 구독 실패:', err);
      setError(err.message);
      setLoading(false);
    });
    
    return () => {
      if (unsubscribe) {
        console.log('🔕 회사 급여 구독 해제');
        unsubscribe();
      }
    };
    
    // 의존성 배열 최적화
  }, [companyId, yearMonth, filters?.storeId, enabled]);
  
  return {
    salaries,
    loading,
    error,
  };
}
