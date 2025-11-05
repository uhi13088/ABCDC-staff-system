/**
 * 맛남살롱 급여 계산 모듈
 * - 공휴일 판별
 * - 근무 시간 계산
 * - 급여 계산 (시급제/월급제/연봉제)
 * - 각종 수당 계산 (연장/야간/휴일/주휴/퇴직금)
 */

// ===========================================
// 공휴일 데이터 (2025년)
// ===========================================

const publicHolidays2025 = [
  '2025-01-01', // 신정
  '2025-01-28', '2025-01-29', '2025-01-30', // 설날 연휴
  '2025-03-01', // 삼일절
  '2025-03-05', // 부처님오신날
  '2025-05-05', // 어린이날
  '2025-05-06', // 대체공휴일
  '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-10-03', // 개천절
  '2025-10-05', '2025-10-06', '2025-10-07', // 추석 연휴
  '2025-10-09', // 한글날
  '2025-12-25', // 크리스마스
];

/**
 * 해당 날짜가 공휴일인지 확인
 * @param {string} dateStr - "YYYY-MM-DD" 형식
 * @returns {boolean} 공휴일 여부
 */
function isPublicHoliday(dateStr) {
  return publicHolidays2025.includes(dateStr);
}

// ===========================================
// 급여 계산 유틸리티 함수들
// ===========================================

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
 * 시간(소수점)을 "시간 분" 형식으로 변환
 * @param {number} hours - 시간 (소수점)
 * @returns {string} "X시간 Y분" 형식
 */
