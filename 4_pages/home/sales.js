async function initSalesDashboard(username) {
    const API_URL = "https://notion-api-hub.vercel.app/api/home/home-sales"; 
    
    const response = await fetch(`${API_URL}?username=${username}`);
    if (!response.ok) throw new Error(`Dashboard Error`);
    
    const result = await response.json();
    if (result.ok) {
        const { urgent, storage, insurance, console: consoleData } = result.data;
        
        document.getElementById('passport-count').textContent = `(${urgent.length})`;
        renderSalesTable('passport-table-body', urgent, true);

        document.getElementById('storage-count').textContent = `(${storage.length})`;
        renderSalesTable('storage-table-body', storage, false, true);

        document.getElementById('insurance-count').textContent = `(${insurance.length})`;
        renderSalesTable('insurance-table-body', insurance, false, false, true);

        const consoleCount = consoleData ? consoleData.length : 0;
        document.getElementById('console-count').textContent = `(${consoleCount})`;
        renderConsoleTable('console-table-body', consoleData);

    } else {
        throw new Error(result.error);
    }
}

function renderSalesTable(tbodyId, dataList, showDeadline, showPackingDate = false, showEta = false) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = ""; 

    let colSpan = 3;
    if (showDeadline || showPackingDate || showEta) colSpan++;

    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; color:#888;">데이터가 없습니다.</td></tr>`;
        return;
    }

    dataList.forEach(item => {
        const tr = document.createElement("tr");
        
        let html = "";

        if (showDeadline) {
            html += `<td>${(item.deadline || "").split("T")[0]}</td>`;
        }
        else if (showPackingDate) {
            html += `<td>${(item.packingDate || "").split("T")[0]}</td>`;
        }
        else if (showEta) {
            html += `<td>${(item.eta || "").split("T")[0]}</td>`;
        }

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

    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888;">콘솔 대기 화물이 없습니다.</td></tr>`;
        return;
    }

    dataList.forEach(item => {
        const tr = document.createElement("tr");
        
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
