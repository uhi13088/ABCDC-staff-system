/**
 * ========================================
 * HealthCertService - 보건증 관리 (Soft Warning)
 * ========================================
 * 
 * 핵심 철학: 스케줄을 막지 않는다! (현장 마비 방지)
 * - 만료 30일 전부터 주기적 알림 발송
 * - 관리자 UI에 🔴 경고 배지 표시
 * - 강제 차단 없음 (Soft Warning Only)
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import NotificationService from './notificationService';

// ========================================
// 타입 정의
// ========================================

export type HealthCertStatus = 'valid' | 'expiring_soon' | 'expired';

export interface HealthCertInfo {
  userId: string;
  userName: string;
  expiryDate: Date;
  status: HealthCertStatus;
  daysUntilExpiry: number;
}

// ========================================
// 상태 계산
// ========================================

/**
 * 보건증 상태 계산
 */
export function getHealthCertStatus(expiryDate: Date): {
  status: HealthCertStatus;
  daysUntilExpiry: number;
} {
  const now = new Date();
  const expiry = new Date(expiryDate);
  
  // 날짜 차이 계산 (일 단위)
  const diffTime = expiry.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let status: HealthCertStatus;
  
  if (daysUntilExpiry < 0) {
    status = 'expired';
  } else if (daysUntilExpiry <= 30) {
    status = 'expiring_soon';
  } else {
    status = 'valid';
  }
  
  return { status, daysUntilExpiry };
}

/**
 * 보건증 상태 배지 이모지
 */
export function getHealthCertBadge(status: HealthCertStatus): string {
  switch (status) {
    case 'expired':
      return '🔴'; // 만료됨
    case 'expiring_soon':
      return '🟡'; // 만료 임박
    case 'valid':
      return '🟢'; // 정상
    default:
      return '';
  }
}

/**
 * 보건증 상태 텍스트
 */
export function getHealthCertStatusText(status: HealthCertStatus, daysUntilExpiry: number): string {
  switch (status) {
    case 'expired':
      return `보건증 만료 (${Math.abs(daysUntilExpiry)}일 경과)`;
    case 'expiring_soon':
      return `보건증 만료 ${daysUntilExpiry}일 전`;
    case 'valid':
      return `보건증 유효 (${daysUntilExpiry}일 남음)`;
    default:
      return '';
  }
}

// ========================================
// 직원 상태 업데이트
// ========================================

/**
 * 직원의 보건증 상태를 자동으로 업데이트
 */
export async function updateEmployeeHealthCertStatus(
  userId: string,
  expiryDate: Date
): Promise<void> {
  const { status } = getHealthCertStatus(expiryDate);
  
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  
  await updateDoc(userRef, {
    healthCertStatus: status,
    updatedAt: serverTimestamp(),
  });
  
  console.log(`✅ 직원 ${userId} 보건증 상태 업데이트: ${status}`);
}

// ========================================
// 만료 예정 직원 조회
// ========================================

/**
 * 보건증 만료 예정/만료된 직원 목록 조회
 */
export async function getEmployeesWithExpiringHealthCert(
  companyId: string
): Promise<HealthCertInfo[]> {
  const usersQuery = query(
    collection(db, COLLECTIONS.USERS),
    where('companyId', '==', companyId),
    where('employmentStatus', '==', 'active')
  );
  
  const snapshot = await getDocs(usersQuery);
  const expiringEmployees: HealthCertInfo[] = [];
  
  const now = new Date();
  
  for (const userDoc of snapshot.docs) {
    const userData = userDoc.data();
    const expiryDate = userData.healthCertExpiryDate;
    
    if (!expiryDate) continue; // 보건증 정보 없으면 스킵
    
    const expiry = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
    const { status, daysUntilExpiry } = getHealthCertStatus(expiry);
    
    // 만료 30일 전부터 또는 이미 만료된 경우만 포함
    if (status === 'expiring_soon' || status === 'expired') {
      expiringEmployees.push({
        userId: userDoc.id,
        userName: userData.name || '직원',
        expiryDate: expiry,
        status,
        daysUntilExpiry,
      });
    }
  }
  
  // 만료일 가까운 순으로 정렬
  expiringEmployees.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  
  return expiringEmployees;
}

