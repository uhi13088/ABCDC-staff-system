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

/**
 * 인증 상태 확인 및 초기화
 */
function checkAuthStatus() {
  const savedAuth = sessionStorage.getItem('admin_authenticated');
  if (savedAuth === 'true') {
    isAuthenticated = true;
    showMainScreen();
  } else {
    // 인증되지 않은 경우 로그인 페이지로 리다이렉트
    alert('⚠️ 로그인이 필요합니다.');
    window.location.href = 'admin-login.html';
  }
}

/**
 * 로그아웃 처리
 */
async function logout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    try {
      await auth.signOut();
      sessionStorage.removeItem('admin_authenticated');
      isAuthenticated = false;
      alert('✅ 로그아웃되었습니다.');
      window.location.href = 'admin-login.html';
    } catch (error) {
      console.error('로그아웃 실패:', error);
      alert('❌ 로그아웃 실패: ' + error.message);
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
