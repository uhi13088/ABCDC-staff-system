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
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  deleteDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Contract, ContractFilters, ContractGroup } from '@/lib/types/contract';
import { useAuth } from '@/lib/auth-context';

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
    store: '',
    employmentStatus: 'active',  // 기본: 재직자만
  });

  /**
   * 매장 목록 로드
   */
  const loadStores = async () => {
    if (!companyId) return;
    
    try {
      const storesQuery = query(
        collection(db, 'stores'),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(storesQuery);
      const storesList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().storeName || '',
      }));
      setStores(storesList);
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
      // 1. 직원 정보 가져오기 (status 매핑용)
      const usersQuery = query(
        collection(db, 'users'),
        where('companyId', '==', companyId)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      const employeeStatusMap: Record<string, string> = {};
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        const key = `${user.name}_${user.birth}`;
        employeeStatusMap[key] = user.status || 'approved';
      });

      // 2. 계약서 가져오기
      const contractsQuery = query(
        collection(db, 'contracts'),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(contractsQuery);
      
      const allContracts: Contract[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // 매장 필터 적용
        if (filters.store) {
          if (data.workStore !== filters.store && data.companyName !== filters.store) {
            return;
          }
        }
        
        // 근무상태 필터 적용
        const empKey = `${data.employeeName}_${data.employeeBirth}`;
        const empStatus = employeeStatusMap[empKey] || 'approved';
        
        if (filters.employmentStatus === 'active') {
          if (empStatus !== 'approved' && empStatus !== 'active') {
            return;
          }
        } else if (filters.employmentStatus === 'resigned') {
          if (empStatus !== 'resigned') {
            return;
          }
        }
        
        // 계약서 추가
        allContracts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          signedAt: data.signedAt?.toDate?.() || data.signedAt,
        } as Contract);
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
      // 1. 연관 스케줄 삭제 (기본 스케줄만)
      console.log(`🗑️ 계약서 ${contractId}의 기본 스케줄 삭제 시작...`);
      
      const schedulesQuery = query(
        collection(db, 'schedules'),
        where('companyId', '==', companyId),
        where('contractId', '==', contractId)
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);
      
      if (!schedulesSnapshot.empty) {
        const batch = writeBatch(db);
        let deleteCount = 0;
        
        schedulesSnapshot.forEach(doc => {
          const scheduleData = doc.data();
          // 추가계약서/대체근무 스케줄은 제외
          if (!scheduleData.isAdditionalContract && !scheduleData.isSubstitute) {
            batch.delete(doc.ref);
            deleteCount++;
          }
        });
        
        if (deleteCount > 0) {
          await batch.commit();
          console.log(`✅ 기본 스케줄 ${deleteCount}개 삭제 완료`);
        }
      }
      
      // 2. 계약서 삭제
      await deleteDoc(doc(db, 'contracts', contractId));
      console.log(`✅ 계약서 ${contractId} 삭제 완료`);
      
      // 3. 목록 새로고침
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
      const docRef = doc(db, 'contracts', contractId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          signedAt: data.signedAt?.toDate?.() || data.signedAt,
        } as Contract;
      }
      
      return null;
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
