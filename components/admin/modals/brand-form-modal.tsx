/**
 * 브랜드 작성/수정 모달
 * 백업: admin-dashboard.html 라인 719-782
 * 
 * 필드:
 * - 브랜드명
 * - 설명
 * - 로고 업로드 (Firebase Storage)
 * - 주 색상 (Primary Color)
 * - 보조 색상 (Secondary Color)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Upload, Trash2 } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

export interface BrandFormData {
  id?: string;
  name: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyId?: string;
}

interface BrandFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: BrandFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  brand?: BrandFormData;
  companyId: string; // ✅ companyId 필수 추가
}

export function BrandFormModal({ 
  open, 
  onClose, 
  onSave, 
  onDelete,
  brand,
  companyId // ✅ companyId 받기
}: BrandFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4CAF50');
  const [secondaryColor, setSecondaryColor] = useState('#2196F3');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (brand) {
        // 수정 모드
        setName(brand.name || '');
        setDescription(brand.description || '');
        setLogoUrl(brand.logoUrl || '');
        setLogoPreview(brand.logoUrl || '');
        setPrimaryColor(brand.primaryColor || '#4CAF50');
        setSecondaryColor(brand.secondaryColor || '#2196F3');
      } else {
        // 작성 모드
        setName('');
        setDescription('');
        setLogoUrl('');
        setLogoPreview('');
        setPrimaryColor('#4CAF50');
        setSecondaryColor('#2196F3');
      }
    }
  }, [open, brand]);

  /**
   * 로고 파일 업로드 (자동 압축)
   */
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    try {
      setUploading(true);

      // 이미지 압축 옵션
      const options = {
        maxSizeMB: 0.5,          // 최대 500KB로 압축
        maxWidthOrHeight: 800,   // 최대 가로/세로 800px
        useWebWorker: true,      // 웹 워커 사용 (성능 향상)
        fileType: 'image/jpeg',  // JPEG로 변환 (용량 최적화)
      };

      console.log('원본 파일 크기:', (file.size / 1024).toFixed(2), 'KB');

      // 이미지 압축
      const compressedFile = await imageCompression(file, options);
      
      console.log('압축 후 파일 크기:', (compressedFile.size / 1024).toFixed(2), 'KB');

      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(compressedFile);

      // Firebase Storage에 업로드
      const timestamp = Date.now();
      const fileName = file.name.replace(/\.[^/.]+$/, '.jpg'); // 확장자를 .jpg로 변경
      const storageRef = ref(storage, `brands/${companyId}/${timestamp}_${fileName}`);
      const snapshot = await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setLogoUrl(downloadURL);
      console.log('로고 업로드 성공:', downloadURL);
    } catch (error) {
      console.error('로고 업로드 실패:', error);
      alert('로고 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  /**
   * 로고 삭제
   */
  const handleClearLogo = () => {
    setLogoUrl('');
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 브랜드 저장
   */
  const handleSave = async () => {
    if (!name.trim()) {
      alert('⚠️ 브랜드명을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: brand?.id,
        name: name.trim(),
        description: description.trim(),
        logoUrl: logoUrl || undefined,
        primaryColor: primaryColor || '#4CAF50',
        secondaryColor: secondaryColor || '#2196F3',
      });
      onClose();
    } catch (error) {
      console.error('브랜드 저장 실패:', error);
      alert('브랜드 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 브랜드 삭제
   */
  const handleDelete = async () => {
    if (!brand?.id) return;
    
    if (!confirm('정말 이 브랜드를 삭제하시겠습니까?')) return;

    setSaving(true);
    try {
      if (onDelete) {
        await onDelete();
      }
      onClose();
    } catch (error) {
      console.error('브랜드 삭제 실패:', error);
      alert('브랜드 삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            🏷️ {brand ? '브랜드 수정' : '브랜드 추가'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 브랜드명 */}
          <div>
            <Label htmlFor="name">브랜드명 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 맛남살롱"
              disabled={saving}
            />
          </div>

          {/* 설명 */}
          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="브랜드에 대한 간단한 설명"
              rows={3}
              disabled={saving}
            />
          </div>

          {/* 로고 업로드 */}
          <div>
            <Label htmlFor="logo">브랜드 로고</Label>
            <div className="flex gap-2 items-center">
              <Input
                ref={fileInputRef}
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading || saving}
                className="flex-1"
              />
              {logoPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearLogo}
                  disabled={uploading || saving}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            {uploading && <p className="text-sm text-blue-600 mt-1">업로드 중...</p>}
            {logoPreview && !uploading && (
              <div className="mt-2 p-2 border rounded-lg bg-slate-50">
                <img
                  src={logoPreview}
                  alt="로고 미리보기"
                  className="max-w-[200px] max-h-[100px] object-contain"
                />
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              ℹ️ 큰 파일도 자동으로 압축됩니다 (최대 800px, 500KB 이하)
            </p>
          </div>

          {/* 브랜드 색상 설정 */}
          <div>
            <Label>브랜드 색상</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label className="text-sm text-slate-600">주 색상 (Primary)</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-14 h-10 p-1 cursor-pointer"
                    disabled={saving}
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#4CAF50"
                    className="flex-1"
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm text-slate-600">보조 색상 (Secondary)</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-14 h-10 p-1 cursor-pointer"
                    disabled={saving}
                  />
                  <Input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#2196F3"
                    className="flex-1"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              ℹ️ 설정한 색상은 해당 브랜드 직원 및 관리자 대시보드에 적용됩니다.
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <DialogFooter className="flex justify-between">
          <div>
            {brand && onDelete && (
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
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
