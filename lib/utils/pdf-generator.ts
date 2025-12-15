/**
 * 급여명세서 PDF 생성 유틸리티
 * CDN 기반 jsPDF 사용 (클라이언트 사이드 전용)
 */

import { MonthlySalaryResult } from '@/lib/types/salary';

// jsPDF는 동적으로 로드됩니다 (CDN)
declare const jspdf: any;

/**
 * 급여명세서 PDF 생성 및 다운로드
 * @param salary 급여 계산 결과
 * @param companyName 회사명
 */
export async function generateSalaryPDF(
  salary: MonthlySalaryResult,
  companyName: string = 'ABC Staff System'
): Promise<void> {
  // jsPDF CDN 확인
  if (typeof jspdf === 'undefined') {
    console.error('❌ jsPDF가 로드되지 않았습니다.');
    alert('PDF 생성 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  try {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    // 한글 폰트 설정 (기본 폰트 사용)
    doc.setFont('helvetica');

    // 제목
    doc.setFontSize(20);
    doc.text('급여명세서', 105, 20, { align: 'center' });

    // 회사 정보
    doc.setFontSize(12);
    doc.text(companyName, 105, 30, { align: 'center' });

    // 구분선
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    // 기본 정보
    doc.setFontSize(11);
    let yPos = 45;

    doc.text('직원명:', 20, yPos);
    doc.text(salary.employeeName, 50, yPos);
    
    doc.text('급여월:', 120, yPos);
    doc.text(salary.yearMonth, 150, yPos);
    yPos += 8;

    doc.text('매장:', 20, yPos);
    doc.text(salary.storeName || '-', 50, yPos);
    
    doc.text('급여유형:', 120, yPos);
    doc.text(salary.salaryType, 150, yPos);
    yPos += 15;

    // 지급 내역
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('지급 내역', 20, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const paymentItems = [
      ['기본급', salary.basePay],
      ['연장근로수당', salary.overtimePay],
      ['야간근로수당', salary.nightPay],
      ['휴일근로수당', salary.holidayPay],
      ['주휴수당', salary.weeklyHolidayPay],
      ['인센티브', salary.incentivePay],
      ['퇴직금', salary.severancePay],
    ];

    paymentItems.forEach(([label, amount]) => {
      if (amount && amount > 0) {
        doc.text(`${label}:`, 25, yPos);
        doc.text(`${amount.toLocaleString()} 원`, 100, yPos, { align: 'right' });
        yPos += 6;
      }
    });

    // 총 지급액
    yPos += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('총 지급액:', 25, yPos);
    doc.text(`${salary.totalPay.toLocaleString()} 원`, 100, yPos, { align: 'right' });
    yPos += 12;

    // 공제 내역
    doc.setFontSize(12);
    doc.text('공제 내역', 20, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const deductionItems = [
      ['국민연금', salary.nationalPension],
      ['건강보험', salary.healthInsurance],
      ['장기요양보험', salary.longTermCare],
      ['고용보험', salary.employmentInsurance],
      ['소득세', salary.incomeTax],
    ];

    deductionItems.forEach(([label, amount]) => {
      if (amount && amount > 0) {
        doc.text(`${label}:`, 25, yPos);
        doc.text(`${amount.toLocaleString()} 원`, 100, yPos, { align: 'right' });
        yPos += 6;
      }
    });

    // 총 공제액
    yPos += 3;
    doc.setFont('helvetica', 'bold');
    doc.text('총 공제액:', 25, yPos);
    doc.text(`${salary.totalDeductions.toLocaleString()} 원`, 100, yPos, { align: 'right' });
    yPos += 15;

    // 실지급액 (강조)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('실지급액:', 25, yPos);
    doc.text(`${salary.netPay.toLocaleString()} 원`, 100, yPos, { align: 'right' });
    yPos += 15;

    // 근무 정보
    doc.setFontSize(12);
    doc.text('근무 정보', 20, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    doc.text(`총 근무일수: ${salary.workDays}일`, 25, yPos);
    yPos += 6;
    doc.text(`총 근무시간: ${salary.totalWorkHours.toFixed(1)}시간`, 25, yPos);
    yPos += 6;
    
    if (salary.overtimeHours && salary.overtimeHours > 0) {
      doc.text(`연장근무시간: ${salary.overtimeHours.toFixed(1)}시간`, 25, yPos);
      yPos += 6;
    }
    
    if (salary.nightHours && salary.nightHours > 0) {
      doc.text(`야간근무시간: ${salary.nightHours.toFixed(1)}시간`, 25, yPos);
      yPos += 6;
    }

    // 하단 정보
    yPos = 270;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('본 급여명세서는 ABC Staff System에서 자동 생성되었습니다.', 105, yPos, { align: 'center' });
    yPos += 4;
    doc.text(`생성일시: ${new Date().toLocaleString('ko-KR')}`, 105, yPos, { align: 'center' });

    // PDF 다운로드
    const fileName = `급여명세서_${salary.employeeName}_${salary.yearMonth}.pdf`;
    doc.save(fileName);

    console.log('✅ PDF 생성 완료:', fileName);
  } catch (error) {
    console.error('❌ PDF 생성 실패:', error);
    alert('급여명세서 PDF 생성에 실패했습니다.');
    throw error;
  }
}

/**
 * jsPDF CDN 스크립트 로드
 * public/index.html 또는 _app.tsx에서 호출
 */
export function loadJsPDFScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('서버 사이드에서는 사용할 수 없습니다.'));
      return;
    }

    // 이미 로드되어 있으면 바로 resolve
    if (typeof jspdf !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('jsPDF CDN 로드 실패'));
    document.head.appendChild(script);
  });
}
