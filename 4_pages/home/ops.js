// home/ops.js

async function initOpsDashboard(username) {
    const API_URL = "https://notion-api-hub.vercel.app/api/home/home-ops"; 

    const response = await fetch(`${API_URL}?username=${username}`);
    if (!response.ok) throw new Error(`Ops Dashboard Error`);
    
    const result = await response.json();
    if (result.ok) {
        const { passportNeeded, upcomingDeadline } = result.data;
        
        document.getElementById('ops-passport-count').textContent = `(${passportNeeded.length})`;
        renderOpsPassportTable(passportNeeded);

        document.getElementById('ops-deadline-count').textContent = `(${upcomingDeadline.length})`;
        renderOpsDeadlineTable(upcomingDeadline);

    } else {
        throw new Error(result.error);
    }
}

function renderOpsPassportTable(dataList) {
    const tbody = document.getElementById('ops-passport-body');
    tbody.innerHTML = "";

    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888;">데이터가 없습니다.</td></tr>`;
        return;
    }

    dataList.forEach(item => {
        const tr = document.createElement("tr");
        const deadlineStyle = item.isUrgentMorning ? 'color: red; font-weight: bold;' : '';

        tr.innerHTML = `
            <td style="${deadlineStyle}">${item.deadline}</td>
            <td>
                <a href="${item.pageUrl}" target="_blank" class="ops-client-link">
                    ${item.clientName}
                </a>
            </td>
            <td>${item.salesRep}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderOpsDeadlineTable(dataList) {
    const tbody = document.getElementById('ops-deadline-body');
    tbody.innerHTML = "";

    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888;">임박한 마감 건이 없습니다.</td></tr>`;
        return;
    }

    dataList.forEach(item => {
        const tr = document.createElement("tr");
        const deadlineStyle = item.isUrgentMorning ? 'color: red; font-weight: bold;' : '';

        tr.innerHTML = `
            <td style="${deadlineStyle}">${item.deadline}</td>
            <td>
                <a href="${item.pageUrl}" target="_blank" class="ops-client-link">
                    ${item.clientName}
                </a>
            </td>
            <td>${item.containerDate || "-"}</td>
        `;
        tbody.appendChild(tr);
    });
}
