# Firestore Collections 명세서

**⚠️ 중요: 모든 작업 시작 전 반드시 이 문서를 읽고 컬렉션명을 확인하세요!**

> 최종 업데이트: 2024-12-15  
> 버전: v1.0.0

---

## 📋 전체 컬렉션 목록

| 컬렉션명 | 상수명 | 용도 | 비고 |
|---------|--------|------|------|
| `users` | `COLLECTIONS.USERS` | 사용자 계정 (관리자/직원) | Firebase Auth UID 기준 |
| `companies` | `COLLECTIONS.COMPANIES` | 회사 정보 | Multi-tenant 기준 |
| `contracts` | `COLLECTIONS.CONTRACTS` | 근로 계약서 | 미서명 상태 |
| `signedContracts` | `COLLECTIONS.SIGNED_CONTRACTS` | 서명 완료 계약서 | 서명 후 이동 |
| `attendance` | `COLLECTIONS.ATTENDANCE` | 출퇴근 기록 | 위치 정보 포함 |
| `schedules` | `COLLECTIONS.SCHEDULES` | 근무 스케줄 | 주간 단위 |
| `salary` | `COLLECTIONS.SALARY` | 급여 정보 | 월별 급여 명세 |
| `approvals` | `COLLECTIONS.APPROVALS` | 결재 요청 | 휴가/연장근무/근무시간조정 |
| `notices` | `COLLECTIONS.NOTICES` | 공지사항 | 회사 공지 |
| `brands` | `COLLECTIONS.BRANDS` | 브랜드 정보 | 다중 브랜드 지원 |
| `stores` | `COLLECTIONS.STORES` | 매장 정보 | 브랜드별 매장 |
| `company_invites` | `COLLECTIONS.COMPANY_INVITES` | 직원 초대 코드 | **관리자가 직원 초대용** |
| `invitation_codes` | `COLLECTIONS.INVITATION_CODES` | 플랫폼 가입 초대 | **플랫폼 가입용 (회사)** |
| `subscription_plans` | `COLLECTIONS.SUBSCRIPTION_PLANS` | 구독 플랜 | 플랫폼 가격/기능 관리 |
| `open_shifts` | `COLLECTIONS.OPEN_SHIFTS` | 긴급 근무 모집 | 대타 근무 |
| `notifications` | `COLLECTIONS.NOTIFICATIONS` | 알림 | 푸시 알림 |
| `holidays` | `COLLECTIONS.HOLIDAYS` | 공휴일 | 법정 공휴일 |

---

## 🔑 주요 컬렉션 상세 설명

### 1. `users` - 사용자 계정
**컬렉션명**: `users`  
**상수명**: `COLLECTIONS.USERS`

