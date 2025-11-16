#!/usr/bin/env node

/**
 * 회사 2호 관리자 계정 수정 스크립트
 * 
 * 문제: 초대코드로 가입한 관리자 계정에 role, storeId 필드 누락
 * 해결: 필수 필드 추가
 */

const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  console.log('🔧 회사 2호 관리자 계정 수정 시작...\n');
  
  const userId = '54pfdSEwTcPQTo6LwIs3LvD3KQX2';
  const companyId = 'ABC2025-CGIP';
  
  try {
    // 1. 현재 데이터 확인
    console.log('📍 현재 데이터 확인...');
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.error('❌ 사용자를 찾을 수 없습니다.');
      process.exit(1);
    }
    
    console.log('현재 데이터:', userDoc.data());
    
    // 2. 필수 필드 추가
    console.log('\n🔄 필수 필드 추가 중...');
    
    await db.collection('users').doc(userId).update({
      role: 'admin',
      storeId: null,
      store: null,
      name: '최서영',
      companyId: companyId,  // 확인
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ 필드 추가 완료!');
    
    // 3. 확인
    console.log('\n📍 수정된 데이터 확인...');
    const updatedDoc = await db.collection('users').doc(userId).get();
    console.log('수정된 데이터:', updatedDoc.data());
    
    console.log('\n✅ 완료! 새로고침 후 로그인하세요.\n');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 실행
main();
