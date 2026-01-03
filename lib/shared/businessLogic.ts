/**
 * ========================================
 * Shared Business Logic Utilities
 * ========================================
 * 
 * 순환 참조 방지를 위한 공통 로직 모음
 * 
 * 모든 Service에서 사용 가능한 순수 함수들
 */

import { Timestamp } from 'firebase/firestore';

// ========================================
// 날짜 및 시간 계산
// ========================================

/**
 * 날짜 문자열을 Date 객체로 변환
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * 두 날짜 사이의 일수 계산
 */
export function getDaysBetween(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 날짜 범위 생성
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * 요일 이름 반환 (한글)
 */
export function getDayName(dateStr: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const date = parseDate(dateStr);
  return days[date.getDay()];
}

/**
 * 요일 번호 반환 (0: 일요일 ~ 6: 토요일)
 */
export function getDayNumber(dateStr: string): number {
  return parseDate(dateStr).getDay();
}

// ========================================
// 시간 계산
// ========================================

/**
 * 시간 문자열을 분으로 변환 ("09:30" → 570)
 */
export function timeToMinutes(timeStr: string): number {
  // Validate time format to prevent errors
  if (!timeStr || !timeStr.match(/^\d{1,2}:\d{2}$/)) {
    console.warn(`⚠️ Invalid time format: "${timeStr}", defaulting to 0`);
    return 0;
  }

  const [hours, minutes] = timeStr.split(':').map(Number);

  // Validate parsed values
  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`⚠️ Invalid time values: "${timeStr}", defaulting to 0`);
    return 0;
  }

  return hours * 60 + minutes;
}

/**
 * 분을 시간 문자열로 변환 (570 → "09:30")
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * 두 시간 사이의 분 계산
 */
export function getMinutesBetween(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);
}

/**
 * 야간 근무 시간 계산 (22:00 ~ 06:00)
 */
export function calculateNightMinutes(startTime: Date, endTime: Date): number {
  let nightMinutes = 0;
  const currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    const hour = currentTime.getHours();
    
    // 22:00 ~ 23:59 또는 00:00 ~ 05:59
    if (hour >= 22 || hour < 6) {
      nightMinutes++;
    }
    
    currentTime.setMinutes(currentTime.getMinutes() + 1);
  }
  
  return nightMinutes;
}

// ========================================
// 공휴일 관리
// ========================================

/**
 * 2025년 공휴일 목록 (하드코딩)
 */
const HOLIDAYS_2025 = [
  '2025-01-01', // 신정
  '2025-01-28', '2025-01-29', '2025-01-30', // 설날
  '2025-03-01', // 삼일절
  '2025-03-05', // 부처님오신날 (음력)
  '2025-05-05', // 어린이날
  '2025-05-06', // 대체공휴일
  '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-10-03', // 개천절
  '2025-10-05', '2025-10-06', '2025-10-07', // 추석
  '2025-10-09', // 한글날
  '2025-12-25', // 크리스마스
];

/**
 * 공휴일 여부 확인
 */
export function isPublicHoliday(date: string): boolean {
  return HOLIDAYS_2025.includes(date);
}

/**
 * 해당 월의 모든 공휴일 반환
 */
export function getHolidaysInMonth(yearMonth: string): string[] {
  return HOLIDAYS_2025.filter(holiday => holiday.startsWith(yearMonth));
}

/**
 * 해당 연도의 모든 공휴일 반환
 */
export function getHolidaysInYear(year: number): string[] {
  return HOLIDAYS_2025.filter(holiday => holiday.startsWith(String(year)));
}

// ========================================
// 급여 계산
// ========================================

/**
 * 시급 → 월급 환산 (주 40시간 기준, 209시간/월)
 */
export function hourlyToMonthly(hourlyWage: number): number {
  return Math.round(hourlyWage * 209);
}

/**
 * 월급 → 시급 환산
 */
export function monthlyToHourly(monthlyWage: number): number {
  return Math.round(monthlyWage / 209);
}

/**
 * 연봉 → 시급 환산
 */
export function annualToHourly(annualWage: number): number {
  return Math.round(annualWage / 12 / 209);
}

/**
 * 시급에서 실제 지급액 계산 (할증 적용)
 */
export function calculatePay(
  hourlyWage: number,
  minutes: number,
  multiplier: number = 1.0
): number {
  const hours = minutes / 60;
  return Math.round(hourlyWage * hours * multiplier);
}

// ========================================
// 수습 기간 계산
// ========================================

/**
 * 수습 기간 여부 확인
 */
