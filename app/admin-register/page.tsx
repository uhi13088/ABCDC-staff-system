'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, UserPlus, AlertCircle, Building2, User } from 'lucide-react';

export default function AdminRegisterPage() {
  const router = useRouter();
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    // 개인정보
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birth: '',
    address: '',
    // 회사정보
    companyName: '',
    businessNumber: '', // 선택
    companyPhone: '',   // 선택
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // HTML의 generateCompanyId 함수 이식
  const generateCompanyId = (name: string) => {
    // 회사명의 앞 3글자(영문/한글만) + 연도 + 랜덤
    const prefix = name.replace(/[^a-zA-Z가-힣]/g, '').substring(0, 3).toUpperCase() || 'ABC';
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${year}-${random}`;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 유효성 검사
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }
    if (formData.birth.length !== 6 || isNaN(Number(formData.birth))) {
      setError('주민등록번호(생년월일)는 6자리 숫자여야 합니다.');
      setLoading(false);
      return;
    }

    let user = null;
    try {
      // 1. Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      user = userCredential.user;

      // 2. Company ID 생성
      const companyId = generateCompanyId(formData.companyName);

      // 🆕 3. Firestore Batch Write (원자성 보장)
      // Companies + Users를 하나의 트랜잭션으로 처리 → "닭과 달걀" 문제 해결
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // 3-1. Companies 문서 생성
      const companyRef = doc(db, 'companies', companyId);
      batch.set(companyRef, {
        companyId: companyId,
        companyName: formData.companyName,
        businessNumber: formData.businessNumber || '',
        phone: formData.companyPhone || '',
        email: formData.email,
        address: '', // 회사 주소는 추후 입력 (HTML 로직 따름)
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        // 🎯 구독(Subscription) 정보 초기화 (HTML 로직 동일)
        subscription: {
          planType: 'free',
          status: 'active',
          maxUsers: 5,
          startedAt: serverTimestamp(),
          nextBillingDate: null
        }
      });

      // 3-2. Users 문서 생성
      const userRef = doc(db, 'users', user.uid);
      batch.set(userRef, {
        uid: user.uid,
        email: formData.email,
        name: formData.displayName,
        displayName: formData.displayName,
        phone: formData.phone,
        birth: formData.birth,     // 주민번호
        address: formData.address, // 개인 주소
        role: 'admin',
        companyId: companyId,
        companyName: formData.companyName,
        storeId: null,
        store: null,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3-3. Batch 커밋 (원자적 실행)
      await batch.commit();

      // 5. 프로필 업데이트
      await updateProfile(user, { displayName: formData.displayName });

      alert('✅ 관리자 계정이 생성되었습니다! 로그인 페이지로 이동합니다.');
      router.push('/admin-login');

    } catch (err) {
      console.error('Registration error:', err);
      
      // 🚨 Rollback: Firestore 쓰기 실패 시 Auth 계정 삭제
      if (user && err.code !== 'auth/email-already-in-use' && err.code !== 'auth/weak-password') {
        try {
          await user.delete();
          console.log('🔄 Rollback: Orphan Auth 계정 삭제 완료');
        } catch (deleteErr) {
          console.error('❌ Rollback 실패:', deleteErr);
        }
      }
      
      let msg = '가입 중 오류가 발생했습니다.';
      if (err.code === 'auth/email-already-in-use') msg = '이미 사용 중인 이메일입니다.';
      if (err.code === 'auth/weak-password') msg = '비밀번호는 6자 이상이어야 합니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-8">
      <Card className="w-full max-w-xl shadow-lg border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-md">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">관리자 회원가입</CardTitle>
          <CardDescription>
            회사 관리자로 가입하고 직원 관리 시스템을 시작하세요<br/>
            <span className="text-blue-600 font-medium">초대코드 없이 바로 가입 가능합니다</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <strong>💡 관리자 가입 안내</strong><br/>
            회사명과 기본 정보만 입력하시면 됩니다. 사업자등록번호 등은 나중에 수정 가능합니다.
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* 섹션 1: 개인정보 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <User className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-800">개인정보</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">이름 <span className="text-red-500">*</span></Label>
                  <Input id="displayName" placeholder="홍길동" required value={formData.displayName} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth">주민등록번호 <span className="text-red-500">*</span></Label>
                  <Input id="birth" placeholder="생년월일 6자리 (예: 901225)" maxLength={6} required value={formData.birth} onChange={handleChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">전화번호 <span className="text-red-500">*</span></Label>
                <Input id="phone" type="tel" placeholder="010-1234-5678" required value={formData.phone} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">주소 <span className="text-red-500">*</span></Label>
                <Input id="address" placeholder="경기도 부천시..." required value={formData.address} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일 <span className="text-red-500">*</span></Label>
                <Input id="email" type="email" placeholder="admin@company.com" required value={formData.email} onChange={handleChange} />
                <p className="text-xs text-slate-500">로그인 시 사용할 아이디입니다.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호 <span className="text-red-500">*</span></Label>
                  <Input id="password" type="password" placeholder="6자 이상" required value={formData.password} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">비밀번호 확인 <span className="text-red-500">*</span></Label>
                  <Input id="confirmPassword" type="password" placeholder="비밀번호 재입력" required value={formData.confirmPassword} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* 섹션 2: 회사정보 */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-800">회사정보</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">회사명 <span className="text-red-500">*</span></Label>
                <Input id="companyName" placeholder="ABC 디저트 센터" required value={formData.companyName} onChange={handleChange} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessNumber">사업자등록번호 <span className="text-slate-400 font-normal">(선택)</span></Label>
                  <Input id="businessNumber" placeholder="123-45-67890" value={formData.businessNumber} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">회사 전화번호 <span className="text-slate-400 font-normal">(선택)</span></Label>
                  <Input id="companyPhone" placeholder="02-1234-5678" value={formData.companyPhone} onChange={handleChange} />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg mt-4" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : '회원가입 완료'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6 bg-slate-50/50">
          <div className="text-sm text-slate-500 space-y-2 text-center">
            <div>
              이미 계정이 있으신가요?{' '}
              <Link href="/admin-login" className="text-blue-600 font-semibold hover:underline">
                로그인하기
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
