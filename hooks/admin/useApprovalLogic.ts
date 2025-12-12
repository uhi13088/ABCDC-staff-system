/**
 * 승인 관리 Custom Hook
 * 기존 admin-dashboard.html의 Approvals 탭 로직을 React Hook으로 변환
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
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ApprovalRequest, ApprovalFilterOptions, ApprovalStats } from '@/lib/types/approval';

interface UseApprovalLogicProps {
  companyId: string;
}

export function useApprovalLogic({ companyId }: UseApprovalLogicProps) {
  // State
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ApprovalFilterOptions>({});

  /**
   * 승인 목록 로드 (기존 loadApprovals 함수)
   */
  const loadApprovals = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('✅ 승인 목록 로드 시작...');

      // 기본 쿼리
      let q = query(
        collection(db, 'approvals'),
        where('companyId', '==', companyId)
      );

      // 승인 유형 필터
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }

      // 상태 필터
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      // 정렬
      q = query(q, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      console.log(`📊 조회 결과: ${snapshot.size}건의 승인 요청`);

      const approvalsList: ApprovalRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        approvalsList.push({
          id: docSnap.id,
          companyId: data.companyId,
          requesterId: data.requesterId || '',
          requesterName: data.requesterName || '',
          requesterEmail: data.requesterEmail,
          type: data.type,
          title: data.title || '',
          content: data.content || '',
          amount: data.amount,
          attachments: data.attachments,
          relatedId: data.relatedId,
          metadata: data.metadata,
          status: data.status || 'pending',
          approverId: data.approverId,
          approverName: data.approverName,
          approvedAt: data.approvedAt,
          rejectionReason: data.rejectionReason,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      setApprovals(approvalsList);
      setLoading(false);

      console.log('✅ 승인 목록 로드 완료');
    } catch (err: any) {
      console.error('❌ 승인 목록 로드 실패:', err);
      setError(err.message || '승인 목록을 불러오는데 실패했습니다.');
      setLoading(false);
    }
  }, [companyId, filters]);

  /**
   * 문서 승인 (기존 approveDocument 함수)
   */
  const approveDocument = useCallback(
    async (approvalId: string, type: string, approverId: string, approverName: string) => {
      try {
        await updateDoc(doc(db, 'approvals', approvalId), {
          status: 'approved',
          approverId,
          approverName,
          approvedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        await loadApprovals();

        return { success: true, message: '승인되었습니다.' };
      } catch (err: any) {
        console.error('❌ 승인 실패:', err);
        return { success: false, message: err.message || '승인에 실패했습니다.' };
      }
    },
    [loadApprovals]
  );

  /**
   * 문서 거부 (기존 rejectDocument 함수)
   */
  const rejectDocument = useCallback(
    async (approvalId: string, type: string, reason: string, approverId: string, approverName: string) => {
      try {
        await updateDoc(doc(db, 'approvals', approvalId), {
          status: 'rejected',
          rejectionReason: reason,
          approverId,
          approverName,
          approvedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        await loadApprovals();

        return { success: true, message: '거부되었습니다.' };
      } catch (err: any) {
        console.error('❌ 거부 실패:', err);
        return { success: false, message: err.message || '거부에 실패했습니다.' };
      }
    },
    [loadApprovals]
  );

  /**
   * 교대근무 승인 취소 (기존 revertShiftApproval 함수)
   */
  const revertShiftApproval = useCallback(
    async (approvalId: string, shiftId: string) => {
      try {
        // 승인 상태를 pending으로 되돌림
        await updateDoc(doc(db, 'approvals', approvalId), {
          status: 'pending',
          approverId: null,
          approverName: null,
          approvedAt: null,
          updatedAt: Timestamp.now(),
        });

        // 스케줄도 원상복구 (필요시)
        if (shiftId) {
          await updateDoc(doc(db, 'schedules', shiftId), {
            status: 'cancelled',
            updatedAt: Timestamp.now(),
          });
        }

        await loadApprovals();

        return { success: true, message: '승인이 취소되었습니다.' };
      } catch (err: any) {
        console.error('❌ 승인 취소 실패:', err);
        return { success: false, message: err.message || '취소에 실패했습니다.' };
      }
    },
    [loadApprovals]
  );

  /**
   * 퇴직 승인 취소 (기존 revertResignationApproval 함수)
   */
  const revertResignationApproval = useCallback(
    async (approvalId: string, employeeUid: string) => {
      try {
        // 승인 취소
        await updateDoc(doc(db, 'approvals', approvalId), {
          status: 'pending',
          approverId: null,
          approverName: null,
          approvedAt: null,
          updatedAt: Timestamp.now(),
        });

        // 직원 상태 복원 (resigned → active)
        if (employeeUid) {
          await updateDoc(doc(db, 'users', employeeUid), {
            status: 'active',
            resignDate: null,
          });
        }

        await loadApprovals();

        return { success: true, message: '퇴직 승인이 취소되었습니다.' };
      } catch (err: any) {
        console.error('❌ 퇴직 승인 취소 실패:', err);
        return { success: false, message: err.message || '취소에 실패했습니다.' };
      }
    },
    [loadApprovals]
  );

  /**
   * 결근 승인 + 긴급 모집 (기존 approveAbsenceWithRecruitment 함수)
   */
  const approveAbsenceWithRecruitment = useCallback(
    async (approvalId: string, absenceData: any) => {
      try {
        // 결근 승인
        await updateDoc(doc(db, 'approvals', approvalId), {
          status: 'approved',
          approvedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        // 긴급 모집 생성 (absenceData에서 정보 추출)
        if (absenceData.createRecruitment) {
          await addDoc(collection(db, 'emergency_recruitments'), {
            companyId,
            storeId: absenceData.storeId,
            store: absenceData.store,
            date: absenceData.date,
            startTime: absenceData.startTime,
            endTime: absenceData.endTime,
            requiredCount: 1,
            currentCount: 0,
            status: 'open',
            applicants: [],
            createdBy: absenceData.approverId,
            createdAt: Timestamp.now(),
          });
        }

        await loadApprovals();

        return { success: true, message: '결근이 승인되고 긴급 모집이 등록되었습니다.' };
      } catch (err: any) {
        console.error('❌ 결근 승인 실패:', err);
        return { success: false, message: err.message || '승인에 실패했습니다.' };
      }
    },
    [companyId, loadApprovals]
  );

  /**
   * 승인 통계 계산
   */
  const getApprovalStats = useCallback((): ApprovalStats => {
    const stats: ApprovalStats = {
      total: approvals.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      byType: {
        purchase: 0,
        disposal: 0,
        resignation: 0,
        absence: 0,
        shift: 0,
        leave: 0,
        overtime: 0,
        document: 0,
        other: 0,
      },
    };

    approvals.forEach((approval) => {
      // 상태별
      if (approval.status === 'pending') stats.pending++;
      if (approval.status === 'approved') stats.approved++;
      if (approval.status === 'rejected') stats.rejected++;

      // 유형별
      stats.byType[approval.type]++;
    });

    return stats;
  }, [approvals]);

  /**
   * 필터 업데이트
   */
  const updateFilters = useCallback((newFilters: Partial<ApprovalFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * 초기 로드
   */
  useEffect(() => {
    if (companyId) {
      loadApprovals();
    }
  }, [companyId, filters, loadApprovals]);

  return {
    // State
    approvals,
    loading,
    error,
    filters,

    // Actions
    loadApprovals,
    approveDocument,
    rejectDocument,
    revertShiftApproval,
    revertResignationApproval,
    approveAbsenceWithRecruitment,
    getApprovalStats,
    updateFilters,
  };
}