// ========================================
// 알림 발송
// ========================================

/**
 * 보건증 만료 알림 발송 (직원 + 관리자)
 */
export async function sendHealthCertExpiryNotifications(
  companyId: string
): Promise<number> {
  console.log('🏥 보건증 만료 알림 발송 시작:', companyId);
  
  const expiringEmployees = await getEmployeesWithExpiringHealthCert(companyId);
  
  console.log(`  📋 알림 대상: ${expiringEmployees.length}명`);
  
  let notificationCount = 0;
  
  for (const employee of expiringEmployees) {
    // 1. 직원에게 알림
    await NotificationService.createNotification({
      userId: employee.userId,
      companyId,
      type: 'system',
      title: '🏥 보건증 갱신 필요',
      message: getHealthCertStatusText(employee.status, employee.daysUntilExpiry) + '. 보건증을 갱신해주세요.',
      data: {
        expiryDate: employee.expiryDate.toISOString(),
        status: employee.status,
        daysUntilExpiry: employee.daysUntilExpiry,
      },
    });
    
    notificationCount++;
    
    // 2. 관리자에게 알림 (만료된 경우만)
    if (employee.status === 'expired') {
      // 관리자 조회 (role: 'admin')
      const adminsQuery = query(
        collection(db, COLLECTIONS.USERS),
        where('companyId', '==', companyId),
        where('role', '==', 'admin')
      );
      
      const adminSnapshot = await getDocs(adminsQuery);
      
      for (const adminDoc of adminSnapshot.docs) {
        await NotificationService.createNotification({
          userId: adminDoc.id,
          companyId,
          type: 'system',
          title: '⚠️ 직원 보건증 만료',
          message: `${employee.userName}님의 보건증이 만료되었습니다. 갱신이 필요합니다.`,
          data: {
            employeeId: employee.userId,
            employeeName: employee.userName,
            expiryDate: employee.expiryDate.toISOString(),
            status: employee.status,
            daysUntilExpiry: employee.daysUntilExpiry,
          },
        });
        
        notificationCount++;
      }
    }
  }
  
  console.log(`✅ 보건증 알림 ${notificationCount}개 발송 완료`);
  
  return notificationCount;
}

/**
 * 모든 직원의 보건증 상태 일괄 업데이트
 */
export async function updateAllHealthCertStatuses(
  companyId: string
): Promise<void> {
  console.log('🏥 보건증 상태 일괄 업데이트 시작:', companyId);
  
  const usersQuery = query(
    collection(db, COLLECTIONS.USERS),
    where('companyId', '==', companyId),
    where('employmentStatus', '==', 'active')
  );
  
  const snapshot = await getDocs(usersQuery);
  
  let updateCount = 0;
  
  for (const userDoc of snapshot.docs) {
    const userData = userDoc.data();
    const expiryDate = userData.healthCertExpiryDate;
    
    if (!expiryDate) continue;
    
    const expiry = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
    const { status } = getHealthCertStatus(expiry);
    
    // 현재 상태와 다른 경우만 업데이트
    if (userData.healthCertStatus !== status) {
      await updateDoc(userDoc.ref, {
        healthCertStatus: status,
        updatedAt: serverTimestamp(),
      });
      
      updateCount++;
      console.log(`  ✅ ${userData.name}: ${status}`);
    }
  }
  
  console.log(`✅ 보건증 상태 업데이트 완료: ${updateCount}명`);
}

// ========================================
// Export
// ========================================

export default {
  getHealthCertStatus,
  getHealthCertBadge,
  getHealthCertStatusText,
  updateEmployeeHealthCertStatus,
  getEmployeesWithExpiringHealthCert,
  sendHealthCertExpiryNotifications,
  updateAllHealthCertStatuses,
};
