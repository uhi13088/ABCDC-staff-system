// ===================================================================
// 맛남살롱 관리자 시스템
// 작성자: Admin Portal
// 기능: 직원/근태/급여/계약서 관리, 공지사항, 대시보드
// ===================================================================

// ===================================================================
// 전역 변수
// ===================================================================

let isAuthenticated = false; // 관리자 인증 상태
let currentTab = 'dashboard'; // 현재 활성 탭

// ===================================================================
// 더미 데이터 제거됨 - 실제 Firebase 데이터 사용
// ===================================================================

// ===================================================================
// 데이터 마이그레이션 유틸리티
// ===================================================================

/**
 * attendance 컬렉션의 기존 문서에 date 필드 추가
 * createdAt 또는 clockIn에서 날짜 추출
 */
async function migrateAttendanceData() {
  console.log('🔄 근태 데이터 마이그레이션 시작...');
  
  try {
    const snapshot = await firebase.firestore().collection('attendance').get();
    
    if (snapshot.empty) {
      console.log('⚠️ 마이그레이션할 데이터가 없습니다.');
      return;
    }
    
    let migratedCount = 0;
    const batch = firebase.firestore().batch();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // date 필드가 이미 있으면 스킵
      if (data.date) {
        return;
      }
      
      // date 필드 생성
      let dateValue = null;
      
      if (data.createdAt) {
        // createdAt이 문자열인 경우 (ISO 형식)
        if (typeof data.createdAt === 'string') {
          dateValue = data.createdAt.split('T')[0]; // "2025-10-31"
        }
      } else if (data.clockIn) {
        // clockIn에서 날짜 추출
        if (typeof data.clockIn === 'string') {
          // ISO 형식인 경우
          if (data.clockIn.includes('T')) {
            dateValue = data.clockIn.split('T')[0];
          } else {
            // 시간만 있는 경우 오늘 날짜 사용
            const today = new Date();
            dateValue = today.toISOString().split('T')[0];
          }
        }
      }
      
      if (dateValue) {
        console.log(`📝 마이그레이션: ${doc.id} → date: ${dateValue}`);
        batch.update(doc.ref, { date: dateValue });
        migratedCount++;
      }
    });
    
    if (migratedCount > 0) {
      await batch.commit();
      console.log(`✅ ${migratedCount}개 문서 마이그레이션 완료!`);
      alert(`✅ ${migratedCount}개의 근태 기록에 날짜 필드를 추가했습니다.\n페이지를 새로고침해주세요.`);
    } else {
      console.log('✅ 모든 문서에 date 필드가 이미 존재합니다.');
    }
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    alert('❌ 데이터 마이그레이션에 실패했습니다: ' + error.message);
  }
}

// 개발자 콘솔에서 호출 가능하도록 전역으로 노출
window.migrateAttendanceData = migrateAttendanceData;

// ===================================================================
// 초기화 및 페이지 로드
// ===================================================================

document.addEventListener('DOMContentLoaded', function() {
  debugLog('관리자 페이지 로드');
  
  // 현재 월 기본값 설정
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  // 월 필터 초기화
  const monthFilters = ['attendanceMonth', 'salaryMonth', 'statsMonth'];
  monthFilters.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.value = currentMonth;
    }
  });
  
  // 로그인 상태 확인
  checkAuthStatus();
});

// ===================================================================
// 인증 관리 (로그인/로그아웃)
// ===================================================================

/**
 * 인증 상태 확인
 * sessionStorage에서 로그인 여부 확인
 */
function checkAuthStatus() {
  const savedAuth = sessionStorage.getItem('admin_authenticated');
  
  if (savedAuth === 'true') {
    isAuthenticated = true;
    showMainScreen();
  } else {
    showLoginScreen();
  }
}

/**
 * 관리자 로그인 처리
 * 개발 모드: 간단한 비밀번호 체크
 * 배포 모드: Apps Script API 연동
 */
async function handleAdminLogin() {
  const passwordInput = document.getElementById('adminPassword');
  const password = passwordInput.value;
  
  if (!password) {
    alert('⚠️ 비밀번호를 입력해주세요.');
    passwordInput.focus();
    return;
  }
  
  // Apps Script URL 확인
  if (!isConfigured()) {
    // 개발 모드: 간단한 비밀번호 체크
    if (password === 'admin' || password === 'admin1234') {
      isAuthenticated = true;
      sessionStorage.setItem('admin_authenticated', 'true');
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_ROLE, 'admin');
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
      showMainScreen();
    } else {
      alert('❌ 비밀번호가 올바르지 않습니다.');
      passwordInput.value = '';
      passwordInput.focus();
    }
    return;
  }
  
  try {
    // API 호출하여 관리자 인증
    const response = await callAPI('authenticateAdmin', { password: password });
    
    if (response.success) {
      isAuthenticated = true;
      sessionStorage.setItem('admin_authenticated', 'true');
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_ROLE, 'admin');
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
      showMainScreen();
    } else {
      alert('❌ 비밀번호가 올바르지 않습니다.');
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (error) {
    console.error('로그인 오류:', error);
    alert('❌ 로그인 중 오류가 발생했습니다.');
  }
}

/**
 * Enter 키로 로그인
 * @param {Event} event - 키보드 이벤트
 */
function handleAdminKeyPress(event) {
  if (event.key === 'Enter') {
    handleAdminLogin();
  }
}

/**
 * 로그아웃 처리
 */
function logout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    isAuthenticated = false;
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_ROLE);
    showLoginScreen();
  }
}

/**
 * 로그인 화면 표시
 */
function showLoginScreen() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('mainScreen').classList.add('hidden');
}

/**
 * 메인 화면 표시
 */
function showMainScreen() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainScreen').classList.remove('hidden');
  
  // 대시보드 데이터 로드
  loadDashboard();
  
  // 기본 탭 활성화 (직원 관리)
  showTab('employees');
}

