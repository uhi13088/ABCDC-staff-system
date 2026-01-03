/**
 * Holidays 컬렉션 초기 데이터 마이그레이션 스크립트
 * 
 * 실행 방법:
 * cd /home/user/webapp
 * node scripts/migrate-holidays.mjs
 * 
 * 주의사항:
 * - Firebase 프로젝트에 연결되어 있어야 합니다
 * - Admin 권한이 필요합니다
 * - 이미 존재하는 데이터는 중복 생성되지 않습니다
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

// Firebase 설정 (환경변수에서 로드)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 필수 환경 변수 검증
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase 환경 변수가 설정되지 않았습니다.');
  console.error('📝 .env.local 파일에 다음을 추가하세요:');
  console.error('   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key');
  console.error('   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id');
  console.error('   (그 외 Firebase config 변수들...)\n');
  process.exit(1);
}

// 2025년 공휴일 데이터
const HOLIDAYS_2025 = [
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

async function migrateHolidays() {
  console.log('🔥 Holidays 마이그레이션 시작...\n');
  
  // Firebase 초기화
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  let created = 0;
  let skipped = 0;
  
  for (const holiday of HOLIDAYS_2025) {
    try {
      // 중복 확인 (같은 날짜가 이미 존재하는지)
      const q = query(
        collection(db, 'holidays'),
        where('date', '==', holiday.date)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log(`⏭️  ${holiday.date} (${holiday.name}) - 이미 존재함`);
        skipped++;
        continue;
      }
      
      // 새 문서 생성
      await addDoc(collection(db, 'holidays'), {
        date: holiday.date,
        name: holiday.name,
        year: holiday.year,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log(`✅ ${holiday.date} (${holiday.name}) - 생성 완료`);
      created++;
      
    } catch (error) {
      console.error(`❌ ${holiday.date} (${holiday.name}) - 실패:`, error.message);
    }
  }
  
  console.log('\n📊 마이그레이션 완료!');
  console.log(`   - 생성: ${created}개`);
  console.log(`   - 건너뜀: ${skipped}개`);
  console.log(`   - 전체: ${HOLIDAYS_2025.length}개\n`);
  
  process.exit(0);
}

// 실행
migrateHolidays().catch((error) => {
  console.error('❌ 마이그레이션 실패:', error);
  process.exit(1);
});
