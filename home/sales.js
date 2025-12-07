async function initSalesDashboard(username) {
    const API_URL = "https://notion-api-hub.vercel.app/api/home/home-sales"; 
    
    // API 호출
    const response = await fetch(`${API_URL}?username=${username}`);
    if (!response.ok) throw new Error(`Dashboard Error`);
    
    const result = await response.json();
    if (result.ok) {
        // [NEW] console 데이터 구조 분해 할당 추가
        const { urgent, storage, insurance, console: consoleData } = result.data;
        
        // 1. 급한 건
        document.getElementById('passport-count').textContent = `(${urgent.length})`;
        renderSalesTable('passport-table-body', urgent, true);

        // 2. 보관 건
        document.getElementById('storage-count').textContent = `(${storage.length})`;
        renderSalesTable('storage-table-body', storage, false, true);

        // 3. 보험 요청 건
        document.getElementById('insurance-count').textContent = `(${insurance.length})`;
        renderSalesTable('insurance-table-body', insurance, false, false, true);

        // [NEW] 4. 콘솔 대기 건 (전용 렌더러 사용)
        const consoleCount = consoleData ? consoleData.length : 0;
        document.getElementById('console-count').textContent = `(${consoleCount})`;
        renderConsoleTable('console-table-body', consoleData);

    } else {
        throw new Error(result.error);
    }
}

// 기존 영업팀용 테이블 렌더러 (변경 없음)
function renderSalesTable(tbodyId, dataList, showDeadline, showPackingDate = false, showEta = false) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = ""; 

    // 컬럼 수 계산: 기본 3개 + 날짜 컬럼 1개(마감일/포장일/ETA 중 하나)
    let colSpan = 3;
    if (showDeadline || showPackingDate || showEta) colSpan++;

    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; color:#888;">데이터가 없습니다.</td></tr>`;
        return;
    }

    dataList.forEach(item => {
        const tr = document.createElement("tr");
        
        let html = "";

        // [우선순위 1] 마감일 (급한 건)
        if (showDeadline) {
            html += `<td>${(item.deadline || "").split("T")[0]}</td>`;
        }
        // [우선순위 2] 포장일 (보관 건)
        else if (showPackingDate) {
            html += `<td>${(item.packingDate || "").split("T")[0]}</td>`;
        }
        // [우선순위 3] ETA (보험 요청 건)
        else if (showEta) {
            html += `<td>${(item.eta || "").split("T")[0]}</td>`;
        }

        // 공통 데이터
        html += `
            <td>${item.clientName}</td>
            <td>${item.country}</td>
            <td>${item.assignees}</td>
        `;

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function renderConsoleTable(tbodyId, dataList) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = "";

    // [수정] 컬럼이 6개로 늘어났으므로 colspan도 6으로 변경
    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888;">콘솔 대기 화물이 없습니다.</td></tr>`;
        return;
    }

    dataList.forEach(item => {
        const tr = document.createElement("tr");
        
        // [수정] POE - 포장일 - CBM - 고객명 - 영업담당 - 업무담당 순서
        tr.innerHTML = `
            <td>${item.poe || "-"}</td>
            <td>${item.packingDate || "-"}</td>
            <td>${item.cbm}</td> 
            <td>${item.clientName}</td>
            <td>${item.salesRep || "-"}</td>
            <td>${item.assignees}</td>
        `;
        tbody.appendChild(tr);
    });
}
