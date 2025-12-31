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
  Megaphone, 
  User,
  LogOut,
  LogIn,
  QrCode,
  Clock,
  FileText,
  Users
} from 'lucide-react'
import { clockOut } from '@/services/attendanceService' // clockOut은 QR 스캐너에서 사용
import { format } from 'date-fns'
import { QRScanner } from '@/components/employee/qr-scanner'

// 탭 컴포넌트 (동적 import로 나중에 구현)
import DashboardTab from '@/components/employee/tabs/dashboard-tab'
import AttendanceTab from '@/components/employee/tabs/attendance-tab'
import SalaryTab from '@/components/employee/tabs/salary-tab'
import ScheduleTab from '@/components/employee/tabs/schedule-tab'
import ApprovalsTab from '@/components/employee/tabs/approvals-tab'
import NoticesTab from '@/components/employee/tabs/notices-tab'
import ProfileTab from '@/components/employee/tabs/profile-tab'
import ContractsTab from '@/components/employee/tabs/contracts-tab'
import StaffListTab from '@/components/employee/tabs/staff-list-tab'

interface EmployeeData {
  uid: string
  email: string
  name: string
  companyId: string
  storeId: string
  storeName: string
  role: string
  position?: string // 직무
}

interface TabCounts {
  notices: number
  approvals: number
}

