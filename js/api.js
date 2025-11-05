// ===================================================================
// API 통신 레이어 (API Communication Layer)
// Google Apps Script Web App과 통신
// ===================================================================

/**
 * 기본 API 호출 함수
 * @param {string} action - API 액션 (예: 'verifyEmployee', 'addWorkRecord')
 * @param {object} data - 전송할 데이터
 * @returns {Promise<object>} API 응답
 */
async function apiCall(action, data = {}) {
  // Apps Script URL 설정 확인
  if (!isConfigured()) {
    console.error('[미검증] Apps Script URL이 설정되지 않았습니다.');
    throw new Error('시스템이 설정되지 않았습니다. config.js에서 APPS_SCRIPT_URL을 설정해주세요.');
  }
  
  debugLog(`API 호출: ${action}`, data);
  
  try {
    const payload = {
      action: action,
      ...data
    };
    
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeout: CONFIG.API_TIMEOUT
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    debugLog(`API 응답: ${action}`, result);
    
    return result;
    
  } catch (error) {
    console.error(`[미검증] API 호출 실패 (${action}):`, error);
    throw error;
  }
}

// ===================================================================
// 인증 관련 API
// ===================================================================

/**
 * 관리자 비밀번호 검증
 */
async function apiVerifyManager(password) {
  return await apiCall('verifyManager', { password });
}

/**
 * 직원 정보 검증 (이름으로)
 */
async function apiVerifyEmployee(name) {
  return await apiCall('verifyEmployee', { name });
}

// ===================================================================
// 직원 관리 API
// ===================================================================

/**
 * 전체 직원 목록 조회
 */
async function apiGetAllEmployees() {
  return await apiCall('getAllEmployees');
}

/**
 * 특정 직원 정보 조회
 */
async function apiGetEmployee(employeeId) {
  return await apiCall('getEmployee', { employeeId });
}

/**
 * 직원 등록
 */
async function apiAddEmployee(employeeData) {
  return await apiCall('addEmployee', employeeData);
}

/**
 * 직원 정보 수정
 */
async function apiUpdateEmployee(employeeId, employeeData) {
  return await apiCall('updateEmployee', { employeeId, ...employeeData });
}

/**
 * 직원 퇴사 처리
 */
async function apiResignEmployee(employeeId, resignDate, reason) {
  return await apiCall('resignEmployee', { 
    employeeId, 
    resignDate, 
    reason 
  });
}

// ===================================================================
// 스케줄 관리 API
// ===================================================================

/**
 * 특정 기간의 스케줄 조회
 */
async function apiGetSchedules(startDate, endDate, storeName = null, employeeName = null) {
  return await apiCall('getSchedules', { 
    startDate, 
    endDate, 
    storeName,
    employeeName 
  });
}

/**
 * 스케줄 등록
 */
async function apiAddSchedule(scheduleData) {
  return await apiCall('addSchedule', scheduleData);
}

/**
 * 스케줄 수정
 */
async function apiUpdateSchedule(scheduleId, scheduleData) {
  return await apiCall('updateSchedule', { scheduleId, ...scheduleData });
}

/**
 * 스케줄 삭제
 */
async function apiDeleteSchedule(scheduleId) {
  return await apiCall('deleteSchedule', { scheduleId });
}

/**
 * 스케줄 일괄 등록
 */
async function apiBulkAddSchedules(schedulesArray) {
  return await apiCall('bulkAddSchedules', { schedules: schedulesArray });
}

// ===================================================================
// 근무 기록 API
// ===================================================================

/**
 * 출근 기록
 */
async function apiClockIn(employeeName, storeName, location = null) {
  return await apiCall('clockIn', { 
    employeeName, 
    storeName,
    location 
  });
}

/**
 * 퇴근 기록
 */
async function apiClockOut(employeeName, location = null) {
  return await apiCall('clockOut', { 
    employeeName,
    location 
  });
}

/**
 * 특정 기간의 근무 기록 조회
 */
async function apiGetWorkRecords(startDate, endDate, employeeName = null, storeName = null) {
  return await apiCall('getWorkRecords', { 
    startDate, 
    endDate, 
    employeeName,
    storeName 
  });
}

/**
 * 근무 기록 수동 추가 (관리자)
 */
async function apiAddWorkRecord(workRecordData) {
  return await apiCall('addWorkRecord', workRecordData);
}

/**
 * 근무 기록 수정
 */
async function apiUpdateWorkRecord(recordId, workRecordData) {
  return await apiCall('updateWorkRecord', { recordId, ...workRecordData });
}

/**
 * 근무 기록 삭제
 */
async function apiDeleteWorkRecord(recordId) {
  return await apiCall('deleteWorkRecord', { recordId });
}

/**
 * 근무 기록 확정
 */
async function apiConfirmWorkRecord(recordId) {
  return await apiCall('confirmWorkRecord', { recordId });
}

/**
 * 근무 기록 일괄 확정
 */
async function apiBulkConfirmWorkRecords(recordIds) {
  return await apiCall('bulkConfirmWorkRecords', { recordIds });
}

// ===================================================================
// 급여 관리 API
// ===================================================================

/**
 * 특정 월의 급여 내역 조회
 */
async function apiGetSalaries(year, month, employeeName = null) {
  return await apiCall('getSalaries', { 
    year, 
    month, 
    employeeName 
  });
}

/**
 * 내 급여 내역 조회 (직원용)
 */
async function apiGetMySalary(employeeName, year, month) {
  return await apiCall('getMySalary', { 
    employeeName, 
    year, 
    month 
  });
}

/**
 * 급여 계산 실행 (특정 월)
 */
