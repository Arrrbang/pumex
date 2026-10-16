// excel.js

async function saveAsExcel() {
    if (typeof globalDataMap === 'undefined' || Object.keys(globalDataMap).length === 0) {
        alert("저장할 데이터가 없습니다.");
        return;
    }

    const year = globalB3Date.getFullYear();
    const month = globalB3Date.getMonth() + 1;
    const week = getWeekNumber(globalB3Date);
    const mainTitleText = `${year}년 ${month}월 ${week}주차 해외 AGENT 미수금/미지급금`;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Excel Tool';
    workbook.created = new Date();

    // ==========================================
    // 시트 1: 요약 (Summary)
    // ==========================================
    const wsSummary = workbook.addWorksheet('요약(Summary)', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }] // 3행까지 고정 (제목1 + 헤더2)
    });

    // 1. 열 너비 설정 (PDF와 유사한 비율로 설정)
    wsSummary.columns = [
        { key: 'continent', width: 16 },
        { key: 'country', width: 20 },
        { key: 'no', width: 6 },        // A: NO
        { key: 'name', width: 35 },     // B: 업체명
        { key: 'cur', width: 10 },      // C: CUR
        { key: 'totalCnt', width: 10 }, // D: 전체건수
        
        // 1달 이상
        { key: 'overCnt', width: 12 },  // E: 건수
        { key: 'overR', width: 15 },    // F: CREDIT
        { key: 'overP', width: 15 },    // G: DEBIT
        
        // 1달 이내
        { key: 'underCnt', width: 12 }, // H: 건수
        { key: 'underR', width: 15 },   // I: CREDIT
        { key: 'underP', width: 15 },   // J: DEBIT
        
        // TOTAL
        { key: 'sumR', width: 15 },     // K: CREDIT
        { key: 'sumP', width: 15 },     // L: DEBIT
        { key: 'diff', width: 15 },     // M: BALANCE
        
        { key: 'remark', width: 30 }    // N: 비고
    ];

    // 2. [1행] 메인 제목
    const titleRow = wsSummary.addRow([mainTitleText]);
    wsSummary.mergeCells('A1:P1');
    titleRow.height = 35;
    
    const titleCell = titleRow.getCell(1);
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    titleCell.border = { top: { style: 'thick' }, left: { style: 'thick' }, bottom: { style: 'thick' }, right: { style: 'thick' } };

    // 3. [2행 ~ 3행] 헤더 생성 (2단 구조)
    // 2행: 대분류
    const headerRow1 = wsSummary.addRow([
        '대륙', '국가', 'NO', '업체명', 'CUR', '전체\n건수', // 병합될 예정이라 텍스트 위치는 A, B, C, D
        '배송 완료 1달 이상 경과', '', '',   // E열 시작 (3칸 병합)
        '배송 완료 1달 이내', '', '',        // H열 시작 (3칸 병합)
        'TOTAL', '', '',                     // K열 시작 (3칸 병합)
        '비고'                               // N열
    ]);
    headerRow1.height = 25;

    // 3행: 소분류
    const headerRow2 = wsSummary.addRow([
        '', '', '', '', '', '',                         // A~D는 위와 병합됨
        '건수', 'CREDIT', 'DEBIT',              // 1달 이상
        '건수', 'CREDIT', 'DEBIT',              // 1달 이내
        'CREDIT', 'DEBIT', 'BALANCE',           // TOTAL
        ''                                      // N은 위와 병합됨
    ]);
    headerRow2.height = 25;

    wsSummary.mergeCells('A2:A3');
    wsSummary.mergeCells('B2:B3');

    // 4. 헤더 병합 (Merge)
    wsSummary.mergeCells('C2:C3'); // NO
    wsSummary.mergeCells('D2:D3'); // 업체명
    wsSummary.mergeCells('E2:E3'); // CUR
    wsSummary.mergeCells('F2:F3'); // 전체건수
    
    wsSummary.mergeCells('G2:I2'); // 1달 이상 경과 그룹
    wsSummary.mergeCells('J2:L2'); // 1달 이내 그룹
    wsSummary.mergeCells('M2:O2'); // TOTAL 그룹
    
    wsSummary.mergeCells('P2:P3'); // 비고

    // 5. 헤더 스타일 적용
    // (범위를 순회하며 스타일 입히기)
    for (let r = 2; r <= 3; r++) {
        const row = wsSummary.getRow(r);
        for (let c = 1; c <= 16; c++) {
            const cell = row.getCell(c);
            cell.font = { bold: true, size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            
            // 배경색 지정 (PDF와 유사하게)
            if (r === 2) {
                // 대분류 행 배경
                if (c >= 1 && c <= 6) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F1F1' } }; // 기본
                else if (c >= 7 && c <= 9) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }; // 파랑
                else if (c >= 10 && c <= 12) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F7FA' } }; // 하늘
                else if (c >= 13 && c <= 15) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } }; // 주황
                else if (c === 16) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F1F1' } };
            } else {
                // 소분류 행 배경
                if (c >= 7 && c <= 9) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
                else if (c >= 10 && c <= 12) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F7FA' } };
                else if (c >= 13 && c <= 15) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
            }
        }
    }

    // ==========================================
    // 데이터 처리 및 행 추가
    // ==========================================
    const keys = Object.keys(globalDataMap).sort((a, b) =>
        comparePartnerRegions(globalDataMap[a], globalDataMap[b])
    );
    
    // 통화별 합계 계산을 위한 맵
    const summaryMap = {};

    keys.forEach((key, index) => {
        const data = globalDataMap[key];
        const safeName = sanitizeSheetName(data.n);

        // 1달 기준 날짜 계산
        const oneMonthAgo = new Date(globalB3Date);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        let cntOver = 0, overP = 0, overR = 0;
        let cntUnder = 0, underP = 0, underR = 0;
        let sumP = 0, sumR = 0;

        const filteredDetails = filterDetailsByBound(data.details);
        
        filteredDetails.forEach(d => {
            sumP += d.pVal; // Total Debit
            sumR += d.rVal; // Total Credit

            if (d.btDate && !isNaN(d.btDate)) {
                if (d.btDate < oneMonthAgo) {
                    cntOver++; overP += d.pVal; overR += d.rVal;
                } else {
                    cntUnder++; underP += d.pVal; underR += d.rVal;
                }
            } else {
                // 날짜 없으면 1달 이내로 간주
                cntUnder++; underP += d.pVal; underR += d.rVal;
            }
        });

        // 건수 비율 계산 (PDF와 동일 로직)
        const totalCount = filteredDetails.length;
        let overPct = totalCount > 0 ? Math.round((cntOver / totalCount) * 100) : 0;
        let underPct = totalCount > 0 ? Math.round((cntUnder / totalCount) * 100) : 0;

        const overCountStr = `${cntOver}(${overPct}%)`;
        const underCountStr = `${cntUnder}(${underPct}%)`;
        const diff = sumP - sumR;

        // 엑셀 행 추가
        const row = wsSummary.addRow([
            data.continent || "",
            data.country || "",
            index + 1,      // A: NO
            data.n,         // B: 업체명
            data.o,         // C: CUR
            totalCount,     // D: 전체건수
            
            overCountStr,   // E: 1달이상 건수
            overR,          // F: CREDIT
            overP,          // G: DEBIT
            
            underCountStr,  // H: 1달이내 건수
            underR,         // I: CREDIT
            underP,         // J: DEBIT
            
            sumR,           // K: CREDIT
            sumP,           // L: DEBIT
            diff,           // M: BALANCE
            
            data.remark || "" // N: 비고
        ]);

        // 스타일링
        row.eachCell((cell, colNumber) => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.alignment = { vertical: 'middle' };

            // 숫자 포맷 (금액 열: F, G, I, J, K, L, M)
            if ([8, 9, 11, 12, 13, 14, 15].includes(colNumber)) {
                cell.numFmt = '#,##0.00';
                cell.alignment = { horizontal: 'right' };
            } else {
                cell.alignment = { horizontal: 'center' };
            }

            // 업체명 (B열) - 하이퍼링크 및 왼쪽 정렬
            if (colNumber === 4) {
                cell.alignment = { horizontal: 'left' };
                cell.font = { color: { argb: 'FF0000FF' }, underline: true };
                cell.value = { text: data.n, hyperlink: `#'${safeName}'!C1`, tooltip: '상세 시트로 이동' };
            }

            // Balance 음수일 때 빨간색 (M열)
            if (colNumber === 15 && diff < 0) {
                cell.font = { color: { argb: 'FFFF0000' }, bold: true };
            }
        });

        // 통화별 합계 누적
        const cur = data.o || "ETC";
        if (!summaryMap[cur]) {
            summaryMap[cur] = {
                cur: cur,
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
        summaryMap[cur].totalCount += totalCount;
    });

    // ==========================================
    // 통화별 합계 (Subtotals) 출력
    // ==========================================
    const summaryList = Object.values(summaryMap).sort((a, b) => {
        if (a.cur < b.cur) return -1;
        if (a.cur > b.cur) return 1;
        return 0;
    });

    wsSummary.addRow([]); // 빈 줄
    const subtotalTitleRow = wsSummary.addRow(['', '', '', '===== 통화별 합계 (Currency Subtotals) =====']);
    wsSummary.mergeCells(`D${subtotalTitleRow.number}:P${subtotalTitleRow.number}`);
    
    const subTitleCell = subtotalTitleRow.getCell(4);
    subTitleCell.font = { bold: true };
    subTitleCell.alignment = { horizontal: 'center' };
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1ECF1' } }; 
    subTitleCell.border = { top: { style: 'medium' }, bottom: { style: 'medium' } };

    summaryList.forEach(s => {
        const sDiff = s.totalP - s.totalR;
        
        // 비율 계산
        let sOverPct = s.totalCount > 0 ? Math.round((s.cntOver / s.totalCount) * 100) : 0;
        let sUnderPct = s.totalCount > 0 ? Math.round((s.cntUnder / s.totalCount) * 100) : 0;
        
        const sOverCountStr = `${s.cntOver}(${sOverPct}%)`;
        const sUnderCountStr = `${s.cntUnder}(${sUnderPct}%)`;

        const newRow = wsSummary.addRow([
            '', '',
            '',                 
            `${s.cur} Total`,   // B: 이름 자리에 표시
            s.cur,              // C: CUR
            s.totalCount,       // D: 전체건수
            
            sOverCountStr,      // E
            s.overR,            // F
            s.overP,            // G
            
            sUnderCountStr,     // H
            s.underR,           // I
            s.underP,           // J
            
            s.totalR,           // K
            s.totalP,           // L
            sDiff,              // M
            '' 
        ]);

        newRow.eachCell((cell, colNumber) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.font = { color: { argb: 'FF333333' }, bold: true };

            // 숫자 포맷
            if ([8, 9, 11, 12, 13, 14, 15].includes(colNumber)) { 
                cell.numFmt = '#,##0.00';
                cell.alignment = { horizontal: 'right' };
            } else {
                cell.alignment = { horizontal: 'center' };
            }
            
            // B열 라벨은 우측 정렬
            if (colNumber === 4) cell.alignment = { horizontal: 'right' };

            // Balance 음수 빨간색
            if (colNumber === 15 && sDiff < 0) {
                cell.font = { color: { argb: 'FFFF0000' }, bold: true };
            }
        });
    });

    // ==========================================
    // 시트 2~N: 상세 내역 (Detail Sheets)
    // (기존 코드 유지)
    // ==========================================
    keys.forEach(key => {
        const data = globalDataMap[key];
        let sheetName = sanitizeSheetName(data.n);
        
        if (workbook.getWorksheet(sheetName)) {
            sheetName = sheetName.substring(0, 25) + "_" + Math.floor(Math.random() * 100);
        }

        const wsDetail = workbook.addWorksheet(sheetName, {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }] 
        });

        wsDetail.columns = [
            { key: 'type', width: 10 },
            { key: 'date', width: 15 },
            { key: 'duration', width: 25 },
            { key: 'ap', width: 35 },
            { key: 'cur', width: 10 },
            { key: 'p', width: 20 },
            { key: 'r', width: 20 },
            { key: 'diff', width: 20 }
        ];

        // 1행: 제목
        const detailTitleRow = wsDetail.addRow([`${data.n} 상세 내역`]);
        wsDetail.mergeCells('A1:H1'); 
        detailTitleRow.height = 30;
        
        const detailTitleCell = detailTitleRow.getCell(1);
        detailTitleCell.font = { size: 14, bold: true };
        detailTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        detailTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        detailTitleCell.border = { bottom: { style: 'medium' } };

        // 2행: 링크
        const backLinkRow = wsDetail.addRow(['🔙 요약본으로 돌아가기 (Back to Summary)']);
        wsDetail.mergeCells('A2:H2');
        backLinkRow.height = 25;
        
        const backLinkCell = backLinkRow.getCell(1);
        backLinkCell.value = { text: '🔙 요약본으로 돌아가기 (Back to Summary)', hyperlink: "#'요약(Summary)'!A1" };
        backLinkCell.font = { bold: true, color: { argb: 'FF0000FF' }, size: 11, underline: true };
        backLinkCell.alignment = { horizontal: 'left', vertical: 'middle' };
        backLinkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F5' } };

        // 3행: 헤더
        const detailHeaderRow = wsDetail.addRow(["BOUND", "배송일", "경과 시간", "JOB.NO / HBL", "CUR", "DEBIT", "CREDIT", "BALANCE"]);
        applyHeaderStyle(detailHeaderRow, 'FF4682B4'); 

        data.details.sort((a, b) => {
            if (a.type < b.type) return -1;
            if (a.type > b.type) return 1;
            return 0;
        });

        data.details.forEach(row => {
            let durationStr = "-";
            let btDateStr = "";
            let isPast = false;
            
            if (row.btDate && !isNaN(row.btDate)) {
                btDateStr = formatDate(row.btDate);
                const result = getDetailedDateDiff(globalB3Date, row.btDate);
                isPast = result.isPast;
                if (isPast) durationStr = `+ ${result.y}년 ${result.m}개월 ${result.d}일`;
                else durationStr = `- ${result.y}년 ${result.m}개월 ${result.d}일`;
            }
            const rowDiff = row.pVal - row.rVal;

            const newRow = wsDetail.addRow([
                row.type,
                btDateStr,
                durationStr,
                row.apVal,
                data.o,
                row.pVal,
                row.rVal,
                rowDiff
            ]);

            newRow.eachCell((cell, colNumber) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };

                if (colNumber >= 6) {
                    cell.numFmt = '#,##0.00';
                    cell.alignment = { horizontal: 'right' };
                }
                
                if (colNumber === 3) {
                    if (isPast) cell.font = { color: { argb: 'FFFF0000' }, bold: true };
                    else cell.font = { color: { argb: 'FF0000FF' } };
                }
                
                if (colNumber === 8 && rowDiff < 0) {
                    cell.font = { color: { argb: 'FFFF0000' }, bold: true };
                }
            });
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Data_Report_Professional.xlsx";
    anchor.click();
    window.URL.revokeObjectURL(url);
}

function applyHeaderStyle(row, argbColor) {
    row.height = 25;
    row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbColor } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
    });
}

function sanitizeSheetName(name) {
    if (!name) return "Unknown";
    let safeName = String(name).replace(/[:\\/?*\[\]]/g, "_");
    if (safeName.length > 30) safeName = safeName.substring(0, 30);
    return safeName || "Sheet";
}
