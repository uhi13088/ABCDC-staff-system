/**
 * Firestore 필드명 상수 정의
 * 모든 컬렉션에서 사용되는 필드명을 중앙에서 관리
 */

// ==================== users 컬렉션 ====================
const USER_FIELDS = {
  // 기본 정보
  NAME: 'name',
  EMAIL: 'email',
  PHONE: 'phone',
  BIRTH: 'birth',
  ADDRESS: 'address',
  
  // 근무 정보
  STORE: 'store',                    // ⚠️ storeId가 아님! 매장 이름
  POSITION: 'position',
  ROLE: 'role',                      // employee/manager/admin
  STATUS: 'status',                  // active/pending/resigned
  
  // 급여 정보
  SALARY_TYPE: 'salaryType',         // hourly/monthly/annual
  SALARY_AMOUNT: 'salaryAmount',
  
  // 메타 정보
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt'
};

// ==================== contracts 컬렉션 ====================
const CONTRACT_FIELDS = {
  // 계약서 ID
  ID: 'id',
  
  // 직원 정보
  EMPLOYEE_NAME: 'employeeName',
  EMPLOYEE_BIRTH: 'employeeBirth',
  EMPLOYEE_PHONE: 'employeePhone',
  EMPLOYEE_ADDRESS: 'employeeAddress',
  EMPLOYEE_POSITION: 'employeePosition',  // 또는 position
  
  // 회사 정보
  COMPANY_NAME: 'companyName',
  COMPANY_CEO: 'companyCEO',
  COMPANY_BUSINESS_NUMBER: 'companyBusinessNumber',
  COMPANY_PHONE: 'companyPhone',
  COMPANY_ADDRESS: 'companyAddress',
  
  // 계약 기간
  CONTRACT_START_DATE: 'contractStartDate',  // ⚠️ startDate 아님!
  CONTRACT_END_DATE: 'contractEndDate',      // ⚠️ endDate 아님!
  CONTRACT_TYPE: 'contractType',
  CONTRACT_DATE: 'contractDate',
  CONTRACT_CONTENT: 'contractContent',       // 또는 contractBody
  
  // 근무 정보
  WORK_STORE: 'workStore',                  // 또는 workPlace
  STORE_ID: 'storeId',
  POSITION: 'position',
  
  // 근무 스케줄 (schedule 객체 또는 개별 필드)
  SCHEDULE: 'schedule',                     // 스케줄 객체
  WORK_DAYS: 'workDays',                    // 또는 schedule.days
  WORK_TIME: 'workTime',                    // 또는 schedule.time
  BREAK_TIME: 'breakTime',                  // 또는 schedule.breakTime
  
  // 급여 정보
  SALARY_TYPE: 'salaryType',                // ⚠️ wageType 아님!
  SALARY_AMOUNT: 'salaryAmount',            // ⚠️ wageAmount 아님!
  SALARY_PAYMENT_DAY: 'salaryPaymentDay',   // 또는 paymentDay (숫자)
  SALARY_CALCULATION_TYPE: 'salaryCalculationType',
  SALARY_CALCULATION_PERIOD: 'salaryCalculationPeriod',
  PAYMENT_METHOD: 'paymentMethod',
  
  // 수당 설정
  ALLOWANCES: 'allowances',
  ALLOWANCES_WEEKLY_HOLIDAY: 'allowances.weeklyHoliday',
  ALLOWANCES_OVERTIME: 'allowances.overtime',
  ALLOWANCES_NIGHT: 'allowances.night',
  ALLOWANCES_HOLIDAY: 'allowances.holiday',
  
  // 보험 설정
  INSURANCE: 'insurance',
  INSURANCE_TYPE: 'insurance.type',
  INSURANCE_PENSION: 'insurance.pension',
  INSURANCE_HEALTH: 'insurance.health',
  INSURANCE_EMPLOYMENT: 'insurance.employment',
  INSURANCE_WORK_COMP: 'insurance.workComp',
  INSURANCE_SEVERANCE_PAY: 'insurance.severancePay',
  
  // 서명 정보
  SIGN_LINK: 'signLink',
  IS_SIGNED: 'isSigned',
  SIGNED_AT: 'signedAt',
  
  // 메타 정보
  CREATED_AT: 'createdAt',
  CREATED_BY: 'createdBy',
  UPDATED_AT: 'updatedAt'
};

