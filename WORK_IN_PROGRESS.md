# 🚧 작업 진행 중 - 급여 탭 멀티테넌트 정리

**날짜**: 2025-01-16  
**버전**: v3.1.7  
**상태**: ✅ 완료 (A안 구현)

---

## 📊 현재 상황

### ✅ 최근 완료 작업 (2025-01-16)

**급여 탭 멀티테넌트 정리 (A안 - 실시간 계산 + 매장 필터)**
- ✅ 급여 탭에 매장 선택 필터 추가
- ✅ `loadStoresForSalaryFilter()` 함수 추가
- ✅ `switchTab('salary')` 시 매장 필터 자동 로드
- ✅ `loadSalaryList()` 쿼리 수정: companyId + 선택적 storeId 필터
- ✅ `confirmSalary()` 저장 시 companyId, storeId, storeName 자동 추가
- ✅ salaries 조회 쿼리에 매장 필터 적용
- ✅ salary-calculator.js 로직은 그대로 유지 (변경 없음)

**특징**:
- 기본값: 전체 매장 조회 (관리자는 회사 전체 볼 수 있음)
- 매장 선택 시: 해당 매장 직원만 조회
- 실시간 계산: 매번 attendance에서 조회하여 계산
- B안(Cloud Functions 급여 마감)은 Phase 2로 연기

### ✅ 이전 해결 문제

1. **Firebase Auth 초기화 타이밍 이슈**
   - **문제**: `currentUser`가 undefined 상태에서 `showMainScreen()` 실행
   - **원인**: sessionStorage 동기 체크 → Firebase Auth 비동기 로드 불일치
   - **해결**: `onAuthStateChanged()` 패턴으로 변경 (firebase-init.js)
   - **결과**: ✅ 사용자 UID 정상 로드, companyId 조회 성공

2. **userType vs role 필드명 불일치**
   - **문제**: 코드는 `userType` 쿼리, 실제 데이터는 `role` 필드
   - **해결**: 전역 찾기/바꾸기로 `userType` → `role` 일괄 변경
   - **결과**: ✅ users 컬렉션 쿼리 정상 작동

3. **companyId 전역 변수 누락**
   - **문제**: 모든 쿼리에서 companyId 필터가 누락됨
   - **해결**: 
     - `myCompanyId` 전역 변수 추가
     - `showMainScreen()`에서 사용자 companyId 로드
     - 15개 이상의 쿼리 함수에 `.where('companyId', '==', myCompanyId)` 추가
   - **결과**: ✅ 자기 회사 데이터만 조회

4. **Firestore Rules 빈 컬렉션 조회 실패**
   - **문제**: `allow read`는 `resource.data.companyId` 체크 → 빈 컬렉션 실패
   - **해결**: `allow list`와 `allow get` 분리
     - `allow list`: 쿼리 조회 (resource 체크 없음)
     - `allow get`: 개별 문서 읽기 (resource 체크 있음)
   - **적용 컬렉션**: users, approvals, shift_requests, stores
   - **결과**: ✅ 빈 컬렉션도 정상 조회

---

## ⚠️ 남은 작업

### 1. Phase 1 - 멀티테넌트 안정화 (계속)

**남은 쿼리 수정**: 69개 → 65개로 감소
- admin-dashboard.html: 22개 남음
- js/employee.js: 20개
- 기타 JS: 23개

**우선순위**:
1. admin-dashboard.html 나머지 쿼리 (승인 관리, 매장 관리 등)
2. js/employee.js (직원 포털)
3. 기타 컴포넌트

### 2. Firestore 복합 인덱스 생성 대기
- **상태**: Firebase Console에서 인덱스 생성 필요
- **영향 받는 쿼리**:
  - attendance 컬렉션: `companyId + date` 인덱스
  - stores 컬렉션: `companyId + name` 인덱스
- **작업**: 사용자가 Firebase Console 링크 클릭하여 인덱스 생성 (2-5분 소요)
- **우선순위**: 낮음 (기능은 작동하나 성능 최적화용)

### 2. 기타 작은 권한 문제 (가능성)
- shift_requests, approvals 컬렉션의 특정 작업에서 권한 오류 발생 가능
- 테스트 후 추가 수정 필요

---

## 📋 수정된 파일 목록

### 1. `/home/user/webapp/js/firebase-init.js`
**변경 내용**:
```javascript
// ❌ OLD: sessionStorage 동기 체크
function checkAuthStatus() {
  if (sessionStorage.getItem('admin_authenticated') === 'true') {
    showMainScreen();  // currentUser is null!
  }
}

// ✅ NEW: onAuthStateChanged 비동기 패턴
function checkAuthStatus() {
  firebase.auth().onAuthStateChanged((user) => {
    if (user && sessionStorage.getItem('admin_authenticated') === 'true') {
      showMainScreen();  // ✅ user object ready!
    } else {
      window.location.href = 'admin-login.html';
    }
  });
}
```

### 2. `/home/user/webapp/admin-dashboard.html`
**변경 내용**:
1. **전역 변수 추가** (line ~899):
   ```javascript
   let myCompanyId = null;  // 🔒 현재 관리자의 companyId
   
   function getCompanyQuery(collectionName) {
     let query = firebase.firestore().collection(collectionName);
     if (myCompanyId) {
       query = query.where('companyId', '==', myCompanyId);
     }
     return query;
   }
   ```

