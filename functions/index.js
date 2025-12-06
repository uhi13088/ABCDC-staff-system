/**
 * Firebase Cloud Functions
 * 맛남살롱 관리 시스템 - v3.7 보안 강화
 * 
 * 기능: 
 * - Firestore users 컬렉션 삭제 시 Firebase Authentication 계정도 자동 삭제
 * - HTTP 트리거 보안 강화 (비밀 키 헤더 검증)
 * 
 * v3.7 변경사항:
 * - HTTP 트리거 함수에 Authorization 헤더 검증 추가
 * - 무단 접근 방지 (401 Unauthorized)
 * - Cloud Scheduler 전용 비밀 키 사용
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ===================================================================
// 🔒 보안: HTTP 트리거 인증 미들웨어
// ===================================================================

/**
 * 비밀 키: Firebase Functions 환경 변수에 저장 필요
 * 
 * 설정 방법:
 * firebase functions:config:set functions.secret_key="YOUR_SECRET_KEY_HERE"
 * 
 * 로컬 테스트:
 * .runtimeconfig.json 파일 생성:
 * {
 *   "functions": {
 *     "secret_key": "YOUR_SECRET_KEY_HERE"
 *   }
 * }
 */
const SECRET_KEY = functions.config().functions?.secret_key || 'DEVELOPMENT_KEY_PLEASE_CHANGE';

/**
 * HTTP 요청 인증 검증
 * 
 * @param {Object} req - Express 요청 객체
 * @returns {Object} - { authorized: boolean, error?: string }
 */
function verifyAuthorization(req) {
  const authHeader = req.headers.authorization;
  
  // Authorization 헤더 존재 확인
  if (!authHeader) {
    return {
      authorized: false,
      error: 'Missing Authorization header'
    };
  }
  
  // Bearer 토큰 형식 검증
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      authorized: false,
      error: 'Invalid Authorization format. Use: Bearer YOUR_SECRET_KEY'
    };
  }
  
  const providedKey = parts[1];
  
  // 비밀 키 일치 확인
  if (providedKey !== SECRET_KEY) {
    return {
      authorized: false,
      error: 'Invalid secret key'
    };
  }
  
  return { authorized: true };
}

/**
 * 인증 실패 응답 반환
 * 
 * @param {Object} res - Express 응답 객체
 * @param {string} error - 에러 메시지
 * @param {string} functionName - 함수 이름
 */
function respondUnauthorized(res, error, functionName) {
  console.error(`🚫 인증 실패: ${functionName}`);
  console.error(`   사유: ${error}`);
  console.error(`   IP: ${res.req.ip || 'Unknown'}`);
  console.error(`   User-Agent: ${res.req.headers['user-agent'] || 'Unknown'}`);
  
  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Invalid or missing authorization credentials',
    code: 'AUTH_FAILED'
  });
}

/**
 * users 컬렉션에서 문서 삭제 시 Firebase Authentication 계정도 함께 삭제
 * 
 * 트리거: Firestore users/{userId} 문서 삭제
 * 작동: 해당 UID의 Firebase Authentication 계정 삭제
 */
