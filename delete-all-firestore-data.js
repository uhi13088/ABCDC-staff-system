/**
 * Firestore 전체 데이터 삭제 스크립트
 * 주의: 이 스크립트는 모든 컬렉션의 모든 문서를 삭제합니다.
 * 개발 환경에서만 사용하세요!
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 삭제할 컬렉션 목록
const collections = [
  'users',
  'employees',
  'companies',
  'stores',
  'attendance',
  'schedules',
  'contracts',
  'savedContracts',
  'signedContracts',
  'salaries',
  'notices',
  'approvals',
  'shift_requests',
  'time_change_reports',
  'employee_docs',
  'company_invites',
  'schedules_backup',
  'schedules_new',
  'schedules_old'
];

// 컬렉션 삭제 함수 (배치 처리)
async function deleteCollection(collectionName, batchSize = 100) {
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  // 배치 삭제
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // 재귀적으로 다음 배치 삭제
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

// 메인 실행 함수
async function main() {
  console.log('🔥 Firestore 전체 데이터 삭제 시작...\n');
  console.log('⚠️  경고: 모든 데이터가 영구적으로 삭제됩니다!\n');
  
  let totalDeleted = 0;
  
  for (const collectionName of collections) {
    try {
      console.log(`📦 ${collectionName} 컬렉션 삭제 중...`);
      
      // 삭제 전 문서 수 확인
      const snapshot = await db.collection(collectionName).get();
      const count = snapshot.size;
      
      if (count === 0) {
        console.log(`   ⚪ 문서 없음\n`);
        continue;
      }
      
      // 삭제 실행
      await deleteCollection(collectionName);
      
      console.log(`   ✅ ${count}개 문서 삭제 완료\n`);
      totalDeleted += count;
      
    } catch (error) {
      console.error(`   ❌ 오류 발생:`, error.message);
      console.log('');
    }
  }
  
  console.log('═══════════════════════════════════════');
  console.log(`✅ 전체 삭제 완료: ${totalDeleted}개 문서`);
  console.log('═══════════════════════════════════════\n');
}

// 실행
main()
  .then(() => {
    console.log('✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 중 오류:', error);
    process.exit(1);
  });
