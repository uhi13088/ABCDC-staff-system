# Firestore Security Rules v3.1.3 - 변경 사항

**날짜**: 2025-01-16  
**작성자**: AI Assistant  
**목적**: 순환참조 제거 + 보안 강화 유지

---

## 🎯 핵심 변경사항

### 1. ⭐ 순환참조 완전 제거

**문제점 (v3.1.2)**:
```javascript
// ❌ 순환참조 위험
match /users/{userId} {
  allow read: if isSignedIn() && (
    request.auth.uid == userId ||
    isSuperAdmin() ||
    (currentUserExists() && isSameCompany(resource) && isAdminOrManager())
    // ↑ currentUser()를 호출 → users/{userId}를 get()
    // → 같은 규칙을 또 평가해야 함 → 순환참조 가능성
  );
}
```

**해결책 (v3.1.3)**:
```javascript
// ✅ 순환참조 방지
match /users/{userId} {
  allow read: if isSignedIn() && (
    request.auth.uid == userId ||  // 본인은 직접 비교
    isSuperAdmin() ||
    (
      request.auth.uid != userId &&  // ⭐ 가드 추가: 자기 자신 제외
      currentUserExists() &&
      currentUser().data.companyId == resource.data.companyId &&
      currentUser().data.role in ["admin", "manager", "store_manager"]
    )
  );
}
```

**핵심 원칙**:
- `/users` 컬렉션 내에서 **자기 자신 문서 접근 시 `currentUser()` 사용 금지**
- **타인 문서 접근 시에만** `currentUser()` 사용 허용
- 모든 update/delete 규칙에 `request.auth.uid != userId` 가드 추가

---

### 2. ⚡ Helper 함수 최적화 (get() 호출 감소)

**Before (v3.1.2)**: 여러 번 get() 호출
```javascript
// ❌ 비효율: 3번 get() 호출
allow read: if isSignedIn() && (
  currentUserExists() &&           // 1번
  isSameCompany(resource) &&       // 2번 (currentCompanyId → currentUser)
  isAdminOrManager()               // 3번 (currentRole → currentUser)
);
```

**After (v3.1.3)**: 1번만 get() 호출
```javascript
// ✅ 효율: 1번 get() 호출
function isCompanyAdminOrManager() {
  return currentUserExists()
      && currentUser().data.companyId == resource.data.companyId
      && currentUser().data.role in ["admin", "manager", "store_manager"];
}

allow read: if isSignedIn() && (
  isSuperAdmin() ||
  isCompanyAdminOrManager()  // 한 번에 모든 체크
);
```

**새로 추가된 최적화 함수**:
- `isCompanyAdmin()` - 같은 회사 + admin 역할 (1회 get)
- `isCompanyAdminOrManager()` - 같은 회사 + admin/manager/store_manager (1회 get)

---

### 3. 🔒 민감 필드 보호 유지 (v3.1.2와 동일)

**사용자 자신 수정 시 민감 필드 잠금**:
```javascript
allow update: if isSignedIn()
              && request.auth.uid == userId
              && request.resource.data.companyId == resource.data.companyId  // 🔒 불변
              && request.resource.data.role == resource.data.role            // 🔒 불변
              && request.resource.data.storeId == resource.data.storeId      // 🔒 불변
              && request.resource.data.status == resource.data.status;       // 🔒 불변
```

**Admin은 모든 필드 수정 가능**:
```javascript
allow update, delete: if isSignedIn() && (
  isSuperAdmin() ||
  (
    request.auth.uid != userId &&  // ⭐ 순환참조 방지 가드
    currentUserExists() &&
    currentUser().data.companyId == resource.data.companyId &&
    currentUser().data.role == "admin"
  )
);
```

**적용 대상**:
- ✅ `/users` - companyId, role, storeId, status 잠금
- ✅ `/employees` - companyId, storeId, role, status 잠금

---

### 4. 📋 변경된 컬렉션 규칙

| 컬렉션 | 변경 내용 |
|--------|-----------|
| `/users` | ⭐ 순환참조 제거 + 민감 필드 보호 유지 |
| `/employees` | ⭐ 순환참조 제거 + 민감 필드 보호 유지 |
| `/attendance` | ✅ `isCompanyAdminOrManager()` 사용으로 최적화 |
| `/schedules` | ✅ `isCompanyAdmin()` 사용으로 최적화 |
| `/contracts` | ✅ `isCompanyAdminOrManager()` 사용으로 최적화 |
| `/savedContracts` | ✅ `isCompanyAdmin()` 사용으로 최적화 |
| `/signedContracts` | ✅ 본인 계약서 서명 권한 유지 + 최적화 |
| `/salaries` | 변경 없음 (이미 최적화됨) |
| `/notices` | ✅ `isCompanyAdminOrManager()` 사용으로 최적화 |
| `/approvals` | ✅ `isCompanyAdmin()` 사용으로 최적화 |
| `/shift_requests` | 변경 없음 (이미 최적화됨) |
| `/time_change_reports` | ✅ `isCompanyAdminOrManager()` 사용으로 최적화 |
| `/employee_docs` | 변경 없음 (개별 get 필요) |
| `/company_invites` | ✅ `isCompanyAdmin()` 사용으로 최적화 |

