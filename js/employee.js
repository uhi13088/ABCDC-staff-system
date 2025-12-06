// ===================================================================
// 맛남살롱 직원용 시스템 (Firestore 연동)
// 작성자: Employee Portal
// 기능: 출퇴근, 급여조회, 계약서 확인, 공지사항
// ===================================================================

// ===================================================================
// 전역 변수
// ===================================================================

let currentUser = null; // 현재 로그인한 직원 정보
let isLoggingOut = false; // 로그아웃 진행 중 플래그 (의도된 로그아웃 vs 세션 만료 구분)
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
  
  // 🔥 Firebase Auth 초기화 대기 후 상태 확인
  firebase.auth().onAuthStateChanged(async (currentAuthUser) => {
    // 🔒 의도적인 로그아웃인 경우 에러 처리 중단
    if (isLoggingOut) {
      console.log('👋 로그아웃이 정상적으로 처리되었습니다.');
      return;
    }
    
    if (!currentAuthUser) {
      console.error('❌ Firebase Auth 로그인 상태가 아닙니다.');
      alert('⚠️ 세션이 만료되었습니다. 다시 로그인해주세요.');
      sessionStorage.clear();
      window.location.href = 'employee-login.html';
      return;
    }
    
    // 🔥 sessionStorage의 uid와 Firebase Auth의 uid 일치 확인
    if (currentAuthUser.uid !== uid) {
      console.error('❌ 보안 경고: sessionStorage uid와 Firebase Auth uid 불일치!', {
        sessionStorageUid: uid,
        firebaseAuthUid: currentAuthUser.uid
      });
      alert('⚠️ 보안 오류가 감지되었습니다.\n다시 로그인해주세요.');
      sessionStorage.clear();
      await firebase.auth().signOut();
      window.location.href = 'employee-login.html';
      return;
    }
    
    console.log('✅ 보안 검증 완료: sessionStorage uid와 Firebase Auth uid 일치');
    
    // 사용자 정보 로드 (비동기 완료까지 대기)
    await loadUserInfo(uid, name);
  });
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
      
      // 🔥 직원 권한 확인 (staff, manager 허용)
      const userRole = userData.role || 'staff';
      if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'store_manager') {
        console.error('❌ 접근 거부: 직원 포털은 staff/manager 권한만 접근 가능', { role: userRole });
        alert('❌ 접근 권한이 없습니다.\n\n직원 포털은 staff, manager 권한만 접근 가능합니다.\n최고 관리자/회사 관리자/매장 관리자는 관리자 페이지를 이용해주세요.');
        logout();
        return;
      }
      
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
    
    // 교대근무 요청 실시간 모니터링 시작
    monitorShiftRequests();
    
    // 🆕 근무 모집 실시간 모니터링 시작
    monitorOpenShifts();
    
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
    
    // 🆕 근무 모집 실시간 모니터링 시작 (오류 후에도 시작)
    monitorOpenShifts();
  }
}

/**
 * 로그아웃 처리
 * Firebase 로그아웃 및 로그인 페이지로 이동
 */
