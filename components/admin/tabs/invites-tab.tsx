'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Copy, Trash2 } from 'lucide-react';
import { useInviteLogic } from '@/hooks/admin/useInviteLogic';
import CreateInviteModal from '@/components/admin/modals/create-invite-modal';

interface InvitesTabProps {
  companyId: string;
}

export default function InvitesTab({ companyId }: InvitesTabProps) {
  const { invites, stores, isLoading, loadInvites, createInviteCode, copyInviteUrl, toggleInviteStatus, deleteInviteCode } = useInviteLogic(companyId);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadInvites();
    }
  }, [companyId]);

  // 🔒 companyId 로딩 보호
  if (!companyId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                초대 코드 관리
              </CardTitle>
              <CardDescription>직원 초대 코드 생성 및 관리</CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>+ 초대 코드 생성</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : invites.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>생성된 초대 코드가 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>코드</TableHead>
                  <TableHead>매장</TableHead>
                  <TableHead>직급</TableHead>
                  <TableHead>직무</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const roleLabel = {
                    employee: '일반 직원',
                    staff: '일반 직원',
                    store_manager: '매장 매니저',
                    manager: '관리자',
                  }[invite.role] || invite.role;

                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-mono font-medium text-blue-600">{invite.code}</TableCell>
                      <TableCell>{invite.storeName || invite.companyName || '-'}</TableCell>
                      <TableCell>{roleLabel}</TableCell>
                      <TableCell>{invite.position || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={invite.status === 'active' ? 'default' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => toggleInviteStatus(invite.id!, invite.status)}
                        >
                          {invite.status === 'active' ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              const url = `${window.location.origin}/employee-register?code=${invite.code}`;
                              copyInviteUrl(url);
                            }}
                            title="초대 URL 복사"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteInviteCode(invite.id!)}
                            title="초대 코드 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 초대 코드 생성 모달 */}
      <CreateInviteModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        stores={stores}
        onCreateInvite={createInviteCode}
      />
    </>
  );
}
