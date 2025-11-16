# 📊 ABCDC Staff System - 프로젝트 현황

**마지막 업데이트**: 2025-01-16  
**버전**: v3.1.7  
**상태**: 🚧 진행 중 (Firestore 권한 문제 해결)

---

## 🎯 프로젝트 개요

**멀티테넌트 SaaS 직원 관리 시스템** - Firebase 기반

- **목표**: 여러 회사가 독립적으로 사용하는 직원 관리 플랫폼
- **기술 스택**: HTML/CSS/JavaScript + Firebase (Firestore, Auth, Functions, Hosting)
- **배포**: GitHub Actions → Firebase Hosting (자동 배포)
- **URL**: https://abcdc-staff-system.web.app

---

## ✅ 완료된 주요 기능

### 1. 멀티테넌트 아키텍처 (v3.1.3)
- ✅ Company (회사) → Store (지점) 2단계 계층 구조
- ✅ 초대코드 시스템 (1:1 매핑: 코드당 회사/지점/역할 지정)
- ✅ 데이터 격리 (모든 컬렉션에 `companyId` 필수)
- ✅ 순환참조 제거 (Firestore Rules v3.1.3)
- ✅ 민감 필드 보호 (companyId, role, storeId 직원 본인 수정 불가)

### 2. 관리자 페이지
- ✅ 직원 관리 (등록, 조회, 삭제)
- ✅ 출퇴근 기록 관리
- ✅ 급여 관리 (자동 계산, PDF 생성)
- ✅ 문서 승인 관리 (구매/폐기/퇴직서/교대근무)
- ✅ 계약서 관리
- ✅ 공지사항 관리
- ✅ 매장 관리
- ✅ 대시보드 통계

### 3. 직원 포털
- ✅ 출근/퇴근 기록
- ✅ 내 근무내역 조회
- ✅ 급여 조회
- ✅ 문서 승인 신청 (구매/폐기/퇴직서)
- ✅ 교대근무 신청 (대타 구함 기능)
- ✅ 계약서 확인
- ✅ 공지사항 확인

### 4. 급여 관리 시스템
- ✅ 시급제/월급제/연봉제 지원
- ✅ 주휴수당 자동 계산 (주 15시간 이상 근무자)
- ✅ 연장근로수당 (주 40시간 초과분)
- ✅ 야간근로수당 (22:00~06:00)
- ✅ 휴일근로수당 (공휴일 자동 판별)
- ✅ 4대보험 자동 공제
- ✅ 퇴직금 자동 계산 (1년 이상 근속)
- ✅ 급여명세서 PDF 다운로드

### 5. 교대근무 시스템
- ✅ 직원 교대근무 신청
- ✅ 실시간 대타 구함 팝업 (Firestore onSnapshot)
- ✅ 관리자 승인 관리
- ✅ 자동 스케줄 변경
- ✅ 급여 자동 계산 (대타 직원 시급 적용)

### 6. 자동 결근 생성 시스템
- ✅ Cloud Functions 매일 자동 실행 (자정 1분)
- ✅ 계약서 기반 출근일 체크
- ✅ attendance 기록 없는 직원 자동 결근 처리
- ✅ 출퇴근 위반 즉시 감지 (지각/조기출근/조퇴/초과근무)

### 7. Firebase Authentication 자동 정리
- ✅ 직원 삭제 시 Auth 계정 자동 삭제 (Cloud Functions)
- ✅ 수동 정리 도구 (cleanup-auth.html)

---

## ✅ 최근 완료된 작업 (v3.1.7) - 멀티테넌트 안정화

### Phase 1 - 멀티테넌트 안정화 ✅ (95% 완료)

**완료 항목**:
1. ✅ **급여 탭 멀티테넌트 정리** (A안 - 매장 필터)
   - 급여 탭에 매장 선택 필터 추가
   - 실시간 계산 유지 (salary-calculator.js 변경 없음)
   - companyId + storeId 필터 적용
   - B안 (Cloud Functions 급여 마감)은 Phase 2로 연기

