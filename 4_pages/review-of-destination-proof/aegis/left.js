// alim.js

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const alimCodeMap = {
  "100019": "Customs Clearance Services (Import)",
  "100003": "Delivery Services",
  "100021": "Heavy Item handling Services",
  "100042": "Port Charges",
  "100040": "Customes Duty (Bayan Charges)",
  "100050": "Non Palletization Charges",
  "100041": "DO Charges",
  "100049": "Fasah Truck Appointment Charges",
  "100026": "Shuttling Services",
  "100023": "Additional Services",
  "100011": "Warehouse Handling",
  "100048": "Dettention Charges"
};

let globalDocTotalSar = 0;
let globalDocTotalUsd = 0;
let globalItems = [];

// [신규] 숫자 -> 사우디/아랍 숫자 변환 함수
function toArabicNumerals(numStr) {
    if (!numStr) return "";
    const map = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    return numStr.toString().replace(/[0-9]/g, (w) => map[+w]);
}

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map(item => item.str).join(' ') + "\n";
  }
  return fullText.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, "");
}

function parseAlimInvoice(rawText) {
  const normalizedText = rawText.replace(/\s+/g, ' ');

  const sarMatch = normalizedText.match(/Grand Total\s+([\d,]+\.\d{2})/i);
  let usdMatch = normalizedText.match(/([\d,]+\.\d{2})\s+USD/i); 
  if (!usdMatch) usdMatch = normalizedText.match(/USD\s+([\d,]+\.\d{2})/i);

  globalDocTotalSar = sarMatch ? parseFloat(sarMatch[1].replace(/,/g, '')) : 0;
  globalDocTotalUsd = usdMatch ? parseFloat(usdMatch[1].replace(/,/g, '')) : 0;

  globalItems = [];
  for (const [code, label] of Object.entries(alimCodeMap)) {
      const regex = new RegExp(`${code}\\s+([\\d,]+\\.\\d{2})`);
      const match = normalizedText.match(regex);
      if (match) {
          globalItems.push({ 
              isManual: false, 
              index: match.index, 
              code: code,
              label: label, 
              sar: parseFloat(match[1].replace(/,/g, '')),
              manualUsd: null 
          });
      }
  }
  globalItems.sort((a, b) => a.index - b.index);
  
  renderTable();
}

function renderTable() {
    const resultBox = document.getElementById('result1');
    
    let html = `
      <div class="calc-info-box">
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
              <span>📄 PDF 문서 총액 (SAR): <strong>${globalDocTotalSar.toLocaleString()}</strong></span>
              <span>📄 PDF 문서 총액 (USD): <strong>${globalDocTotalUsd.toLocaleString()}</strong></span>
          </div>
          <div id="calcStatus" style="font-size:0.9em; color:#555;">계산 대기 중...</div>
      </div>

      <table class="invoice-table" id="alimTable">
          <thead>
              <tr>
                  <th class="col-idx">#</th>
                  <th>Item Details</th>
                  <th class="col-sar-ar">SAR (AR)</th>
                  <th class="col-sar">SAR</th>
                  <th class="col-input">Manual USD</th>
                  <th class="col-final">Final USD</th>
                  <th class="col-del"></th>
              </tr>
          </thead>
          <tbody>
    `;

    if (globalItems.length === 0) {
        html += `<tr><td colspan="7" style="text-align:center; padding:20px;">항목이 없습니다.</td></tr>`;
    } else {
        globalItems.forEach((item, idx) => {
            const rowNum = idx + 1;
            
            // 이름
            let nameHtml = item.isManual 
                ? `<input type="text" class="data-input" value="${item.label}" oninput="updateData(${idx}, 'label', this.value)" placeholder="항목명 입력">`
                : `${item.label} <span style="color:#aaa; font-size:0.8em;">(${item.code})</span>`;

            // SAR 값 포맷팅
            const sarVal = item.sar || 0;
            const sarStr = sarVal.toLocaleString('en-US', {minimumFractionDigits:2});
            const sarArabic = toArabicNumerals(sarStr);

            // SAR 입력부
            let sarHtml = item.isManual
                ? `<input type="number" step="0.01" class="data-input sar-input" value="${item.sar}" oninput="updateData(${idx}, 'sar', this.value)">`
                : sarStr;

            let manualUsdVal = (item.manualUsd !== null) ? item.manualUsd : "";
            let delBtn = item.isManual ? `<button class="btn-del" onclick="deleteRow(${idx})"> - </button>` : ``;

            html += `
            <tr id="row-${idx}">
                <td class="col-idx">${rowNum}</td>
                <td>${nameHtml}</td>
                <td class="col-sar-ar" id="sar-ar-${idx}">${sarArabic}</td> <td class="col-sar">${sarHtml}</td>
                <td class="col-input">
                    <input type="number" step="0.01" class="data-input usd-input" value="${manualUsdVal}" placeholder="입력" oninput="updateData(${idx}, 'manualUsd', this.value)">
                </td>
                <td class="col-final" id="final-usd-${idx}">0.00</td>
                <td class="col-del">${delBtn}</td>
            </tr>`;
        });
    }

    html += `</tbody></table>
      <button class="btn-add" onclick="addRow()">[+] 행 추가 (Manual Row)</button>

      <div class="verify-container">
          <div class="verify-box">
              <h4>SAR 검증 (입력 합계 vs PDF)</h4>
              <div id="verify-sar-status">계산 중...</div>
          </div>
          <div class="verify-box">
              <h4>USD 검증 (최종 합계 vs PDF)</h4>
              <div id="verify-usd-status">계산 중...</div>
          </div>
      </div>
    `;

    resultBox.innerHTML = html;
    recalculate();
}

