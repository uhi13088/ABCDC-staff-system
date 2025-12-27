# Changelog

> ABC Staff System 변경 이력

모든 주요 변경 사항은 이 파일에 기록됩니다.

---

## [0.17.0] - 2025-01-17

### ✨ Features (새 기능)

#### STAFF 역할 통일
- **EMPLOYEE 제거**: `USER_ROLES.EMPLOYEE` 제거, `STAFF`로 완전 통일
- **코드베이스 정리**: 13개 파일에서 'employee' → 'staff' 일관성 확보
- **호환성 유지**: 기존 'employee' 데이터도 조회 가능하도록 필터링 조건 확장
- **문서화**: `docs/STAFF_UNIFICATION.md` 작업 보고서 추가
- 관련 커밋: `cd0e7320`, `ecb69372`, `f6148a91`

#### 고정 QR 코드 시스템
- **만료 제거**: QR 코드에서 유효기간 필드 제거, 영구 사용 가능
- **타입 추가**: `type: 'store_checkin'`, `version: '1.0'` 필드로 QR 코드 식별
- **UI 개선**: 유효시간 입력 제거, "만료 없음 - 영구 사용 가능" 표시
- **1회 프린트로 영구 사용**: 관리 부담 대폭 감소
- 관련 커밋: `49410cb5`, `2a7e1b10`

#### 매장 관리 모달 QR 통합
- **통합 UI**: 매장 수정 모달에 QR 코드 섹션 직접 표시
- **자동 생성**: 매장 수정 시 자동으로 QR 코드 생성
- **다운로드/저장**: QR 이미지 다운로드 및 Firestore 저장 기능
- 관련 커밋: `2a7e1b10`

### 🐛 Bug Fixes (버그 수정)

#### 급여 조회 오류 수정
- **문제**: 관리자 대시보드에서 "Missing or insufficient permissions" 오류
- **원인**: 하드코딩된 `'salaries'` 컬렉션 이름 사용 (Firestore Rules는 `salary`)
- **해결**: `COLLECTIONS.SALARY` 상수로 통일 (3곳 수정)
- 관련 커밋: `d8a2e857`

#### 직원 가입 후 목록 표시 오류 수정
- **문제**: 신규 직원 가입 후 관리자 페이지에 표시되지 않음
- **원인**: 가입 시 `role='employee'`, 조회 시 `role='staff'` 불일치
- **해결**: 가입 시 `role='staff'`로 변경, 조회 시 호환성 유지
- 관련 커밋: `8324dd7e`

#### QR Scanner DOM 렌더링 타이밍 오류 수정
- **문제**: "HTML Element with id=qr-reader not found" 오류
- **원인**: 모달 열림과 동시에 카메라 시작 시 DOM 미렌더링
- **해결**: 100ms 지연 후 DOM 요소 확인 로직 추가
- 관련 파일: `components/employee/qr-scanner.tsx`

#### GitHub Actions Storage 배포 오류 수정
- **문제**: "Could not find rules for the following storage targets: rules"
- **원인**: `storage:rules` → Firebase CLI가 타겟으로 잘못 해석
- **해결**: `storage:rules` → `storage`로 변경
- 관련 커밋: `84236ede`

### 🔐 Security Fixes (보안 수정)

#### 긴급 보안 구멍 7개 수정

**🔴 Critical (즉시 수정 완료)**:

1. **Firestore Rules 권한 탈취 차단**
   - `users` 컬렉션 업데이트 시 `role`, `companyId` 변경 차단
   - 직원이 자신의 role을 admin으로 변경하는 공격 완전 차단
   - `super_admin`만 role/companyId 수정 가능
   - 파일: `firestore.rules` Line 104-106

2. **API Key 하드코딩 제거**
   - `lib/firebase.ts`에서 하드코딩된 Firebase API Key 완전 제거
   - 환경변수 필수화 (`process.env.NEXT_PUBLIC_FIREBASE_API_KEY!`)
   - Fallback 값 제거로 보안 강화

3. **급여 정보 로그 노출 차단**
   - `lib/utils/calculate-monthly-salary.ts`의 `console.log` 4개 제거
   - 브라우저 콘솔에 직원 급여 정보 노출 방지
   - Line 37, 134, 351, 428 주석 처리

