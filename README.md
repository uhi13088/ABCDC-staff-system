# 맛남살롱 통합 관리 시스템

**멀티테넌트 SaaS 직원 관리 시스템** - Firebase 기반

## ⚡ 최신 업데이트 (2025-01-16)

**🎉 Phase 1 - 멀티테넌트 안정화 완료! (95%)**
- ✅ **전체 쿼리 멀티테넌트 수정 완료**: 56개 쿼리 수정
  - admin-dashboard.html: 26개
  - js/employee.js: 19개
  - 기타 JS 파일: 7개
  - Cloud Functions: 4개
- ✅ **급여 탭 멀티테넌트 정리**: 매장 필터 추가, 실시간 계산 유지
- ✅ **Cloud Functions 수정**: 결근 생성 시 companyId/storeId 자동 추가
- ✅ **회사 생성 스크립트**: `scripts/create-company.js` 개발 완료
- ✅ **데이터 격리 원칙 확립**: Company-level vs Store-level 컬렉션 분류
- ⏳ **남은 작업**: Functions 배포 + 회사 2호 생성 + 베타 테스트 (40분)

**🎉 멀티테넌트 전환 완료 - v3.1.3**
- ✅ **완전한 멀티테넌트 구조**: Company (회사) → Store (지점) 2단계 계층
- ✅ **초대코드 시스템**: 1:1 매핑 (코드당 회사/지점/역할 지정)
- ✅ **데이터 격리**: 모든 컬렉션 `companyId` 기반 접근 제어
- ✅ **순환참조 제거**: Firestore Rules v3.1.3 최적화
- ✅ **민감 필드 보호**: companyId, role, storeId 직원 본인 수정 불가
- ✅ **기존 데이터 초기화**: 101개 문서 삭제 후 새로 시작

**📚 핵심 문서** (5개):
- [프로젝트 현황](PROJECT_STATUS.md) - 전체 진행 상황 요약 ⭐
- [현재 작업 상황](WORK_IN_PROGRESS.md) - v3.1.7 작업 진행 중
- [배포 가이드](DEPLOYMENT_GUIDE.md) - Firebase 배포 절차
- [멀티테넌트 설계](MULTITENANT_DESIGN_V3.md) - 상세 시스템 아키텍처
- [아카이브 문서](docs/archive/) - 참고용 문서 (15개)

## 🚀 주요 기능

### 관리자 페이지
- 👑 관리자/매니저 목록 관리
- 👥 직원 관리 (등록, 조회, 삭제)
- 📋 근무기록 관리
- 💰 급여 관리
- ✔️ 문서 승인 관리 (구매/폐기/퇴직서/교대근무)
- 📝 계약서 관리
- 📢 공지사항 관리
- 🏪 매장 관리

### 직원 포털
- 🟢 출근/퇴근 기록
- 📋 내 근무내역 조회
- 💰 급여 조회
- ✔️ 문서 승인 신청 (구매/폐기/퇴직서)
- 🔄 교대근무 신청 (대타 구함 기능)
- 📝 계약서 확인
- 📢 공지사항 확인

## 🔧 Firebase Authentication 자동 정리

### 자동 삭제 (Cloud Functions)

직원/관리자 삭제 시 Firebase Authentication 계정도 자동으로 삭제됩니다.

#### 설정 방법:

1. **Cloud Functions 배포**
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

2. **작동 확인**
- 관리자 페이지에서 직원 삭제
- Firebase Console에서 Authentication 계정 자동 삭제 확인

### 수동 정리 도구

현재 Firestore에 없는 Authentication 계정을 확인하고 정리:

1. **확인 도구 사용**
   - `cleanup-auth.html` 파일을 브라우저로 열기
   - "정리 필요 계정 확인" 버튼 클릭
   - 현재 등록된 사용자 목록 확인

