// ===================================================================
// Schedule Migration Script - Node.js 실행용
// ===================================================================

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'abcdc-staff-system'
});

const db = admin.firestore();

// ===================================================================
// 로그 함수
// ===================================================================

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('ko-KR');
  const prefix = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }[type] || '📝';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// ===================================================================
// ISO 8601 주차 계산
// ===================================================================

function getMondayOfWeek(year, weekNum) {
  // ISO 8601 기준: 첫 주는 목요일이 포함된 주
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // 일요일을 7로
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4Day + 1);
  
  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
  
  return targetMonday;
}

// ===================================================================
// 1단계: 현재 데이터 구조 확인
// ===================================================================

async function checkCurrentStructure() {
  try {
    log('========================================');
    log('1단계: 현재 데이터 구조 확인');
    log('========================================\n');

    const snapshot = await db.collection('schedules').limit(10).get();
    
    if (snapshot.empty) {
      log('schedules 컬렉션이 비어있습니다.', 'warning');
      return { needsMigration: false, reason: 'empty' };
    }

    log(`샘플 ${snapshot.size}개 문서 확인 중...\n`);

    let weeklyCount = 0;
    let dailyCount = 0;

    snapshot.forEach((doc, index) => {
      const data = doc.data();
      const hasDateField = 'date' in data;
      const hasDayFields = '월' in data || '화' in data;

      log(`문서 ${index + 1}: ${doc.id}`);
      
      if (hasDateField && !hasDayFields) {
        dailyCount++;
        log(`  ✅ 날짜별 구조 (새) - date: ${data.date}, userId: ${data.userId}`);
      } else if (hasDayFields && !hasDateField) {
        weeklyCount++;
        log(`  ❌ 주차별 구조 (기존) - year: ${data.year}, weekNum: ${data.weekNum}, userId: ${data.userId}`);
      } else {
        log(`  ⚠️ 알 수 없는 구조`, 'warning');
      }
    });

    log('\n========================================');
    log(`분석 결과:`);
    log(`  - 주차별 구조: ${weeklyCount}개`);
    log(`  - 날짜별 구조: ${dailyCount}개`);
    log('========================================\n');

    if (weeklyCount > 0 && dailyCount === 0) {
      log('✅ 마이그레이션이 필요합니다.', 'success');
      return { needsMigration: true, type: 'weekly' };
    } else if (dailyCount > 0 && weeklyCount === 0) {
      log('✅ 이미 날짜별 구조입니다. 마이그레이션 불필요.', 'success');
      return { needsMigration: false, type: 'daily' };
    } else {
      log('⚠️ 혼합 구조 감지. 수동 확인 필요.', 'warning');
      return { needsMigration: false, type: 'mixed' };
    }

  } catch (error) {
    log(`구조 확인 실패: ${error.message}`, 'error');
    throw error;
  }
}

// ===================================================================
// 2단계: 백업
// ===================================================================

async function backupData() {
  try {
    log('\n========================================');
    log('2단계: 데이터 백업');
    log('========================================\n');

    // 기존 백업 삭제
    log('기존 백업 삭제 중...');
    const existingBackup = await db.collection('schedules_backup').get();
    if (!existingBackup.empty) {
      const batch = db.batch();
      let count = 0;
      existingBackup.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });
      await batch.commit();
      log(`기존 백업 ${count}개 삭제 완료`);
    }

    // 현재 데이터 백업
    log('현재 schedules 백업 중...');
    const snapshot = await db.collection('schedules').get();
    log(`총 ${snapshot.size}개 문서 백업 시작`);

    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      const backupRef = db.collection('schedules_backup').doc(doc.id);
      batch.set(backupRef, doc.data());
      count++;

      if (count % 500 === 0) {
        await batch.commit();
        log(`${count}개 백업 완료...`);
        batch = db.batch();
      }
    }

    if (count % 500 !== 0) {
      await batch.commit();
    }

    log(`✅ 백업 완료: ${count}개 문서`, 'success');
    return count;

  } catch (error) {
    log(`백업 실패: ${error.message}`, 'error');
    throw error;
  }
}

// ===================================================================
// 3단계: 데이터 변환
// ===================================================================

