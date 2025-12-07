let globalDataMap = {}; 
let globalB3Date = null; 
let currentModalKey = null; 

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');
const modal = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const loadingMsg = document.getElementById('loading-msg');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); 
    dropZone.classList.remove('dragover');
    
    if (e.dataTransfer.files.length) {
        // [중요] 타이머 시작 전에 파일을 미리 변수에 저장해야 함!
        const file = e.dataTransfer.files[0]; 
        
        showLoading(); // 로딩 켜기
        
        // 미리 저장해둔 file 변수를 넘겨줌
        setTimeout(() => {
            processExcel(file);
        }, 50);
    }
});

// 파일 선택 시 실행
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        // 여기도 마찬가지로 미리 저장
        const file = e.target.files[0];
        
        showLoading(); 
        
        setTimeout(() => {
            processExcel(file);
        }, 50);
    }
});

// [신규] 로딩 보여주는 함수
function showLoading(msg = "엑셀 파일 분석 중...") {
    const overlay = document.getElementById('global-loading-overlay');
    const textEl = overlay.querySelector('.loading-text');
    
    // 메시지 설정 (기본값 또는 커스텀)
    if (textEl) textEl.textContent = msg;

    // 화면 보이기
    overlay.style.display = 'flex';

    // (선택사항) 결과 영역 잠시 숨기기 (원하시면 주석 해제)
    // document.getElementById('result-area').style.display = 'none';
    // document.getElementById('control-panel').style.display = 'none';
}

// [수정] 로딩 숨기는 함수
function hideLoading() {
    document.getElementById('global-loading-overlay').style.display = 'none';
}

modalClose.onclick = () => { modal.style.display = "none"; };
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };

// --- 유틸리티 함수 ---
function safeParseFloat(cell) {
    if (!cell) return 0;
    if (cell.t === 'n') return cell.v;
    let valStr = cell.v || cell.w || "0";
    valStr = String(valStr).replace(/,/g, '').trim();
    const parsed = parseFloat(valStr);
    return isNaN(parsed) ? 0 : parsed;
}

function safeGetText(cell) {
    if (!cell) return "";
    return (cell.w || cell.v || "").toString().trim();
}

function fixDate(dateObj) {
    if (!dateObj || isNaN(dateObj)) return dateObj;
    let newDate = new Date(dateObj);
    newDate.setHours(newDate.getHours() + 12);
    return newDate;
}

function getWeekNumber(dateObj) {
    const firstDayOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    const firstDayDay = firstDayOfMonth.getDay();
    const currentDay = dateObj.getDate();
    return Math.ceil((currentDay + firstDayDay) / 7);
}

function getDetailedDateDiff(baseDate, targetDate) {
    let d1 = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    let d2 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    let isPast = true;
    if (d1 < d2) { isPast = false; let temp = d1; d1 = d2; d2 = temp; }
    let years = d1.getFullYear() - d2.getFullYear();
    let months = d1.getMonth() - d2.getMonth();
    let days = d1.getDate() - d2.getDate();
    if (days < 0) { months--; let prevMonthLastDay = new Date(d1.getFullYear(), d1.getMonth(), 0).getDate(); days += prevMonthLastDay; }
    if (months < 0) { years--; months += 12; }
    return { y: years, m: months, d: days, isPast: isPast };
}

function formatNum(num) {
    if (num === 0) return "0";
    if (!num) return "";
    return Number(num.toFixed(2)).toLocaleString('en-US');
}

