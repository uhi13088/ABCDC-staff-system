/**
 * Logout API Route
 *
 * Session Cookie를 삭제하고 Firebase에서 세션을 무효화합니다.
 *
 * 보안:
 * - Session Cookie 삭제
 * - Firebase에서 Refresh Token 무효화 (옵션)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    // Session Cookie가 있으면 검증 후 무효화
    if (sessionCookie) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);

        // Firebase에서 사용자의 모든 Refresh Token 무효화 (옵션)
        await adminAuth.revokeRefreshTokens(decodedClaims.uid);
      } catch (error) {
        // Session Cookie가 이미 만료되었거나 유효하지 않은 경우 무시
        console.log('Session cookie invalid or expired:', error);
      }
    }

    // Session Cookie 삭제
    cookieStore.delete('session');

    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);

    // 에러가 발생해도 쿠키는 삭제
    const cookieStore = await cookies();
    cookieStore.delete('session');

    return NextResponse.json(
      {
        error: 'Logout partially failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
