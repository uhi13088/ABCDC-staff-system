/**
 * ========================================
 * Attendance Service v4.0 - The Ultimate Brain
 * ========================================
 * 
 * 통합 기능:
 * 1. SSOT 원칙 (쓸 때 계산, 읽을 때 집계)
 * 2. 공휴일 할증 자동 적용
 * 3. 수습 기간 급여 자동 조정
 * 4. 매장 마감 완충 시간 처리
 * 5. 이상 연장 근무 감지 및 승인 대기
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  runTransaction,
  Timestamp,
  serverTimestamp,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import {
  EventBus,
  executeTransaction,
  createEvent,
  serverTime,
} from '@/lib/eventSystem';
import {
  timeToMinutes,
  calculateNightMinutes,
  isPublicHoliday,
  isProbationPeriod,
  getProbationMultiplier,
  isWithinBuffer,
  getOverBufferMinutes,
  timestampToDate,
  hourlyToMonthly,
  monthlyToHourly,
  annualToHourly,
  calculatePay,
} from '@/lib/shared/businessLogic';
import type { AttendanceRecord } from '@/lib/types/attendance';

// ========================================
// 타입 정의
// ========================================

interface DailyWageCalculation {
  workMinutes: number;
  overtimeMinutes: number;
  nightWorkMinutes: number;
  holidayWorkMinutes: number;
  basePay: number;
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  totalPay: number;
  
  // 추가 메타데이터
  isHoliday: boolean;
  holidayMultiplier: number;
  isProbation: boolean;
  probationMultiplier: number;
  isWithinStoreBuffer: boolean;
  requiresApproval: boolean;
}

// ========================================
// 핵심 로직: 일급 계산 엔진 (The Ultimate Engine)
// ========================================

/**
 * 일일 급여 계산 (모든 규칙 통합)
 * 
 * 적용 규칙:
 * 1. 기본 근무 시간 × 시급
 * 2. 공휴일 할증 (1.5배)
 * 3. 야간 근무 할증 (0.5배)
 * 4. 연장 근무 할증 (1.5배)
 * 5. 수습 기간 감액 (90%)
 */