function formatDate(dateObj) {
    if (!dateObj || isNaN(dateObj)) return "";
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function applyBoundFilter() {
    if (!globalB3Date) return; 
    const dateText = formatDate(globalB3Date);
    renderMainTable(dateText);
}

function filterDetailsByBound(details) {
    const filterType = document.getElementById('bound-filter').value;
    return details.filter(item => {
        const type = (item.type || "").toUpperCase();
        if (filterType === "OUTBOUND") {
            return type === "OO" || type === "AO";
        } else if (filterType === "INBOUND") {
            return type === "OI" || type === "AI";
        } else {
            return true;
        }
    });
}

function adjustFontSizeToFit(scope) {
    const container = scope || document;
    const cells = container.querySelectorAll('.col-name, .auto-shrink');
    
    cells.forEach(cell => {
        let currentSize = 12; 
        cell.style.fontSize = currentSize + 'px';
        cell.style.whiteSpace = 'nowrap'; 
        while (cell.scrollWidth > cell.clientWidth && currentSize > 9) {
            currentSize--;
            cell.style.fontSize = currentSize + 'px';
        }
    });
}

// 비고란 입력 시 데이터 저장 함수
function updateRemark(key, value) {
    if (globalDataMap[key]) {
        globalDataMap[key].remark = value;
    }
}

// --- 메인 로직 ---
function processExcel(file) {
    const reader = new FileReader();
    
    reader.onload = async function(e) { 
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const b3Cell = sheet['B3'];
        globalB3Date = new Date();
        let b3Text = "";

        if (b3Cell) {
            if(b3Cell.t === 'd') {
                globalB3Date = fixDate(b3Cell.v);
                b3Text = formatDate(globalB3Date);
            } else {
                b3Text = b3Cell.v; 
                globalB3Date = new Date(b3Text);
                if(!isNaN(globalB3Date)) globalB3Date = fixDate(globalB3Date);
                else globalB3Date = new Date();
            }
        } else {
            b3Text = "날짜 없음";
        }

        // [수정] 엑셀 파싱 중에 최신 기록 가져오기
        let previousRemarksMap = {}; // { "Code||CUR": Remark } 형태로 저장
        try {
            const latestData = await fetchLatestHistoryForComparison();
            if (latestData) {
                Object.values(latestData).forEach(item => {
                    // [변경] Code와 CUR(item.o)가 모두 있어야 매핑
                    if (item.code && item.o && item.remark) {
                        const compositeKey = item.code + "||" + item.o;
                        previousRemarksMap[compositeKey] = item.remark;
                    }
                });
                console.log("최신 기록 불러오기 성공 (Code+CUR 매칭):", Object.keys(previousRemarksMap).length + "개");
            }
        } catch (err) {
            console.error("최신 기록 비교 실패:", err);
        }


        const range = XLSX.utils.decode_range(sheet['!ref']);
        const headerRowIndex = 5; 
        const colMap = { idxB:-1, idxL:-1, idxN:-1, idxO:-1, idxP:-1, idxR:-1, idxAP:-1, idxBT:-1, idxCode: -1 };

        for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({c: c, r: headerRowIndex})];
            if (!cell || !cell.v) continue;
            const text = String(cell.v).trim();
            if (text === "바운드") colMap.idxB = c;
            else if (text === "H.B/L번호") colMap.idxL = c;
            else if (text === "정산처명") colMap.idxN = c;
            else if (text === "정산처코드") colMap.idxCode = c;
            else if (text === "CUR") colMap.idxO = c;
            else if (text === "DEBIT") colMap.idxP = c;
            else if (text === "CREDIT") colMap.idxR = c;
            else if (text === "관리번호") colMap.idxAP = c;
            else if (text === "배송일자") colMap.idxBT = c;
        }

        globalDataMap = {}; 

        for (let r = 6; r <= range.e.r; r++) {
            const cellB  = colMap.idxB  !== -1 ? sheet[XLSX.utils.encode_cell({c: colMap.idxB, r: r})] : null;
            const cellL  = colMap.idxL  !== -1 ? sheet[XLSX.utils.encode_cell({c: colMap.idxL, r: r})] : null;
            const cellN  = colMap.idxN  !== -1 ? sheet[XLSX.utils.encode_cell({c: colMap.idxN, r: r})] : null;
            const cellCode = colMap.idxCode !== -1 ? sheet[XLSX.utils.encode_cell({c: colMap.idxCode, r: r})] : null;
            const cellO  = colMap.idxO  !== -1 ? sheet[XLSX.utils.encode_cell({c: colMap.idxO, r: r})] : null;
            const cellP  = colMap.idxP  !== -1 ? sheet[XLSX.utils.encode_cell({c: colMap.idxP, r: r})] : null;
            const cellR  = colMap.idxR  !== -1 ? sheet[XLSX.utils.encode_cell({c: colMap.idxR, r: r})] : null;
            const cellAP = colMap.idxAP !== -1 ? sheet[XLSX.utils.encode_cell({c: colMap.idxAP, r: r})] : null;
            const cellBT = colMap.idxBT !== -1 ? sheet[XLSX.utils.encode_cell({c: colMap.idxBT, r: r})] : null;

            if (!cellN || !cellN.v) continue;

            const valN = String(cellN.v).trim();
            const valO = cellO ? String(cellO.v).trim() : "";
            const valCode = cellCode ? String(cellCode.v).trim() : ""; 
            const valB = cellB ? String(cellB.v).trim() : "";
            const valP  = safeParseFloat(cellP);
            const valR  = safeParseFloat(cellR);
            
            let valAP = safeGetText(cellAP);
            if (valAP === "") {
                const valL = safeGetText(cellL);
                if (valL !== "") valAP = "[HBL] " + valL;
            }

            let valBT_Date = null;
            if (cellBT) {
                if (cellBT.t === 'd') valBT_Date = fixDate(cellBT.v);
                else {
                    valBT_Date = new Date(cellBT.v);
                    if(!isNaN(valBT_Date)) valBT_Date = fixDate(valBT_Date);
                }
            }

            const key = valN + "||" + valO;
            if (!globalDataMap[key]) {
                // [변경] 비고란 자동 채우기 조건 강화 (Code + CUR 일치 시)
                let initialRemark = "";
                const lookupKey = valCode + "||" + valO; // 현재 데이터의 키 생성
                
                if (valCode && previousRemarksMap[lookupKey]) {
                    initialRemark = `[이전 기록] ${previousRemarksMap[lookupKey]}`;
                }

                globalDataMap[key] = {
                    n: valN,
                    code: valCode, 
                    o: valO,
                    sumP: 0, 
                    sumR: 0, 
                    remark: initialRemark, // 매칭된 비고 또는 빈 값
                    details: []
                };
            }
            globalDataMap[key].sumP += valP;
            globalDataMap[key].sumR += valR;
            globalDataMap[key].details.push({
                type: valB,
                btDate: valBT_Date,
                apVal: valAP, 
                pVal: valP,
                rVal: valR
            });
        }
        renderMainTable(b3Text);
    };
    reader.readAsBinaryString(file);
}

