'use client';

/**
 * 직원 상세 정보 모달
 * 기능: 직원 정보 조회 및 수정
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, X, User, Phone, MapPin, Building2, Briefcase } from 'lucide-react';
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
  companyId,
  onSuccess
}: EmployeeDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 직원 정보
  const [employee, setEmployee] = useState<EmployeeType | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState('');
  const [birth, setBirth] = useState('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (open && employeeId) {
      loadEmployeeDetail();
    }
  }, [open, employeeId]);

  /**
   * 직원 상세 정보 로드
   */
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
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setPosition(data.position || '');
        setBirth(data.birth || '');
        setStatus(data.status || 'pending');
      }
    } catch (error) {
      console.error('❌ 직원 정보 로드 실패:', error);
      alert('직원 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 직원 정보 저장
   */
  const handleSave = async () => {
    if (!employeeId) return;
    if (!name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const employeeRef = doc(db, COLLECTIONS.USERS, employeeId);
      await updateDoc(employeeRef, {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        position: position.trim() || null,
        birth: birth.trim() || null,
        status,
        updatedAt: new Date().toISOString()
      });

      alert('✅ 직원 정보가 수정되었습니다.');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('❌ 직원 정보 수정 실패:', error);
      alert('직원 정보 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '승인 대기', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '승인됨', className: 'bg-green-100 text-green-800' },
      active: { label: '재직', className: 'bg-blue-100 text-blue-800' },
      rejected: { label: '거부됨', className: 'bg-red-100 text-red-800' },
      resigned: { label: '퇴사', className: 'bg-slate-100 text-slate-800' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            직원 상세 정보
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-slate-500">
            <p>로딩 중...</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* 기본 정보 */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      이름 *
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="홍길동"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth">생년월일 (YYMMDD)</Label>
                    <Input
                      id="birth"
                      value={birth}
                      onChange={(e) => setBirth(e.target.value)}
                      placeholder="990101"
                      maxLength={6}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    연락처
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-1234-5678"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    주소
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="서울특별시 강남구..."
                    disabled={saving}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position" className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      직급/직책
                    </Label>
                    <Input
                      id="position"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="매니저, 직원 등"
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">근무 상태</Label>
                    <Select value={status} onValueChange={setStatus} disabled={saving}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">승인 대기</SelectItem>
                        <SelectItem value="approved">승인됨</SelectItem>
                        <SelectItem value="active">재직</SelectItem>
                        <SelectItem value="rejected">거부됨</SelectItem>
                        <SelectItem value="resigned">퇴사</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 추가 정보 */}
            {employee && (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">이메일</span>
                    <span className="text-sm font-medium">{employee.email || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">매장</span>
                    <span className="text-sm font-medium">{employee.storeName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">역할</span>
                    <span className="text-sm font-medium">{employee.role}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">상태</span>
                    {getStatusBadge(status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">가입일</span>
                    <span className="text-sm font-medium">
                      {employee.createdAt 
                        ? new Date(employee.createdAt).toLocaleDateString('ko-KR')
                        : '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
