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
    
    // 보건증 만료 체크 (비동기로 실행, 에러가 있어도 메인 화면은 표시)
    checkHealthCertExpiry().catch(err => console.error('보건증 체크 오류:', err));
    
    // 관리자 근무시간 수정 알림 체크 (비동기로 실행)
    checkAdminTimeEdits().catch(err => console.error('근무시간 수정 알림 체크 오류:', err));
    
    // 미처리 결근 사유 체크 (비동기로 실행)
    checkPendingAbsentReasons().catch(err => console.error('결근 사유 체크 오류:', err));
    
    // 🔥 교대근무 요청 실시간 모니터링 시작
    monitorShiftRequests();
    
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
    
    // 보건증 만료 체크 (비동기로 실행, 에러가 있어도 메인 화면은 표시)
    checkHealthCertExpiry().catch(err => console.error('보건증 체크 오류:', err));
    
    // 관리자 근무시간 수정 알림 체크 (비동기로 실행)
    checkAdminTimeEdits().catch(err => console.error('근무시간 수정 알림 체크 오류:', err));
    
    // 미처리 결근 사유 체크 (비동기로 실행)
    checkPendingAbsentReasons().catch(err => console.error('결근 사유 체크 오류:', err));
    
    // 🔥 교대근무 요청 실시간 모니터링 시작
    monitorShiftRequests();
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
  } else if (tabName === 'schedule') {
    loadEmployeeSchedule();
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
      
      // 계약서 근무시간과 비교 체크
      await checkContractTimeViolation(todayRecord.clockIn, timeStr, snapshot.docs[0].id, dateStr);
      
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
 * 계약서 근무시간과 실제 근무시간 비교 체크
 * 시간 외 근무 시 사유 보고 요청
 */
async function checkContractTimeViolation(clockIn, clockOut, attendanceId, attendanceDate) {
  if (!currentUser) return;
  
  try {
    // 계약서 조회
    const contractsSnapshot = await db.collection('contracts')
      .where('employeeName', '==', currentUser.name)
      .where('employeeBirth', '==', currentUser.birth)
      .get();
    
    if (contractsSnapshot.empty) {
      console.log('⚠️ 계약서 없음 - 근무시간 체크 스킵');
      return;
    }
    
    // 최신 계약서 찾기
    const contracts = [];
    contractsSnapshot.forEach(doc => {
      contracts.push({ id: doc.id, ...doc.data() });
    });
    contracts.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    
    const contract = contracts[0];
    
    // 계약서에 근무시간이 없으면 스킵
    if (!contract.workStartTime || !contract.workEndTime) {
      console.log('⚠️ 계약서에 근무시간 없음 - 체크 스킵');
      return;
    }
    
    // 시간 비교
    const isEarlyClockIn = clockIn < contract.workStartTime;
    const isLateClockOut = clockOut > contract.workEndTime;
    
    if (isEarlyClockIn || isLateClockOut) {
      let message = '⚠️ 계약서 근무시간 외 근무가 감지되었습니다!\n\n';
      message += `📋 계약서 근무시간: ${contract.workStartTime} ~ ${contract.workEndTime}\n`;
      message += `⏰ 실제 근무시간: ${clockIn} ~ ${clockOut}\n\n`;
      
      if (isEarlyClockIn) {
        message += `• 출근: ${contract.workStartTime} 이전에 출근함\n`;
      }
      if (isLateClockOut) {
        message += `• 퇴근: ${contract.workEndTime} 이후에 퇴근함\n`;
      }
      
      message += '\n사유를 입력해주세요:';
      
      const reason = prompt(message);
      
      if (reason && reason.trim()) {
        // 사유 보고 저장
        await db.collection('time_change_reports').add({
          type: 'violation',
          reportedBy: 'employee',
          employeeUid: currentUser.uid,
          employeeName: currentUser.name,
          attendanceId: attendanceId,
          attendanceDate: attendanceDate || '-',
          contractTime: {
            start: contract.workStartTime,
            end: contract.workEndTime
          },
          actualTime: {
            clockIn: clockIn,
            clockOut: clockOut
          },
          reason: reason.trim(),
          status: 'reported',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('✅ 사유가 보고되었습니다.\n관리자가 확인할 수 있습니다.');
      } else {
        alert('⚠️ 사유가 입력되지 않았습니다.\n나중에 근무기록 수정 시 사유를 추가해주세요.');
      }
    }
    
  } catch (error) {
    console.error('❌ 근무시간 체크 오류:', error);
    // 에러가 있어도 퇴근 처리는 완료
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
 * 근태 상태 자동 계산
 * @param {Object} att - 근태 데이터
 * @returns {Object} { text: '상태명', class: 'badge-클래스' }
 */
function calculateAttendanceStatus(att) {
  // 출근 기록 없음
  if (!att.clockIn) {
    return { text: '결근', class: 'danger' };
  }
  
  // 퇴근 기록 없음 (아직 근무 중)
  if (!att.clockOut) {
    return { text: '근무중', class: 'info' };
  }
  
  // 기본값: 정상
  let status = { text: '정상', class: 'success' };
  
  // 지각/조퇴 판정을 위해 계약서 기준 시간이 필요하지만
  // 여기서는 간단하게 일반적인 기준으로 판정
  // TODO: 계약서 기준 시간과 비교하여 정확한 판정 가능
  
  // 09:00 이후 출근은 지각으로 임시 판정
  if (att.clockIn > '09:00') {
    status = { text: '지각', class: 'warning' };
  }
  
  // 18:00 이전 퇴근은 조퇴로 임시 판정
  if (att.clockOut < '18:00') {
    status = { text: '조퇴', class: 'info' };
  }
  
  // 지각이면서 조퇴면 '지각+조퇴'
  if (att.clockIn > '09:00' && att.clockOut < '18:00') {
    status = { text: '지각+조퇴', class: 'warning' };
  }
  
  return status;
}

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
    
    const records = [];
    snapshot.docs.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    
    tbody.innerHTML = records.map(record => {
      // 자동 상태 계산 (관리자 페이지와 동일한 로직)
      const calculatedStatus = calculateAttendanceStatus(record);
      const statusClass = calculatedStatus.class;
      const statusText = calculatedStatus.text;
      const workTime = record.clockIn && record.clockOut ? 
        calculateWorkTime(record.clockIn, record.clockOut) : '-';
      
      return `
        <tr>
          <td>${record.date}</td>
          <td>${record.workType || '정규근무'}</td>
          <td>${record.clockIn || '-'}</td>
          <td>${record.clockOut || '-'}</td>
          <td>${workTime}</td>
          <td><span class="badge badge-${statusClass}">${statusText}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="showAttendanceDetailModal('${record.id}', '${record.date}', '${record.clockIn || ''}', '${record.clockOut || ''}', '${record.workType || '정규근무'}')">
              📋 상세
            </button>
            <button class="btn btn-sm btn-primary" onclick="showEditAttendanceModal('${record.id}', '${record.date}', '${record.clockIn || ''}', '${record.clockOut || ''}')">
              ✏️ 수정
            </button>
          </td>
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
    
    // 계약서 정보 가져오기 (급여 계산에 필요)
    let latestContract = null;
    try {
      const contractsSnapshot = await db.collection('contracts')
        .where('employeeName', '==', currentUser.name)
        .where('employeeBirth', '==', currentUser.birth)
        .get();
      
      if (!contractsSnapshot.empty) {
        const contracts = [];
        contractsSnapshot.forEach(doc => {
          contracts.push({ id: doc.id, ...doc.data() });
        });
        contracts.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        
        latestContract = contracts[0];
      }
    } catch (error) {
      console.error('계약서 조회 오류:', error);
    }
    
    // 매장의 출퇴근 허용시간 설정 가져오기
    let thresholds = {
      earlyClockIn: 15,    // 기본값
      earlyClockOut: 5,    // 기본값
      overtime: 5          // 기본값
    };
    
    try {
      const storeName = currentUser.store;
      if (storeName) {
        const storesSnapshot = await db.collection('stores')
          .where('name', '==', storeName)
          .limit(1)
          .get();
        
        if (!storesSnapshot.empty) {
          const storeData = storesSnapshot.docs[0].data();
          if (storeData.attendanceThresholds) {
            thresholds = storeData.attendanceThresholds;
            console.log('⚙️ 매장 출퇴근 허용시간:', thresholds);
          }
        }
      }
    } catch (error) {
      console.error('⚠️ 매장 설정 조회 실패:', error);
    }
    
    // 급여 계산 (계약서 정보, 조회 월, 매장 설정 전달)
    const salaryData = calculateSalary(records, hourlyWage, latestContract, filterMonth, thresholds);
    
    // 급여 형태 정보 추가 (월급/연봉일 경우 시급 관련 항목 숨김 처리를 위해)
    if (latestContract) {
      salaryData.wageType = latestContract.wageType || '시급';
      salaryData.wageAmount = parseFloat(latestContract.wageAmount) || 0;
    } else {
      salaryData.wageType = '시급'; // 계약서 없으면 기본값
    }
    
    // salaries 컬렉션에서 확정된 퇴직금 정보 조회
    try {
      const yearMonth = filterMonth; // YYYY-MM 형식
      const salaryDocId = `${currentUser.uid}_${yearMonth}`;
      const salaryDoc = await db.collection('salaries').doc(salaryDocId).get();
      
      if (salaryDoc.exists) {
        const salaryDocData = salaryDoc.data();
        
        // 확정된 퇴직금이 있는 경우에만 추가
        if (salaryDocData.severanceConfirmed === true && salaryDocData.severancePay > 0) {
          salaryData.severancePay = salaryDocData.severancePay;
          salaryData.severanceConfirmedAt = salaryDocData.severanceConfirmedAt;
          console.log('💰 확정된 퇴직금 정보:', salaryData.severancePay);
        }
      }
    } catch (error) {
      console.error('⚠️ 퇴직금 정보 조회 오류:', error);
      // 오류가 있어도 급여 정보는 표시
    }
    
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
 * @param {Object} contract - 계약서 정보
 * @param {string} yearMonth - 조회 월 (YYYY-MM)
 * @param {Object} thresholds - 매장 출퇴근 허용시간 설정
 * @returns {Object} 급여 상세 정보
 */
function calculateSalary(records, hourlyWage = 10000, contract = null, yearMonth = null, thresholds = null) {
  // 기본 허용시간 설정
  if (!thresholds) {
    thresholds = {
      earlyClockIn: 15,
      earlyClockOut: 5,
      overtime: 5
    };
  }
  
  // 총 근무 시간 계산 (분 단위)
  let totalMinutes = 0;
  const weeklyWorkHours = {}; // 주차별 근무시간
  const weeklyAbsences = {}; // 주차별 결근 여부
  
  // yearMonth 파싱
  let year, month;
  if (yearMonth) {
    [year, month] = yearMonth.split('-').map(Number);
  }
  
  // 계약서가 있고 yearMonth가 있으면 결근 체크
  if (contract && contract.workDays && yearMonth) {
    // 계약서의 근무일정 파싱
    const workDaysArray = contract.workDays.split(',').map(d => d.trim());
    const dayMap = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0 };
    const workDayNumbers = workDaysArray.map(day => dayMap[day]).filter(n => n !== undefined);
    
    // 출근 기록 날짜
    const attendanceDates = new Set(records.map(r => r.date));
    
    // 한 달 동안의 모든 날짜 확인
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split('T')[0];
      
      // 근무일인데 출근 기록이 없으면 결근
      if (workDayNumbers.includes(dayOfWeek) && !attendanceDates.has(dateStr)) {
        const weekKey = getWeekOfMonth(d);
        weeklyAbsences[weekKey] = true;
        console.log(`⚠️ 결근 감지: ${dateStr} (${weekKey})`);
      }
    }
  }
  
  // 주차별 근무시간 계산
  records.forEach(record => {
    let adjustedClockIn = record.clockIn;
    let adjustedClockOut = record.clockOut;
    
    // 계약서 근무시간과 비교해서 실제 근무시간 조정
    if (contract && contract.workStartTime && contract.workEndTime) {
      const contractStartMinutes = timeToMinutes(contract.workStartTime);
      const contractEndMinutes = timeToMinutes(contract.workEndTime);
      const actualStartMinutes = timeToMinutes(record.clockIn);
      const actualEndMi
// ===========================================
// 교대근무 신청 시스템
// ===========================================

let currentShiftRequestId = null; // 현재 표시 중인 교대근무 요청 ID

/**
 * 교대근무 신청 모달 열기
 */
async function showShiftRequestModal() {
  const modal = document.getElementById('shiftRequestModal');
  modal.style.display = 'flex';
  
  // 날짜 기본값: 내일
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('shiftRequestDate').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('shiftRequestDate').min = tomorrow.toISOString().split('T')[0];
}

/**
 * 교대근무 신청 모달 닫기
 */
function closeShiftRequestModal() {
  document.getElementById('shiftRequestModal').style.display = 'none';
  document.getElementById('shiftRequestDate').value = '';
  document.getElementById('shiftRequestStartTime').value = '';
  document.getElementById('shiftRequestEndTime').value = '';
  document.getElementById('shiftRequestReason').value = '';
}

/**
 * 교대근무 신청 제출
 */
async function submitShiftRequest() {
  const date = document.getElementById('shiftRequestDate').value;
  const startTime = document.getElementById('shiftRequestStartTime').value;
  const endTime = document.getElementById('shiftRequestEndTime').value;
  const reason = document.getElementById('shiftRequestReason').value.trim();
  
  if (!date || !startTime || !endTime || !reason) {
    alert('⚠️ 모든 항목을 입력해주세요.');
    return;
  }
  
  if (reason.length < 10) {
    alert('⚠️ 사유를 10자 이상 입력해주세요.');
    return;
  }
  
  try {
    // Firestore에 교대근무 요청 저장
    const shiftRequest = {
      requesterId: currentUser.uid,
      requesterName: currentUser.name,
      store: currentUser.store,
      workDate: date,
      workStartTime: startTime,
      workEndTime: endTime,
      reason: reason,
      status: 'pending', // pending → matched → approved
      matchedUserId: null,
      matchedUserName: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      matchedAt: null,
      approvedByAdmin: false
    };
    
    await db.collection('shift_requests').add(shiftRequest);
    
    alert('✅ 교대근무 신청이 완료되었습니다.\n같은 매장 직원들에게 알림이 전송됩니다.');
    closeShiftRequestModal();
    
    // 신청 목록 새로고침
    if (typeof loadMyApprovals === 'function') {
      loadMyApprovals();
    }
    
  } catch (error) {
    console.error('교대근무 신청 실패:', error);
    alert('❌ 신청에 실패했습니다: ' + error.message);
  }
}

/**
 * 교대근무 요청 실시간 모니터링 (같은 매장 직원들)
 */
function monitorShiftRequests() {
  if (!currentUser || !currentUser.store) return;
  
  // 실시간 리스너 설정
  db.collection('shift_requests')
    .where('store', '==', currentUser.store)
    .where('status', '==', 'pending')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const request = change.doc.data();
          
          // 본인이 신청한 것은 제외
          if (request.requesterId !== currentUser.uid) {
            showShiftNotification(change.doc.id, request);
          }
        }
      });
    });
}

/**
 * 교대근무 요청 알림 표시
 */
function showShiftNotification(requestId, request) {
  currentShiftRequestId = requestId;
  
  const modal = document.getElementById('shiftRequestNotificationModal');
  const content = document.getElementById('shiftNotificationContent');
  
  const dateObj = new Date(request.workDate);
  const dateStr = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
  
  content.innerHTML = `
    <div style="background: var(--bg-light); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <div style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
        <strong>${request.requesterName}</strong>님이 대타근무를 요청했습니다
      </div>
      <div style="color: var(--text-secondary); line-height: 1.8;">
        📅 <strong>날짜:</strong> ${dateStr}<br>
        ⏰ <strong>시간:</strong> ${request.workStartTime} ~ ${request.workEndTime}<br>
        📝 <strong>사유:</strong> ${request.reason}
      </div>
    </div>
    <div style="background: #fff3cd; padding: 12px; border-radius: 6px; font-size: 13px; color: #856404;">
      💡 승인하면 해당 시간에 출근해야 하며, 정상 급여가 지급됩니다.
    </div>
  `;
  
  modal.style.display = 'flex';
}

/**
 * 교대근무 요청 승인
 */
async function acceptShiftRequest() {
  if (!currentShiftRequestId) return;
  
  try {
    // Firestore 업데이트: 매칭 완료
    await db.collection('shift_requests').doc(currentShiftRequestId).update({
      status: 'matched',
      matchedUserId: currentUser.uid,
      matchedUserName: currentUser.name,
      matchedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('✅ 교대근무를 승인했습니다.\n해당 시간에 출근해주세요.');
    
    // 모달 닫기
    document.getElementById('shiftRequestNotificationModal').style.display = 'none';
    currentShiftRequestId = null;
    
  } catch (error) {
    console.error('교대근무 승인 실패:', error);
    alert('❌ 승인에 실패했습니다: ' + error.message);
  }
}

/**
 * 교대근무 요청 거절
 */
function rejectShiftRequest() {
  // 모달만 닫기 (다른 직원이 승인할 수 있도록)
  document.getElementById('shiftRequestNotificationModal').style.display = 'none';
  currentShiftRequestId = null;
}
