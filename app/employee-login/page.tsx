'use client';

/**
 * 직원 로그인 페이지
 * 기존 employee-login.html의 로직 보존 + Shadcn/UI Zinc 테마
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function EmployeeLoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      
      // 로그인 성공 시 직원 대시보드로 이동
      router.push('/employee');
    } catch (error: any) {
      console.error('로그인 실패:', error);
      setError(error.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-blue-600 p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">직원 로그인</CardTitle>
          <CardDescription className="text-center">
            ABC Staff System 직원 계정으로 로그인하세요
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </Button>

            <div className="text-sm text-center text-zinc-600 space-y-2">
              <p>
                초대 코드가 있으신가요?{' '}
                <Link 
                  href="/employee-register" 
                  className="text-blue-600 font-medium hover:underline"
                >
                  회원가입
                </Link>
              </p>
              <p>
                <Link 
                  href="/" 
                  className="text-zinc-600 hover:text-zinc-900 hover:underline"
                >
                  ← 홈으로 돌아가기
                </Link>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
