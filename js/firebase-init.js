/**
 * Firebase 초기화 모듈
 * Firebase 설정 및 인증 상태 관리
 */

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCr3Tq2T7oy5rVlK1c33m_G0TlUWv0-g3k",
  authDomain: "abcdc-staff-system.firebaseapp.com",
  projectId: "abcdc-staff-system",
  storageBucket: "abcdc-staff-system.firebasestorage.app",
  messagingSenderId: "442207878284",
  appId: "1:442207878284:web:49b157573851b124d28fa9",
  measurementId: "G-WYPQ3YEJRT"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firebase 서비스 인스턴스
const auth = firebase.auth();
const db = firebase.firestore();

// 전역 상태 변수
let isAuthenticated = false;
let currentTab = 'dashboard';
let isLoggingOut = false; // 🔥 로그아웃 플래그 추가

/**
 * 인증 상태 확인 및 초기화
 */
function checkAuthStatus() {
  // 🔥 Firebase Auth 상태 감지 (비동기 초기화 완료 후 실행)
  firebase.auth().onAuthStateChanged((user) => {
    console.log('🔍 Firebase Auth 상태 변경:', user ? user.uid : 'null');
    
    if (user) {
      // Firebase Auth에 사용자가 있음
      const savedAuth = sessionStorage.getItem('admin_authenticated');
      if (savedAuth === 'true') {
        isAuthenticated = true;
        console.log('✅ 인증 확인 완료, showMainScreen 호출');
        showMainScreen();
      } else {
        // sessionStorage에 없으면 로그아웃 처리
        console.warn('⚠️ sessionStorage에 인증 정보 없음');
        firebase.auth().signOut();
        window.location.href = 'admin-login.html';
      }
    } else {
      // Firebase Auth에 사용자가 없음
      console.log('❌ Firebase Auth 사용자 없음');
      sessionStorage.removeItem('admin_authenticated');
      
      // 🔥 의도적인 로그아웃이 아닐 때만 알림 표시
      if (!isLoggingOut) {
        alert('⚠️ 로그인이 필요합니다.');
      }
      window.location.href = 'admin-login.html';
    }
  });
}

/**
 * 로그아웃 처리
 */
async function logout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    try {
      // 🔥 로그아웃 플래그 설정 (onAuthStateChanged에서 알림 안 뜨도록)
      isLoggingOut = true;
      
      await auth.signOut();
      sessionStorage.removeItem('admin_authenticated');
      isAuthenticated = false;
      alert('✅ 로그아웃되었습니다.');
      window.location.href = 'admin-login.html';
    } catch (error) {
      console.error('로그아웃 실패:', error);
      alert('❌ 로그아웃 실패: ' + error.message);
      isLoggingOut = false; // 실패 시 플래그 리셋
    }
  }
}

/**
 * 페이지 로드 시 초기화
 */
document.addEventListener('DOMContentLoaded', function() {
  // 현재 월 설정
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthFilters = ['attendanceMonth', 'salaryMonth'];
  monthFilters.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.value = currentMonth;
  });
  
  // 인증 상태 확인
  checkAuthStatus();
});
