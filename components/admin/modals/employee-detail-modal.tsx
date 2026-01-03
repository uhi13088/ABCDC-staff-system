'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, X, User } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { User as EmployeeType } from '@/lib/types';

interface EmployeeDetailModalProps {
  open: boolean;
  onClose: () => void;
  employeeId: string | null;
  companyId: string;
  onSuccess?: () => void;
}

export function EmployeeDetailModal({
  open,
  onClose,
  employeeId,
  onSuccess
}: EmployeeDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [employee, setEmployee] = useState<EmployeeType | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState('');
  const [birth, setBirth] = useState('');

  useEffect(() => {
    if (open && employeeId) {
      loadEmployeeDetail();
    }
  }, [open, employeeId]);

  const loadEmployeeDetail = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const employeeRef = doc(db, COLLECTIONS.USERS, employeeId);
      const employeeDoc = await getDoc(employeeRef);
      if (employeeDoc.exists()) {
        const data = employeeDoc.data() as EmployeeType;
        setEmployee(data);
        setName(data.name || '');
        setAddress(data.address || '');
        setPosition(data.position || '');
        setBirth(data.birth || '');
      }
    } catch (error) {
      console.error('❌ 직원 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!employeeId || !name.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, employeeId), {
        name: name.trim(),
        address: address.trim() || null,
        position: position.trim() || null,
        birth: birth.trim() || null,
        updatedAt: new Date().toISOString()
      });
      alert('✅ 직원 정보가 수정되었습니다.');
      onSuccess?.();
      onClose();
    } catch (error) {
      alert('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: '승인 대기', approved: '승인됨', active: '재직', rejected: '거부됨', resigned: '퇴사'
    };
    return <Badge>{map[status] || status}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><User className="w-5 h-5" />직원 상세 정보</DialogTitle>
        </DialogHeader>

        {loading ? <p className="text-center py-8">로딩 중...</p> : (
          <div className="space-y-6 py-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름 *</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth">생년월일</Label>
                    <Input id="birth" value={birth} onChange={(e) => setBirth(e.target.value)} disabled={saving} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">주소</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">직급/직책</Label>
                  <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} disabled={saving} />
                </div>
              </CardContent>
            </Card>

            {employee && (
              <Card className="bg-slate-50">
                <CardContent className="pt-6 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-slate-500">이메일</span><p className="text-sm font-medium">{employee.email}</p></div>
                    <div><span className="text-xs text-slate-500">매장</span><p className="text-sm font-medium">{employee.storeName}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-slate-500">역할</span><p className="text-sm font-medium">{employee.role}</p></div>
                    <div><span className="text-xs text-slate-500">상태</span><div className="mt-1">{getStatusBadge(employee.status || 'pending')}</div></div>
                  </div>
                  {/* 은행 및 보건증 정보 표시 */}
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div><span className="text-xs text-slate-500">은행</span><p className="text-sm">{employee.bankName} {employee.accountNumber}</p></div>
                    <div><span className="text-xs text-slate-500">보건증 만료</span><p className="text-sm">{employee.healthCertExpiryDate || '-'}</p></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}><X className="w-4 h-4 mr-2" />취소</Button>
          <Button onClick={handleSave} disabled={saving || loading}><Save className="w-4 h-4 mr-2" />저장</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
