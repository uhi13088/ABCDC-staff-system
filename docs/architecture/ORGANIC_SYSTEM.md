# The Organic System: Grand Unification Architecture

## 🌐 핵심 철학

> **"모든 것은 유기적으로 연결되어 있다"**
> 
> **"관리자의 수동 개입은 0이다"**

하나의 이벤트가 발생하면, 시스템 전체가 자동으로 반응하여 필요한 모든 작업을 수행합니다.  
마치 살아있는 유기체처럼, 각 부분이 서로 소통하고 협력합니다.

---

## 🔄 Event-Driven Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Event Bus                              │
│          (모든 이벤트의 중앙 허브)                            │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├─ contract:signed          → Employee + Schedule 생성
       ├─ approval:approved        → Schedule + Attendance 변경
       ├─ approval:rejected        → Notification
       ├─ schedule:published       → Notification
       ├─ schedule:updated         → Notification
       ├─ schedule:deleted         → Open Shift 제안
       ├─ employee:resigned        → Schedule 정리 + Open Shift
       ├─ attendance:completed     → Salary 계산
       ├─ holiday:synced           → Schedule isHoliday 플래그 업데이트
       ├─ attendance:overtime      → Notification (승인 대기)
       └─ probation:ending         → Notification (관리자)
```

---

## 🎯 자동화 체인 (The Chains)

### Chain 1: Contract → Employee & Salary

**트리거:** 계약서 서명 완료 (`contract:signed`)

**자동화 흐름:**
```
사용자: 전자계약서 서명
         ↓
ContractService.signContract()
         ↓
EventBus.emit('contract:signed')
         ↓
     ┌──────┴──────┐
     ↓             ↓
Employee Update   Schedule Generation
     ↓             ↓
 급여 정보 동기화  3개월 스케줄 생성
     ↓             ↓
     └──────┬──────┘
            ↓
       Notification
```

**코드 예시:**
```typescript
// 1. 프론트엔드에서 서명
await ContractService.signContract(contractId, signatureData);

// 2. 시스템이 자동으로 처리
// - Employee 급여 정보 업데이트
// - 기본 스케줄 자동 생성 (계약 기간 3개월치)
// - 알림 발송

// ✅ 관리자 개입 0
```

**자동 생성되는 데이터:**
- `users` 컬렉션: salaryType, salaryAmount, workStartTime, workEndTime 업데이트
- `schedules` 컬렉션: 계약 기간 동안의 스케줄 자동 생성 (최대 3개월)
- `notifications` 컬렉션: 계약 완료 알림

---

### Chain 2: Approval → Schedule & Attendance

**트리거:** 결재 승인 (`approval:approved`)

#### 2-1. 휴가 승인 (Leave Approval)

```
사용자: 휴가 신청
         ↓
관리자: 승인 버튼 클릭
         ↓
ApprovalService.approveRequest()
         ↓
EventBus.emit('approval:approved', { type: 'leave' })
         ↓
     ┌──────┴──────┐
     ↓             ↓
Schedule 삭제    Attendance 생성
     ↓             ↓
해당 날짜 스케줄   status: 'paid_leave'
    제거          workMinutes: 480
     ↓             ↓
     └──────┬──────┘
            ↓
       Notification
```

**자동 처리:**
- `schedules` 컬렉션: 휴가 날짜의 스케줄 삭제
- `attendance` 컬렉션: 유급휴가 기록 생성 (급여 계산에 반영)
- `notifications` 컬렉션: 승인 알림

#### 2-2. 연장근무 승인 (Overtime Approval)

```
사용자: 연장근무 신청
         ↓
관리자: 승인 버튼 클릭
         ↓
ApprovalService.approveRequest()
         ↓
EventBus.emit('approval:approved', { type: 'overtime' })
         ↓
Attendance.overtimeCap 설정
         ↓