window.updateData = function(idx, field, value) {
    if (field === 'sar' || field === 'manualUsd') {
        value = value === "" ? (field === 'sar' ? 0 : null) : parseFloat(value);
    }
    globalItems[idx][field] = value;
    recalculate();
};

window.addRow = function() {
    globalItems.push({ isManual: true, label: "", code: "MANUAL", sar: 0, manualUsd: null });
    renderTable();
};

window.deleteRow = function(idx) {
    if(confirm("삭제하시겠습니까?")) {
        globalItems.splice(idx, 1);
        renderTable();
    }
};

window.recalculate = function() {
    let sumManualUsd = 0;
    let sumSarOfFixedRows = 0; 
    let calcTotalSar = 0; 

    // 1. 기초 계산 및 사우디 숫자 실시간 업데이트
    globalItems.forEach((item, idx) => {
        const itemSar = item.sar || 0;
        calcTotalSar += itemSar;

        // [신규] 수동 입력 시, 사우디 숫자 칸도 실시간 업데이트
        const sarArCell = document.getElementById(`sar-ar-${idx}`);
        if(sarArCell) {
            const sarStr = itemSar.toLocaleString('en-US', {minimumFractionDigits:2});
            sarArCell.innerText = toArabicNumerals(sarStr);
        }

        if (item.manualUsd !== null && !isNaN(item.manualUsd)) {
            sumManualUsd += item.manualUsd;
            sumSarOfFixedRows += itemSar;
        }
    });

    // 2. 환율 계산
    const remainingUsd = globalDocTotalUsd - sumManualUsd;
    const remainingSar = globalDocTotalSar - sumSarOfFixedRows; 
    
    let dynamicRate = 0;
    if (remainingSar > 0.01) {
        dynamicRate = remainingUsd / remainingSar;
    }

    // 3. UI 업데이트
    let calcTotalUsd = 0;
    globalItems.forEach((item, idx) => {
        const cell = document.getElementById(`final-usd-${idx}`);
        let finalVal = 0;

        if (item.manualUsd !== null && !isNaN(item.manualUsd)) {
            finalVal = item.manualUsd;
            if(cell) cell.style.color = "#2196f3"; 
        } else {
            finalVal = (item.sar || 0) * dynamicRate;
            if(cell) cell.style.color = "#d32f2f"; 
        }

        if(cell) cell.innerText = "$ " + finalVal.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
        calcTotalUsd += finalVal;
    });

    const statusDiv = document.getElementById('calcStatus');
    if(statusDiv) {
        statusDiv.innerHTML = `
            <span style="color:#d32f2f;">● 적용 환율: <strong>${dynamicRate.toFixed(6)}</strong></span> 
        `;
    }

    // 4. 검증 로직
    const sarDiff = calcTotalSar - globalDocTotalSar;
    const sarBox = document.getElementById('verify-sar-status');
    if (Math.abs(sarDiff) < 0.1) {
        sarBox.innerHTML = `<span class="status-ok">[검증 완료]</span> 일치<br>Sum: ${calcTotalSar.toLocaleString()}`;
    } else {
        sarBox.innerHTML = `
            <span class="status-fail">[불일치]</span> 합계: ${calcTotalSar.toLocaleString()} <br>
            <span class="verify-diff">차이: ${sarDiff > 0 ? '+' : ''}${sarDiff.toLocaleString('en-US', {minimumFractionDigits:2})} (PDF보다 ${sarDiff > 0 ? '높음' : '낮음'})</span>
        `;
    }

    const usdDiff = calcTotalUsd - globalDocTotalUsd;
    const usdBox = document.getElementById('verify-usd-status');
    if (Math.abs(usdDiff) < 0.1) {
        usdBox.innerHTML = `<span class="status-ok">[검증 완료]</span> 일치<br>Sum: $${calcTotalUsd.toLocaleString('en-US', {minimumFractionDigits:2})}`;
    } else {
        usdBox.innerHTML = `
            <span class="status-fail">[불일치]</span> 합계: $${calcTotalUsd.toLocaleString('en-US', {minimumFractionDigits:2})} <br>
            <span class="verify-diff">차이: ${usdDiff > 0 ? '+' : ''}${usdDiff.toLocaleString('en-US', {minimumFractionDigits:2})} (PDF보다 ${usdDiff > 0 ? '높음' : '낮음'})</span>
        `;
    }
};

function setupUploader(zoneId, inputId, resultId, statusId) {
  const dropZone = document.getElementById(zoneId);
  const fileInput = document.getElementById(inputId);
  const resultBox = document.getElementById(resultId);
  const statusDiv = document.getElementById(statusId);
  const infoText = dropZone.querySelector('p');

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') { alert('PDF만 가능'); return; }
    statusDiv.innerText = `⏳ ${file.name} 분석 중...`;
    try {
      const rawText = await extractTextFromPDF(file);
      parseAlimInvoice(rawText);
      statusDiv.innerText = "✅ 분석 완료";
    } catch (err) {
      console.error(err);
      resultBox.innerHTML = "❌ 오류 발생";
    }
  };

  dropZone.addEventListener('dragover', (e) => { 
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.add('drag-over'); 
      if(infoText) infoText.innerText = "손을 놓으면 파일이 업로드됩니다!";
  });
  dropZone.addEventListener('dragleave', (e) => { 
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.remove('drag-over'); 
      if(infoText) infoText.innerText = "📂 PDF 파일을 여기로 드래그하세요";
  });
  dropZone.addEventListener('drop', (e) => { 
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.remove('drag-over'); 
      if(infoText) infoText.innerText = "📂 PDF 파일을 여기로 드래그하세요";
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });
}

if (document.getElementById('dropZone1')) {
    setupUploader('dropZone1', 'fileInput1', 'result1', 'status1');
}
