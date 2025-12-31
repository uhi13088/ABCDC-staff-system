# 🧹 데이터베이스 정화 스크립트 가이드

## 📋 목차

1. [개요](#개요)
2. [준비사항](#준비사항)
3. [실행 방법](#실행-방법)
4. [안전 장치](#안전-장치)
5. [수행 작업](#수행-작업)
6. [예제](#예제)
7. [문제 해결](#문제-해결)

---

## 개요

이 스크립트는 Firestore 데이터베이스의 오염된 데이터를 정화하고 표준화합니다.

**수행 작업:**
1. **숫자 필드 정화**: NaN, 콤마 포함 문자열 → 숫자 또는 0
2. **날짜 필드 정화**: 유효하지 않은 형식 → null
3. **레거시 필드명 → 표준 필드명 마이그레이션**

**대상 컬렉션:**
- `salary` - 급여 데이터
- `attendance` - 출퇴근 데이터
- `contracts` - 계약서 데이터
- `users` - 사용자 데이터

---

## 준비사항

### 1️⃣ 서비스 계정 키 다운로드

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. **프로젝트 설정** → **서비스 계정** 탭
4. **새 비공개 키 생성** 클릭
5. 다운로드한 JSON 파일을 프로젝트 루트에 `service-account-key.json`으로 저장

**⚠️ 중요: 이 파일은 절대 Git에 커밋하지 마세요!**

### 2️⃣ `.gitignore` 확인

```bash
# 이미 추가되어 있는지 확인
cat .gitignore | grep service-account-key.json

# 없다면 추가
echo "service-account-key.json" >> .gitignore
```

### 3️⃣ 의존성 설치 (필요시)

```bash
npm install --save-dev ts-node @types/node
```

---

## 실행 방법

### 🔍 DRY RUN (테스트 모드 - 권장)

실제 데이터를 변경하지 않고 **어떤 변경사항이 있을지 미리 확인**합니다.

```bash
# 모든 컬렉션 검사 (실제 변경 없음)
npm run clean-db:dry-run

# 또는
ts-node scripts/clean-db.ts --dry-run
```

### ✅ 실제 실행 (데이터 변경)

**⚠️ 주의: 실제 데이터를 수정합니다!**

```bash
# 모든 컬렉션 정화
npm run clean-db

# 특정 컬렉션만 정화
npm run clean-db:salary      # salary 컬렉션만
npm run clean-db:attendance  # attendance 컬렉션만
npm run clean-db:contracts   # contracts 컬렉션만
npm run clean-db:users       # users 컬렉션만

# 또는 직접 실행
ts-node scripts/clean-db.ts                # 모든 컬렉션
ts-node scripts/clean-db.ts salary        # 특정 컬렉션
```

---

## 안전 장치

### 1️⃣ 10초 확인 대기

실제 실행 시 10초 동안 대기하며, 이 시간 내에 키를 누르지 않으면 자동으로 취소됩니다.

```
⚠️  WARNING: 실제 데이터를 수정합니다!

계속하려면 10초 내에 아무 키나 누르세요...
취소하려면 Ctrl+C를 누르세요.
```

### 2️⃣ DRY RUN 모드

`--dry-run` 플래그를 사용하면 실제 변경 없이 시뮬레이션만 수행합니다.

### 3️⃣ 배치 처리

한 번에 500개 문서씩 배치로 처리하여 안정성을 확보합니다.

---

## 수행 작업

### 1️⃣ 숫자 필드 정화

**대상 필드 패턴:**
- `*amount`, `*Amount`
- `*pay`, `*Pay`
- `*wage`, `*Wage`
- `*salary`, `*Salary`
- `*hours`, `*Hours`
- `*pension`, `*insurance`, `*tax`, `*deduction`, `*allowance`

**변환 예시:**
```typescript
// Before
{
  salaryAmount: "3,000,000",  // 문자열 + 콤마
  hourlyWage: NaN,            // NaN
  basePay: "invalid"          // 유효하지 않은 문자열
}

// After
{
  salaryAmount: 3000000,      // 숫자
  hourlyWage: 0,              // 0으로 초기화
  basePay: 0                  // 0으로 초기화
}
```

### 2️⃣ 날짜 필드 정화

**대상 필드 패턴:**
- `*At` (createdAt, updatedAt, confirmedAt, paidAt 등)
- `*Date`, `*date`

**변환 예시:**
```typescript
// Before
{
  createdAt: "invalid-date",  // 유효하지 않은 날짜
  confirmedAt: undefined      // undefined
}

// After
{
  createdAt: null,            // null로 정화
  confirmedAt: null           // null로 정화
}
```

### 3️⃣ 레거시 필드명 → 표준 필드명 마이그레이션

**필드명 매핑:**

| **Legacy 필드** | **표준 필드** |
|---|---|
| `wage` | `salaryAmount` |
| `wageAmount` | `salaryAmount` |
| `wageType` | `salaryType` |
| `checkIn` | `clockIn` |
| `checkOut` | `clockOut` |
| `uid` | `userId` |
| `employeeId` | `userId` |
| `store` | `storeName` |

**변환 예시:**
```typescript
// Before
{
  wage: 10000,           // Legacy 필드
  checkIn: "09:00",      // Legacy 필드
  uid: "abc123"          // Legacy 필드
}

// After
{
  salaryAmount: 10000,   // 표준 필드
  clockIn: "09:00",      // 표준 필드
  userId: "abc123"       // 표준 필드
  // Legacy 필드는 제거됨
}
```

---

## 예제

### 예제 1: DRY RUN으로 테스트

```bash
$ npm run clean-db:dry-run

🔥 Firebase Admin SDK 초기화 중...

✅ 서비스 계정 키 로드 성공
✅ Firestore 연결 성공

╔═══════════════════════════════════════════════════════════╗
║         🧹 Firestore 데이터 정화 스크립트 v1.0.0         ║
╚═══════════════════════════════════════════════════════════╝

⚠️  DRY RUN 모드: 실제 업데이트는 수행하지 않습니다.

🎯 대상 컬렉션: salary, attendance, contracts, users

============================================================
🔍 [salary] 컬렉션 정화 시작
============================================================

📊 총 150개 문서 발견

📝 [doc123] 변경사항 감지
  📊 [salaryAmount] "3,000,000" → 3000000
  📅 [createdAt] Invalid date → null
  🔄 [wage] → [salaryAmount] 마이그레이션
  [DRY RUN] 실제 업데이트는 수행하지 않음

✅ [salary] 정화 완료
📊 통계:
   - 총 문서: 150개
   - 숫자 정화: 45개 필드
   - 날짜 정화: 12개 필드
   - 필드 마이그레이션: 30개 필드
   - 오류: 0개 문서

...

✅ 정화 완료!

💡 실제 업데이트를 수행하려면 --dry-run 플래그를 제거하고 다시 실행하세요.
```

### 예제 2: 특정 컬렉션만 실제 실행

```bash
$ npm run clean-db:salary

⚠️  WARNING: 실제 데이터를 수정합니다!

계속하려면 10초 내에 아무 키나 누르세요...
취소하려면 Ctrl+C를 누르세요.

[아무 키 입력]

✅ 확인되었습니다. 계속 진행합니다...

============================================================
🔍 [salary] 컬렉션 정화 시작
============================================================

📊 총 150개 문서 발견

📝 [doc123] 변경사항 감지
  📊 [salaryAmount] "3,000,000" → 3000000
  📅 [createdAt] Invalid date → null
  🔄 [wage] → [salaryAmount] 마이그레이션

✅ 배치 커밋 완료 (150개 문서)

✅ [salary] 정화 완료
📊 통계:
   - 총 문서: 150개
   - 숫자 정화: 45개 필드
   - 날짜 정화: 12개 필드
   - 필드 마이그레이션: 30개 필드
   - 오류: 0개 문서
   - 소요 시간: 5.23초
```

---

## 문제 해결

### ❌ 오류: 서비스 계정 키 파일을 찾을 수 없습니다

**원인:** `service-account-key.json` 파일이 프로젝트 루트에 없습니다.

**해결:**
1. Firebase Console에서 서비스 계정 키 다운로드
2. 프로젝트 루트에 `service-account-key.json`으로 저장
3. 또는 환경변수 설정:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

### ❌ 오류: Permission denied

**원인:** 서비스 계정에 Firestore 읽기/쓰기 권한이 없습니다.

**해결:**
1. Firebase Console → **IAM 및 관리자**
2. 서비스 계정에 **Cloud Datastore User** 역할 부여

### ❌ 오류: ts-node: command not found

**원인:** `ts-node`가 설치되지 않았습니다.

**해결:**
```bash
npm install --save-dev ts-node @types/node
```

---

## 추가 정보

### 백업 권장

**실행 전 Firestore 백업을 강력히 권장합니다!**

Firebase Console → **Firestore Database** → **백업** 탭에서 수동 백업 생성

### 실행 시간

- 소규모 DB (< 1,000 문서): 1-2분
- 중규모 DB (1,000-10,000 문서): 5-10분
- 대규모 DB (> 10,000 문서): 10분 이상

### 로그 저장

실행 결과를 파일로 저장하려면:

```bash
npm run clean-db 2>&1 | tee clean-db.log
```

---

## 📞 문의

문제가 발생하거나 질문이 있으시면 개발팀에 문의해 주세요.

**작성일**: 2025-12-31  
**버전**: 1.0.0