2. ✅ **모든 쿼리 멀티테넌트 수정 완료** (56개)
   - admin-dashboard.html: 26개 ✅
   - js/employee.js: 19개 ✅
   - js/contract-viewer.js: 2개 ✅
   - js/pdf-generator.js: 1개 ✅
   - js/salary-calculator.js: 1개 ✅
   - js/schedule-data-loader.js: 1개 ✅
   - js/schedule-viewer.js: 2개 ✅
   - functions/index.js: 4개 ✅

3. ✅ **Cloud Functions 멀티테넌트 수정**
   - createAbsentRecords: companyId 필터 추가
   - createAbsentRecordsForDate: companyId 필터 추가
   - attendance 생성 시 companyId, storeId, userId 자동 추가

4. ✅ **회사 생성 스크립트 개발**
   - scripts/create-company.js 완성
   - 대화형 CLI 인터페이스
   - companies, stores, company_invites 자동 생성

**남은 작업**:
- [ ] Functions 배포 (firebase deploy --only functions)
- [ ] 테스트용 회사 2호 생성 (create-company.js)
- [ ] Phase 1 내부 베타 테스트 (2개 회사 데이터 격리 확인)

## 🚧 현재 진행 중인 작업 (v3.1.7)

### 해결 완료된 문제 ✅

1. **Firebase Auth 초기화 타이밍 이슈**
   - 문제: `currentUser`가 undefined 상태에서 `showMainScreen()` 실행
   - 해결: `onAuthStateChanged()` 패턴으로 변경 (firebase-init.js)
   - 결과: ✅ 사용자 UID 정상 로드, companyId 조회 성공

2. **userType vs role 필드명 불일치**
   - 문제: 코드는 `userType` 쿼리, 실제 데이터는 `role` 필드
   - 해결: 전역 찾기/바꾸기로 `userType` → `role` 일괄 변경
   - 결과: ✅ users 컬렉션 쿼리 정상 작동

3. **companyId 전역 변수 누락**
   - 문제: 모든 쿼리에서 companyId 필터가 누락됨
   - 해결: 
     - `myCompanyId` 전역 변수 추가
     - `showMainScreen()`에서 사용자 companyId 로드
     - 15개 이상의 쿼리 함수에 `.where('companyId', '==', myCompanyId)` 추가
   - 결과: ✅ 자기 회사 데이터만 조회

4. **Firestore Rules 빈 컬렉션 조회 실패**
   - 문제: `allow read`는 `resource.data.companyId` 체크 → 빈 컬렉션 실패
   - 해결: `allow list`와 `allow get` 분리
     - `allow list`: 쿼리 조회 (resource 체크 없음)
     - `allow get`: 개별 문서 읽기 (resource 체크 있음)
   - 적용 컬렉션: users, approvals, shift_requests, stores
   - 결과: ✅ 빈 컬렉션도 정상 조회

### 남은 작업 ⚠️

1. **Firestore 복합 인덱스 생성**
   - 상태: ✅ 사용자가 이미 생성 완료
   - 영향: attendance, stores 컬렉션 쿼리 최적화

2. **전체 기능 테스트**
   - 직원 등록/수정/삭제
   - 출퇴근 기록 추가
   - 승인 관리 (approvals, shift_requests)
   - 매장 생성
   - 급여 조회/계산

---

## 📂 프로젝트 구조

