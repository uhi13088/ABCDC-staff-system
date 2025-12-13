'use client';

import { useEffect } from 'react';
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
import { RefreshCw, UserPlus, CheckCircle, XCircle, Trash2, FileText, AlertCircle } from 'lucide-react';
import { useEmployeeLogic } from '@/hooks/admin/useEmployeeLogic';

/**
 * 직원 관리 탭 (Shadcn Blue Theme 완벽 적용)
 * 백업: admin-dashboard.html 라인 157-215
 * 기능: 직원 목록, 필터링, 승인/거부, 삭제, 계약서 연결
 */
interface EmployeesTabProps {
  companyId: string;
}

export default function EmployeesTab({ companyId }: EmployeesTabProps) {
  const {
    employees,
    loading,
    filters,
    stores,
    updateFilters,
    loadEmployees,
    approveEmployee,
    rejectEmployee,
    deleteEmployee,
    syncAllEmployees,
  } = useEmployeeLogic({ companyId });

  useEffect(() => {
    if (companyId) {
      loadEmployees();
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

  // 상태 뱃지 색상
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '승인 대기', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      approved: { label: '승인됨', className: 'bg-green-100 text-green-800 border-green-300' },
      active: { label: '재직', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      rejected: { label: '거부됨', className: 'bg-red-100 text-red-800 border-red-300' },
      resigned: { label: '퇴사', className: 'bg-slate-100 text-slate-800 border-slate-300' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      
      {/* 상단 헤더 + 전체 동기화 버튼 */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">👥</span>
              직원 목록
              {!loading && (
                <span className="text-sm font-normal text-slate-500">
                  (총 {employees.length}명)
                </span>
              )}
            </CardTitle>
            <Button 
              onClick={syncAllEmployees} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              전체 동기화
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          
          {/* 안내 메시지 */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-blue-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>전체 동기화</strong>: 모든 직원의 정보를 최신 계약서 기준으로 업데이트하고, 스케줄을 자동 생성합니다.
              </span>
            </p>
          </div>

          {/* 필터 영역 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* 매장 필터 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">매장</label>
              <Select 
                value={filters.storeId || 'all'} 
                onValueChange={(value) => updateFilters({ storeId: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {stores && stores.length > 0 && stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 승인 상태 필터 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">승인 상태</label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => updateFilters({ status: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">승인 대기</SelectItem>
                  <SelectItem value="approved">승인됨</SelectItem>
                  <SelectItem value="active">재직</SelectItem>
                  <SelectItem value="rejected">거부됨</SelectItem>
                  <SelectItem value="resigned">퇴사</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 검색 (이름/이메일) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">검색</label>
              <Input 
                placeholder="이름, 이메일 검색..." 
                value={filters.search || ''}
                onChange={(e) => updateFilters({ search: e.target.value })}
              />
            </div>

            {/* 조회 버튼 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">&nbsp;</label>
              <Button 
                onClick={loadEmployees} 
                disabled={loading}
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
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="mb-4">직원 정보가 없습니다.</p>
              <Button variant="outline" className="gap-2">
                <UserPlus className="w-4 h-4" />
                직원 초대하기
              </Button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">이름</TableHead>
                    <TableHead className="font-semibold">매장</TableHead>
                    <TableHead className="font-semibold">직급</TableHead>
                    <TableHead className="font-semibold">연락처</TableHead>
                    <TableHead className="font-semibold">상태</TableHead>
                    <TableHead className="font-semibold text-center">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell className="text-slate-600">{employee.storeName || '-'}</TableCell>
                      <TableCell className="text-slate-600">{employee.position || employee.role}</TableCell>
                      <TableCell className="text-slate-600">{employee.phone || '-'}</TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {employee.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => approveEmployee(employee.id)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => rejectEmployee(employee.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`${employee.name} 직원을 삭제하시겠습니까?`)) {
                                deleteEmployee(employee.id);
                              }
                            }}
                            className="text-slate-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