async function migrateData() {
  try {
    log('\n========================================');
    log('3단계: 데이터 변환 (주차별 → 날짜별)');
    log('========================================\n');

    // 기존 schedules_new 삭제
    log('기존 schedules_new 삭제 중...');
    const existingNew = await db.collection('schedules_new').get();
    if (!existingNew.empty) {
      const batch = db.batch();
      let count = 0;
      existingNew.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });
      await batch.commit();
      log(`기존 schedules_new ${count}개 삭제 완료`);
    }

    // 주차별 데이터 조회
    const snapshot = await db.collection('schedules').get();
    log(`총 ${snapshot.size}개 주차 문서 변환 시작\n`);

    const days = ['월', '화', '수', '목', '금', '토', '일'];
    let totalNewDocs = 0;
    let batchCount = 0;
    let batch = db.batch();
    const errors = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;

      // 문서 ID 파싱: userId_year-weekNum
      const parts = docId.split('_');
      if (parts.length < 2) {
        errors.push(`잘못된 문서 ID 형식: ${docId}`);
        log(`⚠️ 건너뛰기: ${docId} (잘못된 ID 형식)`, 'warning');
        continue;
      }

      const userId = parts[0];
      const weekInfo = parts[1];
      const weekParts = weekInfo.split('-');
      
      if (weekParts.length !== 2) {
        errors.push(`잘못된 주차 정보: ${docId}`);
        log(`⚠️ 건너뛰기: ${docId} (잘못된 주차 정보)`, 'warning');
        continue;
      }

      const year = parseInt(weekParts[0]);
      const weekNum = parseInt(weekParts[1]);

      if (isNaN(year) || isNaN(weekNum)) {
        errors.push(`숫자 변환 실패: ${docId}`);
        log(`⚠️ 건너뛰기: ${docId} (숫자 변환 실패)`, 'warning');
        continue;
      }

      // 해당 주의 월요일 계산
      const mondayDate = getMondayOfWeek(year, weekNum);

      // 각 요일별로 개별 문서 생성
      days.forEach((day, index) => {
        const dayData = data[day];

        // 근무일인 경우만 문서 생성
        if (dayData && dayData.isWorkDay) {
          const workDate = new Date(mondayDate);
          workDate.setDate(workDate.getDate() + index);
          const dateStr = workDate.toISOString().split('T')[0];

          const newDoc = {
            userId: userId,
            userName: data.userName || '',
            store: data.store || '',
            date: dateStr,
            startTime: dayData.startTime || '',
            endTime: dayData.endTime || '',
            hours: dayData.hours || 0,
            isShiftReplacement: false,
            shiftRequestId: null,
            originalRequesterId: null,
            originalRequesterName: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            migratedFrom: docId,
            migratedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          const newRef = db.collection('schedules_new').doc();
          batch.set(newRef, newDoc);
          totalNewDocs++;
          batchCount++;

          // 500개마다 커밋
          if (batchCount >= 500) {
            log(`${totalNewDocs}개 변환 완료...`);
            batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
      });
    }

    // 남은 배치 커밋
    if (batchCount > 0) {
      await batch.commit();
    }

    log(`\n✅ 변환 완료: ${totalNewDocs}개 근무 문서 생성`, 'success');
    
    if (errors.length > 0) {
      log(`\n⚠️ 경고: ${errors.length}개 문서 변환 실패`, 'warning');
      errors.forEach(err => log(`  - ${err}`, 'warning'));
    }

    return { totalNewDocs, errors };

  } catch (error) {
    log(`변환 실패: ${error.message}`, 'error');
    throw error;
  }
}

// ===================================================================
// 4단계: 데이터 검증
// ===================================================================

async function validateData() {
  try {
    log('\n========================================');
    log('4단계: 데이터 검증');
    log('========================================\n');

    // schedules 원본 통계
    const originalSnapshot = await db.collection('schedules').get();
    const originalDocs = originalSnapshot.size;
    
    let originalWorkDays = 0;
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    
    originalSnapshot.forEach(doc => {
      const data = doc.data();
      days.forEach(day => {
        if (data[day] && data[day].isWorkDay) {
          originalWorkDays++;
        }
      });
    });

    log(`원본 (schedules):`);
    log(`  - 주차 문서 수: ${originalDocs}개`);
    log(`  - 총 근무일 수: ${originalWorkDays}개`);

    // schedules_new 통계
    const newSnapshot = await db.collection('schedules_new').get();
    const newDocs = newSnapshot.size;

    log(`\n변환 결과 (schedules_new):`);
    log(`  - 날짜별 문서 수: ${newDocs}개`);

    // 검증
    const isValid = originalWorkDays === newDocs;
    
    log('\n========================================');
    if (isValid) {
      log(`✅ 검증 성공: 근무일 수 일치 (${originalWorkDays} = ${newDocs})`, 'success');
    } else {
      log(`❌ 검증 실패: 근무일 수 불일치 (원본: ${originalWorkDays}, 변환: ${newDocs})`, 'error');
      log(`⚠️ 차이: ${Math.abs(originalWorkDays - newDocs)}개`, 'warning');
    }
    log('========================================\n');

    return { isValid, originalWorkDays, newDocs };

  } catch (error) {
    log(`검증 실패: ${error.message}`, 'error');
    throw error;
  }
}

