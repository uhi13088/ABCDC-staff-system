#!/usr/bin/env node

/**
 * Schedules Collection Migration Script
 * 주차별 문서 → 일별 문서 마이그레이션
 */

const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
const serviceAccount = {
  projectId: "abcdc-staff-system",
  // Note: Service account credentials would normally be required
  // For this migration, we'll use application default credentials
};

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "abcdc-staff-system"
});

const db = admin.firestore();

// 로그 함수
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('ko-KR');
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '📝';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// ISO 8601 주차 계산 (월요일 시작)
function getMondayOfWeek(year, weekNum) {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4Day + 1);
  
  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
  
  return targetMonday;
}

// 0단계: 구조 확인
async function checkStructure() {
  log('\n========================================');
  log('0단계: 현재 데이터 구조 확인');
  log('========================================\n');
  
  const snapshot = await db.collection('schedules').limit(10).get();
  
  if (snapshot.empty) {
    log('⚠️ schedules 컬렉션이 비어있습니다.', 'warning');
    return { needsMigration: false, type: 'empty' };
  }
  
  const firstDoc = snapshot.docs[0];
  const data = firstDoc.data();
  
  log(`샘플 문서 ID: ${firstDoc.id}`);
  log(`샘플 데이터 구조: ${JSON.stringify(Object.keys(data))}`);
  
  // 주차별 구조 확인 (userId_year-week 형식)
  if (firstDoc.id.includes('_') && firstDoc.id.includes('-')) {
    const parts = firstDoc.id.split('_');
    if (parts.length === 2 && parts[1].includes('-')) {
      log('✅ 주차별 구조 감지 - 마이그레이션 필요', 'success');
      return { needsMigration: true, type: 'weekly' };
    }
  }
  
  // 날짜 기반 구조 확인
  if (data.date && typeof data.date === 'string' && data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    log('✅ 이미 날짜별 구조입니다 - 마이그레이션 불필요', 'success');
    return { needsMigration: false, type: 'daily' };
  }
  
  log('⚠️ 알 수 없는 구조입니다.', 'warning');
  return { needsMigration: false, type: 'unknown' };
}

// 1단계: 백업
async function backupData() {
  log('\n========================================');
  log('1단계: 데이터 백업');
  log('========================================\n');
  
  const snapshot = await db.collection('schedules').get();
  log(`백업할 문서: ${snapshot.size}개`);
  
  if (snapshot.empty) {
    log('⚠️ 백업할 데이터가 없습니다.', 'warning');
    return;
  }
  
  const batch = db.batch();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    const backupRef = db.collection('schedules_backup').doc(doc.id);
    batch.set(backupRef, doc.data());
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      log(`진행 중: ${count}/${snapshot.size} 백업 완료`);
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  log(`✅ 백업 완료: ${count}개 문서`, 'success');
}

// 2단계: 데이터 변환
async function migrateData() {
  log('\n========================================');
  log('2단계: 주차별 → 일별 문서 변환');
  log('========================================\n');
  
  const snapshot = await db.collection('schedules').get();
  log(`변환할 주차별 문서: ${snapshot.size}개`);
  
  let batch = db.batch();
  let totalDocs = 0;
  let totalWorkDays = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const docId = doc.id;
    
    // userId_year-week 파싱
    const match = docId.match(/^(.+)_(\d{4})-(\d{2})$/);
    if (!match) {
      log(`⚠️ 문서 ID 형식 불일치, 건너뜀: ${docId}`, 'warning');
      continue;
    }
    
    const [, userId, yearStr, weekStr] = match;
    const year = parseInt(yearStr);
    const weekNum = parseInt(weekStr);
    
    // ISO 8601 주차의 월요일 날짜 계산
    const monday = getMondayOfWeek(year, weekNum);
    
    // 요일별 스케줄 변환
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    
    for (let i = 0; i < 7; i++) {
      const day = days[i];
      const dayData = data[day];
      
      if (!dayData || !dayData.isWorkDay) {
        continue; // 근무일 아니면 스킵
      }
      
      // 해당 요일의 날짜 계산
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // 새 일별 문서 생성
      const newDocRef = db.collection('schedules_new').doc();
      const newSchedule = {
        userId: userId,
        store: data.store || '',
        date: dateStr,
        startTime: dayData.startTime || '',
        endTime: dayData.endTime || '',
        hours: dayData.hours || 0,
        isShiftReplacement: dayData.isShiftReplacement || false,
        shiftRequestId: dayData.shiftRequestId || null,
        originalRequesterId: dayData.originalRequesterId || null,
        originalRequesterName: dayData.originalRequesterName || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.set(newDocRef, newSchedule);
      totalDocs++;
      totalWorkDays++;
      
      // 500개마다 커밋
      if (totalDocs % 500 === 0) {
        await batch.commit();
        log(`진행 중: ${totalDocs}개 일별 문서 생성 완료`);
        batch = db.batch();
      }
    }
  }
  
  // 남은 배치 커밋
  if (totalDocs % 500 !== 0) {
    await batch.commit();
  }
  
  log(`✅ 변환 완료: ${totalWorkDays}개 근무일 → ${totalDocs}개 일별 문서`, 'success');
  return { totalDocs, totalWorkDays };
}

