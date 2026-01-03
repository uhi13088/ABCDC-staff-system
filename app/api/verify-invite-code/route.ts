/**
 * 초대 코드 검증 API Route
 *
 * 목적: 클라이언트 SDK → Firebase Admin SDK 전환
 * 보안:
 *   1. Firestore Rules 우회 (완전한 서버 권한)
 *   2. invitation_codes 컬렉션 열거 공격(Enumeration Attack) 차단
 *   3. Rate Limiting 적용 (5분에 5회)
 *
 * POST /api/verify-invite-code
 * Request Body: { code: string }
 * Response: { success: boolean, planId?: string, planName?: string, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { COLLECTIONS } from '@/lib/constants';
import { authRateLimit } from '@/lib/api-middleware';

/**
 * POST /api/verify-invite-code
 */
export async function POST(request: NextRequest) {
  // Rate Limiting 체크 (Brute Force 방지)
  const rateLimitResponse = authRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Request Body 파싱
    const body = await request.json();
    const { code } = body;

    // 입력 검증
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: '초대 코드를 입력하세요.' },
        { status: 400 }
      );
    }

    const trimmedCode = code.trim().toUpperCase();

    if (trimmedCode.length < 4 || trimmedCode.length > 20) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 초대 코드 형식입니다.' },
        { status: 400 }
      );
    }

    // Admin SDK로 Firestore 조회 (Rules 우회)
    const codesSnapshot = await adminDb
      .collection(COLLECTIONS.INVITATION_CODES)
      .where('code', '==', trimmedCode)
      .limit(1)
      .get();

    if (codesSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 초대 코드입니다.' },
        { status: 404 }
      );
    }

    const codeDoc = codesSnapshot.docs[0];
    const codeData = codeDoc.data();

    // 사용 여부 확인
    if (codeData.isUsed) {
      return NextResponse.json(
        { success: false, error: '이미 사용된 초대 코드입니다.' },
        { status: 400 }
      );
    }

    // 만료일 확인 (있는 경우)
    if (codeData.expiryDate) {
      // Admin SDK Timestamp는 toDate() 메서드 제공
      const expiryDate = codeData.expiryDate.toDate();
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { success: false, error: '만료된 초대 코드입니다.' },
          { status: 400 }
        );
      }
    }

    // 사용 횟수 제한 확인 (있는 경우)
    if (codeData.maxUses && codeData.usedCount >= codeData.maxUses) {
      return NextResponse.json(
        { success: false, error: '사용 횟수가 초과된 초대 코드입니다.' },
        { status: 400 }
      );
    }

    // 플랜 정보 가져오기 (Admin SDK)
    const planDoc = await adminDb
      .collection(COLLECTIONS.SUBSCRIPTION_PLANS)
      .doc(codeData.linkedPlanId || codeData.planId)
      .get();

    if (!planDoc.exists) {
      return NextResponse.json(
        { success: false, error: '연결된 플랜을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const planData = planDoc.data();

    // 플랜 활성 상태 확인
    if (!planData.isActive) {
      return NextResponse.json(
        { success: false, error: '비활성화된 플랜입니다.' },
        { status: 400 }
      );
    }

    // 성공 응답 (클라이언트에게 최소 정보만 반환)
    return NextResponse.json({
      success: true,
      codeId: codeDoc.id,
      planId: planDoc.id,
      planName: planData.name,
      code: trimmedCode,
    });

  } catch (error) {
    console.error('초대 코드 검증 API 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET 메서드 비활성화
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed. Use POST instead.' },
    { status: 405 }
  );
}
