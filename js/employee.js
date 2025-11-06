// ===================================================================
// 맛남살롱 직원용 시스템 (Firestore 연동)
// 작성자: Employee Portal
// 기능: 출퇴근, 급여조회, 계약서 확인, 공지사항
// ===================================================================

// ===================================================================
// 전역 변수
// ===================================================================

let currentUser = null; // 현재 로그인한 직원 정보
// auth, db는 firebase-config.js에서 전역으로 선언됨

// ===================================================================
// 초기화 및 페이지 로드
// ===================================================================

document.addEventListener('DOMContentLoaded', function() {
  debugLog('직원용 페이지 로드');
  
  // Firebase 초기화 확인
  if (typeof firebase === 'undefined') {
    console.error('❌ Firebase SDK가 로드되지 않았습니다.');
    alert('시스템 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    return;
  }
  
  // Firebase 인스턴스는 firebase-config.js에서 이미 초기화됨
  
  // 현재 월 기본값 설정
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('filterMonth').value = currentMonth;
  document.getElementById('salaryFilterMonth').value = currentMonth;
  
  // 로그인 상태 확인
  checkLoginStatus();
  
  // 드롭다운 초기화
  initializeDateDropdowns();
});

// ===================================================================
// 로그인 / 로그아웃 관리
// ===================================================================

/**
 * 로그인 상태 확인
 * sessionStorage에서 사용자 정보를 읽어서 자동 로그인
 */
async function checkLoginStatus() {
  const authenticated = sessionStorage.getItem('employee_authenticated');
  const name = sessionStorage.getItem('employee_name');
  const uid = sessionStorage.getItem('employee_uid');
  
  if (authenticated !== 'true' || !name || !uid) {
    alert('⚠️ 로그인이 필요합니다.');
    window.location.href = 'employee-login.html';
    return;
  }
  
  // 사용자 정보 로드 (비동기 완료까지 대기)
  await loadUserInfo(uid, name);
}

/**
 * Firestore에서 사용자 정보 로드
 * @param {string} uid - Firebase UID
 * @param {string} name - 직원 이름
 */
async function loadUserInfo(uid, name) {
  console.log('🔍 loadUserInfo 시작:', { uid, name });
  
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    
    console.log('📄 Firestore 조회 결과:', { exists: userDoc.exists });
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      
      // 승인 상태 확인
      const status = userData.status || 'pending';
      
      if (status === 'pending') {
        alert('⏳ 관리자의 승인을 기다리고 있습니다.\n승인 후 로그인이 가능합니다.');
        logout();
        return;
      }
      
      if (status === 'rejected') {
        alert('❌ 가입이 거부되었습니다.\n관리자에게 문의하세요.');
        logout();
        return;
      }
      
      // status === 'approved'인 경우만 진행
      
      currentUser = {
        uid: uid,
        ...userData
      };
      console.log('✅ currentUser 설정 완료 (Firestore):', currentUser);
    } else {
      // Firestore에 사용자 정보가 없는 경우 (관리자가 삭제함)
      console.log('⚠️ Firestore에 사용자 정보가 없습니다. Firebase Auth 계정 삭제 시도...');
      
      try {
        // 현재 로그인된 사용자 가져오기
        const currentAuthUser = firebase.auth().currentUser;
        if (currentAuthUser && currentAuthUser.uid === uid) {
          // Firebase Authentication 계정 삭제
          await currentAuthUser.delete();
          console.log('✅ Firebase Auth 계정 자동 삭제 완료');
          alert('❌ 관리자에 의해 계정이 삭제되었습니다.\nFirebase 인증 계정도 자동으로 삭제되었습니다.');
        }
      } catch (deleteError) {
        console.error('❌ Firebase Auth 계정 삭제 실패:', deleteError);
        alert('❌ 관리자에 의해 계정이 삭제되었습니다.');
      }
      
      logout();
      return;
    }
    
    // 기존 else 블록 제거 (Firestore 없으면 위에서 처리)
    if (false) {
      // Firestore에 정보가 없으면 기본값 사용
      currentUser = {
        uid: uid,
        name: name,
        store: '매장 정보 없음',
        position: '직원',
        email: sessionStorage.getItem('employee_email') || ''
      };
      console.log('⚠️ currentUser 설정 완료 (기본값):', currentUser);
    }
    
    showMainScreen();
  } catch (error) {
    console.error('❌ 사용자 정보 로드 오류:', error);
    // 오류 발생 시에도 기본 정보로 진행
    currentUser = {
      uid: uid,
      name: name,
      store: '매장 정보 없음',
      position: '직원',
      email: sessionStorage.getItem('employee_email') || ''
    };
    console.log('⚠️ currentUser 설정 완료 (오류 후 기본값):', currentUser);
    showMainScreen();
  }
}

/**
 * 로그아웃 처리
 * Firebase 로그아웃 및 로그인 페이지로 이동
 */
async function handleLogout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    try {
      // Firebase 로그아웃
      if (auth) {
        await auth.signOut();
        console.log('✅ Firebase 로그아웃 성공');
      }
      
      // 세션 스토리지 정리
      sessionStorage.clear();
      currentUser = null;
      
      // 로그인 페이지로 이동
      window.location.href = 'employee-login.html';
    } catch (error) {
      console.error('❌ 로그아웃 오류:', error);
      // 에러가 나도 강제로 로그아웃 처리
      sessionStorage.clear();
      window.location.href = 'employee-login.html';
    }
  }
}

/**
 * 메인 화면 표시
 * 사용자 정보를 화면에 표시하고 모든 데이터 로드
 */
function showMainScreen() {
  if (!currentUser) {
    console.error('❌ currentUser is null in showMainScreen');
    return;
  }
  
  console.log('✅ showMainScreen 실행, currentUser:', currentUser.name);
  
  // 사용자 정보 표시
  document.getElementById('displayName').textContent = currentUser.name + '님';
  document.getElementById('displayStore').textContent = currentUser.store || '매장 정보 없음';
  
  // 데이터 로드
  updateCurrentStatus();
  loadNotices();
  loadAttendance();
  loadContracts();
  loadEmployeeDocuments();
}

// ===================================================================
// 탭 전환
// ===================================================================

/**
 * 탭 전환 (근무내역, 급여, 계약서)
 * @param {string} tabName - 탭 이름 ('attendance', 'salary', 'contract')
 */
