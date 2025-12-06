# 🔥 Firestore 인덱스 가이드 (v3.7)

**날짜**: 2025-01-20  
**버전**: v3.7  
**작업**: 복합 인덱스 최적화 및 표준화

---

## 📋 개요

이 문서는 `firestore.indexes.json` 파일에 정의된 모든 복합 인덱스(Composite Indexes)의 목적과 사용처를 설명합니다.

### ✅ 주요 개선사항 (v3.7)

1. **멀티테넌트 지원**: 모든 인덱스에 `companyId` 필드 포함
2. **필드명 표준화**: `userId` 듀얼 필드 (userId + 기존 필드) 인덱스 추가
3. **누락 인덱스 추가**: `open_shifts`, `notices`, `signedContracts` 등
4. **성능 최적화**: 자주 사용되는 쿼리 패턴 완벽 커버

---

## 📊 인덱스 통계

| 컬렉션 | 인덱스 개수 | 비고 |
|--------|------------|------|
| **attendance** | 3개 | 출퇴근 조회 (개인/매장별) |
| **contracts** | 3개 | 계약서 조회 (직원별/상태별) |
| **schedules** | 3개 | 스케줄 조회 (개인/매장/이름) |
| **salaries** | 2개 | 급여 조회 (직원별 + 표준 필드) |
| **time_change_reports** | 3개 | 수정 이력 (직원별/출근기록별) |
| **approvals** | 3개 | 승인 요청 (신청자별/상태별) |
| **shift_requests** | 4개 | 교대 근무 (매장별/신청자별) |
| **open_shifts** | 2개 | 근무 모집 (매장별/상태별) |
| **notices** | 2개 | 공지사항 (회사/매장별) |
| **signedContracts** | 2개 | 서명 계약서 (직원별) |
| **users** | 2개 | 직원 목록 (매장별/상태별) |
| **합계** | **29개** | 모든 쿼리 패턴 커버 |

---

## 🔍 인덱스 상세 설명

### 1️⃣ attendance (출퇴근 기록)

#### 인덱스 1: 개인별 출근 기록 조회 (오름차순)
```json
{
  "collectionGroup": "attendance",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 내 출근 기록 조회 (과거→현재)
```javascript
db.collection('attendance')
  .where('companyId', '==', myCompany)
  .where('userId', '==', myUid)
  .where('date', '>=', startDate)
  .where('date', '<=', endDate)
  .get();
