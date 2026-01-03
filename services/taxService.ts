/**
 * ========================================
 * TaxService - 세무사 연동 및 급여 대장 생성
 * ========================================
 * 
 * 기능:
 * 1. 급여 대장 엑셀/PDF 생성
 * 2. 세무사 이메일 발송
 * 3. 은행 이체용 엑셀 다운로드
 */

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import type { SalaryCalculationResult } from '@/lib/types/salary';

// ========================================
// 타입 정의
// ========================================

export interface PayrollRecord {
  employeeName: string;        // 직원명
  employeeId: string;          // 주민번호 앞자리
  storeName: string;           // 매장명
  basePay: number;             // 기본급
  totalAllowances: number;     // 총 수당
  totalDeductions: number;     // 총 공제액
  netPay: number;              // 실지급액
  
  // 은행 이체용
  bankName?: string;           // 은행명
  accountNumber?: string;      // 계좌번호
  accountHolder?: string;      // 예금주
}

export interface PayrollSummary {
  yearMonth: string;           // 급여 월 (YYYY-MM)
  companyName: string;         // 회사명
  totalEmployees: number;      // 총 직원 수
  totalBasePay: number;        // 총 기본급
  totalAllowances: number;     // 총 수당
  totalDeductions: number;     // 총 공제액
  totalNetPay: number;         // 총 실지급액
  records: PayrollRecord[];    // 직원별 급여 내역
  generatedAt: Date;           // 생성 일시
}

// ========================================
// 급여 대장 데이터 수집
// ========================================

/**
 * 월별 급여 대장 데이터 수집
 */
export async function collectPayrollData(
  companyId: string,
  yearMonth: string
): Promise<PayrollSummary> {
  console.log('📊 급여 대장 데이터 수집:', { companyId, yearMonth });
  
  // 1. 회사 정보 조회
  const companyDoc = await getDoc(doc(db, COLLECTIONS.COMPANIES, companyId));
  const companyName = companyDoc.exists() ? companyDoc.data().name : '회사명';
  
  // 2. 해당 월의 급여 데이터 조회
  const salaryQuery = query(
    collection(db, COLLECTIONS.SALARY),
    where('companyId', '==', companyId),
    where('yearMonth', '==', yearMonth)
  );
  
  const salarySnapshot = await getDocs(salaryQuery);
  
  const records: PayrollRecord[] = [];
  let totalBasePay = 0;
  let totalAllowances = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;
  
  for (const salaryDoc of salarySnapshot.docs) {
    const salaryData = salaryDoc.data() as SalaryCalculationResult;
    
    // 직원 정보 조회 (은행 계좌 정보 포함)
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, salaryData.userId || salaryData.employeeUid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    const record: PayrollRecord = {
      employeeName: salaryData.employeeName || '직원',
      employeeId: userData.birth?.slice(0, 6) || '000000', // 주민번호 앞 6자리
      storeName: salaryData.storeName || '매장',
      basePay: salaryData.basePay || 0,
      totalAllowances: salaryData.totalAllowances || 0,
      totalDeductions: salaryData.totalDeductions || 0,
      netPay: salaryData.netPay || 0,
      
      // 은행 이체용 (users 컬렉션에서 조회)
      bankName: userData.bankName || '',
      accountNumber: userData.accountNumber || '',
      accountHolder: userData.name || salaryData.employeeName || '',
    };
    
    records.push(record);
    
    totalBasePay += record.basePay;
    totalAllowances += record.totalAllowances;
    totalDeductions += record.totalDeductions;
    totalNetPay += record.netPay;
  }
  
  // 직원명으로 정렬
  records.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  
  console.log(`✅ 급여 대장 수집 완료: ${records.length}명`);
  
  return {
    yearMonth,
    companyName,
    totalEmployees: records.length,
    totalBasePay,
    totalAllowances,
    totalDeductions,
    totalNetPay,
    records,
    generatedAt: new Date(),
  };
}

// ========================================
// 엑셀 생성 (CSV 형식)
// ========================================

/**
 * 급여 대장 엑셀 생성 (CSV)
 */
export function generatePayrollCSV(summary: PayrollSummary): string {
  const lines: string[] = [];
  
  // 헤더
  lines.push(`"급여 대장"`);
  lines.push(`"회사명:","${summary.companyName}"`);
  lines.push(`"급여 월:","${summary.yearMonth}"`);
  lines.push(`"생성일:","${summary.generatedAt.toLocaleDateString('ko-KR')}"`);
  lines.push('');
  
  // 요약
  lines.push(`"총 인원:","${summary.totalEmployees}명"`);
  lines.push(`"총 기본급:","${summary.totalBasePay.toLocaleString()}원"`);
  lines.push(`"총 수당:","${summary.totalAllowances.toLocaleString()}원"`);
  lines.push(`"총 공제액:","${summary.totalDeductions.toLocaleString()}원"`);
  lines.push(`"총 실지급액:","${summary.totalNetPay.toLocaleString()}원"`);
  lines.push('');
  
  // 테이블 헤더
  lines.push('"직원명","주민번호 앞자리","매장","기본급","수당","공제액","실지급액"');
  
  // 데이터
  for (const record of summary.records) {
    lines.push(
      `"${record.employeeName}","${record.employeeId}","${record.storeName}",` +
      `"${record.basePay}","${record.totalAllowances}","${record.totalDeductions}","${record.netPay}"`
    );
  }
  
  return lines.join('\n');
}