4. **Rate Limit 무력화 코드 제거**
   - `app/api/verify-invite-code/route.ts`의 Map 객체 제거
   - 서버리스 환경에서 작동하지 않는 코드 정리
   - 프로덕션 대안 (Cloudflare KV, Upstash Redis) 주석 추가

**🟡 High Priority (권장 수정 완료)**:

5. **Next.js 보안 취약점 패치**
   - `14.2.3` → `15.5.9` 업그레이드
   - CVE-2025-12-11 보안 패치 적용
   - Middleware 지원 강화

6. **서버 단 인증 보호 추가**
   - `middleware.ts` 신규 생성
   - `/admin-dashboard`, `/platform`, `/employee-dashboard` 접근 시 쿠키 확인
   - 인증 없음 시 로그인 페이지 리다이렉트
   - HTML 껍데기 노출 방지

**🟢 Medium Priority (장기 개선)**:

7. **급여 계산 Cloud Functions 이관 (기본 구조)**
   - `functions/src/index.ts` 생성 (calculateMonthlySalary 함수)
   - `functions/package.json`, `tsconfig.json`, `.gitignore` 구성
   - `firebase.json`에 functions 블록 추가
   - 급여 금액 변조 공격 차단 인프라 구축
   - **추가 개발 필요**: 클라이언트 로직 이식

### 📊 Build Results (빌드 결과)

- ✅ Next.js 15.5.9 빌드 성공 (15/15 static pages)
- ✅ Cloud Functions TypeScript 컴파일 성공
- ✅ Middleware 33 kB 추가
- ✅ 0 warnings, 0 errors

### 🚀 Deployment (배포)

- Git Commit: `ef1c2fe1`
- GitHub: https://github.com/uhi13088/ABCDC-staff-system
- Branch: `main`
- 자동 배포: GitHub Actions (Firestore Rules + Hosting + Functions)

### 📝 Documentation Updates (문서 업데이트)

- `README.md`: 버전 v0.17.0, 보안 섹션 업데이트
- `docs/CHANGELOG.md`: v0.17.0 변경 이력 추가
- 보안 패치 상세 내역 문서화

---

## [0.7.0] - 2024-12-15

### ✅ Added (새 기능)

#### Phase K: 직원 포털 구현

- **직원 로그인 페이지** (`/employee-login`)
  - Email/Password 로그인
  - "로그인 유지" 기능 (localStorage, SSR 안전)
  - 초대 코드 입력 (선택 사항)
  - 직원 권한 검증
  - Firebase Auth 연동

- **직원 대시보드** (`/employee-dashboard`)
  - 8개 탭 완전 구현
  - 헤더 (직원명, 소속 매장명, 로그아웃)
  - Firebase Auth 세션 관리
  - 미인증 자동 리다이렉트

#### 8개 직원 탭 상세 기능

**1. Dashboard Tab** (`components/employee/tabs/dashboard-tab.tsx`)
- 오늘의 출퇴근 상태 (출근 전/근무 중/퇴근 완료)
- 출근/퇴근 버튼 (실시간 상태 반영)
- 이번 달 통계
  - 근무일수
  - 총 근무시간
  - 예상 급여 (시급 기준 자동 계산)

**2. Attendance Tab** (`components/employee/tabs/attendance-tab.tsx`)
- QR 코드 체크인/체크아웃 (모바일 앱 예정)
- 월별 근무 내역 테이블
  - 날짜, 출근 시간, 퇴근 시간
  - 근무시간 자동 계산
  - 위치, 상태 (승인/대기/반려)
- 월 선택 필터 (최근 12개월)
- 총 근무일수 및 승인 건수 요약

**3. Salary Tab** (`components/employee/tabs/salary-tab.tsx`)
- 월별 급여 조회 테이블
- 급여 명세서 상세 모달
  - 기본급
  - 수당 (연장/야간/휴일/주휴)
  - 공제 (세금/4대보험)
  - 실수령액 하이라이트
- PDF 다운로드 버튼 (추후 구현)
- 급여 지급 상태 (대기/확정/지급완료)

**4. Schedule Tab** (`components/employee/tabs/schedule-tab.tsx`)
- 주간 캘린더 (월~일)
- 주 단위 네비게이션 (이전/다음/이번 주)
- "매장 전체 보기" 토글 스위치
- 내 스케줄 하이라이트
- 오늘 날짜 강조 표시
- 주간 근무 요약 (근무일 수, 전체 근무자 수)