퇴근 시 자동으로 연장 수당 계산
```

**자동 처리:**
- `attendance` 컬렉션: overtimeCap 필드 설정
- 퇴근 시 AttendanceService가 자동으로 연장 수당 계산

---

### Chain 3: Schedule → Notification

**트리거:** 스케줄 배포/수정 (`schedule:published`, `schedule:updated`)

```
관리자: 스케줄 배포/수정
         ↓
ScheduleService.publishSchedule()
         ↓
EventBus.emit('schedule:published')
         ↓
     직원에게 알림
         ↓
"1월 5일 근무 스케줄이 등록되었습니다"
```

**자동 처리:**
- `notifications` 컬렉션: 대상 직원에게 자동 알림
- 앱 접속 시 팝업/배지 표시

---

### Chain 4: Resignation → Open Shift

**트리거:** 직원 퇴사 처리 (`employee:resigned`)

```
관리자: 직원 퇴사 처리
         ↓
ScheduleService.resignEmployee()
         ↓
EventBus.emit('employee:resigned')
         ↓
     미래 스케줄 조회
         ↓
     각 스케줄을:
     ┌──────┴──────┐
     ↓             ↓
Schedule 삭제    Open Shift 생성
     ↓             ↓
  스케줄 제거     대타 모집 공고
     ↓             ↓
     └──────┬──────┘
            ↓
   관리자에게 알림
```

**자동 처리:**
- `schedules` 컬렉션: 미래 스케줄 삭제
- `open_shifts` 컬렉션: 대타 모집 공고 자동 생성
- `notifications` 컬렉션: 관리자에게 결원 알림

---

## 🧩 시스템 구성 요소

### 1. Event Bus (이벤트 버스)

**역할:** 모든 이벤트의 중앙 허브

**주요 기능:**
- 이벤트 발행 (`emit`)
- 이벤트 구독 (`on`)
- 병렬 처리 (모든 핸들러 동시 실행)

**코드:**
```typescript
// 이벤트 발행
EventBus.emit(createEvent('contract:signed', payload));

// 이벤트 구독
EventBus.on('contract:signed', async (event) => {
  // 자동화 로직
});
```

### 2. Transaction Helper (트랜잭션 헬퍼)

**역할:** 원자적 작업 보장

**주요 기능:**
- 트랜잭션 실행 (all or nothing)
- 자동 재시도 (최대 3회)
- 상세 로그

**코드:**
```typescript
const result = await executeTransaction(
  'Contract-Signed-Chain',
  async (transaction) => {
    // 모든 작업이 성공하거나 모두 실패
    await updateEmployeeInfo(transaction, payload);
    return { success: true };
  }
);
```

### 3. Rollback Manager (롤백 관리자)

**역할:** 실패 시 자동 롤백

**주요 기능:**
- 롤백 액션 등록
- 실패 시 역순 실행 (LIFO)

**코드:**
```typescript
// 롤백 액션 등록
RollbackManager.register('Delete Schedule', async () => {
  await deleteDoc(scheduleRef);
});

// 실패 시 자동 롤백
if (!result.success) {
  await RollbackManager.executeAll();
}
```

---

## 📊 데이터 흐름 다이어그램

### 전체 시스템 연결

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend UI                             │
│  (사용자 액션: 서명, 승인, 스케줄 배포, 퇴사 처리)             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ ContractService     (계약 관리)                    │    │
│  │ ApprovalService     (결재 관리)                    │    │
│  │ ScheduleService     (스케줄 관리)                  │    │
│  │ AttendanceService   (근태 관리)                    │    │
│  │ SalaryService       (급여 조회)                    │    │
│  └────────────────────────────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │            Event Bus (중앙 허브)                   │    │
│  │  - contract:signed                                 │    │
│  │  - approval:approved                               │    │
│  │  - schedule:published/updated/deleted              │    │
│  │  - employee:resigned                               │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firestore Database                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ contracts   (계약 정보)                              │  │
│  │ users       (직원 정보 + 급여 설정)                 │  │
│  │ schedules   (스케줄)                                 │  │
│  │ attendance  (근태 + 급여 자동 계산)                 │  │
│  │ approvals   (결재)                                   │  │
│  │ salary      (급여 집계)                              │  │
│  │ open_shifts (대타 모집)                              │  │
│  │ notifications (알림)                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 구현 가이드

### 1. 프로젝트 구조

```
services/
├── eventSystem.ts              # 이벤트 시스템 (EventBus, Transaction)
├── contractService.v3.ts       # 계약 관리
├── approvalService.v3.ts       # 결재 관리
├── scheduleService.v3.ts       # 스케줄 관리
├── attendanceService.ts        # 근태 관리 (SSOT)
└── salaryService.ts            # 급여 조회 (View-only)
```

### 2. 초기화 순서

```typescript
// App.tsx 또는 _app.tsx
import { initializeEventSystem } from '@/lib/eventSystem';
import '@/services/contractService.v3';
import '@/services/approvalService.v3';
import '@/services/scheduleService.v3';

