/**
 * 데이터베이스 정화 스크립트
 * 
 * ⚠️ 주의: 이 스크립트는 Firestore의 데이터를 직접 수정합니다.
 * 실행 전 반드시 백업을 수행하세요!
 * 
 * 수행 작업:
 * 1. 숫자 필드 정화 (NaN, 콤마 포함 문자열 → 숫자 또는 0)
 * 2. 날짜 필드 정화 (유효하지 않은 형식 → null)
 * 3. 레거시 필드명 → 표준 필드명 마이그레이션
 * 
 * 대상 컬렉션: salary, attendance, contracts, users
 * 
 * @version 1.0.0
 * @date 2025-12-31
 */

import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// ===========================================
// Firebase Admin SDK 초기화
// ===========================================

console.log('🔥 Firebase Admin SDK 초기화 중...\n');

// 서비스 계정 키 파일 경로 (환경변수 또는 기본 경로)
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  join(__dirname, '../service-account-key.json');

let serviceAccount: any;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  console.log('✅ 서비스 계정 키 로드 성공');
} catch (error) {
  console.error('❌ 서비스 계정 키 파일을 찾을 수 없습니다:', serviceAccountPath);
  console.error('환경변수 GOOGLE_APPLICATION_CREDENTIALS를 설정하거나');
  console.error('프로젝트 루트에 service-account-key.json 파일을 배치하세요.\n');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log('✅ Firestore 연결 성공\n');

// ===========================================
// 유틸리티 함수
// ===========================================

/**
 * 안전한 숫자 파싱 (콤마 제거, NaN 방지)
 */
function parseMoney(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }
  
  const strVal = String(value).replace(/,/g, '').trim();
  const num = parseFloat(strVal);
  return isNaN(num) ? 0 : num;
}

/**
 * 안전한 날짜 검증
 */
