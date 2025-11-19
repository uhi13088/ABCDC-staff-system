# 🛡️ 보안 취약점 수정 보고서

**작성일**: 2025-01-19  
**문제 발견자**: 사장님 (uhi1308@naver.com)  
**심각도**: 🔴 **HIGH** (다른 사용자 개인정보 접근 가능)

---

## 📋 발견된 문제

### 🔴 보안 이슈: super_admin이 직원 포털에서 다른 사용자(김룰루) 데이터 조회

**재현 단계**:
1. super_admin 계정(uhi1308@naver.com)으로 로그인
2. 직원 포털(employee.html) 접속
3. **다른 사용자(김룰루, uid: LpNbbo2dpJSp5j2WXHawzEOrICF3)의 데이터** 조회됨
   - 급여 정보
   - 근무 스케줄
   - 계약서
   - 출퇴근 기록

**Console 로그 증거**:
```javascript
✅ 사용자 로그인 상태: uhi1308@naver.com
✅ 사용자 권한: super_admin
// 그런데...
💰 급여 조회: {uid: 'LpNbbo2dpJSp5j2WXHawzEOrICF3', filterMonth: '2025-11'}
사용자: 김룰루 (uid: LpNbbo2dpJSp5j2WXHawzEOrICF3)
```

**영향 범위**:
- 모든 관리자 계정(`super_admin`, `admin`, `store_manager`, `manager`)이 직원 포털에 접근 가능
- sessionStorage 오염으로 다른 사용자의 개인정보 조회 가능
- Firebase Auth uid와 sessionStorage uid 불일치 시 검증 없음

---

## 🔍 원인 분석

### 1️⃣ **employee-login.html Line 336-344: super_admin 접근 차단 누락**

```javascript
// ❌ BEFORE: super_admin, store_manager 차단 안 됨
if (userData.role === 'admin' || userData.role === 'manager') {
  alert('❌ 관리자 계정은 관리자 로그인 페이지를 이용해주세요.');
  await auth.signOut();
  return;
}
```

### 2️⃣ **employee-login.html Line 374-378: sessionStorage 초기화 미흡**

```javascript
// ❌ BEFORE: 기존 sessionStorage 데이터가 남아있음
sessionStorage.setItem('employee_email', email);
sessionStorage.setItem('employee_name', userData.name || '직원');
sessionStorage.setItem('employee_uid', user.uid);
sessionStorage.setItem('employee_authenticated', 'true');
```

**시나리오**:
1. 김룰루로 로그인 → employee.html (sessionStorage에 김룰루 uid 저장)
2. 로그아웃하지 않고 뒤로가기 → employee-login.html
3. super_admin으로 로그인 (sessionStorage에 김룰루 uid 남아있음)
4. employee.html이 sessionStorage의 **이전 uid**(김룰루)를 읽음
5. **super_admin이 김룰루의 데이터 조회**

### 3️⃣ **employee.js Line 51-64: Firebase Auth uid 검증 누락**

```javascript
// ❌ BEFORE: sessionStorage uid를 그대로 신뢰
async function checkLoginStatus() {
  const uid = sessionStorage.getItem('employee_uid');
  
  if (authenticated !== 'true' || !name || !uid) {
    alert('⚠️ 로그인이 필요합니다.');
    window.location.href = 'employee-login.html';
    return;
  }
  
  // sessionStorage uid를 검증 없이 사용
  await loadUserInfo(uid, name);
}
```

### 4️⃣ **employee.js loadUserInfo(): role 검증 누락**

```javascript
// ❌ BEFORE: 권한 체크 없이 데이터 로드
if (userDoc.exists) {
  const userData = userDoc.data();
  
  // status만 체크, role은 체크 안 함
  if (status === 'approved') {
    currentUser = { uid: uid, ...userData };
  }
}
```

---

## ✅ 적용된 해결책

### 🛡️ 3단계 방어 체계

#### 1단계: employee-login.html - 진입 차단