// 앱 시작 시 한 번만 호출
useEffect(() => {
  initializeEventSystem();
}, []);
```

### 3. 사용 예시

#### 계약 서명
```typescript
import { signContract } from '@/services/contractService.v3';

const handleSign = async () => {
  const result = await signContract(contractId, {
    employeeSignature: signature,
    employeeSignedAt: new Date(),
  });
  
  if (result.success) {
    // ✅ 자동화 체인 시작
    // - Employee 정보 업데이트
    // - 스케줄 자동 생성
    // - 알림 발송
    alert('계약이 완료되었습니다!');
  }
};
```

#### 결재 승인
```typescript
import { approveRequest } from '@/services/approvalService.v3';

const handleApprove = async () => {
  const result = await approveRequest(approvalId, currentUserId);
  
  if (result.success) {
    // ✅ 자동화 체인 시작
    // - 휴가: 스케줄 삭제 + Attendance 생성
    // - 연장근무: overtimeCap 설정
    // - 알림 발송
    alert('승인되었습니다!');
  }
};
```

#### 스케줄 배포
```typescript
import { publishSchedule } from '@/services/scheduleService.v3';

const handlePublish = async () => {
  const result = await publishSchedule(scheduleId, currentUserId);
  
  if (result.success) {
    // ✅ 자동 알림 발송
    alert('스케줄이 배포되었습니다!');
  }
};
```

---

## 🚀 배포 체크리스트

- [ ] Event System 초기화 코드 추가
- [ ] 모든 Service v3 파일 적용
- [ ] Firestore 인덱스 생성 (필요 시)
- [ ] 에러 로그 모니터링 설정
- [ ] 알림 권한 확인
- [ ] 테스트 시나리오 실행

---

### Chain 5: Holiday → Salary Multiplier (공휴일 자동화)

**트리거:** 공휴일 동기화 (`holiday:synced`)

**자동화 흐름:**
```
매년 1월 1일 자동 실행 또는 수동 호출
         ↓
HolidayService.syncHolidaysToSchedules()
         ↓
     ┌──────┴──────┐
     ↓             ↓
Schedule 조회    공휴일 플래그 업데이트
     ↓             ↓
해당 연도의      isHoliday: true 설정
모든 스케줄      (공휴일 날짜만)
     ↓             ↓
     └──────┬──────┘
            ↓
   AttendanceService.calculateDailyWage()
            ↓
       공휴일 근무 시
       holidayMultiplier: 1.5배 적용
            ↓
       급여에 자동 반영
```

**코드 예시:**
```typescript
// 1. 공휴일 동기화 (관리자 또는 자동 스케줄러)
await HolidayService.syncHolidaysToSchedules(companyId, 2025);

// 2. 퇴근 시 자동 계산
// AttendanceService가 공휴일 여부 확인
const isHoliday = isPublicHoliday(date); // 2025-01-01 → true
const holidayMultiplier = isHoliday ? 1.5 : 1.0;

