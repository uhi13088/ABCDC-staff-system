'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SubscriptionPlan } from '@/lib/types';
import { PERMISSION_LABELS, PERMISSION_CATEGORIES, getPermissionLabel } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PlanStats {
  totalPlans: number;
  activePlans: number;
  [key: string]: number;
}

interface PlanManagementProps {
  onStatsUpdate: (stats: PlanStats | ((prev: PlanStats) => PlanStats)) => void;
}

export default function PlanManagement({ onStatsUpdate }: PlanManagementProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    price: 0,
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    maxUsers: 5,
    permissions: [] as string[],
    isPopular: false,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plansQuery = query(
        collection(db, 'subscription_plans'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(plansQuery);
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SubscriptionPlan[];

      plansData.sort((a, b) => a.price - b.price);
      setPlans(plansData);

      // 통계 업데이트
      onStatsUpdate((prev: PlanStats) => ({
        ...prev,
        totalPlans: plansData.length,
      }));
    } catch (error) {
      console.error('플랜 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        billingCycle: plan.billingCycle,
        maxUsers: plan.maxUsers,
        permissions: plan.permissions,
        isPopular: plan.isPopular,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        id: '',
        name: '',
        description: '',
        price: 0,
        billingCycle: 'monthly',
        maxUsers: 5,
        permissions: [],
        isPopular: false,
      });
    }
    setShowModal(true);
  };

  const handleSavePlan = async () => {
    try {
      if (!formData.id || !formData.name) {
        alert('플랜 ID와 이름은 필수입니다.');
        return;
      }

      const planData = {
        id: formData.id,
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        billingCycle: formData.billingCycle,
        maxUsers: Number(formData.maxUsers),
        permissions: formData.permissions,
        isPopular: formData.isPopular,
        isActive: true,
        features: [
          '레시피 관리 (조회/등록/수정)',
          '직원 관리 (등록/근태/스케줄)',
          '급여 관리 및 명세서 자동 생성',
        ],
        updatedAt: Timestamp.now(),
      };

      if (editingPlan) {
        // 수정
        await updateDoc(doc(db, 'subscription_plans', editingPlan.id), planData);
        alert('플랜이 수정되었습니다.');
      } else {
        // 새로 생성
        await addDoc(collection(db, 'subscription_plans'), {
          ...planData,
          createdAt: Timestamp.now(),
        });
        alert('새 플랜이 생성되었습니다.');
      }

      setShowModal(false);
      loadPlans();
    } catch (error) {
      console.error('플랜 저장 실패:', error);
      alert('플랜 저장에 실패했습니다.');
    }
  };

  const handleDeletePlan = async (planId: string, planName: string) => {
    if (!confirm(`정말로 "${planName}" 플랜을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'subscription_plans', planId));
      alert('플랜이 삭제되었습니다.');
      loadPlans();
    } catch (error) {
      console.error('플랜 삭제 실패:', error);
      alert('플랜 삭제에 실패했습니다.');
    }
  };

  const handleCreateSamplePlans = async () => {
    if (!confirm('4개의 샘플 플랜을 생성하시겠습니까?\n(이미 존재하는 플랜 ID는 건너뜁니다)')) {
      return;
    }

    const samplePlans = [
      {
        id: 'plan_free',
        name: 'Starter',
        description: '소규모 팀을 위한 무료 플랜',
        price: 0,
        billingCycle: 'monthly' as const,
        maxUsers: 5,
        permissions: [],
        isPopular: false,
      },
      {
        id: 'plan_basic',
        name: 'Basic',
        description: '성장하는 팀을 위한 기본 플랜',
        price: 9900,
        billingCycle: 'monthly' as const,
        maxUsers: 15,
        permissions: ['recipe.print', 'recipe.view_secret'],
        isPopular: false,
      },
      {
        id: 'plan_pro',
        name: 'Pro',
        description: '전문적인 관리가 필요한 팀을 위한 플랜',
        price: 29000,
        billingCycle: 'monthly' as const,
        maxUsers: 50,
        permissions: [
          'recipe.print',
          'recipe.view_secret',
          'recipe.share_external',
          'staff.manage_contract',
          'staff.schedule_manage',
        ],
        isPopular: true,
      },
      {
        id: 'plan_enterprise',
        name: 'Master',
        description: '대규모 조직을 위한 완벽한 솔루션',
        price: 59000,
        billingCycle: 'monthly' as const,
        maxUsers: 9999,
        permissions: Object.keys(PERMISSION_LABELS),
        isPopular: false,
      },
    ];

    try {
      let created = 0;
      let skipped = 0;

      for (const plan of samplePlans) {
        // 이미 존재하는지 확인
        const existingQuery = query(
          collection(db, 'subscription_plans'),
          where('id', '==', plan.id)
        );
        const existingSnapshot = await getDocs(existingQuery);

        if (existingSnapshot.empty) {
          await addDoc(collection(db, 'subscription_plans'), {
            ...plan,
            isActive: true,
            features: [
              '레시피 관리 (조회/등록/수정)',
              '직원 관리 (등록/근태/스케줄)',
              '급여 관리 및 명세서 자동 생성',
            ],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          created++;
        } else {
          skipped++;
        }
      }

      alert(`샘플 플랜 생성 완료!\n생성: ${created}개, 건너뜀: ${skipped}개`);
      loadPlans();
    } catch (error) {
      console.error('샘플 플랜 생성 실패:', error);
      alert('샘플 플랜 생성에 실패했습니다.');
    }
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">플랜 목록 로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>구독 플랜 관리</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCreateSamplePlans}>
                🌱 샘플 플랜 4개 생성
              </Button>
              <Button onClick={() => handleOpenModal()}>
                ➕ 새 플랜 추가
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">등록된 플랜이 없습니다.</p>
              <Button onClick={handleCreateSamplePlans}>
                🌱 샘플 플랜 4개 생성하기
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className={plan.isPopular ? 'border-purple-500 border-2' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        {plan.isPopular && (
                          <Badge className="mt-2 bg-purple-600">⭐ 추천</Badge>
                        )}
                      </div>
                      <Badge variant="outline">{plan.id}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold">
                        {plan.price === 0 ? '무료' : `${plan.price.toLocaleString()}원`}
                      </div>
                      {plan.price > 0 && (
                        <div className="text-sm text-gray-500">
                          {plan.billingCycle === 'monthly' ? '월간' : '연간'} 결제
                        </div>
                      )}
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600">최대 사용자</span>
                        <span className="font-semibold">{plan.maxUsers}명</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-600">유료 권한</span>
                        <span className="font-semibold">{plan.permissions.length}개</span>
                      </div>
                    </div>
                    {plan.permissions.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2">추가 권한:</p>
                        <div className="space-y-1">
                          {plan.permissions.slice(0, 3).map(permission => (
                            <div key={permission} className="text-xs text-gray-600">
                              • {getPermissionLabel(permission)}
                            </div>
                          ))}
                          {plan.permissions.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{plan.permissions.length - 3}개 더...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleOpenModal(plan)}
                      >
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                      >
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 플랜 추가/수정 모달 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? '플랜 수정' : '새 플랜 추가'}
            </DialogTitle>
            <DialogDescription>
              구독 플랜의 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planId">플랜 ID *</Label>
                <Input
                  id="planId"
                  placeholder="plan_basic"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  disabled={!!editingPlan}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planName">플랜 이름 *</Label>
                <Input
                  id="planName"
                  placeholder="Basic"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                placeholder="플랜 설명을 입력하세요"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">가격 (원)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingCycle">결제 주기</Label>
                <Select
                  value={formData.billingCycle}
                  onValueChange={(value) => setFormData({ ...formData, billingCycle: value as 'monthly' | 'yearly' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">월간</SelectItem>
                    <SelectItem value="yearly">연간</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">최대 사용자</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min="1"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 5 })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPopular"
                checked={formData.isPopular}
                onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isPopular">⭐ 추천 플랜으로 표시</Label>
            </div>

            {/* 권한 선택 */}
            <div className="space-y-3">
              <Label>선택적 권한 설정</Label>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
                  <div key={key} className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-gray-700">
                      {category.label}
                    </h4>
                    <div className="space-y-2">
                      {category.permissions.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-start gap-2 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            className="mt-0.5 w-4 h-4"
                          />
                          <span className="text-sm group-hover:text-purple-600">
                            {getPermissionLabel(permission)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              취소
            </Button>
            <Button onClick={handleSavePlan}>
              {editingPlan ? '수정하기' : '생성하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
