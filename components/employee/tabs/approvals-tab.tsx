'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { FileCheck, Plus, Loader2 } from 'lucide-react'
import { collection, query, where, getDocs, orderBy, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { safeToDate } from '@/lib/utils/timestamp'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ApprovalsTabProps {
  employeeData: {
    uid: string
    companyId: string
    storeId: string
    name: string
  }
  onCountChange?: () => void // 카운트 변경 콜백
}

interface ApprovalRequest {
  id: string
  type: string
  requestDate: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  details: unknown
}

type RequestType = 'vacation' | 'overtime' | 'absence' | 'shift_change'

export default function ApprovalsTab({ employeeData, onCountChange }: ApprovalsTabProps) {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 신청서 폼 상태
  const [requestType, setRequestType] = useState<RequestType>('vacation')
  const [requestDate, setRequestDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')

  // 결재 요청 목록 로드
  const loadApprovalRequests = async () => {
    setIsLoading(true)
    try {
      const approvalsRef = collection(db, COLLECTIONS.APPROVALS)
      const approvalsQuery = query(
        approvalsRef,
        where('companyId', '==', employeeData.companyId),
        where('userId', '==', employeeData.uid),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(approvalsQuery)
      
      const loadedRequests: ApprovalRequest[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const createdAt = safeToDate(data.createdAt)
        
        loadedRequests.push({
          id: doc.id,
          type: data.type || 'vacation',
          requestDate: createdAt ? format(createdAt, 'yyyy-MM-dd HH:mm', { locale: ko }) : '-',
          status: data.status || 'pending',
          reason: data.reason || '-',
          details: data.details || {}
        })
      })

      setRequests(loadedRequests)
    } catch (error) {
      console.error('결재 요청 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadApprovalRequests()
  }, [employeeData])

  // 신청서 제출
  const handleSubmitRequest = async () => {
    if (!requestDate || !reason.trim()) {
      alert('모든 필수 항목을 입력해주세요.')
      return
    }

    if ((requestType === 'absence' || requestType === 'overtime') && (!startTime || !endTime)) {
      alert('시작 시간과 종료 시간을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const approvalsRef = collection(db, COLLECTIONS.APPROVALS)
      
      await addDoc(approvalsRef, {
        companyId: employeeData.companyId,
        storeId: employeeData.storeId,
        userId: employeeData.uid,
        requesterName: employeeData.name,
        type: requestType,
        status: 'pending',
        reason: reason,
        details: {
          date: requestDate,
          startTime: startTime || null,
          endTime: endTime || null
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      alert('결재 요청이 제출되었습니다.')
      setShowRequestModal(false)
      resetForm()
      await loadApprovalRequests()
      onCountChange?.() // 카운트 새로고침
    } catch (error) {
      console.error('결재 요청 제출 실패:', error)
      alert(error.message || '결재 요청 제출 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 폼 초기화
  const resetForm = () => {
    setRequestType('vacation')
    setRequestDate('')
    setStartTime('')
    setEndTime('')
    setReason('')
  }

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      vacation: { label: '휴가', color: 'bg-blue-500' },
      overtime: { label: '연장근무', color: 'bg-purple-500' },
      absence: { label: '결근', color: 'bg-orange-500' },
      shift_change: { label: '근무조정', color: 'bg-green-500' }
    }
    const config = typeMap[type] || { label: type, color: 'bg-gray-500' }
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">승인</Badge>
      case 'pending':
        return <Badge variant="secondary">대기</Badge>
      case 'rejected':
        return <Badge variant="destructive">반려</Badge>
      default:
        return <Badge variant="outline">-</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 신청서 작성 버튼 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">결재 요청</CardTitle>
            <Button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              신청서 작성
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* 신청 내역 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">신청 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>신청 내역이 없습니다</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>신청일시</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>사유</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.requestDate}</TableCell>
                      <TableCell>{getTypeBadge(request.type)}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 신청서 작성 모달 */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>결재 요청서 작성</DialogTitle>
            <DialogDescription>
              관리자에게 결재를 요청합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 신청 유형 */}
            <div className="space-y-2">
              <Label htmlFor="requestType">신청 유형 *</Label>
              <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">휴가</SelectItem>
                  <SelectItem value="overtime">연장근무</SelectItem>
                  <SelectItem value="absence">결근</SelectItem>
                  <SelectItem value="shift_change">근무조정</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 날짜 */}
            <div className="space-y-2">
              <Label htmlFor="requestDate">날짜 *</Label>
              <Input
                id="requestDate"
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
              />
            </div>

            {/* 시간 (결근/연장근무만) */}
            {(requestType === 'absence' || requestType === 'overtime') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">시작 시간 *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">종료 시간 *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* 사유 */}
            <div className="space-y-2">
              <Label htmlFor="reason">사유 *</Label>
              <Textarea
                id="reason"
                placeholder="신청 사유를 입력하세요"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRequestModal(false)
                resetForm()
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  제출 중...
                </>
              ) : (
                '제출'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