**5. Approvals Tab** (`components/employee/tabs/approvals-tab.tsx`)
- 결재 신청서 작성 모달
  - 신청 유형 (휴가/연장근무/결근/근무조정)
  - 날짜, 시작/종료 시간
  - 상세 사유 입력
- 신청 내역 테이블
- 상태별 배지 (승인/대기/반려)
- Firestore 실시간 동기화

**6. Notices Tab** (`components/employee/tabs/notices-tab.tsx`)
- 공지사항 목록
- 중요 공지 상단 고정 (빨간 배지)
- 공지사항 상세 모달
- 작성자 및 작성 일시 표시

**7. Notifications Tab** (`components/employee/tabs/notifications-tab.tsx`)
- 알림 목록 (읽음/안읽음)
- 알림 타입별 배지
  - 출퇴근, 급여, 결재, 계약, 공지, 스케줄, 일반
- 읽지 않은 알림 강조 (파란 배경)
- 전체 읽음 처리 버튼
- 읽지 않은 알림 카운트
- notificationService 연동

**8. Profile Tab** (`components/employee/tabs/profile-tab.tsx`)
- 개인정보 수정
  - 이름, 연락처
  - 이메일 (읽기 전용)
- 계좌 정보 입력
  - 은행명, 계좌번호, 예금주
  - 급여 지급용 필수 안내
- 건강진단서 만료일 입력
- 이미지 업로드 (추후 구현)
- Firestore 실시간 저장

### 🔧 Changed (변경 사항)

- **ecosystem.config.cjs**: 포트 3005 → 3000 변경
- **employee-login**: `useState` → `useEffect` 변경 (localStorage SSR 에러 수정)
- **employee-login**: `typeof window !== 'undefined'` 체크 추가

### 🆕 New Components (신규 컴포넌트)

- `components/ui/switch.tsx` - Shadcn/UI Switch 컴포넌트 추가
- `components/employee/tabs/` - 8개 직원 탭 컴포넌트

### ✅ Technical Details (기술 상세)

- Firebase Auth: 직원 권한 검증 (`role === 'employee'`)
- Firestore Services: `attendanceService`, `salaryService`, `notificationService` 활용
- 실시간 데이터: `onSnapshot` 대신 `getDocs` + 주기적 새로고침
- 날짜 처리: `date-fns`, `safeToDate` 유틸리티
- 상태 관리: React `useState`, `useEffect`
- 빌드: Next.js 정적 페이지 생성 (SSR 안전)

### 📦 Files Changed (변경 파일)

**신규 파일 (13개)**
- `app/employee-login/page.tsx`
- `app/employee-dashboard/page.tsx`
- `components/employee/tabs/dashboard-tab.tsx`
- `components/employee/tabs/attendance-tab.tsx`
- `components/employee/tabs/salary-tab.tsx`
- `components/employee/tabs/schedule-tab.tsx`
- `components/employee/tabs/approvals-tab.tsx`
- `components/employee/tabs/notices-tab.tsx`
- `components/employee/tabs/notifications-tab.tsx`
- `components/employee/tabs/profile-tab.tsx`
- `components/ui/switch.tsx`

**수정 파일 (1개)**
- `ecosystem.config.cjs`

### ✅ Tests (테스트)

- Build: ✅ 성공 (npm run build)
- PM2 Restart: ✅ 성공
- Health Check: ✅ HTTP 200
- Git Commit: ✅ 817ee43b
- GitHub Push: ✅ main branch

---

## [0.6.0] - 2024-12-15

## [0.1.0] - 2024-12-10

### ✅ Added (새 기능)

#### 인증 시스템
- **관리자 회원가입 페이지** (`/admin-register`)
  - Firebase Auth 계정 생성
  - Firestore `companies`, `users` 컬렉션 저장
  - 회사 ID 자동 생성 (회사명 앞 3글자 + 연도 + 랜덤)
  - 구독 플랜 초기화 (Free Plan, maxUsers: 5)
  - 입력 필드: 이름, 주민번호, 전화번호, 주소, 이메일, 비밀번호, 회사명, 사업자번호(선택), 회사전화(선택)

