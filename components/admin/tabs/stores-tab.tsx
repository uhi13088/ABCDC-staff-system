'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Store as StoreIcon, Trash2, QrCode } from 'lucide-react';
import { useStoreLogic } from '@/hooks/admin/useStoreLogic';
import { GenerateQRModal } from '@/components/admin/modals/generate-qr-modal';
import type { Store } from '@/lib/types/store';

interface StoresTabProps {
  companyId: string;
}

export default function StoresTab({ companyId }: StoresTabProps) {
  const { stores, loading, loadStores, deleteStore } = useStoreLogic({ companyId });
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  useEffect(() => {
    if (companyId) {
      loadStores();
    }
  }, [companyId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <StoreIcon className="w-5 h-5" />
              매장 관리
            </CardTitle>
            <CardDescription>매장 등록 및 정보 수정</CardDescription>
          </div>
          <Button>+ 매장 추가</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : stores.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <StoreIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>등록된 매장이 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>매장명</TableHead>
                <TableHead>브랜드</TableHead>
                <TableHead>주소</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>{store.managerName || '-'}</TableCell>
                  <TableCell>{store.address || '-'}</TableCell>
                  <TableCell>
                    <Badge>{store.isActive ? '활성' : '비활성'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedStore(store);
                          setShowQRModal(true);
                        }}
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        QR
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteStore(store.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* QR 코드 생성 모달 */}
      {selectedStore && (
        <GenerateQRModal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedStore(null);
          }}
          store={selectedStore}
          onSuccess={() => {
            loadStores(); // QR 저장 후 목록 새로고침
          }}
        />
      )}
    </Card>
  );
}
