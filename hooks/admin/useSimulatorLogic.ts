/**
 * 스케줄 시뮬레이터 로직 훅
 * 백업: admin-dashboard.html 라인 13036-13819 (스케줄 시뮬레이터 로직)
 */

import { useState, useCallback, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Simulator, 
  SimulatorPerson, 
  ScheduleGroup, 
  SimulatorSchedule,
  ScheduleDetail,
  DayOfWeek
} from '@/lib/types/schedule';

/**
 * 시뮬레이터 상태 인터페이스
 */
interface SimulatorState {
  // 시뮬레이터 목록
  simulatorList: Simulator[];
  
  // 현재 시뮬레이터
  currentSimulator: Simulator | null;
  currentSimulatorId: string | null;
  
  // 가상 인원
  persons: SimulatorPerson[];
  
  // 스케줄 데이터
  schedules: SimulatorSchedule;
  
  // 현재 주차
  currentWeek: Date;
  
  // 로딩 상태
  loading: boolean;
}

export function useSimulatorLogic(companyId: string) {
  const [state, setState] = useState<SimulatorState>({
    simulatorList: [],
    currentSimulator: null,
    currentSimulatorId: null,
    persons: [],
    schedules: {},
    currentWeek: getMonday(new Date()),
    loading: false,
  });

  // ============================================
  // 유틸리티 함수
  // ============================================

  /**
   * 월요일 구하기
   */
  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  /**
   * 주차 계산
   */
  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * 주차 키 생성 (YYYY-WW)
   */
  function getWeekKey(date: Date): string {
    const monday = getMonday(date);
    const year = monday.getFullYear();
    const weekNum = getWeekNumber(monday);
    return `${year}-${weekNum}`;
  }

  /**
   * 근무 시간 계산
   */
  function calculateWorkHours(startTime: string, endTime: string, breakMinutes: number = 0): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let start = startHour * 60 + startMin;
    let end = endHour * 60 + endMin;
    
    // 다음날로 넘어가는 경우 (예: 22:00 ~ 02:00)
    if (end < start) {
      end += 24 * 60;
    }
    
    const totalMinutes = end - start - breakMinutes;
    return Math.max(0, totalMinutes / 60);
  }

  // ============================================
  // 시뮬레이터 목록 관리
  // ============================================

  /**
   * 시뮬레이터 목록 로드
   */
  const loadSimulatorList = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const q = query(
        collection(db, 'simulators'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const list: Simulator[] = [];
      
      snapshot.forEach(doc => {
        list.push({
          id: doc.id,
          ...doc.data(),
        } as Simulator);
      });
      
      setState(prev => ({
        ...prev,
        simulatorList: list,
        loading: false,
      }));
      
      console.log(`✅ ${list.length}개 시뮬레이터 로드 완료`);
    } catch (error) {
      console.error('❌ 시뮬레이터 목록 로드 실패:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * 특정 시뮬레이터 로드
   */
  const loadSimulator = useCallback(async (simulatorId: string) => {
    if (!simulatorId) {
      // 새 시뮬레이터
      setState(prev => ({
        ...prev,
        currentSimulator: null,
        currentSimulatorId: null,
        persons: [],
        schedules: {},
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const docRef = doc(db, 'simulators', simulatorId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const simulator = {
          id: docSnap.id,
          ...docSnap.data(),
        } as Simulator;
        
        // 스케줄 재생성
        const newSchedules = generateSchedulesFromPersons(simulator.persons, state.currentWeek);
        
        setState(prev => ({
          ...prev,
          currentSimulator: simulator,
          currentSimulatorId: simulatorId,
          persons: simulator.persons || [],
          schedules: newSchedules,
          loading: false,
        }));
        
        console.log(`✅ 시뮬레이터 로드 완료: ${simulator.name}`);
      } else {
        console.error('❌ 시뮬레이터를 찾을 수 없습니다.');
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('❌ 시뮬레이터 로드 실패:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.currentWeek]);

  /**
   * 시뮬레이터 저장
   */
  const saveSimulator = useCallback(async (name: string) => {
    if (!name.trim()) {
      alert('시뮬레이터 이름을 입력해주세요.');
      return false;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));

      const simulatorData: Simulator = {
        name: name.trim(),
        companyId,
        persons: state.persons,
        updatedAt: Timestamp.now(),
      };

      let docId = state.currentSimulatorId;

      if (docId) {
        // 업데이트
        await setDoc(doc(db, 'simulators', docId), simulatorData, { merge: true });
        console.log(`✅ 시뮬레이터 업데이트 완료: ${name}`);
      } else {
        // 새로 생성
        simulatorData.createdAt = Timestamp.now();
        const newDocRef = doc(collection(db, 'simulators'));
        await setDoc(newDocRef, simulatorData);
        docId = newDocRef.id;
        console.log(`✅ 시뮬레이터 생성 완료: ${name}`);
      }

      // 목록 새로고침
      await loadSimulatorList();
      
      // 현재 시뮬레이터 업데이트
      setState(prev => ({
        ...prev,
        currentSimulator: { ...simulatorData, id: docId },
        currentSimulatorId: docId,
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error('❌ 시뮬레이터 저장 실패:', error);
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [companyId, state.persons, state.currentSimulatorId, loadSimulatorList]);

  /**
   * 시뮬레이터 삭제
   */
  const deleteSimulator = useCallback(async () => {
    if (!state.currentSimulatorId) {
      alert('삭제할 시뮬레이터가 없습니다.');
      return false;
    }

    if (!confirm('정말 이 시뮬레이터를 삭제하시겠습니까?')) {
      return false;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));
      
      await deleteDoc(doc(db, 'simulators', state.currentSimulatorId));
      
      // 초기화
      setState(prev => ({
        ...prev,
        currentSimulator: null,
        currentSimulatorId: null,
        persons: [],
        schedules: {},
        loading: false,
      }));
      
      // 목록 새로고침
      await loadSimulatorList();
      
      console.log('✅ 시뮬레이터 삭제 완료');
      return true;
    } catch (error) {
      console.error('❌ 시뮬레이터 삭제 실패:', error);
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [state.currentSimulatorId, loadSimulatorList]);

  /**
   * 새 시뮬레이터 생성
   */
  const createNewSimulator = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentSimulator: null,
      currentSimulatorId: null,
      persons: [],
      schedules: {},
    }));
  }, []);

  // ============================================
  // 가상 인원 관리
  // ============================================

  /**
   * 가상 인원 추가
   */
  const addPerson = useCallback(() => {
    const personId = `person-${Date.now()}`;
    const personName = String.fromCharCode(65 + state.persons.length); // A, B, C...

    const newPerson: SimulatorPerson = {
      id: personId,
      name: personName,
      salaryType: 'none',
      scheduleGroups: [],
    };

    setState(prev => ({
      ...prev,
      persons: [...prev.persons, newPerson],
    }));

    return personId;
  }, [state.persons.length]);

  /**
   * 가상 인원 수정
   */
  const updatePerson = useCallback((personId: string, updates: Partial<SimulatorPerson>) => {
    setState(prev => {
      const newPersons = prev.persons.map(p =>
        p.id === personId ? { ...p, ...updates } : p
      );

      // 스케줄 재생성
      const newSchedules = generateSchedulesFromPersons(newPersons, prev.currentWeek);

      return {
        ...prev,
        persons: newPersons,
        schedules: newSchedules,
      };
    });
  }, []);

  /**
   * 가상 인원 삭제
   */
  const deletePerson = useCallback((personId: string) => {
    if (!confirm('이 가상 인원을 삭제하시겠습니까?')) {
      return;
    }

    setState(prev => {
      const newPersons = prev.persons.filter(p => p.id !== personId);
      
      // 스케줄에서도 제거
      const newSchedules = { ...prev.schedules };
      delete newSchedules[personId];

      return {
        ...prev,
        persons: newPersons,
        schedules: newSchedules,
      };
    });
  }, []);

  // ============================================
  // 스케줄 생성
  // ============================================

  /**
   * 가상 인원 배열에서 스케줄 생성
   */
  function generateSchedulesFromPersons(persons: SimulatorPerson[], currentWeek: Date): SimulatorSchedule {
    const weekKey = getWeekKey(currentWeek);
    const days: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];
    
    const newSchedules: SimulatorSchedule = {};

    persons.forEach(person => {
      if (!newSchedules[person.id]) {
        newSchedules[person.id] = {};
      }
      
      if (!newSchedules[person.id][weekKey]) {
        newSchedules[person.id][weekKey] = {} as any;
      }

      // 각 요일별로 스케줄 생성
      days.forEach(day => {
        // 해당 요일에 근무하는 그룹 찾기
        const matchingGroup = person.scheduleGroups.find(group => group.days.includes(day));
        
        if (matchingGroup) {
          const hours = calculateWorkHours(
            matchingGroup.startTime,
            matchingGroup.endTime,
            matchingGroup.breakMinutes || 0
          );

          newSchedules[person.id][weekKey][day] = {
            isWorkDay: true,
            startTime: matchingGroup.startTime,
            endTime: matchingGroup.endTime,
            hours,
            breakTime: matchingGroup.breakMinutes
              ? {
                  start: '',
                  end: '',
                  minutes: matchingGroup.breakMinutes,
                }
              : undefined,
          };
        } else {
          newSchedules[person.id][weekKey][day] = null;
        }
      });
    });

    return newSchedules;
  }

  // ============================================
  // 주차 변경
  // ============================================

  /**
   * 주차 변경
   */
  const changeWeek = useCallback((offset: number) => {
    setState(prev => {
      const newWeek = new Date(prev.currentWeek);
      newWeek.setDate(newWeek.getDate() + offset * 7);

      // 스케줄 재생성
      const newSchedules = generateSchedulesFromPersons(prev.persons, newWeek);

      return {
        ...prev,
        currentWeek: newWeek,
        schedules: newSchedules,
      };
    });
  }, []);

  // ============================================
  // 초기 로드
  // ============================================

  useEffect(() => {
    loadSimulatorList();
  }, [loadSimulatorList]);

  // ============================================
  // 반환
  // ============================================

  return {
    // 상태
    ...state,

    // 시뮬레이터 관리
    loadSimulatorList,
    loadSimulator,
    saveSimulator,
    deleteSimulator,
    createNewSimulator,

    // 가상 인원 관리
    addPerson,
    updatePerson,
    deletePerson,

    // 주차 변경
    changeWeek,

    // 유틸리티
    getWeekKey,
    getWeekNumber,
    calculateWorkHours,
  };
}
