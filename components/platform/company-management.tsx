'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Company } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { COLLECTIONS } from '@/lib/constants';
import { safeToLocaleDateString } from '@/lib/utils/timestamp';

interface PlatformStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalUsers: number;
}

interface CompanyManagementProps {
  onStatsUpdate: (stats: PlatformStats) => void;
}

export default function CompanyManagement({ onStatsUpdate }: CompanyManagementProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const companiesQuery = query(
        collection(db, COLLECTIONS.COMPANIES),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(companiesQuery);
      const companiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Company[];

      setCompanies(companiesData);

      // 통계 업데이트
      const totalUsers = companiesData.reduce((sum, company) => sum + (company.currentUsers || 0), 0);
      onStatsUpdate({
        totalCompanies: companiesData.length,
        totalUsers: totalUsers,
        totalPlans: 0, // 플랜 관리에서 업데이트
      });
    } catch (error) {
      console.error('회사 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-500">활성</Badge>;
    }
    return <Badge variant="secondary">정지</Badge>;
  };

  const getPlanBadge = (planType: string) => {
    const planColors: Record<string, string> = {
      'plan_free': 'bg-gray-500',
      'plan_basic': 'bg-blue-500',
      'plan_pro': 'bg-purple-500',
      'plan_enterprise': 'bg-amber-500',
    };
    const planNames: Record<string, string> = {
      'plan_free': 'Starter',
      'plan_basic': 'Basic',
      'plan_pro': 'Pro',
      'plan_enterprise': 'Master',
    };
    
    return (
      <Badge className={planColors[planType] || 'bg-gray-500'}>
        {planNames[planType] || planType}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">회사 목록 로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>회사 목록</span>
          <Button variant="outline" onClick={loadCompanies}>
            🔄 새로고침
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            등록된 회사가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    회사명
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    플랜
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리자 이메일
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {company.name}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getPlanBadge(company.planType)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {company.currentUsers} / {company.maxUsers}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            (company.currentUsers / company.maxUsers) * 100 >= 90
                              ? 'bg-red-500'
                              : (company.currentUsers / company.maxUsers) * 100 >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min((company.currentUsers / company.maxUsers) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(company.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {company.adminEmail}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {safeToLocaleDateString(company.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
