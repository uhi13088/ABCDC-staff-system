'use client';

/**
 * 구독 플랜 관리 탭
 * 기존 로직 보존 + Shadcn/UI Zinc 테마
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Star,
  Users,
  DollarSign,
  Sparkles,
} from 'lucide-react';

import { 
  type SubscriptionPlan, 
  savePlan, 
  deletePlan,
  seedInitialPlans,
  formatPrice,
} from '@/lib/platform-logic';
import { PERMISSION_LABELS, PERMISSION_CATEGORIES, getPermissionLabel } from '@/lib/constants';

interface PlanManagementTabProps {
  plans: SubscriptionPlan[];
  onRefresh: () => void;
}

export default function PlanManagementTab({ plans, onRefresh }: PlanManagementTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
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

      await savePlan(
        {
          id: formData.id,
          name: formData.name,
          description: formData.description,
          price: formData.price,
          billingCycle: formData.billingCycle,
          maxUsers: formData.maxUsers,
          permissions: formData.permissions,
          isPopular: formData.isPopular,
          isActive: true,
          features: [
            '레시피 관리 (조회/등록/수정)',
            '직원 관리 (등록/근태/스케줄)',
            '급여 관리 및 명세서 자동 생성',
          ],
        },
        editingPlan?.id
      );

      alert(editingPlan ? '플랜이 수정되었습니다.' : '새 플랜이 생성되었습니다.');
      setShowModal(false);
      onRefresh();
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
      await deletePlan(planId);
      alert('플랜이 삭제되었습니다.');
      onRefresh();
    } catch (error) {
      console.error('플랜 삭제 실패:', error);
      alert('플랜 삭제에 실패했습니다.');
    }
  };

  const handleSeedPlans = async () => {
    if (!confirm('4개의 샘플 플랜을 생성하시겠습니까?\n(이미 존재하는 플랜 ID는 건너뜁니다)')) {
      return;
    }

    try {
      const result = await seedInitialPlans();
      alert(`샘플 플랜 생성 완료!\n생성: ${result.created}개, 건너뜀: ${result.skipped}개`);
      onRefresh();
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>구독 플랜 관리</CardTitle>
              <CardDescription className="mt-1.5">
                플랜별 가격, 권한, 사용자 수 제한을 설정합니다
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSeedPlans}>
                <Sparkles className="h-4 w-4 mr-2" />
                샘플 플랜 생성
              </Button>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="h-4 w-4 mr-2" />
                새 플랜 추가
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-zinc-100 p-3 mb-4">
                <Sparkles className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                플랜이 없습니다
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                샘플 플랜을 생성하거나 직접 플랜을 추가하세요
              </p>
              <Button onClick={handleSeedPlans}>
                <Sparkles className="h-4 w-4 mr-2" />
                샘플 플랜 4개 생성하기
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={plan.isPopular ? 'border-zinc-900 shadow-lg' : ''}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {plan.id}
                        </Badge>
                      </div>
                      {plan.isPopular && (
                        <Badge className="bg-zinc-900">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          추천
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* 가격 */}
                    <div>
                      <div className="text-3xl font-bold text-zinc-900">
                        {formatPrice(plan.price)}
                      </div>
                      {plan.price > 0 && (
                        <div className="text-sm text-zinc-500 mt-1">
                          {plan.billingCycle === 'monthly' ? '월간 결제' : '연간 결제'}
                        </div>
                      )}
                    </div>

                    {/* 설명 */}
                    {plan.description && (
                      <p className="text-sm text-zinc-600">
                        {plan.description}
                      </p>
                    )}

                    {/* 스펙 */}
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600 flex items-center">
                          <Users className="h-4 w-4 mr-1.5" />
                          최대 사용자
                        </span>
                        <span className="font-semibold text-zinc-900">
                          {plan.maxUsers}명
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600">유료 권한</span>
                        <span className="font-semibold text-zinc-900">
                          {plan.permissions.length}개
                        </span>
                      </div>
                    </div>

                    {/* 권한 목록 미리보기 */}
                    {plan.permissions.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-xs font-semibold text-zinc-700 mb-2">
                          추가 권한:
                        </p>
                        <div className="space-y-1">
                          {plan.permissions.slice(0, 3).map(permission => (
                            <div key={permission} className="text-xs text-zinc-600">
                              • {getPermissionLabel(permission)}
                            </div>
                          ))}
                          {plan.permissions.length > 3 && (
                            <div className="text-xs text-zinc-500">
                              +{plan.permissions.length - 3}개 더...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenModal(plan)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePlan(plan.id, plan.name)}
                      >
                        <Trash2 className="h-3 w-3" />
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

          <div className="space-y-6 py-4">
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
                className="h-4 w-4 rounded border-zinc-300"
              />
              <Label htmlFor="isPopular" className="font-normal cursor-pointer">
                <Star className="inline h-4 w-4 mr-1" />
                추천 플랜으로 표시
              </Label>
            </div>

            {/* 권한 선택 */}
            <div className="space-y-3">
              <Label>선택적 권한 설정</Label>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
                  <Card key={key}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{category.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {category.permissions.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-start gap-2 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                          />
                          <span className="text-sm group-hover:text-zinc-900">
                            {getPermissionLabel(permission)}
                          </span>
                        </label>
                      ))}
                    </CardContent>
                  </Card>
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
