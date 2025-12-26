/**
 * 스케줄 시뮬레이터 간트차트 컴포넌트
 * 백업: admin-dashboard.html 라인 13199-13400 (updateSimulatorGanttChart 함수)
 */

'use client';

import React from 'react';
import { SimulatorPerson, SimulatorSchedule, DayOfWeek } from '@/lib/types/schedule';

interface SimulatorGanttChartProps {
  persons: SimulatorPerson[];
  schedules: SimulatorSchedule;
  currentWeek: Date;
  weekKey: string;
}

// 직원별 색상 정의 (구별하기 쉬운 대비가 강한 색상)
const EMPLOYEE_COLORS = [
  '#FF6B6B', // 빨강
  '#4ECDC4', // 청록
  '#FFD93D', // 노랑
  '#6BCB77', // 연두
  '#9B59B6', // 보라
  '#FF8C42', // 주황
  '#3498DB', // 파랑
  '#E74C3C', // 진한 빨강
  '#1ABC9C', // 민트
  '#F39C12', // 금색
  '#E91E63', // 핑크
  '#00BCD4', // 하늘색
  '#8BC34A', // 라임
  '#FF5722', // 딥오렌지
  '#673AB7', // 딥퍼플
  '#009688', // 틸
  '#FFC107', // 앰버
  '#795548', // 브라운
  '#607D8B', // 블루그레이
  '#CDDC39', // 라임옐로우
];

export function SimulatorGanttChart({ persons, schedules, currentWeek, weekKey }: SimulatorGanttChartProps) {
  const days: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];
  const hours = Array.from({ length: 19 }, (_, i) => i + 6); // 6시 ~ 24시 (0시)

  // 빈 상태 처리
  if (persons.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        가상 인원을 추가하고 스케줄을 설정하세요
      </div>
    );
  }

  /**
   * 시간을 픽셀 위치로 변환
   */
  function timeToPosition(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    let totalHour = hour + minute / 60;
    
    // 새벽 시간 (0~5시)은 24시 이후로 처리
    if (totalHour < 6) {
      totalHour += 24;
    }
    
    return (totalHour - 6) * 40; // 1시간당 40px (높이 증가)
  }

  /**
   * 근무 시간대 바 렌더링
   */
  function renderWorkBar(
    personIndex: number,
    startTime: string,
    endTime: string,
    personName: string
  ) {
    const topPos = timeToPosition(startTime);
    const bottomPos = timeToPosition(endTime);
    const height = bottomPos - topPos;
    
    const color = EMPLOYEE_COLORS[personIndex % EMPLOYEE_COLORS.length];
    
    return (
      <div
        key={`${personName}-${startTime}`}
        className="absolute rounded"
        style={{
          top: `${topPos}px`,
          height: `${height}px`,
          backgroundColor: color,
          opacity: 0.8,
          border: `2px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 600,
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          zIndex: 1,
        }}
      >
        {personName}
      </div>
    );
  }

  return (
    <div className="overflow-auto border-2 border-border rounded-lg">
      <div className="inline-block min-w-full">
        {/* 헤더 (요일) */}
        <div className="flex border-b-2 border-border sticky top-0 bg-white z-10">
          <div className="w-20 flex-shrink-0 border-r-2 border-border bg-muted/80 p-3 text-center text-sm font-bold">
            시간
          </div>
          {days.map((day, index) => {
            const date = new Date(currentWeek);
            date.setDate(date.getDate() + index);
            const isWeekend = day === '토' || day === '일';
            return (
              <div
                key={day}
                className={`flex-1 min-w-[140px] border-r-2 border-border p-3 text-center ${
                  isWeekend ? 'bg-red-50' : 'bg-muted/80'
                }`}
              >
                <div className={`text-base font-bold ${isWeekend ? 'text-red-600' : ''}`}>{day}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {date.getMonth() + 1}월 {date.getDate()}일
                </div>
              </div>
            );
          })}
        </div>

        {/* 시간축 + 간트차트 */}
        <div className="flex">
          {/* 시간축 */}
          <div className="w-20 flex-shrink-0 border-r-2 border-border bg-muted/50">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-[40px] border-b border-border/50 flex items-center justify-center text-xs font-medium text-muted-foreground"
              >
                {hour}:00
              </div>
            ))}
          </div>

          {/* 각 요일별 간트차트 */}
          {days.map(day => {
            // 해당 요일에 근무하는 인원들의 스케줄 수집
            const daySchedules = persons
              .map((person, index) => {
                const personSchedule = schedules[person.id]?.[weekKey]?.[day];
                if (personSchedule && personSchedule.isWorkDay) {
                  return {
                    person,
                    personIndex: index,
                    schedule: personSchedule,
                  };
                }
                return null;
              })
              .filter(Boolean);

            const workingCount = daySchedules.length;
            const isWeekend = day === '토' || day === '일';

            return (
              <div
                key={day}
                className={`flex-1 min-w-[140px] border-r-2 border-border relative ${
                  isWeekend ? 'bg-red-50/30' : 'bg-background'
                }`}
                style={{ height: `${19 * 40}px` }}
              >
                {/* 시간 구분선 */}
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="absolute w-full h-[40px] border-b border-border/30"
                    style={{ top: `${(hour - 6) * 40}px` }}
                  />
                ))}

                {/* 근무 바 렌더링 */}
                {daySchedules.map((item, idx) => {
                  if (!item) return null;

                  const { person, personIndex, schedule } = item;
                  const barWidth = workingCount === 1
                    ? 85
                    : workingCount === 2
                    ? 48
                    : workingCount === 3
                    ? 30
                    : Math.max(22, 90 / workingCount);

                  const leftOffset = 5 + idx * (100 / workingCount);

                  return (
                    <div
                      key={`${person.id}-${day}`}
                      className="absolute"
                      style={{
                        left: `${leftOffset}%`,
                        width: `${barWidth}%`,
                      }}
                    >
                      {renderWorkBar(
                        personIndex,
                        schedule.startTime,
                        schedule.endTime,
                        person.name
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
