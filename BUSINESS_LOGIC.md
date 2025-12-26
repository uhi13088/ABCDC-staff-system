# BUSINESS_LOGIC.md

**Version**: v1.0.0  
**Last Updated**: 2025-12-26  
**Purpose**: ABC Staff System의 핵심 비즈니스 로직을 '사람의 말(자연어) + 의사 코드(Pseudo-code)'로 정리

---

## 📌 **중요 공지**

**⚠️ 이 문서는 코드와 함께 업데이트되어야 합니다!**

- **함수 수정 시**: 해당 로직의 문서도 함께 수정
- **로직 변경 시**: 알고리즘 명세서를 먼저 검토하고 수정
- **새 로직 추가 시**: 이 문서에 새로운 섹션 추가

---

## 📚 **목차**

### **Priority 1 (매우 복잡 + 핵심)**
1. [급여 계산 로직](#1-급여-계산-로직)
2. [출퇴근 시간 보정 로직](#2-출퇴근-시간-보정-로직)
3. [초대 코드 검증 로직](#3-초대-코드-검증-로직)

### **Priority 2 (중요 + 복잡)**
4. [주휴수당 지급 조건](#4-주휴수당-지급-조건)
5. [퇴직금 계산 조건](#5-퇴직금-계산-조건)
6. [승인 요청 처리 로직](#6-승인-요청-처리-로직)
7. [스케줄 충돌 검증](#7-스케줄-충돌-검증)

### **Priority 3 (중요 규칙)**
8. [역할 기반 권한 검증](#8-역할-기반-권한-검증)
9. [계약서 서명 프로세스](#9-계약서-서명-프로세스)
10. [구독 플랜 제한 로직](#10-구독-플랜-제한-로직)
11. [공휴일 판정 로직](#11-공휴일-판정-로직)

---

# Priority 1 (매우 복잡 + 핵심)

## 1. 급여 계산 로직

### 📁 **관련 파일**
- `functions/src/index.ts` (Cloud Function, 650줄)
- `lib/utils/calculate-monthly-salary.ts` (클라이언트용 레거시, 430줄)
- `lib/types/salary.ts` (타입 정의)

### 📝 **목적**
직원의 한 달 급여를 계산하여 기본급, 수당, 공제를 반영한 실수령액을 산출합니다.

### 🎯 **입력/출력**

**입력**:
- `employee`: 직원 정보 (uid, name, store, companyId)
- `contract`: 계약서 정보 (급여 유형, 근무 조건, 수당 설정, 4대보험 설정)
- `attendances`: 출퇴근 기록 배열 (날짜, 출근/퇴근 시간, 인센티브)
- `yearMonth`: 계산 대상 연월 ("YYYY-MM" 형식)

**출력**:
- `MonthlySalaryResult`: 급여 상세 내역 (30개 이상의 필드)

### 🧮 **알고리즘 (Pseudo-code)**

```
function calculateMonthlySalary(employee, contract, attendances, yearMonth):
    
    // 1. 초기화
    result = {
        employeeName, userId, storeName, yearMonth,
        salaryType, hourlyWage: 0, monthlyWage: 0, annualWage: 0,
        totalWorkHours: 0, basePay: 0,
        overtimePay: 0, nightPay: 0, holidayPay: 0, weeklyHolidayPay: 0,
        incentivePay: 0, severancePay: 0,
        nationalPension: 0, healthInsurance: 0, longTermCare: 0,
        employmentInsurance: 0, incomeTax: 0,
        totalDeductions: 0, totalPay: 0, netPay: 0,
        workDays: 0, attendanceDetails: []
    }
    
    // 2. 매장 출퇴근 허용시간 설정 가져오기 (Firestore 조회)
    thresholds = {
        earlyClockIn: 15,    // 기본값 15분
        earlyClockOut: 5,    // 기본값 5분
        overtime: 5          // 기본값 5분
    }
    
    IF storeName exists THEN:
        storeData = Firestore.query('stores', where: name == storeName, companyId == companyId)
        IF storeData.attendanceThresholds exists THEN:
            thresholds = storeData.attendanceThresholds
        END IF
    END IF
    
    // 3. 급여 유형별 시급 계산
    salaryAmount = contract.salaryAmount || contract.wageAmount
    
    IF salaryAmount == 0 THEN:
        return result  // 급여 정보 없음
    END IF
    
    IF salaryType == '시급' THEN:
        hourlyWage = salaryAmount
    ELSE IF salaryType == '월급' THEN:
        monthlyWage = salaryAmount
        hourlyWage = round(salaryAmount / 209)  // 월 209시간 기준
    ELSE IF salaryType == '연봉' THEN:
        annualWage = salaryAmount
        monthlyWage = round(salaryAmount / 12)
        hourlyWage = round(salaryAmount / 12 / 209)
    END IF
    
    // 4. 계약서 근무일정 파싱
    workDaysArray = contract.workDays.split(',')  // "월,화,수,목,금" → ['월', '화', ...]
    workDayNumbers = map workDaysArray to dayOfWeek numbers  // 월=1, 화=2, ... 일=0
    
    // 5. 결근 체크 (주휴수당 계산용)
    weeklyAbsences = {}  // 주차별 결근 여부
    
    FOR each day in month:
        IF day is workDay AND no attendance record THEN:
            weekKey = getWeekOfMonth(day)  // "2025-01-W1"
            weeklyAbsences[weekKey] = true
        END IF
    END FOR
    
    // 6. 출퇴근 기록 분석
    totalWorkHours = 0
    totalOvertimeHours = 0
    totalNightHours = 0
    totalHolidayHours = 0
    totalIncentiveAmount = 0
    weeklyWorkHours = {}  // 주차별 근무시간
    
    FOR each attendance in attendances:
        
        // 6-1. 출퇴근 시간 가져오기
        checkIn = attendance.clockIn || attendance.checkIn
        checkOut = attendance.clockOut || attendance.checkOut
        
        IF no checkOut THEN:
            checkOut = currentTime  // 퇴근 기록 없으면 현재 시간 사용 (실시간 계산)
        END IF
        
        // 6-2. 출퇴근 시간 보정 (Section 2 참조)
        adjustedCheckIn = adjustCheckInTime(checkIn, contract.workStartTime, thresholds)
        adjustedCheckOut = adjustCheckOutTime(checkOut, contract.workEndTime, thresholds)
        
        // 6-3. 근무시간 계산
        workHours = calculateWorkHours(adjustedCheckIn, adjustedCheckOut)
        nightHours = calculateNightHours(adjustedCheckIn, adjustedCheckOut)  // 22:00~06:00
        isHoliday = isPublicHoliday(attendance.date)
        
        totalWorkHours += workHours
        workDays++
        
        // 6-4. 야간근무 시간 누적
        IF contract.allowances.night AND nightHours > 0 THEN:
            totalNightHours += nightHours
        END IF
        
        // 6-5. 공휴일 근무 시간 누적
        IF isHoliday AND contract.allowances.holiday THEN:
            totalHolidayHours += workHours
        END IF
        
        // 6-6. 인센티브 수당 누적 (긴급 구인 등)
        IF attendance.wageIncentive > 0 THEN:
            incentiveAmount = round(attendance.wageIncentive × workHours)
            totalIncentiveAmount += incentiveAmount
        END IF
        
        // 6-7. 주차별 근무시간 누적 (주휴수당 계산용)
        weekKey = getWeekOfMonth(attendance.date)
        weeklyHoursForDay = min(workHours, 8)  // 하루 최대 8시간만 주휴수당 계산에 포함
        weeklyWorkHours[weekKey] += weeklyHoursForDay
        
        // 6-8. 상세 내역 저장
        attendanceDetails.push({
            date, checkIn, checkOut,
            adjustedCheckIn, adjustedCheckOut,
            workHours, nightHours, isHoliday,
            wageIncentive, isRealtime
        })
    END FOR
    
    // 7. 기본급 계산
    IF salaryType == '시급' THEN:
        basePay = round(hourlyWage × totalWorkHours)
    ELSE IF salaryType == '월급' OR salaryType == '연봉' THEN:
        basePay = monthlyWage  // 고정 월급
    END IF
    
    // 8. 연장근로수당 (주 40시간 초과분)
    IF contract.allowances.overtime THEN:
        FOR each week in weeklyWorkHours:
            IF weekHours > 40 THEN:
                totalOvertimeHours += (weekHours - 40)
            END IF
        END FOR
        overtimePay = round(hourlyWage × 1.5 × totalOvertimeHours)
    END IF
    
    // 9. 야간근로수당 (22:00~06:00, 50% 가산)
    IF contract.allowances.night AND totalNightHours > 0 THEN:
        nightPay = round(hourlyWage × 0.5 × totalNightHours)
    END IF
    
    // 10. 휴일근로수당 (공휴일, 150% 가산)
    IF contract.allowances.holiday AND totalHolidayHours > 0 THEN:
        holidayPay = round(hourlyWage × 1.5 × totalHolidayHours)
    END IF
    
    // 11. 특별 근무 수당 (긴급 구인 인센티브)
    IF totalIncentiveAmount > 0 THEN:
        incentivePay = round(totalIncentiveAmount)
    END IF
    
    // 12. 주휴수당 (Section 4 참조)
    IF salaryType == '시급' AND isWeeklyHolidayEligible THEN:
        weeklyHolidayPay = calculateWeeklyHolidayPay(
            weeklyWorkHours, weeklyAbsences, hourlyWage
        )
    END IF
    
    // 13. 퇴직금 (Section 5 참조)
    IF contract.startDate exists AND yearsDiff >= 1 AND avgWeeklyHours >= 15 THEN:
        severancePay = calculateSeverancePay(
            basePay, totalAllowances, daysDiff
        )
    END IF
    
    // 14. 총 수당
    totalAllowances = overtimePay + nightPay + holidayPay + 
                      weeklyHolidayPay + incentivePay + severancePay
    
    // 15. 총 지급액 (공제 전)
    totalPay = basePay + totalAllowances
    
    // 16. 4대보험 공제
    IF contract.insurance.pension THEN:
        nationalPension = round(totalPay × 0.045)  // 4.5%
    END IF
    
    IF contract.insurance.health THEN:
        healthInsurance = round(totalPay × 0.03545)  // 3.545%
        longTermCare = round(healthInsurance × 0.1295 × 0.5)  // 건강보험의 12.95%의 50%
    END IF
    
    IF contract.insurance.employment THEN:
        employmentInsurance = round(totalPay × 0.009)  // 0.9%
    END IF
    
    // 17. 소득세 (3.3%)
    IF any insurance exists THEN:
        incomeTax = round(totalPay × 0.033)
    END IF
    
    totalDeductions = nationalPension + healthInsurance + 
                      longTermCare + employmentInsurance + incomeTax
    
    // 18. 실수령액
    netPay = totalPay - totalDeductions
    
    // 19. 계약서 기준 정보 추가
    contractInfo = {
        weeklyHours: contract.weeklyHours,
        isWeeklyHolidayEligible: (weeklyHours >= 15 OR allowances.weeklyHoliday),
        has4Insurance, hasPension, hasHealthInsurance,
        hasEmploymentInsurance, hasWorkCompInsurance
    }
    
    return result
```

### 📊 **핵심 계산식**

| 항목 | 계산식 | 비고 |
|------|--------|------|
| **시급 → 월급 환산** | 월급 = 시급 × 209시간 | 주 40시간 × 52주 ÷ 12개월 |
| **연봉 → 시급 환산** | 시급 = 연봉 ÷ 12 ÷ 209 | |
| **기본급 (시급제)** | 기본급 = 시급 × 총 근무시간 | |
| **기본급 (월급제)** | 기본급 = 월급 (고정) | |
| **연장근로수당** | 시급 × 1.5 × 초과시간 | 주 40시간 초과분 |
| **야간근로수당** | 시급 × 0.5 × 야간시간 | 22:00~06:00 |
| **휴일근로수당** | 시급 × 1.5 × 공휴일 근무시간 | |
| **주휴수당** | 시급 × (주 근무시간 ÷ 5) | 주 15시간 이상 + 결근 없음 |
| **퇴직금** | (평균급여 × 근속일수 ÷ 365) × 30 | 1년 이상 + 주 15시간 이상 |
| **국민연금** | 총 지급액 × 4.5% | |
| **건강보험** | 총 지급액 × 3.545% | |
| **장기요양보험** | 건강보험 × 12.95% × 50% | |
| **고용보험** | 총 지급액 × 0.9% | |
| **소득세** | 총 지급액 × 3.3% | |

### ⚠️ **주의사항**

1. **보안**: 급여 계산은 반드시 Cloud Functions에서 수행 (클라이언트 변조 방지)
2. **반올림**: 모든 금액은 원 단위로 반올림 (`Math.round()`)
3. **실시간 계산**: 퇴근 기록이 없으면 현재 시간까지 계산 (실시간 급여 조회용)
4. **매장별 설정**: `attendanceThresholds`는 매장마다 다를 수 있음 (Firestore 조회)
5. **레거시 필드**: `checkIn/checkOut` vs `clockIn/clockOut` 모두 지원 (하위 호환)

---

## 2. 출퇴근 시간 보정 로직

### 📁 **관련 파일**
- `functions/src/index.ts` (Line 345~365)
- `lib/utils/calculate-monthly-salary.ts` (Line 197~233)

### 📝 **목적**
계약서 근무시간과 실제 출퇴근 시간을 비교하여, 매장별 허용시간 기준에 따라 수당 적용 여부를 결정합니다.

### 🎯 **매장별 허용시간 설정 (`attendanceThresholds`)**

| 설정 | 기본값 | 의미 | 예시 |
|------|--------|------|------|
| `earlyClockIn` | 15분 | 이 시간 **이상** 일찍 출근해야 수당 적용 | 09:00 출근인데 08:44 체크인 → 수당 O |
| `earlyClockOut` | 5분 | 이 시간 **이내** 조기퇴근은 차감 없음 | 18:00 퇴근인데 17:56 체크아웃 → 차감 X |
| `overtime` | 5분 | 이 시간 **이상** 늦게 퇴근해야 수당 적용 | 18:00 퇴근인데 18:06 체크아웃 → 수당 O |

### 🧮 **알고리즘 (Pseudo-code)**

```
function adjustAttendanceTime(checkIn, checkOut, contractStartTime, contractEndTime, thresholds):
    
    adjustedCheckIn = checkIn
    adjustedCheckOut = checkOut
    
    // 1. 조기출근 처리
    earlyMinutes = contractStartTime - checkIn  // 분 단위 계산
    
    IF earlyMinutes > 0 AND earlyMinutes < thresholds.earlyClockIn THEN:
        // 허용시간 미만 조기출근 → 수당 미적용
        adjustedCheckIn = contractStartTime
        LOG "조기출근 {earlyMinutes}분 (허용시간 {thresholds.earlyClockIn}분 미만) → 수당 미적용"
    ELSE IF earlyMinutes >= thresholds.earlyClockIn THEN:
        // 허용시간 이상 조기출근 → 실제 출근시간 인정 (수당 적용)
        adjustedCheckIn = checkIn
        LOG "조기출근 {earlyMinutes}분 (허용시간 {thresholds.earlyClockIn}분 이상) → 수당 적용"
    END IF
    
    // 2. 조기퇴근 처리
    earlyLeaveMinutes = contractEndTime - checkOut
    
    IF earlyLeaveMinutes > 0 AND earlyLeaveMinutes <= thresholds.earlyClockOut THEN:
        // 허용시간 이내 조기퇴근 → 차감 없음
        adjustedCheckOut = contractEndTime
        LOG "조기퇴근 {earlyLeaveMinutes}분 (허용시간 {thresholds.earlyClockOut}분 이내) → 차감 없음"
    ELSE IF earlyLeaveMinutes > thresholds.earlyClockOut THEN:
        // 허용시간 초과 조기퇴근 → 실제 퇴근시간으로 계산 (차감)
        adjustedCheckOut = checkOut
        LOG "조기퇴근 {earlyLeaveMinutes}분 (허용시간 {thresholds.earlyClockOut}분 초과) → 차감"
    END IF
    
    // 3. 초과근무 처리
    overtimeMinutes = checkOut - contractEndTime
    
    IF overtimeMinutes > 0 AND overtimeMinutes < thresholds.overtime THEN:
        // 허용시간 미만 초과근무 → 수당 미적용
        adjustedCheckOut = contractEndTime
        LOG "초과근무 {overtimeMinutes}분 (허용시간 {thresholds.overtime}분 미만) → 수당 미적용"
    ELSE IF overtimeMinutes >= thresholds.overtime THEN:
        // 허용시간 이상 초과근무 → 실제 퇴근시간 인정 (수당 적용)
        adjustedCheckOut = checkOut
        LOG "초과근무 {overtimeMinutes}분 (허용시간 {thresholds.overtime}분 이상) → 수당 적용"
    END IF
    
    return (adjustedCheckIn, adjustedCheckOut)
```

### 📊 **시나리오별 예시**

#### **시나리오 1: 조기출근 (earlyClockIn = 15분)**

| 계약 출근시간 | 실제 체크인 | 차이 | 조정 결과 | 수당 |
|---------------|-------------|------|-----------|------|
| 09:00 | 08:50 | 10분 | 09:00 | ❌ 미적용 (15분 미만) |
| 09:00 | 08:44 | 16분 | 08:44 | ✅ 적용 (15분 이상) |

#### **시나리오 2: 조기퇴근 (earlyClockOut = 5분)**

| 계약 퇴근시간 | 실제 체크아웃 | 차이 | 조정 결과 | 차감 |
|---------------|---------------|------|-----------|------|
| 18:00 | 17:56 | 4분 | 18:00 | ❌ 차감 없음 (5분 이내) |
| 18:00 | 17:54 | 6분 | 17:54 | ✅ 차감 (5분 초과) |

#### **시나리오 3: 초과근무 (overtime = 5분)**

| 계약 퇴근시간 | 실제 체크아웃 | 차이 | 조정 결과 | 수당 |
|---------------|---------------|------|-----------|------|
| 18:00 | 18:03 | 3분 | 18:00 | ❌ 미적용 (5분 미만) |
| 18:00 | 18:06 | 6분 | 18:06 | ✅ 적용 (5분 이상) |

### ⚠️ **주의사항**

1. **매장별 설정**: 허용시간은 Firestore `stores` 컬렉션의 `attendanceThresholds`에서 조회
2. **기본값**: 설정이 없으면 기본값 사용 (earlyClockIn=15, earlyClockOut=5, overtime=5)
3. **로그 출력**: 개발 환경에서만 로그 출력 (운영 환경에서는 제거)

---

## 3. 초대 코드 검증 로직

### 📁 **관련 파일**
- `app/api/verify-invite-code/route.ts`
- `lib/firebase-admin.ts` (Admin SDK)
- `firestore.rules` (Rules에서는 super_admin만 접근)

### 📝 **목적**
플랫폼 가입용 초대 코드를 검증하고, 연결된 구독 플랜 정보를 반환합니다. (Firestore Rules를 우회하여 서버에서 검증)

### 🎯 **입력/출력**

**입력** (POST /api/verify-invite-code):
```json
{
  "code": "ABC123"
}
```

**출력** (성공):
```json
{
  "success": true,
  "codeId": "doc_id_123",
  "planId": "plan_456",
  "planName": "Basic Plan",
  "code": "ABC123"
}
```

**출력** (실패):
```json
{
  "success": false,
  "error": "유효하지 않은 초대 코드입니다."
}
```

### 🧮 **알고리즘 (Pseudo-code)**

```
POST /api/verify-invite-code:
    
    // 1. Request Body 파싱
    body = await request.json()
    code = body.code
    
    // 2. 입력 검증
    IF code is empty OR typeof code != 'string' THEN:
        return { success: false, error: "초대 코드를 입력하세요." }, status: 400
    END IF
    
    trimmedCode = code.trim().toUpperCase()
    
    IF trimmedCode.length < 4 OR trimmedCode.length > 20 THEN:
        return { success: false, error: "유효하지 않은 초대 코드 형식입니다." }, status: 400
    END IF
    
    // 3. Admin SDK로 Firestore 조회 (Rules 우회)
    codesSnapshot = adminDb.collection('invitation_codes')
        .where('code', '==', trimmedCode)
        .limit(1)
        .get()
    
    IF codesSnapshot is empty THEN:
        return { success: false, error: "유효하지 않은 초대 코드입니다." }, status: 404
    END IF
    
    codeDoc = codesSnapshot.docs[0]
    codeData = codeDoc.data()
    
    // 4. 사용 여부 확인
    IF codeData.isUsed == true THEN:
        return { success: false, error: "이미 사용된 초대 코드입니다." }, status: 400
    END IF
    
    // 5. 만료일 확인 (있는 경우)
    IF codeData.expiryDate exists THEN:
        expiryDate = codeData.expiryDate.toDate()  // Admin SDK Timestamp
        IF expiryDate < currentTime THEN:
            return { success: false, error: "만료된 초대 코드입니다." }, status: 400
        END IF
    END IF
    
    // 6. 사용 횟수 제한 확인 (있는 경우)
    IF codeData.maxUses exists AND codeData.usedCount >= codeData.maxUses THEN:
        return { success: false, error: "사용 횟수가 초과된 초대 코드입니다." }, status: 400
    END IF
    
    // 7. 플랜 정보 가져오기 (Admin SDK)
    planDoc = adminDb.collection('subscription_plans')
        .doc(codeData.linkedPlanId || codeData.planId)
        .get()
    
    IF planDoc does not exist THEN:
        return { success: false, error: "연결된 플랜을 찾을 수 없습니다." }, status: 404
    END IF
    
    planData = planDoc.data()
    
    // 8. 플랜 활성 상태 확인
    IF planData.isActive == false THEN:
        return { success: false, error: "비활성화된 플랜입니다." }, status: 400
    END IF
    
    // 9. 성공 응답 (최소 정보만 반환)
    return {
        success: true,
        codeId: codeDoc.id,
        planId: planDoc.id,
        planName: planData.name,
        code: trimmedCode
    }
```

### 📊 **검증 순서도**

```
입력 검증 (코드 형식)
    ↓
초대 코드 존재 여부
    ↓
사용 여부 확인
    ↓
만료일 확인
    ↓
사용 횟수 확인
    ↓
플랜 존재 여부
    ↓
플랜 활성 상태
    ↓
성공 응답
```

### 🔒 **보안 고려사항**

1. **Admin SDK 사용**: Firestore Rules를 우회하여 `invitation_codes` 컬렉션 조회 (일반 사용자는 접근 불가)
2. **열거 공격 차단**: 초대 코드는 서버에서만 검증 가능 (클라이언트에서 브루트포스 공격 불가)
3. **최소 정보 반환**: 성공 시에도 필요한 정보만 반환 (민감한 정보 노출 방지)
4. **Rate Limiting 필요**: 현재 코드에서는 제거됨 (프로덕션에서는 Cloudflare KV, Upstash Redis 등 외부 저장소 필요)

### ⚠️ **주의사항**

1. **GET 메서드 비활성화**: `POST` 메서드만 허용 (`GET`은 405 에러)
2. **대소문자 변환**: 입력된 코드는 자동으로 대문자 변환 (`toUpperCase()`)
3. **Trim 처리**: 공백 제거 (`trim()`)

---

# Priority 2 (중요 + 복잡)

## 4. 주휴수당 지급 조건

### 📁 **관련 파일**
- `functions/src/index.ts` (Line 443~460)
- `lib/utils/calculate-monthly-salary.ts` (Line 325~352)

### 📝 **목적**
근로기준법에 따라 주휴수당 지급 조건을 확인하고 금액을 계산합니다.

### 🎯 **지급 조건**

| 조건 | 설명 | 필수 여부 |
|------|------|-----------|
| **급여 유형** | 시급제만 해당 | ✅ 필수 |
| **주 근무시간** | 주 15시간 이상 근무 | ✅ 필수 |
| **결근 여부** | 해당 주에 결근이 없어야 함 | ✅ 필수 |
| **계약서 설정** | `contract.weeklyHours >= 15` 또는 `contract.allowances.weeklyHoliday == true` | ✅ 필수 |

### 🧮 **알고리즘 (Pseudo-code)**

```
function calculateWeeklyHolidayPay(weeklyWorkHours, weeklyAbsences, hourlyWage):
    
    // 1. 주휴수당 지급 자격 확인
    isWeeklyHolidayEligible = (contractWeeklyHours >= 15 OR contract.allowances.weeklyHoliday)
    
    IF salaryType != '시급' OR NOT isWeeklyHolidayEligible THEN:
        return 0  // 시급제가 아니거나 자격 없음
    END IF
    
    // 2. 주차별 주휴수당 계산
    totalWeeklyHolidayHours = 0
    
    FOR each (weekKey, weekHours) in weeklyWorkHours:
        
        // 2-1. 결근 체크
        IF weeklyAbsences[weekKey] == true THEN:
            LOG "❌ {weekKey}: 결근으로 인해 주휴수당 제외 (근무시간: {weekHours}시간)"
            CONTINUE  // 다음 주로
        END IF
        
        // 2-2. 주 15시간 이상 근무 확인
        IF weekHours >= 15 THEN:
            // 법원 판결 기준: 주휴수당 시간 = 주 근무시간 ÷ 5
            weekHolidayHours = weekHours / 5
            totalWeeklyHolidayHours += weekHolidayHours
            
            LOG "✅ {weekKey}: 주휴수당 적용 (근무시간: {weekHours}시간, 주휴수당 시간: {weekHolidayHours}시간)"
        ELSE:
            LOG "⚠️ {weekKey}: 15시간 미만으로 주휴수당 제외 (근무시간: {weekHours}시간)"
        END IF
    END FOR
    
    // 3. 주휴수당 금액 계산
    weeklyHolidayPay = round(hourlyWage × totalWeeklyHolidayHours)
    
    LOG "💰 총 주휴수당: {totalWeeklyHolidayHours}시간 × {hourlyWage}원 = {weeklyHolidayPay}원"
    
    return weeklyHolidayPay
```

### 📊 **계산 예시**

#### **예시 1: 정상 지급 (결근 없음)**

| 주차 | 근무시간 | 결근 여부 | 주휴수당 시간 | 주휴수당 금액 (시급 10,000원) |
|------|----------|-----------|--------------|------------------------------|
| W1 | 24시간 | ❌ | 24 ÷ 5 = 4.8시간 | 48,000원 |
| W2 | 20시간 | ❌ | 20 ÷ 5 = 4시간 | 40,000원 |
| W3 | 16시간 | ❌ | 16 ÷ 5 = 3.2시간 | 32,000원 |
| W4 | 18시간 | ❌ | 18 ÷ 5 = 3.6시간 | 36,000원 |
| **합계** | **78시간** | - | **15.6시간** | **156,000원** |

#### **예시 2: 결근으로 인한 제외**

| 주차 | 근무시간 | 결근 여부 | 주휴수당 시간 | 주휴수당 금액 (시급 10,000원) |
|------|----------|-----------|--------------|------------------------------|
| W1 | 24시간 | ❌ | 24 ÷ 5 = 4.8시간 | 48,000원 |
| W2 | 20시간 | ✅ (화요일 결근) | ❌ 제외 | 0원 |
| W3 | 16시간 | ❌ | 16 ÷ 5 = 3.2시간 | 32,000원 |
| W4 | 18시간 | ❌ | 18 ÷ 5 = 3.6시간 | 36,000원 |
| **합계** | **78시간** | - | **11.6시간** | **116,000원** |

#### **예시 3: 주 15시간 미만**

| 주차 | 근무시간 | 결근 여부 | 주휴수당 시간 | 주휴수당 금액 (시급 10,000원) |
|------|----------|-----------|--------------|------------------------------|
| W1 | 12시간 | ❌ | ❌ 15시간 미만 | 0원 |
| W2 | 20시간 | ❌ | 20 ÷ 5 = 4시간 | 40,000원 |
| **합계** | **32시간** | - | **4시간** | **40,000원** |

### 📋 **법적 근거**

- **근로기준법 제55조**: 사용자는 근로자에게 1주일에 평균 1회 이상의 유급휴일을 주어야 한다.
- **법원 판결 기준**: 주휴수당 = 시급 × (주 근무시간 ÷ 5)
- **최저임금법**: 주휴수당은 최저임금에 포함

### ⚠️ **주의사항**

1. **하루 최대 8시간**: 주휴수당 계산 시 하루 최대 8시간만 포함 (`min(workHours, 8)`)
2. **월급제/연봉제 제외**: 시급제만 주휴수당 지급 대상
3. **결근 체크**: 계약서 근무일인데 출근 기록이 없으면 결근으로 판단
4. **주차 구분**: `getWeekOfMonth()` 함수로 주차 계산 ("2025-01-W1" 형식)

---

## 5. 퇴직금 계산 조건

### 📁 **관련 파일**
- `functions/src/index.ts` (Line 462~480)
- `lib/utils/calculate-monthly-salary.ts` (Line 354~378)

### 📝 **목적**
근로기준법에 따라 퇴직금 지급 조건을 확인하고 금액을 계산합니다.

### 🎯 **지급 조건**

| 조건 | 설명 | 필수 여부 |
|------|------|-----------|
| **근속 기간** | 1년 이상 근속 | ✅ 필수 |
| **주 평균 근무시간** | 주 평균 15시간 이상 근무 | ✅ 필수 |
| **계약 시작일** | `contract.startDate` 존재 | ✅ 필수 |

### 🧮 **알고리즘 (Pseudo-code)**

```
function calculateSeverancePay(contract, basePay, totalAllowances, weeklyWorkHours, totalWorkHours):
    
    // 1. 계약 시작일 확인
    IF contract.startDate does not exist THEN:
        return 0  // 계약 시작일 없음
    END IF
    
    contractStartDate = new Date(contract.startDate)
    now = nowKST()  // KST 기준 현재 시간
    
    // 2. 근속 기간 계산
    daysDiff = floor((now - contractStartDate) / (1000 * 60 * 60 * 24))  // 밀리초 → 일
    yearsDiff = daysDiff / 365
    
    // 3. 주 평균 근무시간 계산
    totalWeeks = count(weeklyWorkHours)  // 근무한 주 수
    avgWeeklyHours = totalWeeks > 0 ? (totalWorkHours / totalWeeks) : 0
    
    // 4. 지급 조건 확인
    IF yearsDiff < 1 OR avgWeeklyHours < 15 THEN:
        LOG "퇴직금 미지급: 근속 {daysDiff}일, 주평균 {avgWeeklyHours}시간"
        return 0
    END IF
    
    // 5. 평균 월급 계산 (최근 3개월 → 간소화: 이번 달 급여)
    avgMonthlySalary = basePay + totalAllowances
    
    // 6. 퇴직금 계산
    // 공식: (평균급여 × 근속일수 ÷ 365) × 30일
    severancePay = round((avgMonthlySalary × daysDiff / 365) × 30)
    
    LOG "💼 퇴직금 계산: 근속 {daysDiff}일, 주평균 {avgWeeklyHours}시간, 퇴직금 {severancePay}원"
    
    return severancePay
```

### 📊 **계산 예시**

#### **예시 1: 1년 근속 (정확히 365일)**

| 항목 | 값 |
|------|-----|
| 근속 기간 | 365일 |
| 평균 월급 | 2,500,000원 |
| 주 평균 근무시간 | 20시간 |
| **퇴직금** | `(2,500,000 × 365 / 365) × 30 = 2,500,000원` |

#### **예시 2: 2년 근속**

| 항목 | 값 |
|------|-----|
| 근속 기간 | 730일 |
| 평균 월급 | 3,000,000원 |
| 주 평균 근무시간 | 25시간 |
| **퇴직금** | `(3,000,000 × 730 / 365) × 30 = 6,000,000원` |

#### **예시 3: 미지급 사유 - 근속 1년 미만**

| 항목 | 값 |
|------|-----|
| 근속 기간 | 300일 ❌ |
| 평균 월급 | 2,000,000원 |
| 주 평균 근무시간 | 20시간 |
| **퇴직금** | 0원 (1년 미만) |

#### **예시 4: 미지급 사유 - 주 평균 15시간 미만**

| 항목 | 값 |
|------|-----|
| 근속 기간 | 500일 |
| 평균 월급 | 1,500,000원 |
| 주 평균 근무시간 | 12시간 ❌ |
| **퇴직금** | 0원 (주 15시간 미만) |

### 📋 **법적 근거**

- **근로자퇴직급여 보장법 제4조**: 계속근로기간 1년에 대하여 30일분 이상의 평균임금을 퇴직금으로 지급
- **근로기준법 시행령 제6조**: 평균임금 = 사유 발생일 이전 3개월간 지급된 임금 총액 ÷ 총 일수
- **주휴수당 포함**: 평균임금 계산 시 주휴수당 포함

### ⚠️ **주의사항**

1. **간소화 계산**: 현재는 이번 달 급여로 대체 (실무에서는 최근 3개월 평균 사용)
2. **근속일수 정확도**: `daysDiff` 계산 시 밀리초 단위로 정확히 계산
3. **KST 기준**: `nowKST()` 함수로 한국 시간 기준 계산
4. **반올림**: 최종 금액은 원 단위로 반올림

---

## 6. 승인 요청 처리 로직

### 📁 **관련 파일**
- `components/admin/tabs/approvals-tab.tsx` (관리자)
- `components/employee/tabs/approvals-tab.tsx` (직원)
- `services/approvalService.ts` (예상)
- `firestore.rules` (Line 163~174)

### 📝 **목적**
직원의 휴가, 연장근무, 결근, 근무조정 신청을 관리자가 승인/반려하는 워크플로우를 처리합니다.

### 🎯 **승인 요청 유형**

| 유형 | 설명 | 승인 권한 |
|------|------|-----------|
| **휴가** | 연차, 반차, 병가 등 | manager 이상 |
| **연장근무** | 계약서 외 추가 근무 | manager 이상 |
| **결근** | 사후 결근 사유 제출 | manager 이상 |
| **근무조정** | 근무 시간/날짜 변경 | manager 이상 |

### 🧮 **알고리즘 (Pseudo-code)**

```
// 1. 직원: 승인 요청 생성
function createApproval(userId, type, date, startTime, endTime, reason, companyId):
    
    approval = {
        userId: userId,
        companyId: companyId,
        type: type,  // '휴가', '연장근무', '결근', '근무조정'
        date: date,
        startTime: startTime,
        endTime: endTime,
        reason: reason,
        status: 'pending',  // 대기 중
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }
    
    docRef = Firestore.collection('approvals').add(approval)
    
    // 알림 발송 (관리자에게)
    sendNotification(companyId, {
        type: 'approval_request',
        title: '새로운 승인 요청',
        message: `{employeeName}님이 {type} 승인을 요청했습니다.`,
        targetRole: ['admin', 'manager']
    })
    
    return docRef.id

// 2. 관리자: 승인 처리
function approveApproval(approvalId, managerId):
    
    // 2-1. 권한 확인
    manager = Firestore.collection('users').doc(managerId).get()
    IF manager.role NOT IN ['admin', 'manager'] THEN:
        throw Error('승인 권한이 없습니다.')
    END IF
    
    // 2-2. 승인 요청 조회
    approval = Firestore.collection('approvals').doc(approvalId).get()
    IF approval does not exist THEN:
        throw Error('승인 요청을 찾을 수 없습니다.')
    END IF
    
    // 2-3. 회사 일치 확인
    IF approval.companyId != manager.companyId THEN:
        throw Error('다른 회사의 승인 요청입니다.')
    END IF
    
    // 2-4. 승인 처리
    Firestore.collection('approvals').doc(approvalId).update({
        status: 'approved',
        approvedBy: managerId,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    })
    
    // 2-5. 알림 발송 (직원에게)
    sendNotification(approval.companyId, {
        type: 'approval_result',
        title: '승인 완료',
        message: `{type} 신청이 승인되었습니다.`,
        targetUserId: approval.userId
    })
    
    return true

// 3. 관리자: 반려 처리
function rejectApproval(approvalId, managerId, rejectReason):
    
    // 권한 확인 및 조회 (approveApproval과 동일)
    // ...
    
    // 반려 처리
    Firestore.collection('approvals').doc(approvalId).update({
        status: 'rejected',
        rejectedBy: managerId,
        rejectedAt: serverTimestamp(),
        rejectReason: rejectReason,
        updatedAt: serverTimestamp()
    })
    
    // 알림 발송 (직원에게)
    sendNotification(approval.companyId, {
        type: 'approval_result',
        title: '승인 반려',
        message: `{type} 신청이 반려되었습니다. 사유: {rejectReason}`,
        targetUserId: approval.userId
    })
    
    return true
```

### 📊 **상태 전이도**

```
[pending] ──(관리자 승인)──→ [approved]
    │
    └──(관리자 반려)──→ [rejected]
```

### 🔒 **Firestore Rules 권한**

```javascript
match /approvals/{approvalId} {
  // 읽기: 본인 또는 관리자
  allow read: if isAuthenticated()
    && (isOwner(resource.data.userId) || (isManager() && isSameCompany(resource.data.companyId)));
  
  // 생성: 본인만 (같은 회사)
  allow create: if isAuthenticated() 
    && isOwner(request.resource.data.userId)
    && isSameCompany(request.resource.data.companyId);
  
  // 수정: 관리자만 (같은 회사)
  allow update: if isManager() && isSameCompany(resource.data.companyId);
  
  // 삭제: 본인 또는 관리자
  allow delete: if isAuthenticated()
    && (isOwner(resource.data.userId) || (isManager() && isSameCompany(resource.data.companyId)));
}
```

### ⚠️ **주의사항**

1. **알림 연동**: 승인/반려 시 자동으로 알림 발송 (`notifications` 컬렉션)
2. **타임스탬프**: 승인/반려 시각 기록 (`approvedAt`, `rejectedAt`)
3. **반려 사유**: 반려 시 `rejectReason` 필드 필수

---

## 7. 스케줄 충돌 검증

### 📁 **관련 파일**
- `components/admin/tabs/schedule-tab.tsx`
- `services/scheduleService.ts` (예상)
- `firestore.rules` (Line 139~146)

### 📝 **목적**
관리자가 근무 스케줄을 등록할 때, 다음 조건을 검증하여 데이터 무결성을 유지합니다.

### 🎯 **검증 조건**

| 조건 | 설명 | 에러 메시지 |
|------|------|-------------|
| **시간대 중복** | 같은 직원이 같은 시간에 2개 이상의 스케줄 | "이미 스케줄이 등록되어 있습니다." |
| **연속 근무 시간** | 하루 최대 근무시간 초과 (예: 12시간) | "하루 최대 근무시간을 초과했습니다." |
| **주 최대 근무시간** | 주 40시간 초과 (선택 사항) | "주 최대 근무시간을 초과했습니다." |
| **휴게시간** | 4시간 이상 근무 시 30분 이상 휴게시간 | "휴게시간이 부족합니다." |

### 🧮 **알고리즘 (Pseudo-code)**

```
function validateScheduleConflict(userId, date, startTime, endTime, companyId):
    
    // 1. 같은 날짜의 기존 스케줄 조회
    existingSchedules = Firestore.collection('schedules')
        .where('userId', '==', userId)
        .where('date', '==', date)
        .where('companyId', '==', companyId)
        .get()
    
    // 2. 시간대 중복 검증
    FOR each schedule in existingSchedules:
        existingStart = timeToMinutes(schedule.startTime)
        existingEnd = timeToMinutes(schedule.endTime)
        newStart = timeToMinutes(startTime)
        newEnd = timeToMinutes(endTime)
        
        // 겹치는 구간 확인
        IF (newStart < existingEnd AND newEnd > existingStart) THEN:
            throw Error('이미 스케줄이 등록되어 있습니다.')
        END IF
    END FOR
    
    // 3. 하루 최대 근무시간 검증 (12시간)
    totalDailyHours = 0
    FOR each schedule in existingSchedules:
        workHours = calculateWorkHours(schedule.startTime, schedule.endTime)
        totalDailyHours += workHours
    END FOR
    
    newWorkHours = calculateWorkHours(startTime, endTime)
    totalDailyHours += newWorkHours
    
    IF totalDailyHours > 12 THEN:
        throw Error('하루 최대 근무시간(12시간)을 초과했습니다.')
    END IF
    
    // 4. 주 최대 근무시간 검증 (40시간, 선택 사항)
    weekStart = getWeekStart(date)
    weekEnd = getWeekEnd(date)
    
    weeklySchedules = Firestore.collection('schedules')
        .where('userId', '==', userId)
        .where('date', '>=', weekStart)
        .where('date', '<=', weekEnd)
        .where('companyId', '==', companyId)
        .get()
    
    totalWeeklyHours = 0
    FOR each schedule in weeklySchedules:
        workHours = calculateWorkHours(schedule.startTime, schedule.endTime)
        totalWeeklyHours += workHours
    END FOR
    
    totalWeeklyHours += newWorkHours
    
    IF totalWeeklyHours > 40 THEN:
        throw Error('주 최대 근무시간(40시간)을 초과했습니다.')
    END IF
    
    // 5. 휴게시간 검증 (4시간 이상 근무 시 30분 이상 필요)
    IF newWorkHours >= 4 THEN:
        // 실제 구현에서는 휴게시간 필드 확인 필요
        // 현재는 경고만 표시
        console.warn('4시간 이상 근무 시 30분 이상 휴게시간이 필요합니다.')
    END IF
    
    return true  // 검증 통과
```

### 📊 **시간대 중복 검증 예시**

#### **예시 1: 중복 발생**

| 구분 | 날짜 | 시작 시간 | 종료 시간 | 결과 |
|------|------|----------|----------|------|
| 기존 스케줄 | 2025-01-15 | 09:00 | 18:00 | - |
| 신규 스케줄 | 2025-01-15 | 12:00 | 21:00 | ❌ 중복 (12:00~18:00) |

#### **예시 2: 중복 없음**

| 구분 | 날짜 | 시작 시간 | 종료 시간 | 결과 |
|------|------|----------|----------|------|
| 기존 스케줄 | 2025-01-15 | 09:00 | 18:00 | - |
| 신규 스케줄 | 2025-01-15 | 18:00 | 21:00 | ✅ 정상 (겹치지 않음) |

### ⚠️ **주의사항**

1. **조건부 적용**: 주 40시간 제한은 선택 사항 (매장 설정에 따라 다름)
2. **휴게시간**: 현재는 경고만 표시 (실제로는 별도 필드로 관리 필요)
3. **야간 근무**: 자정을 넘어가는 근무 시간 처리 (예: 22:00~02:00)

---

# Priority 3 (중요 규칙)

## 8. 역할 기반 권한 검증

### 📁 **관련 파일**
- `firestore.rules` (전체)
- `middleware.ts`
- `lib/auth-context.tsx`

### 📝 **목적**
5단계 역할(super_admin, admin, manager, store_manager, employee)에 따라 데이터 접근 권한을 제어합니다.

### 🎯 **역할별 권한 매트릭스**

| 역할 | 설명 | 접근 범위 | 주요 권한 |
|------|------|-----------|----------|
| **super_admin** | 플랫폼 관리자 | 모든 회사 | 구독 플랜 관리, 초대 코드 발급, 모든 데이터 접근 |
| **admin** | 회사 관리자 | 자기 회사 | 브랜드/매장 생성, 관리자 추가, 급여/설정 관리 |
| **manager** | 매니저 | 자기 회사 | 직원 관리, 급여 관리, 승인 처리 |
| **store_manager** | 매장 관리자 | 자기 매장 | 매장 직원 관리, 출퇴근 수정, 스케줄 작성 |
| **employee** | 직원 | 본인 데이터 | 출퇴근 기록, 급여 조회, 휴가 신청 |

### 🧮 **Firestore Rules 헬퍼 함수**

```javascript
// 1. 인증 확인
function isAuthenticated() {
  return request.auth != null;
}

// 2. 역할 가져오기
function getUserRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}

// 3. 회사 ID 가져오기
function getUserCompanyId() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId;
}

// 4. Super Admin 확인
function isSuperAdmin() {
  return isAuthenticated() && getUserRole() == 'super_admin';
}

// 5. Admin 확인 (Super Admin 포함)
function isAdmin() {
  return isAuthenticated() && getUserRole() in ['admin', 'super_admin'];
}

// 6. Manager 확인 (Super Admin 포함)
function isManager() {
  return isAuthenticated() && getUserRole() in ['admin', 'manager', 'super_admin'];
}

// 7. Store Manager 확인 (Super Admin 포함)
function isStoreManager() {
  return isAuthenticated() && getUserRole() in ['admin', 'manager', 'store_manager', 'super_admin'];
}

// 8. 같은 회사 확인 (Super Admin은 우회)
function isSameCompany(companyId) {
  return isAuthenticated() && (getUserCompanyId() == companyId || isSuperAdmin());
}

// 9. 본인 데이터 확인
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}
```

### 📊 **컬렉션별 권한 매트릭스**

| 컬렉션 | 읽기 | 생성 | 수정 | 삭제 |
|--------|------|------|------|------|
| **companies** | 같은 회사 | 인증 | admin + 같은 회사 | super_admin |
| **users** | 본인 or manager | 인증 | 본인 or manager | manager |
| **contracts** | store_manager + 같은 회사 | store_manager | store_manager | manager |
| **attendance** | 본인 or store_manager | 본인 or store_manager | 본인 or store_manager | manager |
| **schedules** | 본인 or store_manager | store_manager | store_manager | store_manager |
| **salary** | 본인 or manager | manager | manager | admin |
| **approvals** | 본인 or manager | 본인 | manager | 본인 or manager |
| **notices** | 같은 회사 | manager | manager | manager |
| **brands** | 같은 회사 | admin | admin | admin |
| **stores** | 같은 회사 | admin | admin | admin |
| **subscription_plans** | 모두 | super_admin | super_admin | super_admin |
| **invitation_codes** | super_admin | super_admin | super_admin | super_admin |

### 🔒 **특수 권한 규칙**

#### **1. users 컬렉션 - role, companyId 변경 차단**

```javascript
match /users/{userId} {
  allow update: if isAuthenticated()
    && (isOwner(userId) || (isManager() && isSameCompany(resource.data.companyId)))
    // 🔥 핵심: role, companyId 변경 시도 차단 (super_admin만 허용)
    && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'companyId']) 
        || isSuperAdmin());
}
```

**목적**: 직원이 자신의 role을 admin으로 변경하여 권한 탈취하는 것을 방지

#### **2. invitation_codes - super_admin만 접근**

```javascript
match /invitation_codes/{codeId} {
  allow read: if isSuperAdmin();
  allow create: if isSuperAdmin();
  allow update: if isSuperAdmin();
  allow delete: if isSuperAdmin();
}
```

**목적**: 초대 코드는 플랫폼 관리자만 관리 (열거 공격 차단)

### ⚠️ **주의사항**

1. **다중 테넌트 격리**: 모든 데이터는 `companyId`로 격리 (Super Admin 제외)
2. **최소 권한 원칙**: 필요한 최소한의 권한만 부여
3. **서버 단 검증**: 민감한 로직은 Admin SDK 사용 (Rules 우회)

---

## 9. 계약서 서명 프로세스

### 📁 **관련 파일**
- `app/contract-sign/page.tsx`
- `firestore.rules` (Line 238~248)

### 📝 **목적**
직원이 근로 계약서에 전자 서명하여 법적 효력을 갖는 계약을 체결합니다.

### 🎯 **서명 프로세스**

```
1. 관리자: 계약서 작성 (contracts 컬렉션)
   ↓
2. 관리자: 계약서 URL 발송 (이메일/SMS)
   ↓
3. 직원: 계약서 URL 접속
   ↓
4. 직원: 계약 내용 확인
   ↓
5. 직원: 전자 서명 (Canvas 서명 or 텍스트 서명)
   ↓
6. 시스템: 서명 데이터 암호화 저장 (signedContracts 컬렉션)
   ↓
7. 시스템: 계약서 상태 변경 (pending → signed)
```

### 🧮 **알고리즘 (Pseudo-code)**

```
// 1. 계약서 URL 생성 (관리자)
function generateContractUrl(contractId):
    baseUrl = "https://abcdc-staff-system.pages.dev"
    contractUrl = `${baseUrl}/contract-sign?id=${contractId}`
    
    return contractUrl

// 2. 계약서 조회 (직원)
function loadContract(contractId):
    contract = Firestore.collection('contracts').doc(contractId).get()
    
    IF contract does not exist THEN:
        throw Error('계약서를 찾을 수 없습니다.')
    END IF
    
    IF contract.status == 'signed' THEN:
        throw Error('이미 서명된 계약서입니다.')
    END IF
    
    return contract

// 3. 전자 서명 (직원)
function signContract(contractId, userId, signatureData):
    
    // 3-1. 계약서 조회
    contract = Firestore.collection('contracts').doc(contractId).get()
    
    IF contract.userId != userId THEN:
        throw Error('본인의 계약서가 아닙니다.')
    END IF
    
    IF contract.status == 'signed' THEN:
        throw Error('이미 서명된 계약서입니다.')
    END IF
    
    // 3-2. 서명 데이터 암호화 (실제로는 암호화 라이브러리 사용)
    encryptedSignature = encrypt(signatureData)
    
    // 3-3. 서명된 계약서 저장 (signedContracts 컬렉션)
    signedContract = {
        contractId: contractId,
        userId: userId,
        companyId: contract.companyId,
        signatureData: encryptedSignature,
        signedAt: serverTimestamp(),
        ipAddress: getClientIP(),
        userAgent: getUserAgent(),
        status: 'signed',
        createdAt: serverTimestamp()
    }
    
    docRef = Firestore.collection('signedContracts').add(signedContract)
    
    // 3-4. 원본 계약서 상태 변경
    Firestore.collection('contracts').doc(contractId).update({
        status: 'signed',
        signedAt: serverTimestamp(),
        signedContractId: docRef.id
    })
    
    // 3-5. 알림 발송 (관리자에게)
    sendNotification(contract.companyId, {
        type: 'contract_signed',
        title: '계약서 서명 완료',
        message: `{employeeName}님이 계약서에 서명했습니다.`,
        targetRole: ['admin', 'manager']
    })
    
    return docRef.id
```

### 📊 **서명 데이터 구조**

#### **contracts 컬렉션 (원본 계약서)**

```json
{
  "contractId": "contract_123",
  "userId": "user_456",
  "companyId": "company_789",
  "employeeName": "홍길동",
  "salaryType": "시급",
  "salaryAmount": 10000,
  "workDays": "월,화,수,목,금",
  "status": "signed",  // "pending" → "signed"
  "signedAt": "2025-01-15T10:30:00Z",
  "signedContractId": "signedContract_abc"
}
```

#### **signedContracts 컬렉션 (서명 기록)**

```json
{
  "contractId": "contract_123",
  "userId": "user_456",
  "companyId": "company_789",
  "signatureData": "encrypted_base64_data",
  "signedAt": "2025-01-15T10:30:00Z",
  "ipAddress": "123.456.789.0",
  "userAgent": "Mozilla/5.0...",
  "status": "signed"
}
```

### 🔒 **Firestore Rules 권한**

```javascript
match /signedContracts/{contractId} {
  // 읽기: 관리자 또는 본인
  allow read: if isAuthenticated()
    && ((isStoreManager() && isSameCompany(resource.data.companyId))
    || isOwner(resource.data.userId));
  
  // 생성: 본인만 (같은 회사)
  allow create: if isAuthenticated()
    && isOwner(request.resource.data.userId)
    && isSameCompany(request.resource.data.companyId);
  
  // 수정: 금지 (서명 후 수정 불가)
  allow update: if false;
  
  // 삭제: admin만 (같은 회사)
  allow delete: if isAdmin() && isSameCompany(resource.data.companyId);
}
```

### ⚠️ **주의사항**

1. **서명 불변성**: 서명 후 수정 불가 (`allow update: if false`)
2. **IP/UserAgent 기록**: 법적 효력을 위해 서명 환경 기록
3. **암호화**: 서명 데이터는 암호화하여 저장 (Base64 인코딩 + AES 암호화)
4. **이메일 알림**: 서명 완료 시 관리자에게 알림

---

## 10. 구독 플랜 제한 로직

### 📁 **관련 파일**
- `firestore.rules` (Line 261~268)
- `services/subscriptionService.ts` (예상)

### 📝 **목적**
회사의 구독 플랜에 따라 최대 사용자 수, 기능 제한 등을 적용합니다.

### 🎯 **플랜별 제한 사항**

| 플랜 | 월 요금 | 최대 사용자 수 | 제한 사항 |
|------|---------|----------------|-----------|
| **Free** | 0원 | 5명 | 기본 기능만 사용 가능 |
| **Basic** | 50,000원 | 20명 | 출퇴근, 급여, 스케줄 |
| **Premium** | 150,000원 | 100명 | 승인, 공지, 알림 추가 |
| **Enterprise** | 별도 문의 | 무제한 | 모든 기능 + 커스터마이징 |

### 🧮 **알고리즘 (Pseudo-code)**

```
// 1. 직원 추가 시 플랜 확인
function checkUserLimit(companyId):
    
    // 1-1. 회사 정보 조회
    company = Firestore.collection('companies').doc(companyId).get()
    subscription = company.subscription
    
    // 1-2. 현재 사용자 수 조회
    usersSnapshot = Firestore.collection('users')
        .where('companyId', '==', companyId)
        .where('status', '==', 'active')
        .get()
    
    currentUserCount = usersSnapshot.size
    
    // 1-3. 플랜별 최대 사용자 수 확인
    maxUsers = subscription.maxUsers  // Free: 5, Basic: 20, Premium: 100, Enterprise: Infinity
    
    IF currentUserCount >= maxUsers THEN:
        throw Error(`플랜 제한에 도달했습니다. (최대 ${maxUsers}명)`)
    END IF
    
    return true

// 2. 기능 사용 시 플랜 확인
function checkFeatureAccess(companyId, featureName):
    
    // 2-1. 회사 정보 조회
    company = Firestore.collection('companies').doc(companyId).get()
    planType = company.subscription.planType  // 'free', 'basic', 'premium', 'enterprise'
    
    // 2-2. 플랜별 기능 제한 매트릭스
    featureMatrix = {
        'free': ['attendance', 'salary'],
        'basic': ['attendance', 'salary', 'schedule', 'contracts'],
        'premium': ['attendance', 'salary', 'schedule', 'contracts', 'approvals', 'notices', 'notifications'],
        'enterprise': ['all']
    }
    
    allowedFeatures = featureMatrix[planType]
    
    IF featureName NOT IN allowedFeatures AND planType != 'enterprise' THEN:
        throw Error(`이 기능은 ${planType} 플랜에서 사용할 수 없습니다.`)
    END IF
    
    return true

// 3. 플랜 만료 확인
function checkSubscriptionExpiry(companyId):
    
    company = Firestore.collection('companies').doc(companyId).get()
    subscription = company.subscription
    
    IF subscription.endDate < currentDate THEN:
        throw Error('구독이 만료되었습니다. 플랜을 갱신해주세요.')
    END IF
    
    return true
```

### 📊 **기능 매트릭스**

| 기능 | Free | Basic | Premium | Enterprise |
|------|------|-------|---------|-----------|
| 출퇴근 관리 | ✅ | ✅ | ✅ | ✅ |
| 급여 계산 | ✅ | ✅ | ✅ | ✅ |
| 스케줄 관리 | ❌ | ✅ | ✅ | ✅ |
| 계약서 작성 | ❌ | ✅ | ✅ | ✅ |
| 승인 요청 | ❌ | ❌ | ✅ | ✅ |
| 공지사항 | ❌ | ❌ | ✅ | ✅ |
| 알림 발송 | ❌ | ❌ | ✅ | ✅ |
| 커스터마이징 | ❌ | ❌ | ❌ | ✅ |

### ⚠️ **주의사항**

1. **플랜 업그레이드**: 업그레이드 즉시 적용, 다운그레이드는 갱신일에 적용
2. **사용자 수 초과**: Free → Basic 업그레이드 권장 (사용자 추가 전에 확인)
3. **만료 처리**: 만료 30일 전 알림, 만료 시 읽기 전용 모드

---

## 11. 공휴일 판정 로직

### 📁 **관련 파일**
- `functions/src/index.ts` (Line 116~133)
- `lib/utils/salary-calculator.ts`

### 📝 **목적**
공휴일에 근무한 경우 휴일 수당(150% 가산)을 지급하기 위해 공휴일 여부를 판정합니다.

### 🎯 **공휴일 목록 (2025년)**

```javascript
const publicHolidays2025 = [
  '2025-01-01',  // 신정
  '2025-01-28', '2025-01-29', '2025-01-30',  // 설날 연휴
  '2025-03-01',  // 삼일절
  '2025-03-05',  // 부처님오신날
  '2025-05-05',  // 어린이날
  '2025-05-06',  // 대체공휴일
  '2025-06-06',  // 현충일
  '2025-08-15',  // 광복절
  '2025-10-03',  // 개천절
  '2025-10-05', '2025-10-06', '2025-10-07',  // 추석 연휴
  '2025-10-09',  // 한글날
  '2025-12-25',  // 크리스마스
];
```

### 🧮 **알고리즘 (Pseudo-code)**

```
function isPublicHoliday(dateStr):
    
    // 1. 고정 공휴일 확인
    IF dateStr IN publicHolidays2025 THEN:
        return true
    END IF
    
    // 2. 대체 공휴일 확인 (구현 예정)
    // 공휴일이 일요일이면 다음 평일이 대체 공휴일
    
    return false

function calculateHolidayPay(attendances, contract, hourlyWage):
    
    totalHolidayHours = 0
    
    FOR each attendance in attendances:
        
        IF isPublicHoliday(attendance.date) THEN:
            workHours = calculateWorkHours(attendance.checkIn, attendance.checkOut)
            totalHolidayHours += workHours
            
            LOG "🎉 공휴일 근무 감지: {attendance.date}, {workHours}시간"
        END IF
    END FOR
    
    IF contract.allowances.holiday AND totalHolidayHours > 0 THEN:
        holidayPay = round(hourlyWage × 1.5 × totalHolidayHours)
        return holidayPay
    END IF
    
    return 0
```

### 📊 **휴일 수당 계산 예시**

| 날짜 | 공휴일 | 근무시간 | 시급 | 휴일 수당 |
|------|--------|----------|------|----------|
| 2025-01-01 | ✅ 신정 | 8시간 | 10,000원 | 10,000 × 1.5 × 8 = 120,000원 |
| 2025-03-01 | ✅ 삼일절 | 6시간 | 12,000원 | 12,000 × 1.5 × 6 = 108,000원 |
| 2025-05-05 | ✅ 어린이날 | 4시간 | 15,000원 | 15,000 × 1.5 × 4 = 90,000원 |

### ⚠️ **주의사항**

1. **공휴일 API 연동**: 실무에서는 공공데이터 포털 API 사용 (`NEXT_PUBLIC_HOLIDAY_API_KEY`)
2. **대체 공휴일**: 공휴일이 일요일이면 다음 평일이 대체 공휴일 (자동 계산 필요)
3. **매장별 휴무일**: 공휴일이어도 매장이 영업하면 수당 지급

---

## 📌 **문서 관리 규칙**

### **1. 로직 수정 시**

```
1. 이 문서 열기 (BUSINESS_LOGIC.md)
2. 해당 섹션 찾기 (Ctrl+F)
3. Pseudo-code 수정
4. 예시 업데이트
5. 주의사항 추가
6. 파일 저장 및 커밋
```

### **2. 새 로직 추가 시**

```
1. 적절한 Priority 섹션 선택
2. 새 섹션 생성 (템플릿 사용)
3. 관련 파일, 목적, 입력/출력 작성
4. Pseudo-code 작성
5. 예시 및 주의사항 추가
6. 목차 업데이트
```

### **3. 문서 템플릿**

```markdown
## X. 로직명

### 📁 **관련 파일**
- `파일 경로` (설명)

### 📝 **목적**
이 로직의 목적을 한 문장으로 설명

### 🎯 **입력/출력**

**입력**:
- 입력 파라미터 설명

**출력**:
- 출력 결과 설명

### 🧮 **알고리즘 (Pseudo-code)**

```
function 함수명(파라미터):
    // 알고리즘 작성
```

### 📊 **계산 예시**

| 항목 | 값 |
|------|-----|
| 예시 | 데이터 |

### ⚠️ **주의사항**

1. 주의사항 1
2. 주의사항 2
```

---

## 11. 공휴일 자동 동기화 로직 ⭐⭐⭐

### 📋 **개요**

행정안전부 공공데이터 API를 통해 공휴일을 자동으로 동기화하여, 관리자가 매년 수동으로 입력할 필요 없이 완전 자동화된 공휴일 관리를 제공합니다.

**목적:**
- 매년 공휴일 수동 입력 작업 제거 (완전 자동화)
- 대체공휴일, 임시공휴일 자동 반영
- 관리자 개입 없이 공휴일 데이터 최신 유지

### 🔍 **관련 파일**

| 파일 | 역할 |
|------|------|
| `functions/src/index.ts` | Cloud Functions 스케줄러 및 API |
| `services/holidayService.ts` | 클라이언트 공휴일 CRUD |
| `components/admin/tabs/settings-tab.tsx` | 공휴일 관리 UI |

### 📊 **자동화 아키텍처**

```
[행정안전부 공공데이터 API]
         ↓
[Cloud Functions Scheduler]  ← 매년 1월 1일 00:00 KST
         ↓
[fetchHolidaysFromAPI]  ← API 호출 및 파싱
         ↓
[Firestore: holidays 컬렉션]  ← 중복 체크 후 저장
         ↓
[급여 계산 로직]  ← 공휴일 수당 자동 계산
```

### 🤖 **1) 자동 동기화 스케줄러**

**실행 주기:**
- **매년 1월 1일 00:00 (KST)** 자동 실행
- 올해 + 내년 공휴일 동기화 (2년치)

**Pseudo-code:**
```
function syncHolidaysScheduled():
  try:
    API_KEY = process.env.HOLIDAY_API_KEY
    if API_KEY is null:
      log("❌ API 키 없음")
      return
    
    currentYear = new Date().getFullYear()
    nextYear = currentYear + 1
    years = [currentYear, nextYear]
    
    totalSynced = 0
    
    for year in years:
      log("📅 {year}년 공휴일 동기화 중...")
      
      // API에서 공휴일 가져오기
      holidays = fetchHolidaysFromAPI(year, API_KEY)
      
      if holidays.length == 0:
        log("⚠️ {year}년 공휴일 불러오기 실패")
        continue
      
      syncedCount = 0
      
      for holiday in holidays:
        // 중복 체크
        existing = db.collection('holidays')
          .where('date', '==', holiday.date)
          .limit(1)
          .get()
        
        if existing.empty:
          // 신규 공휴일 추가
          db.collection('holidays').add({
            date: holiday.date,        // "YYYY-MM-DD"
            name: holiday.name,        // "설날", "추석"
            year: holiday.year,        // 2025
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          syncedCount++
          log("✅ 공휴일 추가: {holiday.date} - {holiday.name}")
        else:
          log("⏭️ 이미 존재: {holiday.date} - {holiday.name}")
      
      log("✅ {year}년 공휴일 동기화 완료: {syncedCount}개 추가")
      totalSynced += syncedCount
    
    log("🎉 공휴일 자동 동기화 완료: 총 {totalSynced}개 추가")
    
  catch error:
    log("❌ 공휴일 자동 동기화 실패", error)
    throw error
```

### 🌐 **2) API 호출 및 파싱**

**행정안전부 공공데이터 API:**
- **URL**: `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo`
- **파라미터**:
  - `solYear`: 연도 (예: 2025)
  - `numOfRows`: 50 (최대 공휴일 개수)
  - `ServiceKey`: API 인증키
  - `_type`: json (응답 형식)

**Pseudo-code:**
```
function fetchHolidaysFromAPI(year, apiKey):
  try:
    url = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"
    params = {
      solYear: year,
      numOfRows: 50,
      ServiceKey: apiKey,
      _type: "json"
    }
    
    response = fetch(url + params)
    data = response.json()
    
    // API 응답 구조 확인
    items = data?.response?.body?.items?.item
    
    if items is null:
      log("❌ 공휴일 API 응답 오류", data)
      return []
    
    // 배열 변환 (단일 항목인 경우 배열로 감싸기)
    itemsArray = Array.isArray(items) ? items : [items]
    
    // Holiday 형식으로 변환
    holidays = []
    for item in itemsArray:
      dateStr = String(item.locdate)  // YYYYMMDD 형식
      
      // "YYYY-MM-DD" 형식으로 변환
      formattedDate = dateStr[0:4] + "-" + dateStr[4:6] + "-" + dateStr[6:8]
      
      holidays.push({
        date: formattedDate,           // "2025-01-29"
        name: item.dateName || "공휴일",  // "설날"
        year: year                     // 2025
      })
    
    log("✅ {year}년 공휴일 {holidays.length}개 불러옴 (공공 API)")
    return holidays
    
  catch error:
    log("❌ 공휴일 API 호출 실패", error)
    return []
```

### 🔧 **3) 수동 동기화 API (긴급용)**

**용도:**
- 테스트 및 디버깅
- 중간에 공휴일 추가 발표 시 긴급 동기화
- 관리자가 특정 연도만 동기화하고 싶을 때

**호출 방법:**
```javascript
// 클라이언트에서 호출
const syncHolidays = httpsCallable(functions, 'syncHolidays');
const result = await syncHolidays({ year: 2025 });

console.log(result.data);
// {
//   success: true,
//   year: 2025,
//   totalCount: 17,
//   syncedCount: 5,
//   message: "2025년 공휴일 5개가 동기화되었습니다."
// }
```

**Pseudo-code:**
```
function syncHolidays(data, context):
  try:
    // 인증 체크 (관리자만)
    if context.auth is null:
      throw HttpsError("unauthenticated", "인증이 필요합니다.")
    
    year = data.year || new Date().getFullYear()
    API_KEY = process.env.HOLIDAY_API_KEY
    
    if API_KEY is null:
      throw HttpsError("failed-precondition", "API 키 없음")
    
    log("📅 {year}년 공휴일 수동 동기화 시작...")
    
    // API에서 공휴일 가져오기
    holidays = fetchHolidaysFromAPI(year, API_KEY)
    
    if holidays.length == 0:
      throw HttpsError("not-found", "{year}년 공휴일 불러오기 실패")
    
    // Firestore에 저장 (중복 체크)
    syncedCount = 0
    for holiday in holidays:
      existing = db.collection('holidays')
        .where('date', '==', holiday.date)
        .limit(1)
        .get()
      
      if existing.empty:
        db.collection('holidays').add({
          ...holiday,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        syncedCount++
    
    log("✅ {year}년 공휴일 동기화 완료: {syncedCount}개 추가")
    
    return {
      success: true,
      year: year,
      totalCount: holidays.length,
      syncedCount: syncedCount,
      message: "{year}년 공휴일 {syncedCount}개가 동기화되었습니다."
    }
    
  catch error:
    log("❌ 공휴일 동기화 오류", error)
    
    if error is HttpsError:
      throw error
    
    throw HttpsError("internal", "공휴일 동기화 중 오류 발생", error.message)
```

### 📊 **API 응답 예시**

**행정안전부 API 응답:**
```json
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL SERVICE."
    },
    "body": {
      "items": {
        "item": [
          {
            "dateKind": "01",
            "dateName": "설날",
            "isHoliday": "Y",
            "locdate": 20250129,
            "seq": 1
          },
          {
            "dateKind": "01",
            "dateName": "추석",
            "isHoliday": "Y",
            "locdate": 20251006,
            "seq": 2
          }
        ]
      },
      "numOfRows": 50,
      "pageNo": 1,
      "totalCount": 17
    }
  }
}
```

**변환 후 Firestore 저장:**
```json
{
  "date": "2025-01-29",
  "name": "설날",
  "year": 2025,
  "createdAt": Timestamp,
  "updatedAt": Timestamp
}
```

### 🔐 **환경변수 설정**

**로컬 개발 (.env.local):**
```bash
NEXT_PUBLIC_HOLIDAY_API_KEY=893a0ba24b1ee451911011b27725db1faca861e1780369475bd16e2799a56293
```

**Cloud Functions (functions/.env):**
```bash
HOLIDAY_API_KEY=893a0ba24b1ee451911011b27725db1faca861e1780369475bd16e2799a56293
```

**GitHub Actions Secrets:**
```
NEXT_PUBLIC_HOLIDAY_API_KEY=<API 키>
```

### 📅 **실행 스케줄**

| 시간 (KST) | 작업 | 설명 |
|------------|------|------|
| 매년 1월 1일 00:00 | 자동 동기화 | 올해 + 내년 공휴일 |
| 수동 | 긴급 동기화 API | 중간 공휴일 추가 시 |

### ⚙️ **Firebase Cloud Scheduler 설정**

**Cron 표현식:**
```
0 0 1 1 *
```
- 분: 0
- 시: 0 (UTC 00:00 = KST 09:00이므로 주의!)
- 일: 1
- 월: 1
- 요일: * (매년)

**실제 설정:**
```typescript
.pubsub
  .schedule('0 0 1 1 *')  // 매년 1월 1일 00:00 UTC
  .timeZone('Asia/Seoul')  // 한국 시간대로 변환
```

### 📊 **계산 예시**

**2025년 공휴일 동기화 (17개):**

| 날짜 | 공휴일 이름 | 비고 |
|------|------------|------|
| 2025-01-01 | 신정 | |
| 2025-01-28 | 설날 연휴 | |
| 2025-01-29 | 설날 | |
| 2025-01-30 | 설날 연휴 | |
| 2025-03-01 | 삼일절 | |
| 2025-03-05 | 부처님오신날 | |
| 2025-05-05 | 어린이날 | |
| 2025-05-06 | 대체공휴일 | 자동 반영 ⭐ |
| 2025-06-06 | 현충일 | |
| 2025-08-15 | 광복절 | |
| 2025-10-03 | 개천절 | |
| 2025-10-05 | 추석 연휴 | |
| 2025-10-06 | 추석 | |
| 2025-10-07 | 추석 연휴 | |
| 2025-10-09 | 한글날 | |
| 2025-12-25 | 크리스마스 | |

**자동 동기화 로그 예시:**
```
[2025-01-01 00:00:00] 🔄 공휴일 자동 동기화 시작...
[2025-01-01 00:00:01] 📅 2025년 공휴일 동기화 중...
[2025-01-01 00:00:02] ✅ 공휴일 추가: 2025-01-01 - 신정
[2025-01-01 00:00:02] ✅ 공휴일 추가: 2025-01-28 - 설날 연휴
[2025-01-01 00:00:02] ⏭️ 이미 존재: 2025-01-29 - 설날
...
[2025-01-01 00:00:05] ✅ 2025년 공휴일 동기화 완료: 12개 추가
[2025-01-01 00:00:05] 📅 2026년 공휴일 동기화 중...
[2025-01-01 00:00:08] ✅ 2026년 공휴일 동기화 완료: 16개 추가
[2025-01-01 00:00:08] 🎉 공휴일 자동 동기화 완료: 총 28개 추가
```

### ⚠️ **주의사항**

1. **API 키 관리**
   - 공공데이터포털 API 키는 절대 하드코딩 금지
   - 환경변수 또는 GitHub Secrets로만 관리
   - API 키 만료 시 갱신 필요

2. **중복 방지**
   - 날짜 (`date`) 기준으로 중복 체크
   - 이미 존재하는 공휴일은 스킵 (업데이트 안 함)
   - 공휴일 이름이 바뀔 수 있으므로 수동 수정 허용

3. **대체공휴일 자동 반영**
   - 행정안전부 API가 대체공휴일을 자동 포함
   - 예: 2025년 5월 6일 (어린이날 대체공휴일)
   - 수동 입력 필요 없음 ⭐

4. **타임존 주의**
   - Cloud Scheduler는 UTC 기준
   - `.timeZone('Asia/Seoul')` 설정 필수
   - Cron: `0 0 1 1 *` = 매년 1월 1일 00:00 KST

5. **급여 계산 연동**
   - 공휴일 수당 계산 시 자동 반영
   - `isHoliday(dateStr, holidays)` 함수 사용
   - 급여 계산 로직 수정 불필요

6. **수동 개입 불필요**
   - 스케줄러가 자동 실행
   - 관리자 손 안 대도 매년 업데이트
   - 긴급 시에만 수동 API 사용

### 🔗 **관련 로직**

- **[로직 1] 급여 계산 로직** - 공휴일 수당 자동 계산
- **[로직 11] 공휴일 판정 로직** - `isHoliday()` 함수

---

## 🔗 **관련 문서**

- [README.md](./README.md) - 프로젝트 개요
- [STRUCTURE.md](./STRUCTURE.md) - 사용자 계층 구조
- [FIRESTORE_COLLECTIONS.md](./FIRESTORE_COLLECTIONS.md) - 컬렉션 명세
- [FIELD_NAMING_STANDARD.md](./FIELD_NAMING_STANDARD.md) - 필드 명명 규칙
- [SECURITY.md](./SECURITY.md) - 보안 가이드
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) - 변경 이력

---

**마지막 업데이트**: 2025-12-26  
**버전**: v1.1.0  
**작성자**: Claude Code Assistant (사장님과 함께)
