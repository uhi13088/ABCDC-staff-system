#!/usr/bin/env node

/**
 * 멀티테넌트 쿼리 감사 스크립트
 * 
 * 목적: 모든 Firestore 쿼리에서 companyId 또는 storeId 필터 확인
 * 사용: node scripts/audit-multitenant-queries.js
 */

const fs = require('fs');
const path = require('path');

// 감사 대상 컬렉션 (멀티테넌트 필터 필요)
const COLLECTIONS_NEED_FILTER = {
  // companyId 필터 필요
  'users': 'companyId',
  'approvals': 'companyId',
  'shift_requests': 'companyId',
  'notices': 'companyId',
  'stores': 'companyId',  // stores는 companyId 기준
  
  // storeId 필터 필요 (하지만 선택적 - 매장 선택 UI 통해 간접 격리)
  // contracts, attendance, salaries, schedules는 매장 기준이지만
  // UI에서 매장 선택을 강제하면 자동으로 격리됨
  'attendance': 'storeId',
  'salaries': 'storeId',
  'schedules': 'storeId'
};

// 예외 케이스 (필터 없어도 되는 경우)
const EXCEPTIONS = [
  'companies',  // 최상위 컬렉션
  'company_invites',  // 초대 코드
  '\\.doc\\(',  // 개별 문서 읽기 (collection().doc())
  'where\\(.*uid.*==',  // uid 기준 조회 (본인 데이터)
  'where\\(.*employeeId.*==',  // employeeId 기준 조회
  'firebase\\.auth\\(',  // Firebase Auth 관련
];

// 감사 결과
const results = {
  total: 0,
  safe: 0,
  unsafe: 0,
  details: []
};

/**
 * 파일에서 Firestore 쿼리 찾기
 */
function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // collection() 호출 찾기
    const collectionMatch = line.match(/\.collection\(['"]([^'"]+)['"]\)/);
    if (!collectionMatch) return;
    
    const collectionName = collectionMatch[1];
    const requiredFilter = COLLECTIONS_NEED_FILTER[collectionName];
    
    // 감사 대상이 아니면 스킵
    if (!requiredFilter) return;
    
    results.total++;
    
    // 다음 10줄 내에서 필터 확인 (조건문 포함)
    const nextLines = lines.slice(index, index + 10).join('\n');
    
    // 필터 존재 여부 확인
    const hasFilter = nextLines.includes(`.where('${requiredFilter}'`) ||
                      nextLines.includes(`.where("${requiredFilter}"`) ||
                      nextLines.includes(`where('${requiredFilter}',`) ||
                      nextLines.includes(`where("${requiredFilter}",`);
    
    // 예외 케이스 확인
    const isException = EXCEPTIONS.some(pattern => {
      return new RegExp(pattern).test(line) || new RegExp(pattern).test(nextLines);
    });
    
    // 마이그레이션 스크립트 제외
    if (filePath.includes('add-companyid') || filePath.includes('migrate')) {
      return;
    }
    
    if (hasFilter || isException) {
      results.safe++;
    } else {
      results.unsafe++;
      results.details.push({
        file: filePath.replace(process.cwd() + '/', ''),
        line: lineNum,
        collection: collectionName,
        required: requiredFilter,
        code: line.trim()
      });
    }
  });
}

/**
 * 디렉토리 재귀 탐색
 */
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    // 제외 디렉토리
    if (stat.isDirectory()) {
      if (['node_modules', '.git', 'functions/node_modules'].includes(file)) {
        return;
      }
      scanDirectory(fullPath);
    }
    
    // HTML, JS 파일만
    if (stat.isFile() && (file.endsWith('.html') || file.endsWith('.js'))) {
      auditFile(fullPath);
    }
  });
}

// 실행
console.log('🔍 멀티테넌트 쿼리 감사 시작...\n');

const projectRoot = path.resolve(__dirname, '..');
scanDirectory(projectRoot);

// 결과 출력
console.log('📊 감사 결과:');
console.log(`   총 쿼리: ${results.total}개`);
console.log(`   안전: ${results.safe}개 ✅`);
console.log(`   위험: ${results.unsafe}개 ❌\n`);

if (results.unsafe > 0) {
  console.log('⚠️  필터 누락 쿼리 목록:\n');
  
  results.details.forEach((detail, index) => {
    console.log(`${index + 1}. ${detail.file}:${detail.line}`);
    console.log(`   컬렉션: ${detail.collection}`);
    console.log(`   필요 필터: ${detail.required}`);
    console.log(`   코드: ${detail.code}`);
    console.log('');
  });
  
  console.log(`\n⚠️  총 ${results.unsafe}개의 쿼리를 수정해야 합니다!`);
  process.exit(1);
} else {
  console.log('✅ 모든 쿼리가 멀티테넌트 필터를 사용합니다!');
  process.exit(0);
}