---

## 🧪 테스트 체크리스트

### 순환참조 테스트
- [ ] 본인 `/users/{uid}` 문서 읽기 성공
- [ ] 본인 `/users/{uid}` 문서 수정 성공 (민감 필드 제외)
- [ ] 본인 `/users/{uid}` 문서 민감 필드 수정 실패 (companyId, role 등)
- [ ] Admin이 타 직원 `/users/{otherUid}` 읽기 성공
- [ ] Admin이 타 직원 `/users/{otherUid}` 모든 필드 수정 성공

### 민감 필드 보호 테스트
- [ ] 직원이 자신의 `companyId` 변경 시도 → PERMISSION_DENIED
- [ ] 직원이 자신의 `role` 변경 시도 → PERMISSION_DENIED
- [ ] 직원이 자신의 `storeId` 변경 시도 → PERMISSION_DENIED
- [ ] Admin이 직원의 `role` 변경 → 성공
- [ ] Admin이 직원의 `companyId` 변경 → 성공

### 멀티테넌트 격리 테스트
- [ ] 회사A 직원이 회사B 데이터 읽기 시도 → PERMISSION_DENIED
- [ ] 회사A Admin이 회사B 데이터 수정 시도 → PERMISSION_DENIED
- [ ] super_admin이 모든 회사 데이터 접근 → 성공

### 성능 테스트
- [ ] 관리자 페이지에서 대량 쿼리 실행 → get() 호출 10회 이내
- [ ] 단일 요청에서 여러 컬렉션 접근 → 정상 작동
- [ ] Firebase Console Rules 시뮬레이터 테스트 통과

---

## 📊 성능 비교

| 버전 | 평균 get() 호출 | 순환참조 위험 | 가독성 |
|------|----------------|---------------|--------|
| v3.1.1 | 1-2회 | ✅ 없음 | ⚠️ 낮음 (코드 중복) |
| v3.1.2 | 2-3회 | ❌ 있음 | ✅ 높음 |
| v3.1.3 | 1-2회 | ✅ 없음 | ✅ 높음 |

---

## 🚀 배포 절차

### 1. Firestore 데이터 삭제 (완료)
```bash
node delete-all-firestore-data.js
# ✅ 101개 문서 삭제 완료
```

### 2. Firestore Rules 배포
1. Firebase Console 접속
2. Firestore Database → Rules 탭
3. `/home/user/webapp/firestore.rules` 내용 복사
4. 붙여넣기 후 "게시" 클릭

### 3. 초기 데이터 생성 (수동)
다음 순서로 데이터 생성:
1. **회사 (companies)** 생성 (Admin SDK 또는 수동)
2. **지점 (stores)** 생성
3. **초대코드 (company_invites)** 생성
4. **직원 등록** (employee-register.html 사용)

---

## 🔐 보안 강화 요약

1. **순환참조 제거** ✅
   - `/users`, `/employees` 컬렉션에서 자기 자신 접근 시 helper 사용 안 함

2. **민감 필드 보호** ✅
   - companyId, role, storeId, status 직원 본인 수정 불가

3. **멀티테넌트 격리** ✅
   - 모든 컬렉션 companyId 기반 접근 제어

4. **역할 기반 권한** ✅
   - super_admin → admin → manager → store_manager → staff 계층

5. **성능 최적화** ✅
   - get() 호출 1-2회로 감소 (기존 2-3회)

---

## 📝 마이그레이션 노트

### 기존 데이터 삭제 완료
- **삭제 시각**: 2025-01-16
- **삭제 문서 수**: 101개
- **삭제 컬렉션**: 19개
- **이유**: 멀티테넌트 구조 전환 + 순환참조 제거

### 새 데이터 스키마 요구사항
모든 문서는 다음 필드 필수:
```javascript
{
  companyId: "ABC2025",        // 필수
  storeId: "store001",         // 선택 (일부 컬렉션)
  createdAt: Timestamp,        // 필수
  createdBy: "uid123",         // 권장
  // ... 기타 필드
}
```

---

## 🎓 개발자 가이드라인

### Helper 함수 사용 규칙
1. **`/users`, `/employees` 내부**: helper 사용 금지, 직접 비교만 사용
2. **다른 컬렉션**: helper 자유롭게 사용 가능
3. **자기 자신 체크**: 항상 `request.auth.uid != targetId` 가드 먼저

### 새 컬렉션 추가 시 템플릿
```javascript
match /new_collection/{docId} {
  allow read: if isSignedIn() && (
    isSuperAdmin() ||
    isCompanyAdminOrManager()  // 최적화된 helper 사용
  );
  
  allow create: if isSignedIn() &&
                   currentUserExists() &&
                   request.resource.data.companyId == currentCompanyId();
  
  allow update, delete: if isSignedIn() && (
    isSuperAdmin() ||
    isCompanyAdmin()
  );
}
```

---

## 📞 문의

**프로젝트**: ABCDC Staff System  
**문서 버전**: v3.1.3  
**마지막 업데이트**: 2025-01-16
