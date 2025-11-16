# 🏢 멀티테넌트 SaaS 전환 설계 v3.1

**프로젝트:** ABCDC-staff-system 멀티테넌트 전환  
**작성일:** 2025-11-16  
**업데이트:** 2025-11-16 (v3.1)  
**버전:** 3.1 (초대 코드 1:1 단순화 + super_admin + 초대링크 공유)

---

## 📋 목차

1. [개요](#개요)
2. [현재 상태 분석 (v2.0)](#현재-상태-분석-v20)
3. [목표 아키텍처 (v3.0)](#목표-아키텍처-v30)
4. [데이터 모델 설계](#데이터-모델-설계)
5. [초대 코드 시스템](#초대-코드-시스템)
6. [Firestore Rules 설계](#firestore-rules-설계)
7. [프론트엔드 변경 사항](#프론트엔드-변경-사항)
8. [Cloud Functions 설계](#cloud-functions-설계)
9. [마이그레이션 전략](#마이그레이션-전략)
10. [구현 우선순위](#구현-우선순위)

---

## 개요

### 배경

현재 시스템은 **단일 회사(맛남살롱/ABC Dessert Center)** 전용으로 설계되어 있습니다.  
이를 **여러 회사가 사용하는 SaaS 플랫폼**으로 전환하여, 각 회사가 독립적으로 직원/매장/급여를 관리할 수 있도록 개편합니다.

### 핵심 변경사항

#### Before (v2.0 - 단일 테넌트)
- 하나의 회사만 사용
- 매장 간 구분만 존재
- 직원 가입 시 매장만 선택
- `companyId` 개념 없음

#### After (v3.1 - 멀티테넌트)
- **여러 회사**가 독립적으로 사용
- **2단계 구조**: Company (회사) → Store (매장)
- **초대 코드** 기반 직원 가입 (1:1 매칭)
- 모든 데이터에 `companyId` 필수
- **super_admin** 역할 추가 (플랫폼 관리자)
- **초대 링크 자동 생성** 및 공유 기능

---

## 현재 상태 분석 (v2.0)

### 1. 데이터 구조

**주요 컬렉션:**
- `users` - 사용자 정보
- `employees` - 직원 목록
- `stores` - 매장 정보 (현재: 전역 매장 리스트)
- `companies` - 회사 정보 (현재: 사용 안 함)
- `contracts`, `attendance`, `schedules`, `salaries` - 업무 데이터

**현재 문제점:**
```javascript
// users 문서 예시 (v2.0)
{
  uid: "user123",
  name: "홍길동",
  store: "부천시청점",  // ❌ 매장 이름만 있음
  role: "employee",
  // ❌ companyId 없음 → 회사 간 격리 불가능
}

// stores 문서 예시 (v2.0)
{
  name: "부천시청점",
  address: "경기도 부천시...",
  // ❌ companyId 없음 → 모든 회사의 매장이 섞임
}
```

### 2. 인증 & 권한

**현재 역할 (role):**
- `step`, `staff` - 일반 직원
- `manager`, `store_manager` - 매장 관리자
- `admin` - 시스템 관리자

**v3.1 역할 확장:**
- `step` / `staff` - 일반 직원 (자기 매장)
- `store_manager` - 매장 관리자 (자기 매장)
- `manager` - 슈퍼바이저 (여러 매장)
- `admin` - 회사 관리자 (특정 회사 전체)
- `super_admin` - 플랫폼 관리자 (모든 회사) ⭐ 신규

**현재 Rules (v2.0):**
```javascript
// firestore.rules (단일 테넌트)
function isAdmin() {
  let userData = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
  return userData.role == 'admin' || userData.userType == 'admin';
}

match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow read: if request.auth != null && isAdmin();  // ❌ 다른 회사 데이터도 접근 가능
}
```

### 3. 회원가입 플로우

**현재 플로우 (employee-register.html):**
1. 직원이 이름, 주민번호, 연락처, 주소 입력
2. **매장 선택**: Firestore에서 전체 매장 로드
   ```javascript
   db.collection('stores').orderBy('name').get()  // ❌ 모든 회사의 매장이 다 나옴
   ```
3. 직책, 이메일, 비밀번호 입력
4. Firebase Auth 계정 생성
5. Firestore에 직원 정보 저장 (`status: 'pending'`)

**문제점:**
- ❌ 회사 구분 없음 → 어느 회사 직원인지 알 수 없음
- ❌ 초대 코드 없음 → 아무나 가입 가능
- ❌ 다른 회사 매장까지 선택 가능

---

## 목표 아키텍처 (v3.0)

### 1. 2단계 멀티테넌트 구조

```
Platform (GenSpark Staff System)
├── Company A (ABC Dessert Center)
│   ├── Store 1 (부천시청점)
│   ├── Store 2 (상동점)
│   └── Store 3 (부천역사점)
├── Company B (OO Coffee)
│   ├── Store 1 (강남점)
│   └── Store 2 (신촌점)
└── Company C (XX Dessert Lab)
    └── Store 1 (홍대점)
```

### 2. 핵심 원칙

#### Principle 1: 완전한 데이터 격리
- **모든 데이터**에 `companyId` 필수
- 다른 회사 데이터는 **절대 조회/수정 불가**
- Firestore Rules로 강제

#### Principle 2: 초대 코드 기반 가입
- 회사가 **초대 코드** 생성
- 직원은 초대 코드로 가입
- 코드 없이는 가입 불가

#### Principle 3: 역할 기반 권한
- `admin`: 같은 회사 내 **모든 매장** 관리
- `store_manager`: 같은 회사 내 **자기 매장만** 관리
- `staff`/`step`: 같은 회사, 같은 매장 내 **본인 데이터만**

---

## 데이터 모델 설계

### 1. companies (회사 정보) ✅ 기존 컬렉션 활용

```javascript
companies/{companyId}
{
  id: "company_abc",                    // 회사 ID (자동 생성 또는 company_xxx)
  name: "ABC Dessert Center",           // 회사명
  displayName: "맛남살롱 부천시청 외식", // 표시명
  
  // 사업자 정보
  businessNumber: "123-45-67890",      // 사업자등록번호
  ceo: "대표자명",                      // 대표자
  phone: "031-123-4567",               // 회사 전화번호
  address: "경기도 부천시...",          // 회사 주소
  
  // 플랜 & 상태
  plan: "basic",                        // basic, pro, enterprise
  status: "active",                     // active, suspended, closed
  
  // 관리자
  ownerId: "admin_uid",                 // 최초 생성자 (첫 admin)
  
  // 설정
  settings: {
    timezone: "Asia/Seoul",
    language: "ko",
    workingHours: {
      start: "09:00",
      end: "18:00"
    }
  },
  
  // 날짜
  createdAt: Timestamp,
  updatedAt: Timestamp,
  subscriptionExpiresAt: Timestamp      // 구독 만료일
}
```

**인덱스:**
- `status` (단일 필드)
- `ownerId` (단일 필드)

---

### 2. stores (매장 정보) ✅ companyId 추가

```javascript
stores/{storeId}
{
  id: "store_bucheon_city",            // 매장 ID
  companyId: "company_abc",             // ⭐ 소속 회사 (필수)
  
  name: "부천시청점",                   // 매장명
  address: "경기도 부천시 원미구",      // 주소
  phone: "031-123-4567",               // 매장 전화번호
  
  // 매장 관리자
  managerId: "manager_uid",             // 점장 UID (옵션)
  
  // 상태
  status: "active",                     // active, inactive, closed
  
  // 날짜
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**인덱스:**
- `companyId` (단일 필드) ⭐ 필수
- `companyId + status` (복합 인덱스)

**⚠️ 중요 변경:**
- `store` 필드 (문자열)를 `storeId` (참조)로 변경 권장
- 기존 호환성 위해 `store` (매장명) 필드도 유지 가능

---

### 3. users (사용자 정보) ✅ companyId, storeId 추가

```javascript
users/{userId}
{
  // 기본 정보 (기존 유지)
  uid: "firebase_auth_uid",
  email: "user@example.com",
  name: "홍길동",
  phone: "010-1234-5678",
  birth: "1995-05-15",
  address: "경기도 부천시...",
  
  // ⭐ 멀티테넌트 필드 (신규)
  companyId: "company_abc",             // ⭐ 소속 회사 (필수)
  storeId: "store_bucheon_city",        // ⭐ 기본 소속 매장 (필수)
  
  // 권한 및 역할 (기존 유지)
  role: "staff",                        // step, staff, store_manager, manager, admin
  userType: "employee",                 // employee 또는 admin (호환용)
  
  // 근무 정보 (기존 유지)
  store: "부천시청점",                  // 매장명 (호환용, storeId로 대체 권장)
  position: "바리스타",
  
  // 계정 상태 (기존 유지)
  status: "active",                     // pending, active, inactive, resigned
  approvedBy: "admin_uid",
  approvedAt: Timestamp,
  
  // 급여 정보 (기존 유지)
  wageType: "시급",
  wageAmount: 10500,
  
  // ⭐ 가입 정보 (신규)
  inviteCode: "ABC2024-STAFF-001",      // 사용한 초대 코드 (추적용)
  
  // 날짜 (기존 유지)
  createdAt: Timestamp,
  joinedAt: Timestamp,
  updatedAt: Timestamp
}
```

**인덱스:**
- `companyId` (단일 필드) ⭐ 필수
- `companyId + storeId` (복합 인덱스) ⭐ 필수
- `companyId + role` (복합 인덱스)
- `companyId + status` (복합 인덱스)
- 기존: `status + role`, `status + store` 유지

---

### 4. company_invites (초대 코드) ⭐ v3.1 단순화

**설계 원칙:**
- **1:1 매칭**: 초대 코드 하나 = 회사 하나 + 매장 하나 + 역할 하나
- **매장 선택 불가**: 직원은 매장을 선택하지 않음 (자동 배정)
- **명확한 권한**: 코드 생성 시 역할과 매장 고정

```javascript
company_invites/{inviteId}  // 문서 ID는 랜덤 (예: a82jxK9qLm3Z)
{
  // 코드 정보
  code: "ABC2024-STAFF-001",            // 초대 코드 (검색용)
  companyId: "company_abc",             // ⭐ 소속 회사 (필수)
  companyName: "ABC Dessert Center",    // 회사명 (표시용)
  
  // ⭐ v3.1: 1:1 매칭 (단순화)
  storeId: "store_bucheon_city",        // ⭐ 배정 매장 (1개만)
  storeName: "부천시청점",               // 매장명 (표시용)
  role: "staff",                        // ⭐ 배정 역할 (step, staff, store_manager)
  
  // ❌ v3.0에서 제거됨:
  // defaultRole, defaultStoreId, allowedStoreIds
  
  // 사용 제한
  maxUses: 50,                          // 최대 사용 가능 횟수
  usedCount: 0,                         // 현재까지 사용된 횟수
  status: "active",                     // active, disabled, expired
  
  // ⭐ v3.1: 초대 링크
  inviteUrl: "https://domain.com/employee-register.html?code=ABC2024-STAFF-001",
  
  // 관리 정보
  createdBy: "admin_uid",               // 코드를 생성한 관리자 UID
  createdAt: Timestamp,
  expiresAt: Timestamp | null,          // 만료일 (null이면 무제한)
  updatedAt: Timestamp
}
```

**인덱스:**
- `companyId` (단일 필드)
- `status` (단일 필드)
- `companyId + status` (복합 인덱스)

**보안 고려사항:**
- 초대 코드는 민감 정보 (무차별 조회 방지)
- Cloud Functions로만 검증 권장
- Firestore Rules에서 직접 조회는 최소화

---

### 5. 기타 컬렉션에 companyId/storeId 추가

#### attendance (출퇴근 기록)
```javascript
attendance/{attendanceId}
{
  // 기존 필드 유지
  employeeId: "firebase_uid",
  employeeName: "홍길동",
  store: "부천시청점",
  date: "2025-01-29",
  clockIn: "09:00",
  clockOut: "18:00",
  
  // ⭐ 신규 필드
  companyId: "company_abc",             // ⭐ 필수
  storeId: "store_bucheon_city",        // ⭐ 필수
  
  // 나머지 기존 필드 유지
  workType: "정규근무",
  workMinutes: 540,
  status: "정상",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### schedules (근무 스케줄)
```javascript
schedules/{scheduleId}
{
  userId: "firebase_uid",
  userName: "홍길동",
  date: "2025-11-16",
  
  // ⭐ 신규 필드
  companyId: "company_abc",             // ⭐ 필수
  storeId: "store_bucheon_city",        // ⭐ 필수
  
  // 기존 필드 유지
  startTime: "09:00",
  endTime: "18:00",
  hours: 8,
  breakTime: { start: "12:00", end: "13:00", minutes: 60 },
  isWorkDay: true,
  isShiftReplacement: false,
  contractId: "C1738123456789",
  createdAt: Timestamp
}
```

#### contracts (계약서)
```javascript
contracts/{contractId}
{
  employeeId: "firebase_uid",
  employeeName: "홍길동",
  
  // ⭐ 신규 필드
  companyId: "company_abc",             // ⭐ 필수
  storeId: "store_bucheon_city",        // ⭐ 근무 매장
  
  // 기존 회사 정보 (이제 companyId로 참조 가능)
  companyName: "맛남살롱 부천시청점",
  companyCEO: "대표자명",
  companyBusinessNumber: "123-45-67890",
  
  // 나머지 기존 필드 유지
  contractType: "정규직 근로계약서",
  workStore: "부천시청점",
  position: "바리스타",
  contractStartDate: "2025-02-01",
  salaryType: "시급",
  salaryAmount: 10500,
  status: "pending",
  createdAt: Timestamp
}
```

#### salaries (급여 정보)
```javascript
salaries/{salaryId}
{
  employeeId: "firebase_uid",
  employeeName: "홍길동",
  
  // ⭐ 신규 필드
  companyId: "company_abc",             // ⭐ 필수
  storeId: "store_bucheon_city",        // ⭐ 필수
  
  // 기존 필드 유지
  year: 2025,
  month: 1,
  workDays: 22,
  totalHours: 176,
  baseSalary: 1848000,
  netSalary: 1946585,
  status: "pending",
  createdAt: Timestamp
}
```

#### approvals, notices, time_change_reports, shift_requests
**모두 동일하게 `companyId`, `storeId` 추가**

---

## 초대 코드 시스템

### 1. 초대 코드 생성 플로우

```
┌─────────────┐
│   Admin     │  회사 관리자
└──────┬──────┘
       │
       │ 1. 초대 코드 생성 요청
       ▼
┌─────────────────┐
│ Admin Dashboard │
│  (관리자 페이지)  │
└────────┬────────┘
         │
         │ 2. Cloud Function 호출
         ▼
┌──────────────────────┐
│  createInviteCode()  │  Cloud Function
│  - 코드 생성 (UUID)   │
│  - company_invites   │
│    문서 저장          │
└──────────┬───────────┘
           │
           │ 3. 초대 코드 반환
           ▼
    ┌──────────────┐
    │ ABC2024-001  │  생성된 초대 코드
    └──────────────┘
```

**초대 코드 형식 예시:**
- `ABC2024-STAFF-001` - 회사명 약어 + 연도 + 직원용 + 일련번호
- `OO2024-MGR-001` - OO Coffee 매니저용
- `XX2024-TEMP-001` - XX Dessert Lab 임시직원용

### 2. 직원 가입 플로우 (v3.1 단순화)

**⭐ v3.1 변경사항:**
- 매장 선택 UI 제거 (자동 배정)
- 회사/매장 정보 표시만 (읽기전용)

```
┌─────────────┐
│  Employee   │  신규 직원
└──────┬──────┘
       │
       │ 1. employee-register.html 접속
       │    (URL 파라미터로 코드 자동입력 가능)
       ▼
┌──────────────────┐
│ 초대 코드 입력    │
│ "ABC2024-001"    │
└────────┬─────────┘
         │
         │ 2. Cloud Function 호출
         ▼
┌──────────────────────┐
│ verifyInviteCode()   │  Cloud Function
│  - 코드 유효성 확인   │
│  - companyId 반환    │
│  - ⭐ 매장 정보 1개  │  (변경됨)
└──────────┬───────────┘
           │
           │ 3. 검증 결과 반환 (v3.1)
           ▼
    ┌────────────────────┐
    │ companyId:         │
    │ "company_abc"      │
    │ companyName:       │
    │ "ABC Dessert..."  │
    │ ⭐ storeId:        │  (단일)
    │ "store_bucheon..." │
    │ ⭐ storeName:      │
    │ "부천시청점"        │
    │ role: "staff"      │
    └────────┬───────────┘
             │
             │ 4. ⭐ 회사/매장 표시 (읽기전용)
             ▼
┌──────────────────────────┐
│ ✅ 확인된 회사/매장:      │
│ 회사: ABC Dessert Center │
│ 매장: 부천시청점          │
│                          │
│ ❌ 매장 선택 드롭다운 없음 │
└──────────┬───────────────┘
           │
           │ 5. 개인정보 입력 & 가입
           ▼
┌──────────────────────┐
│ Firebase Auth 계정   │
│ users 문서 생성      │
│ - companyId 포함     │
│ - ⭐ storeId 자동    │  (초대코드에서)
│ - inviteCode 저장    │
└──────────────────────┘
```

### 3. Cloud Function: verifyInviteCode

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.verifyInviteCode = functions.https.onCall(async (data, context) => {
  const { inviteCode } = data;
  
  // 입력 검증
  if (!inviteCode || typeof inviteCode !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '초대 코드를 입력하세요.');
  }
  
  try {
    // 초대 코드 문서 조회
    const inviteDoc = await admin.firestore()
      .collection('company_invites')
      .doc(inviteCode)
      .get();
    
    if (!inviteDoc.exists) {
      throw new functions.https.HttpsError('not-found', '유효하지 않은 초대 코드입니다.');
    }
    
    const inviteData = inviteDoc.data();
    
    // 상태 확인
    if (inviteData.status !== 'active') {
      throw new functions.https.HttpsError('failed-precondition', '사용할 수 없는 초대 코드입니다.');
    }
    
    // 사용 횟수 확인
    if (inviteData.usedCount >= inviteData.maxUses) {
      throw new functions.https.HttpsError('resource-exhausted', '초대 코드 사용 횟수를 초과했습니다.');
    }
    
    // 만료일 확인
    if (inviteData.expiresAt && inviteData.expiresAt.toDate() < new Date()) {
      throw new functions.https.HttpsError('deadline-exceeded', '만료된 초대 코드입니다.');
    }
    
    // 회사 정보 조회
    const companyDoc = await admin.firestore()
      .collection('companies')
      .doc(inviteData.companyId)
      .get();
    
    if (!companyDoc.exists) {
      throw new functions.https.HttpsError('not-found', '회사 정보를 찾을 수 없습니다.');
    }
    
    // ⭐ v3.1: 매장 정보 조회 (1개만)
    const storeDoc = await admin.firestore()
      .collection('stores')
      .doc(inviteData.storeId)
      .get();
    
    if (!storeDoc.exists) {
      throw new functions.https.HttpsError('not-found', '매장 정보를 찾을 수 없습니다.');
    }
    
    const storeData = storeDoc.data();
    
    // ⭐ v3.1: 검증 성공 - 단순화된 정보 반환
    return {
      ok: true,
      companyId: inviteData.companyId,
      companyName: companyDoc.data().name,
      storeId: inviteData.storeId,           // ⭐ 단일 매장
      storeName: storeData.name,              // ⭐ 매장명
      role: inviteData.role || 'staff'        // ⭐ 배정 역할
    };
    
  } catch (error) {
    console.error('초대 코드 검증 실패:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', '초대 코드 검증 중 오류가 발생했습니다.');
  }
});
```

### 4. Cloud Function: recordInviteUse

가입 성공 후 초대 코드 사용 횟수 증가:

```javascript
exports.recordInviteUse = functions.https.onCall(async (data, context) => {
  const { inviteCode, userId } = data;
  
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  
  try {
    await admin.firestore()
      .collection('company_invites')
      .doc(inviteCode)
      .update({
        usedCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    return { ok: true };
  } catch (error) {
    console.error('초대 코드 사용 기록 실패:', error);
    throw new functions.https.HttpsError('internal', '초대 코드 사용 기록 실패');
  }
});
```

---

## Firestore Rules 설계

### 1. v3.1 Helper 함수 (super_admin 추가)

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===================================================================
    // 멀티테넌트 Firestore Security Rules v3.1
    // ===================================================================
    
    // ============ Helper Functions ============
    
    // 인증 확인
    function isSignedIn() {
      return request.auth != null;
    }
    
    // ⭐ v3.1: Super Admin 확인 (Firebase Custom Claims)
    function isSuperAdmin() {
      return request.auth != null
          && request.auth.token.super_admin == true;
    }
    
    // 사용자 문서 가져오기
    function getUser() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }
    
    // 사용자의 companyId
    function userCompanyId() {
      return getUser().data.companyId;
    }
    
    // 사용자의 storeId
    function userStoreId() {
      return getUser().data.storeId;
    }
    
    // 역할 확인
    function hasRole(roleName) {
      return getUser().data.role == roleName;
    }
    
    // Admin 여부 (회사 관리자)
    function isAdmin() {
      return hasRole("admin");
    }
    
    // Store Manager 여부
    function isStoreManager() {
      return getUser().data.role in ["store_manager", "manager"];
    }
    
    // Admin 또는 Manager
    function isAdminOrManager() {
      return isAdmin() || isStoreManager();
    }
    
    // ⭐ 같은 회사인지 확인 (리소스)
    function isSameCompany(resource) {
      return resource.data.companyId == userCompanyId();
    }
    
    // ⭐ 같은 매장인지 확인 (리소스)
    function isSameStore(resource) {
      return resource.data.storeId == userStoreId();
    }
    
    // ⭐ 같은 회사인지 확인 (요청 데이터)
    function isSameCompanyInRequest() {
      return request.resource.data.companyId == userCompanyId();
    }
    
    // ⭐ 같은 매장인지 확인 (요청 데이터)
    function isSameStoreInRequest() {
      return request.resource.data.storeId == userStoreId();
    }
    
    // ... (계속)
  }
}
```

**⭐ v3.1 역할 계층:**
```
step / staff          → 일반 직원 (자기 매장, 본인 데이터)
    ↓
store_manager         → 매장 관리자 (자기 매장)
    ↓
manager               → 슈퍼바이저 (여러 매장)
    ↓
admin                 → 회사 관리자 (특정 회사 전체)
    ↓
super_admin           → 플랫폼 관리자 (모든 회사) ⭐ Custom Claims
```

### 2. 컬렉션별 Rules

#### companies
```javascript
match /companies/{companyId} {
  // 읽기: 같은 회사 사용자 또는 super_admin
  allow read: if isSignedIn() && (
    userCompanyId() == companyId || isSuperAdmin()
  );
  
  // 쓰기: 해당 회사 admin 또는 super_admin
  allow write: if isSignedIn() && (
    (userCompanyId() == companyId && isAdmin()) || isSuperAdmin()
  );
}
```

#### stores
```javascript
match /stores/{storeId} {
  // 읽기: 같은 회사 사용자 또는 super_admin
  allow read: if isSignedIn() && (
    isSameCompany(resource) || isSuperAdmin()
  );
  
  // 쓰기: 해당 회사 admin 또는 super_admin
  allow create: if isSignedIn() && (
    (isSameCompanyInRequest() && isAdmin()) || isSuperAdmin()
  );
  allow update, delete: if isSignedIn() && (
    (isSameCompany(resource) && isAdmin()) || isSuperAdmin()
  );
}
```

#### users
```javascript
match /users/{userId} {
  // 읽기: 본인 또는 같은 회사 admin/manager 또는 super_admin
  allow read: if isSignedIn() && (
    request.auth.uid == userId ||
    (isSameCompany(resource) && isAdminOrManager()) ||
    isSuperAdmin()
  );
  
  // 생성: 회원가입 시 (companyId 검증은 Cloud Function에서)
  allow create: if isSignedIn() && request.auth.uid == userId;
  
  // 수정: 본인 또는 같은 회사 admin 또는 super_admin
  allow update: if isSignedIn() && (
    request.auth.uid == userId ||
    (isSameCompany(resource) && isAdmin()) ||
    isSuperAdmin()
  );
  
  // 삭제: 같은 회사 admin 또는 super_admin
  allow delete: if isSignedIn() && (
    (isSameCompany(resource) && isAdmin()) || isSuperAdmin()
  );
}
```

#### attendance
```javascript
match /attendance/{attendanceId} {
  // 읽기: 같은 회사 사용자
  allow read: if isSignedIn() && isSameCompany(resource);
  
  // 생성: 같은 회사, 같은 매장
  allow create: if isSignedIn() && 
                   isSameCompanyInRequest() && 
                   isSameStoreInRequest();
  
  // 수정: 본인 또는 같은 회사 admin
  allow update: if isSignedIn() && isSameCompany(resource) && (
    resource.data.employeeId == request.auth.uid ||
    isAdmin()
  );
  
  // 삭제: 같은 회사 admin만
  allow delete: if isSignedIn() && isSameCompany(resource) && isAdmin();
}
```

#### company_invites (초대 코드)
```javascript
match /company_invites/{inviteCode} {
  // 읽기: Cloud Function만 (클라이언트 직접 접근 최소화)
  // 또는 해당 회사 admin만
  allow read: if isSignedIn() && isSameCompany(resource) && isAdmin();
  
  // 쓰기: 해당 회사 admin만
  allow create: if isSignedIn() && isSameCompanyInRequest() && isAdmin();
  allow update, delete: if isSignedIn() && isSameCompany(resource) && isAdmin();
}
```

---

## 프론트엔드 변경 사항

### 1. employee-register.html 수정

#### Before (v2.0)
```html
<!-- 매장 선택 -->
<select id="store" required>
  <option value="">선택하세요</option>
  <!-- 모든 회사의 매장이 다 나옴 -->
</select>

<script>
// 모든 매장 로드
async function loadStores() {
  const snapshot = await db.collection('stores').orderBy('name').get();
  // ...
}
</script>
```

#### After (v3.1 - 단순화)
```html
<!-- ⭐ v3.1: 초대 코드 입력 (최상단) -->
<div class="form-group">
  <label for="inviteCode">초대 코드 <span class="required">*</span></label>
  <input type="text" id="inviteCode" placeholder="ABC2024-STAFF-001" required>
  <button type="button" id="verifyCodeBtn" class="btn-secondary">코드 확인</button>
  <div class="help-text">회사에서 받은 초대 코드를 입력하세요.</div>
</div>

<!-- ⭐ v3.1: 회사/매장 정보 표시 (읽기전용) -->
<div id="tenantInfo" style="display:none;" class="info-box">
  <h4>✅ 확인된 회사 정보</h4>
  <p><strong>회사:</strong> <span id="companyLabel"></span></p>
  <p><strong>매장:</strong> <span id="storeLabel"></span></p>
  <p><strong>역할:</strong> <span id="roleLabel"></span></p>
</div>

<!-- ❌ v3.0에서 제거: 매장 선택 드롭다운 -->

<script>
// 전역 변수로 초대 정보 저장
let inviteMeta = null;

// ⭐ v3.1: 페이지 로드 시 URL 파라미터 확인
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCodeParam = urlParams.get('code');
  
  if (inviteCodeParam) {
    document.getElementById('inviteCode').value = inviteCodeParam;
    verifyInviteCode();  // 자동 검증
  }
});

// ⭐ v3.1: 초대 코드 검증 (단순화)
async function verifyInviteCode() {
  const inviteCode = document.getElementById('inviteCode').value.trim();
  
  if (!inviteCode) {
    showError('초대 코드를 입력하세요.');
    return;
  }
  
  try {
    // Cloud Function 호출
    const verifyFunction = firebase.functions().httpsCallable('verifyInviteCode');
    const result = await verifyFunction({ inviteCode });
    
    if (result.data.ok) {
      inviteMeta = result.data;
      
      // ⭐ v3.1: 회사/매장 정보 표시 (선택 불가)
      document.getElementById('companyLabel').textContent = inviteMeta.companyName;
      document.getElementById('storeLabel').textContent = inviteMeta.storeName;
      document.getElementById('roleLabel').textContent = getRoleDisplayName(inviteMeta.role);
      document.getElementById('tenantInfo').style.display = 'block';
      
      // 성공 메시지
      showSuccess(`✅ ${inviteMeta.companyName}의 초대 코드가 확인되었습니다.`);
      
      // 초대 코드 입력 필드 비활성화
      document.getElementById('inviteCode').disabled = true;
      document.getElementById('verifyCodeBtn').disabled = true;
    }
  } catch (error) {
    console.error('초대 코드 검증 실패:', error);
    showError(error.message || '초대 코드 검증에 실패했습니다.');
  }
}

// 역할 한글명 변환
function getRoleDisplayName(role) {
  const roleNames = {
    'step': '수습',
    'staff': '직원',
    'store_manager': '매장 관리자',
    'manager': '슈퍼바이저',
    'admin': '관리자'
  };
  return roleNames[role] || role;
}

// 가입 시 companyId, storeId 저장
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!inviteMeta) {
    showError('초대 코드를 먼저 확인하세요.');
    return;
  }
  
  // ... (기존 검증 로직)
  
  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
  const user = userCredential.user;
  
  const employeeData = {
    uid: user.uid,
    email,
    name,
    birth,
    phone,
    address,
    
    // ⭐ v3.1: 멀티테넌트 필드 (자동 배정)
    companyId: inviteMeta.companyId,
    storeId: inviteMeta.storeId,        // ⭐ 초대코드에서 자동
    
    store: inviteMeta.storeName,        // 매장명 (호환용)
    position,
    userType: 'employee',
    role: inviteMeta.role,               // ⭐ 초대코드에서 자동
    status: 'pending',
    
    // ⭐ 초대 코드 저장 (추적용)
    inviteCode: document.getElementById('inviteCode').value,
    
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  await db.collection('users').doc(user.uid).set(employeeData);
  await db.collection('employees').doc(user.uid).set(employeeData);
  
  // ⭐ 초대 코드 사용 횟수 증가
  const recordUseFunction = firebase.functions().httpsCallable('recordInviteUse');
  await recordUseFunction({ 
    inviteCode: document.getElementById('inviteCode').value,
    userId: user.uid 
  });
  
  showSuccess('가입 신청이 완료되었습니다!');
  setTimeout(() => window.location.href = 'employee-login.html', 3000);
});
</script>
```

### 2. auth.js 확장 (테넌트 컨텍스트)

```javascript
// auth.js에 추가

// 테넌트 컨텍스트 저장
function setTenantContext(context) {
  if (!context || !context.companyId || !context.storeId) {
    console.error('[미검증] 유효하지 않은 테넌트 컨텍스트');
    return false;
  }
  
  const tenantData = {
    companyId: context.companyId,
    companyName: context.companyName,
    storeId: context.storeId,
    storeName: context.storeName,
    role: context.role
  };
  
  saveToSession(CONFIG.STORAGE_KEYS.TENANT_CONTEXT, tenantData);
  debugLog('테넌트 컨텍스트 저장:', tenantData);
  
  return true;
}

// 테넌트 컨텍스트 가져오기
function getTenantContext() {
  return getFromSession(CONFIG.STORAGE_KEYS.TENANT_CONTEXT);
}

// 현재 회사 ID
function getCurrentCompanyId() {
  const context = getTenantContext();
  return context ? context.companyId : null;
}

// 현재 매장 ID
function getCurrentStoreId() {
  const context = getTenantContext();
  return context ? context.storeId : null;
}
```

### 3. config.js 확장

```javascript
// config.js에 추가

STORAGE_KEYS: {
  USER_INFO: 'matnamsalon_user',
  CURRENT_ROLE: 'matnamsalon_role',
  LAST_LOGIN: 'matnamsalon_last_login',
  TENANT_CONTEXT: 'matnamsalon_tenant'  // ⭐ 신규
}
```

### 4. 로그인 후 테넌트 컨텍스트 설정

```javascript
// employee-login.html, admin-login.html에서 로그인 성공 후

const user = userCredential.user;
const userDoc = await db.collection('users').doc(user.uid).get();
const userData = userDoc.data();

// ⭐ 테넌트 컨텍스트 설정
setTenantContext({
  companyId: userData.companyId,
  companyName: userData.companyName || 'Unknown Company',
  storeId: userData.storeId,
  storeName: userData.store,
  role: userData.role
});
```

### 5. 쿼리 수정 (Before/After)

#### attendance 쿼리
```javascript
// Before (v2.0)
db.collection('attendance')
  .where('employeeId', '==', currentUserId)
  .orderBy('date', 'desc')
  .get();

// After (v3.0)
db.collection('attendance')
  .where('companyId', '==', getCurrentCompanyId())     // ⭐ 필수
  .where('storeId', '==', getCurrentStoreId())         // ⭐ 필수
  .where('employeeId', '==', currentUserId)
  .orderBy('date', 'desc')
  .get();
```

#### schedules 쿼리
```javascript
// Before (v2.0)
db.collection('schedules')
  .where('userId', '==', userId)
  .where('date', '>=', startDate)
  .where('date', '<=', endDate)
  .get();

// After (v3.0)
db.collection('schedules')
  .where('companyId', '==', getCurrentCompanyId())     // ⭐ 필수
  .where('storeId', '==', getCurrentStoreId())         // ⭐ 필수 (매장별)
  .where('userId', '==', userId)
  .where('date', '>=', startDate)
  .where('date', '<=', endDate)
  .get();
```

#### salaries 쿼리
```javascript
// Before (v2.0)
db.collection('salaries')
  .where('employeeId', '==', employeeId)
  .orderBy('year', 'desc')
  .orderBy('month', 'desc')
  .get();

// After (v3.0)
db.collection('salaries')
  .where('companyId', '==', getCurrentCompanyId())     // ⭐ 필수
  .where('employeeId', '==', employeeId)
  .orderBy('year', 'desc')
  .orderBy('month', 'desc')
  .get();
```

---

## Cloud Functions 설계

### functions/index.js 구조

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ============ 초대 코드 관련 ============

/**
 * 초대 코드 검증
 * 호출: employee-register.html
 */
exports.verifyInviteCode = functions.https.onCall(async (data, context) => {
  // 위에서 작성한 코드 사용
});

/**
 * 초대 코드 사용 기록
 * 호출: employee-register.html (가입 완료 후)
 */
exports.recordInviteUse = functions.https.onCall(async (data, context) => {
  // 위에서 작성한 코드 사용
});

/**
 * ⭐ v3.1: 초대 코드 생성 (1:1 매칭 + 초대 링크)
 * 호출: admin-dashboard.html (관리자 페이지)
 */
exports.createInviteCode = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  
  // Admin 권한 확인
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(context.auth.uid)
    .get();
  
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', '관리자 권한이 필요합니다.');
  }
  
  // ⭐ v3.1: 단순화된 파라미터
  const { 
    companyId, 
    storeId,        // ⭐ 단일 매장
    storeName,      // 표시용
    role,           // ⭐ step, staff, store_manager
    maxUses, 
    expiresAt 
  } = data;
  
  try {
    // 초대 코드 생성 (회사명 약어 + 연도 + 역할 + 일련번호)
    const code = generateInviteCode(companyId, role);
    
    // ⭐ v3.1: 초대 링크 생성
    const baseUrl = 'https://your-domain.web.app';  // Firebase Hosting URL
    const inviteUrl = `${baseUrl}/employee-register.html?code=${code}`;
    
    // Firestore에 초대 코드 저장
    const inviteRef = admin.firestore().collection('company_invites').doc();
    await inviteRef.set({
      code,
      companyId,
      storeId,           // ⭐ 1:1 매칭
      storeName,
      role,              // ⭐ 역할 고정
      inviteUrl,         // ⭐ 초대 링크
      maxUses: maxUses || 50,
      usedCount: 0,
      status: 'active',
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { 
      ok: true, 
      code,
      inviteUrl  // ⭐ v3.1: 초대 링크 반환
    };
  } catch (error) {
    console.error('초대 코드 생성 실패:', error);
    throw new functions.https.HttpsError('internal', '초대 코드 생성 실패');
  }
});

// 초대 코드 생성 헬퍼 함수
function generateInviteCode(companyId, role) {
  const prefix = companyId.replace('company_', '').toUpperCase();
  const year = new Date().getFullYear();
  const roleCode = role.toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `${prefix}${year}-${roleCode}-${random}`;
  // 예: ABC2025-STAFF-X7K
}

// ============ 기타 ============
// 필요 시 추가 Functions
```

### package.json 설정

```json
{
  "name": "functions",
  "description": "Cloud Functions for ABCDC Staff System",
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^11.8.0",
    "firebase-functions": "^4.3.1"
  },
  "devDependencies": {
    "firebase-functions-test": "^3.1.0"
  },
  "private": true
}
```

### ⭐ v3.1 신규: 초대 링크 공유 기능

#### 배경
사장님 요구사항: "회원가입할때 직원에게 문자나 카카오톡으로 바로 링크전송할수 있도록 하면 좋을듯"

#### 구현 계획

**v1: 초대 링크 자동 생성 + 클립보드 복사 (즉시 구현)**

관리자 대시보드에서 초대 코드 생성 시:
```javascript
// admin-dashboard.html
async function createInviteCode() {
  const data = {
    companyId: 'company_abc',
    storeId: 'store_bucheon_city',
    storeName: '부천시청점',
    role: 'staff',
    maxUses: 50,
    expiresAt: null
  };
  
  const createFunction = firebase.functions().httpsCallable('createInviteCode');
  const result = await createFunction(data);
  
  if (result.data.ok) {
    const inviteUrl = result.data.inviteUrl;
    // 예: https://your-domain.web.app/employee-register.html?code=ABC2025-STAFF-X7K
    
    // ⭐ 클립보드 복사
    await navigator.clipboard.writeText(inviteUrl);
    
    // 안내 메시지
    alert(`
      ✅ 초대 링크가 생성되었습니다!
      
      📋 클립보드에 복사되었습니다.
      
      직원에게 카카오톡/문자로 링크를 전송하세요:
      ${inviteUrl}
    `);
    
    // 관리자는 수동으로 카카오톡/문자 앱에 붙여넣기
  }
}
```

**v1 장점:**
- 외부 API 불필요
- 즉시 구현 가능
- 추가 비용 없음

**v1 단점:**
- 관리자가 수동으로 붙여넣기 필요

---

**v2: SMS/카카오톡 API 자동 발송 [미검증]**

[미검증] 외부 서비스 연동 필요 - 사업 검증 후 진행 권장

**필요한 외부 서비스:**
1. **SMS 발송**: NHN Cloud SMS, SENS (네이버), Twilio
2. **카카오톡 알림톡**: 카카오톡 비즈니스 메시지 API

**예상 구현 (Cloud Function):**
```javascript
exports.sendInviteMessage = functions.https.onCall(async (data, context) => {
  // [미검증] 인증 & 권한 확인
  
  const { phoneNumber, inviteUrl, messageType } = data;
  // messageType: 'sms' | 'kakaotalk'
  
  if (messageType === 'sms') {
    // [미검증] SMS API 호출
    await sendSMS(phoneNumber, `
      [맛남살롱] 직원 초대 링크
      
      아래 링크를 클릭하여 회원가입하세요:
      ${inviteUrl}
      
      문의: 031-123-4567
    `);
  } else if (messageType === 'kakaotalk') {
    // [미검증] 카카오톡 API 호출
    await sendKakaoMessage(phoneNumber, {
      template: 'invite_employee',
      variables: { inviteUrl }
    });
  }
  
  return { ok: true };
});
```

**v2 비용 예상 [미검증]:**
- SMS: 건당 10-20원
- 카카오톡 알림톡: 건당 8-15원

**v2 추가 작업 [미검증]:**
- SMS 서비스 가입 & API 키 발급
- 카카오톡 비즈니스 채널 개설 & 템플릿 등록
- Cloud Functions에 API 연동 코드 추가

**권장사항:**
1. **Phase 1**: v1 (클립보드 복사)부터 구현
2. **사용자 피드백** 수집 후 v2 필요성 판단
3. v2 필요 시 **별도 작업**으로 진행

---

## 마이그레이션 전략

### ⚠️ 중요: 실제 운영 중 아님

사장님 확인사항:
- 현재 서비스 미운영 (개발 단계)
- **마이그레이션 불필요** - 기존 데이터 무시하고 새로 시작

### 초기 데이터 설정 순서

```
1. Company 생성
   ├─ companies/{company_abc}
   └─ companyId: "company_abc"

2. ⭐ Super Admin 계정 생성 (플랫폼 관리자)
   ├─ Firebase Auth에 수동 생성
   ├─ users/{super_admin_uid}
   │   ├─ role: "admin" (Firestore)
   │   └─ companyId: "platform" (특수값)
   └─ Firebase Admin SDK로 Custom Claims 설정:
       ```
       admin.auth().setCustomUserClaims(superAdminUid, {
         super_admin: true
       });
       ```

3. Admin 계정 생성 (회사 관리자)
   ├─ Firebase Auth에 수동 생성
   └─ users/{admin_uid}
       ├─ companyId: "company_abc"
       ├─ role: "admin"
       └─ status: "active"

4. Store 생성
   ├─ stores/{store_bucheon_city}
   ├─ stores/{store_sangdong}
   └─ stores/{store_bucheon_station}
       └─ 모두 companyId: "company_abc"

5. 초대 코드 생성
   └─ company_invites/{random_id}
       ├─ code: "ABC2025-STAFF-X7K"
       ├─ companyId: "company_abc"
       ├─ storeId: "store_bucheon_city"
       ├─ role: "staff"
       └─ status: "active"

6. 직원 가입 테스트
   └─ employee-register.html?code=ABC2025-STAFF-X7K
```

### ⭐ Super Admin Custom Claims 설정 방법

**Firebase Admin SDK 사용 (Node.js):**
```javascript
// Firebase Admin SDK 초기화
const admin = require('firebase-admin');
admin.initializeApp();

// Super Admin Custom Claims 설정
async function setSuperAdmin(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, {
      super_admin: true
    });
    
    console.log(`✅ Super Admin 권한이 설정되었습니다: ${uid}`);
    
    // 사용자에게 재로그인 요청 필요 (토큰 갱신)
  } catch (error) {
    console.error('Super Admin 설정 실패:', error);
  }
}

// 실행
setSuperAdmin('super_admin_uid_here');
```

**Firebase Console에서 확인:**
```javascript
// 클라이언트에서 토큰 확인
firebase.auth().currentUser.getIdTokenResult()
  .then((idTokenResult) => {
    if (idTokenResult.claims.super_admin) {
      console.log('✅ Super Admin 권한 확인');
    }
  });
```

---

## 구현 우선순위

### Phase 1: 설계 & 문서화 ✅ (완료)
- [x] 멀티테넌트 데이터 모델 설계
- [x] Firestore Rules v3.1 설계 (super_admin 추가)
- [x] 초대 코드 시스템 설계 (1:1 단순화)
- [x] Cloud Functions 설계 (초대 링크 자동 생성)
- [x] 초대 링크 공유 기능 설계 (v1: 클립보드)
- [x] 이 문서 작성 v3.1

### Phase 2: 핵심 인프라 구축 (다음 단계)
1. **Firestore Rules v3.1 작성 & 배포**
   - firestore.rules 파일 업데이트
   - ⭐ super_admin Helper 함수 추가
   - 컬렉션별 Rules에 super_admin 권한 추가
   - Firebase Console에 배포

2. **Cloud Functions 구현**
   - verifyInviteCode 함수 (v3.1 단순화)
   - recordInviteUse 함수
   - createInviteCode 함수 (⭐ inviteUrl 생성)
   - 로컬 테스트

3. **초기 데이터 설정**
   - company_abc 문서 생성
   - stores 문서에 companyId 추가
   - ⭐ super_admin 계정 설정 (Custom Claims)
   - admin 계정 설정
   - 초대 코드 생성 (v3.1 스키마)

### Phase 3: 프론트엔드 적용 (최종 단계)
1. **회원가입 플로우 개편 (v3.1)**
   - employee-register.html 수정
   - ⭐ URL 파라미터 코드 자동입력
   - ⭐ 매장 선택 UI 제거 (정보 표시만)
   - Cloud Functions 연동

2. **관리자 대시보드 업데이트**
   - 초대 코드 생성 UI
   - ⭐ 클립보드 복사 기능 (v1)

3. **로그인 시스템 업데이트**
   - auth.js 테넌트 컨텍스트 추가
   - config.js 확장
   - 로그인 후 컨텍스트 설정

3. **쿼리 수정**
   - attendance 쿼리
   - schedules 쿼리
   - salaries 쿼리
   - 기타 컬렉션 쿼리

4. **통합 테스트**
   - 회원가입 → 로그인 → 데이터 조회
   - 회사 간 격리 확인
   - 권한 체계 확인

---

## 다음 단계

**Phase 1 완료 ✅ (v3.1)**

**⭐ v3.1 주요 변경사항 요약:**
1. ✅ 초대 코드 1:1 단순화 (매장 전용 코드)
2. ✅ 매장 선택 UI 제거 (자동 배정)
3. ✅ super_admin 역할 추가 (플랫폼 관리자)
4. ✅ 초대 링크 자동 생성 + 클립보드 복사
5. ✅ URL 파라미터 코드 자동입력

**사장님 확인 사항:**
1. ✅ 2단계 구조 (Company → Store) 승인 완료
2. ✅ 초대 코드 1:1 매칭 승인 완료
3. ✅ 역할(role) 계층 승인 완료
4. ✅ 초대 링크 공유 v1 (클립보드) 승인 완료
5. 📋 v2 (SMS/카카오톡 API)는 [미검증] 단계 - 추후 검토

**확인 완료 후:**
→ **Phase 2: 핵심 인프라 구축** 시작

---

## 변경 이력

### v3.1 (2025-11-16)
- 초대 코드 스키마 단순화 (1:1 매칭)
- super_admin 역할 추가 (Firebase Custom Claims)
- 초대 링크 자동 생성 기능
- employee-register.html UI 변경 (매장 선택 제거)
- verifyInviteCode 함수 단순화

### v3.0 (2025-11-16)
- 초기 멀티테넌트 설계
- 2단계 구조 (Company → Store)
- 초대 코드 시스템 설계
- Firestore Rules v3.0 설계

---

**작성:** GenSpark AI  
**버전:** v3.1  
**검토 필요:** 사장님  
**다음 작업:** Phase 2 구현 시작 (사장님 승인 후)
