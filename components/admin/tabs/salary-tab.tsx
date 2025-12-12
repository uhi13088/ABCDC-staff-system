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
import { useSalaryLogic } from '@/hooks/admin/useSalaryLogic';
import { SalaryDetailModal } from '@/components/admin/modals/salary-detail-modal';

export function SalaryTab() {
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
    confirmSalaryFromDetail
  } = useSalaryLogic();
  
  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-slate-800">💰 급여 내역</CardTitle>
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
        
        {/* 조회 버튼 */}
        <div className="mb-6">
          <Button 
            onClick={loadSalaryList}
            disabled={loading || !selectedMonth}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? '조회 중...' : '🔍 조회'}
          </Button>
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
                        {salary.basePay.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        +{salary.totalAllowances.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{salary.totalDeductions.toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {salary.netPay.toLocaleString()}원
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
                          
                          {isUnconfirmed && (
                            <Button
                              size="sm"
                              onClick={() => confirmSalary(
                                salary.userId,
                                salary.yearMonth,
                                salary.netPay,
                                salary.employeeName
                              )}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              💰 급여 확정
                            </Button>
                          )}
                          {isConfirmed && !isPaid && salary.docId && (
                            <Button
                              size="sm"
                              onClick={() => markAsPaid(salary.docId!)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              ✅ 지급완료
                            </Button>
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
