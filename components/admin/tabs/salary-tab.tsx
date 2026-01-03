/**
 * Salary Tab Component
 * 급여 관리 탭 (백업 HTML tabSalary 기반)
 * 
 * @source /home/user/webapp-backup/admin-dashboard.html (lines 281~343, 3710~3759)
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, RotateCcw, Mail, Download, DollarSign } from 'lucide-react';
import { useSalaryLogic } from '@/hooks/admin/useSalaryLogic';
import { SalaryDetailModal } from '@/components/admin/modals/salary-detail-modal';
import { generateSalaryPDF, loadJsPDFScript } from '@/lib/utils/pdf-generator';
import TaxService from '@/services/taxService';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function SalaryTab() {
  const [pdfReady, setPdfReady] = useState(false);
  const { user } = useAuth();
  
  // 세무사/급여 관리 버튼 로딩 상태
  const [taxLoading, setTaxLoading] = useState(false);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);

  // jsPDF CDN 로드
  useEffect(() => {
    loadJsPDFScript()
      .then(() => {
        setPdfReady(true);
        console.log('✅ jsPDF 로드 완료');
      })
      .catch((error) => {
        console.error('❌ jsPDF 로드 실패:', error);
      });
  }, []);

  const {
    salaries,
    stores,
    loading,
    selectedMonth,
    selectedStore,
    employmentStatusFilter,
    salaryDetailOpen,
    salaryDetail,
    setSelectedMonth,
    setSelectedStore,
    setEmploymentStatusFilter,
    setSalaryDetailOpen,
    loadSalaryList,
    confirmSalary,
    markAsPaid,
    showSalaryDetail,
    confirmSalaryFromDetail,
    recalculateSalary
  } = useSalaryLogic();
  
  // 🔥 자동 조회 제거: 사용자가 '조회' 버튼 클릭해야만 로드
  // useEffect(() => {
  //   if (selectedMonth) {
  //     loadSalaryList();
  //   }
  // }, [selectedMonth, selectedStore, employmentStatusFilter, loadSalaryList]);
  
  /**
   * 세무사에게 급여 대장 전송
   */
  const handleSendToTaxAccountant = async () => {
    if (!user?.companyId) {
      alert('회사 정보를 찾을 수 없습니다.');
      return;
    }
    
    // TODO: Store에서 taxAccountantEmail 조회 필요
    const taxAccountantEmail = prompt('세무사 이메일을 입력하세요:');
    if (!taxAccountantEmail) return;
    
    setTaxLoading(true);
    try {
      await TaxService.sendPayrollToTaxAccountant(
        user.companyId,
        selectedMonth,
        taxAccountantEmail
      );
      alert('✅ 세무사에게 급여 대장이 전송되었습니다!');
    } catch (error) {
      console.error('❌ 세무사 전송 실패:', error);
      alert('세무사 전송에 실패했습니다.');
    } finally {
      setTaxLoading(false);
    }
  };
  
  /**
   * 급여 대장 엑셀 다운로드
   */
  const handleDownloadPayroll = async () => {
    if (!user?.companyId) {
      alert('회사 정보를 찾을 수 없습니다.');
      return;
    }
    
    setPayrollLoading(true);
    try {
      await TaxService.downloadPayrollExcel(user.companyId, selectedMonth);
      alert('✅ 급여 대장이 다운로드되었습니다!');
    } catch (error) {
      console.error('❌ 급여 대장 다운로드 실패:', error);
      alert('급여 대장 다운로드에 실패했습니다.');
    } finally {
      setPayrollLoading(false);
    }
  };
  
  /**
   * 은행 이체용 엑셀 다운로드
   */
  const handleDownloadBankTransfer = async () => {
    if (!user?.companyId) {
      alert('회사 정보를 찾을 수 없습니다.');
      return;
    }
    
    setTransferLoading(true);
    try {
      await TaxService.downloadBankTransferExcel(user.companyId, selectedMonth);
      alert('✅ 은행 이체용 엑셀이 다운로드되었습니다!');
    } catch (error) {
      console.error('❌ 이체용 엑셀 다운로드 실패:', error);
      alert('이체용 엑셀 다운로드에 실패했습니다.');
    } finally {
      setTransferLoading(false);
    }
  };
  
  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800">💰 급여 내역</CardTitle>
        {/* 자동 정산 안내 문구 */}
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ℹ️ <strong>급여는 매월 1일 새벽 4시에 자동으로 정산됩니다.</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            전월 급여가 자동 계산되어 '미확정' 상태로 저장됩니다. 확인 후 '확정' 처리해주세요.
          </p>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 필터 그룹 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 월 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              조회 월
            </label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {/* 매장 필터 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              매장
            </label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-full border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="매장 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {stores.length === 0 ? (
                  <SelectItem value="no-store" disabled>매장이 없습니다</SelectItem>
                ) : (
                  stores.map(store => (
                    <SelectItem key={store.id} value={store.name}>
                      {store.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* 근무상태 필터 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              근무상태
            </label>
            <Select value={employmentStatusFilter} onValueChange={setEmploymentStatusFilter}>
              <SelectTrigger className="w-full border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="근무상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">재직자만</SelectItem>
                <SelectItem value="resigned">퇴사자만</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* 급여 관리 버튼 그룹 */}
        <div className="mb-4 flex flex-wrap gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <Button
            onClick={handleSendToTaxAccountant}
            disabled={taxLoading || !selectedMonth || salaries.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 flex items-center gap-2"
          >
            {taxLoading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>전송 중...</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>📤 세무사에게 전송</span>
              </>
            )}
          </Button>
          
          <Button
            onClick={handleDownloadPayroll}
            disabled={payrollLoading || !selectedMonth || salaries.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 flex items-center gap-2"
          >
            {payrollLoading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>다운로드 중...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>📥 급여 대장 다운로드</span>
              </>
            )}
          </Button>
          
          <Button
            onClick={handleDownloadBankTransfer}
            disabled={transferLoading || !selectedMonth || salaries.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 flex items-center gap-2"
          >
            {transferLoading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>다운로드 중...</span>
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                <span>💰 이체용 엑셀 다운로드</span>
              </>
            )}
          </Button>
        </div>
        
        {/* 조회 버튼 추가 */}
        <div className="mb-6 flex gap-3">
          <Button
            onClick={loadSalaryList}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            {loading ? '조회 중...' : '📊 조회하기'}
          </Button>
          
          <div className="flex-1 flex items-center text-sm text-slate-500">
            {salaries.length > 0 && (
              <span>총 {salaries.length}명의 급여 내역</span>
            )}
          </div>
        </div>
        
        {/* 급여 테이블 */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-700">직원명</TableHead>
                <TableHead className="font-semibold text-slate-700">매장</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">기본급</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">수당</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">공제</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">실지급액</TableHead>
                <TableHead className="font-semibold text-slate-700">상태</TableHead>
                <TableHead className="font-semibold text-slate-700">작업</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                    급여 계산 중...
                  </TableCell>
                </TableRow>
              ) : salaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                    급여 정보가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                salaries.map((salary, index) => {
                  const isUnconfirmed = salary.status === 'unconfirmed';
                  const isConfirmed = salary.status === 'confirmed';
                  const isPaid = salary.status === 'paid';
                  
                  return (
                    <TableRow key={`${salary.userId}-${index}`} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-800">
                        {salary.employeeName}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {salary.storeName || '-'}
                      </TableCell>
                      <TableCell className="text-right text-slate-800">
                        {salary.totalBasePay.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        +{(salary.totalOvertimePay + salary.totalNightPay + salary.totalHolidayPay).toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -0원
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {salary.totalPay.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        {isPaid ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            지급완료
                          </Badge>
                        ) : isConfirmed ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            확정됨
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            미확정
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* 상세 버튼 */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => showSalaryDetail(salary.userId, salary.yearMonth)}
                            className="border-slate-300 text-slate-700 hover:bg-slate-100"
                          >
                            상세
                          </Button>
                          
                          {/* 🔥 미확정 또는 확정 상태 & 미지급: 재정산 & 지급완료 버튼 */}
                          {!isPaid && salary.docId && (
                            <>
                              {/* 재정산 버튼 */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (window.confirm('기존 내역을 덮어쓰고 다시 계산하시겠습니까?')) {
                                    recalculateSalary(
                                      salary.docId!,
                                      salary.userId,
                                      salary.yearMonth,
                                      salary.employeeName
                                    );
                                  }
                                }}
                                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                              >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                재정산
                              </Button>
                              
                              {/* 지급완료 버튼 */}
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(`${salary.employeeName}님의 급여 ${salary.netPay?.toLocaleString()}원을 지급 처리하시겠습니까?`)) {
                                    markAsPaid(salary.docId!);
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                ✅ 지급완료
                              </Button>
                            </>
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
        {!loading && salaries.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-sm text-blue-600 mb-1">총 인원</div>
                <div className="text-2xl font-bold text-blue-700">
                  {salaries.length}명
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-sm text-green-600 mb-1">총 기본급</div>
                <div className="text-2xl font-bold text-green-700">
                  {salaries.reduce((sum, s) => sum + s.basePay, 0).toLocaleString()}원
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="text-sm text-amber-600 mb-1">총 수당</div>
                <div className="text-2xl font-bold text-amber-700">
                  {salaries.reduce((sum, s) => sum + s.totalAllowances, 0).toLocaleString()}원
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="text-sm text-purple-600 mb-1">총 실지급액</div>
                <div className="text-2xl font-bold text-purple-700">
                  {salaries.reduce((sum, s) => sum + s.netPay, 0).toLocaleString()}원
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
      
      {/* 급여 상세 모달 */}
      <SalaryDetailModal
        open={salaryDetailOpen}
        onClose={() => setSalaryDetailOpen(false)}
        salary={salaryDetail?.salary || null}
        contract={salaryDetail?.contract || null}
        onConfirm={confirmSalaryFromDetail}
      />
    </Card>
  );
}
