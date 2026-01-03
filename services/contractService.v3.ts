/**
 * ========================================
 * Contract Service v3.0 - The Orchestrator
 * ========================================
 * 
 * 핵심 기능:
 * 1. 계약 서명 완료 시 자동화 체인 시작
 * 2. Employee 정보 자동 업데이트
 * 3. 기본 스케줄 자동 생성
 * 4. 급여 설정 자동 동기화
 * 
 * 이벤트 흐름:
 * contract:signed → [Employee Update, Schedule Generation, Notification]
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
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import {
  EventBus,
  executeTransaction,
  RollbackManager,
  createEvent,
  serverTime,
  type SystemEvent,
} from '@/lib/eventSystem';
import type { Contract } from '@/lib/types/contract';

// ========================================
// 타입 정의
// ========================================

interface ContractSignedPayload {
  contractId: string;
  userId: string;
  companyId: string;
  storeId?: string;
  contract: Contract;
}

// ========================================
// 이벤트 핸들러 등록
// ========================================

/**
 * 계약 서명 완료 이벤트 핸들러 등록
 */
export function registerContractEventHandlers(): void {
  EventBus.on('contract:signed', handleContractSigned);
  console.log('✅ Contract 이벤트 핸들러 등록 완료');
}

// ========================================
// 핵심 로직: 계약 서명 완료 처리
// ========================================

/**
 * 계약 서명 완료 이벤트 핸들러
 * 
 * 자동화 체인:
 * 1. Employee 급여 정보 업데이트
 * 2. 기본 스케줄 자동 생성
 * 3. 알림 발송
 */
async function handleContractSigned(event: SystemEvent): Promise<void> {
  const payload = event.payload as ContractSignedPayload;
  
  console.log('📝 계약 서명 완료 처리 시작:', payload.contractId);
  
  // 트랜잭션으로 원자적 처리
  const result = await executeTransaction(
    'Contract-Signed-Chain',
    async (transaction) => {
      // 1. Employee 정보 업데이트
      await updateEmployeeInfo(transaction, payload);
      
      // 2. 기본 스케줄 생성은 트랜잭션 밖에서 (비동기)
      // (트랜잭션 내에서는 read만 가능하므로)
      
      return { success: true };
    }
  );
  
  if (result.success) {
    // 3. 기본 스케줄 자동 생성 (트랜잭션 외부)
    await generateDefaultSchedules(payload);
    
    // 4. 알림 발송
    await sendContractCompletionNotification(payload);
    
    console.log('✅ 계약 서명 완료 처리 성공');
  } else {
    console.error('❌ 계약 서명 완료 처리 실패:', result.error);
    throw new Error(result.error);
  }
}

// ========================================
// Sub-Functions
// ========================================

/**
 * 1. Employee 급여 정보 업데이트
 */
async function updateEmployeeInfo(
  transaction: any,
  payload: ContractSignedPayload
): Promise<void> {
  console.log('  📊 직원 정보 업데이트 시작');
  
  const { userId, contract } = payload;
  
  // Employee 문서 조회
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await transaction.get(userRef);
  
  if (!userDoc.exists()) {
    throw new Error(`직원을 찾을 수 없습니다: ${userId}`);
  }
  
  // 급여 정보 추출
  const salaryInfo = {
    salaryType: contract.salaryType || '시급',
    salaryAmount: contract.salaryAmount || 0,
    workStartTime: contract.workStartTime,
    workEndTime: contract.workEndTime,
    
    // 수당 정보
    allowances: contract.allowances || {
      overtime: false,
      night: false,
      holiday: false,
    },
    
    // 계약 기간
    contractStartDate: contract.startDate,
    contractEndDate: contract.endDate,
    
    // 메타데이터
    lastContractUpdate: serverTime(),
    lastContractId: payload.contractId,
  };
  
  // 업데이트
  transaction.update(userRef, salaryInfo);
  
  console.log('  ✅ 직원 정보 업데이트 완료');
}

/**
 * 2. 기본 스케줄 자동 생성
 * 
 * 계약서의 schedules 배열을 기반으로
 * 계약 기간 동안의 스케줄을 자동 생성
 */
