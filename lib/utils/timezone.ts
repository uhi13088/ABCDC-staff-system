/**
 * Timezone Utility
 * 모든 날짜/시간을 'Asia/Seoul' (KST) 기준으로 처리
 * 
 * **중요**: JavaScript의 new Date()는 실행 환경(서버/브라우저)의 시간대를 따르므로,
 * 맛남살롱의 모든 날짜/시간은 반드시 이 함수를 사용해야 합니다.
 */

import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * 서울 시간대
 */
export const SEOUL_TIMEZONE = 'Asia/Seoul';

/**
 * 현재 시각 (서울 시간 기준)
 * @returns Date 객체 (KST)
 */
export function nowKST(): Date {
  return toZonedTime(new Date(), SEOUL_TIMEZONE);
}

/**
 * 특정 날짜를 서울 시간대로 변환
 * @param date - Date 객체 또는 ISO 문자열
 * @returns Date 객체 (KST)
 */
export function toKST(date: Date | string): Date {
  return toZonedTime(typeof date === 'string' ? new Date(date) : date, SEOUL_TIMEZONE);
}

/**
 * 오늘 날짜 (서울 시간 기준, YYYY-MM-DD)
 * @returns "YYYY-MM-DD" 형식
 */
export function todayKST(): string {
  return formatInTimeZone(nowKST(), SEOUL_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * 현재 시각 (서울 시간 기준, ISO 문자열)
 * @returns ISO 8601 형식 문자열
 */
export function nowISOKST(): string {
  return formatInTimeZone(nowKST(), SEOUL_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}

/**
 * 특정 날짜를 YYYY-MM-DD 형식으로 변환 (KST)
 * @param date - Date 객체
 * @returns "YYYY-MM-DD" 형식
 */
export function formatDateKST(date: Date): string {
  return formatInTimeZone(date, SEOUL_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * 특정 날짜를 HH:MM 형식으로 변환 (KST)
 * @param date - Date 객체
 * @returns "HH:MM" 형식
 */
export function formatTimeKST(date: Date): string {
  return formatInTimeZone(date, SEOUL_TIMEZONE, 'HH:mm');
}

/**
 * 년도 (서울 시간 기준)
 * @returns 년도 숫자
 */
export function yearKST(): number {
  return nowKST().getFullYear();
}

/**
 * 월 (서울 시간 기준, 1~12)
 * @returns 월 숫자
 */
export function monthKST(): number {
  return nowKST().getMonth() + 1;
}
