# Cloud Functions 멀티테넌트 감사 보고서

**날짜**: 2025-01-16  
**감사 대상**: functions/index.js  
**목적**: Phase 1 - 멀티테넌트 위반 코드 제거

---

## 📊 감사 결과 요약

**총 Functions**: 10개  
**멀티테넌트 안전**: 6개 ✅  
**멀티테넌트 위반**: 1개 ❌  
**주의 필요**: 3개 ⚠️

---

## ✅ 안전한 Functions (6개)

### 1. `deleteAuthOnUserDelete` ✅
- **기능**: users 문서 삭제 시 Firebase Auth 계정 자동 삭제
- **멀티테넌트 영향**: 없음 (개별 userId 기준 트리거)
- **안전 이유**: Firestore 트리거 방식, companyId 필요 없음

### 2. `deleteAuthOnResign` ✅
- **기능**: users.status가 'resigned'로 변경 시 Auth 계정 삭제
- **멀티테넌트 영향**: 없음
- **안전 이유**: Firestore 트리거 방식, 개별 문서 처리

### 3. `verifyInviteCode` ✅
- **기능**: 초대 코드 검증
- **멀티테넌트 영향**: 없음
- **안전 이유**: 초대 코드에 이미 companyId + storeId 포함됨

### 4. `recordInviteUse` ✅
- **기능**: 초대 코드 사용 기록
- **멀티테넌트 영향**: 없음
- **안전 이유**: 단순 usedCount 증가만

### 5. `createInviteCode` ✅
- **기능**: 초대 코드 생성 (관리자 전용)
- **멀티테넌트 영향**: 없음
- **안전 이유**: 입력으로 companyId, storeId 받음

### 6. `cleanupOldResignedUsers` ✅
- **기능**: 2년 지난 퇴사자 문서 삭제
- **멀티테넌트 영향**: 없음
- **안전 이유**: 모든 회사 공통 정리 작업, resignedAt 기준만 사용

---

## ⚠️ 주의 필요 Functions (3개)

### 1. `cleanupOrphanedAuth` ⚠️
- **기능**: Firestore에 없는 Authentication 계정 정리
- **현재 상태**: Line 84-89에서 **전체 users 컬렉션 조회**
  ```javascript
  const usersSnapshot = await admin.firestore().collection('users').get();
  const validUIDs = new Set();
  
  usersSnapshot.forEach(doc => {
    validUIDs.add(doc.id);
  });
  ```
- **멀티테넌트 영향**: **낮음** (UID 기준 동작, 회사 구분 불필요)
- **권장 사항**: 현재 코드 유지 가능 (모든 회사의 유효한 UID 수집하는 것이 목적)

---

## ❌ 멀티테넌트 위반 Functions (1개)

### 1. `createAbsentRecords` ❌ **수정 필요!**

**위치**: Line 304-436

**문제점**:
1. **attendance 문서에 companyId 누락** (Line 381-393)
   ```javascript
   const absentRecord = {
     uid: worker.employeeId,
     name: worker.employeeName,
     store: worker.workStore,  // ❌ 문자열만 저장
     date: yesterdayStr,
     status: 'absent',
     // ... companyId 없음! ❌
   };
   ```

2. **contracts 조회 시 companyId 필터 없음** (Line 323-325)
   ```javascript
   const contractsSnapshot = await db.collection('contracts')
     .where('status', '==', 'active')  // ❌ 모든 회사 계약서 조회
     .get();
   ```

**영향**:
- 새로 생성되는 attendance 문서에 companyId가 없어서 멀티테넌트 쿼리 불가
- 모든 회사의 계약서를 조회하므로 성능 문제 가능 (회사 많아지면)

**수정 방안**:

#### 방안 1: 회사별 순회 (권장)
```javascript
// 1. 모든 회사 조회
const companiesSnapshot = await db.collection('companies').get();

for (const companyDoc of companiesSnapshot.docs) {
  const companyId = companyDoc.id;
  
  // 2. 해당 회사의 활성 계약서만 조회
  const contractsSnapshot = await db.collection('contracts')
    .where('companyId', '==', companyId)  // ✅ 회사별 필터
    .where('status', '==', 'active')
    .get();
  
  // 3. attendance 생성 시 companyId 포함
  const absentRecord = {
    companyId: companyId,  // ✅ 추가
    storeId: worker.storeId || null,  // ✅ storeId도 추가 (계약서에서 가져오기)
    uid: worker.employeeId,
    name: worker.employeeName,
    store: worker.workStore,
    date: yesterdayStr,
    status: 'absent',
    // ...
  };
}
```

#### 방안 2: contracts에서 companyId 추출 (대안)
```javascript
// 계약서에서 companyId 가져오기
contractsSnapshot.forEach(doc => {
  const contract = doc.data();
  
  // attendance 생성 시
  const absentRecord = {
    companyId: contract.companyId,  // ✅ 계약서에서 가져오기
    storeId: contract.storeId || null,
    // ...
  };
});
```

---

## ⚠️ 다른 Function도 동일 문제

### `createAbsentRecordsForDate` ⚠️

**위치**: Line 448-607

**문제**: `createAbsentRecords`와 동일한 문제
- Line 488-490: contracts 조회 시 companyId 필터 없음
- Line 545-558: attendance 생성 시 companyId 누락

**해결**: `createAbsentRecords`와 동일한 방법으로 수정

---

## 🎯 수정 우선순위

### 높음 (즉시 수정)
1. **createAbsentRecords** - 매일 자동 실행되는 Function
2. **createAbsentRecordsForDate** - 테스트/보정용이지만 동일 수정 필요

### 중간 (검토 후 결정)
- **cleanupOrphanedAuth** - 현재 코드 유지 가능하나, 대량 조회 최적화 검토

---

## 📋 수정 체크리스트

- [ ] `createAbsentRecords` 수정
  - [ ] companies 컬렉션 순회 추가
  - [ ] contracts 쿼리에 companyId 필터 추가
  - [ ] attendance 문서에 companyId, storeId 필드 추가
  - [ ] contracts 스키마에서 storeId 확인 (있으면 사용)
  
- [ ] `createAbsentRecordsForDate` 수정
  - [ ] `createAbsentRecords`와 동일하게 수정
  
- [ ] 테스트
  - [ ] 2개 회사 데이터로 테스트
  - [ ] attendance 문서에 companyId 포함 확인
  - [ ] 회사별로 올바른 결근 기록 생성 확인

---

## 📝 참고사항

### contracts 컬렉션 스키마 확인 필요
- `contracts` 문서에 `companyId` 포함 여부 확인
- `contracts` 문서에 `storeId` 포함 여부 확인
- `CONTRACTS_COLLECTION_SCHEMA.md` 참고

### attendance 컬렉션 표준 필드
```javascript
{
  companyId: "company_abc123",  // ✅ 필수
  storeId: "store_1",           // ✅ 권장 (있으면 좋음)
  uid: "user_abc123",
  name: "직원명",
  store: "매장명",  // 문자열 (호환성)
  date: "2025-01-16",
  status: "absent",
  clockIn: null,
  clockOut: null,
  workType: "계약",
  autoCreated: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

**다음 단계**: 
1. contracts 스키마 확인
2. `createAbsentRecords` 수정
3. Functions 배포
4. 테스트

**예상 소요 시간**: 30분 ~ 1시간
