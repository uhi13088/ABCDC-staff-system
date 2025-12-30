'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Clock, 
  Calendar, 
  DollarSign, 
  LogIn, 
  LogOut,
  Loader2,
  Bell
} from 'lucide-react'
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { clockIn, clockOut } from '@/services/attendanceService'
import { safeToDate } from '@/lib/utils/timestamp'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface DashboardTabProps {
  employeeData: {
    uid: string
    companyId: string
    storeId: string
    name: string
  }
}

interface DashboardStats {
  workDays: number
  workHours: number
  estimatedSalary: number
  todayStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out'
  todayClockIn?: string
  todayClockOut?: string
  currentAttendanceId?: string
}

interface Notice {
  id: string
  title: string
  content: string
  createdAt: any
}

export default function DashboardTab({ employeeData }: DashboardTabProps) {
  const [stats, setStats] = useState<DashboardStats>({
    workDays: 0,
    workHours: 0,
    estimatedSalary: 0,
    todayStatus: 'not_clocked_in'
  })
  const [notices, setNotices] = useState<Notice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isClocking, setIsClocking] = useState(false)

  // 통계 데이터 로드
  const loadDashboardStats = async () => {
    try {
      const now = new Date()
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)

      // 이번 달 출근 기록 조회
      const attendanceRef = collection(db, COLLECTIONS.ATTENDANCE)
      const attendanceQuery = query(
        attendanceRef,
        where('companyId', '==', employeeData.companyId),
        where('userId', '==', employeeData.uid),
        orderBy('clockIn', 'desc')
      )

      const attendanceSnapshot = await getDocs(attendanceQuery)
      
      let workDays = 0
      let totalMinutes = 0
      let todayStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' = 'not_clocked_in'
      let todayClockIn: string | undefined
      let todayClockOut: string | undefined
      let currentAttendanceId: string | undefined

      attendanceSnapshot.forEach((doc) => {
        const data = doc.data()
        const clockInDate = safeToDate(data.clockIn)
        const clockOutDate = data.clockOut ? safeToDate(data.clockOut) : null

        if (!clockInDate) return

        // 이번 달 데이터만 집계
        if (clockInDate >= monthStart && clockInDate <= monthEnd) {
          workDays++

          // 근무 시간 계산
          if (clockOutDate) {
            const minutes = Math.floor((clockOutDate.getTime() - clockInDate.getTime()) / 1000 / 60)
            totalMinutes += minutes
          }
        }

        // 오늘 출근 상태 확인
        const today = format(now, 'yyyy-MM-dd')
        const recordDate = format(clockInDate, 'yyyy-MM-dd')

        if (recordDate === today) {
          currentAttendanceId = doc.id
          todayClockIn = format(clockInDate, 'HH:mm', { locale: ko })

          if (clockOutDate) {
            todayStatus = 'clocked_out'
            todayClockOut = format(clockOutDate, 'HH:mm', { locale: ko })
          } else {
            todayStatus = 'clocked_in'
          }
        }
      })

      const workHours = Math.floor(totalMinutes / 60)

      // 예상 급여 계산 (시급 9,860원 기준, 실제로는 계약서 데이터 참조 필요)
      const estimatedSalary = Math.floor(workHours * 9860)

      setStats({
        workDays,
        workHours,
        estimatedSalary,
        todayStatus,
        todayClockIn,
        todayClockOut,
        currentAttendanceId
      })
    } catch (error) {
      console.error('대시보드 통계 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardStats()
    loadNotices()
  }, [employeeData])

  // 공지사항 로드 (최근 3개)
  const loadNotices = async () => {
    try {
      const noticesRef = collection(db, COLLECTIONS.NOTICES)
      const noticesQuery = query(
        noticesRef,
        where('companyId', '==', employeeData.companyId),
        orderBy('createdAt', 'desc'),
        limit(3)
      )

      const noticesSnapshot = await getDocs(noticesQuery)
      const noticesList: Notice[] = []

      noticesSnapshot.forEach((doc) => {
        noticesList.push({
          id: doc.id,
          ...doc.data()
        } as Notice)
      })

      setNotices(noticesList)
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
    }
  }

  // 출근 처리
  const handleClockIn = async () => {
    if (!confirm('출근 처리하시겠습니까?')) return

    setIsClocking(true)
    try {
      // 오늘 날짜 (KST)
      const today = format(new Date(), 'yyyy-MM-dd')
      
      await clockIn(
        employeeData.uid,
        employeeData.companyId,
        employeeData.storeId,
        today
      )

      alert('출근 처리되었습니다.')
      await loadDashboardStats() // 통계 새로고침
    } catch (error) {
      console.error('출근 처리 실패:', error)
      alert(error.message || '출근 처리 중 오류가 발생했습니다.')
    } finally {
      setIsClocking(false)
    }
  }

  // 퇴근 처리
  const handleClockOut = async () => {
    if (!stats.currentAttendanceId) {
      alert('출근 기록을 찾을 수 없습니다.')
      return
    }

    if (!confirm('퇴근 처리하시겠습니까?')) return

    setIsClocking(true)
    try {
      await clockOut(stats.currentAttendanceId) // ✅ attendanceId만 전달

      alert('퇴근 처리되었습니다.')
      await loadDashboardStats() // 통계 새로고침
    } catch (error) {
      console.error('퇴근 처리 실패:', error)
      alert(error.message || '퇴근 처리 중 오류가 발생했습니다.')
    } finally {
      setIsClocking(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 공지사항 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            공지사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">등록된 공지사항이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <div key={notice.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <h4 className="font-medium text-sm text-gray-900 mb-1">{notice.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{notice.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {notice.createdAt && format(safeToDate(notice.createdAt) || new Date(), 'yyyy-MM-dd HH:mm', { locale: ko })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 이번 달 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              이번 달 근무일수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.workDays}일</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              이번 달 근무시간
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.workHours}시간</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              예상 급여
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.estimatedSalary.toLocaleString()}원
            </p>
            <p className="text-xs text-gray-500 mt-1">
              * 시급 기준 예상 금액입니다
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
