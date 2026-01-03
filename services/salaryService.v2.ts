/**
 * ========================================
 * SalaryService v2.0 - The Viewer
 * ========================================
 * 
 * 핵심 철학: View-Only
 * - 더 이상 급여를 계산하지 않음
 * - Attendance 컬렉션에 저장된 dailyWage를 집계(sum)만 수행
 * - "계산은 AttendanceService가, 조회는 SalaryService가"
 * 
 * 주요 변경사항:
 * 1. 복잡한 계산 로직 제거
 * 2. sum() 집계 함수로 단순화
 * 3. 실시간 리스너 지원
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { AttendanceRecord } from '@/lib/types/attendance';

// ========================================
// 타입 정의
// ========================================

export interface MonthlySalarySummary {
  employeeUid: string;
  employeeName: string;
  yearMonth: string;
  companyId: string;
  storeId?: string;
  storeName?: string;
  
  // 집계 필드
  totalWorkDays: number;
  totalWorkHours: number;
  totalBasePay: number;
  totalOvertimePay: number;
  totalNightPay: number;
  totalHolidayPay: number;
  totalPay: number;
  
  // 메타데이터
  calculatedAt: Date;
}

// ========================================
// 메인 API
// ========================================

/**
 * 월별 급여 조회 (단순 집계)
 * 
 * Attendance 컬렉션의 dailyWage를 합산만 수행
 */
export async function getMonthlySalary(
  userId: string,
  companyId: string,
  yearMonth: string
): Promise<MonthlySalarySummary> {
  console.log('💰 월별 급여 조회:', { userId, yearMonth });
  
  try {
    // 1. 해당 월의 모든 출근 기록 조회
    // Validate yearMonth format
    if (!yearMonth || !yearMonth.match(/^\d{4}-\d{2}$/)) {
      throw new Error('Invalid yearMonth format. Expected YYYY-MM');
    }

    const [year, month] = yearMonth.split('-').map(Number);
    // Calculate last day of month correctly (not all months have 31 days)
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const attendanceQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('userId', '==', userId),
      where('companyId', '==', companyId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const snapshot = await getDocs(attendanceQuery);
    
    if (snapshot.empty) {
      console.log('⚠️ 출근 기록 없음');
      return {
        employeeUid: userId,
        employeeName: '',
        yearMonth,
        companyId,
        totalWorkDays: 0,
        totalWorkHours: 0,
        totalBasePay: 0,
        totalOvertimePay: 0,
        totalNightPay: 0,
        totalHolidayPay: 0,
        totalPay: 0,
        calculatedAt: new Date(),
      };
    }
    
    // 2. 집계 계산 (단순 sum)
    let totalWorkDays = 0;
    let totalWorkMinutes = 0;
    let totalBasePay = 0;
    let totalOvertimePay = 0;
    let totalNightPay = 0;
    let totalHolidayPay = 0;
    
    const uniqueDates = new Set<string>();
    let employeeName = '';
    let storeId = '';
    let storeName = '';
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as AttendanceRecord;
      
      // 근무일수 (중복 제거)
      uniqueDates.add(data.date);
      
      // 근무 시간
      totalWorkMinutes += data.workMinutes || 0;
      
      // 급여 합산
      totalBasePay += data.basePay || 0;
      totalOvertimePay += data.overtimePay || 0;
      totalNightPay += data.nightPay || 0;
      totalHolidayPay += data.holidayPay || 0;
      
      // 메타데이터
      if (!employeeName) employeeName = data.name || '';
      if (!storeId) storeId = data.storeId || '';
      if (!storeName) storeName = data.store || '';
    });
    
    totalWorkDays = uniqueDates.size;
    const totalWorkHours = totalWorkMinutes / 60;
    const totalPay = totalBasePay + totalOvertimePay + totalNightPay + totalHolidayPay;
    
    console.log('✅ 급여 집계 완료:', {
      totalWorkDays,
      totalWorkHours: totalWorkHours.toFixed(1),
      totalPay: totalPay.toLocaleString()
    });
    
    return {
      employeeUid: userId,
      employeeName,
      yearMonth,
      companyId,
      storeId,
      storeName,
      totalWorkDays,
      totalWorkHours,
      totalBasePay,
      totalOvertimePay,
      totalNightPay,
      totalHolidayPay,
      totalPay,
      calculatedAt: new Date(),
    };
    
  } catch (error: any) {
    console.error('❌ 급여 조회 실패:', error);
    throw new Error(error.message || '급여 조회 중 오류가 발생했습니다.');
  }
}