```

---

#### 인덱스 2: 개인별 출근 기록 조회 (내림차순)
```json
{
  "collectionGroup": "attendance",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 최근 출근 기록 우선 표시
```javascript
db.collection('attendance')
  .where('companyId', '==', myCompany)
  .where('userId', '==', myUid)
  .orderBy('date', 'desc')
  .limit(10)
  .get();
```

---

#### 인덱스 3: 매장별 출근 기록 조회
```json
{
  "collectionGroup": "attendance",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "storeId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

**사용처**: 관리자 대시보드 - 매장 전체 출근 현황
```javascript
db.collection('attendance')
  .where('companyId', '==', myCompany)
  .where('storeId', '==', myStore)
  .where('date', '>=', startDate)
  .get();
```

---

### 2️⃣ contracts (계약서)

#### 인덱스 1: 직원별 계약서 조회 (기존 필드)
```json
{
  "collectionGroup": "contracts",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "employeeId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 내 계약서 목록 (최신순)

---

#### 인덱스 2: 직원별 계약서 조회 (표준 필드)
```json
{
  "collectionGroup": "contracts",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 필드명 표준화 (v3.2) 이후 신규 쿼리

---

#### 인덱스 3: 계약서 상태별 조회
```json
{
  "collectionGroup": "contracts",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 관리자 대시보드 - 활성/종료 계약서 필터링

---

### 3️⃣ schedules (근무 스케줄)

#### 인덱스 1: 매장별 스케줄 조회
```json
{
  "collectionGroup": "schedules",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "storeId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 매장 전체 스케줄 간트차트

---

#### 인덱스 2: 개인별 스케줄 조회
```json
{
  "collectionGroup": "schedules",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 내 근무 일정 확인

---

#### 인덱스 3: 직원 이름으로 스케줄 검색
```json
{
  "collectionGroup": "schedules",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "storeId", "order": "ASCENDING" },
    { "fieldPath": "userName", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

**사용처**: 관리자 대시보드 - 직원명 검색 + 날짜 필터

---

### 4️⃣ salaries (급여)

#### 인덱스 1: 직원별 급여 조회 (기존 필드)
```json
{
  "collectionGroup": "salaries",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "employeeUid", "order": "ASCENDING" },
    { "fieldPath": "yearMonth", "order": "DESCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 내 급여 내역 (최신순)

---

#### 인덱스 2: 직원별 급여 조회 (표준 필드)
```json
{
  "collectionGroup": "salaries",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "yearMonth", "order": "DESCENDING" }
  ]
}
```

**사용처**: 필드명 표준화 이후 신규 쿼리

---

### 5️⃣ time_change_reports (수정 이력) ⭐

#### 인덱스 1: 직원별 관리자 수정 알림 (기존 필드)
```json
{
  "collectionGroup": "time_change_reports",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "employeeUid", "order": "ASCENDING" },
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 관리자가 수정한 출근 기록 알림 (최근 7일)
```javascript
db.collection('time_change_reports')
  .where('companyId', '==', myCompany)
  .where('employeeUid', '==', myUid)
  .where('type', '==', 'admin_edit')
  .where('createdAt', '>=', sevenDaysAgo)
  .orderBy('createdAt', 'desc')
  .limit(5)
  .get();
```

**⭐ 중요**: DEPLOYMENT_v3.6.md에서 언급된 필수 인덱스!

---

#### 인덱스 2: 직원별 수정 이력 (표준 필드)
```json
{
  "collectionGroup": "time_change_reports",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 필드명 표준화 이후 신규 쿼리

---

#### 인덱스 3: 출근기록별 수정 이력
```json
{
  "collectionGroup": "time_change_reports",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "attendanceId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 관리자 대시보드 - 특정 출근기록의 전체 수정 이력

---

### 6️⃣ approvals (승인 요청)

#### 인덱스 1: 신청자별 승인 요청 (기존 필드)
```json
{
  "collectionGroup": "approvals",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "applicantUid", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 내 승인 요청 목록

---

#### 인덱스 2: 신청자별 승인 요청 (표준 필드)
```json
{
  "collectionGroup": "approvals",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 필드명 표준화 이후 신규 쿼리

---

#### 인덱스 3: 상태별 승인 요청
```json
{
  "collectionGroup": "approvals",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 관리자 대시보드 - 대기중/승인/거절 필터링

---

### 7️⃣ shift_requests (교대 근무) ⭐

#### 인덱스 1: 매장별 대타 구하기 (기존 필드)
```json
{
  "collectionGroup": "shift_requests",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "store", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 내 매장의 대기중 교대 요청 조회
```javascript
db.collection('shift_requests')
  .where('companyId', '==', myCompany)
  .where('store', '==', myStore)
  .where('status', '==', 'pending')
  .onSnapshot();
```

**⭐ 중요**: DEPLOYMENT_v3.6.md에서 언급된 필수 인덱스!

---

#### 인덱스 2: 매장별 대타 구하기 (표준 필드)
```json
{
  "collectionGroup": "shift_requests",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "storeId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

**사용처**: 멀티테넌트 + storeId 기준 쿼리

---

#### 인덱스 3: 신청자별 교대 요청 (기존 필드)
```json
{
  "collectionGroup": "shift_requests",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "requesterId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 내가 신청한 교대 요청 목록

---

#### 인덱스 4: 신청자별 교대 요청 (표준 필드)
```json
{
  "collectionGroup": "shift_requests",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "requesterUserId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 필드명 표준화 이후 신규 쿼리

---

### 8️⃣ open_shifts (근무 모집)

#### 인덱스 1: 매장별 근무 모집 공고
```json
{
  "collectionGroup": "open_shifts",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "storeId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 내 매장의 열린 근무 공고

---

#### 인덱스 2: 회사 전체 근무 모집 공고
```json
{
  "collectionGroup": "open_shifts",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "ASCENDING" }
  ]
}
```

**사용처**: 관리자 대시보드 - 전체 매장 근무 모집 현황

---

### 9️⃣ notices (공지사항)

#### 인덱스 1: 회사 전체 공지사항
```json
{
  "collectionGroup": "notices",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 회사 공지사항 최신순

---

#### 인덱스 2: 매장별 공지사항
```json
{
  "collectionGroup": "notices",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "storeId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 내 매장 공지사항 최신순

---

### 🔟 signedContracts (서명 계약서)

#### 인덱스 1: 직원별 서명 계약서 (기존 필드)
```json
{
  "collectionGroup": "signedContracts",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "employeeId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 직원 포털 - 내 서명 계약서 목록

---

#### 인덱스 2: 직원별 서명 계약서 (표준 필드)
```json
{
  "collectionGroup": "signedContracts",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 필드명 표준화 이후 신규 쿼리

---

### 1️⃣1️⃣ users (직원 정보)

#### 인덱스 1: 매장별 직원 목록
```json
{
  "collectionGroup": "users",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "storeId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

**사용처**: 관리자 대시보드 - 매장별 활성 직원 조회

---

#### 인덱스 2: 상태별 직원 목록
```json
{
  "collectionGroup": "users",
  "fields": [
    { "fieldPath": "companyId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**사용처**: 관리자 대시보드 - 가입 대기/활성/퇴사 직원 필터링

---

## 🚀 배포 방법

### **방법 1: Firebase CLI (권장)** ✅

```bash
cd /home/user/webapp

# Firestore 인덱스만 배포
firebase deploy --only firestore:indexes

# 성공 메시지 확인
# ✔  firestore: deployed indexes in firestore.indexes.json successfully
```

**배포 시간**: 약 10~30초

---

### **방법 2: Firebase Console (수동)**

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/abcdc-staff-system/firestore/indexes
   ```

2. **"복합 색인 추가" 클릭**

3. **각 인덱스를 하나씩 수동 생성**
   - 컬렉션 ID 입력
   - 필드 추가 (순서 중요!)
   - 정렬 방향 선택 (ASCENDING/DESCENDING)

4. **"만들기" 클릭**

5. **빌드 완료 대기** (5~10분 소요)

**⚠️ 주의**: 29개 인덱스를 수동 생성하면 시간이 많이 걸립니다. CLI 사용을 권장합니다.

---

## 🧪 인덱스 검증

### 배포 후 확인

```bash
# Firebase Console에서 인덱스 상태 확인
https://console.firebase.google.com/project/abcdc-staff-system/firestore/indexes
```

**확인 사항**:
- ✅ 모든 인덱스 상태: "사용 설정됨" (녹색)
- ❌ "빌드 중" 상태는 대기 필요 (5~10분)
- ❌ "오류" 상태는 필드명 확인 필요

---

### 실제 쿼리 테스트

**직원 포털 테스트**:
1. 직원으로 로그인 (staff/manager)
2. 근무내역 탭 → 출근 기록 표시 확인
3. 계약서 탭 → 계약서 목록 표시 확인
4. Console 확인 → ❌ 인덱스 에러 없음

**관리자 대시보드 테스트**:
1. 관리자로 로그인
2. 직원 탭 → 전체 직원 목록 확인
3. 근무 관리 → 매장별 스케줄 확인
4. Console 확인 → ❌ 인덱스 에러 없음

---

## 📊 인덱스 관리 팁

### 불필요한 인덱스 제거

**⚠️ 주의**: 사용하지 않는 인덱스는 삭제해서 비용 절감 가능

```bash
# Firebase Console에서 확인
https://console.firebase.google.com/project/abcdc-staff-system/firestore/indexes

# "사용하지 않음" 태그가 있는 인덱스 삭제
```

---

### 인덱스 빌드 시간

| 데이터 규모 | 예상 빌드 시간 |
|-----------|--------------|
| < 1,000건 | 1~3분 |
| < 10,000건 | 3~5분 |
| < 100,000건 | 5~10분 |
| > 100,000건 | 10~30분 |

---

### 인덱스 비용

**Firestore 인덱스는 무료**입니다! 
- 읽기/쓰기 비용만 발생
- 인덱스 자체에는 비용 없음
- 안심하고 최적화 가능

---

## 🚨 트러블슈팅

### 문제 1: "The query requires an index" 에러

**증상**:
```
FirebaseError: The query requires an index. 
You can create it here: https://...
```

**해결**:
1. 에러 로그에서 URL 복사
2. 브라우저에서 URL 열기
3. "인덱스 만들기" 클릭
4. 5~10분 대기

**또는**:
```bash
firebase deploy --only firestore:indexes
```

---

### 문제 2: 인덱스 빌드 실패

**원인**: 필드명 오타 또는 데이터 타입 불일치

**해결**:
1. Firebase Console → 인덱스 상태 확인
2. "오류" 메시지 읽기
3. 필드명 확인 (대소문자 정확히)
4. 데이터 타입 확인 (string/number/timestamp)
5. `firestore.indexes.json` 수정
6. 재배포

---

### 문제 3: 인덱스 삭제 불가

**원인**: 현재 사용 중인 인덱스

**해결**:
1. 쿼리 로그 확인
2. 정말 사용 안 하는지 검증
3. Firebase Console에서 강제 삭제

---

## 📚 추가 리소스

- **Firebase 인덱스 문서**: https://firebase.google.com/docs/firestore/query-data/indexing
- **Firestore Rules**: `/home/user/webapp/firestore.rules`
- **필드명 표준화**: `/home/user/webapp/FIELD_NAMING_STANDARD.md`

---

## 📞 문의

인덱스 관련 문제 발생 시:
1. Firebase Console 로그 확인
2. 이 문서의 트러블슈팅 참고
3. GitHub Issues에 등록

**배포 성공을 기원합니다!** 🚀
