# 필드명 표준화 가이드 (Field Naming Standard)

## ⚠️ 문제 상황

여러 개발 단계를 거치며 사용자 ID를 나타내는 필드명이 혼용되고 있습니다.

### 📊 현재 필드명 사용 현황

| 컬렉션 | 사용 중인 필드명 | 코드 위치 |
|--------|----------------|----------|
| **attendance** | `uid`, `userId` (혼용) | admin-dashboard.html, employee.js, functions/index.js |
| **contracts** | `employeeId` (주력) | 전 영역에서 사용 |
| **schedules** | `userId` (표준) | admin-dashboard.html, employee.js |
| **salaries** | `employeeUid` (독자) | admin-dashboard.html, employee.js |
| **approvals** | `applicantUid` (독자) | admin-dashboard.html, employee.js |
| **time_change_reports** | `employeeUid` (독자) | admin-dashboard.html, employee.js |
| **shift_requests** | `requesterId`, `replacementId`, `matchedUserId` | admin-dashboard.html |

### 🚨 문제점

1. **쿼리 복잡도 증가**: 같은 데이터를 조회하는데 컬렉션마다 다른 필드명 사용
2. **버그 발생 위험**: 필드명 혼동으로 인한 데이터 조회 실패
3. **신규 개발자 혼란**: 어떤 필드명을 사용해야 할지 불명확
4. **통계/리포트 구현 어려움**: JOIN 로직 작성 시 필드명 매핑 필요

---

## ✅ 표준화 전략

### 🎯 표준 필드명: `userId`

**선정 이유**:
1. ✅ Firebase Authentication의 `uid`와 의미적으로 일치
2. ✅ 가장 직관적이고 명확한 이름
3. ✅ `schedules` 컬렉션에서 이미 표준으로 사용 중
4. ✅ RESTful API 및 웹 개발 관행과 일치

### 📋 단계별 마이그레이션 전략

**Phase 1: 듀얼 필드 전략 (현재 → 6개월)**
- 기존 필드명 유지 (하위 호환성 보장)
- 신규 데이터 저장 시 **`userId` 필드 추가**
- 조회 시 `userId` 우선, fallback으로 기존 필드 사용

**Phase 2: 점진적 마이그레이션 (6개월 → 1년)**
- 배치 스크립트로 기존 데이터에 `userId` 필드 추가
- 쿼리를 `userId` 중심으로 변경
- 기존 필드는 deprecated 마킹

**Phase 3: 완전 전환 (1년 이후)**
- 기존 필드명 제거 검토
- `userId` 단일 필드로 통일

---

## 🔧 구현 가이드

### 1. 신규 데이터 저장 시 (듀얼 필드)

```javascript
// ✅ CORRECT: 듀얼 필드 저장 (하위 호환성 + 표준화)
const attendanceData = {
  companyId: 'company123',
  userId: 'user456',           // 🔥 표준 필드 (필수)
  uid: 'user456',              // 하위 호환성 (기존 코드 지원)
  date: '2025-11-20',
  status: 'present',
  clockIn: '09:00',
  clockOut: '18:00'
};

await db.collection('attendance').add(attendanceData);
```

```javascript
// ✅ CORRECT: contracts 컬렉션 (듀얼 필드)
const contractData = {
  companyId: 'company123',
  userId: 'user456',           // 🔥 표준 필드 (필수)
  employeeId: 'user456',       // 하위 호환성 (기존 코드 지원)
  employeeName: '김철수',
  workStore: '부천시청점',
  // ... 기타 필드
};

await db.collection('contracts').add(contractData);
```

```javascript
// ✅ CORRECT: salaries 컬렉션 (듀얼 필드)
const salaryData = {
  companyId: 'company123',
  userId: 'user456',           // 🔥 표준 필드 (필수)
  employeeUid: 'user456',      // 하위 호환성 (기존 코드 지원)
  month: '2025-11',
  totalPay: 2500000,
  // ... 기타 필드
};

await db.collection('salaries').add(salaryData);
```

