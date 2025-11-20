# 🚀 Firestore Rules v3.6 배포 가이드

## 📋 배포 전 체크리스트

### ✅ 완료된 작업
- [x] Firestore Rules v3.6 작성 완료 (firestore.rules)
- [x] GitHub에 푸시 완료 (commit: 98f0d6eb)
- [x] js/employee.js 보안 수정 (계약서 Fallback 쿼리 제거)
- [x] 브랜드 관리 시스템 구현 (admin-dashboard.html)
- [x] 야간근무 버그 수정 (js/salary-calculator.js)

### 🚨 사장님이 **반드시** 해야 할 작업
- [ ] **1. Firestore Rules v3.6 배포** (Firebase Console)
- [ ] **2. 복합 인덱스 생성** (Console 링크 클릭)
- [ ] **3. 직원 포털 재테스트** (권한 에러 확인)

---

## 📝 v3.6 주요 변경사항

### 1. **헬퍼 함수 최적화**
```javascript
// ✅ BEFORE (v3.5): 중복 코드
function currentUser() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid));
}
function currentCompanyId() {
  return currentUser().data.companyId;
}

// ✅ AFTER (v3.6): 간소화
function getUserData() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
}
function currentCompanyId() {
  return getUserData().companyId;
}
```

**이점**: 코드 간소화, 의도 명확, DB 읽기 자동 캐싱

---

### 2. **누락 컬렉션 추가**

#### ✅ brands (브랜드 관리)
```javascript
match /brands/{brandId} {
  allow read: if isSignedIn() && (
    isSuperAdmin() || 
    resource.data.companyId == currentCompanyId()
  );
  allow write: if isSuperAdmin() || (isAdmin() && resource.data.companyId == currentCompanyId());
}
```

#### ✅ salaries (급여 내역)
```javascript
match /salaries/{docId} {
  allow read: if isSignedIn() && (
    isSuperAdmin() ||
    isManagerOrAbove() ||
    (resource.data.companyId == currentCompanyId() && resource.data.employeeUid == request.auth.uid)
  );
  allow write: if isSuperAdmin() || (isAdmin() && request.resource.data.companyId == currentCompanyId());
}
```

---

### 3. **shift_requests Update 규칙 보안 강화**

#### ❌ BEFORE (v3.5): 너무 관대
```javascript
allow update: if isSignedIn() && resource.data.companyId == currentCompanyId();
// 문제: 같은 회사의 모든 직원이 모든 shift_requests를 수정 가능
```

#### ✅ AFTER (v3.6): 비즈니스 로직 반영
```javascript
allow update: if isSignedIn() && (
  isSuperAdmin() ||
  isManagerOrAbove() ||
  (
    resource.data.companyId == currentCompanyId() && 
    (
      // 요청자 본인이 수정 (취소, 삭제)
      resource.data.requesterId == request.auth.uid ||
      // 대타가 수락 (status를 'matched'로 변경)
      (resource.data.status == 'pending' && 
       request.resource.data.replacementId == request.auth.uid &&
       request.resource.data.status == 'matched')
    )
  )
);
```

**보안 강화**: 임의 수정 방지, 비즈니스 로직 완벽 구현

---

### 4. **employee_docs 규칙 강화**

#### ❌ BEFORE: 회사 격리 없음
```javascript
allow read, write: if isSignedIn() && (
  request.auth.uid == userId ||
  isSuperAdmin() ||
  isManagerOrAbove() // 다른 회사 관리자도 접근 가능!
);
```

#### ✅ AFTER: 회사 격리 추가
```javascript
allow read, write: if isSignedIn() && (
  request.auth.uid == userId ||
  isSuperAdmin() ||
  (isManagerOrAbove() && 
   get(/databases/$(database)/documents/users/$(userId)).data.companyId == currentCompanyId())
);
```

---

### 5. **코드 간소화**
- **BEFORE**: 555 lines (v3.5)
- **AFTER**: 331 lines (v3.6)
- **제거**: 224 lines (-40%)

**제거된 내용**:
- ✅ 중복 헬퍼 함수 (currentUser, currentUserExists)
- ✅ 사용되지 않는 함수 (hasValidQuery)
- ✅ 불필요한 주석
- ✅ 백업 컬렉션 규칙 (schedules_backup, schedules_new)

---

## 🚀 배포 방법

### **방법 1: Firebase Console (권장)** ✅

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/abcdc-staff-system/firestore/rules
   ```

2. **규칙 복사**
   - GitHub: https://github.com/uhi13088/ABCDC-staff-system/blob/main/firestore.rules
   - 또는 로컬: `/home/user/webapp/firestore.rules` 파일 전체 내용

3. **Console 편집기에 붙여넣기**
   - Firestore Database → 규칙(Rules) 탭 클릭
   - 기존 내용 **전체 삭제**
   - 새 규칙 **붙여넣기**

4. **게시(Publish) 클릭**
   - 검증 통과 확인
   - "게시" 버튼 클릭
   - 약 5~10초 후 배포 완료

---

### **방법 2: 로컬 배포 (Firebase CLI)** ⚙️

```bash
# 1. Firebase 로그인 (필요 시)
firebase login

