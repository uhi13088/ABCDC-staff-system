'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutDashboard, 
  ClipboardList, 
  DollarSign, 
  Calendar, 
  FileCheck, 
  Bell, 
  Megaphone, 
  User,
  LogOut
} from 'lucide-react'

// 탭 컴포넌트 (동적 import로 나중에 구현)
import DashboardTab from '@/components/employee/tabs/dashboard-tab'
import AttendanceTab from '@/components/employee/tabs/attendance-tab'
import SalaryTab from '@/components/employee/tabs/salary-tab'
import ScheduleTab from '@/components/employee/tabs/schedule-tab'
import ApprovalsTab from '@/components/employee/tabs/approvals-tab'
import NoticesTab from '@/components/employee/tabs/notices-tab'
import NotificationsTab from '@/components/employee/tabs/notifications-tab'
import ProfileTab from '@/components/employee/tabs/profile-tab'

interface EmployeeData {
  uid: string
  email: string
  name: string
  companyId: string
  storeId: string
  storeName: string
  role: string
}

interface TabCounts {
  notices: number
  approvals: number
  notifications: number
}

export default function EmployeeDashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [tabCounts, setTabCounts] = useState<TabCounts>({
    notices: 0,
    approvals: 0,
    notifications: 0
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // 로그인하지 않은 경우 로그인 페이지로 이동
        router.push('/employee-login')
        return
      }

      try {
        // Firestore에서 사용자 정보 가져오기
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid))
        
        if (!userDoc.exists()) {
          throw new Error('사용자 정보를 찾을 수 없습니다.')
        }

        const userData = userDoc.data()

        // 직원 권한 확인
        if (userData.role !== 'staff' && userData.role !== 'employee') {
          alert('직원 계정으로만 접근할 수 있습니다.')
          router.push('/employee-login')
          return
        }

        // 매장 정보 가져오기
        let storeName = '알 수 없음'
        if (userData.storeId) {
          const storeDoc = await getDoc(doc(db, COLLECTIONS.STORES, userData.storeId))
          if (storeDoc.exists()) {
            storeName = storeDoc.data().name
          }
        }

        setEmployeeData({
          uid: user.uid,
          email: user.email || '',
          name: userData.name || '직원',
          companyId: userData.companyId,
          storeId: userData.storeId,
          storeName: storeName,
          role: userData.role
        })
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error)
        alert('사용자 정보를 불러오는 중 오류가 발생했습니다.')
        router.push('/employee-login')
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  // 탭 카운트 로드
  useEffect(() => {
    if (employeeData) {
      loadTabCounts()
    }
  }, [employeeData])

  const loadTabCounts = async () => {
    if (!employeeData) return

    try {
      // 공지사항 개수 (전체)
      const noticesQuery = query(
        collection(db, COLLECTIONS.NOTICES),
        where('companyId', '==', employeeData.companyId)
      )
      const noticesSnapshot = await getDocs(noticesQuery)

      // 승인 대기 결재 개수
      const approvalsQuery = query(
        collection(db, COLLECTIONS.APPROVALS),
        where('userId', '==', employeeData.uid),
        where('status', '==', 'pending')
      )
      const approvalsSnapshot = await getDocs(approvalsQuery)

      // 읽지 않은 알림 개수
      const notificationsQuery = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('userId', '==', employeeData.uid),
        where('read', '==', false)
      )
      const notificationsSnapshot = await getDocs(notificationsQuery)

      setTabCounts({
        notices: noticesSnapshot.size,
        approvals: approvalsSnapshot.size,
        notifications: notificationsSnapshot.size
      })
    } catch (error) {
      console.error('탭 카운트 로드 실패:', error)
    }
  }

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      try {
        await auth.signOut()
        router.push('/employee-login')
      } catch (error) {
        console.error('로그아웃 실패:', error)
        alert('로그아웃 중 오류가 발생했습니다.')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!employeeData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {employeeData.name}님, 환영합니다
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                소속: <span className="font-medium">{employeeData.storeName}</span>
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-2">
            <TabsTrigger value="dashboard" className="flex flex-col items-center gap-1 py-3">
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs">대시보드</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex flex-col items-center gap-1 py-3">
              <ClipboardList className="w-5 h-5" />
              <span className="text-xs">출퇴근</span>
            </TabsTrigger>
            <TabsTrigger value="salary" className="flex flex-col items-center gap-1 py-3">
              <DollarSign className="w-5 h-5" />
              <span className="text-xs">급여</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex flex-col items-center gap-1 py-3">
              <Calendar className="w-5 h-5" />
              <span className="text-xs">스케줄</span>
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex flex-col items-center gap-1 py-3 relative">
              <FileCheck className="w-5 h-5" />
              <span className="text-xs">결재</span>
              {tabCounts.approvals > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs">
                  {tabCounts.approvals}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notices" className="flex flex-col items-center gap-1 py-3 relative">
              <Megaphone className="w-5 h-5" />
              <span className="text-xs">공지</span>
              {tabCounts.notices > 0 && (
                <Badge variant="default" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-blue-600">
                  {tabCounts.notices}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex flex-col items-center gap-1 py-3 relative">
              <Bell className="w-5 h-5" />
              <span className="text-xs">알림</span>
              {tabCounts.notifications > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs">
                  {tabCounts.notifications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col items-center gap-1 py-3">
              <User className="w-5 h-5" />
              <span className="text-xs">프로필</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab employeeData={employeeData} />
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceTab employeeData={employeeData} />
          </TabsContent>

          <TabsContent value="salary">
            <SalaryTab employeeData={employeeData} />
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleTab employeeData={employeeData} />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsTab employeeData={employeeData} />
          </TabsContent>

          <TabsContent value="notices">
            <NoticesTab employeeData={employeeData} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab employeeData={employeeData} />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab employeeData={employeeData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
