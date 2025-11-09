// Direct Migration Script using Firebase REST API
const https = require('https');

const config = {
  apiKey: "AIzaSyCr3Tq2T7oy5rVlK1c33m_G0TlUWv0-g3k",
  projectId: "abcdc-staff-system"
};

// Firestore REST API base URL
const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

// ISO 8601 주차 계산
function getMondayOfWeek(year, weekNum) {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4Day + 1);
  
  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
  
  return targetMonday;
}

// HTTP Request Helper
function httpsRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data && method !== 'GET') {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', reject);

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Firestore 데이터 가져오기
async function getCollection(collectionName) {
  const url = `${baseUrl}/${collectionName}?key=${config.apiKey}`;
  const response = await httpsRequest(url);
  
  if (!response.documents) {
    return [];
  }
  
  return response.documents.map(doc => {
    const docId = doc.name.split('/').pop();
    const fields = {};
    
    for (const [key, value] of Object.entries(doc.fields || {})) {
      if (value.stringValue !== undefined) fields[key] = value.stringValue;
      else if (value.integerValue !== undefined) fields[key] = parseInt(value.integerValue);
      else if (value.doubleValue !== undefined) fields[key] = parseFloat(value.doubleValue);
      else if (value.booleanValue !== undefined) fields[key] = value.booleanValue;
      else if (value.timestampValue !== undefined) fields[key] = value.timestampValue;
      else if (value.nullValue !== undefined) fields[key] = null;
      else if (value.mapValue !== undefined) {
        fields[key] = {};
        for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
          if (v.stringValue !== undefined) fields[key][k] = v.stringValue;
          else if (v.integerValue !== undefined) fields[key][k] = parseInt(v.integerValue);
          else if (v.doubleValue !== undefined) fields[key][k] = parseFloat(v.doubleValue);
          else if (v.booleanValue !== undefined) fields[key][k] = v.booleanValue;
        }
      }
    }
    
    return { id: docId, ...fields };
  });
}

// Firestore 데이터 쓰기
async function setDocument(collectionName, docId, data) {
  const url = `${baseUrl}/${collectionName}/${docId}?key=${config.apiKey}`;
  
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (value === null) {
      fields[key] = { nullValue: null };
    }
  }
  
  const docData = { fields };
  
  return await httpsRequest(url, 'PATCH', docData);
}

// Firestore 데이터 생성 (자동 ID)
async function addDocument(collectionName, data) {
  const url = `${baseUrl}/${collectionName}?key=${config.apiKey}`;
  
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (value === null) {
      fields[key] = { nullValue: null };
    }
  }
  
  const docData = { fields };
  
  return await httpsRequest(url, 'POST', docData);
}

// Firestore 데이터 삭제
async function deleteDocument(collectionName, docId) {
  const url = `${baseUrl}/${collectionName}/${docId}?key=${config.apiKey}`;
  return await httpsRequest(url, 'DELETE');
}

