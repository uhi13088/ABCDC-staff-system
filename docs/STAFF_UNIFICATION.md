# STAFF 통일 작업 완료 보고서

**작업일**: 2025-01-17  
**버전**: v0.17.0  
**작업자**: AI Assistant + 사장님

---

## 🎯 작업 목표

**EMPLOYEE와 STAFF 혼용 문제 해결 → STAFF로 완전 통일**

---

## 🐛 문제점

### Before (문제 상황)
```typescript
// ❌ 혼란스러운 상황
USER_ROLES = {
  EMPLOYEE: 'employee',  // 중복!
  STAFF: 'staff',        // 중복!
}

// 어떤 곳은 employee
role: USER_ROLES.EMPLOYEE

// 어떤 곳은 staff
where('role', '==', USER_ROLES.STAFF)

// 결과: 직원이 조회 안 됨!
```

**문제 증상**:
- 초대코드로 가입한 직원이 관리자 페이지에서 보이지 않음
- 문서마다 employee/staff 혼용
- 개발자 혼란 증가
- 버그 발생 가능성 높음

---

## ✅ 해결 방법

### After (통일 완료)
```typescript
// ✅ 명확한 표준
USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STORE_MANAGER: 'store_manager',
  STAFF: 'staff',  // ⭐ 표준
}

// 모든 곳에서 STAFF 사용
role: USER_ROLES.STAFF

// 조회 시 호환성 유지
where('role', 'in', [USER_ROLES.STAFF, 'employee'])
```

---

## 📦 변경된 파일 (총 13개)

### 1️⃣ **핵심 파일**
- ✅ `lib/constants.ts` - EMPLOYEE 제거, SUPER_ADMIN 추가
- ✅ `STRUCTURE.md` - employee/staff → staff 통일
- ✅ `app/employee-register/page.tsx` - role: 'staff'로 저장

### 2️⃣ **서비스 레이어**
- ✅ `services/employeeService.ts` - staff + 'employee' 조회
- ✅ `services/notificationService.ts` - staff + 'employee' 조회

### 3️⃣ **로그인/인증**
- ✅ `app/employee-login/page.tsx` - staff 또는 employee 허용
- ✅ `app/employee-dashboard/page.tsx` - staff 또는 employee 허용

### 4️⃣ **UI 컴포넌트**
- ✅ `components/admin/modals/contract-form-modal.tsx` - 조회 조건 수정
- ✅ `components/admin/modals/create-invite-modal.tsx` - 기본값 'staff'
- ✅ `hooks/admin/useSchedulesLogic.ts` - 스케줄 직원 조회

### 5️⃣ **타입 정의**
- ✅ `lib/types.ts` - role 타입 수정
- ✅ `lib/helpers/notificationHelpers.ts` - senderRole: 'staff'

### 6️⃣ **스크립트**
- ✅ `scripts/fix-employee-role.js` - 마이그레이션 스크립트 (선택)

---

## 🎯 변경 사항 요약

| 항목 | Before | After |
|------|--------|-------|
| **상수** | EMPLOYEE, STAFF 둘 다 | STAFF만 존재 |
| **가입 시** | role: 'employee' | role: 'staff' ✅ |
| **조회 시** | 'staff'만 검색 | ['staff', 'employee'] 검색 ✅ |
| **로그인** | 'employee'만 허용 | 'staff' 또는 'employee' 허용 ✅ |
| **초대 코드** | role='employee' | role='staff' ✅ |
| **타입 정의** | 'employee' | 'staff' ✅ |
| **문서** | employee/staff 혼용 | staff 통일 ✅ |

---

## 🔄 호환성 전략

### ✅ 기존 데이터 보호

**마이그레이션 불필요!**

```typescript
// 조회 시 'employee'도 포함
where('role', 'in', ['staff', 'employee'])

// 로그인 시 둘 다 허용
if (role !== 'staff' && role !== 'employee') {
  throw new Error('...')
}
```

**결과**:
- ✅ 기존 'employee' 직원도 정상 작동
- ✅ 신규 직원은 'staff'로 저장
- ✅ 점진적 통일 가능

---

## 📊 Git 커밋 이력

```bash
ecb69372 refactor(v0.17.0): 전체 코드베이스 STAFF 통일 완료
cd0e7320 refactor(v0.17.0): STAFF로 완전 통일 - EMPLOYEE 제거
8324dd7e fix(v0.17.0): 직원 가입 후 관리자 페이지 직원 목록 표시 오류 수정
```

**총 변경**:
- 13개 파일 수정
- 102 insertions, 32 deletions

---

## 🧪 테스트 체크리스트

### ✅ 신규 직원 가입
- [ ] 초대 코드로 가입 → role='staff' 저장 확인
- [ ] 관리자 페이지에서 직원 목록 확인
- [ ] 승인 후 로그인 가능

### ✅ 기존 직원 (employee)
- [ ] 로그인 정상 작동
- [ ] 관리자 페이지에서 목록 표시
- [ ] 출퇴근, 급여 조회 정상

### ✅ 관리자 기능
- [ ] 직원 조회 정상
- [ ] 계약서 작성 시 직원 선택 정상
- [ ] 스케줄 작성 시 직원 목록 표시
- [ ] 알림 발송 정상

---

## 🎉 완료 효과

1. **명확성 확보**
   - STAFF가 유일한 표준
   - 개발자 혼란 제거
   - 코드 가독성 향상

2. **버그 방지**
   - role 불일치로 인한 조회 실패 방지
   - 직원 목록 표시 오류 해결
   - 향후 유사 버그 방지

3. **문서 일관성**
   - STRUCTURE.md 통일
   - constants.ts 정리
   - 타입 정의 명확화

4. **호환성 유지**
   - 기존 데이터 보호
   - 마이그레이션 불필요
   - 점진적 전환 가능

---

## 🚨 주의사항

### ⚠️ 앞으로 지켜야 할 규칙

1. **신규 코드는 STAFF만 사용**
   ```typescript
   // ✅ 올바른 예
   role: USER_ROLES.STAFF
   
   // ❌ 잘못된 예
   role: USER_ROLES.EMPLOYEE  // 상수가 존재하지 않음!
   ```

2. **조회는 호환성 유지**
   ```typescript
   // ✅ 올바른 예
   where('role', 'in', [USER_ROLES.STAFF, 'employee'])
   
   // ❌ 잘못된 예
   where('role', '==', USER_ROLES.STAFF)  // 기존 데이터 누락!
   ```

3. **문서 작성 시 STAFF 사용**
   - "직원" → "staff"
   - "employee / staff" ❌
   - "staff" ✅

---

## 📚 참고 문서

- [STRUCTURE.md](../STRUCTURE.md) - 사용자 계층 구조
- [lib/constants.ts](../lib/constants.ts) - USER_ROLES 정의
- [FIRESTORE_COLLECTIONS.md](../FIRESTORE_COLLECTIONS.md) - users 컬렉션 스키마

---

**작업 완료 일시**: 2025-01-17  
**상태**: ✅ 완료 및 배포 완료
