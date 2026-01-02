/**
 * 근무스케줄 관리 로직 Hook
 * 백업: admin-dashboard.html 라인 11806-12155 (loadSchedules 함수)
 * 
 * Phase 1: 기본 스케줄 조회 (테이블 뷰)
 * - 매장별 스케줄 조회
 * - 주차 네비게이션
 * - 계약서 기반 스케줄 표시
 * 
 * Phase 2 (추후): 고급 기능
 * - 간트차트 뷰
 * - 출퇴근 기록 모드 (실시간 리스너)
 * - 스케줄 시뮬레이터
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Schedule,
  EmployeeWeekSchedule,
  WeekScheduleData,
  ScheduleFilters,
  WeekInfo,
  DayOfWeek,
  ScheduleDetail
} from '@/lib/types/schedule';
import { useAuth } from '@/lib/auth-context';
import { COLLECTIONS } from '@/lib/constants';

interface UseSchedulesLogicProps {
  companyId: string;
}

interface Store {
  id: string;
  name: string;
}

/**
 * 🔒 시간 차이 계산 헬퍼 함수
 * clockIn과 clockOut을 사용하여 근무 시간 자동 계산
 * Firestore Timestamp / Date 객체 / 문자열(HH:mm) 모두 처리
 */
const calculateDuration = (start: any, end: any): number => {
  if (!start || !end) return 0;
  
  // Helper to get timestamp in ms or minutes
  const getTime = (val: any): { value: number; isMinutes: boolean } => {
    // Firestore Timestamp
    if (val?.seconds !== undefined) {
      return { value: val.seconds * 1000, isMinutes: false };
    }
    
    // JS Date
    if (val instanceof Date) {
      return { value: val.getTime(), isMinutes: false };
    }
    
    // "HH:mm" string
    if (typeof val === 'string' && val.includes(':')) {
      const [h, m] = val.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        return { value: h * 60 + m, isMinutes: true };
      }
    }
    
    return { value: 0, isMinutes: false };
  };

  const startResult = getTime(start);
  const endResult = getTime(end);

  if (startResult.value === 0 || endResult.value === 0) return 0;

  // If using minutes (string format "HH:mm")
  if (startResult.isMinutes && endResult.isMinutes) {
    let diffMins = endResult.value - startResult.value;
    // Overnight shift (e.g., 23:00 - 02:00)
    if (diffMins < 0) diffMins += 24 * 60;
    return Number((diffMins / 60).toFixed(1));
  }

  // If using timestamps (Date/Firestore Timestamp)
  let diffMs = endResult.value - startResult.value;
  // If result is negative (rare for timestamps unless error), return 0
  if (diffMs < 0) return 0;
  
  return Number((diffMs / (1000 * 60 * 60)).toFixed(1));
};

