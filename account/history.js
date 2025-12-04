// history.js - Vercel & Notion 연동 버전

// [수정됨] API 기본 주소 정의 (여기에 주소를 넣으면 모든 함수에 적용됩니다)
const API_BASE_URL = "https://notion-api-hub.vercel.app";

let historyListCache = []; // 목록 캐싱용

document.addEventListener('DOMContentLoaded', () => {
    fetchHistoryList(); // 페이지 로드 시 목록 불러오기
});

// ============================================================
// 1. 저장 (Save) - Vercel 백엔드로 전송
// ============================================================
async function saveCurrentData() {
    if (Object.keys(globalDataMap).length === 0) {
        alert("저장할 데이터가 없습니다. 엑셀 파일을 먼저 업로드해주세요.");
        return;
    }

    const fileName = prompt("저장할 이름을 입력하세요:", `데이터_${new Date().toLocaleTimeString()}`);
    if (!fileName) return;

    // 로딩 표시
    const btn = document.getElementById('btn-save-current');
    const originalText = btn.innerText;
    btn.innerText = "저장 중...";
    btn.disabled = true;

    try {
        const payload = {
            name: fileName,
            id: Date.now(), // 고유 ID
            date: new Date().toLocaleString(),
            b3Date: globalB3Date, // 기준 날짜 객체
            dataMap: globalDataMap // 대용량 데이터
        };

        // [수정됨] 변수 사용
        const response = await fetch(`${API_BASE_URL}/api/account/save-history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            alert("노션 데이터베이스에 저장되었습니다!");
            fetchHistoryList(); // 목록 갱신
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
        // [수정됨] 변수 사용
        const response = await fetch(`${API_BASE_URL}/api/account/get-history-list`); 
        const result = await response.json();

        if (result.ok) {
            historyListCache = result.list; // 데이터 저장 (ID 매핑용)
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
        
        // 체크박스 (삭제용, Notion Page ID를 값으로 사용)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'history-checkbox';
        checkbox.value = item.pageId; // Notion의 Page ID (삭제 시 필요)

        // 이름 (클릭 시 로드, Custom ID 사용)
        const span = document.createElement('span');
        span.className = 'history-name';
        span.innerText = item.name;
        span.title = `저장일시: ${item.date}`;
        
        // 클릭 시 상세 데이터 로드 함수 호출
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
        // [수정됨] 변수 사용 (이제 에러 안 남)
        const response = await fetch(`${API_BASE_URL}/api/account/get-history-item?pageId=${pageId}`);
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "로드 실패");

        const loadedData = result.data; 

        // [수정됨] 안전장치 추가: 데이터가 비어있는지 확인
        if (!loadedData || !loadedData.dataMap) {
            throw new Error("저장된 데이터가 비어있거나 형식이 올바르지 않습니다.\n(이전에 저장 실패한 파일일 수 있습니다. 삭제 후 다시 저장해주세요.)");
        }

        // 1. 기준 날짜 복원
        globalB3Date = new Date(loadedData.b3Date);

        // 2. 데이터 맵 복원
        globalDataMap = loadedData.dataMap;
        
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

    if (!confirm(`${checkboxes.length}개의 항목을 삭제하시겠습니까?\n(노션 휴지통으로 이동됩니다)`)) return;

    // 체크된 Page ID 수집
    const pageIds = Array.from(checkboxes).map(cb => cb.value);

    // 버튼 비활성화
    const btn = document.getElementById('btn-delete-selected');
    btn.innerText = "삭제 중...";
    btn.disabled = true;

    try {
        // [수정됨] 변수 사용
        const response = await fetch(`${API_BASE_URL}/api/account/delete-history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pageIds })
        });

        const result = await response.json();

        if (response.ok) {
            alert("삭제되었습니다.");
            fetchHistoryList(); // 목록 갱신
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

// (헬퍼) 날짜 포맷
function formatDate(dateObj) {
    if (!dateObj || isNaN(dateObj)) return "";
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
