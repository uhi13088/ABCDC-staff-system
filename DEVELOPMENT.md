# Development Guide

> ABC Staff System 개발 가이드

## 🛠️ 개발 환경 설정

### 필수 도구

- **Node.js**: 20.x 이상
- **npm**: 10.x 이상
- **Git**: 2.x 이상
- **VS Code** (권장)

### VS Code 추천 확장

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "dsznajder.es7-react-js-snippets"
  ]
}
```

---

## 📦 의존성 관리

### 안정화 버전 (현재 사용 중)

```json
{
  "next": "14.2.3",           // LTS 버전 (안정)
  "react": "18.3.1",          // 안정
  "firebase": "10.12.0",      // Next.js 14 권장 버전
  "typescript": "^5.0.0"      // 최신 안정
}
```

### ⚠️ 주의사항

**절대 업그레이드하지 말 것:**
- ❌ `next`: 16.x (실험 버전)
- ❌ `react`: 19.x (RC 버전)
- ❌ `firebase`: 12.x (호환성 문제)

**업그레이드 시:**
```bash
# 잘못된 버전으로 설치된 경우
rm -rf node_modules package-lock.json .next
npm install
```

---

## 🚀 개발 서버 실행

### 로컬 개발

```bash
# 개발 서버 시작 (기본 포트 3000)
npm run dev

# 특정 포트로 시작
npm run dev -- -p 3005
```

### 빌드 및 프로덕션 테스트

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### 포트 충돌 해결

```bash
# 포트 사용 중인 프로세스 확인
lsof -i :3000

# 프로세스 강제 종료
kill -9 <PID>

# 또는 npm 스크립트 사용
pkill -9 -f "next dev"
```

---

## 🏗️ 프로젝트 구조

### App Router 구조

```
app/
├── (admin)/              # Route Group (URL에 포함 안 됨)
│   └── admin-dashboard/
│       └── page.tsx      # /admin-dashboard
├── admin-login/
│   └── page.tsx          # /admin-login
├── admin-register/
│   └── page.tsx          # /admin-register
├── layout.tsx            # 루트 레이아웃
└── page.tsx              # 홈페이지 (/)
```

### 컴포넌트 구조

```
components/
├── admin/
│   └── tabs/             # 대시보드 탭 컴포넌트
│       ├── dashboard-tab.tsx
│       ├── employees-tab.tsx
│       └── ...
└── ui/                   # Shadcn/UI 재사용 컴포넌트
    ├── button.tsx
    ├── card.tsx
    ├── input.tsx
    └── ...
```

### 훅 구조

```
hooks/
└── admin/
    ├── useDashboardLogic.ts     # 대시보드 로직
    ├── useEmployeesLogic.ts     # 직원 관리 로직
    └── ...
```

---

## 🎨 Shadcn/UI 사용법

### 컴포넌트 추가

```bash
# 새 컴포넌트 설치
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
```

### 커스터마이징

```tsx
// components/ui/button.tsx
import { cn } from "@/lib/utils"

export const Button = ({ className, ...props }) => {
  return (
    <button
      className={cn(
        "bg-blue-600 hover:bg-blue-700 text-white",
        className
      )}
      {...props}
    />
  )
}
```

---

## 🔥 Firebase 연동

### 초기 설정

1. **Firebase Console에서 프로젝트 생성**
   - https://console.firebase.google.com

2. **Firestore Database 생성**
   - 프로덕션 모드 시작
   - Security Rules 설정

3. **Authentication 활성화**
   - 이메일/비밀번호 로그인 활성화

4. **환경 변수 설정**
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Companies: 관리자만 생성/수정
    match /companies/{companyId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users: 본인 또는 관리자만 읽기/수정
    match /users/{userId} {
      allow read: if request.auth != null 
        && (request.auth.uid == userId 
            || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']);
      allow create: if request.auth != null;
      allow update: if request.auth != null 
        && (request.auth.uid == userId 
            || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow delete: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Attendance: 같은 회사만 읽기/쓰기
    match /attendance/{docId} {
      allow read, write: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == resource.data.companyId;
    }
    
    // Approvals: 같은 회사만 읽기, 관리자만 수정
    match /approvals/{docId} {
      allow read: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == resource.data.companyId;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager'];
    }
    
    // Contracts: 같은 회사만 읽기/쓰기
    match /contracts/{docId} {
      allow read, write: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == resource.data.companyId;
    }
  }
}
```

---

## ⚡ 성능 최적화

### Dynamic Import

