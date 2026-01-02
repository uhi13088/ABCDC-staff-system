/**
 * 근무스케줄 카드 뷰 컴포넌트
 * 
 * 기능:
 * - 직원별 카드 형태 표시
 * - 주간 스케줄 요약
 * - 추가 계약서 배지 표시
 * - 실제 출퇴근 기록 표시
 */

'use client';

import React from 'react';
import { WeekScheduleData, DayOfWeek } from '@/lib/types/schedule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, AlertCircle } from 'lucide-react';

interface ScheduleCardViewProps {
  scheduleData: WeekScheduleData;
}

/**
 * 🔒 안전한 시간 변환 함수
 * Firestore Timestamp 객체 / Date 객체 / 문자열 모두 처리
 * React Error #31 방지
 */
const safeTimeStr = (time: any): string => {
  if (!time) return "00:00";
  
  // 이미 문자열이면 그대로 반환 (예: "09:00")
  if (typeof time === "string") return time;
  
  // Firestore Timestamp 처리 ({seconds: number, nanoseconds: number})
  if (time.seconds !== undefined) {
    const date = new Date(time.seconds * 1000);
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  
  // Date 객체 처리
  if (time instanceof Date) {
    const h = String(time.getHours()).padStart(2, "0");
    const m = String(time.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  
  console.warn('⚠️ safeTimeStr: 알 수 없는 시간 형식:', time);
  return "00:00";
};

export function ScheduleCardView({ scheduleData }: ScheduleCardViewProps) {
  const days: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scheduleData.employees.map((emp) => {
          // 주간 근무일 수 계산
          const workDays = days.filter(day => 
            emp.schedules[day].some(s => s.isWorkDay)
          );
          
          // 총 근무 시간 계산
          const totalHours = days.reduce((sum, day) => {
            const daySchedules = emp.schedules[day];
            return sum + daySchedules.reduce((daySum, s) => daySum + (s.hours || 0), 0);
          }, 0);
          
          return (
            <Card key={emp.uid} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    {emp.name}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {emp.role || 'staff'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{workDays.length}일</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{totalHours.toFixed(1)}시간</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-2">
                {days.map((day) => {
                  const daySchedules = emp.schedules[day];
                  
                  if (daySchedules.length === 0 || !daySchedules.some(s => s.isWorkDay)) {
                    return null;
                  }
                  
                  return (
                    <div key={day} className="border-l-2 border-blue-500 pl-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{day}요일</span>
                      </div>
                      
                      <div className="space-y-1">
                        {daySchedules.map((schedule, idx) => {
                          if (!schedule.isWorkDay) return null;
                          
                          // 계획 시간 vs 실제 시간
                          const hasActual = schedule.status;
                          
                          return (
                            <div key={idx} className="space-y-1">
                              {/* 계획 시간 */}
                              <div className="flex items-center gap-2 text-xs">
                                <Badge 
                                  variant={schedule.isShiftReplacement ? "destructive" : "outline"}
                                  className="text-xs py-0 px-2"
                                >
                                  {schedule.isShiftReplacement ? '대체' : '정규'}
                                </Badge>
                                <span className="text-slate-700">
                                  📅 {safeTimeStr(schedule.startTime)} - {safeTimeStr(schedule.endTime)}
                                </span>
                                {schedule.hours && (
                                  <span className="text-slate-500">
                                    ({schedule.hours}h)
                                  </span>
                                )}
                              </div>
                              
                              {/* 휴게시간 */}
                              {schedule.breakTime && (
                                <div className="text-xs text-slate-500 ml-12">
                                  휴게: {safeTimeStr(schedule.breakTime.start)}-{safeTimeStr(schedule.breakTime.end)} ({schedule.breakTime.minutes}분)
                                </div>
                              )}
                              
                              {/* 실제 출퇴근 시간 (출퇴근 기록 모드) */}
                              {hasActual && schedule.statusText && (
                                <div className={`flex items-center gap-1 text-xs ml-12 ${
                                  schedule.statusText.includes('지각') || schedule.statusText.includes('조퇴') 
                                    ? 'text-orange-600' 
                                    : schedule.statusText === '결근'
                                    ? 'text-red-600'
                                    : schedule.statusText === '근무중'
                                    ? 'text-blue-600'
                                    : 'text-green-600'
                                }`}>
                                  <AlertCircle className="w-3 h-3" />
                                  <span>{schedule.statusText}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {/* 근무일이 하나도 없을 때 */}
                {workDays.length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-sm">
                    이번 주 근무 없음
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* 빈 상태 */}
      {scheduleData.employees.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>스케줄 데이터가 없습니다.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
