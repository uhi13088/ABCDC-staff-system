/**
 * Next.js Middleware - 서버 단 인증 보호
 *
 * 목적: 로그인하지 않은 사용자가 보호된 페이지에 접근하는 것을 서버 측에서 차단
 * 보안: 클라이언트 측 protected-route.tsx만으로는 HTML 껍데기가 노출될 수 있음
 *
 * 보호 경로:
 * - /admin-dashboard, /platform (관리자 페이지)
 * - /employee-dashboard (직원 페이지)
 *
 * 인증 방식:
 * - Firebase Session Cookie를 검증
 * - 쿠키 없음/유효하지 않음 → 로그인 페이지로 리다이렉트
 *
 * 보안 강화:
 * - HTTP-only 쿠키로 XSS 방지
 * - 서버 사이드 검증으로 HTML 노출 차단
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

// 보호할 경로 패턴
const PROTECTED_ROUTES = [
  '/admin-dashboard',
  '/platform',
  '/employee-dashboard',
];

// 로그인 페이지 (인증 필요 없음)
const PUBLIC_ROUTES = [
  '/',
  '/admin-login',
  '/employee-login',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 라우트는 미들웨어 적용 제외
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // 보호된 경로인지 확인
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Session Cookie 확인
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    // 쿠키 없음 → 로그인 페이지로 리다이렉트
    const loginUrl = pathname.startsWith('/employee-dashboard')
      ? '/employee-login'
      : '/admin-login';

    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  // Session Cookie 검증
  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);

    // 검증 성공 → 통과
    return NextResponse.next();
  } catch (error) {
    // 검증 실패 (만료/유효하지 않음) → 로그인 페이지로 리다이렉트
    console.error('Session verification failed:', error);

    const loginUrl = pathname.startsWith('/employee-dashboard')
      ? '/employee-login'
      : '/admin-login';

    // 쿠키 삭제 후 리다이렉트
    const response = NextResponse.redirect(new URL(loginUrl, request.url));
    response.cookies.delete('session');

    return response;
  }
}

// Middleware 적용 경로 설정
export const config = {
  matcher: [
    /*
     * 모든 경로에 적용하되, 다음 경로는 제외:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
