/**
 * Rate Limiter - API 요청 제한
 *
 * 목적:
 * - Brute Force 공격 방지 (로그인, 회원가입)
 * - API 남용 방지
 * - DDoS 공격 완화
 *
 * 구현:
 * - In-memory storage (간단하고 빠름)
 * - IP 주소 기반 제한
 * - 슬라이딩 윈도우 알고리즘
 *
 * 업그레이드:
 * - 프로덕션 환경에서는 Redis/Upstash로 변경 권장
 * - 다중 서버 환경에서 상태 공유 가능
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 5분마다 만료된 항목 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Rate limit 체크
   * @param key - 식별자 (IP 주소 등)
   * @param limit - 최대 요청 수
   * @param windowMs - 시간 창 (밀리초)
   * @returns { success: boolean, remaining: number, resetTime: number }
   */
  check(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const record = this.store[key];

    // 첫 요청 또는 시간 창 만료
    if (!record || now > record.resetTime) {
      this.store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };

      return {
        success: true,
        remaining: limit - 1,
        resetTime: now + windowMs,
      };
    }

    // 제한 초과
    if (record.count >= limit) {
      return {
        success: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    // 요청 카운트 증가
    record.count++;

    return {
      success: true,
      remaining: limit - record.count,
      resetTime: record.resetTime,
    };
  }

  /**
   * 만료된 항목 정리
   */
  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (now > this.store[key].resetTime) {
        delete this.store[key];
      }
    });
  }

  /**
   * 특정 키 초기화
   */
  reset(key: string) {
    delete this.store[key];
  }

  /**
   * 모든 항목 초기화
   */
  clear() {
    this.store = {};
  }

  /**
   * Cleanup interval 해제
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// 싱글톤 인스턴스
const rateLimiter = new RateLimiter();

export default rateLimiter;

/**
 * Rate Limit 설정 프리셋
 */
export const RATE_LIMITS = {
  // 로그인/회원가입: 5분에 5회
  AUTH: {
    limit: 5,
    windowMs: 5 * 60 * 1000,
  },
  // 일반 API: 1분에 30회
  API: {
    limit: 30,
    windowMs: 60 * 1000,
  },
  // 민감한 작업 (비밀번호 변경 등): 15분에 3회
  SENSITIVE: {
    limit: 3,
    windowMs: 15 * 60 * 1000,
  },
} as const;