function renderMainTable(dateText) {
    hideLoading();
    if(loadingMsg) loadingMsg.style.display = 'none';
    document.getElementById('result-area').style.display = 'block';
    document.getElementById('control-panel').style.display = 'flex';
    document.getElementById('date-display').innerText = "DATE : " + dateText;

    const year = globalB3Date.getFullYear();
    const month = globalB3Date.getMonth() + 1;
    const week = getWeekNumber(globalB3Date);
    const titleText = `${year}년 ${month}월 ${week}주차 해외 AGENT 미수금/미지급금`;
    document.getElementById('main-title').innerText = titleText;

    const tbody = document.querySelector('#main-table tbody');
    tbody.innerHTML = "";

    let rawList = Object.values(globalDataMap);
    rawList.sort((a, b) => {
        if (a.n < b.n) return -1; if (a.n > b.n) return 1;
        if (a.o < b.o) return -1; if (a.o > b.o) return 1;
        return 0;
    });

    let displayList = [];

    rawList.forEach((row) => {
        const filteredDetails = filterDetailsByBound(row.details);
        if (filteredDetails.length === 0) return;

        let currentSumP = 0;
        let currentSumR = 0;
        filteredDetails.forEach(d => {
            currentSumP += d.pVal;
            currentSumR += d.rVal;
        });

        displayList.push({
            n: row.n,
            code: row.code, 
            o: row.o,
            sumP: currentSumP,
            sumR: currentSumR,
            remark: row.remark || "", 
            details: filteredDetails, 
            originalKey: row.n + "||" + row.o
        });
    });

    displayList.forEach((row, index) => {
        const tr = document.createElement('tr');
        const diff = row.sumP - row.sumR;
        const count = row.details.length;

        const remarkInput = `<input type="text" class="remark-input" 
            value="${row.remark}" 
            placeholder="" 
            onchange="updateRemark('${row.originalKey}', this.value)"
        >`;

        tr.innerHTML = `
            <td class="col-no">${index + 1}</td>
            <td class="col-code">${row.code || ""}</td>
            <td class="clickable col-name" onclick="openModal('${row.originalKey}')">${row.n}</td>
            <td class="col-count">${count}</td>
            <td class="col-subkey">${row.o}</td>
            <td class="num col-sum-p">${formatNum(row.sumP)}</td>
            <td class="num col-sum-r">${formatNum(row.sumR)}</td>
            <td class="num col-diff" style="color:${diff < 0 ? 'red':'black'}">${formatNum(diff)}</td>
            <td class="col-remark">${remarkInput}</td>
        `;
        tbody.appendChild(tr);
    });

    renderSummaryRows(displayList, tbody);
    adjustFontSizeToFit(document);
}

