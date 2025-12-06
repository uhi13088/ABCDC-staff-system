/**
 * employee-utils.js Pure Function 테스트
 * Firebase 의존성이 없는 유틸리티 함수들 테스트
 */

const {
  capitalize,
  formatTime,
  calculateWorkTime,
  timeToMinutes,
  getWorkMinutes,
  getStatusClass,
  formatFirestoreTimestamp,
  getWeekOfMonth,
  formatHoursAndMinutes
} = require('../js/employee-utils');

describe('🧑‍💼 employee-utils.js - Pure Function 테스트', () => {
  
  // ===========================================
  // 문자열 처리 함수
  // ===========================================
  
  describe('capitalize() - 문자열 첫 글자 대문자화', () => {
    test('일반 문자열', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
    });
    
    test('이미 대문자인 경우', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });
    
    test('한 글자', () => {
      expect(capitalize('a')).toBe('A');
    });
  });
  
  // ===========================================
  // 시간 처리 함수
  // ===========================================
  
  describe('formatTime() - Date 객체를 HH:MM 형식으로 변환', () => {
    test('정상 시간 변환', () => {
      const date1 = new Date('2025-01-15T09:30:00');
      expect(formatTime(date1)).toBe('09:30');
      
      const date2 = new Date('2025-01-15T14:05:00');
      expect(formatTime(date2)).toBe('14:05');
    });
    
    test('자정', () => {
      const date = new Date('2025-01-15T00:00:00');
      expect(formatTime(date)).toBe('00:00');
    });
    
    test('23:59', () => {
      const date = new Date('2025-01-15T23:59:00');
      expect(formatTime(date)).toBe('23:59');
    });
  });
  
  describe('timeToMinutes() - HH:MM을 분으로 변환', () => {
    test('정상 시간 변환', () => {
      expect(timeToMinutes('09:30')).toBe(570);
      expect(timeToMinutes('12:00')).toBe(720);
      expect(timeToMinutes('00:00')).toBe(0);
    });
    
    test('잘못된 입력', () => {
      expect(timeToMinutes('')).toBe(0);
      expect(timeToMinutes(null)).toBe(0);
      expect(timeToMinutes(undefined)).toBe(0);
    });
  });
  
  describe('getWorkMinutes() - 근무 시간 계산 (분)', () => {
    test('일반 근무시간', () => {
      expect(getWorkMinutes('09:00', '18:00')).toBe(540); // 9시간
      expect(getWorkMinutes('10:00', '19:00')).toBe(540);
    });
    
    test('짧은 근무시간', () => {
      expect(getWorkMinutes('14:00', '15:30')).toBe(90); // 1.5시간
    });
    
    test('정각', () => {
      expect(getWorkMinutes('09:00', '09:00')).toBe(0);
    });
  });
  
  describe('calculateWorkTime() - 근무 시간 계산 (한글)', () => {
    test('9시간 근무', () => {
      expect(calculateWorkTime('09:00', '18:00')).toBe('9시간 0분');
    });
    
    test('8시간 30분 근무', () => {
      expect(calculateWorkTime('09:00', '17:30')).toBe('8시간 30분');
    });
    
    test('1시간 45분 근무', () => {
      expect(calculateWorkTime('14:00', '15:45')).toBe('1시간 45분');
    });
  });
  
  describe('formatHoursAndMinutes() - 시간(분) 포맷팅', () => {
    test('시간과 분 모두 있는 경우', () => {
      expect(formatHoursAndMinutes(150)).toBe('2시간 30분');
      expect(formatHoursAndMinutes(90)).toBe('1시간 30분');
    });
    
    test('시간만 있는 경우', () => {
      expect(formatHoursAndMinutes(120)).toBe('2시간');
      expect(formatHoursAndMinutes(60)).toBe('1시간');
    });
    
    test('분만 있는 경우', () => {
      expect(formatHoursAndMinutes(30)).toBe('30분');
      expect(formatHoursAndMinutes(45)).toBe('45분');
    });
    
    test('0분', () => {
      expect(formatHoursAndMinutes(0)).toBe('0분');
    });
  });
  
  // ===========================================
  // 상태 처리 함수
  // ===========================================
  
  describe('getStatusClass() - 출근 상태 CSS 클래스', () => {
    test('정상 출근', () => {
      expect(getStatusClass('정상')).toBe('success');
    });
    
    test('지각', () => {
      expect(getStatusClass('지각')).toBe('warning');
    });
    
    test('조퇴', () => {
      expect(getStatusClass('조퇴')).toBe('warning');
    });
    
    test('결근', () => {
      expect(getStatusClass('결근')).toBe('danger');
    });
    
    test('알 수 없는 상태', () => {
      expect(getStatusClass('미정')).toBe('gray');
      expect(getStatusClass('')).toBe('gray');
    });
  });
  
  // ===========================================
  // Firestore Timestamp 처리
  // ===========================================
  
  describe('formatFirestoreTimestamp() - Firestore Timestamp 변환', () => {
    test('null/undefined 처리', () => {
      expect(formatFirestoreTimestamp(null)).toBe('-');
      expect(formatFirestoreTimestamp(undefined)).toBe('-');
    });
    
    test('Date 객체 변환', () => {
      const date = new Date('2025-01-15T10:30:00');
      const result = formatFirestoreTimestamp(date);
      expect(result).toContain('2025');
      expect(result).toContain('10');
    });
    
    test('Firestore Timestamp 객체 (toDate 메서드)', () => {
      const mockTimestamp = {
        toDate: () => new Date('2025-01-15T14:20:00')
      };
      const result = formatFirestoreTimestamp(mockTimestamp);
      expect(result).toContain('2025');
      // 시간은 로케일에 따라 다르게 표시될 수 있음 (14시 또는 오후 2시)
      expect(result).toMatch(/14|02/);
    });
  });
  
  // ===========================================
  // 주차 계산 함수
  // ===========================================
  
  describe('getWeekOfMonth() - 주차 계산', () => {
    test('월초 (1~7일)', () => {
      const result = getWeekOfMonth(new Date('2025-01-01'));
      expect(result).toBe('2025-01-W1');
    });
    
    test('월중 (8~14일)', () => {
      const result = getWeekOfMonth(new Date('2025-01-10'));
      expect(result).toBe('2025-01-W2');
    });
    
    test('월말 (29~31일)', () => {
      const result = getWeekOfMonth(new Date('2025-01-31'));
      expect(result).toBe('2025-01-W5');
    });
    
    test('2월 28일', () => {
      const result = getWeekOfMonth(new Date('2025-02-28'));
      expect(result).toBe('2025-02-W4');
    });
  });
  
  // ===========================================
  // 통합 시나리오 테스트
  // ===========================================
  
  describe('🧪 통합 시나리오 테스트', () => {
    test('시나리오: 출근 → 퇴근 → 근무시간 계산', () => {
      const clockIn = '09:00';
      const clockOut = '18:30';
      
      // 분 단위 계산
      const workMinutes = getWorkMinutes(clockIn, clockOut);
      expect(workMinutes).toBe(570); // 9.5시간
      
      // 한글 형식 계산
      const workTime = calculateWorkTime(clockIn, clockOut);
      expect(workTime).toBe('9시간 30분');
      
      // 시간 포맷팅
      const formatted = formatHoursAndMinutes(workMinutes);
      expect(formatted).toBe('9시간 30분');
    });
    
    test('시나리오: 상태별 CSS 클래스 적용', () => {
      const statuses = ['정상', '지각', '조퇴', '결근'];
      const classes = statuses.map(status => getStatusClass(status));
      
      expect(classes).toEqual(['success', 'warning', 'warning', 'danger']);
    });
    
    test('시나리오: 날짜별 주차 계산', () => {
      const dates = [
        new Date('2025-01-01'),
        new Date('2025-01-08'),
        new Date('2025-01-15'),
        new Date('2025-01-22'),
        new Date('2025-01-29')
      ];
      
      const weeks = dates.map(date => getWeekOfMonth(date));
      
      expect(weeks).toEqual([
        '2025-01-W1',
        '2025-01-W2',
        '2025-01-W3',
        '2025-01-W4',
        '2025-01-W5'
      ]);
    });
  });
});
