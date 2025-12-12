'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // 초기 로드 시 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem('admin_saved_email');
    const savedRemember = localStorage.getItem('admin_remember_me');
    if (savedRemember === 'true' && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('이메일과 비밀번호를 모두 입력해주세요.');
      }

      // 1. Firebase 로그인 시도
      await signIn(email, password);
      
      // 2. 추가 권한 체크 등은 AuthContext 내부 혹은 여기서 수행 가능
      // (현재는 AuthContext가 세션 관리를 담당하므로 바로 이동)

      // 3. 아이디 저장 처리
      if (rememberMe) {
        localStorage.setItem('admin_saved_email', email);
        localStorage.setItem('admin_remember_me', 'true');
      } else {
        localStorage.removeItem('admin_saved_email');
        localStorage.removeItem('admin_remember_me');
      }

      // 4. 대시보드로 이동
      router.push('/admin-dashboard');

    } catch (err: any) {
      console.error('Login failed:', err);
      let message = '로그인 중 오류가 발생했습니다.';
      
      if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/user-not-found')) {
        message = '이메일 또는 비밀번호가 일치하지 않습니다.';
      } else if (err.message.includes('auth/too-many-requests')) {
        message = '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
      } else {
         message = err.message;
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-md">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">맛남살롱</CardTitle>
          <CardDescription>관리자 시스템에 접속하세요</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="focus-visible:ring-blue-600"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="focus-visible:ring-blue-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm font-normal text-slate-500 cursor-pointer">
                  아이디 기억하기
                </Label>
              </div>
              <button type="button" className="text-xs text-slate-500 hover:text-red-500 underline transition-colors" onClick={() => {
                localStorage.removeItem('admin_saved_email');
                localStorage.removeItem('admin_remember_me');
                setEmail('');
                setRememberMe(false);
                alert('저장된 정보가 삭제되었습니다.');
              }}>
                기록 삭제
              </button>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center border-t p-4 mt-2">
          <div className="text-sm text-slate-500">
            계정이 없으신가요?{' '}
            <Link href="/admin-register" className="text-blue-600 font-semibold hover:underline">
              관리자 가입 신청
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
