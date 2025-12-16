/**
 * 초대 코드 검증 API Route (Priority 1: 보안 강화)
 * 
 * 목적: 클라이언트에서 직접 Firestore 조회 → 서버 측 검증으로 변경
 * 보안: invitation_codes 컬렉션 열거 공격(Enumeration Attack) 차단
 * 
 * POST /api/verify-invite-code
 * Request Body: { code: string }
 * Response: { success: boolean, planId?: string, planName?: string, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

// Rate limiting을 위한 간단한 메모리 캐시 (프로덕션에서는 Redis 권장)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1분
const MAX_REQUESTS = 10; // 1분에 최대 10번

/**
 * Rate Limiting 체크
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    // 새로운 윈도우 시작
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * IP 주소 추출
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * POST /api/verify-invite-code
 */
export async function POST(request: NextRequest) {
  try {
    // Rate Limiting 체크
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' 
        },
        { status: 429 }
      );
    }

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

    // Firestore에서 초대 코드 검색
    const codesQuery = query(
      collection(db, COLLECTIONS.INVITATION_CODES),
      where('code', '==', trimmedCode)
    );
    const codesSnapshot = await getDocs(codesQuery);

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

    // 플랜 정보 가져오기
    const planDocRef = doc(db, COLLECTIONS.SUBSCRIPTION_PLANS, codeData.linkedPlanId || codeData.planId);
    const planDoc = await getDoc(planDocRef);

    if (!planDoc.exists()) {
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
