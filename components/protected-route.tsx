'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // 로그인하지 않은 경우
      if (!user) {
        // 무한 리다이렉트 방지: 이미 리다이렉트 대상 페이지에 있는 경우 리다이렉트하지 않음
        if (pathname !== redirectTo) {
          router.push(redirectTo);
        }
        return;
      }

      // 역할 기반 접근 제어
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        // 무한 리다이렉트 방지: 이미 unauthorized 페이지에 있는 경우 리다이렉트하지 않음
        if (pathname !== '/unauthorized') {
          router.push('/unauthorized');
        }
        return;
      }
    }
  }, [user, loading, allowedRoles, redirectTo, router, pathname]);

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
