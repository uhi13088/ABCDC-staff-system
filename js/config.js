// ===================================================================
// 설정 파일 (Configuration)
// ===================================================================

const CONFIG = {
  // Google Apps Script Web App URL (배포 후 여기에 입력)
  // 예시: https://script.google.com/macros/s/AKfycbxxx.../exec
  APPS_SCRIPT_URL: 'YOUR_APPS_SCRIPT_URL_HERE',
  
  // 매장 정보
  STORES: [
    { id: 'busan_city', name: '부천시청점', address: '경기도 부천시 원미구' },
    { id: 'sangdong', name: '상동점', address: '경기도 부천시 상동' },
    { id: 'bucheon_station', name: '부천역사점', address: '경기도 부천시 역곡동' }
  ],
  
  // 근무 타입
  WORK_TYPES: [
    { id: 'regular', name: '정규근무', color: '#4CAF50' },
    { id: 'overtime', name: '초과근무', color: '#FF9800' },
    { id: 'substitute', name: '대타근무', color: '#2196F3' }
  ],
  
  // 근태 상태
  ATTENDANCE_STATUS: [
    { id: 'normal', name: '정상', color: '#4CAF50' },
    { id: 'late', name: '지각', color: '#FF9800' },
    { id: 'early', name: '조퇴', color: '#FFC107' },
    { id: 'absent', name: '결근', color: '#F44336' }
  ],
  
  // 고용 형태
  EMPLOYMENT_TYPES: [
    { id: 'hourly', name: '시급제' },
    { id: 'monthly', name: '월급제' }
  ],
  
  // 계약서 템플릿 타입
  CONTRACT_TYPES: [
    { id: 'fulltime', name: '정규직 근로계약서', template: 'template_fulltime' },
    { id: 'parttime', name: '시간제 근로계약서', template: 'template_parttime' },
    { id: 'intern', name: '인턴 근로계약서', template: 'template_intern' },
    { id: 'temporary', name: '임시직 근로계약서', template: 'template_temporary' }
  ],
  
  // 4대보험 기준 (2024년 기준)
  INSURANCE_RATES: {
    national_pension: 0.045,      // 국민연금 4.5%
    health_insurance: 0.03545,    // 건강보험 3.545%
    long_term_care: 0.004591,     // 장기요양 0.4591% (건강보험료의 12.95%)
    employment_insurance: 0.009   // 고용보험 0.9%
  },
  
  // 3.3% 세금 (프리랜서/일용직)
  FREELANCE_TAX_RATE: 0.033,
  
  // 지각/조퇴 기준 (분)
  TARDINESS_THRESHOLD: 1,  // 1분 초과 시 지각
  EARLY_LEAVE_THRESHOLD: 1, // 1분 초과 시 조퇴
  
  // 주휴수당 계산 기준
  WEEKLY_HOLIDAY_PAY: {
    MIN_WEEKLY_HOURS: 15,  // 주 15시간 이상 근무 시 주휴수당 지급
    WEEKLY_HOURS: 40       // 주 40시간 기준
  },
  
  // 퇴직금 기준
  RETIREMENT_PAY: {
    MIN_MONTHS: 12,  // 1년 이상 근속 시 퇴직금 지급
    AVERAGE_MONTHS: 3 // 최근 3개월 평균임금 기준
  },
  
  // 페이지네이션
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
  },
  
  // 세션 스토리지 키
  STORAGE_KEYS: {
    USER_INFO: 'matnamsalon_user',
    CURRENT_ROLE: 'matnamsalon_role',
    LAST_LOGIN: 'matnamsalon_last_login'
  },
  
  // 날짜 형식
  DATE_FORMAT: {
    DISPLAY: 'YYYY-MM-DD',
    DATETIME_DISPLAY: 'YYYY-MM-DD HH:mm:ss',
    TIME_DISPLAY: 'HH:mm'
  },
  
  // API 타임아웃 (밀리초)
  API_TIMEOUT: 30000,
  
  // 자동 확정 시간 (매일 00:00)
  AUTO_CONFIRM_TIME: '00:00',
  
  // 데이터 보관 기간 (년)
  DATA_RETENTION_YEARS: 2,
  
  // 개발 모드 (디버그 로그 활성화)
  DEBUG_MODE: true
};

// 설정 값 가져오기 헬퍼 함수
function getConfig(key) {
  const keys = key.split('.');
  let value = CONFIG;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`[미검증] 설정 키를 찾을 수 없음: ${key}`);
      return null;
    }
  }
  
  return value;
}

// Apps Script URL이 설정되었는지 확인
function isConfigured() {
  return CONFIG.APPS_SCRIPT_URL && CONFIG.APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE';
}

// 디버그 로그
function debugLog(...args) {
  if (CONFIG.DEBUG_MODE) {
    console.log('[DEBUG]', ...args);
  }
}