### 2. 데이터 조회 시 (Fallback 패턴)

```javascript
// ✅ CORRECT: userId 우선, fallback으로 기존 필드
async function getEmployeeContracts(employeeUid) {
  // 1차: userId로 조회 (표준)
  let query = db.collection('contracts')
    .where('companyId', '==', currentCompanyId)
    .where('userId', '==', employeeUid);
  
  let snapshot = await query.get();
  
  // 2차: employeeId로 조회 (fallback - 기존 데이터)
  if (snapshot.empty) {
    query = db.collection('contracts')
      .where('companyId', '==', currentCompanyId)
      .where('employeeId', '==', employeeUid);
    
    snapshot = await query.get();
  }
  
  return snapshot;
}
```

### 3. Cloud Functions (듀얼 필드 생성)

```javascript
// ✅ CORRECT: createAbsentRecords 함수 수정 예시
const absentRecord = {
  companyId: worker.companyId || null,
  storeId: worker.storeId || null,
  
  // 🔥 표준 필드
  userId: worker.employeeId,
  
  // 하위 호환성 필드
  uid: worker.employeeId,
  
  name: worker.employeeName,
  store: worker.workStore,
  date: yesterdayStr,
  status: 'absent',
  // ...
};
```

---

## 📝 컬렉션별 필드 매핑표

### 필수 필드

| 컬렉션 | 표준 필드 | 기존 필드 (하위 호환) | 상태 |
|--------|----------|---------------------|------|
| **attendance** | `userId` | `uid` | ✅ 듀얼 저장 완료 |
| **contracts** | `userId` | `employeeId` | ✅ 듀얼 저장 완료 |
| **schedules** | `userId` | - | ✅ 이미 표준 |
| **salaries** | `userId` | `employeeUid` | ✅ 듀얼 저장 완료 |
| **approvals** | `userId` | `applicantUid` | ✅ 듀얼 저장 완료 |
| **time_change_reports** | `userId` | `employeeUid` | ✅ 듀얼 저장 완료 |
| **signedContracts** | `userId` | `employeeId` | ✅ 듀얼 저장 완료 |
| **shift_requests** | `requesterUserId`, `replacementUserId` | `requesterId`, `matchedUserId` | ✅ 듀얼 저장 완료 |

### 특수 케이스

**shift_requests 컬렉션**:
```javascript
// ✅ CORRECT: 역할별 명확한 필드명 + 표준화
{
  companyId: 'company123',
  storeId: 'store789',
  
  // 🔥 신청자 필드 (듀얼)
  requesterUserId: 'user456',     // 🔥 표준 필드 (신청자)
  requesterId: 'user456',         // 하위 호환성
  requesterName: '김철수',
  
  // 🔥 대타 필드 (듀얼)
  replacementUserId: 'user789',   // 🔥 표준 필드 (대타자)
  matchedUserId: 'user789',       // 하위 호환성
  matchedUserName: '이영희',
  
  // 기타 필드
  workDate: '2025-11-20',
  workStartTime: '09:00',
  workEndTime: '18:00',
  status: 'matched',
  createdAt: serverTimestamp(),
  matchedAt: serverTimestamp(),
  approvedByAdmin: false
}
```

**schedules 컬렉션 (교대근무 관련)**:
```javascript
// ✅ CORRECT: 교대근무로 생성된 스케줄
{
  userId: 'user789',                          // 대타자 (표준)
  userName: '이영희',
  
  isShiftReplacement: true,                   // 교대근무 표시
  shiftRequestId: 'request123',
  
  // 🔥 원 신청자 필드 (듀얼)
  originalRequesterUserId: 'user456',         // 🔥 표준 필드 (원 신청자)
  originalRequesterId: 'user456',             // 하위 호환성
  originalRequesterName: '김철수',
  
  date: '2025-11-20',
  startTime: '09:00',
  endTime: '18:00',
  // ...
}
```

