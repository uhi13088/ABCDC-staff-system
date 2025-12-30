'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Phone, Briefcase, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface StaffListTabProps {
  companyId: string
}

interface Employee {
  userId: string
  name: string
  phone?: string
  role: string
  position?: string
  storeName?: string
  status: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  store_manager: '매장관리자',
  staff: '직원'
}

export default function StaffListTab({ companyId }: StaffListTabProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (companyId) {
      loadEmployees()
    }
  }, [companyId])

  const loadEmployees = async () => {
    try {
      setIsLoading(true)
      
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('companyId', '==', companyId),
        where('status', '==', 'active'),
        orderBy('role', 'asc'),
        orderBy('name', 'asc')
      )

      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({
        userId: doc.id,
        name: doc.data().name || '이름 없음',
        phone: doc.data().phone || '-',
        role: doc.data().role || 'staff',
        position: doc.data().position || '',
        storeName: doc.data().storeName || '',
        status: doc.data().status || 'active'
      }))

      setEmployees(data)
      console.log('✅ 직원 목록 로드:', data.length, '명')
    } catch (error) {
      console.error('❌ 직원 목록 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">직원 목록</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">직원 목록</h3>
          <Badge variant="secondary">{employees.length}명</Badge>
        </div>
      </div>

      {/* 직원 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((employee) => (
          <Card key={employee.userId} className="p-4 hover:shadow-md transition-shadow">
            {/* 이름 + 직급 */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-lg">{employee.name}</h4>
              <Badge variant={
                employee.role === 'admin' ? 'default' :
                employee.role === 'manager' ? 'secondary' :
                employee.role === 'store_manager' ? 'outline' :
                'secondary'
              }>
                {ROLE_LABELS[employee.role] || employee.role}
              </Badge>
            </div>

            {/* 전화번호 */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Phone className="w-4 h-4" />
              <a 
                href={`tel:${employee.phone}`} 
                className="hover:text-blue-600 hover:underline"
              >
                {employee.phone}
              </a>
            </div>

            {/* 직무 */}
            {employee.position && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Briefcase className="w-4 h-4" />
                <span>{employee.position}</span>
              </div>
            )}

            {/* 소속 매장 */}
            {employee.storeName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{employee.storeName}</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* 직원 없을 때 */}
      {employees.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">등록된 직원이 없습니다</p>
        </Card>
      )}
    </div>
  )
}