// ==================== schedules 컬렉션 ====================
const SCHEDULE_FIELDS = {
  // 요일별 필드 (월, 화, 수, 목, 금, 토, 일)
  DAYS: {
    MONDAY: '월',
    TUESDAY: '화',
    WEDNESDAY: '수',
    THURSDAY: '목',
    FRIDAY: '금',
    SATURDAY: '토',
    SUNDAY: '일'
  },
  
  // 각 요일 객체 내부 필드
  START_TIME: 'startTime',          // 예: "09:00"
  END_TIME: 'endTime',              // 예: "18:00"
  HOURS: 'hours',                   // 예: 8
  IS_WORK_DAY: 'isWorkDay',         // true/false
  
  // 메타 정보
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  
  // 문서 ID 생성 함수
  generateDocId: (userId, year, weekNum) => {
    return `${userId}_${year}-${weekNum}`;
  }
};

// ==================== attendance 컬렉션 ====================
const ATTENDANCE_FIELDS = {
  // 기본 정보
  USER_ID: 'userId',
  DATE: 'date',                     // 예: "2025-11-08"
  
  // 출퇴근 시간
  CHECK_IN_TIME: 'checkInTime',     // 예: "09:05"
  CHECK_OUT_TIME: 'checkOutTime',   // 예: "18:10"
  
  // 상태
  STATUS: 'status',                 // normal/absent/late/early
  IS_LATE: 'isLate',
  IS_EARLY_LEAVE: 'isEarlyLeave',
  
  // 근무 시간
  WORK_HOURS: 'workHours',
  OVERTIME_HOURS: 'overtimeHours',
  BREAK_HOURS: 'breakHours',
  
  // 메타 정보
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt'
};

// ==================== stores 컬렉션 ====================
const STORE_FIELDS = {
  // 기본 정보
  NAME: 'name',                     // 예: "맛남살롱 부천시청점"
  ADDRESS: 'address',
  PHONE: 'phone',
  CEO: 'ceo',
  BUSINESS_NUMBER: 'businessNumber',
  
  // 운영 시간
  OPEN_TIME: 'openTime',            // 예: "08:00"
  CLOSE_TIME: 'closeTime',          // 예: "22:00"
  
  // 급여 설정
  SALARY_PAYMENT_DAY: 'salaryPaymentDay',
  SALARY_CALCULATION_TYPE: 'salaryCalculationType',
  SALARY_CALCULATION_PERIOD: 'salaryCalculationPeriod',
  
  // 서명
  CEO_SIGNATURE: 'ceoSignature',    // Base64 이미지
  
  // 메타 정보
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt'
};

// ==================== salary 컬렉션 ====================
const SALARY_FIELDS = {
  // 기본 정보
  USER_ID: 'userId',
  USER_NAME: 'userName',
  STORE_ID: 'storeId',
  STORE_NAME: 'storeName',
  
  // 급여 기간
  YEAR: 'year',
  MONTH: 'month',
  CALCULATION_PERIOD: 'calculationPeriod',
  
  // 급여 정보
  BASE_SALARY: 'baseSalary',
  TOTAL_HOURS: 'totalHours',
  OVERTIME_HOURS: 'overtimeHours',
  
  // 수당
  WEEKLY_HOLIDAY_PAY: 'weeklyHolidayPay',
  OVERTIME_PAY: 'overtimePay',
  NIGHT_PAY: 'nightPay',
  HOLIDAY_PAY: 'holidayPay',
  
  // 공제
  DEDUCTIONS: 'deductions',
  NATIONAL_PENSION: 'deductions.nationalPension',
  HEALTH_INSURANCE: 'deductions.healthInsurance',
  EMPLOYMENT_INSURANCE: 'deductions.employmentInsurance',
  INCOME_TAX: 'deductions.incomeTax',
  
  // 최종 금액
  TOTAL_PAY: 'totalPay',
  TOTAL_DEDUCTIONS: 'totalDeductions',
  NET_PAY: 'netPay',
  
  // 상태
  STATUS: 'status',                 // pending/confirmed/paid
  CONFIRMED_AT: 'confirmedAt',
  PAID_AT: 'paidAt',
  
  // 메타 정보
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt'
};