async function handleLogout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    try {
      isLoggingOut = true; // 🔒 로그아웃 플래그 설정
      
      // 🆕 근무 모집 모니터링 중단
      stopMonitoringOpenShifts();
      
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
      isLoggingOut = false; // 실패 시 플래그 복구
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
  const storeName = currentUser.store || '매장 정보 없음';
  document.getElementById('displayStore').textContent = storeName;
  
  // 페이지 타이틀을 매장명으로 설정 (회사명은 표시 안 함)
  document.title = `${storeName} - 직원 포털`;
  
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
async function showClockIn() {
  if (!currentUser) {
    alert('❌ 로그인 정보가 없습니다.');
    return;
  }
  
  // 오늘 날짜
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = formatTime(now);
  
  try {
    // 오늘 스케줄 조회
    const schedulesSnapshot = await db.collection('schedules')
      .where('companyId', '==', currentUser.companyId)
      .where('userId', '==', currentUser.uid)
      .where('date', '==', dateStr)
      .get();
    
    // 스케줄이 없으면 경고 모달
    if (schedulesSnapshot.empty) {
      showUnscheduledClockInModal('오늘은 예정된 근무가 없습니다.');
      return;
    }
    
    // 스케줄이 있으면 시간 확인
    let hasMatchingSchedule = false;
    let scheduledTimes = [];
    
    schedulesSnapshot.forEach(doc => {
      const schedule = doc.data();
      scheduledTimes.push(`${schedule.startTime} ~ ${schedule.endTime}`);
      
      // 출근 시간 범위 확인 (예정 시작시간 ±30분)
      const scheduledStart = schedule.startTime; // "09:00"
      const [scheduleHour, scheduleMinute] = scheduledStart.split(':').map(Number);
      const scheduleTime = scheduleHour * 60 + scheduleMinute;
      
      const [nowHour, nowMinute] = timeStr.split(':').map(Number);
      const nowTime = nowHour * 60 + nowMinute;
      
      // 출근 허용 범위: 예정 시작시간 30분 전 ~ 예정 시작시간 30분 후
      const diffMinutes = nowTime - scheduleTime;
      if (diffMinutes >= -30 && diffMinutes <= 30) {
        hasMatchingSchedule = true;
      }
    });
    
    // 예정 시간과 맞지 않으면 경고 모달
    if (!hasMatchingSchedule) {
      const timesText = scheduledTimes.join(', ');
      showUnscheduledClockInModal(`예정된 근무시간: ${timesText}\n현재 시간: ${timeStr}\n\n예정 시간과 30분 이상 차이가 납니다.`);
      return;
    }
    
    // 정상 출근
    if (confirm('지금 출근하시겠습니까?')) {
      recordAttendance('출근');
    }
    
  } catch (error) {
    console.error('❌ 스케줄 확인 오류:', error);
    // 오류 발생 시 그냥 출근 처리
    if (confirm('지금 출근하시겠습니까?')) {
      recordAttendance('출근');
    }
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
 * @param {string} unscheduledReason - 예정 외 출근 사유 (옵션)
 */
async function recordAttendance(type, unscheduledReason = null) {
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
    
    console.log('🕐 출퇴근 기록:', { type, uid: currentUser.uid, name: currentUser.name, dateStr, timeStr, unscheduledReason });
    
    // 오늘 기록 확인 (관리자 페이지와 통일: userId 사용)
    // 🔒 companyId 조건 추가 (필수!)
    const todayDocRef = db.collection('attendance')
      .where('companyId', '==', currentUser.companyId)
      .where('userId', '==', currentUser.uid)
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
      
      // 🆕 Phase 5: 오늘 스케줄에서 wageIncentive 조회
      let wageIncentive = null;
      try {
        const scheduleSnapshot = await db.collection('schedules')
          .where('companyId', '==', currentUser.companyId)
          .where('storeId', '==', currentUser.storeId)
          .where('userId', '==', currentUser.uid)
          .where('date', '==', dateStr)
          .get();
        
        if (!scheduleSnapshot.empty) {
          const scheduleData = scheduleSnapshot.docs[0].data();
          if (scheduleData.wageIncentive && scheduleData.wageIncentive > 0) {
            wageIncentive = scheduleData.wageIncentive;
            console.log(`💰 근무 모집 인센티브 발견: ${wageIncentive}원/시간`);
          }
        }
      } catch (error) {
        console.warn('⚠️ 스케줄 조회 실패 (인센티브 확인 스킵):', error);
      }
      
      // 출근 기록 생성/업데이트
      const recordData = {
        userId: currentUser.uid,  // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
        uid: currentUser.uid,     // 하위 호환성 (기존 코드 지원)
        name: currentUser.name,
        store: currentUser.store,
        // 🔒 멀티테넌트 필드 추가
        companyId: currentUser.companyId,
        storeId: currentUser.storeId,
        date: dateStr,
        clockIn: timeStr,
        clockOut: null,
        workType: '정규근무',
        status: '정상',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // 🆕 Phase 5: 인센티브가 있으면 attendance에 저장 (스냅샷)
      if (wageIncentive !== null) {
        recordData.wageIncentive = wageIncentive;
        console.log(`✅ attendance에 wageIncentive 저장: ${wageIncentive}`);
      }
      
      // 예정 외 출근 사유가 있으면 추가
      if (unscheduledReason) {
        recordData.unscheduledClockIn = true;
        recordData.unscheduledReason = unscheduledReason;
      }
      
      let docRef;
      if (snapshot.empty) {
        docRef = await db.collection('attendance').add(recordData);
      } else {
        docRef = snapshot.docs[0].ref;
        await docRef.update({
          clockIn: timeStr,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // 계약서 조회하여 지각/조기출근 체크
      await checkClockInViolation(timeStr, dateStr, docRef, snapshot.empty ? docRef.id : snapshot.docs[0].id);
      
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
      
      // 계약서 근무시간과 비교 체크 (조퇴/초과근무)
      await checkClockOutViolation(todayRecord.clockIn, timeStr, snapshot.docs[0].id, dateStr);
      
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
 * 예정 외 출근 확인 모달 열기
 */
function showUnscheduledClockInModal(warningText) {
  document.getElementById('unscheduledWarningText').textContent = warningText;
  document.getElementById('unscheduledReason').value = '';
  document.getElementById('unscheduledClockInModal').style.display = 'flex';
}

/**
 * 예정 외 출근 확인 모달 닫기
 */
function closeUnscheduledClockInModal() {
  document.getElementById('unscheduledClockInModal').style.display = 'none';
}

/**
 * 예정 외 출근 확정 (사유 포함)
 */
async function confirmUnscheduledClockIn() {
  const reason = document.getElementById('unscheduledReason').value.trim();
  
  if (!reason) {
    alert('⚠️ 출근 사유를 입력해주세요.');
    return;
  }
  
  closeUnscheduledClockInModal();
  
  // 사유를 전역 변수에 저장
  window.unscheduledClockInReason = reason;
  
  // 출근 처리 (사유 포함)
  recordAttendance('출근', reason);
}

/**
 * 계약서 근무시간과 실제 근무시간 비교 체크
 * 시간 외 근무 시 사유 보고 요청
 */
async function checkContractTimeViolation(clockIn, clockOut, attendanceId, attendanceDate) {
  if (!currentUser) return;
  
  try {
    // 계약서 조회 (관리자 페이지와 동일하게 employeeId 사용)
    const contractsSnapshot = await db.collection('contracts')
      .where('companyId', '==', currentUser.companyId)
      .where('employeeId', '==', currentUser.uid)
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
          companyId: currentUser.companyId,
          type: 'violation',
          reportedBy: 'employee',
          userId: currentUser.uid,          // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
          employeeUid: currentUser.uid,    // 하위 호환성 (기존 코드 지원)
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
      .where('companyId', '==', currentUser.companyId)
      .where('userId', '==', currentUser.uid)
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
      .where('companyId', '==', currentUser.companyId)
      .where('userId', '==', currentUser.uid)
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
      .where('companyId', '==', currentUser.companyId)
      .where('userId', '==', currentUser.uid)
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
    let hasRealtimeCalculation = false;
    records.forEach(record => {
      if (!record.clockOut) {
        const now = new Date();
        record.clockOut = now.toTimeString().substring(0, 5); // "HH:MM" 형식
        record.isRealtime = true; // 실시간 계산 표시용
        hasRealtimeCalculation = true;
        console.log(`⏰ 퇴근 기록 없음 - 현재 시간(${record.clockOut})까지 계산`);
      }
    });
    
    // 계약서 정보 가져오기 (salary-calculator.js의 calculateMonthlySalary 사용)
    let latestContract = null;
    try {
      const contractsSnapshot = await db.collection('contracts')
        .where('companyId', '==', currentUser.companyId)
        .where('employeeId', '==', currentUser.uid)
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
        
        latestContract = contracts[0];
        console.log('📝 최신 계약서:', latestContract.salaryType || latestContract.wageType, latestContract.salaryAmount || latestContract.wageAmount);
      } else {
        console.warn('⚠️ 계약서를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ 계약서 조회 오류:', error);
    }
    
    if (!latestContract) {
      document.getElementById('salaryContent').innerHTML = 
        '<div class="alert alert-warning">⚠️ 계약서가 없습니다.<br><br>관리자에게 계약서 작성을 요청하세요.</div>';
      return;
    }
    
    // 직원 정보 생성
    const employee = {
      uid: currentUser.uid,
      name: currentUser.name || currentUser.displayName || '직원',
      store: currentUser.store
    };
    
    // salary-calculator.js의 calculateMonthlySalary 함수 사용
    console.log('💰 급여 계산 시작 (salary-calculator.js 사용)');
    const salaryData = await calculateMonthlySalary(employee, latestContract, records, filterMonth);
    
    console.log('✅ 급여 계산 완료:', salaryData);
    
    // 직원용 페이지에서 사용하는 필드명으로 매핑
    // salary-calculator.js의 contractInfo 사용
    const contractInfo = salaryData.contractInfo || {};
    
    console.log('📋 계약서 기준 조건:', contractInfo);
    
    const employeeSalaryData = {
      wageType: latestContract.salaryType || latestContract.wageType || '시급',
      wageAmount: parseFloat(latestContract.salaryAmount || latestContract.wageAmount) || 0,
      totalHours: salaryData.totalWorkHours,
      baseSalary: salaryData.basePay,
      weeklyHolidayPay: salaryData.weeklyHolidayPay,
      overtimePay: salaryData.overtimePay,
      nightPay: salaryData.nightPay,
      holidayPay: salaryData.holidayPay,
      incentivePay: salaryData.incentivePay || 0, // 🆕 Phase 5: 특별 근무 수당
      severancePay: salaryData.severancePay,
      nationalPension: salaryData.nationalPension,
      healthInsurance: salaryData.healthInsurance,
      longTermCare: salaryData.longTermCare,
      employmentInsurance: salaryData.employmentInsurance,
      incomeTax: salaryData.incomeTax,
      totalDeduction: salaryData.totalDeductions,
      netSalary: salaryData.netPay,
      totalIncome: salaryData.totalPay,
      workDays: salaryData.workDays,
      hourlyWage: salaryData.hourlyWage,
      hasRealtimeCalculation: hasRealtimeCalculation,
      // 계약서 기준 조건 (salary-calculator.js에서 전달)
      has4Insurance: contractInfo.has4Insurance || false,
      hasPension: contractInfo.hasPension || false,
      hasHealthInsurance: contractInfo.hasHealthInsurance || false,
      hasEmploymentInsurance: contractInfo.hasEmploymentInsurance || false,
      isWeeklyHolidayEligible: contractInfo.isWeeklyHolidayEligible || false
    };
    
    renderSalaryInfo(employeeSalaryData);
    
  } catch (error) {
    console.error('❌ 급여 조회 오류:', error);
    document.getElementById('salaryContent').innerHTML = 
      '<div class="alert alert-danger">❌ 데이터를 불러오는 중 오류가 발생했습니다</div>';
  }
}


// 주차 계산 함수 (employee.js용)
function getWeekOfMonth(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const weekNumber = Math.ceil((dayOfMonth + firstDay.getDay()) / 7);
  return `${weekNumber}주차`;
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
  // 월급/연봉인 경우 시급 관련 항목 숨김
  const isHourly = !data.wageType || data.wageType === '시급';
  
  const html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-lg); margin-bottom: var(--spacing-lg);">
      <div class="card" style="text-align: center;">
        <div style="color: var(--text-secondary); font-size: 14px; margin-bottom: var(--spacing-xs);">기본급</div>
        <div style="font-size: 28px; font-weight: 700; color: var(--text-primary);">${formatCurrency(data.baseSalary)}</div>
      </div>
      
      ${isHourly && data.isWeeklyHolidayEligible ? `
      <div class="card" style="text-align: center;">
        <div style="color: var(--text-secondary); font-size: 14px; margin-bottom: var(--spacing-xs);">주휴수당</div>
        <div style="font-size: 28px; font-weight: 700; color: var(--success-color);">${formatCurrency(data.weeklyHolidayPay || 0)}</div>
      </div>
      ` : ''}
      
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
        ${isHourly ? `
        <tr>
          <td>근무 일수</td>
          <td style="text-align: right; font-weight: 600;">${data.workDays || 0}일</td>
        </tr>
        <tr>
          <td>총 근무시간 ${data.hasRealtimeCalculation ? '<span style="color: #f59e0b; font-size: 12px;">⏰ 실시간</span>' : ''}</td>
          <td style="text-align: right; font-weight: 600;">${(data.totalHours || 0).toFixed(1)}시간</td>
        </tr>
        <tr>
          <td>시급</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(data.hourlyWage || 0)}</td>
        </tr>
        ` : ''}
        <tr style="background: #f0f9ff;">
          <td><strong>기본급${!isHourly ? ' (' + (data.wageType || '월급') + ')' : ''}</strong></td>
          <td style="text-align: right; font-weight: 700; color: var(--primary-color);">${formatCurrency(data.baseSalary)}</td>
        </tr>
        ${!isHourly && data.deductedAmount > 0 ? `
        <tr style="background: #fee2e2;">
          <td style="padding-left: 20px; color: var(--danger-color);">
            <strong>차감 (결근/지각/조퇴)</strong>
            <div style="font-size: 12px; color: #666; font-weight: normal; margin-top: 4px;">
              ${data.absenceDays > 0 ? `결근 ${data.absenceDays}일` : ''}
              ${data.absenceDays > 0 && data.missedHours > data.absenceDays * 8 ? ' + ' : ''}
              ${data.missedHours > data.absenceDays * 8 ? `지각/조퇴 ${formatHoursAndMinutes(Math.round((data.missedHours - data.absenceDays * 8) * 60))}` : ''}
            </div>
          </td>
          <td style="text-align: right; font-weight: 700; color: var(--danger-color);">-${formatCurrency(data.deductedAmount)}</td>
        </tr>
        ` : ''}
        ${isHourly && data.isWeeklyHolidayEligible && data.weeklyHolidayPay > 0 ? `
        <tr>
          <td>주휴수당</td>
          <td style="text-align: right; font-weight: 600; color: var(--success-color);">+${formatCurrency(data.weeklyHolidayPay)}</td>
        </tr>
        ` : ''}
        ${data.incentivePay && data.incentivePay > 0 ? `
        <tr style="background: #fff3cd;">
          <td><strong>💰 특별 근무 수당</strong></td>
          <td style="text-align: right; font-weight: 700; color: #d97706;">+${formatCurrency(data.incentivePay)}</td>
        </tr>
        ` : ''}
        ${data.has4Insurance ? `
        <tr style="border-top: 2px solid var(--border-color);">
          <td colspan="2" style="background: #fef3c7; padding: 8px; font-weight: 600;">📊 4대보험 공제 (근로자 부담분)</td>
        </tr>
        ` : ''}
        ${data.hasPension && data.nationalPension > 0 ? `
        <tr>
          <td style="padding-left: 20px;">국민연금 (4.5%)</td>
          <td style="text-align: right; font-weight: 600; color: var(--danger-color);">-${formatCurrency(data.nationalPension)}</td>
        </tr>
        ` : ''}
        ${data.hasHealthInsurance && data.healthInsurance > 0 ? `
        <tr>
          <td style="padding-left: 20px;">건강보험 (3.545%)</td>
          <td style="text-align: right; font-weight: 600; color: var(--danger-color);">-${formatCurrency(data.healthInsurance)}</td>
        </tr>
        ` : ''}
        ${data.hasHealthInsurance && data.longTermCare > 0 ? `
        <tr>
          <td style="padding-left: 20px;">장기요양 (12.95%)</td>
          <td style="text-align: right; font-weight: 600; color: var(--danger-color);">-${formatCurrency(data.longTermCare)}</td>
        </tr>
        ` : ''}
        ${data.hasEmploymentInsurance && data.employmentInsurance > 0 ? `
        <tr>
          <td style="padding-left: 20px;">고용보험 (0.9%)</td>
          <td style="text-align: right; font-weight: 600; color: var(--danger-color);">-${formatCurrency(data.employmentInsurance)}</td>
        </tr>
        ` : ''}
        ${data.incomeTax && data.incomeTax > 0 ? `
        <tr>
          <td style="padding-left: 20px;">소득세 (3.3%)</td>
          <td style="text-align: right; font-weight: 600; color: var(--danger-color);">-${formatCurrency(data.incomeTax)}</td>
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
    console.log('📝 계약서 조회 시작');
    console.log('   사용자 정보:', { uid: currentUser.uid, name: currentUser.name, companyId: currentUser.companyId });
    
    const contracts = [];
    
    // 🔒 Firestore에서 계약서 조회 (companyId + employeeId 필수)
    const snapshot = await db.collection('contracts')
      .where('companyId', '==', currentUser.companyId)
      .where('employeeId', '==', currentUser.uid)
      .get();
    
    console.log(`   ✅ 조회 결과: ${snapshot.size}개 계약서`);
    
    for (const doc of snapshot.docs) {
      const contractData = doc.data();
      const contractId = doc.id;
      
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
    

    
    if (contracts.length === 0) {
      document.getElementById('contractContent').innerHTML = 
        '<div class="alert alert-info">📄 작성된 계약서가 없습니다.<br><br>관리자가 계약서를 작성하면 여기에 표시됩니다.</div>';
      return;
    }
    
    // 날짜 기준 정렬 (최신순 - 서명 여부와 무관하게 작성일 기준)
    contracts.sort((a, b) => {
      // 여러 날짜 필드 중 가장 최근 것을 사용
      const getLatestDate = (contract) => {
        const dates = [];
        
        // 1. createdAt (작성일) - 가장 확실한 기준
        if (contract.createdAt) {
          dates.push(new Date(contract.createdAt));
        }
        
        // 2. savedAt (저장일)
        if (contract.savedAt) {
          dates.push(new Date(contract.savedAt));
        }
        
        // 3. contractStartDate (계약 시작일)
        if (contract.contractStartDate) {
          dates.push(new Date(contract.contractStartDate));
        } else if (contract.startDate) {
          dates.push(new Date(contract.startDate));
        }
        
        // 가장 최근 날짜 반환, 없으면 epoch
        return dates.length > 0 ? Math.max(...dates) : 0;
      };
      
      const dateA = getLatestDate(a);
      const dateB = getLatestDate(b);
      
      return dateB - dateA; // 내림차순 (최신 먼저)
    });
    
    renderContracts(contracts);
    
  } catch (error) {
    console.error('❌ 계약서 조회 오류:', error);
    document.getElementById('contractContent').innerHTML = 
      '<div class="alert alert-danger">❌ 계약서를 불러오지 못했습니다. (보안 권한 오류 등)<br><br>💡 관리자에게 문의하세요.</div>';
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
              <td style="padding: 8px 0; font-weight: 600;">${contract.contractStartDate || '-'} ~ ${contract.contractEndDate || '기간의 정함 없음'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: var(--text-secondary);">직책/직무</td>
              <td style="padding: 8px 0; font-weight: 600;">${contract.position || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: var(--text-secondary);">급여 조건</td>
              <td style="padding: 8px 0; font-weight: 600;">${contract.salaryType || contract.wageType || '-'} ${(contract.salaryAmount || contract.wageAmount) ? Number(contract.salaryAmount || contract.wageAmount).toLocaleString() + '원' : ''}</td>
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
              `<button class="btn btn-secondary" onclick="viewEmployeeContract('${contract.contractId}')">📄 계약서 상세보기</button>` :
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
 * 계약서 상세보기 (관리자 페이지 모달 사용)
 * @param {string} contractId - 계약서 ID
 */
async function viewEmployeeContract(contractId) {
  // contract-viewer.js의 viewContract 함수 호출
  if (typeof window.viewContract === 'function') {
    await window.viewContract(contractId);
  } else if (typeof viewContract === 'function') {
    await viewContract(contractId);
  } else {
    console.error('❌ viewContract 함수를 찾을 수 없습니다. contract-viewer.js가 로드되었는지 확인하세요.');
    alert('⚠️ 계약서 상세보기 기능을 불러올 수 없습니다.');
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
      .where('companyId', '==', currentUser.companyId)
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
    
    // 공지사항이 있을 때
    if (notices.length > 0) {
      const unifiedList = document.getElementById('unifiedNoticeList');
      
      // 중요 공지사항을 앞에, 일반 공지사항을 뒤에 정렬
      const sortedNotices = notices.sort((a, b) => {
        // 중요 공지사항 우선
        if (a.important && !b.important) return -1;
        if (!a.important && b.important) return 1;
        
        // 같은 타입이면 날짜순
        return b.createdAt?.toMillis() - a.createdAt?.toMillis();
      });
      
      // 최신 5개만 표시
      const displayNotices = sortedNotices.slice(0, 5);
      
      unifiedList.innerHTML = displayNotices.map((notice, index) => {
        const dateStr = formatFirestoreTimestamp(notice.createdAt);
        const isImportant = notice.important;
        
        return `
          <div class="notice-item">
            <div class="notice-item-title">
              ${isImportant ? '<span style="color: #dc2626;">⭐</span>' : ''}
              <span style="color: ${isImportant ? '#dc2626' : 'var(--text-primary)'};">${notice.title}</span>
            </div>
            <div class="notice-item-content">${notice.content}</div>
            <div class="notice-item-date">${dateStr}</div>
          </div>
        `;
      }).join('');
      
      // 더 많은 공지사항이 있을 때 안내
      if (sortedNotices.length > 5) {
        unifiedList.innerHTML += `
          <div style="text-align: center; padding: 12px 0; color: var(--text-secondary); font-size: 13px;">
            외 ${sortedNotices.length - 5}개의 공지사항이 더 있습니다.
          </div>
        `;
      }
      
      document.getElementById('noNoticeMessage').style.display = 'none';
    } else {
      // 공지사항이 없을 때
      document.getElementById('unifiedNoticeList').innerHTML = '';
      document.getElementById('noNoticeMessage').style.display = 'block';
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

/**
 * 보건증 만료 체크 및 알림
 * 만료 1달 이내면 갱신 요청 팝업 표시
 */
async function checkHealthCertExpiry() {
  if (!currentUser) return;
  
  try {
    const docRef = await db.collection('employee_docs').doc(currentUser.uid).get();
    
    if (docRef.exists) {
      const docs = docRef.data();
      
      if (docs.healthCert && docs.healthCert.expiryDate) {
        const expiryDate = new Date(docs.healthCert.expiryDate);
        const today = new Date();
        
        // 오늘 날짜를 00:00:00으로 설정
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);
        
        // 남은 일수 계산
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        console.log('📄 보건증 만료 체크:', {
          expiryDate: docs.healthCert.expiryDate,
          diffDays: diffDays
        });
        
        if (diffDays < 0) {
          // 만료됨
          alert('⚠️ 보건증이 만료되었습니다!\n\n만료일: ' + docs.healthCert.expiryDate + '\n\n긴급히 보건증을 갱신해주세요.');
        } else if (diffDays <= 30) {
          // 30일 이내 만료 예정
          alert('🔔 보건증 갱신 안내\n\n만료일: ' + docs.healthCert.expiryDate + '\n남은 기간: ' + diffDays + '일\n\n보건증 갱신을 준비해주세요.');
        }
      }
    }
  } catch (error) {
    console.error('❌ 보건증 만료 체크 오류:', error);
  }
}

/**
 * 관리자 근무시간 수정 알림 체크
 * 로그인 시 관리자가 수정한 내역이 있으면 모달로 표시
 */
async function checkAdminTimeEdits() {
  if (!currentUser) return;
  
  try {
    // 최근 7일 이내의 관리자 수정 조회 (읽지 않은 것만)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const reportsSnapshot = await db.collection('time_change_reports')
      .where('companyId', '==', currentUser.companyId)
      .where('employeeUid', '==', currentUser.uid)
      .where('type', '==', 'admin_edit')
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(sevenDaysAgo))
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    if (reportsSnapshot.empty) {
      console.log('📋 관리자 수정 내역 없음');
      return;
    }
    
    // 읽지 않은 알림 필터링 (notified 필드가 없거나 false인 것)
    const unreadReports = [];
    reportsSnapshot.forEach(doc => {
      const report = doc.data();
      if (!report.notified) {
        unreadReports.push({ id: doc.id, ...report });
      }
    });
    
    if (unreadReports.length === 0) {
      console.log('📋 읽지 않은 관리자 수정 내역 없음');
      return;
    }
    
    // 모달에 수정 이력 표시
    showAdminEditNotificationModal(unreadReports);
    
  } catch (error) {
    console.error('❌ 관리자 수정 알림 체크 오류:', error);
    // 에러가 있어도 메인 화면은 표시
  }
}

/**
 * 관리자 수정 알림 모달 표시
 * @param {Array} reports - 읽지 않은 관리자 수정 보고서 목록
 */
function showAdminEditNotificationModal(reports) {
  const listDiv = document.getElementById('adminEditList');
  
  let html = '';
  reports.forEach((report, index) => {
    const date = report.createdAt ? report.createdAt.toDate().toLocaleDateString('ko-KR') : '-';
    const time = report.createdAt ? report.createdAt.toDate().toLocaleTimeString('ko-KR') : '-';
    
    html += `
      <div style="padding: var(--spacing-lg); background: white; border: 1px solid var(--border-color); border-radius: var(--border-radius);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
          <div style="font-weight: 600; font-size: 16px; color: var(--primary-color);">
            📋 수정 내역 ${index + 1}
          </div>
          <div style="font-size: 13px; color: var(--text-secondary);">
            ${date} ${time}
          </div>
        </div>
        
        <div style="display: grid; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 13px; color: var(--text-secondary); min-width: 70px;">관리자:</span>
            <span style="font-weight: 500;">${report.adminName || '관리자'}</span>
          </div>
          ${report.attendanceDate ? `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 13px; color: var(--text-secondary); min-width: 70px;">근무일:</span>
            <span style="font-weight: 500;">${report.attendanceDate}</span>
          </div>
          ` : ''}
        </div>
        
        <div style="background: var(--bg-light); padding: var(--spacing-md); border-radius: var(--border-radius); margin-bottom: var(--spacing-md);">
          <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--spacing-sm); align-items: center;">
            <div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">변경 전</div>
              <div style="font-weight: 600; color: var(--danger-color);">
                ${report.oldTime ? `${report.oldTime.clockIn} ~ ${report.oldTime.clockOut}` : '-'}
              </div>
            </div>
            <div style="text-align: center; font-size: 20px;">→</div>
            <div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">변경 후</div>
              <div style="font-weight: 600; color: var(--success-color);">
                ${report.newTime ? `${report.newTime.clockIn} ~ ${report.newTime.clockOut}` : '-'}
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">📝 수정 사유</div>
          <div style="padding: var(--spacing-md); background: white; border: 1px solid var(--border-color); border-radius: var(--border-radius); line-height: 1.6;">
            ${report.reason || '-'}
          </div>
        </div>
      </div>
    `;
  });
  
  listDiv.innerHTML = html;
  document.getElementById('adminEditNotificationModal').style.display = 'flex';
  
  // 모달 닫힐 때 notified 플래그 업데이트할 수 있도록 reports 저장
  window.currentUnreadReports = reports;
}

/**
 * 관리자 수정 알림 모달 닫기
 */
async function closeAdminEditNotificationModal() {
  document.getElementById('adminEditNotificationModal').style.display = 'none';
  
  // 읽음 처리
  if (window.currentUnreadReports && window.currentUnreadReports.length > 0) {
    try {
      const batch = db.batch();
      window.currentUnreadReports.forEach(report => {
        const docRef = db.collection('time_change_reports').doc(report.id);
        batch.update(docRef, { notified: true });
      });
      await batch.commit();
      
      console.log(`✅ ${window.currentUnreadReports.length}건의 관리자 수정 알림 읽음 처리 완료`);
      window.currentUnreadReports = null;
    } catch (error) {
      console.error('❌ 읽음 처리 오류:', error);
    }
  }
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
    // 문서 승인 (구매/폐기/퇴직서) 조회
    const approvalsSnapshot = await db.collection('approvals')
      .where('companyId', '==', currentUser.companyId)
      .where('applicantUid', '==', currentUser.uid)
      .get();
    
    // 교대근무 신청 조회
    const shiftRequestsSnapshot = await db.collection('shift_requests')
      .where('companyId', '==', currentUser.companyId)
      .where('requesterId', '==', currentUser.uid)
      .get();
    
    const allRequests = [];
    
    // 문서 승인 추가
    approvalsSnapshot.forEach(doc => {
      allRequests.push({
        id: doc.id,
        collection: 'approvals',
        ...doc.data()
      });
    });
    
    // 교대근무 신청 추가
    shiftRequestsSnapshot.forEach(doc => {
      const data = doc.data();
      allRequests.push({
        id: doc.id,
        collection: 'shift_requests',
        type: 'shift',
        status: data.finalApprovalStatus || 'pending',
        createdAt: data.createdAt,
        data: data
      });
    });
    
    if (allRequests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);"><div style="font-size: 48px; margin-bottom: 16px;">📝</div><p>아직 신청한 문서가 없습니다.</p><p style="font-size: 13px; margin-top: 8px;">상단의 버튼을 눌러 문서를 신청해보세요!</p></td></tr>';
      return;
    }
    
    // 클라이언트 측에서 날짜순 정렬 (최신순)
    allRequests.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
    
    const typeEmoji = {
      'purchase': '💳',
      'disposal': '🗑️',
      'absence': '🏥',
      'resignation': '📄',
      'shift': '🔄'
    };
    
    const typeText = {
      'purchase': '구매',
      'disposal': '폐기',
      'absence': '결근',
      'resignation': '퇴직서',
      'shift': '교대근무'
    };
    
    const statusBadge = {
      'pending': '<span class="badge badge-warning" style="background: #ffc107; color: #000;">대기중</span>',
      'approved': '<span class="badge badge-success">승인됨</span>',
      'rejected': '<span class="badge badge-danger">거부됨</span>',
      'cancelled': '<span class="badge" style="background: #999; color: white;">취소됨</span>'
    };
    
    tbody.innerHTML = allRequests.map(request => {
      const createdDate = request.createdAt?.toDate?.() ? request.createdAt.toDate().toLocaleString('ko-KR') : '-';
      
      // 요약 정보
      let summary = '';
      if (request.type === 'purchase') {
        const items = request.data?.items || [];
        summary = items.length > 0 ? `${items[0].item} 외 ${items.length - 1}건` : '-';
      } else if (request.type === 'disposal') {
        summary = `${request.data?.category || '-'}`;
      } else if (request.type === 'absence') {
        summary = `${request.data?.date || '-'} ${request.data?.startTime || ''}-${request.data?.endTime || ''}`;
      } else if (request.type === 'resignation') {
        summary = `희망일: ${request.data?.resignationDate || '-'}`;
      } else if (request.type === 'shift') {
        summary = `${request.data?.workDate || '-'} ${request.data?.workStartTime || ''}-${request.data?.workEndTime || ''}`;
      }
      
      const detailButton = request.collection === 'approvals' 
        ? `<button class="btn btn-sm" style="background: var(--primary-color); color: white;" onclick="viewMyApprovalDetail('${request.id}')">
            📄 상세보기
          </button>`
        : `<button class="btn btn-sm" style="background: var(--info-color); color: white;" onclick="viewShiftRequestDetail('${request.id}')">
            📄 상세보기
          </button>`;
      
      // 거부 사유 표시
      const rejectInfo = request.status === 'rejected' && request.rejectReason 
        ? `<br><small style="color: var(--danger-color);">거부 사유: ${request.rejectReason}</small>`
        : '';
      
      return `
        <tr>
          <td>${typeEmoji[request.type] || ''} ${typeText[request.type] || '-'}</td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${summary}</td>
          <td style="font-size: 12px;">${createdDate}</td>
          <td>${statusBadge[request.status] || '-'}${rejectInfo}</td>
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
      userId: currentUser.uid,          // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
      applicantUid: currentUser.uid,    // 하위 호환성 (기존 코드 지원)
      applicantName: currentUser.name,
      applicantEmail: currentUser.email,
      companyId: currentUser.companyId,
      storeId: currentUser.storeId,
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
      userId: currentUser.uid,          // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
      applicantUid: currentUser.uid,    // 하위 호환성 (기존 코드 지원)
      applicantName: currentUser.name,
      applicantEmail: currentUser.email,
      companyId: currentUser.companyId,
      storeId: currentUser.storeId,
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

// ===================================================================
// 결근 신청 (Absence Request)
// ===================================================================

// 결근 신청 모달 열기
function showAbsenceRequestModal() {
  document.getElementById('absenceRequestModal').style.display = 'flex';
  
  // 초기화
  document.getElementById('absenceDate').value = '';
  document.getElementById('absenceStartTime').value = '';
  document.getElementById('absenceEndTime').value = '';
  document.getElementById('absenceReason').value = '';
  
  // 오늘 날짜 기본값 설정
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('absenceDate').value = today;
}

function closeAbsenceRequestModal() {
  document.getElementById('absenceRequestModal').style.display = 'none';
}

// 결근 신청 제출
async function submitAbsenceRequest() {
  console.log('🏥 submitAbsenceRequest 호출, currentUser:', currentUser);
  
  if (!currentUser) {
    alert('❌ 로그인이 필요합니다.');
    return;
  }
  
  const date = document.getElementById('absenceDate').value;
  const startTime = document.getElementById('absenceStartTime').value;
  const endTime = document.getElementById('absenceEndTime').value;
  const reason = document.getElementById('absenceReason').value.trim();
  
  // 유효성 검사
  if (!date || !startTime || !endTime || !reason) {
    alert('⚠️ 모든 항목을 입력해주세요.');
    return;
  }
  
  // 시간 검증
  if (startTime >= endTime) {
    alert('⚠️ 종료 시간은 시작 시간보다 늦어야 합니다.');
    return;
  }
  
  try {
    console.log('📤 Firestore에 결근 신청 저장 시도:', { 
      date, startTime, endTime, reason, currentUser 
    });
    
    await db.collection('approvals').add({
      type: 'absence',
      userId: currentUser.uid,          // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
      applicantUid: currentUser.uid,    // 하위 호환성 (기존 코드 지원)
      applicantName: currentUser.name,
      applicantEmail: currentUser.email,
      companyId: currentUser.companyId,
      storeId: currentUser.storeId,
      status: 'pending',
      data: {
        date: date,
        startTime: startTime,
        endTime: endTime,
        reason: reason,
        storeName: currentUser.store || '매장 정보 없음'
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ 결근 신청 저장 성공');
    alert('✅ 결근 신청이 완료되었습니다.\n\n관리자 승인 후 효력이 발생합니다.');
    closeAbsenceRequestModal();
    loadMyApprovals();
    
  } catch (error) {
    console.error('❌ 결근 신청 실패 상세:', error);
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
    // 🔥 서명 이미지를 Firebase Storage에 업로드
    const signatureBlob = await fetch(signatureDataURL).then(res => res.blob());
    const signatureFileName = `resignation_signatures/${currentUser.uid}_${Date.now()}.png`;
    const signatureRef = firebase.storage().ref().child(signatureFileName);
    
    console.log('📤 서명 이미지 업로드 중...', signatureFileName);
    const uploadTask = await signatureRef.put(signatureBlob);
    const signatureURL = await uploadTask.ref.getDownloadURL();
    console.log('✅ 서명 이미지 업로드 완료:', signatureURL);
    
    // Firestore에는 URL만 저장 (Base64 대신)
    await db.collection('approvals').add({
      type: 'resignation',
      userId: currentUser.uid,          // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
      applicantUid: currentUser.uid,    // 하위 호환성 (기존 코드 지원)
      applicantName: currentUser.name,
      applicantEmail: currentUser.email,
      companyId: currentUser.companyId,
      storeId: currentUser.storeId,
      status: 'pending',
      data: {
        name: name,
        resignationDate: resignationDate,
        reason: reason,
        employeeSignatureURL: signatureURL  // ✅ URL만 저장 (Base64 대신)
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
  try {
    const doc = await db.collection('approvals').doc(approvalId).get();
    if (!doc.exists) {
      alert('❌ 문서를 찾을 수 없습니다.');
      return;
    }
    
    const approval = doc.data();
    const typeText = {
      'purchase': '구매 신청',
      'disposal': '폐기 신청',
      'absence': '결근 신청',
      'resignation': '퇴직서 신청'
    };
    
    const statusText = {
      'pending': '승인 대기중',
      'approved': '승인됨',
      'rejected': '거부됨'
    };
    
    let detailHtml = '';
    
    if (approval.type === 'purchase') {
      const items = approval.data?.items || [];
      detailHtml = `
        <h4>구매 물품</h4>
        ${items.map((item, idx) => `
          <div style="border: 1px solid var(--border-color); padding: 12px; margin: 8px 0; border-radius: 4px;">
            <strong>${idx + 1}. ${item.item}</strong><br>
            구매처: ${item.vendor}<br>
            가격: ${parseInt(item.price).toLocaleString()}원<br>
            수량: ${item.quantity}개
          </div>
        `).join('')}
        <p><strong>총 금액:</strong> ${parseInt(approval.data?.totalPrice || 0).toLocaleString()}원</p>
        <p><strong>구매 사유:</strong> ${approval.data?.reason || '-'}</p>
      `;
    } else if (approval.type === 'disposal') {
      detailHtml = `
        <p><strong>품목:</strong> ${approval.data?.category || '-'}</p>
        <p><strong>사유:</strong> ${approval.data?.reason || '-'}</p>
      `;
    } else if (approval.type === 'absence') {
      detailHtml = `
        <p><strong>결근 날짜:</strong> ${approval.data?.date || '-'}</p>
        <p><strong>시간:</strong> ${approval.data?.startTime || '-'} ~ ${approval.data?.endTime || '-'}</p>
        <p><strong>매장:</strong> ${approval.data?.storeName || '-'}</p>
        <p><strong>사유:</strong> ${approval.data?.reason || '-'}</p>
      `;
    } else if (approval.type === 'resignation') {
      detailHtml = `
        <p><strong>희망 퇴직일:</strong> ${approval.data?.resignationDate || '-'}</p>
        <p><strong>사유:</strong> ${approval.data?.reason || '-'}</p>
      `;
    }
    
    const rejectInfo = approval.status === 'rejected' && approval.rejectReason
      ? `<div style="background: #ffebee; border-left: 4px solid #f44336; padding: 12px; margin-top: 12px;">
          <strong style="color: #f44336;">거부 사유:</strong><br>
          ${approval.rejectReason}
        </div>`
      : '';
    
    alert(`📄 ${typeText[approval.type] || '문서'} 상세 정보\n\n상태: ${statusText[approval.status]}\n신청일: ${approval.createdAt?.toDate?.()?.toLocaleString('ko-KR') || '-'}\n\n${detailHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')}\n\n${approval.rejectReason ? '거부 사유: ' + approval.rejectReason : ''}`);
    
  } catch (error) {
    console.error('❌ 상세보기 오류:', error);
    alert('❌ 상세 정보를 불러오는데 실패했습니다.');
  }
}

async function viewShiftRequestDetail(requestId) {
  try {
    const doc = await db.collection('shift_requests').doc(requestId).get();
    if (!doc.exists) {
      alert('❌ 교대근무 신청을 찾을 수 없습니다.');
      return;
    }
    
    const request = doc.data();
    
    const statusText = {
      'pending': '대타 찾는 중',
      'matched': '대타 승인 대기',
      'approved': '최종 승인됨',
      'rejected': '거부됨',
      'cancelled': '취소됨'
    };
    
    let detailText = `📄 교대근무 신청 상세 정보\n\n`;
    detailText += `상태: ${statusText[request.finalApprovalStatus] || '알 수 없음'}\n`;
    detailText += `신청일: ${request.createdAt?.toDate?.()?.toLocaleString('ko-KR') || '-'}\n\n`;
    detailText += `근무 날짜: ${request.workDate}\n`;
    detailText += `근무 시간: ${request.workStartTime} ~ ${request.workEndTime}\n`;
    detailText += `사유: ${request.reason || '-'}\n\n`;
    
    if (request.matchedUserId && request.matchedUserName) {
      detailText += `대타 직원: ${request.matchedUserName}\n`;
      detailText += `대타 승인일: ${request.matchedAt?.toDate?.()?.toLocaleString('ko-KR') || '-'}\n`;
    }
    
    if (request.finalApprovalStatus === 'approved' && request.approvedAt) {
      detailText += `\n최종 승인일: ${request.approvedAt.toDate().toLocaleString('ko-KR')}`;
    }
    
    if (request.finalApprovalStatus === 'rejected' && request.rejectReason) {
      detailText += `\n\n거부 사유: ${request.rejectReason}`;
    }
    
    alert(detailText);
    
  } catch (error) {
    console.error('❌ 상세보기 오류:', error);
    alert('❌ 상세 정보를 불러오는데 실패했습니다.');
  }
}

// ===================================================================
// 근무시간 수정 (직원)
// ===================================================================

let currentEditAttendanceId = null;

/**
 * 근무시간 수정 모달 열기
 */
function showEditAttendanceModal(attendanceId, date, clockIn, clockOut) {
  currentEditAttendanceId = attendanceId;
  
  document.getElementById('editDate').value = date;
  document.getElementById('editClockIn').value = clockIn;
  document.getElementById('editClockOut').value = clockOut;
  document.getElementById('editReason').value = '';
  
  document.getElementById('editAttendanceModal').style.display = 'flex';
}

/**
 * 근무시간 수정 모달 닫기
 */
function closeEditAttendanceModal() {
  document.getElementById('editAttendanceModal').style.display = 'none';
  currentEditAttendanceId = null;
}

/**
 * 근무시간 수정 제출
 */
async function submitAttendanceEdit() {
  if (!currentUser || !currentEditAttendanceId) return;
  
  const clockIn = document.getElementById('editClockIn').value;
  const clockOut = document.getElementById('editClockOut').value;
  const reason = document.getElementById('editReason').value.trim();
  
  if (!clockIn || !clockOut) {
    alert('⚠️ 출근시간과 퇴근시간을 모두 입력해주세요.');
    return;
  }
  
  if (!reason) {
    alert('⚠️ 수정 사유를 입력해주세요.');
    return;
  }
  
  try {
    // 기존 데이터 조회
    const attendanceDoc = await db.collection('attendance').doc(currentEditAttendanceId).get();
    if (!attendanceDoc.exists) {
      alert('❌ 근무 기록을 찾을 수 없습니다.');
      return;
    }
    
    const oldData = attendanceDoc.data();
    
    // 근무시간 업데이트
    await db.collection('attendance').doc(currentEditAttendanceId).update({
      clockIn: clockIn,
      clockOut: clockOut,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastEditedBy: 'employee'
    });
    
    // 변경 보고 저장
    await db.collection('time_change_reports').add({
      companyId: currentUser.companyId,
      type: 'employee_edit',
      reportedBy: 'employee',
      userId: currentUser.uid,          // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
      employeeUid: currentUser.uid,    // 하위 호환성 (기존 코드 지원)
      employeeName: currentUser.name,
      attendanceId: currentEditAttendanceId,
      attendanceDate: oldData.date || '-',
      oldTime: {
        clockIn: oldData.clockIn,
        clockOut: oldData.clockOut
      },
      newTime: {
        clockIn: clockIn,
        clockOut: clockOut
      },
      reason: reason,
      status: 'reported',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('✅ 근무시간이 수정되었습니다.\n사유가 관리자에게 보고되었습니다.');
    closeEditAttendanceModal();
    loadAttendance();
    
  } catch (error) {
    console.error('❌ 근무시간 수정 오류:', error);
    alert('❌ 수정 중 오류가 발생했습니다.\n\n' + error.message);
  }
}

// ===================================================================
// 근무기록 상세 모달
// ===================================================================

/**
 * 근무기록 상세 모달 표시
 * @param {string} attendanceId - 근태 문서 ID
 * @param {string} date - 날짜
 * @param {string} clockIn - 출근시간
 * @param {string} clockOut - 퇴근시간
 * @param {string} workType - 근무타입
 */
async function showAttendanceDetailModal(attendanceId, date, clockIn, clockOut, workType) {
  if (!currentUser) return;
  
  try {
    // 기본 정보 표시
    document.getElementById('empDetailEmployeeName').textContent = currentUser.name || '-';
    document.getElementById('empDetailDate').textContent = date || '-';
    document.getElementById('empDetailWorkType').textContent = workType || '정규근무';
    document.getElementById('empDetailClockIn').textContent = clockIn || '-';
    document.getElementById('empDetailClockOut').textContent = clockOut || '-';
    
    // 근무시간 계산
    if (clockIn && clockOut) {
      const workHours = calculateWorkTime(clockIn, clockOut);
      document.getElementById('empDetailWorkHours').textContent = workHours;
    } else {
      document.getElementById('empDetailWorkHours').textContent = '-';
    }
    
    // 상태 계산
    const statusObj = calculateAttendanceStatus({ clockIn, clockOut });
    document.getElementById('empDetailStatus').innerHTML = 
      `<span class="badge badge-${statusObj.class}">${statusObj.text}</span>`;
    
    // 수정 이력 로드
    await loadEmployeeEditHistory(attendanceId);
    
    // 모달 표시
    document.getElementById('attendanceDetailModal').style.display = 'flex';
    
  } catch (error) {
    console.error('❌ 상세 모달 표시 오류:', error);
    alert('❌ 상세 정보를 불러오는 중 오류가 발생했습니다.');
  }
}

/**
 * 근무기록 상세 모달 닫기
 */
function closeAttendanceDetailModal() {
  document.getElementById('attendanceDetailModal').style.display = 'none';
}

/**
 * 직원용 수정 이력 로드
 * @param {string} attendanceId - 근태 문서 ID
 */
async function loadEmployeeEditHistory(attendanceId) {
  const historyDiv = document.getElementById('empDetailEditHistory');
  const contentDiv = document.getElementById('empDetailEditHistoryContent');
  
  try {
    const reportsSnapshot = await db.collection('time_change_reports')
      .where('companyId', '==', currentUser.companyId)
      .where('attendanceId', '==', attendanceId)
      .orderBy('createdAt', 'desc')
      .get();
    
    if (reportsSnapshot.empty) {
      historyDiv.style.display = 'none';
      return;
    }
    
    let html = '<div style="display: grid; gap: 12px;">';
    
    reportsSnapshot.forEach(doc => {
      const report = doc.data();
      const date = report.createdAt ? report.createdAt.toDate().toLocaleString('ko-KR') : '-';
      
      // 수정 타입 결정
      let reportType = '';
      let reporterName = '';
      let badgeClass = '';
      
      if (report.type === 'violation') {
        reportType = '⚠️ 계약서 외 근무';
        reporterName = report.employeeName || '직원';
        badgeClass = 'warning';
      } else if (report.type === 'employee_edit') {
        reportType = '✏️ 직원 수정';
        reporterName = report.employeeName || '직원';
        badgeClass = 'info';
      } else if (report.type === 'admin_edit') {
        reportType = '👨‍💼 관리자 수정';
        reporterName = report.adminName || '관리자';
        badgeClass = 'primary';
      } else {
        reportType = '📝 기타 변경';
        reporterName = '-';
        badgeClass = 'secondary';
      }
      
      html += `
        <div style="padding: 12px; background: white; border: 1px solid var(--border-color); border-radius: var(--border-radius);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="badge badge-${badgeClass}">${reportType}</span>
            <span style="font-size: 12px; color: var(--text-secondary);">${date}</span>
          </div>
          
          <div style="margin-bottom: 8px;">
            <strong>수정자:</strong> ${reporterName}
          </div>
          
          <div style="background: var(--bg-light); padding: 8px; border-radius: 4px; margin-bottom: 8px;">
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center;">
              <div>
                <div style="font-size: 11px; color: var(--text-secondary);">변경 전</div>
                <div style="font-weight: 600; color: var(--danger-color);">
                  ${report.oldTime ? `${report.oldTime.clockIn} ~ ${report.oldTime.clockOut}` : '-'}
                </div>
              </div>
              <div style="text-align: center;">→</div>
              <div>
                <div style="font-size: 11px; color: var(--text-secondary);">변경 후</div>
                <div style="font-weight: 600; color: var(--success-color);">
                  ${report.newTime ? `${report.newTime.clockIn} ~ ${report.newTime.clockOut}` : '-'}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">📝 사유</div>
            <div style="font-size: 13px; line-height: 1.5; padding: 8px; background: #f8f9fa; border-radius: 4px;">
              ${report.reason || '-'}
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    contentDiv.innerHTML = html;
    historyDiv.style.display = 'block';
    
  } catch (error) {
    console.error('❌ 수정 이력 조회 오류:', error);
    historyDiv.style.display = 'none';
  }
}

// ===================================================================
// 내 스케줄 기능
// ===================================================================

let currentEmployeeWeek = new Date();
let showStoreSchedule = false; // 기본값: 내 근무만 보기 (false), 매장 전체보기 (true)
let currentEmployeeScheduleData = null; // 현재 스케줄 데이터 캐시

/**
 * 주차 변경
 */
function changeEmployeeWeek(offset) {
  currentEmployeeWeek.setDate(currentEmployeeWeek.getDate() + (offset * 7));
  loadEmployeeSchedule();
}

/**
 * 토글 스위치: 내 근무만 보기 / 매장 전체 스케줄
 * OFF (unchecked) = 내 근무만 보기 (기본)
 * ON (checked) = 매장 전체보기
 */
function toggleEmployeeScheduleView() {
  const toggle = document.getElementById('showStoreScheduleToggle');
  showStoreSchedule = toggle.checked;
  console.log(`🔄 토글 전환: showStoreSchedule = ${showStoreSchedule} (${showStoreSchedule ? '매장 전체' : '내 근무만'})`);
  
  // 토글 전환 시 무조건 다시 로드 (캐시 사용 안 함)
  loadEmployeeSchedule();
}

/**
 * 월요일 날짜 구하기
 */
function getEmployeeMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * 주차 번호 구하기
 */
function getEmployeeWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * 내 스케줄 로드
 */
/**
 * 직원 스케줄 로드 (리팩토링 버전 - schedule-viewer.js 모듈 사용)
 */
async function loadEmployeeSchedule() {
  if (!currentUser) return;
  
  // 🔒 companyId 누락 시 실행 방지 및 알림
  if (!currentUser.companyId) {
    console.error('❌ currentUser 객체에 companyId가 없습니다:', currentUser);
    document.getElementById('employeeScheduleContainer').innerHTML = 
      '<div class="alert alert-danger">계정 정보 오류: 소속 회사 정보(companyId)가 없습니다.<br>관리자에게 문의하여 계정 정보를 업데이트해주세요.</div>';
    return;
  }
  
  const monday = getEmployeeMonday(currentEmployeeWeek);
  const year = monday.getFullYear();
  const weekNum = getEmployeeWeekNumber(monday);
  
  // 주차 표시 업데이트
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  document.getElementById('employeeWeekDisplay').textContent = 
    `${year}년 ${weekNum}주차 (${monday.getMonth()+1}/${monday.getDate()} ~ ${sunday.getMonth()+1}/${sunday.getDate()})`;
  
  try {
    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];
    
    const showStoreSchedule = document.getElementById('showStoreScheduleToggle')?.checked || false;
    
    console.log(`📅 스케줄 조회 시작 (${showStoreSchedule ? '매장 전체' : '내 근무만'})`);
    console.log(`   사용자: ${currentUser.name} (uid: ${currentUser.uid})`);
    console.log(`   기간: ${mondayStr} ~ ${sundayStr}`);
    
    // 🆕 리팩토링: schedule-viewer.js의 loadScheduleData() 사용
    const data = await window.loadScheduleData(db, {
      type: 'employee',
      companyId: currentUser.companyId, // 🔥 필수! (v3.6 보안 규칙)
      userId: currentUser.uid,
      userName: currentUser.name,
      storeName: showStoreSchedule ? currentUser.store : null,
      startDate: mondayStr,
      endDate: sundayStr
    });
    
    // 데이터 구조 검증
    if (!data || data.type !== 'schedule' || !Array.isArray(data.employees)) {
      throw new Error('Invalid data structure from loadScheduleData');
    }
    
    currentEmployeeScheduleData = data;
    
    // 스케줄이 없을 때 안내 메시지
    const hasSchedules = data.employees.some(emp => 
      Object.values(emp.schedules).some(daySchedules => daySchedules.length > 0)
    );
    
    if (!hasSchedules) {
      console.warn(`   📭 이번 주 스케줄이 없습니다.`);
      document.getElementById('employeeScheduleContainer').innerHTML = 
        '<div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">' +
        '<div style="font-size: 48px; margin-bottom: 16px;">📭</div>' +
        '<p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">이번 주 스케줄이 없습니다</p>' +
        '<p style="font-size: 14px;">관리자가 스케줄을 등록하면 여기에 표시됩니다.</p>' +
        '</div>';
      return;
    }
    
    renderEmployeeScheduleGantt();
    
  } catch (error) {
    console.error('❌ 스케줄 로드 실패:', error);
    document.getElementById('employeeScheduleContainer').innerHTML = 
      '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">스케줄을 불러오는데 실패했습니다.</p>';
  }
}

/**
 * 직원 스케줄 로드 (기존 버전 - 백업용)
 * ⚠️ 리팩토링 완료 후 삭제 예정
 */
async function loadEmployeeSchedule_OLD() {
  if (!currentUser) return;
  
  const monday = getEmployeeMonday(currentEmployeeWeek);
  const year = monday.getFullYear();
  const weekNum = getEmployeeWeekNumber(monday);
  
  // 주차 표시 업데이트
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  document.getElementById('employeeWeekDisplay').textContent = 
    `${year}년 ${weekNum}주차 (${monday.getMonth()+1}/${monday.getDate()} ~ ${sunday.getMonth()+1}/${sunday.getDate()})`;
  
  try {
    // 1. 최신 계약서 조회 (로그용 - 실제 필터링에는 사용하지 않음)
    console.log(`📋 최신 계약서 조회 시작 (참고용)`);
    const contractsSnapshot = await db.collection('contracts')
      .where('companyId', '==', currentUser.companyId)
      .where('employeeId', '==', currentUser.uid)
      .get();
    
    let latestContract = null;
    let contractStartDate = null;
    
    if (!contractsSnapshot.empty) {
      // createdAt 기준으로 정렬하여 최신 계약서 찾기
      const contracts = contractsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      contracts.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA; // 내림차순
      });
      
      latestContract = contracts[0];
      contractStartDate = latestContract.contractStartDate || latestContract.startDate;
      
      console.log(`   ✅ 최신 계약서: ${latestContract.id}`);
      console.log(`   📅 계약 시작일: ${contractStartDate} (참고용 - 필터링 안 함)`);
    } else {
      console.warn(`   ⚠️ 계약서가 없습니다.`);
    }
    
    // 2. 내 스케줄 조회 - 새 구조: 날짜별 개별 문서 쿼리
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];
    
    console.log(`📅 스케줄 조회 시작 (${showStoreSchedule ? '매장 전체' : '내 근무만'})`);
    console.log(`   사용자: ${currentUser.name} (uid: ${currentUser.uid})`);
    console.log(`   기간: ${mondayStr} ~ ${sundayStr}`);
    
    // 매장 전체보기 여부에 따라 쿼리 분기
    let schedulesSnapshot;
    if (showStoreSchedule) {
      // 매장 전체: storeId + 날짜 범위로 조회 (내 매장 직원만)
      console.log(`   🏪 매장 전체 스케줄 조회 (storeId + 날짜)`);
      schedulesSnapshot = await db.collection('schedules')
        .where('companyId', '==', currentUser.companyId)
        .where('storeId', '==', currentUser.storeId)
        .where('date', '>=', mondayStr)
        .where('date', '<=', sundayStr)
        .get();
    } else {
      // 내 근무만: companyId + userId로 필터링
      console.log(`   👤 내 근무만 조회: userId = ${currentUser.uid}`);
      schedulesSnapshot = await db.collection('schedules')
        .where('companyId', '==', currentUser.companyId)
        .where('userId', '==', currentUser.uid)
        .where('date', '>=', mondayStr)
        .where('date', '<=', sundayStr)
        .get();
    }
    
    console.log(`   ✅ 조회 완료: ${schedulesSnapshot.size}개 스케줄 발견`);
    
    // 샘플 데이터 확인 (디버깅)
    if (schedulesSnapshot.size > 0) {
      console.log(`   📋 샘플 데이터 (최대 3개):`);
      schedulesSnapshot.docs.slice(0, 3).forEach((doc, idx) => {
        const data = doc.data();
        console.log(`      ${idx + 1}. userId: "${data.userId}", userName: "${data.userName}", date: ${data.date}, time: ${data.startTime}-${data.endTime}`);
      });
    } else {
      console.warn(`   ⚠️ 내 스케줄이 하나도 없습니다!`);
      console.warn(`   디버깅: userId가 정확한지 확인하세요: "${currentUser.uid}"`);
      
      // 전체 스케줄 중 내 이름으로 검색 (디버깅용)
      const allSchedules = await db.collection('schedules')
        .where('companyId', '==', currentUser.companyId)
        .where('userName', '==', currentUser.name)
        .where('date', '>=', mondayStr)
        .where('date', '<=', sundayStr)
        .get();
      
      console.warn(`   userName으로 검색: ${allSchedules.size}개`);
      if (allSchedules.size > 0) {
        console.warn(`   ⚠️ 발견! userName은 일치하지만 userId가 다릅니다:`);
        allSchedules.docs.slice(0, 3).forEach((doc, idx) => {
          const data = doc.data();
          console.warn(`      ${idx + 1}. userId: "${data.userId}" (현재 uid: "${currentUser.uid}")`);
        });
      }
    }
    
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    
    // 매장 전체보기일 때는 직원별로 그룹화
    const employeesMap = {};
    
    if (showStoreSchedule) {
      // 매장 전체: 직원별로 그룹화
      schedulesSnapshot.forEach(doc => {
        const scheduleData = doc.data();
        const empId = scheduleData.userId;
        const empName = scheduleData.userName || '이름없음';
        
        if (!employeesMap[empId]) {
          employeesMap[empId] = {
            uid: empId,
            name: empName,
            schedules: {}
          };
          days.forEach(day => {
            employeesMap[empId].schedules[day] = [];
          });
        }
        
        // 날짜별로 정리
        const scheduleDateObj = new Date(scheduleData.date + 'T00:00:00');
        const dayOfWeek = scheduleDateObj.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayName = days[dayIndex];
        
        employeesMap[empId].schedules[dayName].push({
          startTime: scheduleData.startTime || '',
          endTime: scheduleData.endTime || '',
          hours: scheduleData.hours || 0,
          breakTime: scheduleData.breakTime || null,
          isWorkDay: true,
          isShiftReplacement: scheduleData.isShiftReplacement || false,
          shiftRequestId: scheduleData.shiftRequestId || null,
          originalRequesterId: scheduleData.originalRequesterId || null,
          originalRequesterName: scheduleData.originalRequesterName || null
        });
      });
      
      // 직원 목록을 배열로 변환
      const employeesList = Object.values(employeesMap);
      
      if (employeesList.length === 0) {
        console.warn(`   📭 이번 주 매장 스케줄이 없습니다.`);
        document.getElementById('employeeScheduleContainer').innerHTML = 
          '<div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">' +
          '<div style="font-size: 48px; margin-bottom: 16px;">📭</div>' +
          '<p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">이번 주 매장 스케줄이 없습니다</p>' +
          '</div>';
        return;
      }
      
      // 매장 전체 데이터 구조로 변환
      currentEmployeeScheduleData = {
        employees: employeesList,
        type: 'schedule'
      };
      
      renderEmployeeScheduleGantt();
      return;
    }
    
    // 내 근무만: 기존 로직
    const schedules = {};
    days.forEach(day => {
      schedules[day] = [];
    });
    
    // 3. 모든 계약서 조회하여 각 날짜의 유효 계약서 판단
    let allContracts = [];
    if (!contractsSnapshot.empty) {
      allContracts = contractsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // createdAt 기준 정렬
      allContracts.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      console.log(`   📋 전체 계약서: ${allContracts.length}개`);
      allContracts.forEach((c, idx) => {
        console.log(`      ${idx + 1}. ${c.id} (${c.contractStartDate || c.startDate} ~ ${c.contractEndDate || c.endDate})`);
      });
    }
    
    // 4. 스케줄 필터링 및 날짜별로 정리
    let filteredCount = 0;
    let totalCount = 0;
    
    schedulesSnapshot.forEach(doc => {
      const scheduleData = doc.data();
      totalCount++;
      
      const isShiftReplacement = scheduleData.isShiftReplacement || false;
      const scheduleDate = scheduleData.date;
      
      // 대체근무는 무조건 표시
      if (isShiftReplacement) {
        console.log(`   ✅ 대체근무: ${scheduleDate} (항상 표시)`);
      } else if (allContracts.length > 0) {
        // 해당 날짜에 유효한 가장 최신 계약서 찾기
        let validContract = null;
        for (const contract of allContracts) {
          const cStart = contract.contractStartDate || contract.startDate;
          const cEnd = contract.contractEndDate || contract.endDate;
          
          if (!cStart) continue;
          
          // 날짜가 계약 기간 내에 있는지 확인
          if (scheduleDate >= cStart && (!cEnd || scheduleDate <= cEnd)) {
            validContract = contract;
            break; // 가장 최신 계약서 (이미 정렬됨)
          }
        }
        
        // 최신 계약서 시작일 이전: 모든 스케줄 표시
        // 최신 계약서 시작일 이후: 최신 계약서 스케줄만 표시
        const latestStartDate = latestContract.contractStartDate || latestContract.startDate;
        
        if (scheduleDate < latestStartDate) {
          // 최신 계약서 시작 전 - 모든 스케줄 표시
          console.log(`   ✅ 이전 계약서 스케줄: ${scheduleDate} < ${latestStartDate} (표시)`);
        } else {
          // 최신 계약서 시작 후 - 최신 계약서 스케줄만 표시
          if (validContract && validContract.id === latestContract.id) {
            console.log(`   ✅ 최신 계약서 스케줄: ${scheduleDate} >= ${latestStartDate} (표시)`);
          } else {
            console.log(`   ⏭️ 이전 계약서 스케줄: ${scheduleDate} >= ${latestStartDate} (최신 우선, 제외)`);
            filteredCount++;
            return; // 제외
          }
        }
      } else {
        // 계약서가 없으면 모두 표시
        console.log(`   ✅ 스케줄: ${scheduleDate}`);
      }
      
      // 날짜별로 정리
      const scheduleDateObj = new Date(scheduleData.date + 'T00:00:00');
      const dayOfWeek = scheduleDateObj.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayName = days[dayIndex];
      
      schedules[dayName].push({
        startTime: scheduleData.startTime || '',
        endTime: scheduleData.endTime || '',
        hours: scheduleData.hours || 0,
        breakTime: scheduleData.breakTime || null,
        isWorkDay: true,
        isShiftReplacement: isShiftReplacement,
        shiftRequestId: scheduleData.shiftRequestId || null,
        originalRequesterId: scheduleData.originalRequesterId || null,
        originalRequesterName: scheduleData.originalRequesterName || null
      });
    });
    
    console.log(`   📊 필터링 결과: 총 ${totalCount}개 중 ${totalCount - filteredCount}개 표시, ${filteredCount}개 제외`);
    
    // 스케줄이 없을 때 안내 메시지
    const hasSchedules = Object.values(schedules).some(daySchedules => daySchedules.length > 0);
    if (!hasSchedules) {
      console.warn(`   📭 이번 주 스케줄이 없습니다.`);
      document.getElementById('employeeScheduleContainer').innerHTML = 
        '<div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">' +
        '<div style="font-size: 48px; margin-bottom: 16px;">📭</div>' +
        '<p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">이번 주 스케줄이 없습니다</p>' +
        '<p style="font-size: 14px;">관리자가 스케줄을 등록하면 여기에 표시됩니다.</p>' +
        '<p style="font-size: 13px; color: var(--primary-color); margin-top: 16px;">💡 관리자에게 스케줄 등록을 요청하세요.</p>' +
        '</div>';
      return;
    }
    
    renderEmployeeSchedule(schedules, monday);
    
  } catch (error) {
    console.error('❌ 스케줄 로드 실패:', error);
    document.getElementById('employeeScheduleContainer').innerHTML = 
      '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">스케줄을 불러오는데 실패했습니다.</p>';
  }
}

/**
 * 간트차트 렌더링 (모듈 사용)
 */
function renderEmployeeScheduleGantt() {
  if (!currentEmployeeScheduleData) {
    console.warn('⚠️ 스케줄 데이터가 없습니다.');
    return;
  }
  
  const container = document.getElementById('employeeScheduleContainer');
  const monday = getEmployeeMonday(currentEmployeeWeek);
  
  // schedule-viewer.js 모듈의 간트차트 렌더링 함수 사용
  // showStoreSchedule = false → 내 근무만 보기 (showOnlyMySchedule = true)
  // showStoreSchedule = true → 매장 전체보기 (showOnlyMySchedule = false)
  const html = renderScheduleGanttChart(currentEmployeeScheduleData, monday, {
    isAdmin: false,
    showOnlyMySchedule: !showStoreSchedule, // 반전된 로직
    currentUserId: currentUser ? currentUser.uid : null
  });
  
  container.innerHTML = html;
}

/**
 * 내 스케줄 렌더링 (간단한 주간 뷰) - [DEPRECATED: 간트차트로 통합]
 */
function renderEmployeeSchedule(schedules, monday) {
  // 스케줄 데이터를 모듈 형식으로 변환
  const scheduleData = {
    employees: [{
      name: currentUser ? currentUser.name : '나',
      uid: currentUser ? currentUser.uid : null, // 관리자 페이지와 동일하게 uid 사용
      schedules: schedules
    }],
    type: 'schedule'
  };
  
  // 캐시 저장
  currentEmployeeScheduleData = scheduleData;
  
  // 간트차트 렌더링
  renderEmployeeScheduleGantt();
}

/**
 * 기존 카드형 렌더링 (백업용, 미사용)
 */
function renderEmployeeScheduleCard(schedules, monday) {
  const container = document.getElementById('employeeScheduleContainer');
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  
  let html = '<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px;">';
  
  days.forEach((day, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
    const scheduleArray = schedules[day]; // 이제 배열임
    
    const isToday = date.toDateString() === new Date().toDateString();
    
    html += `
      <div style="
        border: 2px solid ${isToday ? 'var(--primary-color)' : 'var(--border-color)'}; 
        border-radius: var(--border-radius); 
        padding: var(--spacing-md); 
        background: ${isToday ? '#fff9e6' : 'white'};
        min-height: 150px;
      ">
        <div style="
          font-weight: 700; 
          font-size: 14px; 
          text-align: center; 
          margin-bottom: var(--spacing-sm); 
          padding-bottom: var(--spacing-xs); 
          border-bottom: 2px solid var(--border-color);
          color: ${isToday ? 'var(--primary-color)' : 'var(--text-primary)'};
        ">
          ${day} ${isToday ? '(오늘)' : ''}
          <br>
          <span style="font-size: 11px; font-weight: 400; color: var(--text-secondary);">${dateStr}</span>
        </div>
    `;
    
    // 배열이고 근무가 있으면 모두 표시
    if (scheduleArray && scheduleArray.length > 0) {
      scheduleArray.forEach(schedule => {
        if (schedule.isWorkDay) {
          // 대체근무 표시
          const replacementIcon = schedule.isShiftReplacement ? '🔄 ' : '';
          const backgroundColor = schedule.isShiftReplacement ? '#fff3cd' : 'var(--primary-color)';
          
          html += `
            <div style="text-align: center; padding: var(--spacing-sm); margin-bottom: 8px;">
              <div style="background: ${backgroundColor}; color: ${schedule.isShiftReplacement ? '#856404' : 'white'}; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
                <div style="font-size: 12px; font-weight: 600;">${replacementIcon}근무</div>
              </div>
              <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
                ${schedule.startTime} - ${schedule.endTime}
              </div>
              <div style="font-size: 11px; color: var(--text-secondary);">
                ${schedule.hours}시간
              </div>
            </div>
          `;
        }
      });
    } else {
      html += `
        <div style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary);">
          <div style="font-size: 32px; margin-bottom: 8px;">😴</div>
          <div style="font-size: 13px;">휴무</div>
        </div>
      `;
    }
    
    html += '</div>';
  });
  
  html += '</div>';
  
  container.innerHTML = html;
}

// ===================================================================
// 결근 사유 입력 시스템
// ===================================================================

// 전역 변수: 현재 처리 중인 결근 정보
let pendingAbsentRecords = [];
let currentAbsentRecordIndex = 0;
let isAbsentModalBlocking = false; // 페이지 이동 차단 플래그

/**
 * 미처리 결근 사유 확인
 * 로그인 시 자동 실행
 */
async function checkPendingAbsentReasons() {
  if (!currentUser || !currentUser.uid) {
    console.log('⚠️ currentUser 정보 없음, 결근 체크 건너뜀');
    return;
  }
  
  console.log('🔍 미처리 결근 사유 확인 시작');
  
  try {
    // 결근 기록 중 사유가 없는 것 찾기
    const snapshot = await db.collection('attendance')
      .where('companyId', '==', currentUser.companyId)
      .where('userId', '==', currentUser.uid)
      .where('status', '==', 'absent')
      .get();
    
    pendingAbsentRecords = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // absentReason이 없거나 빈 문자열인 경우
      if (!data.absentReason || data.absentReason.trim() === '') {
        pendingAbsentRecords.push({
          id: doc.id,
          date: data.date,
          ...data
        });
      }
    });
    
    // 날짜 순으로 정렬 (오래된 것부터)
    pendingAbsentRecords.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`📊 미처리 결근: ${pendingAbsentRecords.length}건`);
    
    if (pendingAbsentRecords.length > 0) {
      currentAbsentRecordIndex = 0;
      showAbsentReasonModal();
    }
    
  } catch (error) {
    console.error('❌ 결근 사유 확인 실패:', error);
  }
}

/**
 * 결근 사유 입력 모달 표시
 */
function showAbsentReasonModal() {
  if (currentAbsentRecordIndex >= pendingAbsentRecords.length) {
    // 모든 결근 사유 입력 완료
    closeAbsentReasonModal();
    alert('✅ 모든 결근 사유 입력이 완료되었습니다.');
    return;
  }
  
  const record = pendingAbsentRecords[currentAbsentRecordIndex];
  
  // 날짜 포맷팅
  const dateObj = new Date(record.date);
  const dateStr = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayStr = dayNames[dateObj.getDay()];
  
  // 정보 표시
  document.getElementById('absentReasonInfo').innerHTML = `
    <div style="font-size: 14px;">
      <div style="font-weight: 600; margin-bottom: 4px;">📅 결근 날짜</div>
      <div style="font-size: 16px; color: var(--primary-color); font-weight: 700;">
        ${dateStr} (${dayStr}요일)
      </div>
      ${pendingAbsentRecords.length > 1 ? `
        <div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
          ${currentAbsentRecordIndex + 1} / ${pendingAbsentRecords.length}번째 결근 사유 입력
        </div>
      ` : ''}
    </div>
  `;
  
  // 입력 필드 초기화
  document.getElementById('absentReasonInput').value = '';
  
  // 모달 표시
  document.getElementById('absentReasonModal').style.display = 'block';
  isAbsentModalBlocking = true;
  
  // 페이지 이동 차단
  blockPageNavigation();
  
  console.log(`📝 결근 사유 입력 모달 표시: ${dateStr}`);
}

/**
 * 결근 사유 제출
 */
async function submitAbsentReason() {
  const reason = document.getElementById('absentReasonInput').value.trim();
  
  if (!reason) {
    alert('⚠️ 결근 사유를 입력해주세요.');
    document.getElementById('absentReasonInput').focus();
    return;
  }
  
  if (reason.length < 5) {
    alert('⚠️ 결근 사유를 5자 이상 입력해주세요.');
    document.getElementById('absentReasonInput').focus();
    return;
  }
  
  const record = pendingAbsentRecords[currentAbsentRecordIndex];
  
  try {
    // Firestore 업데이트
    await db.collection('attendance').doc(record.id).update({
      absentReason: reason,
      reasonSubmittedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reasonSubmittedBy: 'employee'
    });
    
    console.log(`✅ 결근 사유 제출 완료: ${record.date}`);
    
    // 다음 결근으로 이동
    currentAbsentRecordIndex++;
    
    if (currentAbsentRecordIndex < pendingAbsentRecords.length) {
      // 다음 결근 사유 입력
      showAbsentReasonModal();
    } else {
      // 모든 입력 완료
      closeAbsentReasonModal();
      alert('✅ 모든 결근 사유 입력이 완료되었습니다.\n이제 정상적으로 페이지를 사용하실 수 있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 결근 사유 제출 실패:', error);
    alert('❌ 결근 사유 제출에 실패했습니다.\n다시 시도해주세요.');
  }
}

/**
 * 결근 사유 모달 닫기
 */
function closeAbsentReasonModal() {
  document.getElementById('absentReasonModal').style.display = 'none';
  isAbsentModalBlocking = false;
  unblockPageNavigation();
}

/**
 * 페이지 이동 차단
 */
function blockPageNavigation() {
  // 탭 클릭 차단
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.dataset.originalOnclick = btn.getAttribute('onclick');
    btn.setAttribute('onclick', 'alertAbsentReasonRequired(); return false;');
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  });
  
  // beforeunload 이벤트로 페이지 이탈 경고
  window.addEventListener('beforeunload', beforeUnloadHandler);
}

/**
 * 페이지 이동 차단 해제
 */
function unblockPageNavigation() {
  // 탭 클릭 복원
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    const originalOnclick = btn.dataset.originalOnclick;
    if (originalOnclick) {
      btn.setAttribute('onclick', originalOnclick);
      delete btn.dataset.originalOnclick;
    }
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  });
  
  // beforeunload 이벤트 제거
  window.removeEventListener('beforeunload', beforeUnloadHandler);
}

/**
 * beforeunload 핸들러
 */
function beforeUnloadHandler(e) {
  if (isAbsentModalBlocking) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
}

/**
 * 결근 사유 입력 필요 알림
 */
function alertAbsentReasonRequired() {
  alert('⚠️ 결근 사유를 먼저 입력해주세요.\n사유 입력 후 페이지를 사용하실 수 있습니다.');
}

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
  
  // 사유 기본값
  document.getElementById('shiftRequestReason').value = '개인사정';
  
  // 근무시간 초기화
  document.getElementById('shiftRequestStartTime').value = '';
  document.getElementById('shiftRequestEndTime').value = '';
  document.getElementById('shiftScheduleSelectGroup').style.display = 'none';
  
  // 내일 날짜의 근무시간 자동 로드
  await loadMyScheduleForDate();
}

/**
 * 선택한 날짜의 본인 근무시간 자동 로드
 */
async function loadMyScheduleForDate() {
  const selectedDate = document.getElementById('shiftRequestDate').value;
  
  if (!selectedDate) {
    return;
  }
  
  try {
    // 선택한 날짜의 스케줄 조회 (새 구조: 날짜별 개별 문서)
    const date = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    
    console.log(`🔍 ${selectedDate} (${dayOfWeek}요일) 근무시간 조회`);
    
    // 해당 날짜의 모든 스케줄 조회
    const schedulesSnapshot = await db.collection('schedules')
      .where('companyId', '==', currentUser.companyId)
      .where('userId', '==', currentUser.uid)
      .where('date', '==', selectedDate)
      .get();
    
    if (schedulesSnapshot.empty) {
      alert(`⚠️ ${selectedDate} (${dayOfWeek}요일)에 등록된 근무가 없습니다.\n교대근무는 근무가 예정된 날짜에만 신청할 수 있습니다.`);
      document.getElementById('shiftRequestStartTime').value = '';
      document.getElementById('shiftRequestEndTime').value = '';
      document.getElementById('shiftScheduleSelectGroup').style.display = 'none';
      return;
    }
    
    // 해당 날짜의 모든 근무시간 수집
    const schedules = [];
    schedulesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.isWorkDay !== false) {
        schedules.push({
          startTime: data.startTime,
          endTime: data.endTime,
          hours: data.hours,
          isShiftReplacement: data.isShiftReplacement || false
        });
      }
    });
    
    if (schedules.length === 0) {
      alert(`⚠️ ${selectedDate} (${dayOfWeek}요일)은 휴무입니다.\n교대근무는 근무가 예정된 날짜에만 신청할 수 있습니다.`);
      document.getElementById('shiftRequestStartTime').value = '';
      document.getElementById('shiftRequestEndTime').value = '';
      document.getElementById('shiftScheduleSelectGroup').style.display = 'none';
      return;
    }
    
    // 근무가 1개면 자동 설정
    if (schedules.length === 1) {
      document.getElementById('shiftRequestStartTime').value = schedules[0].startTime;
      document.getElementById('shiftRequestEndTime').value = schedules[0].endTime;
      document.getElementById('shiftScheduleSelectGroup').style.display = 'none';
      
      console.log(`✅ 근무시간 자동 설정: ${schedules[0].startTime} ~ ${schedules[0].endTime}`);
    } 
    // 근무가 여러 개면 선택 UI 표시
    else {
      const selectGroup = document.getElementById('shiftScheduleSelectGroup');
      const select = document.getElementById('shiftScheduleSelect');
      
      // 옵션 생성
      let optionsHtml = '<option value="">근무시간 선택</option>';
      schedules.forEach((schedule, index) => {
        const label = schedule.isShiftReplacement ? '(대체근무)' : '';
        optionsHtml += `<option value="${schedule.startTime}~${schedule.endTime}">${schedule.startTime} ~ ${schedule.endTime} ${label}</option>`;
      });
      
      select.innerHTML = optionsHtml;
      selectGroup.style.display = 'block';
      
      console.log(`✅ ${schedules.length}개의 근무시간 발견, 선택 필요`);
    }
    
  } catch (error) {
    console.error('❌ 근무시간 조회 실패:', error);
    alert('❌ 근무시간을 조회하는데 실패했습니다.');
  }
}

/**
 * 근무시간 선택 (여러 개 있을 경우 - 현재는 사용 안 함, 향후 확장용)
 */
function fillScheduleTime() {
  const select = document.getElementById('shiftScheduleSelect');
  const selectedOption = select.options[select.selectedIndex];
  
  if (selectedOption.value) {
    const [startTime, endTime] = selectedOption.value.split('~');
    document.getElementById('shiftRequestStartTime').value = startTime;
    document.getElementById('shiftRequestEndTime').value = endTime;
  }
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
  document.getElementById('shiftScheduleSelectGroup').style.display = 'none';
}

/**
 * 교대근무 신청 제출
 */
async function submitShiftRequest() {
  const date = document.getElementById('shiftRequestDate').value;
  const startTime = document.getElementById('shiftRequestStartTime').value;
  const endTime = document.getElementById('shiftRequestEndTime').value;
  const reason = document.getElementById('shiftRequestReason').value.trim();
  
  if (!date || !startTime || !endTime) {
    alert('날짜와 시간을 입력해주세요.');
    return;
  }
  
  if (startTime >= endTime) {
    alert('종료 시간은 시작 시간보다 늦어야 합니다.');
    return;
  }
  
  try {
    const shiftRequest = {
      // 🔒 멀티테넌트 필드
      companyId: currentUser.companyId,
      storeId: currentUser.storeId,
      
      // 🔥 신청자 필드 (듀얼)
      requesterUserId: currentUser.uid,     // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
      requesterId: currentUser.uid,         // 하위 호환성 (기존 코드 지원)
      requesterName: currentUser.name,
      
      store: currentUser.store,
      workDate: date,
      workStartTime: startTime,
      workEndTime: endTime,
      reason: reason || '사유 없음',
      status: 'pending',
      
      // 🔥 대타 필드 (듀얼)
      replacementUserId: null,              // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
      matchedUserId: null,                  // 하위 호환성 (기존 코드 지원)
      matchedUserName: null,
      
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      matchedAt: null,
      approvedByAdmin: false
    };
    
    await db.collection('shift_requests').add(shiftRequest);
    
    alert('✅ 교대근무 신청이 완료되었습니다.\n같은 매장 직원들에게 알림이 전송됩니다.');
    closeShiftRequestModal();
    
  } catch (error) {
    console.error('❌ 교대근무 신청 실패:', error);
    alert('❌ 교대근무 신청에 실패했습니다.');
  }
}

/**
 * 교대근무 요청 실시간 모니터링
 */
function monitorShiftRequests() {
  if (!currentUser || !currentUser.store) return;
  
  console.log('🔄 교대근무 요청 모니터링 시작:', currentUser.store);
  
  // 🔒 [수정] companyId 필터 필수 추가 (보안 규칙 준수)
  db.collection('shift_requests')
    .where('companyId', '==', currentUser.companyId) // 🔥 필수!
    .where('store', '==', currentUser.store)
    .where('status', '==', 'pending')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const request = change.doc.data();
          // 본인이 신청한 것이 아닌 경우만 알림 표시
          if (request.requesterId !== currentUser.uid) {
            console.log('🔔 새로운 교대근무 요청:', request);
            showShiftNotification(change.doc.id, request);
          }
        }
      });
    }, error => {
      // 권한 오류가 나더라도 앱이 멈추지 않도록 로그만 남김
      console.warn('교대근무 모니터링 권한 없음 (또는 인덱스 필요):', error.code);
    });
}

/**
 * 교대근무 알림 팝업 표시
 */
function showShiftNotification(requestId, request) {
  currentShiftRequestId = requestId;
  
  const modal = document.getElementById('shiftRequestNotificationModal');
  const content = document.getElementById('shiftNotificationContent');
  
  content.innerHTML = `
    <div style="padding: 24px;">
      <p style="margin-bottom: 16px; font-size: 15px;">
        <strong>${request.requesterName}</strong> 님이 교대근무를 요청했습니다.
      </p>
      <div style="background: var(--bg-light); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 8px 0;"><strong>📅 날짜:</strong> ${request.workDate}</p>
        <p style="margin: 8px 0;"><strong>⏰ 시간:</strong> ${request.workStartTime} ~ ${request.workEndTime}</p>
        <p style="margin: 8px 0;"><strong>📝 사유:</strong> ${request.reason}</p>
      </div>
      <p style="color: var(--text-secondary); font-size: 13px;">
        대타근무를 승인하시겠습니까?
      </p>
    </div>
  `;
  
  modal.style.display = 'flex';
}

/**
 * 교대근무 승인
 */
async function acceptShiftRequest() {
  if (!currentShiftRequestId) return;
  
  try {
    await db.collection('shift_requests').doc(currentShiftRequestId).update({
      status: 'matched',
      // 🔥 대타 필드 (듀얼)
      replacementUserId: currentUser.uid,   // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
      matchedUserId: currentUser.uid,       // 하위 호환성 (기존 코드 지원)
      matchedUserName: currentUser.name,
      matchedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    alert('✅ 교대근무를 승인했습니다.\n관리자 승인 후 스케줄에 반영됩니다.');
    
    document.getElementById('shiftRequestNotificationModal').style.display = 'none';
    currentShiftRequestId = null;
    
  } catch (error) {
    console.error('❌ 교대근무 승인 실패:', error);
    alert('❌ 교대근무 승인에 실패했습니다.');
  }
}

/**
 * 교대근무 거절 (팝업만 닫기)
 */
function rejectShiftRequest() {
  document.getElementById('shiftRequestNotificationModal').style.display = 'none';
  currentShiftRequestId = null;
}

// ===========================================
// 매장 스케줄표 모달
// ===========================================

let currentStoreScheduleWeek = 0; // 0 = 이번 주, -1 = 지난 주, 1 = 다음 주

/**
 * 매장 스케줄표 모달 열기
 */
async function showStoreScheduleModal() {
  currentStoreScheduleWeek = 0;
  document.getElementById('storeScheduleModal').style.display = 'flex';
  await loadStoreSchedule();
}

/**
 * 매장 스케줄표 모달 닫기
 */
function closeStoreScheduleModal() {
  document.getElementById('storeScheduleModal').style.display = 'none';
}

/**
 * 주차 변경
 */
async function changeStoreScheduleWeek(direction) {
  currentStoreScheduleWeek += direction;
  await loadStoreSchedule();
}

/**
 * 매장 전체 스케줄 로드
 */
async function loadStoreSchedule() {
  if (!currentUser || !currentUser.store) return;
  
  const monday = getStoreMonday(currentStoreScheduleWeek);
  const year = monday.getFullYear();
  const weekNum = getStoreWeekNumber(monday);
  
  // 주차 표시 업데이트
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  document.getElementById('storeScheduleWeekDisplay').textContent = 
    `${year}년 ${weekNum}주차 (${monday.getMonth()+1}/${monday.getDate()} ~ ${sunday.getMonth()+1}/${sunday.getDate()})`;
  
  try {
    console.log(`📅 매장 스케줄 로드 시작`);
    console.log(`   사용자: ${currentUser.name} (${currentUser.uid})`);
    console.log(`   매장: "${currentUser.store}"`);
    console.log(`   기간: ${formatDate(monday)} ~ ${formatDate(sunday)}`);
    
    // 같은 매장의 모든 직원 스케줄 조회
    const scheduleQuery = await db.collection('schedules')
      .where('companyId', '==', currentUser.companyId)
      .where('storeId', '==', currentUser.storeId)
      .where('date', '>=', formatDate(monday))
      .where('date', '<=', formatDate(sunday))
      .get();
    
    console.log(`   ✅ Firestore 쿼리 완료: ${scheduleQuery.size}개 스케줄 문서 발견`);
    
    // 디버깅: 첫 3개 문서의 store 값 확인
    if (scheduleQuery.size > 0) {
      console.log(`   📋 샘플 데이터 (최대 3개):`);
      scheduleQuery.docs.slice(0, 3).forEach((doc, idx) => {
        const data = doc.data();
        console.log(`      ${idx + 1}. store: "${data.store}", userName: "${data.userName}", date: ${data.date}`);
      });
    } else {
      console.warn(`   ⚠️ 스케줄이 하나도 없습니다!`);
      console.warn(`   디버깅: 매장명이 정확한지 확인하세요: "${currentUser.store}"`);
      
      // 모든 스케줄 문서 확인 (디버깅용)
      const allSchedules = await db.collection('schedules')
        .where('companyId', '==', currentUser.companyId)
        .where('date', '>=', formatDate(monday))
        .where('date', '<=', formatDate(sunday))
        .get();
      
      console.warn(`   전체 기간 스케줄: ${allSchedules.size}개`);
      if (allSchedules.size > 0) {
        const stores = new Set();
        allSchedules.docs.forEach(doc => stores.add(doc.data().store));
        console.warn(`   발견된 매장들: ${Array.from(stores).join(', ')}`);
      }
    }
    
    // 직원별로 스케줄 정리
    const employeeSchedules = {};
    
    scheduleQuery.forEach(doc => {
      const data = doc.data();
      const employeeId = data.userId;
      const employeeName = data.userName || '이름 없음'; // 스케줄 문서에 저장된 이름 사용
      
      if (!employeeSchedules[employeeId]) {
        employeeSchedules[employeeId] = {
          name: employeeName,
          schedules: []
        };
        console.log(`   👤 직원 추가: ${employeeName} (${employeeId})`);
      }
      
      employeeSchedules[employeeId].schedules.push({
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        isShiftReplacement: data.isShiftReplacement || false
      });
    });
    
    const employeeCount = Object.keys(employeeSchedules).length;
    console.log(`✅ 매장 스케줄 로드 완료: ${employeeCount}명의 직원 스케줄`);
    
    if (employeeCount === 0) {
      document.getElementById('storeScheduleTimeline').innerHTML = 
        '<div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">' +
        '<div style="font-size: 48px; margin-bottom: 16px;">📭</div>' +
        '<p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">이번 주 매장 스케줄이 없습니다</p>' +
        '<p style="font-size: 14px;">관리자가 스케줄을 등록하면 여기에 표시됩니다.</p>' +
        '</div>';
      return;
    }
    
    renderStoreScheduleTimeline(employeeSchedules, monday);
    
  } catch (error) {
    console.error('❌ 매장 스케줄 로드 실패:', error);
    document.getElementById('storeScheduleTimeline').innerHTML = 
      '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">스케줄을 불러오는데 실패했습니다.</p>';
  }
}

/**
 * 간트차트 형태로 스케줄 렌더링 (관리자 페이지와 동일)
 */
function renderStoreScheduleTimeline(employeeSchedules, monday) {
  const container = document.getElementById('storeScheduleTimeline');
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  
  // 직원별 색상
  const employeeColors = [
    '#FF6B6B', '#4ECDC4', '#95E1D3', '#FFE66D', '#C7CEEA',
    '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  
  const colorMap = {};
  let index = 0;
  Object.entries(employeeSchedules).forEach(([employeeId, data]) => {
    colorMap[data.name] = employeeColors[index % employeeColors.length];
    index++;
  });
  
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
  
  Object.entries(employeeSchedules).forEach(([employeeId, empData]) => {
    days.forEach((day, dayIndex) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + dayIndex);
      const dateStr = formatDate(date);
      
      // 해당 날짜의 스케줄 찾기
      const schedulesForDay = empData.schedules.filter(s => s.date === dateStr);
      
      schedulesForDay.forEach(schedule => {
        dayWorkers[day].push({
          name: empData.name,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          color: colorMap[empData.name],
          isShiftReplacement: schedule.isShiftReplacement || false
        });
      });
    });
  });
  
  // 시간 범위 (06:00 ~ 01:00)
  const startHour = 6;
  const endHour = 25; // 다음날 01:00
  const totalHours = endHour - startHour;
  const rowHeight = 35; // 1시간당 높이
  const totalHeight = totalHours * rowHeight;
  
  // HTML 생성
  let html = `
    <div style="display: flex; gap: var(--spacing-md); width: 100%; max-width: 1400px; margin: 0 auto;">
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
    `;
    
    // 시간 그리드 라인
    for (let h = startHour; h <= endHour; h++) {
      const topPos = (h - startHour) * rowHeight;
      html += `
        <div style="position: absolute; top: ${topPos}px; width: 100%; height: ${rowHeight}px; border-bottom: 1px solid #f0f0f0;"></div>
      `;
    }
    
    // 각 직원의 막대
    if (workers.length > 0) {
      const maxBarWidth = 18; // 최대 막대 굵기 (%)
      const minBarWidth = 8;  // 최소 막대 굵기 (%)
      const minSpacing = 3;   // 최소 간격 (%)
      
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
        const [startH, startM] = worker.startTime.split(':').map(Number);
        const [endH, endM] = worker.endTime.split(':').map(Number);
        
        const startMinutes = (startH - startHour) * 60 + startM;
        const endMinutes = (endH - startHour) * 60 + endM;
        
        const topPos = (startMinutes / 60) * rowHeight;
        const height = ((endMinutes - startMinutes) / 60) * rowHeight;
        const leftPos = spacing * (workerIndex + 1) + barWidth * workerIndex;
        
        html += `
          <div style="
            position: absolute;
            left: ${leftPos}%;
            top: ${topPos}px;
            width: ${barWidth}%;
            height: ${height}px;
            background: ${worker.color};
            opacity: 0.9;
            border-radius: 4px;
            transition: all 0.2s;
            cursor: pointer;
          " 
          onmouseover="this.style.opacity='1'; this.style.zIndex='5'; this.style.boxShadow='0 3px 10px rgba(0,0,0,0.3)';" 
          onmouseout="this.style.opacity='0.9'; this.style.zIndex='1'; this.style.boxShadow='none';"
          title="${worker.name}: ${worker.startTime}-${worker.endTime}">
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
    </div>
  `;
  
  // 직원 목록 (범례) - 더 명확하게 표시
  const employeeCount = Object.keys(employeeSchedules).length;
  html += `
    <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
      <h4 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: white; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">👥</span>
        <span>우리 매장 직원 목록</span>
        <span style="background: rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">${employeeCount}명</span>
      </h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
  `;
  
  Object.entries(employeeSchedules).forEach(([employeeId, data]) => {
    const color = colorMap[data.name];
    const scheduleCount = data.schedules.length;
    html += `
      <div style="
        display: flex; 
        align-items: center; 
        gap: 10px; 
        background: white; 
        padding: 10px 12px; 
        border-radius: 8px; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.2s;
        cursor: pointer;
      " 
      onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)';"
      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';">
        <div style="width: 24px; height: 24px; background: ${color}; border-radius: 6px; flex-shrink: 0;"></div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 13px; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${data.name}
          </div>
          <div style="font-size: 10px; color: #999; margin-top: 2px;">
            이번주 ${scheduleCount}일 근무
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * 주의 월요일 가져오기
 */
function getStoreMonday(weekOffset) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + (weekOffset * 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * 주차 번호 계산
 */
function getStoreWeekNumber(date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - firstDay) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + firstDay.getDay() + 1) / 7);
}

/**
 * 날짜 포맷 (YYYY-MM-DD)
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ===========================================
// 출퇴근 시간 위반 체크 및 즉시 사유 입력
// ===========================================

let currentReasonContext = null; // 현재 사유 입력 컨텍스트

/**
 * 출근 시간 위반 체크 (지각/조기출근)
 */
async function checkClockInViolation(clockInTime, date, attendanceRef, attendanceId) {
  if (!currentUser) return;
  
  try {
    // 계약서 조회 (관리자 페이지와 동일하게 employeeId 사용)
    const contractsSnapshot = await db.collection('contracts')
      .where('companyId', '==', currentUser.companyId)
      .where('employeeId', '==', currentUser.uid)
      .where('workStore', '==', currentUser.store)
      .limit(1)
      .get();
    
    if (contractsSnapshot.empty) {
      console.log('⚠️ 계약서 없음, 출근 체크 건너뜀');
      return;
    }
    
    const contract = contractsSnapshot.docs[0].data();
    const contractStartTime = contract.workStartTime;
    
    if (!contractStartTime) return;
    
    // 매장 허용시간 설정 조회
    const thresholds = await getStoreThresholds(currentUser.store);
    
    // 시간을 분으로 변환
    const clockInMinutes = timeToMinutes(clockInTime);
    const contractStartMinutes = timeToMinutes(contractStartTime);
    
    // 지각 체크
    const lateMinutes = clockInMinutes - contractStartMinutes;
    if (lateMinutes > thresholds.earlyClockIn) {
      console.log(`🚨 지각 감지: ${lateMinutes}분 늦음`);
      showImmediateReasonModal('late', {
        attendanceId: attendanceId,
        attendanceRef: attendanceRef,
        date: date,
        clockInTime: clockInTime,
        contractStartTime: contractStartTime,
        lateMinutes: lateMinutes
      });
      return;
    }
    
    // 조기출근 체크  
    const earlyMinutes = contractStartMinutes - clockInMinutes;
    if (earlyMinutes > thresholds.earlyClockIn) {
      console.log(`🚨 조기출근 감지: ${earlyMinutes}분 일찍 출근`);
      showImmediateReasonModal('earlyArrival', {
        attendanceId: attendanceId,
        attendanceRef: attendanceRef,
        date: date,
        clockInTime: clockInTime,
        contractStartTime: contractStartTime,
        earlyMinutes: earlyMinutes
      });
      return;
    }
    
  } catch (error) {
    console.error('❌ 출근 시간 체크 오류:', error);
  }
}

/**
 * 퇴근 시간 위반 체크 (조퇴/초과근무)
 */
async function checkClockOutViolation(clockInTime, clockOutTime, attendanceId, date) {
  if (!currentUser) return;
  
  try {
    // 계약서 조회 (관리자 페이지와 동일하게 employeeId 사용)
    const contractsSnapshot = await db.collection('contracts')
      .where('companyId', '==', currentUser.companyId)
      .where('employeeId', '==', currentUser.uid)
      .where('workStore', '==', currentUser.store)
      .limit(1)
      .get();
    
    if (contractsSnapshot.empty) {
      console.log('⚠️ 계약서 없음, 퇴근 체크 건너뜀');
      return;
    }
    
    const contract = contractsSnapshot.docs[0].data();
    const contractEndTime = contract.workEndTime;
    
    if (!contractEndTime) return;
    
    // 매장 허용시간 설정 조회
    const thresholds = await getStoreThresholds(currentUser.store);
    
    // 시간을 분으로 변환
    const clockOutMinutes = timeToMinutes(clockOutTime);
    const contractEndMinutes = timeToMinutes(contractEndTime);
    
    // 조퇴 체크
    const earlyLeaveMinutes = contractEndMinutes - clockOutMinutes;
    if (earlyLeaveMinutes > thresholds.earlyClockOut) {
      console.log(`🚨 조퇴 감지: ${earlyLeaveMinutes}분 일찍 퇴근`);
      showImmediateReasonModal('earlyLeave', {
        attendanceId: attendanceId,
        date: date,
        clockOutTime: clockOutTime,
        contractEndTime: contractEndTime,
        earlyLeaveMinutes: earlyLeaveMinutes
      });
      return;
    }
    
    // 초과근무 체크
    const overtimeMinutes = clockOutMinutes - contractEndMinutes;
    if (overtimeMinutes > thresholds.overtime) {
      console.log(`🚨 초과근무 감지: ${overtimeMinutes}분 초과`);
      showImmediateReasonModal('overtime', {
        attendanceId: attendanceId,
        date: date,
        clockOutTime: clockOutTime,
        contractEndTime: contractEndTime,
        overtimeMinutes: overtimeMinutes
      });
      return;
    }
    
  } catch (error) {
    console.error('❌ 퇴근 시간 체크 오류:', error);
  }
}

/**
 * 매장 허용시간 설정 조회
 */
async function getStoreThresholds(storeName) {
  const defaultThresholds = {
    earlyClockIn: 15,    // 조기출근 허용시간 (분)
    earlyClockOut: 5,    // 조퇴 허용시간 (분)
    overtime: 5          // 초과근무 허용시간 (분)
  };
  
  try {
    const storeSnapshot = await db.collection('stores')
      .where('companyId', '==', currentUser.companyId)
      .where('name', '==', storeName)
      .limit(1)
      .get();
    
    if (!storeSnapshot.empty) {
      const storeData = storeSnapshot.docs[0].data();
      if (storeData.attendanceThresholds) {
        return storeData.attendanceThresholds;
      }
    }
  } catch (error) {
    console.error('❌ 매장 설정 조회 오류:', error);
  }
  
  return defaultThresholds;
}

/**
 * 즉시 사유 입력 모달 표시
 */
function showImmediateReasonModal(type, context) {
  currentReasonContext = { type, ...context };
  
  const modal = document.getElementById('immediateReasonModal');
  const title = document.getElementById('immediateReasonTitle');
  const desc = document.getElementById('immediateReasonDesc');
  const info = document.getElementById('immediateReasonInfo');
  const input = document.getElementById('immediateReasonInput');
  
  // 유형별 메시지
  const messages = {
    late: {
      title: '⏰ 지각 사유 입력',
      desc: '예정 출근 시간보다 늦게 출근하셨습니다.',
      info: `예정 출근: ${context.contractStartTime}<br>실제 출근: ${context.clockInTime}<br><strong style="color: var(--danger-color);">${context.lateMinutes}분 지각</strong>`
    },
    earlyArrival: {
      title: '🌅 조기출근 사유 입력',
      desc: '예정 출근 시간보다 일찍 출근하셨습니다.',
      info: `예정 출근: ${context.contractStartTime}<br>실제 출근: ${context.clockInTime}<br><strong style="color: var(--info-color);">${context.earlyMinutes}분 조기출근</strong>`
    },
    earlyLeave: {
      title: '🏃 조퇴 사유 입력',
      desc: '예정 퇴근 시간보다 일찍 퇴근하셨습니다.',
      info: `예정 퇴근: ${context.contractEndTime}<br>실제 퇴근: ${context.clockOutTime}<br><strong style="color: var(--danger-color);">${context.earlyLeaveMinutes}분 조퇴</strong>`
    },
    overtime: {
      title: '🌙 초과근무 사유 입력',
      desc: '예정 퇴근 시간보다 늦게 퇴근하셨습니다.',
      info: `예정 퇴근: ${context.contractEndTime}<br>실제 퇴근: ${context.clockOutTime}<br><strong style="color: var(--primary-color);">${context.overtimeMinutes}분 초과근무</strong>`
    }
  };
  
  const message = messages[type];
  title.textContent = message.title;
  desc.textContent = message.desc;
  info.innerHTML = message.info;
  input.value = '';
  
  modal.style.display = 'flex';
}

/**
 * 즉시 사유 제출
 */
async function submitImmediateReason() {
  const reason = document.getElementById('immediateReasonInput').value.trim();
  
  if (!reason) {
    alert('⚠️ 사유를 입력해주세요.');
    return;
  }
  
  if (reason.length < 5) {
    alert('⚠️ 사유를 5자 이상 입력해주세요.');
    return;
  }
  
  try {
    const { type, attendanceId, attendanceRef } = currentReasonContext;
    
    // 유형별 필드명
    const reasonFields = {
      late: 'lateReason',
      earlyArrival: 'earlyArrivalReason',
      earlyLeave: 'earlyLeaveReason',
      overtime: 'overtimeReason'
    };
    
    const fieldName = reasonFields[type];
    
    // Firestore 업데이트
    const updateData = {
      [fieldName]: reason,
      [`${fieldName}SubmittedAt`]: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (attendanceRef) {
      await attendanceRef.update(updateData);
    } else {
      await db.collection('attendance').doc(attendanceId).update(updateData);
    }
    
    console.log(`✅ ${type} 사유 제출 완료`);
    
    // 모달 닫기
    document.getElementById('immediateReasonModal').style.display = 'none';
    currentReasonContext = null;
    
    alert('✅ 사유가 등록되었습니다.');
    
  } catch (error) {
    console.error('❌ 사유 제출 오류:', error);
    alert('❌ 사유 등록에 실패했습니다.');
  }
}

/**
 * ISO 8601 주차 계산 (월요일 기준)
 * @param {Date} date - 날짜 객체
 * @returns {number} 주차 번호 (1-53)
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ===================================================================
// 계약서 상세보기 모달 (contract-viewer.js 공통 모듈 사용)
// ===================================================================
// viewContract, showContractViewModal, closeContractViewModal 함수는
// js/contract-viewer.js에서 로드됩니다.

// ===================================================================
// 근무 모집 실시간 모니터링 (Open Shifts Real-time Monitoring)
// ===================================================================

let openShiftsUnsubscribe = null;  // onSnapshot 구독 해제 함수
let currentOpenShifts = [];        // 현재 표시 중인 공고 목록
let activeRecruitmentPopups = {};  // 활성 팝업 관리 {shiftId: popupElement}

/**
 * 근무 모집 실시간 모니터링 시작
 * loadUserInfo에서 자동 호출됨
 */
function monitorOpenShifts() {
  if (!currentUser || !currentUser.storeId || !currentUser.companyId) {
    console.warn('⚠️ 근무 모집 모니터링: currentUser 정보 부족', currentUser);
    return;
  }

  console.log('📢 근무 모집 실시간 모니터링 시작:', {
    companyId: currentUser.companyId,
    storeId: currentUser.storeId,
    storeName: currentUser.store
  });

  // 기존 구독 해제
  if (openShiftsUnsubscribe) {
    openShiftsUnsubscribe();
  }

  // onSnapshot으로 실시간 감시
  openShiftsUnsubscribe = db.collection('open_shifts')
    .where('companyId', '==', currentUser.companyId)
    .where('storeId', '==', currentUser.storeId)
    .where('status', '==', 'open')
    .onSnapshot(snapshot => {
      console.log('📢 open_shifts 변경 감지:', snapshot.size, '건');

      snapshot.docChanges().forEach(change => {
        const shiftId = change.doc.id;
        const shiftData = change.doc.data();

        if (change.type === 'added') {
          console.log('🆕 새 공고 추가:', shiftId, shiftData);
          showRecruitmentPopup(shiftId, shiftData);
        } else if (change.type === 'modified') {
          console.log('🔄 공고 수정:', shiftId, shiftData);
          // status가 'closed'로 변경되면 팝업 닫기
          if (shiftData.status !== 'open' && activeRecruitmentPopups[shiftId]) {
            closeRecruitmentPopup(shiftId);
          }
        } else if (change.type === 'removed') {
          console.log('🗑️ 공고 삭제:', shiftId);
          closeRecruitmentPopup(shiftId);
        }
      });

      // 현재 open 상태인 공고 목록 업데이트
      currentOpenShifts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }, error => {
      console.error('❌ open_shifts 모니터링 오류:', error);
    });
}

/**
 * 근무 모집 팝업 표시
 */
function showRecruitmentPopup(shiftId, shiftData) {
  // 이미 표시 중인 팝업이면 무시
  if (activeRecruitmentPopups[shiftId]) {
    console.log('ℹ️ 이미 표시 중인 팝업:', shiftId);
    return;
  }

  console.log('📢 팝업 생성:', shiftId, shiftData);

  const typeIcon = shiftData.type === 'replacement' ? '🔄' : '➕';
  const typeText = shiftData.type === 'replacement' ? '대타 모집' : '추가 근무';

  // 팝업 생성
  const popup = document.createElement('div');
  popup.id = `recruitment-popup-${shiftId}`;
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 10000;
    min-width: 320px;
    max-width: 90%;
    animation: popupSlideIn 0.3s ease-out;
  `;

  popup.innerHTML = `
    <style>
      @keyframes popupSlideIn {
        from {
          opacity: 0;
          transform: translate(-50%, -60%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }
    </style>

    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 48px; margin-bottom: 8px;">📢</div>
      <h3 style="margin: 0; color: #ff6b6b; font-size: 20px;">긴급 근무 모집!</h3>
    </div>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 16px; font-weight: 600;">${typeIcon} ${typeText}</span>
        <span style="background: #ff6b6b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">모집중</span>
      </div>

      <div style="font-size: 14px; color: #666; line-height: 1.8;">
        <div style="margin-bottom: 8px;">
          <strong>📅 날짜:</strong> ${shiftData.date}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>⏰ 시간:</strong> ${shiftData.startTime} ~ ${shiftData.endTime}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>🏪 매장:</strong> ${shiftData.storeName}
        </div>
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 8px; border-radius: 4px;">
          <strong style="color: #856404;">💰 추가 시급:</strong>
          <span style="color: #ff6b6b; font-size: 18px; font-weight: 700; margin-left: 8px;">+${shiftData.wageIncentive.toLocaleString()}원</span>
        </div>
        ${shiftData.description ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #dee2e6; color: #999; font-size: 13px;">
            ${shiftData.description}
          </div>
        ` : ''}
      </div>
    </div>

    <div style="display: flex; gap: 12px;">
      <button onclick="acceptRecruitment('${shiftId}')" 
        style="flex: 1; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: all 0.3s;">
        🙋 제가 할게요!
      </button>
      <button onclick="closeRecruitmentPopup('${shiftId}')" 
        style="padding: 14px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer;">
        닫기
      </button>
    </div>

    <div style="margin-top: 16px; text-align: center; font-size: 12px; color: #999;">
      ⚡ 선착순 마감! 다른 직원이 먼저 수락하면 자동으로 닫힙니다.
    </div>
  `;

  // Overlay 생성
  const overlay = document.createElement('div');
  overlay.id = `recruitment-overlay-${shiftId}`;
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
  `;

  // DOM에 추가
  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  // 활성 팝업 목록에 추가
  activeRecruitmentPopups[shiftId] = { popup, overlay };

  // 알림음 재생 (선택사항)
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGm98OScSgwOT6jk87ViHAU7k9fyz3orBSV5yPDekUALFF+26OylVRQKSKDh8r1sIQYsgM/w2Ik2CBdpvfDlnEoMDlCn4fO1YhsFPJTW8tB6KwUlecny3pFACxRftuvsplUUCkig4fO9bCEHLYHP8NiJNggXar3w5ZxKDA5Rp+Lzt2IaBTyU1/LReisGJnrJ8d+RQAwVYLbr7KZVFApJoOLzvmwhBy6Bz/DYiTUIFmu+8OWcSgwPUqfh87diFwU9ldfy0HorBiZ6yfLfkUAMFWC26+ymVRUKSaHi875tIQcugc/v2Ik1CBZsvvDlnEoMD1Kn4fO3YhcFPZTY8tF6KgUle8rx35FADBVhtuvsplUVCkqh4vO+bSEGLoDP79iJNQgWbL7w5ZtLDA9Sp+Hzt2IXBj2U2PLReisFJXvK8t+RQQ0VYbbr7KZWFQ==');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('알림음 재생 실패:', e));
  } catch (e) {
    console.log('알림음 재생 오류:', e);
  }
}

/**
 * 근무 모집 팝업 닫기
 */
function closeRecruitmentPopup(shiftId) {
  const popupData = activeRecruitmentPopups[shiftId];
  if (!popupData) {
    console.log('ℹ️ 닫을 팝업이 없음:', shiftId);
    return;
  }

  console.log('🔒 팝업 닫기:', shiftId);

  // DOM에서 제거
  if (popupData.popup) popupData.popup.remove();
  if (popupData.overlay) popupData.overlay.remove();

  // 활성 목록에서 제거
  delete activeRecruitmentPopups[shiftId];
}

/**
 * 근무 수락 (Transaction 기반 선착순)
 */
async function acceptRecruitment(shiftId) {
  if (!currentUser) {
    alert('❌ 로그인 정보가 없습니다.');
    return;
  }

  // 버튼 비활성화 (중복 클릭 방지)
  const button = event.target;
  button.disabled = true;
  button.textContent = '⏳ 처리중...';
  button.style.opacity = '0.6';

  try {
    console.log('🙋 근무 수락 시도:', shiftId);

    await db.runTransaction(async (transaction) => {
      const shiftRef = db.collection('open_shifts').doc(shiftId);
      const shiftDoc = await transaction.get(shiftRef);

      if (!shiftDoc.exists) {
        throw new Error('공고가 존재하지 않습니다.');
      }

      const shiftData = shiftDoc.data();

      // 이미 마감된 경우
      if (shiftData.status !== 'open' || shiftData.matchedUserId !== null) {
        throw new Error('이미 마감된 공고입니다.');
      }

      // 1. open_shift 상태 업데이트 (closed + matchedUserId)
      transaction.update(shiftRef, {
        status: 'closed',
        matchedUserId: currentUser.uid,
        matchedUserName: currentUser.name,
        matchedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 2. schedules 컬렉션에 근무 등록
      const scheduleRef = db.collection('schedules').doc();
      transaction.set(scheduleRef, {
        companyId: currentUser.companyId,
        storeId: currentUser.storeId,
        storeName: shiftData.storeName,
        userId: currentUser.uid,
        userName: currentUser.name,
        date: shiftData.date,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        isWorkDay: true,
        wageIncentive: shiftData.wageIncentive,
        recruitmentType: shiftData.type,  // 'replacement' | 'extra'
        fromOpenShift: true,
        openShiftId: shiftId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: 'recruitment_acceptance'
      });

      console.log('✅ Transaction 성공');
    });

    // 성공 알림
    alert('✅ 근무 수락 완료!\n\n스케줄에 자동으로 등록되었습니다.');

    // 팝업 닫기
    closeRecruitmentPopup(shiftId);

    // 스케줄 새로고침 (있다면)
    if (typeof loadEmployeeSchedule === 'function') {
      loadEmployeeSchedule();
    }

  } catch (error) {
    console.error('❌ 근무 수락 실패:', error);

    if (error.message.includes('이미 마감')) {
      alert('😢 아쉽지만 이미 마감되었습니다.\n\n다른 직원이 먼저 수락했습니다.');
      closeRecruitmentPopup(shiftId);
    } else {
      alert(`❌ 수락 실패: ${error.message}`);
      // 버튼 복구
      button.disabled = false;
      button.textContent = '🙋 제가 할게요!';
      button.style.opacity = '1';
    }
  }
}

/**
 * 모니터링 종료 (로그아웃 시)
 */
function stopMonitoringOpenShifts() {
  if (openShiftsUnsubscribe) {
    console.log('📢 근무 모집 모니터링 종료');
    openShiftsUnsubscribe();
    openShiftsUnsubscribe = null;
  }

  // 모든 활성 팝업 닫기
  Object.keys(activeRecruitmentPopups).forEach(shiftId => {
    closeRecruitmentPopup(shiftId);
  });
}

// 로그아웃 시 모니터링 종료
window.addEventListener('beforeunload', stopMonitoringOpenShifts);

// ===========================================
// 모듈 Export (Node.js/Jest 테스트용)
// 브라우저 환경에서는 무시되고, Node.js에서만 동작
// ===========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Pure Utility Functions (Firebase 의존성 없음)
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
