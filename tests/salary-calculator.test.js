/**
 * 급여 계산 모듈 테스트
 * Pure Function만 테스트 (Firebase 의존성 없는 함수들)
 */

const {
  publicHolidays2025,
  isPublicHoliday,
  timeToMinutes,
  formatHoursAndMinutes,
  calculateWorkHours,
  calculateNightHours,
  getWeekOfMonth,
  calculateWeeklySalary
} = require('../js/salary-calculator');

describe('🧮 급여 계산 유틸리티 함수 테스트', () => {
  
  // ===========================================
  // 시간 변환 테스트
  // ===========================================
  
  describe('timeToMinutes() - 시간을 분으로 변환', () => {
    test('정상 시간 변환', () => {
      expect(timeToMinutes('09:30')).toBe(570);
      expect(timeToMinutes('12:00')).toBe(720);
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('23:59')).toBe(1439);
    });
    
    test('잘못된 입력 처리', () => {
      expect(timeToMinutes('')).toBe(0);
      expect(timeToMinutes(null)).toBe(0);
      expect(timeToMinutes(undefined)).toBe(0);
    });
  });
  
  describe('formatHoursAndMinutes() - 시간 포맷팅', () => {
    test('시간 형식 변환', () => {
      expect(formatHoursAndMinutes(8.5)).toBe('8시간 30분');
      expect(formatHoursAndMinutes(8.0)).toBe('8시간');
      expect(formatHoursAndMinutes(0.5)).toBe('30분');
      expect(formatHoursAndMinutes(1.75)).toBe('1시간 45분');
    });
  });
  
  // ===========================================
  // 근무시간 계산 테스트
  // ===========================================
  
  describe('calculateWorkHours() - 근무시간 계산', () => {
    test('일반 근무시간 (자정 안 넘김)', () => {
      expect(calculateWorkHours('09:00', '18:00')).toBe(9);
      expect(calculateWorkHours('10:30', '19:30')).toBe(9);
      expect(calculateWorkHours('08:00', '17:00')).toBe(9);
    });
    
    test('자정 넘는 근무시간', () => {
      expect(calculateWorkHours('22:00', '02:00')).toBe(4);
      expect(calculateWorkHours('23:00', '07:00')).toBe(8);
      expect(calculateWorkHours('20:00', '01:00')).toBe(5);
    });
    
    test('짧은 근무시간', () => {
      expect(calculateWorkHours('14:00', '15:30')).toBe(1.5);
      expect(calculateWorkHours('09:00', '09:30')).toBeCloseTo(0.5, 2);
    });
  });
  
  // ===========================================
  // 야간 근무 계산 테스트 (22:00~06:00)
  // ===========================================
  
  describe('calculateNightHours() - 야간근무 시간 계산', () => {
    test('완전 야간 근무 (22:00~06:00 구간)', () => {
      expect(calculateNightHours('22:00', '23:00')).toBe(1);
      expect(calculateNightHours('22:00', '06:00')).toBe(8);
      expect(calculateNightHours('00:00', '06:00')).toBe(6);
    });
    
    test('일부 야간 근무 (시작만 야간)', () => {
      expect(calculateNightHours('23:00', '08:00')).toBe(7);
      expect(calculateNightHours('22:00', '01:00')).toBe(3);
    });
    
    test('일부 야간 근무 (종료만 야간)', () => {
      expect(calculateNightHours('21:00', '23:00')).toBe(1);
      expect(calculateNightHours('04:00', '10:00')).toBe(2);
    });
    
    test('야간 아닌 근무', () => {
      expect(calculateNightHours('09:00', '18:00')).toBe(0);
      expect(calculateNightHours('10:00', '21:00')).toBe(0);
    });
    
    test('자정 넘는 복잡한 케이스', () => {
      // 21:00~07:00 근무 (22:00~24:00 2시간 + 00:00~06:00 6시간 = 8시간)
      expect(calculateNightHours('21:00', '07:00')).toBe(8);
    });
  });
  
  // ===========================================
  // 공휴일 판별 테스트
  // ===========================================
  
  describe('isPublicHoliday() - 공휴일 판별', () => {
    test('2025년 공휴일 확인', () => {
      expect(isPublicHoliday('2025-01-01')).toBe(true);  // 신정
      expect(isPublicHoliday('2025-03-01')).toBe(true);  // 삼일절
      expect(isPublicHoliday('2025-12-25')).toBe(true); // 크리스마스
    });
    
    test('평일 확인', () => {
      expect(isPublicHoliday('2025-01-02')).toBe(false);
      expect(isPublicHoliday('2025-06-15')).toBe(false);
    });
    
    test('설날/추석 연휴', () => {
      expect(isPublicHoliday('2025-01-28')).toBe(true);
      expect(isPublicHoliday('2025-01-29')).toBe(true);
      expect(isPublicHoliday('2025-01-30')).toBe(true);
    });
  });
  
  // ===========================================
  // 주차 계산 테스트
  // ===========================================
  
  describe('getWeekOfMonth() - 주차 계산', () => {
    test('월초 날짜', () => {
      const date1 = new Date('2025-01-01');
      expect(getWeekOfMonth(date1)).toBe('2025-01-W1');
      
      const date2 = new Date('2025-01-05');
      expect(getWeekOfMonth(date2)).toBe('2025-01-W1');
    });
    
    test('월중 날짜', () => {
      const date1 = new Date('2025-01-10');
      expect(getWeekOfMonth(date1)).toBe('2025-01-W2');
      
      const date2 = new Date('2025-01-20');
      expect(getWeekOfMonth(date2)).toBe('2025-01-W3');
    });
    
    test('월말 날짜', () => {
      const date1 = new Date('2025-01-31');
      expect(getWeekOfMonth(date1)).toBe('2025-01-W5');
    });
  });
  
  // ===========================================
  // 주급 계산 테스트 (법원 판결 기준)
  // ===========================================
  
  describe('calculateWeeklySalary() - 주급 계산', () => {
    test('시급제 - 주휴수당 적용 (주 15시간 이상)', () => {
      const result = calculateWeeklySalary(40, '시급', 10000, true);
      
      // 기본급: 40시간 × 10,000원 = 400,000원
      expect(result.basePay).toBe(400000);
      
      // 주휴수당: 10,000원 × (40 ÷ 5) = 80,000원
      expect(result.weeklyHolidayPay).toBe(80000);
      
      // 주급: 400,000 + 80,000 = 480,000원
      expect(result.weeklySalary).toBe(480000);
      
      // 월 예상: 480,000 × 4.345 = 2,085,600원
      expect(result.monthlyEstimate).toBe(2085600);
    });
    
    test('시급제 - 주휴수당 미적용 (주 15시간 미만)', () => {
      const result = calculateWeeklySalary(10, '시급', 10000, true);
      
      expect(result.basePay).toBe(100000);
      expect(result.weeklyHolidayPay).toBe(0); // 15시간 미만
      expect(result.weeklySalary).toBe(100000);
    });
    
    test('시급제 - 주휴수당 설정 OFF', () => {
      const result = calculateWeeklySalary(40, '시급', 10000, false);
      
      expect(result.basePay).toBe(400000);
      expect(result.weeklyHolidayPay).toBe(0);
      expect(result.weeklySalary).toBe(400000);
    });
    
    test('월급제', () => {
      const result = calculateWeeklySalary(0, '월급', 2500000, true);
      
      // 주급: 2,500,000 ÷ 4.345 = 575,374원 (반올림)
      expect(result.weeklySalary).toBe(575374);
      expect(result.basePay).toBe(575374);
      expect(result.weeklyHolidayPay).toBe(0); // 월급제는 주휴수당 별도 없음
    });
    
    test('연봉제', () => {
      const result = calculateWeeklySalary(0, '연봉', 36000000, true);
      
      // 주급: 36,000,000 ÷ 12 ÷ 4.345 = 690,449원 (반올림)
      expect(result.weeklySalary).toBe(690449);
      expect(result.basePay).toBe(690449);
      expect(result.weeklyHolidayPay).toBe(0);
    });
    
    test('최저시급 기준 (2025년 10,030원)', () => {
      const result = calculateWeeklySalary(40, '시급', 10030, true);
      
      // 기본급: 40 × 10,030 = 401,200원
      expect(result.basePay).toBe(401200);
      
      // 주휴수당: 10,030 × 8 = 80,240원
      expect(result.weeklyHolidayPay).toBe(80240);
      
      // 주급: 481,440원
      expect(result.weeklySalary).toBe(481440);
    });
  });
  
  // ===========================================
  // Edge Case 테스트
  // ===========================================
  
  describe('Edge Cases - 경계값 테스트', () => {
    test('야간 근무 경계값 (22:00 정확히)', () => {
      // 21:59~22:01 = 2분 근무, 그 중 22:00~22:01 = 1분 야간
      // 1분 / 60분 = 0.0166...시간
      expect(calculateNightHours('21:59', '22:01')).toBeCloseTo(0.0167, 3);
    });
    
    test('자정 정확히', () => {
      expect(calculateWorkHours('23:59', '00:01')).toBeCloseTo(0.0333, 2);
    });
    
    test('0시간 근무', () => {
      expect(calculateWorkHours('09:00', '09:00')).toBe(0);
    });
    
    test('공휴일 데이터 개수 확인 (2025년)', () => {
      expect(publicHolidays2025.length).toBeGreaterThan(0);
      expect(Array.isArray(publicHolidays2025)).toBe(true);
    });
  });
});

describe('🧪 통합 시나리오 테스트', () => {
  test('시나리오: 야간 근무 + 주급 계산', () => {
    // 주 40시간 근무, 그 중 8시간은 야간 (22:00~06:00)
    const workHours = 40;
    const nightHours = 8;
    const hourlyWage = 10000;
    
    // 주급 계산
    const weeklySalary = calculateWeeklySalary(workHours, '시급', hourlyWage, true);
    
    // 야간 수당 (별도 계산 필요)
    const nightPay = Math.round(hourlyWage * 0.5 * nightHours);
    
    expect(weeklySalary.basePay).toBe(400000);
    expect(weeklySalary.weeklyHolidayPay).toBe(80000);
    expect(nightPay).toBe(40000); // 10,000 × 0.5 × 8
  });
  
  test('시나리오: 공휴일 근무 판별', () => {
    const workDate = '2025-01-01'; // 신정
    const isHoliday = isPublicHoliday(workDate);
    
    expect(isHoliday).toBe(true);
    
    // 공휴일 근무 수당 (1.5배)
    const workHours = 8;
    const hourlyWage = 10000;
    const holidayPay = Math.round(hourlyWage * 1.5 * workHours);
    
    expect(holidayPay).toBe(120000);
  });
});