function renderSummaryRows(list, tbody) {
    const summaryMap = {};
    list.forEach(item => {
        const key = item.o || "(공란)";
        if (!summaryMap[key]) {
            summaryMap[key] = {
                oValue: key,
                count: 0,
                totalP: 0,
                totalR: 0
            };
        }
        summaryMap[key].count += 1; 
        summaryMap[key].totalP += item.sumP;
        summaryMap[key].totalR += item.sumR;
    });

    const summaryList = Object.values(summaryMap);
    summaryList.sort((a, b) => {
        if (a.oValue < b.oValue) return -1;
        if (a.oValue > b.oValue) return 1;
        return 0;
    });

    const headerRow = document.createElement('tr');
    headerRow.className = 'summary-header-row';
    headerRow.innerHTML = `<td colspan="9">통화별 합계</td>`;
    tbody.appendChild(headerRow);

    summaryList.forEach(row => {
        const diff = row.totalP - row.totalR;
        const tr = document.createElement('tr');
        tr.className = 'summary-row';
        tr.innerHTML = `
            <td class="col-no"></td>
            <td class="col-code"></td> 
            <td class="col-name"></td>
            <td class="col-count">${row.count}</td> 
            <td class="col-subkey">${row.oValue}</td> 
            <td class="num col-sum-p">${formatNum(row.totalP)}</td>
            <td class="num col-sum-r">${formatNum(row.totalR)}</td>
            <td class="num col-diff" style="color:${diff < 0 ? 'red':'black'}">${formatNum(diff)}</td>
            <td class="col-remark"></td>
        `;
        tbody.appendChild(tr);
    });
}

