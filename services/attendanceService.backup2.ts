/**
 * ========================================
 * AttendanceService v2.0 - The Brain
 * ========================================
 * 
 * 핵심 철학: Single Source of Truth (SSOT)
 * - 모든 파생 데이터(급여, 근무시간)는 근태 기록 저장 시 즉시 계산
 * - "읽을 때 계산하지 말고, 쓸 때 계산해서 저장하라"
 * 
 * 주요 변경사항:
 * 1. 트랜잭션 기반 출퇴근 처리
 * 2. 급여 자동 계산 및 저장 (dailyWage)
 * 3. 모든 파생 필드 원자적 저장
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
  limit,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { AttendanceRecord } from '@/lib/types/attendance';

// ========================================
// 타입 정의
// ========================================

interface ClockInParams {
  userId: string;
  companyId: string;
  storeId: string;
  date: string;
  location?: { latitude: number; longitude: number };
}

interface ClockOutParams {
  attendanceId: string;
}

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
}

// ========================================
// 유틸리티 함수
// ========================================

/**
 * 요일 이름 변환 (date 문자열 → "월", "화", ...)
 */
const getDayName = (dateStr: string): string => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateStr).getDay()];
};

/**
 * 시간 문자열을 분으로 변환 ("09:30" → 570)
 */
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * 근무 시간 계산 (분 단위)
 */
const calculateWorkMinutes = (startTime: Date, endTime: Date): number => {
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);
};

/**
 * 야간 근무 시간 계산 (22:00 ~ 06:00)
 */
const calculateNightMinutes = (startTime: Date, endTime: Date): number => {
  let nightMinutes = 0;
  const currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    const hour = currentTime.getHours();
    
    // 22:00 ~ 23:59 또는 00:00 ~ 05:59
    if (hour >= 22 || hour < 6) {
      nightMinutes++;
    }
    
    currentTime.setMinutes(currentTime.getMinutes() + 1);
  }
  
  return nightMinutes;
};

/**
 * 공휴일 여부 확인 (2025년 하드코딩)
 */
const isPublicHoliday = (date: string): boolean => {
  const publicHolidays2025 = [
    '2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30',
    '2025-03-01', '2025-03-05', '2025-05-05', '2025-05-06',
    '2025-06-06', '2025-08-15', '2025-10-03', '2025-10-05',
    '2025-10-06', '2025-10-07', '2025-10-09', '2025-12-25'
  ];
  return publicHolidays2025.includes(date);
};

// ========================================
// 핵심: 일급 계산 엔진
// ========================================

/**
 * 일일 급여 계산 (The Core)
 * 
 * 이 함수가 SSOT의 핵심!
 * 출퇴근 기록 + 계약 정보 → 모든 급여 필드 계산
 */
