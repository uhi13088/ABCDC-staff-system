# SSOT 아키텍처 테스트 가이드

## 📋 테스트 체크리스트

### 1. 출퇴근 기본 흐름 테스트

#### ✅ 출근 처리 (clockIn)
- [ ] 직원이 출근 버튼 클릭
- [ ] Attendance 기록 생성 확인
- [ ] scheduledStartTime, scheduledEndTime이 자동 저장되는지 확인
- [ ] 지각 여부가 자동 판단되는지 확인 (10분 이상 늦으면 isLate: true)
- [ ] 콘솔 로그에서 "🕐 출근 처리 시작" 확인

**Firestore 확인:**
```javascript
// attendance 컬렉션에 새 문서 생성됨
{
  userId: "...",
  companyId: "...",
  storeId: "...",
  date: "2025-01-03",
  clockIn: Timestamp,
  scheduledStartTime: "09:00", // 계약서에서 자동 추출
  scheduledEndTime: "18:00",   // 계약서에서 자동 추출
  isLate: false,               // 지각 자동 판단
  status: "present",
  createdAt: Timestamp
}
```

#### ✅ 퇴근 처리 (clockOut)
- [ ] 직원이 퇴근 버튼 클릭
- [ ] 트랜잭션으로 원자적 업데이트 확인
- [ ] 근무 시간 자동 계산 (workMinutes)
- [ ] 일급 자동 계산 (basePay, overtimePay, nightPay, holidayPay, dailyWage)
- [ ] 조퇴 여부 자동 판단 (isEarlyLeave)
- [ ] 콘솔 로그에서 "💰 일급 계산 완료" 확인

**Firestore 확인:**
```javascript
// attendance 문서 업데이트됨
{
  clockOut: Timestamp,
  
  // 파생 필드 (모두 자동 계산되어 저장)
  workMinutes: 480,
  overtimeMinutes: 60,
  nightWorkMinutes: 0,
  holidayWorkMinutes: 0,
  
  // 급여 필드 (SSOT!)
  basePay: 80000,
  overtimePay: 15000,
  nightPay: 0,
  holidayPay: 0,
  dailyWage: 95000,
  
  // 상태
  status: "present",
  isLate: false,
  isEarlyLeave: false,
  
  updatedAt: Timestamp
}
```

### 2. 급여 조회 흐름 테스트

#### ✅ 급여 페이지 접속
- [ ] 페이지 로드 시 자동 조회 **없음** (중요!)
- [ ] 콘솔에 무한 루프 로그 **없음**
- [ ] "📊 조회하기" 버튼이 표시됨

#### ✅ 조회 버튼 클릭
- [ ] 버튼 클릭 시에만 데이터 로드
- [ ] 각 직원의 근태 기록 집계 (sum)
- [ ] dailyWage 합계가 정확히 표시됨
- [ ] 콘솔에서 "💰 급여 조회 시작 (단순 집계)" 확인

**예상 동작:**
```javascript
// Attendance 컬렉션에서 데이터 조회
totalBasePay = sum(basePay)        // 800,000
totalOvertimePay = sum(overtimePay) // 150,000
totalNightPay = sum(nightPay)       // 0
totalHolidayPay = sum(holidayPay)   // 0
totalPay = sum(dailyWage)           // 950,000
```

### 3. 실시간 업데이트 테스트

#### ✅ 실시간 구독 (선택적)
- [ ] useEf fect에서 무한 루프 **없음**
- [ ] onSnapshot이 변경 감지
- [ ] 다른 사용자의 근태 수정 시 자동 반영
- [ ] 구독 해제 확인 (컴포넌트 언마운트 시)

### 4. 에러 처리 테스트

#### ✅ 권한 오류
- [ ] Firestore 규칙 위반 시 명확한 에러 메시지
- [ ] 재시도 루프 **없음**
- [ ] 사용자에게 알림 표시

