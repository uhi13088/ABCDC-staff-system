/**
 * Firestore Initial Data Seeding Script
 * 
 * Purpose: 빈 DB 상태에서 시스템을 빠르게 정상화하고 테스트
 * 
 * 생성 데이터:
 * - super_admin 계정 1개
 * - Company 1개 (ABC Dessert Center)
 * - Brand 1개 (맛남살롱)
 * - Store 1개 (맛남살롱 부천시청점)
 * - Employee 1개 (홍길동)
 * - Contract 1개 (시급 10,000원)
 * - Attendance 3개 (최근 3일치)
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ===========================================
// Firebase Admin SDK 초기화
// ===========================================

console.log('🔥 Firebase Admin SDK 초기화 중...\n');

const serviceAccountPath = path.join(__dirname, '..', 'service-account-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ 서비스 계정 키 파일을 찾을 수 없습니다:', serviceAccountPath);
  console.error('환경변수 GOOGLE_APPLICATION_CREDENTIALS를 설정하거나');
  console.error('프로젝트 루트에 service-account-key.json 파일을 배치하세요.\n');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath)
});

const db = admin.firestore();
const auth = admin.auth();

console.log('✅ 서비스 계정 키 로드 성공');
console.log('✅ Firestore 연결 성공\n');

// ===========================================
// 상수 정의
// ===========================================

// 환경 변수에서 민감 정보 로드
const SUPER_ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@example.com';
const SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD;
const SUPER_ADMIN_NAME = '관리자';

const COMPANY_NAME = 'ABC Dessert Center';
const COMPANY_BUSINESS_NUMBER = '123-45-67890';

const BRAND_NAME = '맛남살롱';

const STORE_NAME = '맛남살롱 부천시청점';
const STORE_ADDRESS = '경기도 부천시 원미구 중동로 123';

const EMPLOYEE_NAME = '홍길동';
const EMPLOYEE_EMAIL = 'test-employee@example.com';
const EMPLOYEE_PASSWORD = process.env.SEED_EMPLOYEE_PASSWORD;
const EMPLOYEE_BIRTH = '19900101';
const EMPLOYEE_PHONE = '010-1234-5678';

const HOURLY_WAGE = 10000;

// 필수 환경 변수 검증
if (!SUPER_ADMIN_PASSWORD) {
  console.error('❌ 환경 변수 SEED_SUPER_ADMIN_PASSWORD가 설정되지 않았습니다.');
  console.error('📝 .env.local 파일에 다음을 추가하세요:');
  console.error('   SEED_SUPER_ADMIN_PASSWORD=your_strong_password\n');
  process.exit(1);
}

if (!EMPLOYEE_PASSWORD) {
  console.error('❌ 환경 변수 SEED_EMPLOYEE_PASSWORD가 설정되지 않았습니다.');
  console.error('📝 .env.local 파일에 다음을 추가하세요:');
  console.error('   SEED_EMPLOYEE_PASSWORD=your_strong_password\n');
  process.exit(1);
}

// ===========================================
// 날짜 유틸리티
// ===========================================

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ===========================================
// 메인 함수
// ===========================================

async function seedInitialData() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         🌱 Firestore 초기 데이터 시드 스크립트 v1.0.0        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // ============================================================
    // 중복 실행 방지 체크
    // ============================================================
    console.log('🔍 기존 데이터 확인 중...\n');

    // 이미 시드 데이터가 있는지 확인
    const companiesSnapshot = await db.collection('companies').limit(1).get();
    const brandsSnapshot = await db.collection('brands').limit(1).get();
    const storesSnapshot = await db.collection('stores').limit(1).get();

    if (!companiesSnapshot.empty || !brandsSnapshot.empty || !storesSnapshot.empty) {
      console.log('⚠️  경고: 이미 데이터가 존재합니다!\n');
      console.log('이 스크립트를 실행하면 다음 데이터가 추가로 생성됩니다:');
      console.log('- Company 1개');
      console.log('- Brand 1개');
      console.log('- Store 1개');
      console.log('- Employee 1개');
      console.log('- Contract 1개');
      console.log('- Attendance 3개\n');
      console.log('⚠️  중복 데이터 생성을 방지하려면 스크립트를 중단하세요 (Ctrl+C)\n');
      console.log('5초 후 계속 진행됩니다...\n');

      // 5초 대기
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // ============================================================
    // 1️⃣ Super Admin 계정 생성
    // ============================================================
    console.log('============================================================');
    console.log('🔑 [1/7] Super Admin 계정 생성');
    console.log('============================================================\n');

    let superAdminUid: string;

    try {
      // 기존 계정 확인
      const existingUser = await auth.getUserByEmail(SUPER_ADMIN_EMAIL);
      superAdminUid = existingUser.uid;
      console.log(`⚠️  기존 계정 발견: ${SUPER_ADMIN_EMAIL}`);
      console.log(`   UID: ${superAdminUid}\n`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // 새 계정 생성
        const userRecord = await auth.createUser({
          email: SUPER_ADMIN_EMAIL,
          password: SUPER_ADMIN_PASSWORD,
          displayName: SUPER_ADMIN_NAME,
          emailVerified: true
        });

        superAdminUid = userRecord.uid;
        console.log(`✅ Super Admin 계정 생성 완료`);
        console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
        console.log(`   UID: ${superAdminUid}`);
        console.log(`   Password: ${SUPER_ADMIN_PASSWORD}\n`);
      } else {
        throw error;
      }
    }

    // Firestore users 컬렉션에 저장 (merge 옵션 사용)
    await db.collection('users').doc(superAdminUid).set({
      userId: superAdminUid,
      email: SUPER_ADMIN_EMAIL,
      name: SUPER_ADMIN_NAME,
      role: 'super_admin',
      companyId: 'platform',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ Firestore users 문서 생성 완료\n');

    // ============================================================
    // 2️⃣ Company 생성
    // ============================================================
    console.log('============================================================');
    console.log('🏢 [2/7] Company 생성');
    console.log('============================================================\n');

    const companyRef = await db.collection('companies').add({
      name: COMPANY_NAME,
      businessNumber: COMPANY_BUSINESS_NUMBER,
      ownerId: superAdminUid,
      ownerName: SUPER_ADMIN_NAME,
      status: 'active',
      planType: 'premium',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const companyId = companyRef.id;
    console.log(`✅ Company 생성 완료`);
    console.log(`   ID: ${companyId}`);
    console.log(`   Name: ${COMPANY_NAME}`);
    console.log(`   Business Number: ${COMPANY_BUSINESS_NUMBER}\n`);

    // Super Admin에 companyId 업데이트 (merge 옵션)
    await db.collection('users').doc(superAdminUid).set({
      companyId: companyId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ Super Admin companyId 업데이트 완료\n');

    // ============================================================
    // 3️⃣ Brand 생성
    // ============================================================
    console.log('============================================================');
    console.log('🏷️  [3/7] Brand 생성');
    console.log('============================================================\n');

    const brandRef = await db.collection('brands').add({
      name: BRAND_NAME,
      companyId: companyId,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const brandId = brandRef.id;
    console.log(`✅ Brand 생성 완료`);
    console.log(`   ID: ${brandId}`);
    console.log(`   Name: ${BRAND_NAME}`);
    console.log(`   Company ID: ${companyId}\n`);

    // ============================================================
    // 4️⃣ Store 생성
    // ============================================================
    console.log('============================================================');
    console.log('🏪 [4/7] Store 생성');
    console.log('============================================================\n');

    const storeRef = await db.collection('stores').add({
      name: STORE_NAME,
      storeName: STORE_NAME,
      storeId: '', // 생성 후 업데이트
      address: STORE_ADDRESS,
      companyId: companyId,
      brandId: brandId,
      brandName: BRAND_NAME,
      status: 'active',
      attendanceThresholds: {
        earlyClockIn: 15,
        earlyClockOut: 5,
        overtime: 5
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const storeId = storeRef.id;

    // storeId 업데이트
    await storeRef.update({ storeId: storeId });

    console.log(`✅ Store 생성 완료`);
    console.log(`   ID: ${storeId}`);
    console.log(`   Name: ${STORE_NAME}`);
    console.log(`   Address: ${STORE_ADDRESS}`);
    console.log(`   Brand: ${BRAND_NAME}`);
    console.log(`   Company ID: ${companyId}\n`);

    // ============================================================
    // 5️⃣ Employee 생성
    // ============================================================
    console.log('============================================================');
    console.log('👤 [5/7] Employee 생성');
    console.log('============================================================\n');

    let employeeUid: string;

    try {
      // 기존 계정 확인
      const existingEmployee = await auth.getUserByEmail(EMPLOYEE_EMAIL);
      employeeUid = existingEmployee.uid;
      console.log(`⚠️  기존 Employee 발견: ${EMPLOYEE_EMAIL}`);
      console.log(`   UID: ${employeeUid}\n`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // 새 계정 생성
        const employeeRecord = await auth.createUser({
          email: EMPLOYEE_EMAIL,
          password: EMPLOYEE_PASSWORD,
          displayName: EMPLOYEE_NAME,
          emailVerified: true
        });

        employeeUid = employeeRecord.uid;
        console.log(`✅ Employee 계정 생성 완료`);
        console.log(`   Email: ${EMPLOYEE_EMAIL}`);
        console.log(`   UID: ${employeeUid}`);
        console.log(`   Password: ${EMPLOYEE_PASSWORD}\n`);
      } else {
        throw error;
      }
    }

    // Firestore users 컬렉션에 저장 (merge 옵션)
    await db.collection('users').doc(employeeUid).set({
      userId: employeeUid,
      email: EMPLOYEE_EMAIL,
      name: EMPLOYEE_NAME,
      role: 'employee',
      companyId: companyId,
      storeId: storeId,
      storeName: STORE_NAME,
      birth: EMPLOYEE_BIRTH,
      phone: EMPLOYEE_PHONE,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ Firestore users 문서 생성 완료\n');

    // ============================================================
    // 6️⃣ Contract 생성
    // ============================================================
    console.log('============================================================');
    console.log('📝 [6/7] Contract 생성');
    console.log('============================================================\n');

    const today = new Date();
    const contractStartDate = new Date(today.getFullYear(), today.getMonth(), 1);

    const contractRef = await db.collection('contracts').add({
      userId: employeeUid,
      employeeName: EMPLOYEE_NAME,
      companyId: companyId,
      storeId: storeId,
      storeName: STORE_NAME,

      // 급여 정보 (표준 필드명)
      salaryType: '시급',
      salaryAmount: HOURLY_WAGE,
      salaryPaymentDay: 10,
      salaryCalculationType: 'prev_month_full',
      salaryCalculationPeriod: null,
      paymentMethod: '계좌이체',

      // 근무 조건
      workDays: '월,화,수,목,금',
      weeklyHours: 40,
      workStartTime: '09:00',
      workEndTime: '18:00',
      breakTime: {
        startHour: 12,
        startMinute: 0,
        endHour: 13,
        endMinute: 0
      },

      // 수당 설정
      allowances: {
        overtime: true,
        night: true,
        holiday: true,
        weeklyHoliday: true
      },

      // 4대보험
      insurance: {
        pension: true,
        health: true,
        employment: true,
        workComp: true,
        type: 'all',
        severancePay: true
      },

      startDate: admin.firestore.Timestamp.fromDate(contractStartDate),
      contractDate: admin.firestore.Timestamp.fromDate(today),
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const contractId = contractRef.id;
    console.log(`✅ Contract 생성 완료`);
    console.log(`   ID: ${contractId}`);
    console.log(`   Employee: ${EMPLOYEE_NAME}`);
    console.log(`   Salary Type: 시급`);
    console.log(`   Salary Amount: ${HOURLY_WAGE.toLocaleString()}원`);
    console.log(`   Work Days: 월,화,수,목,금`);
    console.log(`   Work Hours: 09:00 ~ 18:00`);
    console.log(`   Start Date: ${formatDate(contractStartDate)}\n`);

    // ============================================================
    // 7️⃣ Attendance 생성 (최근 3일치)
    // ============================================================
    console.log('============================================================');
    console.log('📅 [7/7] Attendance 생성 (최근 3일치)');
    console.log('============================================================\n');

    const attendanceDates = [];
    for (let i = 2; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      attendanceDates.push(date);
    }

    for (const date of attendanceDates) {
      const dateStr = formatDate(date);
      const yearMonth = getYearMonth(date);

      await db.collection('attendance').add({
        userId: employeeUid,
        employeeName: EMPLOYEE_NAME,
        companyId: companyId,
        storeId: storeId,
        storeName: STORE_NAME,

        // 표준 필드명
        date: dateStr,
        yearMonth: yearMonth,
        clockIn: '09:00',
        clockOut: '18:00',

        // 인센티브
        wageIncentive: 0,

        // 실시간 여부
        isRealtime: false,

        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Attendance 생성: ${dateStr} (09:00 ~ 18:00)`);
    }

    console.log();

    // ============================================================
    // 완료 메시지
    // ============================================================
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ 시드 완료!                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('📊 생성된 데이터 요약:\n');
    console.log(`✅ Super Admin: ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD}`);
    console.log(`✅ Company: ${COMPANY_NAME} (ID: ${companyId})`);
    console.log(`✅ Brand: ${BRAND_NAME} (ID: ${brandId})`);
    console.log(`✅ Store: ${STORE_NAME} (ID: ${storeId})`);
    console.log(`✅ Employee: ${EMPLOYEE_NAME} (${EMPLOYEE_EMAIL} / ${EMPLOYEE_PASSWORD})`);
    console.log(`✅ Contract: 시급 ${HOURLY_WAGE.toLocaleString()}원 (ID: ${contractId})`);
    console.log(`✅ Attendance: ${attendanceDates.length}개 (최근 3일치)\n`);

    console.log('🎯 다음 단계:\n');
    console.log('1. 로그인 테스트:');
    console.log(`   - Super Admin: ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD}`);
    console.log(`   - Employee: ${EMPLOYEE_EMAIL} / ${EMPLOYEE_PASSWORD}\n`);
    console.log('2. 급여 계산 테스트:');
    console.log(`   - 관리자 대시보드 → 급여 관리`);
    console.log(`   - 직원: ${EMPLOYEE_NAME}`);
    console.log(`   - 연월: ${getYearMonth(today)}\n`);
    console.log('3. 출퇴근 기록 확인:');
    console.log(`   - 직원 대시보드 → 근태 관리`);
    console.log(`   - 최근 3일 출퇴근 기록 확인\n`);

  } catch (error) {
    console.error('❌ 치명적 오류:', error);
    process.exit(1);
  }
}

// ===========================================
// 실행
// ===========================================

seedInitialData().then(() => {
  console.log('✅ 스크립트 실행 완료\n');
  process.exit(0);
}).catch((error) => {
  console.error('❌ 스크립트 실행 실패:', error);
  process.exit(1);
});
