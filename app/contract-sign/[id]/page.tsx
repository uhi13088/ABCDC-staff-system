/**
 * 계약서 서명 페이지
 * 백업: /home/user/webapp-backup/contract-sign.html
 * 백업: /home/user/webapp-backup/js/contract-sign.js
 * 
 * 기능:
 * 1. URL 파라미터에서 contractId 추출
 * 2. Firestore에서 계약서 데이터 로드 (contracts → signedContracts 확인)
 * 3. 계약서 내용 표시
 * 4. Canvas 기반 서명 패드
 * 5. 서명 완료 후 Firestore signedContracts 저장
 * 6. 서명 완료된 계약서는 읽기 전용 표시
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ContractData {
  // 표준 필드 (FIELD_NAMING_STANDARD.md)
  userId: string;
  companyId: string;
  storeId: string;
  storeName?: string;
  employeeName: string;
  employeeBirth: string;
  employeeAddress?: string;
  employeePhone?: string;
  
  // 회사 정보
  companyName: string;
  companyCEO?: string;
  companyBusinessNumber?: string;
  companyPhone?: string;
  companyAddress?: string;
  
  // 계약 정보
  contractType: string;
  startDate: string;
  endDate?: string;
  position?: string;
  
  // 근무 조건
  workDays?: string;
  workTime?: string;
  breakTime?: string;
  
  // 급여 조건 (표준 필드)
  salaryType: string;
  salaryAmount: number;
  salaryPaymentDay?: string;
  paymentMethod?: string;
  
  // 계약서 본문
  content?: string;
  contractDate?: string;
  
  // 서명 정보
  signature?: string;
  signedAt?: string;
  status?: string;
}

export default function ContractSignPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  
  // 계약서 데이터 로드
  useEffect(() => {
    if (!contractId) {
      setError('유효하지 않은 계약서 링크입니다.');
      setLoading(false);
      return;
    }
    
    loadContractData();
  }, [contractId]);
  
  const loadContractData = async () => {
    try {
      console.log('📥 계약서 데이터 로드 시작:', contractId);
      
      // 1. 서명 완료 여부 확인
      const signedDocRef = doc(db, COLLECTIONS.SIGNED_CONTRACTS, contractId);
      const signedDocSnap = await getDoc(signedDocRef);
      
      if (signedDocSnap.exists()) {
        // 서명 완료된 계약서
        const data = signedDocSnap.data() as ContractData;
        console.log('✅ 서명 완료된 계약서:', data.employeeName);
        setContractData(data);
        setIsSigned(true);
        setLoading(false);
        return;
      }
      
      // 2. 서명되지 않은 계약서 - contracts 컬렉션에서 가져오기
      const docRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as ContractData;
        console.log('✅ 서명 대기 계약서:', data.employeeName);
        setContractData(data);
        setIsSigned(false);
        setLoading(false);
        return;
      }
      
      // 3. 계약서를 찾을 수 없음
      setError(`계약서를 찾을 수 없습니다. (ID: ${contractId})`);
      setLoading(false);
    } catch (err: any) {
      console.error('❌ 계약서 로드 오류:', err);
      setError('계약서를 불러오는 중 오류가 발생했습니다: ' + err.message);
      setLoading(false);
    }
  };
  
  // 서명 패드 초기화
  useEffect(() => {
    if (!canvasRef.current || isSigned) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    console.log('✅ 서명 패드 초기화 완료');
  }, [isSigned]);
  
  // 서명 그리기 시작
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSigned) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setHasSignature(true);
  };
  
  // 서명 그리기
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isSigned) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  
  // 서명 그리기 종료
  const stopDrawing = () => {
    isDrawingRef.current = false;
  };
  
  // 서명 지우기
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };
  
  // 서명 제출
  const submitSignature = async () => {
    if (!agreed) {
      alert('⚠️ 계약서 내용에 동의해주세요.');
      return;
    }
    
    if (!hasSignature) {
      alert('⚠️ 서명을 그려주세요.');
      return;
    }
    
    if (!contractData) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setSubmitting(true);
    
    try {
      // 서명 이미지 데이터
      const signatureData = canvas.toDataURL('image/png');
      
      // 서명된 계약서 데이터 (표준 필드 사용)
      const signedContract: ContractData = {
        ...contractData,
        // ✅ 표준 필드 보장 (FIELD_NAMING_STANDARD.md)
        userId: contractData.userId,
        signature: signatureData,
        signedAt: new Date().toISOString(),
        status: 'signed',
      };
      
      // Firestore signedContracts 컬렉션에 저장
      await setDoc(doc(db, COLLECTIONS.SIGNED_CONTRACTS, contractId), signedContract);
      
      console.log('✅ 서명 완료:', contractId);
      
      // 서명 완료 상태로 전환
      setContractData(signedContract);
      setIsSigned(true);
      setSubmitting(false);
      
      // 상단으로 스크롤
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error('❌ 서명 저장 실패:', err);
      alert('서명 저장에 실패했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  };
  
  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="mb-4">
              <Skeleton className="h-8 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
            <p className="text-slate-600">계약서를 불러오는 중...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // 에러
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">오류 발생</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button onClick={() => router.back()} variant="outline">
              ← 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!contractData) return null;
  
  // 서명 완료된 계약서 (읽기 전용)
  if (isSigned) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 헤더 */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-2xl text-green-900">✅ 서명 완료</CardTitle>
              <p className="text-green-700 mt-2">
                이 계약서는 <strong>{contractData.signedAt ? new Date(contractData.signedAt).toLocaleString('ko-KR') : '-'}</strong>에 서명이 완료되었습니다.
              </p>
            </CardHeader>
          </Card>
          
          {/* 계약서 미리보기 */}
          <ContractPreview data={contractData} />
          
          {/* 서명 이미지 */}
          {contractData.signature && (
            <Card>
              <CardHeader>
                <CardTitle>직원 서명</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <img 
                  src={contractData.signature} 
                  alt="서명" 
                  className="max-w-sm mx-auto border-2 border-green-300 rounded-lg bg-white p-4"
                />
              </CardContent>
            </Card>
          )}
          
          {/* 돌아가기 버튼 */}
          <div className="text-center">
            <Button onClick={() => router.back()} variant="outline" size="lg">
              ← 돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // 서명 대기 계약서
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-blue-600">📝 계약서 서명</CardTitle>
            <p className="text-slate-600 mt-2">
              계약서 내용을 확인하시고 서명해주세요
            </p>
          </CardHeader>
        </Card>
        
        {/* 계약서 미리보기 */}
        <ContractPreview data={contractData} />
        
        {/* 서명 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>✍️ 서명하기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 서명자 정보 */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">서명자 정보</p>
              <p className="font-semibold">
                {contractData.employeeName} (생년월일: {contractData.employeeBirth})
              </p>
            </div>
            
            {/* 동의 체크박스 */}
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
              <Checkbox 
                id="agree" 
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <label 
                htmlFor="agree" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                위 계약 내용을 확인하였으며, 이에 동의합니다.
              </label>
            </div>
            
            {/* 서명 패드 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">
                  서명을 그려주세요
                </label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearSignature}
                  disabled={!hasSignature}
                >
                  지우기
                </Button>
              </div>
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full border-2 border-slate-300 rounded-lg bg-white cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
            
            {/* 제출 버튼 */}
            <div className="flex gap-4">
              <Button
                onClick={submitSignature}
                disabled={!agreed || !hasSignature || submitting}
                className="flex-1"
                size="lg"
              >
                {submitting ? '제출 중...' : '✅ 서명 제출'}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                size="lg"
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * 계약서 미리보기 컴포넌트
 */
function ContractPreview({ data }: { data: ContractData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl tracking-[0.5em]">근로계약서</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full border-collapse">
          <tbody>
            {/* 회사 정보 */}
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold w-1/3 border-r border-slate-200">
                회사명
              </th>
              <td className="p-3">{data.companyName || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                대표자
              </th>
              <td className="p-3">{data.companyCEO || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                사업자등록번호
              </th>
              <td className="p-3">{data.companyBusinessNumber || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                회사 전화번호
              </th>
              <td className="p-3">{data.companyPhone || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                회사 주소
              </th>
              <td className="p-3">{data.companyAddress || '-'}</td>
            </tr>
            
            {/* 직원 정보 */}
            <tr className="border-t-2 border-slate-400">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                직원명
              </th>
              <td className="p-3">{data.employeeName || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                생년월일
              </th>
              <td className="p-3">{data.employeeBirth || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                주소
              </th>
              <td className="p-3">{data.employeeAddress || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                전화번호
              </th>
              <td className="p-3">{data.employeePhone || '-'}</td>
            </tr>
            
            {/* 계약 정보 */}
            <tr className="border-t-2 border-slate-400">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                계약 시작일
              </th>
              <td className="p-3">{data.startDate || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                계약 종료일
              </th>
              <td className="p-3">{data.endDate || '기간의 정함이 없음'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                근무 매장
              </th>
              <td className="p-3">{data.storeName || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                직책
              </th>
              <td className="p-3">{data.position || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                근무 요일
              </th>
              <td className="p-3">{data.workDays || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                근무 시간
              </th>
              <td className="p-3">{data.workTime || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                휴게 시간
              </th>
              <td className="p-3">{data.breakTime || '-'}</td>
            </tr>
            
            {/* 급여 조건 */}
            <tr className="border-t-2 border-slate-400">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                급여 형태
              </th>
              <td className="p-3">{data.salaryType || '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                급여액
              </th>
              <td className="p-3">{data.salaryAmount ? data.salaryAmount.toLocaleString() + '원' : '-'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                지급일
              </th>
              <td className="p-3">{data.salaryPaymentDay || '매월 말일'}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <th className="bg-slate-50 p-3 text-left font-semibold border-r border-slate-200">
                지급 방법
              </th>
              <td className="p-3 border-b border-slate-200">{data.paymentMethod || '계좌이체'}</td>
            </tr>
          </tbody>
        </table>
        
        {/* 계약서 본문 */}
        {data.content && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold mb-3 text-slate-900">계약서 내용</h4>
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
              {data.content}
            </pre>
          </div>
        )}
        
        {/* 계약 날짜 */}
        {data.contractDate && (
          <div className="mt-6 text-center text-slate-700">
            <p className="font-medium">{data.contractDate}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
