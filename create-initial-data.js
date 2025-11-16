/**
 * 초기 데이터 생성 스크립트
 * 회사, 지점, 초대코드를 Firestore에 생성합니다.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 데이터 정의
const initialData = {
  company: {
    companyId: 'ABC2025',
    companyName: 'ABC Dessert Center',
    businessNumber: '123-45-67890',
    address: '경기도 부천시 원미구',
    phone: '032-xxx-xxxx',
    email: 'contact@abcdc.com',
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system'
  },
  stores: [
    {
      storeId: 'store001',
      companyId: 'ABC2025',
      storeName: '맛남살롱 부천시청점',
      address: '경기도 부천시 원미구 부천로 xxx',
      phone: '032-xxx-1111',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system'
    },
    {
      storeId: 'store002',
      companyId: 'ABC2025',
      storeName: '맛남살롱 상동점',
      address: '경기도 부천시 원미구 상동 xxx',
      phone: '032-xxx-2222',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system'
    },
    {
      storeId: 'store003',
      companyId: 'ABC2025',
      storeName: '맛남살롱 부천역사점',
      address: '경기도 부천시 원미구 부천역 xxx',
      phone: '032-xxx-3333',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system'
    }
  ],
  inviteCodes: [
    {
      code: 'ABC2025-ADMIN-' + generateRandomCode(),
      companyId: 'ABC2025',
      storeId: 'store001',
      role: 'admin',
      maxUses: 1,
      currentUses: 0,
      expiresAt: getExpirationDate(30), // 30일 후
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      isActive: true
    },
    {
      code: 'ABC2025-MANAGER-' + generateRandomCode(),
      companyId: 'ABC2025',
      storeId: 'store001',
      role: 'manager',
      maxUses: 1,
      currentUses: 0,
      expiresAt: getExpirationDate(30),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      isActive: true
    },
    {
      code: 'ABC2025-MANAGER-' + generateRandomCode(),
      companyId: 'ABC2025',
      storeId: 'store002',
      role: 'manager',
      maxUses: 1,
      currentUses: 0,
      expiresAt: getExpirationDate(30),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      isActive: true
    },
    {
      code: 'ABC2025-STAFF-' + generateRandomCode(),
      companyId: 'ABC2025',
      storeId: 'store001',
      role: 'staff',
      maxUses: 1,
      currentUses: 0,
      expiresAt: getExpirationDate(7), // 7일 후
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      isActive: true
    },
    {
      code: 'ABC2025-STAFF-' + generateRandomCode(),
      companyId: 'ABC2025',
      storeId: 'store002',
      role: 'staff',
      maxUses: 1,
      currentUses: 0,
      expiresAt: getExpirationDate(7),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      isActive: true
    },
    {
      code: 'ABC2025-STAFF-' + generateRandomCode(),
      companyId: 'ABC2025',
      storeId: 'store003',
      role: 'staff',
      maxUses: 1,
      currentUses: 0,
      expiresAt: getExpirationDate(7),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      isActive: true
    }
  ]
};

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
async function createInitialData() {
  console.log('🚀 초기 데이터 생성 시작...\n');

  try {
    // 1. 회사 생성
    console.log('📦 회사 생성 중...');
    await db.collection('companies').doc(initialData.company.companyId).set(initialData.company);
    console.log(`   ✅ ${initialData.company.companyName} (${initialData.company.companyId})\n`);

    // 2. 지점 생성
    console.log('🏪 지점 생성 중...');
    for (const store of initialData.stores) {
      await db.collection('stores').doc(store.storeId).set(store);
      console.log(`   ✅ ${store.storeName} (${store.storeId})`);
    }
    console.log('');

    // 3. 초대코드 생성
    console.log('🎫 초대코드 생성 중...');
    const inviteUrls = [];
    for (const invite of initialData.inviteCodes) {
      const docRef = await db.collection('company_invites').add(invite);
      const url = `https://your-domain.com/employee-register.html?code=${invite.code}`;
      inviteUrls.push({
        id: docRef.id,
        code: invite.code,
        role: invite.role,
        store: invite.storeId,
        url: url
      });
      console.log(`   ✅ ${invite.role.toUpperCase().padEnd(12)} - ${invite.code} (${invite.storeId})`);
    }
    console.log('');

    // 결과 출력
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ 초기 데이터 생성 완료!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📋 생성된 초대코드 URL:\n');
    inviteUrls.forEach(item => {
      console.log(`${item.role.toUpperCase()} (${item.store}):`);
      console.log(`   ${item.url}\n`);
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⚠️  중요: 초대코드 URL을 안전하게 보관하세요!');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
createInitialData()
  .then(() => {
    console.log('✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
