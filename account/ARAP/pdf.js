function saveAsPDF() {
    // 1. 데이터 확인
    if (typeof globalDataMap === 'undefined' || Object.keys(globalDataMap).length === 0) {
        alert("출력할 데이터가 없습니다.");
        return;
    }

    // 2. 준비: 화면 요소 숨기기
    const elementsToHide = [
        document.getElementById('drop-zone'),
        document.getElementById('control-panel'),
        document.getElementById('result-area'),
        document.getElementById('header-placeholder'),
        document.querySelector('.left-wrap'),
        document.querySelector('.vertical-divider')
    ];
    elementsToHide.forEach(el => { if(el) el.style.display = 'none'; });

    // 3. [PDF 전용] 새로운 컨테이너 생성
    const container = document.createElement('div');
    container.id = 'pdf-export-container';
    container.style.width = '100%';
    container.style.maxWidth = '1120px'; 
    container.style.margin = '0 auto';
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.style.boxSizing = 'border-box';
    container.style.fontFamily = "'Noto Sans KR', sans-serif";

    // 3-1. 제목 및 결재란
    const dateText = document.getElementById('date-display').innerText;
    const titleText = document.getElementById('main-title').innerText;

    const headerHtml = `
        <div style="display:flex; justify-content:flex-end; margin-bottom:20px;">
            <table style="border-collapse:collapse; text-align:center; font-size:10px; border-color:#000;">
                <tr>
                    <td style="border:0.5px solid #000; width:50px; background:#f9f9f9; font-weight:bold; padding:4px 0;">담 당</td>
                    <td style="border:0.5px solid #000; width:50px; background:#f9f9f9; font-weight:bold; padding:4px 0;">팀 장</td>
                    <td style="border:0.5px solid #000; width:50px; background:#f9f9f9; font-weight:bold; padding:4px 0;">상무이사</td>
                    <td style="border:0.5px solid #000; width:50px; background:#f9f9f9; font-weight:bold; padding:4px 0;">대표이사</td>
                </tr>
                <tr>
                    <td style="border:0.5px solid #000; height:50px;"></td>
                    <td style="border:0.5px solid #000; height:50px;"></td>
                    <td style="border:0.5px solid #000; height:50px;"></td>
                    <td style="border:0.5px solid #000; height:50px;"></td>
                </tr>
            </table>
        </div>
        <div style="text-align:center; margin-bottom:10px;">
            <h2 style="margin:0; font-size:22px; font-weight:bold; letter-spacing:-0.5px;">${titleText}</h2>
        </div>
        <div style="border-bottom:2px solid #333; margin-bottom:5px;"></div>
        <div style="text-align:left; font-weight:bold; font-size:12px; margin-bottom:10px;">
            ${dateText}
        </div>
    `;

    // 3-2. 테이블 헤더
    const tableHeaderHtml = `
        <table style="width:100%; border-collapse:collapse; font-size:9px; table-layout:fixed; border: 0.5px solid #333;">
            <colgroup>
                <col style="width: 25px;"> 
                <col style="width: auto;"> 
                <col style="width: 30px;"> 
                <col style="width: 35px;"> 
                <col style="width: 40px;"> 
                <col style="width: 60px;"> 
                <col style="width: 60px;"> 
                <col style="width: 40px;"> 
                <col style="width: 60px;"> 
                <col style="width: 60px;"> 
                <col style="width: 60px;"> 
                <col style="width: 60px;"> 
                <col style="width: 60px;"> 
                <col style="width: 130px;"> 
            </colgroup>

            <thead>
                <tr style="background-color:#f1f1f1; border-top:1.5px solid #333; height: 25px;">
                    <th style="border:0.5px solid #999; background-color:#f1f1f1;"></th>
                    <th style="border:0.5px solid #999; background-color:#f1f1f1;"></th>
                    <th style="border:0.5px solid #999; background-color:#f1f1f1;"></th>
                    <th style="border:0.5px solid #999; background-color:#f1f1f1;"></th>
                    
                    <th colspan="3" style="border:0.5px solid #999; background-color:#e8f0fe; height:20px; vertical-align:middle; font-weight:bold;">배송 완료 1달 이상 경과</th>
                    <th colspan="3" style="border:0.5px solid #999; background-color:#e0f7fa; height:20px; vertical-align:middle; font-weight:bold;">배송 완료 1달 이내</th>
                    <th colspan="3" style="border:0.5px solid #999; background-color:#fff3e0; height:20px; vertical-align:middle; font-weight:bold;">TOTAL</th>
                    
                    <th style="border:0.5px solid #999; background-color:#f1f1f1;"></th>
                </tr>
                <tr style="background-color:#f9f9f9; border-bottom:1px solid #333; height: 30px;">
                    <th style="border:0.5px solid #999; vertical-align:middle; background-color:#f1f1f1;">NO</th>
                    <th style="border:0.5px solid #999; vertical-align:middle; background-color:#f1f1f1;">업체명</th>
                    <th style="border:0.5px solid #999; vertical-align:middle; background-color:#f1f1f1;">CUR</th>
                    <th style="border:0.5px solid #999; vertical-align:middle; line-height:1.2; background-color:#f1f1f1;">전체<br>건수</th>

                    <th style="border:0.5px solid #999; background-color:#e8f0fe; vertical-align:middle;">건수</th>
                    <th style="border:0.5px solid #999; background-color:#e8f0fe; vertical-align:middle;">CREDIT</th>
                    <th style="border:0.5px solid #999; background-color:#e8f0fe; vertical-align:middle;">DEBIT</th>
                    
                    <th style="border:0.5px solid #999; background-color:#e0f7fa; vertical-align:middle;">건수</th>
                    <th style="border:0.5px solid #999; background-color:#e0f7fa; vertical-align:middle;">CREDIT</th>
                    <th style="border:0.5px solid #999; background-color:#e0f7fa; vertical-align:middle;">DEBIT</th>
                    
                    <th style="border:0.5px solid #999; background-color:#fff3e0; vertical-align:middle;">CREDIT</th>
                    <th style="border:0.5px solid #999; background-color:#fff3e0; vertical-align:middle;">DEBIT</th>
                    <th style="border:0.5px solid #999; background-color:#fff3e0; vertical-align:middle;">BALANCE</th>
                    
                    <th style="border:0.5px solid #999; vertical-align:middle; background-color:#f1f1f1;">비고</th>
                </tr>
            </thead>
            <tbody>
    `;

    // 3-3. 데이터 처리 및 색상 정의
    const bgOver = "#f4f8ff";  
    const bgUnder = "#f2fdff"; 
    const bgTotal = "#fffbf2"; 
    const bgBase = "#ffffff";  

    let tableBodyHtml = "";
    let rawList = Object.values(globalDataMap);
    
    // 정렬 (업체명 -> 통화)
    rawList.sort((a, b) => {
        if (a.n < b.n) return -1; if (a.n > b.n) return 1;
        if (a.o < b.o) return -1; if (a.o > b.o) return 1;
        return 0;
    });

    const processedList = [];
    const summaryMap = {}; 

    rawList.forEach((row) => {
        const filteredDetails = filterDetailsByBound(row.details);
        if (filteredDetails.length === 0) return;

        const oneMonthAgo = new Date(globalB3Date);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        let cntOver = 0, overP = 0, overR = 0;
        let cntUnder = 0, underP = 0, underR = 0;
        let sumP = 0, sumR = 0;

        filteredDetails.forEach(d => {
            sumP += d.pVal; 
            sumR += d.rVal; 

            if (d.btDate && !isNaN(d.btDate)) {
                if (d.btDate < oneMonthAgo) {
                    cntOver++; overP += d.pVal; overR += d.rVal;
                } else {
                    cntUnder++; underP += d.pVal; underR += d.rVal;
                }
            } else {
                cntUnder++; underP += d.pVal; underR += d.rVal;
            }
        });

        processedList.push({
            n: row.n,
            o: row.o,
            totalCount: filteredDetails.length,
            cntOver, overP, overR,
            cntUnder, underP, underR,
            sumP, sumR,
            remark: row.remark || ""
        });

        const cur = row.o || "ETC";
        if (!summaryMap[cur]) {
            summaryMap[cur] = { 
                cntOver:0, overP:0, overR:0, 
                cntUnder:0, underP:0, underR:0, 
                totalP:0, totalR:0, totalCount:0 
            };
        }
        summaryMap[cur].cntOver += cntOver;
        summaryMap[cur].overP += overP;
        summaryMap[cur].overR += overR;
        summaryMap[cur].cntUnder += cntUnder;
        summaryMap[cur].underP += underP;
        summaryMap[cur].underR += underR;
        summaryMap[cur].totalP += sumP;
        summaryMap[cur].totalR += sumR;
        summaryMap[cur].totalCount += filteredDetails.length;
    });

    // 3-4. 메인 데이터 행 렌더링
    processedList.forEach((row, index) => {
        const totalBalance = row.sumP - row.sumR;
        const totalCount = row.totalCount;

        // 건수 포맷 변경: 2(20%)
        let overPct = totalCount > 0 ? Math.round((row.cntOver / totalCount) * 100) : 0;
        let underPct = totalCount > 0 ? Math.round((row.cntUnder / totalCount) * 100) : 0;
        
        const overCountStr = `${row.cntOver}(${overPct}%)`;
        const underCountStr = `${row.cntUnder}(${underPct}%)`;

        // [수정] BALANCE만 음수일 때 빨간색 처리 (건수 색상은 제거)
        const diffColor = totalBalance < 0 ? 'color:red; font-weight:bold;' : 'color:black;';
        
        tableBodyHtml += `
            <tr style="height:22px;">
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:center; background-color:${bgBase};">${index + 1}</td>
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:left; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; background-color:${bgBase};">${row.n}</td>
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:center; background-color:${bgBase};">${row.o}</td>
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:center; background-color:${bgBase};">${totalCount}</td>
                
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:center; background-color:${bgOver}; color:black;">${overCountStr}</td>
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:right; background-color:${bgOver};">${formatNum(row.overR)}</td>
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:right; background-color:${bgOver};">${formatNum(row.overP)}</td>
                
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:center; background-color:${bgUnder};">${underCountStr}</td>
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:right; background-color:${bgUnder};">${formatNum(row.underR)}</td>
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:right; background-color:${bgUnder};">${formatNum(row.underP)}</td>
                
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:right; background-color:${bgTotal};">${formatNum(row.sumR)}</td>
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:right; background-color:${bgTotal};">${formatNum(row.sumP)}</td>
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:right; background-color:${bgTotal}; ${diffColor}">${formatNum(totalBalance)}</td>
                
                <td style="border:0.5px solid #999; padding:3px 2px; text-align:left; font-size:7px; background-color:${bgBase};">${row.remark}</td>
            </tr>
        `;
    });

    // 3-5. 통화별 합계 렌더링
    const sortedCurrencies = Object.keys(summaryMap).sort();

    tableBodyHtml += `<tr style="height:10px;"><td colspan="14" style="border:none;"></td></tr>`;
    tableBodyHtml += `<tr style="background-color:#d1ecf1; font-weight:bold;"><td colspan="14" style="border:0.5px solid #999; text-align:center; padding:5px;">▼ 통화별 합계 (Currency Subtotals)</td></tr>`;

    sortedCurrencies.forEach(cur => {
        const s = summaryMap[cur];
        const sBal = s.totalP - s.totalR;
        const sColor = sBal < 0 ? 'color:red;' : 'color:black;';
        
        let sOverPct = s.totalCount > 0 ? Math.round((s.cntOver / s.totalCount) * 100) : 0;
        let sUnderPct = s.totalCount > 0 ? Math.round((s.cntUnder / s.totalCount) * 100) : 0;
        
        const bgSub = "#f8f9fa";

        tableBodyHtml += `
            <tr style="background-color:${bgSub}; font-weight:bold; height:25px;">
                <td colspan="2" style="border:0.5px solid #999; text-align:right; padding-right:10px; background-color:${bgSub};">${cur} Total</td>
                <td style="border:0.5px solid #999; text-align:center; background-color:${bgSub};">${cur}</td>
                <td style="border:0.5px solid #999; text-align:center; background-color:${bgSub};">${s.totalCount}</td>
                
                <td style="border:0.5px solid #999; text-align:center; color:black; background-color:${bgSub};">${s.cntOver}(${sOverPct}%)</td>
                <td style="border:0.5px solid #999; text-align:right; background-color:${bgSub};">${formatNum(s.overR)}</td>
                <td style="border:0.5px solid #999; text-align:right; background-color:${bgSub};">${formatNum(s.overP)}</td>
                
                <td style="border:0.5px solid #999; text-align:center; background-color:${bgSub};">${s.cntUnder}(${sUnderPct}%)</td>
                <td style="border:0.5px solid #999; text-align:right; background-color:${bgSub};">${formatNum(s.underR)}</td>
                <td style="border:0.5px solid #999; text-align:right; background-color:${bgSub};">${formatNum(s.underP)}</td>
                
                <td style="border:0.5px solid #999; text-align:right; background-color:${bgSub};">${formatNum(s.totalR)}</td>
                <td style="border:0.5px solid #999; text-align:right; background-color:${bgSub};">${formatNum(s.totalP)}</td>
                <td style="border:0.5px solid #999; text-align:right; background-color:${bgSub}; ${sColor}">${formatNum(sBal)}</td>
                <td style="border:0.5px solid #999; background-color:${bgSub};"></td>
            </tr>
        `;
    });

    tableBodyHtml += `</tbody></table>`;

    container.innerHTML = headerHtml + tableHeaderHtml + tableBodyHtml;
    document.body.appendChild(container);

    const opt = {
        margin:       [10, 5, 10, 5],
        filename:     'Summary_Report_Landscape.pdf',
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 4, useCORS: true, scrollY: 0, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }, 
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(container).save()
        .then(() => {
            document.body.removeChild(container);
            elementsToHide.forEach(el => { if(el) el.style.display = ''; });
            document.querySelector('.left-wrap').style.display = 'block';
            document.querySelector('.vertical-divider').style.display = 'block';
        })
        .catch(err => {
            console.error(err);
            alert("PDF 생성 중 오류 발생");
            document.body.removeChild(container);
            elementsToHide.forEach(el => { if(el) el.style.display = ''; });
        });
}
