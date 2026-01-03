/**
 * Session Cookie API Route
 *
 * Firebase ID Token을 받아서 검증하고 HTTP-only Session Cookie를 생성합니다.
 *
 * 보안 강화:
 * - HTTP-only 쿠키로 XSS 공격 방지
 * - Secure 플래그로 HTTPS만 허용
 * - SameSite=Strict로 CSRF 공격 방지
 * - Rate Limiting으로 Brute Force 방지 (5분에 5회)
 * - 5일 만료 시간
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { authRateLimit } from '@/lib/api-middleware';

export async function POST(request: NextRequest) {
  // Rate Limiting 체크
  const rateLimitResponse = authRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    // ID 토큰 검증
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Session Cookie 생성 (5일 유효)
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    // HTTP-only 쿠키 설정
    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn / 1000, // seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Session creation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 401 }
    );
  }
}
