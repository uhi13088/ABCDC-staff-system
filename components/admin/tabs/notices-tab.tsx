/**
 * 공지사항 관리 탭
 * 백업: admin-dashboard.html 라인 447-469, 6904-7084
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Plus, Edit, Trash2, Star } from 'lucide-react';
import { useNoticesLogic } from '@/hooks/admin/useNoticesLogic';
import { safeToLocaleString, type TimestampInput } from '@/lib/utils/timestamp';
import { NoticeFormModal } from '@/components/admin/modals/notice-form-modal';
import type { Notice } from '@/lib/types/notice';

interface NoticesTabProps {
  companyId: string;
  onCountChange?: () => void; // 카운트 변경 콜백
}

export function NoticesTab({ companyId, onCountChange }: NoticesTabProps) {
  const {
    notices,
    loading,
    loadNotices,
    addNotice,
    updateNotice,
    deleteNotice,
  } = useNoticesLogic({ companyId });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | undefined>(undefined);

  useEffect(() => {
    if (!companyId) return; // Phase 3: companyId 로딩 보호
    loadNotices();
  }, [companyId, loadNotices]);

  /**
   * 새 공지사항 작성
   */
  const handleAddNotice = () => {
    setSelectedNotice(undefined);
    setIsModalOpen(true);
  };

  /**
   * 공지사항 수정
   */
  const handleEditNotice = (notice: Notice) => {
    setSelectedNotice(notice);
    setIsModalOpen(true);
  };

  /**
   * 공지사항 저장 (추가/수정)
   */
  const handleSaveNotice = async (data: { title: string; content: string; important: boolean }) => {
    if (selectedNotice?.id) {
      await updateNotice(selectedNotice.id, data);
    } else {
      await addNotice(data);
    }
    onCountChange?.(); // 카운트 새로고침
  };

  /**
   * 공지사항 삭제
   */
  const handleDeleteNotice = async () => {
    if (selectedNotice?.id) {
      await deleteNotice(selectedNotice.id);
      onCountChange?.(); // 카운트 새로고침
    }
  };

  /**
   * 모달 닫기
   */
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedNotice(undefined);
  };

  /**
   * 날짜 포맷
   */
  // 🔒 Phase I: Timestamp 안전 변환
  const formatDate = (date: TimestampInput) => {
    return safeToLocaleString(date, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-600" />
              공지사항 관리
              {!loading && (
                <span className="text-sm font-normal text-slate-500">
                  (총 {notices.length}건)
                </span>
              )}
            </CardTitle>
            <Button 
              onClick={handleAddNotice}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              공지사항 작성
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notices.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">등록된 공지사항이 없습니다.</p>
              <Button 
                onClick={handleAddNotice}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                첫 공지사항 작성하기
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">제목</TableHead>
                    <TableHead className="w-[25%]">작성일</TableHead>
                    <TableHead className="w-[10%] text-center">중요</TableHead>
                    <TableHead className="w-[15%] text-center">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notices.map((notice) => (
                    <TableRow key={notice.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {notice.important && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                          )}
                          <span className="font-medium text-slate-900">
                            {notice.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {formatDate(notice.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        {notice.important ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                            중요
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditNotice(notice)}
                            className="text-xs"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedNotice(notice);
                              handleDeleteNotice();
                            }}
                            className="text-xs"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            삭제
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 공지사항 작성/수정 모달 */}
      <NoticeFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveNotice}
        onDelete={selectedNotice ? handleDeleteNotice : undefined}
        notice={selectedNotice}
      />
    </div>
  );
}
