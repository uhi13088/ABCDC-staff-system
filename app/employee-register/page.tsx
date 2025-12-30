'use client';

/**
 * 직원 회원가입 페이지 (Employee Registration)
 * 
 * 3단계 프로세스:
 * 1. 초대 코드 입력 및 검증
 * 2. 직원 정보 입력 (이름, 주민등록번호, 연락처, 주소, 직책, 계정)
 * 3. 가입 완료 (승인 대기 안내)
 * 
 * 레거시: employee-register.html (968 lines)
 */

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, writeBatch, Timestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { verifyInviteCode, recordInviteUse } from '@/services/inviteService';
import { CompanyInvite } from '@/lib/types/invite';
import { COLLECTIONS, USER_STATUS, USER_ROLES } from '@/lib/constants';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Coffee, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';

// 내부 컴포넌트 (useSearchParams 사용)
function EmployeeRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 단계 관리 (1: 초대 코드, 2: 정보 입력, 3: 완료)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // 초대 코드 검증 결과
  const [verifiedInvite, setVerifiedInvite] = useState<CompanyInvite | null>(null);
  
  // 직무 목록
  const [availablePositions, setAvailablePositions] = useState<string[]>(['바리스타', '베이커']);
  
  // 다중 시간대 인터페이스
  interface TimeSchedule {
    id: string;
    days: string[];
    startHour: string;
    startMinute: string;
    endHour: string;
    endMinute: string;
  }
  
  // 다중 시간대 상태
  const [schedules, setSchedules] = useState<TimeSchedule[]>([{
    id: '1',
    days: [],
    startHour: '09',
    startMinute: '00',
    endHour: '18',
    endMinute: '00'
  }]);
  
  // 폼 데이터
  const [inviteCode, setInviteCode] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    birth: '',          // 주민등록번호
    phone: '',
    address: '',
    position: '',       // 직책/직무
    email: '',
    password: '',
    passwordConfirm: '',
    
    // 휴게 시간 (선택사항)
    breakStartTime: '',         // 휴게 시작 시간 (예: '12:00')
    breakEndTime: '',           // 휴게 종료 시간 (예: '13:00')
  });
  
  // UI 상태
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // URL 파라미터에서 초대 코드 자동 입력
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.trim().toUpperCase());
      setSuccess('URL에서 초대 코드를 자동으로 입력했습니다. "코드 확인" 버튼을 눌러주세요.');
    }
  }, [searchParams]);

  // ==================== Step 1: 초대 코드 검증 ====================
  const handleVerifyCode = async () => {
    setError('');
    setSuccess('');

    if (!inviteCode.trim()) {
      setError('초대 코드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyInviteCode(inviteCode.trim().toUpperCase());

      if (!result.valid || !result.invite) {
        setError(result.error || '유효하지 않은 초대 코드입니다.');
        return;
      }

      setVerifiedInvite(result.invite);
      
      // 직무 목록 로드
      try {
        const positionsRef = doc(db, 'companies', result.invite.companyId, 'settings', 'positions');
        const positionsSnap = await getDoc(positionsRef);
        if (positionsSnap.exists()) {
          setAvailablePositions(positionsSnap.data().positions || ['바리스타', '베이커']);
        }
      } catch (posErr) {
        console.warn('⚠️ 직무 목록 로드 실패 (기본값 사용):', posErr);
      }
      
      setSuccess('초대 코드가 확인되었습니다! 아래 정보를 입력해주세요.');
      setStep(2);
    } catch (err) {
      console.error('❌ 초대 코드 검증 오류:', err);
      setError('초대 코드 확인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== Step 2: 회원가입 처리 ====================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 유효성 검사
    if (!verifiedInvite) {
      setError('초대 코드를 먼저 확인해주세요.');
      return;
    }

    if (!formData.name || !formData.birth || !formData.phone || !formData.address || 
        !formData.position || !formData.email || !formData.password) {
      setError('모든 필수 항목을 입력해주세요.');
      return;
    }

    // 주민등록번호 검증 (13자리)
    const cleanedBirth = formData.birth.replace(/-/g, '');
    if (cleanedBirth.length !== 13 || !/^\d+$/.test(cleanedBirth)) {
      setError('주민등록번호를 올바르게 입력해주세요. (13자리)');
      return;
    }

    // 비밀번호 확인
    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Firebase Authentication에 사용자 생성
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      console.log('✅ Auth 사용자 생성 완료:', user.uid);

      // 2. Firestore Batch Write (users 컬렉션에 저장)
      const batch = writeBatch(db);

      const employeeData = {
        uid: user.uid,
        email: formData.email,
        name: formData.name,
        birth: formData.birth,
        phone: formData.phone,
        address: formData.address,
        
        // Multi-tenant 필드
        companyId: verifiedInvite.companyId,
        storeId: verifiedInvite.storeId,
        store: verifiedInvite.storeName,  // 하위호환성 유지
        
        position: formData.position,
        role: verifiedInvite.role,  // 초대 코드의 역할 그대로 사용
        inviteCode: inviteCode.trim().toUpperCase(),  // 사용한 초대 코드 저장
        
        status: USER_STATUS.PENDING,  // 승인 대기 상태
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        
        // 근무 시간대 (다중 시간대 저장)
        ...(schedules.length > 0 && schedules.some(s => s.days.length > 0) && { 
          workSchedules: schedules.filter(s => s.days.length > 0).map(s => ({
            days: s.days,
            startHour: s.startHour,
            startMinute: s.startMinute,
            endHour: s.endHour,
            endMinute: s.endMinute
          }))
        }),
        // 휴게 시간 (선택사항)
        ...(formData.breakStartTime && { breakStartTime: formData.breakStartTime }),
        ...(formData.breakEndTime && { breakEndTime: formData.breakEndTime }),
      };

      // users 컬렉션에 저장
      const userRef = doc(db, COLLECTIONS.USERS, user.uid);
      batch.set(userRef, employeeData);

      await batch.commit();
      console.log('✅ Firestore Batch Write 완료');

      // 3. 초대 코드 사용 기록
      try {
        await recordInviteUse(verifiedInvite.id, user.uid);
        console.log('✅ 초대 코드 사용 기록 완료');
      } catch (recordError) {
        console.warn('⚠️ 초대 코드 사용 기록 실패 (무시하고 진행):', recordError);
      }

      // 4. 가입 완료 단계로 이동
      setSuccess('가입 신청이 완료되었습니다!');
      setStep(3);

      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/employee-login');
      }, 3000);

    } catch (err) {
      console.error('❌ 가입 실패:', err);

      let errorMsg = '가입에 실패했습니다.';

      if (err.code === 'auth/email-already-in-use') {
        errorMsg = '이미 사용 중인 이메일입니다. 다른 이메일 주소를 사용해주세요.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = '올바른 이메일 주소를 입력하세요.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = '비밀번호가 너무 약합니다. 6자 이상 입력하세요.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 주민등록번호 자동 포맷팅
  const handleBirthChange = (value: string) => {
    let cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length > 6) {
      cleaned = cleaned.substring(0, 6) + '-' + cleaned.substring(6, 13);
    }
    setFormData({ ...formData, birth: cleaned });
  };

  // 역할 한글 변환
  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'staff': '일반 직원',
      'store_manager': '매장 매니저',
      'manager': '관리자',
      'admin': '최고 관리자',
    };
    return roleMap[role] || role;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Coffee className="w-16 h-16 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">맛남살롱</CardTitle>
          <CardDescription>직원 가입 (Multi-tenant)</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 성공 메시지 */}
          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* ==================== Step 1: 초대 코드 입력 ==================== */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg p-6 space-y-4">
                <Label htmlFor="inviteCode" className="text-base font-semibold">
                  초대 코드 <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600">회사에서 발급받은 초대 코드를 입력해주세요</p>

                <div className="flex gap-2">
                  <Input
                    id="inviteCode"
                    placeholder="ABC123"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    disabled={isLoading}
                    className="font-mono"
                  />
                  <Button
                    onClick={handleVerifyCode}
                    disabled={isLoading || !inviteCode.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        확인 중...
                      </>
                    ) : (
                      '코드 확인'
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500">
                이미 계정이 있으신가요?{' '}
                <a href="/employee-login" className="text-blue-600 hover:underline font-semibold">
                  로그인
                </a>
              </div>
            </div>
          )}

          {/* ==================== Step 2: 정보 입력 ==================== */}
          {step === 2 && verifiedInvite && (
            <form onSubmit={handleRegister} className="space-y-6">
              {/* 초대 정보 표시 */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">회사:</span>
                  <span className="font-semibold">{verifiedInvite.companyName || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">배정 매장:</span>
                  <span className="font-semibold">{verifiedInvite.storeName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">직책:</span>
                  <span className="font-semibold">{getRoleDisplayName(verifiedInvite.role)}</span>
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-blue-600 border-b pb-2">기본 정보</h3>

                <div className="space-y-2">
                  <Label htmlFor="name">이름 <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    placeholder="김민수"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth">주민등록번호 <span className="text-red-500">*</span></Label>
                  <Input
                    id="birth"
                    placeholder="000000-0000000"
                    maxLength={14}
                    value={formData.birth}
                    onChange={(e) => handleBirthChange(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">- 포함하여 입력해주세요 (인건비 신고용)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">연락처 <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    placeholder="010-1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500">- 포함하여 입력해주세요</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">주소 <span className="text-red-500">*</span></Label>
                  <Input
                    id="address"
                    placeholder="경기도 부천시 원미구"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* 근무 정보 */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-blue-600 border-b pb-2">근무 정보</h3>

                <div className="space-y-2">
                  <Label htmlFor="storeDisplay">근무 매장</Label>
                  <Input
                    id="storeDisplay"
                    value={verifiedInvite.storeName}
                    disabled
                  />
                  <p className="text-xs text-gray-500">초대 코드로 자동 배정된 매장입니다</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">직책/직무 <span className="text-red-500">*</span></Label>
                  <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePositions.map((position) => (
                        <SelectItem key={position} value={position}>{position}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">시스템 설정에서 관리되는 직무 목록입니다</p>
                </div>

                {/* 다중 근무 시간대 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>근무 시간 (선택사항)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newId = (Math.max(...schedules.map(s => parseInt(s.id)), 0) + 1).toString();
                        setSchedules([...schedules, {
                          id: newId,
                          days: [],
                          startHour: '09',
                          startMinute: '00',
                          endHour: '18',
                          endMinute: '00'
                        }]);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      시간대 추가
                    </Button>
                  </div>

                  {schedules.map((schedule, index) => (
                    <div key={schedule.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">
                          시간대 {index + 1}
                        </span>
                        {schedules.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSchedules(schedules.filter(s => s.id !== schedule.id))}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>

                      {/* 요일 선택 */}
                      <div className="space-y-2">
                        <Label className="text-xs">근무 요일</Label>
                        <div className="grid grid-cols-7 gap-2">
                          {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
                            <Button
                              key={day}
                              type="button"
                              variant={schedule.days.includes(day) ? 'default' : 'outline'}
                              size="sm"
                              className="text-xs px-2 py-1 h-8"
                              onClick={() => {
                                const newSchedules = schedules.map(s => {
                                  if (s.id === schedule.id) {
                                    const newDays = s.days.includes(day)
                                      ? s.days.filter(d => d !== day)
                                      : [...s.days, day];
                                    return { ...s, days: newDays };
                                  }
                                  return s;
                                });
                                setSchedules(newSchedules);
                              }}
                            >
                              {day}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* 시간 입력 */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* 시작 시간 */}
                        <div className="space-y-2">
                          <Label className="text-xs">시작 시간</Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              placeholder="HH"
                              value={schedule.startHour}
                              onChange={(e) => {
                                const val = e.target.value.padStart(2, '0').slice(0, 2);
                                const newSchedules = schedules.map(s => 
                                  s.id === schedule.id ? { ...s, startHour: val } : s
                                );
                                setSchedules(newSchedules);
                              }}
                              className="w-16 text-center"
                            />
                            <span className="self-center">:</span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="MM"
                              value={schedule.startMinute}
                              onChange={(e) => {
                                const val = e.target.value.padStart(2, '0').slice(0, 2);
                                const newSchedules = schedules.map(s => 
                                  s.id === schedule.id ? { ...s, startMinute: val } : s
                                );
                                setSchedules(newSchedules);
                              }}
                              className="w-16 text-center"
                            />
                          </div>
                        </div>

                        {/* 종료 시간 */}
                        <div className="space-y-2">
                          <Label className="text-xs">종료 시간</Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              placeholder="HH"
                              value={schedule.endHour}
                              onChange={(e) => {
                                const val = e.target.value.padStart(2, '0').slice(0, 2);
                                const newSchedules = schedules.map(s => 
                                  s.id === schedule.id ? { ...s, endHour: val } : s
                                );
                                setSchedules(newSchedules);
                              }}
                              className="w-16 text-center"
                            />
                            <span className="self-center">:</span>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="MM"
                              value={schedule.endMinute}
                              onChange={(e) => {
                                const val = e.target.value.padStart(2, '0').slice(0, 2);
                                const newSchedules = schedules.map(s => 
                                  s.id === schedule.id ? { ...s, endMinute: val } : s
                                );
                                setSchedules(newSchedules);
                              }}
                              className="w-16 text-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <p className="text-xs text-gray-500">
                    근무 시간을 입력하면 계약서 작성 시 자동으로 반영됩니다
                  </p>
                </div>

                {/* 휴게 시간 (선택사항) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="breakStartTime">휴게 시작 (선택사항)</Label>
                    <Input
                      id="breakStartTime"
                      type="time"
                      value={formData.breakStartTime}
                      onChange={(e) => setFormData({ ...formData, breakStartTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breakEndTime">휴게 종료 (선택사항)</Label>
                    <Input
                      id="breakEndTime"
                      type="time"
                      value={formData.breakEndTime}
                      onChange={(e) => setFormData({ ...formData, breakEndTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 계정 정보 */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-blue-600 border-b pb-2">계정 정보</h3>

                <div className="space-y-2">
                  <Label htmlFor="email">이메일 (로그인 ID) <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    autoComplete="new-password"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500">로그인 시 사용할 이메일 주소</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호 <span className="text-red-500">*</span></Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="6자 이상"
                    autoComplete="new-password"
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">비밀번호 확인 <span className="text-red-500">*</span></Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    placeholder="비밀번호 재입력"
                    autoComplete="new-password"
                    minLength={6}
                    value={formData.passwordConfirm}
                    onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '가입하기'
                )}
              </Button>
            </form>
          )}

          {/* ==================== Step 3: 가입 완료 ==================== */}
          {step === 3 && (
            <div className="text-center space-y-4 py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-bold text-gray-900">가입 신청이 완료되었습니다!</h3>
              <p className="text-gray-600">
                관리자 승인 후 로그인이 가능합니다.<br />
                잠시 후 로그인 페이지로 이동합니다.
              </p>
              <div className="flex gap-2 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 메인 Page 컴포넌트 (Suspense로 감싸기)
export default function EmployeeRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <EmployeeRegisterForm />
    </Suspense>
  );
}
