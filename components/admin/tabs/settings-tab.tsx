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
        <CardDescription>스케줄 시뮬레이터 설정</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center py-12 text-gray-500">🚧 설정 탭 개발 중...</p>
      </CardContent>
    </Card>
  );
}
