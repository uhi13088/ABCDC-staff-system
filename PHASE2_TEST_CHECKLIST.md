# Phase 2 테스트 체크리스트

## 🎯 Phase 2 완료 내역

### ✅ Step 1: Branding Application (완료)
- companies 컬렉션에 brandName, logoUrl, primaryColor 필드 추가
- admin-dashboard 헤더에 회사 로고/브랜드명 표시
- employee.html에서 회사명 제거 (매장명만 표시)

### ✅ Step 2: Store Management UI Enhancement (완료)
- 매장 목록에 "소속 회사" 컬럼 추가
- 매장 수정 모달에 read-only 회사 정보 필드 추가

### ✅ Step 3: Invite Code/Link UI Completion (완료)
- Admin Dashboard: "초대 코드 관리" 탭 추가
- 초대 코드 생성 폼 (매장 선택, 역할, maxUses, expiresAt)
- Cloud Function: createInviteCode에 store_manager 권한 추가
- employee-register.html: 상세 에러 메시지 추가

### ✅ Step 4: Super Admin LV1 Platform Dashboard (완료)
- 플랫폼 대시보드 탭 추가 (super_admin 전용)
- 회사별 집계 데이터 표시 (매장수, 직원수, 출석수)
- PII 제외 (개인정보 미표시)

### ✅ Step 5: Role-based Menu Control (완료)
- staff: 관리자 페이지 진입 차단
- store_manager: 제한된 메뉴 접근
- super_admin: 플랫폼 대시보드 표시
- admin: 모든 메뉴 접근

---

## 📋 테스트 체크리스트

### 1️⃣ Branding 테스트

#### 1.1 Admin Dashboard 브랜딩
- [ ] **로그인 후 헤더 확인**
  - companies 컬렉션에 brandName 있으면 표시
  - logoUrl 있으면 로고 이미지 표시
  - primaryColor 있으면 색상 적용
  - 없으면 기본 아이콘 + "관리자 대시보드" 표시

- [ ] **페이지 타이틀 확인**
  - 브라우저 탭에 `{brandName} - 관리자 대시보드` 표시

#### 1.2 Employee Portal 브랜딩
- [ ] **employee.html 로그인 후 확인**
  - 페이지 타이틀: `{storeName} - 직원 포털`
  - 헤더에 매장명만 표시 (회사명 미표시)
  - 어디에도 회사명이 노출되지 않음

---

### 2️⃣ Store Management UI 테스트

#### 2.1 매장 목록
- [ ] **"소속 회사" 컬럼 표시**
  - 각 매장 행에 회사 배지 표시
  - 배지 텍스트: brandName || companyName || name
  - 배지 색상: info-color (파란색)

#### 2.2 매장 수정 모달
- [ ] **회사 정보 필드**
  - "소속 회사" read-only 필드 표시
  - 회사명이 표시됨
  - 수정 불가 안내 메시지: "회사 정보는 변경할 수 없습니다."

---

### 3️⃣ Invite Code 테스트

#### 3.1 초대 코드 생성 (admin)
- [ ] **"초대 코드 관리" 탭 접근**
  - 탭이 표시됨
  - "+ 초대 코드 생성" 버튼 클릭 가능

- [ ] **초대 코드 생성 폼**
  - 모든 매장 선택 가능
  - 역할 선택: staff, store_manager, manager
  - 최대 사용 횟수 입력 (선택)
  - 만료일시 입력 (선택)

- [ ] **초대 코드 생성 성공**
  - 생성 완료 메시지
  - 초대 링크 자동 복사
  - 초대 코드 목록에 추가

#### 3.2 초대 코드 생성 (store_manager)
- [ ] **자기 매장만 선택 가능**
  - 매장 드롭다운에 자기 매장만 표시
  - 다른 매장 선택 불가

- [ ] **권한 검증**
  - 다른 매장 코드 생성 시도 시 에러:
    - "점장은 자신의 매장에만 초대 코드를 생성할 수 있습니다."

