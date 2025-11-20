# 🚀 배포 가이드

**버전**: Phase 2 완료  
**날짜**: 2025-01-19

---

## 📦 자동 배포 (GitHub Actions)

**GitHub에 푸시하면 자동으로 Firebase Hosting에 배포됩니다.**

```bash
git add .
git commit -m "Update feature"
git push origin main
```

**배포 프로세스**:
1. `main` 브랜치에 푸시
2. GitHub Actions 자동 실행
3. Firebase Hosting 자동 배포
4. 약 2-3분 후 완료

**배포 URL**: https://abcdc-staff-system.web.app

---

## 🔐 Firestore Rules 배포 (수동 필수)

**⚠️ 중요: Firestore Rules는 Firebase Console에서 수동 배포가 필요합니다.**

### 배포 방법

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - ABCDC Staff System 프로젝트 선택

2. **Firestore Rules 페이지로 이동**
   - Firestore Database → 규칙(Rules) 탭

3. **Rules 복사 및 붙여넣기**
   - `/home/user/webapp/firestore.rules` 파일 열기
   - 전체 내용 복사 (Line 1-502)
   - Firebase Console 편집기에 **기존 내용 전체 삭제** 후 붙여넣기

4. **게시(Publish)**
   - 우측 상단 **게시** 버튼 클릭
   - 확인 대화상자에서 **게시** 클릭

### 배포 필요 시점

- 권한 정책 변경 시
- 새 컬렉션 추가 시
- 보안 버그 수정 시
- "Missing or insufficient permissions" 에러 발생 시

### 배포 후 확인

```bash
# 브라우저 강력 새로고침
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# 시크릿 모드로 테스트
```

---

## ☁️ Cloud Functions 배포

```bash
cd /home/user/webapp

# Firebase 로그인 (최초 1회)
firebase login

# Functions 배포
firebase deploy --only functions
```

### 배포되는 Functions

- `verifyInviteCode`: 초대 코드 검증
- `recordInviteUse`: 초대 코드 사용 기록
- `createInviteCode`: 초대 코드 생성 (admin/store_manager)
- `deleteUser`: 직원 삭제 시 Auth 계정 자동 삭제
- `createAbsentRecords`: 매일 자정 자동 결근 생성

---

## 🎫 초기 데이터 생성

### 1. 회사 생성 (companies)

**Firebase Console → Firestore Database → companies 컬렉션**

```javascript
문서 ID: ABC2025 (또는 자동 생성)

필드:
{
  companyId: "ABC2025",
  companyName: "ABC Dessert Center",
  brandName: "맛남살롱",
  businessNumber: "123-45-67890",
  address: "부천시 원미구...",
  phone: "032-xxx-xxxx",
  email: "contact@abcdc.com",
  logoUrl: "",
  primaryColor: "#2563EB",
  status: "active",
  createdAt: [timestamp],
  createdBy: "system"
}
```

### 2. 매장 생성 (stores)

**Firebase Console → stores 컬렉션**

```javascript
문서 ID: store001

필드:
{
  storeId: "store001",
  companyId: "ABC2025",  // ⚠️ 필수
  storeName: "맛남살롱 부천시청점",
  address: "부천시 원미구...",
  phone: "032-xxx-1111",
  status: "active",
  createdAt: [timestamp],
  createdBy: "system"
}
```

**추가 매장**:
- store002: "맛남살롱 상동점"
- store003: "맛남살롱 부천역사점"

### 3. 초대 코드 생성 (company_invites)

**Firebase Console → company_invites 컬렉션**

```javascript
문서 ID: [자동 생성]

필드:
{
  code: "ABC2025-ADMIN-12345",
  companyId: "ABC2025",
  storeId: "store001",
  role: "admin",  // admin, store_manager, manager, staff
  maxUses: 1,
  currentUses: 0,
  expiresAt: [7일 후 timestamp],
  isActive: true,
  createdAt: [timestamp],
  createdBy: "system"
}
```

**권장 초대 코드**:
1. Admin 1개 (최우선)
2. Store Manager 1-2개
3. Staff 여러 개

---

## ✅ 배포 후 테스트

### 1. 관리자 계정 생성

```
URL: https://abcdc-staff-system.web.app/employee-register.html?code=ABC2025-ADMIN-12345

정보 입력:
- 초대 코드: ABC2025-ADMIN-12345 (자동 입력)
- 이메일: admin@abcdc.com
- 비밀번호: [안전한 비밀번호]
- 이름: 홍길동
- 전화번호: 010-1234-5678
```

### 2. 권한 테스트

**Admin 계정으로 로그인 후**:
- ✅ 직원 목록 조회
- ✅ 매장 관리
- ✅ 초대 코드 생성
- ✅ 스케줄 관리
- ✅ 급여 관리

**Staff 계정으로 테스트**:
- ✅ 직원 포털 접근
- ✅ 본인 급여 조회
- ✅ 출퇴근 체크
- ❌ 관리자 페이지 접근 차단

### 3. 멀티테넌트 격리 테스트

- ✅ 같은 회사 데이터 조회 가능
- ❌ 다른 회사 데이터 접근 차단

---

## 🔧 문제 해결

### "Missing or insufficient permissions" 에러

**원인**: Firestore Rules가 배포되지 않음

**해결**:
1. Firebase Console에서 Firestore Rules 배포
2. 브라우저 강력 새로고침 (Ctrl+Shift+R)
3. 시크릿 모드로 재테스트

### 초대 코드 에러

**원인**: 초대 코드 만료 또는 사용 횟수 초과

**해결**:
1. Firebase Console에서 company_invites 확인
2. `isActive: true` 확인
3. `expiresAt` 날짜 확인
4. `currentUses < maxUses` 확인

### 역할별 메뉴 안 보임

**원인**: Firestore users 컬렉션 role 필드 누락

**해결**:
1. Firebase Console → users 컬렉션
2. 해당 사용자 문서의 `role` 필드 확인
3. 정확히 "admin", "store_manager", "manager", "staff" 중 하나인지 확인

---

## 📞 지원 및 문의

**프로젝트**: ABCDC Staff System  
**GitHub**: https://github.com/uhi13088/ABCDC-staff-system  
**배포 URL**: https://abcdc-staff-system.web.app

**마지막 업데이트**: 2025-01-19
