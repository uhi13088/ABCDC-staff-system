# 🚀 Phase 1 — 멀티테넌트 안정화 & 내부 베타 완성

**목표**: "맛남살롱/ABCDC 여러 매장"에서 문제 없이 돌고, 회사 단위 격리·권한·초대 플로우가 안정적으로 작동하는 상태

**기간**: 2025-01-16 ~ (예상 1주)  
**상태**: 🚧 진행 중

---

## 📊 이미 완료된 것들 (v3.1.7 기준)

### ✅ 멀티테넌트 기반 구조
- ✅ Company → Store 2단계 계층 구조
- ✅ companyId 기반 데이터 격리
- ✅ Firestore Rules v3.1.7 (순환참조 제거, list/get 분리)
- ✅ 전역 companyId 관리 (`myCompanyId`)
- ✅ 15개 이상 쿼리에 companyId 필터 추가

### ✅ 인증 및 권한
- ✅ Firebase Auth 초기화 타이밍 수정 (onAuthStateChanged)
- ✅ RBAC 구조 (super_admin → admin → manager → store_manager → staff)
- ✅ 초대코드 시스템 (1:1 매핑)

### ✅ 문서 정리
- ✅ 핵심 문서 5개로 정리
- ✅ PROJECT_STATUS.md 생성
- ✅ MULTITENANT_DESIGN_V3.md 완성

---

## 🎯 Phase 1 작업 목록

### 1-1. 남은 권한/쿼리 이슈 전부 잡기 ⚠️

**목표**: 모든 화면에서 실제 CRUD 작업 시 권한 오류 제로

**작업**:
- [ ] **직원 관리**
  - [ ] 직원 목록 조회 (빈 컬렉션 포함)
  - [ ] 직원 등록
  - [ ] 직원 수정
  - [ ] 직원 삭제
  - [ ] 직원 검색/필터링

- [ ] **출퇴근 관리**
  - [ ] 출퇴근 기록 조회
  - [ ] 출퇴근 기록 추가
  - [ ] 출퇴근 기록 수정
  - [ ] 출퇴근 기록 삭제

- [ ] **승인 관리**
  - [ ] approvals 조회 (구매/폐기/퇴직서)
  - [ ] approvals 승인/거부
  - [ ] shift_requests 조회 (교대근무)
  - [ ] shift_requests 승인/거부

- [ ] **매장 관리**
  - [ ] stores 조회
  - [ ] stores 생성 (companyId 자동 추가 확인)
  - [ ] stores 수정
  - [ ] stores 삭제

- [ ] **급여 관리**
  - [ ] salaries 조회
  - [ ] 급여 계산
  - [ ] 급여 PDF 생성

- [ ] **계약서 관리**
  - [ ] contracts 조회
  - [ ] contracts 생성
  - [ ] contracts 서명

- [ ] **공지사항**
  - [ ] notices 조회
  - [ ] notices 생성
  - [ ] notices 수정
  - [ ] notices 삭제

- [ ] **스케줄 관리**
  - [ ] schedules 조회
  - [ ] schedules 생성
  - [ ] schedules 수정
  - [ ] schedules 삭제

**원칙**:
```javascript
// ✅ 모든 쿼리는 companyId 필터 필수
const query = db.collection('컬렉션명')
  .where('companyId', '==', myCompanyId);

// ✅ 새로운 문서 생성 시 companyId 포함
const newDoc = {
  companyId: myCompanyId,
  // ... 기타 필드
};
```

**Rules 원칙**:
```javascript
// allow list: 쿼리 조회 (빈 컬렉션 허용)
allow list: if isSignedIn() && hasCompanyRole();

// allow get: 개별 문서 읽기 (resource 체크)
allow get: if isSignedIn() && isSameCompany();

// allow create/update: 문서 생성/수정
allow create: if isSignedIn() && requestHasCompanyId();
allow update: if isSignedIn() && isSameCompany();
```

**발견된 권한 오류 기록 형식**:
```
- 위치: [파일명] line [번호]
- 작업: [조회/생성/수정/삭제]
- 오류: [권한 오류 메시지]
- 원인: [companyId 필터 누락 / Rules 문제 / 기타]
- 해결: [수정 내용]
```

---

### 1-2. "멀티테넌트 위반 코드" 제거 ⚠️

