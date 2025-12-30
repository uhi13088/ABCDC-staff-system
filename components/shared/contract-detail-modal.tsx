'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, FileText, User as UserIcon } from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { format } from 'date-fns';

interface ContractDetailModalProps {
  open: boolean;
  onClose: () => void;
  contract: any;
  isEmployee?: boolean; // true: 직원 뷰, false: 관리자 뷰
  currentUserId: string;
  onSuccess?: () => void;
}

export function ContractDetailModal({
  open,
  onClose,
  contract,
  isEmployee = true,
  currentUserId,
  onSuccess,
}: ContractDetailModalProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'sign'>('view');

  const canEmployeeSign = isEmployee && !contract.employeeSignedAt;
  const canAdminSign = !isEmployee && contract.employeeSignedAt && !contract.adminSignedAt;

  const handleSign = async () => {
    if (!confirm('계약서에 서명하시겠습니까?\n\n서명 후에는 취소할 수 없습니다.')) {
      return;
    }

    setIsSigning(true);
    try {
      const contractRef = doc(db, COLLECTIONS.CONTRACTS, contract.id);
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };

      if (isEmployee) {
        updateData.employeeSignedAt = Timestamp.now();
        updateData.employeeSignedBy = currentUserId;
        console.log('✅ 직원 서명 완료');
      } else {
        updateData.adminSignedAt = Timestamp.now();
        updateData.adminSignedBy = currentUserId;
        updateData.status = 'active'; // 양측 서명 완료 시 활성화
        console.log('✅ 관리자 서명 완료');
      }

      await updateDoc(contractRef, updateData);
      alert('✅ 서명이 완료되었습니다!');
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('❌ 서명 실패:', error);
      alert('❌ 서명 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <FileText className="w-6 h-6" />
              근로계약서
            </DialogTitle>
            <div className="flex items-center gap-2">
              {contract.employeeSignedAt && (
                <Badge className="bg-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  직원 서명 완료
                </Badge>
              )}
              {contract.adminSignedAt && (
                <Badge className="bg-blue-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  관리자 서명 완료
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'view' | 'sign')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="view">계약서 보기</TabsTrigger>
            <TabsTrigger value="sign" disabled={!canEmployeeSign && !canAdminSign}>
              서명하기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="space-y-4 mt-4">
            {/* 계약서 내용 */}
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* 1. 기본 정보 */}
                <div>
                  <h3 className="text-lg font-bold mb-3">1. 근로자 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">이름:</span>
                      <span className="ml-2 font-medium">{contract.employeeName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">주민등록번호:</span>
                      <span className="ml-2 font-medium">{contract.employeeBirth}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">주소:</span>
                      <span className="ml-2 font-medium">{contract.employeeAddress}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">연락처:</span>
                      <span className="ml-2 font-medium">{contract.employeePhone}</span>
                    </div>
                  </div>
                </div>

                {/* 2. 회사 정보 */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-bold mb-3">2. 사용자 (회사) 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">근무 매장:</span>
                      <span className="ml-2 font-medium">{contract.storeName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">대표자명:</span>
                      <span className="ml-2 font-medium">{contract.companyCEO}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">사업자등록번호:</span>
                      <span className="ml-2 font-medium">{contract.companyBusinessNumber}</span>
                    </div>
                  </div>
                </div>

                {/* 3. 계약 정보 */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-bold mb-3">3. 계약 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">계약 유형:</span>
                      <span className="ml-2 font-medium">{contract.contractType}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">직무/직책:</span>
                      <span className="ml-2 font-medium">{contract.position}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">계약 시작일:</span>
                      <span className="ml-2 font-medium">
                        {contract.startDate?.toDate ? format(contract.startDate.toDate(), 'yyyy년 MM월 dd일') : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">계약 종료일:</span>
                      <span className="ml-2 font-medium">
                        {contract.endDate?.toDate ? format(contract.endDate.toDate(), 'yyyy년 MM월 dd일') : '기간의 정함 없음'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. 급여 정보 */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-bold mb-3">4. 급여 조건</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">급여 형태:</span>
                      <span className="ml-2 font-medium">{contract.salaryType}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">급여 금액:</span>
                      <span className="ml-2 font-medium">{contract.salaryAmount?.toLocaleString()}원</span>
                    </div>
                    <div>
                      <span className="text-gray-600">지급일:</span>
                      <span className="ml-2 font-medium">매월 {contract.salaryPaymentDay}일</span>
                    </div>
                    <div>
                      <span className="text-gray-600">지급 방법:</span>
                      <span className="ml-2 font-medium">{contract.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* 5. 근무 조건 */}
                {contract.schedules && contract.schedules.length > 0 && (
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-bold mb-3">5. 근무 조건</h3>
                    {contract.schedules.map((schedule: any, index: number) => (
                      <div key={index} className="mb-3 text-sm">
                        <div className="font-medium mb-1">시간대 {index + 1}</div>
                        <div className="text-gray-600">
                          근무일: {schedule.days?.join(', ')} <br />
                          시간: {schedule.startHour}:{schedule.startMinute} ~ {schedule.endHour}:{schedule.endMinute}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 6. 계약서 본문 */}
                {contract.contractContent && (
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-bold mb-3">6. 계약 내용</h3>
                    <div className="text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded">
                      {contract.contractContent}
                    </div>
                  </div>
                )}

                {/* 서명 정보 */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-bold mb-3">서명 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">직원 서명:</span>
                      <span className="ml-2">
                        {contract.employeeSignedAt ? (
                          <Badge className="bg-green-600">
                            {format(contract.employeeSignedAt.toDate(), 'yyyy-MM-dd HH:mm')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">미서명</Badge>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">관리자 서명:</span>
                      <span className="ml-2">
                        {contract.adminSignedAt ? (
                          <Badge className="bg-blue-600">
                            {format(contract.adminSignedAt.toDate(), 'yyyy-MM-dd HH:mm')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">미서명</Badge>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sign" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <UserIcon className="w-16 h-16 mx-auto text-blue-600" />
                  <h3 className="text-xl font-bold">
                    {isEmployee ? '직원 서명' : '관리자 서명'}
                  </h3>
                  <p className="text-gray-600">
                    {isEmployee
                      ? '계약서 내용을 확인하셨나요? 서명 후에는 취소할 수 없습니다.'
                      : '직원이 서명한 계약서입니다. 관리자 서명을 진행해주세요.'}
                  </p>
                  <div className="pt-4">
                    <Button
                      size="lg"
                      onClick={handleSign}
                      disabled={isSigning}
                      className="w-full max-w-xs"
                    >
                      {isSigning ? '서명 처리 중...' : '서명하기'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
