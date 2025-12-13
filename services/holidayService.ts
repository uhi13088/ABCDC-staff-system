/**
 * Holiday Service
 * Firebase Firestore 공휴일 관리 CRUD 로직
 * 
 * @description
 * 2025년 이후 공휴일을 DB에서 관리하여 매년 하드코딩 없이 자동화합니다.
 * 현재는 2025년 공휴일만 초기 데이터로 제공하며, 관리자가 추가/수정/삭제할 수 있습니다.
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

export interface Holiday {
  id?: string;
  date: string;        // "YYYY-MM-DD" 형식
  name: string;        // 공휴일 이름 (예: "설날", "추석")
  year: number;        // 연도 (쿼리 최적화용)
  companyId?: string;  // 회사별 공휴일 (선택사항, 없으면 전국 공통)
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 공휴일 목록 조회
 * @param year - 연도 (예: 2025)
 * @param companyId - 회사 ID (선택사항)
 */
export async function getHolidays(
  year: number,
  companyId?: string
): Promise<Holiday[]> {
  const constraints: QueryConstraint[] = [
    where('year', '==', year),
  ];

  // 회사별 공휴일 필터
  if (companyId) {
    constraints.push(where('companyId', '==', companyId));
  }

  const q = query(collection(db, COLLECTIONS.HOLIDAYS), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Holiday));
}

/**
 * 공휴일 추가
 */
export async function createHoliday(holiday: Omit<Holiday, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.HOLIDAYS), {
    ...holiday,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * 공휴일 수정
 */
export async function updateHoliday(
  id: string,
  updates: Partial<Holiday>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.HOLIDAYS, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 공휴일 삭제
 */
export async function deleteHoliday(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.HOLIDAYS, id);
  await deleteDoc(docRef);
}

/**
 * 특정 날짜가 공휴일인지 확인
 * @param dateStr - "YYYY-MM-DD" 형식
 * @param holidays - 공휴일 목록
 */
export function isHoliday(dateStr: string, holidays: Holiday[]): boolean {
  return holidays.some(h => h.date === dateStr);
}

/**
 * 행정안전부 공공 API에서 공휴일 정보 가져오기
 * @param year - 연도 (예: 2025)
 * @param apiKey - 공공데이터포털 인증키 (환경변수: NEXT_PUBLIC_HOLIDAY_API_KEY)
 */
export async function fetchHolidaysFromAPI(
  year: number,
  apiKey?: string
): Promise<Omit<Holiday, 'id' | 'createdAt' | 'updatedAt'>[]> {
  // API 키가 없으면 빈 배열 반환
  const key = apiKey || process.env.NEXT_PUBLIC_HOLIDAY_API_KEY;
  if (!key) {
    console.warn('⚠️ 공휴일 API 키가 설정되지 않았습니다. 환경변수 NEXT_PUBLIC_HOLIDAY_API_KEY를 설정하세요.');
    return [];
  }

  try {
    const url = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=${year}&numOfRows=50&ServiceKey=${key}&_type=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // API 응답 구조 확인
    const items = data?.response?.body?.items?.item;
    if (!items) {
      console.error('❌ 공휴일 API 응답 오류:', data);
      return [];
    }
    
    // 배열로 변환 (단일 항목인 경우 배열로 감싸기)
    const itemsArray = Array.isArray(items) ? items : [items];
    
    // Holiday 형식으로 변환
    const holidays: Omit<Holiday, 'id' | 'createdAt' | 'updatedAt'>[] = itemsArray.map((item: any) => {
      const dateStr = String(item.locdate); // YYYYMMDD 형식
      const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      
      return {
        date: formattedDate,
        name: item.dateName || '공휴일',
        year: year,
      };
    });
    
    console.log(`✅ ${year}년 공휴일 ${holidays.length}개 불러옴 (공공 API)`);
    return holidays;
  } catch (error) {
    console.error('❌ 공휴일 API 호출 실패:', error);
    return [];
  }
}

/**
 * 공공 API에서 공휴일을 불러와 Firestore에 저장
 * @param year - 연도
 * @param apiKey - API 인증키 (선택사항)
 */
export async function syncHolidaysFromAPI(year: number, apiKey?: string): Promise<number> {
  const holidays = await fetchHolidaysFromAPI(year, apiKey);
  
  if (holidays.length === 0) {
    console.warn(`⚠️ ${year}년 공휴일을 불러올 수 없습니다.`);
    return 0;
  }
  
  let createdCount = 0;
  
  for (const holiday of holidays) {
    try {
      // 중복 체크 (날짜로 조회)
      const q = query(
        collection(db, COLLECTIONS.HOLIDAYS),
        where('date', '==', holiday.date)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        await createHoliday(holiday);
        createdCount++;
        console.log(`✅ 공휴일 추가: ${holiday.date} - ${holiday.name}`);
      } else {
        console.log(`⏭️ 이미 존재: ${holiday.date} - ${holiday.name}`);
      }
    } catch (error) {
      console.error(`❌ 공휴일 추가 실패: ${holiday.date}`, error);
    }
  }
  
  console.log(`✅ ${year}년 공휴일 동기화 완료: ${createdCount}개 추가`);
  return createdCount;
}

/**
 * 2025년 공휴일 초기 데이터 (마이그레이션용)
 */
export const HOLIDAYS_2025: Omit<Holiday, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { date: '2025-01-01', name: '신정', year: 2025 },
  { date: '2025-01-28', name: '설날 연휴', year: 2025 },
  { date: '2025-01-29', name: '설날', year: 2025 },
  { date: '2025-01-30', name: '설날 연휴', year: 2025 },
  { date: '2025-03-01', name: '삼일절', year: 2025 },
  { date: '2025-03-05', name: '부처님오신날', year: 2025 },
  { date: '2025-05-05', name: '어린이날', year: 2025 },
  { date: '2025-05-06', name: '대체공휴일', year: 2025 },
  { date: '2025-06-06', name: '현충일', year: 2025 },
  { date: '2025-08-15', name: '광복절', year: 2025 },
  { date: '2025-10-03', name: '개천절', year: 2025 },
  { date: '2025-10-05', name: '추석 연휴', year: 2025 },
  { date: '2025-10-06', name: '추석', year: 2025 },
  { date: '2025-10-07', name: '추석 연휴', year: 2025 },
  { date: '2025-10-09', name: '한글날', year: 2025 },
  { date: '2025-12-25', name: '크리스마스', year: 2025 },
];
