// ===================================================================
// 인증 및 권한 관리 (Authentication & Authorization)
// ===================================================================

/**
 * 사용자 정보 저장
 */
function setUserInfo(userInfo) {
  if (!userInfo || !userInfo.name) {
    console.error('[미검증] 유효하지 않은 사용자 정보');
    return false;
  }
  
  const userData = {
    name: userInfo.name,
    employeeId: userInfo.employeeId,
    store: userInfo.store,
    position: userInfo.position,
    employmentType: userInfo.employmentType,
    loginTime: new Date().toISOString()
  };
  
  saveToSession(CONFIG.STORAGE_KEYS.USER_INFO, userData);
  debugLog('사용자 정보 저장:', userData);
  
  return true;
}

/**
 * 사용자 정보 가져오기
 */
function getUserInfo() {
  return getFromSession(CONFIG.STORAGE_KEYS.USER_INFO);
}

/**
 * 현재 로그인 여부 확인
 */
function isLoggedIn() {
  const userInfo = getUserInfo();
  return userInfo !== null && userInfo.name;
}

/**
 * 로그아웃
 */
function logout() {
  removeFromSession(CONFIG.STORAGE_KEYS.USER_INFO);
  removeFromSession(CONFIG.STORAGE_KEYS.CURRENT_ROLE);
  debugLog('로그아웃 완료');
}

/**
 * 현재 역할 설정 (employee 또는 manager)
 */
function setCurrentRole(role) {
  if (!['employee', 'manager'].includes(role)) {
    console.error('[미검증] 유효하지 않은 역할:', role);
    return false;
  }
  
  saveToSession(CONFIG.STORAGE_KEYS.CURRENT_ROLE, role);
  debugLog('역할 설정:', role);
  
  return true;
}

/**
 * 현재 역할 가져오기
 */
function getCurrentRole() {
  return getFromSession(CONFIG.STORAGE_KEYS.CURRENT_ROLE);
}

/**
 * 관리자 여부 확인
 */
function isManager() {
  return getCurrentRole() === 'manager';
}

/**
 * 직원 여부 확인
 */
function isEmployee() {
  return getCurrentRole() === 'employee';
}

/**
 * 관리자 비밀번호 확인
 * [미검증] 실제 운영 시에는 서버 측에서 검증해야 하며, 
 * 클라이언트 측 검증은 보안상 취약할 수 있음
 */