2. **showMainScreen() 수정** (line ~911):
   ```javascript
   async function showMainScreen() {
     const uid = firebase.auth().currentUser?.uid;
     const userDoc = await firebase.firestore().collection('users').doc(uid).get();
     if (userDoc.exists) {
       myCompanyId = userDoc.data().companyId;
       console.log(`🔒 내 회사 ID: ${myCompanyId}`);
     }
     
     if (!myCompanyId) {
       alert('⚠️ 회사 정보를 불러올 수 없습니다');
       return;
     }
     
     await loadDashboard();
     switchTab('employees');
   }
   ```

3. **모든 쿼리 함수 수정** (15개 이상):
   - `loadEmployees()`, `loadAdmins()`, `loadStoresForAttendanceFilter()`
   - `loadAttendanceList()`, `loadSalaryList()`, `loadApprovals()`
   - `loadContracts()`, `loadStores()`, `loadStoresForFilter()`
   - `loadNotices()`, `loadStoresForScheduleFilter()`, `loadDashboard()`
   - 모든 함수에 `.where('companyId', '==', myCompanyId)` 추가

### 3. `/home/user/webapp/firestore.rules`
**변경 내용**: v3.1.7로 업데이트
```javascript
// ⭐ v3.1.7: users 컬렉션 (쿼리/문서 권한 분리)
match /users/{userId} {
  // 🔥 쿼리 조회 (list): admin/manager는 빈 컬렉션도 조회 가능
  allow list: if isSignedIn() && (
    isSuperAdmin() ||
    (currentUserExists() && currentUser().data.role in ["admin", "manager", "store_manager"])
  );
  
  // 개별 문서 읽기 (get): 본인 또는 같은 회사의 admin/manager
  allow get: if isSignedIn() && (
    request.auth.uid == userId ||
    isSuperAdmin() ||
    (
      request.auth.uid != userId &&
      currentUserExists() &&
      currentUser().data.companyId == resource.data.companyId &&
      currentUser().data.role in ["admin", "manager", "store_manager"]
    )
  );
  
  // ... (나머지 권한 동일)
}

// approvals, shift_requests, stores 컬렉션도 동일한 패턴 적용
```

---

## 🎯 다음 단계

### 1. 사용자 테스트 (우선순위: 높음)
- 관리자 대시보드 새로고침
- 모든 탭 기능 테스트:
  - ✅ 직원 목록
  - ✅ 출퇴근 기록
  - ⚠️ 승인 관리 (shift_requests, approvals)
  - ⚠️ 매장 관리 (stores 생성)
  - ⚠️ 급여 관리
  - ✅ 대시보드 통계

### 2. Firestore 인덱스 생성 (우선순위: 중간)
- Firebase Console 링크 클릭
- attendance, stores 인덱스 생성 (2-5분)

### 3. GitHub 푸시 (우선순위: 높음)
- ✅ firestore.rules 변경사항 커밋
- ✅ admin-dashboard.html 변경사항 커밋
- ✅ firebase-init.js 변경사항 커밋
- ✅ WORK_IN_PROGRESS.md 문서 추가
- ✅ README.md 업데이트

### 4. GitHub Actions 자동 배포 확인
- GitHub 푸시 후 2-3분 대기
- Firebase Hosting 자동 배포 확인

---

## 📝 테스트 체크리스트

### 로그인 및 초기화
- ✅ 로그인 성공
- ✅ Firebase Auth currentUser 로드
- ✅ companyId 조회 성공
- ✅ 대시보드 통계 로드

### 직원 관리
- ✅ 직원 목록 조회 (빈 컬렉션)
- ⚠️ 직원 등록
- ⚠️ 직원 수정
- ⚠️ 직원 삭제

### 출퇴근 기록
- ✅ 출퇴근 기록 조회 (빈 컬렉션)
- ⚠️ 출퇴근 기록 추가

### 승인 관리
- ❌ approvals 조회 (권한 오류 가능성)
- ❌ shift_requests 조회 (권한 오류 가능성)

### 매장 관리
- ❌ 매장 목록 조회
- ❌ 매장 생성 (권한 오류)

### 급여 관리
- ⚠️ 급여 조회
- ⚠️ 급여 계산

---

## 🔗 관련 링크

- **GitHub Repository**: https://github.com/uhi13088/ABCDC-staff-system
- **Firebase Console**: https://console.firebase.google.com/project/abcdc-staff-system
- **Firebase Hosting**: https://abcdc-staff-system.web.app

---

## 💡 중요 참고사항

### JavaScript에서 companyId 필터링이 필수인 이유
Firestore Rules의 `allow list`는 쿼리 레벨 권한만 체크하고, 개별 문서의 `resource.data`를 검증하지 않습니다. 
따라서 **JavaScript 코드에서 반드시 `.where('companyId', '==', myCompanyId)`를 추가**해야 합니다.

```javascript
// ❌ 위험: 모든 회사 데이터 조회 가능
const query = db.collection('users').where('role', '==', 'staff');

// ✅ 안전: 자기 회사만 조회
const query = db.collection('users')
  .where('role', '==', 'staff')
  .where('companyId', '==', myCompanyId);
```

### Rules의 list/get 분리가 필요한 이유
- `allow read`: 쿼리와 개별 문서 읽기 모두 포함 (resource 체크 시 빈 컬렉션 실패)
- `allow list`: 쿼리 조회만 (resource 없이 동작, 빈 컬렉션 성공)
- `allow get`: 개별 문서 읽기만 (resource 체크 가능)

이 패턴으로 빈 컬렉션도 정상적으로 조회할 수 있습니다.
