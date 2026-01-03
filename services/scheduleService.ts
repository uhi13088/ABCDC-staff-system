/**
 * 스케줄 자동 생성 서비스
 * 
 * 기능:
 * 1. 계약서 기반 한 달치 스케줄 자동 생성
 * 2. 추가 계약서 병합 (plannedTimes 배열에 추가)
 * 3. 계약서 수정 시 스케줄 업데이트 (수정 시점 이후만)
 * 4. 출퇴근 완료 시 actualTime 업데이트
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { Contract, ContractSchedule } from '@/lib/types/contract';
import type { Schedule, PlannedTime } from '@/lib/types/schedule';

/**
 * 요일 한글 -> 영문 매핑
 */
const DAY_MAP: Record<string, number> = {
  '월': 1,
  '화': 2,
  '수': 3,
  '목': 4,
  '금': 5,
  '토': 6,
  '일': 0,
};

/**
 * Firestore 안전 데이터 정제 (undefined 제거)
 * Firestore는 undefined 값을 저장할 수 없으므로, 모든 undefined를 제거
 * 
 * @param data 정제할 데이터 객체
 * @returns undefined가 제거된 안전한 객체
 */
function sanitizeForFirestore<T>(data: T): T {
  // JSON 직렬화를 통해 undefined 자동 제거
  return JSON.parse(JSON.stringify(data));
}

/**
 * 지정된 기간 동안의 스케줄 생성 (주간/월간 범위 지원)
 * 
 * @param contract 계약서 데이터
 * @param startDate 시작 날짜 (YYYY-MM-DD)
 * @param endDate 종료 날짜 (YYYY-MM-DD)
 * @param creatorUid 생성자 UID (admin)
 */