function formatHoursAndMinutes(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/**
 * 두 시간 사이의 차이를 시간 단위로 계산
 * @param {string} startTime - "HH:MM"
 * @param {string} endTime - "HH:MM"
 * @returns {number} 시간 (소수점)
 */
function calculateWorkHours(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  
  // 자정을 넘어가는 경우 처리
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

/**
 * 야간 근무 시간 계산 (22:00~06:00)
 * @param {string} startTime - "HH:MM"
 * @param {string} endTime - "HH:MM"
 * @returns {number} 야간 근무 시간
 */
function calculateNightHours(startTime, endTime) {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  
  if (end < start) end += 24 * 60;
  
  const nightStart = 22 * 60; // 22:00
  const nightEnd = (24 + 6) * 60; // 다음날 06:00
  
  let nightMinutes = 0;
  
  // 22:00~24:00 구간
  const overlap1Start = Math.max(start, nightStart);
  const overlap1End = Math.min(end, 24 * 60);
  if (overlap1Start < overlap1End) {
    nightMinutes += overlap1End - overlap1Start;
  }
  
  // 00:00~06:00 구간
  if (end > 24 * 60) {
    const overlap2Start = Math.max(start, 24 * 60);
    const overlap2End = Math.min(end, nightEnd);
    if (overlap2Start < overlap2End) {
      nightMinutes += overlap2End - overlap2Start;
    }
  }
  
  return nightMinutes / 60;
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
 * 한 달간 직원의 급여 계산
 * @param {object} employee - 직원 정보
 * @param {object} contract - 계약서 정보
 * @param {array} attendances - 출퇴근 기록 배열
 * @param {string} yearMonth - "YYYY-MM" 형식
 * @returns {object} 급여 상세 내역
 */
async function calculateMonthlySalary(employee, contract, attendances, yearMonth) {
  console.log('💰 급여 계산 시작:', employee.name, yearMonth);
  
  const result = {
    employeeName: employee.name,
    employeeUid: employee.uid,
    storeName: employee.store || contract.workStore,
    yearMonth: yearMonth,
    wageType: contract.wageType || '시급',
    
    // 기본 정보
    hourlyWage: 0,
    monthlyWage: 0,
    annualWage: 0,
    totalWorkHours: 0,
    
    // 지급 항목
    basePay: 0,
    overtimePay: 0,
    nightPay: 0,
    holidayPay: 0,
    weeklyHolidayPay: 0,
    severancePay: 0, // 퇴직금
    totalAllowances: 0,
    
    // 공제 항목
    nationalPension: 0,
    healthInsurance: 0,
    longTermCare: 0,
    employmentInsurance: 0,
    incomeTax: 0,
    totalDeductions: 0,
    
    // 최종 금액
    totalPay: 0,
    netPay: 0,
    
    // 상세 정보
    workDays: 0,
    attendanceDetails: []
  };
  
  const wageType = contract.wageType || '시급';
  const wageAmount = parseFloat(contract.wageAmount) || 0;
  
  if (wageAmount === 0) {
    console.log('⚠️ 급여액이 0원');
    return result;
  }
  
  // 급여 유형별 처리
  if (wageType === '시급') {
    result.hourlyWage = wageAmount;
  } else if (wageType === '월급') {
    result.monthlyWage = wageAmount;
    // 월급제는 209시간 기준 (주 40시간 × 52주 ÷ 12개월)
    result.hourlyWage = Math.round(wageAmount / 209);
  } else if (wageType === '연봉') {
    result.annualWage = wageAmount;
    result.monthlyWage = Math.round(wageAmount / 12);
    result.hourlyWage = Math.round(wageAmount / 12 / 209);
  }
  
  // 출퇴근 기록 분석
  let totalWorkHours = 0;
  let totalOvertimeHours = 0;
  let totalNightHours = 0;
  let totalHolidayHours = 0;
  let weeklyWorkHours = {}; // 주차별 근무시간
  
  attendances.forEach(att => {
    // 출근 기록이 있으면 처리 (퇴근 안 해도 현재 시간까지 계산)
    if (!att.clockIn && !att.checkIn) return;
    
    // 퇴근 시간이 없으면 현재 시간 사용 (실시간 급여 계산)
    let checkInTime = att.checkIn || att.clockIn;
    let checkOutTime = att.checkOut || att.clockOut;
    
    if (!checkOutTime) {
      // 퇴근 기록이 없으면 현재 시간 사용
      const now = new Date();
      checkOutTime = now.toTimeString().substring(0, 5); // "HH:MM" 형식
      console.log(`⏰ 퇴근 기록 없음 - 현재 시간(${checkOutTime})까지 계산`);
    }
    
    const workHours = calculateWorkHours(checkInTime, checkOutTime);
    const nightHours = calculateNightHours(checkInTime, checkOutTime);
    const isHoliday = isPublicHoliday(att.date);
    
    totalWorkHours += workHours;
    result.workDays++;
    
    // 야간 근무 시간
    if (contract.allowances?.night && nightHours > 0) {
      totalNightHours += nightHours;
    }
    
    // 공휴일 근무 시간
    if (isHoliday && contract.allowances?.holiday) {
      totalHolidayHours += workHours;
      console.log(`🎉 공휴일 근무 감지: ${att.date}, ${workHours.toFixed(2)}시간`);
    }
    
    // 주차별 근무시간 누적 (주휴수당 계산용)
    const date = new Date(att.date);
    const weekKey = getWeekOfMonth(date);
    weeklyWorkHours[weekKey] = (weeklyWorkHours[weekKey] || 0) + workHours;
    
    result.attendanceDetails.push({
      date: att.date,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      workHours: workHours.toFixed(2),
      nightHours: nightHours.toFixed(2),
      isHoliday: isHoliday,
      isRealtime: !att.checkOut && !att.clockOut // 실시간 계산 여부
    });
  });
  
  result.totalWorkHours = totalWorkHours;
  
  // 기본급 계산 (급여 유형별)
  if (wageType === '시급') {
    result.basePay = Math.round(result.hourlyWage * totalWorkHours);
  } else if (wageType === '월급' || wageType === '연봉') {
    // 월급/연봉제는 고정 월급
    result.basePay = result.monthlyWage;
  }
  
  // 연장근로수당 (주 40시간 초과분) - 계약서에 설정된 경우만
  if (contract.allowances?.overtime) {
    Object.values(weeklyWorkHours).forEach(weekHours => {
      if (weekHours > 40) {
        totalOvertimeHours += (weekHours - 40);
      }
    });
    result.overtimeHours = totalOvertimeHours;
    result.overtimePay = Math.round(result.hourlyWage * 1.5 * totalOvertimeHours);
  }
  
  // 야간근로수당 - 계약서에 설정된 경우만
  if (contract.allowances?.night && totalNightHours > 0) {
    result.nightHours = totalNightHours;
    result.nightPay = Math.round(result.hourlyWage * 0.5 * totalNightHours);
  }
  
  // 휴일근로수당 - 계약서에 설정된 경우만
  if (contract.allowances?.holiday && totalHolidayHours > 0) {
    result.holidayHours = totalHolidayHours;
    result.holidayPay = Math.round(result.hourlyWage * 1.5 * totalHolidayHours);
    console.log(`💰 휴일근로수당: ${totalHolidayHours.toFixed(2)}시간 × ${result.hourlyWage}원 × 1.5 = ${result.holidayPay.toLocaleString()}원`);
  }
  
  // 주휴수당 - 주 15시간 이상 근무한 주에 대해서만
  if (contract.allowances?.weeklyHoliday) {
    let weeklyHolidayHours = 0;
    Object.values(weeklyWorkHours).forEach(weekHours => {
      if (weekHours >= 15) {
        // 주휴수당 = (주 근무시간 / 40) × 8시간
        weeklyHolidayHours += (weekHours / 40) * 8;
      }
    });
    result.weeklyHolidayPay = Math.round(result.hourlyWage * weeklyHolidayHours);
  }
  
  // 퇴직금 계산 (1년 이상 근속, 주 15시간 이상 근무)
  try {
    const contractStartDate = new Date(contract.startDate);
    const now = new Date();
    const daysDiff = Math.floor((now - contractStartDate) / (1000 * 60 * 60 * 24));
    const yearsDiff = daysDiff / 365;
    
    // 주 평균 근무시간 계산
    const totalWeeks = Object.keys(weeklyWorkHours).length;
    const avgWeeklyHours = totalWeeks > 0 ? totalWorkHours / totalWeeks : 0;
    
    if (yearsDiff >= 1 && avgWeeklyHours >= 15) {
      // 최근 3개월 평균 급여 계산 (간소화: 이번 달 급여로 대체)
      const avgMonthlySalary = result.basePay + result.totalAllowances;
      
      // 퇴직금 = (평균급여 × 근속일수 / 365) × 30일
      result.severancePay = Math.round((avgMonthlySalary * daysDiff / 365) * 30);
      
      console.log(`💼 퇴직금 계산: 근속 ${daysDiff}일, 주평균 ${avgWeeklyHours.toFixed(1)}시간, 퇴직금 ${result.severancePay.toLocaleString()}원`);
    }
  } catch (error) {
    console.error('⚠️ 퇴직금 계산 실패:', error);
  }
  
  // 총 수당
  result.totalAllowances = result.overtimePay + result.nightPay + result.holidayPay + result.weeklyHolidayPay + result.severancePay;
  
  // 총 지급액 (공제 전)
  result.totalPay = result.basePay + result.totalAllowances;
  
  // 4대보험 공제 계산
  const insuranceType = contract.insurance?.type || 'none';
  
  if (insuranceType === 'all') {
    // 전체 적용
    result.nationalPension = Math.round(result.totalPay * 0.045); // 4.5%
    result.healthInsurance = Math.round(result.totalPay * 0.03545); // 3.545%
    result.longTermCare = Math.round(result.healthInsurance * 0.1295); // 건강보험의 12.95%
    result.employmentInsurance = Math.round(result.totalPay * 0.009); // 0.9%
    result.incomeTax = Math.round(result.totalPay * 0.033); // 3.3%
  } else if (insuranceType === 'employment_only') {
    // 고용·산재보험만
    result.employmentInsurance = Math.round(result.totalPay * 0.009); // 0.9%
    result.incomeTax = Math.round(result.totalPay * 0.033); // 3.3%
  } else if (insuranceType === 'freelancer') {
    // 프리랜서 - 소득세만
    result.incomeTax = Math.round(result.totalPay * 0.033); // 3.3%
  }
  // 'none'인 경우 공제 없음
  
  result.totalDeductions = result.nationalPension + result.healthInsurance + 
                           result.longTermCare + result.employmentInsurance + result.incomeTax;
  
  // 실지급액
  result.netPay = result.totalPay - result.totalDeductions;
  
  console.log('✅ 급여 계산 완료:', result);
  return result;
}