// 3단계: 검증
async function validateData() {
  log('\n========================================');
  log('3단계: 데이터 검증');
  log('========================================\n');
  
  // 원본 근무일 수 계산
  const originalSnapshot = await db.collection('schedules').get();
  let originalWorkDays = 0;
  
  for (const doc of originalSnapshot.docs) {
    const data = doc.data();
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    
    for (const day of days) {
      if (data[day] && data[day].isWorkDay) {
        originalWorkDays++;
      }
    }
  }
  
  // 새 문서 수 확인
  const newSnapshot = await db.collection('schedules_new').get();
  const newDocs = newSnapshot.size;
  
  log(`원본 근무일 수: ${originalWorkDays}개`);
  log(`변환 문서 수: ${newDocs}개`);
  
  const isValid = originalWorkDays === newDocs;
  
  if (isValid) {
    log('✅ 검증 성공: 데이터 개수 일치', 'success');
  } else {
    log('❌ 검증 실패: 데이터 개수 불일치', 'error');
    log(`차이: ${Math.abs(originalWorkDays - newDocs)}개`, 'error');
  }
  
  return { isValid, originalWorkDays, newDocs };
}

// 4단계: 컬렉션 전환
async function switchCollections() {
  log('\n========================================');
  log('4단계: 컬렉션 전환 (schedules → schedules_old, schedules_new → schedules)');
  log('========================================\n');
  
  // 기존 schedules → schedules_old
  log('기존 schedules를 schedules_old로 이동 중...');
  const oldSnapshot = await db.collection('schedules').get();
  let batch = db.batch();
  let count = 0;
  
  for (const doc of oldSnapshot.docs) {
    const oldRef = db.collection('schedules_old').doc(doc.id);
    batch.set(oldRef, doc.data());
    
    const deleteRef = db.collection('schedules').doc(doc.id);
    batch.delete(deleteRef);
    
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      log(`진행 중: ${count}개 이동 완료`);
      batch = db.batch();
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  log(`✅ schedules → schedules_old 완료: ${count}개`, 'success');
  
  // schedules_new → schedules
  log('\nschedules_new를 schedules로 이동 중...');
  const newSnapshot = await db.collection('schedules_new').get();
  batch = db.batch();
  count = 0;
  
  for (const doc of newSnapshot.docs) {
    const newRef = db.collection('schedules').doc(doc.id);
    batch.set(newRef, doc.data());
    
    const deleteRef = db.collection('schedules_new').doc(doc.id);
    batch.delete(deleteRef);
    
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      log(`진행 중: ${count}개 이동 완료`);
      batch = db.batch();
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  log(`✅ schedules_new → schedules 완료: ${count}개`, 'success');
  log('✅ 컬렉션 전환 완료!', 'success');
}

// 메인 실행
async function main() {
  try {
    log('========================================');
    log('🚀 Schedules Collection 마이그레이션 시작');
    log('========================================\n');
    
    // 0단계: 구조 확인
    const structureCheck = await checkStructure();
    
    if (!structureCheck.needsMigration) {
      log('\n✅ 마이그레이션이 필요하지 않습니다.', 'success');
      if (structureCheck.type === 'daily') {
        log('이미 날짜별 구조로 되어있습니다.', 'success');
      }
      process.exit(0);
    }
    
    // 1단계: 백업
    await backupData();
    
    // 2단계: 변환
    await migrateData();
    
    // 3단계: 검증
    const validation = await validateData();
    
    if (!validation.isValid) {
      log('\n❌ 검증 실패! 전환을 중단합니다.', 'error');
      log('schedules_backup에서 복구할 수 있습니다.', 'warning');
      process.exit(1);
    }
    
    // 4단계: 전환
    log('\n⚠️ 5초 후 프로덕션 전환을 시작합니다...', 'warning');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await switchCollections();
    
    // 완료
    log('\n========================================');
    log('✅ 마이그레이션 완료!');
    log('========================================\n');
    log('백업 컬렉션:', 'info');
    log('- schedules_backup: 원본 백업', 'info');
    log('- schedules_old: 이전 주차별 문서', 'info');
    log('\n관리자 페이지에서 스케줄 테이블을 확인하세요.', 'success');
    
    process.exit(0);
    
  } catch (error) {
    log(`\n❌ 마이그레이션 실패: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// 실행
main();
