#!/usr/bin/env node

/**
 * attendance, salaries, schedules에 companyId 추가
 * 
 * 목적:
 *   - 기존 storeId 유지 (매장별 격리)
 *   - companyId 추가 (회사 단위 조회 성능 향상)
 *   - 쿼리: 기본은 storeId, 필요시 companyId
 * 
 * 사용:
 *   node scripts/add-companyid-to-store-collections.js
 */

const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * storeId로 companyId 찾기
 */
async function getCompanyIdByStoreId(storeId) {
  try {
    const storeDoc = await db.collection('stores').doc(storeId).get();
    if (storeDoc.exists) {
      return storeDoc.data().companyId;
    }
    return null;
  } catch (error) {
    console.error(`❌ 매장 조회 실패 (${storeId}):`, error.message);
    return null;
  }
}

/**
 * 컬렉션에 companyId 추가
 */
async function addCompanyIdToCollection(collectionName) {
  console.log(`\n🔄 ${collectionName} 컬렉션 처리 중...`);
  
  try {
    // 1. 전체 문서 조회
    const snapshot = await db.collection(collectionName).get();
    console.log(`   📋 총 문서: ${snapshot.size}개`);
    
    if (snapshot.empty) {
      console.log(`   ✅ 빈 컬렉션, 스킵`);
      return { success: true, updated: 0 };
    }
    
    // 2. storeId별로 그룹화
    const storeMap = new Map();
    snapshot.forEach(doc => {
      const data = doc.data();
      const storeId = data.storeId || data.store;  // store 필드도 체크
      
      if (storeId) {
        if (!storeMap.has(storeId)) {
          storeMap.set(storeId, []);
        }
        storeMap.get(storeId).push({ id: doc.id, data });
      }
    });
    
    console.log(`   🏪 매장 수: ${storeMap.size}개`);
    
    // 3. 매장별로 companyId 조회 및 업데이트
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const [storeId, docs] of storeMap.entries()) {
      // storeId로 companyId 찾기
      const companyId = await getCompanyIdByStoreId(storeId);
      
      if (!companyId) {
        console.warn(`   ⚠️  매장 ${storeId}의 companyId를 찾을 수 없음 (${docs.length}개 문서)`);
        errorCount += docs.length;
        continue;
      }
      
      // 배치 업데이트
      const batch = db.batch();
      let batchCount = 0;
      
      for (const doc of docs) {
        // 이미 companyId가 있으면 스킵
        if (doc.data.companyId) {
          continue;
        }
        
        const docRef = db.collection(collectionName).doc(doc.id);
        batch.update(docRef, { companyId });
        batchCount++;
        
        // 500개마다 커밋
        if (batchCount >= 500) {
          await batch.commit();
          updatedCount += batchCount;
          console.log(`   📝 ${updatedCount}개 업데이트 완료...`);
          batchCount = 0;
        }
      }
      
      // 남은 배치 커밋
      if (batchCount > 0) {
        await batch.commit();
        updatedCount += batchCount;
      }
    }
    
    console.log(`   ✅ ${collectionName}: ${updatedCount}개 업데이트, ${errorCount}개 오류`);
    return { success: true, updated: updatedCount, errors: errorCount };
    
  } catch (error) {
    console.error(`   ❌ ${collectionName} 처리 실패:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('🚀 companyId 추가 스크립트 시작\n');
  console.log('대상 컬렉션: attendance, salaries, schedules\n');
  
  const results = {
    attendance: null,
    salaries: null,
    schedules: null
  };
  
  try {
    // 1. attendance
    results.attendance = await addCompanyIdToCollection('attendance');
    
    // 2. salaries
    results.salaries = await addCompanyIdToCollection('salaries');
    
    // 3. schedules
    results.schedules = await addCompanyIdToCollection('schedules');
    
    // 결과 요약
    console.log('\n\n📊 최종 결과:');
    console.log('='.repeat(50));
    
    for (const [collection, result] of Object.entries(results)) {
      if (result && result.success) {
        console.log(`✅ ${collection}: ${result.updated}개 업데이트`);
        if (result.errors > 0) {
          console.log(`   ⚠️  ${result.errors}개 오류 (companyId 찾기 실패)`);
        }
      } else {
        console.log(`❌ ${collection}: 실패`);
      }
    }
    
    console.log('='.repeat(50));
    console.log('\n✅ 스크립트 완료!');
    
  } catch (error) {
    console.error('\n❌ 전체 프로세스 실패:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// 실행
main();
