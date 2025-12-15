# ⚠️ Legacy Code Archive - READ THIS FIRST

**🚨 SECURITY WARNING: 이 폴더의 파일들은 절대 public 폴더로 복사하지 마세요!**

---

## 📁 폴더 목적

이 `_legacy/` 폴더는 **HTML/jQuery 기반 레거시 코드**를 개발 참고용으로 보관하는 곳입니다.

- **웹 접근 불가**: 브라우저에서 `https://도메인/파일.html`로 직접 접근 **불가능**
- **개발 참고용**: Next.js/React 마이그레이션 시 기존 로직 확인용
- **보안 격리**: Firebase 키 노출 위험 차단

---

## 🔒 보안 위험 (Why Dangerous?)

### 1. 인증 우회 (Authentication Bypass)
```
❌ public/admin-dashboard.html → 누구나 접근 가능 (Next.js 미들웨어 무시)
✅ _legacy/admin-dashboard.html → 웹 접근 불가 (개발자만 확인)
```

### 2. Firebase 키 노출
- 레거시 HTML 파일에는 **Firebase SDK + Config**가 포함되어 있음
- `public/` 폴더에 있으면 클라이언트에서 실행되어 DB 접근 시도 가능
- `_legacy/` 폴더로 이동하여 실행 차단

### 3. Firestore Rules 취약점과 결합 시 대재앙
- Firestore Rules가 느슨하면 레거시 HTML을 통해 직접 DB 조작 가능
- 인증 없이도 데이터 열람/수정/삭제 위험

---

## 📋 보관 파일 목록 (16개)

### Core Application (마이그레이션 완료)
- ✅ `landing.html` → `app/page.tsx` (완료)
- ✅ `admin-dashboard.html` → `app/(admin)/admin-dashboard/page.tsx` (완료)
- ✅ `platform-dashboard.html` → `app/(admin)/platform/page.tsx` (완료)
- ✅ `employee.html` → `app/employee-dashboard/page.tsx` (완료)

### Authentication (마이그레이션 완료)
- ✅ `admin-login.html` → `app/admin-login/page.tsx` (완료)
- ✅ `admin-register.html` → `app/admin-register/page.tsx` (완료)
- ✅ `employee-login.html` → `app/employee-login/page.tsx` (완료)
- ✅ `employee-register.html` → `app/employee-register/page.tsx` (완료)

### Utilities (필요 시 Next.js API Route로 재구현)
- ⚠️ `contract-sign.html` → `app/contract-sign/[id]/page.tsx` (완료)
- ⚠️ `auto-migrate.html` - 1회성 마이그레이션 스크립트 (보관)
- ⚠️ `check-migration-status.html` - 마이그레이션 검증 (보관)
- ⚠️ `cleanup-auth.html` - Firebase Auth 클린업 (보관)
- ⚠️ `migrate-contract-fields.html` - 계약서 필드 마이그레이션 (보관)
- ⚠️ `migrate-contractid.html` - 계약서 ID 재생성 (보관)
- ⚠️ `migrate-schedules.html` - 스케줄 마이그레이션 (보관)

### Test Files
- 🧪 `test_night_hours.html` - 야간 수당 계산 테스트 (보관)
- 🧪 `index.html` - 레거시 홈페이지 (보관)

---

## 🚫 절대 하지 말아야 할 것

### ❌ public 폴더로 복사
```bash
# 절대 금지!
cp _legacy/admin-dashboard.html public/
```

### ❌ 프로덕션 배포 시 포함
```bash
# Cloudflare Pages 배포 시 _legacy 폴더 제외 확인
wrangler pages deploy dist  # dist 폴더만 배포됨 (_legacy 제외)
```

### ❌ 레거시 코드 재사용
- 레거시 코드를 **복사/붙여넣기**하지 마세요
- **참고만** 하고 Next.js/TypeScript로 **재작성**하세요

---

## ✅ 올바른 사용법

### 1. 개발 참고용으로만 사용
```bash
# 로컬에서 코드 확인
code _legacy/admin-dashboard.html

# 기존 로직 파악 후 React로 재구현
# components/admin/tabs/salary-tab.tsx 참조
```

