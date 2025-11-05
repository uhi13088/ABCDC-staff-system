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
