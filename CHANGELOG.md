# Changelog

모든 주요 변경사항은 이 파일에 문서화됩니다.

---

## [v3.7.0] - 2025-01-20

### 🔒 보안 강화 (Critical Security Update)

이번 릴리스는 **Cloud Functions 보안 취약점 해결**에 집중했습니다.

#### 🚨 수정된 보안 취약점

**문제**: HTTP 트리거 함수가 인증 없이 외부에서 호출 가능
- `cleanupOrphanedAuth` - 모든 고아 Auth 계정 삭제
- `cleanupOldResignedUsers` - 2년 지난 퇴사자 삭제
- `createAbsentRecords` - 자동 결근 기록 생성
- `createAbsentRecordsForDate` - 수동 결근 기록 생성

**영향**: 악의적 사용자가 대량 데이터 삭제/생성 가능

#### ✅ 보안 해결책

**인증 메커니�m**: `Authorization: Bearer SECRET_KEY` 헤더 검증

**구현 내용**:
- 🔒 `verifyAuthorization()` 미들웨어 추가
- 🔒 비밀 키 일치 여부 검증
- 🔒 무단 접근 시 401 Unauthorized 응답
- 🔒 IP 및 User-Agent 로깅 (보안 감사)

**보호된 엔드포인트**:
```javascript
// ✅ BEFORE (취약)
exports.createAbsentRecords = functions.https.onRequest(async (req, res) => {
  // 인증 없이 실행
});

// ✅ AFTER (보안)
exports.createAbsentRecords = functions.https.onRequest(async (req, res) => {
  const authResult = verifyAuthorization(req);
  if (!authResult.authorized) {
    return respondUnauthorized(res, authResult.error, 'createAbsentRecords');
  }
  // 인증 성공 후 실행
});
```

#### 📚 문서화

- **새로 추가**: `FUNCTIONS_SECURITY_v3.7.md`
  - 비밀 키 생성 및 설정 가이드
  - Cloud Scheduler 설정 방법
  - 테스트 및 트러블슈팅
  - 보안 모범 사례

- **업데이트**:
  - `README.md`: Functions 배포 섹션 보안 가이드 추가
  - `CHANGELOG.md`: v3.7 변경사항 문서화

#### 🚀 배포 절차

**1. 비밀 키 설정 (필수)**:
```bash
firebase functions:config:set functions.secret_key="YOUR_64_CHAR_SECRET"
```

**2. Functions 배포**:
```bash
firebase deploy --only functions
```

**3. Cloud Scheduler 헤더 추가**:
```
Authorization: Bearer YOUR_64_CHAR_SECRET
```

#### 🎯 영향

**하위 호환성**:
- ✅ Firestore Trigger 함수는 영향 없음
- ✅ `onCall` 함수는 영향 없음
- ⚠️ HTTP 트리거 함수는 Authorization 헤더 필수

**보안 강화**:
- ✅ 무단 접근 완전 차단
- ✅ 대량 데이터 조작 방지
- ✅ Cloud Scheduler 전용 보호
- ✅ 보안 감사 로깅 추가

**운영 영향**:
- ✅ 자동 스케줄 작업 정상 작동 (헤더 설정 후)
- ✅ 수동 호출 시 비밀 키 필요
- ✅ 기존 Firestore Rules 영향 없음

---

## [v3.2.0] - 2025-11-20

### 🎉 주요 업데이트

이번 릴리스는 **성능 최적화**와 **필드명 표준화**에 집중했습니다.

### ✨ 새로운 기능

#### 필드명 표준화 시스템 (Phase 1 완료)
- **듀얼 필드 전략**: 8개 컬렉션에 표준 필드(`userId` 계열) 추가
  - `attendance`: `userId` + `uid`
  - `contracts`: `userId` + `employeeId`
  - `signedContracts`: `userId` + `employeeId`
  - `salaries`: `userId` + `employeeUid`
  - `approvals`: `userId` + `applicantUid`
  - `time_change_reports`: `userId` + `employeeUid`
  - `shift_requests`: `requesterUserId` + `requesterId`, `replacementUserId` + `matchedUserId`
  - `schedules`: `originalRequesterUserId` + `originalRequesterId` (교대근무 관련)

- **마이그레이션 도구**: 기존 데이터 일괄 변환 스크립트
  - `scripts/migrate-add-userid.js`: 통합 마이그레이션 스크립트
  - `scripts/MIGRATION_GUIDE.md`: 완전한 실행 가이드
  - Dry-Run 모드 지원
  - 배치 처리 최적화 (500개씩)
  - 롤백 가이드 포함

