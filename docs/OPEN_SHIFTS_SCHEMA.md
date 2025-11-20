# Open Shifts (근무 모집 시스템) - DB Schema

## 📋 개요

**컬렉션명**: `open_shifts`

**목적**: 기존 1:1 교대 요청 방식의 한계를 극복하고, 관리자가 공고를 올리면 직원이 선착순으로 수락하는 효율적인 근무 모집 시스템.

**특징**:
- ✅ 관리자가 대타 또는 추가 근무 공고 생성
- ✅ 직원이 실시간으로 공고 조회 및 선착순 수락
- ✅ Firestore Transaction으로 동시성 제어 (중복 수락 방지)
- ✅ 시급 인센티브 설정 가능

---

## 📊 필드 구조

### 필수 필드

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `companyId` | `string` | 회사 ID (멀티테넌트 격리) | `"company_abc123"` |
| `storeId` | `string` | 매장 ID | `"store_456"` |
| `storeName` | `string` | 매장 이름 (표시용) | `"맛남살롱 부천시청점"` |
| `date` | `string` | 근무 날짜 (ISO 8601) | `"2025-01-15"` |
| `startTime` | `string` | 시작 시간 (HH:mm) | `"09:00"` |
| `endTime` | `string` | 종료 시간 (HH:mm) | `"18:00"` |
| `type` | `string` | 모집 유형 | `"replacement"` 또는 `"extra"` |
| `status` | `string` | 공고 상태 | `"open"`, `"closed"`, `"cancelled"` |
| `wageIncentive` | `number` | 추가 시급 (원) | `5000` |
| `matchedUserId` | `string` \| `null` | 수락한 직원 ID | `"user_789"` 또는 `null` |

### 추가 메타데이터 (선택)

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `createdBy` | `string` | 공고 생성자 ID | `"admin_uid_123"` |
| `createdByName` | `string` | 생성자 이름 | `"김관리자"` |
| `createdAt` | `timestamp` | 생성 시각 | `Timestamp(2025-01-10 14:30:00)` |
| `matchedAt` | `timestamp` \| `null` | 수락 시각 | `Timestamp(2025-01-10 15:45:00)` |
| `matchedUserName` | `string` \| `null` | 수락한 직원 이름 | `"이직원"` |
| `description` | `string` | 공고 설명 (선택) | `"주말 피크타임 추가 인력 필요"` |
| `cancelledAt` | `timestamp` \| `null` | 취소 시각 | `null` |
| `cancelledBy` | `string` \| `null` | 취소자 ID | `null` |

---

## 🔒 보안 규칙 (Firestore Rules v3.7)

### 1. Read (조회)
```javascript
// ✅ 허용: 같은 회사 직원 누구나 공고 조회 가능
allow read: if isSignedIn() && (
  isSuperAdmin() ||
  resource.data.companyId == currentCompanyId()
);
```

**설명**: 
- 같은 회사 소속이면 모든 공고 확인 가능
- 클라이언트 쿼리 예시: `.where('companyId', '==', currentUser.companyId)`

---

### 2. Create (생성)
```javascript
// ✅ 허용: 관리자만 공고 생성 가능
allow create: if isSignedIn() && (
  isSuperAdmin() ||
  (isManagerOrAbove() && request.resource.data.companyId == currentCompanyId())
);
```

**설명**:
- `admin`, `store_manager` 이상만 공고 생성
- 생성 시 반드시 `companyId` 포함 필요

---

### 3. Update (수정) - 핵심 로직 ⭐

#### 3-1. 관리자 수정
```javascript
// ✅ 허용: 관리자는 전체 수정 가능 (취소, 재오픈 등)
isSuperAdmin() ||
(isManagerOrAbove() && resource.data.companyId == currentCompanyId())
```

**허용 작업**:
- 공고 취소 (`status: 'cancelled'`)
- 공고 재오픈 (`status: 'open'`, `matchedUserId: null`)
- 시급 인센티브 수정
- 날짜/시간 변경

---

