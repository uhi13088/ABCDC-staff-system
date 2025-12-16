'use client';

/**
 * Contract Signature Page
 * 계약서 서명 페이지 (React 변환)
 * Phase J: Legacy HTML → React 변환
 * 
 * ✅ Firebase Hosting (Static Export) 대응:
 * - Query Parameter 방식으로 변경 (/contract-sign?id=xxx)
 * - useSearchParams로 ID 추출
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { TimestampInput } from '@/lib/utils/timestamp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckCircle2, FileText, Loader2, X } from 'lucide-react';

interface ContractData {
  id: string;
  companyId: string;
  companyName: string;
  userId: string;
  employeeName: string;
  employeeBirth: string;
  employeePhone?: string;
  employeeAddress?: string;
  storeId?: string;
  storeName?: string;
  contractType: string;
  jobPosition?: string;
  workPlace?: string;
  contractStartDate: string;
  contractEndDate?: string;
  workDays?: string[];
  workStartTime?: string;
  workEndTime?: string;
  breakTime?: number;
  salaryType: string;
  monthlySalary?: number;
  hourlyWage?: number;
  bonusType?: string;
  bonusAmount?: number;
  insuranceType?: string;
  createdAt: TimestampInput;
  isSigned: boolean;
  signedAt?: TimestampInput;
  signedBy?: string;
  signatureData?: string;
}

function ContractSignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractId = searchParams.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [agreed, setAgreed] = useState(false);

  const signatureRef = useRef<SignatureCanvas>(null);

  // 계약서 데이터 로드
  useEffect(() => {
    loadContract();
  }, [contractId]);

  async function loadContract() {
    try {
      setLoading(true);
      setError('');

      if (!contractId) {
        throw new Error('계약서 ID가 없습니다');
      }

      const docRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('계약서를 찾을 수 없습니다');
      }

      const data = {
        id: docSnap.id,
        ...docSnap.data(),
      } as ContractData;

      // 이미 서명된 계약서인지 확인
      if (data.isSigned) {
        setSuccess(true);
      }

      setContract(data);
    } catch (err) {
      console.error('계약서 로드 실패:', err);
      setError(err.message || '계약서를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  // 서명 초기화
  function handleClear() {
    signatureRef.current?.clear();
  }

  // 계약서 서명 제출
  async function handleSubmit() {
    try {
      // 검증
      if (!agreed) {
        alert('계약 내용에 동의해주세요');
        return;
      }

      if (signatureRef.current?.isEmpty()) {
        alert('서명을 해주세요');
        return;
      }

      setSubmitting(true);
      setError('');

      // 서명 데이터 추출
      const signatureData = signatureRef.current?.toDataURL('image/png');

      // Firestore 업데이트
      const docRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
      await updateDoc(docRef, {
        isSigned: true,
        signedAt: serverTimestamp(),
        signedBy: contract?.employeeName,
        signatureData: signatureData,
        status: '서명완료',
      });

      setSuccess(true);
      
      // 3초 후 자동으로 직원 대시보드로 이동
      setTimeout(() => {
        router.push('/employee-dashboard?tab=contracts');
      }, 3000);

    } catch (err) {
      console.error('서명 제출 실패:', err);
      setError(err.message || '서명 제출에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-gray-600">계약서를 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 에러 발생
  if (error && !contract) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-red-100 rounded-full">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">오류 발생</h2>
              <p className="text-gray-600">{error}</p>
              <Button 
                onClick={() => router.push('/employee-dashboard')}
                variant="outline"
              >
                직원 대시보드로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 서명 완료
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">서명 완료!</h2>
              <p className="text-gray-600">
                계약서 서명이 완료되었습니다.<br/>
                잠시 후 직원 대시보드로 이동합니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 메인 계약서 서명 화면
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 헤더 */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-blue-600">
              <FileText className="inline-block mr-2 h-8 w-8" />
              계약서 서명
            </CardTitle>
            <p className="text-gray-600 mt-2">
              아래 계약 내용을 확인하시고 서명해주세요
            </p>
          </CardHeader>
        </Card>

        {/* 계약서 미리보기 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl tracking-[8px]">
              {contract?.contractType || '근로'} 계약서
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <th className="border border-gray-300 bg-gray-50 p-3 w-1/3 text-left font-semibold">
                    회사명
                  </th>
                  <td className="border border-gray-300 p-3">{contract?.companyName}</td>
                </tr>
                <tr>
                  <th className="border border-gray-300 bg-gray-50 p-3 text-left font-semibold">
                    직원명
                  </th>
                  <td className="border border-gray-300 p-3">{contract?.employeeName}</td>
                </tr>
                <tr>
                  <th className="border border-gray-300 bg-gray-50 p-3 text-left font-semibold">
                    생년월일
                  </th>
                  <td className="border border-gray-300 p-3">{contract?.employeeBirth}</td>
                </tr>
                {contract?.storeName && (
                  <tr>
                    <th className="border border-gray-300 bg-gray-50 p-3 text-left font-semibold">
                      근무지
                    </th>
                    <td className="border border-gray-300 p-3">{contract.storeName}</td>
                  </tr>
                )}
                <tr>
                  <th className="border border-gray-300 bg-gray-50 p-3 text-left font-semibold">
                    계약 기간
                  </th>
                  <td className="border border-gray-300 p-3">
                    {contract?.contractStartDate} ~ {contract?.contractEndDate || '상시'}
                  </td>
                </tr>
                <tr>
                  <th className="border border-gray-300 bg-gray-50 p-3 text-left font-semibold">
                    근무 시간
                  </th>
                  <td className="border border-gray-300 p-3">
                    {contract?.workStartTime} ~ {contract?.workEndTime}
                    {contract?.breakTime && ` (휴게 ${contract.breakTime}분)`}
                  </td>
                </tr>
                <tr>
                  <th className="border border-gray-300 bg-gray-50 p-3 text-left font-semibold">
                    급여
                  </th>
                  <td className="border border-gray-300 p-3">
                    {contract?.salaryType === 'monthly' 
                      ? `월급 ${contract?.monthlySalary?.toLocaleString()}원`
                      : `시급 ${contract?.hourlyWage?.toLocaleString()}원`
                    }
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* 서명 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">전자 서명</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 서명 정보 */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-1">
              <p className="text-sm text-gray-700">
                <strong>서명자:</strong> {contract?.employeeName}
              </p>
              <p className="text-sm text-gray-700">
                <strong>생년월일:</strong> {contract?.employeeBirth}
              </p>
            </div>

            {/* 동의 체크박스 */}
            <div className="flex items-start space-x-2 bg-gray-50 p-4 rounded-lg">
              <Checkbox 
                id="agree" 
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked as boolean)}
              />
              <Label 
                htmlFor="agree" 
                className="text-sm cursor-pointer leading-relaxed"
              >
                위 계약 내용을 확인하였으며 이에 동의합니다.
              </Label>
            </div>

            {/* 서명 캔버스 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                아래 박스 안에 서명해주세요
              </Label>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 600,
                    height: 200,
                    className: 'w-full h-[200px] cursor-crosshair'
                  }}
                  backgroundColor="white"
                />
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClear}
                className="flex-1"
                disabled={submitting}
              >
                다시 작성
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!agreed || submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    제출 중...
                  </>
                ) : (
                  '서명 완료'
                )}
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Suspense boundary로 감싸기 (useSearchParams 필수)
export default function ContractSignPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">계약서 로딩 중...</p>
        </div>
      </div>
    }>
      <ContractSignContent />
    </Suspense>
  );
}
