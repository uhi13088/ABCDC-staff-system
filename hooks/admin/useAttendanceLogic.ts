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
import type { 
  AttendanceRecord, 
  AttendanceFilterOptions, 
  AttendanceStatusResult 
} from '@/lib/types/attendance';

interface UseAttendanceLogicProps {
  companyId: string;
}

export function useAttendanceLogic({ companyId }: UseAttendanceLogicProps) {
  // State
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AttendanceFilterOptions>({
    employmentStatus: 'active', // 기본값: 재직자만
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
      
      const storesQuery = query(
        collection(db, 'stores'),
        where('companyId', '==', companyId)
      );
      
      const snapshot = await getDocs(storesQuery);
      
      const storesList = snapshot.docs.map((docSnap, index) => {
        const store = docSnap.data();
        const storeId = docSnap.id;
        
        console.log(`  - 매장: "${store.name}" (ID: ${storeId})`);
        
        return {
          id: storeId,
          name: store.name || store.storeName || '매장',
        };
      });
      
      setStores(storesList);
      
      // 🔥 첫 번째 매장을 자동 선택
      if (storesList.length > 0) {
        setFilters(prev => ({ ...prev, storeId: storesList[0].id }));
        console.log(`✅ 첫 번째 매장 자동 선택: ${storesList[0].id}`);
      }
      
      console.log('✅ 근무기록 매장 필터 로드 완료:', snapshot.size, '개 매장');
    } catch (err) {
      console.error('❌ 근무기록 매장 필터 로드 실패:', err);
    }
  }, [companyId]);

  /**
   * 근태 목록 로드 (백업: loadAttendanceList 함수 라인 3316~3473)
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
      console.log('🔍 Firestore 쿼리 시작: attendance 컬렉션');
      console.log('🔍 쿼리 조건:', { storeId: filters.storeId, companyId });
      
      // Firestore에서 근태 데이터 가져오기
      let attendanceQuery = query(
        collection(db, 'attendance'),
        where('storeId', '==', filters.storeId),
        where('companyId', '==', companyId),
        orderBy('date', 'desc'),
        limit(100)
      );

      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      console.log('📊 조회 결과:', {
        empty: attendanceSnapshot.empty,
        size: attendanceSnapshot.size,
      });
      
      if (attendanceSnapshot.empty) {
        console.warn('⚠️ attendance 컬렉션이 비어있습니다');
        setAttendanceList([]);
        setLoading(false);
        return;
      }
      
      let list: AttendanceRecord[] = [];
      attendanceSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log('📄 문서 데이터:', { id: docSnap.id, data });
        
        list.push({
          id: docSnap.id,
          userId: data.userId || data.uid,
          uid: data.uid,
          name: data.name || data.employeeName || '-',
          employeeName: data.employeeName || data.name || '-',
          companyId: data.companyId,
          storeId: data.storeId,
          store: data.store || '-',
          date: data.date || '-',
          clockIn: data.clockIn,
          clockOut: data.clockOut,
          workType: data.workType || '정규근무',
          status: data.status,
          workMinutes: data.workMinutes,
          absentReason: data.absentReason,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      
      console.log('✅ 총 근태 기록:', list.length);
      
      // 근무상태 필터를 위해 직원 정보 가져오기
      const usersQuery = query(
        collection(db, 'users'),
        where('companyId', '==', companyId)
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const employeeStatusMap: Record<string, string> = {};
      const employeeNamesMap: Record<string, string> = {};
      
      usersSnapshot.forEach((docSnap) => {
        const user = docSnap.data();
        // status 필드로 재직자/퇴사자 판단
        employeeStatusMap[docSnap.id] = user.status || 'active';
        // 이름 매핑
        employeeNamesMap[docSnap.id] = user.name || '-';
      });
      
      // attendance 데이터에 직원 이름 추가
      list = list.map(att => ({
        ...att,
        employeeName: att.employeeName || att.name || employeeNamesMap[att.uid] || '-',
      }));
      
      // 클라이언트 사이드 필터링: 월 필터
      if (filters.month) {
        list = list.filter(att => att.date && att.date.startsWith(filters.month!));
        console.log(`📅 월 필터 적용 (${filters.month}):`, list.length);
      }
      
      // 매장 필터 (이미 서버에서 필터링됨, 이중 체크)
      // ✅ FIXED: storeId 기준으로 통일 (store 매장명 → storeId UUID)
      if (filters.store) {
        list = list.filter(att => 
          att.storeId === filters.store || att.store === filters.store // 폴백: 레거시 호환
        );
        console.log(`🏪 매장 필터 적용 (${filters.store}):`, list.length);
      }
      
      // 근무상태 필터 적용
      list = list.filter(att => {
        const empStatus = employeeStatusMap[att.uid];
        
        if (filters.employmentStatus === 'active') {
          // 재직자만
          return empStatus === 'approved' || empStatus === 'active';
        } else if (filters.employmentStatus === 'resigned') {
          // 퇴사자만
          return empStatus === 'resigned';
        } else {
          // 전체 = 재직자 + 퇴사자 모두
          return true;
        }
      });
      
      console.log(`👤 근무상태 필터 적용 (${filters.employmentStatus || '기본:재직자'}):`, list.length);
      
      setAttendanceList(list);
      setLoading(false);

    } catch (err: any) {
      console.error('❌ 근태 목록 로드 실패:', err);
      setError(err.message || '근태 정보를 불러오는데 실패했습니다.');
      setAttendanceList([]);
      setLoading(false);
    }
  }, [companyId, filters, calculateAttendanceStatus]);

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
