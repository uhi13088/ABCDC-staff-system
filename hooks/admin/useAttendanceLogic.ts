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
   * 근태 상태 자동 계산 (백업: calculateAttendanceStatus 함수 라인 3206~3245)
   */
  const calculateAttendanceStatus = useCallback((att: AttendanceRecord): AttendanceStatusResult => {
    // attendance 문서에 status 필드가 있으면 우선 사용 (직원이 수동으로 결근 표시한 경우)
    if (att.status === 'absent') {
      return { text: '결근', class: 'danger' };
    }
    
    // 출근 기록 없음
    if (!att.clockIn) {
      return { text: '결근', class: 'danger' };
    }
    
    // 퇴근 기록 없음 (아직 근무 중)
    if (!att.clockOut) {
      return { text: '근무중', class: 'info' };
    }
    
    // 기본값: 정상
    let status: AttendanceStatusResult = { text: '정상', class: 'success' };
    
    // 지각/조퇴 판정을 위해 계약서 기준 시간이 필요하지만
    // 여기서는 간단하게 일반적인 기준으로 판정
    // TODO: 계약서 기준 시간과 비교하여 정확한 판정 가능
    
    // 09:00 이후 출근은 지각으로 임시 판정
    const isLate = att.clockIn > '09:00';
    
    // 18:00 이전 퇴근은 조퇴로 임시 판정
    const isEarlyLeave = att.clockOut < '18:00';
    
    if (isLate && isEarlyLeave) {
      return { text: '지각+조퇴', class: 'danger' };
    } else if (isLate) {
      return { text: '지각', class: 'danger' };
    } else if (isEarlyLeave) {
      return { text: '조퇴', class: 'danger' };
    }
    
    return status;
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
    updateFilters,
    calculateAttendanceStatus,
  };
}
