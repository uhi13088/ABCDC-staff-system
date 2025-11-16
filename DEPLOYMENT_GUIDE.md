# 🚀 ABCDC Staff System - 배포 가이드

**버전**: v3.1.3 (멀티테넌트 전환 완료)  
**날짜**: 2025-01-16  
**대상**: 개발/프로덕션 환경

---

## 📋 배포 전 체크리스트

### ✅ 완료된 작업
- [x] Firestore Rules v3.1.3 작성 (순환참조 제거)
- [x] 기존 Firestore 데이터 101개 문서 삭제
- [x] 민감 필드 보호 규칙 적용
- [x] Helper 함수 최적화 (get() 호출 감소)
- [x] Cloud Functions 초대코드 시스템 구현
- [x] 프론트엔드 회원가입 플로우 업데이트

### ⏳ 남은 작업
- [ ] Firestore Rules Firebase Console 배포
- [ ] 초기 데이터 수동 생성 (회사, 지점, 초대코드)
- [ ] 테스트 계정으로 회원가입 테스트
- [ ] 관리자 페이지 권한 테스트
- [ ] 프로덕션 배포 (선택사항)

---

## 1️⃣ Firestore Security Rules 배포

### 방법 1: Firebase Console (권장)

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - 프로젝트 선택: `matnamsalon-system`

2. **Firestore Rules 페이지 이동**
   ```
   Firestore Database → Rules 탭
   ```

3. **새 규칙 복사 및 붙여넣기**
   - 파일 위치: `/home/user/webapp/firestore.rules`
   - 전체 내용 복사 (404줄)
   - Rules 편집기에 붙여넣기

4. **게시 전 시뮬레이터 테스트 (선택)**
   ```
   Rules Playground 사용:
   
   예시 1: 본인 users 문서 읽기
   - Location: /databases/(default)/documents/users/test_uid_123
   - Type: get
   - Authenticated: Yes
   - Provider: Firebase
   - UID: test_uid_123
   
   예시 2: 타인 users 문서 읽기 (같은 회사 admin)
   - Location: /databases/(default)/documents/users/other_uid_456
   - Type: get
   - Authenticated: Yes
   - UID: admin_uid_789
   - Custom Claims: (없음 - users 컬렉션에서 자동 조회)
   ```

5. **게시 (Publish)**
   - "게시" 버튼 클릭
   - 배포 시간: 즉시 반영

### 방법 2: Firebase CLI (자동화)

```bash
cd /home/user/webapp

# Firebase 로그인 (1회만)
firebase login

# 프로젝트 선택 확인
firebase use matnamsalon-system

# Rules 배포
firebase deploy --only firestore:rules

# 배포 확인
firebase firestore:rules list
```

---

## 2️⃣ 초기 데이터 생성

### A. 회사 (companies) 생성

**방법 1: Firebase Console 수동 생성**
```
Firestore Database → companies 컬렉션 → 문서 추가

문서 ID: ABC2025 (자동 생성 또는 수동 입력)

필드:
- companyId (string): "ABC2025"
- companyName (string): "ABC Dessert Center"
- businessNumber (string): "123-45-67890"
- address (string): "부천시 원미구..."
- phone (string): "032-xxx-xxxx"
- email (string): "contact@abcdc.com"
- status (string): "active"
- createdAt (timestamp): [현재 시간]
- createdBy (string): "system"
```

**방법 2: Admin SDK 스크립트**
```javascript
// create-initial-data.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createCompany() {
  await db.collection('companies').doc('ABC2025').set({
    companyId: 'ABC2025',
    companyName: 'ABC Dessert Center',
    businessNumber: '123-45-67890',
    address: '부천시 원미구...',
    phone: '032-xxx-xxxx',
    email: 'contact@abcdc.com',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system'
  });
  
  console.log('✅ 회사 생성 완료');
}

createCompany()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });
```

### B. 지점 (stores) 생성

**Firestore Console 수동 생성**
```
stores 컬렉션 → 문서 추가

문서 ID: store001 (자동 또는 수동)

필드:
- storeId (string): "store001"
- companyId (string): "ABC2025"  // ⭐ 필수
- storeName (string): "맛남살롱 부천시청점"
- address (string): "부천시 원미구 ..."
- phone (string): "032-xxx-1111"
- status (string): "active"
- createdAt (timestamp): [현재 시간]
- createdBy (string): "system"
```

