// ===================================================================
// 맛남살롱 계약서 작성 시스템
// ===================================================================

// 전역 변수
let companies = [];
let savedContracts = [];

// 더미 직원 데이터
const DUMMY_EMPLOYEES = [
  { id: '1', name: '김민수', birth: '1990-03-15', address: '경기도 부천시 원미구', phone: '010-1234-5678' },
  { id: '2', name: '이영희', birth: '1995-07-20', address: '경기도 부천시 소사구', phone: '010-2345-6789' },
  { id: '3', name: '박철수', birth: '1988-11-05', address: '경기도 부천시 오정구', phone: '010-3456-7890' }
];

// ===================================================================
// 초기화
// ===================================================================

// 초기화 함수 (모달에서 호출 가능하도록)
function initializeContractForm() {
  console.log('📝 계약서 폼 초기화');
  
  // 오늘 날짜 설정
  const today = new Date().toISOString().split('T')[0];
  const startDateEl = document.getElementById('startDate');
  if (startDateEl) startDateEl.value = today;
  
  // 시간 드롭다운 초기화
  initializeTimeDropdowns();
  
  // 직원 목록 로드
  loadEmployeeList();
  
  // 회사 목록 로드
  loadCompanyList();
  
  // 기본 템플릿 로드
  loadDefaultTemplate();
}

// 페이지 로드 시 자동 초기화 (contract.html에서 직접 사용할 때)
document.addEventListener('DOMContentLoaded', function() {
  // contract.html에서 직접 열린 경우에만 초기화
  if (document.querySelector('.top-bar')) {
    debugLog('계약서 작성 페이지 로드');
    initializeContractForm();
  }
});

// ===================================================================
// 탭 전환 (핵심!)
// ===================================================================

function switchTab(tabName) {
  console.log('🔄 탭 전환 요청:', tabName);
  
  // 미리보기로 전환 시 유효성 검사
  if (tabName === 'preview') {
    if (!validateForm()) {
      console.log('❌ 유효성 검사 실패');
      return;
    }
    updatePreview();
  }
  
  // 모든 탭 버튼 비활성화
  document.getElementById('formTabBtn').classList.remove('active');
  document.getElementById('previewTabBtn').classList.remove('active');
  
  // 모든 탭 콘텐츠 숨김
  document.getElementById('formTab').classList.remove('active');
  document.getElementById('previewTab').classList.remove('active');
  
  // 선택된 탭 활성화
  if (tabName === 'form') {
    document.getElementById('formTabBtn').classList.add('active');
    document.getElementById('formTab').classList.add('active');
    console.log('✅ 작성하기 탭 활성화');
  } else if (tabName === 'preview') {
    document.getElementById('previewTabBtn').classList.add('active');
    document.getElementById('previewTab').classList.add('active');
    console.log('✅ 미리보기 탭 활성화');
    window.scrollTo(0, 0);
  }
}

// ===================================================================
// 직원 정보
// ===================================================================

function loadEmployeeList() {
  const select = document.getElementById('employeeSelect');
  select.innerHTML = '<option value="">새 직원 (직접 입력)</option>';
  
  // localStorage에서 기존 직원 불러오기
  const employeeMap = new Map();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('contract_C')) {
      try {
        const contractData = JSON.parse(localStorage.getItem(key));
        const empKey = contractData.employeeName + '_' + contractData.employeeBirth;
        
        if (!employeeMap.has(empKey)) {
          employeeMap.set(empKey, {
            id: empKey,
            name: contractData.employeeName,
            birth: contractData.employeeBirth,
            address: contractData.employeeAddress,
            phone: contractData.employeePhone
          });
        }
      } catch (e) {
        console.error('직원 데이터 로드 오류:', e);
      }
    }
  }
  
  const employees = Array.from(employeeMap.values());
  
  // 더미 데이터도 포함 (처음 사용 시 대비)
  if (employees.length === 0) {
    DUMMY_EMPLOYEES.forEach(emp => {
      const option = document.createElement('option');
      option.value = emp.id;
      option.textContent = `${emp.name} (${emp.phone})`;
      select.appendChild(option);
    });
  } else {
    employees.forEach(emp => {
      const option = document.createElement('option');
      option.value = emp.id;
      option.textContent = `${emp.name} (${emp.phone})`;
      select.appendChild(option);
    });
  }
}

function loadEmployeeInfo() {
  const employeeId = document.getElementById('employeeSelect').value;
  
  if (!employeeId) {
    // 새 직원 입력
    document.getElementById('employeeName').value = '';
    document.getElementById('employeeBirth').value = '';
    document.getElementById('employeeAddress').value = '';
    document.getElementById('employeePhone').value = '';
    document.getElementById('employeeName').readOnly = false;
    return;
  }
  
  // localStorage에서 직원 정보 찾기
  let employee = null;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('contract_C')) {
      try {
        const contractData = JSON.parse(localStorage.getItem(key));
        const empKey = contractData.employeeName + '_' + contractData.employeeBirth;
        
        if (empKey === employeeId) {
          employee = {
            name: contractData.employeeName,
            birth: contractData.employeeBirth,
            address: contractData.employeeAddress,
            phone: contractData.employeePhone
          };
          break;
        }
      } catch (e) {}
    }
  }
  
  // 더미 데이터에서도 찾기
  if (!employee) {
    employee = DUMMY_EMPLOYEES.find(e => e.id === employeeId);
  }
  
  if (employee) {
    document.getElementById('employeeName').value = employee.name;
    document.getElementById('employeeBirth').value = employee.birth;
    document.getElementById('employeeAddress').value = employee.address;
    document.getElementById('employeePhone').value = employee.phone;
    document.getElementById('employeeName').readOnly = true;
  }
}

