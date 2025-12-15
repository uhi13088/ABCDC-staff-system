/**
 * Notification 타입 정의
 * 9가지 알림 타입 지원
 */

export type NotificationType = 
  | 'ATTENDANCE_UPDATED_BY_ADMIN'      // 관리자가 출퇴근 기록 수정
  | 'ATTENDANCE_UPDATED_BY_EMPLOYEE'   // 직원이 출퇴근 기록 수정
  | 'APPROVAL_REQUESTED'               // 승인 요청 (관리자에게)
  | 'APPROVAL_PROCESSED'               // 승인 처리 (신청자에게)
  | 'CONTRACT_SIGN_REQUESTED'          // 계약서 서명 요청
  | 'SALARY_PAID'                      // 급여 지급 완료
  | 'EMERGENCY_SHIFT_POSTED'           // 긴급 근무 모집
  | 'NOTICE_CREATED'                   // 새 공지사항
  | 'ATTENDANCE_ALERT'                 // 결근/지각 알림
  | 'EMPLOYEE_APPROVED'                // 직원 가입 승인 ⭐
  | 'EMPLOYEE_REJECTED';               // 직원 가입 거부 ⭐

export interface Notification {
  id?: string;
  
  // 표준 필드 (FIELD_NAMING_STANDARD.md)
  companyId: string;
  userId: string;                      // 알림 받을 사용자 UID
  
  // 알림 정보
  type: NotificationType;
  title: string;
  message: string;
  
  // 관련 데이터 ID
  relatedId?: string;                  // 관련 문서 ID (계약서, 출퇴근 기록, 승인 요청 등)
  relatedType?: 'contract' | 'attendance' | 'approval' | 'salary' | 'openShift' | 'notice';
  
  // 발신자 정보
  senderId?: string;                   // 발신자 UID (관리자 또는 직원)
  senderName?: string;                 // 발신자 이름
  senderRole?: string;                 // 발신자 역할 (admin, employee)
  
  // 매장 정보 (긴급 근무, 공지사항 등)
  storeId?: string;
  storeName?: string;
  
  // 상태
  isRead: boolean;
  readAt?: string;                     // ISO 8601 timestamp
  
  // 액션 버튼 (선택 사항)
  actionUrl?: string;                  // 클릭 시 이동할 URL
  actionLabel?: string;                // 버튼 레이블 (예: "계약서 확인", "출근 기록 확인")
  
  // 메타데이터
  createdAt: string;                   // ISO 8601 timestamp (serverTimestamp)
  expiresAt?: string;                  // 만료 시간 (선택 사항)
}

/**
 * Notification 생성 파라미터
 */
export interface CreateNotificationParams {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: Notification['relatedType'];
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  storeId?: string;
  storeName?: string;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string;
}

/**
 * 알림 타입별 제목/메시지 템플릿
 */
export const NOTIFICATION_TEMPLATES = {
  ATTENDANCE_UPDATED_BY_ADMIN: {
    title: '출퇴근 기록이 수정되었습니다',
    message: (adminName: string, date: string) => 
      `${adminName} 관리자가 ${date}의 출퇴근 기록을 수정했습니다.`,
    actionLabel: '출근 기록 확인',
  },
  ATTENDANCE_UPDATED_BY_EMPLOYEE: {
    title: '직원이 출퇴근 기록을 수정했습니다',
    message: (employeeName: string, date: string) =>
      `${employeeName}님이 ${date}의 출퇴근 기록을 수정했습니다.`,
    actionLabel: '출근 기록 확인',
  },
  APPROVAL_REQUESTED: {
    title: '새로운 승인 요청',
    message: (employeeName: string, approvalType: string) =>
      `${employeeName}님의 ${approvalType} 신청이 도착했습니다.`,
    actionLabel: '승인 요청 확인',
  },
  APPROVAL_PROCESSED: {
    title: '승인 요청이 처리되었습니다',
    message: (approvalType: string, status: string) =>
      `${approvalType} 신청이 ${status}되었습니다.`,
    actionLabel: '상세 내용 확인',
  },
  CONTRACT_SIGN_REQUESTED: {
    title: '계약서 서명 요청',
    message: (companyName: string) =>
      `${companyName}에서 계약서 서명을 요청했습니다.`,
    actionLabel: '계약서 확인',
  },
  SALARY_PAID: {
    title: '급여가 지급되었습니다',
    message: (month: string, amount: string) =>
      `${month}의 급여 ${amount}원이 지급 완료되었습니다.`,
    actionLabel: '급여 명세서 확인',
  },
  EMERGENCY_SHIFT_POSTED: {
    title: '긴급 근무 모집',
    message: (storeName: string, date: string, time: string, incentive: string) =>
      `${storeName} - ${date} ${time} 긴급 근무 (추가 ${incentive}원)`,
    actionLabel: '긴급 근무 확인',
  },
  NOTICE_CREATED: {
    title: '새 공지사항',
    message: (noticeTitle: string) =>
      `새 공지사항: ${noticeTitle}`,
    actionLabel: '공지사항 확인',
  },
  ATTENDANCE_ALERT: {
    title: '출근 확인 필요',
    message: (date: string, status: string) =>
      `${date} ${status} - 출근 확인이 필요합니다.`,
    actionLabel: '출근 확인',
  },
  EMPLOYEE_APPROVED: {
    title: '가입 승인 완료',
    message: (companyName: string) =>
      `${companyName}의 직원으로 승인되었습니다. 로그인하여 서비스를 이용하실 수 있습니다.`,
    actionLabel: '로그인하기',
  },
  EMPLOYEE_REJECTED: {
    title: '가입 요청 거부',
    message: (companyName: string) =>
      `${companyName}의 직원 가입 요청이 거부되었습니다. 자세한 사항은 관리자에게 문의하세요.`,
    actionLabel: '문의하기',
  },
} as const;
