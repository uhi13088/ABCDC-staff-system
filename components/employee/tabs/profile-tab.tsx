'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, CreditCard, FileHeart, Loader2, Save, Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import Image from 'next/image'

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
  healthCertImageUrl?: string
}

export default function ProfileTab({ employeeData }: ProfileTabProps) {
  const [profile, setProfile] = useState<EmployeeProfile>({
    name: employeeData.name,
    phone: '',
    bankName: '',
    accountNumber: '',
    accountHolder: employeeData.name,
    healthCertExpiry: '',
    healthCertImageUrl: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [expiryWarning, setExpiryWarning] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          healthCertExpiry: data.healthCertExpiry || '',
          healthCertImageUrl: data.healthCertImageUrl || ''
        })
        
        // 건강진단서 만료 경고 체크
        checkExpiryWarning(data.healthCertExpiry)
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

  // 건강진단서 만료 경고 체크
  const checkExpiryWarning = (expiryDate: string) => {
    if (!expiryDate) {
      setExpiryWarning('')
      return
    }

    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      setExpiryWarning('만료됨')
    } else if (daysUntilExpiry <= 30) {
      setExpiryWarning(`${daysUntilExpiry}일 후 만료`)
    } else {
      setExpiryWarning('')
    }
  }

  // 건강진단서 이미지 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 유효성 검사
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('파일 크기는 5MB 이하로 제한됩니다.')
      return
    }

    setIsUploading(true)
    setUploadError('')

    try {
      // 기존 이미지가 있으면 삭제
      if (profile.healthCertImageUrl) {
        try {
          const oldImageRef = ref(storage, `health-certificates/${employeeData.uid}`)
          await deleteObject(oldImageRef)
        } catch (deleteError) {
          console.warn('기존 이미지 삭제 실패 (무시하고 진행):', deleteError)
        }
      }

      // Storage에 업로드
      const storageRef = ref(storage, `health-certificates/${employeeData.uid}`)
      await uploadBytes(storageRef, file)
      
      // 다운로드 URL 가져오기
      const downloadURL = await getDownloadURL(storageRef)
      
      // 프로필 상태 업데이트
      setProfile(prev => ({ ...prev, healthCertImageUrl: downloadURL }))
      
      // Firestore 업데이트
      const userRef = doc(db, COLLECTIONS.USERS, employeeData.uid)
      await updateDoc(userRef, {
        healthCertImageUrl: downloadURL,
        updatedAt: new Date()
      })

      alert('건강진단서가 업로드되었습니다.')
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      setUploadError('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
      // 파일 인풋 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 건강진단서 이미지 삭제
  const handleImageDelete = async () => {
    if (!confirm('건강진단서 이미지를 삭제하시겠습니까?')) return

    setIsUploading(true)
    try {
      // Storage에서 삭제
      if (profile.healthCertImageUrl) {
        const imageRef = ref(storage, `health-certificates/${employeeData.uid}`)
        await deleteObject(imageRef)
      }

      // Firestore 업데이트
      const userRef = doc(db, COLLECTIONS.USERS, employeeData.uid)
      await updateDoc(userRef, {
        healthCertImageUrl: '',
        updatedAt: new Date()
      })

      // 프로필 상태 업데이트
      setProfile(prev => ({ ...prev, healthCertImageUrl: '' }))
      
      alert('건강진단서가 삭제되었습니다.')
    } catch (error) {
      console.error('이미지 삭제 실패:', error)
      alert('이미지 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

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
      
      // 만료 경고 업데이트
      checkExpiryWarning(profile.healthCertExpiry)

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
    
    // 건강진단서 만료일이 변경되면 경고 체크
    if (field === 'healthCertExpiry') {
      checkExpiryWarning(value)
    }
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
            {expiryWarning && (
              <Alert variant={expiryWarning === '만료됨' ? 'destructive' : 'default'} className="mt-2">
                {expiryWarning === '만료됨' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {expiryWarning === '만료됨' 
                    ? '⚠️ 건강진단서가 만료되었습니다. 즉시 갱신하세요!' 
                    : `⏰ ${expiryWarning} - 건강진단서 갱신을 준비하세요.`}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              📋 식품업 종사자는 건강진단서를 연 1회 갱신해야 합니다
            </p>
          </div>

          {/* 건강진단서 이미지 업로드 */}
          <div className="space-y-4">
            <Label>건강진단서 이미지</Label>
            
            {/* 업로드 에러 메시지 */}
            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {/* 이미지 미리보기 */}
            {profile.healthCertImageUrl ? (
              <div className="relative border border-gray-300 rounded-lg overflow-hidden">
                <div className="relative w-full h-64">
                  <Image
                    src={profile.healthCertImageUrl}
                    alt="건강진단서"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleImageDelete}
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(profile.healthCertImageUrl, '_blank')}
                  >
                    원본 보기
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 mb-4">
                  건강진단서 이미지를 업로드하세요<br />
                  <span className="text-xs text-gray-500">(최대 5MB, JPG/PNG)</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="health-cert-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      이미지 선택
                    </>
                  )}
                </Button>
              </div>
            )}
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