#### 3-2. 직원 선착순 수락 (Transaction 필수) ⚡
```javascript
// ✅ 허용: 직원은 선착순 수락만 가능
(
  resource.data.companyId == currentCompanyId() &&
  // 현재 상태가 'open'이어야 함
  resource.data.status == 'open' &&
  // 변경하려는 상태가 'closed'여야 함
  request.resource.data.status == 'closed' &&
  // matchedUserId를 본인으로 설정해야 함
  request.resource.data.matchedUserId == request.auth.uid &&
  // 기존 matchedUserId가 null이어야 함 (이미 매칭된 경우 방지)
  resource.data.matchedUserId == null &&
  // 다른 필드는 변경 불가 (companyId, storeId, date 등)
  request.resource.data.companyId == resource.data.companyId &&
  request.resource.data.storeId == resource.data.storeId &&
  request.resource.data.date == resource.data.date &&
  request.resource.data.startTime == resource.data.startTime &&
  request.resource.data.endTime == resource.data.endTime &&
  request.resource.data.type == resource.data.type &&
  request.resource.data.wageIncentive == resource.data.wageIncentive
)
```

**보안 요구사항**:
1. ✅ **현재 상태 검증**: `status == 'open'` (모집중만 수락 가능)
2. ✅ **상태 전환 제한**: `status: 'open' → 'closed'` (다른 전환 불가)
3. ✅ **본인 인증**: `matchedUserId == request.auth.uid` (본인만 수락)
4. ✅ **중복 방지**: `resource.data.matchedUserId == null` (이미 매칭된 경우 차단)
5. ✅ **필드 불변성**: 핵심 필드(날짜, 시간, 시급) 변경 불가

**클라이언트 구현 (Transaction 필수)**:
```javascript
// ❌ 잘못된 방법: 일반 update (Race Condition 발생 가능)
await db.collection('open_shifts').doc(shiftId).update({
  status: 'closed',
  matchedUserId: currentUser.uid
});

// ✅ 올바른 방법: Transaction으로 동시성 제어
await db.runTransaction(async (transaction) => {
  const shiftRef = db.collection('open_shifts').doc(shiftId);
  const shiftDoc = await transaction.get(shiftRef);
  
  if (!shiftDoc.exists) {
    throw new Error('공고가 존재하지 않습니다.');
  }
  
  const shiftData = shiftDoc.data();
  
  // 이미 마감된 경우 차단
  if (shiftData.status !== 'open' || shiftData.matchedUserId !== null) {
    throw new Error('이미 마감된 공고입니다.');
  }
  
  // 선착순 수락
  transaction.update(shiftRef, {
    status: 'closed',
    matchedUserId: currentUser.uid,
    matchedUserName: currentUser.name,
    matchedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
});
```

---

### 4. Delete (삭제)
```javascript
// ✅ 허용: 관리자만 공고 삭제 가능
allow delete: if isSignedIn() && (
  isSuperAdmin() ||
  (isManagerOrAbove() && resource.data.companyId == currentCompanyId())
);
```

**설명**:
- 관리자는 공고 완전 삭제 가능
- 권장: 삭제보다는 `status: 'cancelled'`로 변경 (이력 보존)

---

## 📝 데이터 예시

### 예시 1: 대타 모집 (Open 상태)
```json
{
  "companyId": "company_abc123",
  "storeId": "store_bucheon_city_hall",
  "storeName": "맛남살롱 부천시청점",
  "date": "2025-01-20",
  "startTime": "14:00",
  "endTime": "22:00",
  "type": "replacement",
  "status": "open",
  "wageIncentive": 5000,
  "matchedUserId": null,
  "description": "주말 저녁 시간대 대타 구합니다",
  "createdBy": "admin_uid_123",
  "createdByName": "김관리자",
  "createdAt": "2025-01-15T10:30:00Z",
  "matchedAt": null,
  "matchedUserName": null,
  "cancelledAt": null,
  "cancelledBy": null
}
```

### 예시 2: 추가 근무 모집 (Closed 상태)
```json
{
  "companyId": "company_abc123",
  "storeId": "store_bucheon_sangdong",
  "storeName": "맛남살롱 상동점",
  "date": "2025-01-25",
  "startTime": "09:00",
  "endTime": "18:00",
  "type": "extra",
  "status": "closed",
  "wageIncentive": 10000,
  "matchedUserId": "user_789",
  "description": "주말 피크타임 추가 인력 필요",
  "createdBy": "admin_uid_456",
  "createdByName": "박매니저",
  "createdAt": "2025-01-18T09:00:00Z",
  "matchedAt": "2025-01-18T09:15:30Z",
  "matchedUserName": "이직원",
  "cancelledAt": null,
  "cancelledBy": null
}
```