#### ✅ 데이터 누락
- [ ] 계약서 없는 직원: 기본값으로 처리
- [ ] 스케줄 없는 날: graceful fallback
- [ ] 콘솔에 경고 로그 표시

### 5. 성능 테스트

#### ✅ 로딩 속도
- [ ] 급여 조회: 100명 기준 5초 이내
- [ ] 출퇴근 처리: 1초 이내
- [ ] 무한 루프로 인한 브라우저 멈춤 **없음**

#### ✅ Firestore 읽기 비용
- [ ] 급여 조회 1회당: employees + attendances 읽기만 발생
- [ ] 불필요한 재조회 **없음**
- [ ] 캐싱 효과 확인

---

## 🧪 테스트 시나리오

### 시나리오 1: 정상 근무 (09:00~18:00)
1. 직원 A가 09:00에 출근
2. 18:00에 퇴근
3. 급여 페이지에서 조회
4. **예상 결과:**
   - workMinutes: 480분 (8시간)
   - basePay: 시급 × 8
   - dailyWage: basePay

### 시나리오 2: 지각 + 연장 근무
1. 직원 B가 09:30에 출근 (30분 지각)
2. 19:00에 퇴근 (1시간 연장)
3. **예상 결과:**
   - isLate: true
   - status: "late"
   - overtimeMinutes: 60분
   - overtimePay: 시급 × 1.5 × 1

### 시나리오 3: 조퇴
1. 직원 C가 09:00에 출근
2. 17:00에 퇴근 (1시간 조퇴)
3. **예상 결과:**
   - isEarlyLeave: true
   - status: "early_leave"
   - workMinutes: 420분 (7시간)

### 시나리오 4: 지각 + 조퇴
1. 직원 D가 09:30에 출근 (30분 지각)
2. 17:00에 퇴근 (1시간 조퇴)
3. **예상 결과:**
   - isLate: true
   - isEarlyLeave: true
   - status: "late_and_early_leave"

### 시나리오 5: 야간 근무 (22:00~06:00)
1. 직원 E가 22:00에 출근
2. 다음날 06:00에 퇴근
3. **예상 결과:**
   - nightWorkMinutes: 480분 (8시간)
   - nightPay: 시급 × 0.5 × 8

### 시나리오 6: 공휴일 근무
1. 직원 F가 2025-01-01에 근무
2. 09:00~18:00
3. **예상 결과:**
   - holidayWorkMinutes: 480분
   - holidayPay: 시급 × 1.5 × 8

---

## 🚨 버그 체크포인트

### 🔥 반드시 확인해야 할 사항

#### 1. 무한 루프 완전 제거
```javascript
// ❌ 이전 코드 (무한 루프 발생)
useEffect(() => {
  loadSalaryList(); // 함수가 의존성에 없어서 무한 루프
}, [selectedMonth, loadSalaryList]); // loadSalaryList가 매번 재생성됨

// ✅ 새 코드 (안전)
// 자동 조회 제거, 버튼 클릭 시에만 조회
```

**테스트:**
- [ ] 콘솔에서 "💰 급여 조회 시작" 로그가 **1회만** 출력
- [ ] 브라우저 개발자 도구 Network 탭에서 Firestore 요청이 반복되지 않음

#### 2. 퇴근 시 데이터 누락 방지
```javascript
// ✅ 트랜잭션으로 원자적 업데이트
await runTransaction(db, async (transaction) => {
  // 계산 + 저장이 하나의 트랜잭션으로 실행됨
  transaction.update(attendanceRef, {
    clockOut,
    workMinutes,
    dailyWage, // 반드시 저장됨
    // ...
  });
});
```

**테스트:**
- [ ] 퇴근 처리 후 Firestore에서 dailyWage 필드 존재 확인
- [ ] 네트워크 오류 시에도 부분 저장 **없음**

#### 3. Firestore 규칙 호환성
```javascript
// ✅ 쿼리에 반드시 companyId 필터 포함
where('companyId', '==', companyId)
```