/**
 * 홈으로 이동
 */
function goHome() {
  if (confirm('메인 페이지로 이동하시겠습니까?')) {
    window.location.href = 'index.html';
  }
}

// ===================================================================
// 탭 전환
// ===================================================================

/**
 * 탭 전환
 * @param {string} tabName - 탭 이름 ('dashboard', 'employees', 'attendance', 'salary', 'approvals', 'contracts', 'notice')
 */
function showTab(tabName) {
  switchTab(tabName);
}

/**
 * 탭 전환 로직
 * @param {string} tabName - 탭 이름
 */
function switchTab(tabName) {
  console.log('🔄 탭 전환:', tabName);
  currentTab = tabName;
  
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // 모든 탭 콘텐츠 숨김
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
    content.style.display = 'none';
  });
  
  // 선택된 탭 활성화
  const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // 선택된 콘텐츠 표시
  const tabId = `tab${capitalize(tabName)}`;
  const selectedContent = document.getElementById(tabId);
  if (selectedContent) {
    selectedContent.classList.add('active');
    selectedContent.style.display = 'block';
  }
  
  // 탭별 데이터 로드
  switch(tabName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'employees':
      loadEmployees();
      break;
    case 'attendance':
      loadAttendanceList();
      break;
    case 'salary':
      loadSalaryList();
      break;
    case 'approvals':
      loadApprovals();
      break;
    case 'contracts':
      loadContracts();
      break;
    case 'notice':
      loadNotice();
      break;
  }
}

// ===================================================================
// 대시보드
// ===================================================================

/**
 * 대시보드 데이터 로드
 * 직원 수, 오늘 출근, 승인 대기, 미서명 계약서
 */
function loadDashboard() {
  debugLog('대시보드 로드');
  
  // 더미 데이터로 표시
  updateDashboardCard('totalEmployees', '12');
  updateDashboardCard('todayAttendance', '8');
  updateDashboardCard('pendingApprovals', '3');
  updateDashboardCard('unsignedContracts', '1');
}

/**
 * 대시보드 카드 업데이트
 * @param {string} id - 카드 요소 ID
 * @param {string} value - 표시할 값
 * @param {string} subtitle - 부제목 (선택사항)
 */
function updateDashboardCard(id, value, subtitle) {
  const valueElement = document.getElementById(id);
  if (valueElement) {
    valueElement.textContent = value;
    
    if (subtitle) {
      const subElement = valueElement.nextElementSibling;
      if (subElement) {
        subElement.textContent = subtitle;
      }
    }
  }
}

// ===================================================================
// 직원 관리
// ===================================================================

/**
 * 직원 목록 로드 및 표시
 */
async function loadEmployees() {
  debugLog('직원 목록 로드');
  
  const tbody = document.getElementById('employeeTableBody');
  if (!tbody) {
    console.error('❌ employeeTableBody 요소를 찾을 수 없습니다');
    return;
  }
  
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">직원 목록을 불러오는 중...</td></tr>';
  
  try {
    console.log('🔍 Firebase에서 직원 데이터 조회 시작...');
    console.log('📍 컬렉션: users, 조건: userType == employee');
    
    // Firebase users 컬렉션에서 직원 데이터 가져오기
    const usersSnapshot = await firebase.firestore().collection('users')
      .where('userType', '==', 'employee')
      .get();
    
    console.log(`📊 조회 결과: ${usersSnapshot.size}명의 직원`);
    
    // 디버깅: 모든 users 컬렉션 데이터 확인
    const allUsersSnapshot = await firebase.firestore().collection('users').get();
    console.log(`📊 전체 users 컬렉션: ${allUsersSnapshot.size}개 문서`);
    allUsersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.name} (userType: ${data.userType || 'undefined'})`);
    });
    
    if (usersSnapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
            <p style="margin-bottom: var(--spacing-md);">등록된 직원이 없습니다.</p>
            <p style="font-size: 14px; color: var(--text-secondary);">직원 가입 페이지에서 먼저 직원을 등록해주세요.</p>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
              💡 전체 users: ${allUsersSnapshot.size}명 (콘솔에서 상세 확인)
            </p>
          </td>
        </tr>
      `;
      return;
    }
    
    const employees = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`✅ 직원 로드: ${data.name} (${doc.id})`);
      employees.push({
        uid: doc.id,
        name: data.name || '-',
        store: data.store || '-',
        position: data.position || '-',
        phone: data.phone || '-',
        birth: data.birth || '-',
        status: data.status || 'active',
        email: data.email || '-'
      });
    });
    
    console.log(`✅ ${employees.length}명의 직원 목록 표시`);
    
    tbody.innerHTML = employees.map(emp => `
      <tr>
        <td>${emp.name}</td>
        <td>${emp.store}</td>
        <td>${emp.position}</td>
        <td>${emp.phone}</td>
        <td>${emp.birth}</td>
        <td><span class="badge ${emp.status === 'active' ? 'badge-success' : 'badge-danger'}">${emp.status === 'active' ? '재직' : '퇴사'}</span></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="openContractPageForEmployee('${emp.uid}', '${emp.name}', '${emp.birth}', '${emp.phone}', '${emp.store}')">📝 계약서작성</button>
          <button class="btn btn-sm btn-secondary" onclick="showEmployeeContractList('${emp.name}')">📄 계약서목록</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('❌ 직원 목록 로드 실패:', error);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger-color);">❌ 직원 목록을 불러오는데 실패했습니다.</td></tr>';
  }
}

// 직원 추가/수정/삭제 기능은 계약서 작성으로 대체됨

// ===================================================================
// 근태 관리
// ===================================================================

/**
 * 근태 목록 로드 및 표시
 */
async function loadAttendanceList() {
  debugLog('근태 목록 로드');
  
  const tbody = document.getElementById('attendanceTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">근태 정보를 불러오는 중...</td></tr>';
  
  try {
    console.log('🔍 Firestore 쿼리 시작: attendance 컬렉션');
    
    // Firestore에서 근태 데이터 가져오기
    const attendanceSnapshot = await firebase.firestore().collection('attendance')
      .orderBy('date', 'desc')
      .limit(100)
      .get();
    
    console.log('📊 조회 결과:', {
      empty: attendanceSnapshot.empty,
      size: attendanceSnapshot.size,
      docs: attendanceSnapshot.docs.length
    });
    
    if (attendanceSnapshot.empty) {
      console.warn('⚠️ attendance 컬렉션이 비어있습니다');
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">근태 정보가 없습니다.</td></tr>';
      return;
    }
    
    const attendanceList = [];
    attendanceSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('📄 문서 데이터:', { id: doc.id, data });
      attendanceList.push({ id: doc.id, ...data });
    });
    
    console.log('✅ 총 근태 기록:', attendanceList.length);
    
    tbody.innerHTML = attendanceList.map(att => {
      const statusClass = getStatusBadgeClass(att.status || '정상');
      return `
        <tr>
          <td>${att.date || '-'}</td>
          <td>${att.employeeName || att.name || '-'}</td>
          <td>${att.store || '-'}</td>
          <td>${att.clockIn || att.checkIn || '-'}</td>
          <td>${att.clockOut || att.checkOut || '-'}</td>
          <td>${att.workType || '정규근무'}</td>
          <td><span class="badge badge-${statusClass}">${att.status || '정상'}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="viewAttendanceDetail('${att.id}')">상세</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('❌ 근태 목록 로드 실패:', error);
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--danger-color);">❌ 근태 정보를 불러오는데 실패했습니다.</td></tr>';
  }
}