export async function generateSchedulesForRange(
  contract: Contract,
  startDate: string,
  endDate: string,
  creatorUid: string
): Promise<void> {
  // 🔄 레거시 데이터 변환: workDays → schedules 배열
  if (!contract.schedules && contract.workDays && contract.workStartTime && contract.workEndTime) {
    console.log('🔄 레거시 데이터 감지: workDays 형식을 schedules 배열로 변환');
    const days = contract.workDays.split(',').map(d => d.trim());
    contract.schedules = days.map(day => ({
      day,
      startTime: contract.workStartTime!,
      endTime: contract.workEndTime!,
      breakMinutes: contract.breakMinutes || 0,
    }));
    console.log(`  ✅ 변환 완료: ${contract.schedules.length}개 요일 스케줄 생성`);
  }
  
  console.log('📅 스케줄 범위 생성 시작:', {
    contractId: contract.id,
    userId: contract.userId,
    isAdditional: contract.isAdditional,
    range: `${startDate} ~ ${endDate}`,
    schedules: contract.schedules?.length,
  });

  // 필수 필드 검증 (userId와 schedules만 체크, schedules는 변환 후 체크)
  if (!contract.id || !contract.userId || !contract.schedules) {
    console.error('❌ 필수 필드 누락:', {
      id: contract.id,
      userId: contract.userId,
      schedules: contract.schedules?.length,
      workDays: contract.workDays,
      workStartTime: contract.workStartTime,
      workEndTime: contract.workEndTime,
    });
    throw new Error('계약서 필수 필드가 누락되었습니다.');
  }

  // 1. 날짜 파싱
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);

  console.log(`  📅 생성 범위: ${formatDate(rangeStart)} ~ ${formatDate(rangeEnd)}`);

  // 2. 요일별 스케줄 매핑 (ContractSchedule[] -> Map)
  const scheduleMap = new Map<number, ContractSchedule>();
  contract.schedules.forEach((schedule) => {
    const dayNum = DAY_MAP[schedule.day];
    if (dayNum !== undefined) {
      scheduleMap.set(dayNum, schedule);
    }
  });

  // 3. 날짜별 스케줄 생성
  const batch = writeBatch(db);
  const dates: string[] = [];
  let batchCount = 0;

  for (let date = new Date(rangeStart); date <= rangeEnd; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay(); // 0=일, 1=월, ..., 6=토
    const contractSchedule = scheduleMap.get(dayOfWeek);

    // 해당 요일에 근무가 없으면 스킵
    if (!contractSchedule) {
      continue;
    }

    const dateStr = formatDate(date);
    dates.push(dateStr);

    // PlannedTime 객체 생성 (안전한 필드 처리)
    const plannedTime: PlannedTime = {
      contractId: contract.id || '',
      isAdditional: contract.isAdditional || false,
      startTime: contractSchedule.startTime || '',
      endTime: contractSchedule.endTime || '',
      breakTime: contract.breakTime
        ? {
            start: contract.breakTime.start || '',
            end: contract.breakTime.end || '',
            minutes: contract.breakTime.minutes || 0,
            hours: contract.breakTime.hours || 0,
            isPaid: contract.breakTime.isPaid || false,
            description: contract.breakTime.description || '',
          }
        : null, // [중요] undefined 대신 null 사용
      workHours: calculateWorkHours(
        contractSchedule.startTime || '',
        contractSchedule.endTime || '',
        contract.breakTime?.minutes || 0
      ),
    };

    // 4. 기존 스케줄 확인 (추가 계약서 병합 처리)
    const scheduleId = `${contract.userId}_${dateStr}`;

    if (contract.isAdditional) {
      // 추가 계약서: 기존 스케줄에 plannedTimes 추가
      const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, scheduleId);
      const scheduleDoc = await getDoc(scheduleRef);

      if (scheduleDoc.exists()) {
        // 기존 스케줄 존재 -> plannedTimes 배열에 추가
        const existingSchedule = scheduleDoc.data() as Schedule;
        const updatedPlannedTimes = [...(existingSchedule.plannedTimes || []), plannedTime];

        // [중요] undefined 제거 후 업데이트
        batch.update(scheduleRef, sanitizeForFirestore({
          plannedTimes: updatedPlannedTimes,
          updatedAt: serverTimestamp(),
          updatedBy: creatorUid,
        }));
      } else {
        // 기존 스케줄 없음 -> 새로 생성
        const newSchedule: Partial<Schedule> = {
          companyId: contract.companyId || '',
          storeId: contract.storeId || '',
          storeName: contract.storeName || '',
          userId: contract.userId || '',
          userName: contract.employeeName || '',
          date: dateStr,
          plannedTimes: [plannedTime],
          createdAt: serverTimestamp() as Timestamp,
          createdBy: creatorUid,
        };

        // [중요] undefined 제거 후 저장
        batch.set(scheduleRef, sanitizeForFirestore(newSchedule));
      }
    } else {
      // 신규 계약서: 스케줄 생성 (덮어쓰기)
      const newSchedule: Partial<Schedule> = {
        companyId: contract.companyId || '',
        storeId: contract.storeId || '',
        storeName: contract.storeName || '',
        userId: contract.userId || '',
        userName: contract.employeeName || '',
        date: dateStr,
        plannedTimes: [plannedTime],
        createdAt: serverTimestamp() as Timestamp,
        createdBy: creatorUid,
      };

      const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, scheduleId);
      // [중요] undefined 제거 후 저장
      batch.set(scheduleRef, sanitizeForFirestore(newSchedule), { merge: false }); // 덮어쓰기
    }

    batchCount++;

    // Firestore batch는 최대 500개까지
    if (batchCount >= 500) {
      await batch.commit();
      batchCount = 0;
      console.log('  ✅ Batch 커밋 완료 (500개)');
    }
  }

  // 남은 batch 커밋
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`✅ 스케줄 범위 생성 완료: ${dates.length}일치 생성`);
  console.log(`  생성된 날짜: ${dates.slice(0, 5).join(', ')}${dates.length > 5 ? ' ...' : ''}`);
}

