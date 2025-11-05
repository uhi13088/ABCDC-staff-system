# 🔒 Firestore 보안 규칙 적용 가이드

## 📋 목차
1. [현재 상황](#현재-상황)
2. [보안 규칙 적용 3단계](#보안-규칙-적용-3단계)
3. [Firebase Console 작업](#firebase-console-작업)
4. [기존 사용자 데이터 수정](#기존-사용자-데이터-수정)
5. [테스트 방법](#테스트-방법)
6. [문제 해결](#문제-해결)

---

## 🚨 현재 상황

### 현재 Firestore 규칙 (위험!)
```javascript
match /{document=**} {
  allow read, write: if true;
}
```
**문제점:**
- ✅ 누구나 모든 데이터 읽기 가능
- ✅ 누구나 모든 데이터 쓰기 가능
- ✅ 로그인하지 않아도 접근 가능
- ❌ **매우 위험!**

---

## 🔐 보안 규칙 적용 3단계

### 1단계: Firebase Console에서 보안 규칙 적용

#### 1-1. Firebase Console 접속
```
1. https://console.firebase.google.com/ 접속
2. "abcdc-staff-system" 프로젝트 선택
3. 왼쪽 메뉴 "Firestore Database" 클릭
4. 상단 "규칙" 탭 클릭
```

#### 1-2. 보안 규칙 복사 붙여넣기
```
1. 프로젝트 폴더의 "firestore.rules" 파일 열기
2. 전체 내용 복사 (Ctrl+A → Ctrl+C)
3. Firebase Console 규칙 편집기에 붙여넣기
4. 오른쪽 상단 "게시" 버튼 클릭
5. "게시하시겠습니까?" 확인 → "게시" 클릭
```

#### 1-3. 적용 확인
- ✅ "규칙이 게시되었습니다" 메시지 확인
- ✅ 규칙 상단에 "게시 날짜" 표시 확인

---

### 2단계: Firebase Console에서 기존 사용자 role 필드 추가

#### ⚠️ 중요: 현재 등록된 모든 사용자에게 role 필드가 없습니다!

#### 2-1. 관리자 계정에 role 추가

```
1. Firestore Database → "users" 컬렉션 클릭
2. 사장님 계정 문서 찾기 (이메일로 확인)
3. 문서 클릭 → "필드 추가" 버튼
4. 필드명: role
5. 유형: string
6. 값: admin
7. "추가" 버튼 클릭
```

**적용 후 사장님 계정 구조:**
```javascript
{
  uid: "...",
  email: "사장님이메일@...",
  name: "사장님",
  userType: "...",
  role: "admin",  // ← 새로 추가!
  // ... 기타 필드
}
```

#### 2-2. 직원 계정에 role 추가

**방법 A: Firebase Console에서 수동 추가**
```
1. Firestore Database → "users" 컬렉션
2. userType이 'employee'인 각 문서 클릭
3. "필드 추가"
4. 필드명: role
5. 유형: string
6. 값: employee
7. "추가" 클릭
```

**방법 B: 직원들이 재가입** (추천!)
```
1. 기존 직원 계정 삭제 (Authentication → 사용자 → 삭제)
2. 직원들이 employee-register.html에서 재가입
3. 새 코드에는 role 필드가 자동으로 포함됨
```

---

### 3단계: 테스트 및 검증

#### 3-1. 관리자 로그인 테스트
```
1. admin-login.html 접속
2. 사장님 계정으로 로그인
3. ✅ 정상 로그인 → 대시보드 이동 확인
4. ❌ 로그인 실패 → 2단계 role 필드 확인
```

#### 3-2. 직원 로그인 테스트
```
1. employee-login.html 접속
2. 직원 계정으로 로그인
3. ✅ 정상 로그인 → 직원 페이지 이동 확인
4. ❌ "관리자 권한이 없습니다" → 정상 (직원이 관리자 페이지 차단됨)
```

#### 3-3. 데이터 접근 테스트
```
관리자 계정:
  ✅ 모든 직원 목록 조회 가능
  ✅ 모든 출퇴근 기록 조회 가능
  ✅ 모든 급여 정보 조회 가능
  ✅ 승인 요청 처리 가능

직원 계정:
  ✅ 본인 정보 조회/수정 가능
  ✅ 본인 출퇴근 기록 가능
  ✅ 본인 급여 정보 조회 가능
  ❌ 다른 직원 정보 조회 불가
  ❌ 다른 직원 급여 정보 조회 불가
```

---

## 🔧 Firebase Console 작업

### 작업 1: Firestore 보안 규칙 게시

**경로:**
```
Firebase Console 
→ Firestore Database 
→ 규칙 탭 
→ 규칙 편집기
```

**복사할 파일:**
```
프로젝트 폴더/firestore.rules
```

**게시 후 확인사항:**
- 게시 날짜: 오늘 날짜 표시
- 규칙 내용: `allow read, write: if true` 없어야 함
- 오류 메시지: 없어야 함

---

### 작업 2: 사장님 계정 role 추가

**절차:**
```
1. Firestore Database 클릭
2. "users" 컬렉션 클릭
3. 사장님 이메일로 문서 찾기
4. 문서 클릭
5. "필드 추가" 버튼
6. 입력:
   - 필드: role
   - 유형: string
   - 값: admin
7. "추가" 클릭
```

**확인:**
```javascript
{
  ...
  role: "admin",  // ← 이 줄이 있어야 함
  ...
}
```

---

### 작업 3: 기존 직원 role 필드 추가

**옵션 A: 수동 추가 (직원이 적을 때)**
```
각 직원 문서마다:
1. 문서 클릭
2. "필드 추가"
3. role: employee
4. 저장
```

**옵션 B: 재가입 (직원이 많을 때 - 추천)**
```
1. Authentication → 사용자 → 기존 직원 계정 삭제
2. 직원들에게 재가입 요청
3. 새 코드는 자동으로 role 필드 포함
```

---

## 📊 기존 사용자 데이터 수정

### 사장님 계정 확인

**현재 상태 확인:**
```
Firebase Console
→ Firestore Database
→ users 컬렉션
→ 사장님 문서 클릭
```

**확인할 필드:**
```javascript
{
  uid: "...",
  email: "사장님이메일",
  name: "사장님",
  userType: "admin" 또는 undefined,
  role: "admin",  // ← 이 필드가 있어야 함!
}
```

**role 필드가 없으면:**
```
1. "필드 추가" 클릭
2. 필드명: role
3. 값: admin
4. 저장
```

---

### 직원 계정 확인

**확인 방법:**
```
1. users 컬렉션
2. userType === 'employee' 필터
3. 각 직원 문서 확인
```

**필요한 필드:**
```javascript
{
  uid: "...",
  email: "직원이메일",
  name: "직원이름",
  userType: "employee",
  role: "employee",  // ← 이 필드가 있어야 함!
  status: "active"
}
```

---

## 🧪 테스트 방법

### 1. 로그인 테스트

**관리자 로그인:**
```
1. admin-login.html 접속
2. 사장님 계정 로그인
3. 예상 결과: admin-dashboard.html로 이동
4. 실패 시: role 필드 확인
```

**직원 로그인:**
```
1. employee-login.html 접속
2. 직원 계정 로그인
3. 예상 결과: employee.html로 이동
4. 실패 시: role 필드 확인
```

**권한 테스트:**
```
1. 직원 계정으로 admin-login.html 접속 시도
2. 예상 결과: "관리자 권한이 없습니다" 메시지
3. 실패 시: 보안 규칙 재확인
```

---

### 2. 데이터 접근 테스트

**관리자 권한 테스트:**
```
1. 관리자로 로그인
2. 직원관리 탭 → 모든 직원 목록 표시
3. 근태관리 탭 → 모든 출퇴근 기록 표시
4. 급여관리 탭 → 모든 급여 정보 표시
```

**직원 권한 테스트:**
```
1. 직원으로 로그인
2. 본인 정보 조회 가능 확인
3. 본인 출퇴근 기록 가능 확인
4. 다른 직원 정보 조회 불가 확인
```

---

### 3. 보안 규칙 검증

**검증 방법:**
```
Firebase Console
→ Firestore Database
→ 규칙 탭
→ "규칙 플레이그라운드" 버튼
```

**테스트 시나리오:**
```javascript
// 시나리오 1: 로그인하지 않은 사용자
위치: /users/some-user-id
인증: Unauthenticated
작업: get
예상: 거부됨 ❌

// 시나리오 2: 직원이 본인 정보 읽기
위치: /users/employee-uid
인증: Custom (uid: employee-uid)
작업: get
예상: 허용됨 ✅

// 시나리오 3: 직원이 다른 직원 정보 읽기
위치: /users/other-employee-uid
인증: Custom (uid: employee-uid)
작업: get
예상: 거부됨 ❌

// 시나리오 4: 관리자가 모든 직원 정보 읽기
위치: /users/any-user-id
인증: Custom (uid: admin-uid, role: admin)
작업: get
예상: 허용됨 ✅
```

---

## ⚠️ 문제 해결

### 문제 1: "권한이 없습니다" 오류

**증상:**
```
로그인 후 데이터 로드 시 오류 발생
콘솔에 "FirebaseError: Missing or insufficient permissions" 표시
```

**원인:**
- role 필드가 없음
- role 값이 잘못됨 (admin이어야 하는데 employee 등)

**해결:**
```
1. Firebase Console → Firestore Database
2. users 컬렉션 → 해당 사용자 문서
3. role 필드 확인
4. 없으면 추가, 잘못되었으면 수정
```

---

### 문제 2: 관리자 로그인 실패

**증상:**
```
"관리자 권한이 없습니다" 메시지
admin-dashboard.html로 이동하지 않음
```

**확인사항:**
```javascript
// Firestore users 컬렉션에서 확인
{
  uid: "사장님uid",
  email: "사장님이메일",
  role: "admin"  // ← 이 값이 정확히 "admin"이어야 함
}
```

**해결:**
```
1. Firebase Console → Firestore Database
2. users 컬렉션 → 사장님 문서
3. role 필드 값 확인
4. "admin" 또는 "manager"로 수정
```

---

### 문제 3: 직원이 데이터 조회 불가

**증상:**
```
직원 로그인 후 본인 정보도 조회 불가
"권한이 없습니다" 오류
```

**원인:**
- role 필드가 없음
- userType과 role이 불일치

**해결:**
```
1. 해당 직원 문서에 role: "employee" 추가
2. 또는 직원 재가입 (새 코드는 자동 포함)
```

---

### 문제 4: 보안 규칙 게시 실패

**증상:**
```
"규칙을 게시할 수 없습니다" 오류
문법 오류 표시
```

**해결:**
```
1. firestore.rules 파일 내용 전체 복사
2. Firebase Console 규칙 편집기 내용 전체 삭제
3. 복사한 내용 붙여넣기
4. "게시" 버튼 클릭
5. 오류 메시지 확인
```

---

## 📝 체크리스트

### Firebase Console 작업 완료 확인

- [ ] 1. Firestore 보안 규칙 게시 완료
- [ ] 2. 게시 날짜가 오늘 날짜로 표시됨
- [ ] 3. 규칙에 `if true` 없음
- [ ] 4. 사장님 계정에 `role: "admin"` 필드 추가
- [ ] 5. 모든 직원 계정에 `role: "employee"` 필드 추가 (또는 재가입)

### 테스트 완료 확인

- [ ] 6. 관리자 로그인 성공
- [ ] 7. 관리자 대시보드 정상 표시
- [ ] 8. 직원 로그인 성공
- [ ] 9. 직원이 본인 정보 조회 가능
- [ ] 10. 직원이 다른 직원 정보 조회 불가 (정상)
- [ ] 11. 로그인하지 않은 사용자 데이터 접근 불가 (정상)

---

## 🎯 적용 완료 후 기대 효과

### 보안 강화
- ✅ 비로그인 사용자 완전 차단
- ✅ 직원은 본인 데이터만 접근
- ✅ 관리자만 모든 데이터 접근
- ✅ 권한별 세밀한 접근 제어

### 데이터 보호
- ✅ 급여 정보: 본인 또는 관리자만
- ✅ 출퇴근 기록: 본인 작성 + 관리자 관리
- ✅ 승인 요청: 직원 생성 + 관리자 처리
- ✅ 개인정보: 본인 또는 관리자만

---

## 📞 문제 발생 시

**보안 규칙 원복 방법:**
```javascript
// 임시로 이전 규칙으로 돌아가려면:
match /{document=**} {
  allow read, write: if request.auth != null;
}
// 최소한 로그인 인증은 필요!
```

**완전 원복 (비추천!):**
```javascript
// 모든 제약 제거 (개발 중에만!)
match /{document=**} {
  allow read, write: if true;
}
```

---

사장님, 이 가이드를 따라서 차근차근 진행하시면 됩니다! 
막히는 부분이 있으면 말씀해주세요! 🙏