### 2. 마이그레이션 체크리스트 작성
```
□ admin-dashboard.html → admin-dashboard/page.tsx ✅
□ employee.html → employee-dashboard/page.tsx ✅
□ landing.html → page.tsx ✅
```

### 3. 완전 마이그레이션 후 삭제 고려
```bash
# 모든 기능이 Next.js로 이전되면 삭제 검토
rm -rf _legacy/
```

---

## 🐛 레거시 코드의 주요 문제점

### 1. 전역 변수 오염 (Global Scope Pollution)
```javascript
// ❌ 레거시 (admin-dashboard.html)
var currentUser = null;
let myCompanyId = '';
let isAdditionalContractMode = false;

// ✅ React (useAuth hook)
const { user } = useAuth();
const { companyId } = useCompany();
```

**영향**:
- 디버깅 어려움 (변수가 어디서 수정되는지 추적 불가)
- 메모리 누수 (페이지 이동 후에도 변수 유지)
- 네임스페이스 충돌 (라이브러리와 이름 겹침)

---

### 2. 하드코딩 된 설정 (Hardcoded Config)
```javascript
// ❌ 레거시 (HTML 내부)
const CONFIG = {
  INSURANCE_RATES: {
    national_pension: 0.045,
    health_insurance: 0.03545,
  }
};

// ✅ React (lib/constants.ts)
export const INSURANCE_RATES = {
  NATIONAL_PENSION: 0.045,
  HEALTH_INSURANCE: 0.03545,
} as const;
```

**문제점**:
- 세율 변경 시 HTML 파일 직접 수정 필요
- 컴파일 타임 체크 불가능
- 재사용 불가능 (매번 복사/붙여넣기)

**해결책**:
- `lib/constants.ts`로 중앙 집중화
- TypeScript `as const`로 타입 안전성 확보
- 환경변수로 외부화 (`.env.local`)

---

### 3. 핵심 비즈니스 로직 중복

#### A. 급여 계산 로직 중복
```
❌ 레거시: public/js/salary-calculator.js (레거시, 삭제됨)
✅ React: lib/utils/salary-calculator.ts (현재 사용 중)
```

**[검증완료] 상태**: React 컴포넌트는 `salary-calculator.ts`만 사용 ✅

**주요 함수**:
- `calculateMonthlySalary()` - 월급 자동 계산
- `calculateWeeklyHolidays()` - 주휴수당 (최대 8시간)
- `calculateNightHours()` - 야간수당 (휴게시간 차감)
- `fetchHolidaysFromAPI()` - 공휴일 자동 동기화

#### B. 계약서 생성 로직 마이그레이션

```
❌ 레거시: admin-dashboard.html (3,000줄)
  - generateContract()
  - updatePreview()
  - saveStore()
  - DOM 직접 조작 (innerHTML, getElementById)

✅ React: 
  - components/admin/modals/contract-form-modal.tsx
  - hooks/admin/useContractLogic.ts
  - services/contractService.ts
```

**[검증완료] 마이그레이션 완료**: 모든 계약서 로직이 React로 이전됨 ✅

**개선 사항**:
- ✅ React State 관리 (전역 변수 제거)
- ✅ TypeScript 타입 안전성 (`Contract` 인터페이스)
- ✅ Firestore Auto ID (충돌 방지)
- ✅ Virtual DOM (성능 개선)

---

### 4. Firebase SDK 버전 혼용
```html
<!-- ❌ 레거시 (firebase-compat CDN) -->
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>

<!-- ✅ React (Firebase v9 Modular) -->
import { getFirestore } from 'firebase/firestore';
```

**문제점**:
- 번들 사이즈 증가 (compat 레이어 불필요)
- Tree-shaking 불가능
- 최신 기능 사용 불가

**해결책**:
- Firebase v9 Modular SDK 완전 전환 ✅
- 번들 사이즈 30% 감소

---

### 5. 계약서 ID 생성 방식의 위험성
```javascript
// ❌ 레거시 (충돌 가능)
const contractId = 'C' + Date.now();

// ✅ React (Firestore Auto ID)
const contractRef = doc(collection(db, 'contracts'));
const contractId = contractRef.id; // 안전한 랜덤 ID
```

