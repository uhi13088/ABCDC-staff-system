/**
 * 스케줄 뷰어 모듈 (간트차트 전용)
 * 관리자와 직원 페이지에서 공통으로 사용하는 스케줄 렌더링 로직
 */

/**
 * 간트차트형 스케줄 렌더링
 * @param {Object} scheduleData - 스케줄 데이터 { employees: Array, type: String }
 * @param {Date} weekDate - 주차 기준 날짜
 * @param {Object} options - 렌더링 옵션
 *   - isAdmin: 관리자 모드 여부 (급여 정보 표시)
 *   - showOnlyMySchedule: 직원 모드에서 내 근무만 보기 (기본 false)
 *   - currentUserId: 현재 사용자 ID (직원 모드 필터링용)
 * @returns {String} HTML 문자열
 */
window.renderScheduleGanttChart = function(scheduleData, weekDate, options = {}) {
  if (!scheduleData) {
    return '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">스케줄 데이터가 없습니다.</div>';
  }
  
  const {
    isAdmin = true,
    showOnlyMySchedule = false,
    currentUserId = null
  } = options;
  
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const monday = getScheduleMonday(weekDate);
  
  // 직원별 색상 정의 (구별하기 쉬운 대비가 강한 색상)
  const employeeColors = [
    '#FF6B6B', // 빨강
    '#4ECDC4', // 청록
    '#FFD93D', // 노랑
    '#6BCB77', // 연두
    '#9B59B6', // 보라
    '#FF8C42', // 주황
    '#3498DB', // 파랑
    '#E74C3C', // 진한 빨강
    '#1ABC9C', // 민트
    '#F39C12', // 금색
    '#E91E63', // 핑크
    '#00BCD4', // 하늘색
    '#8BC34A', // 라임
    '#FF5722', // 딥오렌지
    '#673AB7', // 딥퍼플
    '#009688', // 틸
    '#FFC107', // 앰버
    '#795548', // 브라운
    '#607D8B', // 블루그레이
    '#CDDC39'  // 라임옐로우
  ];
  
  const colorMap = {};
  if (scheduleData.employees) {
    scheduleData.employees.forEach((emp, index) => {
      colorMap[emp.name] = employeeColors[index % employeeColors.length];
    });
  }
  
  // 날짜 정보 생성
  const dateInfo = [];
  days.forEach((day, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    dateInfo.push({
      day: day,
      date: `${date.getMonth() + 1}/${date.getDate()}`
    });
  });
  
  // 각 요일별 근무자 목록 생성
  const dayWorkers = {};
  days.forEach(day => {
    dayWorkers[day] = [];
  });
  
  if (scheduleData.employees) {
    const isAttendanceMode = scheduleData.type === 'attendance';
    
    scheduleData.employees.forEach(emp => {
      // 직원 모드에서 "내 근무만 보기" 옵션이 활성화된 경우 필터링
      // emp.uid 또는 emp.userId 둘 다 체크 (호환성)
      const empId = emp.uid || emp.userId;
      if (!isAdmin && showOnlyMySchedule && currentUserId && empId !== currentUserId) {
        return; // 다른 직원은 건너뛰기
      }
      
      days.forEach(day => {
        const scheduleData = emp.schedules[day];
        
        if (isAttendanceMode) {
          // 출퇴근 기록 모드 (단일 객체)
          if (scheduleData && scheduleData.isWorkDay) {
            let barColor = colorMap[emp.name];
            const statusText = scheduleData.statusText || '정상';
            
            // 상태 텍스트에 따라 색상 변경
            if (statusText === '결근') {
              barColor = '#EF5350'; // 빨간색
            } else if (statusText === '지각' || statusText === '지각+조퇴') {
              barColor = '#FFA726'; // 주황색
            } else if (statusText === '조퇴') {
              barColor = '#FFB74D'; // 연한 주황색
            } else if (statusText === '근무중') {
              barColor = '#29B6F6'; // 하늘색
            } else {
              barColor = '#66BB6A'; // 초록색 (정상)
            }
            
            dayWorkers[day].push({
              name: emp.name,
              startTime: scheduleData.startTime || '-',
              endTime: scheduleData.endTime || '-',
              hours: scheduleData.hours,
              color: barColor,
              status: scheduleData.status || 'normal',
              statusText: statusText,
              scheduledStart: scheduleData.scheduledStart || '',
              scheduledEnd: scheduleData.scheduledEnd || '',
              isShiftReplacement: false
            });
          }
        } else {
          // 스케줄표 모드 (배열)
          const scheduleArray = scheduleData;
          
          // 배열이고 요소가 있으면 모두 처리
          if (scheduleArray && Array.isArray(scheduleArray) && scheduleArray.length > 0) {
            scheduleArray.forEach(schedule => {
              if (schedule.isWorkDay) {
                const barColor = colorMap[emp.name];
                
                dayWorkers[day].push({
                  name: emp.name,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  hours: schedule.hours,
                  color: barColor,
                  status: 'normal',
                  scheduledStart: '',
                  scheduledEnd: '',
                  isShiftReplacement: schedule.isShiftReplacement || false
                });
              }
            });
          }
        }
      });
    });
  }
  
  // 각 요일별 최대 근무자 수 계산
  let maxWorkers = 1;
  days.forEach(day => {
    if (dayWorkers[day].length > maxWorkers) {
      maxWorkers = dayWorkers[day].length;
    }
  });
  
  // 시간 범위 (06:00 ~ 01:00, 1시간 단위)
  const startHour = 6;
  const endHour = 25; // 다음날 01:00
  const totalHours = endHour - startHour;
  const rowHeight = 35; // 1시간당 높이 (px)
  const totalHeight = totalHours * rowHeight;
  
  // HTML 구조 생성
  let html = `
    <div style="display: flex; gap: var(--spacing-md); width: 100%; max-width: 1400px; margin: 0 auto;">
      <!-- 메인 간트차트 -->
      <div style="flex: 1; display: flex; border: 1px solid var(--border-color); background: white;">
        <!-- 시간 레이블 열 -->
        <div style="width: 60px; border-right: 1px solid var(--border-color); background: var(--bg-light);">
          <div style="height: 45px; display: flex; align-items: center; justify-content: center; border-bottom: 2px solid var(--border-color); font-weight: 700; font-size: 12px;">
            시간
          </div>
          <div style="position: relative; height: ${totalHeight}px;">
  `;
  
  // 시간 눈금
  for (let h = startHour; h <= endHour; h++) {
    const displayHour = h > 24 ? h - 24 : h;
    const timeLabel = `${displayHour.toString().padStart(2, '0')}:00`;
    const topPos = (h - startHour) * rowHeight;
    
    html += `
      <div style="position: absolute; top: ${topPos}px; width: 100%; height: ${rowHeight}px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 500;">
        ${timeLabel}
      </div>
    `;
  }
  
  html += `
          </div>
        </div>
        
        <!-- 요일별 간트차트 열들 -->
  `;
  
  // 각 요일별 칼럼
  dateInfo.forEach((info, dayIndex) => {
    const day = days[dayIndex];
    const workers = dayWorkers[day];
    
    html += `
      <div style="flex: 1; ${dayIndex < days.length - 1 ? 'border-right: 1px solid var(--border-color);' : ''}">
        <!-- 요일 헤더 -->
        <div style="height: 45px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 2px solid var(--border-color); background: var(--bg-light); font-weight: 700; font-size: 12px;">
          <div>${info.day}</div>
          <div style="font-size: 10px; color: var(--text-secondary); font-weight: 400;">${info.date}</div>
        </div>
        
        <!-- 간트차트 영역 -->
        <div style="position: relative; height: ${totalHeight}px; background: white;">
          <!-- 시간 그리드 배경 -->
    `;
    
    // 시간 그리드 라인
    for (let h = startHour; h <= endHour; h++) {
      const topPos = (h - startHour) * rowHeight;
      html += `
        <div style="position: absolute; top: ${topPos}px; width: 100%; height: ${rowHeight}px; border-bottom: 1px solid #f0f0f0;"></div>
      `;
    }
    
    // 각 직원의 막대 (동적 굵기, 직원 수에 따라 자동 조절)
    if (workers.length > 0) {
      const maxBarWidth = 18; // 최대 막대 굵기 (%)
      const minBarWidth = 8;  // 최소 막대 굵기 (%)
      const minSpacing = 3;   // 최소 간격 (%)
      
      // 직원 수에 따라 막대 굵기 동적 계산
      let barWidth = maxBarWidth;
      if (workers.length > 3) {
        const totalWithSpacing = workers.length * maxBarWidth + (workers.length + 1) * minSpacing;
        if (totalWithSpacing > 100) {
          barWidth = (100 - (workers.length + 1) * minSpacing) / workers.length;
          barWidth = Math.max(barWidth, minBarWidth);
        }
      }
      
      const totalBarsWidth = workers.length * barWidth;
      const availableSpace = 100;
      const spacing = workers.length > 1 ? (availableSpace - totalBarsWidth) / (workers.length + 1) : (availableSpace - barWidth) / 2;
      
      workers.forEach((worker, workerIndex) => {
        // 시작/종료 시간을 픽셀 위치로 변환
        const [startH, startM] = worker.startTime.split(':').map(Number);
        const [endH, endM] = worker.endTime.split(':').map(Number);
        
        // 디버깅: 시간 값 확인
        console.log(`⏰ ${worker.name}: ${worker.startTime}-${worker.endTime}, startH=${startH}, startM=${startM}, endH=${endH}, endM=${endM}`);
        
        const startMinutes = (startH - startHour) * 60 + startM;
        const endMinutes = (endH - startHour) * 60 + endM;
        
        console.log(`   → startMinutes=${startMinutes}, endMinutes=${endMinutes}, topPos will be ${(startMinutes / 60) * rowHeight}px`);
        
        const topPos = (startMinutes / 60) * rowHeight;
        const height = ((endMinutes - startMinutes) / 60) * rowHeight;
        const leftPos = spacing * (workerIndex + 1) + barWidth * workerIndex;
        
        // 교대근무 표시 스타일 (직원 페이지에서도 표시)
        const shiftStyle = worker.isShiftReplacement 
          ? `border: 3px solid #FFC107; background: repeating-linear-gradient(45deg, ${worker.color}, ${worker.color} 10px, rgba(255,193,7,0.2) 10px, rgba(255,193,7,0.2) 20px);`
          : '';
        
        const shiftIcon = worker.isShiftReplacement ? '🔄' : '';
        
        html += `
          <div style="
            position: absolute;
            left: ${leftPos}%;
            top: ${topPos}px;
            width: ${barWidth}%;
            height: ${height}px;
            background: ${worker.color};
            opacity: 0.9;
            box-sizing: border-box;
            transition: all 0.2s;
            border-radius: 2px;
            ${shiftStyle}
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          " 
          onmouseover="this.style.opacity='1'; this.style.zIndex='5'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.2)';" 
          onmouseout="this.style.opacity='0.9'; this.style.zIndex='1'; this.style.boxShadow='none';"
          title="${shiftIcon}${worker.name}: ${worker.startTime}-${worker.endTime} (${worker.hours}h)">
            ${shiftIcon}
          </div>
        `;
      });
    }
    
    html += `
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
  `;
  
  // 오른쪽 사이드바 (관리자: 주간 요약, 직원: 색인+근무자 목록)
  html += `
    <!-- 오른쪽 사이드바 -->
    <div style="min-width: 220px; max-width: 220px; background: white; border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 16px; height: fit-content;">
      <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; border-bottom: 2px solid var(--primary-color); padding-bottom: 8px;">${isAdmin ? '📊 주간 요약' : '📋 근무자 정보'}</h4>
      
      <!-- 범례 (관리자/직원 공통) -->
      <div style="margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
        <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px; color: #495057;">📌 색인</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 20px; background: #4ECDC4; border-radius: 2px;"></div>
            <span style="font-size: 11px; color: #495057;">기본 근무</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 20px; background: repeating-linear-gradient(45deg, #4ECDC4, #4ECDC4 5px, rgba(255,193,7,0.3) 5px, rgba(255,193,7,0.3) 10px); border: 2px solid #FFC107; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 10px;">🔄</div>
            <span style="font-size: 11px; color: #495057;">교대근무</span>
          </div>
        </div>
      </div>
      
      <!-- 근무자 목록 (관리자/직원 공통) -->
      <div style="margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
        <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px; color: #495057;">👥 근무자</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
  `;
  
  // 근무자 목록 표시
  if (scheduleData.employees) {
    scheduleData.employees.forEach(emp => {
      const empId = emp.uid || emp.userId;
      // 직원 모드에서 내 근무만 보기일 때 필터링
      if (!isAdmin && showOnlyMySchedule && currentUserId && empId !== currentUserId) {
        return;
      }
      
      const color = colorMap[emp.name];
      html += `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 16px; height: 16px; background: ${color}; border-radius: 2px;"></div>
          <span style="font-size: 11px; color: #495057;">${emp.name}</span>
        </div>
      `;
    });
  }
  
  html += `
        </div>
      </div>
  `;
  
  // 관리자 모드에서만 급여 정보 표시
  if (isAdmin) {
    html += `
      <!-- 급여 정보 (관리자만) -->
    `;
    
    // 직원별 주간 요약 (관리자 모드만)
    if (scheduleData.employees) {
      scheduleData.employees.forEach(emp => {
        let totalHours = 0;
        let workDays = 0;
        days.forEach(day => {
          const scheduleArray = emp.schedules[day]; // 배열임
          
          // 배열의 모든 스케줄 시간 합산
          if (scheduleArray && Array.isArray(scheduleArray) && scheduleArray.length > 0) {
            scheduleArray.forEach(schedule => {
              if (schedule.isWorkDay) {
                totalHours += parseFloat(schedule.hours);
              }
            });
            // 해당 날짜에 근무가 하나라도 있으면 근무일 수 증가
            if (scheduleArray.some(s => s.isWorkDay)) {
              workDays++;
            }
          }
        });
        
        const color = colorMap[emp.name];
        
        // 급여 정보 (시급/월급/연봉)
        const salaryType = emp.salaryType || 'hourly';
        const salaryAmount = emp.salaryAmount || 0;
        let salaryText = '';
        if (salaryType === 'hourly' || salaryType === '시급') {
          salaryText = `시급: ₩${salaryAmount.toLocaleString()}`;
        } else if (salaryType === 'monthly' || salaryType === '월급') {
          salaryText = `월급: ₩${salaryAmount.toLocaleString()}`;
        } else if (salaryType === 'annual' || salaryType === '연봉') {
          salaryText = `연봉: ₩${salaryAmount.toLocaleString()}`;
        }
        
        // 주급 계산 (salary-calculator.js의 calculateWeeklySalary 함수 사용)
        const salaryResult = calculateWeeklySalary(totalHours, salaryType, salaryAmount, true);
        const weeklySalary = salaryResult.weeklySalary;
        const monthlyEstimate = salaryResult.monthlyEstimate;
        
        html += `
          <div style="margin-bottom: 12px; padding: 8px; border-radius: 6px; background: var(--bg-light);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <div style="width: 14px; height: 14px; background: ${color}; border-radius: 3px;"></div>
              <span style="font-weight: 600; font-size: 12px;">${emp.name}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-left: 22px;">
              ${salaryText ? `<div>${salaryText}</div>` : ''}
              <div>⏱️ ${totalHours.toFixed(1)}시간</div>
              <div style="color: var(--primary-color); font-weight: 600;">💰 ₩${Math.round(weeklySalary).toLocaleString()} (주급)</div>
              <div style="font-size: 10px; color: var(--text-secondary);">📅 월 예상: ₩${Math.round(monthlyEstimate).toLocaleString()}</div>
            </div>
          </div>
        `;
      });
    }
  }
  
  // 사이드바 닫기
  html += `
    </div>
  `;
  
  html += `
    </div>
  `;
  
  return html;
};

/**
 * 주차의 월요일을 구하는 헬퍼 함수
 * @param {Date} date - 기준 날짜
 * @returns {Date} 월요일 날짜
 */
function getScheduleMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
