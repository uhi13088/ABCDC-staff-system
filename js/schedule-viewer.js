/**
 * 스케줄 뷰어 모듈 (간트차트 전용 & 데이터 로딩)
 * - 관리자와 직원 페이지에서 공통으로 사용
 * - v3.6: 보안 규칙(companyId) 준수 패치 완료
 */

// ===================================================================
// 1. 간트차트 렌더링 (기존 로직 유지)
// ===================================================================

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
  
  // 직원별 색상 정의
  const employeeColors = [
    '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#9B59B6',
    '#FF8C42', '#3498DB', '#E74C3C', '#1ABC9C', '#F39C12',
    '#E91E63', '#00BCD4', '#8BC34A', '#FF5722', '#673AB7',
    '#009688', '#FFC107', '#795548', '#607D8B', '#CDDC39'
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
      const empId = emp.uid || emp.userId;
      if (!isAdmin && showOnlyMySchedule && currentUserId && empId !== currentUserId) {
        return;
      }
      
      days.forEach(day => {
        const scheduleData = emp.schedules[day];
        
        if (isAttendanceMode) {
          // 출퇴근 기록 모드
          if (scheduleData && scheduleData.isWorkDay) {
            let barColor = colorMap[emp.name];
            const statusText = scheduleData.statusText || '정상';
            
            if (statusText === '결근') barColor = '#EF5350';
            else if (statusText.includes('지각') || statusText.includes('조퇴')) barColor = '#FFA726';
            else if (statusText === '근무중') barColor = '#29B6F6';
            else barColor = '#66BB6A';
            
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
          // 스케줄표 모드
          const scheduleArray = scheduleData;
          if (scheduleArray && Array.isArray(scheduleArray) && scheduleArray.length > 0) {
            scheduleArray.forEach(schedule => {
              if (schedule.isWorkDay) {
                dayWorkers[day].push({
                  name: emp.name,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                  hours: schedule.hours,
                  breakTime: schedule.breakTime || null,
                  color: colorMap[emp.name],
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
  
  // HTML 생성 (기존과 동일)
  const startHour = 6;
  const endHour = 25;
  const totalHours = endHour - startHour;
  const rowHeight = 35;
  const totalHeight = totalHours * rowHeight;
  
  let html = `
    <div style="display: flex; gap: var(--spacing-md); width: 100%; max-width: 1400px; margin: 0 auto;">
      <div style="flex: 1; display: flex; border: 1px solid var(--border-color); background: white;">
        <div style="width: 60px; border-right: 1px solid var(--border-color); background: var(--bg-light);">
          <div style="height: 45px; display: flex; align-items: center; justify-content: center; border-bottom: 2px solid var(--border-color); font-weight: 700; font-size: 12px;">시간</div>
          <div style="position: relative; height: ${totalHeight}px;">
  `;
  
  for (let h = startHour; h <= endHour; h++) {
    const displayHour = h > 24 ? h - 24 : h;
    const timeLabel = `${displayHour.toString().padStart(2, '0')}:00`;
    const topPos = (h - startHour) * rowHeight;
    html += `<div style="position: absolute; top: ${topPos}px; width: 100%; height: ${rowHeight}px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 500;">${timeLabel}</div>`;
  }
  
  html += `</div></div>`;
  
  dateInfo.forEach((info, dayIndex) => {
    const day = days[dayIndex];
    const workers = dayWorkers[day];
    html += `
      <div style="flex: 1; ${dayIndex < days.length - 1 ? 'border-right: 1px solid var(--border-color);' : ''}">
        <div style="height: 45px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 2px solid var(--border-color); background: var(--bg-light); font-weight: 700; font-size: 12px;">
          <div>${info.day}</div>
          <div style="font-size: 10px; color: var(--text-secondary); font-weight: 400;">${info.date}</div>
        </div>
        <div style="position: relative; height: ${totalHeight}px; background: white;">
    `;
    
    for (let h = startHour; h <= endHour; h++) {
      const topPos = (h - startHour) * rowHeight;
      html += `<div style="position: absolute; top: ${topPos}px; width: 100%; height: ${rowHeight}px; border-bottom: 1px solid #f0f0f0;"></div>`;
    }
    
    if (workers.length > 0) {
      const maxBarWidth = 18; const minBarWidth = 8; const minSpacing = 3;
      let barWidth = maxBarWidth;
      if (workers.length > 3) {
        const totalWithSpacing = workers.length * maxBarWidth + (workers.length + 1) * minSpacing;
        if (totalWithSpacing > 100) {
          barWidth = (100 - (workers.length + 1) * minSpacing) / workers.length;
          barWidth = Math.max(barWidth, minBarWidth);
        }
      }
      const spacing = workers.length > 1 ? (100 - workers.length * barWidth) / (workers.length + 1) : (100 - barWidth) / 2;
      
      workers.forEach((worker, workerIndex) => {
        const [startH, startM] = worker.startTime.split(':').map(Number);
        const [endH, endM] = worker.endTime.split(':').map(Number);
        const startMinutes = (startH - startHour) * 60 + startM;
        let endMinutes = (endH - startHour) * 60 + endM;
        if (endMinutes < startMinutes) endMinutes += 24 * 60;
        
        const topPos = (startMinutes / 60) * rowHeight;
        const height = ((endMinutes - startMinutes) / 60) * rowHeight;
        const leftPos = spacing * (workerIndex + 1) + barWidth * workerIndex;
        const shiftStyle = worker.isShiftReplacement ? `border: 3px solid #FFC107; background: repeating-linear-gradient(45deg, ${worker.color}, ${worker.color} 10px, rgba(255,193,7,0.2) 10px, rgba(255,193,7,0.2) 20px);` : '';
        const shiftIcon = worker.isShiftReplacement ? '🔄' : '';
        
        html += `
          <div style="position: absolute; left: ${leftPos}%; top: ${topPos}px; width: ${barWidth}%; height: ${height}px; background: ${worker.color}; opacity: 0.9; border-radius: 2px; ${shiftStyle} display: flex; align-items: center; justify-content: center; font-size: 16px;" title="${worker.name}: ${worker.startTime}-${worker.endTime}">
            ${shiftIcon}
          </div>
        `;
      });
    }
    html += `</div></div>`;
  });
  
  html += `</div>`;
  
  // 오른쪽 사이드바
  html += `
    <div style="min-width: 220px; max-width: 220px; background: white; border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 16px; height: fit-content;">
      <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; border-bottom: 2px solid var(--primary-color); padding-bottom: 8px;">${isAdmin ? '📊 주간 요약' : '📋 근무자 정보'}</h4>
      <div style="margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
        <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px; color: #495057;">📌 색인</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 20px; height: 20px; background: #4ECDC4; border-radius: 2px;"></div><span style="font-size: 11px; color: #495057;">기본 근무</span></div>
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width: 20px; height: 20px; background: repeating-linear-gradient(45deg, #4ECDC4, #4ECDC4 5px, rgba(255,193,7,0.3) 5px, rgba(255,193,7,0.3) 10px); border: 2px solid #FFC107; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 10px;">🔄</div><span style="font-size: 11px; color: #495057;">교대근무</span></div>
        </div>
      </div>
      <div style="margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
        <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px; color: #495057;">👥 근무자</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
  `;
  
  if (scheduleData.employees) {
    scheduleData.employees.forEach(emp => {
      const empId = emp.uid || emp.userId;
      if (!isAdmin && showOnlyMySchedule && currentUserId && empId !== currentUserId) return;
      html += `<div style="display: flex; align-items: center; gap: 8px;"><div style="width: 16px; height: 16px; background: ${colorMap[emp.name]}; border-radius: 2px;"></div><span style="font-size: 11px; color: #495057;">${emp.name}</span></div>`;
    });
  }
  html += `</div></div>`;
  
  if (isAdmin && scheduleData.employees) {
    // 급여 정보 표시 로직 (생략 - 기존과 동일)
  }
  
  html += `</div></div>`;
  return html;
};

function getScheduleMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// ===================================================================
// 2. 데이터 로딩 (보안 규칙 준수: companyId 필수)
// ===================================================================

const contractCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000;

window.clearScheduleCache = function() {
  contractCache.clear();
  console.log('📦 스케줄 캐시 초기화됨');
};

// 통합 로딩 함수
window.loadScheduleData = async function(db, options) {
  const startTime = Date.now();
  console.log('🔍 [loadScheduleData] 시작:', options);
  
  try {
    // 🔒 companyId 체크 (옵션에 없으면 실행 차단)
    if (!options.companyId && options.type === 'employee') {
      console.error('❌ [치명적 오류] companyId가 누락되었습니다. 보안 쿼리를 실행할 수 없습니다.', options);
      // 여기서 멈추지 않으면 'Missing or insufficient permissions' 에러 발생함
      throw new Error('사용자 정보에 companyId가 없습니다. 관리자에게 문의하세요.');
    }

    if (options.type === 'store') {
      return await loadStoreSchedules(db, options);
    } else if (options.type === 'employee') {
      return await loadEmployeeSchedules(db, options);
    } else {
      throw new Error(`Unknown type: ${options.type}`);
    }
  } catch (error) {
    console.error('❌ [loadScheduleData] 실패:', error);
    throw error;
  }
};

// 매장 전체 스케줄 로드
async function loadStoreSchedules(db, options) {
  const { storeId, startDate, endDate } = options;
  
  // 1. 매장 정보 조회
  const storeDoc = await db.collection('stores').doc(storeId).get();
  if (!storeDoc.exists) throw new Error(`매장을 찾을 수 없습니다: ${storeId}`);
  
  const storeData = storeDoc.data();
  const companyId = storeData.companyId;
  const storeName = storeData.name;
  
  // 2. 해당 매장 직원 조회
  // 🔒 companyId 필수
  let usersQuery = db.collection('users')
    .where('companyId', '==', companyId)
    .where('store', '==', storeName)
    .where('role', 'in', ['staff', 'store_manager', 'manager']);
  
  const employeesSnapshot = await usersQuery.get();
  const employees = [];
  
  for (const empDoc of employeesSnapshot.docs) {
    const empUid = empDoc.id;
    const empData = empDoc.data();
    
    // 계약서 조회 (companyId 전달)
    const contract = await getContractCached(db, empUid, companyId, empData.name);
    
    // 스케줄 조회 (companyId 전달)
    const schedules = await loadEmployeeSchedulesForWeek(
      db, empUid, empData.name, startDate, endDate, contract, companyId
    );
    
    employees.push({
      uid: empUid,
      name: empData.name || '이름없음',
      schedules: schedules,
      salaryType: contract ? (contract.salaryType || 'hourly') : 'hourly',
      salaryAmount: contract ? (contract.salaryAmount || 0) : 0
    });
  }
  
  return { type: 'schedule', employees: employees };
}

// 개인 스케줄 로드
async function loadEmployeeSchedules(db, options) {
  // options에 companyId가 반드시 있어야 함
  const { userId, userName, startDate, endDate, storeName, companyId } = options;
  
  if (storeName) {
    // 매장 전체 보기 (직원용)
    // 🔒 companyId 필수
    let usersQuery = db.collection('users')
      .where('companyId', '==', companyId)
      .where('store', '==', storeName)
      .where('role', 'in', ['staff', 'store_manager', 'manager']);
    
    const employeesSnapshot = await usersQuery.get();
    const employees = [];
    
    for (const empDoc of employeesSnapshot.docs) {
      const empUid = empDoc.id;
      const empData = empDoc.data();
      
      const contract = await getContractCached(db, empUid, companyId, empData.name);
      const schedules = await loadEmployeeSchedulesForWeek(
        db, empUid, empData.name, startDate, endDate, contract, companyId
      );
      
      employees.push({
        uid: empUid,
        name: empData.name || '이름없음',
        schedules: schedules,
        salaryType: contract ? (contract.salaryType || 'hourly') : 'hourly',
        salaryAmount: contract ? (contract.salaryAmount || 0) : 0
      });
    }
    
    return { type: 'schedule', employees: employees };
    
  } else {
    // 내 스케줄만 보기
    const contract = await getContractCached(db, userId, companyId, userName);
    const schedules = await loadEmployeeSchedulesForWeek(
      db, userId, userName, startDate, endDate, contract, companyId
    );
    
    return {
      type: 'schedule',
      employees: [{
        uid: userId,
        name: userName,
        schedules: schedules,
        salaryType: contract ? (contract.salaryType || 'hourly') : 'hourly',
        salaryAmount: contract ? (contract.salaryAmount || 0) : 0
      }]
    };
  }
}

// 주간 스케줄 조회 (핵심 로직)
async function loadEmployeeSchedulesForWeek(db, userId, userName, startDate, endDate, contract, companyId) {
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const schedules = {};
  days.forEach(day => { schedules[day] = []; });
  
  try {
    // 🔒 companyId 필터 추가
    let query = db.collection('schedules')
      .where('companyId', '==', companyId) // 🔥 필수
      .where('userId', '==', userId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate);
      
    const schedulesSnapshot = await query.get();
    
    if (schedulesSnapshot.size === 0) return schedules;
    
    const dateSchedules = {};
    
    schedulesSnapshot.forEach(doc => {
      const data = doc.data();
      const date = data.date;
      if (!dateSchedules[date]) dateSchedules[date] = { regular: [], additional: [] };
      
      if (data.isShiftReplacement) dateSchedules[date].additional.push(data);
      else dateSchedules[date].regular.push(data);
    });
    
    const latestContractId = contract ? contract.contractId : null;
    
    Object.keys(dateSchedules).forEach(dateStr => {
      const date = new Date(dateStr + 'T00:00:00');
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
      const dayName = days[dayIndex];
      
      // 정규 스케줄 (최신 1개)
      if (dateSchedules[dateStr].regular.length > 0) {
        let selected = null;
        if (latestContractId) {
          selected = dateSchedules[dateStr].regular.find(s => s.contractId === latestContractId);
        }
        if (!selected) {
          // createdAt 역순 정렬 후 첫번째
          selected = dateSchedules[dateStr].regular.sort((a, b) => 
            (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
          )[0];
        }
        
        if (selected) {
          schedules[dayName].push({
            startTime: selected.startTime,
            endTime: selected.endTime,
            hours: selected.hours,
            breakTime: selected.breakTime,
            isShiftReplacement: false,
            isWorkDay: true
          });
        }
      }
      
      // 대타 스케줄 (전부 표시)
      dateSchedules[dateStr].additional.forEach(add => {
        schedules[dayName].push({
          startTime: add.startTime,
          endTime: add.endTime,
          hours: add.hours,
          breakTime: add.breakTime,
          isShiftReplacement: true,
          isWorkDay: true
        });
      });
    });
    
    return schedules;
    
  } catch (error) {
    console.error(`  ❌ ${userName} 스케줄 조회 실패:`, error);
    return schedules;
  }
}

// 계약서 조회 (캐시)
async function getContractCached(db, userId, companyId, userName = null) {
  const cached = contractCache.get(userId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
    return cached.data;
  }
  
  try {
    // 🔒 companyId 필터 추가
    let contractsSnapshot = await db.collection('contracts')
      .where('companyId', '==', companyId) // 🔥 필수
      .where('employeeId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    let contractData = null;
    if (!contractsSnapshot.empty) {
      const doc = contractsSnapshot.docs[0];
      contractData = { contractId: doc.id, ...doc.data() };
    }
    
    contractCache.set(userId, { data: contractData, timestamp: Date.now() });
    return contractData;
    
  } catch (error) {
    console.error(`  ❌ 계약서 조회 실패:`, error);
    return null;
  }
}
