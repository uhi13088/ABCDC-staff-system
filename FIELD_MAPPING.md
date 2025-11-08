# Firestore 필드명 매핑 정리

## 📋 컬렉션별 필드명 통합

### 1. users 컬렉션 (직원 정보)
**실제 Firestore 필드:**
- `name` - 이름
- `email` - 이메일
- `phone` - 전화번호
- `birth` - 주민등록번호
- `address` - 주소
- `store` - 매장 이름 (예: "맛남살롱 부천시청점")
- `position` - 직책
- `role` - 역할 (employee/manager/admin)
- `status` - 상태 (active/pending/resigned)
- `salaryType` - 급여 유형 (hourly/monthly/annual)
- `salaryAmount` - 급여 금액
- `createdAt` - 생성일

**코드에서 사용:**
```javascript
empData.name
empData.store  // ⚠️ storeId 아님!
empData.position
empData.salaryType
empData.salaryAmount
empData.status  // ⚠️ resigned 제외 필요
```

---

### 2. contracts 컬렉션 (계약서)
**실제 Firestore 필드:**
- `employeeName` - 직원 이름
- `employeeBirth` - 주민등록번호
- `employeePhone` - 전화번호
- `employeeAddress` - 주소
- `employeePosition` - 직책 (또는 `position`)
- `companyName` - 회사명
- `companyCEO` - 대표자
- `companyBusinessNumber` - 사업자등록번호
- `companyPhone` - 회사 전화번호
- `companyAddress` - 회사 주소
- `contractStartDate` - 계약 시작일 (⚠️ `startDate` 아님!)
- `contractEndDate` - 계약 종료일 (⚠️ `endDate` 아님!)
- `workStore` - 근무지 (또는 `workPlace`)
- `salaryType` - 급여 유형 (⚠️ `wageType` 아님!)
- `salaryAmount` - 급여 금액 (⚠️ `wageAmount` 아님!)
- `salaryPaymentDay` - 급여 지급일 (또는 `paymentDay`)
- `salaryCalculationType` - 급여 계산 방식
- `salaryCalculationPeriod` - 급여 계산 기간
- `schedule` - 근무 스케줄 객체
  - `schedule.days` - 근무일 (또는 `workDays`)
  - `schedule.time` - 근무시간 (또는 `workTime`)
  - `schedule.breakTime` - 휴게시간 (또는 `breakTime`)
- `insurance` - 보험 정보 객체
  - `insurance.pension` - 국민연금
  - `insurance.health` - 건강보험
  - `insurance.employment` - 고용보험
  - `insurance.workComp` - 산재보험
  - `insurance.severancePay` - 퇴직금
- `contractContent` - 계약서 본문 (또는 `contractBody`)
- `contractDate` - 계약 일자
- `createdAt` - 생성일
- `id` - 계약서 ID

**코드에서 사용 (호환성 보장):**
```javascript
// 계약 기간
contract.contractStartDate || contract.startDate || '-'
contract.contractEndDate || contract.endDate || '-'

// 근무지
contract.workStore || contract.workPlace || '-'

// 직책
contract.employeePosition || contract.position || '-'

// 급여
contract.salaryType || contract.wageType || '시급'
contract.salaryAmount || contract.wageAmount || 0

// 급여 지급일
contract.salaryPaymentDay || contract.paymentDay || '매월 말일'

// 근무 일정
contract.schedule?.days || contract.workDays || '-'
contract.schedule?.time || contract.workTime || '-'
contract.schedule?.breakTime || contract.breakTime || '근로기준법 준수'

// 계약서 본문
contract.contractContent || contract.contractBody || ''
```

---

### 3. schedules 컬렉션 (근무 스케줄)
**문서 ID 형식:** `{userId}_{year}-{weekNum}`
예: `V6ODL21346fDl3DllMAzZw0Icov2_2025-47`

**실제 Firestore 필드:**
- `월`, `화`, `수`, `목`, `금`, `토`, `일` - 요일별 객체
  - `startTime` - 시작 시간 (예: "09:00")
  - `endTime` - 종료 시간 (예: "18:00")
  - `hours` - 근무 시간 (예: 8)
  - `isWorkDay` - 근무 여부 (true/false)
- `createdAt` - 생성일
- `updatedAt` - 수정일

**코드에서 사용:**
```javascript
const scheduleDocId = `${empUid}_${year}-${weekNum}`;
const scheduleDoc = await db.collection('schedules').doc(scheduleDocId).get();

if (scheduleDoc.exists) {
  const scheduleData = scheduleDoc.data();
  days.forEach(day => {
    if (scheduleData[day]) {
      const daySchedule = scheduleData[day];
      schedules[day] = {
        startTime: daySchedule.startTime || '',
        endTime: daySchedule.endTime || '',
        hours: daySchedule.hours || 0,
        isWorkDay: daySchedule.isWorkDay !== false
      };
    }
  });
}
```