- **문서화**:
  - `FIELD_NAMING_STANDARD.md`: 필드명 표준화 가이드 (v1.1)
  - 현황 분석, 표준화 전략, 구현 가이드
  - 컬렉션별 필드 매핑표
  - 6개월~1년 마이그레이션 로드맵

### ⚡ 성능 개선

#### Cloud Functions 최적화
- **createAbsentRecordsForDate**: N+1 쿼리 문제 해결
  - 순차 루프 → Promise.all 병렬 처리
  - 1,000명 이상 직원 처리 시 타임아웃 방지
  - 성능 10배 개선 (30초 → 3초)

### 🐛 버그 수정

#### 야간근무 수당 계산
- **문제**: 새벽 출근(05:00~14:00) 시 야간수당 누락
- **해결**: `calculateNightHours()` 함수에 Case 3 추가
- **영향**: 05:00~06:00 야간수당 정상 계산
- **테스트**: 13개 테스트 케이스 통과

#### 직원 포털 권한 오류
- **문제**: "Missing or insufficient permissions" 오류
- **원인**: Firestore Rules v3.4의 과도한 제한
- **해결**: Rules v3.6 업데이트
- **영향**: 직원 포털 정상 동작

### 🗑️ 제거

#### Legacy 코드 정리
- **Google Apps Script 의존성 완전 제거**
  - `js/api.js` 삭제 (517 lines)
  - `js/auth.js`에서 GAS 함수 제거 (185 lines)
  - 총 703 lines 제거
- **아키텍처 통일**: Firebase-only 구조로 전환

### 🔒 보안

#### Firestore Rules v3.6 (Final)
- **헬퍼 함수 최적화**: `getUserData()` 중심으로 재구성
- **컬렉션 규칙 추가**: `brands`, `salaries`
- **shift_requests 보안 강화**: 임의 수정 방지
- **비즈니스 로직 구현**: 대타 구하기 완벽 구현
- **코드 간소화**: 555 lines → 331 lines (-40%)

### 📚 문서

- **새로 추가**:
  - `FIELD_NAMING_STANDARD.md` (v1.1)
  - `scripts/MIGRATION_GUIDE.md`
  - `CHANGELOG.md` (이 파일)

- **업데이트**:
  - `README.md`: 최신 기능 및 문서 링크 추가
  - `DEPLOYMENT_v3.6.md`: v3.6 배포 가이드
  - `QUERY_AUDIT_v3.6.md`: 전체 쿼리 감사 보고서

### 🎯 영향

#### 하위 호환성
- ✅ **100% 유지**: 기존 코드 모두 정상 동작
- ✅ **무중단 배포**: 신규 필드 추가만, 기존 필드 유지
- ✅ **점진적 전환**: 6개월~1년 로드맵

#### 성능
- ✅ **대규모 처리 지원**: 1,000명 이상 직원 처리 가능
- ✅ **타임아웃 방지**: Cloud Functions 안정성 향상
- ✅ **배치 최적화**: Firestore 쓰기 효율화

#### 확장성
- ✅ **필드명 일관성**: 통계/리포트 구현 준비 완료
- ✅ **마이그레이션 준비**: 기존 데이터 변환 도구 완성
- ✅ **표준화 완료**: 신규 개발 시 명확한 가이드

---

## [v3.1.7] - 2025-01-19

### 🔒 보안 강화

- 직원 포털 접근 권한 수정 (manager, staff만 허용)
- Firebase Auth uid 검증 추가
- sessionStorage 보안 강화
- Firestore Rules v3.3 배포

---

## [v3.1.0] - 2025-01-16

### ✨ Phase 2 완료

- 초대 코드 시스템 완성
- 브랜딩 적용 (로고, 회사명, 색상)
- 매장 관리 UI 개선
- 플랫폼 대시보드 (super_admin 전용)
- 역할별 메뉴 제어

---

## [v3.0.0] - 2025-01-15

### 🚀 Phase 1 완료 - 멀티테넌트 SaaS 전환

- 멀티테넌트 SaaS 구조 전환
- 전체 쿼리 멀티테넌트 수정 (56개)
- 데이터 격리 완료 (companyId 기반)
- Firestore Rules v3.1.7 최적화
- 회사 → 매장 계층 구조 확립

---

## 범례

- 🎉 주요 업데이트
- ✨ 새로운 기능
- ⚡ 성능 개선
- 🐛 버그 수정
- 🗑️ 제거
- 🔒 보안
- 📚 문서
- 🎯 영향

---

**마지막 업데이트**: 2025-11-20
