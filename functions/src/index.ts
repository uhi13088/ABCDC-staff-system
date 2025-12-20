/**
 * Cloud Functions for ABC Staff System
 * 
 * 보안 강화: 급여 계산 로직을 클라이언트에서 서버로 이관
 * 목적: 
 * - 급여 금액 변조 방지
 * - 민감한 비즈니스 로직 서버 보호
 * - Firestore Rules를 우회하여 안전한 데이터 처리
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Firebase Admin SDK 초기화
admin.initializeApp();

const db = admin.firestore();

/**
 * 급여 계산 Cloud Function
 * 
 * 호출 방법: 클라이언트에서 Firebase Functions SDK 사용
 * 
 * @example
 * const calculateSalary = httpsCallable(functions, 'calculateMonthlySalary');
 * const result = await calculateSalary({
 *   employeeUid: 'abc123',
 *   yearMonth: '2025-01'
 * });
 * 
 * @param data.employeeUid - 직원 UID
 * @param data.yearMonth - 계산 대상 연월 (YYYY-MM)
 * @returns 계산된 급여 상세 내역
 */
export const calculateMonthlySalary = functions
  .region('asia-northeast3')
  .https.onCall(async (data, context) => {
    // 1. 인증 확인
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        '로그인이 필요합니다.'
      );
    }

    const callerUid = context.auth.uid;
    const { employeeUid, yearMonth } = data;

    // 2. 입력 검증
    if (!employeeUid || !yearMonth) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '직원 UID와 계산 연월이 필요합니다.'
      );
    }

    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '연월 형식이 올바르지 않습니다. (YYYY-MM)'
      );
    }

    try {
      // 3. 권한 확인: 호출자가 관리자인지 확인
      const callerDoc = await db.collection('users').doc(callerUid).get();
      
      if (!callerDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          '호출자 정보를 찾을 수 없습니다.'
        );
      }

      const callerData = callerDoc.data()!;
      const callerRole = callerData.role;
      const callerCompanyId = callerData.companyId;

      // 관리자 권한 확인 (admin, store_manager, manager)
      if (!['admin', 'store_manager', 'manager'].includes(callerRole)) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '급여 계산 권한이 없습니다.'
        );
      }

      // 4. 직원 정보 조회
      const employeeDoc = await db.collection('users').doc(employeeUid).get();
      
      if (!employeeDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          '직원 정보를 찾을 수 없습니다.'
        );
      }

      const employeeData = employeeDoc.data()!;

      // 같은 회사 소속인지 확인
      if (employeeData.companyId !== callerCompanyId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          '다른 회사 직원의 급여는 계산할 수 없습니다.'
        );
      }

      // 5. 계약서 조회
      const contractsSnapshot = await db
        .collection('contracts')
        .where('userId', '==', employeeUid)
        .where('companyId', '==', callerCompanyId)
        .orderBy('startDate', 'desc')
        .limit(1)
        .get();

      if (contractsSnapshot.empty) {
        throw new functions.https.HttpsError(
          'not-found',
          '직원의 계약서를 찾을 수 없습니다.'
        );
      }

      const contractData = contractsSnapshot.docs[0].data();

      // 6. 출퇴근 기록 조회
      const [year, month] = yearMonth.split('-');
      const attendancesSnapshot = await db
        .collection('attendance')
        .where('userId', '==', employeeUid)
        .where('companyId', '==', callerCompanyId)
        .where('date', '>=', `${year}-${month}-01`)
        .where('date', '<=', `${year}-${month}-31`)
        .get();

      const attendances = attendancesSnapshot.docs.map(doc => doc.data());

      // 7. 급여 계산 (실제 계산 로직 - 클라이언트 로직과 동일)
      // TODO: lib/utils/calculate-monthly-salary.ts의 로직을 여기로 이식
      // 현재는 기본 구조만 구현
      
      const salaryResult = {
        employeeUid,
        employeeName: employeeData.name,
        yearMonth,
        salaryType: contractData.salaryType || '시급',
        basePay: 0, // 계산 로직 추가 필요
        overtimePay: 0,
        nightPay: 0,
        holidayPay: 0,
        weeklyHolidayPay: 0,
        totalPay: 0,
        totalWorkHours: attendances.length,
        calculatedAt: admin.firestore.FieldValue.serverTimestamp(),
        calculatedBy: callerUid,
      };

      // 8. 계산 결과 Firestore에 저장
      await db.collection('salary').add({
        ...salaryResult,
        companyId: callerCompanyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 9. 결과 반환
      return {
        success: true,
        data: salaryResult,
      };

    } catch (error: any) {
      console.error('급여 계산 오류:', error);
      
      // HttpsError는 그대로 throw
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // 기타 오류는 internal로 래핑
      throw new functions.https.HttpsError(
        'internal',
        '급여 계산 중 오류가 발생했습니다.',
        error.message
      );
    }
  });
