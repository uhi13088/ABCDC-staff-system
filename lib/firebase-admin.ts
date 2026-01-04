/**
 * Firebase Admin SDK 초기화
 * 
 * ⚠️ 주의사항:
 * 1. Admin SDK는 Firestore Rules를 우회합니다 (완전한 권한)
 * 2. 반드시 서버 사이드(API Route)에서만 사용하세요
 * 3. serviceAccountKey.json은 .gitignore에 포함되어야 합니다
 * 
 * 사용 예시:
 * ```typescript
 * import { adminDb } from '@/lib/firebase-admin';
 * 
 * const snapshot = await adminDb.collection('invitation_codes').doc(codeId).get();
 * ```
 */

import * as admin from 'firebase-admin';

// Admin SDK 초기화 함수 (Lazy Initialization)
function initializeAdminSDK() {
  if (admin.apps.length > 0) {
    return; // 이미 초기화됨
  }

  try {
    // 환경변수에서 Service Account 정보 읽기
    // Note: FIREBASE_ prefix는 Firebase 예약어이므로 SERVER_ 사용
    const projectId = process.env.SERVER_PROJECT_ID;
    const clientEmail = process.env.SERVER_CLIENT_EMAIL;
    const privateKey = process.env.SERVER_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin SDK environment variables');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // 환경변수의 \n을 실제 줄바꿈으로 변환
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    throw error;
  }
}

// Getter 함수로 lazy initialization
export function getAdminDb() {
  initializeAdminSDK();
  return admin.firestore();
}

export function getAdminAuth() {
  initializeAdminSDK();
  return admin.auth();
}

// 하위 호환성을 위한 deprecated exports (Proxy with proper this binding)
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(target, prop) {
    const db = getAdminDb();
    const value = db[prop as keyof admin.firestore.Firestore];

    // 함수인 경우 this 바인딩 (메서드 체이닝 및 컨텍스트 유지)
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(target, prop) {
    const auth = getAdminAuth();
    const value = auth[prop as keyof admin.auth.Auth];

    // 함수인 경우 this 바인딩
    if (typeof value === 'function') {
      return value.bind(auth);
    }
    return value;
  }
});

// Timestamp 헬퍼
export const adminTimestamp = admin.firestore.Timestamp;
export const adminFieldValue = admin.firestore.FieldValue;

export default admin;
