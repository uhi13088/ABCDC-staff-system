/**
 * 계약서 관리 타입 정의
 * 백업: admin-dashboard.html 라인 5627-5876 (loadContracts 함수)
 */

import { Timestamp } from 'firebase/firestore';

/**
 * 계약 유형
 */
export type ContractType = 
  | '시급제'      // 시간당 급여
  | '월급제'      // 월 고정 급여
  | '연봉제'      // 연간 급여
  | '계약직'      // 계약 기간제
  | '인턴';       // 인턴십

/**
 * 계약서 상태
 */
export type ContractStatus = 
  | '서명대기'    // 서명 전
  | '서명완료'    // 서명 완료
  | '만료';       // 계약 기간 만료

/**
 * 스케줄 그룹 (요일별 근무 시간)
 */
export interface ContractSchedule {
  day: string;                    // 요일 (월/화/수/목/금/토/일)
  startTime: string;              // 시작 시간 (HH:mm)
  endTime: string;                // 종료 시간 (HH:mm)
  breakMinutes?: number;          // 휴게시간 (분)
}

/**
 * 급여 지급 항목
 */
export interface ContractAllowances {
  weeklyHoliday: boolean;         // 주휴수당
  overtime: boolean;              // 연장근무수당
  night: boolean;                 // 야간근무수당
  holiday: boolean;               // 휴일근무수당
}

/**
 * 4대보험
 */
export interface ContractInsurance {
  type: string;                   // 보험 타입 (full/none)
  severancePay: boolean;          // 퇴직금 적용
}

/**
 * 계약서 인터페이스 (백업: admin-dashboard.html 라인 9525-9595)
 */
export interface Contract {
  id?: string;                    // Firestore 문서 ID (예: C1234567890)
  companyId?: string;             // 회사 ID (멀티테넌트)
  
  // 직원 정보 (백업: 라인 9529-9533)
  userId?: string;                // 직원 UID (표준 필드)
  employeeId?: string;            // 직원 UID (하위 호환성)
  employeeName: string;           // 직원명
  employeeBirth: string;          // 생년월일 (YYYY-MM-DD)
  employeePhone?: string;         // 전화번호
  employeeAddress?: string;       // 주소
  employeePosition?: string;      // 직책
  position?: string;              // 직책 (하위 호환)
  
  // 회사 정보 (백업: 라인 9534-9538)
  companyName?: string;           // 회사명
  companyCEO?: string;            // 대표자명
  companyBusinessNumber?: string; // 사업자등록번호
  companyPhone?: string;          // 회사 전화번호
  companyAddress?: string;        // 회사 주소
  
  // 계약 정보 (백업: 라인 9539-9542)
  contractType?: string;          // 계약 유형 (기간제/정규직 등)
  workStore?: string;             // 근무 매장명
  storeId?: string;               // 매장 ID
  isAdditional?: boolean;         // 추가 계약서 여부 (백업: 라인 9580)
  
  // 계약 기간 (백업: 라인 9543-9545)
  contractStartDate?: string;     // 시작일 (YYYY-MM-DD)
  contractEndDate?: string;       // 종료일 (YYYY-MM-DD) 또는 '기간의 정함이 없음'
  startDate?: string;             // 시작일 (하위 호환)
  endDate?: string;               // 종료일 (하위 호환)
  
  // 스케줄 정보 (백업: 라인 9549-9556)
  schedules?: ContractSchedule[]; // 요일별 근무 시간 배열
  schedule?: {
    days: string;                 // 근무 요일 (예: "월~금")
    time: string;                 // 근무 시간 (예: "09:00~18:00")
    breakTime: string;            // 휴게시간 (예: "1시간")
  };
  workDays?: string;              // 근무 요일 (하위 호환)
  workTime?: string;              // 근무 시간 (하위 호환)
  breakTime?: string;             // 휴게시간 (하위 호환)
  
