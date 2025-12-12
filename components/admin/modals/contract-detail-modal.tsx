/**
 * 계약서 상세 보기 모달
 * 백업: /home/user/webapp-backup/js/contract-viewer.js (라인 12-283)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contract } from '@/lib/types/contract';
import { Badge } from '@/components/ui/badge';
import { FileDown, Printer, X } from 'lucide-react';
import { COLLECTIONS } from '@/lib/constants';

interface ContractDetailModalProps {
  open: boolean;
  onClose: () => void;
  contractId: string | null;
  companyId: string;
}

export function ContractDetailModal({ 
  open, 
  onClose, 
  contractId,
  companyId 
}: ContractDetailModalProps) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [allContracts, setAllContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(contractId);

  /**
   * 계약서 로드
   */
  useEffect(() => {
    if (open && selectedContractId) {
      loadContract(selectedContractId);
    }
  }, [open, selectedContractId]);

  /**
   * Firestore에서 계약서 로드 (백업: 라인 12-49)
   */
  const loadContract = async (id: string) => {
    setLoading(true);
    try {
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
      
      // 계약서 가져오기
      const docRef = doc(db, 'contracts', id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        alert('⚠️ 계약서를 찾을 수 없습니다.');
        onClose();
        return;
      }
      
      const contractData = { id: docSnap.id, ...docSnap.data() } as Contract;
      setContract(contractData);
      
      // 같은 직원의 모든 계약서 찾기
      const q = query(
        collection(db, COLLECTIONS.CONTRACTS),
        where('employeeName', '==', contractData.employeeName),
        where('employeeBirth', '==', contractData.employeeBirth)
      );
      
      const snapshot = await getDocs(q);
      const contracts: Contract[] = [];
      snapshot.forEach(doc => {
        contracts.push({ id: doc.id, ...doc.data() } as Contract);
      });
      
      // 날짜순 정렬 (최신순)
      contracts.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
        return dateB - dateA;
      });
      
      setAllContracts(contracts);
    } catch (error) {
      console.error('❌ 계약서 조회 실패:', error);
      alert('⚠️ 계약서 데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * PDF 다운로드 (백업: 라인 313-332)
   */
  const handleDownloadPDF = async () => {
    if (!contract) return;
    
    alert('PDF 다운로드 기능은 추후 구현됩니다.');
    // TODO: html2pdf.js 라이브러리 사용하여 PDF 생성
  };

  /**
   * 인쇄 (백업: 라인 305-307)
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * 계약서 버전 전환 (백업: 라인 297-300)
   */
  const handleContractChange = (newContractId: string) => {
    setSelectedContractId(newContractId);
  };

  if (!contract || loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">계약서를 불러오는 중...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // 서명 여부 확인
  const isSigned = contract.signedAt !== null && contract.signedAt !== undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* 상단 컨트롤 바 (백업: 라인 176-183) */}
        <div className="sticky top-0 bg-white z-50 p-4 border-b-2 flex justify-between items-center">
          <DialogTitle className="text-xl font-bold">📄 계약서 상세보기</DialogTitle>
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleDownloadPDF}>
              <FileDown className="w-4 h-4 mr-2" />
              PDF 저장
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              인쇄
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 계약서 선택 드롭다운 (백업: 라인 85-108) */}
        {allContracts.length > 1 && (
          <div className="px-10 pt-5">
            <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <div className="flex items-center gap-3">
                <label className="font-semibold whitespace-nowrap text-sm">📋 계약서 선택:</label>
                <Select value={selectedContractId || ''} onValueChange={handleContractChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allContracts.map((c, index) => {
                      const date = c.createdAt ? new Date(c.createdAt as any) : new Date();
                      const label = `${date.toLocaleDateString('ko-KR')} ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}${index === 0 ? ' (최신)' : ''}`;
                      return (
                        <SelectItem key={c.id} value={c.id!}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Badge className="bg-blue-600 text-white">총 {allContracts.length}건</Badge>
              </div>
            </div>
          </div>
        )}

        {/* A4 계약서 본문 (백업: 라인 191-278) */}
        <div id="contractPrintArea" className="w-[160mm] mx-auto bg-white p-5 print:p-0">
          
          {/* 계약서 제목 (백업: 라인 194) */}
          <h1 className="text-center text-3xl font-bold tracking-[12px] mb-8">근 로 계 약 서</h1>
          
          {/* 서문 (백업: 라인 197-199) */}
          <p className="leading-relaxed mb-6 text-sm">
            <strong>{contract.companyName || contract.workStore}</strong> (이하 "사용자"라 함)와{' '}
            <strong>{contract.employeeName}</strong> (이하 "근로자"라 함)는 다음과 같이 근로계약을 체결한다.
          </p>
          
          {/* 계약 내용 테이블 (백업: 라인 202-262) */}
          <table className="w-full border-collapse mb-6">
            <tbody>
              {/* 근로자 정보 */}
              <tr className="border">
                <th className="border p-3 bg-gray-50 text-left font-semibold w-32">근로자 정보</th>
                <td className="border p-3">
                  <div>성명: {contract.employeeName}</div>
                  <div>생년월일: {contract.employeeBirth}</div>
                  <div>주소: {contract.employeeAddress || '-'}</div>
                  <div>연락처: {contract.employeePhone || '-'}</div>
                </td>
              </tr>
              
              {/* 사용자 정보 */}
              <tr className="border">
                <th className="border p-3 bg-gray-50 text-left font-semibold">사용자 정보</th>
                <td className="border p-3">
                  <div>회사명: {contract.companyName || contract.workStore}</div>
                  <div>대표자: {contract.companyCEO || '-'}</div>
                  <div>사업자등록번호: {contract.companyBusinessNumber || '-'}</div>
                  <div>연락처: {contract.companyPhone || '-'}</div>
                  <div>주소: {contract.companyAddress || '-'}</div>
                </td>
              </tr>
              
              {/* 계약 기간 */}
              <tr className="border">
                <th className="border p-3 bg-gray-50 text-left font-semibold">계약 기간</th>
                <td className="border p-3">
                  {contract.contractStartDate || contract.startDate || '-'} ~{' '}
                  {contract.contractEndDate || contract.endDate || '-'}
                </td>
              </tr>
              
              {/* 근무 장소 */}
              <tr className="border">
                <th className="border p-3 bg-gray-50 text-left font-semibold">근무 장소</th>
                <td className="border p-3">{contract.workStore || '-'}</td>
              </tr>
              
              {/* 업무 내용 */}
              <tr className="border">
                <th className="border p-3 bg-gray-50 text-left font-semibold">업무 내용</th>
                <td className="border p-3">{contract.position || contract.employeePosition || '-'}</td>
              </tr>
              
              {/* 근무 일시 */}
              <tr className="border">
                <th className="border p-3 bg-gray-50 text-left font-semibold">근무 일시</th>
                <td className="border p-3">
                  <div>근무일: {contract.workDays || contract.schedule?.days || '-'}</div>
                  <div>근무시간: {contract.workTime || contract.schedule?.time || '-'}</div>
                  <div>휴게시간: {contract.breakTime || contract.schedule?.breakTime || '근로기준법 준수'}</div>
                </td>
              </tr>
              
              {/* 급여 조건 */}
              <tr className="border">
                <th className="border p-3 bg-gray-50 text-left font-semibold">급여 조건</th>
                <td className="border p-3">
                  <div>
                    {contract.salaryType || '시급'}: {(Number(contract.salaryAmount) || 0).toLocaleString()}원
                  </div>
                  <div>지급일: {contract.salaryPaymentDay || '매월 말일'}</div>
                  <div>지급방법: {contract.paymentMethod || '계좌이체'}</div>
                </td>
              </tr>
              
              {/* 기타 내용 */}
              <tr className="border">
                <th className="border p-3 bg-gray-50 text-left font-semibold">기타 내용</th>
                <td className="border p-3">
                  {contract.insurance ? (
                    <>
                      {contract.insurance.severancePay && (
                        <div className="text-amber-700">• 1년 이상 근속 시 퇴직금 지급 대상에 해당</div>
                      )}
                      {contract.insurance.type === 'full' && <div>• 4대보험 가입</div>}
                    </>
                  ) : (
                    <div>정보 없음</div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          
          {/* 계약서 본문 (백업: 라인 265-269) */}
          {contract.contractContent && (
            <div className="whitespace-pre-line leading-relaxed mb-6 text-sm border border-gray-300 p-4 bg-gray-50 rounded">
              {contract.contractContent}
            </div>
          )}
          
          {/* 계약 일자 (백업: 라인 272-274) */}
          <p className="text-center mt-10 mb-12 text-base font-semibold">
            {contract.contractDate || (contract.createdAt ? new Date(contract.createdAt as any).toLocaleDateString('ko-KR') : '')}
          </p>
          
          {/* 서명란 (백업: 라인 111-166) */}
          {isSigned ? (
            <div className="mt-12">
              <p className="mb-5 text-base text-center">
                <strong>서명일: {contract.signedAt ? new Date(contract.signedAt as any).toLocaleDateString('ko-KR') : ''}</strong>
              </p>
              <div className="flex justify-between items-start gap-10">
                {/* 사용자(대표) 서명 */}
                <div className="flex-1 text-center">
                  <div className="w-[200px] h-[80px] border-2 border-dashed border-gray-300 flex items-center justify-center mx-auto text-gray-400">
                    <span>대표 서명 미등록</span>
                  </div>
                  <p className="mt-2 font-semibold text-sm">
                    사용자: {contract.companyCEO || contract.companyName} (인)
                  </p>
                </div>
                
                {/* 근로자 서명 */}
                <div className="flex-1 text-center">
                  <div className="w-[200px] h-[80px] border border-gray-300 flex items-center justify-center mx-auto">
                    <span className="text-sm text-gray-500">서명 완료</span>
                  </div>
                  <p className="mt-2 font-semibold text-sm">근로자: {contract.employeeName} (서명)</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-12 text-right p-5 bg-yellow-50 border-2 border-dashed border-yellow-400 rounded">
              <p className="text-yellow-800 font-semibold">⚠️ 아직 서명되지 않은 계약서입니다.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
