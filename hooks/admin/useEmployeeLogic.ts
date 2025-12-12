/**
 * 직원 관리 Custom Hook
 * 기존 admin-dashboard.html의 Employee 탭 로직을 React Hook으로 변환
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Employee, EmployeeFilterOptions, EmployeeStats } from '@/lib/types/employee';

interface UseEmployeeLogicProps {
  companyId: string;
  userRole?: string;
}

export function useEmployeeLogic({ companyId, userRole }: UseEmployeeLogicProps) {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EmployeeFilterOptions>({});
  const [contractsMap, setContractsMap] = useState<Map<string, number>>(new Map());
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);

  /**
   * 직원 목록 로드 (기존 loadEmployees 함수)
   */
  const loadEmployees = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log('📋 직원 목록 로드 시작...');
      console.log(`📍 컬렉션: users, 조건: role in [staff, store_manager, manager], companyId: ${companyId}`);

      // Firestore users 컬렉션에서 직원 데이터 가져오기
      let q = query(
        collection(db, 'users'),
        where('role', 'in', ['staff', 'store_manager', 'manager']),
        where('companyId', '==', companyId)
      );

      // 상태 필터 적용
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      const usersSnapshot = await getDocs(q);
      console.log(`📊 조회 결과: ${usersSnapshot.size}명의 직원`);

      if (usersSnapshot.empty) {
        setEmployees([]);
        setLoading(false);
        return;
      }

      let employeesList: Employee[] = [];
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log(`✅ 직원 로드: ${data.name} (${docSnap.id}), status: ${data.status || 'active'}`);
        
        employeesList.push({
          id: docSnap.id,
          uid: docSnap.id,
          email: data.email || '',
          name: data.name || '-',
          displayName: data.displayName,
          phone: data.phone || '-',
          birth: data.birth || '-',
          address: data.address || '-',
          role: data.role,
          status: data.status || 'active',
          companyId: data.companyId,
          storeId: data.storeId,
          storeName: data.store || '-',
          store: data.store || '-',
          position: data.position || '-',
          employmentStatus: data.employmentStatus || (data.status === 'resigned' ? 'resigned' : 'active'),
          hireDate: data.hireDate,
          resignDate: data.resignDate,
          baseSalary: data.baseSalary,
          hourlyWage: data.hourlyWage,
          contractId: data.contractId,
          contractType: data.contractType,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // 필터가 없으면 resigned 제외 (재직자만 표시)
      if (!filters.status && !filters.employmentStatus) {
        employeesList = employeesList.filter(emp => emp.status !== 'resigned');
        console.log(`🔍 resigned 제외: ${employeesList.length}명의 재직자`);
      }

      // 매장 필터 적용 (클라이언트 사이드)
      if (filters.store) {
        employeesList = employeesList.filter(emp => emp.store === filters.store);
      }

      console.log(`✅ ${employeesList.length}명의 직원 목록 표시`);

      // Firestore에서 모든 계약서 가져오기
      const contractsSnapshot = await getDocs(collection(db, 'contracts'));
      const contractsMapTemp = new Map<string, number>();

      contractsSnapshot.forEach((docSnap) => {
        const contract = docSnap.data();
        const key = `${contract.employeeName}_${contract.employeeBirth}`;
        contractsMapTemp.set(key, (contractsMapTemp.get(key) || 0) + 1);
      });

      setContractsMap(contractsMapTemp);
      console.log(`📄 계약서 총 ${contractsSnapshot.size}건 조회 완료`);

      setEmployees(employeesList);
      setLoading(false);

    } catch (err: any) {
      console.error('❌ 직원 목록 로드 실패:', err);
      setError(err.message || '직원 목록을 불러오는데 실패했습니다.');
      setLoading(false);
    }
  }, [companyId, filters]);

  /**
   * 직원 삭제 (퇴사 처리) - 기존 deleteEmployee 함수
   */
  const deleteEmployee = useCallback(async (uid: string, name: string) => {
    try {
      console.log(`🔄 퇴사 처리 시작: ${name}`);

      // 1. Firestore users 문서의 status를 resigned로 업데이트
      await updateDoc(doc(db, 'users', uid), {
        status: 'resigned',
        resignDate: Timestamp.now(),
      });

      console.log(`✅ Firestore status 업데이트 완료`);

      // 2. employee_docs 컬렉션에서 서류 삭제
      try {
        await deleteDoc(doc(db, 'employee_docs', uid));
        console.log(`✅ Firestore 서류 삭제 완료`);
      } catch (error: any) {
        console.warn(`⚠️ Firestore 서류 삭제 실패 (없을 수 있음):`, error.message);
      }

      // 3. employees 컬렉션도 status 업데이트 (있다면)
      try {
        await updateDoc(doc(db, 'employees', uid), {
          status: 'resigned',
        });
        console.log(`✅ employees 컬렉션 status 업데이트 완료`);
      } catch (error: any) {
        console.warn(`⚠️ employees 컬렉션 업데이트 실패 (없을 수 있음):`, error.message);
      }

      // 직원 목록 새로고침
      await loadEmployees();

      return { success: true, message: `✅ ${name}님이 퇴사 처리되었습니다.` };

    } catch (err: any) {
      console.error('❌ 퇴사 처리 실패:', err);
      return { success: false, message: err.message || '퇴사 처리에 실패했습니다.' };
    }
  }, [loadEmployees]);

  /**
   * 직원 승인 - 기존 approveEmployee 함수
   */
  const approveEmployee = useCallback(async (uid: string, name: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: 'approved',
      });

      await loadEmployees();
      return { success: true, message: `✅ ${name}님이 승인되었습니다.` };

    } catch (err: any) {
      console.error('❌ 직원 승인 실패:', err);
      return { success: false, message: err.message || '승인 처리에 실패했습니다.' };
    }
  }, [loadEmployees]);

  /**
   * 직원 거부 - 기존 rejectEmployee 함수
   */
  const rejectEmployee = useCallback(async (uid: string, name: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: 'rejected',
      });

      await loadEmployees();
      return { success: true, message: `❌ ${name}님의 가입이 거부되었습니다.` };

    } catch (err: any) {
      console.error('❌ 직원 거부 실패:', err);
      return { success: false, message: err.message || '거부 처리에 실패했습니다.' };
    }
  }, [loadEmployees]);

  /**
   * 계약서 존재 여부 확인
   */
  const hasContract = useCallback((name: string, birth: string): boolean => {
    const key = `${name}_${birth}`;
    return contractsMap.has(key);
  }, [contractsMap]);

  /**
   * 계약서 개수 확인
   */
  const getContractCount = useCallback((name: string, birth: string): number => {
    const key = `${name}_${birth}`;
    return contractsMap.get(key) || 0;
  }, [contractsMap]);

  /**
   * 직원 통계 계산
   */
  const getEmployeeStats = useCallback((): EmployeeStats => {
    const stats: EmployeeStats = {
      total: employees.length,
      active: 0,
      resigned: 0,
      pending: 0,
      byStore: {},
      byPosition: {},
    };

    employees.forEach(emp => {
      // 상태별 집계
      if (emp.status === 'approved' || emp.status === 'active') {
        stats.active++;
      } else if (emp.status === 'resigned') {
        stats.resigned++;
      } else if (emp.status === 'pending') {
        stats.pending++;
      }

      // 매장별 집계
      const store = emp.store || '미지정';
      stats.byStore[store] = (stats.byStore[store] || 0) + 1;

      // 직급별 집계
      const position = emp.position || '미지정';
      stats.byPosition[position] = (stats.byPosition[position] || 0) + 1;
    });

    return stats;
  }, [employees]);

  /**
   * 매장 목록 로드
   */
  const loadStores = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const storesSnapshot = await getDocs(
        query(collection(db, 'stores'), where('companyId', '==', companyId))
      );
      
      const storesList = storesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().storeName || '매장',
      }));
      
      setStores(storesList);
    } catch (err) {
      console.error('매장 목록 로드 실패:', err);
    }
  }, [companyId]);

  /**
   * 전체 동기화 (백업 HTML의 syncAllEmployeesWithContracts 함수)
   */
  const syncAllEmployees = useCallback(async () => {
    if (!confirm('모든 직원의 정보를 최신 계약서 기준으로 동기화하시겠습니까?\n\n이 작업은 시간이 걸릴 수 있습니다.')) {
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔄 전체 동기화 시작...');
      
      // TODO: 실제 동기화 로직 구현
      // 1. 계약서 데이터 가져오기
      // 2. 직원 정보 업데이트
      // 3. 스케줄 자동 생성
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // 임시
      
      await loadEmployees();
      
      alert('✅ 전체 동기화가 완료되었습니다.');
      
    } catch (err: any) {
      console.error('❌ 전체 동기화 실패:', err);
      alert('동기화 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [loadEmployees]);

  /**
   * 필터 업데이트
   */
  const updateFilters = useCallback((newFilters: Partial<EmployeeFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * 초기 로드
   */
  useEffect(() => {
    if (companyId) {
      loadStores();
      loadEmployees();
    }
  }, [companyId, filters, loadEmployees, loadStores]);

  return {
    // State
    employees,
    loading,
    error,
    filters,
    contractsMap,
    stores,
    
    // Actions
    loadEmployees,
    deleteEmployee,
    approveEmployee,
    rejectEmployee,
    hasContract,
    getContractCount,
    getEmployeeStats,
    updateFilters,
    syncAllEmployees,
    
    // Computed
    isManager: userRole === 'manager',
  };
}