function showTab(tabName) {
  // 모든 탭 비활성화
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // 모든 탭 컨텐츠 숨기기
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // 선택된 탭 활성화
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab${capitalize(tabName)}`).classList.add('active');
  
  // 탭별 데이터 로드
  if (tabName === 'attendance') {
    loadAttendance();
  } else if (tabName === 'salary') {
    loadSalary();
  } else if (tabName === 'approvals') {
    loadMyApprovals();
  } else if (tabName === 'contract') {
    loadContracts();
    loadEmployeeDocuments();
  }
}

// ===================================================================
// 출퇴근 관리 (Firestore 연동)
// ===================================================================

/**
 * 출근 처리
 */
function showClockIn() {
  if (confirm('지금 출근하시겠습니까?')) {
    recordAttendance('출근');
  }
}

/**
 * 퇴근 처리
 */
function showClockOut() {
  if (confirm('지금 퇴근하시겠습니까?')) {
    recordAttendance('퇴근');
  }
}

/**
 * 출퇴근 기록 저장 (Firestore)
 * @param {string} type - '출근' 또는 '퇴근'
 */
async function recordAttendance(type) {
  // currentUser 체크
  if (!currentUser) {
    console.error('❌ currentUser is null in recordAttendance');
    alert('❌ 로그인 정보가 없습니다. 페이지를 새로고침해주세요.');
    return;
  }
  
  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = formatTime(now);
    
    console.log('🕐 출퇴근 기록:', { type, uid: currentUser.uid, name: currentUser.name, dateStr, timeStr });
    
    // 오늘 기록 확인
    const todayDocRef = db.collection('attendance')
      .where('uid', '==', currentUser.uid)
      .where('date', '==', dateStr);
    
    const snapshot = await todayDocRef.get();
    
    if (type === '출근') {
      // 출근 처리
      if (!snapshot.empty) {
        const existingRecord = snapshot.docs[0].data();
        if (existingRecord.clockIn) {
          alert(`⚠️ 이미 출근 처리되었습니다.\n출근 시간: ${existingRecord.clockIn}`);
          return;
        }
      }
      
      // 출근 기록 생성/업데이트
      const recordData = {
        uid: currentUser.uid,
        name: currentUser.name,
        store: currentUser.store,
        date: dateStr,
        clockIn: timeStr,
        clockOut: null,
        workType: '정규근무',
        status: '정상',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      if (snapshot.empty) {
        await db.collection('attendance').add(recordData);
      } else {
        await snapshot.docs[0].ref.update({
          clockIn: timeStr,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      alert(`✅ 출근 처리되었습니다!\n\n시간: ${timeStr}\n날짜: ${dateStr}`);
      
    } else if (type === '퇴근') {
      // 퇴근 처리
      if (snapshot.empty) {
        alert('⚠️ 출근 기록이 없습니다.\n먼저 출근 처리를 해주세요.');
        return;
      }
      
      const todayRecord = snapshot.docs[0].data();
      
      if (!todayRecord.clockIn) {
        alert('⚠️ 출근 기록이 없습니다.\n먼저 출근 처리를 해주세요.');
        return;
      }
      
      if (todayRecord.clockOut) {
        alert(`⚠️ 이미 퇴근 처리되었습니다.\n퇴근 시간: ${todayRecord.clockOut}`);
        return;
      }
      
      // 퇴근 시간 업데이트
      await snapshot.docs[0].ref.update({
        clockOut: timeStr,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // 근무 시간 계산
      const workTime = calculateWorkTime(todayRecord.clockIn, timeStr);
      
      alert(`✅ 퇴근 처리되었습니다!\n\n시간: ${timeStr}\n근무 시간: ${workTime}\n\n수고하셨습니다! 😊`);
    }
    
    // 현재 상태 업데이트
    updateCurrentStatus();
    
    // 근무내역 새로고침
    if (document.getElementById('tabAttendance').classList.contains('active')) {
      loadAttendance();
    }
    
  } catch (error) {
    console.error('❌ 출퇴근 기록 오류:', error);
    alert('❌ 기록 중 오류가 발생했습니다.\n\n' + error.message);
  }
}

/**
 * 현재 상태 업데이트 (대시보드)
 * 오늘 출퇴근 상태를 Firestore에서 조회하여 표시
 */
async function updateCurrentStatus() {
  // currentUser 체크
  if (!currentUser) {
    console.error('❌ currentUser is null in updateCurrentStatus');
    return;
  }
  
  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    console.log('📊 현재 상태 업데이트:', { uid: currentUser.uid, dateStr });
    
    // Firestore에서 오늘 기록 확인
    const todayDocRef = db.collection('attendance')
      .where('uid', '==', currentUser.uid)
      .where('date', '==', dateStr);
    
    const snapshot = await todayDocRef.get();
    
    const statusValueEl = document.getElementById('statusValue');
    const statusTimeEl = document.getElementById('statusTime');
    
    if (!snapshot.empty) {
      const todayRecord = snapshot.docs[0].data();
      
      if (todayRecord.clockIn && !todayRecord.clockOut) {
        // 근무 중
        statusValueEl.textContent = '🟢 근무 중';
        statusTimeEl.textContent = `출근시간: ${todayRecord.clockIn}`;
      } else if (todayRecord.clockIn && todayRecord.clockOut) {
        // 퇴근 완료
        statusValueEl.textContent = '✅ 퇴근 완료';
        
        const workTime = calculateWorkTime(todayRecord.clockIn, todayRecord.clockOut);
        statusTimeEl.textContent = `퇴근시간: ${todayRecord.clockOut} | 근무: ${workTime}`;
      }
    } else {
      // 출근 전
      statusValueEl.textContent = '⏰ 출근 전';
      statusTimeEl.textContent = '좋은 하루 되세요!';
    }
  } catch (error) {
    console.error('❌ 상태 업데이트 오류:', error);
  }
}

// ===================================================================
// 근무내역 조회 (Firestore 연동)
// ===================================================================

/**
 * 근무내역 로드 및 표시
 * 선택한 월의 출퇴근 기록을 Firestore에서 조회
 */
async function loadAttendance() {
  debugLog('근무내역 조회');
  
  const tbody = document.getElementById('attendanceTableBody');
  
  // currentUser 체크
  if (!currentUser) {
    console.error('❌ currentUser is null in loadAttendance');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px; color: var(--danger-color);">❌ 로그인 정보가 없습니다. 페이지를 새로고침해주세요.</td></tr>';
    return;
  }
  
  const filterMonth = document.getElementById('filterMonth').value;
  
  if (!filterMonth) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px;">조회할 월을 선택하세요</td></tr>';
    return;
  }
  
  try {
    // Firestore에서 해당 월의 근무 기록 조회
    const startDate = filterMonth + '-01';
    const endDate = filterMonth + '-31';
    
    console.log('📊 근무내역 조회:', { uid: currentUser.uid, filterMonth });
    
    const snapshot = await db.collection('attendance')
      .where('uid', '==', currentUser.uid)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px;">📭 해당 월의 근무 기록이 없습니다.</td></tr>';
      return;
    }
    
    const records = snapshot.docs.map(doc => doc.data());
    
    tbody.innerHTML = records.map(record => {
      const statusClass = getStatusClass(record.status);
      const workTime = record.clockIn && record.clockOut ? 
        calculateWorkTime(record.clockIn, record.clockOut) : '-';
      
      return `
        <tr>
          <td>${record.date}</td>
          <td>${record.workType || '정규근무'}</td>
          <td>${record.clockIn || '-'}</td>
          <td>${record.clockOut || '-'}</td>
          <td>${workTime}</td>
          <td><span class="badge badge-${statusClass}">${record.status || '정상'}</span></td>
        </tr>
      `;
    }).join('');
    
  } catch (error) {
    console.error('❌ 근무내역 조회 오류:', error);
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 40px; color: var(--danger-color);">❌ 데이터를 불러오는 중 오류가 발생했습니다.</td></tr>';
  }
}

// ===================================================================
// 급여 조회 및 계산 (Firestore 연동)
// ===================================================================

/**
 * 급여 조회 및 계산
 * 선택한 월의 Firestore 근무 기록을 바탕으로 급여 자동 계산
 */
async function loadSalary() {
  debugLog('급여 조회');
  
  // currentUser 체크
  if (!currentUser) {
    console.error('❌ currentUser is null in loadSalary');
    document.getElementById('salaryContent').innerHTML = 
      '<div class="alert alert-danger">❌ 로그인 정보가 없습니다. 페이지를 새로고침해주세요.</div>';
    return;
  }
  
  const filterMonth = document.getElementById('salaryFilterMonth').value;
  
  if (!filterMonth) {
    document.getElementById('salaryContent').innerHTML = 
      '<div class="alert alert-info">📅 조회할 월을 선택하세요</div>';
    return;
  }
  
  try {
    // Firestore에서 해당 월의 완료된 근무 기록 조회
    const startDate = filterMonth + '-01';
    const endDate = filterMonth + '-31';
    
    console.log('💰 급여 조회:', { uid: currentUser.uid, filterMonth });
    
    const snapshot = await db.collection('attendance')
      .where('uid', '==', currentUser.uid)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();
    
    const records = snapshot.docs
      .map(doc => doc.data())
      .filter(r => r.clockIn); // 출근 기록만 있으면 포함 (퇴근 안 해도 현재 시간까지 계산)
    
    if (records.length === 0) {
      document.getElementById('salaryContent').innerHTML = 
        '<div class="alert alert-info">📭 해당 월의 근무 기록이 없습니다.<br><br>출근 기록이 있어야 급여가 계산됩니다.</div>';
      return;
    }
    
    // 퇴근 기록 없는 경우 현재 시간으로 처리
    records.forEach(record => {
      if (!record.clockOut) {
        const now = new Date();
        record.clockOut = now.toTimeString().substring(0, 5); // "HH:MM" 형식
        record.isRealtime = true; // 실시간 계산 표시용
        console.log(`⏰ 퇴근 기록 없음 - 현재 시간(${record.clockOut})까지 계산`);
      }
    });
    
    // 계약서에서 시급 가져오기 (Firestore contracts 컬렉션에서)
    let hourlyWage = 10000; // 기본값
    
    try {
      // 현재 사용자의 계약서 조회 (주민번호 기준)
      const contractsSnapshot = await db.collection('contracts')
        .where('employeeName', '==', currentUser.name)
        .where('employeeBirth', '==', currentUser.birth)
        .get();
      
      if (!contractsSnapshot.empty) {
        // 최신 계약서 찾기 (createdAt 기준)
        const contracts = [];
        contractsSnapshot.forEach(doc => {
          contracts.push({ id: doc.id, ...doc.data() });
        });
        contracts.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        
        const latestContract = contracts[0];
        const wageType = latestContract.wageType || '시급';
        const wageAmount = parseFloat(latestContract.wageAmount) || 10000;
        
        // 급여 유형별 시급 환산
        if (wageType === '시급') {
          hourlyWage = wageAmount;
        } else if (wageType === '월급') {
          // 월급제는 209시간 기준
          hourlyWage = Math.round(wageAmount / 209);
        } else if (wageType === '연봉') {
          // 연봉은 12개월, 209시간 기준
          hourlyWage = Math.round(wageAmount / 12 / 209);
        }
        
        console.log(`📝 계약서 시급: ${hourlyWage}원 (${wageType}: ${wageAmount}원)`);
      } else {
        console.warn('⚠️ 계약서를 찾을 수 없습니다. 기본 시급 사용:', hourlyWage);
      }
    } catch (error) {
      console.error('❌ 계약서 조회 오류:', error);
      console.warn('⚠️ 기본 시급 사용:', hourlyWage);
    }
    
    // 급여 계산
    const salaryData = calculateSalary(records, hourlyWage);
    
    renderSalaryInfo(salaryData);
    
  } catch (error) {
    console.error('❌ 급여 조회 오류:', error);
    document.getElementById('salaryContent').innerHTML = 
      '<div class="alert alert-danger">❌ 데이터를 불러오는 중 오류가 발생했습니다</div>';
  }
}

/**
 * 급여 계산 로직
 * @param {Array} records - 근무 기록 배열
 * @param {number} hourlyWage - 시급
 * @returns {Object} 급여 상세 정보
 */
function calculateSalary(records, hourlyWage = 10000) {
  // 총 근무 시간 계산 (분 단위)
  let totalMinutes = 0;
  records.forEach(record => {
    const minutes = getWorkMinutes(record.clockIn, record.clockOut);
    totalMinutes += minutes;
  });
  
  // 분 단위까지 정확하게 계산 (시급을 60으로 나눠서 분당 급여 계산)
  const totalHours = totalMinutes / 60; // 소수점 포함
  
  // 급여 항목 계산 (분 단위까지 정확히 반영)
  const baseSalary = Math.floor(totalHours * hourlyWage); // 원 단위로 반올림
  const weeklyHolidayPay = Math.floor(baseSalary * 0.2); // 주휴수당 20%
  const overtime = 0; // 추가 근무수당 (현재 미구현)
  const insurance = Math.floor((baseSalary + weeklyHolidayPay) * 0.089); // 4대보험 8.9%
  const tax = Math.floor((baseSalary + weeklyHolidayPay) * 0.033); // 소득세 3.3%
  const deduction = insurance + tax;
  const netSalary = baseSalary + weeklyHolidayPay + overtime - deduction;
  
  return {
    baseSalary,
    overtime,
    weeklyHolidayPay,
    deduction,
    netSalary,
    totalHours,
    totalMinutes, // 추가: 분단위 표시용
    hourlyWage,
    insurance,
    tax,
    workDays: records.length
  };
}

/**
 * 시간(분)을 "X시간 Y분" 형식으로 변환
 */
function formatHoursAndMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

/**
 * 급여 정보 렌더링
 * @param {Object} data - 급여 데이터
 */
function renderSalaryInfo(data) {
  const html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-lg); margin-bottom: var(--spacing-lg);">
      <div class="card" style="text-align: center;">
        <div style="color: var(--text-secondary); font-size: 14px; margin-bottom: var(--spacing-xs);">기본급</div>
        <div style="font-size: 28px; font-weight: 700; color: var(--text-primary);">${formatCurrency(data.baseSalary)}</div>
      </div>
      
      <div class="card" style="text-align: center;">
        <div style="color: var(--text-secondary); font-size: 14px; margin-bottom: var(--spacing-xs);">주휴수당</div>
        <div style="font-size: 28px; font-weight: 700; color: var(--success-color);">${formatCurrency(data.weeklyHolidayPay || 0)}</div>
      </div>
      
      <div class="card" style="text-align: center;">
        <div style="color: var(--text-secondary); font-size: 14px; margin-bottom: var(--spacing-xs);">공제액</div>
        <div style="font-size: 28px; font-weight: 700; color: var(--danger-color);">-${formatCurrency(data.deduction || 0)}</div>
      </div>
      
      <div class="card" style="text-align: center; background: var(--primary-color);">
        <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: var(--spacing-xs);">실수령액</div>
        <div style="font-size: 28px; font-weight: 700; color: white;">${formatCurrency(data.netSalary)}</div>
      </div>
    </div>
    
    <div class="card">
      <h4 style="margin-bottom: var(--spacing-md);">📋 상세 내역</h4>
      <table style="margin-bottom: 0;">
        <tr>
          <td>근무 일수</td>
          <td style="text-align: right; font-weight: 600;">${data.workDays || 0}일</td>
        </tr>
        <tr>
          <td>총 근무시간</td>
          <td style="text-align: right; font-weight: 600;">${formatHoursAndMinutes(data.totalMinutes || 0)}</td>
        </tr>
        <tr>
          <td>시급</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(data.hourlyWage || 0)}</td>
        </tr>
        <tr style="background: #f0f9ff;">
          <td><strong>기본급</strong></td>
          <td style="text-align: right; font-weight: 700; color: var(--primary-color);">${formatCurrency(data.baseSalary)}</td>
        </tr>
        ${data.weeklyHolidayPay && data.weeklyHolidayPay > 0 ? `
        <tr>
          <td>주휴수당</td>
          <td style="text-align: right; font-weight: 600; color: var(--success-color);">+${formatCurrency(data.weeklyHolidayPay)}</td>
        </tr>
        ` : ''}
        ${data.insurance && data.insurance > 0 ? `
        <tr style="border-top: 2px solid var(--border-color);">
          <td>4대보험</td>
          <td style="text-align: right; font-weight: 600; color: var(--danger-color);">-${formatCurrency(data.insurance)}</td>
        </tr>
        ` : ''}
        ${data.tax && data.tax > 0 ? `
        <tr>
          <td>소득세 (3.3%)</td>
          <td style="text-align: right; font-weight: 600; color: var(--danger-color);">-${formatCurrency(data.tax)}</td>
        </tr>
        ` : ''}
        <tr style="background: var(--bg-light); border-top: 2px solid var(--primary-color);">
          <td><strong>실수령액</strong></td>
          <td style="text-align: right; font-weight: 700; font-size: 18px; color: var(--primary-color);">${formatCurrency(data.netSalary)}</td>
        </tr>
      </table>
    </div>
  `;
  
  document.getElementById('salaryContent').innerHTML = html;
}