**목표**: Cloud Functions와 자동화 코드에서 단일 회사 가정 제거

**작업**:
- [ ] **Cloud Functions 전체 점검**
  - [ ] `functions/index.js` 읽기
  - [ ] 모든 Firestore 쓰기 작업에서 companyId/storeId 포함 확인
  - [ ] 특정 회사만 대상으로 하는 로직 발견 시 멀티테넌트 대응

**점검 대상 Functions**:
```
✅ verifyInviteCode - 초대코드 검증
✅ recordInviteUse - 초대코드 사용 기록
⚠️ createAbsentRecords - 자동 결근 생성
   → 모든 회사의 직원을 순회하는지 확인
   → 새로 생성하는 absent 문서에 companyId 포함 확인
⚠️ deleteUser - Auth 계정 삭제
   → 특별한 문제 없을 것으로 예상
```

**자동화 코드 점검**:
- [ ] `createAbsentRecords` Cloud Function
  - [ ] 모든 회사 직원 순회 확인
  - [ ] absent 문서에 companyId, storeId 포함 확인
  - [ ] 특정 회사만 실행되지 않도록 확인

**수정 원칙**:
```javascript
// ❌ 위험: 모든 회사 데이터 조회 후 필터 없이 처리
const allUsers = await db.collection('users').get();

// ✅ 안전: 회사별로 명확히 구분
const companies = await db.collection('companies').get();
for (const company of companies.docs) {
  const companyId = company.id;
  const users = await db.collection('users')
    .where('companyId', '==', companyId)
    .get();
  
  // 각 회사별로 처리
}
```

---

### 1-3. "새 회사 1개 생성" 자동 스크립트 고정 ⚠️

**목표**: 새 테넌트(회사) 추가를 "스크립트 1번 호출"로 완성

**현재 상황**:
- PROJECT_STATUS.md에 "초기 데이터 생성 스크립트 작성" 완료로 기록됨
- 실제 스크립트 위치 확인 필요

**작업**:
- [ ] **기존 스크립트 확인**
  - [ ] 스크립트 파일 위치 찾기
  - [ ] 현재 코드 검토

- [ ] **스크립트 완성**
  - [ ] 입력 파라미터 정의
    ```javascript
    {
      companyId: "company_abc123",
      companyName: "새로운 회사",
      ownerName: "대표자명",
      ownerEmail: "owner@example.com",
      stores: [
        {
          storeId: "store_1",
          storeName: "본점",
          address: "서울시 강남구...",
          phone: "02-1234-5678"
        }
      ]
    }
    ```
  
  - [ ] 실행 내용
    1. `companies/{companyId}` 문서 생성
    2. `stores/{storeId}` 1~N개 생성 (companyId 포함)
    3. `company_invites` 기본 초대코드 2개 생성
       - staff용: `STAFF-{random}`
       - manager용: `MANAGER-{random}`
    4. super_admin 계정 생성 (선택사항)

- [ ] **실행 방법 선택**
  - 1단계: Node.js CLI 스크립트 (권장)
    ```bash
    cd functions
    node scripts/create-company.js --config=new-company.json
    ```
  
  - 2단계 (선택): Cloud Functions httpsCallable
    ```javascript
    const createCompany = functions.https.onCall(async (data, context) => {
      // super_admin만 실행 가능
      if (!isSuperAdmin(context.auth.uid)) {
        throw new functions.https.HttpsError('permission-denied');
      }
      
      // 회사 생성 로직
    });
    ```

- [ ] **테스트**
  - [ ] 새 회사 1개 생성 테스트
  - [ ] Firebase Console에서 생성된 문서 확인
  - [ ] 초대코드로 회원가입 테스트

**완성 기준**:
- 새 테넌트 추가가 "스크립트 1번 호출"로 완료
- 나중에 Onboarding UI로 승격 가능한 구조

---

### 1-4. 내부 베타 테스트 체크리스트 완료 ⚠️

**목표**: 모든 주요 기능이 멀티테넌트 환경에서 정상 작동

**테스트 환경**:
- 회사 1: ABCDC (기존)
- 회사 2: 새로운 테스트 회사 (1-3에서 생성)

**체크리스트**:

#### 🔐 인증 및 권한
- [ ] 로그인 (관리자)
- [ ] 로그인 (직원)
- [ ] 회사 정보 자동 로드 (companyId)
- [ ] 다른 회사 데이터 조회 불가 확인

