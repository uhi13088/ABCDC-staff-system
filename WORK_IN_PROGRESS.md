# ✅ Phase 1 - 멀티테넌트 안정화 완료!

**날짜**: 2025-01-16  
**버전**: v3.1.7  
**상태**: ✅ 95% 완료 (Functions 배포 대기)

---

## 🎉 완료된 작업

### 1. 급여 탭 멀티테넌트 정리 (A안) ✅

**구현 내용**:
- ✅ 급여 탭에 매장 선택 필터 추가 (기본값: "전체")
- ✅ `loadStoresForSalaryFilter()` 함수 추가
- ✅ `switchTab('salary')` 시 매장 필터 자동 로드
- ✅ `loadSalaryList()` 쿼리 수정: companyId + 선택적 storeId 필터
- ✅ `confirmSalary()` 저장 시 companyId, storeId, storeName 자동 추가
- ✅ salary-calculator.js 로직은 그대로 유지 (실시간 계산)

**특징**:
- 기본값: 전체 매장 조회 (관리자는 회사 전체 볼 수 있음)
- 매장 선택 시: 해당 매장 직원만 조회
- 실시간 계산: 매번 attendance에서 조회하여 계산
- B안(Cloud Functions 급여 마감)은 Phase 2로 연기

---

### 2. 전체 쿼리 멀티테넌트 수정 완료 ✅

**수정된 쿼리**: 총 56개

| 파일 | 수정 수 | 주요 변경 |
|------|---------|----------|
| admin-dashboard.html | 26개 | companyId/storeId 필터 추가, 생성 시 테넌트 필드 추가 |
| js/employee.js | 19개 | 모든 조회/생성 쿼리에 companyId 필터 추가 |
| js/contract-viewer.js | 2개 | stores 쿼리에 조건부 companyId 필터 |
| js/pdf-generator.js | 1개 | stores 쿼리에 조건부 companyId 필터 |
| js/salary-calculator.js | 1개 | stores 쿼리에 companyId 필터 |
| js/schedule-data-loader.js | 1개 | users 쿼리에 companyId 필터 |
| js/schedule-viewer.js | 2개 | users 쿼리에 companyId 필터 |
| functions/index.js | 4개 | attendance 조회/생성에 companyId 필터 추가 |

**수정 패턴**:
```javascript
// ❌ 수정 전
const snapshot = await db.collection('users')
  .where('role', '==', 'staff')
  .get();

// ✅ 수정 후
const snapshot = await db.collection('users')
  .where('companyId', '==', myCompanyId)
  .where('role', '==', 'staff')
  .get();
```

---

### 3. Cloud Functions 멀티테넌트 수정 ✅

**수정된 함수**:
1. `createAbsentRecords` (매일 자정 1분 실행)
   - attendance 조회 시 companyId 필터 추가
   - 결근 기록 생성 시 `companyId`, `storeId`, `userId` 자동 추가

2. `createAbsentRecordsForDate` (수동 결근 생성)
   - attendance 조회 시 companyId 필터 추가
   - 결근 기록 생성 시 `companyId`, `storeId`, `userId` 자동 추가

**변경 코드**:
```javascript
// 결근 기록 생성 시 테넌트 필드 추가
const absentRecord = {
  companyId: worker.companyId || null,  // 추가
  storeId: worker.storeId || null,      // 추가
  uid: worker.employeeId,
  userId: worker.employeeId,            // 일관성 추가
  name: worker.employeeName,
  store: worker.workStore,
  date: targetDate,
  status: 'absent',
  // ...
};
```

---

### 4. 회사 생성 스크립트 개발 ✅

**스크립트**: `scripts/create-company.js`

**기능**:
- ✅ companies 문서 생성 (companyId 자동 생성)
- ✅ stores 문서 생성 (storeId 자동 생성, companyId 포함)
- ✅ company_invites 초대 코드 2개 생성 (staff용, manager용)
- ✅ 대화형 CLI 인터페이스 (readline 사용)

**사용법**:
```bash
cd /home/user/webapp
node scripts/create-company.js

# 입력 예시:
# 회사명: ABC Dessert Center 2호점
# 매장명: 맛남살롱 테스트점
# 초대코드: abcdc-test-2025
# 매니저 초대코드: abcdc-mgr-2025
```

---

### 5. 데이터 격리 원칙 확립 ✅

#### Company-level 컬렉션 (companyId 필터 필수)
- `users` - 직원 목록
- `stores` - 매장 목록
- `notices` - 공지사항
- `approvals` - 문서 승인
- `shift_requests` - 교대근무 신청

#### Store-level 컬렉션 (companyId + storeId)
- `attendance` - 출퇴근 기록
- `schedules` - 근무 스케줄
- `salaries` - 급여 기록
- `contracts` - 계약서 (storeId만 필수)

#### 직접 접근 (필터 불필요)
- 직접 문서 ID 조회: `doc(id).get()`
- 특정 사용자 조회: `where('userId', '==', uid)`
- 특정 직원 조회: `where('employeeId', '==', employeeId)`

---

## ⏳ 남은 작업 (5% - 약 40분)

### 1. Functions 배포 (예상: 5분)
```bash
cd /home/user/webapp/functions
npm install
cd ..
firebase deploy --only functions
```

**배포 후 확인**:
- createAbsentRecords 함수 정상 작동
- createAbsentRecordsForDate 함수 정상 작동

---

### 2. 회사 2호 생성 (예상: 2분) - **사장님이 직접**
```bash
cd /home/user/webapp
node scripts/create-company.js
```