async function apiCalculateSalary(year, month, employeeName = null) {
  return await apiCall('calculateSalary', { 
    year, 
    month, 
    employeeName 
  });
}

/**
 * 급여 수정
 */
async function apiUpdateSalary(salaryId, salaryData) {
  return await apiCall('updateSalary', { salaryId, ...salaryData });
}

/**
 * 급여 지급 처리
 */
async function apiPaySalary(salaryId, paymentDate, paymentMethod) {
  return await apiCall('paySalary', { 
    salaryId, 
    paymentDate, 
    paymentMethod 
  });
}

// ===================================================================
// 계약서 관리 API
// ===================================================================

/**
 * 계약서 템플릿 목록 조회
 */
async function apiGetContractTemplates() {
  return await apiCall('getContractTemplates');
}

/**
 * 특정 계약서 템플릿 조회
 */
async function apiGetContractTemplate(templateType) {
  return await apiCall('getContractTemplate', { templateType });
}

/**
 * 계약서 템플릿 저장/수정
 */
async function apiSaveContractTemplate(templateType, templateContent) {
  return await apiCall('saveContractTemplate', { 
    templateType, 
    templateContent 
  });
}

/**
 * 계약서 생성
 */
async function apiCreateContract(contractData) {
  return await apiCall('createContract', contractData);
}

/**
 * 계약서 목록 조회
 */
async function apiGetContracts(employeeName = null, status = null) {
  return await apiCall('getContracts', { 
    employeeName, 
    status 
  });
}

/**
 * 특정 계약서 조회
 */
async function apiGetContract(contractId) {
  return await apiCall('getContract', { contractId });
}

/**
 * 계약서 서명 (직원)
 */
async function apiSignContract(contractId, signatureData, signedDate) {
  return await apiCall('signContract', { 
    contractId, 
    signatureData, 
    signedDate 
  });
}

/**
 * 계약서 상태 업데이트
 */
async function apiUpdateContractStatus(contractId, status) {
  return await apiCall('updateContractStatus', { 
    contractId, 
    status 
  });
}

/**
 * 계약서 삭제
 */
async function apiDeleteContract(contractId) {
  return await apiCall('deleteContract', { contractId });
}

// ===================================================================
// 퇴직금 관리 API
// ===================================================================

/**
 * 퇴직금 목록 조회
 */
async function apiGetRetirementPays(employeeName = null) {
  return await apiCall('getRetirementPays', { employeeName });
}

/**
 * 특정 직원의 퇴직금 계산
 */
async function apiCalculateRetirementPay(employeeId) {
  return await apiCall('calculateRetirementPay', { employeeId });
}

/**
 * 퇴직금 지급 처리
 */
async function apiPayRetirement(retirementId, paymentDate, paymentMethod) {
  return await apiCall('payRetirement', { 
    retirementId, 
    paymentDate, 
    paymentMethod 
  });
}

// ===================================================================
// 대시보드 및 통계 API
// ===================================================================

/**
 * 대시보드 통계 데이터 조회
 */
async function apiGetDashboardStats(year, month) {
  return await apiCall('getDashboardStats', { year, month });
}

/**
 * 특정 매장의 통계 데이터
 */
async function apiGetStoreStats(storeName, year, month) {
  return await apiCall('getStoreStats', { 
    storeName, 
    year, 
    month 
  });
}

/**
 * 특정 직원의 근무 통계
 */
async function apiGetEmployeeStats(employeeName, year, month) {
  return await apiCall('getEmployeeStats', { 
    employeeName, 
    year, 
    month 
  });
}

// ===================================================================
// 설정 및 기타 API
// ===================================================================

/**
 * 시스템 설정 조회
 */
async function apiGetSettings() {
  return await apiCall('getSettings');
}

/**
 * 시스템 설정 저장
 */
async function apiSaveSettings(settings) {
  return await apiCall('saveSettings', settings);
}

/**
 * 데이터 백업
 */
async function apiBackupData() {
  return await apiCall('backupData');
}

/**
 * 오래된 데이터 정리 (2년 이상)
 */
async function apiCleanupOldData() {
  return await apiCall('cleanupOldData');
}

/**
 * 로그 기록
 */
async function apiLogAction(action, details) {
  return await apiCall('logAction', { 
    action, 
    details,
    timestamp: new Date().toISOString(),
    user: getCurrentUserName()
  });
}

// ===================================================================
// 에러 핸들링 래퍼
// ===================================================================

/**
 * API 호출을 안전하게 실행하고 에러 처리
 */
async function safeApiCall(apiFunction, ...args) {
  try {
    showLoading();
    const result = await apiFunction(...args);
    hideLoading();
    
    if (result.success) {
      return result.data;
    } else {
      showAlert(result.message || 'API 호출 중 오류가 발생했습니다.', 'error');
      return null;
    }
  } catch (error) {
    hideLoading();
    console.error('[미검증] API 호출 에러:', error);
    showAlert('서버와 통신 중 오류가 발생했습니다.', 'error');
    return null;
  }
}

// ===================================================================
// 배치 작업 헬퍼
// ===================================================================

/**
 * 여러 API 호출을 병렬로 실행
 */
async function parallelApiCalls(apiCallsArray) {
  try {
    showLoading('데이터 로딩 중...');
    const results = await Promise.all(apiCallsArray);
    hideLoading();
    return results;
  } catch (error) {
    hideLoading();
    console.error('[미검증] 병렬 API 호출 에러:', error);
    showAlert('데이터 로딩 중 오류가 발생했습니다.', 'error');
    return null;
  }
}