**테스트:**
- [ ] 모든 Firestore 쿼리에 companyId 필터 포함
- [ ] Permission denied 에러 **없음**

---

## 📊 데이터 일관성 검증

### Firestore 콘솔에서 직접 확인

#### 1. attendance 컬렉션
```
날짜: 2025-01-03
필터: companyId == "your-company-id"

✅ 확인할 필드:
- clockIn, clockOut: Timestamp 타입
- workMinutes: 숫자
- basePay, dailyWage: 숫자 (0이 아님)
- scheduledStartTime, scheduledEndTime: "HH:mm" 형식
- isLate, isEarlyLeave: boolean
```

#### 2. salary 컬렉션
```
✅ 확인할 사항:
- 급여 문서가 자동 생성되지 않음 (수동 확정 후에만 생성)
- status: 'unconfirmed' | 'confirmed' | 'paid'
```

---

## 🎯 성능 모니터링

### Chrome DevTools 사용

#### 1. Network 탭
```
필터: firestore.googleapis.com

✅ 확인할 사항:
- 급여 조회 버튼 클릭 1회 = Firestore 요청 N회 (N = 직원 수 + 1)
- 무한 루프로 인한 반복 요청 없음
```

#### 2. Console 탭
```
✅ 정상 로그:
💰 급여 조회 시작: 2025-01
👥 직원 목록: 10명
💰 홍길동 급여: 1200000
✅ 급여 조회 완료: 10명

❌ 비정상 로그 (무한 루프):
💰 급여 조회 시작: 2025-01
💰 급여 조회 시작: 2025-01
💰 급여 조회 시작: 2025-01
...
```

---

## 🔍 디버깅 팁

### 1. 로그 확인
```javascript
// AttendanceService
console.log('🕐 출근 처리 시작');
console.log('💰 일급 계산 완료');

// SalaryService
console.log('💰 급여 조회 시작 (단순 집계)');
console.log('✅ 급여 조회 완료');
```

### 2. Firestore 인덱스 오류
```
❌ 에러 메시지:
"The query requires an index..."

✅ 해결:
- 에러 메시지의 링크 클릭
- Firebase 콘솔에서 인덱스 생성
```

### 3. 타입 오류
```
❌ TypeScript 에러:
Property 'dailyWage' does not exist on type 'AttendanceRecord'.

✅ 해결:
- lib/types/attendance.ts 확인
- dailyWage?: number; 필드 추가됨
```

---

## ✅ 배포 전 최종 체크리스트

- [ ] 모든 테스트 시나리오 통과
- [ ] 콘솔에 무한 루프 로그 없음
- [ ] Firestore 권한 오류 없음
- [ ] 급여 계산 정확성 검증
- [ ] 성능 테스트 통과 (100명 기준 5초 이내)
- [ ] 에러 처리 확인
- [ ] 실시간 업데이트 동작 확인
- [ ] Git commit 및 push 완료
- [ ] README 업데이트
- [ ] 팀원에게 변경사항 공유

---

## 📞 문제 발생 시

### 1. 퇴근 시 급여가 계산되지 않음
- Firestore에서 attendance 문서의 dailyWage 필드 확인
- 콘솔 로그에서 "💰 일급 계산 완료" 확인
- 계약서 존재 여부 확인

### 2. 급여 페이지에서 무한 로딩
- 콘솔에서 무한 루프 로그 확인
- Network 탭에서 반복 요청 확인
- useEffect 의존성 배열 확인

### 3. 권한 오류
- Firestore 규칙 확인
- 모든 쿼리에 companyId 필터 포함 확인

---

## 📚 참고 문서

- [SSOT 아키텍처 설계](/SSOT_ARCHITECTURE.md)
- [AttendanceService v2 코드](/services/attendanceService.ts)
- [SalaryService v2 코드](/services/salaryService.ts)
- [useSalaryLogic v3 코드](/hooks/admin/useSalaryLogic.ts)