#### 3.3 초대 코드 상태 관리
- [ ] **초대 코드 목록**
  - 활성/비활성 상태 배지 표시
  - 사용 횟수 표시 (사용/최대)
  - 생성일 표시

- [ ] **상태 토글**
  - "중지" 버튼 클릭 → 비활성화
  - "활성" 버튼 클릭 → 활성화
  - 변경 후 목록 새로고침

#### 3.4 employee-register.html 에러 메시지
- [ ] **유효하지 않은 코드**
  - 에러: "❌ 유효하지 않은 초대 코드입니다."

- [ ] **비활성화된 코드**
  - 에러: "❌ 사용할 수 없는 초대 코드입니다. 관리자에게 새로운 코드를 요청하세요."

- [ ] **사용 횟수 초과**
  - 에러: "❌ 초대 코드 사용 횟수를 초과했습니다. 관리자에게 새로운 코드를 요청하세요."

- [ ] **만료된 코드**
  - 에러: "❌ 만료된 초대 코드입니다. 관리자에게 새로운 코드를 요청하세요."

- [ ] **유효한 코드**
  - 성공: "✅ 초대 코드가 확인되었습니다! 아래 정보를 입력해주세요."
  - 회사명, 매장명, 역할 표시

---

### 4️⃣ Super Admin Platform Dashboard 테스트

#### 4.1 플랫폼 대시보드 접근
- [ ] **super_admin 로그인**
  - "🌐 플랫폼 대시보드" 탭 표시됨
  - 탭 클릭 시 정상 로드

- [ ] **admin/store_manager 로그인**
  - 플랫폼 대시보드 탭 숨김
  - URL 직접 접근 시도 시 권한 오류

#### 4.2 플랫폼 대시보드 데이터
- [ ] **회사 목록 표시**
  - 모든 회사가 표시됨
  - 회사 ID (companyId)
  - 회사명 (brandName || companyName || name)

- [ ] **매장 수 집계**
  - 각 회사의 stores 컬렉션 count
  - "{N}개" 형식으로 표시

- [ ] **활성 직원 수 집계**
  - 각 회사의 users 컬렉션 중 staff/store_manager/manager
  - status !== 'resigned' 조건
  - "{N}명" 형식으로 표시

- [ ] **최근 7일 출석 수 집계**
  - 각 회사의 attendance 컬렉션 중 date >= 7일 전
  - "{N}건" 형식으로 표시

- [ ] **생성일 표시**
  - 회사의 createdAt 날짜
  - 한국어 날짜 형식

- [ ] **PII 제외 확인**
  - 개인 이름, 이메일, 급여, 계약서 등 미표시
  - 집계 데이터만 표시

---

### 5️⃣ Role-based Menu Control 테스트

#### 5.1 staff 권한 테스트
- [ ] **admin-login.html 로그인 시도**
  - 로그인 성공
  - 즉시 alert 표시: "직원 계정은 관리자 페이지에 접근할 수 없습니다."
  - employee.html로 자동 리다이렉트

#### 5.2 store_manager 권한 테스트
- [ ] **로그인 후 배지 확인**
  - 배지 텍스트: "점장"
  - 배지 색상: info-color (파란색)

- [ ] **탭 표시 확인**
  - ✅ 표시: 대시보드, 관리자, 직원 관리, 근무기록, 급여 관리, 승인 관리, 계약서, 근무스케줄, 공지사항, 매장 관리, 초대 코드
  - ❌ 숨김: 시스템 설정, 플랫폼 대시보드

- [ ] **매장 관리 제한**
  - "매장 추가" 버튼 숨김
  - 매장 목록: 자기 매장만 표시
  - 다른 매장 조회 불가

- [ ] **초대 코드 제한**
  - 초대 코드 생성 시 자기 매장만 선택 가능
  - Cloud Function에서 권한 검증

#### 5.3 admin 권한 테스트
- [ ] **로그인 후 배지 확인**
  - 배지 텍스트: "관리자"
  - 배지 색상: primary-color

- [ ] **탭 표시 확인**
  - ✅ 모든 탭 표시 (플랫폼 대시보드 제외)
  - 매장 관리: 모든 매장 표시
  - 초대 코드: 모든 매장 선택 가능

