/**
 * 계약서 작성 모달 (신규+추가 통합)
 * 백업: admin-dashboard.html 라인 10041-10498
 * 
 * 모든 필드 완전 구현:
 * - 직원 정보 (이름, 주민등록번호, 주소, 연락처)
 * - 회사 정보 (매장, CEO, 사업자번호, 전화, 주소)
 * - 계약 정보 (유형, 시작일, 종료일, 직책)
 * - 근무 조건 (다중 시간대, 요일, 휴게시간)
 * - 급여 조건 (형태, 금액, 지급일, 지급방법)
 * - 수당 (연장, 야간, 휴일, 주휴)
 * - 4대보험 (전체/고용만/프리랜서/없음)
 * - 퇴직금 적용 여부
 * - 계약서 본문
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Check, FileEdit, Eye, Save, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { COLLECTIONS } from '@/lib/constants';

interface ContractFormModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  isAdditional?: boolean;
  employeeId?: string;
}

interface TimeSchedule {
  days: string[];
  startHour: string | undefined;
  startMinute: string | undefined;
  endHour: string | undefined;
  endMinute: string | undefined;
}

interface BreakTime {
  hours: string | undefined;
  minutes: string | undefined;
  startHour: string | undefined;
  startMinute: string | undefined;
  endHour: string | undefined;
  endMinute: string | undefined;
}

export function ContractFormModal({ 
  open, 
  onClose, 
  companyId,
  isAdditional = false,
  employeeId 
}: ContractFormModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [employees, setEmployees] = useState<User[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  
  // 1. 기본 정보
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(employeeId || undefined);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeBirth, setEmployeeBirth] = useState('');
  const [employeeAddress, setEmployeeAddress] = useState('');
  const [employeePhone, setEmployeePhone] = useState('');
  
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(undefined);
  const [companyCEO, setCompanyCEO] = useState('');
  const [companyBusinessNumber, setCompanyBusinessNumber] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  
  // 2. 계약 정보
  const [contractType, setContractType] = useState<string | undefined>(undefined);
  const [workStore, setWorkStore] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [position, setPosition] = useState('');
  
  // 3. 근무 조건 (다중 시간대)
  const [schedules, setSchedules] = useState<TimeSchedule[]>([
    { days: [], startHour: undefined, startMinute: undefined, endHour: undefined, endMinute: undefined }
  ]);
  const [breakTime, setBreakTime] = useState<BreakTime>({
    hours: undefined,
    minutes: undefined,
    startHour: undefined,
    startMinute: undefined,
    endHour: undefined,
    endMinute: undefined
  });
  
  // 4. 급여 조건
  const [salaryType, setSalaryType] = useState<string | undefined>(undefined);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [paymentDay, setPaymentDay] = useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(undefined);
  
  // 5. 수당
  const [allowOvertime, setAllowOvertime] = useState(false);
  const [allowNight, setAllowNight] = useState(false);
  const [allowHoliday, setAllowHoliday] = useState(false);
  
  // 6. 4대보험
  const [insuranceType, setInsuranceType] = useState<string | undefined>(undefined);
  const [allowSeverancePay, setAllowSeverancePay] = useState(false);
  
  // 7. 계약서 본문
  const [contractContent, setContractContent] = useState('');

  useEffect(() => {
    if (open && companyId) {
      loadEmployees();
      loadStores();
    }
  }, [open, companyId]);

  useEffect(() => {
    if (employeeId) {
      setSelectedEmployeeId(employeeId);
      loadEmployeeInfo(employeeId);
    }
  }, [employeeId]);

  /**
   * 직원 목록 로드 (승인된 직원만)
   */
  const loadEmployees = async () => {
    try {
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('companyId', '==', companyId),
        where('role', 'in', ['staff', 'employee']),
        where('status', 'in', ['approved', 'active'])
      );
      const snapshot = await getDocs(q);
      const employeeList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      setEmployees(employeeList);
    } catch (error) {
      console.error('직원 목록 로드 실패:', error);
    }
  };

  /**
   * 매장 목록 로드
   */
  const loadStores = async () => {
    try {
      const q = query(
        collection(db, COLLECTIONS.STORES),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(q);
      const storeList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStores(storeList);
    } catch (error) {
      console.error('매장 목록 로드 실패:', error);
    }
  };

  /**
   * 직원 정보 자동 입력
   */
  const loadEmployeeInfo = async (empId: string) => {
    const employee = employees.find(e => e.id === empId);
    if (employee) {
      setEmployeeName(employee.name || '');
      setEmployeeBirth(employee.birth || '');
      setEmployeeAddress(employee.address || '');
      setEmployeePhone(employee.phone || '');
      
      // 직원 가입 시 입력한 정보 자동 입력
      if (employee.storeId) {
        setSelectedStoreId(employee.storeId);
        loadStoreInfo(employee.storeId);
      }
      
      if (employee.position) {
        setPosition(employee.position);
      }
      
      // 근무 요일 자동 입력
      if (employee.workDays && employee.workDays.length > 0) {
        setSchedules([{
          days: employee.workDays,
          startHour: employee.workStartTime ? employee.workStartTime.split(':')[0] : undefined,
          startMinute: employee.workStartTime ? employee.workStartTime.split(':')[1] : undefined,
          endHour: employee.workEndTime ? employee.workEndTime.split(':')[0] : undefined,
          endMinute: employee.workEndTime ? employee.workEndTime.split(':')[1] : undefined,
        }]);
      }
      
      // 휴게 시간 자동 입력
      if (employee.breakStartTime && employee.breakEndTime) {
        setBreakTime({
          hours: undefined,
          minutes: undefined,
          startHour: employee.breakStartTime.split(':')[0],
          startMinute: employee.breakStartTime.split(':')[1],
          endHour: employee.breakEndTime.split(':')[0],
          endMinute: employee.breakEndTime.split(':')[1],
        });
      }
    }
  };

  /**
   * 매장 정보 자동 입력
   */
  const loadStoreInfo = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      setWorkStore(store.name || '');
      setCompanyCEO(store.ceo || '');
      setCompanyBusinessNumber(store.businessNumber || '');
      setCompanyPhone(store.phone || '');
      setCompanyAddress(store.address || '');
      
      // 매장 수당 설정 자동 적용
      setAllowOvertime(store.overtimeAllowance || false);
      setAllowNight(store.nightAllowance || false);
      setAllowHoliday(store.holidayAllowance || false);
    }
  };

  /**
   * 시간대 추가
   */
  const addSchedule = () => {
    setSchedules([...schedules, { 
      days: [], 
      startHour: undefined, 
      startMinute: undefined, 
      endHour: undefined, 
      endMinute: undefined 
    }]);
  };

  /**
   * 시간대 삭제
   */
  const removeSchedule = (index: number) => {
    if (schedules.length > 1) {
      setSchedules(schedules.filter((_, i) => i !== index));
    }
  };

  /**
   * 요일 토글
   */
  const toggleDay = (scheduleIndex: number, day: string) => {
    const newSchedules = [...schedules];
    const currentDays = newSchedules[scheduleIndex].days;
    if (currentDays.includes(day)) {
      newSchedules[scheduleIndex].days = currentDays.filter(d => d !== day);
    } else {
      newSchedules[scheduleIndex].days = [...currentDays, day];
    }
    setSchedules(newSchedules);
  };

  /**
   * 시간 선택 옵션 생성
   */
  const renderHourOptions = () => {
    return Array.from({ length: 24 }, (_, i) => (
      <SelectItem key={i} value={String(i).padStart(2, '0')}>
        {String(i).padStart(2, '0')}시
      </SelectItem>
    ));
  };

  const renderMinuteOptions = () => {
    return [0, 15, 30, 45].map(m => (
      <SelectItem key={m} value={String(m).padStart(2, '0')}>
        {String(m).padStart(2, '0')}분
      </SelectItem>
    ));
  };

  /**
   * 폼 검증
   */
  const validateForm = (): string | null => {
    if (!selectedEmployeeId) return '직원을 선택해주세요.';
    if (!selectedStoreId) return '매장을 선택해주세요.';
    if (!contractType) return '계약 유형을 선택해주세요.';
    if (!startDate) return '계약 시작일을 입력해주세요.';
    if (!position) return '직책/직무를 입력해주세요.';
    
    // 근무 조건 검증
    for (const schedule of schedules) {
      if (schedule.days.length === 0) return '근무일을 하나 이상 선택해주세요.';
      if (!schedule.startHour || !schedule.startMinute) return '시작 시간을 입력해주세요.';
      if (!schedule.endHour || !schedule.endMinute) return '종료 시간을 입력해주세요.';
    }
    
    if (!salaryType) return '급여 형태를 선택해주세요.';
    if (!salaryAmount) return '급여액을 입력해주세요.';
    if (!paymentDay) return '급여 지급일을 선택해주세요.';
    if (!paymentMethod) return '급여 지급 방법을 선택해주세요.';
    if (!insuranceType) return '4대보험 적용 방식을 선택해주세요.';
    
    return null;
  };

  /**
   * 계약서 생성 (표준 필드명 준수)
   */
  const handleGenerateContract = async () => {
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      // ✅ 표준 필드명 우선 사용 (FIELD_NAMING_STANDARD.md 참조)
      const contractData = {
        // 🔥 표준 필드: userId (Firebase UID)
        userId: selectedEmployeeId,
        
        // 직원 정보
        employeeName,
        employeeBirth,
        employeePhone,
        employeeAddress,
        
        // 회사/매장 정보
        // 🔥 표준 필드: storeId (UUID), storeName (표시용)
        storeId: selectedStoreId,
        storeName: workStore,
        companyCEO,
        companyBusinessNumber,
        companyPhone,
        companyAddress,
        
        // 계약 정보
        contractType,
        isAdditional,
        
        // 계약 기간
        // 🔥 표준 필드: startDate, endDate
        startDate,
        endDate,
        
        // 직책
        position,
        
        // 근무 조건
        schedules,
        breakTime,
        
        // 급여 조건
        // 🔥 표준 필드: salaryType, salaryAmount
        salaryType,
        salaryAmount: Number(salaryAmount),
        salaryPaymentDay: paymentDay,
        paymentMethod,
        
        // 수당
        allowances: {
          overtime: allowOvertime,
          night: allowNight,
          holiday: allowHoliday,
          weeklyHoliday: false, // 기본값
        },
        
        // 4대보험
        insurance: {
          type: insuranceType || 'none',
          severancePay: allowSeverancePay,
        },
        
        // 계약서 내용
        contractContent,
      };

      // Firestore에 저장
      const { addDoc, collection, Timestamp } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, COLLECTIONS.CONTRACTS), {
        ...contractData,
        companyId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'draft',
        isSigned: false,
      });

      console.log('✅ 계약서 저장 완료:', docRef.id);
      alert('계약서가 생성되었습니다!');
      onClose();
    } catch (error) {
      console.error('❌ 계약서 생성 실패:', error);
      alert('계약서 생성에 실패했습니다.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            📝 {isAdditional ? '추가 계약서 작성' : '근로계약서 작성'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'form' | 'preview')} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="form" className="gap-2">
                <FileEdit className="w-4 h-4" />
                작성하기
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="w-4 h-4" />
                미리보기
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" onClick={() => alert('저장 기능 추후 구현')}>
              <Save className="w-4 h-4 mr-2" />
              임시 저장
            </Button>
          </div>

          {/* ==================== 작성 폼 탭 ==================== */}
          <TabsContent value="form" className="space-y-6">
            {/* 1. 기본 정보 */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">1. 기본 정보</h3>
                
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-slate-700">👤 근로자 (직원) 정보</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="employeeSelect">직원 선택 *</Label>
                      <Select
                        value={selectedEmployeeId}
                        onValueChange={(value) => {
                          setSelectedEmployeeId(value);
                          loadEmployeeInfo(value);
                        }}
                        disabled={!!employeeId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id!}>
                              {emp.name} ({emp.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>이름 *</Label>
                      <Input value={employeeName} readOnly className="bg-slate-50" />
                    </div>
                    
                    <div>
                      <Label>주민등록번호 *</Label>
                      <Input 
                        value={employeeBirth} 
                        readOnly 
                        className="bg-slate-50"
                        placeholder="123456-1234567" 
                      />
                    </div>
                    
                    <div>
                      <Label>주소 *</Label>
                      <Input 
                        value={employeeAddress}
                        onChange={(e) => setEmployeeAddress(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>연락처 *</Label>
                      <Input 
                        value={employeePhone}
                        onChange={(e) => setEmployeePhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-md font-semibold text-slate-700">🏢 사용자 (회사) 정보</h4>
                  
                  <div>
                    <Label htmlFor="storeSelect">매장 선택 *</Label>
                    <Select
                      value={selectedStoreId}
                      onValueChange={(value) => {
                        setSelectedStoreId(value);
                        loadStoreInfo(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map(store => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      💡 매장 정보는 '매장 관리' 탭에서 관리할 수 있습니다.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>대표자명 *</Label>
                      <Input value={companyCEO} readOnly className="bg-slate-50" />
                    </div>
                    
                    <div>
                      <Label>사업자등록번호 *</Label>
                      <Input value={companyBusinessNumber} readOnly className="bg-slate-50" />
                    </div>
                    
                    <div>
                      <Label>회사 연락처 *</Label>
                      <Input value={companyPhone} readOnly className="bg-slate-50" />
                    </div>
                    
                    <div>
                      <Label>사업장 주소 *</Label>
                      <Input value={companyAddress} readOnly className="bg-slate-50" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. 계약 정보 */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">2. 계약 정보</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>계약 유형 *</Label>
                    <Select value={contractType} onValueChange={setContractType}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="정규직">정규직</SelectItem>
                        <SelectItem value="계약직">계약직</SelectItem>
                        <SelectItem value="시간제">시간제</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>근무 매장 *</Label>
                    <Input value={workStore} readOnly className="bg-slate-50" />
                  </div>
                  
                  <div>
                    <Label>계약 시작일 *</Label>
                    <Input 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>계약 종료일</Label>
                    <Input 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">기간의 정함이 없는 경우 비워두세요</p>
                  </div>
                  
                  <div className="col-span-2">
                    <Label>직책/직무 *</Label>
                    <Input 
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="바리스타, 매니저 등"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. 근무 조건 */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">3. 근무 조건</h3>
                
                {schedules.map((schedule, index) => (
                  <div key={index} className="space-y-4 p-4 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-slate-700">시간대 {index + 1}</h4>
                      {schedules.length > 1 && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => removeSchedule(index)}
                        >
                          삭제
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label>근무일 *</Label>
                      <div className="flex gap-2 mt-2">
                        {['월', '화', '수', '목', '금', '토', '일'].map(day => (
                          <Button
                            key={day}
                            type="button"
                            variant={schedule.days.includes(day) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleDay(index, day)}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>시작 시간 *</Label>
                        <div className="flex gap-2">
                          <Select 
                            value={schedule.startHour}
                            onValueChange={(v) => {
                              const newSchedules = [...schedules];
                              newSchedules[index].startHour = v;
                              setSchedules(newSchedules);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="시" />
                            </SelectTrigger>
                            <SelectContent>
                              {renderHourOptions()}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={schedule.startMinute}
                            onValueChange={(v) => {
                              const newSchedules = [...schedules];
                              newSchedules[index].startMinute = v;
                              setSchedules(newSchedules);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="분" />
                            </SelectTrigger>
                            <SelectContent>
                              {renderMinuteOptions()}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label>종료 시간 *</Label>
                        <div className="flex gap-2">
                          <Select 
                            value={schedule.endHour}
                            onValueChange={(v) => {
                              const newSchedules = [...schedules];
                              newSchedules[index].endHour = v;
                              setSchedules(newSchedules);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="시" />
                            </SelectTrigger>
                            <SelectContent>
                              {renderHourOptions()}
                            </SelectContent>
                          </Select>
                          <Select 
                            value={schedule.endMinute}
                            onValueChange={(v) => {
                              const newSchedules = [...schedules];
                              newSchedules[index].endMinute = v;
                              setSchedules(newSchedules);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="분" />
                            </SelectTrigger>
                            <SelectContent>
                              {renderMinuteOptions()}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" onClick={addSchedule} className="w-full">
                  ➕ 시간대 추가
                </Button>
                
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold text-slate-700">휴게시간 (선택사항)</h4>
                  
                  {/* ⚠️ 법정 휴게시간 경고 메시지 */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>근로기준법 제54조 (휴게시간)</strong>
                        <ul className="mt-1 space-y-0.5 text-xs">
                          <li>• 4시간 이상 근무 시 <strong>30분 이상</strong> 휴게시간 필수</li>
                          <li>• 8시간 이상 근무 시 <strong>1시간 이상</strong> 휴게시간 필수</li>
                          <li>• 휴게시간 미준수 시 <strong>법적 제재</strong> 대상이 될 수 있습니다</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>휴게시간 길이</Label>
                      <div className="flex gap-2">
                        <Select value={breakTime.hours} onValueChange={(v) => setBreakTime({...breakTime, hours: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="시간" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0시간</SelectItem>
                            <SelectItem value="1">1시간</SelectItem>
                            <SelectItem value="2">2시간</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={breakTime.minutes} onValueChange={(v) => setBreakTime({...breakTime, minutes: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="분" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0분</SelectItem>
                            <SelectItem value="15">15분</SelectItem>
                            <SelectItem value="30">30분</SelectItem>
                            <SelectItem value="45">45분</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>휴게시간 시작</Label>
                      <div className="flex gap-2">
                        <Select value={breakTime.startHour} onValueChange={(v) => setBreakTime({...breakTime, startHour: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="시" />
                          </SelectTrigger>
                          <SelectContent>
                            {renderHourOptions()}
                          </SelectContent>
                        </Select>
                        <Select value={breakTime.startMinute} onValueChange={(v) => setBreakTime({...breakTime, startMinute: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="분" />
                          </SelectTrigger>
                          <SelectContent>
                            {renderMinuteOptions()}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>휴게시간 종료</Label>
                      <div className="flex gap-2">
                        <Select value={breakTime.endHour} onValueChange={(v) => setBreakTime({...breakTime, endHour: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="시" />
                          </SelectTrigger>
                          <SelectContent>
                            {renderHourOptions()}
                          </SelectContent>
                        </Select>
                        <Select value={breakTime.endMinute} onValueChange={(v) => setBreakTime({...breakTime, endMinute: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="분" />
                          </SelectTrigger>
                          <SelectContent>
                            {renderMinuteOptions()}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. 급여 조건 */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">4. 급여 조건</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>급여 형태 *</Label>
                    <Select value={salaryType} onValueChange={setSalaryType}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="시급">시급</SelectItem>
                        <SelectItem value="월급">월급</SelectItem>
                        <SelectItem value="연봉">연봉</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>급여액 *</Label>
                    <Input 
                      type="number"
                      value={salaryAmount}
                      onChange={(e) => setSalaryAmount(e.target.value)}
                      placeholder="금액 입력"
                    />
                  </div>
                  
                  <div>
                    <Label>급여 지급일 *</Label>
                    <Select value={paymentDay} onValueChange={setPaymentDay}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="매월 10일">매월 10일</SelectItem>
                        <SelectItem value="매월 25일">매월 25일</SelectItem>
                        <SelectItem value="매월 말일">매월 말일</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>급여 지급 방법 *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="계좌이체">계좌이체</SelectItem>
                        <SelectItem value="현금">현금</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5. 급여 지급 항목 설정 */}
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">5. 급여 지급 항목 설정</h3>
                <p className="text-sm text-slate-600">
                  💡 이 직원의 급여 계산 시 적용할 수당 항목을 선택하세요. (매장 설정 기준으로 자동 선택됨)
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border">
                    <Checkbox 
                      id="allowOvertime"
                      checked={allowOvertime}
                      onCheckedChange={(checked) => setAllowOvertime(checked as boolean)}
                    />
                    <Label htmlFor="allowOvertime" className="cursor-pointer">
                      연장근로수당 (시급 × 1.5배)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border">
                    <Checkbox 
                      id="allowNight"
                      checked={allowNight}
                      onCheckedChange={(checked) => setAllowNight(checked as boolean)}
                    />
                    <Label htmlFor="allowNight" className="cursor-pointer">
                      야간근로수당 (22:00~06:00)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border">
                    <Checkbox 
                      id="allowHoliday"
                      checked={allowHoliday}
                      onCheckedChange={(checked) => setAllowHoliday(checked as boolean)}
                    />
                    <Label htmlFor="allowHoliday" className="cursor-pointer">
                      휴일근로수당 (시급 × 1.5배)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Check className="w-4 h-4 text-green-600" />
                    <Label className="text-green-700">
                      주휴수당 (주 15시간 이상 근무 시 자동 적용)
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 6. 4대보험 적용 */}
            <Card className="border-2 border-red-200 bg-red-50/30">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">6. 4대보험 적용</h3>
                
                <div>
                  <Label>4대보험 및 세금 적용 방식 *</Label>
                  <Select value={insuranceType} onValueChange={setInsuranceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 적용 (국민연금+건강+장기요양+고용+산재)</SelectItem>
                      <SelectItem value="employment_only">고용·산재보험만 (단시간 근로자)</SelectItem>
                      <SelectItem value="freelancer">소득세만 적용 (프리랜서 3.3%)</SelectItem>
                      <SelectItem value="none">완전 적용 안 함 (세금 없음)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {insuranceType && (
                  <div className="p-4 bg-white rounded-lg border text-sm text-slate-600">
                    {insuranceType === 'all' && '✅ 전체 4대보험 및 소득세가 적용됩니다.'}
                    {insuranceType === 'employment_only' && '✅ 고용보험과 산재보험만 적용됩니다.'}
                    {insuranceType === 'freelancer' && '✅ 소득세 3.3%만 적용됩니다.'}
                    {insuranceType === 'none' && '⚠️ 모든 보험과 세금이 적용되지 않습니다.'}
                  </div>
                )}
                
                <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border">
                  <Checkbox 
                    id="allowSeverancePay"
                    checked={allowSeverancePay}
                    onCheckedChange={(checked) => setAllowSeverancePay(checked as boolean)}
                  />
                  <Label htmlFor="allowSeverancePay" className="cursor-pointer">
                    <strong>퇴직금 적용 대상</strong> (주 15시간 이상 근무, 1년 이상 근속)
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* 7. 계약서 본문 */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">7. 계약서 본문 (선택사항)</h3>
                
                <div>
                  <Label>계약서 추가 내용</Label>
                  <Textarea 
                    value={contractContent}
                    onChange={(e) => setContractContent(e.target.value)}
                    placeholder="기본 템플릿이 자동으로 제공됩니다. 필요시 수정하세요."
                    className="min-h-[300px]"
                  />
                  <p className="text-xs text-slate-500 mt-1">특약사항이나 추가 내용이 있으면 입력하세요</p>
                </div>
              </CardContent>
            </Card>

            {/* 액션 버튼 */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => alert('임시 저장 기능 추후 구현')}>
                  📁 임시 저장
                </Button>
                <Button onClick={() => setActiveTab('preview')}>
                  미리보기 →
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ==================== 미리보기 탭 ==================== */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6 p-8 bg-white">
                  <h1 className="text-3xl font-bold text-center mb-8">근 로 계 약 서</h1>
                  
                  <p className="text-sm">
                    <strong>{workStore || '_______'}</strong> (이하 "사용자"라 함)와{' '}
                    <strong>{employeeName || '_______'}</strong> (이하 "근로자"라 함)는 다음과 같이 근로계약을 체결한다.
                  </p>
                  
                  <table className="w-full border-collapse border border-slate-300">
                    <tbody>
                      <tr>
                        <th className="border border-slate-300 bg-slate-100 p-3 text-left w-1/3">근로자 (직원) 정보</th>
                        <td className="border border-slate-300 p-3">
                          <div>성명: {employeeName || '_______'}</div>
                          <div>주민등록번호: {employeeBirth || '_______'}</div>
                          <div>주소: {employeeAddress || '_______'}</div>
                          <div>연락처: {employeePhone || '_______'}</div>
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-100 p-3 text-left">사용자 (회사) 정보</th>
                        <td className="border border-slate-300 p-3">
                          <div>상호: {workStore || '_______'}</div>
                          <div>대표자: {companyCEO || '_______'}</div>
                          <div>사업자등록번호: {companyBusinessNumber || '_______'}</div>
                          <div>회사 전화번호: {companyPhone || '_______'}</div>
                          <div>사업장 주소: {companyAddress || '_______'}</div>
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-100 p-3 text-left">계약 기간</th>
                        <td className="border border-slate-300 p-3">
                          {startDate || '_______'} ~ {endDate || '기간의 정함이 없음'}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-100 p-3 text-left">근무 장소</th>
                        <td className="border border-slate-300 p-3">{workStore || '_______'}</td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-100 p-3 text-left">업무 내용</th>
                        <td className="border border-slate-300 p-3">{position || '_______'}</td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-100 p-3 text-left">근무 일시</th>
                        <td className="border border-slate-300 p-3">
                          {schedules.map((sch, i) => (
                            <div key={i} className="mb-2">
                              <div>근무일: {sch.days.join(', ') || '_______'}</div>
                              <div>
                                근무시간: {sch.startHour && sch.startMinute ? `${sch.startHour}:${sch.startMinute}` : '_____'} ~ {sch.endHour && sch.endMinute ? `${sch.endHour}:${sch.endMinute}` : '_____'}
                              </div>
                            </div>
                          ))}
                          {breakTime.hours && breakTime.minutes && (
                            <div>휴게시간: {breakTime.hours}시간 {breakTime.minutes}분</div>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <th className="border border-slate-300 bg-slate-100 p-3 text-left">급여 조건</th>
                        <td className="border border-slate-300 p-3">
                          <div>{salaryType || '_______'}: {salaryAmount ? Number(salaryAmount).toLocaleString() : '_______'}원</div>
                          <div>지급일: {paymentDay || '_______'}</div>
                          <div>지급방법: {paymentMethod || '_______'}</div>
                          {allowSeverancePay && (
                            <div className="mt-2 text-slate-600 text-sm">
                              • 1년 이상 근속 시 퇴직금 지급 대상에 해당
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  
                  {contractContent && (
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm whitespace-pre-wrap">
                      {contractContent}
                    </div>
                  )}
                  
                  <div className="text-center mt-12">
                    <strong>{startDate || '20__년 __월 __일'}</strong>
                  </div>
                  
                  <div className="flex justify-around mt-12">
                    <div className="text-center">
                      <p>사용자 {workStore || '_______'}</p>
                      <p className="mt-8">대표이사: {companyCEO || '_______'} (인)</p>
                    </div>
                    <div className="text-center">
                      <p>근로자</p>
                      <p className="mt-8">{employeeName || '_______'} (인)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 액션 버튼 */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setActiveTab('form')}>
                ← 수정하기
              </Button>
              <Button onClick={handleGenerateContract} className="bg-blue-600 hover:bg-blue-700">
                계약서 생성
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
