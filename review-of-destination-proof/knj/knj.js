pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let globalSearchKeys = [];

  // [초기화] 페이지 로드 시 JSON 파일 불러오기
  async function loadKeywords() {
    try {
      // 같은 폴더에 있는 keywords.json 파일을 요청
      const response = await fetch('knj-keywords.json'); 
      if (!response.ok) throw new Error("JSON 파일을 찾을 수 없습니다.");
      
      globalSearchKeys = await response.json();
      console.log("✅ 키워드 리스트 로드 완료:", globalSearchKeys.length + "개");
      
    } catch (error) {
      console.error("키워드 로딩 실패:", error);
      alert("keywords.json 파일을 불러오는데 실패했습니다. (서버 환경인지 확인해주세요)");
    }
  }

  // 페이지 시작 시 바로 로드 실행
  loadKeywords();

// ==========================================
  // 1. 핵심 분석 로직 (업데이트된 리스트 포함)
  // ==========================================
function parseInvoiceData(fullText) {
    if (globalSearchKeys.length === 0) {
      return '<div class="error-msg">⚠️ 키워드 데이터가 로드되지 않았습니다.</div>';
    }

    const cleanText = fullText.replace(/\s+/g, '');
    let htmlOutput = ""; // HTML 문자열을 담을 변수

    // 1. 환율 정보 (별도 박스로 표시)
    const rateMatch = cleanText.match(/ExchangeRate[^\d]*([\d.]+)/i);
    let exchangeRate = 0;

    if (rateMatch && rateMatch[1]) {
      exchangeRate = parseFloat(rateMatch[1]);
      htmlOutput += `<div class="exchange-info">
                        <span class="icon">💱</span> 적용 환율: <strong>${exchangeRate} INR/USD</strong>
                     </div>`;
    } else {
      htmlOutput += `<div class="exchange-info warning">⚠️ 환율 정보를 찾을 수 없습니다.</div>`;
    }

    // 2. 테이블 시작
    htmlOutput += `<table class="invoice-table">
                    <thead>
                        <tr>
                            <th>항목명 (Item)</th>
                            <th>금액 (USD)</th>
                            <th>금액 (INR)</th>
                        </tr>
                    </thead>
                    <tbody>`;

    // 3. 항목 찾기 및 정렬 (기존 로직 유지)
    let foundItems = [];
    globalSearchKeys.forEach(item => {
      const index = cleanText.toLowerCase().indexOf(item.id.toLowerCase());
      if (index !== -1) {
        if (!foundItems.some(f => f.index === index)) {
          foundItems.push({ ...item, index: index });
        }
      }
    });
    foundItems.sort((a, b) => a.index - b.index);

    // 4. 테이블 행(Row) 생성
    let hasData = false;
    for (let i = 0; i < foundItems.length; i++) {
      const currentItem = foundItems[i];
      if (currentItem.label === "END") continue;

      const startIndex = currentItem.index;
      let endIndex = cleanText.length;
      if (i + 1 < foundItems.length) {
        endIndex = foundItems[i + 1].index;
      }

      const chunk = cleanText.substring(startIndex, endIndex);
      const usdMatches = chunk.match(/USD([\d,.]+)/gi);

      if (usdMatches && usdMatches.length > 0) {
        const amounts = usdMatches.map(str => parseFloat(str.replace(/USD/i, '').replace(/,/g, '')));
        const finalAmount = Math.max(...amounts);

        if (finalAmount > 2) {
           hasData = true;
           let displayUsd = finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
           let inrAmount = (finalAmount * (exchangeRate || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
           
           // HTML 행 추가
           htmlOutput += `<tr>
                            <td class="item-name">${currentItem.label}</td>
                            <td class="amount-usd">$ ${displayUsd}</td>
                            <td class="amount-inr">₹ ${inrAmount}</td>
                          </tr>`;
        }
      }
    }

    if (!hasData) {
        htmlOutput += `<tr><td colspan="3" style="text-align:center; padding:20px;">⚠️ 항목을 찾을 수 없습니다.</td></tr>`;
    }

    htmlOutput += `</tbody>`; // tbody 닫기

    htmlOutput += `</table>`; // 테이블 닫기

    return htmlOutput;
}

  const fileInput = document.getElementById('fileInput');
  const uploadBox = document.querySelector('.upload-box');
  const status = document.getElementById('status');
  const resultArea = document.getElementById('resultArea');

  // [공통 함수] 파일 하나를 받아서 처리하는 함수
  async function handleFileProcessing(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }

    status.innerText = "데이터 분석 중...";
    resultArea.innerText = "";

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' '); 
        fullText += pageText + "\n"; 
      }
      
      const parsedResult = parseInvoiceData(fullText);
      resultArea.innerHTML = parsedResult;
      status.innerText = "";

    } catch (error) {
      console.error(error);
      status.innerText = "❌ 오류 발생";
      alert("PDF를 읽는 중 오류가 발생했습니다.");
    }
  }

  // (1) 클릭해서 파일 선택 시
  fileInput.addEventListener('change', function(e) {
    handleFileProcessing(e.target.files[0]);
  });

  // (2) 드래그 앤 드롭 이벤트
  
  // 드래그 진입
  uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault(); // 브라우저가 파일 여는 것 방지
    uploadBox.classList.add('drag-over');
  });

  // 드래그 나감
  uploadBox.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('drag-over');
  });

  // 파일 놓음 (Drop)
  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('drag-over');

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileProcessing(droppedFiles[0]);
    }
  });
