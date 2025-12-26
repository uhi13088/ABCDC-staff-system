/**
 * Settings Tab
 * 시스템 설정 탭
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

interface SettingsTabProps {
  companyId: string;
}

export default function SettingsTab({ companyId }: SettingsTabProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          시스템 설정
        </CardTitle>
        <CardDescription>공휴일 관리 및 시스템 설정</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 시스템 설정 영역 */}
        <div>
          <h3 className="text-lg font-semibold mb-2">시스템 설정</h3>
          <p className="text-sm text-gray-500">추후 추가될 시스템 설정 영역입니다.</p>
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              💡 공휴일은 매년 1월 1일 00:00에 자동으로 동기화됩니다.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
