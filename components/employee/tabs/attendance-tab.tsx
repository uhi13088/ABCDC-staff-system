'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { QrCode, Calendar as CalendarIcon } from 'lucide-react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { safeToDate } from '@/lib/utils/timestamp'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'

interface AttendanceTabProps {
  employeeData: {
    uid: string
    companyId: string
    storeId: string
  }
}

interface AttendanceRecord {
  id: string
  date: string
  clockIn: string
  clockOut: string
  workHours: string
  status: 'approved' | 'pending' | 'rejected'
  location: string
}

export default function AttendanceTab({ employeeData }: AttendanceTabProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [showQRModal, setShowQRModal] = useState(false)

  // 출근 기록 로드
  const loadAttendanceRecords = async () => {
    setIsLoading(true)
    try {
      const [year, month] = selectedMonth.split('-')
      const targetDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const monthStart = startOfMonth(targetDate)
      const monthEnd = endOfMonth(targetDate)

      const attendanceRef = collection(db, COLLECTIONS.ATTENDANCE)
      const attendanceQuery = query(
        attendanceRef,
        where('companyId', '==', employeeData.companyId),
        where('userId', '==', employeeData.uid),
        orderBy('clockIn', 'desc')
      )

      const snapshot = await getDocs(attendanceQuery)
      
      const loadedRecords: AttendanceRecord[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const clockInDate = safeToDate(data.clockIn)
        
        if (!clockInDate) return

        // 선택한 월의 데이터만 필터링
        if (clockInDate >= monthStart && clockInDate <= monthEnd) {
          const clockOutDate = data.clockOut ? safeToDate(data.clockOut) : null
          
          let workHours = '-'
          if (clockOutDate) {
            const minutes = Math.floor((clockOutDate.getTime() - clockInDate.getTime()) / 1000 / 60)
            const hours = Math.floor(minutes / 60)
            const mins = minutes % 60
            workHours = `${hours}시간 ${mins}분`
          }

          loadedRecords.push({
            id: doc.id,
            date: format(clockInDate, 'yyyy-MM-dd (EEE)', { locale: ko }),
            clockIn: format(clockInDate, 'HH:mm'),
            clockOut: clockOutDate ? format(clockOutDate, 'HH:mm') : '-',
            workHours,
            status: data.status || 'pending',
            location: data.location || '-'
          })
        }
      })

      setRecords(loadedRecords)
    } catch (error) {
      console.error('출근 기록 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAttendanceRecords()
  }, [selectedMonth, employeeData])

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">승인</Badge>
      case 'pending':
        return <Badge variant="secondary">대기</Badge>
      case 'rejected':
        return <Badge variant="destructive">반려</Badge>
      default:
        return <Badge variant="outline">-</Badge>
    }
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
      {/* QR 체크인 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">QR 코드 출퇴근</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              매장에 비치된 QR 코드를 스캔하여 출퇴근을 기록하세요
            </p>
            <Button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              QR 스캔
            </Button>
          </div>

          {/* QR 스캔 기능은 나중에 추가 (모바일 카메라 필요) */}
          {showQRModal && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                QR 스캔 기능은 모바일 앱에서 사용할 수 있습니다.
                <br />
                현재는 대시보드 탭에서 출퇴근 버튼을 이용해주세요.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowQRModal(false)}
              >
                닫기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 근무 내역 테이블 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">근무 내역</CardTitle>
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
          {records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>선택한 월에 출근 기록이 없습니다</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>출근</TableHead>
                    <TableHead>퇴근</TableHead>
                    <TableHead>근무시간</TableHead>
                    <TableHead>위치</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.date}</TableCell>
                      <TableCell>{record.clockIn}</TableCell>
                      <TableCell>{record.clockOut}</TableCell>
                      <TableCell>{record.workHours}</TableCell>
                      <TableCell>{record.location}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 요약 정보 */}
          {records.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">총 근무일수:</span>
                  <span className="ml-2 font-semibold">{records.length}일</span>
                </div>
                <div>
                  <span className="text-gray-600">승인된 근무:</span>
                  <span className="ml-2 font-semibold">
                    {records.filter(r => r.status === 'approved').length}일
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