# 2. 프로젝트 확인
firebase use abcdc-staff-system

# 3. Rules만 배포 (Functions/Hosting 제외)
firebase deploy --only firestore:rules

# 4. 배포 확인
# ✅ Successfully deployed rules to firestore
```

---

## 🔥 복합 인덱스 생성 (필수!)

### **문제**: 직원 포털에서 인덱스 에러 발생
```
FirebaseError: The query requires an index. You can create it here: 
https://console.firebase.google.com/v1/r/project/abcdc-staff-system/firestore/indexes?create_composite=...
```

### **해결 방법**:

#### **옵션 A: 자동 생성 링크 사용 (권장)** ✅
1. **에러 로그에서 링크 복사**
2. **브라우저에서 링크 열기**
3. **"인덱스 만들기" 버튼 클릭**
4. **5~10분 대기** (인덱스 빌드 중)
5. **완료 후 직원 포털 재테스트**

#### **옵션 B: 수동 생성** ⚙️
1. Firebase Console → Firestore → 색인(Indexes) 탭
2. "복합 색인 추가" 클릭
3. 아래 설정 입력:

**time_change_reports 인덱스**:
```
컬렉션 ID: time_change_reports
필드:
  - companyId (오름차순)
  - employeeUid (오름차순)
  - type (오름차순)
  - createdAt (내림차순)
```

4. "만들기" 클릭
5. 5~10분 대기

---

## ✅ 배포 후 테스트

### 1. **관리자 대시보드 테스트**
- [ ] 로그인 성공
- [ ] 브랜드 탭 → 브랜드 CRUD 정상 작동
- [ ] 매장 탭 → 매장 수정 시 브랜드 선택 가능
- [ ] Console에 권한 에러 없음

### 2. **직원 포털 테스트** (최우선!)
- [ ] 직원으로 로그인 (staff 또는 manager)
- [ ] **계약서 탭**:
  - [ ] 계약서 목록 표시 (또는 "작성된 계약서가 없습니다")
  - [ ] ❌ "Missing or insufficient permissions" 에러 없음
- [ ] **근무내역 탭**:
  - [ ] 출퇴근 기록 정상 표시
  - [ ] ❌ 권한 에러 없음
- [ ] **관리자 수정 알림**:
  - [ ] 모달 정상 표시 (인덱스 생성 후)
  - [ ] ❌ 인덱스 에러 없음
- [ ] **Console 확인**:
  - [ ] ❌ 빨간 에러 없음
  - [ ] ✅ 초록 성공 로그만

### 3. **교대근무 테스트** (비즈니스 로직)
- [ ] 직원 A가 교대 요청 생성 (status: 'pending')
- [ ] 같은 매장 직원 B가 요청 목록에서 확인 가능
- [ ] 직원 B가 "수락" 클릭 (status: 'matched')
- [ ] ❌ 직원 C가 다른 사람의 요청 임의 수정 불가

---

## 🚨 문제 해결 (Troubleshooting)

### **문제 1**: 직원 포털에서 여전히 권한 에러
**원인**: Rules가 배포되지 않음
**해결**: 
1. Firebase Console → Firestore → 규칙 탭 확인
2. 첫 줄에 "v3.6 (Final Optimized)" 표시 확인
3. 없으면 다시 배포

---

### **문제 2**: 인덱스 에러 지속
**원인**: 인덱스 빌드 중 (5~10분 소요)
**해결**: 
1. Firebase Console → Firestore → 색인 탭
2. 상태가 "사용 설정됨" 확인
3. "빌드 중"이면 대기

---

### **문제 3**: 계약서가 "0개"로 표시
**원인**: 데이터에 `employeeId` 필드 없음
**해결**: 
1. 관리자 대시보드 → 직원 탭
2. "계약서 ID 마이그레이션" 실행
3. 완료 후 직원 포털 재테스트

---

## 📊 배포 상태 체크

| 항목 | 상태 | 비고 |
|------|------|------|
| **firestore.rules** | ✅ GitHub 푸시됨 | commit: 98f0d6eb |
| **js/employee.js** | ✅ 수정 완료 | commit: 31fa8e7c |
| **admin-dashboard.html** | ✅ 브랜드 관리 추가 | 여러 commits |
| **README.md** | ✅ 업데이트 완료 | commit: a836c5d5 |
| **Firebase Rules** | 🚨 **배포 필요** | Console에서 수동 배포 |
| **복합 인덱스** | 🚨 **생성 필요** | 링크 클릭 또는 수동 생성 |

---

## 🎉 배포 완료 후

배포가 성공하면:
1. ✅ 직원 포털 권한 에러 해결
2. ✅ 브랜드 관리 시스템 사용 가능
3. ✅ 야간근무 수당 정확히 계산
4. ✅ 교대근무 비즈니스 로직 완벽 작동
5. ✅ 보안 강화 (임의 수정 방지)

**다음 단계**:
- 실제 운영 데이터로 테스트
- 직원들에게 사용법 안내
- 피드백 수집 및 개선

---

## 📞 문의

문제가 발생하면:
1. Console 에러 로그 캡처
2. 어떤 동작을 했는지 설명
3. GitHub Issues에 등록

**배포 성공을 기원합니다!** 🚀