```typescript
interface User {
  uid: string;                    // Firebase Auth UID (문서 ID와 동일)
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'store_manager' | 'employee' | 'staff';
  companyId: string;              // 소속 회사 ID
  storeId?: string;               // 소속 매장 ID (직원인 경우)
  status: 'active' | 'inactive' | 'pending' | 'resigned';
  
  // 직원 전용 필드
  birth?: string;                 // 주민등록번호
  phone?: string;
  address?: string;
  position?: string;              // 직책/직무
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**주의사항**:
- 문서 ID는 **반드시 Firebase Auth UID와 일치**
- `companyId`는 **필수 필드** (Multi-tenant)
- `status: 'pending'` = 가입 대기, `'active'` = 승인 완료

---

### 2. `companies` - 회사 정보
**컬렉션명**: `companies`  
**상수명**: `COLLECTIONS.COMPANIES`

```typescript
interface Company {
  companyId: string;              // 회사 고유 ID (자동 생성)
  companyName: string;
  businessNumber?: string;
  phone?: string;
  email: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  
  // 구독 정보
  subscription: {
    planType: 'free' | 'basic' | 'premium' | 'enterprise';
    maxUsers: number;
    startDate: Timestamp;
    endDate?: Timestamp;
  };
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 3. `company_invites` - 직원 초대 코드 ⭐
**컬렉션명**: `company_invites`  
**상수명**: `COLLECTIONS.COMPANY_INVITES`

```typescript
interface CompanyInvite {
  id: string;
  code: string;                   // 초대 코드 (6자리 영문+숫자)
  
  // 회사/매장 정보
  companyId: string;
  companyName?: string;
  storeId: string;
  storeName: string;
  
  // 권한 정보
  role: 'staff' | 'store_manager' | 'manager';
  
  // 사용 정보
  status: 'active' | 'inactive';
  maxUses: number;                // 최대 사용 횟수
  usedCount: number;              // 현재 사용 횟수
  usedBy?: string[];              // 사용한 사용자 UID 목록
  
  // 만료 정보
  expiresAt?: Timestamp;
  
  // 초대 URL
  inviteUrl: string;              // 예: https://example.com/employee-register?code=ABC123
  
  createdAt: Timestamp;
  createdBy?: string;
}
```

**주의사항**:
- **관리자가 직원을 초대할 때 사용**
- `usedCount >= maxUses`이면 더 이상 사용 불가
- `status: 'active'`일 때만 유효
- `expiresAt`이 있으면 만료일 체크 필요

**사용 예시**:
```typescript
// 초대 코드 생성
const inviteData = {
  code: 'ABC123',
  companyId: 'company_001',
  storeId: 'store_001',
  storeName: '맛남살롱 부천시청점',
  role: 'staff',
  status: 'active',
  maxUses: 5,
  usedCount: 0,
  inviteUrl: 'https://example.com/employee-register?code=ABC123',
  createdAt: serverTimestamp()
};

await addDoc(collection(db, COLLECTIONS.COMPANY_INVITES), inviteData);
```

---

### 4. `invitation_codes` - 플랫폼 가입 초대 코드
**컬렉션명**: `invitation_codes`  
**상수명**: `COLLECTIONS.INVITATION_CODES`

```typescript
interface InvitationCode {
  id: string;
  code: string;
  
  // 플랜 정보
  planId: string;
  planName: string;
  
  // 사용 여부
  isUsed: boolean;
  usedBy?: string;                // 사용한 회사 ID
  usedByName?: string;
  usedAt?: Timestamp;
  
  // 만료 정보
  expiresAt?: Timestamp;
  isExpired?: boolean;
  
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**주의사항**:
- **플랫폼에 회사가 가입할 때 사용** (관리자가 회사를 만들 때)
- `company_invites`와는 **완전히 다른 용도**
- `isUsed: true`이면 재사용 불가

---

### 5. `contracts` - 근로 계약서
**컬렉션명**: `contracts`  
**상수명**: `COLLECTIONS.CONTRACTS`

```typescript
interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  storeId: string;
  contractType: 'new' | 'additional' | 'renewal';
  
  // 계약 기간
  startDate: Timestamp;
  endDate?: Timestamp;
  
  // 근무 조건
  schedules: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
  breakTime: number;              // 분 단위
  
  // 급여 정보
  salary: {
    type: 'monthly' | 'hourly';
    amount: number;
    paymentDay: number;           // 급여일 (1-31)
  };
  
  // 수당
  allowances: {
    overtime: boolean;            // 연장근무 수당
    night: boolean;               // 야간근무 수당
    holiday: boolean;             // 휴일근무 수당
  };
  
  // 보험
  insurance: '4대보험' | '산재보험' | '없음';
  
  // 상태
  status: 'pending' | 'sent' | 'signed' | 'rejected' | 'expired';
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  sentAt?: Timestamp;
  signedAt?: Timestamp;
}
```

---

### 6. `attendance` - 출퇴근 기록
**컬렉션명**: `attendance`  
**상수명**: `COLLECTIONS.ATTENDANCE`

```typescript
interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  storeId: string;
  storeName: string;
  
  // 출근 정보
  clockIn: Timestamp;
  clockInLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  
  // 퇴근 정보
  clockOut?: Timestamp;
  clockOutLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  
  // 근무 시간
  workHours?: number;             // 실제 근무 시간 (시간 단위)
  breakTime?: number;             // 휴게 시간 (분 단위)
  
  // 상태
  status: 'working' | 'completed' | 'absent' | 'late' | 'early_leave';
  
  date: string;                   // YYYY-MM-DD
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 7. `salary` - 급여 정보
**컬렉션명**: `salary`  
**상수명**: `COLLECTIONS.SALARY`

```typescript
interface Salary {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  storeId: string;
  
  // 급여 기간
  year: number;
  month: number;
  period: string;                 // YYYY-MM
  
  // 기본급
  baseSalary: number;
  
  // 수당
  allowances: {
    overtime: number;             // 연장근무 수당
    night: number;                // 야간근무 수당
    holiday: number;              // 휴일근무 수당
    weekly: number;               // 주휴수당
  };
  
  // 공제
  deductions: {
    nationalPension: number;      // 국민연금
    healthInsurance: number;      // 건강보험
    employmentInsurance: number;  // 고용보험
    incomeTax: number;            // 소득세
    localTax: number;             // 지방세
  };
  
  // 총액
  totalAllowances: number;        // 총 수당
  totalDeductions: number;        // 총 공제
  netSalary: number;              // 실수령액
  
  // 상태
  status: 'pending' | 'confirmed' | 'paid';
  
  confirmedAt?: Timestamp;
  paidAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 8. `subscription_plans` - 구독 플랜 [플랫폼]
**컬렉션명**: `subscription_plans`  
**상수명**: `COLLECTIONS.SUBSCRIPTION_PLANS`

```typescript
interface SubscriptionPlan {
  id: string;
  name: string;                   // 플랜명 (예: Free, Basic, Premium)
  price: number;                  // 월 가격 (원)
  
