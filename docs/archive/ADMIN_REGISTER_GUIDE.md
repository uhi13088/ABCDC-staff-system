# 🏢 관리자 회원가입 가이드

**업데이트**: 2025-01-16  
**버전**: v3.1.4

---

## ✨ 핵심 변경사항

### ❌ 이전 방식 (잘못됨)
- 관리자도 초대코드로 가입
- 회사를 먼저 수동으로 생성해야 함

### ✅ 새로운 방식 (정답!)
- **관리자는 초대코드 없이 바로 가입**
- **가입하면서 회사 자동 생성**
- **직원/매니저만 초대코드 필요**

---

## 🎯 회원가입 플로우

### 1. 관리자 회원가입 (초대코드 불필요)

**URL**: `https://abcdc-staff-system.web.app/admin-register.html`

**입력 정보**:

#### 👤 개인정보 (필수)
- 이름
- 이메일 (로그인 ID)
- 비밀번호 (6자 이상)
- 전화번호

#### 🏢 회사정보
- **회사명** (필수)
- 사업자등록번호 (선택 - 나중에 입력 가능)
- 회사 전화번호 (선택 - 나중에 입력 가능)

**자동 생성되는 것들**:
- `companyId`: 회사명 기반 자동 생성 (예: `ABC2025-XY12`)
- `companies` 컬렉션: 회사 문서 자동 생성
- `users` 컬렉션: 관리자 계정 (role: admin)
- `employees` 컬렉션: 관리자 직원 정보

### 2. 직원/매니저 회원가입 (초대코드 필수)

**URL**: `https://abcdc-staff-system.web.app/employee-register.html?code=ABC2025-STAFF-XXXXX`

**입력 정보**:
- 초대코드 (URL 파라미터로 자동 입력)
- 이름
- 이메일
- 비밀번호
- 전화번호

**자동 할당**:
- `companyId`: 초대코드에서 가져옴
- `storeId`: 초대코드에서 가져옴
- `role`: 초대코드에서 가져옴 (staff/manager/store_manager)

---

## 📊 데이터 구조

### 관리자 회원가입 시 생성되는 데이터

#### 1. companies/[companyId]
```javascript
{
  companyId: "ABC2025-XY12",       // 자동 생성
  companyName: "ABC 디저트 센터",
  businessNumber: "",               // 선택사항
  phone: "",                        // 선택사항
  email: "admin@company.com",
  address: "",                      // 나중에 입력
  status: "active",
  createdAt: Timestamp,
  createdBy: "admin_uid"
}
```

