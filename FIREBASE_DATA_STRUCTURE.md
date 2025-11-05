# 🗄️ Firebase 데이터 구조 설계

맛남살롱 근무관리 시스템의 Firestore 데이터베이스 구조입니다.

---

## 📊 권한 체계

### 직원용 (employee.html)
- **스텝 (step)**: 신입 직원, 기본 권한
- **직원 (staff)**: 정규 직원, 기본 권한

### 관리자용 (admin.html)
- **매니저 (manager)**: 지점별 관리자, 승인 권한
- **점장 (store_manager)**: 매장 최고 책임자, 승인 권한
- **관리자 (admin)**: 시스템 최고 관리자, 모든 권한

---

## 📁 Firestore Collections

### 1. **users** (사용자 정보)

```javascript
users/{userId}
{
  // 기본 정보
  uid: "firebase_auth_uid",           // Firebase Auth UID
  email: "user@example.com",          // 이메일 (로그인 ID)
  name: "홍길동",                      // 이름
  phone: "010-1234-5678",             // 전화번호
  birth: "1995-05-15",                // 생년월일
  
  // 권한 및 소속
  role: "staff",                      // step, staff, manager, store_manager, admin
  userType: "employee",               // employee 또는 admin
  store: "부천시청점",                 // 소속 매장
  position: "바리스타",                // 직책
  
  // 계정 상태
  status: "active",                   // pending, active, inactive, resigned
  approvedBy: "admin_uid",            // 승인한 관리자 UID
  approvedAt: Timestamp,              // 승인 일시
  
  // 주소 정보
  address: "경기도 부천시...",         // 주소
  
  // 급여 정보
  wageType: "시급",                   // 시급, 월급, 일급
  wageAmount: 10500,                  // 급여액
  
  // 가입 정보
  createdAt: Timestamp,               // 가입 신청 일시
  joinedAt: Timestamp,                // 최종 가입 완료 일시
  updatedAt: Timestamp,               // 마지막 수정 일시
  
  // 기타
  profileImage: "gs://bucket/path",   // 프로필 이미지 (옵션)
  memo: "특이사항 메모"                // 관리자 메모 (옵션)
}
```

**인덱스:**
- `status` (단일 필드)
- `role` (단일 필드)
- `store` (단일 필드)
- `status + role` (복합 인덱스)
- `status + store` (복합 인덱스)

---

### 2. **pending_users** (가입 승인 대기)

```javascript
pending_users/{userId}
{
  // users 컬렉션과 동일한 필드
  uid: "firebase_auth_uid",
  email: "newuser@example.com",
  name: "신규직원",
  phone: "010-9999-8888",
  birth: "2000-01-01",
  
  role: "staff",                      // 요청한 권한
  userType: "employee",               // employee 또는 admin
  store: "상동점",
  position: "바리스타",
  
  address: "경기도 부천시...",
  
  // 승인 관련
  status: "pending",                  // 항상 pending
  requestedAt: Timestamp,             // 신청 일시
  
  // 승인/거부 시 기록
  reviewedBy: null,                   // 검토한 관리자 UID
  reviewedAt: null,                   // 검토 일시
  rejectReason: null                  // 거부 사유 (거부 시)
}
```

**승인 프로세스:**
1. 회원가입 → `pending_users` 컬렉션에 저장
2. 관리자 승인 → `users` 컬렉션으로 이동 + `status: active`
3. 관리자 거부 → `pending_users`에서 삭제 또는 `status: rejected`

---

### 3. **companies** (회사 정보)

