'use client';

/**
 * QR 스캔 컴포넌트 (Phase T - Employee App)
 * html5-qrcode 라이브러리 사용
 */

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, AlertCircle } from 'lucide-react';
import { validateQRCode, validateLocation } from '@/lib/utils/qr-generator';
import { doc, getDoc, addDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Store } from '@/lib/types/store';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeData: {
    uid: string;
    name: string;
    companyId: string;
    storeId: string;
  };
  onSuccess?: () => void;
}

export function QRScanner({ isOpen, onClose, employeeData, onSuccess }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 카메라 시작
   */
  const startScanner = async () => {
    try {
      setError('');
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // 후면 카메라
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      console.error('카메라 시작 실패:', err);
      setError('카메라를 시작할 수 없습니다. 카메라 권한을 확인해주세요.');
      setIsScanning(false);
    }
  };

  /**
   * 카메라 중지
   */
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('카메라 중지 실패:', err);
      }
    }
    setIsScanning(false);
  };

  /**
   * QR 스캔 성공 핸들러
   */
  const onScanSuccess = async (decodedText: string) => {
    if (isProcessing) return; // 중복 처리 방지

    setIsProcessing(true);

    try {
      // 1. QR 코드 검증
      const qrValidation = validateQRCode(decodedText);
      if (!qrValidation.isValid || !qrValidation.data) {
        throw new Error(qrValidation.error || 'QR 코드가 유효하지 않습니다.');
      }

      const qrData = qrValidation.data;

      // 2. 매장 정보 확인
      if (qrData.companyId !== employeeData.companyId) {
        throw new Error('다른 회사의 QR 코드입니다.');
      }

      // 3. Firestore에서 매장 정보 로드 (GPS 좌표 확인)
      const storeDoc = await getDoc(doc(db, COLLECTIONS.STORES, qrData.storeId));
      if (!storeDoc.exists()) {
        throw new Error('매장 정보를 찾을 수 없습니다.');
      }

      const storeData = storeDoc.data() as Store;

      // 4. GPS 위치 확인
      if (storeData.location) {
        const userPosition = await getCurrentPosition();
        const locationValidation = validateLocation(
          userPosition.latitude,
          userPosition.longitude,
          storeData.location.latitude,
          storeData.location.longitude,
          storeData.location.radius || 100
        );

        if (!locationValidation.isValid) {
          throw new Error(locationValidation.error || 'GPS 위치 확인 실패');
        }
      }

      // 5. 오늘 출퇴근 기록 확인
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

      const attendanceQuery = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('userId', '==', employeeData.uid),
        where('companyId', '==', employeeData.companyId),
        where('date', '==', dateStr)
      );

      const attendanceSnapshot = await getDocs(attendanceQuery);
      const existingRecord = attendanceSnapshot.docs[0];

      const now = today.toTimeString().slice(0, 5); // HH:MM

      if (existingRecord && existingRecord.data().clockOut) {
        throw new Error('이미 퇴근 처리되었습니다.');
      }

      // 6. 출퇴근 기록 저장
      if (existingRecord) {
        // 퇴근 처리
        const attendanceRef = doc(db, COLLECTIONS.ATTENDANCE, existingRecord.id);
        await updateDoc(attendanceRef, {
          clockOut: now,
          updatedAt: Timestamp.now(),
        });

        alert(`✅ 퇴근 완료!\n\n시간: ${now}\n매장: ${qrData.storeName}`);
      } else {
        // 출근 처리
        await addDoc(collection(db, COLLECTIONS.ATTENDANCE), {
          userId: employeeData.uid,
          uid: employeeData.uid,
          name: employeeData.name,
          employeeName: employeeData.name,
          companyId: employeeData.companyId,
          storeId: qrData.storeId,
          store: qrData.storeName,
          date: dateStr,
          clockIn: now,
          clockOut: null,
          workType: 'QR출근',
          createdAt: Timestamp.now(),
        });

        alert(`✅ 출근 완료!\n\n시간: ${now}\n매장: ${qrData.storeName}`);
      }

      // 7. 성공 처리
      await stopScanner();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('QR 처리 실패:', error);
      setError(error.message || 'QR 코드 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * QR 스캔 에러 핸들러
   */
  const onScanError = (errorMessage: string) => {
    // QR 코드를 찾지 못한 경우는 무시 (일반적인 상황)
    if (errorMessage.includes('No MultiFormat Readers')) return;
    console.warn('QR 스캔 에러:', errorMessage);
  };

  /**
   * 현재 GPS 위치 가져오기
   */
  const getCurrentPosition = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS를 지원하지 않는 브라우저입니다.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'GPS 위치를 가져올 수 없습니다.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'GPS 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요.';
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  /**
   * 모달 열림/닫힘 처리
   */
  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            QR 코드 스캔
          </DialogTitle>
          <DialogDescription>
            매장에 비치된 QR 코드를 스캔하여 출퇴근을 기록하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* QR 스캐너 */}
          <div className="flex flex-col items-center justify-center">
            {!isScanning && !error && (
              <div className="flex flex-col items-center gap-4 p-8">
                <Camera className="w-16 h-16 text-zinc-400" />
                <Button onClick={startScanner}>
                  <Camera className="w-4 h-4 mr-2" />
                  카메라 시작
                </Button>
              </div>
            )}

            {isScanning && (
              <div className="relative w-full">
                <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                      <p>처리 중...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">오류</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => {
                    setError('');
                    startScanner();
                  }}
                >
                  다시 시도
                </Button>
              </div>
            )}
          </div>

          {/* 안내 메시지 */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              📱 <strong>안내:</strong> QR 코드를 화면 중앙에 맞춰주세요.
              <br />
              📍 GPS 위치 확인이 필요할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
