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
  clearTenantContext();  // v3.1: Clear tenant context on logout
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

// ===================================================================
// Multi-tenant Context Management (v3.1)
// ===================================================================

/**
 * 테넌트 컨텍스트 설정
 * @param {string} companyId - 회사 ID
 * @param {string} storeId - 매장 ID  
 * @param {string} role - 직원 역할
 */
function setTenantContext(companyId, storeId, role) {
  if (!companyId || !storeId || !role) {
    console.error('[미검증] 테넌트 컨텍스트 필수 정보 누락');
    return false;
  }
  
  const tenantContext = {
    companyId: companyId,
    storeId: storeId,
    role: role,
    setAt: new Date().toISOString()
  };
  
  saveToSession(CONFIG.STORAGE_KEYS.TENANT_CONTEXT, tenantContext);
  debugLog('테넌트 컨텍스트 설정:', tenantContext);
  
  return true;
}

/**
 * 테넌트 컨텍스트 가져오기
 * @returns {Object|null} { companyId, storeId, role, setAt }
 */
function getTenantContext() {
  return getFromSession(CONFIG.STORAGE_KEYS.TENANT_CONTEXT);
}

/**
 * 현재 회사 ID 가져오기
 * @returns {string|null}
 */
function getCurrentCompanyId() {
  const context = getTenantContext();
  return context ? context.companyId : null;
}

/**
 * 현재 매장 ID 가져오기
 * @returns {string|null}
 */
function getCurrentStoreId() {
  const context = getTenantContext();
  return context ? context.storeId : null;
}

/**
 * 테넌트 컨텍스트 초기화 (로그아웃 시)
 */
function clearTenantContext() {
  removeFromSession(CONFIG.STORAGE_KEYS.TENANT_CONTEXT);
  debugLog('테넌트 컨텍스트 초기화');
}