```
webapp/
├── admin-dashboard.html        # 관리자 대시보드 (메인)
├── admin-login.html            # 관리자 로그인
├── admin-register.html         # 관리자 회원가입
├── employee-register.html      # 직원 회원가입 (초대코드)
├── employee.html               # 직원 포털
├── employee-login.html         # 직원 로그인
├── contract-signature.html     # 계약서 서명
├── contract-view.html          # 계약서 조회
├── cleanup-auth.html           # Auth 정리 도구
│
├── js/
│   ├── firebase-init.js        # Firebase 초기화 (Auth, Firestore)
│   ├── salary-calculator.js    # 급여 계산 로직
│   ├── contract-viewer.js      # 계약서 상세보기 (공통 모듈)
│   ├── schedule-viewer.js      # 스케줄 간트차트 (공통 모듈)
│   └── employee.js             # 직원 페이지 로직
│
├── css/
│   └── admin-dashboard.css     # 관리자 페이지 스타일
│
├── functions/                  # Cloud Functions
│   ├── index.js                # 초대코드, 자동 결근, Auth 정리
│   └── package.json
│
├── firestore.rules             # Firestore Security Rules v3.1.7
├── firebase.json               # Firebase 설정
├── .firebaserc                 # Firebase 프로젝트 설정
│
├── README.md                   # 프로젝트 메인 문서
├── DEPLOYMENT_GUIDE.md         # 배포 가이드
├── WORK_IN_PROGRESS.md         # 현재 작업 진행 상황
├── PROJECT_STATUS.md           # 프로젝트 전체 현황 (본 문서)
├── MULTITENANT_DESIGN_V3.md    # 멀티테넌트 설계 문서
│
└── docs/archive/               # 아카이브 (참고용 문서)
    ├── FINAL_SUMMARY.md
    ├── firestore-rules-v3.1.3-changes.md
    ├── ADMIN_REGISTER_GUIDE.md
    ├── TEST_ACCOUNT_INFO.md
    └── ...
```

---

## 🗄️ Firestore 데이터 구조

### 주요 컬렉션

| 컬렉션 | 설명 | companyId | storeId |
|--------|------|-----------|---------|
| `companies` | 회사 정보 | 자체 | - |
| `stores` | 지점 정보 | ✅ | 자체 |
| `users` | 모든 사용자 (직원, 관리자, 매니저) | ✅ | ✅ |
| `employees` | 직원 정보 (users 복사본) | ✅ | ✅ |
| `company_invites` | 초대코드 | ✅ | ✅ |
| `attendance` | 출퇴근 기록 | ✅ | ✅ |
| `schedules` | 근무 스케줄 | ✅ | - |
| `contracts` | 계약서 | ✅ | - |
| `savedContracts` | 임시 저장 계약서 | ✅ | - |
| `signedContracts` | 서명된 계약서 | ✅ | - |
| `salaries` | 급여 계산 결과 | ✅ | ✅ |
| `approvals` | 문서 승인 | ✅ | - |
| `shift_requests` | 교대근무 요청 | ✅ | - |
| `notices` | 공지사항 | ✅ | - |

### 권한 시스템 (RBAC)

| 역할 | 권한 범위 | 주요 권한 |
|------|-----------|-----------|
| `super_admin` | 전체 시스템 | 모든 회사 데이터 접근/수정 |
| `admin` | 회사 전체 | 회사 내 모든 데이터 읽기/쓰기 |
| `manager` | 회사 전체 (읽기) | 회사 내 모든 데이터 읽기, 부분 쓰기 |
| `store_manager` | 본인 지점만 | 본인 지점 데이터 관리 |
| `staff` | 본인 데이터만 | 자신의 출퇴근/급여/문서신청만 가능 |

---

## 🔧 기술 스택

### Frontend
- HTML, CSS, JavaScript (Vanilla)
- CDN 라이브러리:
  - Tailwind CSS (스타일링)
  - Font Awesome (아이콘)
  - Chart.js (차트)
  - html2pdf.js (PDF 생성)
  - jsPDF (PDF 생성 대체)

### Backend
- Firebase Firestore (NoSQL 데이터베이스)
- Firebase Authentication (이메일/비밀번호)
- Firebase Cloud Functions (서버리스)
  - Node.js 20
  - verifyInviteCode, recordInviteUse
  - createAbsentRecords (자동 결근)
  - deleteUser (Auth 정리)

### Deployment
- Firebase Hosting
- GitHub Actions (자동 배포)

---

## 📝 변경 이력