// ===================================================================
// 계약서 조회 (Firestore 연동)
// ===================================================================

/**
 * 계약서 목록 로드
 * Firestore에서 현재 사용자의 계약서 조회
 */
async function loadContracts() {
  debugLog('계약서 조회');
  
  // currentUser 체크
  if (!currentUser) {
    console.error('❌ currentUser is null in loadContracts');
    document.getElementById('contractContent').innerHTML = 
      '<div class="alert alert-danger">❌ 로그인 정보가 없습니다. 페이지를 새로고침해주세요.</div>';
    return;
  }
  
  try {
    console.log('📝 계약서 조회:', { uid: currentUser.uid, name: currentUser.name, birth: currentUser.birth });
    
    const contracts = [];
    
    // 1. Firestore에서 계약서 조회 (이름과 생년월일로 필터링)
    const snapshot = await db.collection('contracts').get();
    
    for (const doc of snapshot.docs) {
      const contractData = doc.data();
      const contractId = doc.id;
      
      // 현재 사용자의 계약서인지 확인 (이름과 생년월일로)
      if (contractData.employeeName === currentUser.name && 
          contractData.employeeBirth === currentUser.birth) {
        
        // 서명 상태 확인
        const signedDoc = await db.collection('signedContracts').doc(contractId).get();
        const isSigned = signedDoc.exists;
        
        contracts.push({
          contractId: contractId,
          ...contractData,
          status: isSigned ? '서명완료' : '서명대기',
          signedAt: isSigned ? signedDoc.data().signedAt : null
        });
      }
    }
    

    
    if (contracts.length === 0) {
      document.getElementById('contractContent').innerHTML = 
        '<div class="alert alert-info">📄 아직 작성된 계약서가 없습니다.<br><br>관리자가 계약서를 작성하면 여기에서 확인하고 서명할 수 있습니다.</div>';
      return;
    }
    
    // 날짜 기준 정렬 (최신순)
    contracts.sort((a, b) => {
      const dateA = a.savedAt ? new Date(a.savedAt) : new Date(0);
      const dateB = b.savedAt ? new Date(b.savedAt) : new Date(0);
      return dateB - dateA;
    });
    
    renderContracts(contracts);
    
  } catch (error) {
    console.error('❌ 계약서 조회 오류:', error);
    document.getElementById('contractContent').innerHTML = 
      '<div class="alert alert-danger">❌ 데이터를 불러오는 중 오류가 발생했습니다</div>';
  }
}

