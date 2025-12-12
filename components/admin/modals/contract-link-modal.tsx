/**
 * 계약서 링크 전송 모달
 * 백업: admin-dashboard.html 라인 3127-3199 (sendContractLink 함수)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Contract } from '@/lib/types/contract';
import { Copy, Mail } from 'lucide-react';

interface ContractLinkModalProps {
  open: boolean;
  onClose: () => void;
  contractId: string | null;
}

export function ContractLinkModal({ open, onClose, contractId }: ContractLinkModalProps) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [signLink, setSignLink] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * 계약서 로드 및 서명 링크 생성 (백업: 라인 3127-3141)
   */
  useEffect(() => {
    if (open && contractId) {
      loadContractAndGenerateLink(contractId);
    }
  }, [open, contractId]);

  /**
   * Firestore에서 계약서 가져오기 및 링크 생성
   */
  const loadContractAndGenerateLink = async (id: string) => {
    setLoading(true);
    try {
      const { db } = await import('@/lib/firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const contractDoc = await getDoc(doc(db, 'contracts', id));
      
      if (!contractDoc.exists()) {
        alert('⚠️ 계약서를 찾을 수 없습니다.');
        onClose();
        return;
      }
      
      const contractData = { id: contractDoc.id, ...contractDoc.data() } as Contract;
      setContract(contractData);
      
      // 서명 링크 생성 (백업: 라인 3138-3141)
      const origin = window.location.origin;
      const link = `${origin}/contract-sign?id=${id}`;
      setSignLink(link);
      
    } catch (error) {
      console.error('❌ 계약서 조회 실패:', error);
      alert('⚠️ 오류가 발생했습니다.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  /**
   * 링크 복사 (백업: 라인 3189-3194)
   */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(signLink);
      alert('✅ 서명 링크가 복사되었습니다!');
    } catch (error) {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = signLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      alert('✅ 서명 링크가 복사되었습니다!');
    }
  };

  /**
   * 복사하고 닫기 (백업: 라인 3196-3199)
   */
  const handleCopyAndClose = async () => {
    await handleCopyLink();
    setTimeout(() => onClose(), 500);
  };

  if (!contract || loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-4">로딩 중...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        {/* 모달 헤더 (백업: 라인 3150-3153) */}
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">📧 서명 링크 전송</DialogTitle>
        </DialogHeader>

        {/* 모달 바디 (백업: 라인 3154-3170) */}
        <div className="space-y-4 py-4">
          <p className="text-sm">
            <strong>{contract.employeeName}</strong>님께 서명 링크를 전송합니다.
          </p>

          {/* 연락처 (백업: 라인 3156-3159) */}
          <div>
            <Label className="font-semibold mb-2 block">📱 연락처</Label>
            <Input
              type="tel"
              value={contract.employeePhone || '-'}
              readOnly
              className="bg-gray-50"
            />
          </div>

          {/* 서명 링크 (백업: 라인 3160-3166) */}
          <div>
            <Label className="font-semibold mb-2 block">🔗 서명 링크</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={signLink}
                readOnly
                className="flex-1 text-sm bg-gray-50"
              />
              <Button size="sm" variant="outline" onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" />
                복사
              </Button>
            </div>
          </div>

          {/* 안내 메시지 (백업: 라인 3167-3169) */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              💡 <strong>링크 복사 후</strong> 카카오톡, 문자 등으로 직원에게 전달하세요.
            </p>
          </div>
        </div>

        {/* 모달 푸터 (백업: 라인 3171-3174) */}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={handleCopyAndClose}>
            <Copy className="w-4 h-4 mr-2" />
            복사하고 닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