---

## 🚀 Action Items

### ✅ 즉시 적용 완료 (High Priority - DONE)

1. **신규 코드 작성 규칙**
   - [x] 모든 신규 데이터 저장 시 `userId` 필드 추가
   - [x] 기존 필드도 함께 저장 (듀얼 필드)
   - [x] 주석으로 표준 필드 명시: `// 🔥 표준 필드`

2. **Cloud Functions 수정**
   - [x] `createAbsentRecords`: `userId` + `uid` 듀얼 저장
   - [x] `createAbsentRecordsForDate`: `userId` + `uid` 듀얼 저장

3. **프론트엔드 코드 수정**
   - [x] attendance: `userId` + `uid` 듀얼 저장
   - [x] approvals: `userId` + `applicantUid` 듀얼 저장 (3곳)
   - [x] time_change_reports: `userId` + `employeeUid` 듀얼 저장 (3곳)
   - [x] salaries: `userId` + `employeeUid` 듀얼 저장
   - [x] contracts: `userId` + `employeeId` 듀얼 저장
   - [x] signedContracts: `userId` + `employeeId` 듀얼 저장

4. **문서화**
   - [x] FIELD_NAMING_STANDARD.md 작성 및 배포
   - [x] README.md에 필드명 표준 링크 추가
   - [x] 커밋 메시지에 상세 설명 포함

### 중기 계획 (Medium Priority)

4. **조회 로직 개선**
   - [ ] `getEmployeeContracts` 헬퍼 함수 생성
   - [ ] Fallback 패턴 적용한 공통 모듈 작성
   - [ ] 기존 쿼리 점진적 교체

5. **배치 마이그레이션 스크립트**
   - [ ] 각 컬렉션별 마이그레이션 스크립트 작성
   - [ ] 테스트 환경에서 검증
   - [ ] 프로덕션 배포 (주말/야간)

### 장기 계획 (Low Priority)

6. **완전 전환**
   - [ ] 6개월 후 마이그레이션 진행률 평가
   - [ ] 1년 후 기존 필드 제거 검토
   - [ ] Firestore Rules 업데이트

---

## 📖 참고 자료

### 컬렉션별 코드 위치

**attendance**:
- 쿼리: `admin-dashboard.html`, `employee.js`, `functions/index.js`
- 저장: `admin-dashboard.html`, `employee.js`

**contracts**:
- 쿼리: 전 영역 (`employeeId` 사용)
- 저장: `admin-dashboard.html`

**salaries**:
- 쿼리: `admin-dashboard.html`, `employee.js` (`employeeUid` 사용)
- 저장: `admin-dashboard.html`

**approvals**:
- 쿼리: `employee.js` (`applicantUid` 사용)
- 저장: `employee.js`

**time_change_reports**:
- 쿼리: `employee.js` (`employeeUid` 사용)
- 저장: `admin-dashboard.html`, `employee.js`

---

## ❌ 안티패턴 (피해야 할 코드)

```javascript
// ❌ BAD: 표준 필드 없이 기존 필드만 사용
const attendanceData = {
  companyId: 'company123',
  uid: 'user456',  // ❌ userId 필드 누락
  date: '2025-11-20',
  status: 'present'
};

// ❌ BAD: 컬렉션마다 다른 필드명 사용
const contractQuery = db.collection('contracts')
  .where('employeeId', '==', uid);  // ❌ userId로 통일 필요

const attendanceQuery = db.collection('attendance')
  .where('uid', '==', uid);  // ❌ userId로 통일 필요
```

---

## 📞 문의

필드명 표준화 관련 질문이나 제안사항은 GitHub Issues에 등록해주세요.

**마지막 업데이트**: 2025-11-20
**버전**: v1.1 (Phase 1 완료 - 듀얼 필드 적용 완료)
