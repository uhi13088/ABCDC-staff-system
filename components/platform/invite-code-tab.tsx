'use client';

/**
 * 초대 코드 관리 탭
 * 기존 로직 보존 + Shadcn/UI Zinc 테마
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Plus, 
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  Ticket,
} from 'lucide-react';

import { 
  type InvitationCode, 
  type SubscriptionPlan,
  generateInviteCodes,
  deleteInviteCode,
  formatDate,
} from '@/lib/platform-logic';

interface InviteCodeTabProps {
  inviteCodes: InvitationCode[];
  plans: SubscriptionPlan[];
  onRefresh: () => void;
}

export default function InviteCodeTab({ inviteCodes, plans, onRefresh }: InviteCodeTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    planId: '',
    count: 1,
  });

  const unusedCodes = inviteCodes.filter(code => !code.isUsed);
  const usedCodes = inviteCodes.filter(code => code.isUsed);

  const handleGenerateCodes = async () => {
    if (!formData.planId) {
      alert('플랜을 선택해주세요.');
      return;
    }

    const count = parseInt(String(formData.count));
    if (count < 1 || count > 50) {
      alert('생성 개수는 1~50개 사이여야 합니다.');
      return;
    }

    const selectedPlan = plans.find(p => p.id === formData.planId);
    if (!selectedPlan) {
      alert('플랜을 찾을 수 없습니다.');
      return;
    }

    try {
      const codes = await generateInviteCodes(
        selectedPlan.id,
        selectedPlan.name,
        count,
        'super_admin' // TODO: 실제 사용자 UID
      );

      alert(`${count}개의 초대 코드가 생성되었습니다!\n\n${codes.join('\n')}`);
      setShowModal(false);
      onRefresh();
    } catch (error) {
      console.error('초대 코드 생성 실패:', error);
      alert('초대 코드 생성에 실패했습니다.');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('코드가 클립보드에 복사되었습니다!');
  };

  const handleDeleteCode = async (codeId: string, code: string) => {
    if (!confirm(`초대 코드 "${code}"를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteInviteCode(codeId);
      alert('초대 코드가 삭제되었습니다.');
      onRefresh();
    } catch (error) {
      console.error('초대 코드 삭제 실패:', error);
      alert('초대 코드 삭제에 실패했습니다.');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>초대 코드 관리</CardTitle>
              <CardDescription className="mt-1.5">
                회사 가입용 초대 코드를 생성하고 관리합니다
              </CardDescription>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              초대 코드 생성
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 통계 카드 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-600">
                  전체 코드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-900">
                  {inviteCodes.length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700">
                  미사용
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {unusedCodes.length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700">
                  사용됨
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {usedCodes.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 초대 코드 목록 */}
          {inviteCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-zinc-100 p-3 mb-4">
                <Ticket className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                초대 코드가 없습니다
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                새로운 초대 코드를 생성하세요
              </p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                첫 초대 코드 생성하기
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b bg-zinc-50/50">
                    <tr>
                      <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                        초대 코드
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                        플랜
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                        상태
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                        사용자
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                        생성일
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-zinc-600">
                        사용일
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-zinc-600">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {inviteCodes.map((code) => (
                      <tr key={code.id} className="border-b transition-colors hover:bg-zinc-50/50">
                        <td className="p-4 align-middle">
                          <code className="bg-zinc-100 px-2 py-1 rounded text-sm font-mono">
                            {code.code}
                          </code>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline">{code.planName}</Badge>
                        </td>
                        <td className="p-4 align-middle">
                          {code.isUsed ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              사용됨
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500">
                              <XCircle className="h-3 w-3 mr-1" />
                              미사용
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="text-sm text-zinc-900">
                            {code.usedBy || '-'}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="text-sm text-zinc-600">
                            {formatDate(code.createdAt)}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="text-sm text-zinc-600">
                            {code.usedAt ? formatDate(code.usedAt) : '-'}
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopyCode(code.code)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteCode(code.id, code.code)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 초대 코드 생성 모달 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>초대 코드 생성</DialogTitle>
            <DialogDescription>
              새로운 초대 코드를 생성합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="planId">플랜 선택 *</Label>
              <Select
                value={formData.planId}
                onValueChange={(value) => setFormData({ ...formData, planId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="플랜을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price === 0 ? '무료' : `${plan.price.toLocaleString()}원`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="count">생성 개수 (1~50)</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="50"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              취소
            </Button>
            <Button onClick={handleGenerateCodes}>
              생성하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
