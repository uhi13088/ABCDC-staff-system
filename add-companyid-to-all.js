const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addCompanyIdToAll() {
  const companyId = 'company_abc';
  const defaultStoreId = '1'; // 기본 매장 (부천시청점)
  
  console.log('🚀 모든 컬렉션에 companyId 추가 시작...\n');

  // 1. employees 컬렉션
  console.log('📋 1. employees 컬렉션 업데이트...');
  const employeesSnapshot = await db.collection('employees').get();
  let employeesUpdated = 0;
  for (const doc of employeesSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId,
        storeId: data.storeId || defaultStoreId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      employeesUpdated++;
    }
  }
  console.log(`   ✅ employees: ${employeesUpdated}개 업데이트\n`);

  // 2. attendance 컬렉션
  console.log('📋 2. attendance 컬렉션 업데이트...');
  const attendanceSnapshot = await db.collection('attendance').get();
  let attendanceUpdated = 0;
  for (const doc of attendanceSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId,
        storeId: data.storeId || defaultStoreId
      });
      attendanceUpdated++;
    }
  }
  console.log(`   ✅ attendance: ${attendanceUpdated}개 업데이트\n`);

  // 3. schedules 컬렉션
  console.log('📋 3. schedules 컬렉션 업데이트...');
  const schedulesSnapshot = await db.collection('schedules').get();
  let schedulesUpdated = 0;
  for (const doc of schedulesSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId,
        storeId: data.storeId || defaultStoreId
      });
      schedulesUpdated++;
    }
  }
  console.log(`   ✅ schedules: ${schedulesUpdated}개 업데이트\n`);

  // 4. contracts 컬렉션
  console.log('📋 4. contracts 컬렉션 업데이트...');
  const contractsSnapshot = await db.collection('contracts').get();
  let contractsUpdated = 0;
  for (const doc of contractsSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId,
        storeId: data.storeId || defaultStoreId
      });
      contractsUpdated++;
    }
  }
  console.log(`   ✅ contracts: ${contractsUpdated}개 업데이트\n`);

  // 5. savedContracts 컬렉션
  console.log('📋 5. savedContracts 컬렉션 업데이트...');
  const savedContractsSnapshot = await db.collection('savedContracts').get();
  let savedContractsUpdated = 0;
  for (const doc of savedContractsSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId
      });
      savedContractsUpdated++;
    }
  }
  console.log(`   ✅ savedContracts: ${savedContractsUpdated}개 업데이트\n`);

  // 6. signedContracts 컬렉션
  console.log('📋 6. signedContracts 컬렉션 업데이트...');
  const signedContractsSnapshot = await db.collection('signedContracts').get();
  let signedContractsUpdated = 0;
  for (const doc of signedContractsSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId
      });
      signedContractsUpdated++;
    }
  }
  console.log(`   ✅ signedContracts: ${signedContractsUpdated}개 업데이트\n`);

  // 7. salaries 컬렉션
  console.log('📋 7. salaries 컬렉션 업데이트...');
  const salariesSnapshot = await db.collection('salaries').get();
  let salariesUpdated = 0;
  for (const doc of salariesSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId,
        storeId: data.storeId || defaultStoreId
      });
      salariesUpdated++;
    }
  }
  console.log(`   ✅ salaries: ${salariesUpdated}개 업데이트\n`);

  // 8. notices 컬렉션
  console.log('📋 8. notices 컬렉션 업데이트...');
  const noticesSnapshot = await db.collection('notices').get();
  let noticesUpdated = 0;
  for (const doc of noticesSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId
      });
      noticesUpdated++;
    }
  }
  console.log(`   ✅ notices: ${noticesUpdated}개 업데이트\n`);

  // 9. approvals 컬렉션
  console.log('📋 9. approvals 컬렉션 업데이트...');
  const approvalsSnapshot = await db.collection('approvals').get();
  let approvalsUpdated = 0;
  for (const doc of approvalsSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId
      });
      approvalsUpdated++;
    }
  }
  console.log(`   ✅ approvals: ${approvalsUpdated}개 업데이트\n`);

  // 10. shift_requests 컬렉션
  console.log('📋 10. shift_requests 컬렉션 업데이트...');
  const shiftRequestsSnapshot = await db.collection('shift_requests').get();
  let shiftRequestsUpdated = 0;
  for (const doc of shiftRequestsSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId,
        storeId: data.storeId || defaultStoreId
      });
      shiftRequestsUpdated++;
    }
  }
  console.log(`   ✅ shift_requests: ${shiftRequestsUpdated}개 업데이트\n`);

  // 11. time_change_reports 컬렉션
  console.log('📋 11. time_change_reports 컬렉션 업데이트...');
  const timeChangeReportsSnapshot = await db.collection('time_change_reports').get();
  let timeChangeReportsUpdated = 0;
  for (const doc of timeChangeReportsSnapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      await doc.ref.update({
        companyId: companyId
      });
      timeChangeReportsUpdated++;
    }
  }
  console.log(`   ✅ time_change_reports: ${timeChangeReportsUpdated}개 업데이트\n`);

  console.log('============================================================');
  console.log('✅ 모든 컬렉션 업데이트 완료!');
  console.log('============================================================');
  console.log(`총 업데이트:
  - employees: ${employeesUpdated}
  - attendance: ${attendanceUpdated}
  - schedules: ${schedulesUpdated}
  - contracts: ${contractsUpdated}
  - savedContracts: ${savedContractsUpdated}
  - signedContracts: ${signedContractsUpdated}
  - salaries: ${salariesUpdated}
  - notices: ${noticesUpdated}
  - approvals: ${approvalsUpdated}
  - shift_requests: ${shiftRequestsUpdated}
  - time_change_reports: ${timeChangeReportsUpdated}
  `);

  process.exit(0);
}

addCompanyIdToAll().catch(err => {
  console.error('❌ 오류:', err);
  process.exit(1);
});
