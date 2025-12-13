/**
 * 스케줄 시뮬레이터 모달
 * 백업: admin-dashboard.html 라인 14220-14288 (모달 UI)
 */

'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { SimulatorGanttChart } from '../simulator-gantt-chart';
import { SimulatorPerson, DayOfWeek } from '@/lib/types/schedule';

interface SimulatorModalProps {
  open: boolean;
  onClose: () => void;
  // useSimulatorLogic 훅에서 제공하는 props
  simulatorList: any[];
  currentSimulatorId: string | null;
  persons: SimulatorPerson[];
  schedules: any;
  currentWeek: Date;
  loading: boolean;
  // 함수들
  loadSimulator: (id: string) => void;
  saveSimulator: (name: string) => Promise<boolean>;
  deleteSimulator: () => Promise<boolean>;
  createNewSimulator: () => void;
  addPerson: () => string;
  deletePerson: (id: string) => void;
  changeWeek: (offset: number) => void;
  getWeekKey: (date: Date) => string;
  getWeekNumber: (date: Date) => number;
  // 가상 인원 설정 모달 열기
  onEditPerson: (personId: string) => void;
}

export function SimulatorModal({
  open,
  onClose,
  simulatorList,
  currentSimulatorId,
  persons,
  schedules,
  currentWeek,
  loading,
  loadSimulator,
  saveSimulator,
  deleteSimulator,
  createNewSimulator,
  addPerson,
  deletePerson,
  changeWeek,
  getWeekKey,
  getWeekNumber,
  onEditPerson,
}: SimulatorModalProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [simulatorName, setSimulatorName] = useState('');

  const days: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];
  const weekKey = getWeekKey(currentWeek);
  const weekNum = getWeekNumber(currentWeek);
  const year = currentWeek.getFullYear();

  /**
   * 주간 요약 계산
   */
  function calculateWeeklySummary() {
    let totalHours = 0;
    let totalSalary = 0;

    persons.forEach(person => {
      const personSchedule = schedules[person.id]?.[weekKey];
      if (!personSchedule) return;

      let personHours = 0;
      let workDays = 0;

      days.forEach(day => {
        const schedule = personSchedule[day];
        if (schedule && schedule.isWorkDay) {
          personHours += schedule.hours || 0;
          workDays++;
        }
      });

      totalHours += personHours;

      // 주급 계산
      if (person.salaryType === 'hourly' && person.salaryAmount) {
        let weeklySalary = personHours * person.salaryAmount;
        // 주휴수당 (주 15시간 이상)
        if (personHours >= 15 && workDays > 0) {
          const avgDailyHours = personHours / workDays;
          weeklySalary += avgDailyHours * person.salaryAmount;
        }
        totalSalary += weeklySalary;
      } else if (person.salaryType === 'monthly' && person.salaryAmount) {
        totalSalary += person.salaryAmount / 4.345;
      }
    });

    return {
      totalHours,
      totalSalary: totalSalary * 4.345, // 월급으로 환산
      workingPersons: persons.length,
    };
  }

  /**
   * 인원별 주간 정보 계산
   */
  function calculatePersonWeeklyInfo(person: SimulatorPerson) {
    const personSchedule = schedules[person.id]?.[weekKey];
    if (!personSchedule) {
      return { totalHours: 0, weeklySalary: 0 };
    }

    let totalHours = 0;
    let workDays = 0;

    days.forEach(day => {
      const schedule = personSchedule[day];
      if (schedule && schedule.isWorkDay) {
        totalHours += schedule.hours || 0;
        workDays++;
      }
    });

    let weeklySalary = 0;
    if (person.salaryType === 'hourly' && person.salaryAmount) {
      weeklySalary = totalHours * person.salaryAmount;
      // 주휴수당
      if (totalHours >= 15 && workDays > 0) {
        const avgDailyHours = totalHours / workDays;
        weeklySalary += avgDailyHours * person.salaryAmount;
      }
    } else if (person.salaryType === 'monthly' && person.salaryAmount) {
      weeklySalary = person.salaryAmount / 4.345;
    }

    return { totalHours, weeklySalary };
  }

  /**
   * 시뮬레이터 저장 핸들러
   */
  async function handleSave() {
    const name = simulatorName.trim() || `시뮬레이터 ${new Date().toLocaleDateString()}`;
    const success = await saveSimulator(name);
    if (success) {
      setSaveDialogOpen(false);
      setSimulatorName('');
    }
  }

  /**
   * 시뮬레이터 삭제 핸들러
   */
  async function handleDelete() {
    const success = await deleteSimulator();
    if (success) {
      // 삭제 후 처리는 useSimulatorLogic에서 수행
    }
  }

  const summary = calculateWeeklySummary();

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[1400px] max-h-[90vh] flex flex-col p-0">
          {/* 헤더 */}
          <DialogHeader className="p-6 border-b-2">
            <DialogTitle className="text-lg font-bold">📅 스케줄 시뮬레이터</DialogTitle>
            
            {/* 상단 컨트롤 */}
            <div className="flex gap-2 items-center mt-4">
              <Select
                value={currentSimulatorId || 'new'}
                onValueChange={(value) => loadSimulator(value === 'new' ? '' : value)}
              >
                <SelectTrigger className="flex-1 max-w-[300px]">
                  <SelectValue placeholder="새 시뮬레이터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">새 시뮬레이터</SelectItem>
                  {simulatorList.map(sim => (
                    <SelectItem key={sim.id} value={sim.id!}>
                      {sim.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={createNewSimulator}>
                ✨ 새로만들기
              </Button>
              <Button onClick={() => setSaveDialogOpen(true)}>
                💾 저장
              </Button>
              {currentSimulatorId && (
                <Button variant="destructive" onClick={handleDelete}>
                  🗑️ 삭제
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* 바디 (2단 레이아웃) */}
          <div className="flex flex-1 overflow-hidden">
            {/* 좌측: 간트 차트 영역 */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* 주차 네비게이션 */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <Button variant="outline" size="sm" onClick={() => changeWeek(-1)}>
                  ◀ 이전 주
                </Button>
                <span className="text-sm font-semibold">
                  {year}년 {weekNum}주차 ({currentWeek.getMonth() + 1}/{currentWeek.getDate()} ~)
                </span>
                <Button variant="outline" size="sm" onClick={() => changeWeek(1)}>
                  다음 주 ▶
                </Button>
              </div>

              {/* 간트 차트 */}
              <SimulatorGanttChart
                persons={persons}
                schedules={schedules}
                currentWeek={currentWeek}
                weekKey={weekKey}
              />
            </div>

            {/* 우측: 사이드바 */}
            <div className="w-[320px] p-6 border-l flex flex-col gap-6 overflow-y-auto">
              {/* 주간 요약 */}
              <div>
                <h4 className="text-sm font-bold mb-2">📊 주간 요약</h4>
                <div className="bg-blue-50 p-3 rounded-md text-xs space-y-1">
                  <div>총 근무시간: <strong>{summary.totalHours.toFixed(1)}h</strong></div>
                  <div>근무 인원: <strong>{summary.workingPersons}명</strong></div>
                </div>
              </div>

              {/* 가상 인원 목록 */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold">👥 가상 인원</h4>
                  <Button size="sm" onClick={addPerson}>
                    + 추가
                  </Button>
                </div>
                <div className="space-y-2">
                  {persons.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      가상 인원을 추가하세요
                    </div>
                  ) : (
                    persons.map(person => {
                      const { totalHours, weeklySalary } = calculatePersonWeeklyInfo(person);
                      
                      let salaryText = '';
                      if (person.salaryType === 'hourly') {
                        salaryText = `시급: ₩${person.salaryAmount?.toLocaleString() || 0}`;
                      } else if (person.salaryType === 'monthly') {
                        salaryText = `월급: ₩${person.salaryAmount?.toLocaleString() || 0}`;
                      }

                      return (
                        <div
                          key={person.id}
                          className="bg-white border rounded-md p-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => onEditPerson(person.id)}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <div className="font-semibold text-sm">{person.name}</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePerson(person.id);
                              }}
                              className="text-red-500 hover:text-red-700 text-lg leading-none"
                              title="삭제"
                            >
                              ×
                            </button>
                          </div>
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            {salaryText && <div>{salaryText}</div>}
                            <div>⏱️ {totalHours.toFixed(1)}시간</div>
                            {weeklySalary > 0 && (
                              <div className="text-blue-600 font-semibold">
                                💰 ₩{Math.round(weeklySalary).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 월간 급여 합계 */}
              <div>
                <h4 className="text-sm font-bold mb-2">💰 월간 급여 합계</h4>
                <div className="bg-orange-50 p-4 rounded-md text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ₩{Math.round(summary.totalSalary).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">주휴수당 포함</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 저장 다이얼로그 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>시뮬레이터 저장</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">시뮬레이터 이름</label>
              <Input
                placeholder="예: 2025년 1월 매장 스케줄"
                value={simulatorName}
                onChange={(e) => setSimulatorName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
