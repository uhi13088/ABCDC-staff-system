/**
 * 급여 계산 모듈 - calculateMonthlySalary() 통합 테스트
 * Firebase Mock을 사용한 월급 계산 테스트
 */

const { createMockFirebase } = require('./__mocks__/firebase-mock');
const salaryCalculator = require('../js/salary-calculator');

// Firebase Mock 데이터
const mockData = {
  stores: [
    {
      name: '맛남살롱 부천시청점',
      companyId: 'test-company-001',
      attendanceThresholds: {
        earlyClockIn: 15,
        earlyClockOut: 5,
        overtime: 5
      }
    }
  ]
};

describe('🧮 calculateMonthlySalary() - Firebase Mock 테스트', () => {
  let originalFirebase;
  
  beforeAll(() => {
    // 전역 firebase 객체를 Mock으로 교체
    global.firebase = createMockFirebase(mockData);
  });
  
  afterAll(() => {
    // 테스트 후 원래대로 복원
    if (originalFirebase) {
      global.firebase = originalFirebase;
    } else {
      delete global.firebase;
    }
  });
  
  test('시급제 - 기본 급여 계산 (출근 기록 1개)', async () => {
    const employee = {
      name: '김철수',
      uid: 'test-uid-001',
      companyId: 'test-company-001',
      store: '맛남살롱 부천시청점'
    };
    
    const contract = {
      salaryType: '시급',
      salaryAmount: 10000,
      workStartTime: '09:00',
      workEndTime: '18:00',
      workDays: '월,화,수,목,금',
      allowances: {
        overtime: false,
        night: false,
        holiday: false,
        weeklyHoliday: true
      },
      insurance: {
        pension: false,
        health: false,
        employment: false,
        workComp: false
      },
      weeklyHours: 40
    };
    
    const attendances = [
      {
        date: '2025-01-15',
        clockIn: '09:00',
        clockOut: '18:00',
        checkIn: '09:00',
        checkOut: '18:00'
      }
    ];
    
    const result = await salaryCalculator.calculateMonthlySalary(
      employee,
      contract,
      attendances,
      '2025-01'
    );
    
    // 검증
    expect(result.employeeName).toBe('김철수');
    expect(result.salaryType).toBe('시급');
    expect(result.hourlyWage).toBe(10000);
    
    // 근무시간: 9시간
    expect(result.totalWorkHours).toBe(9);
    
    // 기본급: 9시간 × 10,000원 = 90,000원
    expect(result.basePay).toBe(90000);
    
    // 근무일수: 1일
    expect(result.workDays).toBe(1);
    
    // 총 지급액 (수당 없음)
    expect(result.totalPay).toBeGreaterThanOrEqual(90000);
  });
  
  test('시급제 - 야간근무 수당 포함', async () => {
    const employee = {
      name: '이영희',
      uid: 'test-uid-002',
      companyId: 'test-company-001',
      store: '맛남살롱 부천시청점'
    };
    
    const contract = {
      salaryType: '시급',
      salaryAmount: 10000,
      workStartTime: '21:00',
      workEndTime: '06:00',
      workDays: '월,화,수,목,금',
      allowances: {
        overtime: false,
        night: true,  // 야간 수당 적용
        holiday: false,
        weeklyHoliday: true
      },
      insurance: {},
      weeklyHours: 40
    };
    
    const attendances = [
      {
        date: '2025-01-15',
        clockIn: '21:00',
        clockOut: '06:00',
        checkIn: '21:00',
        checkOut: '06:00'
      }
    ];
    
    const result = await salaryCalculator.calculateMonthlySalary(
      employee,
      contract,
      attendances,
      '2025-01'
    );
    
    // 근무시간: 9시간 (21:00~06:00)
    expect(result.totalWorkHours).toBe(9);
    
    // 야간근무: 8시간 (22:00~06:00)
    expect(result.nightHours).toBe(8);
    
    // 야간 수당: 10,000원 × 0.5 × 8시간 = 40,000원
    expect(result.nightPay).toBe(40000);
    
    // 기본급: 90,000원
    expect(result.basePay).toBe(90000);
    
    // 총 지급액: 기본급 + 야간수당
    expect(result.totalPay).toBeGreaterThanOrEqual(130000);
  });
  
  test('시급제 - 공휴일 근무 수당', async () => {
    const employee = {
      name: '박민수',
      uid: 'test-uid-003',
      companyId: 'test-company-001',
      store: '맛남살롱 부천시청점'
    };
    
    const contract = {
      salaryType: '시급',
      salaryAmount: 10000,
      workStartTime: '09:00',
      workEndTime: '18:00',
      workDays: '월,화,수,목,금,토,일',
      allowances: {
        overtime: false,
        night: false,
        holiday: true,  // 공휴일 수당 적용
        weeklyHoliday: false
      },
      insurance: {}
    };
    
    const attendances = [
      {
        date: '2025-01-01',  // 신정 (공휴일)
        clockIn: '09:00',
        clockOut: '18:00',
        checkIn: '09:00',
        checkOut: '18:00'
      }
    ];
    
    const result = await salaryCalculator.calculateMonthlySalary(
      employee,
      contract,
      attendances,
      '2025-01'
    );
    
    // 근무시간: 9시간
    expect(result.totalWorkHours).toBe(9);
    
    // 공휴일 근무: 9시간
    expect(result.holidayHours).toBe(9);
    
    // 공휴일 수당: 10,000원 × 1.5 × 9시간 = 135,000원
    expect(result.holidayPay).toBe(135000);
    
    // 기본급: 90,000원
    expect(result.basePay).toBe(90000);
    
    // 총 지급액: 기본급 + 공휴일 수당 = 225,000원
    expect(result.totalPay).toBe(225000);
  });
  
  test('월급제 - 고정 급여', async () => {
    const employee = {
      name: '최경희',
      uid: 'test-uid-004',
      companyId: 'test-company-001',
      store: '맛남살롱 부천시청점'
    };
    
    const contract = {
      salaryType: '월급',
      salaryAmount: 2500000,
      allowances: {},
      insurance: {}
    };
    
    const attendances = [
      {
        date: '2025-01-15',
        clockIn: '09:00',
        clockOut: '18:00',
        checkIn: '09:00',
        checkOut: '18:00'
      },
      {
        date: '2025-01-16',
        clockIn: '09:00',
        clockOut: '18:00',
        checkIn: '09:00',
        checkOut: '18:00'
      }
    ];
    
    const result = await salaryCalculator.calculateMonthlySalary(
      employee,
      contract,
      attendances,
      '2025-01'
    );
    
    // 월급제는 고정 금액
    expect(result.salaryType).toBe('월급');
    expect(result.monthlyWage).toBe(2500000);
    
    // 기본급: 월급 고정
    expect(result.basePay).toBe(2500000);
    
    // 총 지급액: 월급 + 수당
    expect(result.totalPay).toBeGreaterThanOrEqual(2500000);
  });
  
  test('4대보험 공제 계산', async () => {
    const employee = {
      name: '정수진',
      uid: 'test-uid-005',
      companyId: 'test-company-001',
      store: '맛남살롱 부천시청점'
    };
    
    const contract = {
      salaryType: '월급',
      salaryAmount: 3000000,
      allowances: {},
      insurance: {
        pension: true,
        health: true,
        employment: true,
        workComp: false
      }
    };
    
    const attendances = [
      {
        date: '2025-01-15',
        clockIn: '09:00',
        clockOut: '18:00',
        checkIn: '09:00',
        checkOut: '18:00'
      }
    ];
    
    const result = await salaryCalculator.calculateMonthlySalary(
      employee,
      contract,
      attendances,
      '2025-01'
    );
    
    // 기본급: 3,000,000원
    expect(result.basePay).toBe(3000000);
    
    // 국민연금 (4.5%)
    expect(result.nationalPension).toBe(Math.round(3000000 * 0.045));
    
    // 건강보험 (3.545%)
    expect(result.healthInsurance).toBe(Math.round(3000000 * 0.03545));
    
    // 장기요양보험 (건강보험의 12.95% × 50%)
    const expectedLongTermCare = Math.round(
      Math.round(3000000 * 0.03545) * 0.1295 * 0.5
    );
    expect(result.longTermCare).toBe(expectedLongTermCare);
    
    // 고용보험 (0.9%)
    expect(result.employmentInsurance).toBe(Math.round(3000000 * 0.009));
    
    // 소득세 (3.3%)
    expect(result.incomeTax).toBe(Math.round(3000000 * 0.033));
    
    // 총 공제액
    expect(result.totalDeductions).toBeGreaterThan(0);
    
    // 실지급액 = 총 지급액 - 총 공제액
    expect(result.netPay).toBe(result.totalPay - result.totalDeductions);
    expect(result.netPay).toBeLessThan(result.totalPay);
  });
});