### v3.1.7 (2025-01-16) - 멀티테넌트 안정화 진행 중 ✅
- ✅ Firebase Auth 초기화 수정 (`onAuthStateChanged()`)
- ✅ 전역 companyId 관리 (`myCompanyId`)
- ✅ 모든 쿼리에 companyId 필터 추가
- ✅ Firestore Rules 쿼리/문서 권한 분리 (`allow list` / `allow get`)
- ✅ Firestore 복합 인덱스 생성 완료
- ✅ **급여 탭 멀티테넌트 정리 (A안 - 매장 필터)** ⭐
  - 급여 탭에 매장 선택 필터 추가
  - 실시간 계산 (attendance 기반)
  - companyId + storeId 필터 적용
  - salary-calculator.js 로직 유지
  - B안 (Cloud Functions 급여 마감)은 Phase 2로 연기
- ⏳ 나머지 쿼리 수정 진행 중 (65개 남음)

### 스케줄 마이그레이션 (2025-11-09 완료) ✅
- ✅ schedules 컬렉션 구조 변경 (주차별 → 날짜별)
- ✅ 하루 여러 근무 지원
- ✅ 교대근무 승인 로직 개선
- ✅ Firestore 인덱스 3개 생성 완료
- ✅ 마이그레이션 도구 개발 및 실행 완료
- 📚 관련 문서: [docs/archive/](docs/archive/) 참고

### v3.1.3 (2025-01-16) - 멀티테넌트 전환 완료
- ✅ 순환참조 제거 (Firestore Rules)
- ✅ 민감 필드 보호 (companyId, role, storeId)
- ✅ 기존 데이터 101개 문서 삭제
- ✅ 초기 데이터 생성 스크립트 작성

### v2.0 이전 업데이트
- 급여 관리 시스템 완전 구현
- 교대근무 신청 시스템
- 자동 결근 생성 시스템
- 계약서 상세보기 공통 모듈화
- 스케줄 뷰어 모듈화
- localStorage 완전 제거

---

## 🔗 주요 링크

- **GitHub**: https://github.com/uhi13088/ABCDC-staff-system
- **Firebase Hosting**: https://abcdc-staff-system.web.app
- **Firebase Console**: https://console.firebase.google.com/project/abcdc-staff-system

---

## 📞 문서 구조

### 📁 핵심 문서 (5개)
- **프로젝트 현황**: `PROJECT_STATUS.md` (본 문서) ⭐
- **프로젝트 개요**: `README.md` - 메인 문서
- **배포 절차**: `DEPLOYMENT_GUIDE.md` - 상세 배포 가이드
- **현재 작업 상황**: `WORK_IN_PROGRESS.md` - v3.1.7 진행 상황
- **멀티테넌트 설계**: `MULTITENANT_DESIGN_V3.md` - 상세 아키텍처

### 📦 아카이브 문서 (15개)
참고용 문서 보관: `docs/archive/`
- 마이그레이션 관련 (5개): FINAL_CODE_REVIEW.md, FIRESTORE_INDEXES.md, MIGRATION_GUIDE.md, MIGRATION_REVIEW.md, SCHEDULE_MIGRATION_PLAN.md
- 개발 참고 (7개): CONTRACTS_COLLECTION_SCHEMA.md, FIELD_MAPPING.md, REFACTORING_RISKS.md 등
- 이전 버전 문서 (3개): FINAL_SUMMARY.md, firestore-rules-v3.1.3-changes.md 등

---

## 🎯 다음 단계

### 1. 전체 기능 테스트 (우선순위: 높음)
- [ ] 직원 등록/수정/삭제 테스트
- [ ] 출퇴근 기록 추가 테스트
- [ ] 승인 관리 (approvals, shift_requests) 테스트
- [ ] 매장 생성 테스트
- [ ] 급여 조회/계산 테스트

### 2. 버그 수정 (필요 시)
- [ ] 권한 오류 발생 시 Rules 추가 수정
- [ ] JavaScript 쿼리 필터 누락 체크

### 3. 문서 업데이트
- [ ] README.md 최신 상태 반영
- [ ] WORK_IN_PROGRESS.md 완료 후 삭제 또는 아카이브

### 4. 프로덕션 배포 준비
- [ ] 모든 기능 테스트 완료
- [ ] 프로덕션 데이터 마이그레이션 계획
- [ ] 사용자 교육 자료 준비

---

**마지막 업데이트**: 2025-01-16  
**다음 업데이트**: 전체 기능 테스트 완료 후
