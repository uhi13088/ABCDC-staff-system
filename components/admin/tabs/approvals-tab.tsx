/**
 * Approvals Tab Component
 * 승인 관리 탭 (백업 HTML tabApprovals 기반)
 * 
 * @source /home/user/webapp-backup/admin-dashboard.html (lines 335~387, 4446~4661)
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApprovalsLogic } from '@/hooks/admin/useApprovalsLogic';
import { ApprovalDetailModal } from '@/components/admin/modals/approval-detail-modal';
import type { Approval, ApprovalType } from '@/lib/types/approval';
import { safeToLocaleString } from '@/lib/utils/timestamp';

const TYPE_EMOJI: Record<ApprovalType, string> = {
  'purchase': '💳',
  'disposal': '🗑️',
  'resignation': '📄',
  'absence': '🏥',
  'shift': '🔄'
};

const TYPE_TEXT: Record<ApprovalType, string> = {
  'purchase': '구매',
  'disposal': '폐기',
  'resignation': '퇴직서',
  'absence': '결근',
  'shift': '교대근무'
};

function getApprovalSummary(approval: Approval): string {
  if (approval.type === 'purchase') {
    const data = approval.data as any;
    return `${data.item || '-'} (${data.quantity || '-'}개)`;
  } else if (approval.type === 'disposal') {
    const data = approval.data as any;
    return `${data.category || '-'}`;
  } else if (approval.type === 'resignation') {
    const data = approval.data as any;
    return `희망 퇴직일: ${data.resignationDate || '-'}`;
  } else if (approval.type === 'absence') {
    const data = approval.data as any;
    return `${data.date} ${data.startTime}~${data.endTime} (${data.storeName})`;
  } else if (approval.type === 'shift') {
    const data = approval.data as any;
    return `${data.requesterName} → ${data.matchedUserName} (${data.workDate} ${data.workStartTime}~${data.workEndTime})`;
  }
  return '-';
}

interface ApprovalsTabProps {
  companyId?: string;
  userId?: string;
  userName?: string;
  onCountChange?: () => void; // 카운트 변경 콜백
}

export function ApprovalsTab({ companyId, userId, userName, onCountChange }: ApprovalsTabProps) {
  const {
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
  } = useApprovalsLogic();
  
  const handleApprove = async (approval: Approval) => {
    if (!confirm(`"${approval.applicantName}"님의 ${TYPE_TEXT[approval.type]} 요청을 승인하시겠습니까?`)) {
      return;
    }
    
    if (approval.type === 'shift') {
      await approveShiftRequest(approval.id);
    } else {
      await approveDocument(approval.id);
    }
    
    onCountChange?.(); // 카운트 새로고침
  };
  
  const handleReject = async (approval: Approval) => {
    const reason = prompt(`"${approval.applicantName}"님의 ${TYPE_TEXT[approval.type]} 요청을 반려합니다.\n\n반려 사유를 입력해주세요 (선택사항):`, '');
    
    if (reason === null) return; // 취소
    
    if (approval.type === 'shift') {
      await rejectShiftRequest(approval.id, reason);
    } else {
      await rejectDocument(approval.id, reason);
    }
    
    onCountChange?.(); // 카운트 새로고침
  };
  
  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800">✔️ 승인 대기 목록</CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* 필터 그룹 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 승인 유형 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              승인 유형
            </label>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
              <SelectTrigger className="w-full border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="purchase">💳 구매</SelectItem>
                <SelectItem value="disposal">🗑️ 폐기</SelectItem>
                <SelectItem value="resignation">📄 퇴직서</SelectItem>
                <SelectItem value="absence">🏥 결근</SelectItem>
                <SelectItem value="shift">🔄 교대근무</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 상태 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              상태
            </label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-full border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="rejected">거부됨</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 조회 버튼 */}
          <div className="flex items-end">
            <Button 
              onClick={loadApprovals}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? '조회 중...' : '🔍 조회'}
            </Button>
          </div>
        </div>
        
        {/* 승인 테이블 */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-700">신청자</TableHead>
                <TableHead className="font-semibold text-slate-700">유형</TableHead>
                <TableHead className="font-semibold text-slate-700">제목/내용</TableHead>
                <TableHead className="font-semibold text-slate-700">신청일</TableHead>
                <TableHead className="font-semibold text-slate-700">상태</TableHead>
                <TableHead className="font-semibold text-slate-700">처리</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    승인 대기 목록을 불러오는 중...
                  </TableCell>
                </TableRow>
              ) : approvals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="text-slate-400">
                      <div className="text-5xl mb-4">📋</div>
                      <p className="text-slate-600 font-medium mb-2">승인 대기 중인 문서가 없습니다.</p>
                      <p className="text-sm text-slate-500">직원이 문서를 신청하면 여기에 표시됩니다.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                approvals.map((approval) => {
                  // 🔒 Phase I: Timestamp 안전 변환
                  const createdDate = safeToLocaleString(approval.createdAt);
                  
                  return (
                    <TableRow key={approval.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-800">
                        {approval.applicantName || '-'}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {TYPE_EMOJI[approval.type]} {TYPE_TEXT[approval.type]}
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-md truncate">
                        {getApprovalSummary(approval)}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {createdDate}
                      </TableCell>
                      <TableCell>
                        {approval.status === 'pending' && (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            대기중
                          </Badge>
                        )}
                        {approval.status === 'approved' && (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            승인됨
                          </Badge>
                        )}
                        {approval.status === 'rejected' && (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            거부됨
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* 상세 버튼 */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewApprovalDetail(approval)}
                            className="border-slate-300 text-slate-700 hover:bg-slate-100"
                          >
                            📄 상세
                          </Button>
                          
                          {approval.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(approval)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                ✅ 승인
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(approval)}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                ❌ 반려
                              </Button>
                            </>
                          )}
                          {approval.status !== 'pending' && (
                            <span className="text-sm text-slate-400">처리 완료</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* 통계 요약 */}
        {!loading && approvals.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-sm text-blue-600 mb-1">총 건수</div>
                <div className="text-2xl font-bold text-blue-700">
                  {approvals.length}건
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="text-sm text-amber-600 mb-1">대기중</div>
                <div className="text-2xl font-bold text-amber-700">
                  {approvals.filter(a => a.status === 'pending').length}건
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-sm text-green-600 mb-1">승인됨</div>
                <div className="text-2xl font-bold text-green-700">
                  {approvals.filter(a => a.status === 'approved').length}건
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="text-sm text-red-600 mb-1">거부됨</div>
                <div className="text-2xl font-bold text-red-700">
                  {approvals.filter(a => a.status === 'rejected').length}건
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
      
      {/* 승인 상세 모달 */}
      <ApprovalDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        approval={selectedApproval}
        onApprove={approveFromDetail}
        onReject={rejectFromDetail}
      />
    </Card>
  );
}
