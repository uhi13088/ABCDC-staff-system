/**
 * Next.js Middleware - 서버 단 인증 보호 (Edge Runtime)
 *
 * 목적: 로그인하지 않은 사용자가 보호된 페이지에 접근하는 것을 서버 측에서 차단
 * 보안: 클라이언트 측 protected-route.tsx만으로는 HTML 껍데기가 노출될 수 있음
 *
 * 보호 경로:
 * - /admin-dashboard, /platform (관리자 페이지)
 * - /employee-dashboard (직원 페이지)
 *
 * 인증 방식:
 * - Session Cookie 존재 여부 확인
 * - 쿠키 없음 → 로그인 페이지로 리다이렉트
 * - 실제 검증은 API Route 및 서버 컴포넌트에서 수행
 *
 * 제약사항:
 * - Edge Runtime에서 실행되므로 firebase-admin 사용 불가
 * - Session Cookie 존재만 확인 (검증은 서버 사이드에서)
 *
 * 보안 강화:
 * - HTTP-only 쿠키로 XSS 방지
 * - 빠른 리다이렉트로 UX 개선
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
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

  // Session Cookie 존재 확인
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    // 쿠키 없음 → 로그인 페이지로 리다이렉트
    const loginUrl = pathname.startsWith('/employee-dashboard')
      ? '/employee-login'
      : '/admin-login';

    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  // JWT 만료 시간 확인 (Edge Runtime에서 가능한 기본 검증)
  try {
    // JWT 파싱 (헤더.페이로드.서명)
    const parts = sessionCookie.split('.');
    if (parts.length === 3) {
      // Base64 디코딩 (패딩 추가)
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decodedPayload = JSON.parse(atob(paddedPayload));

      // exp (만료 시간) 확인
      if (decodedPayload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (decodedPayload.exp < now) {
          // 토큰 만료됨 → 로그인 페이지로 리다이렉트
          const loginUrl = pathname.startsWith('/employee-dashboard')
            ? '/employee-login'
            : '/admin-login';

          return NextResponse.redirect(new URL(loginUrl, request.url));
        }
      }
    }
  } catch (error) {
    // JWT 파싱 실패 → 로그인 페이지로 리다이렉트
    console.error('Invalid JWT format:', error);
    const loginUrl = pathname.startsWith('/employee-dashboard')
      ? '/employee-login'
      : '/admin-login';

    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  // Session Cookie 존재하고 유효 → 통과
  // 실제 서명 검증은 각 페이지의 서버 컴포넌트에서 수행
  return NextResponse.next();
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
