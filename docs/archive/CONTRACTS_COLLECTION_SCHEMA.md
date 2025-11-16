# Contracts Collection 필드 구조 (통일된 표준)

## 문서 ID
- **형식**: `C{timestamp}` (예: `C1731398400000`)

## 필수 필드

### 1. 계약서 기본 정보
```javascript
{
  // 계약서 식별
  id: "C1731398400000",                    // 계약서 ID (문서 ID와 동일)
  createdAt: "2025-01-15T12:00:00.000Z",   // ISO 8601 형식
  createdBy: "adminUID123",                // 작성자 UID
  signLink: "https://...",                  // 서명 링크
  contractDate: "2025년 1월 15일",         // 계약 일자 (한글)
  
  // 계약 유형
  contractType: "정규직" | "계약직" | "아르바이트" | "인턴",
  isAdditional: false,                      // 추가 계약서 여부 (대체근무 등)
}
```

### 2. 직원 정보 (Employee Information)
```javascript
{
  // ⭐ 핵심: employeeId = users 컬렉션의 문서 ID (Firebase Auth UID)
  employeeId: "abc123xyz456",               // 직원 UID (users 컬렉션 doc.id)
  employeeName: "김연아",                   // 이름
  employeeBirth: "951225-2******",          // 주민등록번호
  employeeAddress: "서울시 강남구...",      // 주소
  employeePhone: "010-1234-5678",          // 연락처
  employeePosition: "매니저",               // 직책 (employeePosition으로 통일)
  position: "매니저",                       // 호환성 유지용
}
```

### 3. 회사(매장) 정보 (Company Information)
```javascript
{
  storeId: "1",                             // stores 컬렉션의 문서 ID
  workStore: "맛남살롱 부천시청점",         // 근무 매장명
  companyName: "맛남살롱 부천시청점",       // 회사명
  companyCEO: "홍길동",                     // 대표자
  companyBusinessNumber: "123-45-67890",   // 사업자등록번호
  companyPhone: "032-123-4567",            // 연락처
  companyAddress: "경기도 부천시...",      // 주소
}
```

### 4. 계약 기간 (Contract Period)
```javascript
{
  // ⭐ 신규 표준 필드명
  contractStartDate: "2025-01-15",         // 시작일 (YYYY-MM-DD)
  contractEndDate: "2026-01-14",           // 종료일 (YYYY-MM-DD) 또는 "기간의 정함이 없음"
  
  // 호환성 유지용 (구 필드명)
  startDate: "2025-01-15",
  endDate: "2026-01-14",
}
```

### 5. 근무 일정 (Work Schedule)
```javascript
{
  // ⭐ 신규: 요일별 다른 시간 지원 (우선 사용)
  schedules: [
    {
      days: ["월", "화", "수"],
      startHour: 9,
      startMinute: 0,
      endHour: 18,
      endMinute: 0
    },
    {
      days: ["목", "금"],
      startHour: 10,
      startMinute: 0,
      endHour: 19,
      endMinute: 0
    }
  ],
  
  // 호환성: 단순 형식 (구 방식)
  schedule: {
    days: "월,화,수,목,금",
    time: "09:00 - 18:00",
    breakTime: "1시간"
  },
  workDays: "월,화,수,목,금",
  workTime: "09:00 - 18:00",
  breakTime: "1시간",
}
```

### 6. 급여 정보 (Salary Information)
```javascript
{
  // ⭐ 신규 표준 필드명 (우선 사용)
  salaryType: "hourly" | "monthly" | "annual",  // 시급/월급/연봉
  salaryAmount: 10000,                           // 금액 (숫자)
  salaryPaymentDay: "매월 말일",                 // 지급일
  
  // 호환성 유지용 (구 필드명)
  wageType: "시급",
  wageAmount: "10000",
  paymentDay: "매월 말일",
  
  paymentMethod: "계좌이체" | "현금",
  
  // 매장별 급여 계산 설정
  salaryCalculationType: "prev_month_full" | "current_month_worked",
  salaryCalculationPeriod: {
    startMonth: 1,
    startDay: 1,
    endMonth: 12,
    endDay: 31
  },
}
```

### 7. 급여 지급 항목 (Allowances)
```javascript
{
  allowances: {
    weeklyHoliday: true,    // 주휴수당
    overtime: true,         // 연장근로수당
    night: false,          // 야간근로수당
    holiday: true          // 휴일근로수당
  }
}
```

### 8. 4대보험 (Insurance)
```javascript
{
  insurance: {
    type: "all" | "partial" | "none",  // 전체/일부/없음
    pension: true,          // 국민연금
    health: true,          // 건강보험
    employment: true,      // 고용보험
    workComp: true,        // 산재보험
    severancePay: true     // 퇴직금
  }
}
```

### 9. 계약 내용 (Contract Content)
```javascript
{
  contractContent: "제1조 근로계약의 목적\n본 계약은...",  // 계약서 본문
  contractBody: "...",                                    // 호환성 유지용
}
```

### 10. 서명 정보 (Signature)
```javascript
{
  signedAt: null,                      // 서명 시각 (서명 전: null)
  isSigned: false,                     // 서명 여부
  status: "pending" | "active",        // 상태 (pending: 미서명, active: 서명완료)
}
```

## 계약서 조회 우선순위

### 스케줄 생성/조회 시:
1. **employeeId로 조회** (가장 정확)
   ```javascript
   .where('employeeId', '==', userUID)
   ```

2. **폴백: employeeName + employeeBirth로 조회**
   ```javascript
   .where('employeeName', '==', name)
   .where('employeeBirth', '==', birth)
   ```

### 급여 계산 시:
- **salaryType**, **salaryAmount** 우선 사용
- 없으면 **wageType**, **wageAmount** 사용

### 계약 기간 확인 시:
- **contractStartDate**, **contractEndDate** 우선 사용
- 없으면 **startDate**, **endDate** 사용

### 직책 표시 시:
- **employeePosition** 우선 사용
- 없으면 **position** 사용

## 중요 사항

### ⚠️ employeeId 필드는 필수!
- **반드시** users 컬렉션의 문서 ID(Firebase Auth UID)와 일치해야 함
- 계약서 작성 시 `employeeSelect.value`가 제대로 전달되는지 확인
- 스케줄 자동 생성의 핵심 연결고리

### ⚠️ 신규 필드명 사용 권장
- `salaryType`, `salaryAmount` (✅ 신규)
- `wageType`, `wageAmount` (❌ 구버전)
- 호환성을 위해 둘 다 저장하되, 조회 시 신규 필드 우선

### ⚠️ schedules 배열 vs 단순 문자열
- `schedules` 배열: 요일별 다른 시간 지원 (우선)
- `workDays`, `workTime`: 단순 형식 (폴백)

## Firestore 인덱스 필요 항목

```
contracts
- employeeId (ASC) + createdAt (DESC)
- employeeName (ASC) + employeeBirth (ASC)
- storeId (ASC) + status (ASC)
```
