/**
 * Holiday Form Modal
 * 공휴일 추가/수정 모달
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, X } from 'lucide-react';

interface HolidayFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { date: string; name: string; year: number }) => Promise<void>;
  initialData?: { date: string; name: string; year: number } | null;
}

export function HolidayFormModal({ open, onClose, onSave, initialData }: HolidayFormModalProps) {
  const [date, setDate] = useState(initialData?.date || '');
  const [name, setName] = useState(initialData?.name || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!date || !name) {
      alert('날짜와 공휴일명을 입력해주세요.');
      return;
    }

    // YYYY-MM-DD 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      alert('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
      return;
    }

    const year = parseInt(date.split('-')[0]);

    setLoading(true);
    try {
      await onSave({ date, name, year });
      setDate('');
      setName('');
      onClose();
    } catch (error) {
      console.error('공휴일 저장 실패:', error);
      alert('공휴일 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            {initialData ? '공휴일 수정' : '공휴일 추가'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="date">날짜 (YYYY-MM-DD)</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="2025-01-01"
            />
          </div>

          <div>
            <Label htmlFor="name">공휴일명</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 신정, 설날, 추석"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            취소
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
