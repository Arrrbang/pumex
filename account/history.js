const API_BASE_URL = "https://notion-api-hub.vercel.app";

let historyListCache = []; // 목록 캐싱용

document.addEventListener('DOMContentLoaded', () => {
    fetchHistoryList(); // 페이지 로드 시 목록 불러오기
});

// ============================================================
// [신규] 자동 비교를 위한 최신 데이터 가져오기 (UI 없음)
// ============================================================
async function fetchLatestHistoryForComparison() {
    try {
        // 1. 목록 가져오기
        const listResponse = await fetch(`${API_BASE_URL}/api/account/get-history-list`);
        const listResult = await listResponse.json();

        if (!listResult.ok || !listResult.list || listResult.list.length === 0) {
            return null; // 저장된 기록 없음
        }

        // 최신 항목 (첫 번째)의 Page ID
        const latestPageId = listResult.list[0].pageId;

        // 2. 상세 데이터 가져오기
        const detailResponse = await fetch(`${API_BASE_URL}/api/account/get-history-item?pageId=${latestPageId}`);
        const detailResult = await detailResponse.json();

        if (!detailResponse.ok || !detailResult.data || !detailResult.data.dataMap) {
            return null;
        }

        return detailResult.data.dataMap; // 최신 데이터맵 반환

    } catch (error) {
        console.error("Auto-fetch Error:", error);
        return null;
    }
}

// ============================================================
// 1. 저장 (Save)
// ============================================================
async function saveCurrentData() {
    if (Object.keys(globalDataMap).length === 0) {
        alert("저장할 데이터가 없습니다. 엑셀 파일을 먼저 업로드해주세요.");
        return;
    }

    const fileName = prompt("저장할 이름을 입력하세요:", `데이터_${new Date().toLocaleTimeString()}`);
    if (!fileName) return;

    const btn = document.getElementById('btn-save-current');
    const originalText = btn.innerText;
    btn.innerText = "저장 중...";
    btn.disabled = true;

    try {
        const payload = {
            name: fileName,
            id: Date.now(), 
            date: new Date().toLocaleString(),
            b3Date: globalB3Date, 
            dataMap: globalDataMap // 여기에는 이제 'remark' 필드도 포함됨
        };

        const response = await fetch(`${API_BASE_URL}/api/account/save-history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            alert("노션 데이터베이스에 저장되었습니다!");
            fetchHistoryList(); 
        } else {
            throw new Error(result.error || "저장 실패");
        }

    } catch (error) {
        console.error("Save Error:", error);
        alert(`저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ============================================================
// 2. 목록 불러오기 (Read List)
// ============================================================
async function fetchHistoryList() {
    const listEl = document.getElementById('history-list');
    listEl.innerHTML = '<li style="padding:10px; text-align:center;">로딩 중...</li>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/account/get-history-list`); 
        const result = await response.json();

        if (result.ok) {
            historyListCache = result.list; 
            renderHistoryListUI(result.list);
        } else {
            listEl.innerHTML = '<li class="empty-msg">목록을 불러오지 못했습니다.</li>';
        }
    } catch (error) {
        console.error(error);
        listEl.innerHTML = '<li class="empty-msg">서버 연결 오류</li>';
    }
}

function renderHistoryListUI(list) {
    const listEl = document.getElementById('history-list');
    listEl.innerHTML = "";

    if (!list || list.length === 0) {
        listEl.innerHTML = '<li class="empty-msg">저장된 내역이 없습니다.</li>';
        return;
    }

    list.forEach(item => {
        const li = document.createElement('li');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'history-checkbox';
        checkbox.value = item.pageId; 

        const span = document.createElement('span');
        span.className = 'history-name';
        span.innerText = item.name;
        span.title = `저장일시: ${item.date}`;
        
        span.onclick = () => loadHistoryItem(item.pageId, item.name);

        li.appendChild(checkbox);
        li.appendChild(span);
        listEl.appendChild(li);
    });
}

// ============================================================
// 3. 상세 데이터 불러오기 (Load Item)
// ============================================================
async function loadHistoryItem(pageId, name) {
    if (!confirm(`[${name}] 데이터를 불러오시겠습니까?\n현재 작업 중인 내용은 사라집니다.`)) return;

    const listEl = document.getElementById('history-list');
    const originalOpacity = listEl.style.opacity;
    listEl.style.opacity = '0.5';
    document.body.style.cursor = 'wait';

    try {
        const response = await fetch(`${API_BASE_URL}/api/account/get-history-item?pageId=${pageId}`);
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "로드 실패");

        const loadedData = result.data; 

        if (!loadedData || !loadedData.dataMap) {
            throw new Error("저장된 데이터가 비어있거나 형식이 올바르지 않습니다.");
        }

        globalB3Date = new Date(loadedData.b3Date);
        globalDataMap = loadedData.dataMap;
        
        // 날짜 객체 복원
        Object.keys(globalDataMap).forEach(key => {
            const data = globalDataMap[key];
            if (data.details) {
                data.details.forEach(row => {
                    if (row.btDate) {
                        row.btDate = new Date(row.btDate);
                    }
                });
            }
        });

        const dateText = formatDate(globalB3Date);
        renderMainTable(dateText);

        alert("불러오기 완료!");

    } catch (error) {
        console.error("Load Error:", error);
        alert(`불러오기 실패: ${error.message}`);
    } finally {
        listEl.style.opacity = originalOpacity || '1';
        document.body.style.cursor = 'default';
    }
}

// ============================================================
// 4. 삭제 (Delete)
// ============================================================
async function deleteSelectedHistory() {
    const list = document.getElementById('history-list');
    const checkboxes = list.querySelectorAll('.history-checkbox:checked');

    if (checkboxes.length === 0) {
        alert("삭제할 항목을 선택해주세요.");
        return;
    }

    if (!confirm(`${checkboxes.length}개의 항목을 삭제하시겠습니까?`)) return;

    const pageIds = Array.from(checkboxes).map(cb => cb.value);

    const btn = document.getElementById('btn-delete-selected');
    btn.innerText = "삭제 중...";
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/account/delete-history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pageIds })
        });

        const result = await response.json();

        if (response.ok) {
            alert("삭제되었습니다.");
            fetchHistoryList(); 
        } else {
            throw new Error(result.error || "삭제 실패");
        }
    } catch (error) {
        console.error("Delete Error:", error);
        alert("삭제 중 오류가 발생했습니다.");
    } finally {
        btn.innerText = "삭제";
        btn.disabled = false;
    }
}

function formatDate(dateObj) {
    if (!dateObj || isNaN(dateObj)) return "";
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
