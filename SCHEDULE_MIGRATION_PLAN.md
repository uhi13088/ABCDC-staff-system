# Schedules 컬렉션 마이그레이션 계획

## 목적
한 날짜에 여러 근무를 등록할 수 있도록 schedules 컬렉션 구조 변경

---

## ⚠️ 필수 Firestore 복합 인덱스

마이그레이션 완료 후 **반드시** 다음 복합 인덱스를 생성해야 합니다:

### 1. 직원별 날짜 범위 조회 (가장 중요)
- **Collection**: `schedules`
- **Fields**: 
  - `userId` (Ascending)
  - `date` (Ascending)
- **용도**: 특정 직원의 주간 스케줄 조회
- **사용 코드**: 
  - `admin-dashboard.html` line ~9065
  - `js/employee.js` line ~2977

### 2. 매장별 날짜 범위 조회
- **Collection**: `schedules`
- **Fields**: 
  - `store` (Ascending)
  - `date` (Ascending)
- **용도**: 특정 매장의 주간 스케줄 조회
- **사용 코드**: 
  - `js/employee.js` line ~3638

### 3. 직원별 특정 날짜 근무 조회
- **Collection**: `schedules`
- **Fields**: 
  - `userId` (Ascending)
  - `date` (Ascending)
  - `startTime` (Ascending)
  - `endTime` (Ascending)
- **용도**: 근무대체 승인 시 삭제할 특정 근무 찾기
- **사용 코드**: 
  - `admin-dashboard.html` line ~3847

### Firestore 콘솔에서 인덱스 생성 방법:
1. Firebase Console → Firestore Database → Indexes 탭
2. "Create Index" 클릭
3. 위의 필드 조합대로 입력
4. 인덱스 빌드 완료까지 대기 (보통 5-10분)

**또는** 쿼리 실행 시 오류 메시지에 나오는 링크를 클릭하면 자동으로 생성됩니다.

---

## 현재 구조 (주차별)

```javascript
// 문서 ID: {userId}_{year}-{weekNum}
// 예: "user123_2025-45"
{
  userId: "user123",
  userName: "김연아",
  store: "맛남살롱 부천시청점",
  year: 2025,
  weekNumber: 45,
  월: {
    startTime: "09:00",
    endTime: "18:00",
    hours: 9,
    isWorkDay: true
  },
  화: {
    startTime: "09:00",
    endTime: "18:00",
    hours: 9,
    isWorkDay: true
  },
  수: { isWorkDay: false },
  목: { isWorkDay: true, startTime: "09:00", endTime: "18:00", hours: 9 },
  금: { isWorkDay: true, startTime: "09:00", endTime: "18:00", hours: 9 },
  토: { isWorkDay: false },
  일: { isWorkDay: false },
  createdAt: timestamp
}
```

**특징:**
- 1개 문서 = 1주차 스케줄
- 한 요일에 1개 근무만 가능
- 요일별 필드로 저장

## 새로운 구조 (날짜별 개별 문서)

```javascript
// 문서 ID: auto-generated
// 각 근무가 별도 문서
{
  userId: "user123",
  userName: "김연아",
  store: "맛남살롱 부천시청점",
  date: "2025-11-11",  // YYYY-MM-DD 형식
  startTime: "09:00",
  endTime: "18:00",
  hours: 9,
  isShiftReplacement: false,  // 대체근무 여부
  shiftRequestId: null,  // 대체근무인 경우 요청 ID
  originalRequesterId: null,  // 대체근무인 경우 원 신청자
  originalRequesterName: null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**특징:**
- 1개 문서 = 1개 근무
- 한 날짜에 여러 근무 가능
- 날짜별 쿼리 가능

## 마이그레이션 전략

### 1단계: 백업
- 현재 schedules 컬렉션 전체 백업
- schedules_backup 컬렉션에 복사

### 2단계: 새 문서 생성
- 기존 주차별 문서를 읽어서
- 각 요일을 개별 문서로 변환
- schedules_new 컬렉션에 저장

### 3단계: 검증
- 데이터 개수 확인
- 샘플 데이터 비교
- 무결성 검증

### 4단계: 전환
- schedules → schedules_old 이름 변경
- schedules_new → schedules 이름 변경

### 5단계: 코드 수정
- 모든 schedules 조회 코드 수정
- 테스트

## 영향받는 코드 위치

### admin-dashboard.html (5곳)
1. **Line 3838-3857**: 대체근무 승인 시 스케줄 수정
2. **Line 7134**: 급여 계산 시 스케줄 조회
3. **Line 7334**: 스케줄 저장
4. **Line 9109**: 근무스케줄표 조회

### js/employee.js (3곳)
1. **Line 2971**: 직원 스케줄 조회
2. **Line 3345**: 대체근무 신청 시 본인 근무시간 조회
3. **Line 3586**: 매장 스케줄표 조회

## 필요한 Firestore 인덱스

```
컬렉션: schedules
인덱스 1: userId (asc) + date (asc)
인덱스 2: store (asc) + date (asc)
인덱스 3: date (asc) + userId (asc)
```

## 롤백 계획

문제 발생 시:
1. 코드를 이전 버전으로 롤백
2. schedules_old → schedules 복원
3. schedules_new 삭제

## 테스트 체크리스트

- [ ] 관리자: 근무스케줄표 주차별 조회
- [ ] 관리자: 스케줄 저장
- [ ] 관리자: 대체근무 승인
- [ ] 관리자: 급여 계산
- [ ] 직원: 내 스케줄 조회
- [ ] 직원: 대체근무 신청 (본인 근무시간 자동 입력)
- [ ] 직원: 매장 스케줄표 조회
- [ ] 한 날짜에 여러 근무 표시
- [ ] 대체근무 승인 후 승인자 근무 추가
- [ ] 대체근무 승인 후 신청자 근무 삭제
