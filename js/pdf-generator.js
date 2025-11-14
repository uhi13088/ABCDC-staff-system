// ===================================================================
// PDF 생성 공통 모듈 (전역 사용)
// ===================================================================
// 전체 시스템에서 PDF 저장 시 동일한 설정과 로직 사용
// CSS 변수처럼 템플릿화된 PDF 생성 시스템
// ===================================================================

/**
 * PDF 생성 기본 설정 (템플릿)
 */
const PDF_CONFIG = {
  // 페이지 설정
  page: {
    format: 'a4',
    orientation: 'portrait',
    unit: 'mm'
  },
  
  // 여백 설정
  margin: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  },
  
  // 이미지 품질
  image: {
    type: 'jpeg',
    quality: 0.98
  },
  
  // HTML to Canvas 설정
  html2canvas: {
    scale: 2,
    useCORS: false,
    logging: true,
    letterRendering: true,
    imageTimeout: 0
  },
  
  // 페이지 분할 설정
  pagebreak: {
    mode: 'css',
    before: '.page-break-before',
    after: '.page-break-after'
  },
  
  // PDF 생성 전 element padding
  elementPadding: '0',
  
  // 대기 시간 (ms)
  waitTime: 500
};

/**
 * 계약서 PDF 생성
 * @param {string} contractId - 계약서 ID
 * @param {Object} options - 추가 옵션
 * @returns {Promise<void>}
 */
window.generateContractPDF = async function(contractId, options = {}) {
  const elementId = options.elementId || 'contractPrintArea';
  const element = document.getElementById(elementId);
  
  if (!element) {
    alert('❌ 계약서를 찾을 수 없습니다.');
    return;
  }
  
  // html2pdf 라이브러리 로드 확인
  if (typeof html2pdf === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = function() {
      generatePDFCore(element, contractId, options);
    };
    document.head.appendChild(script);
  } else {
    await generatePDFCore(element, contractId, options);
  }
};

/**
 * PDF 생성 핵심 로직
 * @param {HTMLElement} element - PDF로 변환할 요소
 * @param {string} contractId - 계약서 ID
 * @param {Object} options - 추가 옵션
 */