  // 기능 제한
  maxUsers: number;               // 최대 직원 수
  maxStores: number;              // 최대 매장 수
  features: string[];             // 기능 목록
  
  // 상태
  isActive: boolean;              // 활성 상태
  displayOrder: number;           // 표시 순서
  
  // 스타일링
  color?: string;                 // 플랜 색상
  icon?: string;                  // 플랜 아이콘
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**주의사항**:
- **Landing Page에서 전체 공개 조회** (`allow read: if true`)
- **Super Admin만 생성/수정/삭제** 가능
- `isActive: true`인 플랜만 Landing Page에 표시

---

### 9. `open_shifts` - 긴급 구인 (대타 근무)
**컬렉션명**: `open_shifts`  
**상수명**: `COLLECTIONS.OPEN_SHIFTS`

```typescript
interface OpenShift {
  id: string;
  companyId: string;
  storeId: string;
  storeName: string;
  
  // 근무 일정
  date: string;                   // YYYY-MM-DD
  startTime: string;              // HH:mm
  endTime: string;                // HH:mm
  
  // 모집 정보
  position?: string;              // 필요 직책
  count: number;                  // 모집 인원
  description?: string;           // 상세 설명
  
  // 지원자 정보
  applicants?: Array<{
    userId: string;
    userName: string;
    appliedAt: Timestamp;
  }>;
  
  // 상태
  status: 'open' | 'closed' | 'cancelled';
  
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**주의사항**:
- **Store Manager 이상**만 생성/수정/삭제 가능
- 같은 회사 직원만 조회 가능

---

### 10. `notifications` - 알림
**컬렉션명**: `notifications`  
**상수명**: `COLLECTIONS.NOTIFICATIONS`

```typescript
interface Notification {
  id: string;
  userId: string;                 // 수신자 UID
  companyId: string;
  
  // 알림 내용
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  
  // 링크 정보 (선택)
  link?: string;                  // 클릭 시 이동 경로
  
  // 읽음 상태
  isRead: boolean;
  readAt?: Timestamp;
  
  createdBy?: string;             // 발송자 UID
  createdAt: Timestamp;
}
```

**주의사항**:
- **Manager 이상**만 생성 가능 (직원에게 알림 발송)
- 본인 알림만 조회 및 수정(읽음 처리) 가능

---

## 🎯 작업 시 체크리스트

**모든 작업 시작 전 반드시 확인:**

1. ✅ **컬렉션명 확인**: 이 문서에서 정확한 컬렉션명 확인
2. ✅ **상수 사용**: `COLLECTIONS.XXX` 상수 사용 (하드코딩 금지)
3. ✅ **타입 정의 확인**: `lib/types/` 폴더의 타입 정의 확인
4. ✅ **필드명 일관성**: 기존 코드의 필드명과 일치하는지 확인
5. ✅ **companyId 필수**: Multi-tenant 시스템이므로 companyId 필수
6. ✅ **Timestamp 안전**: `lib/utils/timestamp.ts` 헬퍼 함수 사용

---

## 🚨 자주 하는 실수

### ❌ 잘못된 예시
```typescript
// 1. 하드코딩 (절대 금지!)
const snapshot = await getDocs(collection(db, 'company_invites'));

// 2. 오타
const snapshot = await getDocs(collection(db, COLLECTIONS.COMPANY_INVITE)); // S 빠짐

// 3. 컬렉션명 혼동
const snapshot = await getDocs(collection(db, COLLECTIONS.INVITES)); // 잘못된 컬렉션
```

### ✅ 올바른 예시
```typescript
// 1. 상수 사용
const snapshot = await getDocs(collection(db, COLLECTIONS.COMPANY_INVITES));

// 2. 타입과 함께 사용
import { CompanyInvite } from '@/lib/types/invite';
const invites: CompanyInvite[] = [];
```

---

## 📚 관련 문서

- `lib/constants.ts` - 모든 상수 정의
- `lib/types/index.ts` - 모든 타입 정의
- `FIELD_NAMING_STANDARD.md` - 필드명 규칙
- `README.md` - 개발 가이드라인

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2024-12-15 | v1.0.0 | 최초 작성 - 전체 컬렉션 명세 정리 |
| 2024-12-16 | v1.1.0 | Priority 1-B: 컬렉션 3개 추가 (subscription_plans, open_shifts, notifications) |
