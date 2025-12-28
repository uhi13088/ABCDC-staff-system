'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Store } from '@/lib/types/common';
import { CompanyInviteCreateOptions } from '@/lib/types/invite';

interface CreateInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Store[];
  onCreateInvite: (options: CompanyInviteCreateOptions) => Promise<string>;
}

const USER_ROLES = [
  { value: 'staff', label: '일반 직원' },
  { value: 'store_manager', label: '매장 매니저' },
  { value: 'manager', label: '관리자' },
];

export default function CreateInviteModal({
  open,
  onOpenChange,
  stores,
  onCreateInvite,
}: CreateInviteModalProps) {
  const [storeId, setStoreId] = useState('');
  const [role, setRole] = useState('staff');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeId) {
      setError('매장을 선택해주세요.');
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      setGeneratedCode('');

      const code = await onCreateInvite({
        storeId,
        role,
        maxUses: 999999,  // 무제한 (매우 큰 숫자)
      });

      setGeneratedCode(code);
      
      // 2초 후 모달 닫기
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('초대 코드 생성 실패:', err);
      setError(err instanceof Error ? err.message : '초대 코드 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStoreId('');
    setRole('staff');
    setError('');
    setGeneratedCode('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>초대 코드 생성</DialogTitle>
          <DialogDescription>
            직원을 초대할 매장과 직급을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* 매장 선택 */}
          <div className="space-y-2">
            <Label htmlFor="store">매장 *</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger id="store">
                <SelectValue placeholder="매장을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {stores.length === 0 ? (
                  <SelectItem value="none" disabled>
                    등록된 매장이 없습니다
                  </SelectItem>
                ) : (
                  stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} {store.brandName && `(${store.brandName})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 직급 선택 */}
          <div className="space-y-2">
            <Label htmlFor="role">직급 *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r, index) => (
                  <SelectItem key={`${r.value}-${index}`} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              💡 초대 코드는 무제한으로 사용 가능하며 만료되지 않습니다.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 성공 메시지 */}
          {generatedCode && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                초대 코드가 생성되었습니다: <strong className="font-mono">{generatedCode}</strong>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              취소
            </Button>
            <Button type="submit" disabled={isCreating || !storeId || !!generatedCode}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                '생성'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