async function calculateDailyWage(
  clockInTime: Date,
  clockOutTime: Date,
  date: string,
  contract: any
): Promise<DailyWageCalculation> {
  console.log('💰 일급 계산 시작:', { clockInTime, clockOutTime, date });
  
  // 1. 기본 근무 시간 계산
  const workMinutes = calculateWorkMinutes(clockInTime, clockOutTime);
  const workHours = workMinutes / 60;
  
  // 2. 계약 정보에서 시급 가져오기
  const salaryType = contract.salaryType || contract.wageType || '시급';
  let hourlyWage = 0;
  
  if (salaryType === '시급') {
    hourlyWage = parseFloat(contract.salaryAmount || contract.wageAmount || 0);
  } else if (salaryType === '월급') {
    const monthlyWage = parseFloat(contract.salaryAmount || contract.wageAmount || 0);
    hourlyWage = Math.round(monthlyWage / 209); // 월급 → 시급 환산
  } else if (salaryType === '연봉') {
    const annualWage = parseFloat(contract.salaryAmount || contract.wageAmount || 0);
    hourlyWage = Math.round(annualWage / 12 / 209); // 연봉 → 시급 환산
  }
  
  console.log('💵 시급:', hourlyWage);
  
  // 3. 예정 근무 시간과 비교하여 연장 근무 계산
  let overtimeMinutes = 0;
  
  if (contract.workStartTime && contract.workEndTime) {
    const scheduledEnd = timeToMinutes(contract.workEndTime);
    const actualEnd = clockOutTime.getHours() * 60 + clockOutTime.getMinutes();
    
    overtimeMinutes = Math.max(0, actualEnd - scheduledEnd);
    console.log('⏰ 연장 근무:', overtimeMinutes, '분');
  }
  
  // 4. 야간 근무 시간 계산
  const nightWorkMinutes = calculateNightMinutes(clockInTime, clockOutTime);
  console.log('🌙 야간 근무:', nightWorkMinutes, '분');
  
  // 5. 공휴일 근무 여부
  const isHoliday = isPublicHoliday(date);
  const holidayWorkMinutes = isHoliday ? workMinutes : 0;
  
  if (isHoliday) {
    console.log('🎉 공휴일 근무 감지:', date);
  }
  
  // 6. 급여 계산
  const basePay = Math.round((hourlyWage * workHours));
  const overtimePay = contract.allowances?.overtime 
    ? Math.round(hourlyWage * 1.5 * (overtimeMinutes / 60))
    : 0;
  const nightPay = contract.allowances?.night
    ? Math.round(hourlyWage * 0.5 * (nightWorkMinutes / 60))
    : 0;
  const holidayPay = contract.allowances?.holiday && isHoliday
    ? Math.round(hourlyWage * 1.5 * workHours)
    : 0;
  
  const totalPay = basePay + overtimePay + nightPay + holidayPay;
  
  console.log('💰 급여 계산 완료:', {
    basePay,
    overtimePay,
    nightPay,
    holidayPay,
    totalPay
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
    totalPay
  };
}

// ========================================
// 메인 API
// ========================================

/**
 * 출근 처리 (Enhanced)
 * 
 * 변경사항:
 * - 스케줄 조회 및 저장
 * - 예정 근무 시간 저장
 */
export async function clockIn(params: ClockInParams): Promise<string> {
  console.log('🕐 출근 처리 시작:', params);
  
  const { userId, companyId, storeId, date, location } = params;
  
  try {
    // 1. 오늘 요일 파악
    const dayName = getDayName(date);
    console.log(`📅 오늘 요일: ${dayName}`);
    
    // 2. 활성 계약서 조회
    let scheduledStartTime: string | undefined;
    let scheduledEndTime: string | undefined;
    
    const contractQuery = query(
      collection(db, COLLECTIONS.CONTRACTS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
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
      
      console.log('📋 예정 근무 시간:', scheduledStartTime, '~', scheduledEndTime);
    }
    
    // 3. 출근 기록 생성
    const attendanceData: any = {
      userId,
      companyId,
      storeId,
      date,
      clockIn: serverTimestamp(),
      status: 'present',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    if (scheduledStartTime) attendanceData.scheduledStartTime = scheduledStartTime;
    if (scheduledEndTime) attendanceData.scheduledEndTime = scheduledEndTime;
    if (location) attendanceData.location = location;
    
    const docRef = await addDoc(collection(db, COLLECTIONS.ATTENDANCE), attendanceData);
    
    console.log('✅ 출근 처리 완료:', docRef.id);
    return docRef.id;
    
  } catch (error: any) {
    console.error('❌ 출근 처리 실패:', error);
    throw new Error(error.message || '출근 처리 중 오류가 발생했습니다.');
  }
}

/**
 * 퇴근 처리 (The Brain - Transaction 기반)
 * 
 * 핵심 변경사항:
 * 1. 트랜잭션 사용 (원자적 업데이트)
 * 2. 일급 자동 계산 및 저장
 * 3. 모든 파생 필드 동시 저장
 */
export async function clockOut(params: ClockOutParams): Promise<void> {
  console.log('🕑 퇴근 처리 시작:', params);
  
  const { attendanceId } = params;
  
  try {
    // 트랜잭션으로 원자적 업데이트 보장
    await runTransaction(db, async (transaction) => {
      // 1. 출근 기록 조회
      const attendanceRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
      const attendanceDoc = await transaction.get(attendanceRef);
      
      if (!attendanceDoc.exists()) {
        throw new Error('출근 기록을 찾을 수 없습니다.');
      }
      
      const attendanceData = attendanceDoc.data() as AttendanceRecord;
      
      // 2. clockIn 시간 확인
      if (!attendanceData.clockIn) {
        throw new Error('출근 기록이 없습니다.');
      }
      
      // 3. clockIn/clockOut 시간 추출
      const clockInTime = attendanceData.clockIn instanceof Timestamp
        ? attendanceData.clockIn.toDate()
        : new Date(attendanceData.clockIn as any);
      
      const clockOutTime = new Date(); // 현재 시간
      
      // 4. 계약서 조회
      const contractQuery = query(
        collection(db, COLLECTIONS.CONTRACTS),
        where('userId', '==', attendanceData.userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const contractSnap = await getDocs(contractQuery);
      
      if (contractSnap.empty) {
        throw new Error('계약서를 찾을 수 없습니다.');
      }
      
      const contract = contractSnap.docs[0].data();
      
      // 5. 🔥 핵심: 일급 계산
      const wageCalc = await calculateDailyWage(
        clockInTime,
        clockOutTime,
        attendanceData.date,
        contract
      );
      
      // 6. 트랜잭션으로 원자적 업데이트
      transaction.update(attendanceRef, {
        clockOut: Timestamp.fromDate(clockOutTime),
        
        // 파생 필드 (모두 계산되어 저장)
        workMinutes: wageCalc.workMinutes,
        overtimeMinutes: wageCalc.overtimeMinutes,
        nightWorkMinutes: wageCalc.nightWorkMinutes,
        holidayWorkMinutes: wageCalc.holidayWorkMinutes,
        
        // 급여 필드 (SSOT!)
        basePay: wageCalc.basePay,
        overtimePay: wageCalc.overtimePay,
        nightPay: wageCalc.nightPay,
        holidayPay: wageCalc.holidayPay,
        dailyWage: wageCalc.totalPay,
        
        // 메타데이터
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ 퇴근 처리 트랜잭션 완료');
    });
    
    console.log('✅ 퇴근 처리 성공');
    
  } catch (error: any) {
    console.error('❌ 퇴근 처리 실패:', error);
    throw new Error(error.message || '퇴근 처리 중 오류가 발생했습니다.');
  }
}

/**
 * 근태 수정 (Enhanced with Recalculation)
 * 
 * 관리자가 근태를 수정하면 급여도 자동 재계산
 */
export async function updateAttendance(
  attendanceId: string,
  updates: Partial<AttendanceRecord>
): Promise<void> {
  console.log('✏️ 근태 수정 시작:', attendanceId);
  
  try {
    await runTransaction(db, async (transaction) => {
      const attendanceRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
      const attendanceDoc = await transaction.get(attendanceRef);
      
      if (!attendanceDoc.exists()) {
        throw new Error('출근 기록을 찾을 수 없습니다.');
      }
      
      const attendanceData = attendanceDoc.data() as AttendanceRecord;
      
      // clockIn 또는 clockOut이 수정되면 급여 재계산
      if (updates.clockIn || updates.clockOut) {
        const clockInTime = (updates.clockIn || attendanceData.clockIn) instanceof Timestamp
          ? (updates.clockIn || attendanceData.clockIn as Timestamp).toDate()
          : new Date((updates.clockIn || attendanceData.clockIn) as any);
        
        const clockOutTime = (updates.clockOut || attendanceData.clockOut) instanceof Timestamp
          ? (updates.clockOut || attendanceData.clockOut as Timestamp).toDate()
          : new Date((updates.clockOut || attendanceData.clockOut) as any);
        
        // 계약서 조회
        const contractQuery = query(
          collection(db, COLLECTIONS.CONTRACTS),
          where('userId', '==', attendanceData.userId),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        
        const contractSnap = await getDocs(contractQuery);
        
        if (!contractSnap.empty) {
          const contract = contractSnap.docs[0].data();
          
          // 급여 재계산
          const wageCalc = await calculateDailyWage(
            clockInTime,
            clockOutTime,
            attendanceData.date,
            contract
          );
          
          // 모든 파생 필드 업데이트
          transaction.update(attendanceRef, {
            ...updates,
            workMinutes: wageCalc.workMinutes,
            overtimeMinutes: wageCalc.overtimeMinutes,
            nightWorkMinutes: wageCalc.nightWorkMinutes,
            holidayWorkMinutes: wageCalc.holidayWorkMinutes,
            basePay: wageCalc.basePay,
            overtimePay: wageCalc.overtimePay,
            nightPay: wageCalc.nightPay,
            holidayPay: wageCalc.holidayPay,
            dailyWage: wageCalc.totalPay,
            updatedAt: serverTimestamp(),
          });
          
          console.log('✅ 근태 수정 + 급여 재계산 완료');
          return;
        }
      }
      
      // 시간 수정이 아니면 일반 업데이트
      transaction.update(attendanceRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ 근태 수정 완료 (재계산 없음)');
    });
    
  } catch (error: any) {
    console.error('❌ 근태 수정 실패:', error);
    throw new Error(error.message || '근태 수정 중 오류가 발생했습니다.');
  }
}

/**
 * 조회 함수들 (변경 없음)
 */
export async function getAttendanceRecords(
  companyId: string,
  filters?: {
    storeId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }
): Promise<AttendanceRecord[]> {
  const constraints: any[] = [where('companyId', '==', companyId)];
  
  if (filters?.storeId) constraints.push(where('storeId', '==', filters.storeId));
  if (filters?.userId) constraints.push(where('userId', '==', filters.userId));
  if (filters?.status) constraints.push(where('status', '==', filters.status));
  if (filters?.startDate) constraints.push(where('date', '>=', filters.startDate));
  if (filters?.endDate) constraints.push(where('date', '<=', filters.endDate));
  
  constraints.push(orderBy('date', 'desc'));
  
  const q = query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as AttendanceRecord));
}

export async function getAttendanceById(attendanceId: string): Promise<AttendanceRecord | null> {
  const docRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as AttendanceRecord;
}
