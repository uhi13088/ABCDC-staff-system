/**
 * 매장 및 브랜드 관리 타입 정의
 * 백업: admin-dashboard.html 라인 5930-6036, 6089-6172
 */

export interface Brand {
  id?: string;
  companyId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  createdAt: Date | any;
  updatedAt?: Date | any;
}

export interface Store {
  id?: string;
  companyId: string;
  brandId?: string;
  name: string;
  address?: string;
  phone?: string;
  ceo?: string;
  businessNumber?: string;
  salaryPaymentDay?: number;
  // 수당 설정 (백업 라인 973-996)
  overtimeAllowance?: boolean;
  nightAllowance?: boolean;
  holidayAllowance?: boolean;
  // 급여 계산 설정 (백업 라인 852-960)
  salaryCalculationType?: string; // prev_month_full, current_month_full, custom
  calculationStartMonth?: string; // prev, current
  calculationStartDay?: string; // 1-28, last
  calculationEndMonth?: string; // prev, current
  calculationEndDay?: string; // 1-28, last
  // 매장 운영시간 (백업 라인 998-1024)
  openTime?: string; // HH:mm
  closeTime?: string; // HH:mm
  closingTime?: string; // HH:mm (alias for closeTime)
  cleanupBufferMinutes?: number; // 마감 완충 시간 (기본값 30분)
  // 출퇴근 허용시간 (백업 라인 1026-1046)
  earlyClockInThreshold?: number; // 분
  earlyClockOutThreshold?: number; // 분
  lateClockInThreshold?: number; // 분
  // QR 출퇴근 설정 (Phase T)
  qrCode?: string;           // QR 코드 데이터 (JSON string)
  qrCodeExpiry?: Date | any; // QR 코드 만료 시간
  location?: {               // 매장 GPS 위치
    latitude: number;
    longitude: number;
    radius?: number;         // 허용 반경 (미터)
  };
  createdAt?: Date | any;
  updatedAt?: Date | any;
}

export interface BrandFormData {
  name: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface StoreFormData {
  brandId?: string;
  name: string;
  address?: string;
  phone?: string;
  ceo?: string;
  businessNumber?: string;
  salaryPaymentDay?: number;
  overtimeAllowance?: boolean;
  nightAllowance?: boolean;
  holidayAllowance?: boolean;
}
