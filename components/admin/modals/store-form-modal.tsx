/**
 * 매장 작성/수정 모달
 * 백업: admin-dashboard.html 라인 784-1060
 * 
 * 핵심 필드 (1차 구현):
 * - 기본 정보: 매장명, 브랜드, 주소, 연락처, CEO, 사업자번호
 * - 급여 지급일 설정: 매월 지급일, 계산 기간 타입, 사용자 지정 계산 기간
 * - 수당 적용 옵션: 연장근로, 야간근로, 휴일근로
 * - 매장 운영시간: 오픈/마감 시간
 * - 출퇴근 허용시간: 조기출근, 조기퇴근 허용시간
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, Download, RefreshCw } from 'lucide-react';
import { generateStoreQRCode, type QRCodeData } from '@/lib/utils/qr-generator';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';

export interface StoreFormData {
  id?: string;
  name: string;
  brandId?: string;
  companyId: string;
  address?: string;
  phone?: string;
  ceo?: string;
  businessNumber?: string;
  
  // 급여 지급일 설정
  salaryPaymentDay?: string; // '5', '10', '15', '20', '25', '28'
  salaryCalculationType?: string; // 'prev_month_full', 'current_month_full', 'custom'
  calculationStartMonth?: string; // 'prev', 'current'
  calculationStartDay?: string; // '1'~'28'
  calculationEndMonth?: string; // 'prev', 'current'
  calculationEndDay?: string; // '1'~'28', 'last'
  
  // 수당 적용 옵션
  overtimeAllowance?: boolean;
  nightAllowance?: boolean;
  holidayAllowance?: boolean;
  
  // 매장 운영시간
  openTime?: string; // '09:00'
  closeTime?: string; // '22:00'
  
  // 출퇴근 허용시간 (분 단위)
  earlyClockInThreshold?: number; // 조기출근 허용시간 (기본 15분)
  earlyClockOutThreshold?: number; // 조기퇴근 허용시간 (기본 5분)
}

interface StoreFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: StoreFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  store?: StoreFormData;
  brands?: Array<{ id: string; name: string }>;
  companyId: string;
}

export function StoreFormModal({ 
  open, 
  onClose, 
  onSave, 
  onDelete,
  store,
  brands = [],
  companyId
}: StoreFormModalProps) {
  // 기본 정보
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState<string | undefined>(undefined);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [ceo, setCeo] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  
  // 급여 지급일 설정
  const [salaryPaymentDay, setSalaryPaymentDay] = useState<string | undefined>('10');
  const [salaryCalculationType, setSalaryCalculationType] = useState<string | undefined>('prev_month_full');
  const [calculationStartMonth, setCalculationStartMonth] = useState<string | undefined>('prev');
  const [calculationStartDay, setCalculationStartDay] = useState<string | undefined>('1');
  const [calculationEndMonth, setCalculationEndMonth] = useState<string | undefined>('prev');
  const [calculationEndDay, setCalculationEndDay] = useState<string | undefined>('last');
  
  // 수당 적용 옵션
  const [overtimeAllowance, setOvertimeAllowance] = useState(false);
  const [nightAllowance, setNightAllowance] = useState(false);
  const [holidayAllowance, setHolidayAllowance] = useState(false);
  
  // 매장 운영시간
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('22:00');
  
  // 출퇴근 허용시간
  const [earlyClockInThreshold, setEarlyClockInThreshold] = useState(15);
  const [earlyClockOutThreshold, setEarlyClockOutThreshold] = useState(5);
  
  // QR 코드 관련
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [validityHours, setValidityHours] = useState<number>(24);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (store) {
        // 수정 모드
        setName(store.name || '');
        setBrandId(store.brandId);
        setAddress(store.address || '');
        setPhone(store.phone || '');
        setCeo(store.ceo || '');
        setBusinessNumber(store.businessNumber || '');
        
        setSalaryPaymentDay(store.salaryPaymentDay || '10');
        setSalaryCalculationType(store.salaryCalculationType || 'prev_month_full');
        setCalculationStartMonth(store.calculationStartMonth || 'prev');
        setCalculationStartDay(store.calculationStartDay || '1');
        setCalculationEndMonth(store.calculationEndMonth || 'prev');
        setCalculationEndDay(store.calculationEndDay || 'last');
        
        setOvertimeAllowance(store.overtimeAllowance || false);
        setNightAllowance(store.nightAllowance || false);
        setHolidayAllowance(store.holidayAllowance || false);
        
        setOpenTime(store.openTime || '09:00');
        setCloseTime(store.closeTime || '22:00');
        
        setEarlyClockInThreshold(store.earlyClockInThreshold || 15);
        setEarlyClockOutThreshold(store.earlyClockOutThreshold || 5);
      } else {
        // 작성 모드
        setName('');
        setBrandId(undefined);
        setAddress('');
        setPhone('');
        setCeo('');
        setBusinessNumber('');
        
        setSalaryPaymentDay('10');
        setSalaryCalculationType('prev_month_full');
        setCalculationStartMonth('prev');
        setCalculationStartDay('1');
        setCalculationEndMonth('prev');
        setCalculationEndDay('last');
        
        setOvertimeAllowance(false);
        setNightAllowance(false);
        setHolidayAllowance(false);
        
        setOpenTime('09:00');
        setCloseTime('22:00');
        
        setEarlyClockInThreshold(15);
        setEarlyClockOutThreshold(5);
        
        // QR 초기화
        setQrDataUrl('');
        setQrData(null);
      }
    }
  }, [open, store]);

  // 매장 수정 모드일 때 QR 코드 자동 생성
  useEffect(() => {
    if (open && store?.id && name.trim()) {
      handleGenerateQR();
    }
  }, [open, store?.id]);

  /**
   * 계산 기간 미리보기 생성
   */
  const getCalculationPeriodPreview = () => {
    if (salaryCalculationType === 'prev_month_full') {
      return '전월 1일 ~ 전월 말일';
    } else if (salaryCalculationType === 'current_month_full') {
      return '당월 1일 ~ 당월 말일';
    } else if (salaryCalculationType === 'custom') {
      const startMonthText = calculationStartMonth === 'prev' ? '전월' : '당월';
      const endMonthText = calculationEndMonth === 'prev' ? '전월' : '당월';
      const startDayText = calculationStartDay || '1';
      const endDayText = calculationEndDay === 'last' ? '말일' : (calculationEndDay || '1');
      return `${startMonthText} ${startDayText}일 ~ ${endMonthText} ${endDayText}`;
    }
    return '';
  };

  /**
   * QR 코드 생성
   */
  const handleGenerateQR = async () => {
    if (!store?.id || !name.trim()) {
      alert('매장을 먼저 저장해주세요.');
      return;
    }

    setIsGeneratingQR(true);
    try {
      const { dataUrl, qrData: data } = await generateStoreQRCode(
        store.id,
        name.trim(),
        companyId,
        validityHours
      );

      setQrDataUrl(dataUrl);
      setQrData(data);
    } catch (error) {
      console.error('QR 코드 생성 실패:', error);
      alert('QR 코드 생성에 실패했습니다.');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  /**
   * QR 코드 Firestore 저장
   */
  const handleSaveQR = async () => {
    if (!store?.id || !qrData) return;

    try {
      const storeRef = doc(db, COLLECTIONS.STORES, store.id);
      await updateDoc(storeRef, {
        qrCode: JSON.stringify(qrData),
        qrCodeExpiry: Timestamp.fromMillis(qrData.expiry),
        updatedAt: Timestamp.now(),
      });

      alert('QR 코드가 저장되었습니다!');
    } catch (error) {
      console.error('QR 코드 저장 실패:', error);
      alert('QR 코드 저장에 실패했습니다.');
    }
  };

  /**
   * QR 코드 이미지 다운로드
   */
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${name.trim()}_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };

  /**
   * 매장 저장
   */
  const handleSave = async () => {
    if (!name.trim()) {
      alert('⚠️ 매장명을 입력해주세요.');
      return;
    }
    
    if (!salaryPaymentDay) {
      alert('⚠️ 급여 지급일을 선택해주세요.');
      return;
    }
    
    if (!salaryCalculationType) {
      alert('⚠️ 계산 기간 타입을 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: store?.id,
        name: name.trim(),
        brandId: brandId || undefined,
        companyId,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        ceo: ceo.trim() || undefined,
        businessNumber: businessNumber.trim() || undefined,
        
        salaryPaymentDay,
        salaryCalculationType,
        calculationStartMonth: salaryCalculationType === 'custom' ? calculationStartMonth : undefined,
        calculationStartDay: salaryCalculationType === 'custom' ? calculationStartDay : undefined,
        calculationEndMonth: salaryCalculationType === 'custom' ? calculationEndMonth : undefined,
        calculationEndDay: salaryCalculationType === 'custom' ? calculationEndDay : undefined,
        
        overtimeAllowance,
        nightAllowance,
        holidayAllowance,
        
        openTime,
        closeTime,
        
        earlyClockInThreshold,
        earlyClockOutThreshold,
      });
      onClose();
    } catch (error) {
      console.error('매장 저장 실패:', error);
      alert('매장 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 매장 삭제
   */
  const handleDelete = async () => {
    if (!store?.id) return;
    
    if (!confirm('정말 이 매장을 삭제하시겠습니까?')) return;

    setSaving(true);
    try {
      if (onDelete) {
        await onDelete();
      }
      onClose();
    } catch (error) {
      console.error('매장 삭제 실패:', error);
      alert('매장 삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            🏪 {store ? '매장 수정' : '매장 추가'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 1. 기본 정보 */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">기본 정보</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">매장명 *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="부천시청점"
                    disabled={saving}
                  />
                </div>
                
                <div>
                  <Label htmlFor="brandId">브랜드</Label>
                  <Select value={brandId} onValueChange={setBrandId} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue placeholder="선택 안 함 (기본 브랜드)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안 함 (기본 브랜드)</SelectItem>
                      {brands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    ℹ️ 브랜드를 선택하지 않으면 기본 브랜드로 설정됩니다.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="address">주소</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="경기도 부천시..."
                    disabled={saving}
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="032-123-4567"
                    disabled={saving}
                  />
                </div>
                
                <div>
                  <Label htmlFor="ceo">대표자명</Label>
                  <Input
                    id="ceo"
                    value={ceo}
                    onChange={(e) => setCeo(e.target.value)}
                    placeholder="홍길동"
                    disabled={saving}
                  />
                </div>
                
                <div>
                  <Label htmlFor="businessNumber">사업자등록번호</Label>
                  <Input
                    id="businessNumber"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    placeholder="123-45-67890"
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. 급여 지급일 및 계산 기간 */}
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">📅 급여 지급일 및 계산 기간</h3>
              <p className="text-sm text-slate-600">
                매장의 급여 지급일과 계산 기간을 설정하세요. 계약서와 급여 계산에 자동으로 반영됩니다.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salaryPaymentDay">매월 지급일 *</Label>
                  <Select value={salaryPaymentDay} onValueChange={setSalaryPaymentDay} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5일</SelectItem>
                      <SelectItem value="10">10일</SelectItem>
                      <SelectItem value="15">15일</SelectItem>
                      <SelectItem value="20">20일</SelectItem>
                      <SelectItem value="25">25일</SelectItem>
                      <SelectItem value="28">말일 (28일)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="salaryCalculationType">계산 기간 타입 *</Label>
                  <Select value={salaryCalculationType} onValueChange={setSalaryCalculationType} disabled={saving}>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prev_month_full">전월 전체 (전월 1일~말일)</SelectItem>
                      <SelectItem value="current_month_full">당월 전체 (당월 1일~말일)</SelectItem>
                      <SelectItem value="custom">사용자 지정</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* 사용자 지정 계산 기간 */}
              {salaryCalculationType === 'custom' && (
                <div className="p-4 bg-white rounded-lg border space-y-4">
                  <p className="text-sm text-slate-600">
                    <strong>💡 계산 기간 설정 방법:</strong><br />
                    • <strong>전월 기준</strong>: 시작일 "전월", 종료일 "전월"<br />
                    • <strong>당월 기준</strong>: 시작일 "당월", 종료일 "당월"<br />
                    • <strong>전월~당월</strong>: 시작일 "전월", 종료일 "당월"
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="calculationStartMonth">계산 시작 기준</Label>
                      <Select value={calculationStartMonth} onValueChange={setCalculationStartMonth} disabled={saving}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prev">전월</SelectItem>
                          <SelectItem value="current">당월</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Label htmlFor="calculationStartDay">시작일</Label>
                      <Select value={calculationStartDay} onValueChange={setCalculationStartDay} disabled={saving}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={String(day)}>{day}일</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="calculationEndMonth">계산 종료 기준</Label>
                      <Select value={calculationEndMonth} onValueChange={setCalculationEndMonth} disabled={saving}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prev">전월</SelectItem>
                          <SelectItem value="current">당월</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Label htmlFor="calculationEndDay">종료일</Label>
                      <Select value={calculationEndDay} onValueChange={setCalculationEndDay} disabled={saving}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={String(day)}>{day}일</SelectItem>
                          ))}
                          <SelectItem value="last">말일</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* 미리보기 */}
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <p className="text-sm text-slate-700">
                      <strong>📋 계산 기간 미리보기:</strong><br />
                      <span className="text-blue-600 font-semibold">{getCalculationPeriodPreview()}</span>
                    </p>
                  </div>
                </div>
              )}
              
              {/* 안내 메시지 */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>💡 계산 기간 타입 설명:</strong><br />
                  • <strong>전월 전체</strong>: 전월 1일~말일 고정<br />
                  • <strong>당월 전체</strong>: 당월 1일~말일 고정<br />
                  • <strong>사용자 지정</strong>: 원하는 기간 직접 설정
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. 수당 적용 옵션 */}
          <Card className="border-2 border-green-200 bg-green-50/30">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">💰 수당 적용 옵션</h3>
              <p className="text-sm text-slate-600">
                이 매장에서 적용할 수당 항목을 선택하세요. 계약서 작성 시 자동으로 반영됩니다.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border">
                  <Checkbox
                    id="overtimeAllowance"
                    checked={overtimeAllowance}
                    onCheckedChange={(checked) => setOvertimeAllowance(checked as boolean)}
                    disabled={saving}
                  />
                  <Label htmlFor="overtimeAllowance" className="cursor-pointer">
                    연장근로수당 (시급 × 1.5배)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border">
                  <Checkbox
                    id="nightAllowance"
                    checked={nightAllowance}
                    onCheckedChange={(checked) => setNightAllowance(checked as boolean)}
                    disabled={saving}
                  />
                  <Label htmlFor="nightAllowance" className="cursor-pointer">
                    야간근로수당 (22:00~06:00, 시급 × 0.5배)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-white rounded-lg border">
                  <Checkbox
                    id="holidayAllowance"
                    checked={holidayAllowance}
                    onCheckedChange={(checked) => setHolidayAllowance(checked as boolean)}
                    disabled={saving}
                  />
                  <Label htmlFor="holidayAllowance" className="cursor-pointer">
                    휴일근로수당 (시급 × 1.5배)
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. 매장 운영시간 */}
          <Card className="border-2 border-purple-200 bg-purple-50/30">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">🕐 매장 운영시간</h3>
              <p className="text-sm text-slate-600">
                매장의 영업 시작/종료 시간을 설정하세요. 근무 스케줄표는 이 시간 기준으로 앞뒤 3시간씩 표시됩니다.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="openTime">오픈 시간</Label>
                  <Input
                    id="openTime"
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    disabled={saving}
                  />
                </div>
                
                <div>
                  <Label htmlFor="closeTime">마감 시간</Label>
                  <Input
                    id="closeTime"
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>💡 예시:</strong><br />
                  • 오픈 09:00, 마감 22:00 → 스케줄표는 06:00~01:00 표시<br />
                  • 이 시간은 근무 스케줄 타임테이블의 기준이 됩니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 5. 출퇴근 허용시간 설정 */}
          <Card className="border-2 border-orange-200 bg-orange-50/30">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">⏰ 출퇴근 허용시간 설정</h3>
              <p className="text-sm text-slate-600">
                근무시간 전후의 출퇴근 허용범위를 설정하세요. 이 설정에 따라 수당 적용 여부가 결정됩니다.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="earlyClockInThreshold">조기출근 허용시간 (분)</Label>
                  <Input
                    id="earlyClockInThreshold"
                    type="number"
                    min="0"
                    max="60"
                    value={earlyClockInThreshold}
                    onChange={(e) => setEarlyClockInThreshold(Number(e.target.value))}
                    disabled={saving}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    예: 15분 → 근무 시작 15분 전까지 출근 허용
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="earlyClockOutThreshold">조기퇴근 허용시간 (분)</Label>
                  <Input
                    id="earlyClockOutThreshold"
                    type="number"
                    min="0"
                    max="60"
                    value={earlyClockOutThreshold}
                    onChange={(e) => setEarlyClockOutThreshold(Number(e.target.value))}
                    disabled={saving}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    예: 5분 → 근무 종료 5분 전부터 퇴근 허용
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. QR 코드 (매장 수정 시에만 표시) */}
          {store?.id && (
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <QrCode className="w-5 h-5" />
                      출퇴근용 QR 코드
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      이 QR 코드를 매장에 비치하여 직원들이 출퇴근을 기록할 수 있습니다.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="validityHours" className="text-sm">유효시간</Label>
                      <Input
                        id="validityHours"
                        type="number"
                        min="1"
                        max="168"
                        value={validityHours}
                        onChange={(e) => setValidityHours(parseInt(e.target.value) || 24)}
                        className="w-20"
                      />
                      <span className="text-sm text-slate-600">시간</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateQR}
                      disabled={isGeneratingQR}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isGeneratingQR ? 'animate-spin' : ''}`} />
                      재생성
                    </Button>
                  </div>
                </div>

                {/* QR 코드 이미지 */}
                {qrDataUrl ? (
                  <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border-2 border-dashed border-blue-300">
                    <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
                    {qrData && (
                      <div className="mt-4 text-center text-sm text-slate-600 space-y-1">
                        <p className="font-semibold text-lg">{name}</p>
                        <p>
                          유효 기간:{' '}
                          {new Date(qrData.expiry).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadQR}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        다운로드
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveQR}
                      >
                        Firestore에 저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-white rounded-lg border-2 border-dashed border-blue-300">
                    <p className="text-slate-500">QR 코드 생성 중...</p>
                  </div>
                )}
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>사용 방법:</strong><br />
                    1. "다운로드" 버튼으로 QR 코드 이미지를 저장하세요.<br />
                    2. 이미지를 프린트하여 매장에 비치하세요.<br />
                    3. 직원이 스마트폰으로 QR 코드를 스캔하여 출퇴근을 기록합니다.<br />
                    4. QR 코드는 설정한 유효시간 동안만 사용 가능합니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 액션 버튼 */}
        <DialogFooter className="flex justify-between">
          <div>
            {store && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
