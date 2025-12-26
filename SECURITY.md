# 보안 가이드 (Security Guide)

> ABC Staff System의 보안 정책 및 Firestore Security Rules

**버전**: v1.1.0  
**최종 업데이트**: 2025-01-17  
**보안 패치**: v0.17.0 적용 완료

---

## 📋 목차

1. [보안 원칙](#보안-원칙)
2. [Firebase Admin SDK](#firebase-admin-sdk)
3. [Firestore Security Rules](#firestore-security-rules)
4. [API 보안](#api-보안)
5. [환경 변수 관리](#환경-변수-관리)
6. [Legacy 파일 보안](#legacy-파일-보안)
7. [보안 체크리스트](#보안-체크리스트)

---

## 🔒 보안 원칙

### **핵심 원칙**

1. **Multi-Tenant 격리**: `companyId` 기반 완전한 데이터 격리
2. **역할 기반 접근 제어 (RBAC)**: 5단계 역할 (super_admin ~ employee)
3. **최소 권한 원칙**: 필요한 최소한의 권한만 부여
4. **서버 사이드 검증**: 중요한 로직은 Admin SDK 사용
5. **Client SDK Rules**: 모든 Client 요청은 Firestore Rules 검증

---

## 🔥 Firebase Admin SDK

### **개요**

**Firebase Admin SDK**는 서버 사이드에서 Firestore Rules를 **우회**하고 완전한 권한으로 데이터에 접근할 수 있습니다.

### **사용 목적**

- ✅ **초대 코드 검증**: Enumeration Attack 방지
- ✅ **배치 작업**: 대량 데이터 생성/수정
- ✅ **관리자 전용 작업**: 플랫폼 관리자 권한
- ✅ **API Route**: 서버 로직 실행

### **초기화 코드**

**파일**: `lib/firebase-admin.ts`

```typescript
import * as admin from 'firebase-admin';

// 환경 변수 기반 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
```

### **사용 예시**

```typescript
// ✅ API Route에서 Admin SDK 사용
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  // Firestore Rules 우회 - 모든 데이터 접근 가능
  const snapshot = await adminDb
    .collection('invitation_codes')
    .where('code', '==', code)
    .get();
  
  // ... 로직
}
```

### **⚠️ 주의사항**

- ❌ **클라이언트에서 절대 사용 금지**
- ❌ **환경 변수 노출 금지**
- ✅ **API Route에서만 사용**
- ✅ **Service Account Key 안전 관리**

---

## 🛡️ Firestore Security Rules

### **Rules 파일 위치**

**파일**: `firestore.rules`

### **핵심 Rules**

#### **1. 헬퍼 함수**

```javascript
// 인증 확인
function isAuthenticated() {
  return request.auth != null;
}

// 역할 가져오기
function getUserRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}

// 회사 ID 가져오기
function getUserCompanyId() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId;
}

// Super Admin 확인
function isSuperAdmin() {
  return isAuthenticated() && getUserRole() == 'super_admin';
}

// Admin 확인
function isAdmin() {
  return isAuthenticated() && getUserRole() == 'admin';
}

// Manager 이상 확인
function isManager() {
  return isAuthenticated() && getUserRole() in ['admin', 'manager'];
}

// Store Manager 이상 확인
function isStoreManager() {
  return isAuthenticated() && getUserRole() in ['admin', 'manager', 'store_manager'];
}

// 같은 회사 확인
function isSameCompany(companyId) {
  return isAuthenticated() && getUserCompanyId() == companyId;
}

// 본인 확인
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}
```

#### **2. 주요 컬렉션 Rules**

##### **companies (회사)**

```javascript
match /companies/{companyId} {
  // 읽기: 본인 회사만
  allow read: if isSameCompany(companyId);
  
  // 생성: 회원가입 시
  allow create: if isAuthenticated()
    && request.resource.data.keys().hasAll(['companyId', 'companyName', 'email']);
  
  // 수정: Admin만
  allow update: if isAdmin() && isSameCompany(companyId);
  
  // 삭제: 금지
  allow delete: if false;
}
```

##### **users (사용자)** ⭐ v0.17.0 보안 강화

```javascript
match /users/{userId} {
  // 읽기: 본인 또는 Manager 이상
  allow read: if isAuthenticated() 
    && (
      isOwner(userId) 
      || isManager()
    );
  
  // 생성: 인증된 사용자
  allow create: if isAuthenticated();
  
  // 수정: 본인 또는 Manager (role/companyId 변경 차단) 🔒 보안 강화
  allow update: if isAuthenticated()
    && (isOwner(userId) || (isManager() && isSameCompany(resource.data.companyId)))
    && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'companyId']) 
        || isSuperAdmin());
  
  // 삭제: Manager만
  allow delete: if isManager() && isSameCompany(resource.data.companyId);
}
```

**🔒 v0.17.0 보안 강화 내용:**
- `role`, `companyId` 필드 변경 시 `super_admin` 권한 필수
- 일반 직원이 자신의 권한을 admin으로 변경하는 공격 차단
- 회사 이동 공격 차단

##### **attendance (출퇴근)**

```javascript
match /attendance/{attendanceId} {
  // 읽기: 본인 또는 Store Manager 이상
  allow read: if isAuthenticated()
    && (isOwner(resource.data.userId) || (isStoreManager() && isSameCompany(resource.data.companyId)));
  
  // 생성: 본인 또는 Store Manager 이상
  allow create: if isAuthenticated()
    && request.resource.data.keys().hasAll(['userId', 'companyId', 'storeId', 'date'])
    // 🔒 출퇴근 시간 조작 방지: 서버 시간 ±2분 이내
    && (!request.resource.data.keys().hasAny(['clockIn']) 
      || (request.resource.data.clockIn is timestamp 
        && request.resource.data.clockIn.toMillis() >= request.time.toMillis() - 120000
        && request.resource.data.clockIn.toMillis() <= request.time.toMillis() + 120000)
    )
    && (
      isOwner(request.resource.data.userId)
      || (isStoreManager() && isSameCompany(request.resource.data.companyId))
    );
  
  // 수정: Store Manager 또는 본인 (퇴근 시간만)
  allow update: if isAuthenticated()
    && (
      (isStoreManager() && isSameCompany(resource.data.companyId))
      || (isOwner(resource.data.userId)
        && request.resource.data.keys().hasAny(['clockOut'])
        && request.resource.data.clockOut is timestamp
        // 🔒 퇴근 시간 조작 방지: 서버 시간 ±2분 이내
        && request.resource.data.clockOut.toMillis() >= request.time.toMillis() - 120000
        && request.resource.data.clockOut.toMillis() <= request.time.toMillis() + 120000
      )
    );
  
  // 삭제: Manager만
  allow delete: if isManager() && isSameCompany(resource.data.companyId);
}
```

##### **salary (급여)**

```javascript
match /salary/{salaryId} {
  // 읽기: 본인 또는 Manager 이상
  allow read: if isAuthenticated()
    && (isOwner(resource.data.userId) || (isManager() && isSameCompany(resource.data.companyId)));
  
  // 생성: Manager만
  allow create: if isManager()
    && request.resource.data.keys().hasAll(['userId', 'companyId'])
    && isSameCompany(request.resource.data.companyId);
  
  // 수정: Manager만
  allow update: if isManager() && isSameCompany(resource.data.companyId);
  
  // 삭제: Admin만
  allow delete: if isAdmin() && isSameCompany(resource.data.companyId);
}
```

##### **invitation_codes (플랫폼 초대 코드)**

```javascript
match /invitation_codes/{codeId} {
  // 읽기: Super Admin만 (API Route는 Admin SDK 사용)
  allow read: if isSuperAdmin();
  
  // 생성/수정/삭제: Super Admin만
  allow create, update, delete: if isSuperAdmin();
}
```

##### **subscription_plans (구독 플랜)**

```javascript
match /subscription_plans/{planId} {
  // 읽기: 전체 공개 (Landing Page)
  allow read: if true;
  
  // 생성/수정/삭제: Super Admin만
  allow create, update, delete: if isSuperAdmin();
}
```

#### **3. 기본 규칙 (Deny All)**

```javascript
// 모든 다른 경로는 차단
match /{document=**} {
  allow read, write: if false;
}
```

### **Rules 배포**

```bash
# Firebase CLI로 배포
firebase deploy --only firestore:rules

# 또는 Firebase Console에서 수동 배포
# https://console.firebase.google.com/project/[PROJECT_ID]/firestore/rules
```

---

## 🔐 API 보안

### **초대 코드 검증 API**

**파일**: `app/api/verify-invite-code/route.ts`

#### **보안 기능**

1. **Rate Limiting**
   - IP 기반: 1분에 최대 10번
   - 무차별 대입 공격 방지

2. **Input Validation**
   - 코드 길이: 4-20자
   - 타입 검증: string only

3. **Server-Side 검증**
   - Admin SDK 사용 (Rules 우회)
   - 사용 여부, 만료일, 최대 사용 횟수 체크

4. **최소 정보 반환**
   - 성공 시: `{success: true, planId, planName}`
   - 실패 시: 일반적인 에러 메시지 (정보 누출 방지)

#### **구현 예시**

```typescript
// Rate Limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1분
const MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// 사용
if (!checkRateLimit(clientIP)) {
  return NextResponse.json(
    { success: false, error: '너무 많은 요청입니다.' },
    { status: 429 }
  );
}
```

---

## 🔑 환경 변수 관리

### **파일**: `.env.local`

**⚠️ 절대 Git에 커밋하지 마세요!**

#### **클라이언트 노출 가능 (`NEXT_PUBLIC_` 접두사)**

```env
# Firebase Client SDK (브라우저에서 접근 가능)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# 공공 API (브라우저에서 접근 가능)
NEXT_PUBLIC_HOLIDAY_API_KEY=your_holiday_api_key
```

#### **서버 전용 (접두사 없음)**

```env
# Firebase Admin SDK (서버에서만 접근 가능)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### **환경 변수 사용**

```typescript
// ✅ 서버 사이드 (API Route, Server Component)
const adminProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID;

// ✅ 클라이언트 사이드 (Browser)
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// ❌ 절대 금지: 서버 전용 변수를 클라이언트에서 사용
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY; // ❌
```

### **.gitignore 설정**

```gitignore
# 환경 변수 파일
.env
.env.local
.env*.local

# Service Account Key
serviceAccountKey.json

# PM2
.pm2/

# Next.js
.next/
out/
```

---

## 🚨 Legacy 파일 보안

### **문제점**

레거시 HTML 파일(`public/*.html`)을 방치하면:

1. **인증 우회**: Next.js 미들웨어를 무시하고 직접 접근 가능
2. **Firebase 키 노출**: HTML에 포함된 Firebase Config
3. **Firestore Rules 취약점**: Legacy 코드 + 느슨한 Rules = 데이터 누출

### **해결 방법**

#### **✅ 완료된 조치 (v0.12.0)**

1. **`public/*.html` → `_legacy/` 이동**
   - 16개 HTML 파일 격리
   - 2개 CSS 폴더 격리

2. **`_legacy/README.md` 작성**
   - 보안 경고 문서화
   - 7가지 기술 부채 명시
   - 마이그레이션 체크리스트

3. **README.md 보안 경고 추가**
   - 상단에 Critical 경고
   - 안전한 사용법 안내

#### **⚠️ 절대 금지**

```bash
# ❌ 절대 실행 금지!
cp _legacy/*.html public/
mv _legacy/admin-dashboard.html public/
```

#### **✅ 안전한 사용법**

```bash
# ✅ 참고용으로만 사용
cat _legacy/admin-dashboard.html  # 코드 확인
grep "function" _legacy/js/*.js   # 로직 분석

# ✅ React로 재구현
# 기능은 100% 동일하게, 디자인은 Shadcn/UI로 전환
```

---

## ✅ 보안 체크리스트

### **개발 시작 전**

- [ ] `SECURITY.md` 읽기
- [ ] Firestore Rules 확인
- [ ] 환경 변수 설정 확인
- [ ] `.gitignore` 검증

### **코드 작성 중**

- [ ] 중요 로직은 Admin SDK 사용
- [ ] Client SDK는 Rules 검증 통과하는지 확인
- [ ] `companyId` 필터 추가 (Multi-Tenant)
- [ ] 타임스탬프 조작 방지 (`serverTimestamp()`)
- [ ] 환경 변수 하드코딩 금지 ⭐ (v0.17.0 적용)
- [ ] `console.log`로 민감 정보 노출 금지 ⭐ (v0.17.0 적용)

### **API Route 작성 시**

- [ ] Rate Limiting 추가 (서버리스 환경 고려) ⭐ (v0.17.0 수정)
- [ ] Input Validation 구현
- [ ] 에러 메시지 일반화 (정보 누출 방지)
- [ ] Admin SDK 사용 (Rules 우회)

### **Firestore Rules 작성 시**

- [ ] role/companyId 변경 차단 구현 ⭐ (v0.17.0 적용)
- [ ] super_admin만 권한 변경 가능
- [ ] 업데이트 시 민감 필드 보호

### **배포 전**

- [ ] `.env.local` Git 커밋 안 되었는지 확인
- [ ] `serviceAccountKey.json` Git 커밋 안 되었는지 확인
- [ ] Firestore Rules 배포
- [ ] 환경 변수 Production 설정
- [ ] middleware.ts 보호 경로 확인 ⭐ (v0.17.0 신규)

### **배포 후**

- [ ] Firestore Rules 테스트
- [ ] API Rate Limiting 테스트
- [ ] 권한 매트릭스 테스트
- [ ] Legacy 파일 접근 차단 확인

---

## 🔗 관련 문서

- [README.md](./README.md) - 프로젝트 개요
- [STRUCTURE.md](./STRUCTURE.md) - 사용자 계층 구조
- [FIRESTORE_COLLECTIONS.md](./FIRESTORE_COLLECTIONS.md) - 컬렉션 명세
- [_legacy/README.md](./_legacy/README.md) - 레거시 보안 경고

---

## 📞 보안 이슈 보고

보안 취약점을 발견하셨나요?

- **이메일**: security@abc-staff-system.com
- **GitHub Issues**: (보안 이슈는 Private으로)

---

**최종 업데이트**: 2024-12-16  
**버전**: v1.0.0