// 3. 급여에 자동 반영
const holidayPay = calculatePay(hourlyWage, workMinutes, 0.5); // 추가 0.5배

// ✅ 관리자 개입 0
```

**자동 생성되는 데이터:**
- `schedules` 컬렉션: isHoliday: true 플래그
- `attendance` 컬렉션: isHoliday, holidayMultiplier, holidayPay 필드
- 급여 계산: 공휴일 근무 시 1.5배 자동 적용

---

### Chain 6: Store Closing → Elastic Overtime (매장 마감 완충 시간)

**트리거:** 퇴근 시 매장 마감 시간 체크

**자동화 흐름:**
```
직원: 퇴근 버튼 클릭
         ↓
AttendanceService.clockOut()
         ↓
매장 마감 시간 확인
         ↓
     ┌──────┴──────┐
     ↓             ↓
  완충 시간 내   완충 시간 초과
  (30분 이내)    (30분 초과)
     ↓             ↓
  정상 처리     pending_approval
  급여 자동 계산   상태로 저장
     ↓             ↓
  status:        status:
  'present'      'pending_approval'
     ↓             ↓
     └──────┬──────┘
            ↓
       관리자 알림
     "초과 근무 승인 필요"
```

**코드 예시:**
```typescript
// 1. Store 설정
const store = {
  closingTime: '22:00',
  cleanupBufferMinutes: 30, // 마감 완충 시간
};

// 2. 퇴근 시 자동 체크
const isWithinBuffer = isWithinBuffer(clockOutTime, '22:00', 30);
const overBufferMinutes = getOverBufferMinutes(clockOutTime, '22:00', 30);

// 3. 분기 처리
if (isWithinBuffer) {
  // Case A: 정상 처리
  status = 'present';
  calculateWage(); // 급여 자동 계산
} else {
  // Case B: 승인 대기
  status = 'pending_approval';
  requiresApproval = true;
  
  // 관리자 알림 발송
  await NotificationService.notifyOvertimePending(
    adminUserId,
    companyId,
    attendanceId,
    employeeName,
    date,
    overBufferMinutes
  );
}

// ✅ 유연한 마감 시간 관리
```

**자동 생성되는 데이터:**
- `attendance` 컬렉션: requiresApproval: true, status: 'pending_approval'
- `notifications` 컬렉션: 관리자에게 초과 근무 승인 요청 알림
- 급여: 승인 전까지 예산 수당으로 표기

---

### Chain 7: Probation → Salary Normalization (수습 기간 자동화)

**트리거:** 퇴근 시 급여 계산

**자동화 흐름:**
```
직원: 퇴근 버튼 클릭
         ↓
AttendanceService.calculateDailyWage()
         ↓
수습 기간 확인
         ↓
     ┌──────┴──────┐
     ↓             ↓
  수습 기간 중    수습 기간 종료
  (3개월 이내)    (3개월 경과)
     ↓             ↓
  급여 90%      급여 100%
  probationMultiplier  정상 급여
  = 0.9         = 1.0
     ↓             ↓
     └──────┬──────┘
            ↓
   급여에 자동 반영
            ↓
   (수습 종료 시)
   관리자 알림 발송
   "○○○님 수습 기간 종료"
```

**코드 예시:**
```typescript
// 1. Contract 설정
const contract = {
  probationMonths: 3,      // 수습 기간 (개월)
  probationRate: 0.9,      // 수습 기간 급여 배율 (90%)
};

// 2. 퇴근 시 자동 체크
const isProbation = isProbationPeriod(employee.joinedAt, 3, date);
const probationMultiplier = isProbation ? 0.9 : 1.0;

// 3. 급여 계산에 반영
const finalHourlyWage = hourlyWage * probationMultiplier;
const basePay = calculatePay(finalHourlyWage, workMinutes);

