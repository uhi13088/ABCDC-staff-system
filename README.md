# 맛남살롱 통합 관리 시스템

**멀티테넌트 SaaS 직원 관리 시스템** - Firebase 기반

## 🚀 프로젝트 개요

ABC Dessert Center와 맛남살롱 카페 체인을 위한 통합 직원 관리 시스템입니다.
회사 → 매장 2단계 계층 구조로 여러 회사와 매장을 하나의 시스템에서 관리합니다.

**배포 URL**: https://abcdc-staff-system.web.app

## ✨ 주요 기능

### 👑 관리자 대시보드
- **직원 관리**: 가입 승인, 정보 조회, 권한 관리
- **근무 관리**: 출퇴근 기록, 스케줄 관리, 교대근무 승인
- **급여 관리**: 자동 급여 계산, 4대보험 공제, 급여명세서 PDF
- **계약서 관리**: 전자계약서 작성, 서명, 보관
- **승인 관리**: 구매/폐기/퇴직서/교대근무 승인
- **브랜드 관리**: 다중 브랜드 CRUD, 브랜드-매장 연결 (NEW!)
- **매장 관리**: 매장 정보, 브랜드 선택, 수당 설정, 근태 임계값
- **초대 코드**: 역할별 초대 링크 생성 및 관리
- **플랫폼 대시보드**: super_admin 전용 전체 회사 현황 조회

### 👥 직원 포털
- **출퇴근**: 실시간 출퇴근 체크, 근무시간 자동 계산
- **스케줄**: 내 근무 일정 조회, 매장 전체 스케줄 보기
- **급여**: 월별 급여 내역 조회, 상세 내역 확인
- **계약서**: 전자계약서 확인 및 서명
- **교대근무**: 교대 신청, 실시간 대타 구함 알림
- **승인 신청**: 구매/폐기/퇴직서 신청
- **공지사항**: 회사/매장 공지사항 확인

## 🔐 권한 시스템

| 역할 | 권한 범위 | 직원 포털 접근 |
|------|-----------|---------------|
| **super_admin** | 전체 시스템 | ❌ 차단 |
| **admin** | 회사 전체 | ❌ 차단 |
| **store_manager** | 본인 매장만 | ❌ 차단 |
| **manager** | 본인 데이터만 | ✅ 허용 |
| **staff** | 본인 데이터만 | ✅ 허용 |

**멀티테넌트 격리**:
- 모든 데이터에 `companyId` 필수
- 타 회사 데이터 접근 완전 차단
- Firestore Rules로 권한 검증

## 💰 급여 계산 시스템

### 지원하는 급여 유형
- **시급제**: 시급 × 근무시간
- **월급제**: 209시간 기준 월급
- **연봉제**: 연봉 ÷ 12개월

### 자동 계산 항목
- ✅ 주휴수당 (주 15시간 이상)
- ✅ 연장근로수당 (주 40시간 초과 1.5배)
- ✅ 야간근로수당 (22:00~06:00, 0.5배)
- ✅ 휴일근로수당 (공휴일 1.5배)
- ✅ 4대보험 공제
- ✅ 퇴직금 (1년 이상 근속)
- ✅ PDF 급여명세서

## 🛠️ 기술 스택

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions, Storage)
- **Deployment**: Firebase Hosting
- **CI/CD**: GitHub Actions (자동 배포)

## 📦 배포

### GitHub Actions 자동 배포 (권장)

```bash
# GitHub에 푸시하면 자동 배포됩니다
git add .
git commit -m "Update feature"
git push origin main
```

**자동 배포 프로세스**:
1. `main` 브랜치에 푸시
2. GitHub Actions 자동 실행
3. Firebase Hosting 자동 배포
4. 약 2-3분 후 배포 완료

### Firestore Rules 배포 (수동 필요)

**⚠️ 중요: Rules는 Firebase Console에서 수동 배포 필요**

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. Firestore Database → 규칙(Rules) 탭
3. `/home/user/webapp/firestore.rules` 전체 복사
4. Console 편집기에 붙여넣기
5. **게시(Publish)** 클릭

### Cloud Functions 배포

**⚠️ 중요: v3.7부터 보안 강화 필요**

```bash
cd /home/user/webapp

# 1. 비밀 키 환경 변수 설정 (최초 1회)
firebase functions:config:set functions.secret_key="YOUR_SECRET_KEY"

# 2. Functions 배포
firebase deploy --only functions
```

**주요 Functions**:
- `verifyInviteCode`: 초대 코드 검증
- `recordInviteUse`: 초대 코드 사용 기록
- `createInviteCode`: 초대 코드 생성
- `deleteUser`: 직원 삭제 시 Auth 계정 자동 삭제
- `createAbsentRecords`: 매일 자동 결근 생성 (v3.7 보안 강화)
- `createAbsentRecordsForDate`: 특정 날짜 결근 생성 (v3.7 보안 강화)
- `cleanupOrphanedAuth`: 고아 Auth 계정 정리 (v3.7 보안 강화)
- `cleanupOldResignedUsers`: 2년 지난 퇴사자 삭제 (v3.7 보안 강화)

**📚 상세 가이드**: [FUNCTIONS_SECURITY_v3.7.md](FUNCTIONS_SECURITY_v3.7.md)

## 🎫 초대 코드 시스템

### 관리자가 초대 코드 생성
1. 관리자 대시보드 → "초대 코드 관리" 탭
2. "+ 초대 코드 생성" 클릭
3. 매장, 역할, 만료일 설정
4. 생성된 링크 복사하여 직원에게 전달