async function generatePDFCore(element, contractId, options = {}) {
  const pageType = options.pageType || 'unknown'; // 'admin', 'employee', etc.
  
  // Firestore에서 계약서 가져오기
  let contract = null;
  try {
    const docRef = await firebase.firestore().collection('contracts').doc(contractId).get();
    if (!docRef.exists) {
      alert('❌ 계약서를 찾을 수 없습니다.');
      return;
    }
    contract = docRef.data();
  } catch (error) {
    console.error(`❌ [${pageType}] 계약서 조회 실패:`, error);
    alert('❌ 계약서를 불러올 수 없습니다.');
    return;
  }
  
  const fileName = `근로계약서_${contract.employeeName}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  // 디버깅 로그
  console.log(`🔍 [${pageType}] PDF 생성 시작:`, {
    contractId,
    elementId: element.id,
    htmlLength: element.innerHTML.length
  });
  
  // 서명 데이터 가져오기
  const signedContract = await getSignedContract(contractId, pageType);
  
  // 서명 재주입
  if (signedContract && signedContract.signature) {
    await injectSignatures(element, contract, signedContract, pageType);
  }
  
  // 로딩 표시
  const loadingDiv = showLoadingIndicator();
  
  // PDF 생성 전 padding 설정
  const originalPadding = element.style.padding;
  element.style.padding = PDF_CONFIG.elementPadding;
  
  // 대기
  await new Promise(resolve => setTimeout(resolve, PDF_CONFIG.waitTime));
  
  // PDF 옵션 구성
  const pdfOptions = {
    margin: Object.values(PDF_CONFIG.margin),
    filename: fileName,
    image: PDF_CONFIG.image,
    html2canvas: PDF_CONFIG.html2canvas,
    jsPDF: {
      unit: PDF_CONFIG.page.unit,
      format: PDF_CONFIG.page.format,
      orientation: PDF_CONFIG.page.orientation,
      compress: true
    },
    pagebreak: PDF_CONFIG.pagebreak
  };
  
  // PDF 생성 및 저장
  try {
    await html2pdf().set(pdfOptions).from(element).save();
    element.style.padding = originalPadding;
    hideLoadingIndicator(loadingDiv);
    console.log(`✅ [${pageType}] PDF 생성 완료:`, fileName);
    alert('✅ PDF 다운로드 완료!');
  } catch (err) {
    element.style.padding = originalPadding;
    hideLoadingIndicator(loadingDiv);
    console.error(`❌ [${pageType}] PDF 생성 실패:`, err);
    alert('❌ PDF 생성에 실패했습니다:\n' + err.message);
  }
}

/**
 * 서명 데이터 가져오기
 * @param {string} contractId - 계약서 ID
 * @param {string} pageType - 페이지 타입
 * @returns {Promise<Object|null>}
 */
async function getSignedContract(contractId, pageType) {
  let signedContract = null;
  
  // 1. signedContractsCache 확인 (관리자/직원 페이지 공통)
  if (typeof signedContractsCache !== 'undefined' && signedContractsCache.length > 0) {
    signedContract = signedContractsCache.find(sc => sc.id === contractId);
    console.log(`🔍 [${pageType}] Cache에서 서명 찾음:`, !!signedContract);
  } else {
    // 2. Firestore에서 직접 로드
    console.log(`🔍 [${pageType}] Firestore에서 서명 조회`);
    try {
      const db = firebase.firestore();
      const signedDoc = await db.collection('signedContracts').doc(contractId).get();
      if (signedDoc.exists) {
        signedContract = { id: signedDoc.id, ...signedDoc.data() };
        console.log(`✅ [${pageType}] Firestore에서 서명 찾음`);
      } else {
        console.log(`❌ [${pageType}] 서명 없음`);
      }
    } catch (error) {
      console.warn(`⚠️ [${pageType}] 서명 조회 실패:`, error);
    }
  }
  
  return signedContract;
}

/**
 * 서명 HTML 주입
 * @param {HTMLElement} element - 대상 요소
 * @param {Object} contract - 계약서 데이터
 * @param {Object} signedContract - 서명 데이터
 * @param {string} pageType - 페이지 타입
 */
async function injectSignatures(element, contract, signedContract, pageType) {
  // 기존 서명 제거
  element.querySelectorAll('.avoid-page-break').forEach(div => {
    if (div.querySelector('img[alt="서명"], img[alt="근로자 서명"], img[alt="대표 서명"]')) {
      div.remove();
    }
  });
  
  // 매장별 대표 서명 가져오기
  let ceoSignature = '';
  try {
    const storeSnapshot = await firebase.firestore().collection('stores')
      .where('name', '==', contract.workStore)
      .limit(1)
      .get();
    if (!storeSnapshot.empty) {
      const storeData = storeSnapshot.docs[0].data();
      ceoSignature = storeData.ceoSignature || '';
    }
  } catch (error) {
    console.warn(`⚠️ [${pageType}] 매장 서명 조회 실패:`, error);
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
  console.log(`✅ [${pageType}] 서명 재주입 완료`);
}

/**
 * 로딩 인디케이터 표시
 * @returns {HTMLElement}
 */
function showLoadingIndicator() {
  const loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; text-align: center;';
  loadingDiv.innerHTML = '<p style="margin: 0; font-size: 16px; font-weight: 600;">📄 PDF 생성 중...</p><p style="margin-top: 8px; font-size: 14px; color: #666;">서명 이미지 처리 중...</p>';
  document.body.appendChild(loadingDiv);
  return loadingDiv;
}

/**
 * 로딩 인디케이터 숨김
 * @param {HTMLElement} loadingDiv
 */
function hideLoadingIndicator(loadingDiv) {
  if (loadingDiv && loadingDiv.parentNode) {
    document.body.removeChild(loadingDiv);
  }
}

console.log('✅ pdf-generator.js 로드 완료 (전역 PDF 생성 모듈)');
