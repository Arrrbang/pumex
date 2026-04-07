pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// 핵심 분석 로직: 특정 키워드가 아니라 표의 구조를 분석합니다.
function parseInvoiceData(fullText) {
    // 1. 모든 공백 제거 (글자 깨짐 대응)
    const cleanText = fullText.replace(/\s+/g, '');
    let htmlOutput = "";

    // [환율 추출]
    const rateMatch = cleanText.match(/ExchangeRate-?([\d.]+)/i);
    let exchangeRate = 0;
    if (rateMatch && rateMatch[1]) {
        exchangeRate = parseFloat(rateMatch[1]);
        htmlOutput += `<div class="exchange-info">💱 적용 환율: <strong>${exchangeRate} INR/USD</strong></div>`;
    }

    htmlOutput += `<table class="invoice-table">
                    <thead>
                        <tr><th>항목명 (Item)</th><th>금액 (USD)</th><th>금액 (INR)</th></tr>
                    </thead>
                    <tbody>`;

    // 2. 표 데이터 구간 추출
    // "TAXRATE"라는 단어 바로 뒤부터 "NetAmount" 전까지가 실제 데이터입니다.
    const tablePart = cleanText.match(/TAXRATE([\s\S]+?)NetAmount/i);
    
    if (tablePart) {
        const content = tablePart[1];
        
        // 3. 항목 매칭 (SAC코드 996712를 기준으로 앞뒤를 자름)
        // 패턴: (항목명) + 996712 + USD + (단가) + (단위) + (수량) + (금액)
        // [a-zA-Z/]+ : 영문자와 슬래시만 항목명으로 인정 (헤더 숫자 찌꺼기 방지)
        const rows = content.matchAll(/([a-zA-Z/ ]+?)996712USD[\d.]+[^0-9.]+[\d,.]+(?=[\d,.]+)[\d,.]+/g);

        let hasData = false;

        for (const row of rows) {
            let itemName = row[1];

            // 앞쪽에 붙은 불필요한 대문자(헤더 잔여물) 제거 및 가독성 좋게 띄어쓰기 추가
            // 예: DestinationCharges -> Destination Charges
            itemName = itemName.replace(/([A-Z])/g, ' $1').trim();
            
            // 금액 추출을 위한 두 번째 매칭 (해당 행에서 금액 부분만 다시 정밀 추출)
            const amountMatch = row[0].match(/USD[\d.]+[^0-9.]+([\d,.]+)(?=[\d,.]+)[\d,.]+/);
            
            if (amountMatch) {
              const rawAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
              const amount = Math.floor(rawAmount * 100) / 100;

              if (amount > 2) {
                  hasData = true;
                  let displayUsd = amount.toLocaleString('en-US', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                  });
                  
                  let inrAmount = (amount * (exchangeRate || 0)).toLocaleString('en-US', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                  });

                  htmlOutput += `<tr>
                                  <td class="item-name">${itemName}</td>
                                  <td class="amount-usd">$ ${displayUsd}</td>
                                  <td class="amount-inr">₹ ${inrAmount}</td>
                                </tr>`;
              }
            }
        }

        if (!hasData) {
            htmlOutput += `<tr><td colspan="3" style="text-align:center; padding:20px;">⚠️ 데이터 패턴 매칭 실패</td></tr>`;
        }
    } else {
        htmlOutput += `<tr><td colspan="3" style="text-align:center; padding:20px;">⚠️ 표 시작 지점(TAX RATE)을 찾지 못했습니다.</td></tr>`;
    }

    htmlOutput += `</tbody></table>`;
    return htmlOutput;
}

// 파일 처리 및 드래그앤드롭 이벤트 리스너 (기존과 동일)
const fileInput = document.getElementById('fileInput');
const uploadBox = document.querySelector('.upload-box');
const status = document.getElementById('status');
const resultArea = document.getElementById('resultArea');

async function handleFileProcessing(file) {
    if (!file || file.type !== 'application/pdf') {
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
        
        resultArea.innerHTML = parseInvoiceData(fullText);
        status.innerText = "";

    } catch (error) {
        console.error(error);
        status.innerText = "❌ 오류 발생";
    }
}

fileInput.addEventListener('change', (e) => handleFileProcessing(e.target.files[0]));
uploadBox.addEventListener('click', () => fileInput.click());
uploadBox.addEventListener('dragover', (e) => { e.preventDefault(); uploadBox.classList.add('drag-over'); });
uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('drag-over'));
uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) handleFileProcessing(e.dataTransfer.files[0]);
});