/**
 * 근태 필터링
 */
function filterAttendance() {
  loadAttendanceList();
}

/**
 * 근태 상세 보기
 * @param {number} id - 근태 기록 ID
 */
function viewAttendanceDetail(id) {
  alert(`⚠️ 근태 ${id} 상세 기능은 추후 구현 예정입니다.`);
}

// ===================================================================
// 급여 관리
// ===================================================================

/**
 * 급여 목록 로드 및 표시
 */
async function loadSalaryList() {
  debugLog('급여 목록 로드');
  
  const tbody = document.getElementById('salaryTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">급여 정보를 불러오는 중...</td></tr>';
  
  try {
    // Firestore에서 급여 데이터 가져오기
    const salarySnapshot = await firebase.firestore().collection('salaries')
      .orderBy('month', 'desc')
      .limit(100)
      .get();
    
    if (salarySnapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">급여 정보가 없습니다.</td></tr>';
      return;
    }
    
    const salaryList = [];
    salarySnapshot.forEach(doc => {
      salaryList.push({ id: doc.id, ...doc.data() });
    });
    
    tbody.innerHTML = salaryList.map(sal => `
      <tr>
        <td>${sal.employeeName || sal.name || '-'}</td>
        <td>${sal.store || '-'}</td>
        <td>${(sal.basicPay || 0).toLocaleString()}원</td>
        <td>${(sal.overtimePay || 0).toLocaleString()}원</td>
        <td>${(sal.deductions || 0).toLocaleString()}원</td>
        <td><strong>${(sal.totalPay || 0).toLocaleString()}원</strong></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="viewSalaryDetail('${sal.id}')">명세서</button>
          <button class="btn btn-sm btn-success" onclick="paySalary('${sal.id}')">지급</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('급여 목록 로드 실패:', error);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger-color);">❌ 급여 정보를 불러오는데 실패했습니다.</td></tr>';
  }
}

/**
 * 급여 필터링
 */
function filterSalary() {
  loadSalaryList();
}

/**
 * 급여 계산
 */
function calculateSalary() {
  if (confirm('💰 이번 달 급여를 계산하시겠습니까?')) {
    alert('⚠️ 급여 계산 기능은 추후 구현 예정입니다.');
  }
}

/**
 * 급여 명세서 보기
 * @param {number} id - 급여 ID
 */
function viewSalaryDetail(id) {
  alert(`⚠️ 급여 명세서 ${id} 기능은 추후 구현 예정입니다.`);
}

/**
 * 급여 지급 처리
 * @param {number} id - 급여 ID
 */
function paySalary(id) {
  if (confirm('💸 급여를 지급 처리하시겠습니까?')) {
    alert('⚠️ 급여 지급 기능은 추후 구현 예정입니다.');
  }
}

// ===================================================================
// 승인 관리
// ===================================================================

/**
 * 승인 목록 로드 및 표시
 */
async function loadApprovals() {
  debugLog('승인 목록 로드');
  
  const tbody = document.getElementById('approvalsTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">승인 정보를 불러오는 중...</td></tr>';
  
  try {
    // Firestore에서 승인 데이터 가져오기
    const approvalsSnapshot = await firebase.firestore().collection('approvals')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    if (approvalsSnapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">승인 대기 건이 없습니다.</td></tr>';
      return;
    }
    
    const approvalsList = [];
    approvalsSnapshot.forEach(doc => {
      approvalsList.push({ id: doc.id, ...doc.data() });
    });
    
    tbody.innerHTML = approvalsList.map(app => {
      const statusClass = getApprovalStatusClass(app.status || '대기');
      const actions = app.status === '대기' || !app.status
        ? `<button class="btn btn-sm btn-success" onclick="approveRequest('${app.id}')">승인</button>
           <button class="btn btn-sm btn-danger" onclick="rejectRequest('${app.id}')">반려</button>`
        : `<span class="badge badge-${statusClass}">${app.status}</span>`;
      
      return `
        <tr>
          <td><span class="badge badge-info">${app.type || '-'}</span></td>
          <td>${app.employeeName || app.name || '-'}</td>
          <td>${app.requestDate || app.date || '-'}</td>
          <td>${app.content || app.description || '-'}</td>
          <td>${app.amount || '-'}</td>
          <td><span class="badge badge-${statusClass}">${app.status || '대기'}</span></td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('승인 목록 로드 실패:', error);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger-color);">❌ 승인 정보를 불러오는데 실패했습니다.</td></tr>';
  }
}

/**
 * 요청 승인
 * @param {number} id - 요청 ID
 */
function approveRequest(id) {
  if (confirm('✅ 이 요청을 승인하시겠습니까?')) {
    alert('⚠️ 승인 기능은 추후 구현 예정입니다.');
    loadApprovals();
  }
}

/**
 * 요청 반려
 * @param {number} id - 요청 ID
 */
function rejectRequest(id) {
  if (confirm('❌ 이 요청을 반려하시겠습니까?')) {
    alert('⚠️ 반려 기능은 추후 구현 예정입니다.');
    loadApprovals();
  }
}

// ===================================================================
// 계약서 관리
// ===================================================================

/**
 * 계약서 목록 로드 및 표시
 */
function loadContracts() {
  debugLog('계약서 목록 로드');
  
  const tbody = document.getElementById('contractsTableBody');
  if (!tbody) return;
  
  // localStorage에서 생성된 계약서 불러오기
  const allContracts = [];
  
  // localStorage의 모든 키 확인
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('contract_C')) {
      try {
        const contractData = JSON.parse(localStorage.getItem(key));
        const contractId = key.replace('contract_', '');
        
        // 서명 확인
        const signedContracts = JSON.parse(localStorage.getItem('signedContracts') || '[]');
        const isSigned = signedContracts.some(sc => sc.id === contractId);
        
        allContracts.push({
          id: contractId,
          name: contractData.employeeName,
          type: contractData.contractType,
          period: `${contractData.startDate} ~ ${contractData.endDate}`,
          createdAt: new Date(contractData.createdAt).toLocaleDateString('ko-KR'),
          createdAtRaw: contractData.createdAt,
          status: isSigned ? '서명완료' : '서명대기',
          data: contractData
        });
      } catch (e) {
        console.error('계약서 로드 오류:', e);
      }
    }
  }
  
  // 직원별로 그룹화
  const employeeGroups = {};
  allContracts.forEach(contract => {
    if (!employeeGroups[contract.name]) {
      employeeGroups[contract.name] = [];
    }
    employeeGroups[contract.name].push(contract);
  });
  
  // 각 그룹 내에서 최신순 정렬
  Object.keys(employeeGroups).forEach(name => {
    employeeGroups[name].sort((a, b) => new Date(b.createdAtRaw) - new Date(a.createdAtRaw));
  });
  
  if (allContracts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">생성된 계약서가 없습니다.</td></tr>';
    return;
  }
  
  // 직원별로 표시 (최신 계약서 1개만 표시, 나머지는 관리 버튼으로 확인)
  tbody.innerHTML = Object.keys(employeeGroups).map(employeeName => {
    const contracts = employeeGroups[employeeName];
    const latestContract = contracts[0];
    const contractCount = contracts.length;
    const statusClass = getContractStatusClass(latestContract.status);
    
    return `
      <tr>
        <td>
          <strong>${employeeName}</strong>
          ${contractCount > 1 ? `<span class="badge badge-info" style="margin-left: 8px;">${contractCount}건</span>` : ''}
        </td>
        <td>${latestContract.type}</td>
        <td>${latestContract.period}</td>
        <td>${latestContract.createdAt}</td>
        <td><span class="badge badge-${statusClass}">${latestContract.status}</span></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="showEmployeeContractList('${employeeName}')">📋 관리 (${contractCount}건)</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * 계약서 작성 페이지로 이동
 */
function createContract() {
  window.location.href = 'contract.html';
}

/**
 * 직원의 모든 계약서 리스트 표시
 * @param {string} employeeName - 직원 이름
 */
function showEmployeeContractList(employeeName) {
  // localStorage에서 해당 직원의 모든 계약서 찾기
  const contracts = [];
  let employeeId = null;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('contract_C')) {
      const contractData = JSON.parse(localStorage.getItem(key));
      if (contractData.employeeName === employeeName) {
        const contractId = key.replace('contract_', '');
        
        // 직원 ID 추출 (첫 계약서에서)
        if (!employeeId) {
          employeeId = getEmployeeIdFromContract(contractData);
        }
        
        // 서명 상태 확인
        const signedContracts = JSON.parse(localStorage.getItem('signedContracts') || '[]');
        const isSigned = signedContracts.some(sc => sc.id === contractId);
        
        contracts.push({
          id: contractId,
          data: contractData,
          isSigned: isSigned,
          createdAt: contractData.createdAt || null
        });
      }
    }
  }
  
  if (contracts.length === 0) {
    alert('⚠️ 해당 직원의 계약서가 없습니다.');
    return;
  }
  
  // 최신순 정렬
  contracts.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA;
  });
  
  // 직원 서류 정보 가져오기
  const docKey = `employee_docs_${employeeName}_${employeeId}`;
  const employeeDocs = JSON.parse(localStorage.getItem(docKey) || '{}');
  
  // 통장사본 정보 HTML
  let bankAccountHtml = '';
  if (employeeDocs.bankAccount) {
    const ba = employeeDocs.bankAccount;
    bankAccountHtml = `
      <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: #f0f9ff; border-radius: var(--border-radius); border-left: 4px solid #3b82f6;">
        <h4 style="margin-bottom: var(--spacing-sm); display: flex; align-items: center; gap: 8px;">
          🏦 통장사본
        </h4>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-md);">
          <div>
            <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 4px 0;">은행명</p>
            <p style="font-weight: 600; margin: 0;">${ba.bankName || '-'}</p>
          </div>
          <div>
            <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 4px 0;">계좌번호</p>
            <p style="font-weight: 600; margin: 0;">${ba.accountNumber || '-'}</p>
          </div>
          <div>
            <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 4px 0;">예금주</p>
            <p style="font-weight: 600; margin: 0;">${ba.accountHolder || '-'}</p>
          </div>
        </div>
        <p style="font-size: 11px; color: var(--text-secondary); margin: 8px 0 0 0;">
          최종 업데이트: ${ba.updatedAt ? new Date(ba.updatedAt).toLocaleString('ko-KR') : '-'}
        </p>
      </div>
    `;
  } else {
    bankAccountHtml = `
      <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: #fff3cd; border-radius: var(--border-radius); border-left: 4px solid #ffc107;">
        <p style="margin: 0; font-size: 14px;">
          🏦 <strong>통장사본</strong> - 직원이 아직 등록하지 않았습니다.
        </p>
      </div>
    `;
  }
  
  // 보건증 정보 HTML
  let healthCertHtml = '';
  if (employeeDocs.healthCert) {
    const hc = employeeDocs.healthCert;
    const expiryDate = hc.expiryDate ? new Date(hc.expiryDate) : null;
    const isExpired = expiryDate && expiryDate < new Date();
    const expiryBadge = isExpired ? 
      '<span class="badge badge-danger" style="margin-left: 8px;">⚠️ 만료됨</span>' : 
      '<span class="badge badge-success" style="margin-left: 8px;">✅ 유효</span>';
    
    healthCertHtml = `
      <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: ${isExpired ? '#fee2e2' : '#f0fdf4'}; border-radius: var(--border-radius); border-left: 4px solid ${isExpired ? '#ef4444' : '#22c55e'};">
        <h4 style="margin-bottom: var(--spacing-sm); display: flex; align-items: center; gap: 8px;">
          🩺 보건증 ${expiryBadge}
        </h4>
        ${hc.imageData ? `
          <div style="margin-bottom: var(--spacing-md); text-align: center;">
            <img src="${hc.imageData}" 
                 style="max-width: 100%; max-height: 200px; border: 2px solid var(--border-color); border-radius: var(--border-radius); cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" 
                 onclick="window.open('${hc.imageData}', '_blank')"
                 title="클릭하면 크게 볼 수 있습니다">
            <p style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
              💡 이미지를 클릭하면 크게 볼 수 있습니다
            </p>
          </div>
        ` : '<p style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">업로드된 이미지가 없습니다.</p>'}
        <div>
          <p style="font-size: 12px; color: var(--text-secondary); margin: 0 0 4px 0;">유효기간</p>
          <p style="font-weight: 600; margin: 0; font-size: 16px; color: ${isExpired ? '#ef4444' : '#22c55e'};">${hc.expiryDate || '-'}</p>
        </div>
        <p style="font-size: 11px; color: var(--text-secondary); margin: 8px 0 0 0;">
          최종 업데이트: ${hc.updatedAt ? new Date(hc.updatedAt).toLocaleString('ko-KR') : '-'}
        </p>
      </div>
    `;
  } else {
    healthCertHtml = `
      <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: #fff3cd; border-radius: var(--border-radius); border-left: 4px solid #ffc107;">
        <p style="margin: 0; font-size: 14px;">
          🩺 <strong>보건증</strong> - 직원이 아직 등록하지 않았습니다.
        </p>
      </div>
    `;
  }
  
  const contractRows = contracts.map((contract, index) => {
    const createdDate = contract.createdAt ? 
      new Date(contract.createdAt).toLocaleDateString('ko-KR') : '-';
    const statusBadge = contract.isSigned ? 
      '<span class="badge badge-success">✅ 서명완료</span>' : 
      '<span class="badge badge-warning">⏰ 서명대기</span>';
    const isLatest = index === 0 ? '<span class="badge badge-primary" style="margin-left: 8px;">최신</span>' : '';
    
    return `
      <tr>
        <td>${contracts.length - index}</td>
        <td>${contract.data.contractType || '근로계약서'}${isLatest}</td>
        <td>${contract.data.startDate} ~ ${contract.data.endDate}</td>
        <td>${createdDate}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewContractFromList('${contract.id}')">📄 보기</button>
          <button class="btn btn-sm btn-primary" onclick="sendContractLinkFromList('${contract.id}')">📧 전송</button>
        </td>
      </tr>
    `;
  }).join('');
  
  // 모달 생성
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.id = 'employeeContractListModal';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3>📋 ${employeeName}님의 정보</h3>
        <button class="modal-close" onclick="closeEmployeeContractListModal()">✕</button>
      </div>
      <div class="modal-body">
        <!-- 서류 정보 -->
        <div style="margin-bottom: var(--spacing-xl);">
          <h4 style="margin-bottom: var(--spacing-md); padding-bottom: var(--spacing-sm); border-bottom: 2px solid var(--border-color);">
            📄 제출 서류
          </h4>
          ${bankAccountHtml}
          ${healthCertHtml}
        </div>
        
        <!-- 계약서 리스트 -->
        <div>
          <h4 style="margin-bottom: var(--spacing-md); padding-bottom: var(--spacing-sm); border-bottom: 2px solid var(--border-color);">
            📋 계약서 목록
          </h4>
          <div style="margin-bottom: var(--spacing-md); padding: var(--spacing-md); background: var(--bg-light); border-radius: var(--border-radius);">
            <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">
              💡 총 <strong>${contracts.length}개</strong>의 계약서가 작성되었습니다. 최신 계약서부터 표시됩니다.
            </p>
          </div>
          
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style="width: 60px;">번호</th>
                  <th>계약유형</th>
                  <th>계약기간</th>
                  <th>작성일</th>
                  <th style="width: 120px;">상태</th>
                  <th style="width: 180px;">관리</th>
                </tr>
              </thead>
              <tbody>
                ${contractRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeEmployeeContractListModal()">닫기</button>
        <button class="btn btn-danger" onclick="resignEmployee('${employeeName}', ${employeeId})" style="background: #dc3545;">🚪 퇴사 처리</button>
        <button class="btn btn-primary" onclick="createContract()">➕ 새 계약서 작성</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

/**
 * 직원 계약서 리스트 모달 닫기
 */
function closeEmployeeContractListModal() {
  const modal = document.getElementById('employeeContractListModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 직원 퇴사 처리
 * @param {string} employeeName - 직원 이름
 * @param {number} employeeId - 직원 ID
 */
function resignEmployee(employeeName, employeeId) {
  // 확인 메시지
  const confirmMsg = `⚠️ ${employeeName}님을 퇴사 처리하시겠습니까?\n\n다음 데이터가 삭제됩니다:\n• 통장사본\n• 보건증\n• 직원 서류 전체\n\n※ 계약서와 근태 기록은 보존됩니다.`;
  
  if (!confirm(confirmMsg)) {
    return;
  }
  
  try {
    // 1. 직원 서류 삭제
    const docKey = `employee_docs_${employeeName}_${employeeId}`;
    localStorage.removeItem(docKey);
    
    console.log(`✅ ${employeeName}님의 서류 삭제 완료`);
    
    // 2. 퇴사 처리 완료 메시지
    alert(`✅ ${employeeName}님이 퇴사 처리되었습니다.\n\n• 통장사본 삭제 완료\n• 보건증 삭제 완료\n\n계약서와 근태 기록은 보존되었습니다.`);
    
    // 3. 모달 닫기 및 페이지 새로고침
    closeEmployeeContractListModal();
    loadEmployees(); // 직원 목록 새로고침
    
  } catch (error) {
    console.error('❌ 퇴사 처리 실패:', error);
    alert('❌ 퇴사 처리 중 오류가 발생했습니다.');
  }
}

/**
 * 직원 서류 완전 삭제 (관리자 전용)
 * @param {string} employeeName - 직원 이름
 * @param {number} employeeId - 직원 ID
 */
function deleteEmployeeDocuments(employeeName, employeeId) {
  if (!confirm(`⚠️ ${employeeName}님의 모든 서류를 완전히 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!`)) {
    return;
  }
  
  try {
    const docKey = `employee_docs_${employeeName}_${employeeId}`;
    localStorage.removeItem(docKey);
    
    alert(`✅ ${employeeName}님의 서류가 완전히 삭제되었습니다.`);
    closeEmployeeContractListModal();
    
  } catch (error) {
    console.error('❌ 서류 삭제 실패:', error);
    alert('❌ 서류 삭제 중 오류가 발생했습니다.');
  }
}

/**
 * 계약서 리스트에서 계약서 보기
 */
function viewContractFromList(id) {
  viewContract(id);
}

/**
 * 계약서 리스트에서 링크 전송
 */
function sendContractLinkFromList(id) {
  sendContractLink(id);
}

/**
 * 계약서 보기
 * @param {string} id - 계약서 ID
 */
function viewContract(id) {
  const contractData = localStorage.getItem(`contract_${id}`);
  
  if (!contractData) {
    alert('⚠️ 계약서를 찾을 수 없습니다.');
    return;
  }
  
  try {
    const contract = JSON.parse(contractData);
    showContractViewModal(contract);
  } catch (e) {
    alert('⚠️ 계약서 데이터를 불러올 수 없습니다.');
    console.error(e);
  }
}

/**
 * 계약서 상세보기 모달
 */
function showContractViewModal(contract) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.id = 'contractViewModal';
  
  const signLink = `${window.location.href.split('?')[0].replace('admin.html', '')}contract-sign.html?id=${contract.id}`;
  
  // 직원 서류 정보 가져오기
  const docKey = `employee_docs_${contract.employeeName}_${getEmployeeIdFromContract(contract)}`;
  const employeeDocs = JSON.parse(localStorage.getItem(docKey) || '{}');
  
  // 통장사본 HTML 생성
  let bankAccountHtml = '';
  if (employeeDocs.bankAccount) {
    const ba = employeeDocs.bankAccount;
    bankAccountHtml = `
      <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: var(--bg-light); border-radius: var(--border-radius);">
        <h4 style="margin-bottom: var(--spacing-sm);">🏦 통장사본</h4>
        <p><strong>은행명:</strong> ${ba.bankName || '-'}</p>
        <p><strong>계좌번호:</strong> ${ba.accountNumber || '-'}</p>
        <p><strong>예금주:</strong> ${ba.accountHolder || '-'}</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">
          최종 업데이트: ${ba.updatedAt ? new Date(ba.updatedAt).toLocaleString('ko-KR') : '-'}
        </p>
      </div>
    `;
  }
  
  // 보건증 HTML 생성
  let healthCertHtml = '';
  if (employeeDocs.healthCert) {
    const hc = employeeDocs.healthCert;
    healthCertHtml = `
      <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: var(--bg-light); border-radius: var(--border-radius);">
        <h4 style="margin-bottom: var(--spacing-sm);">🩺 보건증</h4>
        ${hc.imageData ? `
          <div style="margin-bottom: var(--spacing-md);">
            <img src="${hc.imageData}" style="max-width: 100%; max-height: 300px; border: 1px solid var(--border-color); border-radius: var(--border-radius); cursor: pointer;" onclick="window.open('${hc.imageData}', '_blank')">
            <p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
              💡 이미지를 클릭하면 크게 볼 수 있습니다
            </p>
          </div>
        ` : '<p style="color: var(--text-secondary);">업로드된 이미지가 없습니다.</p>'}
        <p><strong>유효기간:</strong> ${hc.expiryDate || '-'}</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">
          최종 업데이트: ${hc.updatedAt ? new Date(hc.updatedAt).toLocaleString('ko-KR') : '-'}
        </p>
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3>📄 계약서 상세보기</h3>
        <button class="modal-close" onclick="closeContractViewModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: var(--bg-light); border-radius: var(--border-radius);">
          <h4 style="margin-bottom: var(--spacing-sm);">👤 근로자 정보</h4>
          <p><strong>이름:</strong> ${contract.employeeName}</p>
          <p><strong>생년월일:</strong> ${contract.employeeBirth}</p>
          <p><strong>주소:</strong> ${contract.employeeAddress}</p>
          <p><strong>연락처:</strong> ${contract.employeePhone}</p>
        </div>
        
        ${bankAccountHtml}
        ${healthCertHtml}
        
        <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: var(--bg-light); border-radius: var(--border-radius);">
          <h4 style="margin-bottom: var(--spacing-sm);">🏢 회사 정보</h4>
          <p><strong>회사명:</strong> ${contract.companyName}</p>
          <p><strong>대표자:</strong> ${contract.companyCEO}</p>
          <p><strong>사업자번호:</strong> ${contract.companyBusinessNumber}</p>
          <p><strong>연락처:</strong> ${contract.companyPhone}</p>
          <p><strong>주소:</strong> ${contract.companyAddress}</p>
        </div>
        
        <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: var(--bg-light); border-radius: var(--border-radius);">
          <h4 style="margin-bottom: var(--spacing-sm);">📋 계약 정보</h4>
          <p><strong>계약유형:</strong> ${contract.contractType}</p>
          <p><strong>근무매장:</strong> ${contract.workStore}</p>
          <p><strong>직책:</strong> ${contract.position}</p>
          <p><strong>계약기간:</strong> ${contract.startDate} ~ ${contract.endDate}</p>
          <p><strong>근무일:</strong> ${contract.workDays}</p>
          <p><strong>근무시간:</strong> ${contract.workTime}</p>
          <p><strong>휴게시간:</strong> ${contract.breakTime}</p>
        </div>
        
        <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: var(--bg-light); border-radius: var(--border-radius);">
          <h4 style="margin-bottom: var(--spacing-sm);">💰 급여 조건</h4>
          <p><strong>${contract.wageType}:</strong> ${contract.wageAmount}원</p>
          <p><strong>지급일:</strong> ${contract.paymentDay}</p>
          <p><strong>지급방법:</strong> ${contract.paymentMethod}</p>
        </div>
        
        <div style="margin-bottom: var(--spacing-lg); padding: var(--spacing-md); background: var(--bg-light); border-radius: var(--border-radius);">
          <h4 style="margin-bottom: var(--spacing-sm);">🔗 서명 링크</h4>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" value="${signLink}" readonly style="flex: 1; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;">
            <button class="btn btn-primary btn-sm" onclick="copySignLinkFromModal('${signLink}')">📋 복사</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeContractViewModal()">닫기</button>
        <button class="btn btn-primary" onclick="sendContractLink('${contract.id}')">📧 링크 전송</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

/**
 * 계약서 데이터에서 직원 ID 추출 (더미 데이터 매핑)
 */
function getEmployeeIdFromContract(contract) {
  // 더미 직원 데이터에서 이름으로 ID 찾기
  const employeeMap = {
    '김민수': 1,
    '이지은': 2,
    '박서준': 3,
    '최영희': 4,
    '정수민': 5,
    '강호동': 6
  };
  return employeeMap[contract.employeeName] || 0;
}

function closeContractViewModal() {
  const modal = document.getElementById('contractViewModal');
  if (modal) {
    modal.remove();
  }
}

function copySignLinkFromModal(link) {
  const tempInput = document.createElement('input');
  tempInput.value = link;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
  alert('✅ 서명 링크가 복사되었습니다!');
}

/**
 * 계약서 링크 전송
 * @param {string} id - 계약서 ID
 */
function sendContractLink(id) {
  const contractData = localStorage.getItem(`contract_${id}`);
  
  if (!contractData) {
    alert('⚠️ 계약서를 찾을 수 없습니다.');
    return;
  }
  
  try {
    const contract = JSON.parse(contractData);
    const signLink = `${window.location.href.split('?')[0].replace('admin.html', '')}contract-sign.html?id=${id}`;
    
    // 링크 전송 모달
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.id = 'sendLinkModal';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3>📧 서명 링크 전송</h3>
          <button class="modal-close" onclick="closeSendLinkModal()">✕</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: var(--spacing-md);">
            <strong>${contract.employeeName}</strong>님께 서명 링크를 전송합니다.
          </p>
          
          <div style="margin-bottom: var(--spacing-md);">
            <label style="font-weight: 600; display: block; margin-bottom: 8px;">📱 연락처</label>
            <input type="tel" value="${contract.employeePhone}" readonly style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-light);">
          </div>
          
          <div style="margin-bottom: var(--spacing-md);">
            <label style="font-weight: 600; display: block; margin-bottom: 8px;">🔗 서명 링크</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="linkToCopy" value="${signLink}" readonly style="flex: 1; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 13px;">
              <button class="btn btn-primary btn-sm" onclick="copyLinkToSend()">📋 복사</button>
            </div>
          </div>
          
          <div style="padding: var(--spacing-md); background: #fff3cd; border-radius: 4px; border: 1px solid #ffc107;">
            <p style="margin: 0; font-size: 14px;">
              💡 <strong>링크 복사 후</strong> 카카오톡, 문자 등으로 직원에게 전달하세요.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeSendLinkModal()">닫기</button>
          <button class="btn btn-primary" onclick="copyAndClose()">📋 복사하고 닫기</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (e) {
    alert('⚠️ 오류가 발생했습니다.');
    console.error(e);
  }
}

function closeSendLinkModal() {
  const modal = document.getElementById('sendLinkModal');
  if (modal) {
    modal.remove();
  }
}

function copyLinkToSend() {
  const input = document.getElementById('linkToCopy');
  input.select();
  document.execCommand('copy');
  alert('✅ 서명 링크가 복사되었습니다!');
}

function copyAndClose() {
  copyLinkToSend();
  setTimeout(() => {
    closeSendLinkModal();
  }, 500);
}

// ===================================================================
// 스케줄 관리 (추후 구현)
// ===================================================================

/**
 * 스케줄 추가 모달
 */
function showAddScheduleModal() {
  alert('⚠️ 스케줄 추가 기능은 추후 구현 예정입니다.');
}

// ===================================================================
// 통계 (추후 구현)
// ===================================================================

/**
 * 통계 필터링
 */
function filterStatistics() {
  alert('⚠️ 통계 필터 기능은 추후 구현 예정입니다.');
}

/**
 * 통계 내보내기
 */
function exportStatistics() {
  alert('⚠️ 통계 내보내기 기능은 추후 구현 예정입니다.');
}

// ===================================================================
// 공지사항 관리
// ===================================================================

/**
 * 공지사항 불러오기
 * localStorage에서 companyNotice 읽어서 표시
 */
function loadNotice() {
  try {
    const notice = JSON.parse(localStorage.getItem('companyNotice') || 'null');
    
    if (notice && notice.content) {
      // 입력 폼에 내용 채우기
      document.getElementById('noticeTextarea').value = notice.content;
      if (notice.title) {
        document.getElementById('noticeTitle').value = notice.title;
      }
      
      // 현재 공지사항 표시
      const displayHtml = `
        <div style="font-size: 15px; line-height: 1.7; color: var(--text-primary); white-space: pre-wrap;">
          ${notice.content}
        </div>
      `;
      document.getElementById('currentNoticeDisplay').innerHTML = displayHtml;
      
      // 날짜 표시
      if (notice.updatedAt) {
        const date = new Date(notice.updatedAt);
        document.getElementById('currentNoticeDate').textContent = 
          `최종 수정: ${date.toLocaleDateString('ko-KR')} ${date.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})}`;
      }
    } else {
      document.getElementById('currentNoticeDisplay').innerHTML = 
        '<div style="text-align: center; color: var(--text-secondary);">현재 등록된 공지사항이 없습니다.</div>';
      document.getElementById('currentNoticeDate').textContent = '';
    }
  } catch (error) {
    console.error('공지사항 불러오기 오류:', error);
  }
}

/**
 * 공지사항 미리보기
 */
function previewNotice() {
  const content = document.getElementById('noticeTextarea').value.trim();
  
  if (!content) {
    alert('⚠️ 공지 내용을 입력해주세요.');
    return;
  }
  
  const previewDiv = document.getElementById('noticePreview');
  const previewContent = document.getElementById('noticePreviewContent');
  
  previewContent.textContent = content;
  previewDiv.style.display = 'block';
  
  // 미리보기로 스크롤
  previewDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * 공지사항 저장
 * localStorage에 companyNotice 저장
 */
function saveNotice() {
  const title = document.getElementById('noticeTitle').value.trim();
  const content = document.getElementById('noticeTextarea').value.trim();
  
  if (!content) {
    alert('⚠️ 공지 내용을 입력해주세요.');
    document.getElementById('noticeTextarea').focus();
    return;
  }
  
  if (!confirm('💾 공지사항을 저장하시겠습니까?\n\n모든 직원의 첫 화면에 표시됩니다.')) {
    return;
  }
  
  try {
    const notice = {
      title: title || '공지사항',
      content: content,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin'
    };
    
    localStorage.setItem('companyNotice', JSON.stringify(notice));
    
    alert('✅ 공지사항이 저장되었습니다!');
    
    // 현재 공지사항 표시 업데이트
    loadNotice();
    
    // 미리보기 숨기기
    document.getElementById('noticePreview').style.display = 'none';
    
  } catch (error) {
    console.error('공지사항 저장 오류:', error);
    alert('❌ 저장 중 오류가 발생했습니다.');
  }
}

/**
 * 공지사항 삭제
 * localStorage에서 companyNotice 제거
 */
function deleteNotice() {
  if (!confirm('🗑️ 공지사항을 삭제하시겠습니까?\n\n직원 페이지에서 공지사항이 사라집니다.')) {
    return;
  }
  
  try {
    localStorage.removeItem('companyNotice');
    
    // 입력 폼 초기화
    document.getElementById('noticeTitle').value = '';
    document.getElementById('noticeTextarea').value = '';
    
    // 미리보기 숨기기
    document.getElementById('noticePreview').style.display = 'none';
    
    // 현재 공지사항 표시 업데이트
    loadNotice();
    
    alert('✅ 공지사항이 삭제되었습니다.');
    
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    alert('❌ 삭제 중 오류가 발생했습니다.');
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
 * 출근 상태에 따른 배지 클래스 반환
 * @param {string} status - 출근 상태
 * @returns {string} CSS 클래스
 */
function getStatusBadgeClass(status) {
  const statusMap = {
    '정상': 'success',
    '지각': 'warning',
    '조퇴': 'warning',
    '결근': 'danger'
  };
  return statusMap[status] || 'gray';
}

/**
 * 승인 상태에 따른 배지 클래스 반환
 * @param {string} status - 승인 상태
 * @returns {string} CSS 클래스
 */
function getApprovalStatusClass(status) {
  const statusMap = {
    '승인': 'success',
    '반려': 'danger',
    '대기': 'warning'
  };
  return statusMap[status] || 'gray';
}

/**
 * 계약서 상태에 따른 배지 클래스 반환
 * @param {string} status - 계약서 상태
 * @returns {string} CSS 클래스
 */
function getContractStatusClass(status) {
  const statusMap = {
    '서명완료': 'success',
    '서명대기': 'warning',
    '작성중': 'info'
  };
  return statusMap[status] || 'gray';
}
