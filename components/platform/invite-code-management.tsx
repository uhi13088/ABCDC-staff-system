'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InvitationCode, SubscriptionPlan } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function InviteCodeManagement() {
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    planId: '',
    count: 1,
  });

  useEffect(() => {
    loadInviteCodes();
    loadPlans();
  }, []);

  const loadInviteCodes = async () => {
    try {
      setLoading(true);
      const codesQuery = query(
        collection(db, 'invitation_codes'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(codesQuery);
      const codesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InvitationCode[];

      setCodes(codesData);
    } catch (error) {
      console.error('초대 코드 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const plansQuery = query(
        collection(db, 'subscription_plans'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(plansQuery);
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SubscriptionPlan[];

      setPlans(plansData);
      if (plansData.length > 0) {
        setFormData({ ...formData, planId: plansData[0].id });
      }
    } catch (error) {
      console.error('플랜 로드 실패:', error);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

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
      const newCodes: string[] = [];
      for (let i = 0; i < count; i++) {
        const code = generateCode();
        await addDoc(collection(db, 'invitation_codes'), {
          code,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          isUsed: false,
          createdAt: Timestamp.now(),
          createdBy: 'super_admin', // TODO: 실제 사용자 UID 사용
        });
        newCodes.push(code);
      }

      alert(`${count}개의 초대 코드가 생성되었습니다!\n\n${newCodes.join('\n')}`);
      setShowModal(false);
      loadInviteCodes();
    } catch (error) {
      console.error('초대 코드 생성 실패:', error);
      alert('초대 코드 생성에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">초대 코드 로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  const unusedCodes = codes.filter(code => !code.isUsed);
  const usedCodes = codes.filter(code => code.isUsed);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>초대 코드 관리</span>
            <Button onClick={() => setShowModal(true)}>
              ➕ 초대 코드 생성
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 통계 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">전체 코드</div>
              <div className="text-2xl font-bold">{codes.length}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600">미사용</div>
              <div className="text-2xl font-bold text-blue-600">{unusedCodes.length}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600">사용됨</div>
              <div className="text-2xl font-bold text-green-600">{usedCodes.length}</div>
            </div>
          </div>

          {/* 초대 코드 목록 */}
          {codes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">생성된 초대 코드가 없습니다.</p>
              <Button onClick={() => setShowModal(true)}>
                ➕ 첫 초대 코드 생성하기
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      초대 코드
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      플랜
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      사용자
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      생성일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      사용일
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {codes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {code.code}
                        </code>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge variant="outline">{code.planName}</Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {code.isUsed ? (
                          <Badge className="bg-green-500">사용됨</Badge>
                        ) : (
                          <Badge className="bg-blue-500">미사용</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {code.usedBy || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {code.createdAt?.toDate().toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {code.usedAt ? code.usedAt.toDate().toLocaleDateString('ko-KR') : '-'}
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
