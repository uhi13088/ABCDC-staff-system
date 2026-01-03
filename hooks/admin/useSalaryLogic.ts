/**
 * ========================================
 * useSalaryLogic v3.0 - SSOT + Realtime
 * ========================================
 * 
 * 핵심 변경사항:
 * 1. 실시간 구독 (onSnapshot) 지원
 * 2. 자동 조회 제거 (사용자가 버튼 클릭해야만 조회)
 * 3. View-only (계산은 Attendance에서 이미 완료됨)
 * 
 * 데이터 흐름:
 * - Attendance (clockOut 시) → 일급 자동 계산
 * - Salary Hook → 단순 집계 조회 (sum)
 * - 실시간 업데이트 자동 반영
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { COLLECTIONS } from '@/lib/constants';
import * as storeService from '@/services/storeService';
import * as attendanceService from '@/services/attendanceService';
import { nowKST, nowISOKST, yearKST, monthKST } from '@/lib/utils/timezone';

// ========================================
// 타입 정의
// ========================================

export interface Store {
  id: string;
  name: string;
  companyId: string;
}

export interface SalaryAggregation {
  userId: string;
  employeeName: string;
  storeName?: string;
  yearMonth: string; // 추가
  totalWorkDays: number;
  totalWorkHours: number;
  totalBasePay: number;
  totalOvertimePay: number;
  totalNightPay: number;
  totalHolidayPay: number;
  totalPay: number;
  status: 'unconfirmed' | 'confirmed' | 'paid';
  docId?: string;
}

export interface SalaryDetailData {
  userId: string;
  employeeName: string;
  yearMonth: string;
  attendances: any[];
  totalPay: number;
  contract: any;
}

// ========================================
// 메인 Hook
// ========================================

export function useSalaryLogic() {
  const { user } = useAuth();
  
  const [salaries, setSalaries] = useState<SalaryAggregation[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  
  // 급여 상세 모달 상태
  const [salaryDetailOpen, setSalaryDetailOpen] = useState(false);
  const [salaryDetail, setSalaryDetail] = useState<SalaryDetailData | null>(null);
  
  // 필터 상태
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return `${yearKST()}-${String(monthKST()).padStart(2, '0')}`;
  });
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState<string>('active');
  
  // ========================================
  // 매장 목록 로딩 (변경 없음)
  // ========================================
  
  useEffect(() => {
    if (!user?.uid || !user?.companyId) return;
    
    const loadStores = async () => {
      try {
        const companyId = user.companyId;
        const storesList = await storeService.getStores(companyId);
        setStores(storesList.map(s => ({
          id: s.id!,
          name: s.name || s.storeName || '',
          companyId: s.companyId || companyId,
        })));
        
        console.log('✅ 매장 목록 로딩 완료:', storesList.length);
      } catch (error) {
        console.error('❌ 매장 목록 로딩 실패:', error);
      }
    };
    
    loadStores();
  }, [user]);
  
  // ========================================
  // 🔥 핵심 변경: 급여 조회 (단순 집계)
  // ========================================
  
  /**
   * 급여 목록 조회 (단순 집계 버전)
   * 
   * 변경사항:
   * - Cloud Function 호출 제거
   * - Attendance의 dailyWage를 단순 합산
   * - 실시간 구독 옵션 제공
   */
  const loadSalaryList = useCallback(async () => {
    // [수정] 방어 코드 강화: companyId가 없으면 절대 실행하지 않음
    if (!user?.uid || !user?.companyId) {
      console.log('⏳ 사용자 정보 로딩 중...');
      return;
    }
    
    if (!selectedMonth) {
      alert('⚠️ 조회할 월을 선택해주세요.');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('💰 급여 조회 시작 (단순 집계):', selectedMonth);
      
      const companyId = user.companyId;
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      
      // 1. 직원 목록 조회
      const employeeQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('companyId', '==', companyId)
      );
      
      if (employmentStatusFilter && employmentStatusFilter !== 'all') {
        // where('employmentStatus', '==', employmentStatusFilter) // 필요 시
      }
      
      const employeeSnap = await getDocs(employeeQuery);
      const employees = employeeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      console.log('👥 직원 목록:', employees.length, '명');
      
      // 2. 각 직원의 근태 기록 조회 및 집계
      const salaryPromises = employees.map(async (employee: any) => {
        // 매장 필터
        if (selectedStore !== 'all' && employee.store !== selectedStore) {
          return null;
        }
        
        // 근태 기록 조회
        const attendanceQuery = query(
          collection(db, COLLECTIONS.ATTENDANCE),
          where('userId', '==', employee.uid),
          where('companyId', '==', companyId),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        
        const attendanceSnap = await getDocs(attendanceQuery);
        const attendances = attendanceSnap.docs.map(d => d.data());
        
        if (attendances.length === 0) {
          return null;
        }
        
        // 🔥 단순 집계 (sum)
        let totalWorkDays = 0;
        let totalWorkHours = 0;
        let totalBasePay = 0;
        let totalOvertimePay = 0;
        let totalNightPay = 0;
        let totalHolidayPay = 0;
        let totalPay = 0;
        
        attendances.forEach((att: any) => {
          if (att.clockIn && att.clockOut) {
            totalWorkDays++;
            totalWorkHours += (att.workMinutes || 0) / 60;
          }
          
          // 급여 필드 합산
          totalBasePay += att.basePay || 0;
          totalOvertimePay += att.overtimePay || 0;
          totalNightPay += att.nightPay || 0;
          totalHolidayPay += att.holidayPay || 0;
          totalPay += att.dailyWage || 0;
        });
        
        console.log(`💰 ${employee.name} 급여:`, totalPay);
        
        // 급여 상태 확인 (salary 컬렉션)
        const salaryQuery = query(
          collection(db, COLLECTIONS.SALARY),
          where('userId', '==', employee.uid),
          where('yearMonth', '==', selectedMonth)
        );
        
        const salarySnap = await getDocs(salaryQuery);
        
        let status: 'unconfirmed' | 'confirmed' | 'paid' = 'unconfirmed';
        let docId: string | undefined;
        
        if (!salarySnap.empty) {
          const salaryDoc = salarySnap.docs[0];
          docId = salaryDoc.id;
          const salaryData = salaryDoc.data();
          
          if (salaryData.paid) {
            status = 'paid';
          } else if (salaryData.status === 'confirmed') {
            status = 'confirmed';
          }
        }
        
        return {
          userId: employee.uid,
          employeeName: employee.name || '',
          storeName: employee.store || '',
          yearMonth: selectedMonth, // 추가
          totalWorkDays,
          totalWorkHours,
          totalBasePay,
          totalOvertimePay,
          totalNightPay,
          totalHolidayPay,
          totalPay,
          status,
          docId,
        } as SalaryAggregation;
      });
      
      const results = await Promise.all(salaryPromises);
      const validSalaries = results.filter((s): s is SalaryAggregation => s !== null);
      
      setSalaries(validSalaries);
      
      console.log('✅ 급여 조회 완료:', validSalaries.length, '명');
      
    } catch (error: any) {
      console.error('❌ 급여 조회 실패:', error);
      alert(error.message || '급여 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, selectedMonth, selectedStore, employmentStatusFilter]);
  
  // ========================================
  // 🔥 실시간 구독 (선택적)
  // ========================================
  
  useEffect(() => {
    if (!realtimeEnabled || !user?.uid || !user?.companyId || !selectedMonth) {
      return;
    }
    
    console.log('🔔 실시간 구독 시작');
    
    const companyId = user.companyId;
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    
    // Attendance 컬렉션을 실시간 구독
    const attendanceQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('companyId', '==', companyId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        console.log('📡 실시간 업데이트:', snapshot.size, '건');
        
        // 변경 감지 시 자동 재조회
        loadSalaryList();
      },
      (error) => {
        console.error('❌ 실시간 구독 실패:', error);
      }
    );
    
    return () => {
      console.log('🔕 실시간 구독 해제');
      unsubscribe();
    };
  }, [realtimeEnabled, user, selectedMonth, loadSalaryList]);
  
  // ========================================
  // 급여 확정/지급/재계산 (기존 로직 유지)
  // ========================================
  
  /**
   * 급여 확정
   */
  const confirmSalary = async (
    employeeUid: string,
    yearMonth: string,
    netPay: number,
    employeeName: string
  ) => {
    if (!user?.uid) return;
    
    try {
      const salaryRef = doc(collection(db, COLLECTIONS.SALARY));
      
      await setDoc(salaryRef, {
        companyId: user.companyId,
        userId: employeeUid,
        employeeName,
        yearMonth,
        netPay,
        status: 'confirmed',
        paid: false,
        confirmedAt: nowISOKST(),
        confirmedBy: user.uid,
      });
      
      alert(`✅ ${employeeName} 님의 ${yearMonth} 급여가 확정되었습니다.`);
      loadSalaryList();
    } catch (error: any) {
      console.error('❌ 급여 확정 실패:', error);
      alert(error.message || '급여 확정에 실패했습니다.');
    }
  };
  
  /**
   * 지급 완료
   */
  const markAsPaid = async (docId: string) => {
    if (!user?.uid) return;
    
    try {
      const salaryRef = doc(db, COLLECTIONS.SALARY, docId);
      
      await updateDoc(salaryRef, {
        paid: true,
        paidAt: nowISOKST(),
        paidBy: user.uid,
      });
      
      alert('✅ 지급 완료 처리되었습니다.');
      loadSalaryList();
    } catch (error: any) {
      console.error('❌ 지급 완료 실패:', error);
      alert(error.message || '지급 완료에 실패했습니다.');
    }
  };
  
  /**
   * 급여 재계산
   */
  const recalculateSalary = async (
    docId: string,
    employeeUid: string,
    yearMonth: string,
    employeeName: string
  ) => {
    if (!user?.uid) return;
    
    try {
      // 단순히 재조회만 수행 (계산은 Attendance에 이미 저장됨)
      await loadSalaryList();
      
      // salary 문서 업데이트 (recalculated 메타데이터 추가)
      if (docId) {
        const salaryRef = doc(db, COLLECTIONS.SALARY, docId);
        await updateDoc(salaryRef, {
          recalculatedAt: nowISOKST(),
          recalculatedBy: user.uid,
        });
      }
      
      alert(`✅ ${employeeName} 님의 급여가 재계산되었습니다.`);
    } catch (error: any) {
      console.error('❌ 급여 재계산 실패:', error);
      alert(error.message || '급여 재계산에 실패했습니다.');
    }
  };
  
  /**
   * 급여 상세 조회
   */
  const showSalaryDetail = async (employeeUid: string, yearMonth: string) => {
    if (!user?.companyId) return;
    
    try {
      const companyId = user.companyId;
      const [year, month] = yearMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      
      // 직원 정보 조회
      const employeeDoc = await getDoc(doc(db, COLLECTIONS.USERS, employeeUid));
      const employee = employeeDoc.data();
      
      // 근태 기록 조회
      const attendanceQuery = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('userId', '==', employeeUid),
        where('companyId', '==', companyId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const attendanceSnap = await getDocs(attendanceQuery);
      const attendances = attendanceSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      
      // 계약서 조회
      const contractQuery = query(
        collection(db, COLLECTIONS.CONTRACTS),
        where('userId', '==', employeeUid)
      );
      
      const contractSnap = await getDocs(contractQuery);
      const contract = contractSnap.empty ? null : contractSnap.docs[0].data();
      
      // 총액 계산
      const totalPay = attendances.reduce((sum, att: any) => sum + (att.dailyWage || 0), 0);
      
      setSalaryDetail({
        userId: employeeUid,
        employeeName: employee?.name || '',
        yearMonth,
        attendances,
        totalPay,
        contract,
      });
      
      setSalaryDetailOpen(true);
    } catch (error: any) {
      console.error('❌ 급여 상세 조회 실패:', error);
      alert(error.message || '급여 상세 조회에 실패했습니다.');
    }
  };
  
  /**
   * 상세 모달에서 급여 확정
   */
  const confirmSalaryFromDetail = () => {
    if (!salaryDetail) return;
    
    confirmSalary(
      salaryDetail.userId,
      salaryDetail.yearMonth,
      salaryDetail.totalPay,
      salaryDetail.employeeName
    );
    
    setSalaryDetailOpen(false);
  };
  
  return {
    // 상태
    salaries,
    stores,
    loading,
    salaryDetailOpen,
    salaryDetail,
    
    // 필터
    selectedMonth,
    setSelectedMonth,
    selectedStore,
    setSelectedStore,
    employmentStatusFilter,
    setEmploymentStatusFilter,
    
    // 액션
    loadSalaryList,
    confirmSalary,
    markAsPaid,
    recalculateSalary,
    showSalaryDetail,
    confirmSalaryFromDetail,
    setSalaryDetailOpen,
    
    // 실시간 구독 제어
    realtimeEnabled,
    setRealtimeEnabled,
  };
}
