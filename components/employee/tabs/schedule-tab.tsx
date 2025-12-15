'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { safeToDate } from '@/lib/utils/timestamp'
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addWeeks, 
  subWeeks,
  isSameDay 
} from 'date-fns'
import { ko } from 'date-fns/locale'

interface ScheduleTabProps {
  employeeData: {
    uid: string
    companyId: string
    storeId: string
    storeName: string
  }
}

interface ScheduleShift {
  id: string
  date: string
  dayOfWeek: string
  employeeName: string
  startTime: string
  endTime: string
  isMe: boolean
}

export default function ScheduleTab({ employeeData }: ScheduleTabProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [schedules, setSchedules] = useState<ScheduleShift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAllEmployees, setShowAllEmployees] = useState(false)

  // 주간 스케줄 로드
  const loadWeekSchedules = async () => {
    setIsLoading(true)
    try {
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // 월요일 시작
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

      const schedulesRef = collection(db, COLLECTIONS.SCHEDULES)
      const schedulesQuery = query(
        schedulesRef,
        where('companyId', '==', employeeData.companyId),
        where('storeId', '==', employeeData.storeId),
        orderBy('date', 'asc'),
        orderBy('startTime', 'asc')
      )

      const snapshot = await getDocs(schedulesQuery)
      
      const loadedSchedules: ScheduleShift[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const scheduleDate = safeToDate(data.date)
        
        if (!scheduleDate) return

        // 이번 주 데이터만 필터링
        if (scheduleDate >= weekStart && scheduleDate <= weekEnd) {
          // "매장 전체 보기" 옵션에 따라 필터링
          if (!showAllEmployees && data.employeeId !== employeeData.uid) {
            return // 내 스케줄만 보기
          }

          loadedSchedules.push({
            id: doc.id,
            date: format(scheduleDate, 'yyyy-MM-dd'),
            dayOfWeek: format(scheduleDate, 'EEE', { locale: ko }),
            employeeName: data.employeeName || '알 수 없음',
            startTime: data.startTime || '-',
            endTime: data.endTime || '-',
            isMe: data.employeeId === employeeData.uid
          })
        }
      })

      setSchedules(loadedSchedules)
    } catch (error) {
      console.error('스케줄 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWeekSchedules()
  }, [currentWeek, showAllEmployees, employeeData])

  // 이전 주
  const goToPreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1))
  }

  // 다음 주
  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1))
  }

  // 이번 주로 돌아가기
  const goToThisWeek = () => {
    setCurrentWeek(new Date())
  }

  // 주간 날짜 배열 생성
  const getWeekDays = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
    const days = []
    
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i))
    }
    
    return days
  }

  const weekDays = getWeekDays()
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

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
      {/* 주간 네비게이션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">내 스케줄</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-all"
                  checked={showAllEmployees}
                  onCheckedChange={setShowAllEmployees}
                />
                <Label htmlFor="show-all" className="text-sm cursor-pointer">
                  매장 전체 보기
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="text-center">
              <p className="text-lg font-semibold">
                {format(weekStart, 'yyyy년 MM월 dd일', { locale: ko })} - {format(weekEnd, 'MM월 dd일', { locale: ko })}
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={goToThisWeek}
                className="text-xs"
              >
                이번 주로
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 주간 스케줄 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayString = format(day, 'yyyy-MM-dd')
          const daySchedules = schedules.filter(s => s.date === dayString)
          const isToday = isSameDay(day, new Date())

          return (
            <Card key={dayString} className={isToday ? 'border-blue-500 border-2' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-center">
                  <div className={isToday ? 'text-blue-600 font-bold' : ''}>
                    {format(day, 'EEE', { locale: ko })}
                  </div>
                  <div className={`text-xs ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                    {format(day, 'MM/dd')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {daySchedules.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-xs">
                    스케줄 없음
                  </div>
                ) : (
                  daySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`p-2 rounded-lg text-xs ${
                        schedule.isMe
                          ? 'bg-blue-100 border border-blue-300'
                          : 'bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {showAllEmployees && (
                        <p className="font-medium mb-1 truncate">
                          {schedule.employeeName}
                          {schedule.isMe && <Badge variant="default" className="ml-1 text-xs py-0 px-1">나</Badge>}
                        </p>
                      )}
                      <p className="text-gray-700">
                        {schedule.startTime} - {schedule.endTime}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 스케줄 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">이번 주 근무 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">내 근무일:</span>
              <span className="ml-2 font-semibold">
                {schedules.filter(s => s.isMe).length}일
              </span>
            </div>
            {showAllEmployees && (
              <div>
                <span className="text-gray-600">전체 근무자:</span>
                <span className="ml-2 font-semibold">
                  {new Set(schedules.map(s => s.employeeName)).size}명
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
