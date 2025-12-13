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