2. **Firebase Console에서 수동 삭제**
   - [Firebase Authentication Console](https://console.firebase.google.com/project/abcdc-staff-system/authentication/users)
   - 도구에서 확인한 불필요한 계정 삭제

3. **대량 정리 (HTTP 트리거)**
```bash
# Cloud Functions 배포 후 사용 가능
curl -X POST https://us-central1-abcdc-staff-system.cloudfunctions.net/cleanupOrphanedAuth
```

## 📦 배포

### ⚡ **GitHub → Firebase Hosting 자동 배포 (권장)**

**🎯 이 프로젝트는 GitHub Actions를 통한 자동 배포가 설정되어 있습니다.**

```bash
# ✅ GitHub에 푸시하면 자동으로 Firebase Hosting에 배포됩니다
git add .
git commit -m "Update feature"
git push origin main
```

**🚀 자동 배포 프로세스**:
1. ✅ `main` 브랜치에 코드 푸시
2. ✅ GitHub Actions 자동 실행
3. ✅ Firebase Hosting 자동 배포 (GitHub-Firebase 연동)
4. ✅ 배포 완료 (약 2-3분 소요)

**⚠️ 중요: Firebase CLI 로그인 불필요**
- GitHub Actions가 자동으로 Firebase 배포 수행
- 로컬에서 `firebase deploy` 실행 불필요
- **GitHub 푸시만 하면 자동 배포됨**

### 수동 배포 (선택사항)
```bash
# 프로젝트 빌드 및 배포 (Firebase 로그인 필요)
firebase deploy --only hosting

# Cloud Functions도 함께 배포
firebase deploy
```

**배포 URL**: https://abcdc-staff-system.web.app

## 🔐 권한 시스템 (멀티테넌트 RBAC)

| 역할 | 권한 범위 | 주요 권한 |
|------|-----------|-----------|
| **super_admin** | 전체 시스템 | 모든 회사 데이터 접근/수정 (Firebase Custom Claims) |
| **admin** | 회사 전체 | 회사 내 모든 데이터 읽기/쓰기, 직원 role/companyId 수정 가능 |
| **manager** | 회사 전체 (읽기) | 회사 내 모든 데이터 읽기, 부분 쓰기 권한 |
| **store_manager** | 본인 지점만 | 본인 지점 데이터 관리 |
| **staff** | 본인 데이터만 | 자신의 출퇴근/급여/문서신청만 가능 |

**멀티테넌트 격리**:
- 모든 컬렉션에 `companyId` 필수 (Firestore Rules 강제)
- 타 회사 데이터 접근 완전 차단 (super_admin 제외)
- 민감 필드 보호: 직원 본인은 `companyId`, `role`, `storeId` 수정 불가

## 🎫 초대코드 시스템

### 초대코드 구조 (1:1 매핑)
```javascript
{
  code: "ABC2025-STAFF-12345",  // 고유 코드
  companyId: "ABC2025",          // 회사 지정
  storeId: "store001",           // 지점 지정
  role: "staff",                 // 역할 지정 (admin/manager/staff)
  maxUses: 1,                    // 1회용
  currentUses: 0,
  expiresAt: Timestamp,          // 만료일
  isActive: true
}
```

### Cloud Functions
1. **verifyInviteCode**: 초대코드 검증 및 회사/지점 정보 반환
2. **recordInviteUse**: 회원가입 완료 후 사용 횟수 증가
3. **createInviteCode**: 관리자가 초대코드 생성 (향후 구현)

### 회원가입 플로우
```
1. 초대코드 입력 (URL 파라미터 자동 입력 가능)
2. verifyInviteCode 검증
3. 회사/지점 정보 자동 표시
4. 이메일/비밀번호/이름 입력
5. Firebase Auth 계정 생성
6. Firestore users/employees 문서 생성 (companyId, storeId 자동 할당)
7. recordInviteUse 호출 (사용 횟수 증가)
8. 로그인 완료
```

## 📊 데이터 구조 (멀티테넌트)

### Firestore 컬렉션
- `users`: 모든 사용자 (직원, 관리자, 매니저) - **companyId, storeId, role 필수**
- `employees`: 직원 정보 (users의 복사본) - **companyId, storeId 필수**
- `companies`: 회사 정보 - **멀티테넌트 루트**
- `stores`: 지점 정보 - **companyId 필수**
- `company_invites`: 초대코드 - **companyId, storeId, role 지정**
- `attendance`: 출퇴근 기록 - **companyId, storeId 필수**
- `approvals`: 문서 승인 (구매/폐기/퇴직서) - **companyId 필수**
- `shift_requests`: 교대근무 요청 - **companyId 필수**
  - 상태: pending(대기중) → matched(매칭됨) → approved(승인됨)
  - 승인 시 스케줄 자동 변경 (원래 직원 삭제, 대타 직원 추가)
- `schedules`: 근무 스케줄 - **companyId 필수**
  - 교대근무 승인 시 자동 갱신
- `contracts`: 계약서 (100% Firestore) - **companyId 필수**
  - `allowances`: 수당 설정 (주휴수당, 연장근로, 야간근로, 휴일근로)
  - `insurance`: 4대보험 적용 방식 (all/employment_only/freelancer/none)
- `savedContracts`: 임시 저장 계약서 - **companyId 필수**
- `signedContracts`: 서명된 계약서 - **companyId 필수, 본인만 생성 가능**
- `notices`: 공지사항 - **companyId 필수**
- `salaries`: 급여 계산 결과 - **companyId, storeId, employeeId 필수**

### 필수 필드 (모든 컬렉션)
```javascript
{
  companyId: "ABC2025",        // 회사 격리 (필수)
  storeId: "store001",         // 지점 격리 (선택적, 컬렉션에 따라)
  createdAt: Timestamp,
  createdBy: "uid123"
}
```

**⚠️ 중요**: Firestore Rules에서 `companyId` 누락 문서는 접근 거부됨

## 🏗️ 프로젝트 구조 (리팩토링 완료)

### 외부 모듈 분리
코드 가독성과 유지보수성을 위해 CSS와 JavaScript를 외부 파일로 분리했습니다.

#### CSS 모듈
- `css/admin-dashboard.css` (13KB, 709줄)
  - 전체 스타일시트 정의
  - CSS 변수 기반 테마 시스템

#### JavaScript 모듈
- `js/firebase-init.js` (2.1KB, 76줄)
  - Firebase 설정 및 초기화
  - 인증 상태 관리 (auth, db 인스턴스)
  - 전역 상태 변수 (isAuthenticated, currentTab)
  - 로그인/로그아웃 처리

- `js/salary-calculator.js` (12KB, 364줄)
  - 급여 계산 로직 전체
  - 공휴일 관리 (2025년 15개 공휴일)
  - 시급/월급/연봉 계산
  - 휴일근로수당 (1.5배), 퇴직금 자동 계산
  - 주휴수당, 연장근로, 야간근로 계산

### 리팩토링 효과
- **admin-dashboard.html**: 6797줄 → 6299줄 (498줄 감소, 7.3% 축소)
- **파일 크기**: 293KB → 279KB (14KB 감소, 4.8% 축소)
- **모듈화**: CSS 1개 + JS 2개 외부 모듈 생성
- **유지보수**: 기능별 파일 분리로 수정/확장 용이
- **코드 품질**: 핵심 비즈니스 로직(급여 계산) 완전 모듈화

### Firebase Authentication
- 이메일/비밀번호 인증
- users 컬렉션 삭제 시 자동 삭제 (Cloud Functions)

## 💰 급여 계산 로직 (근로기준법 준수)

### 기본 급여
- **시급제**: 시급 × 실제 근무시간 ✅
- **월급제**: 월 급여액 고정 (209시간 기준 시급 환산) ✅
- **연봉제**: 연봉 ÷ 12개월 (209시간 기준 시급 환산) ✅

**💡 209시간 기준이란?**
```
법정 월 소정근로시간 = 209시간

계산식:
- 주 40시간 × 52주 ÷ 12개월 = 173.33시간 (근로시간)
- 주휴 8시간 × 52주 ÷ 12개월 = 34.67시간 (주휴시간)
- 합계: 208시간 (실무에서는 209시간 사용)

용도:
- 월급제 → 시급 환산: 월급 2,500,000원 ÷ 209시간 = 시급 11,962원
- 연봉제 → 시급 환산: 연봉 30,000,000원 ÷ 12개월 ÷ 209시간 = 시급 11,962원
- 연장/야간 수당 계산 시 기준 시급으로 사용
```

### 수당 계산 (계약서 설정에 따라 적용)
- **연장근로수당**: 시급 × 1.5배 × 연장근무시간 (주 40시간 초과분) ✅
- **야간근로수당**: 시급 × 0.5배 × 야간근무시간 (22:00~06:00, 자동 판별) ✅
- **휴일근로수당**: 시급 × 1.5배 × 휴일근무시간 (공휴일 자동 판별) ✅

### 주휴수당 (주 15시간 이상 근무자만)
```
주휴수당 = (주 소정근로시간 / 40시간) × 8시간 × 시급

예시:
- 주 15시간 근무: 15/40 × 8 = 3시간분
- 주 20시간 근무: 20/40 × 8 = 4시간분  
- 주 40시간 근무: 40/40 × 8 = 8시간분 (만근)
```

### 4대보험 공제
- **전체 적용**: 국민연금 4.5% + 건강보험 3.545% + 장기요양 0.459% + 고용보험 0.9% + 소득세 3.3%
- **고용·산재만**: 고용보험 0.9% + 산재보험(사업주 부담) + 소득세 3.3%
- **프리랜서**: 소득세 3.3%만
- **완전 면제**: 공제 없음

### 퇴직금 (1년 이상 근속, 주 15시간 이상 근무자) ✅
```
퇴직금 = (최근 3개월 평균 급여) × (근속일수 / 365) × 30일

자동 계산 조건:
- 근속일수 365일 이상
- 주 평균 근무시간 15시간 이상
- 계약 시작일 기준 자동 계산
```

### 급여명세서 PDF 다운로드 ✅
- html2pdf.js 라이브러리 활용
- 급여 상세내역 PDF 자동 생성
- 직원명, 급여월, 지급/공제 항목 상세 표시
- "📄 PDF 다운로드" 버튼으로 즉시 다운로드

## 📊 급여 관리 워크플로우

### 1단계: 계약서 작성
- 매장 선택 시 해당 매장의 수당 설정 자동 적용
- 지급 항목 선택 (주휴수당, 연장근로, 야간근로, 휴일근로)
- 4대보험 적용 방식 선택
- 계약서 생성 및 Firestore 저장

### 2단계: 출퇴근 기록
- 직원이 출퇴근 체크
- attendance 컬렉션에 자동 저장
- 근무시간, 야간시간 자동 계산

### 3단계: 급여 조회 (관리자)
- 💰 급여 관리 탭 접속
- 월 선택 후 "조회" 버튼 클릭
- 시스템이 자동으로:
  - 모든 직원의 출퇴근 기록 수집
  - 계약서 기반 급여 자동 계산
  - 수당 및 공제 자동 계산
  - 실지급액 계산 및 표시

### 4단계: 급여 확정
- "상세" 버튼 클릭하여 급여 상세 내역 확인
- 지급 항목별, 공제 항목별 상세 금액 확인
- "✅ 급여 확정" 버튼 클릭
- salaries 컬렉션에 저장
- 상태: "확정됨" 표시

### 5단계: 지급 완료 처리
- 실제 급여 지급 후 "지급완료" 버튼 클릭
- paidAt, paidBy 자동 기록
- 상태: "지급완료" 표시

### 상태 관리
- 🟡 **미확정**: 계산만 완료, 아직 확정되지 않음
- 🔵 **확정됨**: 급여 확정, Firestore 저장 완료
- 🟢 **지급완료**: 실제 지급 완료

## 🛠️ 기술 스택

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **Deployment**: Firebase Hosting
- **Version Control**: Git, GitHub
- **Real-time**: Firestore onSnapshot (실시간 알림)

## 🚀 배포 절차 (멀티테넌트)

### 1단계: Firestore Security Rules 배포

**Firebase Console 방법**:
1. Firebase Console → Firestore Database → Rules 탭
2. `/home/user/webapp/firestore.rules` 전체 복사
3. Rules 편집기에 붙여넣기 후 "게시" 클릭

**Firebase CLI 방법**:
```bash
cd /home/user/webapp
firebase deploy --only firestore:rules
```

### 2단계: 초기 데이터 생성

**자동 생성 스크립트 실행**:
```bash
node create-initial-data.js
```

생성되는 데이터:
- 회사 1개 (ABC Dessert Center)
- 지점 3개 (부천시청점, 상동점, 부천역사점)
- 초대코드 6개 (admin 1개, manager 2개, staff 3개)

**수동 생성 (Firebase Console)**:
1. `companies` 컬렉션에 회사 문서 생성
2. `stores` 컬렉션에 지점 문서 생성 (companyId 포함)
3. `company_invites` 컬렉션에 초대코드 생성

### 3단계: 테스트 계정 생성

1. **Admin 계정 생성**:
   ```
   https://your-domain.com/employee-register.html?code=ABC2025-ADMIN-12345
   ```
   - 초대코드로 회원가입
   - 자동으로 companyId, storeId, role 할당됨

2. **권한 테스트**:
   - 본인 정보 수정 → 성공
   - role/companyId 수정 시도 → 실패 (PERMISSION_DENIED)
   - 타 직원 정보 읽기 → 성공 (admin)
   - 타 회사 데이터 접근 → 실패 (격리됨)

### 4단계: Cloud Functions 배포 (선택)

```bash
firebase deploy --only functions
```

배포되는 함수:
- `verifyInviteCode`: 초대코드 검증
- `recordInviteUse`: 사용 횟수 기록
- `createAbsentRecords`: 자동 결근 생성 (매일 자정)
- `deleteUser`: 직원 삭제 시 Auth 계정 자동 삭제

### 5단계: Hosting 배포

```bash
firebase deploy --only hosting
```

또는 **GitHub Actions 자동 배포**:
```bash
git add .
git commit -m "Multi-tenant system v3.1.3"
git push origin main
```

**배포 URL**: https://abcdc-staff-system.web.app

---

## 📝 주요 업데이트

### 최신 업데이트 (2025-01-16) - 멀티테넌트 전환

**🎉 Firestore Rules v3.1.3 (순환참조 제거)**
- ✅ `/users`, `/employees` 컬렉션 순환참조 완전 제거
- ✅ Helper 함수 최적화 (get() 호출 1-2회로 감소)
- ✅ 민감 필드 보호 유지 (companyId, role, storeId, status)
- ✅ `isCompanyAdmin()`, `isCompanyAdminOrManager()` 최적화 함수 추가

**🗑️ 기존 데이터 초기화**
- ✅ 101개 문서 삭제 (19개 컬렉션)
- ✅ 새로운 멀티테넌트 구조로 재시작
- ✅ 초기 데이터 생성 스크립트 작성 (`create-initial-data.js`)

**📚 문서화 완료**
- ✅ [Firestore Rules v3.1.3 변경사항](firestore-rules-v3.1.3-changes.md)
- ✅ [배포 가이드](DEPLOYMENT_GUIDE.md) - 상세 배포 절차
- ✅ 테스트 체크리스트 작성

**🔐 보안 강화**
- ✅ 순환참조 제거: `/users`에서 자기 자신 접근 시 `currentUser()` 사용 금지
- ✅ 민감 필드 보호: 직원 본인은 companyId, role, storeId 수정 불가
- ✅ 멀티테넌트 격리: 타 회사 데이터 완전 차단
- ✅ 역할 기반 권한: super_admin → admin → manager → store_manager → staff

### 이전 업데이트 (2025-11-15)

**🔧 스케줄 데이터 로딩 리팩토링 완료 🎉**
- ✅ **schedule-viewer.js 공통 데이터 로딩 함수 추가**: 관리자/직원 페이지 통합
  - `window.loadScheduleData()`: 스케줄 데이터 로딩 통합 함수
  - `loadStoreSchedules()`: 매장 전체 스케줄 로딩
  - `loadEmployeeSchedules()`: 개인/매장 전체 스케줄 로딩
  - `loadEmployeeSchedulesForWeek()`: 주간 스케줄 가공 (중복 제거)
  - `getContractCached()`: 계약서 캐싱 (5분 TTL)
- ✅ **admin-dashboard.html 리팩토링**: `loadScheduleDataWrapper()` 사용
  - 기존 `loadScheduleData()` → `loadScheduleData_OLD()` 백업
  - 337줄 → 47줄로 축소 (86% 코드 감소)
- ✅ **employee.js 리팩토링**: 공통 모듈 사용
  - 기존 `loadEmployeeSchedule()` → `loadEmployeeSchedule_OLD()` 백업
  - 297줄 중복 코드 제거
- ✅ **계약서 캐싱 시스템**: Firestore 읽기 최적화 (5분 캐시)
- ✅ **최신 계약서 기준 필터링**: 중복 스케줄 자동 제거
- ✅ **breakTime 지원**: 휴게시간 투명 막대 표시 및 실근무시간 계산

**🐛 버그 수정**
- ✅ 재귀 호출 버그 수정: 함수명 충돌 (`loadScheduleDataWrapper` 변경)
- ✅ `undefined` 반환 문제 해결
- ✅ 스케줄 필터링 로직 검증 완료

**📊 휴게시간(breakTime) 표시 시스템 🎉**
- ✅ **breakTime 객체 저장**: `{start, end, minutes}` 구조로 Firestore 저장
- ✅ **투명 막대 표시**: 간트차트에서 휴게시간을 투명 막대로 시각화
- ✅ **실근무시간 계산**: 총 근무시간 - 휴게시간 = 실근무시간
- ✅ **주간 요약 정확도**: 휴게시간 반영한 실제 근무시간 표시
- ✅ **z-index 최적화**: 호버 시에도 휴게시간 막대 가시성 유지

### 이전 업데이트 (2025-11-13)

**📊 스케줄 뷰어 모듈화 완료 🎉**
- ✅ **schedule-viewer.js 공통 모듈 생성**: 간트차트 스케줄 표시 로직 통합
- ✅ **관리자/직원 페이지 통합**: 동일한 간트차트 렌더링 엔진 사용
- ✅ **간트차트 전용**: 카드뷰 제거, 간트차트만 사용 (06:00~01:00 시간 표시)
- ✅ **주차 표시 통일**: "YYYY년 NN주차 (MM/DD ~ MM/DD)" 형식
- ✅ **관리자 페이지 기능 유지**: 스케줄 시뮬레이터, PDF 저장, 주간 요약, 매장 선택
- ✅ **직원 페이지 토글 스위치**: 
  - OFF (기본): 내 근무만 보기
  - ON: 매장 전체 스케줄 보기
- ✅ **대체근무 표시**: 혼합 색상 + 🔄 툴팁으로 시각적 구분
- ✅ **급여 정보 숨김**: 직원 페이지에서는 급여 정보 비표시

**모듈 구조**:
```
js/schedule-viewer.js (공통 모듈)
├── window.renderScheduleGanttChart() - 간트차트 렌더링
├── window.loadScheduleData() - 스케줄 데이터 로딩
├── loadStoreSchedules() - 매장 전체 로딩
├── loadEmployeeSchedules() - 개인/매장 로딩
├── loadEmployeeSchedulesForWeek() - 주간 스케줄 가공
└── getContractCached() - 계약서 캐싱

admin-dashboard.html → schedule-viewer.js 로드
employee.js         → schedule-viewer.js 로드
```

**🔄 스케줄 복구 시스템**
- ✅ **시스템 설정에 복구 기능 추가**: schedules_backup에서 복구
- ✅ **계약서 기반 매칭**: 최신 계약서의 직원에게만 복구
- ✅ **contractId 자동 추가**: 복구 시 계약서 ID 자동 연결
- ✅ **상세 진행 상황 표시**: 복구 과정 실시간 모니터링

**🐛 버그 수정**
- ✅ 직원 페이지 토글 즉시 반응: 토글 전환 시 무조건 데이터 재로드
- ✅ 내부 스크롤바 제거: 직원 스케줄 탭 스크롤 정리
- ✅ storeId undefined 에러 해결: 매장 전체는 날짜만으로 조회
- ✅ 자동 삭제 로직 비활성화: contractId 없는 스케줄 보호

### 이전 업데이트 (2025-11-12)

**🔧 계약서 상세보기 공통 모듈화 완료**
- ✅ **contract-viewer.js 공통 모듈 생성**: 계약서 상세보기 로직을 단일 파일로 통합
- ✅ **관리자/직원 페이지 통합**: 두 페이지가 동일한 계약서 상세보기 모달 사용
- ✅ **한 번 수정으로 양쪽 반영**: contract-viewer.js 수정 시 관리자/직원 페이지 모두 자동 반영
- ✅ **코드 중복 제거**: employee.js에서 300줄 이상의 중복 코드 제거
- ✅ **유지보수성 향상**: 계약서 표시 로직을 한 곳에서 관리

**모듈 구조**:
```
js/contract-viewer.js (공통 모듈)
├── viewContract()           - 계약서 조회
├── showContractViewModal()  - 상세보기 모달 표시
└── closeContractViewModal() - 모달 닫기

admin-dashboard.html → contract-viewer.js 로드
employee.html        → contract-viewer.js 로드
```

**🐛 버그 수정**
- ✅ favicon.ico 404 오류 해결 (기본 파비콘 추가)
- ✅ 버튼 텍스트 통일: "계약서 원본 보기" → "계약서 상세보기"
- ✅ 필드명 호환성 완벽 지원: salaryType/wageType, salaryAmount/wageAmount 모두 표시

### 이전 업데이트 (2025-11-09)

**🔧 데이터 마이그레이션 시스템 추가**
- ✅ **계약서 employeeId 자동 수정**: 관리자 페이지 → 시스템 설정 탭
- ✅ **employeeId 누락 계약서 자동 감지**: employeeName + employeeBirth로 직원 조회
- ✅ **자동 데이터 복구**: Firestore 계약서 데이터 자동 업데이트
- ✅ **상세 마이그레이션 로그**: 수정 완료/건너뜀/오류 건수 실시간 표시
- ✅ **계약서 원본보기 버그 수정**: 계약 기간 undefined 해결 (contractStartDate/contractEndDate 폴백 지원)

**🐛 버그 수정**
- ✅ 직원 페이지 계약서 조회 개선: employeeId → employeeName 폴백 로직 수정
- ✅ 계약서 원본보기 페이지 날짜 표시 오류 수정
- ✅ 디버깅 로그 추가: 계약서 조회 실패 원인 자동 분석

### 이전 업데이트 (2025-11-09)

**🤖 자동 결근 기록 생성 시스템 (Cloud Functions) 🎉**
- ✅ **매일 자동 실행**: Cloud Scheduler로 매일 자정 1분에 자동 실행
- ✅ **계약서 기반 출근일 체크**: workDays 배열로 출근 예정일 확인
- ✅ **자동 결근 생성**: attendance 기록 없는 직원 자동 결근 처리
- ✅ **출퇴근 위반 즉시 감지**: 지각/조기출근/조퇴/초과근무 즉시 사유 입력
- ✅ **매장별 허용시간 설정**: 각 매장의 attendanceThresholds 적용

**출퇴근 위반 자동 감지 시스템**
1. **지각**: 계약 시작시간보다 늦게 출근 시 즉시 사유 입력 모달
2. **조기출근**: 허용시간보다 일찍 출근 시 즉시 사유 입력 모달
3. **조퇴**: 계약 종료시간보다 일찍 퇴근 시 즉시 사유 입력 모달
4. **초과근무**: 허용시간보다 늦게 퇴근 시 즉시 사유 입력 모달
5. **결근**: 다음 로그인 시 미처리 결근 사유 입력 모달

**Cloud Functions**
- `createAbsentRecords`: 매일 자정 1분 자동 실행 (Cloud Scheduler 설정 필요)
- `createAbsentRecordsForDate`: 특정 날짜 수동 결근 생성 (테스트/보정용)

### 이전 업데이트 (2025-11-08)

**🔄 교대근무 신청 시스템 완성 🎉**
- ✅ **직원 교대근무 신청 기능**: 날짜/시간/사유 입력하여 신청
- ✅ **실시간 대타 구함 팝업**: 같은 매장 직원들에게 실시간 알림 (Firestore onSnapshot)
- ✅ **관리자 승인 관리 탭 통합**: 교대근무 승인 요청 표시
- ✅ **자동 스케줄 변경**: 승인 시 원래 직원 스케줄 삭제, 대타 직원 스케줄 추가
- ✅ **급여 자동 계산**: 대타 직원 본인 시급/월급으로 자동 계산
- ✅ **결근 방지**: 원래 직원은 스케줄 삭제로 결근 기록 안 남음

**교대근무 워크플로우**
1. 직원 A가 "🔄 교대근무 신청" 버튼 클릭
2. 날짜, 시작시간, 종료시간, 사유 입력하여 신청
3. 같은 매장 직원들에게 "대타근무 구합니다" 팝업 자동 표시 (실시간)
4. 직원 B가 "✅ 승인하기" 클릭하면 매칭됨
5. 관리자 승인 관리 탭에 "🔄 교대근무" 항목 표시
6. 관리자가 "✅ 승인" 클릭 시:
   - 직원 A의 스케줄 자동 삭제 → 결근 안 찍힘
   - 직원 B의 새 스케줄 자동 생성 → 출근해야 하며, 안 하면 결근 찍힘
   - 급여 자동 계산: 직원 B의 시급/월급으로 계산됨

### 이전 업데이트 (2025-11-05)

**급여 관리 시스템 완전 구현 완료 🎉 (2025-11-05)**
- ✅ **월급제/연봉제 지원**: 시급제 외에 월급제, 연봉제 급여 계산 추가
  - 월급제: 209시간 기준 (주 40시간 × 52주 ÷ 12개월)
  - 연봉제: 연봉 ÷ 12개월, 209시간 기준
- ✅ **휴일근로수당 자동 계산**: 2025년 공휴일 캘린더 기반 자동 판별
  - 15개 공휴일 자동 인식 (신정, 설날, 삼일절, 어린이날, 현충일, 광복절, 추석, 개천절, 한글날, 크리스마스 등)
  - 공휴일 근무 시 시급 × 1.5배 자동 적용
- ✅ **퇴직금 자동 계산**: 1년 이상 근속, 주 15시간 이상 근무자 대상
  - 계약 시작일 기준 근속일수 자동 계산
  - (평균급여 × 근속일수 / 365 × 30일) 공식 적용
  - 주 평균 근무시간 자동 확인
- ✅ **급여명세서 PDF 생성**: html2pdf.js 기반 전문 명세서 다운로드
  - 맛남살롱 브랜드 템플릿 적용
  - 지급 항목/공제 항목 상세 표시
  - 실지급액 강조 표시
  - "📄 PDF 다운로드" 버튼 추가

**관리자 페이지 주요 기능 개선 ✅**
- ✅ 매장명 수정 시 직원 매장명 자동 업데이트 (Firestore batch)
- ✅ 급여 상세내역 실시간 자동 저장 (조회 시 자동 Firestore 저장)
- ✅ 직원관리 테이블 개선 (이름/매장/직급/연락처/상태/관리/상세)
- ✅ 직원 상세 모달: 기본정보/계좌정보/서류정보 (보건증/통장사본/신분증)
- ✅ 관리자 목록 개선: 상세 버튼 추가
- ✅ 관리자 상세 모달: 기본정보/권한정보 (관리자/매니저 권한별 설명)

**직원 페이지 개선 ✅**
- ✅ 급여 조회 상세내역 분단위 표시 ("8시간 30분" 형식)
- ✅ 서명 완료 페이지에 대시보드 돌아가기 버튼 추가
- ✅ formatHoursAndMinutes() 함수 구현

**localStorage 완전 제거 완료 ✅**
- ✅ 모든 localStorage 사용처를 Firestore로 변경
- ✅ loadDashboardData()의 계약서 카운트 → Firestore
- ✅ loadEmployeeList()의 직원 목록 → Firestore
- ✅ 중복 코드 제거 및 코드 정리
- ✅ 100% Firestore 기반 데이터 관리 완성

**버그 수정 및 개선**
- ✅ Firestore 복합 인덱스 오류 해결 (급여 조회 실패 수정)
- ✅ 계약서 링크 전송 버튼 오류 수정 (Firestore 통합)
- ✅ 관리자 페이지 근무시간 분 단위 표시 (정확한 급여 계산)
- ✅ 연장/야간 근무시간 "X시간 Y분" 형식 표시

**급여 자동 계산 시스템 완전 구현**
- ✅ **급여 자동 계산 시스템 완전 구현 완료** 🎉
  - 매장별 수당 설정 (연장근로/야간근로/휴일근로 개별 선택)
  - 계약서 작성 시 급여 지급 항목 선택 (주휴수당/연장근로/야간근로/휴일근로)
  - 4대보험 적용 방식 선택 (전체/고용산재만/프리랜서/완전면제)
  - 퇴직금 적용 대상 설정
  - 매장 설정에 따른 수당 자동 적용
  - **출퇴근 기록 기반 자동 급여 계산**
  - 기본급, 연장수당, 야간수당, 주휴수당 자동 계산
  - 4대보험 및 소득세 자동 공제
  - 급여 상세 내역 조회
  - 급여 확정 및 Firestore 저장
  - 지급 완료 처리 기능
- ✅ **완전한 Firestore 마이그레이션 완료** - localStorage 의존성 제거
- ✅ 회사 정보(companies) Firestore 전환
- ✅ 임시 저장 계약서(savedContracts) Firestore 전환
- ✅ 계약서(contracts) Firestore 전용 저장
- ✅ 문서 승인 시스템 구현 (구매/폐기/퇴직서)
- ✅ 관리자 목록 탭 추가
- ✅ 관리자/매니저 가입 시스템 (역할별 권한 분리)
- ✅ 직원 가입 승인 시스템 (승인 대기/승인됨/거부됨)
- ✅ 매장 관리 Firestore 연동 (직원가입-관리자 동기화)
- ✅ Firebase Authentication 자동 정리 시스템
- ✅ Cloud Functions 통합 (Node.js 20)
- ✅ 퇴직 승인 시 계정 자동 삭제

## 🔗 링크

- **GitHub**: https://github.com/uhi13088/ABCDC-staff-system
- **Firebase Hosting**: https://abcdc-staff-system.web.app
- **Firebase Console**: https://console.firebase.google.com/project/abcdc-staff-system

## 📧 문의

프로젝트 관련 문의사항이 있으시면 GitHub Issues를 이용해주세요.
