'use client';

/**
 * ABC Staff System 랜딩 페이지
 * 레거시 landing.html을 Shadcn/UI Zinc 테마로 완전 재구축
 * - 히어로 섹션 (그라데이션 배경)
 * - 동적 요금제 표시 (Firestore subscription_plans)
 * - 초대 코드 입력 모달 (invitation_codes 검증)
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, DollarSign, FileText, BarChart3, Check, Loader2, Ticket } from 'lucide-react';

// Firebase imports
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  maxUsers: number;
  features: string[];
  permissions: string[];
  isActive: boolean;
  isPopular: boolean;
}

const PERMISSION_LABELS: Record<string, string> = {
  'recipe.print': '🖨️ 레시피 인쇄 모드',
  'recipe.view_secret': '🔒 레시피 비공개 필드 조회',
  'recipe.share_external': '🔗 외부 공유 링크',
  'staff.manage_contract': '📝 근로계약서 보관',
  'staff.invite_email': '✉️ 이메일 발송 초대',
  'staff.schedule_manage': '📅 근무 스케줄 관리',
  'data.export_all': '📊 데이터 엑셀 다운로드',
  'data.bulk_update': '⚡ 직원 대량 일괄 수정',
};

function LandingPageContent() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteVerifying, setInviteVerifying] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'subscription_plans'),
        where('isActive', '==', true),
        orderBy('price', 'asc')
      );
      const snapshot = await getDocs(q);
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as SubscriptionPlan[];
      setPlans(plansData);
    } catch (error) {
      console.error('플랜 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyInviteCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setInviteError('초대 코드를 입력하세요.');
      return;
    }

    try {
      setInviteVerifying(true);
      setInviteError('');
      setInviteSuccess('');

      // ✅ 보안 개선: 서버 측 API Route로 검증 (Enumeration Attack 차단)
      const response = await fetch('/api/verify-invite-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!data.success) {
        setInviteError(`❌ ${data.error}`);
        return;
      }

      // localStorage에 저장
      localStorage.setItem('inviteCode', data.code);
      localStorage.setItem('inviteCodeId', data.codeId);
      localStorage.setItem('planId', data.planId);
      localStorage.setItem('planName', data.planName);

      setInviteSuccess(`✅ 유효한 초대 코드입니다! (플랜: ${data.planName})`);

      // 2초 후 관리자 회원가입 페이지로 이동
      setTimeout(() => {
        router.push('/admin-register');
      }, 2000);
    } catch (error) {
      console.error('초대 코드 검증 실패:', error);
      setInviteError('❌ 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setInviteVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* 네비게이션 */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-zinc-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z" />
            </svg>
            <span className="text-xl font-bold text-zinc-900">ABC Staff System</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <a href="/admin-login">관리자 로그인</a>
            </Button>
            <Button asChild>
              <a href="/employee-login">직원 로그인</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white py-20 lg:py-32">
        <div className="container relative z-10">
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight">
              스마트한 직원 관리의 시작
              <br />
              <span className="text-purple-200">ABC Staff System</span>
            </h1>
            <p className="text-lg lg:text-xl text-purple-100 max-w-2xl mx-auto leading-relaxed">
              근태 관리부터 급여 계산까지, 직원 관리의 모든 것을 하나의 플랫폼에서 간편하게 처리하세요.
              클라우드 기반으로 언제 어디서나 접근 가능합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 text-lg h-14 px-8"
                onClick={() => setShowInviteModal(true)}
              >
                <Ticket className="h-5 w-5" />
                초대 코드로 시작하기
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-lg h-14 px-8 bg-white/10 hover:bg-white/20 text-white border-white/30"
                asChild
              >
                <a href="#pricing">요금제 보기</a>
              </Button>
            </div>

            {/* 주요 기능 아이콘 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
              {[
                { icon: Clock, label: '근태 관리' },
                { icon: DollarSign, label: '급여 계산' },
                { icon: FileText, label: '계약 관리' },
                { icon: BarChart3, label: '실시간 분석' },
              ].map((item, idx) => (
                <Card key={idx} className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6 text-center">
                    <item.icon className="h-10 w-10 mx-auto mb-2 text-white" />
                    <p className="font-semibold text-white">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 가격 정책표 */}
      <section id="pricing" className="py-20 bg-zinc-50">
        <div className="container">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl lg:text-5xl font-extrabold text-zinc-900">
              간단하고 투명한 요금제
            </h2>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              초대 코드로 바로 시작하실 수 있습니다. 결제 없이 플랜을 체험해보세요.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {plans.map((plan) => {
                const allFeatures = [
                  { text: '✅ 모든 기본 기능 포함', isBold: true },
                  { text: '회사/브랜드/매장 관리', isBold: false },
                  { text: '직원 프로필 관리', isBold: false },
                  { text: '레시피 관리 (기본)', isBold: false },
                  { text: '공지사항 게시판', isBold: false },
                  ...plan.permissions.map(p => ({
                    text: PERMISSION_LABELS[p] || p,
                    isBold: true,
                  })),
                ];

                return (
                  <Card
                    key={plan.id}
                    className={`relative ${
                      plan.isPopular
                        ? 'border-2 border-zinc-900 shadow-2xl scale-105'
                        : 'border border-zinc-200'
                    }`}
                  >
                    {plan.isPopular && (
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-2 text-sm font-bold rounded-t-lg">
                        ⭐ 추천 플랜
                      </div>
                    )}
                    <CardHeader className={plan.isPopular ? 'pt-12' : ''}>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription className="min-h-[40px]">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <span className={`text-4xl font-extrabold ${plan.isPopular ? 'text-zinc-900' : 'text-zinc-900'}`}>
                          {plan.price === 0 ? '무료' : `${plan.price.toLocaleString()}원`}
                        </span>
                        <span className="text-zinc-600 text-base block mt-1">
                          {plan.price === 0
                            ? '영구 무료'
                            : `/ ${plan.billingCycle === 'monthly' ? '월' : '년'}`}
                        </span>
                      </div>

                      <div className="pb-4 border-b border-zinc-200">
                        <Badge variant="secondary" className="text-xs">
                          👥 {plan.maxUsers >= 9999 ? '무제한' : `최대 ${plan.maxUsers}명`}
                        </Badge>
                      </div>

                      <ul className="space-y-2.5 min-h-[280px]">
                        {allFeatures.map((feature, idx) => (
                          <li key={idx} className="flex items-start text-sm">
                            <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span className={feature.isBold ? 'font-bold text-zinc-900' : 'text-zinc-700'}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full"
                        variant={plan.isPopular ? 'default' : 'outline'}
                        size="lg"
                        onClick={() => setShowInviteModal(true)}
                      >
                        {plan.price === 0 ? '무료로 시작하기' : '지금 시작하기'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-zinc-900 text-zinc-300 py-12">
        <div className="container text-center space-y-4">
          <svg className="w-10 h-10 text-purple-400 mx-auto" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z" />
          </svg>
          <p className="text-sm">&copy; 2024 ABC Staff System. All rights reserved.</p>
          <p className="text-xs text-zinc-500">스마트한 직원 관리 솔루션</p>
        </div>
      </footer>

      {/* 초대 코드 입력 모달 */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              초대 코드 입력
            </DialogTitle>
            <DialogDescription>
              초대 코드를 입력하시면 자동으로 플랜이 할당됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">초대 코드</Label>
              <Input
                id="inviteCode"
                placeholder="예: ABC12345"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={12}
                className="text-center font-mono text-lg uppercase"
              />
              <p className="text-xs text-zinc-500">※ 관리자로부터 받은 초대 코드를 입력하세요</p>
            </div>

            {inviteError && (
              <Alert variant="destructive">
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}

            {inviteSuccess && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <AlertDescription>{inviteSuccess}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowInviteModal(false)} disabled={inviteVerifying}>
              취소
            </Button>
            <Button onClick={verifyInviteCode} disabled={inviteVerifying}>
              {inviteVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                '확인'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}
