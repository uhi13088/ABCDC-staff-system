'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SubscriptionPlan } from '@/lib/types';
import { PERMISSION_LABELS, getPermissionLabel, COLLECTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // ✅ 라우터 추가

export default function LandingPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const router = useRouter(); // ✅ 라우터 훅 사용

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plansQuery = query(
        collection(db, COLLECTIONS.SUBSCRIPTION_PLANS),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(plansQuery);
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SubscriptionPlan[];

      plansData.sort((a, b) => a.price - b.price);
      setPlans(plansData);
    } catch (error) {
      console.error('플랜 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCode = () => {
    if (!inviteCode.trim()) {
      alert('초대 코드를 입력해주세요.');
      return;
    }
    // ✅ window.location.href 대신 router.push 사용 (새로고침 방지)
    router.push(`/employee-register?code=${inviteCode}`);
  };

  const formatPrice = (price: number) => {
    return price === 0 ? '무료' : `월 ${price.toLocaleString()}원`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 네비게이션 */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/>
              </svg>
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                ABC Staff System
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin-login" className="text-gray-600 hover:text-gray-900 font-medium">
                관리자 로그인
              </Link>
              
              {/* ✅ Link 안에 Button을 넣는 대신, Button asChild 사용 */}
              <Button asChild>
                <Link href="/employee-login">
                  직원 로그인
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="bg-gradient-to-br from-purple-600 to-purple-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">
            스마트한 직원 관리의 시작 ✨
          </h1>
          <p className="text-xl mb-8 text-purple-100 max-w-2xl mx-auto">
            레시피 관리부터 근태, 급여까지 - 모든 인사 업무를 하나의 시스템에서
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" variant="secondary" onClick={() => setShowInviteModal(true)}>
              🎫 초대 코드로 시작하기
            </Button>
            <Button size="lg" variant="outline" className="bg-white text-purple-600 hover:bg-purple-50">
              📖 자세히 알아보기
            </Button>
          </div>
        </div>
      </section>

      {/* 가격 플랜 섹션 */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🎯 우리 회사에 딱 맞는 플랜 선택
            </h2>
            <p className="text-lg text-gray-600">
              규모와 필요에 따라 선택하고, 언제든 업그레이드 가능합니다
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">플랜 로딩 중...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">현재 등록된 플랜이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative ${
                    plan.isPopular
                      ? 'border-purple-500 border-2 shadow-xl scale-105'
                      : 'border-gray-200'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-purple-600 text-white px-4 py-1">
                        ⭐ 추천
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {plan.description || ''}
                    </CardDescription>
                    <div className="mt-4">
                      <div className="text-4xl font-bold text-gray-900">
                        {formatPrice(plan.price)}
                      </div>
                      {plan.price > 0 && (
                        <div className="text-sm text-gray-500 mt-1">
                          {plan.billingCycle === 'monthly' ? '월간 결제' : '연간 결제'}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="border-t border-b py-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">최대 사용자</span>
                        <span className="font-semibold">{plan.maxUsers}명</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">유료 권한</span>
                        <span className="font-semibold">{plan.permissions.length}개</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        ✅ 모든 기본 기능 포함
                      </p>
                      <p className="text-xs text-gray-500">
                        레시피 관리 / 직원 관리 / 근태 관리
                      </p>
                    </div>

                    {plan.permissions.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-purple-600 mb-2">
                          🎁 추가 권한
                        </p>
                        <ul className="space-y-1">
                          {plan.permissions.map((permission) => (
                            <li key={permission} className="text-xs text-gray-700 flex items-start">
                              <span className="mr-1">•</span>
                              <span>{getPermissionLabel(permission)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter>
                    {/* ✅ 모달 트리거 버튼은 그대로 둠 (Link가 아니므로) */}
                    <Button
                      className="w-full"
                      variant={plan.isPopular ? 'default' : 'outline'}
                      onClick={() => setShowInviteModal(true)}
                    >
                      {plan.price === 0 ? '무료로 시작하기' : '지금 시작하기'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 초대 코드 모달 */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎫 초대 코드 입력</DialogTitle>
            <DialogDescription>
              관리자로부터 받은 초대 코드를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">초대 코드</Label>
              <Input
                id="inviteCode"
                placeholder="예: ABC-1234-WXYZ"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={20}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              취소
            </Button>
            <Button onClick={handleInviteCode}>
              다음
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">© 2024 ABC Staff System. All rights reserved.</p>
          <p className="text-xs mt-2">Made with ❤️ by ABC Dessert Center</p>
        </div>
      </footer>
    </div>
  );
}
