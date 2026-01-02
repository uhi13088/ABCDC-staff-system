/**
 * 근무스케줄 간트차트 컴포넌트
 * 백업: schedule-viewer.js 라인 11-200 (renderScheduleGanttChart)
 * 
 * 기능:
 * - 시간대별 근무 시각화 (00:00~24:00) 🆕
 * - 직원별 색상 구분
 * - 대체근무 표시 (🔄 아이콘)
 * - 휴게시간 표시
 * - 주간 요약 사이드바
 */

'use client';

import React from 'react';
import { WeekScheduleData, DayOfWeek } from '@/lib/types/schedule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ScheduleGanttChartProps {
  scheduleData: WeekScheduleData;
}

export function ScheduleGanttChart({ scheduleData }: ScheduleGanttChartProps) {
  const days: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];
  const startHour = 0;  // 00:00부터 시작
  const endHour = 24;   // 24:00까지 (다음 날 00:00)
  const totalHours = endHour - startHour;
  const rowHeight = 35;
  const totalHeight = totalHours * rowHeight;
  
  // 직원별 색상 정의
  const employeeColors = [
    '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#9B59B6',
    '#FF8C42', '#3498DB', '#E74C3C', '#1ABC9C', '#F39C12',
    '#E91E63', '#00BCD4', '#8BC34A', '#FF5722', '#673AB7',
  ];
  
  const colorMap: Record<string, string> = {};
  scheduleData.employees.forEach((emp, index) => {
    colorMap[emp.name] = employeeColors[index % employeeColors.length];
  });
  
  // 날짜 정보 생성
  const dateInfo = days.map((day, index) => {
    const date = new Date(scheduleData.monday);
    date.setDate(date.getDate() + index);
    return {
      day,
      date: `${date.getMonth() + 1}/${date.getDate()}`,
    };
  });
  
  // 요일별 근무자 목록 생성
  const dayWorkers: Record<DayOfWeek, any[]> = {
    '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': []
  };
  
  const isAttendanceMode = scheduleData.type === 'attendance';
  
  scheduleData.employees.forEach(emp => {
    days.forEach(day => {
      const schedules = emp.schedules[day];
      schedules.forEach(schedule => {
        if (schedule.isWorkDay) {
          // 출퇴근 기록 모드: 상태별 색상
          let barColor = colorMap[emp.name];
          if (isAttendanceMode) {
            const statusText = schedule.statusText || '정상';
            if (statusText === '결근') barColor = '#EF5350';
            else if (statusText.includes('지각') || statusText.includes('조퇴')) barColor = '#FFA726';
            else if (statusText === '근무중') barColor = '#29B6F6';
            else barColor = '#66BB6A';
          }
          
          dayWorkers[day].push({
            name: emp.name,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            hours: schedule.hours,
            breakTime: schedule.breakTime,
            color: barColor,
            isShiftReplacement: schedule.isShiftReplacement || false,
            status: schedule.status,
            statusText: schedule.statusText,
          });
        }
      });
    });
  });
  
  /**
   * 시간 → 위치 계산 (픽셀)
   * 안전장치: null/undefined/Date 객체 처리
   */
  const timeToPosition = (time: string | null | undefined | Date): number => {
    // 🔒 안전장치 1: null/undefined 체크
    if (!time) return 0;
    
    // 🔒 안전장치 2: Date 객체인 경우 변환
    if (time instanceof Date) {
      time = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    }
    
    // 🔒 안전장치 3: 문자열이 아닌 경우 문자열로 변환
    if (typeof time !== 'string') {
      console.warn('⚠️ timeToPosition: 유효하지 않은 시간 형식:', time);
      return 0;
    }
    
    // 🔒 안전장치 4: 형식 검증 (HH:MM)
    if (!time.includes(':')) {
      console.warn('⚠️ timeToPosition: 콜론(:)이 없는 시간 형식:', time);
      return 0;
    }
    
    const [h, m] = time.split(':').map(Number);
    
    // 🔒 안전장치 5: NaN 체크
    if (isNaN(h) || isNaN(m)) {
      console.warn('⚠️ timeToPosition: 숫자 변환 실패:', time);
      return 0;
    }
    
    const minutes = (h - startHour) * 60 + m;
    return (minutes / 60) * rowHeight;
  };
  
  /**
   * 근무 시간 계산 (높이)
   * 안전장치: null/undefined/Date 객체 처리, 현재 근무중 처리
   */
  const calculateHeight = (startTime: string | null | undefined | Date, endTime: string | null | undefined | Date): number => {
    // 🔒 안전장치 1: startTime이 없으면 0 반환
    if (!startTime) return 0;
    
    // 🔒 안전장치 2: Date 객체 변환
    if (startTime instanceof Date) {
      startTime = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    }
    if (endTime instanceof Date) {
      endTime = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
    }
    
    // 🔒 안전장치 3: 문자열 변환
    if (typeof startTime !== 'string') {
      console.warn('⚠️ calculateHeight: 유효하지 않은 startTime:', startTime);
      return 0;
    }
    
    // 🔒 안전장치 4: endTime이 없으면 현재 시간 사용 (근무중)
    if (!endTime || typeof endTime !== 'string') {
      const now = new Date();
      endTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      console.log('ℹ️ calculateHeight: 근무중 - 현재 시간 사용:', endTime);
    }
    
    // 🔒 안전장치 5: 형식 검증
    if (!startTime.includes(':') || !endTime.includes(':')) {
      console.warn('⚠️ calculateHeight: 유효하지 않은 시간 형식:', { startTime, endTime });
      return 0;
    }
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    // 🔒 안전장치 6: NaN 체크
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      console.warn('⚠️ calculateHeight: 숫자 변환 실패:', { startTime, endTime });
      return 0;
    }
    
    const startMinutes = (startH - startHour) * 60 + startM;
    let endMinutes = (endH - startHour) * 60 + endM;
    
    // 자정을 넘긴 경우 처리
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    
    const height = ((endMinutes - startMinutes) / 60) * rowHeight;
    
    // 🔒 안전장치 7: 음수 방지
    return Math.max(height, 0);
  };
  
  /**
   * 주간 통계 계산
   */
  const calculateWeekStats = () => {
    let totalWorkDays = 0;
    let totalWorkHours = 0;
    
    scheduleData.employees.forEach(emp => {
      days.forEach(day => {
        const schedules = emp.schedules[day];
        schedules.forEach(schedule => {
          if (schedule.isWorkDay) {
            totalWorkDays++;
            totalWorkHours += schedule.hours || 0;
          }
        });
      });
    });
    
    return { totalWorkDays, totalWorkHours };
  };
  
  const stats = calculateWeekStats();
  
  return (
    <div className="flex gap-4 w-full max-w-[1400px] mx-auto">
      
      {/* 간트차트 */}
      <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="flex">
          
          {/* 시간 축 */}
          <div className="w-16 border-r border-slate-200 bg-slate-50 flex-shrink-0">
            <div className="h-12 flex items-center justify-center border-b-2 border-slate-300 font-bold text-xs text-slate-900">
              시간
            </div>
            <div className="relative" style={{ height: `${totalHeight}px` }}>
              {Array.from({ length: totalHours + 1 }, (_, i) => {
                const hour = startHour + i;
                const displayHour = hour > 24 ? hour - 24 : hour;
                const timeLabel = `${displayHour.toString().padStart(2, '0')}:00`;
                const topPos = i * rowHeight;
                
                return (
                  <div
                    key={i}
                    className="absolute w-full border-b border-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-600"
                    style={{ top: `${topPos}px`, height: `${rowHeight}px` }}
                  >
                    {timeLabel}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 요일별 컬럼 */}
          {dateInfo.map((info, dayIndex) => {
            const day = days[dayIndex];
            const workers = dayWorkers[day];
            
            return (
              <div 
                key={day} 
                className={`flex-1 ${dayIndex < days.length - 1 ? 'border-r border-slate-200' : ''}`}
              >
                {/* 헤더 */}
                <div className="h-12 flex flex-col items-center justify-center border-b-2 border-slate-300 bg-slate-50">
                  <div className="font-bold text-xs text-slate-900">{info.day}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{info.date}</div>
                </div>
                
                {/* 근무 바 */}
                <div className="relative bg-white" style={{ height: `${totalHeight}px` }}>
                  {/* 시간 격자 */}
                  {Array.from({ length: totalHours + 1 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-b border-slate-100"
                      style={{ top: `${i * rowHeight}px`, height: `${rowHeight}px` }}
                    />
                  ))}
                  
                  {/* 근무자 바 */}
                  {workers.length > 0 && (() => {
                    const maxBarWidth = 18;
                    const minBarWidth = 8;
                    const minSpacing = 3;
                    let barWidth = maxBarWidth;
                    
                    if (workers.length > 3) {
                      const totalWithSpacing = workers.length * maxBarWidth + (workers.length + 1) * minSpacing;
                      if (totalWithSpacing > 100) {
                        barWidth = (100 - (workers.length + 1) * minSpacing) / workers.length;
                        barWidth = Math.max(barWidth, minBarWidth);
                      }
                    }
                    
                    const spacing = workers.length > 1 
                      ? (100 - workers.length * barWidth) / (workers.length + 1) 
                      : (100 - barWidth) / 2;
                    
                    return workers.map((worker, workerIndex) => {
                      const topPos = timeToPosition(worker.startTime);
                      const height = calculateHeight(worker.startTime, worker.endTime);
                      const leftPos = spacing * (workerIndex + 1) + barWidth * workerIndex;
                      
                      const shiftStyle = worker.isShiftReplacement 
                        ? 'border-2 border-yellow-500 bg-gradient-to-br from-yellow-100 to-yellow-200' 
                        : '';
                      
                      return (
                        <div
                          key={workerIndex}
                          className={`absolute rounded opacity-90 flex items-center justify-center text-base ${shiftStyle}`}
                          style={{
                            left: `${leftPos}%`,
                            top: `${topPos}px`,
                            width: `${barWidth}%`,
                            height: `${height}px`,
                            backgroundColor: worker.isShiftReplacement ? undefined : worker.color,
                          }}
                          title={`${worker.name}: ${worker.startTime}-${worker.endTime}`}
                        >
                          {worker.isShiftReplacement && '🔄'}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 사이드바 - 주간 요약 */}
      <Card className="w-56 flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold border-b-2 border-blue-600 pb-2">
            📊 주간 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="text-slate-600 text-xs mb-1">총 근무일</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalWorkDays}일</div>
          </div>
          <div>
            <div className="text-slate-600 text-xs mb-1">총 근무시간</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalWorkHours.toFixed(1)}h</div>
          </div>
          <div>
            <div className="text-slate-600 text-xs mb-2">근무자 목록</div>
            <div className="space-y-1">
              {scheduleData.employees.map(emp => (
                <div key={emp.uid} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: colorMap[emp.name] }}
                  />
                  <span className="text-xs text-slate-700 truncate">{emp.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-200">
            {isAttendanceMode ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 mb-2">상태 범례</div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-[#66BB6A]" />
                  <span className="text-slate-600">정상</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-[#FFA726]" />
                  <span className="text-slate-600">지각/조퇴</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-[#29B6F6]" />
                  <span className="text-slate-600">근무중</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-[#EF5350]" />
                  <span className="text-slate-600">결근</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                  🔄
                </Badge>
                <span>대체근무</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
