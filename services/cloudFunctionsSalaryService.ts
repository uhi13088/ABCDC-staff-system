/**
 * Cloud Functions Salary Service
 * 
 * 서버 사이드 급여 계산을 위한 Cloud Functions 호출 서비스
 * 보안: 급여 계산 로직이 서버에서 실행되어 변조 불가
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type { MonthlySalaryResult } from '@/lib/types/salary';

/**
 * Cloud Functions 인스턴스 (region: asia-northeast3)
 */
const functions = getFunctions(undefined, 'asia-northeast3');

/**
 * Cloud Function을 통한 급여 계산
 * 
 * @param employeeUid - 직원 UID
 * @param yearMonth - 계산 연월 (YYYY-MM)
 * @returns 계산된 급여 상세 내역
 */
export async function calculateMonthlySalaryOnServer(
  employeeUid: string,
  yearMonth: string
): Promise<MonthlySalaryResult> {
  try {
    // Cloud Function 호출
    const calculateSalary = httpsCallable<
      { employeeUid: string; yearMonth: string },
      { success: boolean; data: MonthlySalaryResult }
    >(functions, 'calculateMonthlySalary');

    const result = await calculateSalary({ employeeUid, yearMonth });

    if (!result.data.success) {
      throw new Error('급여 계산에 실패했습니다.');
    }

    return result.data.data;
  } catch (error: any) {
    console.error('Cloud Functions 급여 계산 오류:', error);
    
    // 에러 메시지 변환
    if (error.code === 'functions/unauthenticated') {
      throw new Error('로그인이 필요합니다.');
    } else if (error.code === 'functions/permission-denied') {
      throw new Error('급여 계산 권한이 없습니다.');
    } else if (error.code === 'functions/not-found') {
      throw new Error('직원 정보 또는 계약서를 찾을 수 없습니다.');
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('급여 계산 중 오류가 발생했습니다.');
    }
  }
}
