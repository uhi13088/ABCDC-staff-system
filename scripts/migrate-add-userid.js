#!/usr/bin/env node

/**
 * ============================================================
 * 필드명 표준화 마이그레이션 스크립트
 * ============================================================
 * 
 * 목적: 기존 데이터에 userId 표준 필드 추가
 * 
 * 작업 내용:
 * - attendance: uid → userId
 * - contracts: employeeId → userId
 * - signedContracts: employeeId → userId
 * - salaries: employeeUid → userId
 * - approvals: applicantUid → userId
 * - time_change_reports: employeeUid → userId
 * - shift_requests: requesterId → requesterUserId, matchedUserId → replacementUserId
 * 
 * 실행 방법:
 * node scripts/migrate-add-userid.js
 * 
 * 주의사항:
 * - Dry-run 모드로 먼저 테스트 (DRY_RUN = true)
 * - 프로덕션 실행 전 데이터베이스 백업 필수
 * - 멀티테넌트 환경이므로 companyId 기반 격리 확인
 * - 배치 처리로 성능 최적화 (500개씩)
 * 
 * ============================================================
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ============================================================
// 설정
// ============================================================

// ⚠️ Dry-run 모드 (true: 실제 변경 안 함, false: 실제 변경)
const DRY_RUN = true;

// 배치 크기 (Firestore 제한: 최대 500)
const BATCH_SIZE = 500;

// 처리할 컬렉션 목록
const COLLECTIONS = [
  {
    name: 'attendance',
    sourceField: 'uid',
    targetField: 'userId',
    description: '출퇴근 기록'
  },
  {
    name: 'contracts',
    sourceField: 'employeeId',
    targetField: 'userId',
    description: '계약서'
  },
  {
    name: 'signedContracts',
    sourceField: 'employeeId',
    targetField: 'userId',
    description: '서명된 계약서'
  },
  {
    name: 'salaries',
    sourceField: 'employeeUid',
    targetField: 'userId',
    description: '급여 확정'
  },
  {
    name: 'approvals',
    sourceField: 'applicantUid',
    targetField: 'userId',
    description: '승인 문서'
  },
  {
    name: 'time_change_reports',
    sourceField: 'employeeUid',
    targetField: 'userId',
    description: '시간 변경 보고'
  }
];

// shift_requests는 다중 필드라 별도 처리
const SHIFT_REQUESTS_CONFIG = {
  name: 'shift_requests',
  description: '교대근무 요청',
  mappings: [
    { source: 'requesterId', target: 'requesterUserId', description: '신청자' },
    { source: 'matchedUserId', target: 'replacementUserId', description: '대타자' }
  ]
};

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 로그 출력 (타임스탬프 포함)
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ️ ',
    success: '✅',
    warning: '⚠️ ',
    error: '❌',
    start: '🚀',
    end: '🎉'
  }[type] || '';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * 통계 출력
 */
