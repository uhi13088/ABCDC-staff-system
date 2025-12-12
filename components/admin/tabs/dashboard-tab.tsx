'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock, CheckCircle, FileText } from 'lucide-react';
import { useDashboardLogic } from '@/hooks/admin/useDashboardLogic';

/**
 * Dashboard 탭 컴포넌트
 * 원본: admin-dashboard.html의 대시보드 통계 카드
 * 기능: 총 직원 수, 오늘 출근, 승인 대기, 미서명 계약서 통계
 */
interface DashboardTabProps {
  companyId: string;
}

export default function DashboardTab({ companyId }: DashboardTabProps) {
  const { stats, loading, loadDashboardStats } = useDashboardLogic({ companyId });

  useEffect(() => {
    if (companyId) {
      loadDashboardStats();
    }
  }, [companyId]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: '총 직원 수',
      value: stats.totalEmployees,
      icon: Users,
      description: '재직 중인 직원',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '오늘 출근',
      value: stats.todayAttendance,
      icon: Clock,
      description: '오늘 출근한 직원',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '승인 대기',
      value: stats.pendingApprovals,
      icon: CheckCircle,
      description: '처리 대기 중',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: '미서명 계약서',
      value: stats.unsignedContracts,
      icon: FileText,
      description: '서명 필요',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div>
      {/* ==================== 통계 카드 (카드박스 2/3 축소, 아이콘/글씨 원래대로) ==================== */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-start justify-between mb-3">
                  {/* 제목: 14px (원래 크기 유지) */}
                  <div className="text-sm font-medium text-gray-600">
                    {card.title}
                  </div>
                  
                  {/* 아이콘 박스: 40px × 40px, SVG 24px (원래 크기 유지) */}
                  <div className={`${card.bgColor} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
                
                {/* 숫자: 36px (원래 크기 유지) */}
                <div className={`text-4xl font-bold leading-none ${card.color} mb-1`}>
                  {card.value.toLocaleString()}
                </div>
                
                {/* 서브 텍스트: 12px */}
                <div className="text-xs text-gray-500">
                  {card.description}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ==================== 📊 현황 요약 카드 (백업 HTML 기준 복원) ==================== */}
      <Card className="bg-white border-slate-200 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">📊 현황 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            관리자 페이지에 오신 것을 환영합니다.
          </p>
        </CardContent>
      </Card>

      {/* ==================== 최근 활동 (추후 추가 가능) ==================== */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">최근 직원 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center py-8">
              최근 등록된 직원이 없습니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">최근 승인 요청</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center py-8">
              최근 승인 요청이 없습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
