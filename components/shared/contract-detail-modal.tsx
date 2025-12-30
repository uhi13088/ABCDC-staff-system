'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, FileText, User as UserIcon, Trash2 } from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';

// 서명 패드 동적 import (SSR 방지)
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false });

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
  const signaturePadRef = useRef<any>(null);

  const canEmployeeSign = isEmployee && !contract.employeeSignedAt;
  const canAdminSign = !isEmployee && !contract.adminSignedAt; // 직원 서명 여부와 관계없이 관리자는 서명 가능

  console.log('🔍 서명 조건 확인:', {
    isEmployee,
    employeeSignedAt: contract.employeeSignedAt,
    adminSignedAt: contract.adminSignedAt,
    canEmployeeSign,
    canAdminSign
  });

  // 서명 패드 초기화
  const handleClearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleSign = async () => {
    // 서명 패드 확인
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert('서명을 작성해주세요.');
      return;
    }

    if (!confirm('계약서에 서명하시겠습니까?\n\n서명 후에는 취소할 수 없습니다.')) {
      return;
    }

    setIsSigning(true);
    try {
      // 서명 이미지를 Base64로 변환
      const signatureDataUrl = signaturePadRef.current.toDataURL('image/png');

      const contractRef = doc(db, COLLECTIONS.CONTRACTS, contract.id);
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };

      if (isEmployee) {
        updateData.employeeSignedAt = Timestamp.now();
        updateData.employeeSignedBy = currentUserId;
        updateData.employeeSignature = signatureDataUrl; // 서명 이미지 저장
        // 관리자도 이미 서명했다면 활성화
        if (contract.adminSignedAt) {
          updateData.status = 'active';
        }
        console.log('✅ 직원 서명 완료');
      } else {
        updateData.adminSignedAt = Timestamp.now();
        updateData.adminSignedBy = currentUserId;
        updateData.adminSignature = signatureDataUrl; // 서명 이미지 저장
        // 직원도 이미 서명했다면 활성화
        if (contract.employeeSignedAt) {
          updateData.status = 'active';
        }
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
                <div className="space-y-6">
                  <div className="text-center">
                    <UserIcon className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                    <h3 className="text-xl font-bold mb-2">
                      {isEmployee ? '직원 서명' : '관리자 서명'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {isEmployee
                        ? '계약서 내용을 확인하셨나요? 아래 서명 패드에 직접 서명해주세요.'
                        : '계약서 내용을 확인하셨나요? 아래 서명 패드에 직접 서명해주세요.'}
                    </p>
                  </div>

                  {/* 서명 패드 */}
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        ✍️ 서명을 작성해주세요
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearSignature}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        지우기
                      </Button>
                    </div>
                    <div className="flex items-center justify-center p-4" style={{ touchAction: 'none' }}>
                      <SignatureCanvas
                        ref={signaturePadRef}
                        canvasProps={{
                          width: 500,
                          height: 200,
                          className: 'signature-canvas border border-gray-200 rounded',
                          style: { touchAction: 'none' }
                        }}
                        backgroundColor="rgb(255, 255, 255)"
                        penColor="rgb(0, 0, 0)"
                      />
                    </div>
                  </div>

                  {/* 서명 안내 */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>중요:</strong> 서명 후에는 취소할 수 없습니다. 신중하게 작성해주세요.
                    </p>
                  </div>

                  {/* 서명 버튼 */}
                  <div className="flex gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setActiveTab('view')}
                      className="flex-1"
                    >
                      취소
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleSign}
                      disabled={isSigning}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isSigning ? '서명 처리 중...' : '✍️ 서명 완료'}
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
