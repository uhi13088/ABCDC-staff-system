/**
 * Settings Tab
 * 시스템 설정 탭 (공휴일 관리 포함)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings as SettingsIcon, Calendar, Plus, Trash2, Edit } from 'lucide-react';
import { HolidayFormModal } from '../modals/holiday-form-modal';
import * as holidayService from '@/services/holidayService';
import type { Holiday } from '@/services/holidayService';

interface SettingsTabProps {
  companyId: string;
}

export default function SettingsTab({ companyId }: SettingsTabProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 공휴일 목록 로드
  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await holidayService.getHolidays(selectedYear, companyId);
      setHolidays(data.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error) {
      console.error('공휴일 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadHolidays();
    }
  }, [companyId, selectedYear]);

  // 공휴일 저장
  const handleSave = async (data: { date: string; name: string; year: number }) => {
    try {
      if (editingHoliday?.id) {
        // 수정
        await holidayService.updateHoliday(editingHoliday.id, data);
        alert('✅ 공휴일이 수정되었습니다.');
      } else {
        // 생성
        await holidayService.createHoliday({
          ...data,
          companyId, // 회사별 공휴일
        });
        alert('✅ 공휴일이 추가되었습니다.');
      }
      await loadHolidays();
      setEditingHoliday(null);
    } catch (error: any) {
      console.error('공휴일 저장 실패:', error);
      if (error.code === 'permission-denied') {
        alert('❌ 권한이 없습니다. Admin만 공휴일을 추가/수정할 수 있습니다.');
      } else {
        throw error;
      }
    }
  };

  // 공휴일 삭제
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`'${name}' 공휴일을 삭제하시겠습니까?`)) return;

    try {
      await holidayService.deleteHoliday(id);
      alert('✅ 공휴일이 삭제되었습니다.');
      await loadHolidays();
    } catch (error) {
      console.error('공휴일 삭제 실패:', error);
      alert('❌ 공휴일 삭제에 실패했습니다.');
    }
  };

  // 2025년 공휴일 일괄 추가
  const handleBulkImport = async () => {
    if (!confirm('2025년 공휴일 16개를 일괄 추가하시겠습니까?')) return;

    setLoading(true);
    try {
      for (const holiday of holidayService.HOLIDAYS_2025) {
        await holidayService.createHoliday({
          ...holiday,
          companyId,
        });
      }
      alert('✅ 2025년 공휴일 16개가 추가되었습니다.');
      await loadHolidays();
    } catch (error: any) {
      console.error('일괄 추가 실패:', error);
      if (error.code === 'permission-denied') {
        alert('❌ 권한이 없습니다. Admin만 공휴일을 추가할 수 있습니다.');
      } else {
        alert('❌ 일괄 추가 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            시스템 설정
          </CardTitle>
          <CardDescription>공휴일 관리 및 시스템 설정</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 공휴일 관리 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">공휴일 관리</h3>
                <select
                  className="ml-2 border rounded px-2 py-1 text-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  <option value={2024}>2024년</option>
                  <option value={2025}>2025년</option>
                  <option value={2026}>2026년</option>
                </select>
              </div>
              <div className="flex gap-2">
                {selectedYear === 2025 && holidays.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkImport}
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    2025년 일괄 추가
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingHoliday(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  공휴일 추가
                </Button>
              </div>
            </div>

            {loading && !formOpen ? (
              <p className="text-center py-8 text-gray-500">로딩 중...</p>
            ) : holidays.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>{selectedYear}년 공휴일이 없습니다.</p>
                <p className="text-sm mt-2">상단의 버튼을 눌러 공휴일을 추가하세요.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>공휴일명</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">{holiday.date}</TableCell>
                      <TableCell>{holiday.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingHoliday(holiday);
                            setFormOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(holiday.id!, holiday.name)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* 향후 확장 영역 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">기타 설정</h3>
            <p className="text-sm text-gray-500">추후 추가될 시스템 설정 영역</p>
          </div>
        </CardContent>
      </Card>

      {/* 공휴일 추가/수정 모달 */}
      <HolidayFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingHoliday(null);
        }}
        onSave={handleSave}
        initialData={editingHoliday}
      />
    </>
  );
}
