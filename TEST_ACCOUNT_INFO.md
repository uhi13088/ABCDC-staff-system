# 🧪 테스트 계정 정보

**생성 날짜**: 2025-01-16  
**목적**: Firestore Rules v3.1.3 테스트

---

## 🔗 회원가입 URL

```
https://abcdc-staff-system.web.app/employee-register.html?code=ABC2025-ADMIN-5B4UHV5T
```

**⚠️ 중요**: 위 URL을 브라우저에서 열면 초대코드가 자동으로 입력됩니다.

---

## 📝 입력할 정보

회원가입 페이지에서 다음 정보를 입력하세요:

| 항목 | 값 |
|------|-----|
| **초대코드** | `ABC2025-ADMIN-5B4UHV5T` (자동 입력됨) |
| **이메일** | `admin@abcdc.com` |
| **비밀번호** | `Abcdc2025!@#` |
| **이름** | `홍길동` |
| **전화번호** | `010-1234-5678` |

---

## 🎯 자동 할당되는 정보

회원가입 완료 시 다음 정보가 자동으로 할당됩니다:

```javascript
{
  companyId: "ABC2025",          // 회사: ABC Dessert Center
  storeId: "store001",           // 지점: 맛남살롱 부천시청점
  role: "admin",                 // 역할: 관리자 (전체 권한)
  status: "active"               // 상태: 활성
}
```

---

## ✅ 테스트 절차

### 1단계: 회원가입
1. URL 접속 (초대코드 자동 입력 확인)
2. 이메일/비밀번호/이름/전화번호 입력
3. "회원가입" 버튼 클릭
4. 성공 메시지 확인

### 2단계: 로그인
1. 이메일: `admin@abcdc.com`
2. 비밀번호: `Abcdc2025!@#`
3. 로그인 완료 확인

### 3단계: 권한 테스트

#### ✅ 정상 작동해야 하는 것들:
- [ ] 대시보드 접속 → 성공
- [ ] 본인 정보 읽기 → 성공
- [ ] 본인 이름 수정 → 성공
- [ ] 본인 전화번호 수정 → 성공
- [ ] 직원 목록 조회 → 성공 (비어있음)
- [ ] 출퇴근 기록 조회 → 성공 (비어있음)

#### ❌ 실패해야 하는 것들 (보안 테스트):
- [ ] 본인 `role` 수정 시도 → **PERMISSION_DENIED** (정상)
- [ ] 본인 `companyId` 수정 시도 → **PERMISSION_DENIED** (정상)
- [ ] 본인 `storeId` 수정 시도 → **PERMISSION_DENIED** (정상)

**⚠️ 위 3개가 실패하면 보안이 제대로 작동하는 겁니다!**

### 4단계: Firestore 데이터 확인

Firebase Console에서 확인:
```
Firestore Database → 다음 컬렉션 확인:

✅ companies/ABC2025
   - companyName: "ABC Dessert Center"
   
✅ stores/store001
   - storeName: "맛남살롱 부천시청점"
   - companyId: "ABC2025"
   
✅ users/[새로운 uid]
   - email: "admin@abcdc.com"
   - role: "admin"
   - companyId: "ABC2025"
   - storeId: "store001"
   
✅ employees/[새로운 uid]
   - 위와 동일한 데이터
   
✅ company_invites/[문서 ID]
   - code: "ABC2025-ADMIN-5B4UHV5T"
   - currentUses: 1 (사용됨)
```

---

## 🐛 문제 해결

### 회원가입 실패 시

**오류: "Invite code not found"**
- 원인: 초대코드가 잘못됨
- 해결: URL을 정확히 복사했는지 확인

**오류: "Email already in use"**
- 원인: 이미 해당 이메일로 가입됨
- 해결: Firebase Console → Authentication → Users에서 기존 계정 삭제 후 재시도

**오류: "PERMISSION_DENIED"**
- 원인: Firestore Rules가 배포되지 않음
- 해결: Firebase Console → Firestore → Rules 탭에서 v3.1.3 배포 확인

