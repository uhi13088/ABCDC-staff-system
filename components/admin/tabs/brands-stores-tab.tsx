/**
 * 브랜드/매장 관리 통합 탭
 * 백업: admin-dashboard.html 라인 534-609 (브랜드), 470-472 (매장)
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Building2, Store, Plus, Edit, Trash2, Tag } from 'lucide-react';
import { useBrandsLogic } from '@/hooks/admin/useBrandsLogic';
import { useStoresLogic } from '@/hooks/admin/useStoresLogic';
import { BrandFormModal, BrandFormData } from '@/components/admin/modals/brand-form-modal';
import { StoreFormModal, StoreFormData } from '@/components/admin/modals/store-form-modal';
import { safeToLocaleDateString } from '@/lib/utils/timestamp';

interface BrandsStoresTabProps {
  companyId: string;
}

export function BrandsStoresTab({ companyId }: BrandsStoresTabProps) {
  // 브랜드 로직
  const {
    brands,
    loading: brandsLoading,
    loadBrands,
    addBrand,
    updateBrand,
    deleteBrand,
  } = useBrandsLogic({ companyId });

  // 매장 로직
  const {
    stores,
    loading: storesLoading,
    loadStores,
    addStore,
    updateStore,
    deleteStore,
  } = useStoresLogic({ companyId });

  // 브랜드 모달
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandFormData | undefined>(undefined);

  // 매장 모달
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreFormData | undefined>(undefined);

  useEffect(() => {
    if (companyId) {
      loadBrands();
      loadStores();
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

  /**
   * 브랜드 추가
   */
  const handleAddBrand = () => {
    setSelectedBrand(undefined);
    setBrandModalOpen(true);
  };

  /**
   * 브랜드 수정
   */
  const handleEditBrand = (brand: any) => {
    setSelectedBrand({
      id: brand.id,
      name: brand.name,
      description: brand.description,
      logoUrl: brand.logoUrl,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
    });
    setBrandModalOpen(true);
  };

  /**
   * 브랜드 저장
   */
  const handleSaveBrand = async (data: BrandFormData) => {
    if (data.id) {
      await updateBrand(data.id, data);
    } else {
      await addBrand(data);
    }
    setBrandModalOpen(false);
  };

  /**
   * 브랜드 삭제
   */
  const handleDeleteBrand = async () => {
    if (selectedBrand?.id) {
      await deleteBrand(selectedBrand.id);
      setBrandModalOpen(false);
    }
  };

  /**
   * 매장 추가
   */
  const handleAddStore = () => {
    setSelectedStore(undefined);
    setStoreModalOpen(true);
  };

  /**
   * 매장 수정
   */
  const handleEditStore = (store: any) => {
    setSelectedStore({
      id: store.id,
      name: store.name,
      brandId: store.brandId,
      companyId: store.companyId,
      address: store.address,
      phone: store.phone,
      ceo: store.ceo,
      businessNumber: store.businessNumber,
      
      salaryPaymentDay: store.salaryPaymentDay,
      salaryCalculationType: store.salaryCalculationType,
      calculationStartMonth: store.calculationStartMonth,
      calculationStartDay: store.calculationStartDay,
      calculationEndMonth: store.calculationEndMonth,
      calculationEndDay: store.calculationEndDay,
      
      overtimeAllowance: store.overtimeAllowance,
      nightAllowance: store.nightAllowance,
      holidayAllowance: store.holidayAllowance,
      
      openTime: store.openTime,
      closeTime: store.closeTime,
      
      earlyClockInThreshold: store.earlyClockInThreshold,
      earlyClockOutThreshold: store.earlyClockOutThreshold,
    });
    setStoreModalOpen(true);
  };

  /**
   * 매장 저장
   */
  const handleSaveStore = async (data: StoreFormData) => {
    if (data.id) {
      await updateStore(data.id, data);
    } else {
      await addStore(data);
    }
    setStoreModalOpen(false);
  };

  /**
   * 매장 삭제
   */
  const handleDeleteStore = async () => {
    if (selectedStore?.id) {
      await deleteStore(selectedStore.id);
      setStoreModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="brands" className="gap-2">
            <Tag className="w-4 h-4" />
            브랜드 관리
          </TabsTrigger>
          <TabsTrigger value="stores" className="gap-2">
            <Store className="w-4 h-4" />
            매장 관리
          </TabsTrigger>
        </TabsList>

        {/* ========== 브랜드 관리 탭 ========== */}
        <TabsContent value="brands" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                브랜드 관리
              </CardTitle>
              <Button onClick={handleAddBrand} className="gap-2">
                <Plus className="w-4 h-4" />
                브랜드 추가
              </Button>
            </CardHeader>
            <CardContent>
              {brandsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : brands.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">등록된 브랜드가 없습니다.</p>
                  <Button onClick={handleAddBrand} variant="outline" className="mt-4">
                    첫 브랜드 추가하기
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>로고</TableHead>
                      <TableHead>브랜드명</TableHead>
                      <TableHead>설명</TableHead>
                      <TableHead>색상</TableHead>
                      <TableHead>매장 수</TableHead>
                      <TableHead>등록일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell>
                          {brand.logoUrl ? (
                            <img
                              src={brand.logoUrl}
                              alt={brand.name}
                              className="w-16 h-8 object-contain rounded"
                            />
                          ) : (
                            <div className="w-16 h-8 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400">
                              로고 없음
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{brand.name}</TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                          {brand.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: brand.primaryColor || '#4CAF50' }}
                              title={`주 색상: ${brand.primaryColor || '#4CAF50'}`}
                            />
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: brand.secondaryColor || '#2196F3' }}
                              title={`보조 색상: ${brand.secondaryColor || '#2196F3'}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{brand.storeCount || 0}개</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {safeToLocaleDateString(brand.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditBrand(brand)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setSelectedBrand({
                                  id: brand.id,
                                  name: brand.name,
                                  description: brand.description,
                                  logoUrl: brand.logoUrl,
                                  primaryColor: brand.primaryColor,
                                  secondaryColor: brand.secondaryColor,
                                });
                                handleDeleteBrand();
                              }}
                            >
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
          </Card>
        </TabsContent>

        {/* ========== 매장 관리 탭 ========== */}
        <TabsContent value="stores" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                매장 관리
              </CardTitle>
              <Button onClick={handleAddStore} className="gap-2">
                <Plus className="w-4 h-4" />
                매장 추가
              </Button>
            </CardHeader>
            <CardContent>
              {storesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : stores.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">등록된 매장이 없습니다.</p>
                  <Button onClick={handleAddStore} variant="outline" className="mt-4">
                    첫 매장 추가하기
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>매장명</TableHead>
                      <TableHead>브랜드</TableHead>
                      <TableHead>주소</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>급여 지급일</TableHead>
                      <TableHead>등록일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>
                          {store.brandName ? (
                            <Badge variant="outline">{store.brandName}</Badge>
                          ) : (
                            <span className="text-sm text-slate-400">기본 브랜드</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                          {store.address || '-'}
                        </TableCell>
                        <TableCell className="text-sm">{store.phone || '-'}</TableCell>
                        <TableCell>
                          {store.salaryPaymentDay ? (
                            <Badge>매월 {store.salaryPaymentDay}일</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {safeToLocaleDateString(store.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditStore(store)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setSelectedStore({
                                  id: store.id,
                                  name: store.name,
                                  brandId: store.brandId,
                                  companyId: store.companyId,
                                });
                                handleDeleteStore();
                              }}
                            >
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
          </Card>
        </TabsContent>
      </Tabs>

      {/* 브랜드 모달 */}
      <BrandFormModal
        open={brandModalOpen}
        onClose={() => setBrandModalOpen(false)}
        onSave={handleSaveBrand}
        onDelete={selectedBrand ? handleDeleteBrand : undefined}
        brand={selectedBrand}
      />

      {/* 매장 모달 */}
      <StoreFormModal
        open={storeModalOpen}
        onClose={() => setStoreModalOpen(false)}
        onSave={handleSaveStore}
        onDelete={selectedStore ? handleDeleteStore : undefined}
        store={selectedStore}
        brands={brands}
        companyId={companyId}
      />
    </div>
  );
}
