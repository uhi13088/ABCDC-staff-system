'use client';

/**
 * 회사 목록 탭
 * 기존 로직 보존 + Shadcn/UI Zinc 테마로 완전히 새로 그림
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { type Company, type SubscriptionPlan, formatDate, getUsageStatus } from '@/lib/platform-logic';

interface CompanyListTabProps {
  companies: Company[];
  plans: SubscriptionPlan[];
  onRefresh: () => void;
}

export default function CompanyListTab({ companies, plans, onRefresh }: CompanyListTabProps) {
  // 필터 및 검색 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 필터링된 회사 목록
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.adminEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesPlan = filterPlan === 'all' || company.planType === filterPlan;
    const matchesStatus = filterStatus === 'all' || company.status === filterStatus;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getPlanBadgeColor = (planType: string) => {
    const colors: Record<string, string> = {
      'plan_free': 'bg-zinc-500',
      'plan_basic': 'bg-blue-500',
      'plan_pro': 'bg-purple-500',
      'plan_enterprise': 'bg-amber-500',
    };
    return colors[planType] || 'bg-zinc-500';
  };

  const getPlanName = (planType: string) => {
    const names: Record<string, string> = {
      'plan_free': 'Starter',
      'plan_basic': 'Basic',
      'plan_pro': 'Pro',
      'plan_enterprise': 'Master',
    };
    return names[planType] || planType;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">회사 목록</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            새로고침
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 검색 및 필터 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="회사명 또는 이메일 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="플랜 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 플랜</SelectItem>
              <SelectItem value="plan_free">Starter</SelectItem>
              <SelectItem value="plan_basic">Basic</SelectItem>
              <SelectItem value="plan_pro">Pro</SelectItem>
              <SelectItem value="plan_enterprise">Master</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="suspended">정지</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 회사 목록 테이블 - Shadcn 스타일 */}
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-zinc-50/50">
                <tr className="border-b transition-colors hover:bg-zinc-50/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                    회사명
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                    플랜
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                    사용자 현황
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                    상태
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                    관리자
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                    가입일
                  </th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-zinc-600">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="h-24 text-center text-zinc-500">
                      {searchTerm || filterPlan !== 'all' || filterStatus !== 'all'
                        ? '검색 결과가 없습니다.'
                        : '등록된 회사가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((company) => {
                    const usage = getUsageStatus(company.currentUsers, company.maxUsers);
                    
                    return (
                      <tr
                        key={company.id}
                        className="border-b transition-colors hover:bg-zinc-50/50"
                      >
                        <td className="p-4 align-middle">
                          <div className="font-medium text-zinc-900">{company.name}</div>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge className={getPlanBadgeColor(company.planType)}>
                            {getPlanName(company.planType)}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="space-y-1">
                            <div className="text-sm text-zinc-700">
                              {company.currentUsers} / {company.maxUsers}명
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                              <div
                                className={`h-full ${
                                  usage.status === 'danger'
                                    ? 'bg-red-500'
                                    : usage.status === 'warning'
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          {company.status === 'active' ? (
                            <Badge variant="outline" className="border-green-500 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              활성
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-500 text-red-700">
                              <Ban className="h-3 w-3 mr-1" />
                              정지
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="text-sm text-zinc-900">{company.adminEmail}</div>
                          {company.adminName && (
                            <div className="text-xs text-zinc-500">{company.adminName}</div>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="text-sm text-zinc-600">
                            {formatDate(company.createdAt)}
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                {company.status === 'active' ? (
                                  <>
                                    <Ban className="h-4 w-4 mr-2" />
                                    계정 정지
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    계정 활성화
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                회사 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 통계 정보 */}
        <div className="flex items-center justify-between text-sm text-zinc-600">
          <div>
            전체 {filteredCompanies.length}개 회사
            {(searchTerm || filterPlan !== 'all' || filterStatus !== 'all') && 
              ` (전체 ${companies.length}개 중)`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