/**
 * 계약서 기반 한 달치 스케줄 생성
 * 
 * @param contract 계약서 데이터
 * @param creatorUid 생성자 UID (admin)
 */
export async function generateMonthlySchedules(
  contract: Contract,
  creatorUid: string
): Promise<void> {
  // 날짜 필드 통합 (startDate 또는 contractStartDate 중 하나라도 있으면 사용)
  const contractStartDate = contract.startDate || contract.contractStartDate;
  
  // 🔄 레거시 데이터 변환: workDays → schedules 배열
  if (!contract.schedules && contract.workDays && contract.workStartTime && contract.workEndTime) {
    console.log('🔄 레거시 데이터 감지: workDays 형식을 schedules 배열로 변환');
    const days = contract.workDays.split(',').map(d => d.trim());
    contract.schedules = days.map(day => ({
      day,
      startTime: contract.workStartTime!,
      endTime: contract.workEndTime!,
      breakMinutes: contract.breakMinutes || 0,
    }));
    console.log(`  ✅ 변환 완료: ${contract.schedules.length}개 요일 스케줄 생성`);
  }
  
  console.log('📅 스케줄 자동 생성 시작:', {
    contractId: contract.id,
    userId: contract.userId,
    isAdditional: contract.isAdditional,
    startDate: contractStartDate,
    schedules: contract.schedules?.length,
  });

  // 필수 필드 검증 (날짜 필드는 통합된 변수 사용, schedules는 변환 후 체크)
  if (!contract.id || !contract.userId || !contractStartDate || !contract.schedules) {
    console.error('❌ 필수 필드 누락:', {
      id: contract.id,
      userId: contract.userId,
      startDate: contract.startDate,
      contractStartDate: contract.contractStartDate,
      schedules: contract.schedules?.length,
      workDays: contract.workDays,
      workStartTime: contract.workStartTime,
      workEndTime: contract.workEndTime,
    });
    throw new Error('계약서 필수 필드가 누락되었습니다.');
  }

  // 1. 계약 시작월의 첫날과 말일 계산
  const startDate = new Date(contractStartDate);
  const year = startDate.getFullYear();
  const month = startDate.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0); // 다음 달 0일 = 이번 달 말일

  console.log(`  📅 생성 범위: ${formatDate(monthStart)} ~ ${formatDate(monthEnd)}`);

  // 2. 요일별 스케줄 매핑 (ContractSchedule[] -> Map)
  const scheduleMap = new Map<number, ContractSchedule>();
  contract.schedules.forEach((schedule) => {
    const dayNum = DAY_MAP[schedule.day];
    if (dayNum !== undefined) {
      scheduleMap.set(dayNum, schedule);
    }
  });

  // 3. 날짜별 스케줄 생성
  const batch = writeBatch(db);
  const dates: string[] = [];
  let batchCount = 0;

  for (let date = new Date(monthStart); date <= monthEnd; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay(); // 0=일, 1=월, ..., 6=토
    const contractSchedule = scheduleMap.get(dayOfWeek);

    // 해당 요일에 근무가 없으면 스킵
    if (!contractSchedule) {
      continue;
    }

    const dateStr = formatDate(date);
    dates.push(dateStr);

    // PlannedTime 객체 생성 (안전한 필드 처리)
    const plannedTime: PlannedTime = {
      contractId: contract.id || '',
      isAdditional: contract.isAdditional || false,
      startTime: contractSchedule.startTime || '',
      endTime: contractSchedule.endTime || '',
      breakTime: contract.breakTime
        ? {
            start: contract.breakTime.start || '',
            end: contract.breakTime.end || '',
            minutes: contract.breakTime.minutes || 0,
            hours: contract.breakTime.hours || 0,
            isPaid: contract.breakTime.isPaid || false,
            description: contract.breakTime.description || '',
          }
        : null, // [중요] undefined 대신 null 사용
      workHours: calculateWorkHours(
        contractSchedule.startTime || '',
        contractSchedule.endTime || '',
        contract.breakTime?.minutes || 0
      ),
    };

    // 4. 기존 스케줄 확인 (추가 계약서 병합 처리)
    const scheduleId = `${contract.userId}_${dateStr}`;

    if (contract.isAdditional) {
      // 추가 계약서: 기존 스케줄에 plannedTimes 추가
      const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, scheduleId);
      const scheduleDoc = await getDoc(scheduleRef);

      if (scheduleDoc.exists()) {
        // 기존 스케줄 존재 -> plannedTimes 배열에 추가
        const existingSchedule = scheduleDoc.data() as Schedule;
        const updatedPlannedTimes = [...(existingSchedule.plannedTimes || []), plannedTime];

        // [중요] undefined 제거 후 업데이트
        batch.update(scheduleRef, sanitizeForFirestore({
          plannedTimes: updatedPlannedTimes,
          updatedAt: serverTimestamp(),
          updatedBy: creatorUid,
        }));
      } else {
        // 기존 스케줄 없음 -> 새로 생성
        const newSchedule: Partial<Schedule> = {
          companyId: contract.companyId || '',
          storeId: contract.storeId || '',
          storeName: contract.storeName || '',
          userId: contract.userId || '',
          userName: contract.employeeName || '',
          date: dateStr,
          plannedTimes: [plannedTime],
          createdAt: serverTimestamp() as Timestamp,
          createdBy: creatorUid,
        };

        // [중요] undefined 제거 후 저장
        batch.set(scheduleRef, sanitizeForFirestore(newSchedule));
      }
    } else {
      // 신규 계약서: 스케줄 생성 (덮어쓰기)
      const newSchedule: Partial<Schedule> = {
        companyId: contract.companyId || '',
        storeId: contract.storeId || '',
        storeName: contract.storeName || '',
        userId: contract.userId || '',
        userName: contract.employeeName || '',
        date: dateStr,
        plannedTimes: [plannedTime],
        createdAt: serverTimestamp() as Timestamp,
        createdBy: creatorUid,
      };

      const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, scheduleId);
      // [중요] undefined 제거 후 저장
      batch.set(scheduleRef, sanitizeForFirestore(newSchedule), { merge: false }); // 덮어쓰기
    }

    batchCount++;

    // Firestore batch는 최대 500개까지
    if (batchCount >= 500) {
      await batch.commit();
      batchCount = 0;
      console.log('  ✅ Batch 커밋 완료 (500개)');
    }
  }

  // 남은 batch 커밋
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`✅ 스케줄 자동 생성 완료: ${dates.length}일치 생성`);
  console.log(`  생성된 날짜: ${dates.slice(0, 5).join(', ')}${dates.length > 5 ? ' ...' : ''}`);
}