#### 📊 대시보드
- [ ] 통계 정보 표시
  - [ ] 직원 수
  - [ ] 오늘 출근자 수
  - [ ] 대기 중인 승인
- [ ] 차트 렌더링
- [ ] 최근 활동 로그

#### 👥 직원 관리
- [ ] 직원 목록 조회 (페이징)
- [ ] 직원 등록
  - [ ] companyId 자동 포함 확인
  - [ ] storeId 선택
- [ ] 직원 수정
- [ ] 직원 삭제
- [ ] 직원 검색

#### ⏰ 출퇴근 관리
- [ ] 출퇴근 기록 조회
- [ ] 출퇴근 기록 추가
- [ ] 출퇴근 기록 수정
- [ ] 출퇴근 통계

#### ✅ 승인 관리
- [ ] 구매 요청 조회
- [ ] 구매 요청 승인/거부
- [ ] 폐기 요청 조회
- [ ] 폐기 요청 승인/거부
- [ ] 퇴직서 요청 조회
- [ ] 퇴직서 요청 승인/거부

#### 🔄 교대근무
- [ ] 교대근무 요청 조회
- [ ] 교대근무 승인
- [ ] 교대근무 거부
- [ ] 대타 매칭 확인

#### 💰 급여 관리
- [ ] 급여 목록 조회
- [ ] 급여 자동 계산
  - [ ] 시급제
  - [ ] 월급제
  - [ ] 연봉제
- [ ] 주휴수당 계산
- [ ] 4대보험 공제
- [ ] 급여 PDF 생성

#### 📝 계약서 관리
- [ ] 계약서 목록 조회
- [ ] 계약서 생성
  - [ ] companyId 자동 포함 확인
  - [ ] employeeId 연결 확인
- [ ] 계약서 상세보기
- [ ] 계약서 서명 링크 생성

#### 📢 공지사항
- [ ] 공지사항 목록 조회
- [ ] 공지사항 작성
- [ ] 공지사항 수정
- [ ] 공지사항 삭제

#### 🏪 매장 관리
- [ ] 매장 목록 조회
- [ ] 매장 생성
  - [ ] companyId 자동 포함 확인
- [ ] 매장 수정
- [ ] 매장 삭제

#### 📅 스케줄 관리
- [ ] 스케줄 조회 (주간/월간)
- [ ] 스케줄 생성
- [ ] 스케줄 수정
- [ ] 스케줄 삭제
- [ ] 계약서 기반 자동 스케줄 생성

#### 🔄 자동화
- [ ] 자동 결근 생성 (Cloud Function)
- [ ] 초대코드 검증 (Cloud Function)
- [ ] Firebase Auth 계정 자동 삭제 (Cloud Function)

---

## 📝 발견된 이슈 트래킹

### 이슈 템플릿
```
### 이슈 #1: [간단한 설명]
- **날짜**: 2025-01-16
- **위치**: [파일명] line [번호]
- **재현 방법**: 
  1. 
  2. 
- **오류 메시지**: 
- **원인**: 
- **해결 방법**: 
- **상태**: [ ] 대기 / [ ] 진행 중 / [x] 완료
```

---

## ✅ Phase 1 완료 기준

### 필수 조건 (모두 충족 필요)
- [ ] 모든 CRUD 작업에서 권한 오류 제로
- [ ] Cloud Functions가 멀티테넌트 대응 완료
- [ ] 새 회사 생성 스크립트 완성 및 테스트
- [ ] 내부 베타 체크리스트 95% 이상 통과
- [ ] 2개 이상 회사에서 정상 작동 확인

### 선택 조건 (가능하면 완료)
- [ ] Firestore 복합 인덱스 모두 생성
- [ ] 성능 최적화 (쿼리 캐싱 등)
- [ ] 에러 로깅 체계 구축

---

## 🎯 다음 단계: Phase 2 Preview

Phase 1 완료 후 진행:
- **Phase 2**: 테넌트 온보딩 & 관리자 경험 정리
  - 회사 가입 UI
  - 초대코드 관리 UI
  - 매장 설정 UI
  - 관리자 온보딩 플로우

---

**마지막 업데이트**: 2025-01-16  
**담당**: 사장님 + AI Assistant  
**예상 완료**: 2025-01-23