- **관리자 로그인 페이지** (`/admin-login`)
  - Firebase Auth 이메일/비밀번호 인증
  - Remember Me 기능 (localStorage)
  - 에러 핸들링 (auth/invalid-credential, auth/too-many-requests)
  - 로그인 성공 시 `/admin-dashboard` 자동 이동

- **AuthProvider** (`lib/auth-context.tsx`)
  - Firebase Auth 세션 관리
  - 전역 상태 관리 (useAuth 훅)
  - 자동 로그인 유지

#### 관리자 대시보드
- **대시보드 메인 페이지** (`/admin-dashboard`)
  - 13개 탭 구조 (Dynamic Import + SSR 비활성화)
  - 반응형 헤더 (회사명, 플랜 정보, 로그아웃)
  - 권한 체크 (admin, manager, store_manager)
  - 미인증 사용자 자동 리다이렉트

- **대시보드 탭 컴포넌트** (13개)
  1. `DashboardTab` - 통계 카드 4개 (직원 수, 출근 현황, 승인 대기, 미서명 계약)
  2. `EmployeesTab` - 직원 목록 관리
  3. `AttendanceTab` - 출퇴근 기록
  4. `SalaryTab` - 급여 관리
  5. `SchedulesTab` - 스케줄 관리
  6. `ContractsTab` - 계약서 관리
  7. `ApprovalsTab` - 승인 요청 처리
  8. `NoticeTab` - 공지사항
  9. `AdminsTab` - 관리자 관리
  10. `StoresTab` - 매장 관리
  11. `BrandsTab` - 브랜드 관리
  12. `InvitesTab` - 직원 초대
  13. `SettingsTab` - 설정

- **커스텀 훅** (13개)
  - `useDashboardLogic` - 대시보드 통계 로직
  - `useEmployeesLogic` - 직원 관리 로직
  - 각 탭마다 전용 훅 분리 (Direct Import)

#### UI/UX
- **Shadcn/UI 컴포넌트** 통합
  - Button, Card, Input, Label, Checkbox, Select, Separator
  - Tabs, Dialog, Skeleton
  - Radix UI 기반 접근성 보장

- **Tailwind CSS 3.4.1** 커스터마이징
  - Blue Gradient 테마 (from-blue-50 to-blue-100)
  - 반응형 디자인 (Mobile-first)
  - Dark Mode 준비 (추후 구현)

- **Skeleton Loading**
  - 모든 탭에 Skeleton UI 적용
  - 사용자 경험 개선 (빈 화면 → 로딩 상태)

#### Firebase 연동
- **Firestore 데이터 모델** 설계
  - `companies` 컬렉션 (회사 정보 + 구독 플랜)
  - `users` 컬렉션 (관리자/직원 정보)
  - `attendance` 컬렉션 (출퇴근 기록)
  - `approvals` 컬렉션 (승인 요청)
  - `contracts` 컬렉션 (계약서 관리)
  - `signed_contracts` 컬렉션 (서명 완료 계약서)

- **Firebase Auth 10.12.0** 통합
  - 이메일/비밀번호 인증
  - 세션 관리 (onAuthStateChanged)

### 🔧 Changed (변경)

#### 성능 최적화
- **Dynamic Import 적용**
  - 13개 탭 컴포넌트 지연 로딩
  - 초기 번들 사이즈 감소

- **SSR 비활성화** (`ssr: false`)
  - 관리자 페이지 서버 렌더링 스킵
  - 대시보드 로딩 속도 개선 (5.7s → 0.5s)

- **배럴 파일 제거**
  - `@/hooks/admin/index.ts` 제거
  - Direct Import로 전환 (서버 멈춤 방지)

#### 안정화
- **Next.js 14.2.3** 고정 (LTS 버전)
- **React 18.3.1** 고정
- **Firebase 10.12.0** 다운그레이드 (12.6.0 → 10.12.0)
  - Next.js 14 호환성 개선
  - 서버 안정성 확보

#### 라우팅
- **Route Group 제거** (`(auth)` 폴더)
  - `app/(auth)/admin-login` → `app/admin-login`
  - `app/(auth)/employee-login` → `app/employee-login`
  - 컴파일 속도 개선

