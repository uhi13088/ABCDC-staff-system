# 스케줄 리팩토링 위험 요소 분석

## 📋 데이터 구조 (변경 불가)

### **현재 사용 중인 데이터 구조**

```javascript
currentScheduleData = {
  type: 'schedule',
  employees: [
    {
      uid: 'user_id',
      name: '직원명',
      schedules: {
        '월': [
          {
            startTime: '09:00',
            endTime: '18:00',
            hours: 9,
            breakTime: { start: '12:00', end: '13:00', minutes: 60 },
            isShiftReplacement: false,
            isWorkDay: true
          }
        ],
        '화': [...],
        // ... 요일별
      },
      salaryType: 'monthly',
      salaryAmount: 2000000
    }
  ]
}
```

### **⚠️ 위험 1: 데이터 구조 변경 금지**
- **영향:** renderScheduleGanttChart() 함수가 이 구조에 의존
- **대응:** 새 함수도 **정확히 동일한 구조** 반환
- **검증:** 타입 체크 함수 작성

---

## 🔍 Firestore 쿼리 (변경 불가)

### **현재 사용 중인 쿼리 패턴**

```javascript
// 1. 직원 조회
db.collection('users')
  .where('store', '==', storeName)
  .where('userType', '==', 'employee')
  .get()

// 2. 스케줄 조회
db.collection('schedules')
  .where('userId', '==', userId)
  .where('date', '>=', startDate)
  .where('date', '<=', endDate)
  .get()

// 3. 계약서 조회 (1차)
db.collection('contracts')
  .where('employeeId', '==', userId)
  .orderBy('createdAt', 'desc')
  .limit(1)
  .get()

// 4. 계약서 조회 (2차)
db.collection('contracts')
  .where('employeeName', '==', userName)
  .where('employeeBirth', '==', birth)
  .orderBy('createdAt', 'desc')
  .limit(1)
  .get()
```

### **⚠️ 위험 2: 인덱스 의존성**
- **영향:** 쿼리 변경 시 Firestore 인덱스 필요
- **대응:** 쿼리 패턴 **절대 변경 금지**
- **검증:** 기존 쿼리와 1:1 매칭 확인

---

## 🎯 비즈니스 로직 (통일 필요)

### **최신 스케줄 선택 로직**

```javascript
// 현재: 관리자 페이지만 구현
// 목표: 직원 페이지에도 동일 적용

if (latestContractId) {
  // 1. 최신 계약서 ID와 일치하는 스케줄 찾기
  selectedSchedule = schedules.find(s => s.contractId === latestContractId);
  
  if (!selectedSchedule) {
    // 2. contractId 없으면 createdAt 기준 최신
    selectedSchedule = schedules.sort((a, b) => 
      b.createdAt - a.createdAt
    )[0];
  }
} else {
  // 3. 계약서 없으면 createdAt 기준 최신
  selectedSchedule = schedules.sort((a, b) => 
    b.createdAt - a.createdAt
  )[0];
}
```

### **⚠️ 위험 3: 로직 불일치**
- **현재:** 직원 페이지는 모든 스케줄 표시
- **목표:** 관리자와 동일하게 최신만 표시
- **대응:** 철저한 테스트
- **검증:** 같은 데이터로 양쪽 비교

---

## 🔄 캐싱 전략

### **계약서 캐싱**

```javascript
// Map<userId, { data, timestamp }>
contractCache = new Map()
cacheExpiry = 5 * 60 * 1000 // 5분
```

### **⚠️ 위험 4: 캐시 무효화**
- **문제:** 계약서 수정 후 캐시 갱신 필요
- **대응:** 
  1. 5분 TTL (짧은 만료 시간)
  2. clearCache() 함수 제공
  3. 스케줄 생성/수정 시 캐시 초기화
- **검증:** 계약서 수정 → 스케줄 조회 테스트

---

## 📦 모듈 의존성

### **schedule-viewer.js 의존 관계**

```
schedule-viewer.js
├─ renderScheduleGanttChart() (기존)
├─ loadScheduleData() (신규) ← 추가
└─ getScheduleMonday() (기존)

admin-dashboard.html
└─ loadScheduleData() → window.loadScheduleData() 호출

employee.js
└─ loadEmployeeSchedule() → window.loadScheduleData() 호출
```

### **⚠️ 위험 5: 로딩 순서**
- **문제:** schedule-viewer.js 로드 전 호출 시 에러
- **대응:** 
  ```html
  <script src="js/schedule-viewer.js"></script>
  <script>
    // window.loadScheduleData 존재 확인
    if (typeof window.loadScheduleData !== 'function') {
      console.error('schedule-viewer.js 로드 실패!');
    }
  </script>
  ```
- **검증:** 페이지 로드 순서 확인