/**
 * 실시간 급여 조회 (onSnapshot)
 * 
 * 누군가 근태를 수정하면 자동으로 업데이트
 */
export function subscribeMonthlySalary(
  userId: string,
  companyId: string,
  yearMonth: string,
  callback: (salary: MonthlySalarySummary) => void
): Unsubscribe {
  console.log('🔔 실시간 급여 구독:', { userId, yearMonth });

  // Validate yearMonth format
  if (!yearMonth || !yearMonth.match(/^\d{4}-\d{2}$/)) {
    throw new Error('Invalid yearMonth format. Expected YYYY-MM');
  }

  const [year, month] = yearMonth.split('-').map(Number);
  // Calculate last day of month correctly
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  const attendanceQuery = query(
    collection(db, COLLECTIONS.ATTENDANCE),
    where('userId', '==', userId),
    where('companyId', '==', companyId),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  
  return onSnapshot(attendanceQuery, (snapshot) => {
    console.log('📡 실시간 업데이트 수신:', snapshot.docs.length, '건');
    
    if (snapshot.empty) {
      callback({
        employeeUid: userId,
        employeeName: '',
        yearMonth,
        companyId,
        totalWorkDays: 0,
        totalWorkHours: 0,
        totalBasePay: 0,
        totalOvertimePay: 0,
        totalNightPay: 0,
        totalHolidayPay: 0,
        totalPay: 0,
        calculatedAt: new Date(),
      });
      return;
    }
    
    // 집계 계산
    let totalWorkMinutes = 0;
    let totalBasePay = 0;
    let totalOvertimePay = 0;
    let totalNightPay = 0;
    let totalHolidayPay = 0;
    
    const uniqueDates = new Set<string>();
    let employeeName = '';
    let storeId = '';
    let storeName = '';
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as AttendanceRecord;
      
      uniqueDates.add(data.date);
      totalWorkMinutes += data.workMinutes || 0;
      totalBasePay += data.basePay || 0;
      totalOvertimePay += data.overtimePay || 0;
      totalNightPay += data.nightPay || 0;
      totalHolidayPay += data.holidayPay || 0;
      
      if (!employeeName) employeeName = data.name || '';
      if (!storeId) storeId = data.storeId || '';
      if (!storeName) storeName = data.store || '';
    });
    
    const totalWorkDays = uniqueDates.size;
    const totalWorkHours = totalWorkMinutes / 60;
    const totalPay = totalBasePay + totalOvertimePay + totalNightPay + totalHolidayPay;
    
    console.log('🔄 실시간 급여 업데이트:', {
      totalWorkDays,
      totalPay: totalPay.toLocaleString()
    });
    
    callback({
      employeeUid: userId,
      employeeName,
      yearMonth,
      companyId,
      storeId,
      storeName,
      totalWorkDays,
      totalWorkHours,
      totalBasePay,
      totalOvertimePay,
      totalNightPay,
      totalHolidayPay,
      totalPay,
      calculatedAt: new Date(),
    });
  });
}

/**
 * 회사 전체 직원 급여 조회
 */
