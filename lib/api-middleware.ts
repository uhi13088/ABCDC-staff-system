/**
 * API Middleware Helpers
 *
 * Rate Limiting 및 기타 API 보호 기능
 */

import { NextRequest, NextResponse } from 'next/server';
import rateLimiter, { RATE_LIMITS } from './rate-limiter';

/**
 * IP 주소 추출
 */
export function getClientIp(request: NextRequest): string {
  // Vercel/Cloudflare 등의 프록시 헤더 확인
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // 로컬 개발 환경
  return '127.0.0.1';
}

/**
 * Rate Limit 체크 미들웨어
 */
export function checkRateLimit(
  request: NextRequest,
  config: { limit: number; windowMs: number }
): NextResponse | null {
  const ip = getClientIp(request);
  const key = `${ip}:${request.nextUrl.pathname}`;

  const result = rateLimiter.check(key, config.limit, config.windowMs);

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: '요청 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        },
      }
    );
  }

  // Rate limit 통과 - headers에 정보 추가
  return null; // null = 통과
}

/**
 * Rate Limit 헤더 추가
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: { remaining: number; resetTime: number },
  limit: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

  return response;
}

/**
 * 인증 API용 Rate Limit 미들웨어 (로그인, 회원가입)
 */
export function authRateLimit(request: NextRequest): NextResponse | null {
  return checkRateLimit(request, RATE_LIMITS.AUTH);
}

/**
 * 일반 API용 Rate Limit 미들웨어
 */
export function apiRateLimit(request: NextRequest): NextResponse | null {
  return checkRateLimit(request, RATE_LIMITS.API);
}

/**
 * 민감한 작업용 Rate Limit 미들웨어
 */
export function sensitiveRateLimit(request: NextRequest): NextResponse | null {
  return checkRateLimit(request, RATE_LIMITS.SENSITIVE);
}
