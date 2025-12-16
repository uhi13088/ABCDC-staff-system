/**
 * Emergency Recruitment Modal
 * 긴급 근무 모집 모달
 * 
 * 백업: admin-dashboard.html 라인 7757-7902
 * 🆕 Phase F: React.forwardRef 적용으로 Dialog ref 경고 해결
 */

'use client';

import { useState, useEffect, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';
import * as storeService from '@/services/storeService';
import * as openShiftService from '@/services/openShiftService';

interface EmergencyRecruitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  currentUserId: string;
  currentUserName: string;
}

interface Store {
  id: string;
  name: string;
}

export const EmergencyRecruitmentModal = forwardRef<HTMLDivElement, EmergencyRecruitmentModalProps>(
  ({ isOpen, onClose, companyId, currentUserId, currentUserName }, ref) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 폼 데이터
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [incentive, setIncentive] = useState('');
  const [description, setDescription] = useState('');

  /**
   * 매장 목록 로드
   */
  useEffect(() => {
    if (isOpen && companyId) {
      loadStores();
      // 오늘 날짜 기본값 설정
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, companyId]);

  const loadStores = async () => {
    try {
      const storesList = await storeService.getStores(companyId);
      setStores(
        storesList.map((s) => ({
          id: s.id!,
          name: s.name || s.storeName || '',
        }))
      );
    } catch (error) {
      console.error('❌ 매장 목록 로드 실패:', error);
    }
  };

  /**
   * 매장 선택 핸들러
   */
  const handleStoreChange = (value: string) => {
    const selected = stores.find((s) => s.id === value);
    if (selected) {
      setStoreId(selected.id);
      setStoreName(selected.name);
    }
  };

  /**
   * 폼 초기화
   */
  const resetForm = () => {
    setStoreId('');
    setStoreName('');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('');
    setEndTime('');
    setIncentive('');
    setDescription('');
  };

  /**
   * 긴급 모집 제출
   * 백업: admin-dashboard.html 라인 7852-7892
   */
  const handleSubmit = async () => {
    try {
      // 유효성 검사
      if (!storeId || !date || !startTime || !endTime || !incentive) {
        alert('⚠️ 모든 필수 항목을 입력해주세요.');
        return;
      }

      setLoading(true);

      // 공고 생성
      await openShiftService.createOpenShift({
        companyId,
        storeId,
        storeName,
        date,
        startTime,
        endTime,
        type: 'extra', // 긴급 모집은 항상 'extra' 타입
        wageIncentive: Number(incentive),
        description,
        createdBy: currentUserId,
        createdByName: currentUserName,
      });

      alert('✅ 긴급 근무 모집 공고가 등록되었습니다!');
      resetForm();
      onClose();
      
      // 모집 현황 새로고침은 부모 컴포넌트에서 처리
      
    } catch (error) {
      console.error('❌ 긴급 모집 제출 실패:', error);
      alert('❌ 공고 등록에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 모달 닫기
   */
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>➕ 긴급 근무 모집</DialogTitle>
          <DialogDescription>
            결근이나 추가 인력이 필요한 경우 긴급 근무를 모집하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 매장 선택 */}
          <div className="space-y-2">
            <Label htmlFor="store">
              매장 <span className="text-red-500">*</span>
            </Label>
            <Select value={storeId} onValueChange={handleStoreChange}>
              <SelectTrigger>
                <SelectValue placeholder="매장 선택" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 근무 날짜 */}
          <div className="space-y-2">
            <Label htmlFor="date">
              근무 날짜 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* 시작/종료 시간 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">
                시작 시간 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">
                종료 시간 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* 추가 시급 */}
          <div className="space-y-2">
            <Label htmlFor="incentive">
              추가 시급 (원) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="incentive"
              type="number"
              placeholder="예: 5000"
              min="0"
              step="1000"
              value={incentive}
              onChange={(e) => setIncentive(e.target.value)}
            />
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>기본 시급에 추가되는 인센티브입니다.</span>
            </div>
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">설명 (선택)</Label>
            <Textarea
              id="description"
              placeholder="예: 주말 피크타임 추가 인력 필요"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? '등록 중...' : '📢 공고 올리기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// displayName 설정 (React DevTools에서 컴포넌트 이름 표시용)
EmergencyRecruitmentModal.displayName = 'EmergencyRecruitmentModal';
