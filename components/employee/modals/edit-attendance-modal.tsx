'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EditAttendanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendance: {
    id: string
    date: string
    clockIn: string
    clockOut: string
  }
  onSubmit: (data: {
    clockIn: string
    clockOut: string
    reason: string
  }) => Promise<void>
}

export default function EditAttendanceModal({
  open,
  onOpenChange,
  attendance,
  onSubmit
}: EditAttendanceModalProps) {
  const [clockIn, setClockIn] = useState(attendance.clockIn)
  const [clockOut, setClockOut] = useState(attendance.clockOut)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')

    // 유효성 검사
    if (!clockIn) {
      setError('출근 시간을 입력해주세요.')
      return
    }

    if (!reason.trim()) {
      setError('수정 사유를 입력해주세요.')
      return
    }

    if (reason.trim().length < 10) {
      setError('수정 사유를 10자 이상 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        clockIn,
        clockOut: clockOut || '',
        reason: reason.trim()
      })
      
      onOpenChange(false)
      // 상태 초기화
      setReason('')
      setError('')
    } catch (err: any) {
      setError(err.message || '수정 요청에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            출퇴근 시간 수정 요청
          </DialogTitle>
          <DialogDescription>
            출퇴근 시간을 수정하고 사유를 작성해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 날짜 표시 */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900">
              📅 {attendance.date}
            </p>
          </div>

          {/* 출근 시간 */}
          <div className="space-y-2">
            <Label htmlFor="clockIn">
              출근 시간 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="clockIn"
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500">
              기존: {attendance.clockIn}
            </p>
          </div>

          {/* 퇴근 시간 */}
          <div className="space-y-2">
            <Label htmlFor="clockOut">
              퇴근 시간 (선택사항)
            </Label>
            <Input
              id="clockOut"
              type="time"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              기존: {attendance.clockOut || '미기록'}
            </p>
          </div>

          {/* 수정 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              수정 사유 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="출퇴근 시간을 수정하는 이유를 상세히 작성해주세요. (최소 10자)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
            <p className="text-xs text-gray-500">
              {reason.length}/10자 이상 필수
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 안내 메시지 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              수정 요청 시 관리자에게 알림이 전송됩니다.
              <br />
              관리자 설정에 따라 즉시 반영되거나 승인 후 반영됩니다.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '처리 중...' : '수정 요청'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
