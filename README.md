# ABC Staff System

> 맛남살롱을 위한 스마트한 직원 관리 시스템

**버전**: v0.17.0  
**최종 업데이트**: 2025-01-17  
**상태**: ✅ Production Ready (보안 강화 완료)

---

## 🚨 **작업 시작 전 필독 (CRITICAL)**

### **📖 필수 문서 읽기 순서**

모든 작업을 시작하기 전에 **반드시 아래 순서대로** 문서를 읽으세요:

```
1. README.md (이 파일)          - 프로젝트 개요 및 작업 프로세스
2. SYSTEM_PROMPT.md             - 기술 스택, 코딩 컨벤션, 제약사항 (🔥 AI 필수)
3. STRUCTURE.md                 - 사용자 계층 구조 및 대시보드 구조
4. FIRESTORE_COLLECTIONS.md     - Firestore 컬렉션 명세
5. FIELD_NAMING_STANDARD.md     - 필드명 규칙
6. BUSINESS_LOGIC.md            - 비즈니스 로직 알고리즘 명세서 (🔥 필수)
7. SECURITY.md                  - 보안 가이드 및 Rules
```

### **⚠️ 작업 프로세스 (필수 준수)**

```bash
# ============================================
# 📥 작업 시작 시 (BEFORE)
# ============================================

# 1. 관련 문서 읽기
cat STRUCTURE.md                # 사용자 계층 확인
cat FIRESTORE_COLLECTIONS.md    # 컬렉션 구조 확인
cat FIELD_NAMING_STANDARD.md    # 필드명 규칙 확인

# 2. 기존 코드 확인
ls services/                    # Service 레이어 확인
grep "COLLECTIONS" lib/constants.ts  # 컬렉션 상수 확인
ls lib/types/                   # 타입 정의 확인

# 3. 작업 진행
# (코드 작성...)

# ============================================
# 📤 작업 완료 시 (AFTER)
# ============================================

# 4. 빌드 테스트
npm run build

# 5. Git 커밋
git add .
git commit -m "feat: [작업 내용]"
git push origin main

# 6. 문서 업데이트 (필수!)
# - 새 컬렉션 추가 시 → FIRESTORE_COLLECTIONS.md 업데이트
# - 새 필드 추가 시 → FIELD_NAMING_STANDARD.md 업데이트
# - 보안 규칙 변경 시 → SECURITY.md 업데이트
# - 🔥 로직 수정/추가 시 → BUSINESS_LOGIC.md 업데이트 (필수!)
# - 🔥 기술 스택/컨벤션 변경 시 → SYSTEM_PROMPT.md 업데이트 (필수!)
#   예: 새 라이브러리 추가, 파일 구조 변경, 네이밍 규칙 변경 등
# - 주요 변경사항 → docs/CHANGELOG.md 업데이트

# 7. README.md 갱신
# - 완료된 기능 체크
# - 배포 URL 업데이트
# - 버전 번호 업데이트
```

### **📝 문서 업데이트 규칙 (CRITICAL)**

**⚠️ 코드 변경 시 관련 문서도 반드시 함께 업데이트하세요!**

| 변경 유형 | 업데이트할 문서 | 예시 |
|----------|----------------|------|
| **새 컬렉션 추가** | `FIRESTORE_COLLECTIONS.md` | `notifications` 컬렉션 추가 시 |
| **새 필드 추가** | `FIELD_NAMING_STANDARD.md` | `employeeBirth` 필드 추가 시 |
| **보안 규칙 변경** | `SECURITY.md` | Firestore Rules 수정 시 |
| **🔥 로직 수정/추가** | `BUSINESS_LOGIC.md` | 급여 계산 로직 변경 시 (필수!) |
| **🔥 기술 스택 변경** | `SYSTEM_PROMPT.md` | 새 라이브러리 추가, 프로젝트 구조 변경 등 (필수!) |
| **주요 기능 추가** | `docs/CHANGELOG.md` | 버전 이력 기록 |
| **배포/URL 변경** | `README.md` | 프로덕션 URL 업데이트 |

#### **SYSTEM_PROMPT.md 업데이트가 필요한 경우:**