### 로그인 실패 시

**오류: "Invalid email or password"**
- 원인: 비밀번호 오타 또는 회원가입 미완료
- 해결: 비밀번호 정확히 입력 (`Abcdc2025!@#`)

### 데이터 조회 실패 시

**오류: "PERMISSION_DENIED" (대시보드)**
- 원인 1: Firestore Rules v3.1.3이 배포되지 않음
- 원인 2: 사용자 문서에 `companyId` 누락
- 해결: Firebase Console에서 users 문서 확인

---

## 📊 생성된 데이터

### Firestore 컬렉션
```
companies: 1개 문서
stores: 1개 문서
company_invites: 1개 문서 (사용 횟수 0 → 1로 증가 예정)
users: 회원가입 후 1개 생성됨
employees: 회원가입 후 1개 생성됨
```

### 초대코드 정보
```javascript
{
  code: "ABC2025-ADMIN-5B4UHV5T",
  companyId: "ABC2025",
  storeId: "store001",
  role: "admin",
  maxUses: 1,
  currentUses: 0,  // 회원가입 후 1로 증가
  expiresAt: 2025-02-15 (30일 후),
  isActive: true
}
```

---

## 🔐 보안 테스트 시나리오

### 시나리오 1: 민감 필드 수정 시도 (실패해야 함)

**테스트 방법** (브라우저 개발자 도구 Console):
```javascript
// Firebase 초기화 (이미 페이지에 있음)
const db = firebase.firestore();
const auth = firebase.auth();

// 현재 사용자 UID
const uid = auth.currentUser.uid;

// ❌ role 변경 시도 (실패해야 함)
db.collection('users').doc(uid).update({
  role: 'super_admin'
});
// 예상 결과: PERMISSION_DENIED

// ❌ companyId 변경 시도 (실패해야 함)
db.collection('users').doc(uid).update({
  companyId: 'HACKER2025'
});
// 예상 결과: PERMISSION_DENIED

// ✅ 이름 변경 (성공해야 함)
db.collection('users').doc(uid).update({
  displayName: '김철수'
});
// 예상 결과: 성공
```

### 시나리오 2: 타 회사 데이터 접근 시도 (실패해야 함)

**테스트 준비**:
1. Firebase Console에서 수동으로 타 회사 생성:
   ```
   companies/XYZ2025:
     companyId: "XYZ2025"
     companyName: "다른 회사"
   ```

**테스트 실행**:
```javascript
// ❌ 타 회사 데이터 읽기 시도 (실패해야 함)
db.collection('companies').doc('XYZ2025').get()
  .then(doc => console.log('성공:', doc.data()))
  .catch(err => console.log('실패:', err.message));
// 예상 결과: PERMISSION_DENIED
```

---

## ✅ 성공 기준

다음 조건이 모두 만족되면 멀티테넌트 전환 성공:

1. ✅ 회원가입 성공 (초대코드 자동 검증)
2. ✅ 로그인 성공
3. ✅ 대시보드 접속 성공
4. ✅ 본인 정보 읽기 성공
5. ✅ 본인 일반 필드 수정 성공 (이름, 전화번호)
6. ❌ 본인 민감 필드 수정 실패 (role, companyId, storeId)
7. ❌ 타 회사 데이터 접근 실패
8. ✅ Firestore에 올바른 데이터 구조 생성 (companyId 포함)

---

## 📞 문의

테스트 중 문제 발생 시:
1. Firebase Console → Firestore → Rules 탭에서 v3.1.3 배포 확인
2. Firestore → Data 탭에서 users 문서에 companyId 존재 확인
3. Authentication → Users 탭에서 계정 생성 확인

**문서 참조**:
- 배포 가이드: `DEPLOYMENT_GUIDE.md`
- 변경사항: `firestore-rules-v3.1.3-changes.md`
- 최종 요약: `FINAL_SUMMARY.md`

---

**🎉 테스트 준비 완료! 위 URL로 회원가입하세요!**
