/**
 * 계약서 관리 로직 Hook
 * 백업: admin-dashboard.html 라인 5627-5876 (loadContracts 함수)
 * 
 * 주요 기능:
 * 1. 계약서 목록 조회 (매장/근무상태 필터)
 * 2. 직원별 계약서 그룹화
 * 3. 일반 계약서 vs 추가 계약서 분리
 * 4. 계약서 삭제 (연관 스케줄도 삭제)
 * 5. 계약서 상세 조회
 */

'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { Contract, ContractFilters, ContractGroup } from '@/lib/types/contract';
import { useAuth } from '@/lib/auth-context';
import * as contractService from '@/services/contractService';
import * as storeService from '@/services/storeService';
import * as employeeService from '@/services/employeeService';

interface UseContractsLogicProps {
  companyId: string;
}

interface Store {
  id: string;
  name: string;
}

export function useContractsLogic({ companyId }: UseContractsLogicProps) {
  const { user } = useAuth();
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractGroups, setContractGroups] = useState<ContractGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  
  const [filters, setFilters] = useState<ContractFilters>({
    storeId: 'all',
    employmentStatus: 'active',  // 기본: 재직자만
  });

  /**
   * 매장 목록 로드 (Service Layer)
   */
  const loadStores = async () => {
    if (!companyId) return;
    
    try {
      // 🔥 Service Layer 사용
      const storesList = await storeService.getStores(companyId);
      setStores(storesList.map(s => ({
        id: s.id!,
        name: s.name || s.storeName || '',
      })));
    } catch (error) {
      console.error('❌ 매장 로드 실패:', error);
    }
  };

  /**
   * 계약서 목록 로드
   * 백업: admin-dashboard.html 라인 5627-5819
   */
  const loadContracts = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // 🔥 Service Layer 사용
      // 1. 직원 정보 가져오기 (status 매핑용)
      const employees = await employeeService.getEmployees(companyId);
      
      const employeeStatusMap: Record<string, string> = {};
      employees.forEach(emp => {
        const key = `${emp.name}_${emp.birth}`;
        employeeStatusMap[key] = emp.status || 'approved';
      });

      // 2. 계약서 가져오기
      let allContracts = await contractService.getContracts(companyId, {
        storeId: filters.storeId === 'all' || !filters.storeId ? undefined : filters.storeId,
      });
      
      // 근무상태 필터 적용 (클라이언트 사이드)
      allContracts = allContracts.filter(contract => {
        const empKey = `${contract.employeeName}_${contract.employeeBirth}`;
        const empStatus = employeeStatusMap[empKey] || 'approved';
        
        if (filters.employmentStatus === 'active') {
          return empStatus === 'approved' || empStatus === 'active';
        } else if (filters.employmentStatus === 'resigned') {
          return empStatus === 'resigned';
        } else if (filters.employmentStatus === 'all' || !filters.employmentStatus) {
          return true; // 전체 표시
        }
        return true;
      });
      
      setContracts(allContracts);
      
      // 3. 직원별 그룹화
      const groups = groupContractsByEmployee(allContracts);
      setContractGroups(groups);
      
    } catch (error) {
      console.error('❌ 계약서 로드 실패:', error);
      alert('계약서를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 직원별 계약서 그룹화
   * 백업: admin-dashboard.html 라인 5715-5728
   */
  const groupContractsByEmployee = (contracts: Contract[]): ContractGroup[] => {
    const employeeGroups = new Map<string, Contract[]>();
    
    contracts.forEach(contract => {
      const key = `${contract.employeeName}_${contract.employeeBirth}`;
      if (!employeeGroups.has(key)) {
        employeeGroups.set(key, []);
      }
      employeeGroups.get(key)!.push(contract);
    });
    
    // 각 그룹 정렬 (최신순)
    const groups: ContractGroup[] = [];
    employeeGroups.forEach((contracts, key) => {
      const sorted = contracts.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      const normalContracts = sorted.filter(c => !c.isAdditional);
      const additionalContracts = sorted.filter(c => c.isAdditional);
      
      const [employeeName, employeeBirth] = key.split('_');
      groups.push({
        employeeKey: key,
        employeeName,
        employeeBirth,
        normalContracts,
        additionalContracts,
      });
    });
    
    return groups;
  };

  /**
   * 계약서 삭제
   * 백업: admin-dashboard.html 라인 5856-5905
   * 
   * ⚠️ 중요: 해당 계약서로 생성된 기본 스케줄도 함께 삭제
   */
  const deleteContract = async (contractId: string, employeeName: string) => {
    if (!confirm(
      `⚠️ 정말로 "${employeeName}"님의 계약서를 삭제하시겠습니까?\n\n` +
      `⚠️ 해당 계약서로 생성된 스케줄도 함께 삭제됩니다.\n\n` +
      `이 작업은 되돌릴 수 없습니다.`
    )) {
      return;
    }
    
    try {
      // 🔥 Service Layer 사용
      await contractService.deleteContract(contractId, companyId!);
      
      alert('계약서가 삭제되었습니다.');
      await loadContracts();
      
    } catch (error) {
      console.error('❌ 계약서 삭제 실패:', error);
      alert('계약서 삭제에 실패했습니다.');
    }
  };

  /**
   * 계약서 상세 조회
   */
  const getContract = async (contractId: string): Promise<Contract | null> => {
    try {
      // 🔥 Service Layer 사용
      return await contractService.getContractById(contractId);
    } catch (error) {
      console.error('❌ 계약서 조회 실패:', error);
      return null;
    }
  };

  /**
   * 필터 업데이트
   */
  const updateFilters = (newFilters: Partial<ContractFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // 초기 로드
  useEffect(() => {
    if (companyId) {
      loadStores();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadContracts();
    }
  }, [companyId, filters]);

  return {
    contracts,
    contractGroups,
    loading,
    filters,
    stores,
    updateFilters,
    loadContracts,
    deleteContract,
    getContract,
  };
}