export default function EmployeeDashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [tabCounts, setTabCounts] = useState<TabCounts>({
    notices: 0,
    approvals: 0
  })
  
  // 출퇴근 상태
  const [todayStatus, setTodayStatus] = useState<'not_clocked_in' | 'clocked_in' | 'clocked_out'>('not_clocked_in')
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null)
  const [isClocking, setIsClocking] = useState(false)
  
  // QR 스캔 모달
  const [qrScanOpen, setQrScanOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // 로그인하지 않은 경우 로그인 페이지로 이동
        router.push('/employee-login')
        return
      }

      try {
        // Firestore에서 사용자 정보 가져오기
        console.log('🔍 [직원 대시보드] 사용자 정보 조회 시작:', user.uid)
        
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid))
        console.log('✅ [직원 대시보드] 사용자 문서 조회 성공:', userDoc.exists())
        
        if (!userDoc.exists()) {
          throw new Error('사용자 정보를 찾을 수 없습니다.')
        }

        const userData = userDoc.data()
        console.log('✅ [직원 대시보드] 사용자 데이터:', { 
          role: userData.role, 
          storeId: userData.storeId, 
          companyId: userData.companyId 
        })

        // 직원 권한 확인
        if (userData.role !== 'staff' && userData.role !== 'employee') {
          alert('직원 계정으로만 접근할 수 있습니다.')
          router.push('/employee-login')
          return
        }

        // 매장 정보 가져오기
        let storeName = '알 수 없음'
        if (userData.storeId) {
          console.log('🔍 [직원 대시보드] 매장 정보 조회 시작:', userData.storeId)
          
          try {
            const storeDoc = await getDoc(doc(db, COLLECTIONS.STORES, userData.storeId))
            console.log('✅ [직원 대시보드] 매장 문서 조회 성공:', storeDoc.exists())
            
            if (storeDoc.exists()) {
              storeName = storeDoc.data().name
              console.log('✅ [직원 대시보드] 매장 이름:', storeName)
            } else {
              console.warn('⚠️ [직원 대시보드] 매장 문서가 존재하지 않음:', userData.storeId)
            }
          } catch (storeError) {
            console.error('❌ [직원 대시보드] 매장 정보 조회 실패:', storeError)
            // 매장 정보 조회 실패해도 계속 진행 (매장 이름만 "알 수 없음"으로 표시)
          }
        }

        setEmployeeData({
          uid: user.uid,
          email: user.email || '',
          name: userData.name || '직원',
          companyId: userData.companyId,
          storeId: userData.storeId,
          storeName: storeName,
          role: userData.role,
          position: userData.position // 직무
        })
        
        console.log('✅ [직원 대시보드] 사용자 정보 로드 완료')
      } catch (error) {
        console.error('❌ [직원 대시보드] 사용자 정보 로드 실패:', error)
        console.error('❌ [직원 대시보드] 에러 상세:', JSON.stringify(error, null, 2))
        alert(`사용자 정보를 불러오는 중 오류가 발생했습니다.\n\n${error.message || error}`)
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

      setTabCounts({
        notices: noticesSnapshot.size,
        approvals: approvalsSnapshot.size
      })
    } catch (error) {
      console.error('탭 카운트 로드 실패:', error)
    }
  }

  // 오늘 출퇴근 상태 로드
  useEffect(() => {
    if (employeeData) {
      loadTodayAttendance()
    }
  }, [employeeData])

  const loadTodayAttendance = async () => {
    if (!employeeData) return

    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const attendanceQuery = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('userId', '==', employeeData.uid),
        where('date', '==', today)
      )
      const snapshot = await getDocs(attendanceQuery)

      if (!snapshot.empty) {
        // 가장 최근 출퇴근 기록 찾기 (clockOut이 없는 기록 우선)
        let latestRecord = null
        let hasActiveRecord = false

        snapshot.forEach((doc) => {
          const data = doc.data()
          if (!data.clockOut) {
            // clockOut이 없는 기록이 있으면 출근 상태
            latestRecord = { id: doc.id, data }
            hasActiveRecord = true
          }
        })

        if (hasActiveRecord && latestRecord) {
          // 출근 상태 (clockOut이 없는 기록 존재)
          setCurrentAttendanceId(latestRecord.id)
          setTodayStatus('clocked_in')
        } else {
          // 모든 기록이 clockOut 있음 → 퇴근 완료 상태
          setTodayStatus('clocked_out')
          setCurrentAttendanceId(null)
        }
      } else {
        // 오늘 출근 기록 없음
        setTodayStatus('not_clocked_in')
        setCurrentAttendanceId(null)
      }
    } catch (error) {
      console.error('출퇴근 상태 로드 실패:', error)
    }
  }

  // QR 스캔 열기
  const handleOpenQrScan = () => {
    setQrScanOpen(true)
  }

  // 퇴근 처리 (사용 안 함 - QR 스캔으로 통합)
  // const handleClockOut = async () => {
  //   if (!currentAttendanceId) {
  //     alert('출근 기록을 찾을 수 없습니다.')
  //     return
  //   }

  //   if (!confirm('퇴근 처리하시겠습니까?')) return

  //   setIsClocking(true)
  //   try {
  //     await clockOut(currentAttendanceId)
  //     alert('퇴근 처리되었습니다.')
  //     await loadTodayAttendance()
  //   } catch (error: any) {
  //     console.error('퇴근 처리 실패:', error)
  //     alert(error.message || '퇴근 처리 중 오류가 발생했습니다.')
  //   } finally {
  //     setIsClocking(false)
  //   }
  // }

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
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {employeeData.name}님, 환영합니다
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span>
                  소속: <span className="font-medium">{employeeData.storeName}</span>
                </span>
                <span className="text-gray-400">|</span>
                <span>
                  직급: <span className="font-medium">
                    {employeeData.role === 'staff' || employeeData.role === 'employee' 
                      ? '일반 직원' 
                      : employeeData.role === 'store_manager' 
                      ? '매장 매니저' 
                      : employeeData.role === 'manager' 
                      ? '관리자' 
                      : employeeData.role}
                  </span>
                </span>
                {employeeData.position && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span>
                      직무: <span className="font-medium">{employeeData.position}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 출퇴근 버튼 */}
              {todayStatus === 'not_clocked_in' && (
                <Button
                  onClick={handleOpenQrScan}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2 shadow-lg"
                >
                  <QrCode className="w-5 h-5" />
                  QR 출근
                </Button>
              )}

              {todayStatus === 'clocked_in' && (
                <Button
                  onClick={handleOpenQrScan}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 flex items-center gap-2 shadow-lg"
                >
                  <QrCode className="w-5 h-5" />
                  QR 퇴근
                </Button>
              )}

              {todayStatus === 'clocked_out' && (
                <Button
                  onClick={handleOpenQrScan}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shadow-lg"
                >
                  <QrCode className="w-5 h-5" />
                  QR 재출근
                </Button>
              )}

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
        </div>
      </header>

      {/* QR 스캐너 모달 */}
      <QRScanner
        isOpen={qrScanOpen}
        onClose={() => setQrScanOpen(false)}
        employeeData={employeeData}
        onSuccess={() => {
          setQrScanOpen(false)
          loadTodayAttendance() // 출퇴근 상태 새로고침
        }}
      />

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-9 gap-2 h-auto p-2">
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
            <TabsTrigger value="contracts" className="flex flex-col items-center gap-1 py-3">
              <FileText className="w-5 h-5" />
              <span className="text-xs">계약서</span>
            </TabsTrigger>
            <TabsTrigger value="staff-list" className="flex flex-col items-center gap-1 py-3">
              <Users className="w-5 h-5" />
              <span className="text-xs">직원 목록</span>
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

          <TabsContent value="contracts">
            <ContractsTab employeeData={employeeData} />
          </TabsContent>

          <TabsContent value="staff-list">
            <StaffListTab companyId={employeeData.companyId} />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsTab employeeData={employeeData} onCountChange={loadTabCounts} />
          </TabsContent>

          <TabsContent value="notices">
            <NoticesTab employeeData={employeeData} onCountChange={loadTabCounts} />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab employeeData={employeeData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