function printStats(stats) {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 처리 결과 통계`);
  console.log('='.repeat(60));
  console.log(`총 문서 수:       ${stats.total.toLocaleString()}개`);
  console.log(`업데이트 필요:    ${stats.needsUpdate.toLocaleString()}개`);
  console.log(`이미 최신:        ${stats.alreadyUpdated.toLocaleString()}개`);
  console.log(`소스 필드 없음:   ${stats.missingSource.toLocaleString()}개`);
  console.log(`성공:             ${stats.success.toLocaleString()}개`);
  console.log(`실패:             ${stats.failed.toLocaleString()}개`);
  console.log('='.repeat(60) + '\n');
}

/**
 * 배치 처리로 문서 업데이트
 */
async function updateInBatches(updates) {
  let successCount = 0;
  let failedCount = 0;
  
  // BATCH_SIZE개씩 묶어서 처리
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const batchUpdates = updates.slice(i, i + BATCH_SIZE);
    
    batchUpdates.forEach(update => {
      batch.update(update.ref, update.data);
    });
    
    try {
      if (!DRY_RUN) {
        await batch.commit();
      }
      successCount += batchUpdates.length;
      log(`  배치 커밋 완료: ${successCount}/${updates.length}개`, 'success');
    } catch (error) {
      failedCount += batchUpdates.length;
      log(`  배치 커밋 실패: ${error.message}`, 'error');
    }
  }
  
  return { successCount, failedCount };
}

// ============================================================
// 단일 필드 컬렉션 마이그레이션
// ============================================================

/**
 * 단일 필드 매핑 컬렉션 처리
 */
async function migrateSingleFieldCollection(config) {
  log(`\n${'='.repeat(60)}`, 'start');
  log(`${config.description} (${config.name}) 마이그레이션 시작`, 'start');
  log(`${config.sourceField} → ${config.targetField}`);
  log('='.repeat(60));
  
  const stats = {
    total: 0,
    needsUpdate: 0,
    alreadyUpdated: 0,
    missingSource: 0,
    success: 0,
    failed: 0
  };
  
  try {
    // 전체 문서 조회
    log(`문서 조회 중...`);
    const snapshot = await db.collection(config.name).get();
    stats.total = snapshot.size;
    log(`총 ${stats.total.toLocaleString()}개 문서 발견`);
    
    if (stats.total === 0) {
      log(`컬렉션이 비어있습니다.`, 'warning');
      return stats;
    }
    
    // 업데이트 필요한 문서 수집
    const updates = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const sourceValue = data[config.sourceField];
      const targetValue = data[config.targetField];
      
      // Case 1: targetField가 이미 있고 값이 같음 → 최신 상태
      if (targetValue && targetValue === sourceValue) {
        stats.alreadyUpdated++;
        return;
      }
      
      // Case 2: sourceField가 없음 → 업데이트 불가
      if (!sourceValue) {
        stats.missingSource++;
        if (stats.missingSource <= 3) {
          log(`  ⚠️  문서 ${doc.id}: ${config.sourceField} 필드 없음`, 'warning');
        }
        return;
      }
      
      // Case 3: targetField가 없거나 값이 다름 → 업데이트 필요
      stats.needsUpdate++;
      updates.push({
        ref: doc.ref,
        data: {
          [config.targetField]: sourceValue,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          migrationVersion: 'v1.1-userId'
        }
      });
      
      // 처음 5개만 로그 출력
      if (stats.needsUpdate <= 5) {
        log(`  📝 문서 ${doc.id}: ${config.sourceField}="${sourceValue}" → ${config.targetField}="${sourceValue}"`);
      }
    });
    
    // 중간 통계 출력
    log(`\n분석 완료:`);
    log(`  업데이트 필요: ${stats.needsUpdate.toLocaleString()}개`);
    log(`  이미 최신: ${stats.alreadyUpdated.toLocaleString()}개`);
    log(`  소스 필드 없음: ${stats.missingSource.toLocaleString()}개`);
    
    if (updates.length === 0) {
      log(`업데이트할 문서가 없습니다.`, 'info');
      return stats;
    }
    
    // Dry-run 모드 알림
    if (DRY_RUN) {
      log(`\n⚠️  DRY-RUN 모드: 실제 변경하지 않습니다`, 'warning');
    } else {
      log(`\n실제 업데이트 시작...`, 'start');
    }
    
    // 배치 업데이트 실행
    const { successCount, failedCount } = await updateInBatches(updates);
    stats.success = successCount;
    stats.failed = failedCount;
    
    log(`\n${config.description} 마이그레이션 완료`, 'end');
    printStats(stats);
    
  } catch (error) {
    log(`마이그레이션 실패: ${error.message}`, 'error');
    console.error(error);
    stats.failed = stats.total;
  }
  
  return stats;
}

// ============================================================
// shift_requests 다중 필드 마이그레이션
// ============================================================

/**
 * shift_requests 컬렉션 처리 (다중 필드)
 */
async function migrateShiftRequests() {
  log(`\n${'='.repeat(60)}`, 'start');
  log(`${SHIFT_REQUESTS_CONFIG.description} (${SHIFT_REQUESTS_CONFIG.name}) 마이그레이션 시작`, 'start');
  SHIFT_REQUESTS_CONFIG.mappings.forEach(m => {
    log(`  ${m.source} → ${m.target} (${m.description})`);
  });
  log('='.repeat(60));
  
  const stats = {
    total: 0,
    needsUpdate: 0,
    alreadyUpdated: 0,
    missingSource: 0,
    success: 0,
    failed: 0
  };
  
  try {
    // 전체 문서 조회
    log(`문서 조회 중...`);
    const snapshot = await db.collection(SHIFT_REQUESTS_CONFIG.name).get();
    stats.total = snapshot.size;
    log(`총 ${stats.total.toLocaleString()}개 문서 발견`);
    
    if (stats.total === 0) {
      log(`컬렉션이 비어있습니다.`, 'warning');
      return stats;
    }
    
    // 업데이트 필요한 문서 수집
    const updates = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const updateData = {};
      let needsUpdate = false;
      let allFieldsUpToDate = true;
      
      // 각 매핑에 대해 처리
      SHIFT_REQUESTS_CONFIG.mappings.forEach(mapping => {
        const sourceValue = data[mapping.source];
        const targetValue = data[mapping.target];
        
        // targetField가 이미 있고 값이 같으면 스킵
        if (targetValue && targetValue === sourceValue) {
          return;
        }
        
        // sourceField가 있으면 업데이트 대상
        if (sourceValue) {
          updateData[mapping.target] = sourceValue;
          needsUpdate = true;
          allFieldsUpToDate = false;
        }
      });
      
      if (allFieldsUpToDate) {
        stats.alreadyUpdated++;
        return;
      }
      
      if (!needsUpdate) {
        stats.missingSource++;
        if (stats.missingSource <= 3) {
          log(`  ⚠️  문서 ${doc.id}: 소스 필드 모두 없음`, 'warning');
        }
        return;
      }
      
      stats.needsUpdate++;
      updates.push({
        ref: doc.ref,
        data: {
          ...updateData,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          migrationVersion: 'v1.1-userId'
        }
      });
      
      // 처음 5개만 로그 출력
      if (stats.needsUpdate <= 5) {
        const updateDesc = Object.entries(updateData)
          .map(([key, value]) => `${key}="${value}"`)
          .join(', ');
        log(`  📝 문서 ${doc.id}: ${updateDesc}`);
      }
    });
    
    // 중간 통계 출력
    log(`\n분석 완료:`);
    log(`  업데이트 필요: ${stats.needsUpdate.toLocaleString()}개`);
    log(`  이미 최신: ${stats.alreadyUpdated.toLocaleString()}개`);
    log(`  소스 필드 없음: ${stats.missingSource.toLocaleString()}개`);
    
    if (updates.length === 0) {
      log(`업데이트할 문서가 없습니다.`, 'info');
      return stats;
    }
    
    // Dry-run 모드 알림
    if (DRY_RUN) {
      log(`\n⚠️  DRY-RUN 모드: 실제 변경하지 않습니다`, 'warning');
    } else {
      log(`\n실제 업데이트 시작...`, 'start');
    }
    
    // 배치 업데이트 실행
    const { successCount, failedCount } = await updateInBatches(updates);
    stats.success = successCount;
    stats.failed = failedCount;
    
    log(`\n${SHIFT_REQUESTS_CONFIG.description} 마이그레이션 완료`, 'end');
    printStats(stats);
    
  } catch (error) {
    log(`마이그레이션 실패: ${error.message}`, 'error');
    console.error(error);
    stats.failed = stats.total;
  }
  
  return stats;
}

// ============================================================
// 메인 실행
// ============================================================

async function main() {
  log('='.repeat(60), 'start');
  log('필드명 표준화 마이그레이션 스크립트 시작', 'start');
  log('='.repeat(60));
  log(`실행 모드: ${DRY_RUN ? 'DRY-RUN (테스트)' : 'PRODUCTION (실제 변경)'}`, DRY_RUN ? 'warning' : 'info');
  log(`배치 크기: ${BATCH_SIZE}개`);
  log(`처리 대상: ${COLLECTIONS.length + 1}개 컬렉션`);
  log('');
  
  const startTime = Date.now();
  const allStats = {
    total: 0,
    needsUpdate: 0,
    alreadyUpdated: 0,
    missingSource: 0,
    success: 0,
    failed: 0
  };
  
  try {
    // 1. 단일 필드 컬렉션 처리
    for (const config of COLLECTIONS) {
      const stats = await migrateSingleFieldCollection(config);
      
      // 전체 통계에 합산
      allStats.total += stats.total;
      allStats.needsUpdate += stats.needsUpdate;
      allStats.alreadyUpdated += stats.alreadyUpdated;
      allStats.missingSource += stats.missingSource;
      allStats.success += stats.success;
      allStats.failed += stats.failed;
      
      // 컬렉션 간 간격
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 2. shift_requests 처리
    const shiftStats = await migrateShiftRequests();
    allStats.total += shiftStats.total;
    allStats.needsUpdate += shiftStats.needsUpdate;
    allStats.alreadyUpdated += shiftStats.alreadyUpdated;
    allStats.missingSource += shiftStats.missingSource;
    allStats.success += shiftStats.success;
    allStats.failed += shiftStats.failed;
    
    // 최종 통계
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log('\n' + '='.repeat(60), 'end');
    log('🎉 전체 마이그레이션 완료!', 'end');
    log('='.repeat(60));
    printStats(allStats);
    log(`⏱️  총 소요 시간: ${duration}초`);
    log('='.repeat(60) + '\n');
    
    if (DRY_RUN) {
      log('⚠️  DRY-RUN 모드였습니다. 실제 변경은 이루어지지 않았습니다.', 'warning');
      log('실제 실행하려면 DRY_RUN = false로 설정하고 다시 실행하세요.');
    } else {
      log('✅ 프로덕션 마이그레이션 완료!', 'success');
      log('변경사항이 Firestore에 반영되었습니다.');
    }
    
  } catch (error) {
    log('마이그레이션 실패:', 'error');
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

// 스크립트 실행
if (require.main === module) {
  main().catch(error => {
    console.error('치명적 오류:', error);
    process.exit(1);
  });
}

module.exports = { main };
