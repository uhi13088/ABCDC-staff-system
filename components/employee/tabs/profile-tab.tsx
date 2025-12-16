'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { User, CreditCard, FileHeart, Loader2, Save } from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'

interface ProfileTabProps {
  employeeData: {
    uid: string
    email: string
    name: string
  }
}

interface EmployeeProfile {
  name: string
  phone: string
  bankName: string
  accountNumber: string
  accountHolder: string
  healthCertExpiry: string
}

export default function ProfileTab({ employeeData }: ProfileTabProps) {
  const [profile, setProfile] = useState<EmployeeProfile>({
    name: employeeData.name,
    phone: '',
    bankName: '',
    accountNumber: '',
    accountHolder: employeeData.name,
    healthCertExpiry: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 프로필 로드
  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, employeeData.uid))
      
      if (userDoc.exists()) {
        const data = userDoc.data()
        setProfile({
          name: data.name || employeeData.name,
          phone: data.phone || '',
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          accountHolder: data.accountHolder || employeeData.name,
          healthCertExpiry: data.healthCertExpiry || ''
        })
      }
    } catch (error) {
      console.error('프로필 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [employeeData])

  // 프로필 저장
  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }

    setIsSaving(true)
    try {
      const userRef = doc(db, COLLECTIONS.USERS, employeeData.uid)
      
      await updateDoc(userRef, {
        name: profile.name,
        phone: profile.phone,
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        accountHolder: profile.accountHolder,
        healthCertExpiry: profile.healthCertExpiry,
        updatedAt: new Date()
      })

      alert('프로필이 저장되었습니다.')
    } catch (error) {
      console.error('프로필 저장 실패:', error)
      alert(error.message || '프로필 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: keyof EmployeeProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 개인정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            개인정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={employeeData.email}
              disabled
              className="bg-gray-100"
            />
            <p className="text-xs text-gray-500">이메일은 변경할 수 없습니다</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">이름 *</Label>
            <Input
              id="name"
              type="text"
              value={profile.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">연락처</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="010-1234-5678"
              value={profile.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 계좌 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            계좌 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">은행명</Label>
            <Input
              id="bankName"
              type="text"
              placeholder="예: 국민은행"
              value={profile.bankName}
              onChange={(e) => handleInputChange('bankName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">계좌번호</Label>
            <Input
              id="accountNumber"
              type="text"
              placeholder="123456-78-901234"
              value={profile.accountNumber}
              onChange={(e) => handleInputChange('accountNumber', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountHolder">예금주</Label>
            <Input
              id="accountHolder"
              type="text"
              placeholder="예금주명"
              value={profile.accountHolder}
              onChange={(e) => handleInputChange('accountHolder', e.target.value)}
            />
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💡 급여 지급을 위해 정확한 계좌 정보를 입력해주세요
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 건강진단서 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileHeart className="w-5 h-5" />
            건강진단서 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="healthCertExpiry">건강진단서 만료일</Label>
            <Input
              id="healthCertExpiry"
              type="date"
              value={profile.healthCertExpiry}
              onChange={(e) => handleInputChange('healthCertExpiry', e.target.value)}
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              📋 식품업 종사자는 건강진단서를 연 1회 갱신해야 합니다
            </p>
          </div>

          {/* 건강진단서 이미지 업로드는 추후 구현 */}
          <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              건강진단서 이미지 업로드 기능은 추후 추가 예정입니다
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="w-full md:w-auto"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              프로필 저장
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