export function isProbationPeriod(
  joinedAt: string | Date,
  probationMonths: number,
  checkDate: string | Date = new Date()
): boolean {
  const joinDate = typeof joinedAt === 'string' ? parseDate(joinedAt) : joinedAt;
  const check = typeof checkDate === 'string' ? parseDate(checkDate) : checkDate;
  
  const probationEnd = new Date(joinDate);
  probationEnd.setMonth(probationEnd.getMonth() + probationMonths);
  
  return check < probationEnd;
}

/**
 * 수습 기간 종료일 계산
 */
export function getProbationEndDate(
  joinedAt: string | Date,
  probationMonths: number
): Date {
  const joinDate = typeof joinedAt === 'string' ? parseDate(joinedAt) : joinedAt;
  const endDate = new Date(joinDate);
  endDate.setMonth(endDate.getMonth() + probationMonths);
  return endDate;
}

/**
 * 수습 기간 급여 배율 계산
 */
export function getProbationMultiplier(
  joinedAt: string | Date,
  probationMonths: number,
  checkDate: string | Date = new Date(),
  probationRate: number = 0.9 // 기본 90%
): number {
  const isInProbation = isProbationPeriod(joinedAt, probationMonths, checkDate);
  return isInProbation ? probationRate : 1.0;
}

// ========================================
// 매장 운영 시간
// ========================================

/**
 * 매장 종료 시간 이후인지 확인
 */
export function isAfterStoreClosing(
  currentTime: Date,
  storeClosingTime: string
): boolean {
  const closingMinutes = timeToMinutes(storeClosingTime);
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  // 자정 넘어가는 경우 처리
  if (closingMinutes < 360) { // 06:00 이전은 다음날로 간주
    return currentMinutes >= closingMinutes + 1440 || currentMinutes < closingMinutes;
  }
  
  return currentMinutes > closingMinutes;
}

/**
 * 완충 시간 내인지 확인
 */
export function isWithinBuffer(
  clockOutTime: Date,
  storeClosingTime: string,
  bufferMinutes: number = 30
): boolean {
  const closingMinutes = timeToMinutes(storeClosingTime);
  const clockOutMinutes = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();
  
  const bufferEnd = closingMinutes + bufferMinutes;
  
  // 자정 넘어가는 경우
  if (closingMinutes < 360) {
    return clockOutMinutes <= closingMinutes + bufferMinutes;
  }
  
  return clockOutMinutes <= bufferEnd;
}

/**
 * 완충 시간 초과 분 계산
 */
export function getOverBufferMinutes(
  clockOutTime: Date,
  storeClosingTime: string,
  bufferMinutes: number = 30
): number {
  const closingMinutes = timeToMinutes(storeClosingTime);
  const clockOutMinutes = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();
  
  const bufferEnd = closingMinutes + bufferMinutes;
  
  return Math.max(0, clockOutMinutes - bufferEnd);
}

// ========================================
// Timestamp 변환
// ========================================

/**
 * Firestore Timestamp를 Date로 변환
 */
export function timestampToDate(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return parseDate(timestamp);
  }
  return new Date();
}

/**
 * Date를 HH:mm 문자열로 변환 (KST)
 */
export function dateToTimeString(date: Date): string {
  // KST 변환 (UTC+9)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  const hours = kstDate.getUTCHours();
  const minutes = kstDate.getUTCMinutes();
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// ========================================
// 유효성 검사
// ========================================

/**
 * 날짜 문자열 형식 검사 (YYYY-MM-DD)
 */
export function isValidDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = parseDate(dateStr);
  return !isNaN(date.getTime());
}

/**
 * 시간 문자열 형식 검사 (HH:mm)
 */
export function isValidTimeString(timeStr: string): boolean {
  const regex = /^\d{2}:\d{2}$/;
  if (!regex.test(timeStr)) return false;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

/**
 * 급여 타입 검사
 */
export function isValidSalaryType(salaryType: string): boolean {
  return ['시급', '월급', '연봉'].includes(salaryType);
}

// ========================================
// Export
// ========================================

export default {
  // 날짜
  parseDate,
  getDaysBetween,
  getDateRange,
  getDayName,
  getDayNumber,
  
  // 시간
  timeToMinutes,
  minutesToTime,
  getMinutesBetween,
  calculateNightMinutes,
  
  // 공휴일
  isPublicHoliday,
  getHolidaysInMonth,
  getHolidaysInYear,
  
  // 급여
  hourlyToMonthly,
  monthlyToHourly,
  annualToHourly,
  calculatePay,
  
  // 수습
  isProbationPeriod,
  getProbationEndDate,
  getProbationMultiplier,
  
  // 매장
  isAfterStoreClosing,
  isWithinBuffer,
  getOverBufferMinutes,
  
  // Timestamp
  timestampToDate,
  dateToTimeString,
  
  // 유효성 검사
  isValidDateString,
  isValidTimeString,
  isValidSalaryType,
};
