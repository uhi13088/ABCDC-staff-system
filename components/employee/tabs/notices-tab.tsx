'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Megaphone, Pin } from 'lucide-react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { safeToDate } from '@/lib/utils/timestamp'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface NoticesTabProps {
  employeeData: {
    companyId: string
  }
}

interface Notice {
  id: string
  title: string
  content: string
  isImportant: boolean
  createdAt: string
  author: string
}

export default function NoticesTab({ employeeData }: NoticesTabProps) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // 공지사항 로드
  const loadNotices = async () => {
    setIsLoading(true)
    try {
      const noticesRef = collection(db, COLLECTIONS.NOTICES)
      const noticesQuery = query(
        noticesRef,
        where('companyId', '==', employeeData.companyId),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(noticesQuery)
      
      const loadedNotices: Notice[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const createdAt = safeToDate(data.createdAt)
        
        loadedNotices.push({
          id: doc.id,
          title: data.title || '제목 없음',
          content: data.content || '',
          isImportant: data.isImportant || false,
          createdAt: createdAt ? format(createdAt, 'yyyy-MM-dd HH:mm', { locale: ko }) : '-',
          author: data.authorName || '관리자'
        })
      })

      setNotices(loadedNotices)
    } catch (error) {
      console.error('공지사항 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotices()
  }, [employeeData])

  const openNoticeDetail = (notice: Notice) => {
    setSelectedNotice(notice)
    setShowDetailModal(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {notices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>등록된 공지사항이 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card
              key={notice.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                notice.isImportant ? 'border-red-300 bg-red-50' : ''
              }`}
              onClick={() => openNoticeDetail(notice)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {notice.isImportant && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <Pin className="w-3 h-3" />
                          중요
                        </Badge>
                      )}
                      <CardTitle className="text-base font-semibold">
                        {notice.title}
                      </CardTitle>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notice.content}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{notice.author}</span>
                  <span>{notice.createdAt}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 공지사항 상세 모달 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              {selectedNotice?.isImportant && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Pin className="w-3 h-3" />
                  중요
                </Badge>
              )}
              <DialogTitle>{selectedNotice?.title}</DialogTitle>
            </div>
            <DialogDescription className="flex items-center justify-between">
              <span>{selectedNotice?.author}</span>
              <span>{selectedNotice?.createdAt}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedNotice && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg min-h-[200px] whitespace-pre-wrap">
                {selectedNotice.content}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
