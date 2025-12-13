'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { AlertCircle, FileText, Edit } from 'lucide-react';
import { useAttendanceLogic } from '@/hooks/admin/useAttendanceLogic';
import { EmergencyRecruitmentModal } from '@/components/admin/modals/emergency-recruitment-modal';
import { useAuth } from '@/lib/auth-context';

/**
 * 근무기록 관리 탭 (Shadcn Blue Theme 완벽 적용)
 * 백업: /home/user/webapp-backup/admin-dashboard.html 라인 217~279
 * 기능: 근무기록 목록, 필터링, 상세보기, 수정
 */
interface AttendanceTabProps {
  companyId: string;
}

export default function AttendanceTab({ companyId }: AttendanceTabProps) {
  const { user } = useAuth();
  const {
    attendanceList,
    loading,
    filters,
    stores,
    updateFilters,
    loadAttendanceList,
    calculateAttendanceStatus,
  } = useAttendanceLogic({ companyId });

  // 긴급 근무 모집 모달 상태
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  useEffect(() => {
    if (!companyId) return; // Phase 3: companyId 로딩 보호
    if (filters.storeId) {
      loadAttendanceList();
    }
  }, [companyId, filters.storeId]);

  // 상태 뱃지 색상 (백업: calculateAttendanceStatus 함수 결과 기반)
  const getStatusBadge = (text: string, badgeClass: string) => {
    const statusConfig: Record<string, { className: string }> = {
      'success': { className: 'bg-green-100 text-green-800 border-green-300' },
      'danger': { className: 'bg-red-100 text-red-800 border-red-300' },
      'info': { className: 'bg-blue-100 text-blue-800 border-blue-300' },
    };
    
    const config = statusConfig[badgeClass] || statusConfig['success'];
    return <Badge variant="outline" className={config.className}>{text}</Badge>;
  };

  // 현재 월 기본값 설정
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6">
      
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">📋</span>
              근무기록
              {!loading && attendanceList.length > 0 && (
                <span className="text-sm font-normal text-slate-500">
                  (총 {attendanceList.length}건)
                </span>
              )}
            </CardTitle>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setEmergencyModalOpen(true)}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              긴급 근무 모집
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          
          {/* 안내 메시지 */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-blue-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                매장을 선택하고 조회 버튼을 클릭하면 해당 매장의 근무기록을 확인할 수 있습니다.
              </span>
            </p>
          </div>

          {/* 필터 영역 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {/* 조회 월 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">조회 월</label>
              <Input 
                type="month" 
                value={filters.month || currentMonth}
                onChange={(e) => updateFilters({ month: e.target.value })}
              />
            </div>

            {/* 매장 필터 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">매장</label>
              <Select 
                value={filters.storeId || ''} 
                onValueChange={(value) => updateFilters({ storeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="매장 선택" />
                </SelectTrigger>
                <SelectContent>
                  {stores && stores.length > 0 ? (
                    stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-store" disabled>
                      매장이 없습니다
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 근무상태 필터 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">근무상태</label>
              <Select 
                value={filters.employmentStatus || 'active'} 
                onValueChange={(value) => updateFilters({ employmentStatus: value === 'all' ? '' : value as 'active' | 'resigned' | '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="active">재직자</SelectItem>
                  <SelectItem value="resigned">퇴사자</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 조회 버튼 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">&nbsp;</label>
              <Button 
                onClick={loadAttendanceList} 
                disabled={loading || !filters.storeId}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                조회
              </Button>
            </div>
          </div>

          {/* 테이블 */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !filters.storeId ? (
            <div className="text-center py-12 text-slate-500">
              <p className="mb-4">📌 매장을 선택해주세요</p>
              <p className="text-sm text-slate-400">왼쪽 상단의 매장 필터에서 조회할 매장을 선택하세요.</p>
            </div>
          ) : attendanceList.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>근무기록이 없습니다.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">날짜</TableHead>
                    <TableHead className="font-semibold">이름</TableHead>
                    <TableHead className="font-semibold">매장</TableHead>
                    <TableHead className="font-semibold">출근</TableHead>
                    <TableHead className="font-semibold">퇴근</TableHead>
                    <TableHead className="font-semibold">상태</TableHead>
                    <TableHead className="font-semibold text-center">상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceList.map((att) => {
                    // 상태 자동 계산
                    const statusResult = calculateAttendanceStatus(att);
                    
                    return (
                      <TableRow key={att.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{att.date || '-'}</TableCell>
                        <TableCell className="text-slate-600">{att.employeeName || att.name || '-'}</TableCell>
                        <TableCell className="text-slate-600">{att.store || '-'}</TableCell>
                        <TableCell className="text-slate-600">{att.clockIn || '-'}</TableCell>
                        <TableCell className="text-slate-600">{att.clockOut || '-'}</TableCell>
                        <TableCell>{getStatusBadge(statusResult.text, statusResult.class)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 긴급 근무 모집 모달 */}
      {user && (
        <EmergencyRecruitmentModal
          isOpen={emergencyModalOpen}
          onClose={() => {
            setEmergencyModalOpen(false);
            // 모집 공고 등록 후 근무기록 새로고침
            if (companyId && filters.storeId) {
              loadAttendanceList();
            }
          }}
          companyId={companyId}
          currentUserId={user.uid}
          currentUserName={user.displayName || user.name || user.email || '관리자'}
        />
      )}
    </div>
  );
}