async function calculateDailyWage(
  clockInTime: Date,
  clockOutTime: Date,
  date: string,
  contract: any,
  employee: any,
  store: any
): Promise<DailyWageCalculation> {
  console.log('💰 [Ultimate] 일급 계산 시작:', { date, clockInTime, clockOutTime });
  
  // 1. 기본 근무 시간 계산
  const workMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 1000 / 60);
  const workHours = workMinutes / 60;
  
  console.log(`  ⏱️ 근무 시간: ${workMinutes}분 (${workHours.toFixed(2)}시간)`);
  
  // 2. 시급 추출
  const salaryType = contract.salaryType || contract.wageType || '시급';
  let hourlyWage = 0;

  // Parse and validate salary amount to prevent NaN propagation
  const salaryAmount = parseFloat(contract.salaryAmount || contract.wageAmount || '0');
  if (isNaN(salaryAmount)) {
    console.warn('⚠️ Invalid salary amount, defaulting to 0');
    hourlyWage = 0;
  } else if (salaryType === '시급') {
    hourlyWage = salaryAmount;
  } else if (salaryType === '월급') {
    hourlyWage = monthlyToHourly(salaryAmount);
  } else if (salaryType === '연봉') {
    hourlyWage = annualToHourly(salaryAmount);
  }

  console.log(`  💵 시급: ${hourlyWage}원`);
  
  // 3. 🎉 공휴일 여부 확인
  const isHoliday = isPublicHoliday(date);
  const holidayMultiplier = isHoliday ? 1.5 : 1.0;
  
  if (isHoliday) {
    console.log(`  🎉 공휴일 근무 감지! 할증 ${holidayMultiplier}배`);
  }
  
  // 4. 👶 수습 기간 여부 확인
  const joinedAt = employee.joinedAt || employee.createdAt;
  const probationMonths = contract.probationMonths || 3;
  const probationRate = contract.probationRate || 0.9;
  
  const isProbation = isProbationPeriod(joinedAt, probationMonths, date);
  const probationMultiplier = isProbation ? probationRate : 1.0;
  
  if (isProbation) {
    console.log(`  👶 수습 기간 중! 급여 ${probationMultiplier * 100}%`);
  }
  
  // 5. 🏪 매장 마감 완충 시간 확인
  const storeClosingTime = store?.closingTime || contract.workEndTime || '22:00';
  const bufferMinutes = store?.cleanupBufferMinutes || 30;
  
  const isWithinStoreBuffer = isWithinBuffer(clockOutTime, storeClosingTime, bufferMinutes);
  const overBufferMinutes = getOverBufferMinutes(clockOutTime, storeClosingTime, bufferMinutes);
  const requiresApproval = overBufferMinutes > 0;
  
  if (requiresApproval) {
    console.log(`  ⚠️ 마감 완충 시간 초과: ${overBufferMinutes}분 → 승인 필요`);
  }
  
  // 6. 연장 근무 계산
  let overtimeMinutes = 0;
  
  if (contract.workStartTime && contract.workEndTime) {
    const scheduledEnd = timeToMinutes(contract.workEndTime);
    const actualEnd = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();
    
    overtimeMinutes = Math.max(0, actualEnd - scheduledEnd);
    console.log(`  ⏰ 연장 근무: ${overtimeMinutes}분`);
  }
  
  // 7. 야간 근무 시간 계산
  const nightWorkMinutes = calculateNightMinutes(clockInTime, clockOutTime);
  console.log(`  🌙 야간 근무: ${nightWorkMinutes}분`);
  
  // 8. 공휴일 근무 시간
  const holidayWorkMinutes = isHoliday ? workMinutes : 0;
  
  // 9. 급여 계산 (모든 배율 적용)
  const finalHourlyWage = hourlyWage * probationMultiplier; // 수습 기간 반영
  
  // 기본급
  const basePay = calculatePay(finalHourlyWage, workMinutes, 1.0);
  
  // 연장 수당 (계약서 설정 확인)
  const overtimePay = contract.allowances?.overtime && overtimeMinutes > 0
    ? calculatePay(finalHourlyWage, overtimeMinutes, 0.5) // 1.5배 중 추가 0.5배
    : 0;
  
  // 야간 수당
  const nightPay = contract.allowances?.night && nightWorkMinutes > 0
    ? calculatePay(finalHourlyWage, nightWorkMinutes, 0.5)
    : 0;
  
  // 공휴일 수당
  const holidayPay = contract.allowances?.holiday && isHoliday
    ? calculatePay(finalHourlyWage, workMinutes, 0.5) // 1.5배 중 추가 0.5배
    : 0;
  
  const totalPay = basePay + overtimePay + nightPay + holidayPay;
  
  console.log('  💰 급여 계산 완료:', {
    basePay,
    overtimePay,
    nightPay,
    holidayPay,
    totalPay,
    수습배율: probationMultiplier,
    공휴일배율: holidayMultiplier,
  });
  
  return {
    workMinutes,
    overtimeMinutes,
    nightWorkMinutes,
    holidayWorkMinutes,
    basePay,
    overtimePay,
    nightPay,
    holidayPay,
    totalPay,
    
    // 메타데이터
    isHoliday,
    holidayMultiplier,
    isProbation,
    probationMultiplier,
    isWithinStoreBuffer,
    requiresApproval,
  };
}

// ========================================
// 출근 처리 (변경 없음)
// ========================================