### 직원 가입
1. 초대 링크 클릭
2. 자동으로 회사/매장/역할 할당
3. 이메일/비밀번호/이름 입력
4. 가입 완료 (관리자 승인 대기)

## 📊 데이터 구조

### 주요 컬렉션
- `users`: 모든 사용자 (companyId, storeId, role 필수)
- `companies`: 회사 정보 (브랜딩, 설정)
- `brands`: 브랜드 정보 (companyId, name, description) **NEW!**
- `stores`: 매장 정보 (brandId, 수당 설정, 근태 임계값)
- `company_invites`: 초대 코드 (역할, 만료일, 사용 횟수)
- `attendance`: 출퇴근 기록 (실시간 계산)
- `schedules`: 근무 스케줄 (간트차트 표시)
- `contracts`: 계약서 (급여 설정, 수당 항목)
- `signedContracts`: 서명된 계약서 (전자서명)
- `salaries`: 확정 급여 (자동 계산 결과)
- `approvals`: 승인 문서 (구매/폐기/퇴직서)
- `shift_requests`: 교대근무 요청 (실시간 알림)
- `notices`: 공지사항 (회사/매장별)
- `time_change_reports`: 관리자 근무시간 수정 이력

## 📚 문서

### 배포 및 운영
- [배포 가이드](DEPLOYMENT_GUIDE.md) - Firebase 배포 절차
- [Functions 보안 가이드](FUNCTIONS_SECURITY_v3.7.md) - v3.7 보안 강화 🔒
- [테스트 체크리스트](PHASE2_TEST_CHECKLIST.md) - Phase 2 기능 테스트

### 데이터 관리
- [필드명 표준화 가이드](FIELD_NAMING_STANDARD.md) - 데이터 필드명 일관성 규칙 ⚠️
- [마이그레이션 가이드](scripts/MIGRATION_GUIDE.md) - 기존 데이터 일괄 변환 도구 🔧

## 🔗 링크

- **GitHub**: https://github.com/uhi13088/ABCDC-staff-system
- **Firebase Hosting**: https://abcdc-staff-system.web.app
- **Firebase Console**: https://console.firebase.google.com/project/abcdc-staff-system

## 📝 최신 업데이트

### 2025-01-20 - Cloud Functions 보안 강화 (v3.7)
- ✅ **HTTP 트리거 보안**: Authorization 헤더 검증 추가 (4개 함수)
- ✅ **무단 접근 방지**: 비밀 키 없이 호출 불가 (401 Unauthorized)
- ✅ **자동 실행 보호**: Cloud Scheduler 전용 비밀 키 사용
- ✅ **보안 로깅**: IP 주소, User-Agent 기록으로 감사 추적
- ✅ **상세 가이드**: FUNCTIONS_SECURITY_v3.7.md 문서화

### 2025-11-20 - 아키텍처 정리 & 성능 최적화 & 필드명 표준화 (v3.2)
- ✅ **Legacy 코드 제거**: Google Apps Script 의존성 완전 제거 (703 lines)
- ✅ **브랜드 관리 시스템**: 다중 브랜드 관리 기능 추가 (회사 → 브랜드 → 매장)
- ✅ **야간근무 버그 수정**: 새벽 출근(05:00~14:00) 야간수당 누락 해결
- ✅ **Firestore Rules v3.6 (Final)**: 
  - 헬퍼 함수 최적화 (getUserData 중심)
  - brands/salaries 컬렉션 규칙 추가
  - shift_requests update 보안 강화 (임의 수정 방지)
  - 비즈니스 로직 완벽 구현 (대타 구하기)
  - 코드 간소화 (555 lines → 331 lines, -224 lines)
- ✅ **직원 포털 권한 오류 해결**: 계약서 Fallback 쿼리 제거 (보안 규칙 준수)
- ✅ **Cloud Functions 성능 최적화 (v3.2)**: 
  - N+1 쿼리 문제 해결 (createAbsentRecordsForDate)
  - 순차 루프를 Promise.all 병렬 처리로 변경
  - 1,000명 이상 직원 처리 시 타임아웃 방지
  - 성능 10배 개선 (30초 → 3초)
- ✅ **필드명 표준화 (Phase 1 완료)**: 
  - 8개 컬렉션 듀얼 필드 적용 (userId 표준 + 기존 필드 호환)
  - 20곳 코드 수정 완료
  - shift_requests 명확한 네이밍 (requesterUserId, replacementUserId)
  - 마이그레이션 스크립트 작성 (기존 데이터 일괄 변환)
  - 완전한 문서화 (FIELD_NAMING_STANDARD.md, MIGRATION_GUIDE.md)

### 2025-01-19 - 보안 강화
- ✅ 직원 포털 접근 권한 수정 (manager, staff만 허용)
- ✅ Firebase Auth uid 검증 추가
- ✅ sessionStorage 보안 강화
- ✅ Firestore Rules v3.3 (manager를 staff와 동일하게 처리)

### 2025-01-16 - Phase 2 완료
- ✅ 초대 코드 시스템 완성
- ✅ 브랜딩 적용 (로고, 회사명, 색상)
- ✅ 매장 관리 UI 개선
- ✅ 플랫폼 대시보드 (super_admin 전용)
- ✅ 역할별 메뉴 제어

### 2025-01-15 - Phase 1 완료
- ✅ 멀티테넌트 SaaS 구조 전환
- ✅ 전체 쿼리 멀티테넌트 수정 (56개)
- ✅ 데이터 격리 완료 (companyId 기반)
- ✅ Firestore Rules v3.1.7 최적화

## 📧 문의

프로젝트 관련 문의: GitHub Issues