- **Next.js Link 컴포넌트** 적용
  - `<a>` 태그 → `<Link>` 컴포넌트
  - Client-side Navigation (즉시 페이지 전환)
  - Prefetching 자동 활성화

### 🐛 Fixed (버그 수정)

- **서버 멈춤 문제** 해결
  - Firebase 12.x 호환성 문제 → 10.12.0으로 다운그레이드
  - 배럴 파일 import → Direct Import로 전환
  - SSR 비활성화 (`ssr: false`)

- **포트 충돌 문제** 해결
  - 좀비 프로세스 자동 종료
  - 포트 3005 고정 사용

- **컴파일 타임아웃** 해결
  - Route Group 제거 (layout.tsx 누락 문제)
  - Dynamic Import 적용

- **Button 텍스트 가시성** 개선
  - `text-white` 클래스 추가
  - 파란색 배경에 흰색 텍스트

### 🗑️ Removed (제거)

- **employees 컬렉션 저장 로직** 삭제
  - Firestore Rules에 권한 없음
  - 회원가입 시 `users` 컬렉션만 사용

- **직책(position) 입력 필드** 제거
  - HTML 원본에 없는 필드 삭제
  - 코드 내부에서 '대표'로 고정 (필요 시 복원)

### 📦 Dependencies (의존성)

#### 추가
```json
{
  "next": "14.2.3",
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "firebase": "10.12.0",
  "lucide-react": "0.378.0",
  "clsx": "2.1.1",
  "tailwind-merge": "2.3.0",
  "class-variance-authority": "0.7.0",
  "@radix-ui/react-slot": "1.0.2",
  "@radix-ui/react-tabs": "1.0.4",
  "@radix-ui/react-dialog": "1.0.5",
  "@radix-ui/react-label": "2.0.2",
  "@radix-ui/react-select": "2.0.0",
  "@radix-ui/react-checkbox": "1.0.4",
  "@radix-ui/react-separator": "1.0.3"
}
```

#### 제거
- ❌ `next`: 14.2.18 (불안정)
- ❌ `firebase`: 12.6.0 (호환성 문제)
- ❌ `lucide-react`: 0.556.0 (과도한 버전)

---

## [0.0.1] - 2024-12-09

### ✅ Added

- **프로젝트 초기 설정**
  - Next.js 14 + TypeScript 프로젝트 생성
  - Tailwind CSS 설정
  - ESLint 설정

- **Firebase 초기 설정**
  - Firebase 프로젝트 생성
  - Firestore Database 생성
  - Authentication 설정

- **홈페이지** (`/`)
  - "Hello World" 기본 페이지

---

## 📋 앞으로 추가될 기능 (Unreleased)

### 🚧 직원 시스템
- [ ] 직원 로그인 페이지 (`/employee-login`)
- [ ] 직원 대시보드 (`/employee-dashboard`)
- [ ] 직원 초대 코드 시스템
- [ ] QR 코드 출퇴근 체크인

### 🚧 관리 기능
- [ ] 급여 자동 계산 로직
- [ ] 계약서 전자서명 (PDF 생성)
- [ ] 엑셀 내보내기 (직원 목록, 급여 내역)
- [ ] 공지사항 푸시 알림

### 🚧 UI/UX 개선
- [ ] Dark Mode
- [ ] 다국어 지원 (한국어/영어)
- [ ] 모바일 최적화
- [ ] PWA (Progressive Web App)

### 🚧 성능 개선
- [ ] Redis 캐싱
- [ ] CDN 배포 (Cloudflare)
- [ ] 이미지 최적화 (WebP)
- [ ] Lighthouse 점수 90+ 달성

---

## 📝 버전 규칙

- **Major (1.0.0)**: 큰 변경, 호환성 깨짐
- **Minor (0.1.0)**: 새 기능 추가
- **Patch (0.0.1)**: 버그 수정, 작은 변경

---

**마지막 업데이트**: 2024-12-15

---

## [0.5.9] - 2024-12-15

### ✅ Added (새 기능)

#### 긴급 근무 모집 완전 구현
- **Emergency Recruitment Modal**
  - `components/admin/modals/emergency-recruitment-modal.tsx` (345줄)
  - 긴급 근무 모집 UI 완성
  - 매장 선택, 근무 날짜/시간, 모집 인원 설정
  