  // 급여 정보 (백업: 라인 9563-9572)
  salaryType?: string;            // 급여 타입 (hourly/monthly)
  salaryAmount?: number | string; // 급여 금액
  salaryPaymentDay?: string;      // 급여 지급일
  salaryCalculationType?: string; // 급여 계산 방식
  salaryCalculationPeriod?: any;  // 급여 계산 기간
  paymentMethod?: string;         // 지급 방법
  
  // 급여 지급 항목 (백업: 라인 9582-9588)
  allowances?: ContractAllowances;
  
  // 4대보험 (백업: 라인 9590-9594)
  insurance?: ContractInsurance;
  
  // 계약서 내용
  contractContent?: string;       // 계약서 본문
  contractDate?: string;          // 계약서 작성일
  
  // 서명 정보
  status?: ContractStatus;        // 계약서 상태
  isSigned?: boolean;             // 서명 여부
  signedAt?: Timestamp | Date | null; // 서명 일시
  signedBy?: string;              // 서명한 사람 (UID)
  signLink?: string;              // 서명 링크 (백업: 라인 9576)
  
  // 메타 정보 (백업: 라인 9575-9577)
  createdAt?: Timestamp | Date | string; // 생성 일시
  createdBy?: string;             // 생성자 (UID)
  updatedAt?: Timestamp | Date;   // 수정 일시
  updatedBy?: string;             // 수정자 (UID)
  
  // 기타
  notes?: string;                 // 특이사항
  attachments?: string[];         // 첨부파일 URL
}

/**
 * 계약서 그룹 (직원별)
 */
export interface ContractGroup {
  employeeKey: string;            // name_birth 키
  employeeName: string;           // 직원명
  employeeBirth: string;          // 주민번호 앞 6자리
  normalContracts: Contract[];    // 일반 계약서 (최신순)
  additionalContracts: Contract[]; // 추가 계약서
}

/**
 * 계약서 필터
 */
export interface ContractFilters {
  store: string;                  // 매장 필터 (전체: '')
  employmentStatus: string;       // 근무 상태 (전체: '', 재직자: 'active', 퇴사자: 'resigned')
}

/**
 * 계약서 작성 폼 데이터
 * 백업: admin-dashboard.html 라인 9151-9212 (saveContract 함수)
 */
export interface ContractFormData {
  // 직원 정보
  employeeId?: string;            // 직원 선택 (드롭다운)
  employeeName: string;
  employeeBirth: string;
  employeePhone?: string;
  employeeAddress?: string;
  
  // 회사/매장 정보
  storeId: string;                // 매장 선택
  workStore: string;              // 근무 매장명
  companyName?: string;
  companyCEO?: string;
  companyBusinessNumber?: string;
  companyPhone?: string;
  companyAddress?: string;
  
  // 계약 정보
  contractType: string;
  isAdditional: boolean;          // 추가 계약서 여부
  
  // 계약 기간
  contractStartDate: string;      // startDate
  contractEndDate: string;        // endDate
  
  // 직책
  position: string;
  
  // 근무 조건 (간단 입력)
  workDays: string;               // 예: "월~금"
  workTime: string;               // 예: "09:00~18:00"
  breakTime: string;              // 예: "1시간"
  
  // 스케줄 (상세 입력)
  schedules?: ContractSchedule[]; // 요일별 다른 시간
  
  // 휴게시간 상세
  breakTimeData?: {
    hour: string;
    minute: string;
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
  };
  
  // 급여 정보
  salaryType: string;             // hourly/monthly
  salaryAmount: string | number;
  paymentDay: string;             // 급여 지급일
  paymentMethod: string;          // 지급 방법
  
  // 급여 지급 항목
  allowances?: ContractAllowances;
  
  // 4대보험
  insurance?: ContractInsurance;
  
  // 계약서 내용
  contractContent?: string;
  
  // 기타
  notes?: string;
}
