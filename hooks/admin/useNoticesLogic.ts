/**
 * 공지사항 관리 로직 훅
 * 백업: admin-dashboard.html 라인 6904-7084
 */

'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { Notice, NoticeFormData } from '@/lib/types/notice';
import { COLLECTIONS } from '@/lib/constants';
import { safeToDate } from '@/lib/utils/timestamp';

interface UseNoticesLogicProps {
  companyId: string;
}

export function useNoticesLogic({ companyId }: UseNoticesLogicProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * 공지사항 목록 로드
   */
  const loadNotices = useCallback(async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.NOTICES),
        where('companyId', '==', companyId)
      );
      
      const snapshot = await getDocs(q);
      const noticeList: Notice[] = [];
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        noticeList.push({
          id: docSnap.id,
          ...data,
          // 🔒 Phase I: Timestamp 안전 변환
          createdAt: safeToDate(data.createdAt, new Date()),
          updatedAt: safeToDate(data.updatedAt, undefined) || undefined,
        } as Notice);
      });
      
      // 최신순 정렬
      noticeList.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      setNotices(noticeList);
    } catch (error) {
      console.error('공지사항 로드 실패:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  /**
   * 공지사항 추가
   */
  const addNotice = async (formData: NoticeFormData) => {
    try {
      const noticeData = {
        ...formData,
        companyId,
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, COLLECTIONS.NOTICES), noticeData);
      await loadNotices();
    } catch (error) {
      console.error('공지사항 추가 실패:', error);
      throw error;
    }
  };

  /**
   * 공지사항 수정
   */
  const updateNotice = async (noticeId: string, formData: NoticeFormData) => {
    try {
      const noticeData = {
        ...formData,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(doc(db, 'notices', noticeId), noticeData);
      await loadNotices();
    } catch (error) {
      console.error('공지사항 수정 실패:', error);
      throw error;
    }
  };

  /**
   * 공지사항 삭제
   */
  const deleteNotice = async (noticeId: string) => {
    try {
      await deleteDoc(doc(db, 'notices', noticeId));
      await loadNotices();
    } catch (error) {
      console.error('공지사항 삭제 실패:', error);
      throw error;
    }
  };

  return {
    notices,
    loading,
    loadNotices,
    addNotice,
    updateNotice,
    deleteNotice,
  };
}
