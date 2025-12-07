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
        views: [{ state: 'frozen', xSplit: 0, ySplit: 2 }]
    });

    // [수정] Remark 열 추가
    wsSummary.columns = [
        { key: 'no', width: 8 },
        { key: 'code', width: 12 }, 
        { key: 'n', width: 35 },
        { key: 'count', width: 10 },
        { key: 'o', width: 15 },
        { key: 'sumP', width: 20 },
        { key: 'sumR', width: 20 },
        { key: 'diff', width: 20 },
        { key: 'remark', width: 40 } // [신규] 비고
    ];

    // [1행] 제목
    const titleRow = wsSummary.addRow([mainTitleText]);
    // [수정] 병합 범위 A1:I1 (9칸)
    wsSummary.mergeCells('A1:I1');
    titleRow.height = 35;
    const titleCell = titleRow.getCell(1);
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    titleCell.border = { top: { style: 'thick' }, left: { style: 'thick' }, bottom: { style: 'thick' }, right: { style: 'thick' } };

    // [2행] 헤더
    const headerRow = wsSummary.addRow(['NO', 'Code', '업체명', '건수', 'CUR', 'CREDIT', 'DEBIT', 'BALANCE', '비고(Remarks)']);
    applyHeaderStyle(headerRow, 'FF2F4F4F');

    // [3행~] 메인 데이터
    const keys = Object.keys(globalDataMap).sort();
    
    keys.forEach((key, index) => {
        const data = globalDataMap[key];
        const diff = data.sumP - data.sumR;
        const safeName = sanitizeSheetName(data.n);

        const row = wsSummary.addRow([
            index + 1,
            data.code || "", 
            data.n,
            data.details.length,
            data.o,
            data.sumP,
            data.sumR,
            diff,
            data.remark || "" // 비고 값
        ]);

        row.eachCell((cell, colNumber) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            
            // 숫자: 6(P), 7(R), 8(Diff)
            if (colNumber >= 6 && colNumber <= 8) {
                cell.numFmt = '#,##0.00'; 
                cell.alignment = { horizontal: 'right' };
            } else if (colNumber === 4 || colNumber === 2) { 
                cell.alignment = { horizontal: 'center' };
            } else {
                cell.alignment = { horizontal: 'left' };
            }

            if (colNumber === 3) {
                cell.font = { color: { argb: 'FF0000FF' }, underline: true };
                cell.value = { text: data.n, hyperlink: `#'${safeName}'!A1`, tooltip: '상세 시트로 이동' };
            }
        });

        if (diff < 0) {
            row.getCell(8).font = { color: { argb: 'FFFF0000' }, bold: true };
        }
    });

    // ---------------------------------------------------------
    // 소계 (Subtotal) 행
    // ---------------------------------------------------------
    const summaryMap = {};
    keys.forEach(key => {
        const item = globalDataMap[key];
        const cur = item.o || "(공란)";
        
        if (!summaryMap[cur]) {
            summaryMap[cur] = {
                cur: cur,
                count: 0,
                totalP: 0,
                totalR: 0
            };
        }
        summaryMap[cur].count += 1; 
        summaryMap[cur].totalP += item.sumP;
        summaryMap[cur].totalR += item.sumR;
    });

    const summaryList = Object.values(summaryMap).sort((a, b) => {
        if (a.cur < b.cur) return -1;
        if (a.cur > b.cur) return 1;
        return 0;
    });

    wsSummary.addRow([]); 
    const subtotalTitleRow = wsSummary.addRow(['', '===== 통화별 합계 =====']);
    // [수정] 병합 범위 B~I
    wsSummary.mergeCells(`B${subtotalTitleRow.number}:I${subtotalTitleRow.number}`);
    
    const subTitleCell = subtotalTitleRow.getCell(2);
    subTitleCell.font = { bold: true };
    subTitleCell.alignment = { horizontal: 'center' };
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }; 
    subTitleCell.border = { top: { style: 'medium' }, bottom: { style: 'medium' } };

    summaryList.forEach(row => {
        const diff = row.totalP - row.totalR;
        const newRow = wsSummary.addRow([
            '',                 
            '',                 
            '소계 (Subtotal)',  
            row.count,          
            row.cur,            
            row.totalP,         
            row.totalR,         
            diff,
            '' // 비고
        ]);

        newRow.eachCell((cell, colNumber) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.font = { color: { argb: 'FF495057' }, bold: true };

            if (colNumber >= 6 && colNumber <= 8) { 
                cell.numFmt = '#,##0.00';
                cell.alignment = { horizontal: 'right' };
            } else if (colNumber === 4 || colNumber === 3) {
                cell.alignment = { horizontal: 'center' };
            }
        });

        if (diff < 0) {
            newRow.getCell(8).font = { color: { argb: 'FFFF0000' }, bold: true };
        }
    });


    // ==========================================
    // 시트 2~N: 상세 내역 (Detail Sheets)
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
