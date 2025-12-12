/**
 * 권한 코드 → 한글 명칭 매핑 (공통 상수)
 */
export const PERMISSION_LABELS: Record<string, string> = {
  'recipe.print': '🖨️ 레시피 인쇄 모드',
  'recipe.view_secret': '🔒 레시피 비공개 필드 조회',
  'recipe.share_external': '🔗 외부 공유 링크',
  'staff.manage_contract': '📝 근로계약서 보관',
  'staff.invite_email': '✉️ 이메일 발송 초대',
  'staff.schedule_manage': '📅 근무 스케줄 관리',
  'data.export_all': '📊 데이터 엑셀 다운로드',
  'data.bulk_update': '⚡ 직원 대량 일괄 수정'
} as const;

/**
 * 권한 카테고리
 */
export const PERMISSION_CATEGORIES = {
  recipe: {
    label: '📚 레시피 활용 및 보안',
    permissions: ['recipe.print', 'recipe.view_secret', 'recipe.share_external']
  },
  staff: {
    label: '👥 인사 관리 고도화',
    permissions: ['staff.manage_contract', 'staff.invite_email', 'staff.schedule_manage']
  },
  data: {
    label: '📊 데이터 소유 및 대량 작업',
    permissions: ['data.export_all', 'data.bulk_update']
  }
} as const;

/**
 * 권한 → 사람이 읽을 수 있는 기능명 변환
 */
export function getPermissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission] || permission;
}
