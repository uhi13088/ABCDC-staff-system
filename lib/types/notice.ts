/**
 * 공지사항 관리 타입 정의
 * 백업: admin-dashboard.html 라인 6904-7084
 */

export interface Notice {
  id?: string;
  companyId: string;
  title: string;
  content: string;
  important: boolean;
  createdAt: Date | any;
  updatedAt?: Date | any;
}

export interface NoticeFormData {
  title: string;
  content: string;
  important: boolean;
}
