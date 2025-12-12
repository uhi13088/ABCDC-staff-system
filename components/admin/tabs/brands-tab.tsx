'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag, Trash2 } from 'lucide-react';
import { useBrandLogic } from '@/hooks/admin/useBrandLogic';

interface BrandsTabProps {
  companyId: string;
}

export default function BrandsTab({ companyId }: BrandsTabProps) {
  const { brands, loading, loadBrands, deleteBrand } = useBrandLogic({ companyId });

  useEffect(() => {
    if (companyId) {
      loadBrands();
    }
  }, [companyId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Tag className="w-5 h-5" />
              브랜드 관리
            </CardTitle>
            <CardDescription>브랜드 등록 및 로고 관리</CardDescription>
          </div>
          <Button>+ 브랜드 추가</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : brands.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>등록된 브랜드가 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>브랜드명</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell>{brand.description || '-'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteBrand(brand.id)}>
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