/**
 * 계약서 목록 렌더링
 * @param {Array} contracts - 계약서 배열
 */
function renderContracts(contracts) {
  // 상단 안내 메시지
  const summaryHtml = `
    <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: var(--bg-light); border-radius: var(--border-radius); border-left: 4px solid var(--primary-color);">
      <p style="margin: 0; font-size: 14px;">
        💡 총 <strong>${contracts.length}개</strong>의 계약서가 있습니다. 최신 계약서부터 표시됩니다.
      </p>
    </div>
  `;
  
  const contractsHtml = contracts.map((contract, index) => {
    const status = contract.status || '서명대기';
    const statusBadge = status === '서명완료' ? 
      '<span class="badge badge-success">✅ 서명완료</span>' : 
      '<span class="badge badge-warning">⏰ 서명대기</span>';
    
    const isLatest = index === 0 ? '<span class="badge badge-primary" style="margin-left: 8px;">최신</span>' : '';
    
    // 날짜 포맷팅
    const createdDate = contract.createdAt ? 
      formatFirestoreTimestamp(contract.createdAt) : '-';
    const signedDate = contract.signedAt ? 
      formatFirestoreTimestamp(contract.signedAt) : null;
    
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h4 style="margin-bottom: 4px;">📋 ${contract.contractType || '근로계약서'}${isLatest}</h4>
            <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">근무지: ${contract.workStore || '-'}</p>
          </div>
          ${statusBadge}
        </div>
        <div class="card-body">
          <table style="width: 100%; margin-bottom: var(--spacing-md);">
            <tr>
              <td style="padding: 8px 0; color: var(--text-secondary); width: 120px;">계약 기간</td>
              <td style="padding: 8px 0; font-weight: 600;">${contract.startDate} ~ ${contract.endDate || '기간의 정함 없음'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: var(--text-secondary);">직책/직무</td>
              <td style="padding: 8px 0; font-weight: 600;">${contract.position || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: var(--text-secondary);">급여 조건</td>
              <td style="padding: 8px 0; font-weight: 600;">${contract.wageType || '-'} ${contract.wageAmount ? Number(contract.wageAmount).toLocaleString() + '원' : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: var(--text-secondary);">작성일</td>
              <td style="padding: 8px 0;">${createdDate}</td>
            </tr>
            ${signedDate ? `
            <tr>
              <td style="padding: 8px 0; color: var(--text-secondary);">서명일</td>
              <td style="padding: 8px 0; color: var(--success-color); font-weight: 600;">${signedDate}</td>
            </tr>
            ` : ''}
          </table>
          
          <div style="display: flex; gap: var(--spacing-sm);">
            ${status === '서명완료' ? 
              `<button class="btn btn-secondary" onclick="viewEmployeeContract('${contract.contractId}')">📄 계약서 원본 보기</button>` :
              `<button class="btn btn-primary" onclick="signContract('${contract.contractId}')">✍️ 지금 서명하기</button>`
            }
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('contractContent').innerHTML = summaryHtml + contractsHtml;
}

/**
 * 계약서 원본 보기 (서명 페이지로 이동 - 읽기 전용)
 * @param {string} contractId - 계약서 ID
 */
function viewEmployeeContract(contractId) {
  if (confirm('📄 계약서 원본을 확인하시겠습니까?\n\n서명 페이지에서 확인하실 수 있습니다.')) {
    window.location.href = `contract-sign.html?id=${contractId}`;
  }
}

/**
 * 계약서 서명
 * @param {string} contractId - 계약서 ID
 */
function signContract(contractId) {
  if (confirm('계약서 서명 페이지로 이동하시겠습니까?')) {
    window.location.href = `contract-sign.html?id=${contractId}`;
  }
}

// ===================================================================
// 공지사항 조회 (Firestore 연동)
// ===================================================================

/**
 * 공지사항 불러오기
 * Firestore notices 컬렉션에서 읽어서 표시
 */
async function loadNotices() {
  try {
    // Firestore에서 공지사항 조회 (최신순)
    const snapshot = await db.collection('notices')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      document.getElementById('noticeSection').style.display = 'none';
      return;
    }
    
    const notices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // 공지사항 영역 표시
    document.getElementById('noticeSection').style.display = 'block';
    
    // 중요/일반 공지사항 분리
    const importantNotices = notices.filter(n => n.important);
    const normalNotices = notices.filter(n => !n.important);
    
    // 중요 공지사항 표시
    if (importantNotices.length > 0) {
      const importantArea = document.getElementById('importantNoticeArea');
      const importantList = document.getElementById('importantNoticeList');
      
      importantArea.style.display = 'block';
      importantList.innerHTML = importantNotices.map(notice => {
        const dateStr = formatFirestoreTimestamp(notice.createdAt);
        
        return `
          <div style="margin-bottom: var(--spacing-md); padding: var(--spacing-md); background: white; border-radius: var(--border-radius); border: 1px solid #fecaca;">
            <h4 style="margin: 0 0 var(--spacing-xs) 0; font-size: 16px; color: #dc2626;">
              ⭐ ${notice.title}
            </h4>
            <p style="white-space: pre-wrap; line-height: 1.7; color: var(--text-primary); margin: var(--spacing-sm) 0;">
              ${notice.content}
            </p>
            <div style="font-size: 12px; color: var(--text-secondary); text-align: right;">
              ${dateStr}
            </div>
          </div>
        `;
      }).join('');
    } else {
      document.getElementById('importantNoticeArea').style.display = 'none';
    }
    
    // 일반 공지사항 표시 (최신 3개만)
    if (normalNotices.length > 0) {
      const normalArea = document.getElementById('normalNoticeArea');
      const normalList = document.getElementById('normalNoticeList');
      
      normalArea.style.display = 'block';
      
      const displayNotices = normalNotices.slice(0, 3);
      
      normalList.innerHTML = displayNotices.map(notice => {
        const dateStr = formatFirestoreTimestamp(notice.createdAt);
        
        return `
          <div style="margin-bottom: var(--spacing-md); padding: var(--spacing-md); background: white; border-radius: var(--border-radius); border: 1px solid #fde68a;">
            <h4 style="margin: 0 0 var(--spacing-xs) 0; font-size: 16px; color: var(--text-primary);">
              ${notice.title}
            </h4>
            <p style="white-space: pre-wrap; line-height: 1.7; color: var(--text-primary); margin: var(--spacing-sm) 0;">
              ${notice.content}
            </p>
            <div style="font-size: 12px; color: var(--text-secondary); text-align: right;">
              ${dateStr}
            </div>
          </div>
        `;
      }).join('');
      
      // 더 많은 공지사항이 있을 때 안내 메시지
      if (normalNotices.length > 3) {
        normalList.innerHTML += `
          <div style="text-align: center; padding: var(--spacing-sm); color: var(--text-secondary); font-size: 13px;">
            외 ${normalNotices.length - 3}개의 공지사항이 더 있습니다.
          </div>
        `;
      }
    } else {
      document.getElementById('normalNoticeArea').style.display = 'none';
    }
    
    // 공지사항이 하나도 없을 때
    if (importantNotices.length === 0 && normalNotices.length === 0) {
      document.getElementById('noNoticeMessage').style.display = 'block';
    } else {
      document.getElementById('noNoticeMessage').style.display = 'none';
    }
    
  } catch (error) {
    console.error('❌ 공지사항 불러오기 오류:', error);
    document.getElementById('noticeSection').style.display = 'none';
  }
}

// ===================================================================
// 서류 관리 (통장사본, 보건증) - Firestore 연동
// ===================================================================

/**
 * 년/월/일 드롭다운 초기화
 */
function initializeDateDropdowns() {
  // 년도 드롭다운 (현재년도 ~ 현재+5년)
  const yearSelect = document.getElementById('healthCertYear');
  if (yearSelect) {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i <= 5; i++) {
      const year = currentYear + i;
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year + '년';
      yearSelect.appendChild(option);
    }
  }
  
  // 일 드롭다운 (1일 ~ 31일)
  const daySelect = document.getElementById('healthCertDay');
  if (daySelect) {
    for (let i = 1; i <= 31; i++) {
      const option = document.createElement('option');
      option.value = String(i).padStart(2, '0');
      option.textContent = i + '일';
      daySelect.appendChild(option);
    }
  }
}

/**
 * 직원 서류 정보 불러오기 (Firestore)
 */
async function loadEmployeeDocuments() {
  if (!currentUser) return;
  
  try {
    const docRef = db.collection('employee_docs').doc(currentUser.uid);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const docs = doc.data();
      
      // 통장사본 정보 로드
      if (docs.bankAccount) {
        document.getElementById('bankName').value = docs.bankAccount.bankName || '';
        document.getElementById('accountNumber').value = docs.bankAccount.accountNumber || '';
        document.getElementById('accountHolder').value = docs.bankAccount.accountHolder || '';
      }
      
      // 보건증 정보 로드
      if (docs.healthCert) {
        // 이미지 미리보기
        if (docs.healthCert.imageData) {
          document.getElementById('healthCertImg').src = docs.healthCert.imageData;
          document.getElementById('healthCertPreview').style.display = 'block';
        }
        
        // 유효기간
        if (docs.healthCert.expiryDate) {
          const [year, month, day] = docs.healthCert.expiryDate.split('-');
          document.getElementById('healthCertYear').value = year;
          document.getElementById('healthCertMonth').value = month;
          document.getElementById('healthCertDay').value = day;
        }
      }
    }
  } catch (error) {
    console.error('❌ 서류 정보 불러오기 오류:', error);
  }
}

/**
 * 통장사본 정보 저장 (Firestore)
 */
async function saveBankAccount() {
  if (!currentUser) {
    alert('⚠️ 로그인 정보가 없습니다.');
    return;
  }
  
  const bankName = document.getElementById('bankName').value.trim();
  const accountNumber = document.getElementById('accountNumber').value.trim();
  const accountHolder = document.getElementById('accountHolder').value.trim();
  
  if (!bankName || !accountNumber || !accountHolder) {
    alert('⚠️ 모든 항목을 입력해주세요.');
    return;
  }
  
  try {
    const docRef = db.collection('employee_docs').doc(currentUser.uid);
    
    await docRef.set({
      uid: currentUser.uid,
      name: currentUser.name,
      bankAccount: {
        bankName: bankName,
        accountNumber: accountNumber,
        accountHolder: accountHolder,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true });
    
    // 저장 완료 메시지
    const statusEl = document.getElementById('bankSaveStatus');
    statusEl.textContent = '✅ 저장되었습니다!';
    statusEl.style.display = 'inline-flex';
    
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  } catch (error) {
    console.error('❌ 통장사본 저장 오류:', error);
    alert('❌ 저장 중 오류가 발생했습니다.');
  }
}

/**
 * 보건증 이미지 미리보기 및 자동 압축
 */
function previewHealthCert(event) {
  const file = event.target.files[0];
  
  if (!file) return;
  
  // 이미지 파일 검증
  if (!file.type.startsWith('image/')) {
    alert('⚠️ 이미지 파일만 업로드 가능합니다.');
    event.target.value = '';
    return;
  }
  
  // 원본 파일 크기 표시
  const originalSize = (file.size / 1024).toFixed(0);
  console.log(`원본 파일 크기: ${originalSize}KB`);
  
  // 파일 읽기 및 압축
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const img = new Image();
    
    img.onload = function() {
      // Canvas를 사용해 이미지 압축
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 최대 크기 설정 (폭 기준 1200px)
      const maxWidth = 1200;
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // 이미지 그리기
      ctx.drawImage(img, 0, 0, width, height);
      
      // Base64로 변환 (품질 0.7 = 70%)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      // 압축된 크기 계산
      const compressedSize = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
      
      console.log(`압축 후 크기: ${compressedSize}KB`);
      
      // 미리보기 표시
      const previewImg = document.getElementById('healthCertImg');
      previewImg.src = compressedDataUrl;
      document.getElementById('healthCertPreview').style.display = 'block';
      
      // 크기 정보 표시
      const sizeInfo = document.getElementById('imageSizeInfo');
      sizeInfo.textContent = `원본: ${originalSize}KB → 압축: ${compressedSize}KB`;
      
      // 압축된 데이터를 임시 저장
      window.compressedHealthCertData = compressedDataUrl;
    };
    
    img.onerror = function() {
      alert('❌ 이미지를 불러오는 중 오류가 발생했습니다.');
      event.target.value = '';
    };
    
    img.src = e.target.result;
  };
  
  reader.onerror = function() {
    alert('❌ 파일을 읽는 중 오류가 발생했습니다.');
  };
  
  reader.readAsDataURL(file);
}

/**
 * 보건증 정보 저장 (Firestore)
 */
async function saveHealthCert() {
  if (!currentUser) {
    alert('⚠️ 로그인 정보가 없습니다.');
    return;
  }
  
  const fileInput = document.getElementById('healthCertImage');
  const year = document.getElementById('healthCertYear').value;
  const month = document.getElementById('healthCertMonth').value;
  const day = document.getElementById('healthCertDay').value;
  
  // 유효기간 검증
  if (!year || !month || !day) {
    alert('⚠️ 유효기간을 모두 선택해주세요.');
    return;
  }
  
  // 이미지 필수 검증
  if (!fileInput.files[0] && !document.getElementById('healthCertImg').src) {
    alert('⚠️ 보건증 이미지를 업로드해주세요.');
    return;
  }
  
  const expiryDate = `${year}-${month}-${day}`;
  
  try {
    const docRef = db.collection('employee_docs').doc(currentUser.uid);
    
    // 기존 문서 가져오기
    const doc = await docRef.get();
    const existingData = doc.exists ? doc.data() : {};
    
    const healthCertData = {
      expiryDate: expiryDate,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // 이미지가 새로 업로드된 경우
    if (window.compressedHealthCertData) {
      healthCertData.imageData = window.compressedHealthCertData;
      delete window.compressedHealthCertData;
    } else if (existingData.healthCert && existingData.healthCert.imageData) {
      // 기존 이미지 유지
      healthCertData.imageData = existingData.healthCert.imageData;
    }
    
    await docRef.set({
      uid: currentUser.uid,
      name: currentUser.name,
      healthCert: healthCertData
    }, { merge: true });
    
    // 저장 완료 메시지
    showHealthSaveSuccess();
  } catch (error) {
    console.error('❌ 보건증 저장 오류:', error);
    alert('❌ 저장 중 오류가 발생했습니다.');
  }
}

/**
 * 보건증 저장 완료 메시지 표시
 */
function showHealthSaveSuccess() {
  const statusEl = document.getElementById('healthSaveStatus');
  statusEl.textContent = '✅ 저장되었습니다!';
  statusEl.style.display = 'inline-flex';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

// ===================================================================
// 유틸리티 함수
// ===================================================================

/**
 * 문자열 첫 글자 대문자 변환
 * @param {string} str - 변환할 문자열
 * @returns {string} 변환된 문자열
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
 * 디버그 로그 출력
 * @param {string} message - 로그 메시지
 */
function debugLog(message) {
  if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG_MODE) {
    console.log(`[Employee] ${message}`);
  }
}

// ===================================================================
// 문서 승인 관련 함수 (구매/폐기/퇴직서)
// ===================================================================

/**
 * 내 승인 신청 목록 로드
 */
async function loadMyApprovals() {
  const tbody = document.getElementById('myApprovalsTableBody');
  if (!tbody || !currentUser) return;
  
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">신청 내역을 불러오는 중...</td></tr>';
  
  try {
    const snapshot = await db.collection('approvals')
      .where('applicantUid', '==', currentUser.uid)
      .get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);"><div style="font-size: 48px; margin-bottom: 16px;">📝</div><p>아직 신청한 문서가 없습니다.</p><p style="font-size: 13px; margin-top: 8px;">상단의 버튼을 눌러 문서를 신청해보세요!</p></td></tr>';
      return;
    }
    
    const approvals = [];
    snapshot.forEach(doc => {
      approvals.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 클라이언트 측에서 날짜순 정렬 (최신순)
    approvals.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
    
    const typeEmoji = {
      'purchase': '💳',
      'disposal': '🗑️',
      'resignation': '📄'
    };
    
    const typeText = {
      'purchase': '구매',
      'disposal': '폐기',
      'resignation': '퇴직서'
    };
    
    const statusBadge = {
      'pending': '<span class="badge badge-warning" style="background: #ffc107; color: #000;">대기중</span>',
      'approved': '<span class="badge badge-success">승인됨</span>',
      'rejected': '<span class="badge badge-danger">거부됨</span>'
    };
    
    tbody.innerHTML = approvals.map(approval => {
      const createdDate = approval.createdAt?.toDate?.() ? approval.createdAt.toDate().toLocaleString('ko-KR') : '-';
      
      // 요약 정보
      let summary = '';
      if (approval.type === 'purchase') {
        const items = approval.data?.items || [];
        summary = items.length > 0 ? `${items[0].item} 외 ${items.length - 1}건` : '-';
      } else if (approval.type === 'disposal') {
        summary = `${approval.data?.category || '-'}`;
      } else if (approval.type === 'resignation') {
        summary = `희망일: ${approval.data?.resignationDate || '-'}`;
      }
      
      const detailButton = `<button class="btn btn-sm" style="background: var(--primary-color); color: white;" onclick="viewMyApprovalDetail('${approval.id}')">
        📄 상세보기
      </button>`;
      
      // 거부 사유 표시
      const rejectInfo = approval.status === 'rejected' && approval.rejectReason 
        ? `<br><small style="color: var(--danger-color);">거부 사유: ${approval.rejectReason}</small>`
        : '';
      
      return `
        <tr>
          <td>${typeEmoji[approval.type] || ''} ${typeText[approval.type] || '-'}</td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${summary}</td>
          <td style="font-size: 12px;">${createdDate}</td>
          <td>${statusBadge[approval.status] || '-'}${rejectInfo}</td>
          <td>${detailButton}</td>
        </tr>
      `;
    }).join('');
    
  } catch (error) {
    console.error('❌ 신청 내역 로드 실패:', error);
    console.error('Error details:', error.message);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px;">
          <div style="color: var(--text-secondary);">
            <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
            <p>아직 신청한 문서가 없습니다.</p>
            <p style="font-size: 13px; margin-top: 8px; color: var(--text-secondary);">상단의 버튼을 눌러 문서를 신청해보세요!</p>
          </div>
        </td>
      </tr>
    `;
  }
}

// 구매 신청 모달 열기
function showPurchaseRequestModal() {
  document.getElementById('purchaseRequestModal').style.display = 'flex';
  // 초기화
  document.getElementById('purchaseItems').innerHTML = `
    <div class="purchase-item" data-index="0">
      <div class="form-row">
        <div class="form-group" style="flex: 2;">
          <label>구매 물품 <span style="color: var(--danger-color);">*</span></label>
          <input type="text" class="purchase-item-name" placeholder="예: 커피원두">
        </div>
        <div class="form-group">
          <label>구매처 <span style="color: var(--danger-color);">*</span></label>
          <input type="text" class="purchase-item-vendor" placeholder="예: ABC 무역">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>구매 금액 (원) <span style="color: var(--danger-color);">*</span></label>
          <input type="number" class="purchase-item-price" placeholder="50000" min="0">
        </div>
        <div class="form-group">
          <label>수량 <span style="color: var(--danger-color);">*</span></label>
          <input type="number" class="purchase-item-quantity" placeholder="10" min="1" value="1">
        </div>
      </div>
      <hr style="margin: var(--spacing-md) 0; border: none; border-top: 1px dashed var(--border-color);">
    </div>
  `;
}

function closePurchaseRequestModal() {
  document.getElementById('purchaseRequestModal').style.display = 'none';
}

// 구매 항목 추가
function addPurchaseItem() {
  const container = document.getElementById('purchaseItems');
  const index = container.children.length;
  
  const itemHtml = `
    <div class="purchase-item" data-index="${index}">
      <div class="form-row">
        <div class="form-group" style="flex: 2;">
          <label>구매 물품 <span style="color: var(--danger-color);">*</span></label>
          <input type="text" class="purchase-item-name" placeholder="예: 커피원두">
        </div>
        <div class="form-group">
          <label>구매처 <span style="color: var(--danger-color);">*</span></label>
          <input type="text" class="purchase-item-vendor" placeholder="예: ABC 무역">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>구매 금액 (원) <span style="color: var(--danger-color);">*</span></label>
          <input type="number" class="purchase-item-price" placeholder="50000" min="0">
        </div>
        <div class="form-group">
          <label>수량 <span style="color: var(--danger-color);">*</span></label>
          <input type="number" class="purchase-item-quantity" placeholder="10" min="1" value="1">
        </div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removePurchaseItem(${index})" style="margin-bottom: var(--spacing-md);">삭제</button>
      <hr style="margin: var(--spacing-md) 0; border: none; border-top: 1px dashed var(--border-color);">
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', itemHtml);
}

// 구매 항목 삭제
function removePurchaseItem(index) {
  const item = document.querySelector(`.purchase-item[data-index="${index}"]`);
  if (item) {
    item.remove();
  }
}

// 구매 신청 제출
async function submitPurchaseRequest() {
  console.log('🔍 submitPurchaseRequest 호출, currentUser:', currentUser);
  
  if (!currentUser) {
    alert('❌ 로그인이 필요합니다.');
    return;
  }
  
  const items = [];
  const purchaseItems = document.querySelectorAll('.purchase-item');
  
  for (const item of purchaseItems) {
    const name = item.querySelector('.purchase-item-name').value.trim();
    const vendor = item.querySelector('.purchase-item-vendor').value.trim();
    const price = item.querySelector('.purchase-item-price').value;
    const quantity = item.querySelector('.purchase-item-quantity').value;
    
    if (!name || !vendor || !price || !quantity) {
      alert('⚠️ 모든 항목을 입력해주세요.');
      return;
    }
    
    items.push({
      item: name,
      vendor: vendor,
      price: parseInt(price),
      quantity: parseInt(quantity)
    });
  }
  
  if (items.length === 0) {
    alert('⚠️ 최소 1개 이상의 구매 항목을 입력해주세요.');
    return;
  }
  
  try {
    console.log('📤 Firestore에 저장 시도:', { items, currentUser });
    
    await db.collection('approvals').add({
      type: 'purchase',
      applicantUid: currentUser.uid,
      applicantName: currentUser.name,
      applicantEmail: currentUser.email,
      status: 'pending',
      data: {
        items: items
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Firestore 저장 성공');
    alert('✅ 구매 신청이 완료되었습니다.');
    closePurchaseRequestModal();
    loadMyApprovals();
    
  } catch (error) {
    console.error('❌ 구매 신청 실패 상세:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    alert(`❌ 신청에 실패했습니다.\n\n${error.message}\n\n개발자 도구 콘솔을 확인해주세요.`);
  }
}

// 폐기 신청 모달 열기
function showDisposalRequestModal() {
  document.getElementById('disposalRequestModal').style.display = 'flex';
  document.getElementById('disposalCategory').value = '';
  document.getElementById('disposalDetails').value = '';
}

function closeDisposalRequestModal() {
  document.getElementById('disposalRequestModal').style.display = 'none';
}

// 폐기 신청 제출
async function submitDisposalRequest() {
  console.log('🔍 submitDisposalRequest 호출, currentUser:', currentUser);
  
  if (!currentUser) {
    alert('❌ 로그인이 필요합니다.');
    return;
  }
  
  const category = document.getElementById('disposalCategory').value;
  const details = document.getElementById('disposalDetails').value.trim();
  
  if (!category || !details) {
    alert('⚠️ 모든 항목을 입력해주세요.');
    return;
  }
  
  try {
    console.log('📤 Firestore에 저장 시도:', { category, details, currentUser });
    
    await db.collection('approvals').add({
      type: 'disposal',
      applicantUid: currentUser.uid,
      applicantName: currentUser.name,
      applicantEmail: currentUser.email,
      status: 'pending',
      data: {
        category: category,
        details: details
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('✅ 폐기 신청이 완료되었습니다.');
    closeDisposalRequestModal();
    loadMyApprovals();
    
  } catch (error) {
    console.error('❌ 폐기 신청 실패 상세:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    alert(`❌ 신청에 실패했습니다.\n\n${error.message}\n\n개발자 도구 콘솔을 확인해주세요.`);
  }
}

// 퇴직서 신청 모달 열기
let resignationCanvas;
let resignationCtx;
let isDrawing = false;
let resignationSignatureData = null;

function showResignationRequestModal() {
  document.getElementById('resignationRequestModal').style.display = 'flex';
  
  // 사용자 이름 자동 입력
  document.getElementById('resignationName').value = currentUser?.name || '';
  
  // 년도 드롭다운 초기화
  const yearSelect = document.getElementById('resignationYear');
  yearSelect.innerHTML = '<option value="">년</option>';
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i <= currentYear + 2; i++) {
    yearSelect.innerHTML += `<option value="${i}">${i}년</option>`;
  }
  
  // 일 드롭다운 초기화
  const daySelect = document.getElementById('resignationDay');
  daySelect.innerHTML = '<option value="">일</option>';
  for (let i = 1; i <= 31; i++) {
    daySelect.innerHTML += `<option value="${String(i).padStart(2, '0')}">${i}일</option>`;
  }
  
  // 서명 패드 초기화
  setTimeout(() => {
    initResignationSignaturePad();
  }, 100);
}

function closeResignationRequestModal() {
  document.getElementById('resignationRequestModal').style.display = 'none';
}

// 서명 패드 초기화
function initResignationSignaturePad() {
  resignationCanvas = document.getElementById('resignationSignaturePad');
  resignationCtx = resignationCanvas.getContext('2d');
  
  // 캔버스 크기 설정
  resignationCanvas.width = 400;
  resignationCanvas.height = 150;
  
  // 배경 흰색으로 설정
  resignationCtx.fillStyle = 'white';
  resignationCtx.fillRect(0, 0, resignationCanvas.width, resignationCanvas.height);
  
  // 서명 스타일
  resignationCtx.strokeStyle = '#000';
  resignationCtx.lineWidth = 2;
  resignationCtx.lineCap = 'round';
  
  // 이벤트 리스너
  resignationCanvas.addEventListener('mousedown', startDrawing);
  resignationCanvas.addEventListener('mousemove', draw);
  resignationCanvas.addEventListener('mouseup', stopDrawing);
  resignationCanvas.addEventListener('mouseout', stopDrawing);
  
  // 터치 이벤트
  resignationCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = resignationCanvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    isDrawing = true;
    resignationCtx.beginPath();
    resignationCtx.moveTo(x, y);
  });
  
  resignationCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = resignationCanvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    resignationCtx.lineTo(x, y);
    resignationCtx.stroke();
  });
  
  resignationCanvas.addEventListener('touchend', () => {
    isDrawing = false;
  });
}

function startDrawing(e) {
  isDrawing = true;
  const rect = resignationCanvas.getBoundingClientRect();
  resignationCtx.beginPath();
  resignationCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = resignationCanvas.getBoundingClientRect();
  resignationCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  resignationCtx.stroke();
}

function stopDrawing() {
  isDrawing = false;
}

function clearResignationSignature() {
  resignationCtx.fillStyle = 'white';
  resignationCtx.fillRect(0, 0, resignationCanvas.width, resignationCanvas.height);
  resignationSignatureData = null;
}

// 퇴직서 신청 제출
async function submitResignationRequest() {
  if (!currentUser) {
    alert('❌ 로그인이 필요합니다.');
    return;
  }
  
  const name = document.getElementById('resignationName').value.trim();
  const year = document.getElementById('resignationYear').value;
  const month = document.getElementById('resignationMonth').value;
  const day = document.getElementById('resignationDay').value;
  const reason = document.getElementById('resignationReason').value.trim() || '개인사정';
  
  if (!name || !year || !month || !day) {
    alert('⚠️ 모든 필수 항목을 입력해주세요.');
    return;
  }
  
  // 서명 확인
  const signatureDataURL = resignationCanvas.toDataURL();
  if (!signatureDataURL || signatureDataURL === 'data:,') {
    alert('⚠️ 서명을 해주세요.');
    return;
  }
  
  const resignationDate = `${year}-${month}-${day}`;
  
  if (!confirm(`퇴직서를 신청하시겠습니까?\n\n희망 퇴직일: ${resignationDate}\n\n⚠️ 퇴직서가 승인되면 계정이 자동으로 삭제됩니다.`)) {
    return;
  }
  
  try {
    await db.collection('approvals').add({
      type: 'resignation',
      applicantUid: currentUser.uid,
      applicantName: currentUser.name,
      applicantEmail: currentUser.email,
      status: 'pending',
      data: {
        name: name,
        resignationDate: resignationDate,
        reason: reason,
        employeeSignature: signatureDataURL
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('✅ 퇴직서 신청이 완료되었습니다.\n관리자 승인 후 처리됩니다.');
    closeResignationRequestModal();
    loadMyApprovals();
    
  } catch (error) {
    console.error('❌ 퇴직서 신청 실패 상세:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    alert(`❌ 신청에 실패했습니다.\n\n${error.message}\n\n개발자 도구 콘솔을 확인해주세요.`);
  }
}

// 내 승인 상세보기
async function viewMyApprovalDetail(approvalId) {
  alert('📄 상세보기 기능은 곧 추가됩니다.');
  // TODO: 상세보기 모달 구현
}