async function verifyManagerPassword(password) {
  try {
    showLoading('관리자 인증 중...');
    
    const response = await apiCall('verifyManager', {
      password: password
    });
    
    hideLoading();
    
    if (response.success) {
      setCurrentRole('manager');
      saveToSession(CONFIG.STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
      return true;
    } else {
      showAlert('비밀번호가 일치하지 않습니다.', 'error');
      return false;
    }
  } catch (error) {
    hideLoading();
    console.error('[미검증] 관리자 인증 오류:', error);
    showAlert('인증 중 오류가 발생했습니다.', 'error');
    return false;
  }
}

/**
 * 직원 인증 (이름으로)
 */
async function verifyEmployee(employeeName) {
  try {
    showLoading('직원 정보 확인 중...');
    
    const response = await apiCall('verifyEmployee', {
      name: employeeName
    });
    
    hideLoading();
    
    if (response.success && response.data) {
      setUserInfo(response.data);
      setCurrentRole('employee');
      saveToSession(CONFIG.STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
      return true;
    } else {
      showAlert('등록된 직원을 찾을 수 없습니다.', 'error');
      return false;
    }
  } catch (error) {
    hideLoading();
    console.error('[미검증] 직원 인증 오류:', error);
    showAlert('인증 중 오류가 발생했습니다.', 'error');
    return false;
  }
}

/**
 * 페이지 접근 권한 체크
 * 로그인하지 않은 경우 index.html로 리다이렉트
 */
function checkAuth() {
  if (!isLoggedIn()) {
    debugLog('인증되지 않은 접근 시도, 메인 페이지로 이동');
    window.location.href = 'index.html';
    return false;
  }
  
  return true;
}

/**
 * 관리자 페이지 접근 권한 체크
 */
function checkManagerAuth() {
  if (!isLoggedIn() || !isManager()) {
    debugLog('관리자 권한 없음, 메인 페이지로 이동');
    window.location.href = 'index.html';
    return false;
  }
  
  return true;
}

/**
 * 직원 페이지 접근 권한 체크
 */
function checkEmployeeAuth() {
  if (!isLoggedIn() || !isEmployee()) {
    debugLog('직원 권한 없음, 메인 페이지로 이동');
    window.location.href = 'index.html';
    return false;
  }
  
  return true;
}

/**
 * 세션 만료 체크 (선택적 기능)
 * 마지막 로그인 시간으로부터 일정 시간 경과 시 자동 로그아웃
 */
function checkSessionExpiry(maxHours = 24) {
  const lastLogin = getFromSession(CONFIG.STORAGE_KEYS.LAST_LOGIN);
  
  if (!lastLogin) return;
  
  const lastLoginTime = new Date(lastLogin);
  const now = new Date();
  const hoursPassed = (now - lastLoginTime) / (1000 * 60 * 60);
  
  if (hoursPassed > maxHours) {
    debugLog('세션 만료, 자동 로그아웃');
    logout();
    showAlert('세션이 만료되었습니다. 다시 로그인해주세요.', 'warning');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
  }
}

/**
 * 현재 로그인한 사용자 이름 가져오기
 */
function getCurrentUserName() {
  const userInfo = getUserInfo();
  return userInfo ? userInfo.name : null;
}

/**
 * 현재 로그인한 사용자의 매장 가져오기
 */
function getCurrentUserStore() {
  const userInfo = getUserInfo();
  return userInfo ? userInfo.store : null;
}

/**
 * 관리자 로그인 모달 표시
 */
function showManagerLoginModal(onSuccess) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'managerLoginModal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>관리자 인증</h3>
      <p>관리자 비밀번호를 입력해주세요.</p>
      <div class="form-group">
        <label>비밀번호</label>
        <input type="password" id="managerPasswordInput" class="form-control" placeholder="비밀번호 입력">
      </div>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="cancelLoginBtn">취소</button>
        <button class="btn btn-primary" id="confirmLoginBtn">확인</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const passwordInput = document.getElementById('managerPasswordInput');
  const confirmBtn = document.getElementById('confirmLoginBtn');
  const cancelBtn = document.getElementById('cancelLoginBtn');
  
  // 엔터키로 로그인
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    }
  });
  
  // 확인 버튼
  confirmBtn.addEventListener('click', async () => {
    const password = passwordInput.value.trim();
    
    if (!password) {
      showAlert('비밀번호를 입력해주세요.', 'warning');
      return;
    }
    
    const verified = await verifyManagerPassword(password);
    
    if (verified) {
      modal.remove();
      showAlert('관리자 인증이 완료되었습니다.', 'success');
      if (onSuccess) onSuccess();
    }
  });
  
  // 취소 버튼
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // 모달 오픈 시 포커스
  setTimeout(() => passwordInput.focus(), 100);
}

/**
 * 직원 로그인 모달 표시
 */
function showEmployeeLoginModal(onSuccess) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'employeeLoginModal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>직원 인증</h3>
      <p>이름을 입력해주세요.</p>
      <div class="form-group">
        <label>이름</label>
        <input type="text" id="employeeNameInput" class="form-control" placeholder="이름 입력">
      </div>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="cancelLoginBtn">취소</button>
        <button class="btn btn-primary" id="confirmLoginBtn">확인</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const nameInput = document.getElementById('employeeNameInput');
  const confirmBtn = document.getElementById('confirmLoginBtn');
  const cancelBtn = document.getElementById('cancelLoginBtn');
  
  // 엔터키로 로그인
  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      confirmBtn.click();
    }
  });
  
  // 확인 버튼
  confirmBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    
    if (!name) {
      showAlert('이름을 입력해주세요.', 'warning');
      return;
    }
    
    const verified = await verifyEmployee(name);
    
    if (verified) {
      modal.remove();
      showAlert(`환영합니다, ${name}님!`, 'success');
      if (onSuccess) onSuccess();
    }
  });
  
  // 취소 버튼
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // 모달 오픈 시 포커스
  setTimeout(() => nameInput.focus(), 100);
}
