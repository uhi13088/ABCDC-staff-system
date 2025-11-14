// ===================================================================
// 계약서 상세보기 공통 모듈
// ===================================================================
// 관리자 페이지(admin-dashboard.html)와 직원 페이지(employee.html) 공통 사용
// 한 번 수정하면 두 페이지 모두에 반영됩니다.
// ===================================================================

/**
 * 계약서 상세보기 모달
 * @param {string} id - 계약서 ID
 */
window.viewContract = async function viewContract(id) {
  try {
    // Firestore에서 계약서 찾기
    const db = firebase.firestore();
    const docRef = db.collection('contracts').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      alert('⚠️ 계약서를 찾을 수 없습니다.');
      return;
    }
    
    const contract = docSnap.data();
    
    // 같은 직원의 모든 계약서 찾기 (Firestore만)
    const allContracts = [];
    
    const snapshot = await db.collection('contracts').get();
    snapshot.forEach(doc => {
      const c = doc.data();
      if (c.employeeBirth === contract.employeeBirth && c.employeeName === contract.employeeName) {
        allContracts.push({
          id: doc.id,
          data: c,
          createdAt: c.createdAt || new Date().toISOString()
        });
      }
    });
    
    // 날짜순 정렬 (최신순)
    allContracts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    await showContractViewModal(contract, id, allContracts);
  } catch (e) {
    console.error('❌ 계약서 조회 실패:', e);
    alert('⚠️ 계약서 데이터를 불러올 수 없습니다.');
  }
}

/**
 * 계약서 상세보기 모달 표시
 * @param {Object} contract - 계약서 데이터
 * @param {string} currentId - 현재 계약서 ID
 * @param {Array} allContracts - 모든 계약서 목록
 */
