/**
 * Cloud Functions Employee Service
 * Firebase Admin SDK로만 가능한 직원 관련 작업 처리
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

/**
 * 직원 완전 삭제 (Auth + Firestore)
 * 
 * @description
 * Firebase Auth 계정과 Firestore 문서를 모두 삭제합니다.
 * 클라이언트에서는 다른 사용자의 Auth 계정을 삭제할 수 없으므로
 * Cloud Functions (Admin SDK)를 사용합니다.
 * 
 * @param uid 삭제할 직원의 UID
 * @returns 성공 여부와 메시지
 */
export async function deleteEmployeeAccount(uid: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const deleteFunction = httpsCallable<
      { uid: string },
      { success: boolean; message: string }
    >(functions, 'deleteEmployeeAccount');

    const result = await deleteFunction({ uid });

    console.log('✅ 직원 삭제 완료:', result.data);
    return result.data;
  } catch (error: any) {
    console.error('❌ 직원 삭제 실패:', error);

    let errorMessage = '직원 삭제에 실패했습니다.';

    if (error.code === 'unauthenticated') {
      errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
    } else if (error.code === 'permission-denied') {
      errorMessage = '권한이 없습니다. 관리자에게 문의하세요.';
    } else if (error.code === 'not-found') {
      errorMessage = '직원 정보를 찾을 수 없습니다.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
}
