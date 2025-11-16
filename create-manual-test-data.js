/**
 * 수동 테스트용 초기 데이터 생성 (간소화 버전)
 * 회사 1개 + 지점 1개 + 초대코드 1개 (Admin)
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper 함수
function generateRandomCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function getExpirationDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return admin.firestore.Timestamp.fromDate(date);
}

// 메인 실행 함수
async function createTestData() {
  console.log('🚀 테스트용 초기 데이터 생성 시작...\n');

  try {
    // 1. 회사 생성
    const companyId = 'ABC2025';
    console.log('📦 회사 생성 중...');
    await db.collection('companies').doc(companyId).set({
      companyId: companyId,
      companyName: 'ABC Dessert Center',
      businessNumber: '123-45-67890',
      address: '경기도 부천시 원미구',
      phone: '032-xxx-xxxx',
      email: 'contact@abcdc.com',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system'
    });
    console.log(`   ✅ ABC Dessert Center (${companyId})\n`);

    // 2. 지점 생성
    const storeId = 'store001';
    console.log('🏪 지점 생성 중...');
    await db.collection('stores').doc(storeId).set({
      storeId: storeId,
      companyId: companyId,
      storeName: '맛남살롱 부천시청점',
      address: '경기도 부천시 원미구 부천로 xxx',
      phone: '032-xxx-1111',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system'
    });
    console.log(`   ✅ 맛남살롱 부천시청점 (${storeId})\n`);

    // 3. Admin 초대코드 생성
    console.log('🎫 Admin 초대코드 생성 중...');
    const inviteCode = 'ABC2025-ADMIN-' + generateRandomCode();
    const inviteDoc = await db.collection('company_invites').add({
      code: inviteCode,
      companyId: companyId,
      storeId: storeId,
      role: 'admin',
      maxUses: 1,
      currentUses: 0,
      expiresAt: getExpirationDate(30), // 30일 후
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      isActive: true
    });
    console.log(`   ✅ ${inviteCode}\n`);

    // 결과 출력
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ 테스트 데이터 생성 완료!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📋 회원가입 URL:\n');
    const baseUrl = 'https://abcdc-staff-system.web.app';
    const inviteUrl = `${baseUrl}/employee-register.html?code=${inviteCode}`;
    console.log(`🔗 ${inviteUrl}\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📝 테스트용 계정 정보 (사장님이 직접 입력):\n');
    console.log('이메일: admin@abcdc.com');
    console.log('비밀번호: Abcdc2025!@#');
    console.log('이름: 홍길동');
    console.log('전화번호: 010-1234-5678\n');
    console.log('⚠️  위 URL에 접속하여 정보 입력 후 회원가입하세요!');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
createTestData()
  .then(() => {
    console.log('✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
