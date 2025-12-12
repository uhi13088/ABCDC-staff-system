/**
 * 가상 인원 설정 모달
 * 백업: admin-dashboard.html 라인 14290-14348 (가상 인원 설정 모달)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimulatorPerson, ScheduleGroup, DayOfWeek } from '@/lib/types/schedule';
import { X } from 'lucide-react';

interface PersonSettingsModalProps {
  open: boolean;
  onClose: () => void;
  person: SimulatorPerson | null;
  onSave: (personId: string, updates: Partial<SimulatorPerson>) => void;
}

export function PersonSettingsModal({ open, onClose, person, onSave }: PersonSettingsModalProps) {
  const [salaryType, setSalaryType] = useState<'hourly' | 'monthly' | 'none'>('none');
  const [salaryAmount, setSalaryAmount] = useState<string>('');
  const [scheduleGroups, setScheduleGroups] = useState<ScheduleGroup[]>([]);

  const days: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];

  // person이 변경될 때 초기화
  useEffect(() => {
    if (person) {
      setSalaryType(person.salaryType || 'none');
      setSalaryAmount(person.salaryAmount?.toString() || '');
      setScheduleGroups(person.scheduleGroups || []);
    } else {
      setSalaryType('none');
      setSalaryAmount('');
      setScheduleGroups([]);
    }
  }, [person]);

  /**
   * 근무일 그룹 추가
   */
  function addScheduleGroup() {
    const newGroup: ScheduleGroup = {
      id: `group-${Date.now()}`,
      days: [],
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
    };
    setScheduleGroups([...scheduleGroups, newGroup]);
  }

  /**
   * 근무일 그룹 삭제
   */
  function deleteScheduleGroup(groupId: string) {
    setScheduleGroups(scheduleGroups.filter(g => g.id !== groupId));
  }

  /**
   * 근무일 그룹 업데이트
   */
  function updateScheduleGroup(groupId: string, updates: Partial<ScheduleGroup>) {
    setScheduleGroups(scheduleGroups.map(g =>
      g.id === groupId ? { ...g, ...updates } : g
    ));
  }

  /**
   * 요일 토글
   */
  function toggleDay(groupId: string, day: DayOfWeek) {
    setScheduleGroups(scheduleGroups.map(g => {
      if (g.id === groupId) {
        const days = g.days.includes(day)
          ? g.days.filter(d => d !== day)
          : [...g.days, day];
        return { ...g, days };
      }
      return g;
    }));
  }

  /**
   * 저장
   */
  function handleSave() {
    if (!person) return;

    // 유효성 검사
    if (scheduleGroups.length === 0) {
      alert('최소 1개의 근무일 그룹을 추가해주세요.');
      return;
    }

    for (const group of scheduleGroups) {
      if (group.days.length === 0) {
        alert('근무일을 최소 1개 이상 선택해주세요.');
        return;
      }
    }

    const updates: Partial<SimulatorPerson> = {
      salaryType,
      salaryAmount: salaryType !== 'none' ? parseFloat(salaryAmount) || 0 : undefined,
      scheduleGroups,
    };

    onSave(person.id, updates);
    onClose();
  }

  if (!person) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        {/* 헤더 */}
        <DialogHeader className="p-6 border-b">
          <DialogTitle>⚙️ 가상 인원 설정: <span className="text-blue-600">{person.name}</span></DialogTitle>
        </DialogHeader>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 급여 설정 */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <h4 className="text-sm font-semibold">💼 급여 설정 (선택)</h4>
            
            <div className="flex gap-2">
              <label className="flex-1 flex items-center space-x-2 p-2 bg-white border rounded-md cursor-pointer">
                <input
                  type="radio"
                  name="salaryType"
                  value="hourly"
                  checked={salaryType === 'hourly'}
                  onChange={(e) => setSalaryType('hourly')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm flex-1">시급제</span>
              </label>
              <label className="flex-1 flex items-center space-x-2 p-2 bg-white border rounded-md cursor-pointer">
                <input
                  type="radio"
                  name="salaryType"
                  value="monthly"
                  checked={salaryType === 'monthly'}
                  onChange={(e) => setSalaryType('monthly')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm flex-1">월급제</span>
              </label>
              <label className="flex-1 flex items-center space-x-2 p-2 bg-white border rounded-md cursor-pointer">
                <input
                  type="radio"
                  name="salaryType"
                  value="none"
                  checked={salaryType === 'none'}
                  onChange={(e) => setSalaryType('none')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm flex-1">미설정</span>
              </label>
            </div>

            {salaryType !== 'none' && (
              <div>
                <Label className="text-xs text-muted-foreground">금액</Label>
                <Input
                  type="number"
                  placeholder="예: 10000"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* 근무 스케줄 */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-semibold">📅 근무 스케줄 (필수)</h4>
              <Button size="sm" variant="outline" onClick={addScheduleGroup}>
                + 근무일 그룹 추가
              </Button>
            </div>

            <div className="space-y-3">
              {scheduleGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  근무일 그룹을 추가해주세요
                </div>
              ) : (
                scheduleGroups.map((group, index) => (
                  <div key={group.id} className="p-4 border rounded-lg space-y-3 bg-white">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">그룹 {index + 1}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteScheduleGroup(group.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 요일 선택 */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">근무 요일</Label>
                      <div className="flex gap-1.5">
                        {days.map(day => (
                          <button
                            key={day}
                            onClick={() => toggleDay(group.id, day)}
                            className={`flex-1 py-1.5 text-xs rounded transition-colors ${
                              group.days.includes(day)
                                ? 'bg-blue-600 text-white font-semibold'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 시간 설정 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">시작 시간</Label>
                        <Input
                          type="time"
                          value={group.startTime}
                          onChange={(e) => updateScheduleGroup(group.id, { startTime: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">종료 시간</Label>
                        <Input
                          type="time"
                          value={group.endTime}
                          onChange={(e) => updateScheduleGroup(group.id, { endTime: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* 휴게시간 */}
                    <div>
                      <Label className="text-xs text-muted-foreground">휴게시간 (분)</Label>
                      <Input
                        type="number"
                        placeholder="예: 60"
                        value={group.breakMinutes || 0}
                        onChange={(e) => updateScheduleGroup(group.id, { breakMinutes: parseInt(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <DialogFooter className="p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
