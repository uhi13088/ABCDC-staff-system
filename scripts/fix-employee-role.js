/**
 * 기존 'employee' role을 'staff'로 일괄 변경하는 스크립트
 * 
 * 사용법:
 * node scripts/fix-employee-role.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Firebase Admin SDK 키

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

async function fixEmployeeRoles() {
  try {
    console.log('🔍 employee role 직원 검색 중...');

    // 'employee' role을 가진 사용자 조회
    const snapshot = await db
      .collection('users')
      .where('role', '==', 'employee')
      .get();

    if (snapshot.empty) {
      console.log('✅ employee role 직원이 없습니다. 작업 완료!');
      return;
    }

    console.log(`📊 ${snapshot.size}명의 employee role 직원 발견`);

    // Batch 업데이트
    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const ref = db.collection('users').doc(doc.id);
      batch.update(ref, {
        role: 'staff',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
      console.log(`  - ${doc.data().name || doc.id}: employee → staff`);
    });

    // 커밋
    await batch.commit();
    console.log(`✅ ${count}명의 직원 role 업데이트 완료!`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

// 실행
fixEmployeeRoles();