**추가 지점**:
- store002: "맛남살롱 상동점"
- store003: "맛남살롱 부천역사점"

### C. 초대코드 (company_invites) 생성

**Firestore Console 수동 생성**
```
company_invites 컬렉션 → 문서 추가

문서 ID: [자동 생성]

필드:
- code (string): "ABC2025-ADMIN-12345"
- companyId (string): "ABC2025"
- storeId (string): "store001"
- role (string): "admin"
- maxUses (number): 1
- currentUses (number): 0
- expiresAt (timestamp): [7일 후]
- createdAt (timestamp): [현재 시간]
- createdBy (string): "system"
- isActive (boolean): true
```

**역할별 초대코드 생성 권장**:
1. Admin 초대코드 1개 (가장 먼저)
2. Manager 초대코드 1-2개
3. Staff 초대코드 여러 개

---

## 3️⃣ 테스트 계정 생성 및 검증

### A. Admin 계정 생성

1. **회원가입 페이지 접속**
   ```
   https://your-domain.com/employee-register.html?code=ABC2025-ADMIN-12345
   ```

2. **정보 입력**
   - 초대코드: ABC2025-ADMIN-12345 (자동 입력됨)
   - 이메일: admin@abcdc.com
   - 비밀번호: [안전한 비밀번호]
   - 이름: 홍길동
   - 전화번호: 010-1234-5678

3. **회원가입 완료 확인**
   - Firestore `users` 컬렉션에 문서 생성됨
   - Firestore `employees` 컬렉션에 문서 생성됨
   - `company_invites` 컬렉션의 `currentUses` 증가

4. **Firestore 데이터 확인**
   ```
   users/[new_uid]:
   - companyId: "ABC2025"
   - storeId: "store001"
   - role: "admin"
   - status: "active"
   - email: "admin@abcdc.com"
   - displayName: "홍길동"
   ```

### B. 권한 테스트

**로그인 후 테스트할 항목**:

1. **본인 정보 수정**
   - [ ] 이름 수정 → 성공
   - [ ] 전화번호 수정 → 성공
   - [ ] `role` 수정 시도 → 실패 (PERMISSION_DENIED)
   - [ ] `companyId` 수정 시도 → 실패 (PERMISSION_DENIED)

2. **Admin 권한 테스트**
   - [ ] 다른 직원 정보 읽기 → 성공
   - [ ] 다른 직원 `role` 수정 → 성공
   - [ ] 출퇴근 기록 읽기 → 성공
   - [ ] 근무 스케줄 생성 → 성공

3. **멀티테넌트 격리 테스트**
   - 타 회사 데이터 생성 (수동):
     ```
     companies/XYZ2025:
     - companyId: "XYZ2025"
     - companyName: "다른 회사"
     
     users/test_other_user:
     - companyId: "XYZ2025"
     - role: "staff"
     ```
   - [ ] ABC2025 Admin이 XYZ2025 데이터 읽기 시도 → 실패
   - [ ] ABC2025 Admin이 XYZ2025 데이터 수정 시도 → 실패

### C. 추가 직원 계정 생성

1. **Manager 계정**
   - 초대코드: ABC2025-MANAGER-XXXXX
   - role: "manager"
   - 권한 테스트:
     - [ ] 회사 전체 데이터 읽기 → 성공
     - [ ] 직원 정보 수정 시도 → 실패 (admin만 가능)

2. **Staff 계정**
   - 초대코드: ABC2025-STAFF-XXXXX
   - role: "staff"
   - 권한 테스트:
     - [ ] 본인 데이터만 읽기 → 성공
     - [ ] 타 직원 데이터 읽기 시도 → 실패

---

## 4️⃣ Cloud Functions 배포 (선택)

**이미 배포된 경우 생략 가능**

```bash
cd /home/user/webapp

# Firebase 로그인
firebase login

# Functions 배포
firebase deploy --only functions

# 배포된 함수 확인
firebase functions:list

# 예상 함수 목록:
# - verifyInviteCode
# - recordInviteUse
# - createInviteCode (향후)
```