function openModal(key) {
    currentModalKey = key; 
    const data = globalDataMap[key];
    if (!data) return;
    
    const titleElement = document.getElementById('modal-title');
    if(titleElement) titleElement.innerText = data.n + " 상세 내역";

    const tbody = document.querySelector('#detail-table tbody');
    tbody.innerHTML = "";

    let filteredDetails = filterDetailsByBound(data.details);

    filteredDetails.sort((a, b) => {
        if (a.type < b.type) return -1;
        if (a.type > b.type) return 1;
        return 0;
    });

    filteredDetails.forEach(row => {
        let durationStr = "-";
        let dateClass = "";
        let btDateStr = "";
        if (row.btDate && !isNaN(row.btDate)) {
            btDateStr = formatDate(row.btDate);
            const result = getDetailedDateDiff(globalB3Date, row.btDate);
            if (result.isPast) {
                durationStr = `+ ${result.y}년 ${result.m}개월 ${result.d}일`;
                dateClass = "past-date";
            } else {
                durationStr = `- ${result.y}년 ${result.m}개월 ${result.d}일`;
                dateClass = "future-date";
            }
        }
        const rowDiff = row.pVal - row.rVal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.type}</td>
            <td>${btDateStr}</td>
            <td class="${dateClass}">${durationStr}</td>
            <td>${row.apVal}</td>
            <td>${data.o}</td> <td class="num">${formatNum(row.pVal)}</td>
            <td class="num">${formatNum(row.rVal)}</td>
            <td class="num ${rowDiff < 0 ? 'diff-neg' : ''}">${formatNum(rowDiff)}</td>
        `;
        tbody.appendChild(tr);
    });
    modal.style.display = "flex";
}

function saveModalAsPDF() {
    if (!currentModalKey || !globalDataMap[currentModalKey]) return;

    const data = globalDataMap[currentModalKey];
    const dateText = document.getElementById('date-display').innerText;

    const elementsToHide = [
        document.getElementById('drop-zone'),
        document.getElementById('control-panel'),
        document.getElementById('result-area'),
        document.getElementById('modal-overlay')
    ];
    elementsToHide.forEach(el => { if(el) el.style.display = 'none'; });

    const container = document.createElement('div');
    container.id = 'pdf-temp-container';
    container.style.width = '100%';
    container.style.maxWidth = '800px'; 
    container.style.margin = '0 auto';
    container.style.backgroundColor = 'white'; 
    container.style.padding = '40px 30px';
    container.style.boxSizing = 'border-box';
    
    window.scrollTo(0, 0);

    let tableRows = '';
    let totalP = 0;
    let totalR = 0;

    let filteredDetails = filterDetailsByBound(data.details);

    filteredDetails.sort((a, b) => {
        if (a.type < b.type) return -1;
        if (a.type > b.type) return 1;
        return 0;
    });

    filteredDetails.forEach(row => {
        let durationStr = "-";
        let dateClass = "";
        let btDateStr = "";
        if (row.btDate && !isNaN(row.btDate)) {
            btDateStr = formatDate(row.btDate);
            const result = getDetailedDateDiff(globalB3Date, row.btDate);
            if (result.isPast) {
                durationStr = `+ ${result.y}년 ${result.m}개월 ${result.d}일`;
                dateClass = "color: red; font-weight: bold;"; 
            } else {
                durationStr = `- ${result.y}년 ${result.m}개월 ${result.d}일`;
                dateClass = "color: blue;"; 
            }
        }
        const rowDiff = row.pVal - row.rVal;
        totalP += row.pVal;
        totalR += row.rVal;
        const diffColor = rowDiff < 0 ? 'color:red;' : 'color:black;';

        tableRows += `
            <tr>
                <td style="border:1px solid #ddd; padding:6px; text-align:center;">${row.type}</td>
                <td class="auto-shrink" style="border:1px solid #ddd; padding:6px; text-align:center;">${btDateStr}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:center; ${dateClass}">${durationStr}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:center;">${row.apVal}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:center;">${data.o}</td> <td style="border:1px solid #ddd; padding:6px; text-align:right;">${formatNum(row.pVal)}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right;">${formatNum(row.rVal)}</td>
                <td style="border:1px solid #ddd; padding:6px; text-align:right; ${diffColor}">${formatNum(rowDiff)}</td>
            </tr>
        `;
    });

    const totalDiff = totalP - totalR;
    tableRows += `
        <tr style="background-color: #f8f9fa; font-weight: bold;">
            <td colspan="5" style="border:1px solid #ddd; padding:6px; text-align:center;">합 계 (Total)</td> <td style="border:1px solid #ddd; padding:6px; text-align:right;">${formatNum(totalP)}</td>
            <td style="border:1px solid #ddd; padding:6px; text-align:right;">${formatNum(totalR)}</td>
            <td style="border:1px solid #ddd; padding:6px; text-align:right; color:${totalDiff < 0 ? 'red':'black'}">${formatNum(totalDiff)}</td>
        </tr>
    `;

    container.innerHTML = `
        <div style="font-family: 'Noto Sans KR', sans-serif;">
            <div style="display:flex; justify-content:flex-end; margin-bottom:20px;">
                <table style="border-collapse:collapse; text-align:center; font-size:11px;">
                    <tr>
                        <td style="border:1px solid #000; width:45px; background:#f9f9f9; font-weight:bold; padding:3px 0;">담 당</td>
                        <td style="border:1px solid #000; width:45px; background:#f9f9f9; font-weight:bold; padding:3px 0;">팀 장</td>
                        <td style="border:1px solid #000; width:45px; background:#f9f9f9; font-weight:bold; padding:3px 0;">상무이사</td>
                        <td style="border:1px solid #000; width:45px; background:#f9f9f9; font-weight:bold; padding:3px 0;">대표이사</td>
                    </tr>
                    <tr>
                        <td style="border:1px solid #000; height:40px;"></td>
                        <td style="border:1px solid #000; height:40px;"></td>
                        <td style="border:1px solid #000; height:40px;"></td>
                        <td style="border:1px solid #000; height:40px;"></td>
                    </tr>
                </table>
            </div>
            
            <div style="text-align:center; margin-bottom:15px;">
                <h2 style="margin:0; font-size:24px; font-weight:bold;">${data.n} 상세 내역</h2>
            </div>
            
            <div style="border-bottom:2px solid #333; margin-bottom:5px;"></div>
            
            <div style="text-align:left; font-weight:bold; font-size:14px; margin-bottom:20px;">
                ${dateText}
            </div>

            <table style="width:100%; border-collapse:collapse; font-size:12px; table-layout:fixed;">
                <thead>
                    <tr style="background-color:#e3f2fd;">
                        <th style="width: 8%; border:1px solid #ddd; padding:6px; text-align:center;">BOUND</th>
                        <th style="width: 11%; border:1px solid #ddd; padding:6px; text-align:center;">배송일</th>
                        <th style="width: 17%; border:1px solid #ddd; padding:6px; text-align:center;">경과 시간</th>
                        <th style="width: 22%; border:1px solid #ddd; padding:6px; text-align:center;">JOB NO(HBL)</th>
                        <th style="width: 6%; border:1px solid #ddd; padding:6px; text-align:center;">CUR</th> 
                        <th style="width: 12%; border:1px solid #ddd; padding:6px; text-align:center;">DEBIT</th>
                        <th style="width: 12%; border:1px solid #ddd; padding:6px; text-align:center;">CREDIT</th>
                        <th style="width: 12%; border:1px solid #ddd; padding:6px; text-align:center;">BALANCE</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;

    document.body.appendChild(container);

    adjustFontSizeToFit(container);

    const opt = {
        margin:       10,
        filename:     `${data.n}_Detail.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

setTimeout(() => {
        html2pdf().set(opt).from(container).save().then(() => {
            document.body.removeChild(container);
            
            elementsToHide.forEach(el => { if(el) el.style.display = ''; }); 
            
            document.getElementById('modal-overlay').style.display = 'flex';
        }).catch(err => {
            console.error(err);
            alert("PDF 생성 중 오류가 발생했습니다.");
            document.body.removeChild(container);
            
            elementsToHide.forEach(el => { if(el) el.style.display = ''; });
            
            document.getElementById('modal-overlay').style.display = 'flex';
        });
    }, 500);
}
