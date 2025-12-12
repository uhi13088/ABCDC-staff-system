/**
 * 대시보드 통계 Custom Hook
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

interface UseDashboardLogicProps {
  companyId: string;
}

interface DashboardStats {
  totalEmployees: number;
  todayAttendance: number;
  pendingApprovals: number;
  unsignedContracts: number;
}

export function useDashboardLogic({ companyId }: UseDashboardLogicProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    todayAttendance: 0,
    pendingApprovals: 0,
    unsignedContracts: 0,
  });
  const [loading, setLoading] = useState(false);

  const loadDashboardStats = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      // 총 직원 수
      const employeesSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.USERS),
          where('role', 'in', ['staff', 'store_manager', 'manager']),
          where('companyId', '==', companyId),
          where('status', '!=', 'resigned')
        )
      );

      // 오늘 출근
      const today = new Date().toISOString().split('T')[0];
      const attendanceSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.ATTENDANCE),
          where('companyId', '==', companyId),
          where('date', '==', today)
        )
      );

      // 승인 대기
      const approvalsSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.APPROVALS),
          where('companyId', '==', companyId),
          where('status', '==', 'pending')
        )
      );

      // 미서명 계약서
      const contractsSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.CONTRACTS), where('companyId', '==', companyId))
      );

      const signedSnapshot = await getDocs(
        query(collection(db, 'signed_contracts'), where('companyId', '==', companyId))
      );

      const signedIds = new Set<string>();
      signedSnapshot.forEach((doc) => signedIds.add(doc.id));

      const unsignedCount = contractsSnapshot.size - signedIds.size;

      setStats({
        totalEmployees: employeesSnapshot.size,
        todayAttendance: attendanceSnapshot.size,
        pendingApprovals: approvalsSnapshot.size,
        unsignedContracts: Math.max(0, unsignedCount),
      });

      setLoading(false);
    } catch (err: any) {
      console.error('❌ 대시보드 통계 로드 실패:', err);
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadDashboardStats();
    }
  }, [companyId, loadDashboardStats]);

  return {
    stats,
    loading,
    loadDashboardStats,
  };
}
