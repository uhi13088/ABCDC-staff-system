# Firestore 인덱스 설정 가이드

## 스케줄 마이그레이션 후 필수 인덱스

새로운 `schedules` 컬렉션 구조는 여러 복합 쿼리를 사용하므로, 아래의 Firestore 인덱스가 **필수**입니다.

---

## 1. 사용자별 날짜 범위 스케줄 조회

**쿼리 패턴:**
```javascript
db.collection('schedules')
  .where('userId', '==', uid)
  .where('date', '>=', startDate)
  .where('date', '<=', endDate)
```

**사용 위치:**
- `admin-dashboard.html` 라인 9107-9108: 관리자 스케줄 테이블
- `js/employee.js` 라인 2978-2979: 직원 본인 스케줄 조회

**인덱스 설정:**
```
Collection: schedules
Fields:
  - userId (Ascending)
  - date (Ascending)
```

**Firebase Console 설정 방법:**
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 → Firestore Database → 인덱스 탭
3. "복합 색인 추가" 클릭
4. 컬렉션 ID: `schedules`
5. 필드 추가:
   - `userId` - Ascending
   - `date` - Ascending
6. 쿼리 범위: Collection

---

## 2. 매장별 날짜 범위 스케줄 조회

**쿼리 패턴:**
```javascript
db.collection('schedules')
  .where('store', '==', storeId)
  .where('date', '>=', startDate)
  .where('date', '<=', endDate)
```

**사용 위치:**
- `admin-dashboard.html` 라인 2561-2562: 출퇴근 기록 조회
- `admin-dashboard.html` 라인 2691-2692: 주간 급여 계산
- `js/employee.js` 라인 3640-3641: 매장 스케줄표 조회
- `js/employee.js` 라인 623-624, 708-709: 출퇴근 기록 조회

**인덱스 설정:**
```
Collection: schedules
Fields:
  - store (Ascending)
  - date (Ascending)
```

**Firebase Console 설정 방법:**
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 → Firestore Database → 인덱스 탭
3. "복합 색인 추가" 클릭
4. 컬렉션 ID: `schedules`
5. 필드 추가:
   - `store` - Ascending
   - `date` - Ascending
6. 쿼리 범위: Collection

---

## 3. 사용자별 특정 날짜 스케줄 조회 + 시간대 필터

**쿼리 패턴:**
```javascript
db.collection('schedules')
  .where('userId', '==', uid)
  .where('date', '==', dateStr)
  .where('startTime', '==', startTime)
  .where('endTime', '==', endTime)
```

**사용 위치:**
- `admin-dashboard.html` 라인 3836: 교대근무 승인 시 원본 스케줄 삭제

**인덱스 설정:**
```
Collection: schedules
Fields:
  - userId (Ascending)
  - date (Ascending)
  - startTime (Ascending)
  - endTime (Ascending)
```

**Firebase Console 설정 방법:**
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 → Firestore Database → 인덱스 탭
3. "복합 색인 추가" 클릭
4. 컬렉션 ID: `schedules`
5. 필드 추가:
   - `userId` - Ascending
   - `date` - Ascending
   - `startTime` - Ascending
   - `endTime` - Ascending
6. 쿼리 범위: Collection

---

## 4. 단일 필드 인덱스 (자동 생성됨)

아래 단일 필드 인덱스는 Firestore가 자동으로 생성하므로 수동 설정 불필요:

- `schedules.userId`
- `schedules.store`
- `schedules.date`

---

## 인덱스 설정 순서

1. **먼저 필수 인덱스 3개를 Firebase Console에서 생성**
2. 인덱스 생성 완료까지 몇 분 소요 (상태: Building → Enabled)
3. 모든 인덱스가 "Enabled" 상태가 되면 마이그레이션 진행

---

## 인덱스 생성 확인 방법

```javascript
// 브라우저 개발자 도구 콘솔에서 실행
// 쿼리 실행 시 에러가 없으면 인덱스가 제대로 설정된 것

// 테스트 1: userId + date 범위 쿼리
const testQuery1 = await firebase.firestore().collection('schedules')
  .where('userId', '==', 'test-uid')
  .where('date', '>=', '2024-01-01')
  .where('date', '<=', '2024-01-07')
  .get();
console.log('✅ 테스트 1 통과:', testQuery1.size);

// 테스트 2: store + date 범위 쿼리
const testQuery2 = await firebase.firestore().collection('schedules')
  .where('store', '==', 'test-store')
  .where('date', '>=', '2024-01-01')
  .where('date', '<=', '2024-01-07')
  .get();
console.log('✅ 테스트 2 통과:', testQuery2.size);
```

---

## 주의사항

⚠️ **인덱스 없이 복합 쿼리 실행 시 발생하는 에러:**
```
Error: The query requires an index. You can create it here: https://console.firebase.google.com/...
```

이 에러가 발생하면:
1. 에러 메시지의 링크를 클릭 (자동으로 인덱스 생성 페이지로 이동)
2. 또는 위의 수동 설정 방법 참고

⚠️ **마이그레이션 전 필수:**
- 모든 인덱스가 "Enabled" 상태인지 확인
- 인덱스 없이 마이그레이션하면 쿼리 실패로 데이터 손실 가능

---

## 참고: 마이그레이션 도구 실행 순서

1. ✅ **이 문서의 인덱스 3개 생성 및 활성화 확인**
2. ✅ `/migrate-schedules.html` 접속
3. ✅ Stage 1: Backup → 기존 `schedules` 를 `schedules_backup` 으로 복사
4. ✅ Stage 2: Migrate → 새 구조로 변환하여 `schedules_new` 생성
5. ✅ Stage 3: Validate → 데이터 무결성 검증
6. ✅ Stage 4: Switch → `schedules` → `schedules_old`, `schedules_new` → `schedules`
7. ✅ 문제 발생 시: Rollback 버튼으로 즉시 복구

---

## 인덱스 비용

Firestore 인덱스는:
- **저장 비용**: 인덱스도 저장공간 차지 (실제 문서 크기의 약 10-20%)
- **쓰기 비용**: 문서 생성/수정 시 인덱스도 업데이트 (쓰기 작업 횟수 증가)
- **읽기 비용**: 복합 쿼리 성능 향상으로 전체 비용 절감 효과

**예상 비용 증가:**
- 기존 대비 약 10-15% 증가 (저장 + 쓰기)
- 하지만 쿼리 성능 향상으로 사용자 경험 대폭 개선

---

**작성일:** 2025-11-09  
**적용 대상:** schedules 컬렉션 마이그레이션 (Weekly → Daily)