// ===================================================================
// 5단계: 컬렉션 전환
// ===================================================================

async function switchCollections() {
  try {
    log('\n========================================');
    log('5단계: 컬렉션 전환');
    log('========================================\n');

    log('⚠️ 주의: 이 작업은 프로덕션 데이터를 변경합니다!', 'warning');
    log('5초 후 자동 실행...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 1. schedules → schedules_old
    log('1/3: schedules → schedules_old 이동 중...');
    const schedulesSnapshot = await db.collection('schedules').get();
    let batch = db.batch();
    let count = 0;

    for (const doc of schedulesSnapshot.docs) {
      const oldRef = db.collection('schedules_old').doc(doc.id);
      batch.set(oldRef, doc.data());
      batch.delete(doc.ref);
      count++;

      if (count % 500 === 0) {
        await batch.commit();
        log(`  ${count}개 이동 완료...`);
        batch = db.batch();
      }
    }

    if (count % 500 !== 0) {
      await batch.commit();
    }
    log(`  ✅ schedules_old로 이동 완료: ${count}개`, 'success');

    // 2. schedules_new → schedules
    log('\n2/3: schedules_new → schedules 이동 중...');
    const newSnapshot = await db.collection('schedules_new').get();
    batch = db.batch();
    count = 0;

    for (const doc of newSnapshot.docs) {
      const scheduleRef = db.collection('schedules').doc(doc.id);
      batch.set(scheduleRef, doc.data());
      batch.delete(doc.ref);
      count++;

      if (count % 500 === 0) {
        await batch.commit();
        log(`  ${count}개 이동 완료...`);
        batch = db.batch();
      }
    }

    if (count % 500 !== 0) {
      await batch.commit();
    }
    log(`  ✅ schedules로 이동 완료: ${count}개`, 'success');

    // 3. 최종 확인
    log('\n3/3: 최종 확인 중...');
    const finalSchedules = await db.collection('schedules').get();
    const finalSchedulesOld = await db.collection('schedules_old').get();
    const finalSchedulesNew = await db.collection('schedules_new').get();

    log(`\n최종 상태:`);
    log(`  - schedules: ${finalSchedules.size}개 (활성)`);
    log(`  - schedules_old: ${finalSchedulesOld.size}개 (백업)`);
    log(`  - schedules_new: ${finalSchedulesNew.size}개 (비어있음)`);

    log('\n========================================');
    log('✅ 전환 완료!', 'success');
    log('========================================\n');

    return { success: true, activeDocs: finalSchedules.size };

  } catch (error) {
    log(`전환 실패: ${error.message}`, 'error');
    throw error;
  }
}

// ===================================================================
// 메인 실행
// ===================================================================

async function main() {
  try {
    log('========================================');
    log('🚀 Schedule Migration 시작');
    log('========================================\n');

    // 1단계: 구조 확인
    const structureCheck = await checkCurrentStructure();
    
    if (!structureCheck.needsMigration) {
      if (structureCheck.type === 'daily') {
        log('✅ 마이그레이션이 이미 완료되었습니다.', 'success');
      } else if (structureCheck.type === 'mixed') {
        log('❌ 혼합 구조 감지. 수동 확인이 필요합니다.', 'error');
      } else if (structureCheck.reason === 'empty') {
        log('⚠️ schedules 컬렉션이 비어있습니다.', 'warning');
      }
      process.exit(0);
    }

    // 2단계: 백업
    await backupData();

    // 3단계: 변환
    const migrationResult = await migrateData();

    // 4단계: 검증
    const validationResult = await validateData();

    if (!validationResult.isValid) {
      log('\n❌ 검증 실패로 인해 전환을 중단합니다.', 'error');
      log('schedules_backup과 schedules_new를 확인하세요.', 'warning');
      process.exit(1);
    }

    // 5단계: 전환
    await switchCollections();

    log('\n========================================');
    log('✅ 마이그레이션 완료!', 'success');
    log('========================================\n');
    log('다음 단계:');
    log('1. 관리자 페이지에서 스케줄 테이블 확인');
    log('2. 교대근무 승인 테스트');
    log('3. 직원 페이지에서 본인 스케줄 확인');
    log('4. 문제 발생 시: schedules_old를 schedules로 복원\n');

    process.exit(0);

  } catch (error) {
    log(`\n❌ 마이그레이션 실패: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// 실행
main();
