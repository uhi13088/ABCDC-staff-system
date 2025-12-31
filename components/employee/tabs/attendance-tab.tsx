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
import { Calendar as CalendarIcon, Edit2 } from 'lucide-react'
import { collection, query, where, getDocs, orderBy, addDoc, doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { safeToDate } from '@/lib/utils/timestamp'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import EditAttendanceModal from '@/components/employee/modals/edit-attendance-modal'


interface AttendanceTabProps {
  employeeData: {
    uid: string
    companyId: string
    storeId: string
    name: string
  }
}

interface AttendanceRecord {
  id: string
  date: string
  clockIn: string
  clockOut: string
  workHours: string
  location: string
  warning?: string
  warningReason?: string
}

export default function AttendanceTab({ employeeData }: AttendanceTabProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null)
  const [autoApprove, setAutoApprove] = useState(false)


  // 통계 상태 추가
  const [stats, setStats] = useState({
    totalDays: 0,
    leaveDays: 0,
    overtimeDays: 0,
    absentDays: 0,
    lateCount: 0,
    earlyLeaveCount: 0
  })

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
      
      // 날짜별 데이터 수집 (중복 제거용)
      const dateMap = new Map<string, { late: boolean; earlyLeave: boolean; overtime: boolean }>()

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

          const dateKey = format(clockInDate, 'yyyy-MM-dd')
          
          // 날짜별 경고 사유 수집
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { late: false, earlyLeave: false, overtime: false })
          }
          const dayStats = dateMap.get(dateKey)!
          
          // 경고 사유 체크
          if (data.warningReason) {
            if (data.warningReason.includes('지각')) dayStats.late = true
            if (data.warningReason.includes('조기퇴근')) dayStats.earlyLeave = true
            if (data.warningReason.includes('연장근무')) dayStats.overtime = true
          }
          
          const record: AttendanceRecord = {
            id: doc.id,
            date: format(clockInDate, 'yyyy-MM-dd (EEE)', { locale: ko }),
            clockIn: format(clockInDate, 'HH:mm'),
            clockOut: clockOutDate ? format(clockOutDate, 'HH:mm') : '-',
            workHours,
            location: data.location || '-',
            warning: data.warning || undefined,
            warningReason: data.warningReason || undefined
          };
          
          loadedRecords.push(record);
        }
      })

      // 날짜 단위 통계 계산
      const uniqueDates = dateMap.size
      let lateCount = 0
      let earlyLeaveCount = 0
      let overtimeCount = 0
      
      dateMap.forEach((dayStats) => {
        if (dayStats.late) lateCount++
        if (dayStats.earlyLeave) earlyLeaveCount++
        if (dayStats.overtime) overtimeCount++
      })
      
      setStats({
        totalDays: uniqueDates,
        leaveDays: 0, // TODO: 휴가 데이터 연동
        overtimeDays: overtimeCount,
        absentDays: 0, // TODO: 결근 데이터 연동
        lateCount: lateCount,
        earlyLeaveCount: earlyLeaveCount
      })
      
      setRecords(loadedRecords)
      console.log('✅ 출퇴근 탭 로드 완료:', loadedRecords.length, '건');
      console.log('📊 날짜 단위 통계:', {
        총근무일: uniqueDates,
        지각: lateCount,
        조퇴: earlyLeaveCount,
        연장근무: overtimeCount
      });
      console.log('기록 ID 목록:', loadedRecords.map(r => r.id));
    } catch (error) {
      console.error('출근 기록 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 회사 설정 로드
  useEffect(() => {
    loadCompanySettings()
  }, [employeeData.companyId])

  useEffect(() => {
    loadAttendanceRecords()
  }, [selectedMonth, employeeData])

  // 회사 설정 로드 (자동 승인 여부)
  const loadCompanySettings = async () => {
    try {
      const settingsRef = doc(db, 'companies', employeeData.companyId, 'settings', 'attendance')
      const settingsSnap = await getDoc(settingsRef)
      if (settingsSnap.exists()) {
        setAutoApprove(settingsSnap.data().autoApproveEdit || false)
      }
    } catch (error) {
      console.error('설정 로드 실패:', error)
    }
  }

  // 수정 요청 제출
  const handleEditSubmit = async (data: { clockIn: string; clockOut: string; reason: string }) => {
    if (!selectedAttendance) return

    try {
      // 수정 요청 생성
      const editRequest = {
        type: 'attendance_edit',
        companyId: employeeData.companyId,
        userId: employeeData.uid,
        userName: employeeData.name,
        attendanceId: selectedAttendance.id,
        originalData: {
          date: selectedAttendance.date,
          clockIn: selectedAttendance.clockIn,
          clockOut: selectedAttendance.clockOut
        },
        requestedData: {
          clockIn: data.clockIn,
          clockOut: data.clockOut
        },
        reason: data.reason,
        status: autoApprove ? 'approved' : 'pending',
        autoApproved: autoApprove,
        createdAt: Timestamp.now(),
        processedAt: autoApprove ? Timestamp.now() : null
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.APPROVALS), editRequest)

      // 관리자에게 알림 생성
      try {
        const notificationData = {
          type: 'attendance_edit_request',
          companyId: employeeData.companyId,
          title: autoApprove ? '출퇴근 기록이 수정되었습니다' : '출퇴근 기록 수정 요청',
          message: `${employeeData.name}님이 ${selectedAttendance.date} 출퇴근 기록을 수정${autoApprove ? '했습니다' : ' 요청했습니다'}.`,
          userId: 'admin', // 관리자에게 전송
          read: false,
          relatedId: docRef.id || selectedAttendance.id, // approval ID 또는 attendance ID 사용
          relatedType: 'approval',
          createdAt: Timestamp.now()
        }

        await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), notificationData)
        console.log('✅ 알림 생성 완료');
      } catch (notifError) {
        console.error('❌ 알림 생성 실패 (무시하고 진행):', notifError);
      }

      alert(autoApprove 
        ? '✅ 출퇴근 기록이 수정되었습니다.'
        : '✅ 수정 요청이 제출되었습니다. 관리자 승인 후 반영됩니다.'
      )

      // 목록 새로고침
      await loadAttendanceRecords()
    } catch (error) {
      console.error('수정 요청 실패:', error)
      throw new Error('수정 요청에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 수정 버튼 클릭
  const handleEditClick = (record: AttendanceRecord) => {
    setSelectedAttendance(record)
    setEditModalOpen(true)
  }

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
                    <TableHead className="w-[100px]">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.date}
                        {record.warning && (
                          <div className="text-xs text-orange-600 mt-1">
                            ⚠️ {record.warningReason || '확인 필요'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{record.clockIn}</TableCell>
                      <TableCell>{record.clockOut}</TableCell>
                      <TableCell>{record.workHours}</TableCell>
                      <TableCell>{record.location}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(record)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 요약 정보 */}
          {records.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-gray-600 text-xs mb-1">총 근무일</div>
                  <div className="font-bold text-lg">{stats.totalDays}일</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600 text-xs mb-1">휴가</div>
                  <div className="font-bold text-lg text-blue-600">{stats.leaveDays}일</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600 text-xs mb-1">연장근무</div>
                  <div className="font-bold text-lg text-purple-600">{stats.overtimeDays}일</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600 text-xs mb-1">결근</div>
                  <div className="font-bold text-lg text-red-600">{stats.absentDays}일</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600 text-xs mb-1">지각</div>
                  <div className="font-bold text-lg text-orange-600">{stats.lateCount}일</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600 text-xs mb-1">조퇴</div>
                  <div className="font-bold text-lg text-yellow-600">{stats.earlyLeaveCount}일</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수정 모달 */}
      {selectedAttendance && (
        <EditAttendanceModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          attendance={selectedAttendance}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  )
}
