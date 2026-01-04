# BUSINESS_LOGIC.md

**Version**: v2.0.0 (대수술 완료)  
**Last Updated**: 2025-12-31  
**Purpose**: ABC Staff System의 핵심 비즈니스 로직을 '사람의 말(자연어) + 의사 코드(Pseudo-code)'로 정리

---

## 📌 **중요 공지**

**⚠️ 이 문서는 코드와 함께 업데이트되어야 합니다!**

- **함수 수정 시**: 해당 로직의 문서도 함께 수정
- **로직 변경 시**: 알고리즘 명세서를 먼저 검토하고 수정
- **새 로직 추가 시**: 이 문서에 새로운 섹션 추가

### **🔥 v2.0.0 주요 변경사항 (대수술 완료)**

**⚠️ [CRITICAL] 급여 계산은 오직 서버(functions/src/index.ts)에서만 수행!**

1. **클라이언트 계산 로직 완전 제거** (lib/utils/salary-calculator.ts 경량화)
2. **서버 14단계 파이프라인 도입** (functions/src/index.ts)
3. **데이터 무결성 보장** (parseMoney, sanitizeTimestamps 필수)
4. **표준 필드명 전면 적용** (salaryAmount, clockIn, userId)

---

## 📚 **목차**

### **Priority 1 (매우 복잡 + 핵심)**
1. [급여 계산 로직 (14단계 서버 파이프라인)](#1-급여-계산-로직-14단계-서버-파이프라인)
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

### **데이터 무결성**
12. [parseMoney - 숫자 필드 안전 파싱](#12-parsemoney---숫자-필드-안전-파싱)
13. [sanitizeTimestamps - Timestamp 재귀 변환](#13-sanitizetimestamps---timestamp-재귀-변환)

---

# Priority 1 (매우 복잡 + 핵심)

## 1. 급여 계산 로직 (14단계 서버 파이프라인)

### 📁 **관련 파일**
- **서버**: `functions/src/index.ts` (calculateMonthlySalary, 800줄)
- **타입**: `functions/src/types/salary.ts` (Zod 스키마, 300줄)
- **클라이언트**: `hooks/admin/useSalaryLogic.ts` (서버 호출만, 200줄)

### 📝 **목적**
직원의 한 달 급여를 **서버에서만** 계산하여 기본급, 수당, 공제를 반영한 실수령액을 산출합니다.

### ⚠️ **중요 제약사항**
1. **급여 계산은 오직 Cloud Functions에서만 수행**
2. **클라이언트는 서버의 계산 결과를 표시만**
3. **parseMoney로 모든 숫자 필드 안전 파싱**
4. **sanitizeTimestamps로 모든 Timestamp 변환**

### 🎯 **입력/출력**

**입력** (Cloud Functions 호출):
```typescript
{
  employeeUid: string;  // 직원 UID
  yearMonth: string;    // "YYYY-MM" 형식
}
```

**출력**:
```typescript
{
  success: boolean;
  data: SalaryCalculationResult;
  error?: string;
}
```

**SalaryCalculationResult 구조**:
```typescript
{
  // 기본 정보
  employeeName: string;
  userId: string;
  employeeUid: string;
  storeName?: string;
  yearMonth: string;
  
  // 급여 형태
  salaryType: string;        // "시급", "월급", "연봉"
  hourlyWage: number;
  monthlyWage: number;
  annualWage: number;
  
  // 근무 시간
  totalWorkHours: number;
  totalOvertimeHours: number;
  totalNightHours: number;
  totalHolidayHours: number;
  
  // 급여 항목
  basePay: number;           // 기본급
  overtimePay: number;       // 연장근로 수당
  nightPay: number;          // 야간근로 수당
  holidayPay: number;        // 휴일근로 수당
  weeklyHolidayPay: number;  // 주휴수당
  incentivePay: number;      // 인센티브
  severancePay: number;      // 퇴직금
  totalAllowances: number;   // 총 수당
  
  // 공제 항목
  nationalPension: number;       // 국민연금 (4.5%)
  healthInsurance: number;       // 건강보험 (3.545%)
  longTermCare: number;          // 장기요양 (건강보험 × 12.95% × 0.5)
  employmentInsurance: number;   // 고용보험 (0.9%)
  incomeTax: number;             // 소득세 (3.3%)
  totalDeductions: number;       // 총 공제액
  
  // 최종 금액
  totalPay: number;          // 총 지급액 (공제 전)
  netPay: number;            // 실지급액 (공제 후)
  
  // 근무 정보
  workDays: number;
  attendanceDetails: AttendanceDetail[];
  
  // 계약 정보
  contractInfo: {
    weeklyHours: number;
    isWeeklyHolidayEligible: boolean;
    has4Insurance: boolean;
    hasPension: boolean;
    hasHealthInsurance: boolean;
    hasEmploymentInsurance: boolean;
    hasWorkCompInsurance: boolean;
  };
}
```

### 🧮 **알고리즘: 14단계 서버 파이프라인**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  서버 급여 계산 파이프라인 (functions/src/index.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calculateMonthlySalary(employeeUid: string, yearMonth: string):
    
    // ============================================================
    // Phase A: 초기화 및 데이터 준비
    // ============================================================
    
    // 1️⃣ 공휴일 데이터 로드
    // - Firestore 'holidays' 컬렉션 조회
    // - 없으면 공휴일 API 동기화
    // - 실패 시 2025년 하드코딩 데이터 사용
    
    holidays = loadHolidays(year)
    publicHolidays2025 = [
        '2025-01-01',       // 신정
        '2025-01-28', '2025-01-29', '2025-01-30',  // 설날 연휴
        '2025-03-01',       // 삼일절
        '2025-03-05',       // 부처님오신날
        '2025-05-05',       // 어린이날
        '2025-05-06',       // 대체공휴일
        '2025-06-06',       // 현충일
        '2025-08-15',       // 광복절
        '2025-10-03',       // 개천절
        '2025-10-05', '2025-10-06', '2025-10-07',  // 추석 연휴
        '2025-10-09',       // 한글날
        '2025-12-25'        // 크리스마스
    ]
    
    IF holidays.length == 0 THEN:
        holidays = publicHolidays2025  // Fallback
    END IF
    
    // 2️⃣ 매장 출퇴근 허용시간 조회
    // - Firestore 'stores' 컬렉션에서 storeName으로 조회
    // - 없으면 기본값 사용
    
    thresholds = {
        earlyClockIn: 15,    // 조기 출근 허용 (분)
        earlyClockOut: 5,    // 조기 퇴근 허용 (분)
        overtime: 5          // 초과근무 시작 기준 (분)
    }
    
    IF storeName exists THEN:
        storeData = Firestore.query('stores', 
            where: name == storeName AND companyId == companyId)
        
        IF storeData.attendanceThresholds exists THEN:
            thresholds = storeData.attendanceThresholds
        END IF
    END IF
    
    // ============================================================
    // Phase B: 급여 기본 정보 파싱
    // ============================================================
    
    // 3️⃣ 급여 정보 파싱 (parseMoney 필수)
    // - salaryAmount: contract.salaryAmount || contract.wageAmount
    // - parseMoney로 콤마 제거 및 NaN 방지
    
    salaryAmount = parseMoney(contract.salaryAmount || contract.wageAmount)
    
    IF salaryAmount == 0 THEN:
        functions.logger.warn('급여 정보 없음')
        return emptyResult  // 모든 필드 0으로 초기화
    END IF
    
    // 급여 유형 결정
    salaryType = contract.salaryType || contract.wageType || '시급'
    
    // 시급 계산
    IF salaryType == '시급' THEN:
        hourlyWage = salaryAmount
        monthlyWage = 0
        annualWage = 0
    
    ELSE IF salaryType == '월급' THEN:
        monthlyWage = salaryAmount
        hourlyWage = salaryAmount / 209  // 월 209시간 기준
        annualWage = 0
    
    ELSE IF salaryType == '연봉' THEN:
        annualWage = salaryAmount
        monthlyWage = salaryAmount / 12
        hourlyWage = salaryAmount / 12 / 209
    
    END IF
    
    functions.logger.info('급여 정보', {
        salaryType, salaryAmount, hourlyWage, monthlyWage, annualWage
    })
    
    // ============================================================
    // Phase C: 출퇴근 기록 분석 준비
    // ============================================================
    
    // 4️⃣ 출퇴근 기록 분석 준비
    // - Firestore 'attendance' 컬렉션 조회
    // - companyId, userId, date 범위로 필터링
    // - sanitizeTimestamps로 Timestamp 변환
    
    attendances = Firestore.query('attendance',
        where: companyId == companyId
        AND userId == employeeUid
        AND date >= startOfMonth
        AND date <= endOfMonth
    )
    
    attendances = attendances.map(att => sanitizeTimestamps(att))
    
    // 결석일 확인
    workDays = parseWorkDays(contract.workDays)  // "월,화,수,목,금" → [1,2,3,4,5]
    attendanceDates = Set(attendances.map(att => att.date))
    
    FOR each day in monthRange DO:
        weekday = day.getDay()  // 0=일요일, 1=월요일, ...
        weekKey = getWeekOfMonth(day)  // "2025-12-W3"
        
        IF weekday in workDays AND day not in attendanceDates THEN:
            functions.logger.warn('결석 감지', { date: day, weekKey })
            weeklyAbsences[weekKey] = true
        END IF
    END FOR
    
    // ============================================================
    // Phase D: 출퇴근 기록 순회 및 계산
    // ============================================================
    
    // 5️⃣ 기록 순회 및 계산
    // - 각 출퇴근 기록에 대해:
    //   ① 조기출근/조기퇴근 보정
    //   ② 초과근무 계산
    //   ③ 야간근무 계산 (22:00~06:00)
    //   ④ 공휴일 여부 확인
    //   ⑤ 인센티브 수당 계산
    //   ⑥ 주차별 근무시간 누적
    
    totalWorkHours = 0
    totalOvertimeHours = 0
    totalNightHours = 0
    totalHolidayHours = 0
    totalIncentiveAmount = 0
    weeklyWorkHours = {}  // { "2025-12-W1": 35.5, ... }
    weeklyAbsences = {}   // { "2025-12-W2": true, ... }
    attendanceDetails = []
    
    FOR each attendance in attendances DO:
        IF attendance.clockIn is missing THEN:
            continue  // 출근 기록 없으면 스킵
        END IF
        
        // 시간 파싱
        checkIn = attendance.clockIn
        checkOut = attendance.clockOut || currentTime()  // 미퇴근 시 현재 시간
        
        // ① 조기출근 보정
        contractStart = contract.workStartTime  // "09:00"
        IF checkIn < contractStart AND 
           (contractStart - checkIn) <= thresholds.earlyClockIn THEN:
            adjustedCheckIn = contractStart  // 계약 시작 시간으로 조정
            functions.logger.info('조기출근 보정', { checkIn, adjustedCheckIn })
        ELSE:
            adjustedCheckIn = checkIn
        END IF
        
        // ② 조기퇴근 보정
        contractEnd = contract.workEndTime  // "18:00"
        IF checkOut < contractEnd AND 
           (contractEnd - checkOut) <= thresholds.earlyClockOut THEN:
            adjustedCheckOut = contractEnd  // 계약 종료 시간으로 조정
            functions.logger.info('조기퇴근 보정', { checkOut, adjustedCheckOut })
        ELSE IF checkOut < contractEnd THEN:
            // 허용시간 초과 조기퇴근
            deductedMinutes = contractEnd - checkOut
            functions.logger.warn('조기퇴근 차감', { deductedMinutes })
            adjustedCheckOut = checkOut
        ELSE:
            adjustedCheckOut = checkOut
        END IF
        
        // 근무 시간 계산
        workHours = calculateWorkHours(adjustedCheckIn, adjustedCheckOut)
        
        // ③ 초과근무 계산
        overtimeMinutes = 0
        IF adjustedCheckOut > contractEnd THEN:
            overtimeMinutes = adjustedCheckOut - contractEnd
            
            IF overtimeMinutes <= thresholds.overtime THEN:
                // 허용시간 이하: 초과근무 인정 안 함
                overtimeMinutes = 0
            END IF
        END IF
        
        overtimeHours = overtimeMinutes / 60
        
        // ④ 야간근무 계산 (22:00~06:00)
        nightHours = 0
        IF contract.allowances.night == true THEN:
            nightHours = calculateNightHours(adjustedCheckIn, adjustedCheckOut)
            
            // 야간 근무 시간 중 휴게시간 제외
            IF contract.breakTime exists THEN:
                breakStart = contract.breakTime.startHour * 60 + 
                             contract.breakTime.startMinute
                breakEnd = contract.breakTime.endHour * 60 + 
                           contract.breakTime.endMinute
                
                // 야간 시간대와 휴게시간 겹치는 부분 계산
                nightStart = 22 * 60  // 22:00
                nightEnd = 6 * 60     // 06:00
                
                overlap = calculateOverlap(
                    nightStart, nightEnd, 
                    breakStart, breakEnd
                )
                
                nightHours -= overlap / 60
            END IF
        END IF
        
        // ⑤ 공휴일 여부 확인
        isHoliday = holidays.includes(attendance.date)
        holidayHours = 0
        
        IF isHoliday AND contract.allowances.holiday == true THEN:
            holidayHours = workHours
            functions.logger.info('공휴일 근무', { date: attendance.date })
        END IF
        
        // ⑥ 인센티브 수당 계산
        incentiveAmount = 0
        wageIncentive = parseMoney(attendance.wageIncentive)
        
        IF wageIncentive > 0 THEN:
            incentiveAmount = wageIncentive * workHours
            totalIncentiveAmount += incentiveAmount
        END IF
        
        // ⑦ 주차별 근무시간 누적 (주휴수당 계산용)
        weekKey = getWeekOfMonth(attendance.date)  // "2025-12-W3"
        weeklyHours = min(workHours, 8)  // 하루 8시간 한도
        
        IF weekKey not in weeklyWorkHours THEN:
            weeklyWorkHours[weekKey] = 0
        END IF
        
        weeklyWorkHours[weekKey] += weeklyHours
        
        IF workHours > 8 THEN:
            functions.logger.warn('8시간 초과 근무', { 
                date: attendance.date, 
                workHours, 
                weeklyHours 
            })
        END IF
        
        // 누적
        totalWorkHours += workHours
        totalOvertimeHours += overtimeHours
        totalNightHours += nightHours
        totalHolidayHours += holidayHours
        workDays++
        
        // 상세 기록
        attendanceDetails.push({
            date: attendance.date,
            clockIn: checkIn,
            clockOut: checkOut,
            adjustedClockIn: adjustedCheckIn,
            adjustedClockOut: adjustedCheckOut,
            workHours: workHours,
            overtimeHours: overtimeHours,
            nightHours: nightHours,
            isHoliday: isHoliday,
            wageIncentive: wageIncentive,
            isRealtime: attendance.isRealtime || false
        })
    END FOR
    
    functions.logger.info('Phase D 완료', {
        totalWorkHours,
        totalOvertimeHours,
        totalNightHours,
        totalHolidayHours,
        workDays
    })
    
    // ============================================================
    // Phase E: 급여 항목 계산
    // ============================================================
    
    // 6️⃣ 기본급 계산
    IF salaryType == '시급' THEN:
        basePay = hourlyWage * totalWorkHours
    
    ELSE IF salaryType == '월급' THEN:
        basePay = monthlyWage
    
    ELSE IF salaryType == '연봉' THEN:
        basePay = monthlyWage  // 연봉 / 12
    
    END IF
    
    functions.logger.info('기본급 계산', { basePay, salaryType })
    
    // 7️⃣ 연장근로 수당 (1.5배)
    // - 일일 초과근무: 8시간 초과분 × 1.5
    // - 주간 초과근무: 40시간 초과분 × 1.5
    // - 중복 방지: max(일일, 주간)
    
    dailyOvertimeHours = 0
    weeklyOvertimeHours = 0
    
    FOR each attendance in attendanceDetails DO:
        IF attendance.workHours > 8 THEN:
            dailyOvertimeHours += (attendance.workHours - 8)
        END IF
    END FOR
    
    FOR each weekKey in weeklyWorkHours DO:
        weekHours = weeklyWorkHours[weekKey]
        
        IF weekHours > 40 THEN:
            weeklyOvertimeHours += (weekHours - 40)
        END IF
    END FOR
    
    // 중복 방지: 더 큰 값 사용
    totalOvertimeHours = max(dailyOvertimeHours, weeklyOvertimeHours)
    overtimePay = hourlyWage * 1.5 * totalOvertimeHours
    
    functions.logger.info('연장근로 수당', {
        dailyOvertimeHours,
        weeklyOvertimeHours,
        totalOvertimeHours,
        overtimePay
    })
    
    // 8️⃣ 야간/휴일/특별 수당
    nightPay = 0
    holidayPay = 0
    
    IF contract.allowances.night == true THEN:
        nightPay = hourlyWage * 0.5 * totalNightHours
    END IF
    
    IF contract.allowances.holiday == true THEN:
        holidayPay = hourlyWage * 1.5 * totalHolidayHours
    END IF
    
    incentivePay = totalIncentiveAmount
    
    functions.logger.info('수당 계산', { nightPay, holidayPay, incentivePay })
    
    // ============================================================
    // Phase F: 주휴수당 및 퇴직금
    // ============================================================
    
    // 9️⃣ 주휴수당 (시급제만)
    // - 주당 15시간 이상 근무
    // - 결석 없는 주
    // - 주휴수당 = 시급 × (주 근무시간 / 5)
    // - 최대 8시간
    
    weeklyHolidayPay = 0
    weeklyHolidayHours = 0
    
    weeklyHours = parseMoney(contract.weeklyHours)
    isWeeklyHolidayEligible = (weeklyHours >= 15) || 
                              (contract.allowances.weeklyHoliday == true)
    
    IF salaryType == '시급' AND isWeeklyHolidayEligible THEN:
        FOR each weekKey in weeklyWorkHours DO:
            // 결석이 있는 주는 제외
            IF weekKey in weeklyAbsences THEN:
                functions.logger.warn('주휴수당 제외 (결석)', { weekKey })
                continue
            END IF
            
            weekHours = weeklyWorkHours[weekKey]
            
            // 주당 15시간 이상 근무 시
            IF weekHours >= 15 THEN:
                weeklyHolidayForWeek = min(weekHours / 5, 8)  // 최대 8시간
                weeklyHolidayHours += weeklyHolidayForWeek
                
                functions.logger.info('주휴수당 지급', {
                    weekKey,
                    weekHours,
                    weeklyHolidayForWeek
                })
            END IF
        END FOR
        
        weeklyHolidayPay = hourlyWage * weeklyHolidayHours
        
        functions.logger.info('주휴수당 계산 완료', {
            weeklyHolidayHours,
            weeklyHolidayPay
        })
    ELSE:
        functions.logger.info('주휴수당 미적용', { salaryType, isWeeklyHolidayEligible })
    END IF
    
    // 🔟 퇴직금 (1년 이상 근속, 주 15시간 이상)
    severancePay = 0
    
    IF contract.startDate exists THEN:
        contractStartDate = safeParseDate(contract.startDate)
        
        IF contractStartDate is valid THEN:
            daysDiff = (today - contractStartDate) / (1000 * 60 * 60 * 24)
            yearsDiff = daysDiff / 365
            
            totalWeeks = Object.keys(weeklyWorkHours).length
            avgWeeklyHours = totalWorkHours / totalWeeks
            
            // 1년 이상 근속 + 주 15시간 이상
            IF yearsDiff >= 1 AND avgWeeklyHours >= 15 THEN:
                avgMonthlySalary = basePay + overtimePay + nightPay + 
                                   holidayPay + weeklyHolidayPay + incentivePay
                
                severancePay = round((avgMonthlySalary * daysDiff / 365) * 30)
                
                functions.logger.info('퇴직금 계산', {
                    daysDiff,
                    yearsDiff,
                    avgWeeklyHours,
                    avgMonthlySalary,
                    severancePay
                })
            END IF
        END IF
    END IF
    
    // ============================================================
    // Phase G: 총 수당 및 총 지급액
    // ============================================================
    
    // 1️⃣1️⃣ 총 수당 및 총 지급액
    totalAllowances = overtimePay + nightPay + holidayPay + 
                     weeklyHolidayPay + incentivePay + severancePay
    
    totalPay = basePay + totalAllowances
    
    functions.logger.info('총 지급액', { basePay, totalAllowances, totalPay })
    
    // ============================================================
    // Phase H: 공제 항목
    // ============================================================
    
    // 1️⃣2️⃣ 4대보험 공제
    nationalPension = 0
    healthInsurance = 0
    longTermCare = 0
    employmentInsurance = 0
    incomeTax = 0
    
    IF contract.insurance exists THEN:
        // 국민연금 (4.5%)
        IF contract.insurance.pension == true THEN:
            nationalPension = round(totalPay * 0.045)
        END IF
        
        // 건강보험 (3.545%)
        IF contract.insurance.health == true THEN:
            healthInsurance = round(totalPay * 0.03545)
            
            // 장기요양 (건강보험 × 12.95% × 0.5)
            longTermCare = round(healthInsurance * 0.1295 * 0.5)
        END IF
        
        // 고용보험 (0.9%)
        IF contract.insurance.employment == true THEN:
            employmentInsurance = round(totalPay * 0.009)
        END IF
        
        // 소득세 (3.3%, 4대보험 가입자만)
        has4Insurance = (contract.insurance.pension == true) ||
                       (contract.insurance.health == true) ||
                       (contract.insurance.employment == true) ||
                       (contract.insurance.workComp == true)
        
        IF has4Insurance THEN:
            incomeTax = round(totalPay * 0.033)
        END IF
    END IF
    
    functions.logger.info('공제 항목', {
        nationalPension,
        healthInsurance,
        longTermCare,
        employmentInsurance,
        incomeTax
    })
    
    // ============================================================
    // Phase I: 최종 금액 및 계약 정보
    // ============================================================
    
    // 1️⃣3️⃣ 총 공제액 및 실지급액
    totalDeductions = nationalPension + healthInsurance + longTermCare +
                     employmentInsurance + incomeTax
    
    netPay = totalPay - totalDeductions
    
    functions.logger.info('실지급액', { totalDeductions, netPay })
    
    // 1️⃣4️⃣ 계약서 기준 정보 (렌더링용)
    contractInfo = {
        weeklyHours: weeklyHours,
        isWeeklyHolidayEligible: isWeeklyHolidayEligible,
        has4Insurance: has4Insurance,
        hasPension: contract.insurance.pension == true,
        hasHealthInsurance: contract.insurance.health == true,
        hasEmploymentInsurance: contract.insurance.employment == true,
        hasWorkCompInsurance: contract.insurance.workComp == true
    }
    
    // ============================================================
    // 최종 결과 반환
    // ============================================================
    
    return {
        employeeName: employee.name,
        userId: employee.userId,
        employeeUid: employeeUid,
        storeName: employee.storeName,
        yearMonth: yearMonth,
        
        salaryType: salaryType,
        hourlyWage: round(hourlyWage),
        monthlyWage: round(monthlyWage),
        annualWage: round(annualWage),
        
        totalWorkHours: round(totalWorkHours, 2),
        totalOvertimeHours: round(totalOvertimeHours, 2),
        totalNightHours: round(totalNightHours, 2),
        totalHolidayHours: round(totalHolidayHours, 2),
        
        basePay: round(basePay),
        overtimePay: round(overtimePay),
        nightPay: round(nightPay),
        holidayPay: round(holidayPay),
        weeklyHolidayPay: round(weeklyHolidayPay),
        incentivePay: round(incentivePay),
        severancePay: round(severancePay),
        totalAllowances: round(totalAllowances),
        
        nationalPension: round(nationalPension),
        healthInsurance: round(healthInsurance),
        longTermCare: round(longTermCare),
        employmentInsurance: round(employmentInsurance),
        incomeTax: round(incomeTax),
        totalDeductions: round(totalDeductions),
        
        totalPay: round(totalPay),
        netPay: round(netPay),
        
        workDays: workDays,
        attendanceDetails: attendanceDetails,
        contractInfo: contractInfo
    }

END function
```

### 📊 **핵심 상수**

| 항목 | 값 | 비고 |
|------|---|------|
| **월 근무시간** | 209시간 | 주 40시간 × 52주 ÷ 12개월 |
| **연장근로 배수** | 1.5배 | 근로기준법 |
| **야간근로 배수** | 0.5배 | 기본급의 50% 추가 |
| **휴일근로 배수** | 1.5배 | 기본급의 50% 추가 |
| **야간 시간대** | 22:00~06:00 | 8시간 |
| **일일 근무 한도** | 8시간 | 주휴수당 계산 시 |
| **주간 근무 한도** | 40시간 | 연장근로 기준 |
| **주휴수당 자격** | 주 15시간 이상 | 근로기준법 |
| **퇴직금 자격** | 1년 이상 + 주 15시간 이상 | 근로기준법 |
| **국민연금** | 4.5% | 근로자 부담분 |
| **건강보험** | 3.545% | 근로자 부담분 |
| **장기요양** | 건강보험 × 12.95% × 0.5 | 2025년 기준 |
| **고용보험** | 0.9% | 근로자 부담분 |
| **소득세** | 3.3% | 4대보험 가입자만 |

### 🔄 **클라이언트 호출 방법**

```typescript
// ✅ GOOD: 클라이언트에서 서버 호출만
import { getFunctions, httpsCallable } from 'firebase/functions';
import { sanitizeTimestamps } from '@/lib/utils/timestamp';

async function loadSalary(employeeUid: string, yearMonth: string) {
  try {
    // 1. Cloud Functions 호출
    const functions = getFunctions(undefined, 'asia-northeast3');
    const calculateSalary = httpsCallable(functions, 'calculateMonthlySalary');
    
    const result = await calculateSalary({ employeeUid, yearMonth });
    
    if (!result.data.success) {
      throw new Error(result.data.error || '급여 계산 실패');
    }
    
    // 2. sanitizeTimestamps 적용 (필수!)
    const sanitized = sanitizeTimestamps(result.data.data);
    
    // 3. State 업데이트
    setSalary(sanitized);
    
    console.log('급여 조회 성공:', sanitized);
  } catch (error) {
    console.error('급여 조회 실패:', error);
    alert('급여 조회에 실패했습니다.');
  }
}

// ❌ BAD: 클라이언트에서 계산 (절대 금지!)
function calculateSalaryLocally() {
  // ❌ 급여 계산 로직 (금지!)
}
```

### ⚠️ **주의사항**

1. **클라이언트 계산 금지**: 급여 계산은 오직 서버에서만
2. **parseMoney 필수**: 모든 숫자 필드는 parseMoney로 파싱
3. **sanitizeTimestamps 필수**: 조회 후 반드시 변환
4. **표준 필드명 사용**: salaryAmount, clockIn, userId 등
5. **로그 상세화**: functions.logger로 각 단계 로그 남기기

---

## 2. 출퇴근 시간 보정 로직

### 📁 **관련 파일**
- **서버**: `functions/src/index.ts` (Phase D)

### 📝 **목적**
직원의 실제 출퇴근 시간을 계약서의 근무 시간에 맞춰 보정합니다.

### 🎯 **입력/출력**

**입력**:
- `clockIn`: 실제 출근 시간 ("HH:MM" 형식)
- `clockOut`: 실제 퇴근 시간 ("HH:MM" 형식)
- `workStartTime`: 계약 시작 시간 ("HH:MM")
- `workEndTime`: 계약 종료 시간 ("HH:MM")
- `thresholds`: 허용시간 설정
  - `earlyClockIn`: 조기출근 허용 (분, 기본 15분)
  - `earlyClockOut`: 조기퇴근 허용 (분, 기본 5분)
  - `overtime`: 초과근무 시작 기준 (분, 기본 5분)

**출력**:
- `adjustedClockIn`: 보정된 출근 시간
- `adjustedClockOut`: 보정된 퇴근 시간
- `workHours`: 근무 시간 (시간 단위)
- `overtimeHours`: 초과근무 시간 (시간 단위)

### 🧮 **알고리즘 (Pseudo-code)**

```
function adjustAttendanceTimes(
    clockIn: string,
    clockOut: string,
    workStartTime: string,
    workEndTime: string,
    thresholds: AttendanceThresholds
):
    
    // ============================================================
    // 1️⃣ 조기출근 보정
    // ============================================================
    
    // 시간을 분으로 변환
    clockInMinutes = timeToMinutes(clockIn)          // "08:50" → 530
    workStartMinutes = timeToMinutes(workStartTime)  // "09:00" → 540
    
    // 조기출근 여부 확인
    IF clockInMinutes < workStartMinutes THEN:
        earlyMinutes = workStartMinutes - clockInMinutes  // 10분
        
        IF earlyMinutes <= thresholds.earlyClockIn THEN:
            // 허용시간 이내: 계약 시작 시간으로 조정
            adjustedClockIn = workStartTime  // "09:00"
            
            functions.logger.info('조기출근 보정', {
                original: clockIn,
                adjusted: adjustedClockIn,
                earlyMinutes: earlyMinutes
            })
        ELSE:
            // 허용시간 초과: 원래 시간 사용
            adjustedClockIn = clockIn
            
            functions.logger.warn('조기출근 허용시간 초과', {
                clockIn,
                earlyMinutes,
                threshold: thresholds.earlyClockIn
            })
        END IF
    ELSE:
        // 정상 출근 또는 지각
        adjustedClockIn = clockIn
    END IF
    
    // ============================================================
    // 2️⃣ 조기퇴근 보정
    // ============================================================
    
    clockOutMinutes = timeToMinutes(clockOut)        // "17:55" → 1075
    workEndMinutes = timeToMinutes(workEndTime)      // "18:00" → 1080
    
    // 조기퇴근 여부 확인
    IF clockOutMinutes < workEndMinutes THEN:
        earlyMinutes = workEndMinutes - clockOutMinutes  // 5분
        
        IF earlyMinutes <= thresholds.earlyClockOut THEN:
            // 허용시간 이내: 계약 종료 시간으로 조정
            adjustedClockOut = workEndTime  // "18:00"
            
            functions.logger.info('조기퇴근 보정', {
                original: clockOut,
                adjusted: adjustedClockOut,
                earlyMinutes: earlyMinutes
            })
        ELSE:
            // 허용시간 초과: 차감
            adjustedClockOut = clockOut
            deductedMinutes = earlyMinutes
            
            functions.logger.warn('조기퇴근 차감', {
                clockOut,
                earlyMinutes,
                deductedMinutes,
                threshold: thresholds.earlyClockOut
            })
        END IF
    ELSE:
        // 정상 퇴근 또는 초과근무
        adjustedClockOut = clockOut
    END IF
    
    // ============================================================
    // 3️⃣ 근무 시간 계산
    // ============================================================
    
    adjustedClockInMinutes = timeToMinutes(adjustedClockIn)
    adjustedClockOutMinutes = timeToMinutes(adjustedClockOut)
    
    // 자정 넘김 처리
    IF adjustedClockOutMinutes < adjustedClockInMinutes THEN:
        adjustedClockOutMinutes += 24 * 60  // 다음 날로 간주
    END IF
    
    workMinutes = adjustedClockOutMinutes - adjustedClockInMinutes
    workHours = workMinutes / 60
    
    // ============================================================
    // 4️⃣ 초과근무 시간 계산
    // ============================================================
    
    overtimeMinutes = 0
    
    IF adjustedClockOutMinutes > workEndMinutes THEN:
        overtimeMinutes = adjustedClockOutMinutes - workEndMinutes
        
        IF overtimeMinutes <= thresholds.overtime THEN:
            // 허용시간 이하: 초과근무 인정 안 함
            overtimeMinutes = 0
            
            functions.logger.info('초과근무 미인정 (허용시간 이하)', {
                overtimeMinutes,
                threshold: thresholds.overtime
            })
        ELSE:
            functions.logger.info('초과근무 인정', {
                overtimeMinutes,
                overtimeHours: overtimeMinutes / 60
            })
        END IF
    END IF
    
    overtimeHours = overtimeMinutes / 60
    
    return {
        adjustedClockIn: adjustedClockIn,
        adjustedClockOut: adjustedClockOut,
        workHours: round(workHours, 2),
        overtimeHours: round(overtimeHours, 2)
    }

END function
```

### 📊 **보정 예시**

| 케이스 | 실제 출근 | 계약 시작 | 허용시간 | 보정 결과 | 비고 |
|--------|----------|----------|---------|----------|------|
| **조기출근 (허용 이내)** | 08:50 | 09:00 | 15분 | 09:00 | ✅ 계약 시간으로 조정 |
| **조기출근 (허용 초과)** | 08:40 | 09:00 | 15분 | 08:40 | ⚠️ 원래 시간 사용 |
| **정상 출근** | 09:00 | 09:00 | 15분 | 09:00 | ✅ 변경 없음 |
| **지각** | 09:10 | 09:00 | 15분 | 09:10 | ⚠️ 변경 없음 |

| 케이스 | 실제 퇴근 | 계약 종료 | 허용시간 | 보정 결과 | 비고 |
|--------|----------|----------|---------|----------|------|
| **조기퇴근 (허용 이내)** | 17:55 | 18:00 | 5분 | 18:00 | ✅ 계약 시간으로 조정 |
| **조기퇴근 (허용 초과)** | 17:50 | 18:00 | 5분 | 17:50 | ❌ 10분 차감 |
| **정상 퇴근** | 18:00 | 18:00 | 5분 | 18:00 | ✅ 변경 없음 |
| **초과근무 (허용 이하)** | 18:03 | 18:00 | 5분 | 18:03 | ⚠️ 초과근무 미인정 |
| **초과근무 (허용 초과)** | 18:10 | 18:00 | 5분 | 18:10 | ✅ 10분 초과근무 인정 |

---

## 12. parseMoney - 숫자 필드 안전 파싱

### 📁 **관련 파일**
- **서버**: `functions/src/types/salary.ts`

### 📝 **목적**
Firestore에 저장된 숫자 필드(콤마 포함, NaN 등)를 안전하게 파싱하여 500 에러를 방지합니다.

### 🎯 **입력/출력**

**입력**: `any` (문자열, 숫자, null, undefined 등)
**출력**: `number` (유효한 숫자, 실패 시 0)

### 🧮 **알고리즘 (Pseudo-code)**

```
function parseMoney(value: any): number:
    
    // 1. Falsy 값 처리
    IF value is null OR value is undefined THEN:
        return 0
    END IF
    
    // 0은 유효한 값
    IF value === 0 THEN:
        return 0
    END IF
    
    // 2. 문자열로 변환 후 콤마 제거
    stringValue = String(value).replace(/,/g, '').trim()
    
    // 예: "3,000,000" → "3000000"
    //     "1,234.56" → "1234.56"
    
    // 3. 숫자로 변환
    parsed = parseFloat(stringValue)
    
    // 4. NaN 검사
    IF isNaN(parsed) THEN:
        console.warn('[parseMoney] Invalid value:', value, 'returning 0')
        return 0
    END IF
    
    // 5. 유효한 숫자 반환
    return parsed

END function
```

### 📊 **변환 예시**

| 입력 | 출력 | 비고 |
|------|-----|------|
| `"3,000,000"` | `3000000` | ✅ 콤마 제거 |
| `"1,234.56"` | `1234.56` | ✅ 소수점 유지 |
| `3000000` | `3000000` | ✅ 숫자 그대로 |
| `"NaN"` | `0` | ⚠️ 경고 로그 + 0 반환 |
| `null` | `0` | ✅ Falsy 처리 |
| `undefined` | `0` | ✅ Falsy 처리 |
| `""` | `0` | ⚠️ 빈 문자열 |
| `"abc"` | `0` | ⚠️ 경고 로그 + 0 반환 |

### 🔄 **사용 예시**

```typescript
// ✅ GOOD: parseMoney 사용
import { parseMoney } from '@/functions/src/types/salary';

const contract = contractDoc.data();
const salaryAmount = parseMoney(contract.salaryAmount);  // 안전!

// Firestore 저장 시
await addDoc(collection(db, 'contracts'), {
  userId: userId,
  salaryAmount: parseMoney(salaryAmount),  // "3,000,000" → 3000000
  weeklyHours: parseMoney(weeklyHours),    // "40" → 40
  companyId: companyId
});

// ❌ BAD: parseMoney 없이 사용
const salaryAmount = contract.salaryAmount;  // "3,000,000" → 문자열!
const calculation = salaryAmount * 1.5;      // NaN 발생!
```

---

## 13. sanitizeTimestamps - Timestamp 재귀 변환

### 📁 **관련 파일**
- **클라이언트**: `lib/utils/timestamp.ts`

### 📝 **목적**
Firestore Timestamp 객체를 JavaScript Date로 재귀적으로 변환하여 React Error #31을 방지합니다.

### 🎯 **입력/출력**

**입력**: `any` (Timestamp, 객체, 배열, 원시 타입 등)
**출력**: `any` (Timestamp → Date, 나머지는 그대로)

### 🧮 **알고리즘 (Pseudo-code)**

```
function sanitizeTimestamps(obj: any): any:
    
    // 1. null/undefined 처리
    IF obj is null OR obj is undefined THEN:
        return obj
    END IF
    
    // 2. Firestore Timestamp 변환
    IF obj has method 'toDate' THEN:
        return obj.toDate()  // Timestamp → Date
    END IF
    
    // 3. 배열 재귀 처리
    IF obj is Array THEN:
        return obj.map(item => sanitizeTimestamps(item))
    END IF
    
    // 4. 객체 재귀 처리
    IF typeof obj === 'object' THEN:
        sanitized = {}
        
        FOR each key in obj DO:
            sanitized[key] = sanitizeTimestamps(obj[key])
        END FOR
        
        return sanitized
    END IF
    
    // 5. 원시 타입 그대로 반환
    return obj

END function
```

### 📊 **변환 예시**

```typescript
// 입력 (Firestore 데이터)
const firestoreData = {
  name: 'John Doe',
  createdAt: Timestamp { seconds: 1704067200, nanoseconds: 0 },
  attendances: [
    {
      date: '2025-01-01',
      clockIn: '09:00',
      updatedAt: Timestamp { seconds: 1704070800, nanoseconds: 0 }
    }
  ],
  nested: {
    lastLogin: Timestamp { seconds: 1704153600, nanoseconds: 0 }
  }
};

// 출력 (sanitizeTimestamps 적용 후)
const sanitized = sanitizeTimestamps(firestoreData);
// {
//   name: 'John Doe',
//   createdAt: Date('2025-01-01T00:00:00.000Z'),  // ✅ Date
//   attendances: [
//     {
//       date: '2025-01-01',
//       clockIn: '09:00',
//       updatedAt: Date('2025-01-01T01:00:00.000Z')  // ✅ Date
//     }
//   ],
//   nested: {
//     lastLogin: Date('2025-01-02T00:00:00.000Z')  // ✅ Date
//   }
// }
```

### 🔄 **사용 예시**

```typescript
// ✅ GOOD: sanitizeTimestamps 사용
import { sanitizeTimestamps } from '@/lib/utils/timestamp';

// Firestore 조회
const snapshot = await getDocs(attendancesQuery);
const attendances = snapshot.docs.map(doc => 
  sanitizeTimestamps(doc.data())  // ✅ 필수!
);

// React 컴포넌트에서 안전하게 사용
{attendances.map(att => (
  <div key={att.id}>
    {att.createdAt.toLocaleDateString()}  // ✅ Date 메서드 사용 가능
  </div>
))}

// ❌ BAD: sanitizeTimestamps 없이 사용
const attendances = snapshot.docs.map(doc => doc.data());

// React 렌더링 시 Error #31 발생!
{attendances.map(att => (
  <div key={att.id}>
    {att.createdAt.toLocaleDateString()}  // ❌ Timestamp는 toLocaleDateString() 없음
  </div>
))}
```

### ⚠️ **주의사항**

1. **모든 Firestore 조회 후 필수 적용**
2. **재귀적으로 변환**: 중첩된 객체/배열도 모두 처리
3. **React 렌더링 전 필수**: Error #31 방지
4. **서버 응답에도 적용**: Cloud Functions 결과도 sanitize

---

**마지막 업데이트**: 2025-12-31  
**버전**: v2.0.0 (대수술 완료)  
**작성자**: Claude Code Assistant (사장님과 함께)