```bash
# 1. 새 라이브러리 추가 시
npm install react-pdf
→ SYSTEM_PROMPT.md > 1. 기술 스택 > Frontend 표 업데이트

# 2. 새 디렉토리 추가 시
mkdir lib/pdf
→ SYSTEM_PROMPT.md > 2. 프로젝트 구조 > 디렉토리 구조 업데이트

# 3. 네이밍 규칙 변경 시
# 예: 파일명을 camelCase로 변경하기로 결정
→ SYSTEM_PROMPT.md > 3. 코딩 컨벤션 > 파일명 규칙 업데이트

# 4. 새 UI 컴포넌트 라이브러리 사용 시
# 예: Material-UI 추가 (비권장이지만 필요한 경우)
→ SYSTEM_PROMPT.md > 5. UI/UX 규칙 업데이트

# 5. 금지 사항 해제 시
# 예: 특정 이유로 Redux 사용 결정
→ SYSTEM_PROMPT.md > 7. 금지 사항 업데이트

# 6. 새 패턴 추가 시
# 예: WebSocket 통신 패턴 추가
→ SYSTEM_PROMPT.md > 8. 필수 패턴 섹션에 추가
```

#### **업데이트 예시:**

```bash
# ❌ 잘못된 예: 문서 업데이트 없이 코드만 변경
git add components/pdf/pdf-viewer.tsx
git commit -m "feat: PDF 뷰어 추가"
# → SYSTEM_PROMPT.md 업데이트 누락!

# ✅ 올바른 예: 문서와 코드 함께 커밋
git add components/pdf/pdf-viewer.tsx SYSTEM_PROMPT.md
git commit -m "feat: PDF 뷰어 추가

- react-pdf 라이브러리 추가
- SYSTEM_PROMPT.md 기술 스택 업데이트"

---

## 📋 프로젝트 개요

**ABC Staff System**은 ABC 디저트 센터와 맛남살롱 체인점을 위한 **통합 직원 관리 솔루션**입니다.

### 🎯 핵심 가치

- ✅ **올인원 관리**: 직원, 출퇴근, 급여, 계약서를 하나의 시스템에서
- ✅ **실시간 동기화**: Firestore 기반 즉각적인 데이터 업데이트
- ✅ **스마트 자동화**: 급여 계산, 수당 적용, 스케줄 관리 자동화
- ✅ **모던 UI/UX**: Shadcn/UI 기반의 직관적인 인터페이스
- ✅ **Multi-Tenant**: 회사별 데이터 완전 격리

### 🏗️ 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    ABC Staff System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏢 Platform Dashboard (super_admin)                       │
│     - 회사 관리 (생성/삭제/정지)                            │
│     - 구독 플랜 관리                                        │
│     - 초대 코드 발급                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👔 Admin Dashboard (admin/manager/store_manager)          │
│     - 13개 탭: 대시보드, 직원, 출퇴근, 급여, 승인, 계약서  │
│     - 근무스케줄, 공지사항, 브랜드, 매장, 관리자, 초대, 설정│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 Employee Portal (employee/staff)                        │
│     - 8개 탭: 대시보드, 출퇴근, 급여, 스케줄, 결재          │
│     - 공지사항, 알림, 프로필                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**📖 상세 구조**: [STRUCTURE.md](./STRUCTURE.md) 참고

---

## 🌐 배포 URL

### 📱 Sandbox (개발/테스트)

**베이스 URL**: `https://3005-iqaenljjzk6jv0c4l69ca-c07dda5e.sandbox.novita.ai`

| 시스템 | 경로 | 용도 |
|--------|------|------|
| **홈페이지** | `/` | 랜딩 페이지 (플랜 안내) |
| **Platform** | `/platform` | 플랫폼 관리자 대시보드 |
| **Admin 로그인** | `/admin-login` | 관리자 로그인 |
| **Admin 회원가입** | `/admin-register` | 관리자 회원가입 |
| **Admin 대시보드** | `/admin-dashboard` | 관리자 메인 (13개 탭) |
| **직원 로그인** | `/employee-login` | 직원 로그인 |
| **직원 회원가입** | `/employee-register` | 직원 회원가입 |
| **직원 대시보드** | `/employee-dashboard` | 직원 메인 (8개 탭) |

---

## ✅ 완료된 핵심 기능

### 🔐 인증 시스템
- ✅ 관리자 회원가입/로그인 (Firebase Auth)
- ✅ 직원 회원가입/로그인 (초대 코드 기반)
- ✅ 권한 관리 (super_admin, admin, manager, store_manager, employee)
- ✅ 세션 관리 (AuthProvider, SSR 안전)