#### 5.4 super_admin 권한 테스트
- [ ] **로그인 후 배지 확인**
  - 배지 텍스트: "슈퍼 관리자"
  - 배지 색상: danger-color (빨간색)

- [ ] **탭 표시 확인**
  - ✅ 모든 탭 표시 (플랫폼 대시보드 포함)
  - 플랫폼 대시보드: 모든 회사 데이터 조회 가능

---

## 🔧 Functions 배포 (선택)

### Functions 배포 방법
```bash
cd /home/user/webapp/functions
npm install
cd ..
firebase deploy --only functions
```

### Functions 배포 후 테스트
- [ ] **createInviteCode Function**
  - admin: 모든 매장 초대 코드 생성 가능
  - store_manager: 자기 매장만 초대 코드 생성 가능
  - 에러 메시지 정상 반환

- [ ] **verifyInviteCode Function**
  - 유효한 코드: 회사/매장/역할 정보 반환
  - 비활성 코드: failed-precondition 에러
  - 사용 초과: resource-exhausted 에러
  - 만료 코드: deadline-exceeded 에러

---

## 🚀 배포 확인

### GitHub Push 확인
- [ ] **GitHub 저장소 확인**
  - URL: https://github.com/uhi13088/ABCDC-staff-system
  - 최신 커밋 확인:
    - "feat(invite): Phase 2 Step 3 완료 - 초대 코드 UI + Functions 보완"
    - "feat(phase2): Step 4-5 완료 - Super Admin 플랫폼 대시보드 + 역할별 메뉴 제어"

### Firebase Hosting 배포 (선택)
```bash
cd /home/user/webapp
firebase deploy --only hosting
```

- [ ] **배포 URL 확인**
  - https://your-project.web.app
  - 브랜딩 적용 확인
  - 초대 코드 기능 확인
  - 역할별 메뉴 확인

---

## ⚠️ 알려진 이슈 및 제한사항

1. **store_manager 권한**
   - 매장 추가/삭제 불가 (정상 동작)
   - 다른 매장 조회 불가 (정상 동작)
   - 시스템 설정 접근 불가 (정상 동작)

2. **초대 코드**
   - 한 번 생성된 코드는 수정 불가 (상태 토글만 가능)
   - usedCount는 recordInviteUse Function 호출 시 증가

3. **플랫폼 대시보드**
   - super_admin만 접근 가능
   - 회사 수가 많으면 로딩 시간 증가 가능
   - 실시간 업데이트 아님 (탭 전환 시 새로고침)

---

## 📊 테스트 결과 요약

### 완료된 기능
- [x] Branding Application
- [x] Store Management UI Enhancement
- [x] Invite Code/Link UI Completion
- [x] Super Admin LV1 Platform Dashboard
- [x] Role-based Menu Control

### 테스트 진행 현황
- [ ] Branding 테스트
- [ ] Store Management 테스트
- [ ] Invite Code 테스트
- [ ] Platform Dashboard 테스트
- [ ] Role-based Menu Control 테스트

### 버그 발견 시
1. 증상 상세 기록
2. 재현 방법 작성
3. 스크린샷 첨부
4. GitHub Issues에 등록 또는 개발자에게 전달

---

## 🎯 다음 단계 (Phase 3 준비)

### 고려 사항
1. **초대 코드 통계**
   - 매장별 초대 코드 생성 수
   - 사용률 분석
   - 만료 예정 코드 알림

2. **플랫폼 대시보드 개선**
   - 회사별 상세 분석
   - 차트/그래프 추가
   - 기간별 필터링

3. **권한 관리 고도화**
   - 커스텀 권한 설정
   - 권한 변경 로그
   - 권한 승인 워크플로우

4. **Firestore Rules 검증**
   - 역할별 읽기/쓰기 권한 재확인
   - 취약점 스캔
   - 보안 테스트

---

**작성일**: 2025-01-XX  
**작성자**: AI Assistant  
**버전**: Phase 2 Complete  
