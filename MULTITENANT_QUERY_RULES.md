# 멀티테넌트 쿼리 규칙

**날짜**: 2025-01-16  
**목적**: 데이터 격리 및 보안 원칙 명확화

---

## 🔒 핵심 원칙

### 1. 절대 공유 금지
- ❌ **직원**: 다른 매장 데이터 절대 접근 불가
- ❌ **관리자**: 기본적으로 자기 매장만 (다른 매장은 UI 필터로 선택 시에만)
- ❌ **자동 전체 조회**: 회사 전체를 자동으로 보여주면 안 됨

### 2. 명시적 필터링
- ✅ **직원 페이지**: 항상 `currentUser.storeId` 필터
- ✅ **관리자 페이지**: 기본은 자기 매장, UI에서 다른 매장 선택 가능
- ✅ **통계/대시보드**: 매장별 데이터 합산 (필터 없이 전체 조회 금지)

---

## 📋 컬렉션별 필터 규칙

### 회사 단위 컬렉션 (companyId 필터)

#### users
```javascript
// ✅ 올바른 쿼리
db.collection('users')
  .where('companyId', '==', myCompanyId)
  .where('role', '==', 'staff')
```

#### stores
```javascript
// ✅ 올바른 쿼리
db.collection('stores')
  .where('companyId', '==', myCompanyId)
```

#### notices
```javascript
// ✅ 올바른 쿼리
db.collection('notices')
  .where('companyId', '==', myCompanyId)
  .orderBy('createdAt', 'desc')
```

#### approvals
```javascript
// ✅ 올바른 쿼리
db.collection('approvals')
  .where('companyId', '==', myCompanyId)
  .where('status', '==', 'pending')
```

#### shift_requests
```javascript
// ✅ 올바른 쿼리
db.collection('shift_requests')
  .where('companyId', '==', myCompanyId)
  .where('status', '==', 'pending')
```

---

### 매장 단위 컬렉션 (storeId 필터 + companyId 보조)

#### contracts
```javascript
// ✅ 기본: 내 매장만
db.collection('contracts')
  .where('storeId', '==', currentUser.storeId)

// ✅ 관리자가 다른 매장 선택
db.collection('contracts')
  .where('storeId', '==', selectedStoreId)  // UI 선택
```

#### attendance
```javascript
// ✅ 직원: 내 매장만
db.collection('attendance')
  .where('storeId', '==', currentUser.storeId)
  .where('date', '==', today)

// ✅ 관리자: 선택한 매장
db.collection('attendance')
  .where('storeId', '==', selectedStoreId)
  .where('date', '>=', startDate)

// ✅ 통계: 회사 전체 (companyId 사용)
// 주의: attendance에 companyId 필드 추가 필수!
db.collection('attendance')
  .where('companyId', '==', myCompanyId)
  .where('date', '==', today)
```

#### salaries
```javascript
// ✅ 직원: 본인 것만
db.collection('salaries')
  .where('uid', '==', currentUser.uid)

// ✅ 관리자: 선택한 매장
db.collection('salaries')
  .where('storeId', '==', selectedStoreId)
  .where('month', '==', currentMonth)
```

#### schedules
```javascript
// ✅ 직원: 본인 스케줄
db.collection('schedules')
  .where('userId', '==', currentUser.uid)
  .where('date', '>=', mondayStr)

// ✅ 관리자: 선택한 매장의 전체 스케줄
db.collection('schedules')
  .where('storeId', '==', selectedStoreId)
  .where('date', '>=', mondayStr)
```

---

## 🏗️ 데이터 구조

### 필수 필드

#### 회사 단위 컬렉션
```javascript
{
  companyId: "company_xxx",  // 필수
  // ... 기타 필드
}
```

#### 매장 단위 컬렉션
```javascript
{
  companyId: "company_xxx",  // 필수 (통계용)
  storeId: "store_xxx",      // 필수 (기본 필터)
  // ... 기타 필드
}
```

### 생성 시 자동 포함

```javascript
// ❌ 잘못된 방법
await db.collection('attendance').add({
  uid: userId,
  date: today,
  // companyId, storeId 누락!
});

// ✅ 올바른 방법
await db.collection('attendance').add({
  companyId: currentUser.companyId,  // 필수
  storeId: currentUser.storeId,      // 필수
  uid: userId,
  date: today,
  // ...
});
```

---

## 🎯 UI 필터 가이드

### 관리자 대시보드

#### 매장 선택 필터 (필수)
```html
<select id="storeFilter">
  <option value="">전체 매장</option>
  <option value="store_1">본점</option>
  <option value="store_2">지점</option>
</select>
```

```javascript
// 매장 선택 시
const selectedStoreId = document.getElementById('storeFilter').value;

if (selectedStoreId) {
  // 특정 매장
  query = query.where('storeId', '==', selectedStoreId);
} else {
  // 전체 매장 (companyId 사용)
  query = query.where('companyId', '==', myCompanyId);
}
```

#### 통계 표시 (매장별 구분)
```javascript
// ❌ 잘못된 방법: 전체 합산만
총 출근: 25명

// ✅ 올바른 방법: 매장별 표시
총 출근: 25명
- 본점: 15명
- 지점: 10명
```

---

## 📝 체크리스트

### 데이터 생성 시
- [ ] companyId 포함 확인
- [ ] storeId 포함 확인 (매장 단위 컬렉션)
- [ ] currentUser 정보에서 자동으로 가져오기

### 데이터 조회 시
- [ ] 직원: storeId 필터 필수
- [ ] 관리자: 기본은 자기 매장, UI 선택 시 변경
- [ ] 통계: companyId로 조회 후 매장별 그룹화

### UI 구현 시
- [ ] 매장 선택 드롭다운 추가
- [ ] 기본값: 현재 사용자의 매장
- [ ] 변경 시 데이터 재조회

---

## ⚠️ 금지 사항

### 1. 필터 없는 전체 조회
```javascript
// ❌ 절대 금지
const snapshot = await db.collection('attendance').get();
```

### 2. 클라이언트 필터링
```javascript
// ❌ 잘못된 방법: 전체 조회 후 필터
const allData = await db.collection('users').get();
const myStoreData = allData.filter(d => d.storeId === myStoreId);

// ✅ 올바른 방법: 쿼리에서 필터
const myStoreData = await db.collection('users')
  .where('storeId', '==', myStoreId)
  .get();
```

### 3. 하드코딩된 ID
```javascript
// ❌ 잘못된 방법
const companyId = 'company_12345';

// ✅ 올바른 방법
const companyId = currentUser.companyId;
```

---

## 🔧 마이그레이션

### 기존 데이터에 companyId 추가

**실행**:
```bash
node scripts/add-companyid-to-store-collections.js
```

**대상**:
- attendance
- salaries  
- schedules

**방법**:
1. storeId로 stores 컬렉션 조회
2. store.companyId 가져오기
3. 해당 문서에 companyId 추가

---

**마지막 업데이트**: 2025-01-16  
**상태**: 적용 중