### 👔 관리자 대시보드 (13개 탭)
1. ✅ **대시보드**: 실시간 통계 (직원 수, 출근 현황, 승인 대기, 미서명 계약서)
2. ✅ **직원 관리**: 목록, 승인/거부, 필터, 삭제
3. ✅ **출퇴근 관리**: 출퇴근 기록, 위치 정보, QR 체크인
4. ✅ **급여 관리**: 급여 목록, 상세 모달, 확인/지급 처리
5. ✅ **승인 관리**: 휴가/초과근무/근무조정 승인
6. ✅ **계약서 관리**: 작성, 발송, 서명 관리
7. ✅ **근무스케줄**: 주간 캘린더, 시뮬레이터, PDF 내보내기
8. ✅ **공지사항**: 작성, 수정, 삭제, 중요 공지
9. ✅ **브랜드 관리**: 브랜드 생성, 로고 업로드, 색상 관리
10. ✅ **매장 관리**: 매장 생성, 급여 설정, 수당 옵션
11. ✅ **관리자 목록**: 권한 관리
12. ✅ **초대 코드**: 직원 초대 코드 발급
13. ✅ **설정**: 회사 정보, 공휴일 관리

### 👤 직원 포털 (8개 탭)
1. ✅ **대시보드**: 오늘의 출퇴근 상태, 이번 달 통계
2. ✅ **출퇴근**: QR 체크인/체크아웃, 월별 근무 내역
3. ✅ **급여**: 월별 급여 조회, 명세서 다운로드
4. ✅ **스케줄**: 주간 캘린더, 매장 전체 보기
5. ✅ **결재**: 휴가/초과근무 신청, 내역 조회
6. ✅ **공지사항**: 공지 목록, 중요 공지 상단 고정
7. ✅ **알림**: 알림 목록, 읽음 처리
8. ✅ **프로필**: 개인정보 수정, 계좌 정보

### 🔥 최신 기능 (v0.14.0)
- ✅ **Firebase Admin SDK 전환**: Rules 우회, 완전한 서버 권한
- ✅ **초대 코드 검증 API**: Enumeration Attack 차단, Rate Limiting
- ✅ **Firestore Rules 강화**: super_admin 기반 권한 체계
- ✅ **4개 컬렉션 추가**: subscription_plans, invitation_codes, open_shifts, notifications

---

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 15.5.9 (App Router) ⚡ 업그레이드
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.1
- **UI**: Shadcn/UI (Radix UI) - Blue Theme
- **Icons**: Lucide React

### Backend
- **Auth**: Firebase Auth 10.12.0
- **Database**: Firestore (NoSQL)
- **Admin SDK**: firebase-admin 12.x
- **Storage**: Firebase Storage
- **API**: Next.js API Routes
- **Functions**: Cloud Functions (급여 계산 서버화) 🆕

### Development
- **Package Manager**: npm
- **Linting**: ESLint
- **Version Control**: Git + GitHub
- **Process Manager**: PM2

---

## 🚀 시작하기

### 1️⃣ 환경 변수 설정

`.env.local` 파일 생성:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (서버 전용)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# 공공 API (선택)
NEXT_PUBLIC_HOLIDAY_API_KEY=your_holiday_api_key
```

### 2️⃣ 의존성 설치

```bash
cd /home/user/webapp
npm install
```

### 3️⃣ 개발 서버 실행

```bash
# 빌드
npm run build

# PM2로 실행 (Sandbox 환경)
pm2 start ecosystem.config.cjs

# 로그 확인
pm2 logs admin-dashboard --nostream

