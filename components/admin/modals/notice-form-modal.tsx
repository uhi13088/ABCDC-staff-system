/**
 * 공지사항 작성/수정 모달
 * 백업: admin-dashboard.html 라인 1093-1122, 6977-7084
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';
import type { Notice } from '@/lib/types/notice';

interface NoticeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { title: string; content: string; important: boolean }) => Promise<void>;
  onDelete?: () => Promise<void>;
  notice?: Notice;
}

export function NoticeFormModal({ 
  open, 
  onClose, 
  onSave, 
  onDelete,
  notice 
}: NoticeFormModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [important, setImportant] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (notice) {
        // 수정 모드
        setTitle(notice.title || '');
        setContent(notice.content || '');
        setImportant(notice.important || false);
      } else {
        // 작성 모드
        setTitle('');
        setContent('');
        setImportant(false);
      }
    }
  }, [open, notice]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('⚠️ 제목을 입력해주세요.');
      return;
    }
    
    if (!content.trim()) {
      alert('⚠️ 내용을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        important,
      });
      onClose();
    } catch (error) {
      alert('공지사항 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (!confirm('⚠️ 정말 이 공지사항을 삭제하시겠습니까?')) {
      return;
    }

    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      alert('공지사항 삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {notice ? '✏️ 공지사항 수정' : '📢 공지사항 작성'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="noticeTitle">제목 *</Label>
            <Input
              id="noticeTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지사항 제목을 입력하세요"
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="noticeContent">내용 *</Label>
            <Textarea
              id="noticeContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지사항 내용을 입력하세요"
              className="min-h-[300px]"
              disabled={saving}
            />
          </div>

          <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Checkbox
              id="noticeImportant"
              checked={important}
              onCheckedChange={(checked) => setImportant(checked as boolean)}
              disabled={saving}
            />
            <div className="flex-1">
              <Label htmlFor="noticeImportant" className="cursor-pointer font-medium">
                ⭐ 중요 공지사항으로 표시
              </Label>
              <p className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                중요 공지사항은 직원 페이지 상단에 고정 표시됩니다.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {notice && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              className="mr-auto"
            >
              🗑️ 삭제
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
