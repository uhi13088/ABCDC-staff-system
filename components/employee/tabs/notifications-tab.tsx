'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, BellOff, Check, CheckCheck } from 'lucide-react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COLLECTIONS } from '@/lib/constants'
import { safeToDate } from '@/lib/utils/timestamp'
import { markAsRead, markAllAsRead } from '@/services/notificationService'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface NotificationsTabProps {
  employeeData: {
    uid: string
    companyId: string
  }
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function NotificationsTab({ employeeData }: NotificationsTabProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 알림 목록 로드
  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS)
      const notificationsQuery = query(
        notificationsRef,
        where('userId', '==', employeeData.uid),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(notificationsQuery)
      
      const loadedNotifications: Notification[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const createdAt = safeToDate(data.createdAt)
        
        loadedNotifications.push({
          id: doc.id,
          type: data.type || 'general',
          title: data.title || '알림',
          message: data.message || '',
          isRead: data.isRead || false,
          createdAt: createdAt ? format(createdAt, 'yyyy-MM-dd HH:mm', { locale: ko }) : '-'
        })
      })

      setNotifications(loadedNotifications)
    } catch (error) {
      console.error('알림 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [employeeData])

  // 알림 읽음 처리
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId)
      await loadNotifications() // 새로고침
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error)
    }
  }

  // 전체 읽음 처리
  const handleMarkAllAsRead = async () => {
    if (!confirm('모든 알림을 읽음 처리하시겠습니까?')) return

    try {
      await markAllAsRead(employeeData.uid)
      await loadNotifications() // 새로고침
      alert('모든 알림이 읽음 처리되었습니다.')
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error)
      alert(error.message || '전체 읽음 처리 중 오류가 발생했습니다.')
    }
  }

  const getTypeIcon = (type: string) => {
    return <Bell className="w-4 h-4" />
  }

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      attendance: { label: '출퇴근', color: 'bg-blue-500' },
      salary: { label: '급여', color: 'bg-green-500' },
      approval: { label: '결재', color: 'bg-purple-500' },
      contract: { label: '계약', color: 'bg-orange-500' },
      notice: { label: '공지', color: 'bg-red-500' },
      schedule: { label: '스케줄', color: 'bg-yellow-500' },
      general: { label: '일반', color: 'bg-gray-500' }
    }
    const config = typeMap[type] || typeMap['general']
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold">알림</p>
                <p className="text-sm text-gray-600">
                  읽지 않은 알림: <span className="font-medium text-blue-600">{unreadCount}개</span>
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                전체 읽음
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 알림 목록 */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <BellOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>알림이 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                !notification.isRead ? 'border-blue-300 bg-blue-50' : 'bg-white'
              }`}
              onClick={() => {
                if (!notification.isRead) {
                  handleMarkAsRead(notification.id)
                }
              }}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(notification.type)}
                      {!notification.isRead && (
                        <Badge variant="default" className="bg-red-500 text-xs px-1.5">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-sm mb-1">{notification.title}</p>
                    <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                    <p className="text-xs text-gray-500">{notification.createdAt}</p>
                  </div>
                  {notification.isRead && (
                    <div className="mt-1">
                      <Check className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
