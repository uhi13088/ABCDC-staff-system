/**
 * 공지사항 관리 Custom Hook
 * 기존 admin-dashboard.html의 Notice 탭 로직을 React Hook으로 변환
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Notice, NoticeFilterOptions } from '@/lib/types/notice';
import { COLLECTIONS } from '@/lib/constants';

interface UseNoticeLogicProps {
  companyId: string;
  userId: string;
  userName: string;
}

export function useNoticeLogic({ companyId, userId, userName }: UseNoticeLogicProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NoticeFilterOptions>({});

  /**
   * 공지사항 목록 로드
   */
  const loadNotices = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      let q = query(
        collection(db, COLLECTIONS.NOTICES),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      const snapshot = await getDocs(q);
      const noticesList: Notice[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        noticesList.push({
          id: docSnap.id,
          companyId: data.companyId,
          title: data.title,
          content: data.content,
          isPinned: data.isPinned || false,
          isImportant: data.isImportant || false,
          attachments: data.attachments,
          targetStores: data.targetStores,
          targetRoles: data.targetRoles,
          viewCount: data.viewCount || 0,
          viewedBy: data.viewedBy || [],
          authorId: data.authorId,
          authorName: data.authorName,
          status: data.status || 'published',
          publishedAt: data.publishedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      setNotices(noticesList);
      setLoading(false);
    } catch (err: any) {
      console.error('❌ 공지사항 로드 실패:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [companyId, filters]);

  /**
   * 공지사항 추가
   */
  const addNotice = useCallback(
    async (noticeData: { title: string; content: string }) => {
      try {
        await addDoc(collection(db, COLLECTIONS.NOTICES), {
          companyId,
          title: noticeData.title,
          content: noticeData.content,
          status: 'published' as const,
          isPinned: false,
          isImportant: false,
          attachments: [],
          targetStores: [],
          targetRoles: [],
          authorId: userId,
          authorName: userName,
          viewCount: 0,
          viewedBy: [],
          publishedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        await loadNotices();
        return { success: true, message: '공지사항이 등록되었습니다.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [companyId, userId, userName, loadNotices]
  );

  /**
   * 공지사항 수정
   */
  const updateNotice = useCallback(
    async (noticeId: string, updates: Partial<Notice>) => {
      try {
        await updateDoc(doc(db, 'notices', noticeId), {
          ...updates,
          updatedAt: Timestamp.now(),
        });

        await loadNotices();
        return { success: true, message: '공지사항이 수정되었습니다.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [loadNotices]
  );

  /**
   * 공지사항 삭제
   */
  const deleteNotice = useCallback(
    async (noticeId: string) => {
      try {
        await deleteDoc(doc(db, 'notices', noticeId));
        await loadNotices();
        return { success: true, message: '공지사항이 삭제되었습니다.' };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [loadNotices]
  );

  /**
   * 필터 업데이트
   */
  const updateFilters = useCallback((newFilters: Partial<NoticeFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  useEffect(() => {
    if (companyId) {
      loadNotices();
    }
  }, [companyId, filters, loadNotices]);

  return {
    notices,
    loading,
    error,
    filters,
    loadNotices,
    addNotice,
    updateNotice,
    deleteNotice,
    updateFilters,
  };
}
