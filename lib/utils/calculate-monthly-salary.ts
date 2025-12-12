/**
 * 월 단위 급여 계산 함수 (핵심 로직)
 * 백업: /home/user/webapp-backup/js/salary-calculator.js calculateMonthlySalary 함수 (라인 195~574)
 * Firebase 의존성 있음 (stores 컬렉션 조회)
 */

import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { 
  MonthlySalaryResult, 
  AttendanceForSalary, 
  ContractForSalary,
  AttendanceThresholds 
} from '@/lib/types/salary';
import {
  isPublicHoliday,
  timeToMinutes,
  calculateWorkHours,
  calculateNightHours,
  getWeekOfMonth,
} from './salary-calculator';

/**
 * 한 달간 직원의 급여 계산
 * @param employee - 직원 정보 (uid, name, store, companyId)
 * @param contract - 계약서 정보
 * @param attendances - 출퇴근 기록 배열
 * @param yearMonth - "YYYY-MM" 형식
 * @returns 급여 상세 내역
 */
export async function calculateMonthlySalary(
  employee: { uid: string; name: string; store?: string; companyId: string },
  contract: ContractForSalary,
  attendances: AttendanceForSalary[],
  yearMonth: string
): Promise<MonthlySalaryResult> {
  console.log('💰 급여 계산 시작:', employee.name, yearMonth);
  
  // yearMonth 파싱 (YYYY-MM 형식)
  const [year, month] = yearMonth.split('-').map(Number);
  
  // 매장의 출퇴근 허용시간 설정 가져오기
  let thresholds: AttendanceThresholds = {
    earlyClockIn: 15,    // 기본값: 15분 이상 일찍 출근해야 수당 적용
    earlyClockOut: 5,    // 기본값: 5분 이내 조기퇴근은 수당 미적용
    overtime: 5          // 기본값: 5분 이상 늦게 퇴근해야 수당 적용
  };
  
  try {
    const storeName = employee.store || contract.workStore;
    if (storeName) {
      let storeQuery = query(
        collection(db, 'stores'),
        where('name', '==', storeName)
      );
      
      // companyId 필터 추가
      const companyId = employee.companyId || contract.companyId;
      if (companyId) {
        storeQuery = query(storeQuery, where('companyId', '==', companyId));
      }
      
      storeQuery = query(storeQuery, firestoreLimit(1));
      const storesSnapshot = await getDocs(storeQuery);
      
      if (!storesSnapshot.empty) {
        const storeData = storesSnapshot.docs[0].data();
        if (storeData.attendanceThresholds) {
          thresholds = storeData.attendanceThresholds as AttendanceThresholds;
          console.log('⚙️ 매장 출퇴근 허용시간:', thresholds);
        }
      }
    }
  } catch (error) {
    console.error('⚠️ 매장 설정 조회 실패:', error);
  }
  
  const result: MonthlySalaryResult = {
    employeeName: employee.name,
    userId: employee.uid,             // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
    employeeUid: employee.uid,        // 하위 호환성 (기존 코드 지원)
    storeName: employee.store || contract.workStore,
    yearMonth: yearMonth,
    salaryType: contract.salaryType || contract.wageType || '시급',
    
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
    incentivePay: 0, // 🆕 Phase 5: 특별 근무 수당
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
    attendanceDetails: [],
    
    // 계약서 기준 정보 (초기값)
    contractInfo: {
      weeklyHours: 0,
      isWeeklyHolidayEligible: false,
      has4Insurance: false,
      hasPension: false,
      hasHealthInsurance: false,
      hasEmploymentInsurance: false,
      hasWorkCompInsurance: false
    }
  };
  
  const salaryType = contract.salaryType || contract.wageType || '시급';
  const salaryAmount = parseFloat(String(contract.salaryAmount || contract.wageAmount || 0));
  
  if (salaryAmount === 0) {
    console.log('⚠️ 급여액이 0원');
    return result;
  }
  
  // 급여 유형별 처리
  if (salaryType === '시급') {
    result.hourlyWage = salaryAmount;
  } else if (salaryType === '월급') {
    result.monthlyWage = salaryAmount;
    // 월급제는 209시간 기준 (주 40시간 × 52주 ÷ 12개월)
    result.hourlyWage = Math.round(salaryAmount / 209);
  } else if (salaryType === '연봉') {
    result.annualWage = salaryAmount;
    result.monthlyWage = Math.round(salaryAmount / 12);
    result.hourlyWage = Math.round(salaryAmount / 12 / 209);
  }
  
  // 출퇴근 기록 분석
  let totalWorkHours = 0;
  let totalOvertimeHours = 0;
  let totalNightHours = 0;
  let totalHolidayHours = 0;
  let totalIncentiveAmount = 0; // 🆕 Phase 5: 총 인센티브 금액
  const weeklyWorkHours: Record<string, number> = {}; // 주차별 근무시간
  const weeklyAbsences: Record<string, boolean> = {}; // 주차별 결근 여부
  
  // 계약서의 근무일정 파싱
  const workDaysArray = contract.workDays ? contract.workDays.split(',').map(d => d.trim()) : [];
  const dayMap: Record<string, number> = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0 };
  const workDayNumbers = workDaysArray.map(day => dayMap[day]).filter(n => n !== undefined);
  
  // 출근해야 하는 날짜들을 먼저 파악 (결근 체크용)
  const attendanceDates = new Set(attendances.map(att => att.date));
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    
    // 근무일인데 출근 기록이 없으면 결근
    if (workDayNumbers.includes(dayOfWeek) && !attendanceDates.has(dateStr)) {
      const weekKey = getWeekOfMonth(d);
      weeklyAbsences[weekKey] = true; // 이 주는 결근이 있음
      console.log(`⚠️ 결근 감지: ${dateStr} (${weekKey})`);
    }
  }
  
  attendances.forEach(att => {
    // 출근 기록이 있으면 처리
    if (!att.clockIn && !att.checkIn) return;
    
    // 퇴근 시간이 없으면 현재 시간 사용 (실시간 급여 계산)
    let checkInTime = att.checkIn || att.clockIn || '';
    let checkOutTime = att.checkOut || att.clockOut || '';
    
    if (!checkOutTime) {
      // 퇴근 기록이 없으면 현재 시간 사용
      const now = new Date();
      checkOutTime = now.toTimeString().substring(0, 5); // "HH:MM" 형식
      console.log(`⏰ 퇴근 기록 없음 - 현재 시간(${checkOutTime})까지 계산`);
    }
    
    // 계약서 근무시간과 비교해서 실제 근무시간 조정
    let adjustedCheckIn = checkInTime;
    let adjustedCheckOut = checkOutTime;
    
    if (contract.workStartTime && contract.workEndTime) {
      const contractStartMinutes = timeToMinutes(contract.workStartTime);
      const contractEndMinutes = timeToMinutes(contract.workEndTime);
      const actualStartMinutes = timeToMinutes(checkInTime);
      const actualEndMinutes = timeToMinutes(checkOutTime);
      
      // 조기출근 처리: 설정된 시간 이상 일찍 출근해야 수당 적용
      const earlyMinutes = contractStartMinutes - actualStartMinutes;
      if (earlyMinutes > 0 && earlyMinutes < thresholds.earlyClockIn) {
        // 허용시간 미만 조기출근 → 계약시간부터 계산
        adjustedCheckIn = contract.workStartTime;
        console.log(`⏰ 조기출근 ${earlyMinutes}분 (허용시간 ${thresholds.earlyClockIn}분 미만) → 수당 미적용`);
      }
      
      // 조기퇴근 처리: 설정된 시간 이내 조기퇴근은 수당 미적용
      const earlyLeaveMinutes = contractEndMinutes - actualEndMinutes;
      if (earlyLeaveMinutes > 0 && earlyLeaveMinutes <= thresholds.earlyClockOut) {
        // 허용시간 이내 조기퇴근 → 계약시간까지 인정
        adjustedCheckOut = contract.workEndTime;
        console.log(`⏰ 조기퇴근 ${earlyLeaveMinutes}분 (허용시간 ${thresholds.earlyClockOut}분 이내) → 차감 없음`);
      } else if (earlyLeaveMinutes > thresholds.earlyClockOut) {
        // 허용시간 초과 조기퇴근 → 실제 퇴근시간으로 계산 (차감)
        console.log(`⚠️ 조기퇴근 ${earlyLeaveMinutes}분 (허용시간 ${thresholds.earlyClockOut}분 초과) → 차감`);
      }
      
      // 초과근무 처리: 설정된 시간 이상 늦게 퇴근해야 수당 적용
      const overtimeMinutes = actualEndMinutes - contractEndMinutes;
      if (overtimeMinutes > 0 && overtimeMinutes < thresholds.overtime) {
        // 허용시간 미만 초과근무 → 계약시간까지만 계산
        adjustedCheckOut = contract.workEndTime;
        console.log(`⏰ 초과근무 ${overtimeMinutes}분 (허용시간 ${thresholds.overtime}분 미만) → 수당 미적용`);
      }
    }
    
    const workHours = calculateWorkHours(adjustedCheckIn, adjustedCheckOut);
    const nightHours = calculateNightHours(adjustedCheckIn, adjustedCheckOut);
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
    
    // 🆕 Phase 5: 인센티브 수당 계산 (wageIncentive × 근무시간)
    if (att.wageIncentive && att.wageIncentive > 0) {
      const incentiveAmount = att.wageIncentive * workHours;
      totalIncentiveAmount += incentiveAmount;
      console.log(`💰 인센티브 수당 감지: ${att.date}, ${att.wageIncentive.toLocaleString()}원/시간 × ${workHours.toFixed(2)}시간 = ${incentiveAmount.toLocaleString()}원`);
    }
    
    // 주차별 근무시간 누적 (주휴수당 계산용)
    // 🔒 하루 최대 8시간만 주휴수당 계산에 포함 (법정 근로시간 기준)
    const date = new Date(att.date);
    const weekKey = getWeekOfMonth(date);
    const weeklyHoursForDay = Math.min(workHours, 8); // 하루 최대 8시간
    weeklyWorkHours[weekKey] = (weeklyWorkHours[weekKey] || 0) + weeklyHoursForDay;
    
    if (workHours > 8) {
      console.log(`⚠️ ${att.date}: 근무시간 ${workHours.toFixed(2)}시간 → 주휴수당 계산용 ${weeklyHoursForDay}시간 (8시간 초과분 제외)`);
    }
    
    result.attendanceDetails.push({
      date: att.date,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      adjustedCheckIn: adjustedCheckIn,      // 조정된 출근시간
      adjustedCheckOut: adjustedCheckOut,    // 조정된 퇴근시간
      workHours: workHours.toFixed(2),
      nightHours: nightHours.toFixed(2),
      isHoliday: isHoliday,
      wageIncentive: att.wageIncentive || 0, // 🆕 Phase 5
      isRealtime: !att.checkOut && !att.clockOut // 실시간 계산 여부
    });
  });
  
  result.totalWorkHours = totalWorkHours;
  
  // 기본급 계산 (급여 유형별)
  if (result.salaryType === '시급') {
    result.basePay = Math.round(result.hourlyWage * totalWorkHours);
  } else if (result.salaryType === '월급' || result.salaryType === '연봉') {
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
  
  // 🆕 Phase 5: 특별 근무 수당 (근무 모집 인센티브)
  if (totalIncentiveAmount > 0) {
    result.incentivePay = Math.round(totalIncentiveAmount);
    console.log(`💰 특별 근무 수당: ${result.incentivePay.toLocaleString()}원`);
  }
  
  // 주휴수당 - 계약서 기준 주 15시간 이상 근무 시 적용
  // 법원 판결 기준: 주휴수당 = 시급 × (주 근무시간 ÷ 5)
  const contractWeeklyHours = parseFloat(String(contract.weeklyHours || 0));
  const isWeeklyHolidayEligible = contractWeeklyHours >= 15 || contract.allowances?.weeklyHoliday;
  
  if (salaryType === '시급' && isWeeklyHolidayEligible) {
    let weeklyHolidayHours = 0;
    Object.entries(weeklyWorkHours).forEach(([weekKey, weekHours]) => {
      // 결근이 있는 주는 주휴수당 제외
      if (weeklyAbsences[weekKey]) {
        console.log(`❌ ${weekKey}: 결근으로 인해 주휴수당 제외 (근무시간: ${weekHours.toFixed(2)}시간)`);
        return;
      }
      
      if (weekHours >= 15) {
        // 법원 판결 기준: 주휴수당 시간 = 주 근무시간 ÷ 5
        const weekHolidayHours = weekHours / 5;
        weeklyHolidayHours += weekHolidayHours;
        console.log(`✅ ${weekKey}: 주휴수당 적용 (근무시간: ${weekHours.toFixed(2)}시간, 주휴수당 시간: ${weekHolidayHours.toFixed(2)}시간, 금액: ${Math.round(result.hourlyWage * weekHolidayHours).toLocaleString()}원)`);
      } else {
        console.log(`⚠️ ${weekKey}: 15시간 미만으로 주휴수당 제외 (근무시간: ${weekHours.toFixed(2)}시간)`);
      }
    });
    result.weeklyHolidayPay = Math.round(result.hourlyWage * weeklyHolidayHours);
    console.log(`💰 총 주휴수당: ${weeklyHolidayHours.toFixed(2)}시간 × ${result.hourlyWage.toLocaleString()}원 = ${result.weeklyHolidayPay.toLocaleString()}원`);
  } else {
    console.log(`⚠️ 주휴수당 미적용 - 사유: ${salaryType !== '시급' ? '시급제 아님' : `주 ${contractWeeklyHours}시간 (15시간 미만)`}`);
  }
  
  // 퇴직금 계산 (1년 이상 근속, 주 15시간 이상 근무)
  try {
    if (contract.startDate) {
      const contractStartDate = new Date(contract.startDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - contractStartDate.getTime()) / (1000 * 60 * 60 * 24));
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
    }
  } catch (error) {
    console.error('⚠️ 퇴직금 계산 실패:', error);
  }
  
  // 총 수당 (🆕 Phase 5: incentivePay 포함)
  result.totalAllowances = result.overtimePay + result.nightPay + result.holidayPay + result.weeklyHolidayPay + result.incentivePay + result.severancePay;
  
  // 총 지급액 (공제 전)
  result.totalPay = result.basePay + result.totalAllowances;
  
  // 4대보험 공제 계산 (계약서 개별 체크박스 기준)
  const insurance = contract.insurance || {};
  
  // 국민연금 (4.5% 근로자 부담)
  if (insurance.pension) {
    result.nationalPension = Math.round(result.totalPay * 0.045);
  }
  
  // 건강보험 (3.545% 근로자 부담)
  if (insurance.health) {
    result.healthInsurance = Math.round(result.totalPay * 0.03545);
    // 장기요양보험 (건강보험의 12.95%의 50% 근로자 부담)
    result.longTermCare = Math.round(result.healthInsurance * 0.1295 * 0.5);
  }
  
  // 고용보험 (0.9% 근로자 부담)
  if (insurance.employment) {
    result.employmentInsurance = Math.round(result.totalPay * 0.009);
  }
  
  // 소득세 (3.3% 근로자 전액 부담) - 어떤 보험이든 하나라도 있으면 적용
  if (insurance.pension || insurance.health || insurance.employment || insurance.workComp) {
    result.incomeTax = Math.round(result.totalPay * 0.033);
  }
  
  result.totalDeductions = result.nationalPension + result.healthInsurance + 
                           result.longTermCare + result.employmentInsurance + result.incomeTax;
  
  // 실지급액
  result.netPay = result.totalPay - result.totalDeductions;
  
  // 계약서 기준 정보 추가 (렌더링 시 조건부 표시용)
  result.contractInfo = {
    weeklyHours: contractWeeklyHours,
    isWeeklyHolidayEligible: isWeeklyHolidayEligible,
    has4Insurance: !!(insurance.pension || insurance.health || insurance.employment || insurance.workComp),
    hasPension: insurance.pension || false,
    hasHealthInsurance: insurance.health || false,
    hasEmploymentInsurance: insurance.employment || false,
    hasWorkCompInsurance: insurance.workComp || false
  };
  
  console.log('✅ 급여 계산 완료:', result);
  return result;
}
