'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { DollarSign, Download, Eye, Calendar as CalendarIcon } from 'lucide-react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { format, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'

interface SalaryTabProps {
  employeeData: {
    uid: string
    companyId: string
  }
}

interface SalaryRecord {
  id: string
  yearMonth: string
  baseSalary: number
  totalSalary: number
  netSalary: number
  allowances: {
    overtime: number
    night: number
    holiday: number
    weeklyHoliday: number
  }
  deductions: {
    tax: number
    insurance: number
  }
  workDays: number
  workHours: number
  status: 'pending' | 'confirmed' | 'paid'
}

export default function SalaryTab({ employeeData }: SalaryTabProps) {
  const [salaries, setSalaries] = useState<SalaryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // 급여 기록 로드
  const loadSalaryRecords = async () => {
    setIsLoading(true)
    try {
      const salaryRef = collection(db, COLLECTIONS.SALARY)
      const salaryQuery = query(
        salaryRef,
        where('companyId', '==', employeeData.companyId),
        where('userId', '==', employeeData.uid),
        orderBy('yearMonth', 'desc')
      )

      const snapshot = await getDocs(salaryQuery)
      
      const loadedSalaries: SalaryRecord[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        
        loadedSalaries.push({
          id: doc.id,
          yearMonth: data.yearMonth,
          baseSalary: data.baseSalary || 0,
          totalSalary: data.totalSalary || 0,
          netSalary: data.netSalary || 0,
          allowances: {
            overtime: data.allowances?.overtime || 0,
            night: data.allowances?.night || 0,
            holiday: data.allowances?.holiday || 0,
            weeklyHoliday: data.allowances?.weeklyHoliday || 0
          },
          deductions: {
            tax: data.deductions?.tax || 0,
            insurance: data.deductions?.insurance || 0
          },
          workDays: data.workDays || 0,
          workHours: data.workHours || 0,
          status: data.status || 'pending'
        })
      })

      setSalaries(loadedSalaries)
    } catch (error) {
      console.error('급여 기록 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSalaryRecords()
  }, [employeeData])

  // 월 선택 옵션 생성 (최근 12개월)
  const getMonthOptions = () => {
    const options = []
    const now = new Date()
    
    for (let i = 0; i < 12; i++) {
      const targetMonth = subMonths(now, i)
      const value = format(targetMonth, 'yyyy-MM')
      const label = format(targetMonth, 'yyyy년 MM월', { locale: ko })
      options.push({ value, label })
    }
    
    return options
  }

  // 선택한 월의 급여 필터링
  const filteredSalaries = salaries.filter(s => s.yearMonth === selectedMonth)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">지급완료</Badge>
      case 'confirmed':
        return <Badge variant="default" className="bg-blue-500">확정</Badge>
      case 'pending':
        return <Badge variant="secondary">대기</Badge>
      default:
        return <Badge variant="outline">-</Badge>
    }
  }

  const openDetailModal = (salary: SalaryRecord) => {
    setSelectedSalary(salary)
    setShowDetailModal(true)
  }

  const handleDownloadPayslip = () => {
    alert('급여명세서 PDF 다운로드 기능은 추후 구현 예정입니다.')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 급여 조회 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">급여 조회</CardTitle>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSalaries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>선택한 월에 급여 기록이 없습니다</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>월</TableHead>
                    <TableHead>근무일/시간</TableHead>
                    <TableHead>기본급</TableHead>
                    <TableHead>총 급여</TableHead>
                    <TableHead>실수령액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell className="font-medium">
                        {format(new Date(salary.yearMonth + '-01'), 'yyyy년 MM월', { locale: ko })}
                      </TableCell>
                      <TableCell>
                        {salary.workDays}일 / {salary.workHours}시간
                      </TableCell>
                      <TableCell>{salary.baseSalary.toLocaleString()}원</TableCell>
                      <TableCell className="font-medium">
                        {salary.totalSalary.toLocaleString()}원
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">
                        {salary.netSalary.toLocaleString()}원
                      </TableCell>
                      <TableCell>{getStatusBadge(salary.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailModal(salary)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 급여 명세서 상세 모달 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>급여 명세서</DialogTitle>
            <DialogDescription>
              {selectedSalary && format(new Date(selectedSalary.yearMonth + '-01'), 'yyyy년 MM월', { locale: ko })}
            </DialogDescription>
          </DialogHeader>

          {selectedSalary && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">근무일수</p>
                  <p className="text-lg font-semibold">{selectedSalary.workDays}일</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">근무시간</p>
                  <p className="text-lg font-semibold">{selectedSalary.workHours}시간</p>
                </div>
              </div>

              {/* 급여 내역 */}
              <div>
                <h3 className="font-semibold mb-3">급여 내역</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span>기본급</span>
                    <span className="font-medium">{selectedSalary.baseSalary.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>연장 수당</span>
                    <span className="font-medium">{selectedSalary.allowances.overtime.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>야간 수당</span>
                    <span className="font-medium">{selectedSalary.allowances.night.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>휴일 수당</span>
                    <span className="font-medium">{selectedSalary.allowances.holiday.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>주휴 수당</span>
                    <span className="font-medium">{selectedSalary.allowances.weeklyHoliday.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between py-3 bg-blue-50 px-2 rounded font-semibold">
                    <span>총 급여</span>
                    <span className="text-blue-600">{selectedSalary.totalSalary.toLocaleString()}원</span>
                  </div>
                </div>
              </div>

              {/* 공제 내역 */}
              <div>
                <h3 className="font-semibold mb-3">공제 내역</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span>세금</span>
                    <span className="font-medium text-red-600">
                      -{selectedSalary.deductions.tax.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>4대보험</span>
                    <span className="font-medium text-red-600">
                      -{selectedSalary.deductions.insurance.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between py-3 bg-green-50 px-2 rounded font-bold">
                    <span>실수령액</span>
                    <span className="text-green-600 text-lg">
                      {selectedSalary.netSalary.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleDownloadPayslip}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF 다운로드
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1"
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
