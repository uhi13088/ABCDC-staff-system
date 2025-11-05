// ===================================================================
// 유틸리티 함수 (Utilities)
// ===================================================================

// ===================================================================
// 날짜/시간 관련 함수
// ===================================================================

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 날짜를 YYYY-MM-DD HH:mm:ss 형식으로 포맷
 */
function formatDateTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 시간을 HH:mm 형식으로 포맷
 */
function formatTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * HH:mm 형식의 시간 문자열을 Date 객체로 변환
 */
function parseTime(timeStr, baseDate = new Date()) {
  if (!timeStr) return null;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  
  return date;
}

/**
 * 두 시간 사이의 분 차이 계산
 */
function getMinutesDifference(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  return Math.round((end - start) / (1000 * 60));
}

/**
 * 두 시간 사이의 시간 차이 계산 (시간 단위, 소수점 2자리)
 */
function getHoursDifference(startTime, endTime) {
  const minutes = getMinutesDifference(startTime, endTime);
  return parseFloat((minutes / 60).toFixed(2));
}

/**
 * 분을 "X시간 Y분" 형식으로 변환
 */
function formatMinutesToHourMin(minutes) {
  if (!minutes || minutes < 0) return '0분';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

/**
 * 해당 월의 실제 일수 계산
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 해당 월의 주차 계산 (실제 일수 / 7)
 */
function getWeeksInMonth(year, month) {
  const days = getDaysInMonth(year, month);
  return parseFloat((days / 7).toFixed(4));
}

/**
 * 현재 월의 첫날/마지막날 가져오기
 */
function getMonthRange(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  return {
    firstDay: formatDate(firstDay),
    lastDay: formatDate(lastDay)
  };
}

// ===================================================================
// 숫자/금액 관련 함수
// ===================================================================

/**
 * 숫자를 천단위 구분 기호로 포맷
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Math.round(num).toLocaleString('ko-KR');
}

/**
 * 금액을 원화 형식으로 포맷
 */
function formatCurrency(amount) {
  return `${formatNumber(amount)}원`;
}

/**
 * 문자열에서 숫자만 추출
 */
function extractNumber(str) {
  if (!str) return 0;
  const num = String(str).replace(/[^\d.-]/g, '');
  return parseFloat(num) || 0;
}

/**
 * 퍼센트 포맷
 */
function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
}

// ===================================================================
// 급여 계산 관련 함수
// ===================================================================

/**
 * 주휴수당 계산
 * @param {number} weeklyHours - 주간 근무시간
 * @param {number} hourlyWage - 시급
 * @param {number} weeksInMonth - 해당 월의 주차 수
 */
function calculateWeeklyHolidayPay(weeklyHours, hourlyWage, weeksInMonth) {
  if (weeklyHours < CONFIG.WEEKLY_HOLIDAY_PAY.MIN_WEEKLY_HOURS) {
    return 0;
  }
  
  const weeklyPay = (weeklyHours / 5) * 1 * hourlyWage;
  return Math.round(weeklyPay * weeksInMonth);
}

/**
 * 4대보험 계산
 */
function calculateInsurance(baseSalary) {
  const rates = CONFIG.INSURANCE_RATES;
  
  return {
    nationalPension: Math.round(baseSalary * rates.national_pension),
    healthInsurance: Math.round(baseSalary * rates.health_insurance),
    longTermCare: Math.round(baseSalary * rates.health_insurance * (rates.long_term_care / rates.health_insurance)),
    employmentInsurance: Math.round(baseSalary * rates.employment_insurance),
    total: function() {
      return this.nationalPension + this.healthInsurance + this.longTermCare + this.employmentInsurance;
    }
  };
}

/**
 * 3.3% 세금 계산
 */
function calculateFreelanceTax(amount) {
  return Math.round(amount * CONFIG.FREELANCE_TAX_RATE);
}

/**
 * 퇴직금 계산 (1일 평균임금 × 30일 × (근속일수 / 365))
 */
function calculateRetirementPay(avgDailySalary, workDays) {
  if (workDays < 365) return 0; // 1년 미만은 퇴직금 없음
  
  return Math.round(avgDailySalary * 30 * (workDays / 365));
}

