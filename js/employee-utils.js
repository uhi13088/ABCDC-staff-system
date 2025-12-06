/**
 * employee.js의 Pure Utility Functions
 * 테스트 가능하도록 별도 모듈로 분리
 * Firebase 의존성 없음
 */

/**
 * 문자열 첫 글자를 대문자로 변환
 * @param {string} str - 변환할 문자열
 * @returns {string} 첫 글자가 대문자인 문자열
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 시간 포맷팅 (HH:MM)
 * @param {Date} date - Date 객체
 * @returns {string} HH:MM 형식 문자열
 */
function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * 근무 시간 계산 (HH:MM 형식으로 반환)
 * @param {string} clockIn - 출근 시간 (HH:MM)
 * @param {string} clockOut - 퇴근 시간 (HH:MM)
 * @returns {string} "X시간 Y분" 형식
 */
function calculateWorkTime(clockIn, clockOut) {
  const workMinutes = getWorkMinutes(clockIn, clockOut);
  const workHours = Math.floor(workMinutes / 60);
  const workMins = workMinutes % 60;
  return `${workHours}시간 ${workMins}분`;
}

/**
 * 시간 문자열을 분 단위로 변환
 * @param {string} timeStr - "HH:MM" 형식
 * @returns {number} 총 분
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * 근무 시간 계산 (분 단위 반환)
 * @param {string} clockIn - 출근 시간 (HH:MM)
 * @param {string} clockOut - 퇴근 시간 (HH:MM)
 * @returns {number} 근무 시간 (분)
 */
function getWorkMinutes(clockIn, clockOut) {
  const clockInTime = clockIn.split(':');
  const clockOutTime = clockOut.split(':');
  const startMinutes = parseInt(clockInTime[0]) * 60 + parseInt(clockInTime[1]);
  const endMinutes = parseInt(clockOutTime[0]) * 60 + parseInt(clockOutTime[1]);
  return endMinutes - startMinutes;
}

/**
 * 상태에 따른 CSS 클래스 반환
 * @param {string} status - 출근 상태
 * @returns {string} badge CSS 클래스
 */
function getStatusClass(status) {
  const statusMap = {
    '정상': 'success',
    '지각': 'warning',
    '조퇴': 'warning',
    '결근': 'danger'
  };
  return statusMap[status] || 'gray';
}

/**
 * Firestore Timestamp를 한국 시간 문자열로 변환
 * @param {Object} timestamp - Firestore Timestamp
 * @returns {string} 포맷된 날짜 문자열
 */
function formatFirestoreTimestamp(timestamp) {
  if (!timestamp) return '-';
  
  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    return '-';
  }
  
  const dateStr = date.toLocaleDateString('ko-KR');
  const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} ${timeStr}`;
}

/**
 * 날짜가 속한 주차 구하기 (월 기준)
 * @param {Date} date
 * @returns {string} "YYYY-MM-W주차"
 */
function getWeekOfMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekNum = Math.ceil(day / 7);
  return `${year}-${month.toString().padStart(2, '0')}-W${weekNum}`;
}

/**
 * 시간(분)을 "시간 분" 형식으로 변환
 * @param {number} totalMinutes - 총 분
 * @returns {string} "X시간 Y분" 형식
 */
function formatHoursAndMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

// ===========================================
// 모듈 Export
// ===========================================

// Node.js/CommonJS 환경 (Jest 테스트용)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    capitalize,
    formatTime,
    calculateWorkTime,
    timeToMinutes,
    getWorkMinutes,
    getStatusClass,
    formatFirestoreTimestamp,
    getWeekOfMonth,
    formatHoursAndMinutes
  };
}

// 브라우저 환경 (전역 변수로 노출)
if (typeof window !== 'undefined') {
  window.employeeUtils = {
    capitalize,
    formatTime,
    calculateWorkTime,
    timeToMinutes,
    getWorkMinutes,
    getStatusClass,
    formatFirestoreTimestamp,
    getWeekOfMonth,
    formatHoursAndMinutes
  };
}