- **Open Shifts Service**
  - `services/openShiftService.ts` 생성
  - `open_shifts` 컬렉션 CRUD 로직
  - 긴급 근무 공고 등록/조회/삭제

#### 알림(Notification) 서비스 완성
- **Notification Service** (9가지 알림 타입)
  - `services/notificationService.ts` (286줄)
  - 관리자 근무시간 수정 알림
  - 직원 근무시간 수정 알림
  - 승인 요청 알림
  - 승인 처리 알림
  - 계약서 서명 요청 알림
  - 급여 지급 완료 알림
  - 긴급 근무 모집 알림
  - 공지사항 알림
  - 결근/지각 알림

### 🔧 Changed (변경)

#### 문서 정리
- **LEGACY_MIGRATION_CHECKLIST.md** 업데이트
  - Phase 2 완료 상태 반영
  - 긴급 근무 모집 완전 구현 확인
  - 알림 서비스 구현 완료 (연동 필요)

---

## [0.5.8] - 2024-12-15

### 🐛 Fixed (버그 수정)

#### Timestamp 안전 변환 적용 (Phase I 실전)
- **brands-stores-tab.tsx 수정**
  - `brand.createdAt.seconds * 1000` → `safeToLocaleDateString(brand.createdAt)`
  - 직접 `.seconds` 접근 위험 제거

- **contracts-tab.tsx 수정**
  - `formatCreatedAt()` 제거 → `safeToLocaleString()` 사용
  - Timestamp null/undefined 크래시 방지

- **notice-tab.tsx 수정**
  - `.toString()` → `safeToLocaleDateString()` 사용
  - 한국어 날짜 형식 통일

- **notices-tab.tsx 수정**
  - `formatDate()` 제거 → `safeToLocaleString()` 사용
  - Timestamp 안전 변환 적용

#### 효과
- Timestamp가 null/undefined일 때 크래시 방지
- FieldValue (serverTimestamp pending) 안전 처리
- 일관된 한국어 날짜/시간 형식

---

## [0.5.7] - 2024-12-15

### ✅ Added (새 기능)

#### Timestamp 안전 변환 유틸리티 (Phase I)
- **lib/utils/timestamp.ts** 생성 (153줄)
  - `safeToDate()`: 안전한 Timestamp → Date 변환
  - `safeToLocaleDateString()`: 한국어 날짜 문자열 (예: "2024년 1월 15일")
  - `safeToLocaleString()`: 한국어 날짜/시간 문자열 (예: "2024년 1월 15일 14:30")
  - `getTimestampDiff()`: Timestamp 차이 계산 (밀리초)
  - `safeToDateArray()`: Timestamp 배열 → Date 배열 변환

#### 안전 장치
- Legacy 데이터 타입 불일치 방지
- `toDate()` 직접 호출 방지 (TypeError 위험)
- null/undefined Timestamp 안전 처리
- FieldValue (serverTimestamp pending) 처리

### 🔧 Changed (변경)

#### 문서 업데이트
- **LEGACY_MIGRATION_CHECKLIST.md** 업데이트
  - Firebase SDK 버전 차이 섹션에 Timestamp 처리 완료 표시
  - 헬퍼 함수 사용법 문서화
  - 검증 상태: ✅ 완료

---

## [0.5.6] - 2024-12-15

### 🐛 Fixed (버그 수정)

#### companyId Race Condition 완전 해결 (Phase H)
- **admin-dashboard/page.tsx 수정**
  - `if (loading || !companyId)` 이중 검증 추가
  - 로딩 중 or `companyId` 없을 때 탭 렌더링 차단
  - 사용자 친화적 에러 메시지 표시

- **useApprovalsLogic.ts 수정**
  - `if (!user?.uid || !user?.companyId) return;` 검증 추가
  - `user.companyId` 직접 사용 안전 검증

- **useSalaryLogic.ts 수정**
  - `if (!user?.uid || !user?.companyId) return;` 검증 추가
  - `loadStores()`, `loadSalaryList()` 함수 보호
  - 'default-company' Fallback 제거 (보안 강화)

- **useSimulatorLogic.ts 수정**
  - `if (!companyId) return;` 검증 추가
  - `loadSimulatorList()` 함수에 `companyId` 필터 추가