// ===================================================================
// 검증 함수
// ===================================================================

/**
 * 이메일 형식 검증
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * 전화번호 형식 검증 (한국)
 */
function isValidPhone(phone) {
  const re = /^(01[0-9]|02|0[3-9][0-9])-?[0-9]{3,4}-?[0-9]{4}$/;
  return re.test(String(phone).replace(/\s/g, ''));
}

/**
 * 주민등록번호 형식 검증 (앞 6자리만)
 */
function isValidResidentNumber(number) {
  const re = /^[0-9]{6}$/;
  return re.test(String(number));
}

/**
 * 빈 값 체크
 */
function isEmpty(value) {
  return value === null || value === undefined || value === '' || 
         (Array.isArray(value) && value.length === 0) ||
         (typeof value === 'object' && Object.keys(value).length === 0);
}

// ===================================================================
// UI 헬퍼 함수
// ===================================================================

/**
 * 로딩 표시
 */
function showLoading(message = '처리 중...') {
  const existingLoader = document.querySelector('.loader-overlay');
  if (existingLoader) return;
  
  const loader = document.createElement('div');
  loader.className = 'loader-overlay';
  loader.innerHTML = `
    <div class="loader-content">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
  
  document.body.appendChild(loader);
}

/**
 * 로딩 숨김
 */
function hideLoading() {
  const loader = document.querySelector('.loader-overlay');
  if (loader) {
    loader.remove();
  }
}

/**
 * 알림 메시지 표시
 */
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  
  document.body.appendChild(alertDiv);
  
  // 3초 후 자동 제거
  setTimeout(() => {
    alertDiv.style.opacity = '0';
    setTimeout(() => alertDiv.remove(), 300);
  }, 3000);
}

/**
 * 확인 다이얼로그
 */
function showConfirm(message, onConfirm, onCancel = null) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>확인</h3>
      <p>${message}</p>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="cancelBtn">취소</button>
        <button class="btn btn-primary" id="confirmBtn">확인</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('confirmBtn').addEventListener('click', () => {
    modal.remove();
    if (onConfirm) onConfirm();
  });
  
  document.getElementById('cancelBtn').addEventListener('click', () => {
    modal.remove();
    if (onCancel) onCancel();
  });
}

/**
 * 배지 HTML 생성
 */
function createBadge(text, type = 'info') {
  return `<span class="badge badge-${type}">${text}</span>`;
}

/**
 * 테이블 행 생성 헬퍼
 */
function createTableRow(data, columns) {
  const row = document.createElement('tr');
  
  columns.forEach(col => {
    const cell = document.createElement('td');
    
    if (typeof col.render === 'function') {
      cell.innerHTML = col.render(data[col.key], data);
    } else {
      cell.textContent = data[col.key] || '-';
    }
    
    row.appendChild(cell);
  });
  
  return row;
}

// ===================================================================
// 로컬 스토리지 헬퍼
// ===================================================================

/**
 * 세션 스토리지에 저장
 */
function saveToSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('[미검증] 세션 저장 실패:', e);
    return false;
  }
}

/**
 * 세션 스토리지에서 가져오기
 */
function getFromSession(key) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (e) {
    console.error('[미검증] 세션 읽기 실패:', e);
    return null;
  }
}

/**
 * 세션 스토리지에서 삭제
 */
function removeFromSession(key) {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('[미검증] 세션 삭제 실패:', e);
    return false;
  }
}

/**
 * 로컬 스토리지에 저장
 */
function saveToLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('[미검증] 로컬 저장 실패:', e);
    return false;
  }
}

/**
 * 로컬 스토리지에서 가져오기
 */
function getFromLocal(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (e) {
    console.error('[미검증] 로컬 읽기 실패:', e);
    return null;
  }
}

// ===================================================================
// 기타 유틸리티
// ===================================================================

/**
 * 배열을 청크로 나누기
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 객체 deep copy
 */
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 배열에서 중복 제거
 */
function uniqueArray(array) {
  return [...new Set(array)];
}

/**
 * 랜덤 ID 생성
 */
function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 디바운스 함수
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * URL 파라미터 가져오기
 */
function getUrlParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

/**
 * 파일 다운로드
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
