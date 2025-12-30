'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Eye } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { format } from 'date-fns';
import { ContractDetailModal } from '@/components/shared/contract-detail-modal';

interface ContractsTabProps {
  employeeData: {
    uid: string;
    companyId: string;
    name: string;
  };
}

interface Contract {
  id: string;
  contractType: string;
  position: string;
  startDate: any;
  endDate?: any;
  status: string;
  employeeSignedAt?: any;
  adminSignedAt?: any;
  createdAt: any;
}

export default function ContractsTab({ employeeData }: ContractsTabProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (employeeData) {
      loadContracts();
    }
  }, [employeeData]);

  const loadContracts = async () => {
    setIsLoading(true);
    try {
      const contractsQuery = query(
        collection(db, COLLECTIONS.CONTRACTS),
        where('companyId', '==', employeeData.companyId),
        where('userId', '==', employeeData.uid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(contractsQuery);
      const contractsList: Contract[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        contractsList.push({
          id: doc.id,
          ...data, // 모든 필드 포함
        } as Contract);
      });

      setContracts(contractsList);
      console.log(`✅ ${contractsList.length}개 계약서 로드 완료`);
    } catch (error) {
      console.error('❌ 계약서 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (contract: Contract) => {
    if (contract.employeeSignedAt && contract.adminSignedAt) {
      return <Badge className="bg-green-600">서명 완료</Badge>;
    } else if (contract.employeeSignedAt) {
      return <Badge className="bg-blue-600">관리자 서명 대기</Badge>;
    } else {
      return <Badge variant="destructive">서명 필요</Badge>;
    }
  };

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
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
                <FileText className="w-5 h-5" />
                내 계약서
              </CardTitle>
              <CardDescription>근로계약서 조회 및 서명</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>등록된 계약서가 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>계약 유형</TableHead>
                  <TableHead>직무/직책</TableHead>
                  <TableHead>계약 기간</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.contractType}</TableCell>
                    <TableCell>{contract.position}</TableCell>
                    <TableCell>
                      {contract.startDate?.toDate ? format(contract.startDate.toDate(), 'yyyy-MM-dd') : '-'}
                      {' ~ '}
                      {contract.endDate?.toDate ? format(contract.endDate.toDate(), 'yyyy-MM-dd') : '기간의 정함 없음'}
                    </TableCell>
                    <TableCell>{getStatusBadge(contract)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewContract(contract)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 계약서 상세 모달 */}
      {showDetailModal && selectedContract && (
        <ContractDetailModal
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          isEmployee={true}
          currentUserId={employeeData.uid}
          onSuccess={loadContracts}
        />
      )}
    </>
  );
}