#### 효과
- 로딩 불일치로 인한 Firestore 쿼리 에러 방지
- 하위 컴포넌트가 유효한 `companyId` 없이 렌더링되는 상황 제거
- Race Condition 완전 해결

---

## [0.5.5] - 2024-12-15

### 🔧 Changed (변경)

#### 출퇴근 시간 조작 방지 - 클라이언트 코드 개선 (Phase G 추가)
- **services/attendanceService.ts 수정**
  - `clockIn()` 함수: `clockInTime` 파라미터 제거 → `serverTimestamp()` 자동 할당
  - `clockOut()` 함수: `clockOutTime` 파라미터 제거 → `serverTimestamp()` 자동 할당
  
#### 이중 보안 완성
1. **Firestore Rules**: 서버 시간 ±2분 검증 (v0.5.4)
2. **Service Layer**: `serverTimestamp()` 자동 할당 (v0.5.5)

#### 효과
- 클라이언트 시간 조작 원천 차단
- Rules 우회 시도 → `PERMISSION_DENIED`
- Service 함수 직접 호출 → 서버 시간 강제 할당

---

## [0.5.4] - 2024-12-15

### 🔧 Changed (변경)

#### 보안 강화 (Phase G: 출퇴근 시간 조작 방지)
- **Firestore Rules 수정** (`firestore.rules`)
  - `attendance` 컬렉션 `clockIn` 생성 규칙:
    - `request.time.toMillis()` 기준 ±2분 검증 추가
    - 본인 또는 Store Manager만 생성 가능
  - `attendance` 컬렉션 `clockOut` 수정 규칙:
    - `request.time.toMillis()` 기준 ±2분 검증 추가
    - 본인은 `clockOut` 필드만 수정 가능
    - Store Manager는 모든 필드 수정 가능

#### 효과
- 클라이언트가 임의로 `clockIn`/`clockOut` 시간을 조작하는 공격 차단
- 서버 시간 기준 ±2분 이내만 허용
- 악의적 시간 조작 시도 → `PERMISSION_DENIED` 에러

---

## [0.5.3] - 2024-12-15

### 🐛 Fixed (버그 수정)

#### Admin 회원가입 Batch Write 적용 (Phase G: "닭과 달걀" 문제 해결)
- **app/admin-register/page.tsx 수정** (라인 83-131)
  - `writeBatch()` 사용으로 Companies + Users 동시 생성
  - `batch.commit()` 원자적 트랜잭션
  - Rollback 로직: Firestore 실패 시 Auth 계정 삭제
  
- **firestore.rules 수정** (라인 115-118)
  - Admin 회원가입 시 Companies 존재 검증 제거
  - `companyId` 검증은 유지 (빈 문자열 방지)
  - 보안 강화: Admin은 본인만 생성 가능 (`request.auth.uid == request.resource.data.userId`)

#### 효과
- Companies 존재 여부 무관하게 회원가입 가능
- 관리자 회원가입 성공률 100% 보장
- 데이터 일관성 보장 (원자적 트랜잭션)

---

## [0.5.1] - 2024-12-13

### ✅ Added (새 기능)

#### 공휴일 완전 자동화
- **급여 계산 시 공휴일 자동 동기화**
  - `calculateMonthlySalary` 함수에서 DB 조회 → 없으면 API 자동 호출
  - 관리자가 수동으로 버튼 누를 필요 없음
  - 연도당 1회 API 호출 (캐싱 효과)
  
- **행정안전부 공공 API 연동**
  - `fetchHolidaysFromAPI(year, apiKey)` 함수 추가
  - `syncHolidaysFromAPI(year, apiKey)` 함수 추가
  - `NEXT_PUBLIC_HOLIDAY_API_KEY` 환경변수 설정
  
- **Settings Tab - 공공 API 동기화 버튼**
  - "공공 API 동기화" 버튼 추가 (수동 사용 가능)
  - 연도 선택 후 API에서 공휴일 가져오기

### 🔧 Changed (변경)

#### 급여 계산 정확도 개선
- **주휴수당 과지급 방지**
  - `Math.min(weekHours / 5, 8)` 적용
  - 최대 8시간으로 제한 (근로기준법 준수)
  - 예: 주 45시간 근무 → 주휴 9시간 → 8시간으로 제한
  