/**
 * 계약서 수정 시 스케줄 업데이트 (수정 시점 이후만)
 * 
 * @param contract 수정된 계약서 데이터
 * @param updaterUid 수정자 UID (admin)
 */
export async function updateSchedulesFromContract(
  contract: Contract,
  updaterUid: string
): Promise<void> {
  console.log('🔄 스케줄 업데이트 시작 (수정 시점 이후만):', {
    contractId: contract.id,
    userId: contract.userId,
  });

  if (!contract.id || !contract.userId) {
    throw new Error('계약서 ID 또는 직원 ID가 없습니다.');
  }

  // 오늘 날짜
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDate(today);

  // 기존 스케줄 조회 (오늘 이후만)
  const schedulesQuery = query(
    collection(db, COLLECTIONS.SCHEDULES),
    where('userId', '==', contract.userId),
    where('date', '>=', todayStr)
  );

  const snapshot = await getDocs(schedulesQuery);
  console.log(`  📅 수정 대상 스케줄: ${snapshot.size}개`);

  // 해당 계약서의 plannedTime 찾아서 업데이트
  const batch = writeBatch(db);
  let updateCount = 0;

  snapshot.forEach((docSnap) => {
    const schedule = docSnap.data() as Schedule;
    const plannedTimes = schedule.plannedTimes || [];

    // 해당 계약서의 plannedTime 찾기
    const index = plannedTimes.findIndex((pt) => pt.contractId === contract.id);

    if (index >= 0 && contract.schedules) {
      // 날짜의 요일 확인
      const date = new Date(schedule.date);
      const dayOfWeek = date.getDay();

      // 계약서에서 해당 요일의 스케줄 찾기
      let daySchedule: ContractSchedule | undefined;
      for (const s of contract.schedules) {
        if (DAY_MAP[s.day] === dayOfWeek) {
          daySchedule = s;
          break;
        }
      }

      if (daySchedule) {
        // plannedTime 업데이트
        plannedTimes[index] = {
          ...plannedTimes[index],
          startTime: daySchedule.startTime,
          endTime: daySchedule.endTime,
          breakTime: contract.breakTime
            ? {
                start: contract.breakTime.start,
                end: contract.breakTime.end,
                minutes: contract.breakTime.minutes,
                hours: contract.breakTime.hours,
                isPaid: contract.breakTime.isPaid,
                description: contract.breakTime.description,
              }
            : null, // Firestore does not support undefined
          workHours: calculateWorkHours(
            daySchedule.startTime,
            daySchedule.endTime,
            contract.breakTime?.minutes || 0
          ),
        };

        batch.update(doc(db, COLLECTIONS.SCHEDULES, docSnap.id), {
          plannedTimes,
          updatedAt: serverTimestamp(),
          updatedBy: updaterUid,
        });

        updateCount++;
      } else {
        // 해당 요일에 근무가 없으면 plannedTime 제거
        plannedTimes.splice(index, 1);

        batch.update(doc(db, COLLECTIONS.SCHEDULES, docSnap.id), {
          plannedTimes,
          updatedAt: serverTimestamp(),
          updatedBy: updaterUid,
        });

        updateCount++;
      }
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`✅ 스케줄 업데이트 완료: ${updateCount}개 수정`);
  } else {
    console.log('  ℹ️ 업데이트할 스케줄 없음');
  }
}

/**
 * 출퇴근 완료 시 스케줄에 actualTime 업데이트
 * 
 * @param userId 직원 UID
 * @param date 날짜 (YYYY-MM-DD)
 * @param actualTime 실제 출퇴근 시간
 */
export async function updateScheduleActualTime(
  userId: string,
  date: string,
  actualTime: {
    clockIn?: string;
    clockOut?: string;
    attendanceId?: string;
    status?: 'late' | 'absent' | 'overtime' | 'early_leave' | 'on_time';
    warning?: string;
    warningReason?: string;
  }
): Promise<void> {
  const scheduleId = `${userId}_${date}`;
  const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, scheduleId);

  try {
    const scheduleDoc = await getDoc(scheduleRef);

    if (!scheduleDoc.exists()) {
      console.warn(`⚠️ 스케줄 없음: ${scheduleId}`);
      return;
    }

    await updateDoc(scheduleRef, {
      actualTime: {
        ...actualTime,
      },
      updatedAt: serverTimestamp(),
    });

    console.log(`✅ 스케줄 actualTime 업데이트: ${scheduleId}`);
  } catch (error) {
    console.error('❌ 스케줄 actualTime 업데이트 실패:', error);
  }
}

/**
 * 근무 시간 계산 (시간 단위)
 */
function calculateWorkHours(startTime: string, endTime: string, breakMinutes: number = 0): number {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  let workMinutes = endTotalMinutes - startTotalMinutes;

  // 다음날 근무 (야간 근무)
  if (workMinutes < 0) {
    workMinutes += 24 * 60;
  }

  workMinutes -= breakMinutes;

  return Math.round((workMinutes / 60) * 10) / 10; // 소수점 1자리
}

/**
 * 날짜 포맷 (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
