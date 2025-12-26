# SYSTEM_PROMPT.md

**Version**: v1.0.0  
**Last Updated**: 2025-12-26  
**Purpose**: ABC Staff System의 기술 스택, 코딩 컨벤션, 제약사항을 명시하여 AI가 일관된 코드를 생성하도록 함

---

## 🚨 **중요 공지**

**⚠️ AI는 이 문서의 규칙을 절대 위반해서는 안 됩니다!**

- **코드 스타일을 멋대로 바꾸지 마세요**
- **기술 스택을 임의로 변경하지 마세요**
- **제약사항을 무시하지 마세요**
- **기존 패턴을 따르세요**

---

## 📚 **목차**

1. [기술 스택](#1-기술-스택)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [코딩 컨벤션](#3-코딩-컨벤션)
4. [Firestore 규칙](#4-firestore-규칙)
5. [UI/UX 규칙](#5-uiux-규칙)
6. [보안 규칙](#6-보안-규칙)
7. [금지 사항](#7-금지-사항)
8. [필수 패턴](#8-필수-패턴)

---

## 1. 기술 스택

### **Frontend**

| 항목 | 기술 | 버전 | 비고 |
|------|------|------|------|
| **Framework** | Next.js | 15.5.9 | App Router (Pages Router 금지) |
| **Language** | TypeScript | 5.x | JavaScript 금지 (타입 안전성 필수) |
| **Styling** | Tailwind CSS | 3.4.1 | CSS-in-JS 금지 |
| **UI Library** | Shadcn/UI | Latest | Custom 컴포넌트 우선 |
| **Icons** | Lucide React | Latest | Font Awesome 금지 |
| **State Management** | React Context | Built-in | Redux/Zustand 금지 (불필요) |
| **Forms** | React Hook Form | Latest | Formik 금지 |

### **Backend**

| 항목 | 기술 | 버전 | 비고 |
|------|------|------|------|
| **BaaS** | Firebase | 10.x | Firestore, Auth, Storage, Functions |
| **Functions** | Cloud Functions | Node.js 20 | asia-northeast3 리전 |
| **Admin SDK** | Firebase Admin | 12.x | 서버 로직 전용 |
| **API Routes** | Next.js API | Built-in | Express 금지 |

### **Database**

| 항목 | 기술 | 비고 |
|------|------|------|
| **Primary DB** | Firestore | NoSQL, Real-time |
| **Storage** | Firebase Storage | 이미지, PDF 저장 |
| **Auth** | Firebase Auth | 이메일/비밀번호 |

### **Deployment**

| 항목 | 기술 | 비고 |
|------|------|------|
| **Hosting** | Firebase Hosting | Next.js SSR 지원 |
| **Functions** | Cloud Functions | asia-northeast3 |
| **CI/CD** | GitHub Actions | 자동 배포 |
| **Version Control** | Git + GitHub | main 브랜치 |

---

## 2. 프로젝트 구조

### **디렉토리 구조 (절대 변경 금지)**

```
webapp/
├── app/                           # Next.js App Router
│   ├── admin-dashboard/           # 관리자 대시보드
│   ├── employee-dashboard/        # 직원 대시보드
│   ├── platform/                  # 플랫폼 대시보드
│   ├── api/                       # API Routes
│   │   └── verify-invite-code/    # 초대 코드 검증 API
│   └── page.tsx                   # 랜딩 페이지
├── components/                    # React 컴포넌트
│   ├── admin/                     # 관리자 컴포넌트
│   │   ├── tabs/                  # 탭 컴포넌트
│   │   └── modals/                # 모달 컴포넌트
│   ├── employee/                  # 직원 컴포넌트
│   │   └── tabs/                  # 탭 컴포넌트
│   ├── platform/                  # 플랫폼 컴포넌트
│   └── ui/                        # Shadcn/UI 컴포넌트
├── hooks/                         # Custom Hooks
│   ├── admin/                     # 관리자 훅
│   └── employee/                  # 직원 훅
├── lib/                           # 유틸리티 라이브러리
│   ├── firebase.ts                # Firebase Client SDK
│   ├── firebase-admin.ts          # Firebase Admin SDK
│   ├── auth-context.tsx           # 인증 Context
│   ├── constants.ts               # 상수 (COLLECTIONS 등)
│   ├── types/                     # TypeScript 타입
│   └── utils/                     # 유틸리티 함수
│       ├── salary-calculator.ts   # 급여 계산 유틸
│       ├── calculate-monthly-salary.ts  # 레거시
│       └── timezone.ts            # 시간대 유틸
├── services/                      # 비즈니스 로직 레이어
│   ├── salaryService.ts           # 급여 서비스
│   ├── cloudFunctionsSalaryService.ts  # Cloud Functions 호출
│   └── notificationService.ts     # 알림 서비스
├── functions/                     # Cloud Functions
│   ├── src/
│   │   └── index.ts               # 급여 계산 Function
│   ├── package.json
│   └── tsconfig.json
├── public/                        # 정적 파일
├── firestore.rules                # Firestore 보안 규칙
├── middleware.ts                  # Next.js Middleware
├── ecosystem.config.cjs           # PM2 설정 (Sandbox 전용)
├── wrangler.jsonc                 # Cloudflare 설정 (사용 안 함)
├── firebase.json                  # Firebase 설정
├── .env.local                     # 환경 변수
├── .gitignore                     # Git 무시 파일
├── package.json
├── tsconfig.json
└── README.md
```

### **폴더별 역할**

| 폴더 | 역할 | 파일 예시 |
|------|------|----------|
| `app/` | Next.js 페이지 및 라우팅 | `page.tsx`, `layout.tsx` |
| `components/` | React 컴포넌트 | `dashboard-tab.tsx`, `salary-modal.tsx` |
| `hooks/` | Custom Hooks | `useSalaryLogic.ts`, `useAttendance.ts` |
| `lib/` | 라이브러리 및 유틸 | `firebase.ts`, `constants.ts` |
| `services/` | 비즈니스 로직 | `salaryService.ts`, `approvalService.ts` |
| `functions/` | Cloud Functions | `index.ts` (급여 계산) |

---

## 3. 코딩 컨벤션

### **3.1 TypeScript**

#### **타입 정의**

```typescript
// ✅ GOOD: interface 사용 (객체 타입)
interface User {
  uid: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  companyId: string;
}

// ✅ GOOD: type 사용 (유니온, 인터섹션)
type UserRole = 'admin' | 'manager' | 'employee';
type UserWithCompany = User & { companyName: string };

// ❌ BAD: any 사용
const data: any = getData(); // 금지!

// ✅ GOOD: 명확한 타입 지정
const data: User = getData();
```

#### **타입 파일 위치**

```typescript
// ✅ GOOD: lib/types/ 디렉토리에 타입 정의
// lib/types/salary.ts
export interface MonthlySalaryResult {
  employeeName: string;
  basePay: number;
  netPay: number;
  // ...
}

// ❌ BAD: 컴포넌트 파일 내부에 타입 정의
```

#### **함수 타입**

```typescript
// ✅ GOOD: 명시적 반환 타입
async function calculateSalary(userId: string): Promise<MonthlySalaryResult> {
  // ...
}

// ❌ BAD: 반환 타입 생략
async function calculateSalary(userId: string) {
  // ...
}
```

### **3.2 네이밍 컨벤션**

#### **변수/함수**

```typescript
// ✅ GOOD: camelCase
const userName = 'John Doe';
const isAdmin = true;
function getUserData() {}

// ❌ BAD: snake_case, PascalCase
const user_name = 'John Doe';
const IsAdmin = true;
function GetUserData() {}
```

#### **상수**

```typescript
// ✅ GOOD: UPPER_SNAKE_CASE (lib/constants.ts)
export const COLLECTIONS = {
  USERS: 'users',
  ATTENDANCE: 'attendance',
  SALARY: 'salary'
};

export const MAX_USERS_FREE_PLAN = 5;
```

#### **컴포넌트**

```typescript
// ✅ GOOD: PascalCase + 명확한 이름
export function SalaryDetailModal() {}
export function DashboardTab() {}

// ❌ BAD: 불명확한 이름
export function Modal() {}
export function Tab() {}
```

#### **파일명**

```
✅ GOOD: kebab-case
- components/admin/tabs/salary-tab.tsx
- hooks/admin/useSalaryLogic.ts
- lib/utils/salary-calculator.ts

❌ BAD: camelCase, PascalCase
- components/admin/tabs/SalaryTab.tsx
- hooks/admin/UseSalaryLogic.ts
```

### **3.3 Firestore 필드명 (CRITICAL)**

**⚠️ 반드시 FIELD_NAMING_STANDARD.md 준수!**

```typescript
// ✅ GOOD: 표준 필드명 사용
const attendance = {
  userId: 'user_123',           // ✅ 표준
  storeId: 'store_456',         // ✅ 표준
  storeName: '맛남살롱 부천시청점', // ✅ 표준
  clockIn: '09:00',             // ✅ 표준
  clockOut: '18:00',            // ✅ 표준
  date: '2025-01-15',
  companyId: 'company_789'
};

// ❌ BAD: 레거시 필드명 (읽기 전용만 허용)
const attendance = {
  uid: 'user_123',              // ❌ 레거시 (userId 사용)
  employeeId: 'emp_456',        // ❌ 레거시 (userId 사용)
  store: '맛남살롱',             // ❌ 레거시 (storeId + storeName 사용)
  checkIn: '09:00',             // ❌ 레거시 (clockIn 사용)
  checkOut: '18:00'             // ❌ 레거시 (clockOut 사용)
};
```

**표준 필드명 요약:**

| 용도 | 표준 필드명 | 레거시 필드명 (읽기 전용) |
|------|------------|-------------------------|
| 사용자 ID | `userId` | `uid`, `employeeId` |
| 매장 ID | `storeId` | - |
| 매장 이름 | `storeName` | `store` |
| 출근 시간 | `clockIn` | `checkIn` |
| 퇴근 시간 | `clockOut` | `checkOut` |

### **3.4 React 컴포넌트**

#### **컴포넌트 구조**

```typescript
// ✅ GOOD: 명확한 구조
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface SalaryTabProps {
  userId: string;
  companyId: string;
}

export function SalaryTab({ userId, companyId }: SalaryTabProps) {
  // 1. State
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 2. Effects
  useEffect(() => {
    loadSalaries();
  }, [userId]);
  
  // 3. Handlers
  const loadSalaries = async () => {
    setLoading(true);
    // ...
    setLoading(false);
  };
  
  // 4. Render
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="p-4">
      {/* JSX */}
    </div>
  );
}
```

#### **Props 전달**

```typescript
// ✅ GOOD: 명시적 props
<SalaryTab userId={user.uid} companyId={user.companyId} />

// ❌ BAD: 전체 객체 전달 (불필요한 의존성)
<SalaryTab user={user} />
```

### **3.5 Async/Await**

```typescript
// ✅ GOOD: try-catch 사용
async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const doc = await getDoc(doc(db, 'users', userId));
    if (!doc.exists()) {
      console.error('사용자를 찾을 수 없습니다.');
      return null;
    }
    return doc.data() as User;
  } catch (error) {
    console.error('사용자 조회 실패:', error);
    return null;
  }
}

// ❌ BAD: try-catch 누락
async function fetchUserData(userId: string): Promise<User> {
  const doc = await getDoc(doc(db, 'users', userId)); // 에러 핸들링 없음!
  return doc.data() as User;
}
```

---

## 4. Firestore 규칙

### **4.1 컬렉션 이름 (절대 변경 금지)**

**⚠️ 반드시 `lib/constants.ts`의 `COLLECTIONS` 사용!**

```typescript
// ✅ GOOD: 상수 사용
import { COLLECTIONS } from '@/lib/constants';

const usersRef = collection(db, COLLECTIONS.USERS);
const attendanceRef = collection(db, COLLECTIONS.ATTENDANCE);

// ❌ BAD: 문자열 직접 사용
const usersRef = collection(db, 'users');
const attendanceRef = collection(db, 'attendance');
```

### **4.2 쿼리 패턴**

#### **companyId 필터 (필수)**

```typescript
// ✅ GOOD: companyId로 데이터 격리
const attendancesQuery = query(
  collection(db, COLLECTIONS.ATTENDANCE),
  where('companyId', '==', user.companyId),  // 필수!
  where('userId', '==', userId),
  where('date', '>=', startDate),
  where('date', '<=', endDate)
);

// ❌ BAD: companyId 필터 누락 (보안 취약)
const attendancesQuery = query(
  collection(db, COLLECTIONS.ATTENDANCE),
  where('userId', '==', userId)
);
```

#### **serverTimestamp 사용**

```typescript
// ✅ GOOD: serverTimestamp() 사용
import { serverTimestamp } from 'firebase/firestore';

await addDoc(collection(db, COLLECTIONS.USERS), {
  name: 'John Doe',
  createdAt: serverTimestamp(),  // 서버 시간
  updatedAt: serverTimestamp()
});

// ❌ BAD: 클라이언트 시간 사용 (조작 가능)
await addDoc(collection(db, COLLECTIONS.USERS), {
  name: 'John Doe',
  createdAt: new Date(),  // 클라이언트 시간
  updatedAt: new Date()
});
```

### **4.3 Admin SDK vs Client SDK**

| 상황 | 사용 SDK | 위치 | 이유 |
|------|---------|------|------|
| **일반 CRUD** | Client SDK | 컴포넌트, 훅 | Firestore Rules 적용 |
| **초대 코드 검증** | Admin SDK | API Route | Rules 우회 필요 |
| **급여 계산** | Admin SDK | Cloud Functions | 보안 + Rules 우회 |
| **벌크 작업** | Admin SDK | Cloud Functions | 성능 + Rules 우회 |

```typescript
// ✅ GOOD: Client SDK (일반 CRUD)
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));

// ✅ GOOD: Admin SDK (API Route)
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const codesSnapshot = await adminDb
    .collection(COLLECTIONS.INVITATION_CODES)
    .where('code', '==', code)
    .get();
}
```

---

## 5. UI/UX 규칙

### **5.1 Tailwind CSS 클래스 순서**

```typescript
// ✅ GOOD: 논리적 순서
<div className="
  flex items-center justify-between    // Layout
  p-4 space-x-2                        // Spacing
  bg-white rounded-lg shadow-md        // Background & Border
  hover:bg-gray-50                     // Interactive
  transition-colors duration-200       // Animation
">
  {/* Content */}
</div>

// ❌ BAD: 무질서한 순서
<div className="bg-white p-4 transition-colors hover:bg-gray-50 flex rounded-lg items-center shadow-md space-x-2 justify-between duration-200">
```

### **5.2 Shadcn/UI 컴포넌트 사용**

```typescript
// ✅ GOOD: Shadcn/UI 컴포넌트 사용
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Button variant="default" size="md">
  저장
</Button>

// ❌ BAD: 직접 HTML 버튼
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  저장
</button>
```

### **5.3 아이콘**

```typescript
// ✅ GOOD: Lucide React 아이콘
import { Save, Trash2, Edit } from 'lucide-react';

<Save className="w-4 h-4" />
<Trash2 className="w-4 h-4 text-red-500" />

// ❌ BAD: Font Awesome, Material Icons
import { FaSave } from 'react-icons/fa';
```

### **5.4 로딩 상태**

```typescript
// ✅ GOOD: Skeleton 컴포넌트
import { Skeleton } from '@/components/ui/skeleton';

if (loading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

// ❌ BAD: 단순 텍스트
if (loading) {
  return <div>Loading...</div>;
}
```

---

## 6. 보안 규칙

### **6.1 환경 변수**

```typescript
// ✅ GOOD: .env.local 사용
// .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=abcdc-staff-system.firebaseapp.com
FIREBASE_ADMIN_PROJECT_ID=abcdc-staff-system
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@abcdc-staff-system.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

// ❌ BAD: 하드코딩
const apiKey = 'AIzaSy...';  // 절대 금지!
```

### **6.2 API 키 노출 방지**

```typescript
// ✅ GOOD: 환경 변수 사용
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// ❌ BAD: 코드에 직접 작성
const apiKey = 'AIzaSyCr3Tq2T7oy5rVlK1c33m_G0TlUWv0-g3k';
```

### **6.3 민감한 로그 제거**

```typescript
// ✅ GOOD: 개발 환경에서만 로그
if (process.env.NODE_ENV === 'development') {
  console.log('급여 계산 결과:', salaryResult);
}

// ❌ BAD: 운영 환경에서도 로그 (민감 정보 노출)
console.log('급여 계산 결과:', salaryResult);
```

### **6.4 권한 체크 (클라이언트 + 서버)**

```typescript
// ✅ GOOD: 클라이언트 + 서버 단 권한 체크
// 1. 클라이언트 (UI 차단)
if (user.role !== 'admin') {
  return <div>권한이 없습니다.</div>;
}

// 2. API Route (서버 검증)
export async function POST(request: NextRequest) {
  const callerDoc = await adminDb.collection('users').doc(callerUid).get();
  if (callerDoc.data().role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }
}

// ❌ BAD: 클라이언트만 체크 (우회 가능)
if (user.role !== 'admin') {
  return <div>권한이 없습니다.</div>;
}
// API Route 권한 체크 없음
```

---

## 7. 금지 사항

### **7.1 절대 금지**

| 항목 | 이유 |
|------|------|
| ❌ **JavaScript 사용** | 타입 안전성 없음 (TypeScript 필수) |
| ❌ **any 타입** | 타입 체크 무력화 |
| ❌ **CSS-in-JS** | Tailwind CSS 사용 (Styled-components, Emotion 금지) |
| ❌ **jQuery** | React 프로젝트에서 불필요 |
| ❌ **Redux, Zustand** | Context API로 충분 (불필요한 복잡도) |
| ❌ **직접 SQL** | Firestore 사용 (관계형 DB 없음) |
| ❌ **레거시 필드명 생성** | `userId` 대신 `uid` 생성 금지 |
| ❌ **console.log (운영)** | 민감 정보 노출 (개발 환경만 허용) |
| ❌ **하드코딩 API 키** | .env.local 사용 필수 |
| ❌ **클라이언트 급여 계산** | Cloud Functions 사용 필수 |

### **7.2 지양 사항**

| 항목 | 대안 |
|------|------|
| ⚠️ **Inline 스타일** | Tailwind CSS 클래스 사용 |
| ⚠️ **전체 객체 Props** | 필요한 필드만 전달 |
| ⚠️ **Deep nesting** | Early return, 함수 분리 |
| ⚠️ **Magic numbers** | 상수로 정의 (lib/constants.ts) |
| ⚠️ **긴 함수** | 50줄 이하로 분리 |

---

## 8. 필수 패턴

### **8.1 Custom Hook 패턴**

```typescript
// ✅ GOOD: Custom Hook (hooks/admin/useSalaryLogic.ts)
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

export function useSalaryLogic() {
  const { user } = useAuth();
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(false);
  
  const loadSalaries = async () => {
    setLoading(true);
    try {
      // 로직...
    } catch (error) {
      console.error('급여 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (user) {
      loadSalaries();
    }
  }, [user]);
  
  return {
    salaries,
    loading,
    loadSalaries
  };
}
```

### **8.2 Service 레이어 패턴**

```typescript
// ✅ GOOD: Service 레이어 (services/salaryService.ts)
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

export class SalaryService {
  async getSalaries(companyId: string, yearMonth: string): Promise<Salary[]> {
    const salariesQuery = query(
      collection(db, COLLECTIONS.SALARY),
      where('companyId', '==', companyId),
      where('yearMonth', '==', yearMonth)
    );
    
    const snapshot = await getDocs(salariesQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Salary[];
  }
}

export const salaryService = new SalaryService();
```

### **8.3 Cloud Functions 호출 패턴**

```typescript
// ✅ GOOD: Cloud Functions 호출 (services/cloudFunctionsSalaryService.ts)
import { getFunctions, httpsCallable } from 'firebase/functions';

export async function calculateSalaryViaFunction(
  employeeUid: string,
  yearMonth: string
): Promise<MonthlySalaryResult> {
  const functions = getFunctions(undefined, 'asia-northeast3');
  const calculateSalary = httpsCallable(functions, 'calculateMonthlySalary');
  
  const result = await calculateSalary({ employeeUid, yearMonth });
  
  if (!result.data.success) {
    throw new Error(result.data.error || '급여 계산 실패');
  }
  
  return result.data.data;
}
```

### **8.4 에러 핸들링 패턴**

```typescript
// ✅ GOOD: 명확한 에러 메시지
try {
  await salaryService.calculateSalary(userId, yearMonth);
  alert('급여 계산 완료');
} catch (error) {
  console.error('급여 계산 실패:', error);
  alert('급여 계산에 실패했습니다. 잠시 후 다시 시도해주세요.');
}

// ❌ BAD: 일반적인 에러 메시지
try {
  await salaryService.calculateSalary(userId, yearMonth);
} catch (error) {
  alert('에러 발생');  // 무슨 에러인지 알 수 없음
}
```

### **8.5 Modal 패턴**

```typescript
// ✅ GOOD: Modal 상태 관리
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);

const openModal = (salary: Salary) => {
  setSelectedSalary(salary);
  setIsModalOpen(true);
};

const closeModal = () => {
  setIsModalOpen(false);
  setSelectedSalary(null);
};

return (
  <>
    <Button onClick={() => openModal(salary)}>상세보기</Button>
    
    {isModalOpen && selectedSalary && (
      <SalaryDetailModal
        salary={selectedSalary}
        onClose={closeModal}
      />
    )}
  </>
);
```

---

## 📌 **AI가 코드 작성 시 체크리스트**

### **작업 시작 전**
- [ ] 이 문서(SYSTEM_PROMPT.md) 읽음
- [ ] BUSINESS_LOGIC.md에서 관련 로직 확인
- [ ] FIELD_NAMING_STANDARD.md에서 필드명 확인
- [ ] 기존 코드 패턴 확인

### **코드 작성 중**
- [ ] TypeScript 사용 (JavaScript 금지)
- [ ] 표준 필드명 사용 (`userId`, `storeId`, `clockIn` 등)
- [ ] `COLLECTIONS` 상수 사용
- [ ] Tailwind CSS 클래스 순서 준수
- [ ] Shadcn/UI 컴포넌트 사용
- [ ] try-catch 에러 핸들링
- [ ] companyId 필터 추가
- [ ] 민감한 로그 제거

### **작업 완료 후**
- [ ] 타입 에러 없음
- [ ] 빌드 성공 (`npm run build`)
- [ ] 문서 업데이트 (로직 변경 시)
- [ ] Git 커밋 및 푸시

---

## 🔗 **관련 문서**

- [README.md](./README.md) - 프로젝트 개요
- [STRUCTURE.md](./STRUCTURE.md) - 사용자 계층 구조
- [FIRESTORE_COLLECTIONS.md](./FIRESTORE_COLLECTIONS.md) - 컬렉션 명세
- [FIELD_NAMING_STANDARD.md](./FIELD_NAMING_STANDARD.md) - 필드 명명 규칙
- [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) - 비즈니스 로직 알고리즘
- [SECURITY.md](./SECURITY.md) - 보안 가이드

---

**마지막 업데이트**: 2025-12-26  
**버전**: v1.0.0  
**작성자**: Claude Code Assistant (사장님과 함께)

---

## 📋 **Quick Reference**

### **자주 사용하는 Import**

```typescript
// Firebase Client SDK
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// Firebase Admin SDK (API Route only)
import { adminDb, adminAuth } from '@/lib/firebase-admin';

// Constants
import { COLLECTIONS } from '@/lib/constants';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import { Save, Trash2, Edit, Plus } from 'lucide-react';

// Hooks
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
```

### **자주 사용하는 패턴**

```typescript
// 1. Firestore 쿼리
const usersQuery = query(
  collection(db, COLLECTIONS.USERS),
  where('companyId', '==', companyId),
  where('status', '==', 'active')
);
const snapshot = await getDocs(usersQuery);

// 2. 문서 추가
await addDoc(collection(db, COLLECTIONS.USERS), {
  name: 'John Doe',
  companyId: companyId,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

// 3. 문서 수정
await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
  name: 'Updated Name',
  updatedAt: serverTimestamp()
});

// 4. 문서 삭제
await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
```

---

**이 문서를 준수하여 일관된 코드를 작성하세요!** 🚀
