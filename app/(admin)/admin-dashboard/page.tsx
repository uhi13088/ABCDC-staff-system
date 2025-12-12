'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, Users, Clock, DollarSign, CalendarDays, 
  CheckCircle, FileText, Bell, Store, UserPlus, Settings, LogOut,
  Crown, Tag
} from 'lucide-react';
import dynamic from 'next/dynamic';

// SSR 비활성화 (속도 최적화)
const DashboardTab = dynamic(() => import('@/components/admin/tabs/dashboard-tab'), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const EmployeesTab = dynamic(() => import('@/components/admin/tabs/employees-tab'), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const AttendanceTab = dynamic(() => import('@/components/admin/tabs/attendance-tab'), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const SalaryTab = dynamic(() => import('@/components/admin/tabs/salary-tab').then(mod => mod.SalaryTab), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const SchedulesTab = dynamic(() => import('@/components/admin/tabs/schedules-tab').then(mod => ({ default: mod.SchedulesTab })), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const ContractsTab = dynamic(() => import('@/components/admin/tabs/contracts-tab').then(mod => ({ default: mod.ContractsTab })), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const ApprovalsTab = dynamic(() => import('@/components/admin/tabs/approvals-tab').then(mod => mod.ApprovalsTab), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const NoticesTab = dynamic(() => import('@/components/admin/tabs/notices-tab').then(mod => ({ default: mod.NoticesTab })), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const AdminsTab = dynamic(() => import('@/components/admin/tabs/admins-tab'), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const BrandsStoresTab = dynamic(() => import('@/components/admin/tabs/brands-stores-tab').then(mod => ({ default: mod.BrandsStoresTab })), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const InvitesTab = dynamic(() => import('@/components/admin/tabs/invites-tab'), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });
const SettingsTab = dynamic(() => import('@/components/admin/tabs/settings-tab'), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/admin-login');
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({ uid: currentUser.uid, ...userData });
          setCompanyId(userData.companyId || '');
        }
        setLoading(false);
      } catch (error) {
        console.error('Login check failed:', error);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await auth.signOut();
      router.push('/admin-login');
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><Skeleton className="h-12 w-12 rounded-full" /></div>;

  const tabs = [
    { id: 'dashboard', label: '대시보드', icon: BarChart3 },
    { id: 'admins', label: '관리자 목록', icon: Crown },
    { id: 'employees', label: '직원 관리', icon: Users },
    { id: 'attendance', label: '근무기록', icon: Clock },
    { id: 'salary', label: '급여 관리', icon: DollarSign },
    { id: 'approvals', label: '승인 관리', icon: CheckCircle },
    { id: 'contracts', label: '계약서', icon: FileText },
    { id: 'schedules', label: '근무스케줄', icon: CalendarDays },
    { id: 'notice', label: '공지사항', icon: Bell },
    { id: 'brands', label: '브랜드 관리', icon: Tag },
    { id: 'stores', label: '매장 관리', icon: Store },
    { id: 'invites', label: '초대 코드', icon: UserPlus },
    { id: 'settings', label: '설정', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* 1. 상단 헤더 (Shadcn Blue Theme) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-6">
          
          {/* 왼쪽: 로고 + 회사명 */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm flex-shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
                {user?.companyName || '관리자 대시보드'}
              </h1>
              <span className="text-xs text-slate-500 font-medium block truncate">
                {user?.name}님
              </span>
            </div>
          </div>
          
          {/* 중앙: 구독 정보 (직원 수 + 프로그레스 바) */}
          <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                Free Plan
              </span>
              <span className="text-[10px] text-green-600 font-medium">● 활성</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-medium">직원 수</span>
              <span className="text-xs font-bold text-slate-900">
                <span className="text-blue-600">0</span> / 5명
              </span>
            </div>
            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300" 
                style={{ width: '0%' }}
              ></div>
            </div>
          </div>
          
          {/* 오른쪽: 로그아웃 */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            className="text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4 mr-1.5" /> 
            로그아웃
          </Button>
          
        </div>
      </header>

      {/* 2. 메인 컨테이너 (여백 확보의 핵심: container mx-auto py-8) */}
      <main className="container mx-auto px-4 py-8">
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          
          {/* 3. 탭 메뉴 리스트 (가로 스크롤 가능, 깔끔한 버튼형) */}
          <div className="sticky top-16 z-40 bg-slate-50/95 backdrop-blur py-2 -mx-4 px-4 border-b border-slate-200/50 md:static md:bg-transparent md:border-0 md:p-0 md:backdrop-none">
            <TabsList className="w-full justify-start overflow-x-auto bg-white p-1 border border-slate-200 rounded-lg shadow-sm h-auto scrollbar-hide">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="
                    flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-all
                    data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none
                    text-slate-600 hover:text-slate-900 hover:bg-slate-100
                  "
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* 4. 탭 콘텐츠 영역 */}
          <div className="min-h-[600px]">
            <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none"><DashboardTab companyId={companyId} /></TabsContent>
            <TabsContent value="employees" className="mt-0 focus-visible:outline-none"><EmployeesTab companyId={companyId} /></TabsContent>
            <TabsContent value="attendance" className="mt-0 focus-visible:outline-none"><AttendanceTab companyId={companyId} /></TabsContent>
            <TabsContent value="salary" className="mt-0 focus-visible:outline-none"><SalaryTab companyId={companyId} /></TabsContent>
            <TabsContent value="schedules" className="mt-0 focus-visible:outline-none"><SchedulesTab companyId={companyId} /></TabsContent>
            <TabsContent value="contracts" className="mt-0 focus-visible:outline-none"><ContractsTab companyId={companyId} /></TabsContent>
            <TabsContent value="approvals" className="mt-0 focus-visible:outline-none"><ApprovalsTab companyId={companyId} userId={user?.uid} userName={user?.name} /></TabsContent>
            <TabsContent value="notice" className="mt-0 focus-visible:outline-none"><NoticesTab companyId={companyId} /></TabsContent>
            <TabsContent value="admins" className="mt-0 focus-visible:outline-none"><AdminsTab companyId={companyId} /></TabsContent>
            <TabsContent value="stores" className="mt-0 focus-visible:outline-none"><BrandsStoresTab companyId={companyId} /></TabsContent>
            <TabsContent value="brands" className="mt-0 focus-visible:outline-none"><BrandsStoresTab companyId={companyId} /></TabsContent>
            <TabsContent value="invites" className="mt-0 focus-visible:outline-none"><InvitesTab companyId={companyId} /></TabsContent>
            <TabsContent value="settings" className="mt-0 focus-visible:outline-none"><SettingsTab companyId={companyId} /></TabsContent>
          </div>

        </Tabs>
      </main>
    </div>
  );
}