# 재시작
pm2 restart admin-dashboard
```

### 4️⃣ 로컬 개발 (외부 환경)

```bash
npm run dev
```

---

## 📁 프로젝트 구조

```
/home/user/webapp/
├── app/                        # Next.js App Router
│   ├── (admin)/               # 관리자 라우트 그룹
│   │   └── admin-dashboard/
│   ├── (platform)/            # 플랫폼 라우트 그룹
│   │   └── platform/
│   ├── api/                   # API Routes
│   │   └── verify-invite-code/
│   ├── employee-dashboard/    # 직원 대시보드
│   └── page.tsx               # 랜딩 페이지
│
├── components/
│   ├── admin/                 # 관리자 컴포넌트
│   │   ├── tabs/             # 13개 탭
│   │   └── modals/           # 모달
│   ├── employee/             # 직원 컴포넌트
│   │   └── tabs/             # 8개 탭
│   ├── platform/             # 플랫폼 컴포넌트
│   └── ui/                   # Shadcn/UI 컴포넌트
│
├── hooks/                     # 커스텀 훅
│   └── admin/
│
├── lib/
│   ├── firebase.ts           # Firebase Client SDK
│   ├── firebase-admin.ts     # Firebase Admin SDK
│   ├── auth-context.tsx      # Auth Provider
│   ├── constants.ts          # 상수 정의
│   ├── types/                # TypeScript 타입
│   └── utils/                # 유틸리티 함수
│
├── services/                  # Service Layer
│   ├── employeeService.ts
│   ├── attendanceService.ts
│   ├── salaryService.ts
│   └── ...
│
├── public/                    # 정적 파일
├── docs/                      # 추가 문서
│   ├── CHANGELOG.md
│   ├── DEVELOPMENT.md
│   └── LEGACY_MIGRATION.md
│
├── _legacy/                   # 레거시 백업 (참고용)
│
├── README.md                  # 📖 이 파일
├── STRUCTURE.md               # 🏗️ 시스템 구조
├── FIRESTORE_COLLECTIONS.md   # 🗄️ 컬렉션 명세
├── FIELD_NAMING_STANDARD.md   # 📝 필드명 규칙
├── SECURITY.md                # 🔒 보안 가이드
│
├── firestore.rules            # Firestore 보안 규칙
├── package.json
├── tsconfig.json
└── ecosystem.config.cjs       # PM2 설정
```

---

## 🔒 보안

- ✅ Firebase Auth (이메일/비밀번호)
- ✅ Firebase Admin SDK (Rules 우회)
- ✅ Firestore Security Rules (역할 기반)
  - ✅ users 업데이트 시 role/companyId 변경 차단 🆕
- ✅ API Key 하드코딩 제거 (환경변수 필수) 🆕
- ✅ 급여 정보 로그 노출 차단 🆕
- ✅ 서버 단 인증 보호 (middleware.ts) 🆕
- ✅ 환경 변수로 키 관리
- ✅ Legacy 파일 격리 (`_legacy/`)

**📖 상세 보안 가이드**: [SECURITY.md](./SECURITY.md) 참고

---

## 📝 변경 이력

**v0.17.0 (2025-01-17)**: 🔐 긴급 보안 구멍 7개 수정, Next.js 15 업그레이드, Cloud Functions 구조 추가  
**v0.14.0 (2024-12-16)**: Firebase Admin SDK 전환, Firestore Rules 강화  
**v0.13.0 (2024-12-16)**: 초대 코드 검증 API Route  
**v0.12.0 (2024-12-15)**: Legacy 파일 격리, 기술 부채 문서화  
**v0.11.0 (2024-12-15)**: QR 출퇴근 기능  
**v0.10.0 (2024-12-14)**: 급여명세서 PDF 다운로드  
...

**전체 변경 이력**: [docs/CHANGELOG.md](./docs/CHANGELOG.md) 참고

---

## 🤝 기여 및 문의

**개발자**: 사장님 + AI Assistant  
**라이선스**: Proprietary - ABC Dessert Center  
**GitHub**: https://github.com/uhi13088/ABCDC-staff-system

---

## 📚 관련 문서

| 문서 | 설명 | 필수 읽기 |
|------|------|-----------|
| [STRUCTURE.md](./STRUCTURE.md) | 사용자 계층 구조 및 대시보드 구조 | ⭐⭐⭐ |
| [FIRESTORE_COLLECTIONS.md](./FIRESTORE_COLLECTIONS.md) | Firestore 컬렉션 명세 | ⭐⭐⭐ |
| [FIELD_NAMING_STANDARD.md](./FIELD_NAMING_STANDARD.md) | 필드명 규칙 | ⭐⭐⭐ |
| [SECURITY.md](./SECURITY.md) | 보안 가이드 및 Rules | ⭐⭐⭐ |
| [docs/CHANGELOG.md](./docs/CHANGELOG.md) | 변경 이력 | ⭐ |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | 개발 환경 설정 | ⭐ |
| [docs/LEGACY_MIGRATION.md](./docs/LEGACY_MIGRATION.md) | 레거시 마이그레이션 | ⭐ |

---

**⚠️ 마지막 알림: 모든 작업 완료 후 반드시 문서를 업데이트하세요!**
