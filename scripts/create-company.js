#!/usr/bin/env node

/**
 * 새 회사(테넌트) 생성 스크립트
 * 
 * 사용법:
 *   node scripts/create-company.js
 * 
 * 기능:
 *   1. companies 컬렉션에 새 회사 문서 생성
 *   2. stores 컬렉션에 매장 문서 생성
 *   3. company_invites에 초대 코드 생성 (staff용, manager용)
 *   4. (선택) super_admin 계정 생성
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Firebase Admin SDK 초기화
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 사용자 입력 인터페이스
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * 랜덤 ID 생성
 */
function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 초대 코드 생성
 */
function generateInviteCode(companyPrefix, role) {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${companyPrefix}${year}-${role.toUpperCase()}-${random}`;
}

/**
 * 메인 함수
 */
async function main() {
  console.log('🚀 새 회사(테넌트) 생성 스크립트\n');
  
  try {
    // 1. 회사 정보 입력
    console.log('=== 회사 정보 입력 ===\n');
    
    const companyName = await question('회사명: ');
    if (!companyName) {
      console.error('❌ 회사명은 필수입니다.');
      process.exit(1);
    }
    
    const ownerName = await question('대표자명: ');
    const ownerEmail = await question('대표자 이메일: ');
    const ownerPassword = await question('대표자 비밀번호 (6자 이상): ');
    
    if (!ownerEmail || !ownerPassword || ownerPassword.length < 6) {
      console.error('❌ 이메일과 비밀번호(6자 이상)는 필수입니다.');
      process.exit(1);
    }
    
    const businessNumber = await question('사업자등록번호 (선택): ');
    const phone = await question('연락처 (선택): ');
    const address = await question('주소 (선택): ');
    
    // 2. 매장 정보 입력
    console.log('\n=== 매장 정보 입력 ===\n');
    
    const storeName = await question('매장명 (기본: 본점): ') || '본점';
    const storePhone = await question('매장 연락처 (선택): ');
    const storeAddress = await question('매장 주소 (선택): ');
    
    // 3. 확인
    console.log('\n=== 입력 정보 확인 ===\n');
    console.log(`회사명: ${companyName}`);
    console.log(`대표자: ${ownerName} (${ownerEmail})`);
    console.log(`매장명: ${storeName}`);
    console.log('');
    
    const confirm = await question('위 정보로 생성하시겠습니까? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('취소되었습니다.');
      process.exit(0);
    }
    
    // 4. ID 생성
    const companyId = generateId('company');
    const storeId = generateId('store');
    const companyPrefix = companyName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    
    console.log('\n🔄 생성 중...\n');
    
    // 5. companies 문서 생성
    console.log('📝 1/4: companies 문서 생성...');
    await db.collection('companies').doc(companyId).set({
      name: companyName,
      ownerName: ownerName || '',
      ownerEmail: ownerEmail || '',
      businessNumber: businessNumber || '',
      phone: phone || '',
      address: address || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`   ✅ 회사 ID: ${companyId}`);
    
    // 6. stores 문서 생성
    console.log('\n📝 2/4: stores 문서 생성...');
    await db.collection('stores').doc(storeId).set({
      companyId: companyId,
      name: storeName,
      phone: storePhone || '',
      address: storeAddress || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`   ✅ 매장 ID: ${storeId}`);
    
    // 7. 초대 코드 생성 (staff용)
    console.log('\n📝 3/4: 초대 코드 생성 (staff용)...');
    const staffCode = generateInviteCode(companyPrefix, 'staff');
    const staffInviteId = generateId('invite');
    
    await db.collection('company_invites').doc(staffInviteId).set({
      code: staffCode,
      companyId: companyId,
      storeId: storeId,
      storeName: storeName,
      role: 'staff',
      inviteUrl: `https://abcdc-staff-system.web.app/employee-register.html?code=${staffCode}`,
      maxUses: 50,
      usedCount: 0,
      status: 'active',
      createdBy: 'system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`   ✅ Staff 초대 코드: ${staffCode}`);
    console.log(`   📎 초대 링크: https://abcdc-staff-system.web.app/employee-register.html?code=${staffCode}`);
    
    // 8. 초대 코드 생성 (manager용)
    console.log('\n📝 4/4: 초대 코드 생성 (manager용)...');
    const managerCode = generateInviteCode(companyPrefix, 'manager');
    const managerInviteId = generateId('invite');
    
    await db.collection('company_invites').doc(managerInviteId).set({
      code: managerCode,
      companyId: companyId,
      storeId: storeId,
      storeName: storeName,
      role: 'manager',
      inviteUrl: `https://abcdc-staff-system.web.app/employee-register.html?code=${managerCode}`,
      maxUses: 10,
      usedCount: 0,
      status: 'active',
      createdBy: 'system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`   ✅ Manager 초대 코드: ${managerCode}`);
    console.log(`   📎 초대 링크: https://abcdc-staff-system.web.app/employee-register.html?code=${managerCode}`);
    
    // 9. 관리자 계정 생성 (Firebase Auth + Firestore users)
    console.log('\n📝 5/5: 관리자 계정 생성...');
    
    try {
      // Firebase Auth 계정 생성
      const userRecord = await admin.auth().createUser({
        email: ownerEmail,
        password: ownerPassword,
        displayName: ownerName,
        emailVerified: false
      });
      
      console.log(`   ✅ Auth 계정 생성: ${userRecord.uid}`);
      
      // Firestore users 문서 생성
      await db.collection('users').doc(userRecord.uid).set({
        email: ownerEmail,
        name: ownerName,
        displayName: ownerName,
        role: 'admin',  // 🔥 관리자 권한
        companyId: companyId,  // 🔥 회사 ID
        storeId: null,  // 관리자는 특정 매장 없음
        store: null,
        phone: phone || '',
        address: address || '',
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'system',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`   ✅ Firestore users 문서 생성 완료`);
      console.log(`   📧 로그인 정보:`);
      console.log(`      - 이메일: ${ownerEmail}`);
      console.log(`      - 비밀번호: ${ownerPassword}`);
      
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        console.error(`   ⚠️ 이메일이 이미 존재합니다. Firestore 문서만 업데이트합니다.`);
        
        // 기존 사용자 찾기
        const existingUser = await admin.auth().getUserByEmail(ownerEmail);
        
        // Firestore users 문서 업데이트
        await db.collection('users').doc(existingUser.uid).set({
          email: ownerEmail,
          name: ownerName,
          displayName: ownerName,
          role: 'admin',
          companyId: companyId,
          storeId: null,
          store: null,
          phone: phone || '',
          address: address || '',
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`   ✅ 기존 계정에 회사 정보 업데이트: ${existingUser.uid}`);
      } else {
        throw authError;
      }
    }
    
    // 10. 완료
    console.log('\n✅ 새 회사 생성 완료!\n');
    console.log('=== 생성된 정보 ===');
    console.log(`회사 ID: ${companyId}`);
    console.log(`매장 ID: ${storeId}`);
    console.log(`\n관리자 로그인 정보:`);
    console.log(`  이메일: ${ownerEmail}`);
    console.log(`  비밀번호: ${ownerPassword}`);
    console.log(`  권한: admin`);
    console.log(`\n초대 코드:`);
    console.log(`  Staff: ${staffCode}`);
    console.log(`  Manager: ${managerCode}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// 실행
main();