### 예시 3: 취소된 공고
```json
{
  "companyId": "company_abc123",
  "storeId": "store_bucheon_station",
  "storeName": "맛남살롱 부천역사점",
  "date": "2025-01-28",
  "startTime": "12:00",
  "endTime": "20:00",
  "type": "replacement",
  "status": "cancelled",
  "wageIncentive": 3000,
  "matchedUserId": null,
  "description": "기존 직원 복귀로 취소",
  "createdBy": "admin_uid_789",
  "createdByName": "최매니저",
  "createdAt": "2025-01-22T14:00:00Z",
  "matchedAt": null,
  "matchedUserName": null,
  "cancelledAt": "2025-01-23T10:30:00Z",
  "cancelledBy": "admin_uid_789"
}
```

---

## 🔍 쿼리 패턴

### 1. 직원: 내 매장의 모집중인 공고 조회
```javascript
const openShifts = await db.collection('open_shifts')
  .where('companyId', '==', currentUser.companyId)  // 🔥 필수
  .where('storeId', '==', currentUser.storeId)
  .where('status', '==', 'open')
  .orderBy('date', 'asc')
  .orderBy('startTime', 'asc')
  .get();
```

### 2. 관리자: 특정 날짜의 모든 공고 조회
```javascript
const shiftsOnDate = await db.collection('open_shifts')
  .where('companyId', '==', currentUser.companyId)  // 🔥 필수
  .where('date', '==', '2025-01-20')
  .get();
```

### 3. 관리자: 마감된 공고 중 특정 직원이 수락한 공고
```javascript
const myAcceptedShifts = await db.collection('open_shifts')
  .where('companyId', '==', currentUser.companyId)  // 🔥 필수
  .where('matchedUserId', '==', userId)
  .where('status', '==', 'closed')
  .get();
```

---

## 🚀 구현 체크리스트

### Phase 1: DB & Security Rules ✅
- [x] `open_shifts` 컬렉션 스키마 설계
- [x] Firestore Rules 작성 (읽기/쓰기/수정/삭제)
- [x] Transaction 기반 선착순 수락 규칙 구현
- [x] 문서화 (이 파일)

### Phase 2: Backend (Next Step)
- [ ] 관리자: 공고 생성 API
- [ ] 관리자: 공고 취소/재오픈 API
- [ ] 직원: 선착순 수락 Transaction 구현
- [ ] 에러 핸들링 (이미 마감, 권한 없음 등)

### Phase 3: Frontend (Next Step)
- [ ] 관리자 대시보드: 공고 생성 UI
- [ ] 직원 포털: 실시간 공고 목록 (자동 새로고침)
- [ ] 선착순 수락 버튼 (낙관적 UI 업데이트)
- [ ] 알림 시스템 (새 공고, 수락 완료 등)

---

## 🎯 비즈니스 로직 요약

1. **관리자가 공고 생성**
   - `status: 'open'`, `matchedUserId: null`
   - 시급 인센티브 설정 가능

2. **직원이 공고 조회**
   - 내 매장의 `status: 'open'` 공고만 표시
   - 날짜/시간/시급 정보 확인

3. **직원이 선착순 수락**
   - Transaction으로 동시성 제어
   - 성공: `status: 'closed'`, `matchedUserId: <본인>`
   - 실패: "이미 마감되었습니다" 에러

4. **관리자가 취소/재오픈**
   - 취소: `status: 'cancelled'`
   - 재오픈: `status: 'open'`, `matchedUserId: null`

---

## 📚 관련 문서

- `firestore.rules` - Line 279-326 (open_shifts 규칙)
- `FIELD_NAMING_STANDARD.md` - 필드 명명 규칙
- `README.md` - 프로젝트 개요

---

**작성일**: 2025-01-20
**버전**: v1.0
**작성자**: ABCDC Staff System Dev Team
