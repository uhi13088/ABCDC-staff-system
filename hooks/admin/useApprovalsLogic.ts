/**
 * Approvals Management Logic Hook
 * 승인 관리 로직 (백업 HTML loadApprovals 함수 기반)
 * 
 * @source /home/user/webapp-backup/admin-dashboard.html (lines 4446~4661)
 */

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import type { Approval, ApprovalType, ApprovalStatus, ShiftRequest } from '@/lib/types/approval';
import { COLLECTIONS } from '@/lib/constants';

export function useApprovalsLogic() {
  const { user } = useAuth();
  
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 필터 상태
  const [typeFilter, setTypeFilter] = useState<ApprovalType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | ''>('');
  
  // 상세 모달 상태
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  
  /**
   * 승인 목록 조회 (loadApprovals 함수)
   * @source /home/user/webapp-backup/admin-dashboard.html (lines 4446~4661)
   */
  const loadApprovals = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    
    try {
      console.log('✔️ 승인 목록 조회 시작...');
      
      const companyId = user.companyId || 'default-company';
      let allApprovals: Approval[] = [];
      
      // 교대근무 승인 조회 (shift_requests 컬렉션)
      if (!typeFilter || typeFilter === 'shift') {
        console.log('🔄 교대근무 승인 조회 시작...');
        
        let shiftQuery = query(
          collection(db, 'shift_requests'),
          where('companyId', '==', companyId)
        );
        
        // 상태 필터 적용
        if (statusFilter === 'pending') {
          shiftQuery = query(shiftQuery, where('approvedByAdmin', '==', false));
        } else if (statusFilter === 'approved') {
          shiftQuery = query(shiftQuery, where('approvedByAdmin', '==', true));
        }
        
        const shiftSnapshot = await getDocs(shiftQuery);
        console.log(`  조회된 교대근무: ${shiftSnapshot.size}개`);
        
        shiftSnapshot.forEach(docSnap => {
          const data = docSnap.data() as ShiftRequest;
          const currentStatus: ApprovalStatus = data.approvedByAdmin ? 'approved' : 'pending';
          
          // 상태 필터가 없거나 일치하는 경우만 추가
          if (!statusFilter || statusFilter === currentStatus) {
            allApprovals.push({
              id: docSnap.id,
              type: 'shift',
              applicantName: data.requesterName,
              status: currentStatus,
              createdAt: data.matchedAt || data.createdAt,
              companyId: data.companyId,
              data: {
                requesterName: data.requesterName,
                matchedUserName: data.matchedUserName,
                workDate: data.workDate,
                workStartTime: data.workStartTime,
                workEndTime: data.workEndTime,
                reason: data.reason || '',
                store: data.store
              }
            });
          }
        });
        
        console.log(`  최종 추가된 교대근무: ${allApprovals.filter(a => a.type === 'shift').length}개`);
      }
      
      // 기존 승인 문서 조회 (approvals 컬렉션)
      if (!typeFilter || typeFilter !== 'shift') {
        let approvalsQuery = query(
          collection(db, COLLECTIONS.APPROVALS),
          where('companyId', '==', companyId)
        );
        
        if (typeFilter && typeFilter !== 'shift') {
          approvalsQuery = query(approvalsQuery, where('type', '==', typeFilter));
        }
        
        if (statusFilter) {
          approvalsQuery = query(approvalsQuery, where('status', '==', statusFilter));
        }
        
        const snapshot = await getDocs(approvalsQuery);
        snapshot.forEach(docSnap => {
          allApprovals.push({
            id: docSnap.id,
            ...docSnap.data()
          } as Approval);
        });
      }
      
      // 최신순 정렬
      allApprovals.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      setApprovals(allApprovals);
      console.log('✅ 승인 목록 조회 완료:', allApprovals.length);
      
    } catch (error) {
      console.error('❌ 승인 목록 조회 실패:', error);
      alert('승인 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 교대근무 승인
   */
  const approveShiftRequest = async (shiftId: string) => {
    try {
      await updateDoc(doc(db, 'shift_requests', shiftId), {
        approvedByAdmin: true,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid
      });
      
      console.log('✅ 교대근무 승인 완료:', shiftId);
      
      // 목록 새로고침
      await loadApprovals();
      
      alert('✅ 교대근무가 승인되었습니다.');
      
    } catch (error) {
      console.error('❌ 교대근무 승인 실패:', error);
      alert('교대근무 승인 중 오류가 발생했습니다.');
    }
  };
  
  /**
   * 교대근무 반려
   */
  const rejectShiftRequest = async (shiftId: string, reason?: string) => {
    try {
      await updateDoc(doc(db, 'shift_requests', shiftId), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid,
        rejectionReason: reason || ''
      });
      
      console.log('✅ 교대근무 반려 완료:', shiftId);
      
      // 목록 새로고침
      await loadApprovals();
      
      alert('✅ 교대근무가 반려되었습니다.');
      
    } catch (error) {
      console.error('❌ 교대근무 반려 실패:', error);
      alert('교대근무 반려 중 오류가 발생했습니다.');
    }
  };
  
  /**
   * 일반 승인 문서 승인
   */
  const approveDocument = async (approvalId: string) => {
    try {
      await updateDoc(doc(db, 'approvals', approvalId), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid
      });
      
      console.log('✅ 승인 문서 처리 완료:', approvalId);
      
      // 목록 새로고침
      await loadApprovals();
      
      alert('✅ 승인이 완료되었습니다.');
      
    } catch (error) {
      console.error('❌ 승인 문서 처리 실패:', error);
      alert('승인 처리 중 오류가 발생했습니다.');
    }
  };
  
  /**
   * 일반 승인 문서 반려
   */
  const rejectDocument = async (approvalId: string, reason?: string) => {
    try {
      await updateDoc(doc(db, 'approvals', approvalId), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid,
        rejectionReason: reason || ''
      });
      
      console.log('✅ 승인 문서 반려 완료:', approvalId);
      
      // 목록 새로고침
      await loadApprovals();
      
      alert('✅ 반려가 완료되었습니다.');
      
    } catch (error) {
      console.error('❌ 승인 문서 반려 실패:', error);
      alert('반려 처리 중 오류가 발생했습니다.');
    }
  };
  
  /**
   * 승인 상세 보기
   */
  const viewApprovalDetail = (approval: Approval) => {
    setSelectedApproval(approval);
    setDetailModalOpen(true);
  };
  
  /**
   * 상세 모달에서 승인
   */
  const approveFromDetail = async () => {
    if (!selectedApproval) return;
    
    if (selectedApproval.type === 'shift') {
      await approveShiftRequest(selectedApproval.id);
    } else {
      await approveDocument(selectedApproval.id);
    }
    
    setDetailModalOpen(false);
  };
  
  /**
   * 상세 모달에서 반려
   */
  const rejectFromDetail = async () => {
    if (!selectedApproval) return;
    
    const reason = prompt('반려 사유를 입력해주세요 (선택사항):', '');
    if (reason === null) return; // 취소
    
    if (selectedApproval.type === 'shift') {
      await rejectShiftRequest(selectedApproval.id, reason);
    } else {
      await rejectDocument(selectedApproval.id, reason);
    }
    
    setDetailModalOpen(false);
  };
  
  // 자동 로딩 (필터 변경 시)
  useEffect(() => {
    if (user?.uid) {
      loadApprovals();
    }
  }, [typeFilter, statusFilter, user]);
  
  return {
    approvals,
    loading,
    typeFilter,
    statusFilter,
    detailModalOpen,
    selectedApproval,
    setTypeFilter,
    setStatusFilter,
    setDetailModalOpen,
    loadApprovals,
    approveShiftRequest,
    rejectShiftRequest,
    approveDocument,
    rejectDocument,
    viewApprovalDetail,
    approveFromDetail,
    rejectFromDetail
  };
}
