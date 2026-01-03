/**
 * ========================================
 * HolidayService - 공휴일 자동화
 * ========================================
 * 
 * 역할:
 * 1. 공휴일 데이터 fetch
 * 2. Schedule 컬렉션에 isHoliday 플래그 자동 업데이트
 * 3. 매년 1월 1일 자동 동기화
 */

import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { getHolidaysInYear, isPublicHoliday } from '@/lib/shared/businessLogic';
import { EventBus, createEvent } from '@/lib/eventSystem';

// ========================================
// 공휴일 동기화 (Schedule 업데이트)
// ========================================

/**
 * 특정 연도의 Schedule에 공휴일 플래그 업데이트
 */
export async function syncHolidaysToSchedules(
  companyId: string,
  year: number
): Promise<number> {
  console.log('🎉 공휴일 동기화 시작:', { companyId, year });
  
  try {
    // 1. 해당 연도의 공휴일 목록 가져오기
    const holidays = getHolidaysInYear(year);
    console.log(`  📅 공휴일 ${holidays.length}개 발견:`, holidays);
    
    if (holidays.length === 0) {
      console.warn('  ⚠️ 공휴일 데이터 없음');
      return 0;
    }
    
    // 2. Schedule 컬렉션에서 해당 연도의 스케줄 조회
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const scheduleQuery = query(
      collection(db, COLLECTIONS.SCHEDULES),
      where('companyId', '==', companyId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const scheduleDocs = await getDocs(scheduleQuery);
    console.log(`  📋 조회된 스케줄: ${scheduleDocs.size}개`);
    
    if (scheduleDocs.empty) {
      console.warn('  ⚠️ 스케줄 데이터 없음');
      return 0;
    }
    
    // 3. Batch 업데이트 준비
    const batch = writeBatch(db);
    let updateCount = 0;
    
    scheduleDocs.forEach((scheduleDoc) => {
      const scheduleData = scheduleDoc.data();
      const date = scheduleData.date;
      
      // 공휴일 여부 확인
      const shouldBeHoliday = isPublicHoliday(date);
      const currentIsHoliday = scheduleData.isHoliday || false;
      
      // 변경 필요한 경우만 업데이트
      if (shouldBeHoliday !== currentIsHoliday) {
        const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, scheduleDoc.id);
        batch.update(scheduleRef, {
          isHoliday: shouldBeHoliday,
          updatedAt: new Date(),
        });
        updateCount++;
        
        console.log(`  ${shouldBeHoliday ? '🎉' : '📅'} ${date}: isHoliday = ${shouldBeHoliday}`);
      }
    });
    
    // 4. Batch 커밋
    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ 공휴일 동기화 완료: ${updateCount}개 스케줄 업데이트`);
    } else {
      console.log('✅ 이미 최신 상태 (업데이트 불필요)');
    }
    
    // 5. 이벤트 발행
    EventBus.publish(createEvent('holiday.synced', {
      companyId,
      year,
      holidayCount: holidays.length,
      updateCount,
    }));
    
    return updateCount;
    
  } catch (error: any) {
    console.error('❌ 공휴일 동기화 실패:', error);
    throw new Error(error.message || '공휴일 동기화 중 오류가 발생했습니다.');
  }
}

/**
 * 모든 회사의 공휴일 동기화 (관리자용)
 */
export async function syncHolidaysForAllCompanies(year: number): Promise<void> {
  console.log('🌐 전체 회사 공휴일 동기화 시작:', year);
  
  try {
    // 모든 회사 조회
    const companiesQuery = query(collection(db, COLLECTIONS.COMPANIES));
    const companiesDocs = await getDocs(companiesQuery);
    
    console.log(`  🏢 ${companiesDocs.size}개 회사 발견`);
    
    // 각 회사별로 동기화
    for (const companyDoc of companiesDocs.docs) {
      const companyId = companyDoc.id;
      const companyName = companyDoc.data().name;
      
      console.log(`\n  🏢 ${companyName} (${companyId}) 동기화 중...`);
      await syncHolidaysToSchedules(companyId, year);
    }
    
    console.log('\n✅ 전체 회사 공휴일 동기화 완료');
    
  } catch (error: any) {
    console.error('❌ 전체 동기화 실패:', error);
    throw error;
  }
}

/**
 * 특정 날짜가 공휴일인지 확인하고 알림
 */
export function checkHolidayStatus(date: string): {
  isHoliday: boolean;
  message: string;
} {
  const isHoliday = isPublicHoliday(date);
  
  return {
    isHoliday,
    message: isHoliday 
      ? `🎉 ${date}는 공휴일입니다. 근무 시 급여 1.5배가 적용됩니다.`
      : `📅 ${date}는 평일입니다.`,
  };
}

// ========================================
// Export
// ========================================

export default {
  syncHolidaysToSchedules,
  syncHolidaysForAllCompanies,
  checkHolidayStatus,
};