window.showContractViewModal = async function showContractViewModal(contract, currentId, allContracts = []) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.id = 'contractViewModal';
  
  // 서명 정보 확인 (Firestore에서 직접 로드)
  let signedContract = null;
  let isSigned = false;
  
  // 1. signedContractsCache가 있으면 사용 (admin에서 미리 로드한 경우)
  if (typeof signedContractsCache !== 'undefined' && signedContractsCache.length > 0) {
    signedContract = signedContractsCache.find(sc => sc.id === contract.id);
    isSigned = !!signedContract;
  } else {
    // 2. 없으면 Firestore에서 직접 로드 (employee 페이지)
    try {
      const db = firebase.firestore();
      const signedDoc = await db.collection('signedContracts').doc(contract.id).get();
      if (signedDoc.exists) {
        signedContract = { id: signedDoc.id, ...signedDoc.data() };
        isSigned = true;
      }
    } catch (error) {
      console.warn('⚠️ 서명 정보 조회 실패:', error);
    }
  }
  
  // 계약서 선택 드롭다운 생성 (여러 계약서가 있을 경우)
  let contractSelectorHtml = '';
  if (allContracts.length > 1) {
    const options = allContracts.map((c, index) => {
      const date = new Date(c.createdAt);
      const dateStr = date.toLocaleDateString('ko-KR');
      const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const label = `${dateStr} ${timeStr}${index === 0 ? ' (최신)' : ''}`;
      const selected = c.id === currentId ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${label}</option>`;
    }).join('');
    
    contractSelectorHtml = `
      <div style="margin-bottom: 16px; padding: 12px; background: #e3f2fd; border-radius: 4px; border-left: 4px solid #2196f3;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <label style="font-weight: 600; margin: 0; white-space: nowrap;">📋 계약서 선택:</label>
          <select id="contractVersionSelector" style="flex: 1; font-size: 14px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;" onchange="switchContractVersion(this.value)">
            ${options}
          </select>
          <span style="background: var(--primary-color); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">총 ${allContracts.length}건</span>
        </div>
      </div>
    `;
  }
  
  // 서명 정보 HTML
  let signatureHtml = '';
  if (isSigned && signedContract.signature) {
    const signDate = new Date(signedContract.signedAt);
    
    // 매장별 대표 서명 가져오기 (Firestore)
    let ceoSignature = '';
    try {
      const db = firebase.firestore();
      const storeSnapshot = await db.collection('stores')
        .where('name', '==', contract.workStore)
        .limit(1)
        .get();
      if (!storeSnapshot.empty) {
        const storeData = storeSnapshot.docs[0].data();
        ceoSignature = storeData.ceoSignature || '';
      }
    } catch (error) {
      console.warn('⚠️ 매장 서명 조회 실패:', error);
    }
    
    signatureHtml = `
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
  } else {
    signatureHtml = `
      <div style="margin-top: 50px; text-align: right; padding: 20px; background: #fff3cd; border: 2px dashed #ffc107; border-radius: 4px;">
        <p style="color: #856404; font-weight: 600;">⚠️ 아직 서명되지 않은 계약서입니다.</p>
      </div>
    `;
  }
  
  // PDF 저장 및 인쇄 버튼 (관리자/직원 모두 표시)
  const actionButtonsHtml = `
    <button class="btn btn-primary" onclick="downloadContractPDF('${contract.id}')">📥 PDF 저장</button>
    <button class="btn btn-secondary" onclick="printContract()">🖨️ 인쇄</button>
  `;
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 1000px; max-height: 95vh; overflow-y: auto; padding: 0;">
      <!-- 상단 컨트롤 바 -->
      <div id="contractControls" style="position: sticky; top: 0; background: white; z-index: 100; padding: 16px; border-bottom: 2px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 20px;">📄 계약서 상세보기</h3>
        <div style="display: flex; gap: 8px;">
          ${actionButtonsHtml}
          <button class="btn" style="background: #6c757d; color: white;" onclick="closeContractViewModal()">✕ 닫기</button>
        </div>
      </div>
      
      <!-- 드롭다운 -->
      <div id="contractSelector" style="padding: 0 40px; padding-top: 20px;">
        ${contractSelectorHtml}
      </div>
      
      <!-- A4 계약서 본문 -->
      <div id="contractPrintArea" style="width: 160mm; margin: 0 auto; background: white; padding: 40px;">
        
        <!-- 계약서 제목 -->
        <h1 style="text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 12px; margin: 0 0 30px 0;">근 로 계 약 서</h1>
        
        <!-- 서문 -->
        <p style="line-height: 1.8; margin-bottom: 25px; font-size: 14px;">
          <strong>${contract.companyName}</strong> (이하 "사용자"라 함)와 <strong>${contract.employeeName}</strong> (이하 "근로자"라 함)는 다음과 같이 근로계약을 체결한다.
        </p>
        
        <!-- 계약 내용 테이블 -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
          <tr>
            <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; width: 25%; text-align: center;">근로자 정보</th>
            <td style="border: 1px solid #333; padding: 10px; line-height: 1.8; text-align: left;">
              <div>성명: ${contract.employeeName}</div>
              <div>주민등록번호: ${contract.employeeBirth}</div>
              <div>주소: ${contract.employeeAddress}</div>
              <div>연락처: ${contract.employeePhone}</div>
            </td>
          </tr>
          <tr>
            <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: center;">사용자 정보</th>
            <td style="border: 1px solid #333; padding: 10px; line-height: 1.8; text-align: left;">
              <div>회사명: ${contract.companyName}</div>
              <div>대표자: ${contract.companyCEO || '-'}</div>
              <div>사업자등록번호: ${contract.companyBusinessNumber || '-'}</div>
              <div>연락처: ${contract.companyPhone || '-'}</div>
              <div>주소: ${contract.companyAddress || '-'}</div>
            </td>
          </tr>
          <tr>
            <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: center;">계약 기간</th>
            <td style="border: 1px solid #333; padding: 10px; text-align: left;">${contract.contractStartDate || contract.startDate || '-'} ~ ${contract.contractEndDate || contract.endDate || '-'}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: center;">근무 장소</th>
            <td style="border: 1px solid #333; padding: 10px; text-align: left;">${contract.workStore || contract.workPlace || '-'}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: center;">업무 내용</th>
            <td style="border: 1px solid #333; padding: 10px; text-align: left;">${contract.position || contract.employeePosition || '-'}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: center;">근무 일시</th>
            <td style="border: 1px solid #333; padding: 10px; line-height: 1.8; text-align: left;">
              <div>근무일: ${contract.workDays || contract.schedule?.days || '-'}</div>
              <div>근무시간: ${contract.workTime || contract.schedule?.time || '-'}</div>
              <div>휴게시간: ${contract.breakTime || contract.schedule?.breakTime || '근로기준법 준수'}</div>
            </td>
          </tr>
          <tr>
            <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: center;">급여 조건</th>
            <td style="border: 1px solid #333; padding: 10px; line-height: 1.8; text-align: left;">
              <div>${contract.salaryType || contract.wageType || '시급'}: ${(contract.salaryAmount || contract.wageAmount || 0).toLocaleString()}원</div>
              <div>지급일: ${contract.paymentDay || contract.salaryPaymentDay || '매월 말일'}</div>
              <div>지급방법: ${contract.paymentMethod || '계좌이체'}</div>
            </td>
          </tr>
          <tr>
            <th style="border: 1px solid #333; padding: 10px; background: #f5f5f5; font-weight: 600; text-align: center;">기타 내용</th>
            <td style="border: 1px solid #333; padding: 10px; line-height: 1.8; text-align: left;">
              ${contract.insurance ? `
                ${contract.insurance.pension ? '<div>• 국민연금 가입</div>' : ''}
                ${contract.insurance.health ? '<div>• 건강보험 가입</div>' : ''}
                ${contract.insurance.employment ? '<div>• 고용보험 가입</div>' : ''}
                ${contract.insurance.workComp ? '<div>• 산재보험 가입</div>' : ''}
                ${contract.insurance.severancePay ? '<div style="color: #856404;">• 1년 이상 근속 시 퇴직금 지급 대상에 해당</div>' : ''}
              ` : '<div>정보 없음</div>'}
            </td>
          </tr>
        </table>
        
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
  `;
  
  document.body.appendChild(modal);
}

/**
 * 계약서 상세보기 모달 닫기
 */
window.closeContractViewModal = function closeContractViewModal() {
  const modal = document.getElementById('contractViewModal');
  if (modal) modal.remove();
};

/**
 * 계약서 버전 전환
 * @param {string} contractId - 계약서 ID
 */
window.switchContractVersion = function(contractId) {
  closeContractViewModal();
  viewContract(contractId);
};

/**
 * 인쇄 기능
 */
window.printContract = function() {
  window.print();
};

/**
 * PDF 저장 기능 (html2pdf 라이브러리 사용)
 * @param {string} contractId - 계약서 ID
 */
window.downloadContractPDF = function(contractId) {
  const contractArea = document.getElementById('contractPrintArea');
  if (!contractArea) {
    alert('❌ 계약서를 찾을 수 없습니다.');
    return;
  }
  
  // html2pdf 라이브러리 로드 확인
  if (typeof html2pdf === 'undefined') {
    // 라이브러리 동적 로드
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = function() {
      generatePDF(contractArea, contractId);
    };
    document.head.appendChild(script);
  } else {
    generatePDF(contractArea, contractId);
  }
};

/**
 * PDF 생성 함수
 * @param {HTMLElement} element - PDF로 변환할 HTML 요소
 * @param {string} contractId - 계약서 ID
 */
async function generatePDF(element, contractId) {
  // Firestore에서 계약서 가져오기
  let contract = null;
  try {
    const db = firebase.firestore();
    const docRef = await db.collection('contracts').doc(contractId).get();
    if (!docRef.exists) {
      alert('❌ 계약서를 찾을 수 없습니다.');
      return;
    }
    contract = docRef.data();
  } catch (error) {
    console.error('❌ 계약서 조회 실패:', error);
    alert('❌ 계약서를 불러올 수 없습니다.');
    return;
  }
  
  const fileName = `근로계약서_${contract.employeeName}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  // 서명 데이터 가져오기 (Firestore에서 직접 로드)
  let signedContract = null;
  
  // 1. signedContractsCache가 있으면 사용 (admin에서 미리 로드한 경우)
  if (typeof signedContractsCache !== 'undefined' && signedContractsCache.length > 0) {
    signedContract = signedContractsCache.find(sc => sc.id === contract.id);
  } else {
    // 2. 없으면 Firestore에서 직접 로드 (employee 페이지)
    try {
      const db = firebase.firestore();
      const signedDoc = await db.collection('signedContracts').doc(contract.id).get();
      if (signedDoc.exists) {
        signedContract = { id: signedDoc.id, ...signedDoc.data() };
      }
    } catch (error) {
      console.warn('⚠️ 서명 정보 조회 실패:', error);
    }
  }
  
  // 서명이 있으면 다시 그려넣기
  if (signedContract && signedContract.signature) {
    // 기존 서명 제거
    element.querySelectorAll('.avoid-page-break').forEach(div => {
      if (div.querySelector('img[alt="서명"], img[alt="근로자 서명"], img[alt="대표 서명"]')) {
        div.remove();
      }
    });
    
    // 매장별 대표 서명 가져오기
    let ceoSignature = '';
    try {
      const db = firebase.firestore();
      const storeSnapshot = await db.collection('stores')
        .where('name', '==', contract.workStore)
        .limit(1)
        .get();
      if (!storeSnapshot.empty) {
        const storeData = storeSnapshot.docs[0].data();
        ceoSignature = storeData.ceoSignature || '';
      }
    } catch (error) {
      console.warn('⚠️ 매장 서명 조회 실패:', error);
    }
    
    const signDate = new Date(signedContract.signedAt);
    const signatureHtml = `
      <div class="avoid-page-break" style="margin-top: 60px; page-break-inside: avoid;">
        <p style="margin-bottom: 20px; font-size: 16px; text-align: center;"><strong>서명일: ${signDate.toLocaleDateString('ko-KR')}</strong></p>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 40px;">
          <!-- 사용자(대표) 서명 -->
          <div style="flex: 1; text-align: center;">
            ${ceoSignature ? `
              <img src="${ceoSignature}" alt="대표 서명" style="width: 200px; height: 80px; display: block; margin: 0 auto; object-fit: contain;">
            ` : `
              <div style="width: 200px; height: 80px; border: 2px dashed #ddd; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: #999; font-size: 12px;">
                대표 서명 미등록
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
    element.insertAdjacentHTML('beforeend', signatureHtml);
    console.log('✅ 양쪽 서명 재주입 완료');
  }
  
  // PDF 생성 시작 알림
  const loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; text-align: center;';
  loadingDiv.innerHTML = '<p style="margin: 0; font-size: 16px; font-weight: 600;">📄 PDF 생성 중...</p><p style="margin-top: 8px; font-size: 14px; color: #666;">서명 이미지 처리 중...</p>';
  document.body.appendChild(loadingDiv);
  
  // PDF 생성 전 padding 제거
  const originalPadding = element.style.padding;
  element.style.padding = '0';
  
  // 500ms 대기
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
      useCORS: false,
      logging: true,
      letterRendering: true,
      imageTimeout: 0
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait',
      compress: true
    },
    pagebreak: { 
      mode: 'css',
      before: '.page-break-before',
      after: '.page-break-after'
    }
  };
  
  html2pdf().set(opt).from(element).save().then(() => {
    // padding 복원
    element.style.padding = originalPadding;
    document.body.removeChild(loadingDiv);
    console.log('✅ PDF 생성 완료:', fileName);
    alert('✅ PDF 다운로드 완료!');
  }).catch(err => {
    // padding 복원
    element.style.padding = originalPadding;
    document.body.removeChild(loadingDiv);
    console.error('❌ PDF 생성 실패:', err);
    alert('❌ PDF 생성에 실패했습니다:\n' + err.message);
  });
}

console.log('✅ contract-viewer.js 로드 완료');
