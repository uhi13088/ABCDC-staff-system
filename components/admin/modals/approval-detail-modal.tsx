/**
 * Approval Detail Modal Component
 * 승인 상세 모달 (백업 HTML viewApprovalDetail 기반)
 * 
 * @source /home/user/webapp-backup/admin-dashboard.html (lines 4789~5072)
 */

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Approval, ApprovalType } from '@/lib/types/approval';

interface ApprovalDetailModalProps {
  open: boolean;
  onClose: () => void;
  approval: Approval | null;
  onApprove?: () => void;
  onReject?: () => void;
}

export function ApprovalDetailModal({ open, onClose, approval, onApprove, onReject }: ApprovalDetailModalProps) {
  if (!approval) return null;
  
  const createdDate = approval.createdAt?.toDate?.() 
    ? approval.createdAt.toDate().toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'N/A';
  
  const getStatusBadge = () => {
    if (approval.status === 'approved') {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">✅ 승인됨</Badge>;
    } else if (approval.status === 'rejected') {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">❌ 거부됨</Badge>;
    } else {
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">⏳ 대기중</Badge>;
    }
  };
  
  const getTitle = () => {
    const titles: Record<ApprovalType, string> = {
      'purchase': '🛒 구매 신청서 상세',
      'disposal': '🗑️ 폐기 신청서 상세',
      'resignation': '📄 퇴직서 상세',
      'absence': '🏥 결근 신청서 상세',
      'shift': '🔄 교대근무 신청서 상세'
    };
    return titles[approval.type] || '📋 승인 문서 상세';
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800">
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-500 mb-1">신청자</div>
              <div className="font-medium text-slate-800">{approval.applicantName || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500 mb-1">신청일</div>
              <div className="font-medium text-slate-800">{createdDate}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-slate-500 mb-1">상태</div>
              <div>{getStatusBadge()}</div>
            </div>
          </div>
          
          {/* 구매 신청서 */}
          {approval.type === 'purchase' && (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">구매 물품 목록</div>
                  {(approval.data as any).items?.map((item: any, idx: number) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3 mb-2 bg-white">
                      <div className="font-semibold text-slate-800 mb-2">{idx + 1}. {item.item}</div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div>구매처: {item.vendor}</div>
                        <div>가격: {parseInt(item.price || 0).toLocaleString()}원</div>
                        <div>수량: {item.quantity}개</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-800">총 금액</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₩{parseInt((approval.data as any).totalPrice || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">구매 사유</div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3 whitespace-pre-wrap text-slate-700">
                    {(approval.data as any).reason || '사유 없음'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 폐기 신청서 */}
          {approval.type === 'disposal' && (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">품목</div>
                  <div className="text-slate-800">{(approval.data as any).category || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">폐기 상세 내용</div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3 whitespace-pre-wrap text-slate-700">
                    {(approval.data as any).details || '상세 내용 없음'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 퇴직서 */}
          {approval.type === 'resignation' && (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">희망 퇴직일</div>
                  <div className="text-slate-800 text-lg font-semibold">
                    {(approval.data as any).resignationDate || 'N/A'}
                  </div>
                </div>
                
                {(approval.data as any).reason && (
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">퇴직 사유</div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 whitespace-pre-wrap text-slate-700">
                      {(approval.data as any).reason}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* 결근 신청서 */}
          {approval.type === 'absence' && (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">결근 날짜</div>
                    <div className="text-slate-800">{(approval.data as any).date || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">시간</div>
                    <div className="text-slate-800">
                      {(approval.data as any).startTime} ~ {(approval.data as any).endTime}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-slate-700 mb-2">매장</div>
                    <div className="text-slate-800">{(approval.data as any).storeName || 'N/A'}</div>
                  </div>
                </div>
                
                {(approval.data as any).reason && (
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">결근 사유</div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 whitespace-pre-wrap text-slate-700">
                      {(approval.data as any).reason}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* 교대근무 */}
          {approval.type === 'shift' && (
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">신청자 (교대 요청)</div>
                    <div className="text-slate-800 font-semibold">{(approval.data as any).requesterName}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">교대자 (대신 근무)</div>
                    <div className="text-slate-800 font-semibold">{(approval.data as any).matchedUserName}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">근무 날짜</div>
                    <div className="text-slate-800">{(approval.data as any).workDate}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">근무 시간</div>
                    <div className="text-slate-800">
                      {(approval.data as any).workStartTime} ~ {(approval.data as any).workEndTime}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-slate-700 mb-2">매장</div>
                    <div className="text-slate-800">{(approval.data as any).store}</div>
                  </div>
                </div>
                
                {(approval.data as any).reason && (
                  <div>
                    <div className="text-sm font-medium text-slate-700 mb-2">교대 사유</div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 whitespace-pre-wrap text-slate-700">
                      {(approval.data as any).reason}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* 거부 사유 (거부된 경우만 표시) */}
          {approval.status === 'rejected' && (approval as any).rejectionReason && (
            <Card className="bg-amber-50 border-l-4 border-amber-500">
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-amber-800 mb-2">거부 사유</div>
                <div className="text-amber-700">{(approval as any).rejectionReason}</div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
          
          {approval.status === 'pending' && onApprove && onReject && (
            <>
              <Button 
                onClick={onApprove} 
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                ✅ 승인
              </Button>
              <Button 
                onClick={onReject}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                ❌ 반려
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