// ==================== 유틸리티 함수 ====================

/**
 * 계약서 객체에서 값 가져오기 (호환성 보장)
 * @param {Object} contract - 계약서 객체
 * @param {string} field - 필드명
 * @param {*} defaultValue - 기본값
 * @returns {*} 필드 값
 */
function getContractField(contract, field, defaultValue = null) {
  // 필드명 매핑 (구 필드명 → 신 필드명)
  const fieldMapping = {
    'startDate': CONTRACT_FIELDS.CONTRACT_START_DATE,
    'endDate': CONTRACT_FIELDS.CONTRACT_END_DATE,
    'wageType': CONTRACT_FIELDS.SALARY_TYPE,
    'wageAmount': CONTRACT_FIELDS.SALARY_AMOUNT,
    'paymentDay': CONTRACT_FIELDS.SALARY_PAYMENT_DAY,
    'workPlace': CONTRACT_FIELDS.WORK_STORE
  };
  
  // 매핑된 필드명이 있으면 우선 사용
  const primaryField = fieldMapping[field] || field;
  
  // 1차: 표준 필드명으로 조회
  if (contract[primaryField] !== undefined) {
    return contract[primaryField];
  }
  
  // 2차: 원래 필드명으로 조회 (하위 호환성)
  if (contract[field] !== undefined) {
    return contract[field];
  }
  
  // 3차: 중첩 객체 조회 (예: schedule.days)
  if (field.includes('.')) {
    const parts = field.split('.');
    let value = contract;
    for (const part of parts) {
      if (value && value[part] !== undefined) {
        value = value[part];
      } else {
        return defaultValue;
      }
    }
    return value;
  }
  
  return defaultValue;
}

/**
 * Firestore 문서에 사용할 계약서 데이터 정규화
 * @param {Object} formData - 폼 데이터
 * @returns {Object} 정규화된 계약서 데이터
 */
function normalizeContractData(formData) {
  return {
    // 표준 필드명 사용
    [CONTRACT_FIELDS.CONTRACT_START_DATE]: formData.startDate || formData.contractStartDate,
    [CONTRACT_FIELDS.CONTRACT_END_DATE]: formData.endDate || formData.contractEndDate,
    [CONTRACT_FIELDS.SALARY_TYPE]: formData.wageType || formData.salaryType,
    [CONTRACT_FIELDS.SALARY_AMOUNT]: formData.wageAmount || formData.salaryAmount,
    [CONTRACT_FIELDS.SALARY_PAYMENT_DAY]: formData.paymentDay || formData.salaryPaymentDay,
    [CONTRACT_FIELDS.WORK_STORE]: formData.workStore || formData.workPlace,
    
    // 나머지 필드는 그대로 복사
    ...formData
  };
}

// 전역 객체로 export
if (typeof window !== 'undefined') {
  window.FIELDS = {
    USER: USER_FIELDS,
    CONTRACT: CONTRACT_FIELDS,
    SCHEDULE: SCHEDULE_FIELDS,
    ATTENDANCE: ATTENDANCE_FIELDS,
    STORE: STORE_FIELDS,
    SALARY: SALARY_FIELDS,
    
    // 유틸리티 함수
    getContractField,
    normalizeContractData
  };
}
