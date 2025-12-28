/**
 * Settings Tab
 * 시스템 설정 탭
 */

'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings as SettingsIcon, Briefcase, Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SettingsTabProps {
  companyId: string;
}

export default function SettingsTab({ companyId }: SettingsTabProps) {
  const [positions, setPositions] = useState<string[]>([]);
  const [newPosition, setNewPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 초기 로드
  useEffect(() => {
    if (companyId) {
      loadPositions();
    }
  }, [companyId]);

  const loadPositions = async () => {
    try {
      const settingsRef = doc(db, 'companies', companyId, 'settings', 'positions');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        setPositions(settingsSnap.data().positions || []);
      } else {
        // 기본값 설정
        const defaultPositions = ['바리스타', '베이커'];
        setPositions(defaultPositions);
        await setDoc(settingsRef, { positions: defaultPositions });
      }
    } catch (err) {
      console.error('❌ 직무 로드 실패:', err);
      setError('직무 목록을 불러오는데 실패했습니다.');
    }
  };

  const addPosition = async () => {
    setError('');
    setSuccess('');

    if (!newPosition.trim()) {
      setError('직무명을 입력해주세요.');
      return;
    }

    if (positions.includes(newPosition.trim())) {
      setError('이미 등록된 직무입니다.');
      return;
    }

    setLoading(true);
    try {
      const updatedPositions = [...positions, newPosition.trim()];
      const settingsRef = doc(db, 'companies', companyId, 'settings', 'positions');
      await setDoc(settingsRef, { positions: updatedPositions });

      setPositions(updatedPositions);
      setNewPosition('');
      setSuccess('직무가 추가되었습니다.');
    } catch (err) {
      console.error('❌ 직무 추가 실패:', err);
      setError('직무 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const removePosition = async (position: string) => {
    setError('');
    setSuccess('');

    if (!confirm(`"${position}" 직무를 삭제하시겠습니까?\n\n⚠️ 주의: 이미 등록된 직원의 직무는 변경되지 않습니다.`)) {
      return;
    }

    setLoading(true);
    try {
      const updatedPositions = positions.filter(p => p !== position);
      const settingsRef = doc(db, 'companies', companyId, 'settings', 'positions');
      await setDoc(settingsRef, { positions: updatedPositions });

      setPositions(updatedPositions);
      setSuccess('직무가 삭제되었습니다.');
    } catch (err) {
      console.error('❌ 직무 삭제 실패:', err);
      setError('직무 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 직무 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            직무 관리
          </CardTitle>
          <CardDescription>직원 가입 및 관리 시 사용할 직무를 추가/삭제할 수 있습니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 에러/성공 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* 직무 추가 */}
          <div className="flex gap-2">
            <Input
              placeholder="예: 바리스타, 베이커, 홀 매니저"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPosition()}
              disabled={loading}
            />
            <Button onClick={addPosition} disabled={loading || !newPosition.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              추가
            </Button>
          </div>

          {/* 직무 목록 */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-slate-700">등록된 직무 ({positions.length}개)</h3>
            <div className="flex flex-wrap gap-2">
              {positions.length === 0 ? (
                <p className="text-sm text-slate-500">등록된 직무가 없습니다. 위에서 직무를 추가해주세요.</p>
              ) : (
                positions.map((position) => (
                  <Badge
                    key={position}
                    variant="outline"
                    className="px-3 py-1.5 bg-blue-50 border-blue-200 text-blue-700 flex items-center gap-2"
                  >
                    <span>{position}</span>
                    <button
                      onClick={() => removePosition(position)}
                      disabled={loading}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-slate-600">
              💡 직원 가입 시 여기에 등록된 직무 목록이 표시됩니다.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ⚠️ 직무를 삭제해도 이미 등록된 직원의 직무는 변경되지 않습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 시스템 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-slate-600" />
            시스템 정보
          </CardTitle>
          <CardDescription>시스템 운영 정보</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-slate-600">
              💡 공휴일은 매년 1월 1일 00:00에 자동으로 동기화됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
