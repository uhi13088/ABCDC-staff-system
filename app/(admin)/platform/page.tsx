'use client';

/**
 * 플랫폼 관리자 대시보드
 * 기존 platform-dashboard.html을 Shadcn/UI Zinc 테마로 완전히 재구축
 * 로직은 100% 보존, UI는 100% 새로 그림
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Package, 
  TicketIcon,
  LogOut,
  RefreshCw,
} from 'lucide-react';

// 비즈니스 로직 import
import {
  loadCompanies,
  loadPlans,
  loadInviteCodes,
  calculateCompanyStats,
  type Company,
  type SubscriptionPlan,
  type InvitationCode,
} from '@/lib/platform-logic';

// 하위 컴포넌트 import
import CompanyListTab from '@/components/platform/company-list-tab';
import PlanManagementTab from '@/components/platform/plan-management-tab';
import InviteCodeTab from '@/components/platform/invite-code-tab';

export default function PlatformDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // 상태 관리
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('companies');

  // 통계
  const stats = companies.length > 0 ? calculateCompanyStats(companies) : {
    totalCompanies: 0,
    totalUsers: 0,
    activeCompanies: 0,
    suspendedCompanies: 0,
  };

  // 권한 체크
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'super_admin')) {
      router.push('/admin-login');
    }
  }, [user, authLoading, router]);

  // 초기 데이터 로드
  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [companiesData, plansData, codesData] = await Promise.all([
        loadCompanies(),
        loadPlans(),
        loadInviteCodes(),
      ]);
      setCompanies(companiesData);
      setPlans(plansData);
      setInviteCodes(codesData);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAllData();
  };

  const handleLogout = async () => {
    // TODO: Firebase logout
    router.push('/admin-login');
  };

  // 로딩 중
  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-zinc-400" />
          <p className="text-sm text-zinc-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 권한 없음
  if (!user || user.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* 헤더 - Shadcn/UI Zinc 스타일 */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-zinc-900" />
            <h1 className="text-xl font-semibold text-zinc-900">
              플랫폼 관리자 대시보드
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </Button>
            
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span>{user.email}</span>
              <Badge variant="secondary">super_admin</Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container py-6 space-y-6">
        {/* 통계 카드 - Shadcn Card 컴포넌트 활용 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">
                전체 회사
              </CardTitle>
              <Building2 className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">
                {stats.totalCompanies}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                활성: {stats.activeCompanies}개
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">
                전체 사용자
              </CardTitle>
              <Users className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">
                {stats.totalUsers}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                모든 회사 합계
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">
                활성 플랜
              </CardTitle>
              <Package className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">
                {plans.length}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                구독 가능 플랜
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">
                초대 코드
              </CardTitle>
              <TicketIcon className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">
                {inviteCodes.filter(c => !c.isUsed).length}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                미사용 / 전체 {inviteCodes.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 탭 메뉴 - Shadcn Tabs 컴포넌트 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="companies">
              <Building2 className="h-4 w-4 mr-2" />
              회사 목록
            </TabsTrigger>
            <TabsTrigger value="plans">
              <Package className="h-4 w-4 mr-2" />
              구독 플랜 관리
            </TabsTrigger>
            <TabsTrigger value="invites">
              <TicketIcon className="h-4 w-4 mr-2" />
              초대 코드 관리
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <CompanyListTab 
              companies={companies} 
              plans={plans}
              onRefresh={loadAllData}
            />
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <PlanManagementTab 
              plans={plans}
              onRefresh={loadAllData}
            />
          </TabsContent>

          <TabsContent value="invites" className="space-y-4">
            <InviteCodeTab 
              inviteCodes={inviteCodes}
              plans={plans}
              onRefresh={loadAllData}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
