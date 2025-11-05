# Firebase Cloud Functions 설정 가이드

## 🎯 목적
직원/관리자 삭제 시 Firebase Authentication 계정도 자동으로 삭제

## 📋 설정 방법

### 1. Firebase CLI 설치 및 로그인
```bash
npm install -g firebase-tools
firebase login
```

### 2. Functions 초기화
```bash
cd /home/user/webapp
firebase init functions
```

선택사항:
- Language: JavaScript
- ESLint: Yes
- Install dependencies: Yes

### 3. Cloud Function 코드 작성

**functions/index.js** 파일에 다음 코드 추가:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// users 컬렉션에서 문서 삭제 시 Authentication 계정도 삭제
exports.deleteAuthOnUserDelete = functions.firestore
  .document('users/{userId}')
  .onDelete(async (snap, context) => {
    const userId = context.params.userId;
    const userData = snap.data();
    
    try {
      // Firebase Authentication에서 사용자 삭제
      await admin.auth().deleteUser(userId);
      console.log(`✅ Authentication 계정 삭제 완료: ${userData.email} (${userId})`);
      return null;
    } catch (error) {
      console.error(`❌ Authentication 계정 삭제 실패: ${error.message}`);
      // 계정이 이미 삭제되었거나 없는 경우 무시
      if (error.code === 'auth/user-not-found') {
        console.log('⚠️ Authentication 계정이 이미 삭제되었거나 존재하지 않습니다.');
        return null;
      }
      throw error;
    }
  });

// employees 컬렉션 삭제는 users 컬렉션 삭제와 함께 처리되므로 별도 함수 불필요
```

### 4. Functions 배포
```bash
firebase deploy --only functions
```

### 5. 작동 확인
- 관리자 페이지에서 직원/관리자 삭제
- Firebase Console에서 Authentication 계정이 자동 삭제되었는지 확인

## 🔧 비용 안내
- Firebase Cloud Functions는 무료 할당량 제공
- 월 200만 호출, 400,000 GB초 무료
- 소규모 시스템에서는 무료 범위 내 사용 가능

## ✅ 설정 후 흐름

```
관리자 페이지에서 직원 삭제
    ↓
Firestore users 컬렉션에서 삭제
    ↓
Cloud Function 자동 트리거
    ↓
Firebase Authentication 계정 삭제
    ↓
✅ 완료!
```

## 📝 주의사항
1. Cloud Functions는 Node.js 16 이상 필요
2. Firebase Blaze 플랜 필요 (무료 할당량 있음)
3. 배포 후 1-2분 정도 활성화 시간 필요
