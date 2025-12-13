# Changelog

> ABC Staff System 변경 이력

모든 주요 변경 사항은 이 파일에 기록됩니다.

---

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

**마지막 업데이트**: 2024-12-13

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