```tsx
// ✅ 올바른 방법 (탭 컴포넌트)
import dynamic from 'next/dynamic';

const DashboardTab = dynamic(
  () => import('@/components/admin/tabs/dashboard-tab'),
  { 
    ssr: false,  // SSR 비활성화 (관리자 페이지)
    loading: () => <Skeleton className="h-96 w-full" /> 
  }
);
```

### Firebase 최적화

```tsx
// ✅ 필요한 메서드만 import
import { doc, getDoc } from 'firebase/firestore';

// ❌ 전체 import (무거움)
import * as firestore from 'firebase/firestore';
```

### 이미지 최적화

```tsx
// ✅ Next.js Image 컴포넌트 사용
import Image from 'next/image';

<Image 
  src="/logo.png" 
  width={200} 
  height={100} 
  alt="Logo"
  priority  // 중요 이미지
/>
```

---

## 🧪 테스트

### 수동 테스트 체크리스트

#### 인증 플로우
- [ ] 회원가입 → Firebase Auth 계정 생성
- [ ] 회원가입 → Firestore `users`, `companies` 저장
- [ ] 로그인 → 대시보드 자동 이동
- [ ] 로그아웃 → 로그인 페이지 이동
- [ ] 미인증 접근 → 로그인 페이지 리다이렉트

#### 대시보드
- [ ] 통계 카드 4개 정상 표시
- [ ] 13개 탭 전환 부드럽게 작동
- [ ] Skeleton 로딩 정상 표시
- [ ] 회사명, 플랜 정보 헤더에 표시

#### 성능
- [ ] 대시보드 첫 로드 5초 이내
- [ ] 탭 전환 1초 이내
- [ ] 회원가입 페이지 1초 이내

---

## 🐛 디버깅

### 자주 발생하는 문제

#### 1. Firebase 연결 오류
```bash
# .env 파일 확인
cat .env

# Firebase 설정 확인
npm run dev
# 브라우저 콘솔에서 Firebase 에러 확인
```

#### 2. 서버 멈춤 (무한 로딩)
```bash
# 배럴 파일 import 확인
grep -r "from '@/hooks/admin'" components/admin/tabs/

# SSR 비활성화 확인
grep "ssr: false" app/(admin)/admin-dashboard/page.tsx
```

#### 3. 빌드 에러
```bash
# 타입 에러 확인
npm run build

# TypeScript 엄격 모드 임시 비활성화
# tsconfig.json: "strict": false
```

---

## 📝 코딩 컨벤션

### TypeScript

```tsx
// ✅ 명시적 타입 선언
interface User {
  uid: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
}

const user: User = { ... };

// ❌ any 타입 금지
const data: any = { ... };  // 절대 금지!
```

### React 컴포넌트

```tsx
// ✅ 함수형 컴포넌트 + TypeScript
interface Props {
  companyId: string;
}

export default function DashboardTab({ companyId }: Props) {
  return <div>...</div>;
}

// ❌ 클래스 컴포넌트 금지
class DashboardTab extends React.Component { ... }
```

### Tailwind CSS

```tsx
// ✅ cn() 유틸리티 사용
import { cn } from "@/lib/utils";

<div className={cn(
  "bg-white p-4",
  isActive && "border-blue-500"
)}>

// ❌ 문자열 직접 조합
<div className={`bg-white p-4 ${isActive ? 'border-blue-500' : ''}`}>
```

---

## 🔄 Git 워크플로우

### 브랜치 전략

```bash
# main: 프로덕션 (안정 버전)
# develop: 개발 브랜치
# feature/*: 기능 개발

# 새 기능 개발
git checkout -b feature/employee-login
git add .
git commit -m "feat: 직원 로그인 페이지 추가"
git push origin feature/employee-login
```

### 커밋 메시지 규칙

```bash
# feat: 새 기능
git commit -m "feat: 직원 초대 기능 추가"

# fix: 버그 수정
git commit -m "fix: 로그인 세션 유지 버그 수정"

# docs: 문서 수정
git commit -m "docs: README 업데이트"

# style: 코드 포맷팅
git commit -m "style: Tailwind CSS 클래스 정리"

# refactor: 리팩토링
git commit -m "refactor: useDashboardLogic 훅 분리"

# perf: 성능 개선
git commit -m "perf: Dynamic Import 적용"
```

---

## 📚 참고 자료

- **Next.js 14**: https://nextjs.org/docs
- **Firebase**: https://firebase.google.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Shadcn/UI**: https://ui.shadcn.com
- **TypeScript**: https://www.typescriptlang.org/docs

---

**마지막 업데이트**: 2024-12-10