export function useSchedulesLogic({ companyId }: UseSchedulesLogicProps) {
  const { user } = useAuth();
  
  const [scheduleData, setScheduleData] = useState<WeekScheduleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  
  const [filters, setFilters] = useState<ScheduleFilters>({
    storeId: '',
    displayMode: 'schedule',
    currentWeek: getMonday(new Date()),
  });

  /**
   * 월요일 가져오기
   */
  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  /**
   * 주차 번호 계산
   */
  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * 주차 정보 생성
   */
  function getWeekInfo(monday: Date): WeekInfo {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    const year = monday.getFullYear();
    const weekNum = getWeekNumber(monday);
    
    const monthStart = monday.getMonth() + 1;
    const dayStart = monday.getDate();
    const monthEnd = sunday.getMonth() + 1;
    const dayEnd = sunday.getDate();
    
    const displayText = `${year}년 ${monthStart}월 ${weekNum}주차 (${monthStart}/${dayStart} ~ ${monthEnd}/${dayEnd})`;
    
    return { year, weekNum, monday, sunday, displayText };
  }

  /**
   * 매장 목록 로드
   */
  const loadStores = async () => {
    if (!companyId) return;
    
    try {
      const storesQuery = query(
        collection(db, COLLECTIONS.STORES),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(storesQuery);
      const storesList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().storeName || '',
      }));
      setStores(storesList);
    } catch (error) {
      console.error('❌ 매장 로드 실패:', error);
    }
  };

  // 실시간 리스너 저장
  const [attendanceListener, setAttendanceListener] = useState<(() => void) | null>(null);

  /**
   * 실시간 리스너 해제
   */
  const detachAttendanceListener = () => {
    if (attendanceListener) {
      console.log('🔌 출퇴근 기록 실시간 리스너 해제');
      attendanceListener();
      setAttendanceListener(null);
    }
  };

  /**
   * 출퇴근 기록 데이터 로드 (실시간 리스너)
   * 백업: admin-dashboard.html 라인 12241-12403
   */
  const loadAttendanceData = async (storeId: string, monday: Date) => {
    try {
      // 기존 리스너 해제
      detachAttendanceListener();
      
      // 매장 정보 가져오기 (디버깅용)
      const storeDoc = await getDoc(doc(db, 'stores', storeId));
      const storeName = storeDoc.exists() ? storeDoc.data().name : '';
      
      console.log(`🔍 출퇴근 기록 실시간 리스너 설정: ${storeName} (storeId: ${storeId})`);
      
      // 주간 기간 계산
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      const startDateStr = monday.toISOString().split('T')[0];
      const endDateStr = sunday.toISOString().split('T')[0];
      
      console.log(`📅 조회 기간: ${startDateStr} ~ ${endDateStr}`);
      
      // 실시간 리스너 설정 (storeId 기준으로 변경)
      const attendanceQuery = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('companyId', '==', companyId),
        where('storeId', '==', storeId),
        where('date', '>=', startDateStr),
        where('date', '<=', endDateStr)
      );
      
      const { onSnapshot } = await import('firebase/firestore');
      
      const unsubscribe = onSnapshot(
        attendanceQuery,
        (snapshot) => {
          console.log(`🔄 실시간 업데이트: ${snapshot.size}건의 출퇴근 기록`);
          
          const days: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];
          const employeeMap: Record<string, EmployeeWeekSchedule> = {};
          
          snapshot.forEach(doc => {
            const data = doc.data();
            const empUid = data.uid;
            const empName = data.employeeName || data.name || '이름없음';
            
            if (!employeeMap[empUid]) {
              employeeMap[empUid] = {
                uid: empUid,
                name: empName,
                schedules: {
                  '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': []
                },
              };
            }
            
            // 날짜 → 요일 변환
            const attendanceDate = new Date(data.date + 'T00:00:00');
            const dayIndex = (attendanceDate.getDay() + 6) % 7;
            const day = days[dayIndex];
            
            // 상태 판별
            let status = 'normal';
            let statusText = '정상';
            
            if (!data.clockIn && !data.clockOut) {
              status = 'absent';
              statusText = '결근';
            } else if (!data.clockOut) {
              status = 'working';
              statusText = '근무중';
            } else if (data.status === 'late' || data.status === 'early') {
              status = data.status;
              statusText = data.status === 'late' ? '지각' : '조퇴';
            }
            
            employeeMap[empUid].schedules[day] = [{
              startTime: data.clockIn || '',
              endTime: data.clockOut || '',
              hours: data.actualHours || calculateDuration(data.clockIn, data.clockOut),
              isWorkDay: true,
              status,
              statusText,
              scheduledStart: data.scheduledStartTime || '',
              scheduledEnd: data.scheduledEndTime || '',
            }];
          });
          
          const employees = Object.values(employeeMap);
          const weekInfo = getWeekInfo(monday);
          
          setScheduleData({
            type: 'attendance',
            year: weekInfo.year,
            weekNum: weekInfo.weekNum,
            monday: startDateStr,
            employees,
          });
          
          console.log(`✅ 직원 ${employees.length}명의 출퇴근 기록 실시간 업데이트 완료`);
        },
        (error) => {
          console.error('❌ 출퇴근 기록 실시간 리스너 오류:', error);
        }
      );
      
      setAttendanceListener(() => unsubscribe);
      
    } catch (error) {
      console.error('❌ 출퇴근 기록 로드 실패:', error);
      setScheduleData({
        type: 'attendance',
        year: new Date().getFullYear(),
        weekNum: 1,
        monday: '',
        employees: [],
      });
    }
  };

  /**
   * 스케줄 데이터 로드
   * 백업: admin-dashboard.html 라인 11901-12155
   */
  const loadSchedules = async () => {
    if (!companyId || !filters.storeId) {
      detachAttendanceListener();
      setScheduleData(null);
      return;
    }
    
    setLoading(true);
    try {
      const monday = getMonday(filters.currentWeek);
      
      // 출퇴근 기록 모드: 실시간 리스너 사용
      if (filters.displayMode === 'attendance') {
        await loadAttendanceData(filters.storeId, monday);
        setLoading(false);
        return;
      }
      
      // 스케줄표 모드: 기존 로직
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      
      const mondayStr = monday.toISOString().split('T')[0];
      const sundayStr = sunday.toISOString().split('T')[0];
      
      console.log(`📅 스케줄 조회: ${mondayStr} ~ ${sundayStr}`);
      
      // 1. 선택된 매장 정보 가져오기
      const storeDoc = await getDoc(doc(db, 'stores', filters.storeId));
      const storeName = storeDoc.exists() ? storeDoc.data().name : '';
      
      // 2. 해당 매장의 직원 조회 (퇴사자 제외)
      const employeesQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('companyId', '==', companyId),
        where('role', 'in', ['staff', 'employee']),
        where('storeName', '==', storeName)
      );
      const employeesSnapshot = await getDocs(employeesQuery);
      
      console.log(`👥 "${storeName}" 매장 직원: ${employeesSnapshot.size}명`);
      
      const days: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];
      const employees: EmployeeWeekSchedule[] = [];
      
      // 3. 각 직원의 주간 스케줄 조회
      for (const empDoc of employeesSnapshot.docs) {
        const empData = empDoc.data();
        const empUid = empDoc.id;
        
        // 퇴사자 제외
        if (empData.status === 'resigned') {
          continue;
        }
        
        // 해당 직원의 주간 스케줄 조회
        const schedulesQuery = query(
          collection(db, COLLECTIONS.SCHEDULES),
          where('companyId', '==', companyId),
          where('userId', '==', empUid),
          where('date', '>=', mondayStr),
          where('date', '<=', sundayStr)
        );
        const schedulesSnapshot = await getDocs(schedulesQuery);
        
        console.log(`  📅 ${empData.name}: ${schedulesSnapshot.size}개 근무 조회됨`);
        
        // 요일별 스케줄 정리
        const schedules: { [key in DayOfWeek]: ScheduleDetail[] } = {
          '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': []
        };
        
        // 날짜별 그룹화
        const schedulesByDate: Record<string, Schedule[]> = {};
        
        schedulesSnapshot.forEach(doc => {
          const data = doc.data() as Schedule;
          const date = data.date;
          
          if (!schedulesByDate[date]) {
            schedulesByDate[date] = [];
          }
          
          // Timestamp 필드 제거하여 안전하게 전달
          const { createdAt, updatedAt, createdBy, updatedBy, ...safeData } = data;
          
          schedulesByDate[date].push({
            ...safeData,
            id: doc.id,
          });
        });
        
        // 날짜별 처리
        Object.keys(schedulesByDate).forEach(date => {
          const dateSchedules = schedulesByDate[date];
          const scheduleDate = new Date(date + 'T00:00:00');
          const dayOfWeek = scheduleDate.getDay(); // 0=일, 1=월, ..., 6=토
          const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 월=0, ..., 일=6
          const dayName = days[dayIndex];
          
          // 각 날짜의 스케줄 처리
          dateSchedules.forEach(schedule => {
            const plannedTimes = schedule.plannedTimes || [];
            
            // plannedTimes 배열의 각 항목을 스케줄로 추가 (여러 계약서 병합 지원)
            if (plannedTimes.length > 0) {
              plannedTimes.forEach(planned => {
                schedules[dayName].push({
                  isWorkDay: true,
                  startTime: planned.startTime,
                  endTime: planned.endTime,
                  hours: planned.workHours,
                  breakTime: planned.breakTime,
                  isShiftReplacement: false, // 교대 구분은 shiftType으로
                  contractId: planned.contractId,
                  isAdditional: planned.isAdditional,
                  shiftType: planned.shiftType,
                  isHoliday: planned.isHoliday,
                });
              });
            } else {
              // Legacy 호환: plannedTimes 없으면 startTime/endTime 직접 사용
              schedules[dayName].push({
                isWorkDay: true,
                startTime: schedule.startTime || '',
                endTime: schedule.endTime || '',
                hours: schedule.workHours,
                breakTime: schedule.breakTime,
                isShiftReplacement: schedule.isShiftReplacement || false,
              });
            }
            
            // actualTime이 있으면 별도 표시 (실제 출퇴근 기록)
            if (schedule.actualTime) {
              // TODO: actualTime 표시 로직 추가
              console.log('  📍 실제 출퇴근:', schedule.actualTime);
            }
          });
        });
        
        employees.push({
          uid: empUid,
          name: empData.name,
          role: empData.role,
          schedules,
        });
      }
      
      const weekInfo = getWeekInfo(monday);
      
      setScheduleData({
        type: filters.displayMode,
        year: weekInfo.year,
        weekNum: weekInfo.weekNum,
        monday: mondayStr,
        employees,
      });
      
      console.log(`✅ 스케줄 로드 완료: ${employees.length}명`);
      
    } catch (error) {
      console.error('❌ 스케줄 로드 실패:', error);
      alert('스케줄을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 주차 변경
   */
  const changeWeek = (offset: number) => {
    const newWeek = new Date(filters.currentWeek);
    newWeek.setDate(newWeek.getDate() + offset * 7);
    updateFilters({ currentWeek: getMonday(newWeek) });
  };

  /**
   * 필터 업데이트
   */
  const updateFilters = (newFilters: Partial<ScheduleFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  /**
   * 주차 정보 텍스트
   */
  const getWeekDisplayText = (): string => {
    const monday = getMonday(filters.currentWeek);
    return getWeekInfo(monday).displayText;
  };

  // 초기 로드
  useEffect(() => {
    if (companyId) {
      loadStores();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId && filters.storeId) {
      loadSchedules();
    }
  }, [companyId, filters.storeId, filters.currentWeek, filters.displayMode]);

  // 컴포넌트 언마운트 시 리스너 해제
  useEffect(() => {
    return () => {
      detachAttendanceListener();
    };
  }, []);

  return {
    scheduleData,
    loading,
    filters,
    stores,
    updateFilters,
    loadSchedules,
    changeWeek,
    getWeekDisplayText,
    getWeekInfo,
  };
}