**Line 336-344: 모든 관리자 권한 차단**
```javascript
// ✅ AFTER: super_admin, admin, store_manager, manager 모두 차단
if (userData.role === 'super_admin' || 
    userData.role === 'admin' || 
    userData.role === 'store_manager' || 
    userData.role === 'manager') {
  
  // 관리자 계정이 저장된 경우 localStorage 삭제
  localStorage.removeItem('employee_saved_email');
  localStorage.removeItem('employee_saved_password');
  
  alert('❌ 관리자/매니저 계정은 관리자 로그인 페이지를 이용해주세요.\n\n직원 포털은 staff 권한만 접근 가능합니다.');
  await auth.signOut();
  return;
}
```

**Line 374-381: sessionStorage 명시적 초기화**
```javascript
// ✅ AFTER: 기존 세션 완전히 초기화
sessionStorage.clear();  // 🔥 이전 사용자 정보 제거

sessionStorage.setItem('employee_email', email);
sessionStorage.setItem('employee_name', userData.name || '직원');
sessionStorage.setItem('employee_uid', user.uid);
sessionStorage.setItem('employee_authenticated', 'true');

console.log('✅ 직원 로그인 성공:', userData.name, '(uid:', user.uid, ')');
```

#### 2단계: employee.js checkLoginStatus() - uid 검증

**Line 62-89: Firebase Auth uid와 sessionStorage uid 일치 확인**
```javascript
// ✅ AFTER: Firebase Auth 실제 로그인 상태 확인
const currentAuthUser = firebase.auth().currentUser;

if (!currentAuthUser) {
  console.error('❌ Firebase Auth 로그인 상태가 아닙니다.');
  alert('⚠️ 세션이 만료되었습니다. 다시 로그인해주세요.');
  sessionStorage.clear();
  window.location.href = 'employee-login.html';
  return;
}

// ✅ sessionStorage의 uid와 Firebase Auth의 uid 일치 확인
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
```

#### 3단계: employee.js loadUserInfo() - role 재검증

**Line 123-133: Firestore에서 role 재확인**
```javascript
// ✅ AFTER: staff 권한만 허용
const userRole = userData.role || 'staff';

if (userRole !== 'staff') {
  console.error('❌ 접근 거부: 직원 포털은 staff 권한만 접근 가능', { role: userRole });
  alert('❌ 접근 권한이 없습니다.\n\n직원 포털은 staff 권한만 접근 가능합니다.\n관리자/매니저는 관리자 페이지를 이용해주세요.');
  logout();
  return;
}

currentUser = { uid: uid, ...userData };
console.log('✅ currentUser 설정 완료 (Firestore):', currentUser);
```

---

## 🧪 테스트 시나리오

### ✅ 시나리오 1: super_admin 접근 차단

**Steps**:
1. employee-login.html에서 super_admin(uhi1308@naver.com) 로그인 시도
2. **Expected**: "❌ 관리자/매니저 계정은 관리자 로그인 페이지를 이용해주세요" 알림
3. **Expected**: 로그아웃되고 로그인 페이지에 유지
4. **Expected**: localStorage에서 저장된 정보 삭제

### ✅ 시나리오 2: sessionStorage 오염 방지

**Steps**:
1. staff 계정(김룰루)으로 로그인 → employee.html
2. 로그아웃하지 않고 뒤로가기 → employee-login.html
3. 다른 staff 계정으로 로그인 시도
4. **Expected**: `sessionStorage.clear()` 호출로 이전 uid 삭제
5. **Expected**: 새로운 계정의 uid만 조회됨

### ✅ 시나리오 3: Firebase Auth uid 불일치 감지

**Steps**:
1. staff 계정으로 로그인
2. 개발자 도구에서 sessionStorage의 employee_uid를 다른 uid로 변경
3. employee.html 새로고침
4. **Expected**: "⚠️ 보안 오류가 감지되었습니다" 알림
5. **Expected**: sessionStorage 초기화 후 로그아웃

