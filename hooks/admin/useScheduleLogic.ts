/**
 * 스케줄 관리 Custom Hook
 * 기존 admin-dashboard.html의 Schedules 탭 로직을 React Hook으로 변환
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
import { COLLECTIONS } from '@/lib/constants';
  WorkSchedule,
  ScheduleGroup,
  ScheduleFilterOptions,
  ScheduleStats,
  ShiftSwapRequest,
  ScheduleSimulatorData,
} from '@/lib/types/common';

interface UseScheduleLogicProps {
  companyId: string;
}

export function useScheduleLogic({ companyId }: UseScheduleLogicProps) {
  // State
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [scheduleGroups, setScheduleGroups] = useState<ScheduleGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ScheduleFilterOptions>({});
  const [currentWeek, setCurrentWeek] = useState<{ year: number; week: number }>({
    year: new Date().getFullYear(),
    week: getWeekNumber(new Date()),
  });

  /**
   * 주차 계산 (ISO 8601)
   */
  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * 스케줄 로드 (기존 loadSchedules 함수)
   */
  const loadSchedules = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('📅 스케줄 로드 시작...');

      // 기본 쿼리
      let q = query(
        collection(db, COLLECTIONS.SCHEDULES),
        where('companyId', '==', companyId)
      );

      // 매장 필터
      if (filters.store) {
        q = query(q, where('storeId', '==', filters.store));
      }

      // 날짜 범위 필터
      if (filters.startDate && filters.endDate) {
        q = query(
          q,
          where('date', '>=', filters.startDate),
          where('date', '<=', filters.endDate)
        );
      }

      // 정렬
      q = query(q, orderBy('date', 'asc'), orderBy('startTime', 'asc'));

      const snapshot = await getDocs(q);
      console.log(`📊 조회 결과: ${snapshot.size}개의 스케줄`);

      const schedulesList: WorkSchedule[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        schedulesList.push({
          id: docSnap.id,
          companyId: data.companyId,
          storeId: data.storeId,
          store: data.store,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          shiftType: data.shiftType || 'custom',
          breakMinutes: data.breakMinutes || 0,
          totalMinutes: data.totalMinutes || 0,
          status: data.status || 'scheduled',
          isOpenShift: data.isOpenShift,
          originalEmployeeId: data.originalEmployeeId,
          notes: data.notes,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      setSchedules(schedulesList);
      setLoading(false);

    } catch (err: any) {
      console.error('❌ 스케줄 로드 실패:', err);
      setError(err.message || '스케줄을 불러오는데 실패했습니다.');
      setLoading(false);
    }
  }, [companyId, filters]);

  /**
   * 스케줄 그룹 데이터 로드 (주간 단위)
   */
  const loadScheduleDataWrapper = useCallback(
    async (storeId: string, year: number, weekNum: number) => {
      try {
        const q = query(
          collection(db, COLLECTIONS.SCHEDULE_GROUPS),
          where('companyId', '==', companyId),
          where('storeId', '==', storeId),
          where('weekNumber', '==', weekNum)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const group: ScheduleGroup = {
            id: snapshot.docs[0].id,
            companyId: data.companyId,
            storeId: data.storeId,
            store: data.store,
            startDate: data.startDate,
            endDate: data.endDate,
            weekNumber: data.weekNumber,
            schedules: data.schedules || [],
            totalHours: data.totalHours || 0,
            employeeCount: data.employeeCount || 0,
            status: data.status || 'draft',
            publishedAt: data.publishedAt,
            createdBy: data.createdBy,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          return group;
        }

        return null;
      } catch (err: any) {
        console.error('❌ 스케줄 그룹 로드 실패:', err);
        return null;
      }
    },
    [companyId]
  );

  /**
   * 스케줄 추가/수정 (기존 addSchedule 함수 로직)
   */
  const saveSchedule = useCallback(
    async (scheduleData: Omit<WorkSchedule, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newSchedule = {
          ...scheduleData,
          companyId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        await addDoc(collection(db, COLLECTIONS.SCHEDULES), newSchedule);
        await loadSchedules();

        return { success: true, message: '스케줄이 추가되었습니다.' };
      } catch (err: any) {
        console.error('❌ 스케줄 추가 실패:', err);
        return { success: false, message: err.message || '추가에 실패했습니다.' };
      }
    },
    [companyId, loadSchedules]
  );

  /**
   * 스케줄 삭제 (기존 removeSchedule 함수)
   */
  const deleteSchedule = useCallback(
    async (scheduleId: string) => {
      try {
        await deleteDoc(doc(db, 'schedules', scheduleId));
        await loadSchedules();

        return { success: true, message: '스케줄이 삭제되었습니다.' };
      } catch (err: any) {
        console.error('❌ 스케줄 삭제 실패:', err);
        return { success: false, message: err.message || '삭제에 실패했습니다.' };
      }
    },
    [loadSchedules]
  );

  /**
   * Open Shift 생성 (대타 근무)
   */
  const createOpenShift = useCallback(
    async (shiftData: {
      storeId: string;
      store: string;
      date: string;
      startTime: string;
      endTime: string;
      originalEmployeeId: string;
    }) => {
      try {
        const openShift = {
          companyId,
          storeId: shiftData.storeId,
          store: shiftData.store,
          employeeId: '', // 대타자 미정
          employeeName: '대타 모집 중',
          date: shiftData.date,
          startTime: shiftData.startTime,
          endTime: shiftData.endTime,
          shiftType: 'custom' as const,
          breakMinutes: 0,
          totalMinutes: 0,
          status: 'scheduled' as const,
          isOpenShift: true,
          originalEmployeeId: shiftData.originalEmployeeId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        await addDoc(collection(db, COLLECTIONS.SCHEDULES), openShift);
        await loadSchedules();

        return { success: true, message: 'Open Shift가 생성되었습니다.' };
      } catch (err: any) {
        console.error('❌ Open Shift 생성 실패:', err);
        return { success: false, message: err.message || '생성에 실패했습니다.' };
      }
    },
    [companyId, loadSchedules]
  );

  /**
   * Open Shift 취소
   */
  const cancelOpenShift = useCallback(
    async (shiftId: string) => {
      try {
        await deleteDoc(doc(db, 'schedules', shiftId));
        await loadSchedules();

        return { success: true, message: 'Open Shift가 취소되었습니다.' };
      } catch (err: any) {
        console.error('❌ Open Shift 취소 실패:', err);
        return { success: false, message: err.message || '취소에 실패했습니다.' };
      }
    },
    [loadSchedules]
  );

  /**
   * 스케줄 통계 계산
   */
  const getScheduleStats = useCallback((): ScheduleStats => {
    const stats: ScheduleStats = {
      totalSchedules: schedules.length,
      totalHours: 0,
      employeeCount: new Set(schedules.map(s => s.employeeId)).size,
      byShiftType: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0,
        all_day: 0,
        custom: 0,
      },
      byDay: {},
    };

    schedules.forEach((schedule) => {
      // 총 근무 시간
      stats.totalHours += (schedule.totalMinutes || 0) / 60;

      // 시프트 유형별
      stats.byShiftType[schedule.shiftType]++;

      // 요일별
      const date = schedule.date;
      stats.byDay[date] = (stats.byDay[date] || 0) + 1;
    });

    return stats;
  }, [schedules]);

  /**
   * 주 변경 (이전/다음 주)
   */
  const changeWeek = useCallback((direction: 'prev' | 'next') => {
    setCurrentWeek((prev) => {
      const newWeek = direction === 'next' ? prev.week + 1 : prev.week - 1;
      let newYear = prev.year;

      // 주차 범위 검증 (1~53)
      if (newWeek < 1) {
        return { year: prev.year - 1, week: 52 };
      } else if (newWeek > 53) {
        return { year: prev.year + 1, week: 1 };
      }

      return { year: newYear, week: newWeek };
    });
  }, []);

  /**
   * 필터 업데이트
   */
  const updateFilters = useCallback((newFilters: Partial<ScheduleFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * 초기 로드
   */
  useEffect(() => {
    if (companyId) {
      loadSchedules();
    }
  }, [companyId, filters, loadSchedules]);

  return {
    // State
    schedules,
    scheduleGroups,
    loading,
    error,
    filters,
    currentWeek,

    // Actions
    loadSchedules,
    loadScheduleDataWrapper,
    saveSchedule,
    deleteSchedule,
    createOpenShift,
    cancelOpenShift,
    getScheduleStats,
    changeWeek,
    updateFilters,
  };
}