#### 2. users/[uid]
```javascript
{
  uid: "admin_uid",
  email: "admin@company.com",
  displayName: "홍길동",
  phone: "010-1234-5678",
  role: "admin",                    // 관리자
  companyId: "ABC2025-XY12",
  storeId: null,                    // 관리자는 특정 지점 없음
  status: "active",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 3. employees/[uid]
```javascript
{
  uid: "admin_uid",
  email: "admin@company.com",
  displayName: "홍길동",
  phone: "010-1234-5678",
  role: "admin",
  companyId: "ABC2025-XY12",
  storeId: null,
  status: "active",
  position: "대표",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 🔐 Firestore Rules 변경사항 (v3.1.4)

### Before (v3.1.3)
```javascript
// companies: 회사 정보
match /companies/{companyId} {
  allow write: if isSignedIn() && (
    isSuperAdmin() ||
    (currentUserExists() && currentCompanyId() == companyId && currentRole() == "admin")
  );
}
// ❌ 문제: currentUserExists() 때문에 관리자 회원가입 시 회사 생성 불가
```

### After (v3.1.4)
```javascript
// companies: 회사 정보
match /companies/{companyId} {
  // ⭐ 회사 생성 - 관리자 회원가입 시 users 문서 없이 생성 가능
  allow create: if isSignedIn() && (
    isSuperAdmin() ||
    request.resource.data.createdBy == request.auth.uid  // 본인이 생성하는 회사
  );
  
  // 회사 수정/삭제 - 해당 회사의 admin만 가능
  allow update, delete: if isSignedIn() && (
    isSuperAdmin() ||
    (currentUserExists() && currentCompanyId() == companyId && currentRole() == "admin")
  );
}
// ✅ 해결: 회원가입 시 createdBy == request.auth.uid 조건으로 생성 가능
```

---

## 🧪 테스트 절차

### 1단계: 관리자 회원가입

1. **URL 접속**:
   ```
   https://abcdc-staff-system.web.app/admin-register.html
   ```

2. **정보 입력**:
   - 이름: `홍길동`
   - 이메일: `admin@testcompany.com`
   - 비밀번호: `Test1234!`
   - 전화번호: `010-1234-5678`
   - 회사명: `테스트 회사`

3. **회원가입 클릭**

4. **자동 생성 확인** (Firebase Console):
   ```
   ✅ companies/TEST2025-XXXX - 회사 문서 생성됨
   ✅ users/[uid] - role: admin, companyId 할당됨
   ✅ employees/[uid] - role: admin
   ```

### 2단계: 로그인 테스트

1. **로그인 페이지 접속**:
   ```
   https://abcdc-staff-system.web.app/admin-login.html
   ```

2. **로그인**:
   - 이메일: `admin@testcompany.com`
   - 비밀번호: `Test1234!`

3. **대시보드 접속 확인**

### 3단계: 스토어 생성

1. **관리자 대시보드 → 매장 관리 탭**

2. **스토어 생성**:
   - 스토어명: `본점`
   - 주소, 전화번호 등 입력

3. **Firestore 확인**:
   ```
   ✅ stores/store001 - companyId 포함하여 생성됨
   ```

### 4단계: 초대코드 생성

1. **관리자 대시보드 → 초대코드 관리** (향후 구현)

2. **직원 초대코드 생성**:
   - 회사: 자동 선택됨
   - 지점: `본점` 선택
   - 역할: `staff` 선택
   - 생성 클릭

3. **초대코드 URL 복사**:
   ```
   https://abcdc-staff-system.web.app/employee-register.html?code=TEST2025-STAFF-XXXXX
   ```

### 5단계: 직원 회원가입 테스트

1. **초대코드 URL 접속**

2. **직원 정보 입력**:
   - 초대코드: 자동 입력됨
   - 이름, 이메일, 비밀번호 입력

3. **회원가입 후 Firestore 확인**:
   ```
   ✅ users/[staff_uid] - role: staff, companyId, storeId 자동 할당됨
   ✅ employees/[staff_uid] - 동일
   ✅ company_invites/[doc] - currentUses 증가
   ```

---

## ✅ 체크리스트

### Firestore Rules 배포
- [ ] Firebase Console → Firestore → Rules 탭
- [ ] `firestore.rules` v3.1.4 내용 복사 및 붙여넣기
- [ ] "게시" 버튼 클릭

### 관리자 회원가입 테스트
- [ ] admin-register.html 접속
- [ ] 개인정보 + 회사명 입력
- [ ] 회원가입 성공
- [ ] Firebase Console에서 companies 문서 생성 확인
- [ ] Firebase Console에서 users 문서 (role: admin) 확인

### 로그인 테스트
- [ ] admin-login.html 접속
- [ ] 로그인 성공
- [ ] 대시보드 접속 성공

### 권한 테스트
- [ ] 본인 정보 읽기 → 성공
- [ ] 본인 이름 수정 → 성공
- [ ] 본인 role 수정 시도 → **PERMISSION_DENIED** (정상)
- [ ] 본인 companyId 수정 시도 → **PERMISSION_DENIED** (정상)

### 스토어 생성 테스트
- [ ] 관리자 대시보드 → 매장 관리
- [ ] 새 스토어 생성
- [ ] Firestore에서 stores 문서 (companyId 포함) 확인

---

## 🚨 알려진 제한사항

### 1. 초대코드 관리 UI 미구현
- **현재**: Firebase Console에서 수동으로 `company_invites` 문서 생성
- **향후**: 관리자 대시보드에서 초대코드 생성 UI 구현 예정

### 2. 사업자 정보 추가 입력
- **현재**: 회원가입 시 사업자등록번호, 주소는 선택사항
- **방법**: 관리자 대시보드 → 회사 설정에서 나중에 입력 가능

### 3. 관리자 초대코드 불필요
- **중요**: 관리자는 절대 초대코드를 사용하지 않음
- **관리자 가입**: `admin-register.html` (초대코드 없음)
- **직원 가입**: `employee-register.html` (초대코드 필수)

---

## 📞 문의

**문서 버전**: v3.1.4  
**업데이트**: 2025-01-16

**관련 파일**:
- 관리자 가입: `/admin-register.html`
- 직원 가입: `/employee-register.html`
- Firestore Rules: `/firestore.rules` (v3.1.4)

**GitHub**: https://github.com/uhi13088/ABCDC-staff-system

---

**🎉 관리자 회원가입 시스템 구현 완료!**

이제 관리자는 초대코드 없이 바로 회원가입하고 회사를 생성할 수 있습니다.
