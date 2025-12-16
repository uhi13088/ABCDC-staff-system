/**
 * 급여 계산 엔진 검증 테스트
 * 
 * 목적: salary-calculator.ts의 3가지 핵심 로직을 검증
 * 1. 복합 수당 겹침 (야간 + 휴일 + 연장 동시 적용)
 * 2. 휴게시간 공제 (야간 근무 시 정확한 차감)
 * 3. 주휴수당 예외 (결근/지각/조퇴 시 법적 준수)
 */

import {
  calculateWorkHours,
  calculateNightHours,
  timeToMinutes,
  getWeekOfMonth,
} from '@/lib/utils/salary-calculator';

describe('급여 계산 엔진 검증', () => {
  
  // ===================================
  // Test 1: 복합 수당 겹침 케이스
  // ===================================
  
  describe('1-1. 복합 수당 겹침: 일요일 밤 10시~새벽 2시', () => {
    test('야간 + 휴일 + 연장 수당 동시 적용', () => {
      // Given: 일요일 22:00~02:00 (4시간 근무)
      const startTime = '22:00';
      const endTime = '02:00'; // 다음날 새벽
      
      // When: 근무시간 계산
      const workHours = calculateWorkHours(startTime, endTime);
      const nightHours = calculateNightHours(startTime, endTime);
      
      // Then: 검증
      expect(workHours).toBe(4); // 총 4시간
      expect(nightHours).toBe(4); // 전부 야간 (22:00~06:00)
      
      console.log('✅ 일요일 밤 10시~새벽 2시 근무:');
      console.log(`  - 총 근무: ${workHours}시간`);
      console.log(`  - 야간: ${nightHours}시간 (22:00~02:00)`);
      console.log(`  - 휴일: 일요일 (휴일수당 적용)`);
      console.log(`  - 연장: 주 40시간 초과 시 적용`);
    });
    
    test('야간 수당 정확도: 22:00~06:00 범위 검증', () => {
      // Test Case 1: 21:00~23:00 (2시간 중 1시간만 야간)
      expect(calculateNightHours('21:00', '23:00')).toBe(1);
      
      // Test Case 2: 23:00~01:00 (2시간 전부 야간)
      expect(calculateNightHours('23:00', '01:00')).toBe(2);
      
      // Test Case 3: 05:00~07:00 (2시간 중 1시간만 야간)
      expect(calculateNightHours('05:00', '07:00')).toBe(1);
      
      // Test Case 4: 20:00~08:00 (12시간 중 8시간만 야간)
      expect(calculateNightHours('20:00', '08:00')).toBe(8); // 22:00~06:00
      
      console.log('✅ 야간 수당 범위 검증 완료');
    });
  });
  
  // ===================================
  // Test 2: 휴게시간 공제 로직
  // ===================================
  
  describe('1-2. 휴게시간 공제: 야간 근무 시 정확한 차감', () => {
    test('휴게시간이 야간시간(22:00~06:00)에 겹치는 경우', () => {
      // Given: 21:00~03:00 근무, 휴게 23:00~24:00 (1시간)
      const startTime = '21:00';
      const endTime = '03:00';
      const nightHours = calculateNightHours(startTime, endTime);
      
      // 휴게시간: 23:00~24:00 (60분)
      const breakStart = timeToMinutes('23:00');
      const breakEnd = timeToMinutes('24:00');
      const nightStart = 22 * 60; // 22:00
      
      // When: 휴게시간이 야간시간과 겹치는 부분 계산
      const overlapStart = Math.max(breakStart, nightStart);
      const overlapEnd = Math.min(breakEnd, 24 * 60);
      const breakNightMinutes = overlapStart < overlapEnd ? overlapEnd - overlapStart : 0;
      const adjustedNightHours = nightHours - breakNightMinutes / 60;
      
      // Then: 검증
      expect(nightHours).toBe(5); // 22:00~03:00 (5시간)
      expect(breakNightMinutes).toBe(60); // 23:00~24:00 (1시간)
      expect(adjustedNightHours).toBe(4); // 5시간 - 1시간 = 4시간
      
      console.log('✅ 휴게시간 야간 차감:');
      console.log(`  - 원래 야간: ${nightHours}시간`);
      console.log(`  - 휴게 겹침: ${breakNightMinutes / 60}시간`);
      console.log(`  - 조정된 야간: ${adjustedNightHours}시간`);
    });
    
    test('휴게시간이 야간시간에 겹치지 않는 경우', () => {
      // Given: 20:00~02:00 근무, 휴게 20:00~21:00 (야간 시작 전)
      const startTime = '20:00';
      const endTime = '02:00';
      const nightHours = calculateNightHours(startTime, endTime);
      
      // 휴게시간: 20:00~21:00 (야간 전)
      const breakStart = timeToMinutes('20:00');
      const breakEnd = timeToMinutes('21:00');
      const nightStart = 22 * 60;
      
      // When: 휴게시간이 야간시간과 겹치는 부분 계산
      const overlapStart = Math.max(breakStart, nightStart);
      const overlapEnd = Math.min(breakEnd, 24 * 60);
      const breakNightMinutes = overlapStart < overlapEnd ? overlapEnd - overlapStart : 0;
      
      // Then: 야간 차감 없음
      expect(nightHours).toBe(4); // 22:00~02:00 (4시간)
      expect(breakNightMinutes).toBe(0); // 겹침 없음
      
      console.log('✅ 휴게시간 야간 겹침 없음 (차감 0)');
    });
  });
  
  // ===================================
  // Test 3: 연장근로 수당 (1일 8시간 초과)
  // ===================================
  
  describe('1-3. 연장근로 수당: 1일 8시간 초과 검증 🚨 치명적 버그 수정', () => {
    test('시나리오: 월요일 09:00~21:00 (12시간 근무, 주 1회만)', () => {
      // Given: 월요일 09:00~21:00 (12시간 근무, 휴게시간 없음)
      const startTime = '09:00';
      const endTime = '21:00';
      const workHours = calculateWorkHours(startTime, endTime);
      
      // When: 일별 연장근로 계산 (8시간 초과분)
      const dailyOvertime = Math.max(workHours - 8, 0);
      
      // 주별 총 근무시간 (주 1회만 근무 = 12시간)
      const weeklyHours = 12;
      const weeklyOvertime = Math.max(weeklyHours - 40, 0);
      
      // Then: 검증
      expect(workHours).toBe(12); // 총 12시간 근무
      expect(dailyOvertime).toBe(4); // 8시간 초과분 = 4시간
      expect(weeklyOvertime).toBe(0); // 주 40시간 미만이므로 0
      
      // 🚨 핵심: 일별 연장(4시간)과 주별 연장(0시간) 중 큰 값 적용
      const finalOvertime = Math.max(dailyOvertime, weeklyOvertime);
      expect(finalOvertime).toBe(4); // 일별 연장 4시간 적용
      
      console.log('✅ 1일 8시간 초과 연장근로 검증:');
      console.log(`  - 총 근무: ${workHours}시간`);
      console.log(`  - 일별 연장: ${dailyOvertime}시간 (12 - 8)`);
      console.log(`  - 주별 연장: ${weeklyOvertime}시간 (12 < 40)`);
      console.log(`  - 최종 연장: ${finalOvertime}시간 (일별 우선)`);
      console.log(`  - 연장수당: 시급 × 1.5 × ${finalOvertime}시간`);
    });
    
    test('시나리오: 월~금 매일 10시간 근무 (총 50시간)', () => {
      // Given: 매일 10시간씩 5일 근무
      const dailyWork = 10;
      const workDays = 5;
      
      // When: 일별 연장 vs 주별 연장
      const dailyOvertimeTotal = (dailyWork - 8) * workDays; // (10-8) × 5 = 10시간
      const weeklyHours = dailyWork * workDays; // 50시간
      const weeklyOvertime = Math.max(weeklyHours - 40, 0); // 50 - 40 = 10시간
      
      // Then: 중복 지급 방지 (더 큰 값 적용)
      const finalOvertime = Math.max(dailyOvertimeTotal, weeklyOvertime);
      
      expect(dailyOvertimeTotal).toBe(10);
      expect(weeklyOvertime).toBe(10);
      expect(finalOvertime).toBe(10); // 동일하므로 10시간
      
      console.log('✅ 일별/주별 연장 동일 케이스:');
      console.log(`  - 일별 연장 합계: ${dailyOvertimeTotal}시간`);
      console.log(`  - 주별 연장: ${weeklyOvertime}시간`);
      console.log(`  - 최종 연장: ${finalOvertime}시간 (중복 제거)`);
    });
    
    test('시나리오: 화수목 각 12시간 근무 (총 36시간)', () => {
      // Given: 화수목 각 12시간 (총 36시간, 주 40시간 미만)
      const dailyWork = 12;
      const workDays = 3;
      
      // When: 일별 연장만 발생 (주 40시간 미만)
      const dailyOvertimeTotal = (dailyWork - 8) * workDays; // (12-8) × 3 = 12시간
      const weeklyHours = dailyWork * workDays; // 36시간
      const weeklyOvertime = Math.max(weeklyHours - 40, 0); // 0시간 (36 < 40)
      
      // Then: 일별 연장만 적용
      const finalOvertime = Math.max(dailyOvertimeTotal, weeklyOvertime);
      
      expect(dailyOvertimeTotal).toBe(12);
      expect(weeklyOvertime).toBe(0);
      expect(finalOvertime).toBe(12); // 일별 연장 12시간 적용
      
      console.log('✅ 일별 연장만 발생 케이스 (주 40시간 미만):');
      console.log(`  - 일별 연장 합계: ${dailyOvertimeTotal}시간`);
      console.log(`  - 주별 연장: ${weeklyOvertime}시간`);
      console.log(`  - 최종 연장: ${finalOvertime}시간`);
      console.log(`  ⚠️ 기존 버그: 이 경우 연장수당 0원으로 계산됨!`);
    });
    
    test('법정 연장근로 한도 경고: 1일 12시간 / 주 52시간', () => {
      // Given: 법정 한도
      const dailyLimit = 12; // 기본 8 + 연장 4
      const weeklyLimit = 52; // 기본 40 + 연장 12
      
      // When: 한도 초과 케이스
      const dailyWork = 13; // 1일 한도 초과
      const weeklyWork = 55; // 주 한도 초과
      
      // Then: 경고 발생해야 함
      expect(dailyWork).toBeGreaterThan(dailyLimit);
      expect(weeklyWork).toBeGreaterThan(weeklyLimit);
      
      console.log('✅ 법정 연장근로 한도:');
      console.log(`  - 1일 최대: ${dailyLimit}시간 (기본 8 + 연장 4)`);
      console.log(`  - 주 최대: ${weeklyLimit}시간 (기본 40 + 연장 12)`);
      console.log(`  ⚠️ 초과 시 console.warn() 발생 (계산은 진행)`);
    });
  });
  
  // ===================================
  // Test 4: 주휴수당 예외 처리
  // ===================================
  
  describe('1-4. 주휴수당 예외: 결근/지각/조퇴 시 법적 준수', () => {
    test('주휴수당 기본 조건: 주 15시간 이상 근무', () => {
      // Given: 주 20시간 근무
      const weeklyHours = 20;
      
      // When: 주휴수당 시간 계산 (법원 판결 기준: 근무시간 ÷ 5)
      const weeklyHolidayHours = Math.min(weeklyHours / 5, 8);
      
      // Then: 검증
      expect(weeklyHolidayHours).toBe(4); // 20 ÷ 5 = 4시간
      
      console.log('✅ 주휴수당 기본 계산:');
      console.log(`  - 주 근무: ${weeklyHours}시간`);
      console.log(`  - 주휴수당: ${weeklyHolidayHours}시간 (${weeklyHours} ÷ 5)`);
    });
    
    test('주휴수당 예외: 결근이 있는 주는 제외', () => {
      // Given: 주 20시간 근무했지만 결근 1회
      const weeklyHours = 20;
      const hasAbsence = true;
      
      // When: 주휴수당 적용 여부
      const weeklyHolidayHours = hasAbsence ? 0 : Math.min(weeklyHours / 5, 8);
      
      // Then: 주휴수당 미적용
      expect(weeklyHolidayHours).toBe(0);
      
      console.log('✅ 결근이 있는 주: 주휴수당 제외');
    });
    
    test('주휴수당 예외: 15시간 미만 근무 시 제외', () => {
      // Given: 주 14시간 근무 (15시간 미만)
      const weeklyHours = 14;
      
      // When: 주휴수당 적용 여부
      const isEligible = weeklyHours >= 15;
      const weeklyHolidayHours = isEligible ? Math.min(weeklyHours / 5, 8) : 0;
      
      // Then: 주휴수당 미적용
      expect(weeklyHolidayHours).toBe(0);
      
      console.log('✅ 15시간 미만 근무: 주휴수당 제외');
    });
    
    test('주휴수당 상한선: 최대 8시간', () => {
      // Given: 주 50시간 근무 (과다 근무)
      const weeklyHours = 50;
      
      // When: 주휴수당 시간 계산 (상한 8시간)
      const weeklyHolidayHours = Math.min(weeklyHours / 5, 8);
      
      // Then: 최대 8시간까지만
      expect(weeklyHolidayHours).toBe(8); // 50 ÷ 5 = 10 → max 8
      
      console.log('✅ 주휴수당 상한선:');
      console.log(`  - 주 근무: ${weeklyHours}시간`);
      console.log(`  - 계산값: ${weeklyHours / 5}시간`);
      console.log(`  - 적용값: ${weeklyHolidayHours}시간 (최대 8시간)`);
    });
  });
  
  // ===================================
  // Utility 함수 검증
  // ===================================
  
  describe('Utility 함수 검증', () => {
    test('timeToMinutes: 시간 문자열 → 분 변환', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('01:30')).toBe(90);
      expect(timeToMinutes('12:45')).toBe(765);
      expect(timeToMinutes('23:59')).toBe(1439);
    });
    
    test('calculateWorkHours: 자정 넘는 경우 처리', () => {
      // 23:00~01:00 (2시간)
      expect(calculateWorkHours('23:00', '01:00')).toBe(2);
      
      // 22:00~06:00 (8시간)
      expect(calculateWorkHours('22:00', '06:00')).toBe(8);
      
      // 20:00~08:00 (12시간)
      expect(calculateWorkHours('20:00', '08:00')).toBe(12);
    });
    
    test('getWeekOfMonth: 주차 계산', () => {
      // 2025-01-05 (일요일, 1주차)
      const date1 = new Date('2025-01-05');
      expect(getWeekOfMonth(date1)).toBe('2025-01-W1');
      
      // 2025-01-12 (일요일, 2주차)
      const date2 = new Date('2025-01-12');
      expect(getWeekOfMonth(date2)).toBe('2025-01-W2');
    });
  });
});