// 메인 마이그레이션
async function runMigration() {
  try {
    console.log('========================================');
    console.log('🚀 Schedules Collection 마이그레이션 시작');
    console.log('========================================\n');
    
    // 1단계: 기존 데이터 가져오기
    console.log('📥 기존 schedules 데이터 로드 중...');
    const schedules = await getCollection('schedules');
    console.log(`✅ ${schedules.length}개 주차별 문서 로드 완료\n`);
    
    if (schedules.length === 0) {
      console.log('⚠️ 마이그레이션할 데이터가 없습니다.');
      return;
    }
    
    // 구조 확인
    const firstDoc = schedules[0];
    console.log(`샘플 문서 ID: ${firstDoc.id}`);
    
    // 날짜 기반 구조인지 확인
    if (firstDoc.date && firstDoc.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.log('✅ 이미 날짜별 구조입니다. 마이그레이션 불필요!');
      return;
    }
    
    // 2단계: 백업
    console.log('\n========================================');
    console.log('1단계: 데이터 백업');
    console.log('========================================\n');
    
    let backupCount = 0;
    for (const doc of schedules) {
      await setDocument('schedules_backup', doc.id, doc);
      backupCount++;
      if (backupCount % 10 === 0) {
        console.log(`진행 중: ${backupCount}/${schedules.length} 백업 완료`);
      }
    }
    console.log(`✅ 백업 완료: ${backupCount}개 문서\n`);
    
    // 3단계: 변환
    console.log('========================================');
    console.log('2단계: 주차별 → 일별 문서 변환');
    console.log('========================================\n');
    
    const newSchedules = [];
    let totalWorkDays = 0;
    
    for (const doc of schedules) {
      const docId = doc.id;
      
      // userId_year-week 파싱
      const match = docId.match(/^(.+)_(\d{4})-(\d{2})$/);
      if (!match) {
        console.log(`⚠️ 문서 ID 형식 불일치, 건너뜀: ${docId}`);
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
        const dayData = doc[day];
        
        if (!dayData || !dayData.isWorkDay) {
          continue;
        }
        
        // 해당 요일의 날짜 계산
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // 새 일별 문서 데이터
        const newSchedule = {
          userId: userId,
          store: doc.store || '',
          date: dateStr,
          startTime: dayData.startTime || '',
          endTime: dayData.endTime || '',
          hours: dayData.hours || 0,
          isShiftReplacement: dayData.isShiftReplacement || false,
          shiftRequestId: dayData.shiftRequestId || null,
          originalRequesterId: dayData.originalRequesterId || null,
          originalRequesterName: dayData.originalRequesterName || null
        };
        
        newSchedules.push(newSchedule);
        totalWorkDays++;
      }
    }
    
    console.log(`✅ 변환 완료: ${totalWorkDays}개 근무일 → ${newSchedules.length}개 일별 문서\n`);
    
    // 4단계: 검증
    console.log('========================================');
    console.log('3단계: 데이터 검증');
    console.log('========================================\n');
    
    let originalWorkDays = 0;
    for (const doc of schedules) {
      const days = ['월', '화', '수', '목', '금', '토', '일'];
      for (const day of days) {
        if (doc[day] && doc[day].isWorkDay) {
          originalWorkDays++;
        }
      }
    }
    
    console.log(`원본 근무일 수: ${originalWorkDays}개`);
    console.log(`변환 문서 수: ${newSchedules.length}개`);
    
    if (originalWorkDays !== newSchedules.length) {
      console.log('❌ 검증 실패: 데이터 개수 불일치');
      console.log(`차이: ${Math.abs(originalWorkDays - newSchedules.length)}개`);
      return;
    }
    
    console.log('✅ 검증 성공: 데이터 개수 일치\n');
    
    // 5단계: schedules_new에 저장
    console.log('========================================');
    console.log('4단계: schedules_new 컬렉션에 저장');
    console.log('========================================\n');
    
    let savedCount = 0;
    for (const schedule of newSchedules) {
      await addDocument('schedules_new', schedule);
      savedCount++;
      if (savedCount % 50 === 0) {
        console.log(`진행 중: ${savedCount}/${newSchedules.length} 저장 완료`);
      }
    }
    console.log(`✅ schedules_new 저장 완료: ${savedCount}개 문서\n`);
    
    // 6단계: 컬렉션 전환
    console.log('========================================');
    console.log('5단계: 컬렉션 전환');
    console.log('========================================\n');
    
    console.log('⚠️ 5초 후 프로덕션 전환을 시작합니다...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // schedules → schedules_old
    console.log('\nschedules를 schedules_old로 이동 중...');
    let moveCount = 0;
    for (const doc of schedules) {
      await setDocument('schedules_old', doc.id, doc);
      await deleteDocument('schedules', doc.id);
      moveCount++;
      if (moveCount % 10 === 0) {
        console.log(`진행 중: ${moveCount}/${schedules.length} 이동 완료`);
      }
    }
    console.log(`✅ schedules → schedules_old 완료: ${moveCount}개\n`);
    
    // schedules_new → schedules
    console.log('schedules_new를 schedules로 이동 중...');
    const newDocs = await getCollection('schedules_new');
    moveCount = 0;
    for (const doc of newDocs) {
      // id 제외하고 복사
      const { id, ...data } = doc;
      await addDocument('schedules', data);
      await deleteDocument('schedules_new', id);
      moveCount++;
      if (moveCount % 50 === 0) {
        console.log(`진행 중: ${moveCount}/${newDocs.length} 이동 완료`);
      }
    }
    console.log(`✅ schedules_new → schedules 완료: ${moveCount}개\n`);
    
    // 완료
    console.log('========================================');
    console.log('✅ 마이그레이션 완료!');
    console.log('========================================\n');
    console.log('백업 컬렉션:');
    console.log('- schedules_backup: 원본 백업');
    console.log('- schedules_old: 이전 주차별 문서\n');
    console.log('관리자 페이지에서 스케줄 테이블을 확인하세요.');
    
  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error.message);
    console.error(error);
  }
}

// 실행
runMigration();
