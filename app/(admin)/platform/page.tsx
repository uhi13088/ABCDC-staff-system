'use client';

/**
 * 플랫폼 관리자 대시보드
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Package, 
  TicketIcon,
  LogOut,
  RefreshCw,
  Loader2 // 로딩 아이콘 추가
} from 'lucide-react';

// ... (기존 import 유지)
import {
  loadCompanies,
  loadPlans,
  loadInviteCodes,
  calculateCompanyStats,
  type Company,
  type SubscriptionPlan,
  type InvitationCode,
} from '@/lib/platform-logic';

import CompanyListTab from '@/components/platform/company-list-tab';
import PlanManagementTab from '@/components/platform/plan-management-tab';
import InviteCodeTab from '@/components/platform/invite-code-tab';

// ✅ Firebase 로그아웃 함수 import (없으면 firebase.ts에서 가져와야 함)
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function PlatformDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // 상태 관리
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('companies');

  // 통계 계산 로직 유지...
  const stats = companies.length > 0 ? calculateCompanyStats(companies) : {
    totalCompanies: 0,
    totalUsers: 0,
    activeCompanies: 0,
    suspendedCompanies: 0,
  };

  // ✅ 1. 권한 체크 및 데이터 로드 통합
  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) return;

    // 비로그인 또는 슈퍼관리자가 아니면 즉시 추방
    if (!user || user.role !== 'super_admin') {
      router.replace('/admin-login'); // replace가 push보다 기록을 안 남겨서 보안상 좋음
      return;
    }

    // 슈퍼관리자 맞으면 데이터 로드
    loadAllData();
  }, [user, authLoading, router]);

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

  // ✅ 2. 확실한 로그아웃 처리
  const handleLogout = async () => {
    try {
      await signOut(auth); // Firebase 세션 삭제
      router.replace('/admin-login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // ✅ 3. 로딩 상태 처리 강화 (인증 중이거나 데이터 로딩 중이면 화면 보여주지 않음)
  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-zinc-400" />
          <p className="text-sm text-zinc-600">
            {authLoading ? '인증 확인 중...' : '데이터 불러오는 중...'}
          </p>
        </div>
      </div>
    );
  }

  // ✅ 4. 렌더링 가드 (화면 깜빡임 방지용 최종 방어선)
  // useEffect에서 redirect 시켰더라도, React가 잠깐 렌더링하는 것을 막음
  if (!user || user.role !== 'super_admin') {
    return null;
  }

  // ... (이하 JSX return 부분은 기존 코드와 동일하게 유지)
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
              <Badge variant="secondary" className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200">super_admin</Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container py-6 space-y-6">
        {/* 통계 카드 */}
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

        {/* 탭 메뉴 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-100">
            <TabsTrigger value="companies" className="data-[state=active]:bg-white">
              <Building2 className="h-4 w-4 mr-2" />
              회사 목록
            </TabsTrigger>
            <TabsTrigger value="plans" className="data-[state=active]:bg-white">
              <Package className="h-4 w-4 mr-2" />
              구독 플랜 관리
            </TabsTrigger>
            <TabsTrigger value="invites" className="data-[state=active]:bg-white">
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
