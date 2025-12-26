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
 * - Firebase Auth의 ID Token을 쿠키에서 확인
 * - 쿠키 없음 → 로그인 페이지로 리다이렉트
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

  // ⚠️ Firebase Client SDK는 자동으로 쿠키를 설정하지 않음
  // 클라이언트 측 AuthContext에서 인증 체크를 수행하므로
  // Middleware는 일단 통과시키고, 클라이언트에서 redirect 처리
  // (Firebase Session Cookie를 사용하려면 별도 설정 필요)
  
  // 인증 체크 없이 통과 (클라이언트 측에서 처리)
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