// 4. 수습 종료 예정 알림 (D-7)
const probationEndDate = getProbationEndDate(employee.joinedAt, 3);
if (daysUntil(probationEndDate) === 7) {
  await NotificationService.notifyProbationEnding(
    adminUserId,
    companyId,
    employeeId,
    employeeName,
    probationEndDate.toISOString().split('T')[0]
  );
}

// ✅ 수습 기간 자동 관리
```

**자동 생성되는 데이터:**
- `attendance` 컬렉션: isProbation: true/false, probationMultiplier: 0.9/1.0
- 급여 계산: 수습 기간 중 90%, 종료 후 100% 자동 적용
- `notifications` 컬렉션: 수습 종료 예정 알림 (관리자)

---

## 📝 테스트 시나리오

### 시나리오 1: 계약 서명 → 스케줄 생성
1. 직원 A의 계약서 서명
2. ✅ users 컬렉션의 급여 정보 자동 업데이트 확인
3. ✅ schedules 컬렉션에 3개월치 스케줄 생성 확인
4. ✅ notifications 컬렉션에 알림 생성 확인

### 시나리오 2: 휴가 승인 → 스케줄 변경
1. 직원 B가 1월 10일 휴가 신청
2. 관리자 승인
3. ✅ 1월 10일 스케줄 삭제 확인
4. ✅ attendance에 'paid_leave' 기록 생성 확인
5. ✅ 급여 계산에 반영 확인

### 시나리오 3: 연장근무 승인 → 급여 계산
1. 직원 C가 1월 15일 2시간 연장근무 신청
2. 관리자 승인
3. ✅ attendance의 overtimeCap = 120분 설정 확인
4. 직원 C가 퇴근
5. ✅ 연장 수당 자동 계산 확인

### 시나리오 4: 퇴사 → Open Shift 생성
1. 직원 D 퇴사 처리
2. ✅ 미래 스케줄 조회 (1월 20일~2월 28일)
3. ✅ 각 스케줄이 open_shifts로 이관 확인
4. ✅ 관리자에게 결원 알림 확인

### 시나리오 5: 공휴일 동기화 → 급여 할증
1. 관리자가 공휴일 동기화 실행 (또는 자동 실행)
2. ✅ 2025년 공휴일 15개 감지 확인
3. ✅ schedules의 isHoliday 플래그 업데이트 확인
4. 직원 E가 공휴일(1월 1일)에 출퇴근
5. ✅ holidayMultiplier: 1.5배 적용 확인
6. ✅ 급여에 공휴일 수당 자동 반영 확인

### 시나리오 6: 매장 마감 완충 시간 → 승인 대기
1. 매장 마감 시간: 22:00, 완충 시간: 30분
2. 직원 F가 22:20에 퇴근 (완충 시간 내)
3. ✅ status: 'present', 급여 자동 계산 확인
4. 직원 G가 22:50에 퇴근 (완충 시간 20분 초과)
5. ✅ status: 'pending_approval' 확인
6. ✅ 관리자에게 초과 근무 승인 알림 확인

### 시나리오 7: 수습 기간 → 급여 자동 조정
1. 직원 H 입사 (수습 기간 3개월, 급여 90%)
2. 입사 후 2개월째 퇴근
3. ✅ probationMultiplier: 0.9 적용 확인
4. ✅ 급여 90% 계산 확인
5. 입사 후 3개월 경과
6. ✅ probationMultiplier: 1.0 적용 확인
7. ✅ 급여 100% 계산 확인
8. ✅ 관리자에게 수습 종료 알림 확인 (D-7)

---

## 🎉 요약

**The Organic System의 핵심:**

1. **Event-Driven**: 모든 변경은 이벤트로 전파
2. **Zero Manual Intervention**: 관리자 개입 0
3. **Atomic Operations**: 트랜잭션으로 데이터 무결성 보장
4. **Auto Notification**: 모든 변경사항 자동 알림
5. **Open Shift Automation**: 결원 발생 시 자동 대타 모집
6. **Holiday Multiplier**: 공휴일 근무 시 급여 1.5배 자동 적용
7. **Elastic Overtime**: 매장 마감 완충 시간으로 유연한 초과 근무 관리
8. **Probation Auto**: 수습 기간 자동 관리 및 급여 정상화

**새로 추가된 자동화 (5~7):**

- **5. 공휴일 자동화**: 연도별 공휴일 자동 동기화 → Schedule isHoliday 플래그 → 급여 1.5배 할증
- **6. 매장 마감 완충**: 마감 시간 + 완충 버퍼(30분) → 완충 내 정상 처리, 초과 시 승인 대기
- **7. 수습 기간 자동**: 입사일 + 수습 개월 체크 → 기간 중 90% 급여, 경과 시 100% 정상화

이제 시스템은 하나의 유기체처럼 스스로 작동합니다! 🌱

**전체 자동화 체인: 1~7번 완성! 🎊**

---

## 🏥 심층 기능 (Deep Features 8~12)

### Feature 8: 보건증 알림 (Health Cert Soft Warning)

**핵심 철학:** 스케줄을 막지 않는다! (현장 마비 방지)

**트리거:** 매일 자동 체크 또는 수동 호출

**자동화 흐름:**
```
매일 00:00 자동 실행
         ↓
