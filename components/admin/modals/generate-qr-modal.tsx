'use client';

/**
 * 매장 QR 코드 생성 모달 (Phase T)
 * Shadcn/UI Dialog 사용
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, QrCode, RefreshCw } from 'lucide-react';
import { generateStoreQRCode, type QRCodeData } from '@/lib/utils/qr-generator';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Store } from '@/lib/types/store';

interface GenerateQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  onSuccess?: () => void;
}

export function GenerateQRModal({ isOpen, onClose, store, onSuccess }: GenerateQRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 모달이 열릴 때 QR 코드 자동 생성
  useEffect(() => {
    if (isOpen && store.id) {
      handleGenerateQR();
    }
  }, [isOpen, store.id]);

  /**
   * QR 코드 생성 (고정 QR 코드)
   */
  const handleGenerateQR = async () => {
    if (!store.id) return;

    setIsGenerating(true);
    try {
      const { dataUrl, qrData: data } = await generateStoreQRCode(
        store.id,
        store.name,
        store.companyId
      );

      setQrDataUrl(dataUrl);
      setQrData(data);
    } catch (error) {
      console.error('QR 코드 생성 실패:', error);
      alert('QR 코드 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * QR 코드 Firestore 저장 (고정 QR 코드)
   */
  const handleSaveQR = async () => {
    if (!store.id || !qrData) return;

    setIsSaving(true);
    try {
      const storeRef = doc(db, COLLECTIONS.STORES, store.id);
      await updateDoc(storeRef, {
        qrCode: JSON.stringify(qrData),
        updatedAt: Timestamp.now(),
      });

      alert('QR 코드가 저장되었습니다!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('QR 코드 저장 실패:', error);
      alert('QR 코드 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * QR 코드 이미지 다운로드
   */
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${store.name}_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            매장 QR 코드 생성 (고정)
          </DialogTitle>
          <DialogDescription>
            {store.name} 매장의 출퇴근용 QR 코드를 생성합니다. (만료 없음)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 재생성 버튼 */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleGenerateQR}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              재생성
            </Button>
          </div>

          {/* QR 코드 이미지 */}
          {qrDataUrl ? (
            <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 rounded-lg border-2 border-dashed border-zinc-300">
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
              {qrData && (
                <div className="mt-4 text-center text-sm text-zinc-600 space-y-1">
                  <p className="font-semibold text-lg">{store.name}</p>
                  <p className="text-green-600 font-medium">✅ 만료 없음 - 영구 사용 가능</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-zinc-50 rounded-lg border-2 border-dashed border-zinc-300">
              <p className="text-zinc-500">QR 코드 생성 중...</p>
            </div>
          )}
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>고정 QR 코드:</strong><br />
              이 QR 코드는 만료되지 않습니다. 한 번 프린트하면 계속 사용 가능합니다.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadQR}
            disabled={!qrDataUrl}
          >
            <Download className="h-4 w-4 mr-2" />
            다운로드
          </Button>
          <Button onClick={handleSaveQR} disabled={!qrData || isSaving}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
