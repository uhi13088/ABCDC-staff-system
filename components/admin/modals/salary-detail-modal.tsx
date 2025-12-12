/**
 * Salary Detail Modal Component
 * 급여 상세 모달 (백업 HTML salaryDetailModal 기반)
 * 
 * @source /home/user/webapp-backup/admin-dashboard.html (lines 10613~10742, 3764~3962)
 */

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SalaryCalculationResult } from '@/lib/utils/salary-calculator';
import { formatHoursAndMinutes } from '@/lib/utils/salary-calculator';

interface SalaryDetailModalProps {
  open: boolean;
  onClose: () => void;
  salary: SalaryCalculationResult | null;
  contract: any;
  onConfirm?: () => void;
}

export function SalaryDetailModal({ open, onClose, salary, contract, onConfirm }: SalaryDetailModalProps) {
  if (!salary) return null;
  
  const allowances = contract?.allowances || {};
  const contractInfo = salary.contractInfo || {};
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800">
            💰 급여 상세 내역
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 기본 정보 */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500 mb-1">직원명</div>
                  <div className="text-lg font-semibold text-slate-800">{salary.employeeName}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">매장</div>
                  <div className="text-lg font-semibold text-slate-800">{salary.storeName || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">조회 월</div>
                  <div className="text-lg font-semibold text-slate-800">{salary.yearMonth}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">근무 일수</div>
                  <div className="text-lg font-semibold text-slate-800">{salary.workDays}일</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 지급 항목 */}
          <div>
            <h3 className="text-lg font-bold text-blue-600 mb-4">📊 지급 항목</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">항목</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 기본급 */}
                  <tr className="border-b border-slate-200">
                    <td className="px-4 py-3 text-slate-700">
                      기본급 (시급 {salary.hourlyWage.toLocaleString()}원 × {formatHoursAndMinutes(salary.totalWorkHours)})
                    </td>
                    <td className="px-4 py-3 text-right text-slate-800 font-medium">
                      {salary.basePay.toLocaleString()}원
                    </td>
                  </tr>
                  
                  {/* 연장근로수당 (계약서 체크 여부) */}
                  {allowances.overtime && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">
                        연장근로수당 (시급 × 1.5배 × {formatHoursAndMinutes(salary.overtimeHours || 0)})
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        +{(salary.overtimePay || 0).toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* 야간근로수당 (계약서 체크 여부) */}
                  {allowances.night && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">
                        야간근로수당 (시급 × 0.5배 × {formatHoursAndMinutes(salary.nightHours || 0)})
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        +{(salary.nightPay || 0).toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* 휴일근로수당 (계약서 체크 여부) */}
                  {allowances.holiday && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">
                        휴일근로수당 (시급 × 1.5배)
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        +{(salary.holidayPay || 0).toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* 주휴수당 (계약서 기준 주 15시간 이상) */}
                  {contractInfo.isWeeklyHolidayEligible && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">
                        주휴수당
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        +{(salary.weeklyHolidayPay || 0).toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* Phase 5: 특별 근무 수당 (인센티브) */}
                  {salary.incentivePay > 0 && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">
                        특별 근무 수당 (인센티브)
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        +{salary.incentivePay.toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* 퇴직금 (계약서에 퇴직금 적용 대상이고, 퇴직금이 있는 경우만 표시) */}
                  {contract?.insurance?.severancePay && salary.severancePay > 0 && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">
                        퇴직금 (1년 이상 근속, 주 15시간 이상)
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        +{salary.severancePay.toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* 총 지급액 */}
                  <tr className="bg-slate-50 font-bold border-b-2 border-slate-200">
                    <td className="px-4 py-3 text-slate-800">총 지급액 (공제 전)</td>
                    <td className="px-4 py-3 text-right text-slate-800 text-lg">
                      {salary.totalPay.toLocaleString()}원
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* 공제 항목 */}
          <div>
            <h3 className="text-lg font-bold text-red-600 mb-4">📋 공제 항목</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">항목</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 국민연금 (계약서 체크 여부) */}
                  {contractInfo.hasPension && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">국민연금 (4.5%)</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        -{(salary.nationalPension || 0).toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* 건강보험 (계약서 체크 여부) */}
                  {contractInfo.hasHealthInsurance && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">건강보험 (3.545%)</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        -{(salary.healthInsurance || 0).toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* 장기요양보험 (건강보험 가입 시) */}
                  {contractInfo.hasHealthInsurance && salary.longTermCare > 0 && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">장기요양 (0.459%)</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        -{salary.longTermCare.toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* 고용보험 (계약서 체크 여부) */}
                  {contractInfo.hasEmploymentInsurance && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">고용보험 (0.9%)</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        -{(salary.employmentInsurance || 0).toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* 소득세 (4대보험 가입 시) */}
                  {contractInfo.has4Insurance && (
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-slate-700">소득세 (3.3%)</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">
                        -{(salary.incomeTax || 0).toLocaleString()}원
                      </td>
                    </tr>
                  )}
                  
                  {/* 총 공제액 */}
                  <tr className="bg-slate-50 font-bold border-b-2 border-slate-200">
                    <td className="px-4 py-3 text-slate-800">총 공제액</td>
                    <td className="px-4 py-3 text-right text-red-600 text-lg">
                      -{salary.totalDeductions.toLocaleString()}원
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* 실지급액 */}
          <Card className="bg-blue-600 border-blue-600">
            <CardContent className="pt-6 text-center text-white">
              <div className="text-sm mb-2 opacity-90">실지급액</div>
              <div className="text-4xl font-bold">
                {salary.netPay.toLocaleString()}원
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
          {onConfirm && (
            <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700 text-white">
              ✅ 급여 확정
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