exports.deleteAuthOnUserDelete = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snap, context) => {
    const userId = context.params.userId;
    const userData = snap.data();
    
    console.log(`🔄 Authentication 삭제 트리거 시작`);
    console.log(`   사용자: ${userData.name || 'Unknown'} (${userData.email || 'Unknown'})`);
    console.log(`   UID: ${userId}`);
    
    try {
      // Firebase Authentication에서 사용자 삭제
      await admin.auth().deleteUser(userId);
      
      console.log(`✅ Authentication 계정 삭제 완료`);
      console.log(`   이메일: ${userData.email}`);
      console.log(`   이름: ${userData.name}`);
      console.log(`   UID: ${userId}`);
      
      return {
        success: true,
        uid: userId,
        email: userData.email,
        message: 'Authentication 계정이 성공적으로 삭제되었습니다.'
      };
      
    } catch (error) {
      console.error(`❌ Authentication 계정 삭제 실패`);
      console.error(`   오류 코드: ${error.code}`);
      console.error(`   오류 메시지: ${error.message}`);
      console.error(`   UID: ${userId}`);
      
      // 계정이 이미 삭제되었거나 없는 경우 오류 무시
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️ Authentication 계정이 이미 삭제되었거나 존재하지 않습니다.`);
        return {
          success: true,
          uid: userId,
          message: 'Authentication 계정이 이미 삭제되었거나 존재하지 않습니다.'
        };
      }
      
      // 그 외 오류는 로그만 남기고 계속 진행
      console.error(`⚠️ 오류가 발생했지만 Firestore 삭제는 완료되었습니다.`);
      return {
        success: false,
        uid: userId,
        error: error.message
      };
    }
  });

/**
 * 대량 정리 함수 (HTTP 트리거) - v3.7 보안 강화
 * 
 * 🔒 인증 필수: Authorization 헤더에 비밀 키 필요
 * 
 * 사용법: 
 * curl -X POST https://us-central1-abcdc-staff-system.cloudfunctions.net/cleanupOrphanedAuth \
 *   -H "Authorization: Bearer YOUR_SECRET_KEY"
 * 
 * 기능: Firestore에 없는 Authentication 계정을 모두 삭제
 */
exports.cleanupOrphanedAuth = functions.https.onRequest(async (req, res) => {
  console.log('🧹 Authentication 정리 요청 수신');
  
  // 🔒 인증 검증
  const authResult = verifyAuthorization(req);
  if (!authResult.authorized) {
    return respondUnauthorized(res, authResult.error, 'cleanupOrphanedAuth');
  }
  
  console.log('✅ 인증 성공 - Authentication 정리 시작');
  
  try {
    // 1. Firestore users 컬렉션에서 모든 UID 가져오기
    const usersSnapshot = await admin.firestore().collection('users').get();
    const validUIDs = new Set();
    
    usersSnapshot.forEach(doc => {
      validUIDs.add(doc.id);
    });
    
    console.log(`✅ Firestore에 등록된 사용자: ${validUIDs.size}명`);
    
    // 2. Firebase Authentication 사용자 목록 가져오기
    const listUsersResult = await admin.auth().listUsers();
    const allAuthUsers = listUsersResult.users;
    
    console.log(`📊 Firebase Authentication 총 계정: ${allAuthUsers.length}개`);
    
    // 3. Firestore에 없는 계정 찾기
    const orphanedUsers = allAuthUsers.filter(user => !validUIDs.has(user.uid));
    
    console.log(`🗑️ 정리 대상 계정: ${orphanedUsers.length}개`);
    
    if (orphanedUsers.length === 0) {
      return res.status(200).json({
        success: true,
        message: '정리가 필요한 계정이 없습니다.',
        validUsers: validUIDs.size,
        totalAuthUsers: allAuthUsers.length,
        deletedCount: 0
      });
    }
    
    // 4. 정리 대상 계정 삭제
    const deletePromises = orphanedUsers.map(user => 
      admin.auth().deleteUser(user.uid)
        .then(() => {
          console.log(`✅ 삭제 완료: ${user.email} (${user.uid})`);
          return { success: true, email: user.email, uid: user.uid };
        })
        .catch(error => {
          console.error(`❌ 삭제 실패: ${user.email} (${user.uid}) - ${error.message}`);
          return { success: false, email: user.email, uid: user.uid, error: error.message };
        })
    );
    
    const results = await Promise.all(deletePromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`✅ 정리 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
    
    return res.status(200).json({
      success: true,
      message: 'Authentication 정리가 완료되었습니다.',
      validUsers: validUIDs.size,
      totalAuthUsers: allAuthUsers.length,
      orphanedUsers: orphanedUsers.length,
      deletedCount: successCount,
      failedCount: failCount,
      results: results
    });
    
  } catch (error) {
    console.error('❌ 정리 실패:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * users 컬렉션의 status가 resigned로 변경되면 Authentication 계정 삭제
 * 
 * 트리거: Firestore users/{userId} 문서 업데이트
 * 작동: status가 resigned로 변경되면 Firebase Authentication 계정 삭제
 */
exports.deleteAuthOnResign = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;
    
    // status가 resigned로 변경되었을 때만 실행
    if (before.status !== 'resigned' && after.status === 'resigned') {
      console.log(`🔄 퇴사 처리 감지`);
      console.log(`   사용자: ${after.name || 'Unknown'} (${after.email || 'Unknown'})`);
      console.log(`   UID: ${userId}`);
      
      try {
        // Firebase Authentication에서 사용자 삭제
        await admin.auth().deleteUser(userId);
        
        console.log(`✅ Authentication 계정 삭제 완료 (퇴사 처리)`);
        console.log(`   이메일: ${after.email}`);
        console.log(`   이름: ${after.name}`);
        
        // Firestore에 퇴사 일시 기록 (2년 후 자동 삭제용)
        await change.after.ref.update({
          resignedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ 퇴사 일시 기록 완료`);
        
        return {
          success: true,
          uid: userId,
          message: 'Authentication 계정이 삭제되고 퇴사 일시가 기록되었습니다.'
        };
        
      } catch (error) {
        console.error(`❌ Authentication 계정 삭제 실패`);
        console.error(`   오류: ${error.message}`);
        
        // 계정이 이미 삭제된 경우 무시
        if (error.code === 'auth/user-not-found') {
          console.log(`⚠️ Authentication 계정이 이미 삭제되었습니다.`);
          
          // 퇴사 일시만 기록
          await change.after.ref.update({
            resignedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          return {
            success: true,
            uid: userId,
            message: 'Authentication 계정이 이미 삭제되었습니다. 퇴사 일시만 기록했습니다.'
          };
        }
        
        throw error;
      }
    }
    
    return null;
  });

/**
 * 2년 지난 퇴사자 문서 자동 삭제 (매일 실행) - v3.7 보안 강화
 * 
 * 🔒 인증 필수: Authorization 헤더에 비밀 키 필요
 * 
 * Cloud Scheduler 설정 필요:
 * - 스케줄: 0 3 * * * (매일 새벽 3시, Asia/Seoul)
 * - URL: https://us-central1-abcdc-staff-system.cloudfunctions.net/cleanupOldResignedUsers
 * - HTTP 헤더: Authorization: Bearer YOUR_SECRET_KEY
 */
exports.cleanupOldResignedUsers = functions.https.onRequest(async (req, res) => {
  console.log('🧹 2년 지난 퇴사자 정리 요청 수신');
  
  // 🔒 인증 검증
  const authResult = verifyAuthorization(req);
  if (!authResult.authorized) {
    return respondUnauthorized(res, authResult.error, 'cleanupOldResignedUsers');
  }
  
  console.log('✅ 인증 성공 - 2년 지난 퇴사자 정리 시작');
  
  try {
    // 2년 전 날짜 계산
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    console.log(`📅 기준 날짜: ${twoYearsAgo.toISOString()}`);
    
    // 2년 지난 퇴사자 찾기
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('status', '==', 'resigned')
      .where('resignedAt', '<=', admin.firestore.Timestamp.fromDate(twoYearsAgo))
      .get();
    
    console.log(`🗑️ 삭제 대상: ${usersSnapshot.size}명`);
    
    if (usersSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: '삭제할 퇴사자가 없습니다.',
        deletedCount: 0
      });
    }
    
    // 삭제 대상 사용자 목록 수집
    const usersToDelete = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      usersToDelete.push({
        ref: doc.ref,
        uid: doc.id,
        name: userData.name,
        email: userData.email,
        resignedAt: userData.resignedAt?.toDate()
      });
      console.log(`📋 삭제 예정: ${userData.name} (${userData.email}) - 퇴사일: ${userData.resignedAt?.toDate()}`);
    });
    
    // 🔥 Firestore Batch 500개 제한 대응: 청크 단위로 분할 처리
    const BATCH_SIZE = 500;
    const chunks = [];
    
    for (let i = 0; i < usersToDelete.length; i += BATCH_SIZE) {
      chunks.push(usersToDelete.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 ${usersToDelete.length}명을 ${chunks.length}개 청크로 분할 (청크당 최대 ${BATCH_SIZE}개)`);
    
    // 각 청크별로 배치 삭제 (병렬 처리)
    await Promise.all(
      chunks.map(async (chunk, chunkIndex) => {
        const batch = admin.firestore().batch();
        
        chunk.forEach((user) => {
          batch.delete(user.ref);
        });
        
        await batch.commit();
        console.log(`✅ 청크 ${chunkIndex + 1}/${chunks.length} 삭제 완료: ${chunk.length}개`);
      })
    );
    
    console.log(`✅ 전체 퇴사자 문서 삭제 완료: ${usersToDelete.length}명`);
    
    // 삭제된 사용자 목록 (ref 제외)
    const deletedUsers = usersToDelete.map(({ uid, name, email, resignedAt }) => ({
      uid,
      name,
      email,
      resignedAt
    }));
    
    return res.status(200).json({
      success: true,
      message: `${deletedUsers.length}명의 2년 지난 퇴사자가 삭제되었습니다.`,
      deletedCount: deletedUsers.length,
      deletedUsers: deletedUsers
    });
    
  } catch (error) {
    console.error('❌ 퇴사자 정리 실패:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 자동 결근 기록 생성 (매일 자정 1분 실행) - v3.7 보안 강화
 * 
 * 🔒 인증 필수: Authorization 헤더에 비밀 키 필요
 * 
 * Cloud Scheduler 설정:
 * - 스케줄: 1 0 * * * (매일 자정 1분, Asia/Seoul)
 * - 타임존: Asia/Seoul
 * - URL: https://us-central1-abcdc-staff-system.cloudfunctions.net/createAbsentRecords
 * - HTTP 헤더: Authorization: Bearer YOUR_SECRET_KEY
 * 
 * 기능:
 * 1. 어제 날짜 기준으로 모든 계약서 조회
 * 2. 어제 출근일이었는데 attendance 기록이 없는 경우
 * 3. 자동으로 status: 'absent' 결근 기록 생성
 */
exports.createAbsentRecords = functions.https.onRequest(async (req, res) => {
  console.log('🔄 자동 결근 기록 생성 요청 수신');
  
  // 🔒 인증 검증
  const authResult = verifyAuthorization(req);
  if (!authResult.authorized) {
    return respondUnauthorized(res, authResult.error, 'createAbsentRecords');
  }
  
  console.log('✅ 인증 성공 - 자동 결근 기록 생성 시작');
  
  try {
    const db = admin.firestore();
    
    // 🇰🇷 한국 시간(KST) 기준으로 어제 날짜 계산
    const now = new Date();
    const kstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    
    // 어제 날짜 계산 (KST 기준)
    const yesterday = new Date(kstNow);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // YYYY-MM-DD 형식으로 변환 (KST 기준)
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    const yesterdayStr = `${year}-${month}-${day}`;
    
    // 어제의 요일 계산 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    const yesterdayDayOfWeek = yesterday.getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const yesterdayDayName = dayNames[yesterdayDayOfWeek];
    
    console.log(`📅 대상 날짜 (KST 기준): ${yesterdayStr} (${yesterdayDayName}요일)`);
    console.log(`   현재 KST 시간: ${kstNow.toISOString()}`);
    
    // 1. 모든 활성 계약서 조회
    const contractsSnapshot = await db.collection('contracts')
      .where('status', '==', 'active')
      .get();
    
    console.log(`📋 활성 계약서: ${contractsSnapshot.size}개`);
    
    if (contractsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: '활성 계약서가 없습니다.',
        date: yesterdayStr,
        createdCount: 0
      });
    }
    
    // 2. 어제 출근일이었던 직원 필터링
    const workersYesterday = [];
    
    contractsSnapshot.forEach(doc => {
      const contract = doc.data();
      
      // workDays 배열에 어제 요일이 포함되어 있는지 체크
      // workDays: ['월', '화', '수', '목', '금'] 형식
      if (contract.workDays && contract.workDays.includes(yesterdayDayName)) {
        workersYesterday.push({
          contractId: doc.id,
          ...contract
        });
      }
    });
    
    console.log(`👥 어제 출근 예정이었던 직원: ${workersYesterday.length}명`);
    
    if (workersYesterday.length === 0) {
      return res.status(200).json({
        success: true,
        message: '어제 출근 예정이었던 직원이 없습니다.',
        date: yesterdayStr,
        dayOfWeek: yesterdayDayName,
        createdCount: 0
      });
    }
    
    // 3. attendance 기록 확인 및 결근 기록 생성 (병렬 처리)
    // 🔥 Promise.all로 병렬 처리 (N+1 문제 해결)
    const attendanceChecks = await Promise.all(
      workersYesterday.map(async (worker) => {
        // 해당 직원의 어제 attendance 기록 확인
        let attendanceQuery = db.collection('attendance')
          .where('uid', '==', worker.employeeId)
          .where('date', '==', yesterdayStr);
        
        // companyId 필터 추가 (멀티테넌트)
        if (worker.companyId) {
          attendanceQuery = attendanceQuery.where('companyId', '==', worker.companyId);
        }
        
        const attendanceSnapshot = await attendanceQuery.get();
        
        return {
          worker,
          hasAttendance: !attendanceSnapshot.empty
        };
      })
    );
    
    // 결근 대상자만 필터링
    const absentWorkers = attendanceChecks
      .filter(({ hasAttendance }) => !hasAttendance)
      .map(({ worker }) => worker);
    
    console.log(`📊 출근 기록 확인 완료: ${attendanceChecks.length}명 중 ${absentWorkers.length}명 결근`);
    
    if (absentWorkers.length === 0) {
      console.log(`✓ 생성할 결근 기록 없음 (모두 출근 기록 존재)`);
      return res.status(200).json({
        success: true,
        message: '생성할 결근 기록이 없습니다.',
        date: yesterdayStr,
        dayOfWeek: yesterdayDayName,
        totalWorkers: workersYesterday.length,
        createdCount: 0,
        createdRecords: []
      });
    }
    
    // 4. 🔥 Firestore Batch 500개 제한 대응: 청크 단위로 분할 처리
    const BATCH_SIZE = 500;
    const chunks = [];
    
    for (let i = 0; i < absentWorkers.length; i += BATCH_SIZE) {
      chunks.push(absentWorkers.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 ${absentWorkers.length}명을 ${chunks.length}개 청크로 분할 (청크당 최대 ${BATCH_SIZE}개)`);
    
    // 5. 각 청크별로 배치 처리 (병렬)
    const chunkResults = await Promise.all(
      chunks.map(async (chunk, chunkIndex) => {
        const batch = db.batch();
        const chunkRecords = [];
        
        chunk.forEach((worker) => {
          const newAbsentRef = db.collection('attendance').doc();
          
          // 🔥 멀티테넌트: companyId + storeId 기준으로 관리
          const absentRecord = {
            companyId: worker.companyId || null,  // 회사 ID
            storeId: worker.storeId || null,      // 매장 ID
            userId: worker.employeeId,            // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
            uid: worker.employeeId,               // 하위 호환성 (기존 코드 지원)
            name: worker.employeeName,
            store: worker.workStore,  // 호환성: 매장명 문자열
            date: yesterdayStr,
            status: 'absent',
            clockIn: null,
            clockOut: null,
            workType: '계약',
            autoCreated: true, // 자동 생성 표시
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          batch.set(newAbsentRef, absentRecord);
          
          chunkRecords.push({
            id: newAbsentRef.id,
            name: worker.employeeName,
            store: worker.workStore,
            date: yesterdayStr
          });
        });
        
        // 청크별 커밋
        await batch.commit();
        console.log(`✅ 청크 ${chunkIndex + 1}/${chunks.length} 커밋 완료: ${chunkRecords.length}개`);
        
        return chunkRecords;
      })
    );
    
    // 6. 모든 청크 결과 합산
    const createdRecords = chunkResults.flat();
    console.log(`✅ 전체 결근 기록 생성 완료: ${createdRecords.length}명`);
    
    return res.status(200).json({
      success: true,
      message: `${createdRecords.length}명의 결근 기록이 생성되었습니다.`,
      date: yesterdayStr,
      dayOfWeek: yesterdayDayName,
      totalWorkers: workersYesterday.length,
      createdCount: createdRecords.length,
      createdRecords: createdRecords
    });
    
  } catch (error) {
    console.error('❌ 자동 결근 기록 생성 실패:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * 수동 결근 기록 생성 테스트 (특정 날짜) - v3.7 보안 강화 + v3.2 성능 최적화
 * 
 * 🔒 인증 필수: Authorization 헤더에 비밀 키 필요
 * 
 * 사용법:
 * curl -X POST https://us-central1-abcdc-staff-system.cloudfunctions.net/createAbsentRecordsForDate \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer YOUR_SECRET_KEY" \
 *   -d '{"date":"2025-11-08"}'
 * 
 * 기능: 특정 날짜에 대한 결근 기록을 수동으로 생성 (테스트/보정용)
 * 
 * v3.7 보안:
 * - Authorization 헤더 검증 추가
 * - 무단 접근 방지
 * 
 * v3.2 최적화:
 * - N+1 쿼리 문제 해결 (순차 루프 → 병렬 처리)
 * - Promise.all 패턴으로 1,000+ 직원 처리 시 타임아웃 방지
 * - 기존 기능 유지 (companyId 필터, 배치 처리, 로깅)
 */
exports.createAbsentRecordsForDate = functions.https.onRequest(async (req, res) => {
  console.log('🔄 수동 결근 기록 생성 요청 수신');
  
  // 🔒 인증 검증
  const authResult = verifyAuthorization(req);
  if (!authResult.authorized) {
    return respondUnauthorized(res, authResult.error, 'createAbsentRecordsForDate');
  }
  
  console.log('✅ 인증 성공 - 수동 결근 기록 생성 진행');
  
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.'
    });
  }
  
  const targetDate = req.body.date;
  
  if (!targetDate) {
    return res.status(400).json({
      success: false,
      error: '날짜를 지정해주세요. 예: {"date":"2025-11-08"}'
    });
  }
  
  // 날짜 형식 검증 (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return res.status(400).json({
      success: false,
      error: '날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식으로 입력해주세요.'
    });
  }
  
  try {
    const db = admin.firestore();
    
    // 🇰🇷 한국 시간(KST) 기준으로 지정된 날짜의 Date 객체 생성
    // targetDate 형식: YYYY-MM-DD
    const [year, month, day] = targetDate.split('-').map(Number);
    
    // KST 자정(00:00:00)으로 Date 객체 생성
    const targetDateObj = new Date(year, month - 1, day);
    
    // 요일 계산 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    const targetDayOfWeek = targetDateObj.getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const targetDayName = dayNames[targetDayOfWeek];
    
    console.log(`📅 대상 날짜 (KST 기준): ${targetDate} (${targetDayName}요일)`);
    
    // 1. 모든 활성 계약서 조회
    const contractsSnapshot = await db.collection('contracts')
      .where('status', '==', 'active')
      .get();
    
    console.log(`📋 활성 계약서: ${contractsSnapshot.size}개`);
    
    if (contractsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: '활성 계약서가 없습니다.',
        date: targetDate,
        createdCount: 0
      });
    }
    
    // 2. 지정 날짜에 출근일이었던 직원 필터링
    const workersOnDate = [];
    
    contractsSnapshot.forEach(doc => {
      const contract = doc.data();
      
      if (contract.workDays && contract.workDays.includes(targetDayName)) {
        workersOnDate.push({
          contractId: doc.id,
          ...contract
        });
      }
    });
    
    console.log(`👥 ${targetDate} 출근 예정이었던 직원: ${workersOnDate.length}명`);
    
    if (workersOnDate.length === 0) {
      return res.status(200).json({
        success: true,
        message: `${targetDate}에 출근 예정이었던 직원이 없습니다.`,
        date: targetDate,
        dayOfWeek: targetDayName,
        createdCount: 0
      });
    }
    
    // 3. attendance 기록 확인 및 결근 기록 생성 (v3.2 성능 최적화 - N+1 문제 해결)
    // 🔥 최적화: 모든 직원의 출석 여부를 병렬로 확인
    const attendanceChecks = await Promise.all(
      workersOnDate.map(async (worker) => {
        // 해당 직원의 attendance 기록 확인
        let attendanceQuery = db.collection('attendance')
          .where('uid', '==', worker.employeeId)
          .where('date', '==', targetDate);
        
        // companyId 필터 추가 (멀티테넌트 데이터 격리)
        if (worker.companyId) {
          attendanceQuery = attendanceQuery.where('companyId', '==', worker.companyId);
        }
        
        const attendanceSnapshot = await attendanceQuery.get();
        
        return {
          worker,
          hasAttendance: !attendanceSnapshot.empty
        };
      })
    );
    
    // 결근 대상자만 필터링
    const absentWorkers = attendanceChecks
      .filter(({ hasAttendance }) => !hasAttendance)
      .map(({ worker }) => worker);
    
    // 출근 기록이 있는 직원
    const existingRecords = attendanceChecks
      .filter(({ hasAttendance }) => hasAttendance)
      .map(({ worker }) => ({
        name: worker.employeeName,
        store: worker.workStore
      }));
    
    console.log(`📊 출근 기록 확인 완료: ${attendanceChecks.length}명 중 ${absentWorkers.length}명 결근`);
    
    if (absentWorkers.length === 0) {
      console.log(`✓ 생성할 결근 기록 없음`);
      return res.status(200).json({
        success: true,
        message: '생성할 결근 기록이 없습니다.',
        date: targetDate,
        dayOfWeek: targetDayName,
        totalWorkers: workersOnDate.length,
        createdCount: 0,
        existingCount: existingRecords.length,
        createdRecords: [],
        existingRecords: existingRecords
      });
    }
    
    // 4. 🔥 Firestore Batch 500개 제한 대응: 청크 단위로 분할 처리
    const BATCH_SIZE = 500;
    const chunks = [];
    
    for (let i = 0; i < absentWorkers.length; i += BATCH_SIZE) {
      chunks.push(absentWorkers.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 ${absentWorkers.length}명을 ${chunks.length}개 청크로 분할 (청크당 최대 ${BATCH_SIZE}개)`);
    
    // 5. 각 청크별로 배치 처리 (병렬)
    const chunkResults = await Promise.all(
      chunks.map(async (chunk, chunkIndex) => {
        const batch = db.batch();
        const chunkRecords = [];
        
        chunk.forEach((worker) => {
          const newAbsentRef = db.collection('attendance').doc();
          
          // 🔥 멀티테넌트: companyId + storeId 기준으로 관리
          const absentRecord = {
            companyId: worker.companyId || null,  // 회사 ID
            storeId: worker.storeId || null,      // 매장 ID
            userId: worker.employeeId,            // 🔥 표준 필드 (FIELD_NAMING_STANDARD.md)
            uid: worker.employeeId,               // 하위 호환성 (기존 코드 지원)
            name: worker.employeeName,
            store: worker.workStore,              // 호환성
            date: targetDate,
            status: 'absent',
            clockIn: null,
            clockOut: null,
            workType: '계약',
            autoCreated: true,
            manuallyCreated: true, // 수동 트리거 표시
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          batch.set(newAbsentRef, absentRecord);
          
          chunkRecords.push({
            id: newAbsentRef.id,
            name: worker.employeeName,
            store: worker.workStore,
            date: targetDate
          });
        });
        
        // 청크별 커밋
        await batch.commit();
        console.log(`✅ 청크 ${chunkIndex + 1}/${chunks.length} 커밋 완료: ${chunkRecords.length}개`);
        
        return chunkRecords;
      })
    );
    
    // 6. 모든 청크 결과 합산
    const createdRecords = chunkResults.flat();
    console.log(`✅ 전체 결근 기록 생성 완료: ${createdRecords.length}명`);
    
    return res.status(200).json({
      success: true,
      message: `${createdRecords.length}명의 결근 기록이 생성되었습니다.`,
      date: targetDate,
      dayOfWeek: targetDayName,
      totalWorkers: workersOnDate.length,
      createdCount: createdRecords.length,
      existingCount: existingRecords.length,
      createdRecords: createdRecords,
      existingRecords: existingRecords
    });
    
  } catch (error) {
    console.error('❌ 수동 결근 기록 생성 실패:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// ===================================================================
// ⭐ v3.1: 멀티테넌트 초대 코드 시스템
// ===================================================================

/**
 * 초대 코드 검증 (v3.1)
 * 호출: employee-register.html
 * 
 * 기능:
 * - 초대 코드 유효성 확인
 * - 회사 및 매장 정보 반환 (1:1 매칭)
 * - 사용 횟수 확인
 */
exports.verifyInviteCode = functions.https.onCall(async (data, context) => {
  const { inviteCode } = data;
  
  console.log(`🔍 초대 코드 검증 시작: ${inviteCode}`);
  
  // 입력 검증
  if (!inviteCode || typeof inviteCode !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', '초대 코드를 입력하세요.');
  }
  
  try {
    const db = admin.firestore();
    
    // 초대 코드 문서 조회 (code 필드로 검색)
    const inviteSnapshot = await db.collection('company_invites')
      .where('code', '==', inviteCode)
      .limit(1)
      .get();
    
    if (inviteSnapshot.empty) {
      throw new functions.https.HttpsError('not-found', '유효하지 않은 초대 코드입니다.');
    }
    
    const inviteDoc = inviteSnapshot.docs[0];
    const inviteData = inviteDoc.data();
    
    console.log(`✅ 초대 코드 문서 찾음: ${inviteDoc.id}`);
    
    // 상태 확인
    if (inviteData.status !== 'active') {
      throw new functions.https.HttpsError('failed-precondition', '사용할 수 없는 초대 코드입니다.');
    }
    
    // 사용 횟수 확인
    if (inviteData.usedCount >= inviteData.maxUses) {
      throw new functions.https.HttpsError('resource-exhausted', '초대 코드 사용 횟수를 초과했습니다.');
    }
    
    // 만료일 확인
    if (inviteData.expiresAt && inviteData.expiresAt.toDate() < new Date()) {
      throw new functions.https.HttpsError('deadline-exceeded', '만료된 초대 코드입니다.');
    }
    
    // 회사 정보 조회
    const companyDoc = await db.collection('companies')
      .doc(inviteData.companyId)
      .get();
    
    if (!companyDoc.exists) {
      throw new functions.https.HttpsError('not-found', '회사 정보를 찾을 수 없습니다.');
    }
    
    // ⭐ v3.1: 매장 정보 조회 (1개만)
    const storeDoc = await db.collection('stores')
      .doc(inviteData.storeId)
      .get();
    
    if (!storeDoc.exists) {
      throw new functions.https.HttpsError('not-found', '매장 정보를 찾을 수 없습니다.');
    }
    
    const storeData = storeDoc.data();
    
    console.log(`✅ 검증 성공: ${inviteData.companyId} / ${storeData.name}`);
    
    // ⭐ v3.1: 단순화된 응답
    return {
      ok: true,
      companyId: inviteData.companyId,
      companyName: companyDoc.data().name,
      storeId: inviteData.storeId,
      storeName: storeData.name,
      role: inviteData.role || 'staff'
    };
    
  } catch (error) {
    console.error('❌ 초대 코드 검증 실패:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', '초대 코드 검증 중 오류가 발생했습니다.');
  }
});

/**
 * 초대 코드 사용 기록
 * 호출: employee-register.html (가입 완료 후)
 * 
 * 기능:
 * - 초대 코드 사용 횟수 증가
 * - 가입 성공 후 호출
 */
exports.recordInviteUse = functions.https.onCall(async (data, context) => {
  const { inviteCode, userId } = data;
  
  console.log(`📝 초대 코드 사용 기록: ${inviteCode} / ${userId}`);
  
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  
  // 본인 UID인지 확인
  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError('permission-denied', '본인의 가입만 기록할 수 있습니다.');
  }
  
  try {
    const db = admin.firestore();
    
    // 초대 코드 문서 조회
    const inviteSnapshot = await db.collection('company_invites')
      .where('code', '==', inviteCode)
      .limit(1)
      .get();
    
    if (inviteSnapshot.empty) {
      throw new functions.https.HttpsError('not-found', '초대 코드를 찾을 수 없습니다.');
    }
    
    const inviteDoc = inviteSnapshot.docs[0];
    
    // 사용 횟수 증가
    await inviteDoc.ref.update({
      usedCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ 초대 코드 사용 기록 완료`);
    
    return { ok: true };
  } catch (error) {
    console.error('❌ 초대 코드 사용 기록 실패:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', '초대 코드 사용 기록 실패');
  }
});

/**
 * ⭐ v3.1: 초대 코드 생성 (1:1 매칭 + 초대 링크)
 * 호출: admin-dashboard.html (관리자 페이지)
 * 
 * 기능:
 * - 초대 코드 생성 (회사 + 매장 + 역할 고정)
 * - 초대 링크 자동 생성
 * - 클립보드 복사용 URL 반환
 */
exports.createInviteCode = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '인증이 필요합니다.');
  }
  
  console.log(`🎫 초대 코드 생성 요청: ${context.auth.uid}`);
  
  try {
    const db = admin.firestore();
    
    // 🔒 사용자 권한 확인 (admin 또는 store_manager)
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', '사용자 정보를 찾을 수 없습니다.');
    }
    
    const userData = userDoc.data();
    const userRole = userData.role;
    const userCompanyId = userData.companyId;
    const userStoreId = userData.storeId;
    
    // ✅ v3.2: super_admin, admin 또는 store_manager만 초대 코드 생성 가능
    if (!['super_admin', 'admin', 'store_manager'].includes(userRole)) {
      throw new functions.https.HttpsError('permission-denied', '관리자 또는 점장 권한이 필요합니다.');
    }
    
    // ⭐ v3.1: 단순화된 파라미터
    const { 
      companyId, 
      storeId,
      storeName,
      role,
      maxUses, 
      expiresAt 
    } = data;
    
    // 필수 파라미터 검증
    if (!companyId || !storeId || !role) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'companyId, storeId, role은 필수입니다.'
      );
    }
    
    // 🔒 회사 일치 확인 (모든 역할 포함)
    if (userCompanyId !== companyId) {
      throw new functions.https.HttpsError('permission-denied', '다른 회사의 초대 코드는 생성할 수 없습니다.');
    }
    
    // 🔒 store_manager는 자기 매장만 초대 코드 생성 가능
    if (userRole === 'store_manager' && userStoreId !== storeId) {
      throw new functions.https.HttpsError('permission-denied', '점장은 자신의 매장에만 초대 코드를 생성할 수 있습니다.');
    }
    
    // 초대 코드 생성 (회사명 약어 + 연도 + 역할 + 랜덤)
    const prefix = companyId.replace('company_', '').toUpperCase();
    const year = new Date().getFullYear();
    const roleCode = role.toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    const code = `${prefix}${year}-${roleCode}-${random}`;
    
    // ⭐ v3.1: 초대 링크 생성
    // TODO: 실제 도메인으로 변경 필요
    const baseUrl = 'https://abcdc-staff-system.web.app';
    const inviteUrl = `${baseUrl}/employee-register.html?code=${code}`;
    
    console.log(`🎫 생성된 초대 코드: ${code}`);
    
    // Firestore에 초대 코드 저장
    const inviteRef = db.collection('company_invites').doc();
    await inviteRef.set({
      code,
      companyId,
      storeId,
      storeName: storeName || '',
      role,
      inviteUrl,
      maxUses: maxUses || 50,
      usedCount: 0,
      status: 'active',
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ 초대 코드 저장 완료: ${inviteRef.id}`);
    
    return { 
      ok: true, 
      code,
      inviteUrl
    };
  } catch (error) {
    console.error('❌ 초대 코드 생성 실패:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', '초대 코드 생성 실패');
  }
});
