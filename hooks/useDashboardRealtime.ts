/**
 * ========================================
 * useDashboardRealtime Hook v2.0
 * ========================================
 * 
 * 핵심 철학: Real-time Dashboard
 * - 출퇴근 기록이 변경되면 즉시 대시보드 업데이트
 * - 무한 루프 없음
 * - 단순 집계만 수행
 */

'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { AttendanceRecord } from '@/lib/types/attendance';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface DashboardStats {
  workDays: number;
  workHours: number;
  estimatedSalary: number;
  todayStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out';
  todayClockIn?: string;
  todayClockOut?: string;
  currentAttendanceId?: string;
}

export function useDashboardRealtime(
  userId: string,
  companyId: string,
  enabled = true
) {
  const [stats, setStats] = useState<DashboardStats>({
    workDays: 0,
    workHours: 0,
    estimatedSalary: 0,
    todayStatus: 'not_clocked_in',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!enabled || !userId || !companyId) {
      setLoading(false);
      return;
    }
    
    console.log('🔔 대시보드 실시간 구독:', { userId });
    
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // 이번 달 출근 기록 실시간 구독
    const attendanceQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('companyId', '==', companyId),
      where('userId', '==', userId)
    );
    
    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        console.log('📡 대시보드 실시간 업데이트:', snapshot.docs.length, '건');
        
        // 집계 계산
        const uniqueDates = new Set<string>();
        let totalMinutes = 0;
        let totalPay = 0;
        let todayStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' = 'not_clocked_in';
        let todayClockIn: string | undefined;
        let todayClockOut: string | undefined;
        let currentAttendanceId: string | undefined;
        
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as AttendanceRecord;
          
          // clockIn을 Date로 변환
          const clockInDate = data.clockIn instanceof Timestamp
            ? data.clockIn.toDate()
            : new Date(data.clockIn as any);
          
          const clockOutDate = data.clockOut instanceof Timestamp
            ? data.clockOut.toDate()
            : data.clockOut ? new Date(data.clockOut as any) : null;
          
          // 이번 달 데이터만 집계
          if (clockInDate >= monthStart && clockInDate <= monthEnd) {
            const dateKey = format(clockInDate, 'yyyy-MM-dd');
            uniqueDates.add(dateKey);
            
            // 근무 시간 (이미 계산되어 저장된 값 사용)
            totalMinutes += data.workMinutes || 0;
            
            // 급여 (이미 계산되어 저장된 값 사용)
            totalPay += data.dailyWage || 0;
          }
          
          // 오늘 출근 상태 확인
          const today = format(now, 'yyyy-MM-dd');
          const recordDate = format(clockInDate, 'yyyy-MM-dd');
          
          if (recordDate === today) {
            currentAttendanceId = doc.id;
            todayClockIn = format(clockInDate, 'HH:mm');
            
            if (clockOutDate) {
              todayStatus = 'clocked_out';
              todayClockOut = format(clockOutDate, 'HH:mm');
            } else {
              todayStatus = 'clocked_in';
            }
          }
        });
        
        const workDays = uniqueDates.size;
        const workHours = Number((totalMinutes / 60).toFixed(1));
        
        setStats({
          workDays,
          workHours,
          estimatedSalary: totalPay,
          todayStatus,
          todayClockIn,
          todayClockOut,
          currentAttendanceId,
        });
        
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('❌ 대시보드 구독 실패:', err);
        setError(err.message || '대시보드 조회에 실패했습니다.');
        setLoading(false);
      }
    );
    
    return () => {
      console.log('🔕 대시보드 구독 해제');
      unsubscribe();
    };
    
    // 의존성 배열 최적화
  }, [userId, companyId, enabled]);
  
  return {
    stats,
    loading,
    error,
  };
}
