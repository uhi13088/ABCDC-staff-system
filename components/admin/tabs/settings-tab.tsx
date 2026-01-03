'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings as SettingsIcon, Briefcase, Plus, X, AlertCircle, CheckCircle2, Clock, Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SettingsTabProps {
  companyId: string;
}

export default function SettingsTab({ companyId }: SettingsTabProps) {
  const [positions, setPositions] = useState<string[]>([]);
  const [newPosition, setNewPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [autoApproveEdit, setAutoApproveEdit] = useState(false);
  
  // 세무사 정보
  const [taxEmail, setTaxEmail] = useState('');
  const [taxName, setTaxName] = useState('');

  // 초기 로드
  useEffect(() => {
    if (companyId) {
      loadPositions();
      loadAttendanceSettings();
      loadTaxSettings();
    }
  }, [companyId]);

  const loadPositions = async () => {
    try {
      const settingsRef = doc(db, 'companies', companyId, 'settings', 'positions');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        setPositions(settingsSnap.data().positions || []);
      } else {
        const defaultPositions = ['바리스타', '베이커'];
        setPositions(defaultPositions);
        await setDoc(settingsRef, { positions: defaultPositions });
      }
    } catch (err) {
      console.error('❌ 직무 로드 실패:', err);
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
    if (!confirm(`"${position}" 직무를 삭제하시겠습니까?`)) return;

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

  // 출퇴근 설정 로드
  const loadAttendanceSettings = async () => {
    try {
      const settingsRef = doc(db, 'companies', companyId, 'settings', 'attendance');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setAutoApproveEdit(settingsSnap.data().autoApproveEdit || false);
      }
    } catch (err) {
      console.error('❌ 출퇴근 설정 로드 실패:', err);
    }
  };

  // 세무사 설정 로드
  const loadTaxSettings = async () => {
    try {
      const settingsRef = doc(db, 'companies', companyId, 'settings', 'tax');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setTaxEmail(settingsSnap.data().email || '');
        setTaxName(settingsSnap.data().name || '');
      }
    } catch (err) {
      console.error('❌ 세무사 설정 로드 실패:', err);
    }
  };

  // 출퇴근 설정 저장
  const saveAttendanceSettings = async (value: boolean) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const settingsRef = doc(db, 'companies', companyId, 'settings', 'attendance');
      await setDoc(settingsRef, { autoApproveEdit: value }, { merge: true });

      setAutoApproveEdit(value);
      setSuccess(value 
        ? '✅ 직원의 출퇴근 수정이 즉시 반영됩니다.'
        : '✅ 직원의 출퇴근 수정은 관리자 승인 후 반영됩니다.'
      );
    } catch (err) {
      console.error('❌ 출퇴근 설정 저장 실패:', err);
      setError('설정 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 세무사 정보 저장
  const saveTaxSettings = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'tax'), {
        email: taxEmail,
        name: taxName
      }, { merge: true });
      setSuccess('✅ 세무사 정보가 저장되었습니다.');
    } catch (err) {
      console.error('❌ 세무사 정보 저장 실패:', err);
      setError('저장 실패');
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
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          {success && <Alert className="border-green-500 bg-green-50"><CheckCircle2 className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-800">{success}</AlertDescription></Alert>}

          <div className="flex gap-2">
            <Input
              placeholder="예: 바리스타, 베이커"
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

          <div>
            <h3 className="text-sm font-semibold mb-2 text-slate-700">등록된 직무 ({positions.length}개)</h3>
            <div className="flex flex-wrap gap-2">
              {positions.length === 0 ? (
                <p className="text-sm text-slate-500">등록된 직무가 없습니다.</p>
              ) : (
                positions.map((position) => (
                  <Badge key={position} variant="outline" className="px-3 py-1.5 bg-blue-50 border-blue-200 text-blue-700 flex items-center gap-2">
                    <span>{position}</span>
                    <button onClick={() => removePosition(position)} disabled={loading} className="hover:bg-blue-200 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                  </Badge>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 세무 대행 설정 (신규 추가) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-600" />
            세무 대행 설정
          </CardTitle>
          <CardDescription>급여 대장을 전송할 세무사 정보를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>세무사 이름 (담당자)</Label>
              <Input 
                placeholder="홍길동 세무사" 
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label>이메일 주소</Label>
              <Input 
                placeholder="tax@example.com" 
                value={taxEmail}
                onChange={(e) => setTaxEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveTaxSettings} disabled={loading}>
              저장하기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 출퇴근 기록 수정 정책 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            출퇴근 기록 수정 정책
          </CardTitle>
          <CardDescription>직원이 출퇴근 기록을 수정할 때 적용되는 정책을 설정합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="auto-approve" className="text-base font-semibold cursor-pointer">출퇴근 수정 즉시 반영</Label>
              <p className="text-sm text-gray-500">{autoApproveEdit ? '✅ 즉시 반영 (관리자 알림 전송)' : '⏳ 관리자 승인 후 반영'}</p>
            </div>
            <Switch id="auto-approve" checked={autoApproveEdit} onCheckedChange={saveAttendanceSettings} disabled={loading} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