```javascript
companies/{companyId}
{
  id: "company_001",                  // 회사 ID
  name: "맛남살롱 부천시청점",         // 회사명
  ceo: "대표자명",                     // 대표자
  businessNumber: "123-45-67890",    // 사업자번호
  phone: "031-123-4567",             // 회사 전화번호
  address: "경기도 부천시...",         // 회사 주소
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

### 4. **contracts** (계약서)

```javascript
contracts/{contractId}
{
  id: "C1738123456789",              // 계약서 ID
  
  // 직원 정보
  employeeId: "firebase_uid",         // 직원 UID
  employeeName: "홍길동",
  employeeBirth: "1995-05-15",
  employeePhone: "010-1234-5678",
  employeeAddress: "경기도 부천시...",
  
  // 회사 정보
  companyId: "company_001",
  companyName: "맛남살롱 부천시청점",
  companyCEO: "대표자명",
  companyBusinessNumber: "123-45-67890",
  companyPhone: "031-123-4567",
  companyAddress: "경기도 부천시...",
  
  // 계약 정보
  contractType: "정규직 근로계약서",
  workStore: "부천시청점",
  position: "바리스타",
  startDate: "2025-02-01",
  endDate: "2026-01-31",              // 또는 null (무기한)
  
  // 근무 조건
  workDays: "월, 화, 수, 목, 금",
  workTime: "09:00 ~ 18:00",
  breakTime: "12:00 ~ 13:00 (1시간)",
  
  // 근무 스케줄 (배열)
  schedules: [
    {
      index: 0,
      days: ["월", "화", "수"],
      startHour: "09",
      startMinute: "00",
      endHour: "18",
      endMinute: "00"
    }
  ],
  
  // 급여 조건
  wageType: "시급",
  wageAmount: "10500",
  paymentDay: "매월 25일",
  paymentMethod: "계좌이체",
  
  // 상태
  status: "pending",                  // pending, signed, expired
  signedAt: Timestamp,                // 서명 일시
  signatureData: "data:image/png...", // 서명 이미지 (Base64 또는 Storage URL)
  
  // 생성 정보
  createdBy: "admin_uid",             // 작성한 관리자
  createdAt: Timestamp,
  updatedAt: Timestamp,
  
  // 서명 링크
  signLink: "https://..."             // 서명 페이지 URL (옵션)
}
```

**인덱스:**
- `employeeId` (단일 필드)
- `status` (단일 필드)
- `employeeId + createdAt` (복합 인덱스, 최신순 정렬)

---

### 5. **attendance** (근태 기록)

```javascript
attendance/{attendanceId}
{
  id: "ATT20250129001",              // 근태 ID
  
  // 직원 정보
  employeeId: "firebase_uid",
  employeeName: "홍길동",
  store: "부천시청점",
  
  // 날짜 및 시간
  date: "2025-01-29",                // 근무 날짜
  clockIn: "09:00",                  // 출근 시간
  clockOut: "18:00",                 // 퇴근 시간
  
  // 근무 정보
  workType: "정규근무",               // 정규근무, 추가근무, 대체근무
  workMinutes: 540,                  // 근무 시간 (분)
  
  // 상태
  status: "정상",                     // 정상, 지각, 조퇴, 결근
  
  // 위치 정보 (옵션)
  clockInLocation: {
    lat: 37.5665,
    lng: 126.9780
  },
  clockOutLocation: {
    lat: 37.5665,
    lng: 126.9780
  },
  
  // 메모
  memo: "추가 업무 처리",             // 직원/관리자 메모
  
  // 생성 정보
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**인덱스:**
- `employeeId + date` (복합 인덱스)
- `date` (단일 필드)
- `store + date` (복합 인덱스)

---

### 6. **employee_documents** (직원 서류)

```javascript
employee_documents/{employeeId}
{
  // 통장사본
  bankAccount: {
    bankName: "국민은행",
    accountNumber: "123456-01-123456",
    accountHolder: "홍길동",
    updatedAt: Timestamp
  },
  
  // 보건증
  healthCert: {
    imageUrl: "gs://bucket/health_cert.jpg",  // Storage URL
    expiryDate: "2026-12-31",
    isExpired: false,
    updatedAt: Timestamp
  },
  
  // 신분증 사본 (옵션)
  idCard: {
    imageUrl: "gs://bucket/id_card.jpg",
    updatedAt: Timestamp
  },
  
  // 기타 서류 (배열)
  otherDocuments: [
    {
      name: "자격증",
      imageUrl: "gs://bucket/cert.jpg",
      uploadedAt: Timestamp
    }
  ],
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

### 7. **salaries** (급여 정보)

```javascript
salaries/{salaryId}
{
  id: "SAL202501_hong",              // 급여 ID (년월_직원명)
  
  // 직원 정보
  employeeId: "firebase_uid",
  employeeName: "홍길동",
  
  // 기간
  year: 2025,
  month: 1,
  periodStart: "2025-01-01",
  periodEnd: "2025-01-31",
  
  // 근무 정보
  workDays: 22,                      // 근무 일수
  totalHours: 176,                   // 총 근무 시간
  totalMinutes: 10560,               // 총 근무 시간 (분)
  
  // 급여 상세
  hourlyWage: 10500,                 // 시급
  baseSalary: 1848000,               // 기본급
  overtimePay: 0,                    // 추가 근무수당
  weeklyHolidayPay: 369600,          // 주휴수당
  
  // 공제
  insurance: 197892,                 // 4대보험
  tax: 73123,                        // 소득세
  totalDeduction: 271015,            // 총 공제액
  
  // 실수령액
  netSalary: 1946585,
  
  // 상태
  status: "pending",                 // pending, approved, paid
  paidAt: Timestamp,                 // 지급 일시
  
  // 생성 정보
  calculatedBy: "admin_uid",
  calculatedAt: Timestamp,
  updatedAt: Timestamp
}
```

**인덱스:**
- `employeeId + year + month` (복합 인덱스)
- `status` (단일 필드)

---

### 8. **notices** (공지사항)

```javascript
notices/{noticeId}
{
  id: "NOTICE_001",
  
  title: "공지사항 제목",
  content: "공지사항 내용...",
  
  // 대상
  targetStores: ["부천시청점", "상동점"],  // null이면 전체
  targetRoles: ["staff", "step"],         // null이면 전체
  
  // 중요도
  priority: "high",                  // high, normal, low
  isPinned: true,                    // 상단 고정 여부
  
  // 작성자
  authorId: "admin_uid",
  authorName: "관리자",
  
  // 일시
  createdAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt: Timestamp               // 만료 일시 (옵션)
}
```

---

### 9. **system_logs** (시스템 로그)

```javascript
system_logs/{logId}
{
  id: "LOG_20250129_001",
  
  // 액션 정보
  action: "user_approved",           // user_approved, contract_created, etc.
  actionBy: "admin_uid",
  actionByName: "관리자",
  
  // 대상
  targetType: "user",                // user, contract, attendance, etc.
  targetId: "user_uid",
  targetName: "홍길동",
  
  // 상세 정보
  details: {
    before: {...},                   // 변경 전 데이터
    after: {...},                    // 변경 후 데이터
    reason: "승인 사유"
  },
  
  // IP 및 기기
  ipAddress: "123.456.789.0",
  userAgent: "Mozilla/5.0...",
  
  timestamp: Timestamp
}
```

---

## 🔐 Security Rules 요약

### 직원 (step, staff)
- ✅ 본인 정보 읽기/수정 (role 변경 불가)
- ✅ 본인 계약서 읽기
- ✅ 본인 근태 읽기/작성
- ✅ 본인 서류 업로드/읽기
- ❌ 다른 사람 정보 접근 불가

### 관리자 (manager, store_manager, admin)
- ✅ 소속 매장 직원 정보 읽기/수정
- ✅ 계약서 작성/수정/삭제
- ✅ 근태 기록 읽기/수정
- ✅ 가입 승인/거부
- ✅ 급여 계산/조회

### 관리자 (admin만)
- ✅ 모든 매장 접근
- ✅ 관리자 계정 관리
- ✅ 시스템 설정 변경
- ✅ 시스템 로그 조회

---

## 📈 인덱스 생성 필요 목록

Firestore Console에서 수동으로 생성해야 할 복합 인덱스:

1. `users`: `status` + `role`
2. `users`: `status` + `store`
3. `contracts`: `employeeId` + `createdAt` (내림차순)
4. `attendance`: `employeeId` + `date`
5. `attendance`: `store` + `date`
6. `salaries`: `employeeId` + `year` + `month`

---

**작성일**: 2025-01-29  
**버전**: 1.0
