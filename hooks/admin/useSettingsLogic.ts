import { useState } from 'react';

/**
 * Settings Hook (스케줄 시뮬레이터 Person 관리)
 * 원본 파일: admin-dashboard.html
 * 기존 함수: addSimulatorPerson, editSimulatorPerson, deleteSimulatorPerson, savePersonSettings
 */

// Person 데이터 타입
export interface SimulatorPerson {
  id: string;
  name: string;
  salaryType: 'hourly' | 'monthly' | null;
  salaryAmount: number | null;
  schedules: SimulatorSchedule[];
}

// Schedule 데이터 타입
export interface SimulatorSchedule {
  days: string[]; // ['월', '화', '수']
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export const useSettingsLogic = () => {
  const [persons, setPersons] = useState<SimulatorPerson[]>([]);
  const [currentEditingPerson, setCurrentEditingPerson] = useState<SimulatorPerson | null>(null);

  // ==================== 다음 알파벳 이름 생성 ====================
  const getNextName = (count: number): string => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    if (count < 26) {
      return alphabet[count];
    } else {
      const first = Math.floor(count / 26) - 1;
      const second = count % 26;
      return alphabet[first] + alphabet[second];
    }
  };

  // ==================== Person 추가 ====================
  const addSimulatorPerson = () => {
    const newPerson: SimulatorPerson = {
      id: `person_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: getNextName(persons.length),
      salaryType: null,
      salaryAmount: null,
      schedules: [],
    };

    setPersons((prev) => [...prev, newPerson]);
    setCurrentEditingPerson(newPerson); // 바로 편집 모달 열기
    console.log('✅ 가상 인원 추가:', newPerson.name);
  };

  // ==================== Person 편집 ====================
  const editSimulatorPerson = (personId: string) => {
    const person = persons.find((p) => p.id === personId);
    if (!person) {
      console.warn('❌ Person을 찾을 수 없음:', personId);
      return;
    }

    setCurrentEditingPerson(person);
    console.log('✏️ Person 편집 모드:', person.name);
  };

  // ==================== Person 저장 ====================
  const savePersonSettings = (updatedPerson: SimulatorPerson) => {
    setPersons((prev) =>
      prev.map((p) => (p.id === updatedPerson.id ? updatedPerson : p))
    );

    console.log('✅ Person 설정 저장 완료:', updatedPerson.name);
    setCurrentEditingPerson(null); // 편집 모드 종료
  };

  // ==================== Person 삭제 ====================
  const deleteSimulatorPerson = (personId: string) => {
    if (!confirm('이 가상 인원을 삭제하시겠습니까?')) return;

    setPersons((prev) => prev.filter((p) => p.id !== personId));
    console.log('✅ Person 삭제 완료:', personId);
  };

  // ==================== 편집 모달 닫기 ====================
  const closePersonSettings = () => {
    setCurrentEditingPerson(null);
  };

  // ==================== Schedule Group 추가 ====================
  const addScheduleGroup = (personId: string, newSchedule: SimulatorSchedule) => {
    setPersons((prev) =>
      prev.map((p) =>
        p.id === personId
          ? { ...p, schedules: [...p.schedules, newSchedule] }
          : p
      )
    );
    console.log('✅ Schedule Group 추가:', newSchedule);
  };

  // ==================== Schedule Group 삭제 ====================
  const deleteScheduleGroup = (personId: string, scheduleIndex: number) => {
    setPersons((prev) =>
      prev.map((p) =>
        p.id === personId
          ? { ...p, schedules: p.schedules.filter((_, i) => i !== scheduleIndex) }
          : p
      )
    );
    console.log('✅ Schedule Group 삭제:', scheduleIndex);
  };

  return {
    persons,
    currentEditingPerson,
    addSimulatorPerson,
    editSimulatorPerson,
    savePersonSettings,
    deleteSimulatorPerson,
    closePersonSettings,
    addScheduleGroup,
    deleteScheduleGroup,
  };
};
