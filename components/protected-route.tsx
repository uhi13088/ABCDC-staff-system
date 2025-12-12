'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { User } from '@/lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: User['role'][];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // 로그인하지 않은 경우
      if (!user) {
        router.push(redirectTo);
        return;
      }

      // 역할 기반 접근 제어
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, loading, allowedRoles, redirectTo, router]);

  // 로딩 중
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 (리다이렉트 대기)
  if (!user) {
    return null;
  }

  // 역할 권한이 없는 경우 (리다이렉트 대기)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  // 정상적으로 접근 가능
  return <>{children}</>;
}
