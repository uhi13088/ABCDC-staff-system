/**
 * 계약서 관리 탭 (Shadcn Blue Theme 완벽 적용)
 * 백업: admin-dashboard.html 라인 389-438
 * 
 * 주요 기능:
 * 1. 계약서 목록 (일반 계약서 + 추가 계약서)
 * 2. 필터링 (매장, 근무상태)
 * 3. 신규 계약서 작성
 * 4. 추가 계약서 작성 (동일 직원 복수 매장 근무)
 * 5. 계약서 이력 관리 (드롭다운)
 * 6. 계약서 상세 보기
 * 7. 계약서 삭제
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Plus, 
  PlusCircle, 
  Eye, 
  Trash2,
  Mail,
  AlertCircle,
  FilePlus2
} from 'lucide-react';
import { useContractsLogic } from '@/hooks/admin/useContractsLogic';
import { Contract } from '@/lib/types/contract';
import { ContractFormModal } from '@/components/admin/modals/contract-form-modal';
import { ContractDetailModal } from '@/components/admin/modals/contract-detail-modal';
import { ContractLinkModal } from '@/components/admin/modals/contract-link-modal';

interface ContractsTabProps {
  companyId: string;
}

export function ContractsTab({ companyId }: ContractsTabProps) {
  const {
    contractGroups,
    loading,
    filters,
    stores,
    updateFilters,
    loadContracts,
    deleteContract,
  } = useContractsLogic({ companyId });

  const [selectedContracts, setSelectedContracts] = useState<Record<string, string>>({});
  
  // 모달 상태
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isAdditionalMode, setIsAdditionalMode] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>('');

  useEffect(() => {
    if (companyId) {
      loadContracts();
    }
  }, [companyId]);

  /**
   * 계약서 선택 변경 (드롭다운)
   */
  const handleContractSelect = (employeeKey: string, contractId: string) => {
    setSelectedContracts(prev => ({
      ...prev,
      [employeeKey]: contractId,
    }));
  };

  /**
   * 상태 뱃지 렌더링
   */
  const getStatusBadge = (status?: string) => {
    if (status === '서명완료') {
      return <Badge className="bg-green-100 text-green-800 border-green-300">✅ 서명완료</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">⏳ 서명대기</Badge>;
  };

  /**
   * 계약 기간 포맷
   */
  const formatContractPeriod = (contract: Contract) => {
    const start = contract.contractStartDate || contract.startDate || '-';
    const end = contract.contractEndDate || contract.endDate || '-';
    return `${start} ~ ${end}`;
  };

  /**
   * 작성일 포맷
   */
  const formatCreatedAt = (createdAt: Date | any) => {
    const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  /**
   * 신규 계약서 작성
   */
  const handleNewContract = () => {
    setIsAdditionalMode(false);
    setIsFormModalOpen(true);
  };

  /**
   * 추가 계약서 작성
   */
  const handleAdditionalContract = () => {
    setIsAdditionalMode(true);
    setIsFormModalOpen(true);
  };

  /**
   * 계약서 상세 보기
   */
  const handleViewContract = (contractId: string) => {
    setSelectedContractId(contractId);
    setIsDetailModalOpen(true);
  };

  /**
   * 계약서 링크 전송
   */
  const handleSendLink = (contractId: string) => {
    setSelectedContractId(contractId);
    setIsLinkModalOpen(true);
  };
  
  /**
   * 모달 닫기 및 새로고침
   */
  const handleModalClose = () => {
    setIsFormModalOpen(false);
    setIsDetailModalOpen(false);
    setIsLinkModalOpen(false);
    setSelectedContractId('');
    loadContracts();
  };

  return (
    <div className="space-y-6">
      
      {/* 상단 헤더 + 작성 버튼 */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              계약서 목록
              {!loading && (
                <span className="text-sm font-normal text-slate-500">
                  (총 {contractGroups.reduce((sum, g) => 
                    sum + g.normalContracts.length + g.additionalContracts.length, 0
                  )}건)
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={handleNewContract}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                새 계약서 작성
              </Button>
              <Button 
                onClick={handleAdditionalContract}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                추가 계약서 작성
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          
          {/* 안내 메시지 */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-blue-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>계약서 관리:</strong> 신규 계약서는 최초 입사 시 작성하며, 
                추가 계약서는 동일 직원이 여러 매장에서 근무할 때 사용합니다.
                일반 계약서는 최신 1건만 표시되며, 이전 계약서는 드롭다운으로 확인할 수 있습니다.
              </span>
            </p>
          </div>

          {/* 필터 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                매장
              </label>
              <Select
                value={filters.storeId}
                onValueChange={(value) => updateFilters({ storeId: value })}
              >
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                근무상태
              </label>
              <Select
                value={filters.employmentStatus}
                onValueChange={(value) => updateFilters({ employmentStatus: value })}
              >
                <SelectTrigger className="border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  <SelectItem value="active">재직자</SelectItem>
                  <SelectItem value="resigned">퇴사자</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={loadContracts}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? '조회 중...' : '조회'}
              </Button>
            </div>
          </div>

          {/* 테이블 */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-bold text-slate-900">직원명</TableHead>
                  <TableHead className="font-bold text-slate-900">계약 유형</TableHead>
                  <TableHead className="font-bold text-slate-900">매장</TableHead>
                  <TableHead className="font-bold text-slate-900">계약 기간</TableHead>
                  <TableHead className="font-bold text-slate-900">작성일</TableHead>
                  <TableHead className="font-bold text-slate-900">상태</TableHead>
                  <TableHead className="font-bold text-slate-900">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : contractGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <FilePlus2 className="w-12 h-12 text-slate-300" />
                        <p className="text-slate-500">생성된 계약서가 없습니다.</p>
                        <Button 
                          onClick={handleNewContract}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          첫 계약서 작성하기
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {contractGroups.map((group) => {
                      const { employeeKey, employeeName, normalContracts, additionalContracts } = group;
                      
                      return (
                        <React.Fragment key={employeeKey}>
                          {/* 일반 계약서 (최신 1개만 표시) */}
                          {normalContracts.length > 0 && (() => {
                            const selectedId = selectedContracts[employeeKey] || normalContracts[0].id;
                            const selectedContract = normalContracts.find(c => c.id === selectedId) || normalContracts[0];
                            
                            return (
                              <TableRow key={`normal-${employeeKey}`}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <strong className="text-slate-900">{employeeName}</strong>
                                    {normalContracts.length > 1 && (
                                      <Badge className="mt-1 bg-blue-100 text-blue-800 border-blue-300 w-fit">
                                        📝 {normalContracts.length}건
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-700">{selectedContract.contractType}</TableCell>
                                <TableCell className="text-slate-700">
                                  {selectedContract.workStore || selectedContract.companyName || '-'}
                                </TableCell>
                                <TableCell className="text-slate-700">
                                  {formatContractPeriod(selectedContract)}
                                </TableCell>
                                <TableCell className="text-slate-700">
                                  {normalContracts.length > 1 ? (
                                    <Select
                                      value={selectedId || ''}
                                      onValueChange={(value) => handleContractSelect(employeeKey, value)}
                                    >
                                      <SelectTrigger className="text-xs h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {normalContracts.map((contract, index) => (
                                          <SelectItem key={contract.id} value={contract.id || ''}>
                                            {formatCreatedAt(contract.createdAt)} 
                                            {index === 0 && ' (최신)'}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    formatCreatedAt(selectedContract.createdAt)
                                  )}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(selectedContract.status)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2 flex-wrap">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleViewContract(selectedContract.id || '')}
                                      className="text-xs"
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      보기
                                    </Button>
                                    {selectedContract.status === '서명대기' && (
                                      <Button 
                                        size="sm"
                                        onClick={() => handleSendLink(selectedContract.id || '')}
                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                      >
                                        <Mail className="w-3 h-3 mr-1" />
                                        링크전송
                                      </Button>
                                    )}
                                    <Button 
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteContract(selectedContract.id || '', employeeName)}
                                      className="text-xs"
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      삭제
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })()}
                          
                          {/* 추가 계약서 (모두 표시) */}
                          {additionalContracts.map((contract) => (
                            <TableRow key={`additional-${contract.id}`}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <strong className="text-slate-900">{employeeName}</strong>
                                  <Badge className="mt-1 bg-cyan-100 text-cyan-800 border-cyan-300 w-fit">
                                    ➕ 추가 계약서
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-700">{contract.contractType}</TableCell>
                              <TableCell className="text-slate-700">
                                {contract.workStore || contract.companyName || '-'}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {formatContractPeriod(contract)}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {formatCreatedAt(contract.createdAt)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(contract.status)}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2 flex-wrap">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleViewContract(contract.id || '')}
                                    className="text-xs"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    보기
                                  </Button>
                                  {contract.status === '서명대기' && (
                                    <Button 
                                      size="sm"
                                      onClick={() => handleSendLink(contract.id || '')}
                                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      <Mail className="w-3 h-3 mr-1" />
                                      링크전송
                                    </Button>
                                  )}
                                  <Button 
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => deleteContract(contract.id || '', employeeName)}
                                    className="text-xs"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    삭제
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* 계약서 작성 모달 */}
      <ContractFormModal
        open={isFormModalOpen}
        onClose={handleModalClose}
        companyId={companyId}
        isAdditional={isAdditionalMode}
      />
      
      {/* 계약서 상세 보기 모달 */}
      <ContractDetailModal
        open={isDetailModalOpen}
        onClose={handleModalClose}
        contractId={selectedContractId}
        companyId={companyId}
      />
      
      {/* 계약서 링크 전송 모달 */}
      <ContractLinkModal
        open={isLinkModalOpen}
        onClose={handleModalClose}
        contractId={selectedContractId}
      />
    </div>
  );
}

// React import for Fragment
import React from 'react';