**입력 가이드**:
- 회사명: `ABC Dessert Center 2호점`
- 매장명: `맛남살롱 테스트점`
- 초대코드(직원): `abcdc-test-2025`
- 초대코드(매니저): `abcdc-mgr-2025`

---

### 3. Phase 1 내부 베타 테스트 (예상: 30분)

**체크리스트** (11개 영역):

| # | 영역 | 테스트 내용 | 예상 결과 |
|---|------|------------|----------|
| 1 | 회사 생성 | 회사 2호 생성 성공 | ✅ 초대 코드 2개 생성 |
| 2 | 직원 등록 | 회사 1, 2 각각 직원 등록 | ✅ companyId 자동 할당 |
| 3 | 로그인 격리 | 회사 1 관리자 → 회사 1 데이터만 | ✅ companyId 필터 작동 |
| 4 | 출퇴근 격리 | 회사 1 출퇴근 → 회사 2에서 안 보임 | ✅ storeId 격리 |
| 5 | 급여 격리 | 회사 1 급여 → 회사 2에서 안 보임 | ✅ storeId 격리 |
| 6 | 스케줄 격리 | 회사 1 스케줄 → 회사 2에서 안 보임 | ✅ storeId 격리 |
| 7 | 계약서 격리 | 회사 1 계약서 → 회사 2에서 안 보임 | ✅ storeId 격리 |
| 8 | 공지사항 격리 | 회사 1 공지 → 회사 2에서 안 보임 | ✅ companyId 격리 |
| 9 | 승인 격리 | 회사 1 승인 → 회사 2에서 안 보임 | ✅ companyId 격리 |
| 10 | 교대근무 격리 | 회사 1 교대 → 회사 2에서 안 보임 | ✅ companyId 격리 |
| 11 | 대시보드 격리 | 회사 1 통계 → 회사 1 데이터만 | ✅ companyId 필터 |

**통과 기준**: 11개 중 10개 이상 통과 (95%)

---

## 📊 작업 통계

### Git 커밋 히스토리
```
f15ea33a docs: Phase 1 쿼리 수정 완료 상태 업데이트 (95% 완료)
b0047ab2 fix(functions): Cloud Functions 결근 생성 함수에 companyId 필터 추가
94aad404 fix(js): 모든 JS 파일 쿼리 멀티테넌트 수정 완료
5e12a059 fix(employee): js/employee.js 전체 쿼리 수정 완료 (19개)
a9693e60 docs: 급여 탭 멀티테넌트 정리 완료 기록
e5cb4ac6 feat(admin): 급여 탭 멀티테넌트 정리 (A안 - 매장 필터)
```

**총 커밋**: 6개  
**변경된 파일**: 15개  
**추가된 라인**: ~500줄  
**수정된 라인**: ~200줄

---

### 수정된 컬렉션별 통계

| 컬렉션 | 수정 수 | 필터 타입 |
|--------|---------|----------|
| users | 15개 | companyId |
| stores | 8개 | companyId |
| attendance | 10개 | companyId + storeId |
| schedules | 8개 | companyId + storeId |
| contracts | 5개 | storeId 기준 |
| approvals | 5개 | companyId |
| shift_requests | 3개 | companyId |
| notices | 2개 | companyId |

---

## 🎯 Phase 1 완료 기준

### ✅ 달성
- [x] 1-1. 권한/쿼리 이슈 전부 잡기 (56개 쿼리 수정)
- [x] 1-2. 멀티테넌트 위반 코드 제거 (Cloud Functions 수정)
- [x] 1-3. 새 회사 생성 스크립트 (create-company.js)
- [x] 급여 탭 멀티테넌트 정리 (A안)
- [x] 데이터 격리 원칙 확립

### ⏳ 진행 중
- [ ] Functions 배포 (5분)
- [ ] 회사 2호 생성 (사장님 직접 - 2분)
- [ ] 1-4. 내부 베타 테스트 (30분)

---

## 📝 다음 단계 (Phase 2 준비)

### 1. 급여 마감 시스템 (B안)
- Cloud Functions 월말 자동 실행
- attendance → salaries 데이터 이동
- 급여 확정 후 수정 불가

### 2. 추가 기능
- 직원별 급여 히스토리
- 연간 급여 통계
- 퇴직금 자동 계산 개선

### 3. 성능 최적화
- Firestore 복합 인덱스 생성
- 쿼리 캐싱
- 페이지네이션

---

## 🔗 관련 링크

- **GitHub Repository**: https://github.com/uhi13088/ABCDC-staff-system
- **Firebase Console**: https://console.firebase.google.com/project/abcdc-staff-system
- **Firebase Hosting**: https://abcdc-staff-system.web.app

---

## 💡 핵심 원칙

### 데이터 격리 3가지 규칙
1. **Company-level 컬렉션**: 반드시 `companyId` 필터 추가
2. **Store-level 컬렉션**: `companyId` + `storeId` 필터 추가
3. **직접 접근**: `doc(id).get()` 또는 `userId/employeeId` 기반 조회

### Firestore Rules 패턴
```javascript
// list/get 분리로 빈 컬렉션 조회 가능
allow list: if isSignedIn() && hasRole(['admin', 'manager']);
allow get: if isSignedIn() && sameCompany();
```

### JavaScript 쿼리 패턴
```javascript
// 항상 companyId 필터 추가
let query = db.collection('users')
  .where('companyId', '==', myCompanyId)
  .where('role', '==', 'staff');
```

---

**마지막 업데이트**: 2025-01-16 16:45  
**상태**: ✅ 95% 완료 - GitHub 푸시 준비 완료!
