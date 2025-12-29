/**
 * 브랜드 작성/수정 모달 (간소화 버전)
 * 
 * 필드:
 * - 브랜드명 (필수)
 * - 설명 (선택)
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface BrandFormData {
  id?: string;
  name: string;
  description?: string;
  companyId?: string;
}

interface BrandFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: BrandFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  brand?: BrandFormData;
  companyId: string;
}

export function BrandFormModal({ 
  open, 
  onClose, 
  onSave, 
  onDelete,
  brand,
  companyId
}: BrandFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (brand) {
        // 수정 모드
        setName(brand.name || '');
        setDescription(brand.description || '');
      } else {
        // 작성 모드
        setName('');
        setDescription('');
      }
    }
  }, [open, brand]);

  /**
   * 브랜드 저장
   */
  const handleSave = async () => {
    if (!name.trim()) {
      alert('⚠️ 브랜드명을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const formData: BrandFormData = {
        name: name.trim(),
        description: description.trim(),
        companyId: companyId,
      };

      // 수정 모드일 경우에만 id 추가
      if (brand?.id) {
        formData.id = brand.id;
      }

      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('브랜드 저장 실패:', error);
      alert('브랜드 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 브랜드 삭제
   */
  const handleDelete = async () => {
    if (!brand?.id) return;
    
    if (!confirm('정말 이 브랜드를 삭제하시겠습니까?')) return;

    setSaving(true);
    try {
      if (onDelete) {
        await onDelete();
      }
      onClose();
    } catch (error) {
      console.error('브랜드 삭제 실패:', error);
      alert('브랜드 삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            🏷️ {brand ? '브랜드 수정' : '브랜드 추가'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 브랜드명 */}
          <div>
            <Label htmlFor="name">브랜드명 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 맛남살롱"
              disabled={saving}
            />
          </div>

          {/* 설명 */}
          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="브랜드에 대한 간단한 설명"
              rows={3}
              disabled={saving}
            />
          </div>
        </div>

        {/* 액션 버튼 */}
        <DialogFooter className="flex justify-between">
          <div>
            {brand && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
