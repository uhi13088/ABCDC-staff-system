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
import { format } from 'date-fns';
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

      // 5. 계약서 정보 로드 (출퇴근 시간 확인)
      let contractSchedule = null;
      try {
        const contractQuery = query(
          collection(db, COLLECTIONS.CONTRACTS),
          where('userId', '==', employeeData.uid),
          where('companyId', '==', employeeData.companyId),
          where('status', '==', 'active')
        );
        const contractSnapshot = await getDocs(contractQuery);
        if (!contractSnapshot.empty) {
          const contractData = contractSnapshot.docs[0].data();
          contractSchedule = contractData.schedules?.[0]; // 첫 번째 스케줄 사용
          console.log('📋 계약서 근무 시간:', contractSchedule);
        }
      } catch (error) {
        console.warn('계약서 정보 로드 실패:', error);
      }

      // 6. 오늘 출퇴근 기록 확인
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

      const attendanceQuery = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('userId', '==', employeeData.uid),
        where('companyId', '==', employeeData.companyId),
        where('date', '==', dateStr)
      );

      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      console.log('🔍 오늘 출퇴근 기록 조회:', {
        dateStr,
        totalRecords: attendanceSnapshot.size,
        records: attendanceSnapshot.docs.map(doc => ({
          id: doc.id,
          clockIn: doc.data().clockIn,
          clockOut: doc.data().clockOut
        }))
      });
      
      // 현재 시간을 Timestamp로 변환
      const nowTimestamp = Timestamp.now();

      // 오늘의 모든 출퇴근 기록 중 clockOut이 없는 기록 찾기 (가장 최근 출근)
      let activeRecord = null;
      attendanceSnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.clockOut) {
          activeRecord = { id: doc.id, data };
          console.log('✅ 활성 출근 기록 발견:', { id: doc.id, clockIn: data.clockIn });
        }
      });

      if (!activeRecord) {
        console.log('📝 활성 출근 기록 없음 → 새로운 출근 처리');
      } else {
        console.log('🚪 활성 출근 기록 있음 → 퇴근 처리');
      }

      // 7. 출퇴근 기록 저장 (자동 승인)
      if (activeRecord) {
        // 퇴근 처리 (clockOut이 없는 기록에 퇴근 시간 추가)
        const clockOutTime = format(nowTimestamp.toDate(), 'HH:mm');
        let warningMessage = '';
        let warningReason = '';

        // 계약서 시간과 비교
        if (contractSchedule?.endTime) {
          const [contractHour, contractMin] = contractSchedule.endTime.split(':').map(Number);
          const [actualHour, actualMin] = clockOutTime.split(':').map(Number);
          const contractMinutes = contractHour * 60 + contractMin;
          const actualMinutes = actualHour * 60 + actualMin;
          const diffMinutes = Math.abs(actualMinutes - contractMinutes);

          // 매장 허용시간 확인
          const earlyThreshold = storeData.earlyClockOutThreshold || 5;

          if (actualMinutes < contractMinutes - earlyThreshold) {
            warningMessage = `⚠️ 조기퇴근: 계약시간(${contractSchedule.endTime})보다 ${Math.floor((contractMinutes - actualMinutes) / 60)}시간 ${(contractMinutes - actualMinutes) % 60}분 일찍 퇴근`;
            warningReason = '조기퇴근';
          } else if (actualMinutes > contractMinutes + 60) {
            warningMessage = `⚠️ 연장근무: 계약시간(${contractSchedule.endTime})보다 ${Math.floor((actualMinutes - contractMinutes) / 60)}시간 ${(actualMinutes - contractMinutes) % 60}분 늦게 퇴근`;
            warningReason = '연장근무';
          }
        }

        const attendanceRef = doc(db, COLLECTIONS.ATTENDANCE, activeRecord.id);
        await updateDoc(attendanceRef, {
          clockOut: nowTimestamp,
          status: 'approved', // 자동 승인
          updatedAt: nowTimestamp,
          warning: warningMessage || null,
          warningReason: warningReason || null,
        });

        const alertMessage = warningMessage
          ? `✅ 퇴근 완료!\n\n시간: ${clockOutTime}\n매장: ${qrData.storeName}\n\n${warningMessage}`
          : `✅ 퇴근 완료!\n\n시간: ${clockOutTime}\n매장: ${qrData.storeName}`;
        alert(alertMessage);
      } else {
        // 출근 처리 (새로운 출근 기록 생성)
        const clockInTime = format(nowTimestamp.toDate(), 'HH:mm');
        let warningMessage = '';
        let warningReason = '';

        // 계약서 시간과 비교
        if (contractSchedule?.startTime) {
          const [contractHour, contractMin] = contractSchedule.startTime.split(':').map(Number);
          const [actualHour, actualMin] = clockInTime.split(':').map(Number);
          const contractMinutes = contractHour * 60 + contractMin;
          const actualMinutes = actualHour * 60 + actualMin;

          // 매장 허용시간 확인
          const earlyThreshold = storeData.earlyClockInThreshold || 15;

          if (actualMinutes < contractMinutes - earlyThreshold) {
            warningMessage = `⚠️ 조기출근: 계약시간(${contractSchedule.startTime})보다 ${Math.floor((contractMinutes - actualMinutes) / 60)}시간 ${(contractMinutes - actualMinutes) % 60}분 일찍 출근`;
            warningReason = '조기출근';
          } else if (actualMinutes > contractMinutes + 5) {
            warningMessage = `⚠️ 지각: 계약시간(${contractSchedule.startTime})보다 ${Math.floor((actualMinutes - contractMinutes) / 60)}시간 ${(actualMinutes - contractMinutes) % 60}분 늦게 출근`;
            warningReason = '지각';
          }
        }

        await addDoc(collection(db, COLLECTIONS.ATTENDANCE), {
          userId: employeeData.uid,
          uid: employeeData.uid,
          name: employeeData.name,
          employeeName: employeeData.name,
          companyId: employeeData.companyId,
          storeId: qrData.storeId,
          store: qrData.storeName,
          date: dateStr,
          clockIn: nowTimestamp,
          clockOut: null,
          status: 'approved', // 자동 승인
          workType: 'QR출근',
          createdAt: nowTimestamp,
          warning: warningMessage || null,
          warningReason: warningReason || null,
        });

        const alertMessage = warningMessage
          ? `✅ 출근 완료!\n\n시간: ${clockInTime}\n매장: ${qrData.storeName}\n\n${warningMessage}`
          : `✅ 출근 완료!\n\n시간: ${clockInTime}\n매장: ${qrData.storeName}`;
        alert(alertMessage);
      }

      // 8. 성공 처리
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
      // Dialog 애니메이션이 완료될 때까지 충분히 대기
      const timer = setTimeout(() => {
        const element = document.getElementById('qr-reader');
        if (element) {
          console.log('✅ QR 스캐너 엘리먼트 찾음, 카메라 시작...');
          startScanner();
        } else {
          console.error('❌ QR 스캐너 엘리먼트를 찾을 수 없습니다.');
          setError('QR 스캐너를 초기화할 수 없습니다. 페이지를 새로고침해주세요.');
        }
      }, 300); // 100ms → 300ms로 증가
      
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
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
            {/* QR 리더 div를 항상 렌더링 (display:none으로 숨김) */}
            <div 
              id="qr-reader" 
              className={`w-full rounded-lg overflow-hidden ${!isScanning ? 'hidden' : ''}`}
            ></div>

            {!isScanning && !error && (
              <div className="flex flex-col items-center gap-4 p-8">
                <Camera className="w-16 h-16 text-zinc-400" />
                <Button onClick={startScanner}>
                  <Camera className="w-4 h-4 mr-2" />
                  카메라 시작
                </Button>
              </div>
            )}

            {isScanning && isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                  <p>처리 중...</p>
                </div>
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
