/**
 * Timestamp 안전 변환 유틸리티
 * 
 * 🔒 Phase I: Timestamp 타입 불일치 방지
 * - Legacy 데이터 (null/undefined) 처리
 * - FieldValue (serverTimestamp 미확정) 처리
 * - Timestamp 객체 검증
 * 
 * @see LEGACY_MIGRATION_CHECKLIST.md
 */

import { Timestamp } from 'firebase/firestore';

/**
 * 허용되는 Timestamp 입력 타입
 * - Firestore Timestamp 객체
 * - Date 객체
 * - ISO 문자열 (Legacy 데이터)
 * - Unix timestamp (숫자, 밀리초)
 * - null/undefined (fallback 사용)
 */
export type TimestampInput = 
  | Timestamp 
  | Date 
  | string 
  | number 
  | null 
  | undefined;

/**
 * Firestore Timestamp를 안전하게 Date로 변환
 * 
 * @param value - Firestore Timestamp 또는 null/undefined
 * @param fallback - 변환 실패 시 기본값 (기본: 현재 시간)
 * @returns Date 객체
 * 
 * @example
 * ```typescript
 * // ✅ 안전한 변환
 * const createdAt = safeToDate(data.createdAt);
 * const updatedAt = safeToDate(data.updatedAt, null);  // null 허용
 * 
 * // ❌ 위험한 기존 코드
 * const createdAt = data.createdAt.toDate();  // TypeError 가능
 * ```
 */
export function safeToDate(
  value: TimestampInput,
  fallback: Date | null = new Date()
): Date | null {
  // null/undefined 체크
  if (value === null || value === undefined) {
    return fallback;
  }

  // Timestamp 객체인지 확인 (toDate 메서드 존재 여부)
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch (error) {
      console.warn('⚠️ Timestamp.toDate() 실패:', error);
      return fallback;
    }
  }

  // 이미 Date 객체인 경우
  if (value instanceof Date) {
    return value;
  }

  // 문자열 날짜인 경우 (Legacy 데이터)
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // 숫자 타임스탬프인 경우 (Unix timestamp)
  if (typeof value === 'number') {
    return new Date(value);
  }

  console.warn('⚠️ 알 수 없는 Timestamp 형식:', typeof value, value);
  return fallback;
}

/**
 * Timestamp를 안전하게 한국어 날짜 문자열로 변환
 * 
 * @param value - Firestore Timestamp
 * @param options - Intl.DateTimeFormatOptions
 * @returns 한국어 날짜 문자열 (예: "2024년 1월 15일")
 * 
 * @example
 * ```typescript
 * // ✅ 안전한 변환
 * const dateStr = safeToLocaleDateString(data.createdAt);
 * // "2024년 1월 15일"
 * 
 * const dateTimeStr = safeToLocaleDateString(data.createdAt, {
 *   year: 'numeric',
 *   month: 'long',
 *   day: 'numeric',
 *   hour: '2-digit',
 *   minute: '2-digit'
 * });
 * // "2024년 1월 15일 오후 3:30"
 * ```
 */
export function safeToLocaleDateString(
  value: TimestampInput,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  const date = safeToDate(value, null);
  
  if (!date) {
    return '-';
  }

  try {
    return date.toLocaleDateString('ko-KR', options);
  } catch (error) {
    console.warn('⚠️ toLocaleDateString 실패:', error);
    return '-';
  }
}

/**
 * Timestamp를 안전하게 한국어 날짜/시간 문자열로 변환
 * 
 * @param value - Firestore Timestamp
 * @param options - Intl.DateTimeFormatOptions
 * @returns 한국어 날짜/시간 문자열 (예: "2024. 1. 15. 오후 3:30:45")
 * 
 * @example
 * ```typescript
 * const dateTimeStr = safeToLocaleString(data.createdAt);
 * // "2024. 1. 15. 오후 3:30:45"
 * ```
 */
export function safeToLocaleString(
  value: TimestampInput,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = safeToDate(value, null);
  
  if (!date) {
    return '-';
  }

  try {
    return date.toLocaleString('ko-KR', options);
  } catch (error) {
    console.warn('⚠️ toLocaleString 실패:', error);
    return '-';
  }
}

/**
 * 두 Timestamp의 차이를 계산 (밀리초)
 * 
 * @param start - 시작 Timestamp
 * @param end - 종료 Timestamp
 * @returns 밀리초 차이 (end - start)
 * 
 * @example
 * ```typescript
 * const diff = getTimestampDiff(data.startTime, data.endTime);
 * const hours = diff / (1000 * 60 * 60);  // 시간 단위
 * ```
 */
export function getTimestampDiff(start: TimestampInput, end: TimestampInput): number {
  const startDate = safeToDate(start, null);
  const endDate = safeToDate(end, null);

  if (!startDate || !endDate) {
    return 0;
  }

  return endDate.getTime() - startDate.getTime();
}

/**
 * Timestamp 배열을 Date 배열로 안전하게 변환
 * 
 * @param values - Timestamp 배열
 * @returns Date 배열 (null 제외)
 * 
 * @example
 * ```typescript
 * const dates = safeToDateArray(docs.map(doc => doc.data().createdAt));
 * ```
 */
export function safeToDateArray(values: TimestampInput[]): Date[] {
  return values
    .map(v => safeToDate(v, null))
    .filter((d): d is Date => d !== null);
}

/**
 * Firestore 문서 데이터에서 모든 Timestamp 필드를 자동으로 문자열로 변환
 * React 렌더링 시 "Objects are not valid as a React child" 에러 완전 방지
 * 
 * @param data - Firestore 문서 데이터
 * @returns 모든 Timestamp가 ISO 문자열로 변환된 데이터
 * 
 * @example
 * ```typescript
 * const docData = doc.data();
 * const safeData = sanitizeTimestamps(docData);
 * // 모든 Timestamp 필드가 자동으로 ISO 문자열로 변환됨
 * ```
 */
export function sanitizeTimestamps<T extends Record<string, any>>(data: T): T {
  if (!data) return data;
  
  const result: any = { ...data };

  Object.keys(result).forEach(key => {
    const value = result[key];
    
    // null/undefined는 그대로 유지
    if (!value) return;
    
    // 객체인 경우 Timestamp 여부 확인
    if (typeof value === 'object') {
      // toDate 메서드가 있으면 Firestore Timestamp
      if (typeof value.toDate === 'function') {
        try {
          result[key] = value.toDate().toISOString();
        } catch (error) {
          console.warn(`⚠️ Timestamp 변환 실패 (${key}):`, error);
          result[key] = null;
        }
      }
      // seconds/nanoseconds 속성이 있으면 Timestamp 객체 (plain object)
      else if ('seconds' in value && 'nanoseconds' in value) {
        try {
          result[key] = new Date(value.seconds * 1000).toISOString();
        } catch (error) {
          console.warn(`⚠️ Timestamp 변환 실패 (${key}):`, error);
          result[key] = null;
        }
      }
    }
  });
  
  return result as T;
}
