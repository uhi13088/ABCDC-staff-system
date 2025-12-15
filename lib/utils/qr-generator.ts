/**
 * QR 코드 생성 유틸리티 (Phase T)
 * qrcode 라이브러리 사용
 */

import QRCode from 'qrcode';

/**
 * QR 코드 데이터 인터페이스
 */
export interface QRCodeData {
  storeId: string;
  storeName: string;
  companyId: string;
  timestamp: number;
  expiry: number; // 만료 시간 (timestamp)
}

/**
 * 매장용 QR 코드 생성
 * @param storeId - 매장 ID
 * @param storeName - 매장명
 * @param companyId - 회사 ID
 * @param validityHours - 유효 시간 (기본 24시간)
 * @returns QR 코드 Data URL
 */
export async function generateStoreQRCode(
  storeId: string,
  storeName: string,
  companyId: string,
  validityHours: number = 24
): Promise<{ dataUrl: string; qrData: QRCodeData }> {
  const now = Date.now();
  const expiry = now + validityHours * 60 * 60 * 1000;

  const qrData: QRCodeData = {
    storeId,
    storeName,
    companyId,
    timestamp: now,
    expiry,
  };

  // QR 코드 데이터를 JSON 문자열로 변환
  const qrString = JSON.stringify(qrData);

  // QR 코드 이미지 생성 (Data URL 형식)
  const dataUrl = await QRCode.toDataURL(qrString, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  return { dataUrl, qrData };
}

/**
 * QR 코드 데이터 검증
 * @param qrString - QR 코드 스캔 결과 문자열
 * @returns 검증 결과 및 파싱된 데이터
 */
export function validateQRCode(qrString: string): {
  isValid: boolean;
  data?: QRCodeData;
  error?: string;
} {
  try {
    const data = JSON.parse(qrString) as QRCodeData;

    // 필수 필드 확인
    if (!data.storeId || !data.storeName || !data.companyId || !data.timestamp || !data.expiry) {
      return {
        isValid: false,
        error: 'QR 코드 데이터 형식이 올바르지 않습니다.',
      };
    }

    // 만료 시간 확인
    const now = Date.now();
    if (now > data.expiry) {
      return {
        isValid: false,
        error: 'QR 코드가 만료되었습니다. 관리자에게 새 QR 코드를 요청하세요.',
      };
    }

    return {
      isValid: true,
      data,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'QR 코드를 읽을 수 없습니다.',
    };
  }
}

/**
 * GPS 거리 계산 (Haversine formula)
 * @param lat1 - 위도 1
 * @param lon1 - 경도 1
 * @param lat2 - 위도 2
 * @param lon2 - 경도 2
 * @returns 거리 (미터)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터 단위
}

/**
 * GPS 위치 검증
 * @param userLat - 사용자 위도
 * @param userLon - 사용자 경도
 * @param storeLat - 매장 위도
 * @param storeLon - 매장 경도
 * @param allowedRadius - 허용 반경 (미터, 기본 100m)
 * @returns 검증 결과
 */
export function validateLocation(
  userLat: number,
  userLon: number,
  storeLat: number,
  storeLon: number,
  allowedRadius: number = 100
): {
  isValid: boolean;
  distance: number;
  error?: string;
} {
  const distance = calculateDistance(userLat, userLon, storeLat, storeLon);

  if (distance > allowedRadius) {
    return {
      isValid: false,
      distance,
      error: `매장에서 ${Math.round(distance)}m 떨어져 있습니다. 매장 ${allowedRadius}m 이내에서만 출퇴근이 가능합니다.`,
    };
  }

  return {
    isValid: true,
    distance,
  };
}
