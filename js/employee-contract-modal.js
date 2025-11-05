// ===================================================================
// 직원용 계약서 상세보기 모달
// 관리자 페이지와 동일한 포맷
// ===================================================================

/**
 * 계약서 원본 보기 (모달 형태)
 * @param {string} contractId - 계약서 ID
 */
async function viewEmployeeContract(contractId) {
  try {
    // Firestore에서 계약서 찾기
    const docRef = db.collection('contracts').doc(contractId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      alert('⚠️ 계약서를 찾을 수 없습니다.');
      return;
    }
    
    const contract = docSnap.data();
    
    // 서명된 계약서 정보 가져오기
    const signedDocRef = db.collection('signedContracts').doc(contractId);
    const signedDocSnap = await signedDocRef.get();
    const signedContract = signedDocSnap.exists ? signedDocSnap.data() : null;
    
    showEmployeeContractModal(contract, contractId, signedContract);
  } catch (error) {
    console.error('❌ 계약서 조회 실패:', error);
    alert('⚠️ 계약서 데이터를 불러올 수 없습니다.');
  }
}

/**
 * 계약서 모달 표시
 */
function showEmployeeContractModal(contract, contractId, signedContract) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
  modal.id = 'employeeContractModal';
  
  const isSigned = !!signedContract;
  
  // 서명 정보 HTML
  let signatureHtml = '';
  if (isSigned && signedContract.signature) {
    const signDate = new Date(signedContract.signedAt);
    
    // 매장별 대표 서명 가져오기 (Firestore에서)
    db.collection('stores').get().then(snapshot => {
      const stores = [];
      snapshot.forEach(doc => stores.push({ id: doc.id, ...doc.data() }));
      const store = stores.find(s => s.name === contract.workStore);
      const ceoSignature = store?.ceoSignature || '';
      
      const signatureSection = document.querySelector('#employeeContractModal .signature-section');
      if (signatureSection) {
        signatureSection.innerHTML = `
          <div style="margin-top: 50px;">
            <p style="margin-bottom: 20px; font-size: 16px; text-align: center;"><strong>서명일: ${signDate.toLocaleDateString('ko-KR')}</strong></p>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 40px;">
              <!-- 사용자(대표) 서명 -->
              <div style="flex: 1; text-align: center;">
                ${ceoSignature ? `
                  <img src="${ceoSignature}" alt="대표 서명" style="width: 200px; height: 80px; display: block; margin: 0 auto; object-fit: contain;">
                ` : `
                  <div style="width: 200px; height: 80px; border: 2px dashed #ddd; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: #999;">
                    <span>대표 서명 미등록</span>
                  </div>
                `}
                <p style="margin-top: 8px; font-weight: 600; font-size: 14px;">사용자: ${contract.companyCEO || contract.companyName} (인)</p>
              </div>
              
              <!-- 근로자 서명 -->
              <div style="flex: 1; text-align: center;">
                <img src="${signedContract.signature}" alt="근로자 서명" style="width: 200px; height: 80px; display: block; margin: 0 auto; object-fit: contain;">
                <p style="margin-top: 8px; font-weight: 600; font-size: 14px;">근로자: ${contract.employeeName} (서명)</p>
              </div>
            </div>
          </div>
        `;
      }
    });
    
    signatureHtml = '<div class="signature-section"></div>';
  } else {
    signatureHtml = `
      <div style="margin-top: 50px; text-align: right; padding: 20px; background: #fff3cd; border: 2px dashed #ffc107; border-radius: 4px;">
        <p style="color: #856404; font-weight: 600;">⚠️ 아직 서명되지 않은 계약서입니다.</p>
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 1000px; max-height: 95vh; overflow-y: auto; padding: 0; background: white; border-radius: 8px;">
      <!-- 상단 컨트롤 바 (인쇄 시 숨김) -->
      <div id="employeeContractControls" style="position: sticky; top: 0; background: white; z-index: 100; padding: 16px; border-bottom: 2px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 20px;">📄 계약서 원본 보기</h3>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" onclick="downloadEmployeeContractPDF('${contractId}')">📥 PDF 저장</button>
          <button class="btn btn-secondary" onclick="printEmployeeContract()">🖨️ 인쇄</button>
          <button class="btn" style="background: #6c757d; color: white;" onclick="closeEmployeeContractModal()">✕ 닫기</button>
        </div>
      </div>
      
      <!-- A4 계약서 본문 -->
      <div id="employeeContractPrintArea" style="width: 190mm; margin: 0 auto; background: white;">
        
        <!-- 1페이지: 계약서 테이블 -->
        <div>
          <!-- 계약서 제목 -->
          <h1 style="text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 12px; margin: 0 0 30px 0;">근 로 계 약 서</h1>
          
          <!-- 서문 -->
          <p style="line-height: 1.8; margin-bottom: 25px; font-size: 14px;">
            <strong>${contract.companyName}</strong> (이하 "사용자"라 함)와 <strong>${contract.employeeName}</strong> (이하 "근로자"라 함)는 다음과 같이 근로계약을 체결한다.
          </p>
          
          <!-- 계약 내용 테이블 -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
            <tr>
              <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; width: 25%; text-align: left;">근로자 정보</th>
              <td style="border: 1px solid #333; padding: 10px; line-height: 1.8;">
                <div>성명: ${contract.employeeName}</div>
                <div>주민등록번호: ${contract.employeeBirth}</div>
                <div>주소: ${contract.employeeAddress}</div>
                <div>연락처: ${contract.employeePhone}</div>
              </td>
            </tr>
            <tr>
              <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: left;">사용자 정보</th>
              <td style="border: 1px solid #333; padding: 10px; line-height: 1.8;">
                <div>회사명: ${contract.companyName}</div>
                <div>대표자: ${contract.companyCEO || '-'}</div>
                <div>사업자등록번호: ${contract.companyBusinessNumber || '-'}</div>
                <div>연락처: ${contract.companyPhone || '-'}</div>
                <div>주소: ${contract.companyAddress || '-'}</div>
              </td>
            </tr>
            <tr>
              <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: left;">계약 기간</th>
              <td style="border: 1px solid #333; padding: 10px;">${contract.startDate} ~ ${contract.endDate}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: left;">근무 장소</th>
              <td style="border: 1px solid #333; padding: 10px;">${contract.workStore}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: left;">업무 내용</th>
              <td style="border: 1px solid #333; padding: 10px;">${contract.position}</td>
            </tr>
            <tr>
              <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: left;">근무 일시</th>
              <td style="border: 1px solid #333; padding: 10px; line-height: 1.8;">
                <div>근무일: ${contract.workDays}</div>
                <div>근무시간: ${contract.workTime}</div>
                <div>휴게시간: ${contract.breakTime || '근로기준법 준수'}</div>
              </td>
            </tr>
            <tr>
              <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: left;">급여 조건</th>
              <td style="border: 1px solid #333; padding: 10px; line-height: 1.8;">
                <div>${contract.wageType}: ${contract.wageAmount}원</div>
                <div>지급일: ${contract.paymentDay || '매월 말일'}</div>
                <div>지급방법: ${contract.paymentMethod || '계좌이체'}</div>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- 2페이지부터: 계약 본문 + 서명란 -->
        <div class="page-break-before">
          <!-- 계약서 본문 -->
          ${(contract.contractContent || contract.contractBody) ? `
            <div style="white-space: pre-line; line-height: 1.8; margin-bottom: 25px; font-size: 13px; border: 1px solid #ddd; padding: 15px; background: #fafafa;">
              ${contract.contractContent || contract.contractBody}
            </div>
          ` : ''}
          
          <!-- 계약 일자 -->
          <p style="text-align: center; margin-top: 40px; margin-bottom: 50px; font-size: 16px; font-weight: 600;">
            ${contract.contractDate || new Date(contract.createdAt).toLocaleDateString('ko-KR')}
          </p>
          
          <!-- 서명란 -->
          ${signatureHtml}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 모달 외부 클릭 시 닫기
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeEmployeeContractModal();
    }
  });
}

/**
 * 모달 닫기
 */
function closeEmployeeContractModal() {
  const modal = document.getElementById('employeeContractModal');
  if (modal) modal.remove();
}

/**
 * 인쇄하기
 */
function printEmployeeContract() {
  // 컨트롤 바 숨기기
  const controls = document.getElementById('employeeContractControls');
  if (controls) controls.style.display = 'none';
  
  window.print();
  
  // 인쇄 후 컨트롤 바 다시 표시
  setTimeout(() => {
    if (controls) controls.style.display = 'flex';
  }, 100);
}

/**
 * PDF 저장
 */
async function downloadEmployeeContractPDF(contractId) {
  const contractArea = document.getElementById('employeeContractPrintArea');
  if (!contractArea) {
    alert('❌ 계약서를 찾을 수 없습니다.');
    return;
  }
  
  try {
    // Firestore에서 계약서 정보 가져오기
    const docRef = db.collection('contracts').doc(contractId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      alert('❌ 계약서를 찾을 수 없습니다.');
      return;
    }
    
    const contract = docSnap.data();
    const fileName = `근로계약서_${contract.employeeName}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // 서명된 계약서 정보 가져오기
    const signedDocRef = db.collection('signedContracts').doc(contractId);
    const signedDocSnap = await signedDocRef.get();
    const signedContract = signedDocSnap.exists ? signedDocSnap.data() : null;
    
    // PDF 생성 시작 알림
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10001; text-align: center;';
    loadingDiv.innerHTML = '<p style="margin: 0; font-size: 16px; font-weight: 600;">📄 PDF 생성 중...</p><p style="margin-top: 8px; font-size: 14px; color: #666;">잠시만 기다려주세요...</p>';
    document.body.appendChild(loadingDiv);
    
    // PDF 생성 전 padding 제거 (margin으로 대체)
    const originalPadding = contractArea.style.padding;
    contractArea.style.padding = '0';
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const opt = {
      margin: 10, // 상하좌우 1cm (10mm)
      filename: fileName,
      image: { 
        type: 'jpeg', 
        quality: 0.98 
      },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { 
        mode: 'css',  // CSS 모드만 사용 (자연스러운 페이지 나누기)
        before: '.page-break-before',
        after: '.page-break-after'
      }
    };
    
    html2pdf().set(opt).from(contractArea).save().then(() => {
      // padding 복원
      contractArea.style.padding = originalPadding;
      document.body.removeChild(loadingDiv);
      console.log('✅ PDF 생성 완료:', fileName);
      alert('✅ PDF 다운로드 완료!');
    }).catch(err => {
      // padding 복원
      contractArea.style.padding = originalPadding;
      document.body.removeChild(loadingDiv);
      console.error('❌ PDF 생성 실패:', err);
      alert('❌ PDF 생성에 실패했습니다:\n' + err.message);
    });
  } catch (error) {
    console.error('❌ PDF 생성 오류:', error);
    alert('❌ PDF 생성에 실패했습니다.');
  }
}

// 인쇄 스타일 추가
const style = document.createElement('style');
style.textContent = `
  @media print {
    body * {
      visibility: hidden;
    }
    
    #employeeContractPrintArea,
    #employeeContractPrintArea * {
      visibility: visible;
    }
    
    #employeeContractPrintArea {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      box-shadow: none !important;
    }
    
    #employeeContractControls {
      display: none !important;
    }
    
    .avoid-page-break {
      page-break-inside: avoid;
    }
  }
`;
document.head.appendChild(style);
