# ABC Staff System - Field Naming Standard (필드명 표준 가이드)

## ⚠️ 중요 공지 (CRITICAL WARNING)

**모든 개발자는 이 문서를 반드시 숙지하고 작업해야 합니다.**  
필드명 불일치는 데이터 무결성 손상 및 필터링 실패를 초래합니다.

---

## 📋 목차
1. [핵심 원칙](#핵심-원칙)
2. [주요 필드 표준](#주요-필드-표준)
3. [각 Collection별 표준 필드](#각-collection별-표준-필드)
4. [치명적 실수 사례 & 회피 방법](#치명적-실수-사례--회피-방법)
5. [Save 함수 작성 규칙](#save-함수-작성-규칙)

---

## 핵심 원칙

### 1. **표준 필드명 우선 사용**
- 새 데이터 저장 시 **반드시 표준 필드명**을 사용합니다.
- Legacy 필드명은 **읽기 전용 호환성**을 위해서만 존재합니다.

### 2. **필터링은 표준 필드로만**
- 모든 `where()`, `filter()` 연산은 **표준 필드명**으로 수행합니다.
- Legacy 필드와 혼용하면 **데이터 유실**이 발생합니다.

### 3. **Dual Field (이중 필드) 최소화**
- Legacy 마이그레이션이 완료되면 이중 필드를 제거합니다.
- 새 코드에서는 이중 필드를 생성하지 않습니다.

---

## 주요 필드 표준

### 1️⃣ **매장 식별 (Store Identification)**

| 표준 필드명 | 타입 | 설명 | Legacy 필드 (읽기만) |
|------------|------|------|---------------------|
| `storeId` | string (UUID) | 매장 고유 ID | `store` (매장명) |
| `storeName` | string | 매장 이름 (표시용) | - |

#### ⚠️ 치명적 실수
```typescript
// ❌ 잘못된 예: store (매장명)로 필터링
const q = query(collection(db, 'employees'), where('store', '==', '부천시청점'))
// → storeId로 저장된 데이터는 필터링 안 됨!

// ✅ 올바른 예: storeId로 필터링
const q = query(collection(db, 'employees'), where('storeId', '==', 'store-uuid-123'))
```

---

### 2️⃣ **사용자/직원 식별 (User Identification)**

| 표준 필드명 | 타입 | 설명 | Legacy 필드 (읽기만) |
|------------|------|------|---------------------|
| `userId` | string (Firebase UID) | Firebase Auth UID | `uid`, `employeeId` |
| `employeeName` | string | 직원 이름 | - |
| `employeeBirth` | string (YYMMDD) | 생년월일 (6자리) | - |

#### ⚠️ 치명적 실수
```typescript
// ❌ 잘못된 예: 혼용
const contract = {
  uid: 'abc123',           // Legacy
  employeeId: 'def456',    // Legacy
  userId: 'firebase-uid'   // 표준
}
// → 어떤 필드로 조회해야 할지 모호함

// ✅ 올바른 예: 표준 필드만 사용
const contract = {
  userId: 'firebase-uid',
  employeeName: '홍길동',
  employeeBirth: '901234'
}
```

---

### 3️⃣ **출퇴근 시간 (Attendance Timestamps)**

| 표준 필드명 | 타입 | 설명 | Legacy 필드 (읽기만) |
|------------|------|------|---------------------|
| `clockIn` | string (HH:mm) | 출근 시간 | `checkIn` |
| `clockOut` | string (HH:mm) | 퇴근 시간 | `checkOut` |

#### ⚠️ 치명적 실수
```typescript
// ❌ 잘못된 예: checkIn 사용
const attendance = {
  checkIn: '09:00',
  checkOut: '18:00'
}
// → 급여 계산 로직이 clockIn을 기대하면 실패

// ✅ 올바른 예: clockIn/clockOut 사용
const attendance = {
  clockIn: '09:00',
  clockOut: '18:00'
}
```

---

## 각 Collection별 표준 필드

### 📄 `users` (직원)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `userId` | string | ✅ | Firebase Auth UID |
| `companyId` | string | ✅ | 회사 UUID |
| `storeId` | string | ✅ | 매장 UUID |
| `storeName` | string | ⭕ | 매장 이름 (표시용) |
| `name` | string | ✅ | 직원 이름 |
| `birth` | string | ✅ | 생년월일 (YYMMDD) |
| `phone` | string | ✅ | 전화번호 |
| `position` | string | ⭕ | 직책 |
| `employmentStatus` | string | ✅ | 재직 상태 (employed/resigned) |
| `hireDate` | string | ✅ | 입사일 (YYYY-MM-DD) |
| `baseSalary` | number | ⭕ | 기본급 (월급제) |
| `hourlyWage` | number | ⭕ | 시급 (시급제) |

**Legacy 필드 (읽기만):**
- `uid` → `userId`
- `employeeId` → `userId`
- `store` (매장명) → `storeId`

---

### 📄 `attendance` (출퇴근 기록)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `userId` | string | ✅ | Firebase Auth UID |
| `companyId` | string | ✅ | 회사 UUID |
| `storeId` | string | ✅ | 매장 UUID |
| `date` | string | ✅ | 날짜 (YYYY-MM-DD) |
| `clockIn` | string | ⭕ | 출근 시간 (HH:mm) |
| `clockOut` | string | ⭕ | 퇴근 시간 (HH:mm) |
| `status` | string | ✅ | 상태 (present/absent/etc) |
| `isApproved` | boolean | ⭕ | 승인 여부 |

**Legacy 필드 (읽기만):**
- `checkIn` → `clockIn`
- `checkOut` → `clockOut`
- `store` (매장명) → `storeId`

---

### 📄 `contracts` (계약서)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `userId` | string | ✅ | Firebase Auth UID |
| `companyId` | string | ✅ | 회사 UUID |
| `storeId` | string | ✅ | 매장 UUID |
| `employeeName` | string | ✅ | 직원 이름 |
| `employeeBirth` | string | ✅ | 생년월일 (YYMMDD) |
| `contractType` | string | ✅ | 계약 유형 (new/additional) |
| `startDate` | string | ✅ | 계약 시작일 (YYYY-MM-DD) |
| `endDate` | string | ⭕ | 계약 종료일 (YYYY-MM-DD) |
| `position` | string | ⭕ | 직책 |
| `salaryType` | string | ✅ | 급여 유형 (monthly/hourly) |
| `salaryAmount` | number | ✅ | 급여액 |

**Legacy 필드 (읽기만):**
- `workStore` (매장명) → `storeId`
- `wageType` → `salaryType`
- `wageAmount` → `salaryAmount`

---

### 📄 `schedules` (근무 스케줄)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `companyId` | string | ✅ | 회사 UUID |
| `storeId` | string | ✅ | 매장 UUID |
| `userId` | string | ✅ | Firebase Auth UID |
| `date` | string | ✅ | 날짜 (YYYY-MM-DD) |
| `startTime` | string | ✅ | 근무 시작 시간 (HH:mm) |
| `endTime` | string | ✅ | 근무 종료 시간 (HH:mm) |

**Legacy 필드 (읽기만):**
- `store` (매장명) → `storeId`

---

### 📄 `brands` (브랜드)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `companyId` | string | ✅ | 회사 UUID |
| `brandName` | string | ✅ | 브랜드 이름 |
| `brandDescription` | string | ⭕ | 브랜드 설명 |
| `brandLogoUrl` | string | ⭕ | 브랜드 로고 URL |
| `brandPrimaryColor` | string | ⭕ | 주 색상 (HEX) |
| `brandSecondaryColor` | string | ⭕ | 보조 색상 (HEX) |

---

### 📄 `stores` (매장)

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `companyId` | string | ✅ | 회사 UUID |
| `storeId` | string | ✅ | 매장 UUID (자동 생성) |
| `storeName` | string | ✅ | 매장 이름 |
| `storeBrandId` | string | ⭕ | 브랜드 UUID |
| `storeAddress` | string | ⭕ | 주소 |
| `storePhone` | string | ⭕ | 전화번호 |
| `storeCEO` | string | ⭕ | 대표자 이름 |
| `storeBusinessNumber` | string | ⭕ | 사업자등록번호 |
| `storeSalaryPaymentDay` | number | ⭕ | 급여 지급일 |
| `salaryCalculationType` | string | ⭕ | 급여 계산 방식 |

---

## 치명적 실수 사례 & 회피 방법

### 🚨 Case 1: 필터링 실패

**문제:**
```typescript
// 직원은 storeId로 저장됨
await addDoc(collection(db, 'users'), { storeId: 'uuid-123', ... })

// 하지만 필터링은 store(매장명)로 함
const q = query(collection(db, 'users'), where('store', '==', '부천시청점'))
// → 결과: 아무것도 조회 안 됨
```

**해결:**
```typescript
// 모든 필터링을 storeId로 통일
const q = query(collection(db, 'users'), where('storeId', '==', storeId))
```

---

### 🚨 Case 2: 급여 계산 실패

**문제:**
```typescript
// 출근 데이터에 checkIn 사용
await addDoc(collection(db, 'attendance'), { checkIn: '09:00', ... })

// 급여 계산기는 clockIn 기대
const workHours = calculateHours(record.clockIn, record.clockOut)
// → 결과: clockIn이 없어서 계산 실패
```

**해결:**
```typescript
// clockIn/clockOut으로 통일
await addDoc(collection(db, 'attendance'), { clockIn: '09:00', clockOut: '18:00' })
```

---

## Save 함수 작성 규칙

### ✅ 올바른 Save 함수 예제

```typescript
async function saveEmployee(data: EmployeeFormData) {
  // 1. 표준 필드 우선 저장
  const standardData = {
    userId: data.userId,
    companyId: data.companyId,
    storeId: data.storeId,  // ✅ UUID 사용
    storeName: data.storeName,  // 표시용
    name: data.name,
    birth: data.birth,
    phone: data.phone,
    position: data.position,
    employmentStatus: data.employmentStatus || 'employed',
    hireDate: data.hireDate,
    baseSalary: data.baseSalary || 0,
    hourlyWage: data.hourlyWage || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // 2. Legacy 필드는 읽기 호환성을 위해서만 추가 (선택 사항)
  const legacyCompat = {
    store: data.storeName,  // Legacy 읽기 호환용
  }

  // 3. 표준 필드만 저장 (권장)
  await addDoc(collection(db, 'users'), standardData)
  
  // 또는 Legacy 호환이 필요하면:
  // await addDoc(collection(db, 'users'), { ...standardData, ...legacyCompat })
}
```

### ❌ 잘못된 Save 함수 예제

```typescript
async function saveEmployee(data: EmployeeFormData) {
  // ❌ 문제: Legacy 필드와 표준 필드 혼용
  const mixedData = {
    uid: data.userId,  // Legacy
    userId: data.userId,  // 표준
    store: data.storeName,  // Legacy
    storeId: data.storeId,  // 표준
    // → 어떤 필드로 필터링할지 모호함
  }

  await addDoc(collection(db, 'users'), mixedData)
}
```

---

## Migration Guideline (마이그레이션 가이드)

### Phase 1: Dual Field (현재 단계)
- 표준 필드와 Legacy 필드를 **함께 저장**
- 모든 필터링/조회는 **표준 필드로만** 수행
- Legacy 필드는 **읽기 전용 폴백**으로만 사용

### Phase 2: Legacy Deprecation
- 새 데이터는 **표준 필드만** 저장
- 기존 데이터는 **읽기 시 표준 필드로 변환**
- Legacy 필드 사용 시 경고 로그

### Phase 3: Complete Migration
- 모든 기존 데이터를 **표준 필드로 일괄 변환**
- Legacy 필드 완전 제거

---

## 체크리스트 (새 기능 개발 시)

- [ ] 표준 필드명 확인 (이 문서 참조)
- [ ] Save 함수에 표준 필드만 사용
- [ ] 필터링/조회에 표준 필드 사용
- [ ] Legacy 필드는 읽기 호환성만 고려
- [ ] Firestore Security Rules에 표준 필드 반영
- [ ] 타입 정의에 표준 필드 우선 배치

---

## 문의 및 업데이트

- **최초 작성:** 2024-12-12
- **최종 수정:** 2024-12-12
- **작성자:** Development Team
- **문의:** 이 문서에 대한 질문은 팀 리더에게 문의하세요.

---

**Remember:** 표준 필드명 준수는 데이터 무결성의 핵심입니다! 🚀
