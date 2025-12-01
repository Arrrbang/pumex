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
    // 키워드 파일이 아직 로드되지 않았으면 중단
    if (globalSearchKeys.length === 0) {
      return "⚠️ 키워드 데이터(keywords.json)가 로드되지 않았습니다.";
    }

    let output = "";
    const cleanText = fullText.replace(/\s+/g, '');

    // 1. 환율 찾기
    const rateMatch = cleanText.match(/ExchangeRate[^\d]*([\d.]+)/i);
    let exchangeRate = 0;

    if (rateMatch && rateMatch[1]) {
      exchangeRate = parseFloat(rateMatch[1]);
      output += `[정보] 적용 환율: ${exchangeRate} INR/USD\n`;
      output += `----------------------------------------\n`;
    } else {
      output += `[경고] 환율 정보를 찾을 수 없습니다.\n`;
    }

    // 2. 항목 위치 찾기 (로드된 globalSearchKeys 사용)
    let foundItems = [];
    
    globalSearchKeys.forEach(item => {
      const index = cleanText.toLowerCase().indexOf(item.id.toLowerCase());
      if (index !== -1) {
        if (!foundItems.some(f => f.index === index)) {
          foundItems.push({ ...item, index: index });
        }
      }
    });

    // 3. 정렬 및 추출
    foundItems.sort((a, b) => a.index - b.index);

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
           let displayUsd = finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
           let inrAmount = (finalAmount * (exchangeRate || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
           
           output += `${currentItem.label}: USD ${displayUsd} (INR ${inrAmount})\n`;
        }
      }
    }

    if (output === "") return "⚠️ 항목을 찾을 수 없습니다.";

    // 4. 총계 찾기
    const totalMatch = cleanText.match(/(TotalAmount|GrandTotal).*?USD([\d,.]+)/i);
    if(totalMatch) {
       let totalNum = parseFloat(totalMatch[2].replace(/,/g, ''));
       let totalInr = (totalNum * (exchangeRate || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
       let totalUsdDisplay = totalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
       
       output += `----------------------------------------\n`;
       output += `Total Amount: USD ${totalUsdDisplay} (INR ${totalInr})`;
    }

    return output;
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
      resultArea.innerText = parsedResult;
      status.innerText = "✅ 분석 완료";

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