async function generateDefaultSchedules(
  payload: ContractSignedPayload
): Promise<void> {
  console.log('  📅 기본 스케줄 생성 시작');
  
  const { userId, companyId, storeId, contract } = payload;
  
  // 계약서에 스케줄 정보가 없으면 스킵
  if (!contract.schedules || contract.schedules.length === 0) {
    console.log('  ⚠️ 계약서에 스케줄 정보 없음 - 스킵');
    return;
  }
  
  // 계약 기간
  const startDate = new Date(contract.startDate);
  const endDate = contract.endDate 
    ? new Date(contract.endDate)
    : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
  
  // 최대 3개월까지만 생성 (무한 생성 방지)
  const maxDate = new Date(startDate);
  maxDate.setMonth(maxDate.getMonth() + 3);
  const finalEndDate = endDate > maxDate ? maxDate : endDate;
  
  console.log('  📆 스케줄 생성 기간:', startDate.toISOString().split('T')[0], '~', finalEndDate.toISOString().split('T')[0]);
  
  // 요일 매핑
  const dayMap: Record<string, number> = {
    '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6
  };
  
  // 근무 요일 추출
  const workDays = new Set(
    contract.schedules
      .filter(s => s.isWorkDay)
      .map(s => dayMap[s.day])
  );
  
  if (workDays.size === 0) {
    console.log('  ⚠️ 근무 요일 없음 - 스킵');
    return;
  }
  
  // 날짜별 스케줄 생성
  const schedules: any[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= finalEndDate) {
    const dayOfWeek = currentDate.getDay();
    
    // 근무일인 경우
    if (workDays.has(dayOfWeek)) {
      const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek)!;
      const scheduleForDay = contract.schedules.find(s => s.day === dayName);
      
      if (scheduleForDay) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        schedules.push({
          companyId,
          storeId: storeId || '',
          userId,
          date: dateStr,
          plannedTimes: [{
            contractId: payload.contractId,
            isAdditional: false,
            startTime: scheduleForDay.startTime,
            endTime: scheduleForDay.endTime,
            breakTime: scheduleForDay.breakTime,
            workHours: scheduleForDay.workHours,
          }],
          createdAt: serverTime(),
          createdBy: 'system',
          updatedAt: serverTime(),
        });
      }
    }
    
    // 다음 날로 이동
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`  📋 생성할 스케줄 수: ${schedules.length}개`);
  
  // 배치로 저장 (최대 500개씩)
  const batchSize = 500;
  for (let i = 0; i < schedules.length; i += batchSize) {
    const batch = schedules.slice(i, i + batchSize);
    
    // 배치 추가
    for (const schedule of batch) {
      await addDoc(collection(db, COLLECTIONS.SCHEDULES), schedule);
    }
    
    console.log(`  ✅ 스케줄 배치 저장 완료: ${i + 1}~${Math.min(i + batchSize, schedules.length)}/${schedules.length}`);
  }
  
  console.log('  ✅ 기본 스케줄 생성 완료');
}

/**
 * 3. 알림 발송
 */
async function sendContractCompletionNotification(
  payload: ContractSignedPayload
): Promise<void> {
  console.log('  🔔 알림 발송 시작');
  
  const { userId, companyId } = payload;
  
  // Employee 정보 조회
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
  const userName = userDoc.exists() ? userDoc.data().name : '직원';
  
  // 알림 생성
  await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    companyId,
    userId,
    type: 'contract_completed',
    title: '전자근로계약서 체결 완료',
    message: `${userName}님의 근로계약서가 정상적으로 체결되었습니다. 급여 정보와 근무 스케줄이 자동으로 설정되었습니다.`,
    read: false,
    createdAt: serverTime(),
  });
  
  console.log('  ✅ 알림 발송 완료');
}

// ========================================
// Public API
// ========================================

/**
 * 계약 서명 처리
 * 
 * 프론트엔드에서 호출하는 메인 함수
 */
export async function signContract(
  contractId: string,
  signatureData: {
    employeeSignature?: string;
    employeeSignedAt?: Date;
    employerSignature?: string;
    employerSignedAt?: Date;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 계약 서명 시작:', contractId);
    
    // 1. 계약서 조회
    const contractRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
    const contractDoc = await getDoc(contractRef);
    
    if (!contractDoc.exists()) {
      throw new Error('계약서를 찾을 수 없습니다.');
    }
    
    const contract = { id: contractDoc.id, ...contractDoc.data() } as Contract;
    
    // 2. 계약서 상태 업데이트
    await updateDoc(contractRef, {
      ...signatureData,
      status: 'signed',
      updatedAt: serverTime(),
    });
    
    console.log('✅ 계약서 상태 업데이트 완료');
    
    // 3. 이벤트 발행 (자동화 체인 시작!)
    await EventBus.emit(createEvent(
      'contract:signed',
      {
        contractId,
        userId: contract.userId,
        companyId: contract.companyId,
        storeId: contract.storeId,
        contract,
      } as ContractSignedPayload,
      {
        userId: contract.userId,
        companyId: contract.companyId,
      }
    ));
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ 계약 서명 실패:', error);
    return {
      success: false,
      error: error.message || '계약 서명 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 계약 해지 처리
 */
export async function terminateContract(
  contractId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🚫 계약 해지 시작:', contractId);
    
    const contractRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
    
    await updateDoc(contractRef, {
      status: 'terminated',
      terminatedAt: serverTime(),
      terminationReason: reason || '',
      updatedAt: serverTime(),
    });
    
    console.log('✅ 계약 해지 완료');
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ 계약 해지 실패:', error);
    return {
      success: false,
      error: error.message || '계약 해지 중 오류가 발생했습니다.',
    };
  }
}

// ========================================
// 초기화
// ========================================

// 앱 시작 시 이벤트 핸들러 등록
registerContractEventHandlers();