// ===================================================================
// 회사 정보
// ===================================================================

async function loadCompanyList() {
  const select = document.getElementById('companySelect');
  select.innerHTML = '<option value="">불러오는 중...</option>';
  
  try {
    // Firestore에서 회사 목록 로드
    const snapshot = await db.collection('companies').orderBy('name').get();
    
    companies = [];
    snapshot.forEach(doc => {
      companies.push({ id: doc.id, ...doc.data() });
    });
    
    // 기본 회사가 없으면 생성
    if (companies.length === 0) {
      console.log('📋 기본 회사 정보 생성 중...');
      const defaultCompany = {
        name: '(주)ABC디저트센터',
        ceo: '홍길동',
        businessNumber: '123-45-67890',
        phone: '032-123-4567',
        address: '경기도 부천시 원미구 74',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('companies').add(defaultCompany);
      companies.push({ id: docRef.id, ...defaultCompany });
      console.log('✅ 기본 회사 정보 생성 완료');
    }
    
    // 드롭다운 채우기
    select.innerHTML = '<option value="">선택하세요</option>';
    companies.forEach(company => {
      const option = document.createElement('option');
      option.value = company.id;
      option.textContent = company.name;
      select.appendChild(option);
    });
    
    // 첫 번째 회사 자동 선택
    if (companies.length > 0) {
      select.value = companies[0].id;
      loadCompanyInfo();
    }
    
    console.log(`✅ ${companies.length}개 회사 정보 로드 완료`);
  } catch (error) {
    console.error('❌ 회사 정보 로드 실패:', error);
    select.innerHTML = '<option value="">로드 실패</option>';
  }
}

function loadCompanyInfo() {
  const companyId = document.getElementById('companySelect').value;
  
  if (!companyId) {
    document.getElementById('companyCEO').value = '';
    document.getElementById('companyBusinessNumber').value = '';
    document.getElementById('companyPhone').value = '';
    document.getElementById('companyAddress').value = '';
    return;
  }
  
  const company = companies.find(c => c.id === companyId);
  if (company) {
    document.getElementById('companyCEO').value = company.ceo || '';
    document.getElementById('companyBusinessNumber').value = company.businessNumber || '';
    document.getElementById('companyPhone').value = company.phone || '';
    document.getElementById('companyAddress').value = company.address || '';
  }
}

function showAddCompanyModal() {
  document.getElementById('companyModalTitle').textContent = '🏢 회사 추가';
  document.getElementById('editCompanyId').value = '';
  document.getElementById('deleteCompanyBtnContainer').style.display = 'none';
  document.getElementById('addCompanyModal').style.display = 'flex';
}

function showEditCompanyModal() {
  const companyId = document.getElementById('companySelect').value;
  
  if (!companyId) {
    alert('⚠️ 수정할 회사를 먼저 선택해주세요.');
    return;
  }
  
  const company = companies.find(c => c.id === companyId);
  
  if (!company) {
    alert('⚠️ 회사 정보를 찾을 수 없습니다.');
    return;
  }
  
  // 모달 제목 및 모드 설정
  document.getElementById('companyModalTitle').textContent = '✏️ 회사 수정';
  document.getElementById('editCompanyId').value = companyId;
  document.getElementById('deleteCompanyBtnContainer').style.display = 'block';
  
  // 기존 데이터 채우기
  document.getElementById('newCompanyName').value = company.name;
  document.getElementById('newCompanyCEO').value = company.ceo;
  document.getElementById('newCompanyBusinessNumber').value = company.businessNumber;
  document.getElementById('newCompanyPhone').value = company.phone;
  document.getElementById('newCompanyAddress').value = company.address;
  
  document.getElementById('addCompanyModal').style.display = 'flex';
}

function closeAddCompanyModal() {
  document.getElementById('addCompanyModal').style.display = 'none';
  document.getElementById('editCompanyId').value = '';
  document.getElementById('newCompanyName').value = '';
  document.getElementById('newCompanyCEO').value = '';
  document.getElementById('newCompanyBusinessNumber').value = '';
  document.getElementById('newCompanyPhone').value = '';
  document.getElementById('newCompanyAddress').value = '';
}

async function saveCompany() {
  const name = document.getElementById('newCompanyName').value.trim();
  const ceo = document.getElementById('newCompanyCEO').value.trim();
  const businessNumber = document.getElementById('newCompanyBusinessNumber').value.trim();
  const phone = document.getElementById('newCompanyPhone').value.trim();
  const address = document.getElementById('newCompanyAddress').value.trim();
  const editId = document.getElementById('editCompanyId').value;
  
  if (!name || !ceo || !businessNumber || !phone || !address) {
    alert('⚠️ 모든 필수 항목을 입력해주세요.');
    return;
  }
  
  try {
    if (editId) {
      // 수정 모드 - Firestore 업데이트
      await db.collection('companies').doc(editId).update({
        name: name,
        ceo: ceo,
        businessNumber: businessNumber,
        phone: phone,
        address: address,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      await loadCompanyList();
      document.getElementById('companySelect').value = editId;
      loadCompanyInfo();
      closeAddCompanyModal();
      
      alert('✅ 회사 정보가 수정되었습니다.');
    } else {
      // 추가 모드 - Firestore 추가
      const docRef = await db.collection('companies').add({
        name: name,
        ceo: ceo,
        businessNumber: businessNumber,
        phone: phone,
        address: address,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      await loadCompanyList();
      document.getElementById('companySelect').value = docRef.id;
      loadCompanyInfo();
      closeAddCompanyModal();
      
      alert('✅ 회사가 추가되었습니다.');
    }
  } catch (error) {
    console.error('❌ 회사 저장 실패:', error);
    alert('❌ 회사 정보 저장에 실패했습니다.');
  }
}

async function deleteCompany() {
  const editId = document.getElementById('editCompanyId').value;
  
  if (!editId) {
    return;
  }
  
  const company = companies.find(c => c.id === editId);
  
  if (!company) {
    return;
  }
  
  if (!confirm(`"${company.name}" 회사를 삭제하시겠습니까?\n\n⚠️ 이 회사로 작성된 계약서는 영향을 받지 않지만,\n새로운 계약서 작성 시 선택할 수 없게 됩니다.`)) {
    return;
  }
  
  try {
    // Firestore에서 삭제
    await db.collection('companies').doc(editId).delete();
    
    closeAddCompanyModal();
    await loadCompanyList();
    
    alert('✅ 회사가 삭제되었습니다.');
  } catch (error) {
    console.error('❌ 회사 삭제 실패:', error);
    alert('❌ 회사 삭제에 실패했습니다.');
  }
}

// ===================================================================
// 시간 드롭다운 초기화
// ===================================================================

function initializeTimeDropdowns() {
  // 근무 시작/종료 시간
  const startHour = document.querySelector('.schedule-start-hour');
  const startMinute = document.querySelector('.schedule-start-minute');
  const endHour = document.querySelector('.schedule-end-hour');
  const endMinute = document.querySelector('.schedule-end-minute');
  
  populateHourOptions(startHour);
  populateHourOptions(endHour);
  populateMinuteOptions(startMinute);
  populateMinuteOptions(endMinute);
  
  // 휴게시간
  const breakStartHour = document.getElementById('breakStartHour');
  const breakStartMinute = document.getElementById('breakStartMinute');
  const breakEndHour = document.getElementById('breakEndHour');
  const breakEndMinute = document.getElementById('breakEndMinute');
  
  populateHourOptions(breakStartHour);
  populateHourOptions(breakEndHour);
  populateMinuteOptions(breakStartMinute);
  populateMinuteOptions(breakEndMinute);
}

function populateHourOptions(select) {
  for (let i = 0; i <= 23; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = String(i).padStart(2, '0') + '시';
    select.appendChild(option);
  }
}

function populateMinuteOptions(select) {
  for (let i = 0; i <= 59; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = String(i).padStart(2, '0') + '분';
    select.appendChild(option);
  }
  // 기본값 00분 설정
  select.value = '0';
}

// ===================================================================
// 근무 일정 관리 (다중 스케줄)
// ===================================================================

function toggleDayForSchedule(button, scheduleIndex) {
  button.classList.toggle('active');
  updateWorkTimeDisplay();
}

let scheduleCounter = 1;

function addSchedule() {
  const container = document.getElementById('workScheduleContainer');
  const newIndex = scheduleCounter++;
  
  const newItem = document.createElement('div');
  newItem.className = 'work-schedule-item';
  newItem.setAttribute('data-index', newIndex);
  
  newItem.innerHTML = `
    <div class="form-group">
      <label>근무일 *</label>
      <div class="day-buttons">
        <button type="button" class="day-btn" data-day="월" onclick="toggleDayForSchedule(this, ${newIndex})">월</button>
        <button type="button" class="day-btn" data-day="화" onclick="toggleDayForSchedule(this, ${newIndex})">화</button>
        <button type="button" class="day-btn" data-day="수" onclick="toggleDayForSchedule(this, ${newIndex})">수</button>
        <button type="button" class="day-btn" data-day="목" onclick="toggleDayForSchedule(this, ${newIndex})">목</button>
        <button type="button" class="day-btn" data-day="금" onclick="toggleDayForSchedule(this, ${newIndex})">금</button>
        <button type="button" class="day-btn" data-day="토" onclick="toggleDayForSchedule(this, ${newIndex})">토</button>
        <button type="button" class="day-btn" data-day="일" onclick="toggleDayForSchedule(this, ${newIndex})">일</button>
      </div>
    </div>
    <div class="form-row" style="align-items: flex-end;">
      <div class="form-group">
        <label>시작 시간 *</label>
        <div style="display: flex; gap: 8px;">
          <select class="schedule-start-hour" required onchange="updateWorkTimeDisplay()">
            <option value="">시</option>
          </select>
          <select class="schedule-start-minute" required onchange="updateWorkTimeDisplay()">
            <option value="">분</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>종료 시간 *</label>
        <div style="display: flex; gap: 8px;">
          <select class="schedule-end-hour" required onchange="updateWorkTimeDisplay()">
            <option value="">시</option>
          </select>
          <select class="schedule-end-minute" required onchange="updateWorkTimeDisplay()">
            <option value="">분</option>
          </select>
        </div>
      </div>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeSchedule(${newIndex})" style="height: 42px; margin-bottom: 0;">삭제</button>
    </div>
  `;
  
  container.appendChild(newItem);
  
  // 새로 추가된 드롭다운 초기화
  const newStartHour = newItem.querySelector('.schedule-start-hour');
  const newStartMinute = newItem.querySelector('.schedule-start-minute');
  const newEndHour = newItem.querySelector('.schedule-end-hour');
  const newEndMinute = newItem.querySelector('.schedule-end-minute');
  
  populateHourOptions(newStartHour);
  populateHourOptions(newEndHour);
  populateMinuteOptions(newStartMinute);
  populateMinuteOptions(newEndMinute);
  
  // 첫 번째 아이템의 삭제 버튼 표시
  const firstDeleteBtn = container.querySelector('[data-index="0"] .btn-danger');
  if (firstDeleteBtn) firstDeleteBtn.style.display = 'inline-block';
}

function removeSchedule(index) {
  const item = document.querySelector(`[data-index="${index}"]`);
  if (item) {
    item.remove();
    updateWorkTimeDisplay();
    
    // 하나만 남으면 삭제 버튼 숨김
    const container = document.getElementById('workScheduleContainer');
    if (container.children.length === 1) {
      const firstDeleteBtn = container.querySelector('.btn-danger');
      if (firstDeleteBtn) firstDeleteBtn.style.display = 'none';
    }
  }
}

function updateWorkTimeDisplay() {
  const allDays = [];
  const schedules = [];
  
  const scheduleItems = document.querySelectorAll('.work-schedule-item');
  
  scheduleItems.forEach((item) => {
    const selectedDays = [];
    
    // 선택된 요일
    const activeDayBtns = item.querySelectorAll('.day-btn.active');
    activeDayBtns.forEach(btn => {
      const day = btn.getAttribute('data-day');
      selectedDays.push(day);
      if (!allDays.includes(day)) {
        allDays.push(day);
      }
    });
    
    // 시작/종료 시간
    const startHour = item.querySelector('.schedule-start-hour')?.value;
    const startMinute = item.querySelector('.schedule-start-minute')?.value;
    const endHour = item.querySelector('.schedule-end-hour')?.value;
    const endMinute = item.querySelector('.schedule-end-minute')?.value;
    
    // 완전한 스케줄만 추가
    if (selectedDays.length > 0 && startHour !== '' && startMinute !== '' && endHour !== '' && endMinute !== '') {
      const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
      schedules.push(`${selectedDays.join(', ')}: ${startTime}~${endTime}`);
    }
  });
  
  document.getElementById('workDays').value = allDays.join(', ');
  document.getElementById('workTime').value = schedules.join(' / ');
}

// ===================================================================
// 휴게시간 관리
// ===================================================================

function updateBreakTimeDisplay() {
  const hour = document.getElementById('breakTimeHour')?.value;
  const minute = document.getElementById('breakTimeMinute')?.value;
  const startHour = document.getElementById('breakStartHour')?.value;
  const startMinute = document.getElementById('breakStartMinute')?.value;
  const endHour = document.getElementById('breakEndHour')?.value;
  const endMinute = document.getElementById('breakEndMinute')?.value;
  
  let breakTimeText = '';
  
  if (hour || minute) {
    const h = hour || '0';
    const m = minute || '0';
    breakTimeText = `${h}시간 ${m}분`;
    
    if (startHour !== '' && startMinute !== '' && endHour !== '' && endMinute !== '') {
      const start = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
      const end = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
      breakTimeText += ` (${start}~${end})`;
    }
  }
  
  document.getElementById('breakTime').value = breakTimeText;
  document.getElementById('breakTimePreview').textContent = breakTimeText ? `휴게시간: ${breakTimeText}` : '';
}

// ===================================================================
// 유효성 검사
// ===================================================================

function validateForm() {
  const requiredFields = [
    { id: 'employeeSelect', name: '직원' },
    { id: 'employeeName', name: '이름' },
    { id: 'employeeBirth', name: '생년월일' },
    { id: 'employeeAddress', name: '주소' },
    { id: 'employeePhone', name: '연락처' },
    { id: 'companySelect', name: '회사' },
    { id: 'contractType', name: '계약 유형' },
    { id: 'workStore', name: '근무 매장' },
    { id: 'startDate', name: '계약 시작일' },
    { id: 'position', name: '직책/직무' },
    { id: 'wageType', name: '급여 형태' },
    { id: 'wageAmount', name: '급여액' },
    { id: 'paymentDay', name: '급여 지급일' },
    { id: 'paymentMethod', name: '급여 지급 방법' }
  ];
  
  for (const field of requiredFields) {
    const element = document.getElementById(field.id);
    if (!element || !element.value || element.value.trim() === '') {
      alert(`⚠️ ${field.name}을(를) 입력해주세요.`);
      if (element) element.focus();
      return false;
    }
  }
  
  // 근무일/근무시간 검증
  const workDays = document.getElementById('workDays').value;
  const workTime = document.getElementById('workTime').value;
  
  if (!workDays || workDays.trim() === '') {
    alert('⚠️ 근무일을 선택해주세요.');
    return false;
  }
  
  if (!workTime || workTime.trim() === '') {
    alert('⚠️ 근무시간을 설정해주세요.');
    return false;
  }
  
  return true;
}

// ===================================================================
// 미리보기 업데이트
// ===================================================================

function updatePreview() {
  console.log('🔍 미리보기 업데이트');
  
  // 직원 정보
  const employeeName = document.getElementById('employeeName').value;
  document.getElementById('previewName').textContent = employeeName || '_______';
  document.getElementById('previewEmployeeName').textContent = employeeName || '_______';
  document.getElementById('previewEmployeeName2').textContent = employeeName || '_______';
  document.getElementById('previewBirth').textContent = document.getElementById('employeeBirth').value || '_______';
  document.getElementById('previewAddress').textContent = document.getElementById('employeeAddress').value || '_______';
  document.getElementById('previewPhone').textContent = document.getElementById('employeePhone').value || '_______';
  
  // 회사 정보
  const companyId = document.getElementById('companySelect').value;
  const company = companies.find(c => c.id === companyId);
  if (company) {
    document.getElementById('previewCompanyName').textContent = company.name;
    document.getElementById('previewCompanyName2').textContent = company.name;
    document.getElementById('previewCEO').textContent = company.ceo;
  }
  
  // 계약 정보
  document.getElementById('previewStartDate').textContent = document.getElementById('startDate').value || '_______';
  const endDate = document.getElementById('endDate').value;
  document.getElementById('previewEndDate').textContent = endDate || '기간의 정함이 없음';
  document.getElementById('previewStore').textContent = document.getElementById('workStore').value || '_______';
  document.getElementById('previewPosition').textContent = document.getElementById('position').value || '_______';
  
  // 근무 조건
  document.getElementById('previewWorkDays').textContent = document.getElementById('workDays').value || '_______';
  document.getElementById('previewWorkTime').textContent = document.getElementById('workTime').value || '_______';
  document.getElementById('previewBreakTime').textContent = document.getElementById('breakTime').value || '없음';
  
  // 급여 조건
  document.getElementById('previewWageType').textContent = document.getElementById('wageType').value || '_______';
  const wageAmount = document.getElementById('wageAmount').value;
  document.getElementById('previewWageAmount').textContent = wageAmount ? Number(wageAmount).toLocaleString() : '_______';
  document.getElementById('previewPaymentDay').textContent = document.getElementById('paymentDay').value || '_______';
  document.getElementById('previewPaymentMethod').textContent = document.getElementById('paymentMethod').value || '_______';
  
  // 계약서 본문
  const contractContent = document.getElementById('contractContent').value;
  const bodyDiv = document.getElementById('previewContractBody');
  if (contractContent && contractContent.trim()) {
    bodyDiv.innerHTML = '<div style="white-space: pre-wrap; line-height: 1.8; margin: 30px 0;">' + contractContent + '</div>';
  } else {
    bodyDiv.innerHTML = '';
  }
  
  // 작성일
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  document.getElementById('previewContractDate').textContent = `${year}년 ${month}월 ${day}일`;
  
  console.log('✅ 미리보기 업데이트 완료');
}

// ===================================================================
// 계약서 템플릿
// ===================================================================

function loadDefaultTemplate() {
  const template = `제1조 (근로계약 기간)
본 계약의 기간은 위 표에 명시된 바와 같다.

제2조 (근무 장소 및 업무 내용)
근로자는 위 표에 명시된 근무 장소에서 명시된 업무를 수행한다.

제3조 (근로시간 및 휴게시간)
1. 근로시간은 위 표에 명시된 바와 같다.
2. 휴게시간은 근로시간 중 위 표에 명시된 바와 같다.

제4조 (근무일 및 휴일)
1. 근무일은 위 표에 명시된 바와 같다.
2. 주휴일은 근로기준법에 따라 부여한다.

제5조 (임금)
1. 근로자의 임금은 위 표에 명시된 바와 같다.
2. 임금은 위 표에 명시된 지급일에 지급한다.
3. 연장·야간·휴일 근로 시에는 근로기준법에 따라 가산임금을 지급한다.

제6조 (연차유급휴가)
연차유급휴가는 근로기준법에 따라 부여한다.

제7조 (사회보험 가입)
사용자는 근로자를 4대 사회보험에 가입시킨다.

제8조 (계약의 해지)
1. 본 계약을 해지하고자 할 때는 30일 전에 예고하여야 한다.
2. 해고 예고 기간을 두지 않을 경우 30일분의 통상임금을 지급한다.

제9조 (기타)
이 계약서에 명시되지 않은 사항은 근로기준법 및 관계 법령에 따른다.`;

  document.getElementById('contractContent').value = template;
}

// ===================================================================
// 스케줄 데이터 수집 및 복원
// ===================================================================

function collectScheduleData() {
  const schedules = [];
  const scheduleItems = document.querySelectorAll('.work-schedule-item');
  
  scheduleItems.forEach((item, index) => {
    const selectedDays = [];
    const activeDayBtns = item.querySelectorAll('.day-btn.active');
    activeDayBtns.forEach(btn => {
      selectedDays.push(btn.getAttribute('data-day'));
    });
    
    const startHour = item.querySelector('.schedule-start-hour')?.value || '';
    const startMinute = item.querySelector('.schedule-start-minute')?.value || '';
    const endHour = item.querySelector('.schedule-end-hour')?.value || '';
    const endMinute = item.querySelector('.schedule-end-minute')?.value || '';
    
    schedules.push({
      index: index,
      days: selectedDays,
      startHour: startHour,
      startMinute: startMinute,
      endHour: endHour,
      endMinute: endMinute
    });
  });
  
  return schedules;
}

function restoreScheduleData(schedules, breakTimeData) {
  if (!schedules || schedules.length === 0) return;
  
  // 기존 스케줄 제거 (첫 번째 제외)
  const container = document.getElementById('workScheduleContainer');
  const items = container.querySelectorAll('.work-schedule-item');
  for (let i = items.length - 1; i > 0; i--) {
    items[i].remove();
  }
  
  // 스케줄 복원
  schedules.forEach((schedule, index) => {
    let scheduleItem;
    
    if (index === 0) {
      // 첫 번째 스케줄은 이미 존재
      scheduleItem = container.querySelector('.work-schedule-item[data-index="0"]');
    } else {
      // 추가 스케줄 생성
      addSchedule();
      scheduleItem = container.querySelector(`.work-schedule-item[data-index="${scheduleCounter - 1}"]`);
    }
    
    if (scheduleItem) {
      // 요일 복원
      schedule.days.forEach(day => {
        const dayBtn = scheduleItem.querySelector(`.day-btn[data-day="${day}"]`);
        if (dayBtn) {
          dayBtn.classList.add('active');
        }
      });
      
      // 시간 복원
      const startHourSelect = scheduleItem.querySelector('.schedule-start-hour');
      const startMinuteSelect = scheduleItem.querySelector('.schedule-start-minute');
      const endHourSelect = scheduleItem.querySelector('.schedule-end-hour');
      const endMinuteSelect = scheduleItem.querySelector('.schedule-end-minute');
      
      if (startHourSelect) startHourSelect.value = schedule.startHour;
      if (startMinuteSelect) startMinuteSelect.value = schedule.startMinute;
      if (endHourSelect) endHourSelect.value = schedule.endHour;
      if (endMinuteSelect) endMinuteSelect.value = schedule.endMinute;
    }
  });
  
  // 휴게시간 복원
  if (breakTimeData) {
    if (breakTimeData.hour) document.getElementById('breakTimeHour').value = breakTimeData.hour;
    if (breakTimeData.minute) document.getElementById('breakTimeMinute').value = breakTimeData.minute;
    if (breakTimeData.startHour) document.getElementById('breakStartHour').value = breakTimeData.startHour;
    if (breakTimeData.startMinute) document.getElementById('breakStartMinute').value = breakTimeData.startMinute;
    if (breakTimeData.endHour) document.getElementById('breakEndHour').value = breakTimeData.endHour;
    if (breakTimeData.endMinute) document.getElementById('breakEndMinute').value = breakTimeData.endMinute;
  }
  
  // 근무시간 표시 업데이트
  updateWorkTimeDisplay();
  updateBreakTimeDisplay();
}

// ===================================================================
// 계약서 저장 (이름 부여)
// ===================================================================

// 계약서 저장 모달
function showSaveContractModal() {
  if (!validateForm()) {
    return;
  }
  document.getElementById('saveContractModal').style.display = 'flex';
  // 자동으로 이름 제안
  const employeeName = document.getElementById('employeeName').value;
  const position = document.getElementById('position').value;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('contractSaveName').value = `${employeeName}_${position}_${today}`;
}

function closeSaveContractModal() {
  document.getElementById('saveContractModal').style.display = 'none';
  document.getElementById('contractSaveName').value = '';
}

async function saveContract() {
  const contractName = document.getElementById('contractSaveName').value.trim();
  
  if (!contractName) {
    alert('⚠️ 계약서 이름을 입력해주세요.');
    return;
  }
  
  if (!validateForm()) {
    closeSaveContractModal();
    return;
  }
  
  // 근무 스케줄 데이터 수집
  const schedules = collectScheduleData();
  
  // 휴게시간 상세 데이터 수집
  const breakTimeData = {
    hour: document.getElementById('breakTimeHour')?.value || '',
    minute: document.getElementById('breakTimeMinute')?.value || '',
    startHour: document.getElementById('breakStartHour')?.value || '',
    startMinute: document.getElementById('breakStartMinute')?.value || '',
    endHour: document.getElementById('breakEndHour')?.value || '',
    endMinute: document.getElementById('breakEndMinute')?.value || ''
  };
  
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    alert('⚠️ 로그인이 필요합니다.');
    closeSaveContractModal();
    return;
  }
  
  const contractData = {
    name: contractName,
    employeeId: document.getElementById('employeeSelect').value,
    employeeName: document.getElementById('employeeName').value,
    employeeBirth: document.getElementById('employeeBirth').value,
    employeeAddress: document.getElementById('employeeAddress').value,
    employeePhone: document.getElementById('employeePhone').value,
    companyId: document.getElementById('companySelect').value,
    contractType: document.getElementById('contractType').value,
    workStore: document.getElementById('workStore').value,
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value,
    position: document.getElementById('position').value,
    workDays: document.getElementById('workDays').value,
    workTime: document.getElementById('workTime').value,
    breakTime: document.getElementById('breakTime').value,
    wageType: document.getElementById('wageType').value,
    wageAmount: document.getElementById('wageAmount').value,
    paymentDay: document.getElementById('paymentDay').value,
    paymentMethod: document.getElementById('paymentMethod').value,
    contractContent: document.getElementById('contractContent').value,
    schedules: schedules,
    breakTimeData: breakTimeData,
    createdBy: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    // Firestore에서 중복 이름 체크
    const snapshot = await db.collection('savedContracts')
      .where('createdBy', '==', currentUser.uid)
      .where('name', '==', contractName)
      .get();
    
    if (!snapshot.empty) {
      if (!confirm('⚠️ 같은 이름의 계약서가 이미 존재합니다.\n덮어쓰시겠습니까?')) {
        return;
      }
      // 기존 문서 업데이트
      const docId = snapshot.docs[0].id;
      await db.collection('savedContracts').doc(docId).update({
        ...contractData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // 새 문서 추가
      await db.collection('savedContracts').add(contractData);
    }
    
    closeSaveContractModal();
    alert('✅ 계약서가 저장되었습니다.');
  } catch (error) {
    console.error('❌ 계약서 저장 실패:', error);
    alert('❌ 저장에 실패했습니다.');
  }
}

// ===================================================================
// 임시 저장 및 불러오기
// ===================================================================

async function saveDraft() {
  if (!validateForm()) {
    return;
  }
  
  // 현재 로그인한 관리자 UID 가져오기
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    alert('⚠️ 로그인이 필요합니다.');
    return;
  }
  
  const contractData = {
    employeeId: document.getElementById('employeeSelect').value,
    employeeName: document.getElementById('employeeName').value,
    employeeBirth: document.getElementById('employeeBirth').value,
    employeeAddress: document.getElementById('employeeAddress').value,
    employeePhone: document.getElementById('employeePhone').value,
    companyId: document.getElementById('companySelect').value,
    contractType: document.getElementById('contractType').value,
    workStore: document.getElementById('workStore').value,
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value,
    position: document.getElementById('position').value,
    workDays: document.getElementById('workDays').value,
    workTime: document.getElementById('workTime').value,
    breakTime: document.getElementById('breakTime').value,
    wageType: document.getElementById('wageType').value,
    wageAmount: document.getElementById('wageAmount').value,
    paymentDay: document.getElementById('paymentDay').value,
    paymentMethod: document.getElementById('paymentMethod').value,
    contractContent: document.getElementById('contractContent').value,
    createdBy: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    // Firestore에 저장
    await db.collection('savedContracts').add(contractData);
    alert('✅ 임시 저장되었습니다.');
  } catch (error) {
    console.error('❌ 임시 저장 실패:', error);
    alert('❌ 임시 저장에 실패했습니다.');
  }
}

async function showLoadContractModal() {
  const listDiv = document.getElementById('savedContractsList');
  listDiv.innerHTML = '<p style="text-align: center; padding: var(--spacing-xl);">불러오는 중...</p>';
  
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    listDiv.innerHTML = '<p style="text-align: center; padding: var(--spacing-xl); color: var(--danger-color);">로그인이 필요합니다.</p>';
    document.getElementById('loadContractModal').style.display = 'flex';
    return;
  }
  
  try {
    // Firestore에서 현재 사용자의 임시 저장 계약서 로드
    const snapshot = await db.collection('savedContracts')
      .where('createdBy', '==', currentUser.uid)
      .get();
    
    savedContracts = [];
    snapshot.forEach(doc => {
      savedContracts.push({ id: doc.id, ...doc.data() });
    });
    
    // 클라이언트 사이드 정렬 (최신순)
    savedContracts.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
    
    if (savedContracts.length === 0) {
      listDiv.innerHTML = '<p style="text-align: center; padding: var(--spacing-xl); color: var(--text-secondary);">저장된 계약서가 없습니다.</p>';
    } else {
      listDiv.innerHTML = savedContracts.map((contract, index) => {
        const displayName = contract.name || `${contract.employeeName} - ${contract.position}`;
        const savedDate = contract.createdAt?.toDate?.().toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) || '날짜 정보 없음';
        
        return `
          <div style="padding: var(--spacing-md); border: 1px solid var(--border-color); border-radius: var(--border-radius); margin-bottom: var(--spacing-sm); cursor: pointer; transition: all 0.2s ease; display: flex; justify-content: space-between; align-items: center;" onmouseover="this.style.borderColor='var(--primary-color)'; this.style.backgroundColor='var(--bg-light)';" onmouseout="this.style.borderColor='var(--border-color)'; this.style.backgroundColor='white';" onclick="loadSavedContract(${index})">
            <div>
              <div style="font-weight: 600; margin-bottom: 4px; font-size: 15px;">📄 ${displayName}</div>
              <div style="font-size: 13px; color: var(--text-secondary);">${savedDate}</div>
            </div>
            <button onclick="event.stopPropagation(); deleteSavedContract('${contract.id}', ${index});" style="padding: 6px 12px; background: var(--danger-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">삭제</button>
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('❌ 임시 저장 계약서 로드 실패:', error);
    listDiv.innerHTML = '<p style="text-align: center; padding: var(--spacing-xl); color: var(--danger-color);">불러오기 실패</p>';
  }
  
  document.getElementById('loadContractModal').style.display = 'flex';
}

function closeLoadContractModal() {
  document.getElementById('loadContractModal').style.display = 'none';
}

function loadSavedContract(index) {
  const contract = savedContracts[index];
  
  if (confirm('현재 작성 중인 내용이 덮어씌워집니다. 계속하시겠습니까?')) {
    // 폼에 데이터 채우기
    document.getElementById('employeeSelect').value = contract.employeeId;
    loadEmployeeInfo();
    document.getElementById('companySelect').value = contract.companyId;
    loadCompanyInfo();
    
    document.getElementById('contractType').value = contract.contractType;
    document.getElementById('workStore').value = contract.workStore;
    document.getElementById('startDate').value = contract.startDate;
    document.getElementById('endDate').value = contract.endDate;
    document.getElementById('position').value = contract.position;
    document.getElementById('wageType').value = contract.wageType;
    document.getElementById('wageAmount').value = contract.wageAmount;
    document.getElementById('paymentDay').value = contract.paymentDay;
    document.getElementById('paymentMethod').value = contract.paymentMethod;
    document.getElementById('contractContent').value = contract.contractContent;
    
    // 근무 스케줄 및 휴게시간 복원
    if (contract.schedules && contract.schedules.length > 0) {
      restoreScheduleData(contract.schedules, contract.breakTimeData);
    }
    
    closeLoadContractModal();
    alert('✅ 계약서를 불러왔습니다.');
  }
}

async function deleteSavedContract(contractId, index) {
  const contract = savedContracts[index];
  const displayName = contract.name || `${contract.employeeName} - ${contract.position}`;
  
  if (confirm(`"${displayName}" 계약서를 삭제하시겠습니까?`)) {
    try {
      await db.collection('savedContracts').doc(contractId).delete();
      showLoadContractModal(); // 목록 새로고침
    } catch (error) {
      console.error('❌ 임시 저장 계약서 삭제 실패:', error);
      alert('❌ 삭제에 실패했습니다.');
    }
    alert('✅ 계약서가 삭제되었습니다.');
  }
}

// ===================================================================
// 계약서 생성
// ===================================================================

async function generateContract() {
  const contractId = 'C' + Date.now();
  // 상대 경로로 링크 생성 (현재 페이지와 같은 위치)
  const baseUrl = window.location.href.split('?')[0].replace('contract.html', '');
  const signLink = `${baseUrl}contract-sign.html?id=${contractId}`;
  
  // 계약서 데이터 생성 및 저장
  const company = companies.find(c => c.id === document.getElementById('companySelect').value);
  
  const contractData = {
    id: contractId,
    employeeName: document.getElementById('employeeName').value,
    employeeBirth: document.getElementById('employeeBirth').value,
    employeeAddress: document.getElementById('employeeAddress').value,
    employeePhone: document.getElementById('employeePhone').value,
    companyName: company?.name || '',
    companyCEO: company?.ceo || '',
    companyBusinessNumber: company?.businessNumber || '',
    companyPhone: company?.phone || '',
    companyAddress: company?.address || '',
    contractType: document.getElementById('contractType').value,
    workStore: document.getElementById('workStore').value,
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value || '기간의 정함이 없음',
    position: document.getElementById('position').value,
    workDays: document.getElementById('workDays').value,
    workTime: document.getElementById('workTime').value,
    breakTime: document.getElementById('breakTime').value,
    wageType: document.getElementById('wageType').value,
    wageAmount: document.getElementById('wageAmount').value,
    paymentDay: document.getElementById('paymentDay').value,
    paymentMethod: document.getElementById('paymentMethod').value,
    contractContent: document.getElementById('contractContent').value,
    contractDate: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: 'unsigned'  // 서명 전 상태
  };
  
  try {
    // Firestore에 저장 (localStorage 제거)
    await db.collection('contracts').doc(contractId).set(contractData);
    console.log('✅ 계약서 Firestore 저장 완료:', contractId);
    
    // 서명 링크 섹션 표시
    document.getElementById('signLinkSection').style.display = 'block';
    document.getElementById('contractIdDisplay').textContent = contractId;
    document.getElementById('signLinkInput').value = signLink;
    
    alert('✅ 계약서가 생성되었습니다!');
    
    // 스크롤
    document.getElementById('signLinkSection').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('❌ 계약서 생성 실패:', error);
    alert('❌ 계약서 생성에 실패했습니다.');
  }
}

function copySignLink() {
  const input = document.getElementById('signLinkInput');
  input.select();
  document.execCommand('copy');
  alert('✅ 링크가 복사되었습니다!');
}

// ===================================================================
// 기타
// ===================================================================

function confirmGoBack() {
  if (confirm('작성 중인 내용이 저장되지 않을 수 있습니다.\n닫으시겠습니까?')) {
    window.location.href = 'admin.html';
  }
}

// 호환성을 위해 goBack 유지
function goBack() {
  confirmGoBack();
}
