// ===================================================================
// Firebase 설정 및 초기화
// ===================================================================

/**
 * 🔥 Firebase 프로젝트 설정
 * 
 * Firebase Console에서 프로젝트 생성 후, 아래 값을 실제 값으로 교체하세요.
 * 
 * 설정 방법:
 * 1. https://console.firebase.google.com/ 접속
 * 2. 프로젝트 선택 → 프로젝트 설정
 * 3. "내 앱" 섹션에서 웹 앱 선택
 * 4. SDK 설정 및 구성에서 firebaseConfig 복사
 */

const firebaseConfig = {
  apiKey: "AIzaSyCr3Tq2T7oy5rVlK1c33m_G0TlUWv0-g3k",
  authDomain: "abcdc-staff-system.firebaseapp.com",
  projectId: "abcdc-staff-system",
  storageBucket: "abcdc-staff-system.firebasestorage.app",
  messagingSenderId: "442207878284",
  appId: "1:442207878284:web:49b157573851b124d28fa9",
  measurementId: "G-WYPQ3YEJRT"
};

// ===================================================================
// Firebase 초기화
// ===================================================================

let app;
let auth;
let db;
let storage;

try {
  // Firebase 앱 초기화
  app = firebase.initializeApp(firebaseConfig);
  
  // Firebase 서비스 초기화
  auth = firebase.auth();
  db = firebase.firestore();
  // storage = firebase.storage(); // Storage SDK 미사용
  
  console.log('✅ Firebase 초기화 성공');
  
  // Firestore 설정
  db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
  });
  
  // 오프라인 지속성 활성화
  db.enablePersistence()
    .then(() => {
      console.log('✅ Firestore 오프라인 지속성 활성화');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ 여러 탭이 열려있어 오프라인 지속성을 활성화할 수 없습니다.');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ 브라우저가 오프라인 지속성을 지원하지 않습니다.');
      }
    });
  
} catch (error) {
  console.error('❌ Firebase 초기화 실패:', error);
  console.error('📝 firebaseConfig를 확인하세요. FIREBASE_SETUP.md를 참고하세요.');
}

// ===================================================================
// 인증 상태 관찰자
// ===================================================================

/**
 * 현재 로그인된 사용자 정보
 * @type {firebase.User | null}
 */
let currentFirebaseUser = null;

// 인증 상태 변경 감지
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentFirebaseUser = user;
    console.log('✅ 사용자 로그인 상태:', user.email);
    
    // Firestore에서 사용자 상세 정보 가져오기
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        console.log('✅ 사용자 권한:', userData.role);
        
        // 세션 스토리지에 저장
        sessionStorage.setItem('firebaseUser', JSON.stringify({
          uid: user.uid,
          email: user.email,
          ...userData
        }));
      }
    } catch (error) {
      console.error('❌ 사용자 정보 조회 실패:', error);
    }
  } else {
    currentFirebaseUser = null;
    sessionStorage.removeItem('firebaseUser');
    console.log('ℹ️ 로그아웃 상태');
  }
});

// ===================================================================
// 헬퍼 함수
// ===================================================================

/**
 * 현재 로그인한 사용자 정보 가져오기
 * @returns {Object|null} 사용자 정보 또는 null
 */
function getCurrentUser() {
  const userJson = sessionStorage.getItem('firebaseUser');
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * 사용자 권한 확인
 * @param {string[]} allowedRoles - 허용된 권한 목록
 * @returns {boolean} 권한 여부
 */
function checkUserRole(allowedRoles) {
  const user = getCurrentUser();
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/**
 * 관리자 권한 확인
 * @returns {boolean} 관리자 여부
 */
function isAdmin() {
  return checkUserRole(['admin', 'store_manager', 'manager']);
}

/**
 * 로그아웃
 */
async function signOut() {
  try {
    await auth.signOut();
    sessionStorage.clear();
    console.log('✅ 로그아웃 성공');
    window.location.href = 'index.html';
  } catch (error) {
    console.error('❌ 로그아웃 실패:', error);
    alert('로그아웃 중 오류가 발생했습니다.');
  }
}

// ===================================================================
// Firestore 타임스탬프 헬퍼
// ===================================================================

/**
 * 현재 시간을 Firestore Timestamp로 반환
 * @returns {firebase.firestore.Timestamp}
 */
function now() {
  return firebase.firestore.Timestamp.now();
}

/**
 * Date 객체를 Firestore Timestamp로 변환
 * @param {Date} date 
 * @returns {firebase.firestore.Timestamp}
 */
function toTimestamp(date) {
  return firebase.firestore.Timestamp.fromDate(date);
}

/**
 * Firestore Timestamp를 Date 객체로 변환
 * @param {firebase.firestore.Timestamp} timestamp 
 * @returns {Date}
 */
function fromTimestamp(timestamp) {
  return timestamp.toDate();
}

// ===================================================================
// 개발 모드 확인
// ===================================================================

const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

if (isDevelopment) {
  console.log('🔧 개발 모드: Firebase Emulator를 사용하려면 아래 주석을 해제하세요.');
  // Firebase Emulator 연결 (로컬 개발 시)
  // auth.useEmulator('http://localhost:9099');
  // db.useEmulator('localhost', 8080);
  // storage.useEmulator('localhost', 9199);
}

// ===================================================================
// 내보내기 (다른 파일에서 사용)
// ===================================================================

// Firebase 인스턴스를 전역으로 노출
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDB = db;
window.firebaseStorage = storage;

// 헬퍼 함수 노출
window.getCurrentUser = getCurrentUser;
window.checkUserRole = checkUserRole;
window.isAdmin = isAdmin;
window.signOut = signOut;
window.now = now;
window.toTimestamp = toTimestamp;
window.fromTimestamp = fromTimestamp;
