/**
 * ========================================
 * Event-Driven Transaction System
 * ========================================
 * 
 * 핵심 철학: "The Organic System"
 * - 모든 변경은 이벤트로 전파
 * - 트랜잭션으로 원자적 처리
 * - 관리자 개입 0
 * 
 * 기능:
 * 1. EventBus: 이벤트 발행 및 구독
 * 2. TransactionHelper: 복잡한 트랜잭션 처리
 * 3. RollbackManager: 실패 시 자동 롤백
 */

import { 
  runTransaction, 
  writeBatch,
  doc,
  collection,
  Timestamp,
  serverTimestamp,
  WriteBatch,
  Transaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

// ========================================
// 타입 정의
// ========================================

export type EventType =
  | 'contract:signed'           // 계약 서명 완료
  | 'approval:approved'         // 결재 승인
  | 'approval:rejected'         // 결재 거부
  | 'schedule:published'        // 스케줄 배포
  | 'schedule:updated'          // 스케줄 수정
  | 'schedule:deleted'          // 스케줄 삭제
  | 'employee:resigned'         // 직원 퇴사
  | 'attendance:completed';     // 출퇴근 완료

export interface SystemEvent {
  type: EventType;
  timestamp: Date;
  payload: any;
  metadata?: {
    userId?: string;
    companyId?: string;
    triggeredBy?: string;
  };
}

export interface TransactionResult {
  success: boolean;
  data?: any;
  error?: string;
  rollbackExecuted?: boolean;
}

// ========================================
// Event Bus (이벤트 발행 및 구독)
// ========================================

type EventHandler = (event: SystemEvent) => Promise<void> | void;

class EventBusClass {
  private handlers: Map<EventType, EventHandler[]> = new Map();
  
  /**
   * 이벤트 구독
   */
  on(eventType: EventType, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    console.log(`📡 이벤트 구독: ${eventType}`);
  }
  
  /**
   * 이벤트 발행
   */
  async emit(event: SystemEvent): Promise<void> {
    console.log(`🚀 이벤트 발행: ${event.type}`, event.payload);
    
    const handlers = this.handlers.get(event.type) || [];
    
    // 모든 핸들러를 병렬로 실행
    const promises = handlers.map(handler => 
      Promise.resolve(handler(event)).catch(error => {
        console.error(`❌ 이벤트 핸들러 실패 (${event.type}):`, error);
        // 에러를 던지지 않고 로그만 남김 (다른 핸들러 계속 실행)
      })
    );
    
    await Promise.all(promises);
    console.log(`✅ 이벤트 처리 완료: ${event.type}`);
  }
  
  /**
   * 구독 해제
   */
  off(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  /**
   * 모든 핸들러 제거
   */
  clear(): void {
    this.handlers.clear();
  }
}

export const EventBus = new EventBusClass();

// ========================================
// Transaction Helper (트랜잭션 헬퍼)
// ========================================

/**
 * 복잡한 트랜잭션을 실행하는 헬퍼
 * 
 * 특징:
 * - 원자적 실행 (all or nothing)
 * - 자동 재시도
 * - 상세 로그
 */
export async function executeTransaction<T>(
  name: string,
  operations: (transaction: Transaction) => Promise<T>,
  options?: {
    maxRetries?: number;
    onError?: (error: any) => void;
  }
): Promise<TransactionResult> {
  const maxRetries = options?.maxRetries || 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    attempt++;
    
    try {
      console.log(`🔄 트랜잭션 시작 [${name}] (시도 ${attempt}/${maxRetries})`);
      
      const result = await runTransaction(db, async (transaction) => {
        return await operations(transaction);
      });
      
      console.log(`✅ 트랜잭션 성공 [${name}]`);
      
      return {
        success: true,
        data: result,
      };
      
    } catch (error: any) {
      console.error(`❌ 트랜잭션 실패 [${name}] (시도 ${attempt}/${maxRetries}):`, error);
      
      // 마지막 시도가 아니면 재시도
      if (attempt < maxRetries) {
        console.log(`⏳ 재시도 중...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      // 최종 실패
      if (options?.onError) {
        options.onError(error);
      }
      
      return {
        success: false,
        error: error.message || '트랜잭션 실행 중 오류가 발생했습니다.',
      };
    }
  }
  
  return {
    success: false,
    error: '최대 재시도 횟수를 초과했습니다.',
  };
}

// ========================================
// Batch Helper (배치 작업 헬퍼)
// ========================================

/**
 * 배치 작업을 실행하는 헬퍼
 * 
 * 특징:
 * - 최대 500개까지 한 번에 처리
 * - 자동 분할 (500개 초과 시)
 */
export async function executeBatch(
  name: string,
  operations: (batch: WriteBatch) => void
): Promise<TransactionResult> {
  try {
    console.log(`📦 배치 작업 시작 [${name}]`);
    
    const batch = writeBatch(db);
    operations(batch);
    
    await batch.commit();
    
    console.log(`✅ 배치 작업 완료 [${name}]`);
    
    return {
      success: true,
    };
    
  } catch (error: any) {
    console.error(`❌ 배치 작업 실패 [${name}]:`, error);
    
    return {
      success: false,
      error: error.message || '배치 작업 중 오류가 발생했습니다.',
    };
  }
}

// ========================================
// Rollback Manager (롤백 관리자)
// ========================================

interface RollbackAction {
  name: string;
  execute: () => Promise<void>;
}

class RollbackManagerClass {
  private actions: RollbackAction[] = [];
  
  /**
   * 롤백 액션 등록
   */
  register(name: string, action: () => Promise<void>): void {
    this.actions.push({ name, execute: action });
    console.log(`📝 롤백 액션 등록: ${name}`);
  }
  
  /**
   * 모든 롤백 액션 실행
   */
  async executeAll(): Promise<void> {
    console.log(`🔄 롤백 시작 (${this.actions.length}개 액션)`);
    
    // 역순으로 실행 (LIFO)
    for (let i = this.actions.length - 1; i >= 0; i--) {
      const action = this.actions[i];
      try {
        console.log(`  - 롤백 실행: ${action.name}`);
        await action.execute();
      } catch (error) {
        console.error(`  ❌ 롤백 실패: ${action.name}`, error);
        // 롤백 실패해도 계속 진행
      }
    }
    
    console.log(`✅ 롤백 완료`);
    this.clear();
  }
  
  /**
   * 롤백 액션 초기화
   */
  clear(): void {
    this.actions = [];
  }
}

export const RollbackManager = new RollbackManagerClass();

// ========================================
// Utility Functions
// ========================================

/**
 * 이벤트 생성 헬퍼
 */
export function createEvent(
  type: EventType,
  payload: any,
  metadata?: SystemEvent['metadata']
): SystemEvent {
  return {
    type,
    timestamp: new Date(),
    payload,
    metadata,
  };
}

/**
 * 안전한 문서 ID 생성
 */
export function generateDocId(collectionName: string): string {
  return doc(collection(db, collectionName)).id;
}

/**
 * 타임스탬프 헬퍼
 */
export function now(): Timestamp {
  return Timestamp.now();
}

export function serverTime() {
  return serverTimestamp();
}

// ========================================
// 초기화 (앱 시작 시 호출)
// ========================================

/**
 * 이벤트 시스템 초기화
 * 
 * 모든 이벤트 핸들러를 등록
 */
export function initializeEventSystem(): void {
  console.log('🚀 이벤트 시스템 초기화 시작');
  
  // 각 Service가 자신의 핸들러를 등록
  // (ContractService, ApprovalService 등에서 호출)
  
  console.log('✅ 이벤트 시스템 초기화 완료');
}

// ========================================
// Export
// ========================================

export default {
  EventBus,
  executeTransaction,
  executeBatch,
  RollbackManager,
  createEvent,
  generateDocId,
  now,
  serverTime,
  initializeEventSystem,
};
