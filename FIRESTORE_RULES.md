# Firestore Security Rules

**프로젝트:** 맛남살롱 근무관리 시스템  
**작성일:** 2025-11-16  
**버전:** 2.0

---

## 📋 목차

1. [개요](#개요)
2. [Helper 함수](#helper-함수)
3. [컬렉션별 규칙](#컬렉션별-규칙)
4. [보안 원칙](#보안-원칙)
5. [규칙 배포](#규칙-배포)

---

## 개요

이 문서는 Firestore Security Rules의 전체 구조와 각 컬렉션별 접근 권한을 설명합니다.

### 기본 원칙

- **인증 필수**: 모든 컬렉션은 기본적으로 인증된 사용자만 접근 가능
- **역할 기반 접근**: `admin`, `manager`, `employee` 역할에 따라 권한 부여
- **본인 데이터 우선**: 본인의 데이터는 읽기/쓰기 가능

---

## Helper 함수

### `isAdmin()`
```javascript
function isAdmin() {
  return request.auth != null && (
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'admin'
  );
}
```
- **설명**: 사용자가 관리자인지 확인
- **체크 필드**: `role` 또는 `userType`이 `'admin'`

### `isManager()`
```javascript
function isManager() {
  return request.auth != null && (
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager' ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == 'manager'
  );
}
```
- **설명**: 사용자가 매니저인지 확인
- **체크 필드**: `role` 또는 `userType`이 `'manager'`

### `isAdminOrManager()`
```javascript
function isAdminOrManager() {
  return isAdmin() || isManager();
}
```
- **설명**: 관리자 또는 매니저 여부 확인

### `isOwner(uid)`
```javascript
function isOwner(uid) {
  return request.auth != null && request.auth.uid == uid;
}
```
- **설명**: 본인 데이터 여부 확인
- **매개변수**: `uid` - 확인할 사용자 ID

---

## 컬렉션별 규칙

### 1. **users** (사용자 정보)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **create** | 누구나 (회원가입 허용) |
| **update** | 본인 또는 관리자 |
| **delete** | 관리자만 |

```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow create: if true; // 회원가입 허용
  allow update: if isOwner(userId) || isAdmin();
  allow delete: if isAdmin();
}
```

**특징:**
- 회원가입 시 누구나 문서 생성 가능 (`create: if true`)
- 직원은 자신의 정보만 수정 가능
- 삭제는 관리자만 가능

---

### 2. **employees** (직원 목록)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **create** | 본인 (회원가입) |
| **update** | 관리자만 |
| **delete** | 관리자만 |

```javascript
match /employees/{employeeId} {
  allow read: if request.auth != null;
  allow create: if isOwner(employeeId);
  allow update, delete: if isAdmin();
}
```

**특징:**
- 회원가입 시 본인 정보 생성 가능
- 수정/삭제는 관리자만 가능

---

### 3. **attendance** (출퇴근 기록)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **create** | 본인 기록만 생성 |
| **update** | 본인 또는 관리자 |
| **delete** | 관리자만 |

```javascript
match /attendance/{attendanceId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth != null;
  allow delete: if isAdmin();
}
```

**특징:**
- 모든 인증 사용자가 출퇴근 기록 생성/수정 가능
- 삭제는 관리자만 가능

---

### 4. **contracts** (계약서)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **write** | 관리자만 |

```javascript
match /contracts/{contractId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}
```

**특징:**
- 직원은 자신의 계약서 읽기만 가능 (필터링은 클라이언트에서 처리)
- 생성/수정/삭제는 관리자만 가능

---

### 5. **savedContracts** (임시 저장 계약서)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **write** | 관리자만 |

```javascript
match /savedContracts/{contractId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}
```

**특징:**
- 작성 중인 계약서 임시 저장
- 관리자만 수정 가능

---

### 6. **signedContracts** (서명된 계약서)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **create** | 모든 인증 사용자 |
| **update** | 관리자만 |
| **delete** | 관리자만 |

```javascript
match /signedContracts/{contractId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update, delete: if isAdmin();
}
```

**특징:**
- 직원이 서명 시 문서 생성 가능
- 수정/삭제는 관리자만 가능

---

### 7. **employee_docs** (직원 서류)

| 작업 | 권한 |
|------|------|
| **read** | 본인 또는 관리자/매니저 |
| **write** | 본인 또는 관리자 |

```javascript
match /employee_docs/{docId} {
  allow read: if isAdminOrManager() || isOwner(docId);
  allow write: if isOwner(docId) || isAdmin();
}
```

**특징:**
- 직원은 자신의 서류(통장사본, 보건증 등) 업로드 가능
- 관리자/매니저는 모든 서류 조회 가능

---

### 8. **notices** (공지사항)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **write** | 관리자만 |

```javascript
match /notices/{noticeId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}
```

**특징:**
- 모든 직원이 공지사항 읽기 가능
- 작성/수정/삭제는 관리자만 가능

---

### 9. **stores** (매장 정보)

| 작업 | 권한 |
|------|------|
| **read** | 누구나 (회원가입 시 필요) |
| **write** | 관리자만 |

```javascript
match /stores/{storeId} {
  allow read: if true;
  allow write: if isAdmin();
}
```

**특징:**
- 회원가입 시 매장 선택을 위해 누구나 읽기 가능
- 관리자만 매장 정보 수정 가능

---

### 10. **companies** (회사 정보)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **write** | 관리자만 |

```javascript
match /companies/{companyId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}
```

**특징:**
- 사업자 정보 등 회사 관련 정보
- 관리자만 수정 가능

---

### 11. **approvals** (문서 승인)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **create** | 모든 인증 사용자 |
| **update** | 관리자만 |
| **delete** | 관리자만 |

```javascript
match /approvals/{approvalId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update, delete: if isAdmin();
}
```

**특징:**
- 구매/폐기/퇴직서 등 문서 승인 요청
- 직원이 신청 생성 가능
- 승인/반려는 관리자만 가능

---

### 12. **salaries** (급여 정보)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **write** | 관리자만 |

```javascript
match /salaries/{salaryId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}
```

**특징:**
- 급여 정보는 관리자만 생성/수정 가능
- 직원은 자신의 급여 정보 읽기만 가능 (필터링은 클라이언트에서 처리)

---

### 13. **time_change_reports** (근무시간 수정 이력)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **create** | 모든 인증 사용자 |
| **update** | 모든 인증 사용자 |
| **delete** | 관리자만 |

```javascript
match /time_change_reports/{reportId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null;
  allow delete: if isAdmin();
}
```

**특징:**
- 근무시간 수정 시 자동 기록
- 모든 인증 사용자가 생성/수정 가능
- 삭제는 관리자만 가능

---

### 14. **shift_requests** (교대근무 신청)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **create** | 모든 인증 사용자 |
| **update** | 모든 인증 사용자 |
| **delete** | 모든 인증 사용자 |

```javascript
match /shift_requests/{requestId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth != null;
  allow delete: if request.auth != null;
}
```

**특징:**
- 교대근무 신청/승인 프로세스
- 모든 인증 사용자가 생성/수정/삭제 가능

---

### 15. **schedules** (근무 스케줄)

| 작업 | 권한 |
|------|------|
| **read** | 모든 인증 사용자 |
| **write** | 관리자만 |

```javascript
match /schedules/{scheduleId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}
```

**특징:**
- 관리자가 작성한 근무 스케줄
- 직원은 읽기만 가능
- 생성/수정/삭제는 관리자만 가능

---

### 16. **schedules_backup** (백업 컬렉션)

| 작업 | 권한 |
|------|------|
| **read** | 관리자만 |
| **write** | 관리자만 |

```javascript
match /schedules_backup/{scheduleId} {
  allow read, write: if isAdmin();
}
```

**특징:**
- 마이그레이션 백업 데이터
- 관리자만 접근 가능

---

### 17. **schedules_new** (신규 컬렉션)

| 작업 | 권한 |
|------|------|
| **read** | 관리자만 |
| **write** | 관리자만 |

```javascript
match /schedules_new/{scheduleId} {
  allow read, write: if isAdmin();
}
```

**특징:**
- 마이그레이션 변환 결과 데이터
- 관리자만 접근 가능

---

### 18. **schedules_old** (기존 컬렉션)

| 작업 | 권한 |
|------|------|
| **read** | 관리자만 |
| **write** | 관리자만 |

```javascript
match /schedules_old/{scheduleId} {
  allow read, write: if isAdmin();
}
```

**특징:**
- 마이그레이션 이전 데이터 보관
- 관리자만 접근 가능

---

## 보안 원칙

### 1. **인증 필수**
- 거의 모든 컬렉션은 `request.auth != null` 체크 필수
- 예외: `stores` (회원가입 시 필요)

### 2. **역할 기반 접근**
- **admin**: 모든 데이터 읽기/쓰기 가능
- **manager**: 직원 서류 등 일부 데이터 읽기 가능
- **employee**: 본인 데이터만 읽기/쓰기 가능

### 3. **클라이언트 필터링**
- Firestore Rules는 문서 단위 접근만 제어
- 컬렉션 내 본인 데이터 필터링은 클라이언트에서 처리
  ```javascript
  // 예시: 직원이 자신의 급여만 조회
  const q = query(
    collection(db, 'salaries'),
    where('employeeUid', '==', currentUser.uid)
  );
  ```

### 4. **읽기 권한 우선**
- 대부분의 컬렉션은 읽기 권한을 넓게 부여
- 쓰기 권한은 엄격하게 제한

---

## 규칙 배포

### 1. **로컬 테스트**
```bash
# Emulator로 규칙 테스트
firebase emulators:start --only firestore
```

### 2. **프로덕션 배포**
```bash
# firestore.rules 배포
firebase deploy --only firestore:rules
```

### 3. **Firebase Console 확인**
- [Firebase Console](https://console.firebase.google.com) 접속
- Firestore Database → Rules 탭에서 규칙 확인

---

## 버전 관리

| 버전 | 날짜 | 변경 내역 |
|------|------|-----------|
| 1.0 | 2025-01-15 | 초기 규칙 설정 |
| 2.0 | 2025-11-16 | Helper 함수 추가 (isManager, isAdminOrManager) |

---

## 참고 문서

- **Firestore 데이터 구조**: [FIREBASE_DATA_STRUCTURE.md](./FIREBASE_DATA_STRUCTURE.md)
- **필드 매핑**: [FIELD_MAPPING.md](./FIELD_MAPPING.md)
- **보안 가이드**: [FIRESTORE_SECURITY_GUIDE.md](./FIRESTORE_SECURITY_GUIDE.md)
