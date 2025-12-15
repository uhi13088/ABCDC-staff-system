'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, Trash2, Edit } from 'lucide-react';
import { useNoticeLogic } from '@/hooks/admin/useNoticeLogic';
import { safeToLocaleDateString } from '@/lib/utils/timestamp';

interface NoticeTabProps {
  companyId: string;
}

export default function NoticeTab({ companyId }: NoticeTabProps) {
  const { notices, loading, loadNotices, addNotice, deleteNotice } = useNoticeLogic({ companyId, userId: '', userName: '' });
  const [showModal, setShowModal] = useState(false);
  const [noticeData, setNoticeData] = useState({ title: '', content: '' });

  useEffect(() => {
    if (companyId) {
      loadNotices();
    }
  }, [companyId]);

  const handleSubmit = async () => {
    try {
      await addNotice(noticeData);
      alert('✅ 공지사항이 등록되었습니다.');
      setShowModal(false);
      setNoticeData({ title: '', content: '' });
      loadNotices();
    } catch (error) {
      alert('❌ 등록 실패: ' + error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Bell className="w-5 h-5" />
                공지사항
              </CardTitle>
              <CardDescription>전체 공지사항 관리</CardDescription>
            </div>
            <Button onClick={() => setShowModal(true)}>+ 공지사항 작성</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : notices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>등록된 공지사항이 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>작성일</TableHead>
                  <TableHead>관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notices.map((notice) => (
                  <TableRow key={notice.id}>
                    <TableCell className="font-medium">{notice.title}</TableCell>
                    <TableCell>{notice.authorName}</TableCell>
                    <TableCell>{safeToLocaleDateString(notice.createdAt)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteNotice(notice.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공지사항 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input value={noticeData.title} onChange={(e) => setNoticeData({ ...noticeData, title: e.target.value })} placeholder="공지 제목을 입력하세요" />
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea value={noticeData.content} onChange={(e) => setNoticeData({ ...noticeData, content: e.target.value })} placeholder="공지 내용을 입력하세요..." rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSubmit}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
