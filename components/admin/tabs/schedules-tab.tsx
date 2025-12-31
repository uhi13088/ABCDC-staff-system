/**
 * 근무스케줄 관리 탭 (Shadcn Blue Theme 완벽 적용)
 * 백업: admin-dashboard.html 라인 473-527
 * 
 * Phase 1: 기본 스케줄 조회 (테이블 뷰)
 * - 매장 선택
 * - 주차 네비게이션
 * - 주간 스케줄 테이블
 * 
 * Phase 2 (추후):
 * - 간트차트 뷰
 * - 출퇴근 기록 모드
 * - 스케줄 시뮬레이터
 * - PDF 내보내기
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { BreakTimeDetail } from '@/lib/types/contract';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Grid3x3,
  AlertCircle,
  Users
} from 'lucide-react';
import { useSchedulesLogic } from '@/hooks/admin/useSchedulesLogic';
import { useSimulatorLogic } from '@/hooks/admin/useSimulatorLogic';
import { DayOfWeek } from '@/lib/types/schedule';
import { ScheduleGanttChart } from '@/components/admin/schedule-gantt-chart';
import { ScheduleCardView } from '@/components/admin/schedule-card-view';
import { SimulatorModal } from '@/components/admin/modals/simulator-modal';
import { PersonSettingsModal } from '@/components/admin/modals/person-settings-modal';
import { generateSchedulesForRange } from '@/services/scheduleService';
import { getContracts } from '@/services/contractService';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface SchedulesTabProps {
  companyId: string;
}

export function SchedulesTab({ companyId }: SchedulesTabProps) {
  const {
    scheduleData,
    loading,
    filters,
    stores,
    updateFilters,
    loadSchedules,
    changeWeek,
    getWeekDisplayText,
  } = useSchedulesLogic({ companyId });

  // 시뮬레이터 로직 훅
  const simulatorLogic = useSimulatorLogic(companyId);

  // UI 상태
  const [viewMode, setViewMode] = useState<'table' | 'gantt' | 'card'>('table');
  const [simulatorModalOpen, setSimulatorModalOpen] = useState(false);
  const [personSettingsModalOpen, setPersonSettingsModalOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Auth 정보
  const { user } = useAuth();

  useEffect(() => {
    if (companyId) {
      loadSchedules();
    }
  }, [companyId]);

  // 🔒 companyId 로딩 보호
  if (!companyId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const days: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];

  /**
   * 근무 시간 포맷
   */
  const formatWorkTime = (startTime: string, endTime: string, breakTime?: BreakTimeDetail) => {
    if (breakTime) {
      return (
        <div className="text-xs">
          <div className="font-semibold">{startTime} - {endTime}</div>
          <div className="text-slate-500">
            휴게: {breakTime.start}-{breakTime.end} ({breakTime.minutes}분)
          </div>
        </div>
      );
    }
    return <div className="text-xs font-semibold">{startTime} - {endTime}</div>;
  };

  /**
   * PDF 내보내기
   * 백업: admin-dashboard.html 라인 14043-14124
   */
  const handleExportPDF = async () => {
    if (!scheduleData || !scheduleData.employees || scheduleData.employees.length === 0) {
      alert('저장할 스케줄 데이터가 없습니다.');
      return;
    }

    try {
      // jsPDF 라이브러리 동적 로드
      if (typeof (window as any).jspdf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();

      const { year, weekNum, monday } = scheduleData;
      const daysKor = ['월', '화', '수', '목', '금', '토', '일'];

      // 제목
      doc.setFontSize(18);
      doc.text(`Week ${weekNum}, ${year} Schedule`, 20, 20);

      // 날짜 범위
      const mondayDate = new Date(monday);
      const sunday = new Date(mondayDate);
      sunday.setDate(sunday.getDate() + 6);
      doc.setFontSize(12);
      doc.text(`${mondayDate.getMonth()+1}/${mondayDate.getDate()} - ${sunday.getMonth()+1}/${sunday.getDate()}`, 20, 30);

      let yPos = 45;

      // 각 직원별 스케줄 표시
      scheduleData.employees.forEach((emp) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text(emp.name, 20, yPos);
        yPos += 10;

        doc.setFontSize(10);

        daysKor.forEach((day, dayIndex) => {
          const schedules = emp.schedules[day];
          const date = new Date(mondayDate);
          date.setDate(date.getDate() + dayIndex);

          let scheduleText = `${day}(${date.getMonth()+1}/${date.getDate()}): `;

          if (schedules && schedules.length > 0) {
            const schedule = schedules[0]; // 첫 번째 스케줄만 표시
            if (schedule.isWorkDay) {
              scheduleText += `${schedule.startTime} - ${schedule.endTime} (${schedule.hours}h)`;
            } else {
              scheduleText += 'Off';
            }
          } else {
            scheduleText += 'Off';
          }

          doc.text(scheduleText, 25, yPos);
          yPos += 7;
        });

        yPos += 5;
      });

      // PDF 저장
      doc.save(`schedule_${year}_week${weekNum}.pdf`);

      console.log('✅ PDF 저장 완료');
    } catch (error) {
      console.error('❌ PDF 저장 실패:', error);
      alert('PDF 저장에 실패했습니다.');
    }
  };

  /**
   * 스케줄 시뮬레이터 열기
   */
  const handleScheduleSimulator = () => {
    setSimulatorModalOpen(true);
  };

  /**
   * 가상 인원 편집
   */
  const handleEditPerson = (personId: string) => {
    setEditingPersonId(personId);
    setPersonSettingsModalOpen(true);
  };

  /**
   * 가상 인원 저장
   */
  const handleSavePerson = (personId: string, updates: Partial<{ name: string; position: string; workHours: string }>) => {
    simulatorLogic.updatePerson(personId, updates);
  };

  /**
   * 🔄 스케줄 재생성 (현재 주간 기준)
   */
  const handleRegenerateSchedules = async () => {
    if (!filters.storeId || filters.storeId === 'all') {
      alert('매장을 먼저 선택해주세요.');
      return;
    }

    if (!user?.uid) {
      alert('로그인 정보가 없습니다.');
      return;
    }

    if (!scheduleData?.monday || !scheduleData?.sunday) {
      alert('스케줄 데이터가 로드되지 않았습니다.');
      return;
    }

    const confirmMsg = `현재 주간(${scheduleData.monday} ~ ${scheduleData.sunday})의 스케줄을 재생성하시겠습니까?\n\n⚠️ 기존 스케줄은 덮어쓰기됩니다.`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    setIsRegenerating(true);

    try {
      console.log('🔄 스케줄 재생성 시작:', {
        storeId: filters.storeId,
        range: `${scheduleData.monday} ~ ${scheduleData.sunday}`,
      });

      // 1. 현재 선택된 매장의 활성 계약서 가져오기
      const contracts = await getContracts(companyId, {
        storeId: filters.storeId,
        status: '서명완료',
      });

      console.log(`  📄 가져온 계약서: ${contracts.length}개`);

      if (contracts.length === 0) {
        alert('해당 매장의 활성 계약서가 없습니다.');
        return;
      }

      // 2. 각 계약서에 대해 스케줄 생성
      for (const contract of contracts) {
        await generateSchedulesForRange(
          contract,
          scheduleData.monday,
          scheduleData.sunday,
          user.uid
        );
      }

      console.log('✅ 스케줄 재생성 완료');

      // 3. 화면 새로고침
      await loadSchedules();

      alert('스케줄이 성공적으로 재생성되었습니다!');
    } catch (error) {
      console.error('❌ 스케줄 재생성 실패:', error);
      alert(`스케줄 재생성에 실패했습니다.\n\n에러: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  // 편집 중인 person 객체 가져오기
  const editingPerson = editingPersonId
    ? simulatorLogic.persons.find(p => p.id === editingPersonId) || null
    : null;

  return (
    <div className="space-y-6">
      
      {/* 상단 헤더 + 액션 버튼 */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-blue-600" />
              근무스케줄
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={handleScheduleSimulator}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Grid3x3 className="w-4 h-4 mr-2" />
                스케줄 시뮬레이터
              </Button>
              <Button 
                onClick={handleRegenerateSchedules}
                disabled={isRegenerating || !filters.storeId || filters.storeId === 'all'}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {isRegenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isRegenerating ? '생성 중...' : '🔄 스케줄 재생성'}
              </Button>
              <Button 
                onClick={handleExportPDF}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <FileDown className="w-4 h-4 mr-2" />
                PDF 저장
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          
          {/* 안내 메시지 */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-blue-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>근무스케줄:</strong> 
                {filters.displayMode === 'schedule' ? (
                  <>계약서에 설정된 근무 시간이 자동으로 표시되며, 대체근무는 🔄 아이콘으로 표시됩니다.</>
                ) : (
                  <>실제 출퇴근 기록이 실시간으로 표시됩니다. 정상(초록), 지각/조퇴(주황), 근무중(파랑), 결근(빨강)으로 구분됩니다.</>
                )}
              </span>
            </p>
          </div>

          {/* 상단 컨트롤 */}
          <div className="bg-slate-50 p-4 rounded-lg mb-6 space-y-4">
            
            {/* 매장 선택 + 뷰 모드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  매장 선택
                </label>
                <Select
                  value={filters.storeId}
                  onValueChange={(value) => updateFilters({ storeId: value })}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="매장을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 매장</SelectItem>
                    {stores.map(store => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  뷰 모드
                </label>
                <div className="flex gap-4 h-10 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="viewMode"
                      value="table"
                      checked={viewMode === 'table'}
                      onChange={(e) => setViewMode('table')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">테이블</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="viewMode"
                      value="gantt"
                      checked={viewMode === 'gantt'}
                      onChange={(e) => setViewMode('gantt')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">간트차트</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="viewMode"
                      value="card"
                      checked={viewMode === 'card'}
                      onChange={(e) => setViewMode('card')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">카드</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  표시 모드
                </label>
                <div className="flex gap-4 h-10 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="displayMode"
                      value="schedule"
                      checked={filters.displayMode === 'schedule'}
                      onChange={(e) => updateFilters({ displayMode: 'schedule' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">스케줄표</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="displayMode"
                      value="attendance"
                      checked={filters.displayMode === 'attendance'}
                      onChange={(e) => updateFilters({ displayMode: 'attendance' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">출퇴근 기록</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 주차 네비게이션 */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <Button 
                onClick={() => changeWeek(-1)}
                variant="outline"
                className="text-slate-700"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전 주
              </Button>
              <div className="font-semibold text-slate-900 text-sm md:text-base">
                {getWeekDisplayText()}
              </div>
              <Button 
                onClick={() => changeWeek(1)}
                variant="outline"
                className="text-slate-700"
              >
                다음 주
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* 스케줄 뷰 컨테이너 */}
          {!filters.storeId ? (
            <div className="border border-slate-200 rounded-lg bg-white text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">매장을 선택하면 근무 스케줄이 표시됩니다.</p>
            </div>
          ) : loading ? (
            <div className="border border-slate-200 rounded-lg bg-white p-8">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !scheduleData || scheduleData.employees.length === 0 ? (
            <div className="border border-slate-200 rounded-lg bg-white text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">해당 기간에 스케줄이 없습니다.</p>
            </div>
          ) : viewMode === 'gantt' ? (
            <div className="py-6">
              <ScheduleGanttChart scheduleData={scheduleData} />
            </div>
          ) : viewMode === 'card' ? (
            <div className="py-6">
              <ScheduleCardView scheduleData={scheduleData} />
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold text-slate-900 w-32">직원명</TableHead>
                      {days.map(day => (
                        <TableHead key={day} className="font-bold text-slate-900 text-center min-w-[100px]">
                          {day}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleData.employees.map((employee) => (
                      <TableRow key={employee.uid}>
                        <TableCell className="font-semibold text-slate-900">
                          {employee.name}
                        </TableCell>
                        {days.map(day => {
                          const daySchedules = employee.schedules[day];
                          const isAttendanceMode = scheduleData.type === 'attendance';
                          
                          return (
                            <TableCell key={day} className="p-2 align-top">
                              {daySchedules.length === 0 ? (
                                <div className="text-center text-slate-400 text-xs">-</div>
                              ) : (
                                <div className="space-y-1">
                                  {daySchedules.map((schedule, idx) => {
                                    // 출퇴근 기록 모드: 상태별 색상
                                    let bgColor = 'bg-blue-50';
                                    let borderColor = 'border-blue-300';
                                    
                                    if (isAttendanceMode && schedule.statusText) {
                                      if (schedule.statusText === '결근') {
                                        bgColor = 'bg-red-50';
                                        borderColor = 'border-red-300';
                                      } else if (schedule.statusText.includes('지각') || schedule.statusText.includes('조퇴')) {
                                        bgColor = 'bg-orange-50';
                                        borderColor = 'border-orange-300';
                                      } else if (schedule.statusText === '근무중') {
                                        bgColor = 'bg-cyan-50';
                                        borderColor = 'border-cyan-300';
                                      } else {
                                        bgColor = 'bg-green-50';
                                        borderColor = 'border-green-300';
                                      }
                                    } else if (schedule.isShiftReplacement) {
                                      bgColor = 'bg-yellow-50';
                                      borderColor = 'border-yellow-300';
                                    }
                                    
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`p-2 rounded border text-center ${bgColor} ${borderColor}`}
                                      >
                                        {isAttendanceMode && schedule.statusText && (
                                          <Badge 
                                            className={`text-xs mb-1 ${
                                              schedule.statusText === '결근' ? 'bg-red-100 text-red-800 border-red-300' :
                                              schedule.statusText.includes('지각') || schedule.statusText.includes('조퇴') ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                              schedule.statusText === '근무중' ? 'bg-cyan-100 text-cyan-800 border-cyan-300' :
                                              'bg-green-100 text-green-800 border-green-300'
                                            }`}
                                          >
                                            {schedule.statusText}
                                          </Badge>
                                        )}
                                        {!isAttendanceMode && schedule.isShiftReplacement && (
                                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs mb-1">
                                            🔄 대체근무
                                          </Badge>
                                        )}
                                        {formatWorkTime(
                                          schedule.startTime, 
                                          schedule.endTime,
                                          schedule.breakTime
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 스케줄 시뮬레이터 모달 */}
      <SimulatorModal
        open={simulatorModalOpen}
        onClose={() => setSimulatorModalOpen(false)}
        {...simulatorLogic}
        onEditPerson={handleEditPerson}
      />

      {/* 가상 인원 설정 모달 */}
      <PersonSettingsModal
        open={personSettingsModalOpen}
        onClose={() => {
          setPersonSettingsModalOpen(false);
          setEditingPersonId(null);
        }}
        person={editingPerson}
        onSave={handleSavePerson}
      />
    </div>
  );
}
