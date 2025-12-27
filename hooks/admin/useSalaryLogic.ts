/**
 * Salary Management Logic Hook
 * 급여 관리 로직 (백업 HTML loadSalaryList 함수 기반)
 * 
 * @source /home/user/webapp-backup/admin-dashboard.html (lines 3491~3759)
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { SalaryCalculationResult } from '@/lib/utils/salary-calculator';
import { calculateMonthlySalaryOnServer } from '@/services/cloudFunctionsSalaryService';
import { COLLECTIONS } from '@/lib/constants';
import * as storeService from '@/services/storeService';
import * as salaryService from '@/services/salaryService';
import { nowKST, nowISOKST, yearKST, monthKST } from '@/lib/utils/timezone';

export interface SalaryWithStatus extends SalaryCalculationResult {
  status: 'unconfirmed' | 'confirmed' | 'paid';
  docId?: string;
}

export interface Store {
  id: string;
  name: string;
  companyId: string;
}

export interface SalaryDetailData {
  salary: SalaryCalculationResult;
  contract: any;
}

export function useSalaryLogic() {
  const { user } = useAuth();
  
  const [salaries, setSalaries] = useState<SalaryWithStatus[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 급여 상세 모달 상태
  const [salaryDetailOpen, setSalaryDetailOpen] = useState(false);
  const [salaryDetail, setSalaryDetail] = useState<SalaryDetailData | null>(null);
  
  // 필터 상태
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // KST 기준 현재 월
    return `${yearKST()}-${String(monthKST()).padStart(2, '0')}`;
  });
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState<string>('active');
  
  // 매장 목록 로딩
  useEffect(() => {
    // 🔒 Phase H: Race Condition 방지 (companyId 검증)
    if (!user?.uid || !user?.companyId) return;
    
    const loadStores = async () => {
      try {
        const companyId = user.companyId;
        
        // 🔥 Service Layer 사용
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
  
  /**
   * 급여 목록 조회 (백업 HTML loadSalaryList 함수 완전 복원)
   * @source /home/user/webapp-backup/admin-dashboard.html (lines 3491~3759)
   */
  const loadSalaryList = async () => {
    if (!selectedMonth) {
      alert('⚠️ 조회할 월을 선택해주세요.');
      return;
    }
    
    // 🔒 Phase H: Race Condition 방지 (companyId 검증)
    if (!user?.uid || !user?.companyId) return;
    
    setLoading(true);
    
    try {
      console.log('💰 급여 조회 시작:', selectedMonth);
      
      const companyId = user.companyId;
      
      // 🔒 companyId 조건 추가 (필수!)
      let employeesQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('role', 'in', ['staff', 'store_manager', 'manager']),
        where('companyId', '==', companyId)
      );
      
      // 매장 필터 적용
      if (selectedStore && selectedStore !== 'all') {
        employeesQuery = query(employeesQuery, where('store', '==', selectedStore));
        console.log(`🏪 매장 필터 적용: ${selectedStore}`);
      } else {
        console.log('🏪 전체 매장 조회');
      }
      
      // 모든 직원 가져오기
      const employeesSnapshot = await getDocs(employeesQuery);
      
      if (employeesSnapshot.empty) {
        setSalaries([]);
        setLoading(false);
        return;
      }
      
      const salaryData: SalaryWithStatus[] = [];
      
      for (const empDoc of employeesSnapshot.docs) {
        const employee = { uid: empDoc.id, ...empDoc.data() };
        
        // 근무상태 필터 적용
        const empStatus = employee.status || 'approved';
        
        if (employmentStatusFilter === 'active') {
          // 재직자만
          if (empStatus !== 'approved' && empStatus !== 'active') {
            continue;
          }
        } else if (employmentStatusFilter === 'resigned') {
          // 퇴사자만
          if (empStatus !== 'resigned') {
            continue;
          }
        }
        // else: 전체 = 재직자 + 퇴사자 모두 표시 (필터링 없음)
        
        // 해당 직원의 계약서 찾기 (복합 인덱스 없이 처리)
        let contractQuery = query(
          collection(db, COLLECTIONS.CONTRACTS),
          where('employeeName', '==', employee.name)
        );
        
        // 🔒 companyId 조건 추가
        if (companyId) {
          contractQuery = query(contractQuery, where('companyId', '==', companyId));
        }
        
        const contractsSnapshot = await getDocs(contractQuery);
        
        if (contractsSnapshot.empty) {
          console.log('⚠️ 계약서 없음:', employee.name);
          continue;
        }
        
        // 클라이언트에서 최신 계약서 찾기
        const contracts: any[] = [];
        contractsSnapshot.forEach(doc => {
          contracts.push({ id: doc.id, ...doc.data() });
        });
        contracts.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        const contract = contracts[0];
        
        // 4단계 개선: 계약서의 계산 기간 설정을 기반으로 계산 기간 결정
        const calculationType = contract.salaryCalculationType || 'prev_month_full';
        const calculationPeriod = contract.salaryCalculationPeriod || null;
        const [year, month] = selectedMonth.split('-').map(Number);
        
        let startDate: string, endDate: string;
        
        // 계산 기간 타입에 따라 분기
        if (calculationType === 'prev_month_full') {
          // 전월 전체 (전월 1일~말일)
          const prevMonth = new Date(year, month - 2, 1);
          const prevYear = prevMonth.getFullYear();
          const prevMonthNum = String(prevMonth.getMonth() + 1).padStart(2, '0');
          const lastDayOfPrevMonth = new Date(prevYear, prevMonth.getMonth() + 1, 0).getDate();
          startDate = `${prevYear}-${prevMonthNum}-01`;
          endDate = `${prevYear}-${prevMonthNum}-${lastDayOfPrevMonth}`;
          console.log('💰 급여 계산 기간 (전월 전체):', startDate, '~', endDate);
          
        } else if (calculationType === 'current_month_full') {
          // 당월 전체 (당월 1일~말일)
          const lastDay = new Date(year, month, 0).getDate();
          startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
          console.log('💰 급여 계산 기간 (당월 전체):', startDate, '~', endDate);
          
        } else if (calculationType === 'custom' && calculationPeriod) {
          // 사용자 지정
          const startMonth = calculationPeriod.startMonth; // 'prev' or 'current'
          const startDay = calculationPeriod.startDay;
          const endMonth = calculationPeriod.endMonth;
          const endDay = calculationPeriod.endDay; // 숫자 or 'last'
          
          // 시작일 계산
          if (startMonth === 'prev') {
            const prevMonth = new Date(year, month - 2, 1);
            const prevYear = prevMonth.getFullYear();
            const prevMonthNum = String(prevMonth.getMonth() + 1).padStart(2, '0');
            startDate = `${prevYear}-${prevMonthNum}-${String(startDay).padStart(2, '0')}`;
          } else {
            startDate = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
          }
          
          // 종료일 계산
          if (endMonth === 'prev') {
            const prevMonth = new Date(year, month - 2, 1);
            const prevYear = prevMonth.getFullYear();
            const prevMonthNum = String(prevMonth.getMonth() + 1).padStart(2, '0');
            if (endDay === 'last') {
              const lastDay = new Date(prevYear, prevMonth.getMonth() + 1, 0).getDate();
              endDate = `${prevYear}-${prevMonthNum}-${lastDay}`;
            } else {
              endDate = `${prevYear}-${prevMonthNum}-${String(endDay).padStart(2, '0')}`;
            }
          } else {
            if (endDay === 'last') {
              const lastDay = new Date(year, month, 0).getDate();
              endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
            } else {
              endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
            }
          }
          
          console.log('💰 급여 계산 기간 (사용자 지정):', startDate, '~', endDate);
          
        } else {
          // 정보 없음 → 기본 전월 전체 계산
          const prevMonth = new Date(year, month - 2, 1);
          const prevYear = prevMonth.getFullYear();
          const prevMonthNum = String(prevMonth.getMonth() + 1).padStart(2, '0');
          const lastDayOfPrevMonth = new Date(prevYear, prevMonth.getMonth() + 1, 0).getDate();
          startDate = `${prevYear}-${prevMonthNum}-01`;
          endDate = `${prevYear}-${prevMonthNum}-${lastDayOfPrevMonth}`;
          console.log('⚠️ 계약서에 계산 기간 정보 없음, 전월 전체 기준 계산:', startDate, '~', endDate);
        }
        
        let attendanceQuery = query(
          collection(db, COLLECTIONS.ATTENDANCE),
          where('uid', '==', employee.uid),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        
        // 🔒 companyId 조건 추가
        if (companyId) {
          attendanceQuery = query(attendanceQuery, where('companyId', '==', companyId));
        }
        
        const attendancesSnapshot = await getDocs(attendanceQuery);
        
        const attendances: any[] = [];
        attendancesSnapshot.forEach(doc => {
          attendances.push(doc.data());
        });
        
        // 🔥 Cloud Functions로 급여 계산 (서버 사이드)
        const salary = await calculateMonthlySalaryOnServer(employee.uid, selectedMonth);
        
        // 기본 상태를 unconfirmed로 설정
        salaryData.push({
          ...salary,
          status: 'unconfirmed'
        });
      }
      
      // Firestore에서 확정된 급여 정보 가져오기
      let salariesQuery = query(
        collection(db, COLLECTIONS.SALARY),
        where('yearMonth', '==', selectedMonth),
        where('companyId', '==', companyId)
      );
      
      // 🔒 매장 필터 적용 (선택 시)
      if (selectedStore && selectedStore !== 'all') {
        salariesQuery = query(salariesQuery, where('storeName', '==', selectedStore));
      }
      
      const salariesSnapshot = await getDocs(salariesQuery);
      
      const confirmedSalaries: Record<string, { status: string; paid: boolean; docId: string }> = {};
      salariesSnapshot.forEach(doc => {
        const data = doc.data();
        confirmedSalaries[data.employeeUid || data.userId] = {
          status: data.status || 'confirmed',
          paid: data.paid || false,
          docId: doc.id
        };
      });
      
      // 확정 상태 반영
      salaryData.forEach(salary => {
        const confirmed = confirmedSalaries[salary.employeeUid || salary.userId];
        if (confirmed) {
          if (confirmed.status === 'paid') {
            salary.status = 'paid';
          } else if (confirmed.status === 'confirmed') {
            salary.status = 'confirmed';
          }
          salary.docId = confirmed.docId;
        }
      });
      
      setSalaries(salaryData);
      console.log('✅ 급여 조회 완료:', salaryData.length);
      
    } catch (error) {
      console.error('❌ 급여 조회 실패:', error);
      alert('급여 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 급여 확정 (confirmSalary 함수)
   */
  const confirmSalary = async (employeeUid: string, yearMonth: string, netPay: number, employeeName: string) => {
    if (!user?.uid) return;
    
    try {
      const companyId = user.companyId || 'default-company';
      
      // 해당 직원의 급여 데이터 찾기
      const salary = salaries.find(s => s.employeeUid === employeeUid);
      if (!salary) {
        alert('급여 정보를 찾을 수 없습니다.');
        return;
      }
      
      // Firestore에 급여 확정 정보 저장
      const salaryDocRef = doc(collection(db, COLLECTIONS.SALARY));
      await setDoc(salaryDocRef, {
        ...salary,
        companyId,
        employeeUid,
        userId: employeeUid, // 🔥 표준 필드
        employeeName,
        yearMonth,
        netPay,
        status: 'confirmed',
        paid: false,
        confirmedAt: nowISOKST(), // KST 기준
        confirmedBy: user.uid
      });
      
      console.log('✅ 급여 확정 완료:', employeeName, yearMonth);
      
      // 목록 새로고침
      await loadSalaryList();
      
      alert(`✅ ${employeeName}님의 급여가 확정되었습니다.\n실지급액: ${netPay.toLocaleString()}원`);
      
    } catch (error) {
      console.error('❌ 급여 확정 실패:', error);
      alert('급여 확정 중 오류가 발생했습니다.');
    }
  };
  
  /**
   * 지급 완료 처리 (markAsPaid 함수)
   */
  const markAsPaid = async (docId: string) => {
    try {
      const salaryDocRef = doc(db, COLLECTIONS.SALARY, docId);
      await updateDoc(salaryDocRef, {
        status: 'paid',
        paid: true,
        paidAt: nowISOKST(), // KST 기준
        paidBy: user?.uid
      });
      
      console.log('✅ 지급 완료 처리:', docId);
      
      // 목록 새로고침
      await loadSalaryList();
      
      alert('✅ 급여 지급이 완료되었습니다.');
      
    } catch (error) {
      console.error('❌ 지급 완료 처리 실패:', error);
      alert('지급 완료 처리 중 오류가 발생했습니다.');
    }
  };
  
  /**
   * 급여 상세 조회 (showSalaryDetail 함수)
   * @source /home/user/webapp-backup/admin-dashboard.html (lines 3764~3962)
   */
  const showSalaryDetail = async (employeeUid: string, yearMonth: string) => {
    try {
      console.log('💰 급여 상세 조회:', employeeUid, yearMonth);
      
      if (!user?.uid) return;
      const companyId = user.companyId || 'default-company';
      
      // 직원 정보 가져오기
      const empDoc = await getDoc(doc(db, 'users', employeeUid));
      if (!empDoc.exists()) {
        alert('❌ 직원 정보를 찾을 수 없습니다.');
        return;
      }
      const employee = { uid: empDoc.id, ...empDoc.data() };
      
      // 계약서 찾기 (복합 인덱스 없이 처리)
      const contractsQuery = query(
        collection(db, COLLECTIONS.CONTRACTS),
        where('employeeName', '==', employee.name),
        where('companyId', '==', companyId)
      );
      const contractsSnapshot = await getDocs(contractsQuery);
      
      if (contractsSnapshot.empty) {
        alert('❌ 계약서를 찾을 수 없습니다.');
        return;
      }
      
      // 클라이언트에서 최신 계약서 찾기
      const contracts: any[] = [];
      contractsSnapshot.forEach(doc => {
        contracts.push({ id: doc.id, ...doc.data() });
      });
      contracts.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      const contract = contracts[0];
      
      // 출퇴근 기록 가져오기
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
      
      const attendancesQuery = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('uid', '==', employeeUid),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        where('companyId', '==', companyId)
      );
      const attendancesSnapshot = await getDocs(attendancesQuery);
      
      const attendances: any[] = [];
      attendancesSnapshot.forEach(doc => {
        attendances.push(doc.data());
      });
      
      // 🔥 Cloud Functions로 급여 계산 (서버 사이드)
      const salary = await calculateMonthlySalaryOnServer(employee.uid, yearMonth);
      
      // 모달 데이터 설정 및 열기
      setSalaryDetail({ salary, contract });
      setSalaryDetailOpen(true);
      
      console.log('✅ 급여 상세 조회 완료');
      
    } catch (error) {
      console.error('❌ 급여 상세 조회 실패:', error);
      alert('급여 상세 조회에 실패했습니다: ' + (error as Error).message);
    }
  };
  
  /**
   * 급여 상세 모달에서 급여 확정
   */
  const confirmSalaryFromDetail = async () => {
    if (!salaryDetail) return;
    
    await confirmSalary(
      salaryDetail.salary.userId,
      salaryDetail.salary.yearMonth,
      salaryDetail.salary.netPay,
      salaryDetail.salary.employeeName
    );
    
    setSalaryDetailOpen(false);
  };
  
  // 자동 로딩 (월/매장/근무상태 필터 변경 시)
  useEffect(() => {
    if (user?.uid && selectedMonth) {
      loadSalaryList();
    }
  }, [selectedMonth, selectedStore, employmentStatusFilter, user]);
  
  return {
    salaries,
    stores,
    loading,
    selectedMonth,
    selectedStore,
    employmentStatusFilter,
    salaryDetailOpen,
    salaryDetail,
    setSelectedMonth,
    setSelectedStore,
    setEmploymentStatusFilter,
    setSalaryDetailOpen,
    loadSalaryList,
    confirmSalary,
    markAsPaid,
    showSalaryDetail,
    confirmSalaryFromDetail
  };
}