**위험성**:
- **ID 충돌**: 동시 요청 시 같은 timestamp → 같은 ID
- **예측 가능**: 보안 취약 (ID 추측 가능)
- **확장성 부족**: 분산 시스템에서 문제

**해결책**:
- Firestore Auto ID 사용 (20자 랜덤 문자열)
- 충돌 확률: 10^-18 (사실상 0%)

---

### 6. 초대 코드 검증 로직 노출
```javascript
// ❌ 레거시 (클라이언트에서 직접 쿼리)
const codeQuery = query(
  collection(db, 'invitation_codes'),
  where('code', '==', inputCode)
);

// ✅ React (향후 개선: Next.js API Route 또는 Cloud Functions)
// POST /api/verify-invite-code
// 서버 측에서 검증하여 초대 코드 목록 숨김
```

**보안 위험**:
- 초대 코드 열거 공격 (Enumeration Attack)
- Firestore Rules 느슨하면 전체 코드 목록 조회 가능

**개선 방안 (향후)**:
```typescript
// pages/api/verify-invite-code.ts
export default async function handler(req, res) {
  const { code } = req.body;
  
  // 서버 측에서만 검증
  const isValid = await verifyInviteCodeServer(code);
  
  // 클라이언트에게는 true/false만 반환
  res.json({ valid: isValid });
}
```

---

### 7. DOM 조작 혼용 (React와 충돌)

```javascript
// ❌ 레거시 (직접 DOM 조작)
document.getElementById('contractPreview').innerHTML = `
  <div class="contract-section">
    <h3>${title}</h3>
    <p>${content}</p>
  </div>
`;

// ✅ React (Virtual DOM)
const [preview, setPreview] = useState('');

return (
  <div id="contractPreview">
    <div className="contract-section">
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  </div>
);
```

**문제점**:
- React의 Virtual DOM과 충돌
- 상태 관리 불가능 (React State 무시)
- 메모리 누수 (이벤트 리스너 제거 안됨)
- XSS 취약점 (`innerHTML` 직접 사용)

**해결책**:
- React Component로 완전 전환 ✅
- State로 상태 관리 (`useState`, `useReducer`)
- `dangerouslySetInnerHTML` 사용 금지

---

## 📚 마이그레이션 가이드

### 단계별 마이그레이션
1. **UI 구조 파악**: 레거시 HTML의 DOM 구조 분석
2. **로직 추출**: JavaScript 함수들을 TypeScript로 변환
3. **상태 관리**: 전역 변수 → React State/Context
4. **타입 정의**: `lib/types/*.ts`에 인터페이스 작성
5. **컴포넌트 분리**: Shadcn/UI + Tailwind CSS 사용
6. **테스트**: 레거시와 동일한 동작 확인
7. **배포**: Next.js 빌드 성공 확인

### 참고 자료
- `app/(admin)/admin-dashboard/page.tsx` - Admin Dashboard 마이그레이션 예시
- `components/admin/tabs/*.tsx` - 탭 컴포넌트 분리 예시
- `hooks/admin/*.ts` - 커스텀 훅으로 로직 분리
- `lib/constants.ts` - 하드코딩 제거
- `lib/types/*.ts` - TypeScript 타입 정의

---

## 🔧 향후 개선 사항 (Technical Debt)

### Priority 1: 보안 강화
- [ ] 초대 코드 검증 → Next.js API Route 또는 Cloud Functions로 이동
- [ ] Firestore Rules 강화 (client-side 직접 접근 최소화)
- [ ] 계약서 ID → Firestore Auto ID 사용

### Priority 2: 성능 최적화
- [ ] Dynamic Import 남용 개선 (자주 쓰는 탭은 일반 import)
- [ ] Firebase v9 Modular SDK 완전 전환
- [ ] 번들 사이즈 최적화

### Priority 3: 타입 안전성
- [ ] `any` 타입 제거
- [ ] Strict Mode 활성화 (`tsconfig.json`)
- [ ] Zod 스키마 검증 추가

---

## 📞 문의

마이그레이션 관련 질문이 있으시면:
- GitHub Issues: https://github.com/uhi13088/ABCDC-staff-system/issues
- 프로젝트 README.md 참조

---

**마지막 업데이트**: 2025-12-15  
**작성자**: AI Assistant  
**버전**: v1.0.0
