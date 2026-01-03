/**
 * 근무기록 관리 Custom Hook
 * 백업: /home/user/webapp-backup/admin-dashboard.html 라인 3206~3473
 * 기존 admin-dashboard.html의 Attendance 탭 로직을 React Hook으로 변환
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { 
  AttendanceRecord, 
  AttendanceFilterOptions, 
  AttendanceStatusResult 
} from '@/lib/types/attendance';
import * as storeService from '@/services/storeService';
import * as attendanceService from '@/services/attendanceService';
import * as employeeService from '@/services/employeeService';

interface UseAttendanceLogicProps {
  companyId: string;
}

export function useAttendanceLogic({ companyId }: UseAttendanceLogicProps) {
  // State
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AttendanceFilterOptions>({
    employmentStatus: 'all', // 기본값: 전체 (개발/테스트 편의)
  });
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);

  /**
   * 근태 상태 자동 계산 - 실제 계약 스케줄 시간 기반
   * 백업: calculateAttendanceStatus 함수 라인 3206~3245
   * 
   * ✅ 수정: 하드코딩된 09:00~18:00 대신 실제 스케줄 시간(scheduledStartTime, scheduledEndTime) 사용
   * ✅ 연장 근무(Overtime) 판정 추가
   */
  const calculateAttendanceStatus = useCallback((att: AttendanceRecord): AttendanceStatusResult => {
    // 1) 수동 상태 확인 (직원이 수동으로 결근 표시한 경우)
    if (att.status === 'absent') {
      return { text: '결근', class: 'danger' };
    }
    
    // 2) 출근 기록 없음
    if (!att.clockIn) {
      return { text: '결근', class: 'danger' };
    }
    
    // 3) 퇴근 기록 없음 (아직 근무 중)
    if (!att.clockOut) {
      return { text: '근무중', class: 'info' };
    }
    
    // 4) 스케줄 시간 가져오기
    // AttendanceRecord에 scheduledStartTime, scheduledEndTime 필드가 있어야 함
    // 없으면 정상으로 처리 (판단 불가)
    const scheduledStart = att.scheduledStartTime;
    const scheduledEnd = att.scheduledEndTime;
    
    if (!scheduledStart || !scheduledEnd) {
      // 스케줄 시간이 없으면 정상으로 처리 (판단 불가)
      console.warn('⚠️ 스케줄 시간이 없음 (정상 처리):', att);
      return { text: '정상', class: 'success' };
    }
    
    // 5) 지각/조퇴/연장 판단 (실제 스케줄 시간과 비교)
    const isLate = att.clockIn > scheduledStart;        // 늦게 출근
    const isEarlyLeave = att.clockOut < scheduledEnd;   // 일찍 퇴근
    const isOvertime = att.clockOut > scheduledEnd;     // 늦게 퇴근 (연장 근무)
    
    // 6) 상태 우선순위에 따라 반환
    if (isLate && isEarlyLeave) {
      // 늦게 오고 일찍 감
      return { text: '지각+조퇴', class: 'danger' };
    } else if (isLate && isOvertime) {
      // 늦게 왔지만 더 일하다 감
      return { text: '지각+연장', class: 'info' };
    } else if (isLate) {
      // 늦게 옴
      return { text: '지각', class: 'danger' };
    } else if (isEarlyLeave) {
      // 일찍 감
      return { text: '조퇴', class: 'danger' };
    } else if (isOvertime) {
      // 제시간에 와서 더 일함
      return { text: '연장', class: 'info' };
    }
    
    // 7) 정상
    return { text: '정상', class: 'success' };
  }, []);

  /**
   * 매장 목록 로드 (백업: loadStoresForAttendanceFilter 함수 라인 3247~3285)
   */
  const loadStores = useCallback(async () => {
    if (!companyId) return;
    
    try {
      console.log('📍 근무기록 매장 필터 로드:');
      
      // 🔥 Service Layer 사용
      const storesList = await storeService.getStores(companyId);
      
      const stores = storesList.map(store => ({
        id: store.id!,
        name: store.name || store.storeName || '매장',
      }));
      
      setStores(stores);
      
      // 🔥 첫 번째 매장을 자동 선택
      if (stores.length > 0) {
        setFilters(prev => ({ ...prev, storeId: stores[0].id }));
        console.log(`✅ 첫 번째 매장 자동 선택: ${stores[0].id}`);
      }
      
      console.log('✅ 근무기록 매장 필터 로드 완료:', stores.length, '개 매장');
    } catch (err) {
      console.error('❌ 근무기록 매장 필터 로드 실패:', err);
    }
  }, [companyId]);

  /**
   * 근태 목록 로드 (백업: loadAttendanceList 함수 라인 3316~3473)
   * 🔥 Phase 4: DB Query 최적화 - Service Layer 사용
   */
  const loadAttendanceList = useCallback(async () => {
    console.log('🔍 loadAttendanceList 호출됨');
    
    if (!filters.storeId) {
      console.warn('⚠️ 매장을 선택해주세요');
      setAttendanceList([]);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // 🔥 Service Layer 사용 - DB에서 필터링
      const list = await attendanceService.getAttendanceRecords(companyId, {
        storeId: filters.storeId,
        startDate: filters.month ? `${filters.month}-01` : undefined,
        endDate: filters.month ? `${filters.month}-31` : undefined,
      });
      
      console.log('📊 DB Raw Records:', list);
      console.log(`✅ 총 근태 기록: ${list.length}건`);
      
      // 🔥 근무상태 필터는 직원 status와 조인이 필요하므로 클라이언트에서 처리
      // (Firestore는 컬렉션 간 JOIN을 지원하지 않음)
      if (filters.employmentStatus && filters.employmentStatus !== 'all') {
        // employeeService로 직원 목록 가져오기
        const employees = await employeeService.getEmployees(companyId, {
          status: filters.employmentStatus === 'active' ? 'approved' : 'resigned',
        });
        
        const employeeIds = new Set(employees.map(e => e.id));
        const filtered = list.filter(att => employeeIds.has(att.userId || att.uid));
        
        console.log(`👤 근무상태 필터 적용 (${filters.employmentStatus}): ${list.length} → ${filtered.length}건`);
        setAttendanceList(filtered);
      } else {
        setAttendanceList(list);
      }
      
      setLoading(false);

    } catch (err: any) {
      console.error('❌ 근태 목록 로드 실패:', err);
      setError(err.message || '근태 정보를 불러오는데 실패했습니다.');
      setAttendanceList([]);
      setLoading(false);
    }
  }, [companyId, filters]);

  /**
   * 관리자 근태 수정
   */
  const updateAttendance = useCallback(async (
    attendanceId: string,
    updates: Partial<AttendanceRecord>
  ) => {
    try {
      console.log(`🔄 근태 수정 시작: ${attendanceId}`, updates);

      await updateDoc(doc(db, 'attendance', attendanceId), {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      console.log(`✅ 근태 수정 완료`);

      // 목록 새로고침
      await loadAttendanceList();

      return { success: true, message: '✅ 근태 기록이 수정되었습니다.' };

    } catch (err: any) {
      console.error('❌ 근태 수정 실패:', err);
      return { success: false, message: err.message || '근태 수정에 실패했습니다.' };
    }
  }, [loadAttendanceList]);

  /**
   * 강제 퇴근 처리 (좀비 데이터 수동 처리)
   * 
   * 사용 케이스:
   * - clockOut이 누락된 '근무중' 상태 데이터 강제 종료
   * - 관리자가 퇴근 시간을 수동으로 입력하여 처리
   */
  const forceClockOut = useCallback(async (
    attendanceId: string, 
    clockOutTime: string // "HH:mm" 형식
  ): Promise<{ success: boolean; message: string }> => {
    try {
      console.log(`🚨 강제 퇴근 처리 시작: ${attendanceId}, ${clockOutTime}`);
      
      // 1. 기존 출근 기록 조회
      const docRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
      const docSnap = await getDocs(query(collection(db, COLLECTIONS.ATTENDANCE), where('__name__', '==', attendanceId), limit(1)));
      
      if (docSnap.empty) {
        return { success: false, message: '❌ 출근 기록을 찾을 수 없습니다.' };
      }
      
      const attendanceData = docSnap.docs[0].data() as AttendanceRecord;
      
      // 2. clockIn 시간 확인
      if (!attendanceData.clockIn) {
        return { success: false, message: '❌ 출근 기록이 없습니다.' };
      }
      
      // 3. clockOutTime(HH:mm)을 오늘 날짜의 Timestamp로 변환
      const [hours, minutes] = clockOutTime.split(':').map(Number);
      const today = new Date();
      today.setHours(hours, minutes, 0, 0);
      const clockOutTimestamp = Timestamp.fromDate(today);
      
      // 4. 근무 시간 계산 (분 단위)
      const clockInTime = attendanceData.clockIn instanceof Timestamp 
        ? attendanceData.clockIn.toDate().getTime()
        : new Date(attendanceData.clockIn as any).getTime();
      
      const clockOutTimeMs = clockOutTimestamp.toDate().getTime();
      const workMinutes = Math.floor((clockOutTimeMs - clockInTime) / 1000 / 60);
      
      if (workMinutes < 0) {
        return { success: false, message: '❌ 퇴근 시간이 출근 시간보다 이전입니다.' };
      }
      
      console.log(`📊 근무시간 계산: ${workMinutes}분 (${(workMinutes / 60).toFixed(2)}시간)`);
      
      // 5. Firestore 업데이트
      await updateDoc(docRef, {
        clockOut: clockOutTimestamp,
        workMinutes: workMinutes,
        updatedAt: Timestamp.now(),
      });
      
      console.log(`✅ 강제 퇴근 처리 완료: ${attendanceId}`);
      
      // 6. 목록 새로고침
      await loadAttendanceList();
      
      return { 
        success: true, 
        message: `✅ 퇴근 처리 완료\n근무시간: ${(workMinutes / 60).toFixed(1)}시간` 
      };
      
    } catch (err: any) {
      console.error('❌ 강제 퇴근 처리 실패:', err);
      return { 
        success: false, 
        message: err.message || '❌ 퇴근 처리 중 오류가 발생했습니다.' 
      };
    }
  }, [loadAttendanceList]);

  /**
   * 필터 업데이트
   */
  const updateFilters = useCallback((newFilters: Partial<AttendanceFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * 초기 로드
   */
  useEffect(() => {
    if (companyId) {
      loadStores();
    }
  }, [companyId, loadStores]);

  return {
    // State
    attendanceList,
    loading,
    error,
    filters,
    stores,
    
    // Actions
    loadAttendanceList,
    updateAttendance,
    forceClockOut,  // 🆕 강제 퇴근 처리
    updateFilters,
    calculateAttendanceStatus,
  };
}
