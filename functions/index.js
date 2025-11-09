/**
 * Firebase Cloud Functions
 * 맛남살롱 관리 시스템
 * 
 * 기능: Firestore users 컬렉션 삭제 시 Firebase Authentication 계정도 자동 삭제
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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
 * 대량 정리 함수 (HTTP 트리거)
 * 
 * 사용법: 
 * curl -X POST https://us-central1-abcdc-staff-system.cloudfunctions.net/cleanupOrphanedAuth
 * 
 * 기능: Firestore에 없는 Authentication 계정을 모두 삭제
 */
exports.cleanupOrphanedAuth = functions.https.onRequest(async (req, res) => {
  console.log('🧹 Authentication 정리 시작');
  
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
 * 2년 지난 퇴사자 문서 자동 삭제 (매일 실행)
 * 
 * Cloud Scheduler 설정 필요:
 * - 스케줄: 0 3 * * * (매일 새벽 3시)
 * - URL: https://us-central1-abcdc-staff-system.cloudfunctions.net/cleanupOldResignedUsers
 */
exports.cleanupOldResignedUsers = functions.https.onRequest(async (req, res) => {
  console.log('🧹 2년 지난 퇴사자 정리 시작');
  
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
    
    // 배치 삭제
    const batch = admin.firestore().batch();
    const deletedUsers = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      batch.delete(doc.ref);
      deletedUsers.push({
        uid: doc.id,
        name: userData.name,
        email: userData.email,
        resignedAt: userData.resignedAt?.toDate()
      });
      console.log(`📋 삭제 예정: ${userData.name} (${userData.email}) - 퇴사일: ${userData.resignedAt?.toDate()}`);
    });
    
    // 일괄 삭제 실행
    await batch.commit();
    
    console.log(`✅ ${deletedUsers.length}명의 퇴사자 문서 삭제 완료`);
    
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
 * 자동 결근 기록 생성 (매일 자정 1분 실행)
 * 
 * Cloud Scheduler 설정:
 * - 스케줄: 1 0 * * * (매일 자정 1분, Asia/Seoul)
 * - 타임존: Asia/Seoul
 * - URL: https://us-central1-abcdc-staff-system.cloudfunctions.net/createAbsentRecords
 * 
 * 기능:
 * 1. 어제 날짜 기준으로 모든 계약서 조회
 * 2. 어제 출근일이었는데 attendance 기록이 없는 경우
 * 3. 자동으로 status: 'absent' 결근 기록 생성
 */
exports.createAbsentRecords = functions.https.onRequest(async (req, res) => {
  console.log('🔄 자동 결근 기록 생성 시작');
  
  try {
    const db = admin.firestore();
    
    // 어제 날짜 계산 (KST 기준)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // 어제의 요일 계산 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    const yesterdayDayOfWeek = yesterday.getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const yesterdayDayName = dayNames[yesterdayDayOfWeek];
    
    console.log(`📅 대상 날짜: ${yesterdayStr} (${yesterdayDayName}요일)`);
    
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
    
    // 3. attendance 기록 확인 및 결근 기록 생성
    const createdRecords = [];
    const batch = db.batch();
    
    for (const worker of workersYesterday) {
      // 해당 직원의 어제 attendance 기록 확인
      const attendanceQuery = await db.collection('attendance')
        .where('uid', '==', worker.employeeId)
        .where('date', '==', yesterdayStr)
        .get();
      
      // attendance 기록이 없으면 결근 기록 생성
      if (attendanceQuery.empty) {
        const newAbsentRef = db.collection('attendance').doc();
        
        const absentRecord = {
          uid: worker.employeeId,
          name: worker.employeeName,
          store: worker.workStore,
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
        
        createdRecords.push({
          id: newAbsentRef.id,
          name: worker.employeeName,
          store: worker.workStore,
          date: yesterdayStr
        });
        
        console.log(`➕ 결근 기록 생성: ${worker.employeeName} (${worker.workStore}) - ${yesterdayStr}`);
      } else {
        console.log(`✓ 출근 기록 존재: ${worker.employeeName} (${worker.workStore})`);
      }
    }
    
    // 4. 배치 커밋
    if (createdRecords.length > 0) {
      await batch.commit();
      console.log(`✅ ${createdRecords.length}명의 결근 기록 생성 완료`);
    } else {
      console.log(`✓ 생성할 결근 기록 없음 (모두 출근 기록 존재)`);
    }
    
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
 * 수동 결근 기록 생성 테스트 (특정 날짜)
 * 
 * 사용법:
 * curl -X POST https://us-central1-abcdc-staff-system.cloudfunctions.net/createAbsentRecordsForDate \
 *   -H "Content-Type: application/json" \
 *   -d '{"date":"2025-11-08"}'
 * 
 * 기능: 특정 날짜에 대한 결근 기록을 수동으로 생성 (테스트/보정용)
 */
exports.createAbsentRecordsForDate = functions.https.onRequest(async (req, res) => {
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
  
  console.log(`🔄 수동 결근 기록 생성 시작 (날짜: ${targetDate})`);
  
  try {
    const db = admin.firestore();
    
    // 지정된 날짜의 Date 객체 생성
    const targetDateObj = new Date(targetDate + 'T00:00:00+09:00');
    const targetDayOfWeek = targetDateObj.getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const targetDayName = dayNames[targetDayOfWeek];
    
    console.log(`📅 대상 날짜: ${targetDate} (${targetDayName}요일)`);
    
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
    
    // 3. attendance 기록 확인 및 결근 기록 생성
    const createdRecords = [];
    const existingRecords = [];
    const batch = db.batch();
    
    for (const worker of workersOnDate) {
      // 해당 직원의 attendance 기록 확인
      const attendanceQuery = await db.collection('attendance')
        .where('uid', '==', worker.employeeId)
        .where('date', '==', targetDate)
        .get();
      
      // attendance 기록이 없으면 결근 기록 생성
      if (attendanceQuery.empty) {
        const newAbsentRef = db.collection('attendance').doc();
        
        const absentRecord = {
          uid: worker.employeeId,
          name: worker.employeeName,
          store: worker.workStore,
          date: targetDate,
          status: 'absent',
          clockIn: null,
          clockOut: null,
          workType: '계약',
          autoCreated: true,
          manuallyCreated: true, // 수동 생성 표시
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        batch.set(newAbsentRef, absentRecord);
        
        createdRecords.push({
          id: newAbsentRef.id,
          name: worker.employeeName,
          store: worker.workStore,
          date: targetDate
        });
        
        console.log(`➕ 결근 기록 생성: ${worker.employeeName} (${worker.workStore}) - ${targetDate}`);
      } else {
        existingRecords.push({
          name: worker.employeeName,
          store: worker.workStore
        });
        console.log(`✓ 출근 기록 존재: ${worker.employeeName} (${worker.workStore})`);
      }
    }
    
    // 4. 배치 커밋
    if (createdRecords.length > 0) {
      await batch.commit();
      console.log(`✅ ${createdRecords.length}명의 결근 기록 생성 완료`);
    } else {
      console.log(`✓ 생성할 결근 기록 없음`);
    }
    
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
