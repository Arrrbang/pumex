const SALES_API_URL = "https://notion-api-hub.vercel.app/api/home/home-sales";

// 로그인 계정별 표시명을 여기에서 관리하면 됩니다.
// value는 화면에 보이는 이름이고, key는 localStorage에 저장되는 username입니다.
const SALES_USER_PROFILES = {
    saleb: "이주봉 부장",
    salek: "김영규 프로",
    oh: "오수일 차장",
    eric: "허용수 상무",
    kbs: "김병수 부장",
    pjs: "박제선 프로",
    jackson: "김정철 프로",
    crjung: "정창락 부장",
    sk: "이상권 부장",
    sjh: "심재훈 프로"
};

let salesDashboardState = {
    loginUsername: "",
    selectedUsername: "",
    rawData: {
        urgent: [],
        storage: [],
        insurance: [],
        console: []
    }
};

async function initSalesDashboard(username) {
    salesDashboardState.loginUsername = username;
    salesDashboardState.selectedUsername = username;

    setupSalesFilters(username);
    await loadSalesDashboardData(username);
}

function setupSalesFilters(username) {
    const managerFilter = document.getElementById("sales-manager-filter");
    const resetButton = document.getElementById("sales-filter-reset");

    if (managerFilter && !managerFilter.dataset.ready) {
        managerFilter.innerHTML = Object.entries(SALES_USER_PROFILES)
            .map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`)
            .join("");

        managerFilter.addEventListener("change", async (event) => {
            const selectedUsername = event.target.value;
            salesDashboardState.selectedUsername = selectedUsername;
            await loadSalesDashboardData(selectedUsername);
        });

        managerFilter.dataset.ready = "true";
    }

    if (managerFilter) managerFilter.value = SALES_USER_PROFILES[username] ? username : Object.keys(SALES_USER_PROFILES)[0];

    if (resetButton && !resetButton.dataset.ready) {
        resetButton.addEventListener("click", async () => {
            const countryFilter = document.getElementById("sales-country-filter");
            const statusFilter = document.getElementById("sales-status-filter");
            const periodFilter = document.getElementById("sales-period-filter");

            if (countryFilter) countryFilter.value = "";
            if (statusFilter) statusFilter.value = "";
            if (periodFilter) periodFilter.value = "";
            if (managerFilter) managerFilter.value = salesDashboardState.loginUsername;

            salesDashboardState.selectedUsername = salesDashboardState.loginUsername;
            await loadSalesDashboardData(salesDashboardState.loginUsername);
        });

        resetButton.dataset.ready = "true";
    }
}

async function loadSalesDashboardData(username) {
    const response = await fetch(`${SALES_API_URL}?username=${encodeURIComponent(username)}`);
    if (!response.ok) throw new Error("Dashboard Error");

    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "Dashboard Error");

    const { urgent = [], storage = [], insurance = [], console: consoleData = [] } = result.data || {};

    const filteredConsoleData = filterConsoleBySalesUser(consoleData || [], username);

    salesDashboardState.rawData = {
        urgent,
        storage,
        insurance,
        console: filteredConsoleData
    };

    updateSalesHeader(username);
    updateSalesSummaryCards(salesDashboardState.rawData);
    updateCountryFilterOptions(salesDashboardState.rawData);
    renderSalesDetailTables(salesDashboardState.rawData);
}

function updateSalesHeader(username) {
    const displayName = SALES_USER_PROFILES[username] || username;
    setText("sales-user-display", displayName);
}

function updateSalesSummaryCards(data) {
    const urgentCount = data.urgent.length;
    const insuranceCount = data.insurance.length;
    const storageCount = data.storage.length;
    const consoleCount = data.console.length;
    const totalNeedCount = urgentCount + insuranceCount + storageCount + consoleCount;

    setText("sales-total-need", `${totalNeedCount}건`);
    setText("sales-summary-passport-count", urgentCount);
    setText("sales-summary-insurance-count", insuranceCount);
    setText("sales-summary-storage-count", storageCount);
    setText("sales-summary-console-count", consoleCount);

    setText("passport-count", `전체 ${urgentCount}건`);
    setText("insurance-count", `전체 ${insuranceCount}건`);
    setText("storage-count", `전체 ${storageCount}건`);
    setText("console-count", `전체 ${consoleCount}건`);
}

function updateCountryFilterOptions(data) {
    const countryFilter = document.getElementById("sales-country-filter");
    if (!countryFilter) return;

    const currentValue = countryFilter.value;
    const countrySet = new Set();

    [...data.urgent, ...data.insurance, ...data.storage, ...data.console].forEach((item) => {
        if (item.country) countrySet.add(item.country);
    });

    const options = [`<option value="">전체</option>`]
        .concat([...countrySet].sort().map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`));

    countryFilter.innerHTML = options.join("");
    countryFilter.value = [...countrySet].includes(currentValue) ? currentValue : "";
}

function renderSalesDetailTables(data) {
    renderSalesTable("passport-table-body", data.urgent, true);
    renderSalesTable("storage-table-body", data.storage, false, true);
    renderSalesTable("insurance-table-body", data.insurance, false, false, true);
    renderConsoleTable("console-table-body", data.console);
}

function renderSalesTable(tbodyId, dataList, showDeadline, showPackingDate = false, showEta = false) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.innerHTML = "";

    let colSpan = 3;
    if (showDeadline || showPackingDate || showEta) colSpan++;

    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; color:#888;">데이터가 없습니다.</td></tr>`;
        return;
    }

    dataList.slice(0, 5).forEach(item => {
        const tr = document.createElement("tr");
        let html = "";

        if (showDeadline) {
            html += `<td>${formatDate(item.deadline)}</td>`;
        } else if (showPackingDate) {
            html += `<td>${formatDate(item.packingDate)}</td>`;
        } else if (showEta) {
            html += `<td>${formatDate(item.eta)}</td>`;
        }

        html += `
            <td>${escapeHtml(item.clientName || "-")}</td>
            <td>${escapeHtml(item.country || "-")}</td>
            <td>${escapeHtml(item.assignees || "-")}</td>
        `;

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function renderConsoleTable(tbodyId, dataList) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888;">콘솔 대기 화물이 없습니다.</td></tr>`;
        return;
    }

    dataList.slice(0, 5).forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(item.poe || "-")}</td>
            <td>${formatDate(item.packingDate)}</td>
            <td>${escapeHtml(item.cbm ?? "-")}</td>
            <td>${escapeHtml(item.clientName || "-")}</td>
            <td>${escapeHtml(item.salesRep || "-")}</td>
            <td>${escapeHtml(item.assignees || "-")}</td>
        `;
        tbody.appendChild(tr);
    });
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatDate(value) {
    if (!value) return "-";
    return String(value).split("T")[0];
}

function filterConsoleBySalesUser(consoleData, username) {
    const displayName = SALES_USER_PROFILES[username] || username;

    return consoleData.filter(item => {
        const salesRep = String(item.salesRep || "").trim();
        const assignees = String(item.assignees || "").trim();

        return (
            salesRep === displayName ||
            salesRep === username ||
            assignees === displayName ||
            assignees === username
        );
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}