/**
 * 계약서 관리 Custom Hook
 * 기존 admin-dashboard.html의 Contracts 탭 로직을 React Hook으로 변환
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
  deleteDoc,
  addDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Contract, ContractFilterOptions, ContractStats } from '@/lib/types/contract';
import { COLLECTIONS } from '@/lib/constants';

interface UseContractLogicProps {
  companyId: string;
}

export function useContractLogic({ companyId }: UseContractLogicProps) {
  // State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContractFilterOptions>({});
  const [signedContractsCache, setSignedContractsCache] = useState<any[]>([]);

  /**
   * 서명된 계약서 캐시 로드 (기존 loadSignedContractsCache 함수)
   */
  const loadSignedContractsCache = useCallback(async () => {
    try {
      const q = query(
        collection(db, COLLECTIONS.SIGNED_CONTRACTS),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(q);
      
      const signed: any[] = [];
      snapshot.forEach((docSnap) => {
        signed.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      setSignedContractsCache(signed);
      console.log(`📄 서명된 계약서 ${signed.length}건 로드 완료`);
    } catch (err: any) {
      console.error('❌ 서명된 계약서 로드 실패:', err);
    }
  }, [companyId]);

  /**
   * 계약서 목록 로드 (기존 loadContracts 함수)
   */
  const loadContracts = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('📝 계약서 목록 로드 시작...');

      // 기본 쿼리
      let q = query(
        collection(db, COLLECTIONS.CONTRACTS),
        where('companyId', '==', companyId)
      );

      // 매장 필터
      // ✅ FIXED: storeId 기준으로 통일 (store 매장명 → storeId UUID)
      if (filters.store) {
        q = query(q, where('storeId', '==', filters.store));
      }

      // 정렬
      q = query(q, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      console.log(`📊 조회 결과: ${snapshot.size}개의 계약서`);

      const contractsList: Contract[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // 서명 여부 확인
        const isSigned = signedContractsCache.some(sc => sc.id === docSnap.id);
        
        contractsList.push({
          id: docSnap.id,
          companyId: data.companyId,
          employeeId: data.employeeId,
          employeeName: data.employeeName || '',
          employeeBirth: data.employeeBirth || '',
          employeePhone: data.employeePhone,
          employeeAddress: data.employeeAddress,
          contractType: data.contractType || 'regular',
          isAdditional: data.isAdditional,
          startDate: data.startDate || '',
          endDate: data.endDate,
          isIndefinite: data.isIndefinite,
          store: data.store || '',
          storeId: data.storeId,
          position: data.position || '',
          workType: data.workType || 'full_time',
          workDays: data.workDays,
          workStartTime: data.workStartTime,
          workEndTime: data.workEndTime,
          workHoursPerWeek: data.workHoursPerWeek,
          salaryType: data.salaryType || 'hourly',
          baseSalary: data.baseSalary,
          hourlyWage: data.hourlyWage,
          paymentMethod: data.paymentMethod,
          paymentDay: data.paymentDay,
          allowances: data.allowances,
          specialTerms: data.specialTerms,
          isSigned,
          signedAt: data.signedAt,
          signatureUrl: data.signatureUrl,
          employeeSignatureUrl: data.employeeSignatureUrl,
          employerSignatureUrl: data.employerSignatureUrl,
          pdfUrl: data.pdfUrl,
          status: data.status || 'draft',
          createdBy: data.createdBy || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // 고용 상태 필터 (클라이언트 사이드)
      let filteredContracts = contractsList;
      if (filters.employmentStatus) {
        // users 컬렉션에서 고용 상태 확인
        const employeeNames = [...new Set(contractsList.map(c => c.employeeName))];
        const usersSnapshot = await getDocs(
          query(
            collection(db, COLLECTIONS.USERS),
            where('companyId', '==', companyId)
          )
        );
        
        const employeeStatusMap: Record<string, string> = {};
        usersSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          employeeStatusMap[data.name] = data.status || 'active';
        });

        if (filters.employmentStatus === 'active') {
          filteredContracts = contractsList.filter(
            c => employeeStatusMap[c.employeeName] !== 'resigned'
          );
        } else if (filters.employmentStatus === 'resigned') {
          filteredContracts = contractsList.filter(
            c => employeeStatusMap[c.employeeName] === 'resigned'
          );
        }
      }

      console.log(`✅ ${filteredContracts.length}개의 계약서 표시`);
      setContracts(filteredContracts);
      setLoading(false);

    } catch (err: any) {
      console.error('❌ 계약서 목록 로드 실패:', err);
      setError(err.message || '계약서 목록을 불러오는데 실패했습니다.');
      setLoading(false);
    }
  }, [companyId, filters, signedContractsCache]);

  /**
   * 계약서 삭제 (기존 deleteContract 함수)
   */
  const deleteContract = useCallback(
    async (contractId: string, employeeName: string, employeeBirth: string) => {
      try {
        // 계약서 문서 삭제
        await deleteDoc(doc(db, 'contracts', contractId));
        
        // 서명 문서도 삭제 (있다면)
        try {
          await deleteDoc(doc(db, COLLECTIONS.SIGNED_CONTRACTS, contractId));
        } catch (err) {
          console.warn('서명 문서 없음 (정상)');
        }

        await loadContracts();
        await loadSignedContractsCache();

        return { success: true, message: `${employeeName}님의 계약서가 삭제되었습니다.` };
      } catch (err: any) {
        console.error('❌ 계약서 삭제 실패:', err);
        return { success: false, message: err.message || '삭제에 실패했습니다.' };
      }
    },
    [loadContracts, loadSignedContractsCache]
  );

  /**
   * 계약서 저장 (기존 saveContract 함수)
   */
  const saveContract = useCallback(
    async (contractData: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newContract = {
          ...contractData,
          companyId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          status: 'draft',
          isSigned: false,
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.CONTRACTS), newContract);

        await loadContracts();

        return { 
          success: true, 
          message: '계약서가 저장되었습니다.',
          contractId: docRef.id 
        };
      } catch (err: any) {
        console.error('❌ 계약서 저장 실패:', err);
        return { success: false, message: err.message || '저장에 실패했습니다.' };
      }
    },
    [companyId, loadContracts]
  );

  /**
   * 계약서 링크 전송 (기존 sendContractLink 함수)
   */
  const sendContractLink = useCallback(async (contractId: string) => {
    try {
      // 계약서 서명 링크 생성
      const signLink = `${window.location.origin}/contract-sign?id=${contractId}`;
      
      // 실제 SMS/이메일 전송 로직은 별도 구현 필요
      console.log('📧 계약서 링크:', signLink);
      
      return { 
        success: true, 
        message: '계약서 링크가 생성되었습니다.',
        link: signLink 
      };
    } catch (err: any) {
      console.error('❌ 링크 생성 실패:', err);
      return { success: false, message: err.message || '링크 생성에 실패했습니다.' };
    }
  }, []);

  /**
   * 직원의 계약서 목록 조회 (기존 loadEmployeeContractsList 함수)
   */
  const loadEmployeeContractsList = useCallback(
    async (name: string, birth: string) => {
      try {
        const q = query(
          collection(db, COLLECTIONS.CONTRACTS),
          where('employeeName', '==', name),
          where('employeeBirth', '==', birth),
          where('companyId', '==', companyId),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const employeeContracts: Contract[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const isSigned = signedContractsCache.some(sc => sc.id === docSnap.id);
          
          employeeContracts.push({
            id: docSnap.id,
            ...data,
            isSigned,
          } as Contract);
        });

        return { success: true, contracts: employeeContracts };
      } catch (err: any) {
        console.error('❌ 직원 계약서 조회 실패:', err);
        return { success: false, message: err.message, contracts: [] };
      }
    },
    [companyId, signedContractsCache]
  );

  /**
   * 계약서 통계 계산
   */
  const getContractStats = useCallback((): ContractStats => {
    const stats: ContractStats = {
      total: contracts.length,
      active: 0,
      expired: 0,
      unsigned: 0,
      byStore: {},
      byType: {},
    };

    contracts.forEach((contract) => {
      // 상태별
      if (contract.status === 'active') stats.active++;
      if (contract.status === 'expired') stats.expired++;
      if (!contract.isSigned) stats.unsigned++;

      // 매장별
      const store = contract.store || '미지정';
      stats.byStore[store] = (stats.byStore[store] || 0) + 1;

      // 유형별
      const type = contract.contractType || 'regular';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }, [contracts]);

  /**
   * 필터 업데이트
   */
  const updateFilters = useCallback((newFilters: Partial<ContractFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * 초기 로드
   */
  useEffect(() => {
    if (companyId) {
      loadSignedContractsCache();
    }
  }, [companyId, loadSignedContractsCache]);

  useEffect(() => {
    if (companyId) {
      loadContracts();
    }
  }, [companyId, filters, loadContracts]);

  return {
    // State
    contracts,
    loading,
    error,
    filters,
    signedContractsCache,

    // Actions
    loadContracts,
    loadSignedContractsCache,
    deleteContract,
    saveContract,
    sendContractLink,
    loadEmployeeContractsList,
    getContractStats,
    updateFilters,
  };
}
