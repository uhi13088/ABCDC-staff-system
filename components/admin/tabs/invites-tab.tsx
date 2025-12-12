'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Copy } from 'lucide-react';
import { useInviteLogic } from '@/hooks/admin/useInviteLogic';

interface InvitesTabProps {
  companyId: string;
}

export default function InvitesTab({ companyId }: InvitesTabProps) {
  const { invites, isLoading, loadInvites, copyInviteUrl, toggleInviteStatus } = useInviteLogic(companyId);

  useEffect(() => {
    if (companyId) {
      loadInvites();
    }
  }, [companyId]);

  return (
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
          <Button>+ 초대 코드 생성</Button>
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
                <TableHead>상태</TableHead>
                <TableHead>사용현황</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-mono font-medium">{invite.code}</TableCell>
                  <TableCell>{invite.companyName || '-'}</TableCell>
                  <TableCell>{invite.planName || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={invite.isUsed ? 'secondary' : 'default'}>
                      {invite.isUsed ? '사용됨' : '미사용'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invite.isUsed ? '1 / 1' : '0 / 1'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => copyInviteUrl(`/invite/${invite.code}`)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