/**
 * 은행 이체용 엑셀 생성 (CSV)
 */
export function generateBankTransferCSV(summary: PayrollSummary): string {
  const lines: string[] = [];
  
  // 헤더
  lines.push(`"은행 이체용 급여 대장"`);
  lines.push(`"급여 월:","${summary.yearMonth}"`);
  lines.push(`"생성일:","${summary.generatedAt.toLocaleDateString('ko-KR')}"`);
  lines.push('');
  
  // 테이블 헤더
  lines.push('"은행명","계좌번호","예금주","실지급액"');
  
  // 데이터 (계좌 정보가 있는 직원만)
  for (const record of summary.records) {
    if (record.bankName && record.accountNumber) {
      lines.push(
        `"${record.bankName}","${record.accountNumber}","${record.accountHolder}","${record.netPay}"`
      );
    }
  }
  
  return lines.join('\n');
}

// ========================================
// 다운로드 헬퍼
// ========================================

/**
 * CSV 파일 다운로드
 */
export function downloadCSV(content: string, filename: string): void {
  // UTF-8 BOM 추가 (엑셀 한글 깨짐 방지)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  
  // 메모리 정리
  URL.revokeObjectURL(link.href);
}

/**
 * 급여 대장 엑셀 다운로드
 */
export async function downloadPayrollExcel(
  companyId: string,
  yearMonth: string
): Promise<void> {
  console.log('📥 급여 대장 엑셀 다운로드 시작');
  
  const summary = await collectPayrollData(companyId, yearMonth);
  const csv = generatePayrollCSV(summary);
  
  const filename = `급여대장_${summary.companyName}_${yearMonth}.csv`;
  downloadCSV(csv, filename);
  
  console.log('✅ 다운로드 완료:', filename);
}

/**
 * 은행 이체용 엑셀 다운로드
 */
export async function downloadBankTransferExcel(
  companyId: string,
  yearMonth: string
): Promise<void> {
  console.log('📥 은행 이체용 엑셀 다운로드 시작');
  
  const summary = await collectPayrollData(companyId, yearMonth);
  const csv = generateBankTransferCSV(summary);
  
  const filename = `은행이체_${summary.companyName}_${yearMonth}.csv`;
  downloadCSV(csv, filename);
  
  console.log('✅ 다운로드 완료:', filename);
}

// ========================================
// 이메일 발송 (세무사)
// ========================================

/**
 * 세무사에게 급여 대장 이메일 발송
 * 
 * 주의: 실제 이메일 발송은 백엔드 API 또는 Cloud Function 필요
 * 여기서는 mailto: 링크 생성 또는 API 호출 준비
 */
export async function sendPayrollToTaxAccountant(
  companyId: string,
  yearMonth: string,
  taxAccountantEmail: string
): Promise<void> {
  console.log('📧 세무사 이메일 발송 준비:', {
    companyId,
    yearMonth,
    email: taxAccountantEmail,
  });
  
  const summary = await collectPayrollData(companyId, yearMonth);
  
  // CSV 데이터 생성
  const csvData = generatePayrollCSV(summary);
  
  // Base64 인코딩 (이메일 첨부용)
  const base64Data = btoa(unescape(encodeURIComponent(csvData)));
  
  // mailto: 링크 생성 (간단한 방법)
  const subject = encodeURIComponent(`[급여 대장] ${summary.companyName} ${yearMonth}`);
  const body = encodeURIComponent(
    `안녕하세요.\n\n` +
    `${summary.companyName}의 ${yearMonth} 급여 대장을 전달드립니다.\n\n` +
    `총 인원: ${summary.totalEmployees}명\n` +
    `총 실지급액: ${summary.totalNetPay.toLocaleString()}원\n\n` +
    `첨부 파일을 확인해주시기 바랍니다.\n\n` +
    `감사합니다.`
  );
  
  // mailto 링크
  const mailtoLink = `mailto:${taxAccountantEmail}?subject=${subject}&body=${body}`;
  
  // 브라우저 기본 메일 앱 열기
  window.location.href = mailtoLink;
  
  console.log('✅ 메일 앱 열기 완료');
  
  // TODO: 실제 프로덕션에서는 백엔드 API 또는 Cloud Function 사용
  // 예: await fetch('/api/send-email', { method: 'POST', body: JSON.stringify({ ... }) });
}

// ========================================
// Export
// ========================================

export default {
  collectPayrollData,
  generatePayrollCSV,
  generateBankTransferCSV,
  downloadPayrollExcel,
  downloadBankTransferExcel,
  sendPayrollToTaxAccountant,
};
