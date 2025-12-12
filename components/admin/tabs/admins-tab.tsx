'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Trash2 } from 'lucide-react';
import { useAdminLogic } from '@/hooks/admin/useAdminLogic';

interface AdminsTabProps {
  companyId: string;
}

export default function AdminsTab({ companyId }: AdminsTabProps) {
  const { admins, loading, loadAdmins, deleteAdmin } = useAdminLogic({ companyId });

  useEffect(() => {
    if (companyId) {
      loadAdmins();
    }
  }, [companyId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="w-5 h-5" />
              관리자 관리
            </CardTitle>
            <CardDescription>관리자 계정 추가/수정/삭제</CardDescription>
          </div>
          <Button>+ 관리자 추가</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : admins.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>등록된 관리자가 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>권한</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.uid}>
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge>{admin.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={admin.status === 'approved' ? 'default' : 'secondary'}>
                      {admin.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteAdmin(admin.uid, admin.name)}>
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
  );
}