---

## 🧪 테스트 체크리스트

### **단계별 테스트**

#### Phase 1: 모듈 개발
- [ ] 매장 스케줄 조회 (관리자용)
- [ ] 개인 스케줄 조회 (직원용)
- [ ] 계약서 캐싱 동작
- [ ] breakTime 포함 확인
- [ ] 데이터 구조 검증

#### Phase 2: 관리자 페이지
- [ ] 스케줄 조회 (기존과 동일)
- [ ] 간트 차트 렌더링
- [ ] 급여 정보 표시
- [ ] 스케줄 생성/수정/삭제
- [ ] 주차 변경

#### Phase 3: 직원 페이지
- [ ] 내 근무만 보기
- [ ] 매장 전체 보기
- [ ] 간트 차트 렌더링
- [ ] 주차 변경
- [ ] 최신 스케줄만 표시 (신규)

#### Phase 4: 통합 테스트
- [ ] 같은 날짜 중복 스케줄 → 최신만 표시
- [ ] 계약서 없는 직원 처리
- [ ] breakTime 없는 스케줄 처리
- [ ] 대타 근무 정상 표시
- [ ] 여러 탭 동시 사용

---

## 🚨 롤백 시나리오

### **문제 발생 시 대응**

#### Scenario 1: 데이터 구조 오류
```javascript
// 증상: 간트 차트 렌더링 실패
// 원인: 데이터 구조 불일치
// 대응: 즉시 롤백
git revert HEAD
```

#### Scenario 2: Firestore 권한 오류
```javascript
// 증상: Missing or insufficient permissions
// 원인: 쿼리 변경으로 인한 인덱스 이슈
// 대응: 쿼리 복원
```

#### Scenario 3: 캐시 문제
```javascript
// 증상: 오래된 데이터 표시
// 원인: 캐시 만료 안 됨
// 대응: clearCache() 호출 또는 새로고침
```

#### Scenario 4: 성능 저하
```javascript
// 증상: 로딩 시간 증가
// 원인: 불필요한 쿼리 증가
// 대응: 캐싱 강화 또는 롤백
```

---

## ✅ 안전장치

### **1. 기존 코드 보존**
```javascript
// 새 함수 추가 시 기존 함수는 주석 처리만
// async function loadScheduleData_OLD() { ... }
```

### **2. 타입 검증**
```javascript
function validateScheduleData(data) {
  if (!data || data.type !== 'schedule') return false;
  if (!Array.isArray(data.employees)) return false;
  
  for (const emp of data.employees) {
    if (!emp.uid || !emp.name || !emp.schedules) return false;
    if (!emp.salaryType || emp.salaryAmount === undefined) return false;
  }
  
  return true;
}
```

### **3. 에러 핸들링**
```javascript
try {
  const data = await window.loadScheduleData(db, options);
  
  if (!validateScheduleData(data)) {
    throw new Error('Invalid data structure');
  }
  
  currentScheduleData = data;
} catch (error) {
  console.error('스케줄 로드 실패:', error);
  // 빈 데이터 폴백
  currentScheduleData = { type: 'schedule', employees: [] };
}
```

### **4. 로깅 강화**
```javascript
console.log('🔍 [loadScheduleData] 시작:', options);
console.log('📊 [loadScheduleData] 결과:', data.employees.length, '명');
console.log('⏱️ [loadScheduleData] 소요시간:', elapsed, 'ms');
```

---

## 📊 성공 기준

### **기능 정확성**
- ✅ 관리자/직원 페이지 모두 정상 동작
- ✅ 스케줄 생성/수정/삭제 정상
- ✅ breakTime 정상 표시
- ✅ 급여 계산 정상

### **성능**
- ✅ 초기 로딩 시간 변화 없음 (±10%)
- ✅ Firestore 조회 횟수 감소 (캐싱)
- ✅ 메모리 사용량 정상 (±20%)

### **유지보수성**
- ✅ 코드 중복 90% 감소
- ✅ 새 필드 추가 시 1곳만 수정
- ✅ 버그 수정 영향 범위 최소화

---

## 🎯 최종 체크

### **배포 전 필수 확인**
1. [ ] 모든 테스트 통과
2. [ ] 브라우저 콘솔 에러 없음
3. [ ] Firestore 쿼리 정상
4. [ ] 캐싱 동작 확인
5. [ ] 성능 비교 완료
6. [ ] 롤백 준비 완료

### **배포 후 모니터링**
1. [ ] 사용자 에러 리포트 확인
2. [ ] Firestore 사용량 확인
3. [ ] 성능 메트릭 확인
4. [ ] 1주일 안정화 기간

---

**작성일: 2025-11-15**
**작성자: Claude**
**검토자: 사장님**
