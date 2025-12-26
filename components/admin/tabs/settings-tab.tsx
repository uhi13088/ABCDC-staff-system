/**
 * Settings Tab
 * 시스템 설정 탭 (공휴일 관리 포함)
 * 
 * 공휴일 자동화: 매년 1월 1일 Cloud Functions 스케줄러가 자동 동기화
 * 관리자 수동 입력 불필요 (읽기 전용)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings as SettingsIcon, Calendar, RefreshCcw, CheckCircle } from 'lucide-react';
import * as holidayService from '@/services/holidayService';
import type { Holiday } from '@/services/holidayService';

interface SettingsTabProps {
  companyId: string;
}

export default function SettingsTab({ companyId }: SettingsTabProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 공휴일 목록 로드
  const loadHolidays = async () => {
    setLoading(true);
    try {
      // companyId 필터 제거 - 전국 공통 공휴일 조회
      const data = await holidayService.getHolidays(selectedYear);
      setHolidays(data.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error) {
      console.error('공휴일 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, [selectedYear]);

  // 공공 API에서 공휴일 동기화 (긴급용)
  const handleSyncFromAPI = async () => {
    if (!confirm(`${selectedYear}년 공휴일을 행정안전부 API에서 불러와 동기화하시겠습니까?\n\n⚠️ 주의: 일반적으로 매년 1월 1일 자동 동기화되므로 긴급 상황에만 사용하세요.`)) return;

    setLoading(true);
    try {
      const count = await holidayService.syncHolidaysFromAPI(selectedYear);
      if (count > 0) {
        alert(`✅ ${selectedYear}년 공휴일 ${count}개가 추가되었습니다.`);
        await loadHolidays();
      } else {
        alert('⚠️ API에서 공휴일을 불러올 수 없습니다.\n환경변수 NEXT_PUBLIC_HOLIDAY_API_KEY를 설정하세요.');
      }
    } catch (error) {
      console.error('API 동기화 실패:', error);
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'permission-denied') {
        alert('❌ 권한이 없습니다. Admin만 공휴일을 추가할 수 있습니다.');
      } else {
        alert('❌ API 동기화 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
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
              <h3 className="text-lg font-semibold">공휴일 관리 (자동화)</h3>
              <select
                className="ml-2 border rounded px-2 py-1 text-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                <option value={2024}>2024년</option>
                <option value={2025}>2025년</option>
                <option value={2026}>2026년</option>
                <option value={2027}>2027년</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncFromAPI}
                disabled={loading}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                긴급 동기화
              </Button>
            </div>
          </div>

          {/* 자동화 안내 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-green-900 mb-1">✨ 공휴일 완전 자동화</p>
                <p className="text-green-700">
                  매년 <strong>1월 1일 00:00</strong>에 행정안전부 공공데이터 API에서 자동으로 공휴일을 불러옵니다.
                  <br />
                  올해 + 내년 공휴일이 자동 동기화되므로, <strong>수동 입력이 필요 없습니다.</strong>
                  <br />
                  대체공휴일, 임시공휴일도 자동 반영됩니다.
                </p>
                <p className="text-green-600 text-xs mt-2">
                  💡 긴급 동기화: 중간에 공휴일이 추가 발표되었을 때만 "긴급 동기화" 버튼을 사용하세요.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="text-center py-8 text-gray-500">로딩 중...</p>
          ) : holidays.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>{selectedYear}년 공휴일이 아직 동기화되지 않았습니다.</p>
              <p className="text-sm mt-2">매년 1월 1일 자동 동기화되거나, 긴급 동기화 버튼을 눌러주세요.</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                📅 {selectedYear}년 공휴일 <strong>{holidays.length}개</strong> (자동 동기화됨)
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>공휴일명</TableHead>
                    <TableHead>요일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => {
                    const date = new Date(holiday.date + 'T00:00:00');
                    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    
                    return (
                      <TableRow key={holiday.id}>
                        <TableCell className="font-medium">{holiday.date}</TableCell>
                        <TableCell>{holiday.name}</TableCell>
                        <TableCell className={isWeekend ? 'text-red-600 font-semibold' : ''}>
                          {dayOfWeek}요일
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* 향후 확장 영역 */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-2">기타 설정</h3>
          <p className="text-sm text-gray-500">추후 추가될 시스템 설정 영역</p>
        </div>
      </CardContent>
    </Card>
  );
}