HealthCertService.updateAllHealthCertStatuses()
         ↓
     ┌──────┴──────┐
     ↓             ↓
만료 30일 전부터  만료된 경우
알림 발송         관리자에게도 알림
     ↓             ↓
직원 UI에         관리자 UI에
🟡 배지 표시      🔴 배지 표시
     ↓             ↓
     └──────┬──────┘
            ↓
   갱신 시까지 주기적 알림
   (스케줄은 정상 작동)
```

**코드 예시:**
```typescript
// 1. 보건증 상태 자동 업데이트
await HealthCertService.updateAllHealthCertStatuses(companyId);

// 2. 만료 예정/만료된 직원에게 알림 발송
await HealthCertService.sendHealthCertExpiryNotifications(companyId);

// 3. UI에 배지 표시
const badge = getHealthCertBadge(employee.healthCertStatus);
// 🟢 정상 / 🟡 만료 임박 / 🔴 만료됨
```

**주요 특징:**
- ✅ **Soft Warning Only**: 스케줄 차단 없음
- ✅ **주기적 알림**: 만료 30일 전부터 갱신 시까지
- ✅ **시각적 경고**: 직원 리스트 및 스케줄표에 배지 표시
- ✅ **관리자 알림**: 만료된 경우 관리자에게도 통지

---

### Feature 11: 세무사 연동 (Tax Accountant Support)

**트리거:** 관리자가 [세무사에게 전송] 버튼 클릭

**자동화 흐름:**
```
관리자: [세무사에게 급여 대장 전송] 클릭
         ↓
TaxService.collectPayrollData()
         ↓
     ┌──────┴──────┐
     ↓             ↓
급여 데이터 수집  엑셀/CSV 생성
     ↓             ↓
직원별 급여 내역  직원명, 주민번호,
기본급, 수당,     기본급, 수당,
공제액, 실지급액  공제액, 실지급액
     ↓             ↓
     └──────┬──────┘
            ↓
    이메일 발송
    (taxAccountantEmail)
```

**코드 예시:**
```typescript
// 1. 설정에서 세무사 이메일 등록
await updateDoc(storeRef, {
  taxAccountantEmail: 'tax@example.com',
  taxAccountantName: '홍길동 세무사',
});

// 2. 급여 대장 전송
await TaxService.sendPayrollToTaxAccountant(
  companyId,
  '2025-01',
  'tax@example.com'
);

// 3. 급여 대장 엑셀 다운로드 (세무사용)
await TaxService.downloadPayrollExcel(companyId, '2025-01');
```

**생성되는 데이터:**
- **급여 대장 엑셀**: 직원명, 주민번호 앞자리, 기본급, 수당, 공제액, 실지급액
- **이메일 발송**: 세무사 이메일로 자동 전송 (mailto 또는 API)

---

### Feature 12: 급여 이체 엑셀 (Bank Transfer Excel)

**트리거:** 관리자가 [이체용 엑셀 다운로드] 버튼 클릭

**자동화 흐름:**
```
관리자: [이체용 엑셀 다운로드] 클릭
         ↓