export async function getCompanySalaries(
  companyId: string,
  yearMonth: string,
  filters?: {
    storeId?: string;
  }
): Promise<MonthlySalarySummary[]> {
  console.log('💰 회사 전체 급여 조회:', { companyId, yearMonth });
  
  try {
    // 1. 해당 회사의 모든 직원 조회
    let usersQuery = query(
      collection(db, COLLECTIONS.USERS),
      where('companyId', '==', companyId),
      where('role', 'in', ['staff', 'employee', 'store_manager', 'manager'])
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      console.log('⚠️ 직원 없음');
      return [];
    }
    
    // 2. 각 직원의 급여 조회
    const salaries: MonthlySalarySummary[] = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // 매장 필터 적용
      if (filters?.storeId && userData.storeId !== filters.storeId) {
        continue;
      }
      
      try {
        const salary = await getMonthlySalary(userId, companyId, yearMonth);
        salaries.push(salary);
      } catch (error) {
        console.error(`❌ ${userData.name} 급여 조회 실패:`, error);
      }
    }
    
    console.log('✅ 회사 전체 급여 조회 완료:', salaries.length, '명');
    
    return salaries;
    
  } catch (error: any) {
    console.error('❌ 회사 급여 조회 실패:', error);
    throw new Error(error.message || '회사 급여 조회 중 오류가 발생했습니다.');
  }
}

/**
 * 실시간 회사 전체 급여 구독
 */
export function subscribeCompanySalaries(
  companyId: string,
  yearMonth: string,
  filters: {
    storeId?: string;
  },
  callback: (salaries: MonthlySalarySummary[]) => void
): Unsubscribe {
  console.log('🔔 실시간 회사 급여 구독:', { companyId, yearMonth });

  // Validate yearMonth format
  if (!yearMonth || !yearMonth.match(/^\d{4}-\d{2}$/)) {
    throw new Error('Invalid yearMonth format. Expected YYYY-MM');
  }

  const [year, month] = yearMonth.split('-').map(Number);
  // Calculate last day of month correctly
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  // 회사 전체 출근 기록 구독
  let attendanceQuery = query(
    collection(db, COLLECTIONS.ATTENDANCE),
    where('companyId', '==', companyId),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  
  if (filters.storeId) {
    attendanceQuery = query(attendanceQuery, where('storeId', '==', filters.storeId));
  }
  
  return onSnapshot(attendanceQuery, async (snapshot) => {
    console.log('📡 실시간 회사 급여 업데이트:', snapshot.docs.length, '건');
    
    // 직원별로 그룹화
    const employeeMap = new Map<string, AttendanceRecord[]>();
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as AttendanceRecord;
      const userId = data.userId;
      
      if (!employeeMap.has(userId)) {
        employeeMap.set(userId, []);
      }
      
      employeeMap.get(userId)!.push(data);
    });
    
    // 각 직원의 급여 집계
    const salaries: MonthlySalarySummary[] = [];
    
    employeeMap.forEach((attendances, userId) => {
      let totalWorkMinutes = 0;
      let totalBasePay = 0;
      let totalOvertimePay = 0;
      let totalNightPay = 0;
      let totalHolidayPay = 0;
      
      const uniqueDates = new Set<string>();
      let employeeName = '';
      let storeId = '';
      let storeName = '';
      
      attendances.forEach((data) => {
        uniqueDates.add(data.date);
        totalWorkMinutes += data.workMinutes || 0;
        totalBasePay += data.basePay || 0;
        totalOvertimePay += data.overtimePay || 0;
        totalNightPay += data.nightPay || 0;
        totalHolidayPay += data.holidayPay || 0;
        
        if (!employeeName) employeeName = data.name || '';
        if (!storeId) storeId = data.storeId || '';
        if (!storeName) storeName = data.store || '';
      });
      
      const totalWorkDays = uniqueDates.size;
      const totalWorkHours = totalWorkMinutes / 60;
      const totalPay = totalBasePay + totalOvertimePay + totalNightPay + totalHolidayPay;
      
      salaries.push({
        employeeUid: userId,
        employeeName,
        yearMonth,
        companyId,
        storeId,
        storeName,
        totalWorkDays,
        totalWorkHours,
        totalBasePay,
        totalOvertimePay,
        totalNightPay,
        totalHolidayPay,
        totalPay,
        calculatedAt: new Date(),
      });
    });
    
    console.log('🔄 실시간 회사 급여 업데이트:', salaries.length, '명');
    
    callback(salaries);
  });
}
