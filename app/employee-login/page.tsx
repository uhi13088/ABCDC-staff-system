'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, UserCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EmployeeLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Firebase 인증
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Firestore에서 사용자 정보 확인
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid))
      
      if (!userDoc.exists()) {
        throw new Error('사용자 정보를 찾을 수 없습니다.')
      }

      const userData = userDoc.data()

      // 직원 권한 확인
      if (userData.role !== 'employee') {
        throw new Error('직원 계정으로만 로그인할 수 있습니다.')
      }

      // "로그인 유지" 처리
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
        localStorage.setItem('lastEmail', email)
      } else {
        localStorage.removeItem('rememberMe')
        localStorage.removeItem('lastEmail')
      }

      // 직원 대시보드로 이동
      router.push('/employee-dashboard')
    } catch (err) {
      console.error('로그인 에러:', err)
      
      // Firebase 에러 메시지 한글화
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else if (err.code === 'auth/user-not-found') {
        setError('등록되지 않은 이메일입니다.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.')
      } else {
        setError(err.message || '로그인 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 "로그인 유지" 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const remembered = localStorage.getItem('rememberMe')
      const lastEmail = localStorage.getItem('lastEmail')
      
      if (remembered === 'true' && lastEmail) {
        setEmail(lastEmail)
        setRememberMe(true)
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <UserCircle className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">직원 로그인</CardTitle>
          <CardDescription>
            맛남살롱 직원 포털에 오신 것을 환영합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* 에러 메시지 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* 로그인 유지 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-normal cursor-pointer"
              >
                로그인 유지
              </Label>
            </div>

            {/* 초대 코드 (선택) */}
            <div className="space-y-2">
              <Label htmlFor="inviteCode">
                초대 코드 <span className="text-gray-400 text-xs">(선택사항)</span>
              </Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="초대 코드를 입력하세요"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* 로그인 버튼 */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </Button>
          </form>

          {/* 추가 링크 */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              관리자이신가요?{' '}
              <button
                onClick={() => router.push('/admin-login')}
                className="text-blue-600 hover:underline font-medium"
              >
                관리자 로그인
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