---

## 5️⃣ 프로덕션 배포 (선택)

### A. 환경 변수 설정

```bash
# Firebase 프로젝트 환경 변수 (Functions)
firebase functions:config:set \
  app.environment="production" \
  app.domain="https://your-production-domain.com"

# 배포
firebase deploy --only functions
```

### B. Hosting 배포 (정적 파일)

```bash
# firebase.json 확인
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}

# Hosting 배포
firebase deploy --only hosting
```

### C. 프로덕션 도메인 설정

1. Firebase Console → Hosting → 도메인 추가
2. DNS 설정 (A 레코드 또는 CNAME)
3. SSL 자동 발급 확인

---

## 6️⃣ 배포 후 모니터링

### A. Firebase Console

1. **Authentication 사용자 수 확인**
   - Authentication → Users 탭
   - 신규 가입자 모니터링

2. **Firestore 데이터 증가 확인**
   - Firestore Database → 각 컬렉션
   - companyId 필드 존재 여부 확인

3. **Cloud Functions 로그 확인**
   - Functions → 로그 탭
   - 오류 발생 여부 체크

### B. 에러 모니터링

**자주 발생하는 에러**:

1. **PERMISSION_DENIED**
   - 원인: companyId 누락 또는 잘못된 역할
   - 해결: Firestore 문서에 companyId 추가

2. **Invite code not found**
   - 원인: 존재하지 않거나 만료된 초대코드
   - 해결: 새 초대코드 생성

3. **Email already in use**
   - 원인: 중복 이메일 가입 시도
   - 해결: 사용자에게 로그인 안내

---

## 7️⃣ 롤백 절차 (문제 발생 시)

### Firestore Rules 롤백

```bash
# 이전 버전으로 복구
firebase firestore:rules releases:list
firebase firestore:rules releases:get [release_id]

# 또는 Firebase Console에서 수동 롤백
Firestore Database → Rules → 버전 기록 → 이전 버전 선택
```

### Cloud Functions 롤백

```bash
# 이전 배포 버전 확인
firebase functions:log

# 수동 재배포
git checkout [previous_commit]
firebase deploy --only functions
```

---

## 8️⃣ 자주 묻는 질문 (FAQ)

### Q1: 기존 데이터를 복구하고 싶어요
**A**: 백업이 없다면 복구 불가능. 개발 환경이므로 새로 데이터 생성 권장.

### Q2: super_admin 권한은 어떻게 부여하나요?
**A**: Firebase CLI로 Custom Claims 설정:
```bash
firebase auth:set-custom-user-claims [uid] '{"super_admin": true}'
```

### Q3: 초대코드를 대량으로 생성하고 싶어요
**A**: Admin SDK 스크립트 작성 또는 향후 관리자 UI에서 생성 기능 추가 예정.

### Q4: 순환참조 에러가 계속 발생해요
**A**: v3.1.3 규칙이 제대로 배포되었는지 확인. Firebase Console Rules 탭에서 현재 버전 확인.

### Q5: 회사/지점을 나중에 추가할 수 있나요?
**A**: 가능. Admin 권한으로 Firestore에서 직접 추가하거나 관리자 UI 구현 필요.

---

## 9️⃣ 다음 단계 (향후 개발)

1. **초대코드 관리 UI**
   - Admin 대시보드에서 초대코드 생성/삭제
   - 사용 내역 추적

2. **회사/지점 관리 페이지**
   - 회사 정보 수정
   - 지점 추가/삭제

3. **역할 전환 기능**
   - 한 사용자가 여러 회사/지점에 속할 수 있도록
   - Tenant context 전환 UI

4. **감사 로깅**
   - 민감한 작업 추적 (role 변경, 데이터 삭제 등)
   - Cloud Functions로 로그 수집

5. **대시보드 권한 개선**
   - 역할별 메뉴 표시/숨김
   - 권한 없는 페이지 접근 차단

---

## 📞 지원 및 문의

**프로젝트**: ABCDC Staff System  
**버전**: v3.1.3  
**문서 작성일**: 2025-01-16  
**마지막 업데이트**: 2025-01-16

---

**✅ 배포 완료 후 이 문서를 저장하고, 테스트 결과를 기록하세요!**