### ✅ 시나리오 4: Firestore role 재검증

**Steps**:
1. Firestore에서 staff의 role을 admin으로 변경
2. employee.html 새로고침
3. **Expected**: "❌ 접근 권한이 없습니다" 알림
4. **Expected**: 로그아웃 처리

---

## 📊 영향 범위

### 수정된 파일
- ✅ `/home/user/webapp/employee-login.html` (2개 수정)
- ✅ `/home/user/webapp/js/employee.js` (2개 수정)

### 영향받는 사용자
- **직원(staff)**: 영향 없음 (정상 사용 가능)
- **super_admin, admin, store_manager, manager**: **차단됨** (관리자 페이지 사용 필요)

### 데이터베이스 변경
- ❌ 없음 (코드 레벨 수정만)

---

## 🔐 보안 강화 효과

### Before (취약점 존재)
```
staff 로그인 → sessionStorage 저장 → 뒤로가기 
→ super_admin 로그인 (차단 안 됨) → employee.html 
→ ❌ 이전 staff의 sessionStorage uid 읽음 
→ ❌ staff의 개인정보 조회 가능
```

### After (보안 강화)
```
staff 로그인 → sessionStorage 저장 → 뒤로가기 
→ super_admin 로그인 
→ ✅ 1단계: employee-login.html에서 role 체크 → 차단
→ (만약 우회 시) ✅ 2단계: Firebase Auth uid 검증 → 차단
→ (만약 우회 시) ✅ 3단계: Firestore role 재검증 → 차단
```

---

## 🚀 배포 정보

### 로컬 테스트 URL
```
https://3000-iqaenljjzk6jv0c4l69ca-5185f4aa.sandbox.novita.ai
```

### 테스트 방법

#### 1. super_admin 차단 테스트
```
1. URL/employee-login.html 접속
2. uhi1308@naver.com / 비밀번호 입력
3. "관리자/매니저 계정은 관리자 로그인 페이지를 이용해주세요" 확인
```

#### 2. staff 정상 로그인 테스트
```
1. URL/employee-login.html 접속
2. staff 계정으로 로그인
3. employee.html에서 본인 데이터만 조회되는지 확인
4. Console에서 uid 일치 확인:
   - sessionStorage.getItem('employee_uid')
   - firebase.auth().currentUser.uid
```

#### 3. sessionStorage 오염 방지 테스트
```
1. staff1 계정 로그인 → employee.html
2. 뒤로가기 → employee-login.html
3. staff2 계정 로그인
4. Console에서 uid 확인:
   - ✅ staff2의 uid만 보여야 함
   - ❌ staff1의 uid가 보이면 안 됨
```

---

## 📝 다음 단계

### Phase 2 통합 테스트 실행
- ✅ `PHASE2_TEST_CHECKLIST.md` 참고
- ✅ 11개 테스트 시나리오 실행 필요

### Firebase Console Rules 배포
- ✅ `DEPLOY_RULES_GUIDE.md` 참고
- ✅ Firestore Rules v3.2 최종 배포

### 프로덕션 배포
```bash
# Firebase Hosting 배포
cd /home/user/webapp
firebase login
firebase deploy --only hosting

# Firestore Rules 배포 (Firebase Console 권장)
# 또는: firebase deploy --only firestore:rules
```

---

## 👨‍💼 사장님 피드백

**발견 시간**: 2025-01-19 (시크릿모드 테스트)  
**발견 내용**: super_admin으로 로그인했는데 김룰루 데이터 조회됨  
**질문**: "이런식으로 되도 되는건가??"

**답변**: ❌ **절대 안 됩니다.** 명백한 보안 버그였습니다. 3단계 방어 체계로 완전히 차단했습니다.

---

**작성자**: Claude (AI Assistant)  
**검토 필요**: 사장님 확인 필요 ✅  
**긴급도**: 🔴 HIGH - 즉시 프로덕션 배포 권장
