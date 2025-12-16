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

// Admin SDK 초기화 (싱글톤 패턴)
if (!admin.apps.length) {
  try {
    // 환경변수에서 Service Account 정보 읽기
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

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

// Firestore Admin 인스턴스 export
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

// Timestamp 헬퍼
export const adminTimestamp = admin.firestore.Timestamp;
export const adminFieldValue = admin.firestore.FieldValue;

export default admin;