export async function clockIn(params: {
  userId: string;
  companyId: string;
  storeId: string;
  date: string;
  location?: { latitude: number; longitude: number };
}): Promise<string> {
  console.log('🕐 출근 처리 시작:', params);
  
  const { userId, companyId, storeId, date, location } = params;
  
  try {
    // 요일 파악
    const dayName = ['일', '월', '화', '수', '목', '금', '토'][new Date(date).getDay()];
    console.log(`📅 오늘 요일: ${dayName}`);
    
    // 계약서 조회
    let scheduledStartTime: string | undefined;
    let scheduledEndTime: string | undefined;
    let isLate = false;
    
    const contractQuery = query(
      collection(db, COLLECTIONS.CONTRACTS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(1)
    );
    
    const contractSnap = await getDocs(contractQuery);
    
    if (!contractSnap.empty) {
      const contract = contractSnap.docs[0].data();
      console.log('✅ 계약서 발견');
      
      // 스케줄 시간 추출
      if (contract.schedules && Array.isArray(contract.schedules)) {
        const todaySchedule = contract.schedules.find((s: any) => s.day === dayName);
        if (todaySchedule) {
          scheduledStartTime = todaySchedule.startTime;
          scheduledEndTime = todaySchedule.endTime;
        }
      } else if (contract.workStartTime && contract.workEndTime) {
        scheduledStartTime = contract.workStartTime;
        scheduledEndTime = contract.workEndTime;
      }
      
      // 지각 여부 판단
      if (scheduledStartTime) {
        // Validate time format before splitting
        if (!scheduledStartTime.match(/^\d{1,2}:\d{2}$/)) {
          console.warn(`⚠️ Invalid scheduledStartTime format: "${scheduledStartTime}"`);
        } else {
          const now = new Date();
          const currentTime = now.getHours() * 60 + now.getMinutes();
          const [scheduledHours, scheduledMinutes] = scheduledStartTime.split(':').map(Number);

          // Validate parsed values
          if (!isNaN(scheduledHours) && !isNaN(scheduledMinutes)) {
            const scheduledTimeMinutes = scheduledHours * 60 + scheduledMinutes;

            if (currentTime > scheduledTimeMinutes + 10) {
              isLate = true;
              console.warn('⚠️ 지각 감지:', currentTime - scheduledTimeMinutes, '분 지각');
            }
          }
        }
      }
    }
    
    // 출근 기록 생성
    const attendanceData: any = {
      userId,
      companyId,
      storeId,
      date,
      clockIn: serverTimestamp(),
      status: isLate ? 'late' : 'present',
      isLate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    if (scheduledStartTime) attendanceData.scheduledStartTime = scheduledStartTime;
    if (scheduledEndTime) attendanceData.scheduledEndTime = scheduledEndTime;
    if (location) attendanceData.location = location;
    
    const docRef = await addDoc(collection(db, COLLECTIONS.ATTENDANCE), attendanceData);
    
    console.log('✅ 출근 처리 완료:', docRef.id, isLate ? '(지각)' : '');
    return docRef.id;
    
  } catch (error: any) {
    console.error('❌ 출근 처리 실패:', error);
    throw new Error(error.message || '출근 처리 중 오류가 발생했습니다.');
  }
}

// ========================================
// 퇴근 처리 (The Ultimate)
// ========================================

export async function clockOut(attendanceId: string): Promise<void> {
  console.log('🕑 [Ultimate] 퇴근 처리 시작:', attendanceId);

  try {
    await runTransaction(db, async (transaction) => {
      // 1. 출근 기록 조회
      const attendanceRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
      const attendanceDoc = await transaction.get(attendanceRef);
      
      if (!attendanceDoc.exists()) {
        throw new Error('출근 기록을 찾을 수 없습니다.');
      }
      
      const attendanceData = attendanceDoc.data() as AttendanceRecord;
      
      if (!attendanceData.clockIn) {
        throw new Error('출근 기록이 없습니다.');
      }
      
      // 2. clockIn 시간 추출
      const clockInTime = timestampToDate(attendanceData.clockIn);
      const clockOutTime = new Date();
      
      // 3. 계약서 조회
      const contractQuery = query(
        collection(db, COLLECTIONS.CONTRACTS),
        where('userId', '==', attendanceData.userId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(1)
      );
      
      const contractSnap = await getDocs(contractQuery);
      
      if (contractSnap.empty) {
        throw new Error('계약서를 찾을 수 없습니다.');
      }
      
      const contract = contractSnap.docs[0].data();
      
      // 4. 직원 정보 조회
      const employeeRef = doc(db, COLLECTIONS.USERS, attendanceData.userId);
      const employeeDoc = await transaction.get(employeeRef);
      
      if (!employeeDoc.exists()) {
        throw new Error('직원 정보를 찾을 수 없습니다.');
      }
      
      const employee = employeeDoc.data();
      
      // 5. 매장 정보 조회
      let store: any = {};
      if (attendanceData.storeId) {
        const storeQuery = query(
          collection(db, COLLECTIONS.STORES),
          where('id', '==', attendanceData.storeId)
        );
        const storeSnap = await getDocs(storeQuery);
        if (!storeSnap.empty) {
          store = storeSnap.docs[0].data();
        }
      }
      
      // 6. 🔥 핵심: 일급 계산 (모든 규칙 통합)
      const wageCalc = await calculateDailyWage(
        clockInTime,
        clockOutTime,
        attendanceData.date,
        contract,
        employee,
        store
      );
      
      // 7. 조퇴 여부 판단
      let isEarlyLeave = false;
      if (attendanceData.scheduledEndTime) {
        const scheduledEnd = timeToMinutes(attendanceData.scheduledEndTime);
        const actualEnd = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();
        
        if (actualEnd < scheduledEnd - 10) {
          isEarlyLeave = true;
          console.warn('⚠️ 조퇴 감지:', scheduledEnd - actualEnd, '분 조퇴');
        }
      }
      
      // 8. 최종 상태 결정
      let finalStatus = 'present';
      if (attendanceData.isLate && isEarlyLeave) {
        finalStatus = 'late_and_early_leave';
      } else if (attendanceData.isLate) {
        finalStatus = 'late';
      } else if (isEarlyLeave) {
        finalStatus = 'early_leave';
      }
      
      // 9. 승인 필요 여부에 따른 상태 조정
      if (wageCalc.requiresApproval) {
        finalStatus = 'pending_approval';
        console.log('  ⏳ 승인 대기 상태로 설정');
      }
      
      // 10. 트랜잭션으로 원자적 업데이트
      transaction.update(attendanceRef, {
        clockOut: Timestamp.fromDate(clockOutTime),
        
        // 근무 시간
        workMinutes: wageCalc.workMinutes,
        overtimeMinutes: wageCalc.overtimeMinutes,
        nightWorkMinutes: wageCalc.nightWorkMinutes,
        holidayWorkMinutes: wageCalc.holidayWorkMinutes,
        
        // 급여 (SSOT!)
        basePay: wageCalc.basePay,
        overtimePay: wageCalc.overtimePay,
        nightPay: wageCalc.nightPay,
        holidayPay: wageCalc.holidayPay,
        dailyWage: wageCalc.totalPay,
        
        // 메타데이터
        isHoliday: wageCalc.isHoliday,
        holidayMultiplier: wageCalc.holidayMultiplier,
        isProbation: wageCalc.isProbation,
        probationMultiplier: wageCalc.probationMultiplier,
        requiresApproval: wageCalc.requiresApproval,
        
        // 상태
        status: finalStatus,
        isEarlyLeave,
        
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ 퇴근 처리 트랜잭션 완료:', finalStatus);
    });

    console.log('✅ 퇴근 처리 성공');
    
    // 11. 승인 필요 시 알림 발송
    // (이벤트 발행은 트랜잭션 외부에서)
    
  } catch (error: any) {
    console.error('❌ 퇴근 처리 실패:', error);
    throw new Error(error.message || '퇴근 처리 중 오류가 발생했습니다.');
  }
}

// ========================================
// 강제 퇴근 (관리자용)
// ========================================

export async function forceClockOut(
  attendanceId: string,
  clockOutTime: Date,
  adminId: string
): Promise<void> {
  console.log('🚨 강제 퇴근 처리 시작:', { attendanceId, clockOutTime, adminId });
  
  // clockOut 로직과 동일하되, clockOutTime을 파라미터로 받음
  // (구현 생략 - clockOut과 유사)
}

// ========================================
// 근태 기록 조회 (필터링 지원)
// ========================================

export async function getAttendanceRecords(
  companyId: string,
  filters?: {
    storeId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<AttendanceRecord[]> {
  console.log('📋 근태 기록 조회:', { companyId, filters });
  
  try {
    // 1. 기본 쿼리: 회사 ID 필수
    const constraints: any[] = [
      where('companyId', '==', companyId)
    ];

    // 2. 필터 추가
    if (filters?.storeId) {
      constraints.push(where('storeId', '==', filters.storeId));
    }
    if (filters?.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }
    if (filters?.startDate) {
      constraints.push(where('date', '>=', filters.startDate));
    }
    if (filters?.endDate) {
      constraints.push(where('date', '<=', filters.endDate));
    }

    // 3. 쿼리 실행
    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      ...constraints,
      orderBy('date', 'desc'),
      firestoreLimit(500)
    );

    const snapshot = await getDocs(q);
    
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AttendanceRecord));
    
    console.log(`✅ 근태 기록 ${records.length}개 조회 완료`);
    return records;
    
  } catch (error: any) {
    console.error('❌ 근태 기록 조회 실패:', error);
    throw new Error(error.message || '근태 기록 조회 중 오류가 발생했습니다.');
  }
}

// ========================================
// Export
// ========================================

export default {
  clockIn,
  clockOut,
  forceClockOut,
  getAttendanceRecords,
};