function isValidDate(value: any): boolean {
  if (!value) return false;
  
  // Firestore Timestamp 객체
  if (value && typeof value.toDate === 'function') {
    try {
      const date = value.toDate();
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }
  
  // Date 객체
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  
  // 문자열
  try {
    const date = new Date(value);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * 레거시 필드명 → 표준 필드명 매핑
 */
const FIELD_MAPPINGS = {
  // 급여 관련
  'wage': 'salaryAmount',
  'wageAmount': 'salaryAmount',
  'wageType': 'salaryType',
  'wageIncentive': 'wageIncentive', // 이건 표준
  
  // 출퇴근 관련
  'checkIn': 'clockIn',
  'checkOut': 'clockOut',
  
  // 사용자 관련
  'uid': 'userId',
  'employeeId': 'userId',
  
  // 매장 관련
  'store': 'storeName'
};

/**
 * 숫자 필드 패턴
 */
const NUMBER_FIELD_PATTERNS = [
  'amount', 'Amount',
  'pay', 'Pay',
  'wage', 'Wage',
  'salary', 'Salary',
  'hours', 'Hours',
  'pension', 'Pension',
  'insurance', 'Insurance',
  'tax', 'Tax',
  'deduction', 'Deduction',
  'allowance', 'Allowance'
];

/**
 * 날짜 필드 패턴
 */
const DATE_FIELD_PATTERNS = [
  'At', 'Date', 'date', 'createdAt', 'updatedAt', 
  'confirmedAt', 'paidAt', 'calculatedAt'
];

/**
 * 필드가 숫자 필드인지 확인
 */
function isNumberField(fieldName: string): boolean {
  return NUMBER_FIELD_PATTERNS.some(pattern => fieldName.includes(pattern));
}

/**
 * 필드가 날짜 필드인지 확인
 */
function isDateField(fieldName: string): boolean {
  return DATE_FIELD_PATTERNS.some(pattern => fieldName.includes(pattern));
}

// ===========================================
// 통계 객체
// ===========================================

interface Stats {
  totalDocs: number;
  cleanedNumbers: number;
  cleanedDates: number;
  migratedFields: number;
  errors: number;
}

const stats: Record<string, Stats> = {};

function initStats(collection: string) {
  stats[collection] = {
    totalDocs: 0,
    cleanedNumbers: 0,
    cleanedDates: 0,
    migratedFields: 0,
    errors: 0
  };
}

// ===========================================
// 데이터 정화 함수
// ===========================================

/**
 * 문서 데이터 정화
 */
function cleanDocument(data: any, collectionName: string): { cleaned: any; hasChanges: boolean } {
  const cleaned: any = {};
  let hasChanges = false;
  
  for (const [key, value] of Object.entries(data)) {
    let cleanedValue = value;
    
    // 1️⃣ 숫자 필드 정화
    if (isNumberField(key)) {
      const parsed = parseMoney(value);
      if (parsed !== value) {
        cleanedValue = parsed;
        hasChanges = true;
        stats[collectionName].cleanedNumbers++;
        console.log(`  📊 [${key}] ${JSON.stringify(value)} → ${parsed}`);
      }
    }
    
    // 2️⃣ 날짜 필드 정화
    else if (isDateField(key)) {
      if (!isValidDate(value)) {
        cleanedValue = null;
        hasChanges = true;
        stats[collectionName].cleanedDates++;
        console.log(`  📅 [${key}] Invalid date → null`);
      }
    }
    
    // 3️⃣ 레거시 필드명 감지
    if (FIELD_MAPPINGS[key as keyof typeof FIELD_MAPPINGS]) {
      const standardField = FIELD_MAPPINGS[key as keyof typeof FIELD_MAPPINGS];
      // 표준 필드에 값이 없으면 레거시 값 복사
      if (!cleaned[standardField] && cleanedValue !== null && cleanedValue !== undefined) {
        cleaned[standardField] = cleanedValue;
        hasChanges = true;
        stats[collectionName].migratedFields++;
        console.log(`  🔄 [${key}] → [${standardField}] 마이그레이션`);
      }
      // 레거시 필드는 삭제 (표시만, 실제 삭제는 하지 않음)
      continue;
    }
    
    cleaned[key] = cleanedValue;
  }
  
  return { cleaned, hasChanges };
}

/**
 * 컬렉션 정화
 */
async function cleanCollection(collectionName: string, dryRun: boolean = false) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 [${collectionName}] 컬렉션 정화 시작`);
  console.log(`${'='.repeat(60)}\n`);
  
  initStats(collectionName);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    stats[collectionName].totalDocs = snapshot.size;
    
    console.log(`📊 총 ${snapshot.size}개 문서 발견\n`);
    
    if (snapshot.empty) {
      console.log('⚠️ 문서가 없습니다.\n');
      return;
    }
    
    let processedCount = 0;
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const { cleaned, hasChanges } = cleanDocument(data, collectionName);
        
        if (hasChanges) {
          console.log(`📝 [${doc.id}] 변경사항 감지`);
          
          if (!dryRun) {
            batch.update(doc.ref, cleaned);
            batchCount++;
            
            // 배치 크기 초과 시 커밋
            if (batchCount >= batchSize) {
              await batch.commit();
              console.log(`✅ 배치 커밋 완료 (${batchCount}개 문서)\n`);
              batch = db.batch();
              batchCount = 0;
            }
          } else {
            console.log(`  [DRY RUN] 실제 업데이트는 수행하지 않음\n`);
          }
        }
        
        processedCount++;
        if (processedCount % 100 === 0) {
          console.log(`⏳ 진행 중... ${processedCount}/${snapshot.size}`);
        }
        
      } catch (error) {
        console.error(`❌ 문서 처리 실패 [${doc.id}]:`, error);
        stats[collectionName].errors++;
      }
    }
    
    // 남은 배치 커밋
    if (batchCount > 0 && !dryRun) {
      await batch.commit();
      console.log(`✅ 마지막 배치 커밋 완료 (${batchCount}개 문서)\n`);
    }
    
    console.log(`\n✅ [${collectionName}] 정화 완료`);
    console.log(`📊 통계:`);
    console.log(`   - 총 문서: ${stats[collectionName].totalDocs}개`);
    console.log(`   - 숫자 정화: ${stats[collectionName].cleanedNumbers}개 필드`);
    console.log(`   - 날짜 정화: ${stats[collectionName].cleanedDates}개 필드`);
    console.log(`   - 필드 마이그레이션: ${stats[collectionName].migratedFields}개 필드`);
    console.log(`   - 오류: ${stats[collectionName].errors}개 문서\n`);
    
  } catch (error) {
    console.error(`❌ [${collectionName}] 컬렉션 정화 실패:`, error);
    throw error;
  }
}

// ===========================================
// 메인 실행 함수
// ===========================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const targetCollection = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║         🧹 Firestore 데이터 정화 스크립트 v1.0.0         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN 모드: 실제 업데이트는 수행하지 않습니다.\n');
  } else {
    console.log('⚠️  WARNING: 실제 데이터를 수정합니다!\n');
    console.log('계속하려면 10초 내에 아무 키나 누르세요...');
    console.log('취소하려면 Ctrl+C를 누르세요.\n');
    
    // 10초 대기
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⏰ 시간 초과. 스크립트를 종료합니다.');
        process.exit(0);
      }, 10000);
      
      process.stdin.once('data', () => {
        clearTimeout(timeout);
        console.log('✅ 확인되었습니다. 계속 진행합니다...\n');
        resolve();
      });
      process.stdin.setRawMode(true);
      process.stdin.resume();
    });
    
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
  
  const startTime = Date.now();
  
  // 대상 컬렉션 목록
  const collections = targetCollection 
    ? [targetCollection]
    : ['salary', 'attendance', 'contracts', 'users'];
  
  console.log(`🎯 대상 컬렉션: ${collections.join(', ')}\n`);
  
  try {
    for (const collection of collections) {
      await cleanCollection(collection, dryRun);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ 정화 완료!                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 전체 통계:');
    let totalDocs = 0;
    let totalCleanedNumbers = 0;
    let totalCleanedDates = 0;
    let totalMigratedFields = 0;
    let totalErrors = 0;
    
    for (const [collection, stat] of Object.entries(stats)) {
      totalDocs += stat.totalDocs;
      totalCleanedNumbers += stat.cleanedNumbers;
      totalCleanedDates += stat.cleanedDates;
      totalMigratedFields += stat.migratedFields;
      totalErrors += stat.errors;
    }
    
    console.log(`   - 총 문서: ${totalDocs}개`);
    console.log(`   - 숫자 정화: ${totalCleanedNumbers}개 필드`);
    console.log(`   - 날짜 정화: ${totalCleanedDates}개 필드`);
    console.log(`   - 필드 마이그레이션: ${totalMigratedFields}개 필드`);
    console.log(`   - 오류: ${totalErrors}개 문서`);
    console.log(`   - 소요 시간: ${duration}초\n`);
    
    if (dryRun) {
      console.log('💡 실제 업데이트를 수행하려면 --dry-run 플래그를 제거하고 다시 실행하세요.\n');
    }
    
  } catch (error) {
    console.error('\n❌ 정화 중 오류 발생:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// 실행
main().catch((error) => {
  console.error('❌ 치명적 오류:', error);
  process.exit(1);
});