**⚠️ 중요:** 
- 스케줄 데이터가 없으면 간트차트에 막대가 표시되지 않음
- 계약서 작성 시 자동으로 스케줄 생성되어야 함

---

### 4. attendance 컬렉션 (출퇴근 기록)
**실제 Firestore 필드:**
- `userId` - 직원 UID
- `date` - 날짜 (예: "2025-11-08")
- `checkInTime` - 출근 시간 (예: "09:05")
- `checkOutTime` - 퇴근 시간 (예: "18:10")
- `status` - 상태 (normal/absent/late/early)
- `isLate` - 지각 여부
- `isEarlyLeave` - 조퇴 여부
- `workHours` - 근무 시간
- `overtimeHours` - 초과 근무 시간
- `createdAt` - 생성일

**코드에서 사용:**
```javascript
const attendanceSnapshot = await db.collection('attendance')
  .where('userId', '==', empUid)
  .where('date', '==', dateStr)
  .get();

if (!attendanceSnapshot.empty) {
  const attendanceData = attendanceSnapshot.docs[0].data();
  
  let status = 'normal';
  if (attendanceData.status === 'absent' || !attendanceData.checkInTime) {
    status = 'absent';
  } else if (attendanceData.isLate) {
    status = 'late';
  } else if (attendanceData.isEarlyLeave) {
    status = 'early';
  }
}
```

---

### 5. stores 컬렉션 (매장 정보)
**실제 Firestore 필드:**
- `name` - 매장 이름 (예: "맛남살롱 부천시청점")
- `openTime` - 오픈 시간 (예: "08:00")
- `closeTime` - 마감 시간 (예: "22:00")
- `address` - 주소
- `phone` - 전화번호
- `ceoSignature` - 대표 서명 이미지 (Base64)
- `createdAt` - 생성일

**코드에서 사용:**
```javascript
const storeDoc = await db.collection('stores').doc(storeId).get();
const storeName = storeDoc.exists ? storeDoc.data().name : '';

// 직원 조회 시 매장 이름으로 필터
const employeesSnapshot = await db.collection('users')
  .where('role', '==', 'employee')
  .where('store', '==', storeName)  // ⚠️ storeId가 아닌 store(매장명) 사용
  .get();
```

---

## 🔧 수정 완료된 부분

### ✅ 계약서 보기 (admin-dashboard.html)
- [x] `contractStartDate` / `startDate` 호환
- [x] `contractEndDate` / `endDate` 호환
- [x] `workStore` / `workPlace` 호환
- [x] `employeePosition` / `position` 호환
- [x] `salaryType` / `wageType` 호환
- [x] `salaryAmount` / `wageAmount` 호환 + toLocaleString()
- [x] `salaryPaymentDay` / `paymentDay` 호환
- [x] `schedule.days` / `workDays` 호환
- [x] `schedule.time` / `workTime` 호환
- [x] `schedule.breakTime` / `breakTime` 호환

### ✅ 근무스케줄 (admin-dashboard.html)
- [x] 직원 조회 시 `store` 필드 사용 (storeId 아님)
- [x] 퇴사자 필터링 (`status === 'resigned'` 제외)
- [x] 스케줄 문서 존재 여부 로그 추가

### ✅ 스케줄 시뮬레이터 (admin-dashboard.html)
- [x] 퇴사자 필터링 추가

---

## ⚠️ 남은 문제

### 1. 스케줄 데이터 누락
**증상:** 
```
⚠️ 김연아 스케줄 문서 없음: V6ODL21346fDl3DllMAzZw0Icov2_2025-47
```

**원인:** 
- schedules 컬렉션에 해당 주차 데이터가 없음
- 계약서 작성 시 자동 스케줄 생성 로직 필요

**해결 방법:**
1. 계약서 작성 완료 시 schedules 컬렉션에 초기 스케줄 자동 생성
2. 또는 스케줄 시뮬레이터에서 스케줄 저장 기능 구현

### 2. 계약서 필드명 통일 필요
**문제:** 
- 저장 시: `contractStartDate`, `salaryAmount`
- 보기 시: `startDate`, `wageAmount`

**현재 상태:** 
- 호환성 코드로 임시 해결 (OR 조건)
- 근본적으로는 하나의 필드명으로 통일 권장

**권장 사항:**
- **contracts 컬렉션 표준 필드명:**
  - `contractStartDate` (O) / `startDate` (X)
  - `contractEndDate` (O) / `endDate` (X)
  - `salaryType` (O) / `wageType` (X)
  - `salaryAmount` (O) / `wageAmount` (X)
  - `salaryPaymentDay` (O) / `paymentDay` (X)