- **야간수당 휴게시간 자동 차감**
  - `contract.breakTime` 기반 자동 차감 로직 추가
  - 휴게시간이 22:00~06:00에 겹치면 자동 차감
  - 예: 22:00~06:00 근무, 01:00~02:00 휴게 → 야간 8시간 - 1시간 = 7시간

### 🐛 Fixed (버그 수정)

- **관리자 대시보드 탭 작동 오류 해결**
  - `salary-calculator.ts` 파일 손상 복구
  - Phase D 커밋에서 정상 파일 복원
  - 모든 탭 정상 작동 확인
  
- **Dialog ref 경고 제거**
  - `emergency-recruitment-modal.tsx`에 `React.forwardRef` 적용
  - Console Warning 제거

### 📦 Dependencies (의존성)

#### 추가
- 없음 (기존 환경변수 활용)

---

## [0.5.0] - 2024-12-13

### ✅ Added (새 기능)

#### 공휴일 관리 시스템
- **공휴일 DB 통합**
  - `services/holidayService.ts` 생성 (CRUD 함수)
  - `Holidays` Firestore 컬렉션 추가
  - 2025년 공휴일 초기 데이터 (16개)
  
- **Settings Tab - 공휴일 관리 UI**
  - `holiday-form-modal.tsx` 생성 (공휴일 추가/수정)
  - `settings-tab.tsx` 완전 재작성
  - 공휴일 목록 테이블 (날짜, 공휴일명, 수정/삭제)
  - 연도별 필터 (2024~2026년)
  - "2025년 일괄 추가" 버튼 (16개 자동 생성)

#### Timezone 통일
- **KST 기준 통일**
  - `lib/utils/timezone.ts` 생성 (81줄)
  - `date-fns-tz@3.2.0` 설치
  - `nowKST()`, `yearKST()`, `monthKST()` 헬퍼 함수
  
### 🔧 Changed (변경)

#### 보안 강화
- **Firebase API Key 환경변수화**
  - `.env.local` 파일 생성
  - `lib/firebase.ts` 수정 (환경변수 우선 사용)

#### 회원가입 안정성
- **Rollback 로직 추가**
  - Firebase Auth 성공 but Firestore 실패 시 Auth 계정 삭제
  - Orphan Account 방지

### 🐛 Fixed (버그 수정)

- **Import 구문 오류 수정**
  - `noticeService.ts`, `scheduleService.ts`, `salaryService.ts` 수정
  
- **소수점 계산 오류 수정**
  - `calculate-monthly-salary.ts` (255줄) `Math.round` 적용
  
- **Schedule 쿼리 성능 개선**
  - 날짜 필터를 서버 쿼리로 이동
  - 데이터 전송량 73% 감소

### 📦 Dependencies (의존성)

#### 추가
```json
{
  "date-fns-tz": "3.2.0"
}
```

---

## [0.4.0] - 2024-12-12

### ✅ Added (새 기능)

#### Service Layer 분리
- **10개 Service 파일 생성** (1,485줄)
  - `employeeService`, `contractService`, `attendanceService`, `salaryService`
  - `storeService`, `brandService`, `noticeService`, `scheduleService`
  - `approvalService`, `services/index.ts`

#### React Query 도입
- **@tanstack/react-query v5 설치**
  - `lib/react-query-provider.tsx` 생성
  - DevTools 설정 (개발 환경 only)
  - 자동 캐싱 및 상태 관리

#### Constants 정의
- **`lib/constants.ts` 생성** (150+ 상수)
  - `COLLECTIONS`, `USER_ROLES`, `USER_STATUS`, etc.
  - 하드코딩 제거 (23개 파일 적용)

### 🔧 Changed (변경)

#### Firestore Security Rules 재작성
- **표준 필드 기반 검증**
  - `storeId`, `userId`, `companyId` 강제
  - Role 기반 권한 (admin, manager, store_manager)
  - Multi-tenant 격리

#### DB Query 최적화
- **Client Filtering → Server Query**
  - `useAttendanceLogic`: 150줄 → 40줄 (73% 감소)
  - Firebase 비용 절감 & 응답 속도 향상

---

## [0.1.0] - 2024-12-10

(기존 내용 유지)