TaxService.collectPayrollData()
         ↓
     ┌──────┴──────┐
     ↓             ↓
은행 계좌 정보    실지급액 데이터
조회              (netPay)
     ↓             ↓
bankName,         정확한 최종
accountNumber,    실지급액
accountHolder
     ↓             ↓
     └──────┬──────┘
            ↓
    CSV 생성 및 다운로드
    (은행 업로드용)
```

**코드 예시:**
```typescript
// 1. 직원 계좌 정보 등록
await updateDoc(userRef, {
  bankName: '국민은행',
  accountNumber: '123-456-789',
  accountHolder: '홍길동',
});

// 2. 이체용 엑셀 다운로드
await TaxService.downloadBankTransferExcel(companyId, '2025-01');

// 생성된 CSV:
// "은행명","계좌번호","예금주","실지급액"
// "국민은행","123-456-789","홍길동","2500000"
```

**주요 특징:**
- ✅ **정확한 실지급액**: SalaryService의 netPay 그대로 사용
- ✅ **은행 업로드 가능**: 인터넷 뱅킹에 직접 업로드 가능한 형식
- ✅ **UTF-8 BOM**: 엑셀 한글 깨짐 방지
- ✅ **계좌 정보 검증**: 계좌 정보가 없는 직원은 제외

---

### Feature 9: 휴게시간 가이드 (Break Time Guide)

**설명:** 근태 자동 차감 로직 삭제, UI 가이드만 제공

**구현 방식:**
- 계약서 작성 폼(`ContractFormModal`)에 경고 문구 추가
- **"⚠️ 주의: 근로기준법상 4시간 근무 시 30분 이상의 휴게시간을 부여해야 합니다."**
- 근태 기록에서 자동 차감 로직은 제거됨

---

### Feature 10: 위치 검증 삭제 (Geofencing Removed)

**설명:** QR 코드 출근 방식 사용으로 GPS 위치 검증 불필요

**구현 상태:**
- GPS/Geofencing 로직 제거 완료
- QR 코드 출근 방식만 사용
- `location` 필드는 선택 사항으로 유지 (기록용)

---

## 🎉 최종 요약

**The Organic System의 핵심:**

1. **Event-Driven**: 모든 변경은 이벤트로 전파
2. **Zero Manual Intervention**: 관리자 개입 0
3. **Atomic Operations**: 트랜잭션으로 데이터 무결성 보장
4. **Auto Notification**: 모든 변경사항 자동 알림
5. **Open Shift Automation**: 결원 발생 시 자동 대타 모집
6. **Holiday Multiplier**: 공휴일 근무 시 급여 1.5배 자동 적용
7. **Elastic Overtime**: 매장 마감 완충 시간으로 유연한 초과 근무 관리
8. **Probation Auto**: 수습 기간 자동 관리 및 급여 정상화
9. **Health Cert Soft Warning**: 보건증 만료 알림 (스케줄 차단 없음)
10. **Tax Accountant Support**: 세무사 연동 및 급여 대장 자동 전송
11. **Bank Transfer Excel**: 은행 이체용 엑셀 자동 생성

**새로 추가된 심층 기능 (8~12):**

- **8. 보건증 알림**: 만료 30일 전부터 주기적 알림 → UI 배지 표시 → 스케줄 차단 없음
- **9. 휴게시간 가이드**: 계약서 작성 시 법정 휴게시간 안내 (UI Only)
- **10. 위치 검증 제거**: QR 출근 사용으로 GPS 로직 불필요
- **11. 세무사 연동**: taxAccountantEmail 설정 → 급여 대장 엑셀 생성 → 이메일 발송
- **12. 급여 이체 엑셀**: 은행 이체용 CSV 다운로드 (은행명, 계좌번호, 예금주, 실지급액)

이제 시스템은 하나의 유기체처럼 스스로 작동합니다! 🌱

**전체 자동화 체인: 1~12번 완성! 🎊🎊**

---

## 🎨 UI 통합 완료 사항

### 1. Settings & Employee Form (설정 및 직원 폼)

#### StoreFormModal (매장 설정 폼)
- ✅ **세무사 정보 입력 필드**
  - `taxAccountantEmail`: 세무사 이메일
  - `taxAccountantName`: 세무사 이름

#### EmployeeDetailModal (직원 상세 정보 수정)
- ✅ **은행 계좌 정보**
  - `bankName`: 은행명 (Select)
  - `accountNumber`: 계좌번호 (숫자 전용 유효성)
  - `accountHolder`: 예금주
- ✅ **보건증 정보**
  - `healthCertExpiry`: 보건증 만료일 (Date 입력)
  - 만료 30일 전 알림 안내 문구 표시

### 2. 급여 관리 페이지 (SalaryTab)

- ✅ **3개 관리 버튼 추가** (상단 배치, 로딩 상태 포함)
  1. **📤 세무사에게 전송**
     - TaxService.sendPayrollToTaxAccountant() 호출
     - 로딩 중: 스피너 + 버튼 비활성화
     - 성공: "✅ 세무사에게 급여 대장이 전송되었습니다!"
  2. **📥 급여 대장 다운로드**
     - TaxService.downloadPayrollExcel() 호출
     - 급여 대장 엑셀 파일 즉시 다운로드
  3. **💰 이체용 엑셀 다운로드**
     - TaxService.downloadBankTransferExcel() 호출
     - 은행 이체용 CSV 파일 다운로드

- ✅ **버튼 활성화 조건**
  - `selectedMonth`가 선택되어야 함
  - `salaries.length > 0` (급여 데이터 존재)
  - 로딩 중일 때 비활성화

### 3. 보건증 알림 배지 (Health Certificate Badge)

#### EmployeesTab (직원 관리 탭)
- ✅ **직원명 옆 배지 표시**
  - 🟢 **정상** (만료 30일 이상 남음)
  - 🟡 **주의** (만료 30일 이내)
  - 🔴 **긴급** (만료됨 또는 만료 7일 이내)
- ✅ **툴팁 표시**
  - Hover 시 상태 텍스트 표시
  - 예: "만료 10일 전", "만료됨", "정상"

#### SchedulesTab (스케줄 관리 탭)
- ✅ **스케줄표 직원명 옆 배지**
  - 테이블 뷰에서 직원명과 함께 배지 표시
  - 툴팁으로 상세 상태 확인 가능

### 4. 계약서 작성 모달 (ContractFormModal)

- ✅ **휴게시간 법정 안내 (노란색 경고박스)**
  - 위치: 계약서 생성 버튼 바로 위
  - 내용:
    - ⚠️ **주의: 근로기준법상 휴게시간 필수 부여**
    - 4시간 근무 시 30분 이상의 휴게시간 부여 필요
    - 8시간 근무 시 1시간 이상의 휴게시간 부여 필요
    - 휴게시간은 근로자가 자유롭게 이용할 수 있는 시간입니다

### 5. 새로 추가된 UI 컴포넌트

- ✅ **Tooltip 컴포넌트**
  - `components/ui/tooltip.tsx` 생성
  - `@radix-ui/react-tooltip` 설치
  - TooltipProvider, Tooltip, TooltipTrigger, TooltipContent 제공

---

## 🚀 배포 상태

- **GitHub Repository**: https://github.com/uhi13088/ABCDC-staff-system.git
- **최신 커밋**: `8449a9de` (UI 통합 완료)
- **자동 배포**: GitHub Actions via Firebase Hosting
- **배포 확인**: https://github.com/uhi13088/ABCDC-staff-system/actions
