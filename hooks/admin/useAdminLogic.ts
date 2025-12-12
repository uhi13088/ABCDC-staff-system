/**
 * 관리자 관리 Custom Hook
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BaseUser } from '@/lib/types/common';
import { COLLECTIONS } from '@/lib/constants';

interface UseAdminLogicProps {
  companyId: string;
}

export function useAdminLogic({ companyId }: UseAdminLogicProps) {
  const [admins, setAdmins] = useState<BaseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('role', 'in', ['admin', 'super_admin']),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(q);
      const adminsList: BaseUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        adminsList.push({
          uid: docSnap.id,
          email: data.email,
          name: data.name,
          displayName: data.displayName,
          phone: data.phone,
          birth: data.birth,
          role: data.role,
          status: data.status || 'active',
          companyId: data.companyId,
          storeId: data.storeId,
          store: data.store,
          position: data.position,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      setAdmins(adminsList);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [companyId]);

  const approveAdmin = useCallback(
    async (uid: string, name: string) => {
      try {
        await updateDoc(doc(db, 'users', uid), { status: 'approved', updatedAt: Timestamp.now() });
        await loadAdmins();
        return { success: true, message: `${name}님이 승인되었습니다.` };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [loadAdmins]
  );

  const deleteAdmin = useCallback(
    async (uid: string, name: string) => {
      try {
        await updateDoc(doc(db, 'users', uid), { status: 'resigned', updatedAt: Timestamp.now() });
        await loadAdmins();
        return { success: true, message: `${name}님이 삭제되었습니다.` };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [loadAdmins]
  );

  useEffect(() => {
    if (companyId) loadAdmins();
  }, [companyId, loadAdmins]);

  return { admins, loading, error, loadAdmins, approveAdmin, deleteAdmin };
}
