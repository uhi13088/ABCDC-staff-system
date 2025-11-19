# Firebase Rules 수동 배포 가이드

## 개요
이 가이드는 **Firestore Rules**와 **Storage Rules**를 Firebase Console에서 수동으로 배포하는 방법을 설명합니다.

GitHub Actions는 Functions와 Hosting만 자동 배포하므로, **Rules는 반드시 Firebase Console에서 수동으로 배포**해야 합니다.

---

## ⚠️ 배포 전 확인사항

다음과 같은 증상이 나타나면 Rules 배포가 필요합니다:

1. **super_admin 계정이 모든 컬렉션에서 "Missing or insufficient permissions" 에러 발생**
2. **admin 계정이 자기 회사 데이터에 접근할 수 없음**
3. **회사 로고 업로드 시 권한 오류 발생**
4. **초대 코드 상태 변경 시 권한 오류 발생**

---

## 📋 Step 1: Firestore Rules 배포

### 1.1 Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **ABCDC Staff System** 프로젝트 선택
3. 왼쪽 메뉴에서 **Firestore Database** 클릭
4. 상단 탭에서 **규칙(Rules)** 클릭

### 1.2 Rules 코드 복사
1. 이 저장소의 `firestore.rules` 파일 열기
2. **전체 내용 복사** (Line 1-482)

### 1.3 Console에 붙여넣기
1. Firebase Console의 규칙 편집기에서 **기존 내용 전체 삭제**
2. 복사한 `firestore.rules` 내용 **전체 붙여넣기**
3. 우측 상단의 **게시(Publish)** 버튼 클릭
4. 확인 대화상자에서 **게시** 클릭

### 1.4 배포 확인
```javascript
// Console에서 다음 메시지 확인:
✅ Firestore Security Rules 배포 완료
```

---

## 📋 Step 2: Storage Rules 배포

### 2.1 Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **ABCDC Staff System** 프로젝트 선택
3. 왼쪽 메뉴에서 **Storage** 클릭
4. 상단 탭에서 **Rules** 클릭

### 2.2 Rules 코드 복사
1. 이 저장소의 `storage.rules` 파일 열기
2. **전체 내용 복사** (Line 1-34)

### 2.3 Console에 붙여넣기
1. Firebase Console의 규칙 편집기에서 **기존 내용 전체 삭제**
2. 복사한 `storage.rules` 내용 **전체 붙여넣기**
3. 우측 상단의 **게시(Publish)** 버튼 클릭
4. 확인 대화상자에서 **게시** 클릭

### 2.4 배포 확인
```javascript
// Console에서 다음 메시지 확인:
✅ Storage Security Rules 배포 완료
```

---

## 🔍 배포 후 테스트 방법

### 테스트 1: super_admin 권한 확인
1. super_admin 계정으로 로그인
2. 관리자 대시보드 접속
3. 직원 목록, 매장 목록, 초대 코드 목록이 정상적으로 로드되는지 확인
4. "🌐 플랫폼 대시보드" 탭이 보이는지 확인

### 테스트 2: 초대 코드 상태 변경
1. super_admin 또는 admin 계정으로 로그인
2. "초대 코드" 탭으로 이동
3. 기존 초대 코드의 "⏸️ 중지" 또는 "▶️ 활성" 버튼 클릭
4. 권한 오류 없이 정상적으로 상태가 변경되는지 확인

### 테스트 3: 회사 로고 업로드
1. admin 계정으로 로그인
2. 우측 상단 "🏢 회사 정보" 버튼 클릭
3. "로고 업로드" 기능으로 이미지 업로드
4. 권한 오류 없이 정상적으로 업로드되는지 확인
5. 대시보드 헤더에 로고가 표시되는지 확인

### 테스트 4: 역할별 접근 제어
1. **staff 계정**: 관리자 대시보드 접근 시 employee.html로 리다이렉트되는지 확인
2. **store_manager 계정**: "시스템 설정" 탭이 숨겨지는지 확인
3. **manager 계정**: 모든 쓰기 버튼이 숨겨지는지 확인
4. **admin 계정**: 모든 탭과 버튼이 정상적으로 표시되는지 확인

---

## 🔧 문제 해결

### 문제 1: "Missing or insufficient permissions" 지속
**원인**: Rules가 제대로 배포되지 않았거나, 브라우저 캐시 문제

**해결방법**:
1. Firebase Console에서 규칙이 실제로 업데이트되었는지 확인
2. 브라우저 캐시 강력 새로고침 (Ctrl+Shift+R 또는 Cmd+Shift+R)
3. 시크릿 모드로 테스트
4. 로그아웃 후 다시 로그인

### 문제 2: 로고 업로드 실패
**원인**: Storage Rules가 배포되지 않았거나, 잘못 배포됨

**해결방법**:
1. Firebase Console → Storage → Rules 확인
2. `storage.rules` 파일 내용이 정확히 일치하는지 확인
3. 특히 Line 19-26의 권한 체크 로직이 누락되지 않았는지 확인

### 문제 3: super_admin 계정도 접근 불가
**원인**: `isSuperAdmin()` 함수가 Firestore role 필드를 체크하는데, users 컬렉션에 role이 없거나 잘못됨

**해결방법**:
1. Firestore Console → users 컬렉션 확인
2. super_admin 계정의 `role` 필드가 정확히 `"super_admin"`인지 확인 (대소문자 일치)
3. 필드가 없거나 다르면 수동으로 수정

---

## 📚 관련 파일

- **Firestore Rules**: `/home/user/webapp/firestore.rules` (482줄)
- **Storage Rules**: `/home/user/webapp/storage.rules` (34줄)
- **Firebase Config**: `/home/user/webapp/firebase.json`

---

## ⏰ 배포 주기

Rules는 다음과 같은 경우에만 재배포가 필요합니다:

1. **보안 정책 변경**: 새로운 역할 추가, 권한 수정 등
2. **컬렉션 추가**: 새로운 Firestore 컬렉션 생성 시
3. **Storage 경로 추가**: 새로운 파일 업로드 경로 추가 시
4. **버그 수정**: 권한 오류 발견 및 수정 시

**Functions나 Hosting 코드 변경만으로는 Rules 재배포가 불필요합니다.**

---

## ✅ 체크리스트

배포 전후로 다음 항목을 체크하세요:

- [ ] `firestore.rules` 파일을 최신 버전으로 업데이트
- [ ] Firebase Console에서 Firestore Rules 전체 복사 & 붙여넣기
- [ ] Firestore Rules 게시 완료
- [ ] `storage.rules` 파일을 최신 버전으로 업데이트
- [ ] Firebase Console에서 Storage Rules 전체 복사 & 붙여넣기
- [ ] Storage Rules 게시 완료
- [ ] super_admin 계정으로 접근 테스트
- [ ] 초대 코드 상태 변경 테스트
- [ ] 회사 로고 업로드 테스트
- [ ] 역할별 메뉴 제어 확인

---

**마지막 업데이트**: 2025-01-19  
**작성자**: Phase 2 Implementation Team
