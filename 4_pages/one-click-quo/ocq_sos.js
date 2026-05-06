/* ==========================================================================
   [ocq_sos.js]
   역할: 원클릭 견적서 전용 SOS 백그라운드 자동 계산 및 상세 정보 팝업 제어
   ========================================================================== */

// 1. 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 상세 정보창(미니 팝업) 뼈대 생성
    createSosInfoPopup();

    // 0.5초 뒤 자동 계산 1회 실행
    setTimeout(autoCalculateSos, 500);

    // 금액 클릭 시 정보창 띄우기 이벤트 연결
    const sosValueEl = document.getElementById('q_cost_sos');
    if (sosValueEl) {
        sosValueEl.style.cursor = 'pointer';
        sosValueEl.addEventListener('click', showSosInfo);
    }
});

// 2. [핵심] SOS 자동 계산 함수
async function autoCalculateSos() {
    const sosValueEl = document.getElementById('q_cost_sos'); 
    if (!sosValueEl) return;

    // 데이터 추출
    const pdateInput = document.getElementById('q_pdate');
    const dateVal = pdateInput ? pdateInput.value : '';
    
    // ✨ 방어 코드: 날짜가 없거나 '클릭하여' 같은 한글 텍스트면 계산 중단!
    if (!dateVal || dateVal.includes('클릭하여')) {
        sosValueEl.textContent = "0";
        return;
    }

    const rawData = sessionStorage.getItem('oneClickQuoteData');
    const data = JSON.parse(rawData || '{}');
    const cargoRaw = (data.cargo || '').toUpperCase();
    
    // CBM 추출
    const cbmMatch = cargoRaw.match(/([\d.]+)\s*CBM/i);
    const cbmVal = cbmMatch ? parseFloat(cbmMatch[1]) : 1;

    // 타입 추출
    let typeVal = '40HC';
    const containerSelect = document.getElementById('q_container_select');
    
    if (containerSelect) {
        typeVal = 'CONSOLE'; 
    } else {
        if (cargoRaw.includes('CON') || cargoRaw.includes('LCL')) typeVal = 'CONSOLE';
        else if (cargoRaw.includes('20')) typeVal = '20DRY';
        else typeVal = '40HC';
    }

    // 🔍 블랙박스 (F12 콘솔 확인용)
    console.log(`[SOS 자동계산 요청] 📅날짜: ${dateVal}, 📦타입: ${typeVal}, ⚖️CBM: ${cbmVal}`);
    
    sosValueEl.textContent = "계산 중...";

    try {
        if (typeof window.fetchSosRateData === 'function') {
            const res = await window.fetchSosRateData(dateVal, typeVal, cbmVal);
            
            if (res && res.ok && res.match && res.match.value != null) {
                // 금액 표시
                sosValueEl.textContent = res.match.value.toLocaleString();
                
                // 팝업용 데이터 저장
                const dayOfWeek = new Date(dateVal).getDay();
                const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? '주말' : '주중';
                sosValueEl.dataset.sosInfo = `${dateVal} / ${dayType} / ${typeVal} / ${cbmVal} CBM`;
                
                document.dispatchEvent(new CustomEvent('updateQuoteTotal'));
            } else {
                sosValueEl.textContent = "0";
                sosValueEl.dataset.sosInfo = "요금 데이터 없음";
            }
        } else {
            sosValueEl.textContent = "0";
            console.error("fetchSosRateData 함수를 찾을 수 없습니다.");
        }
    } catch (e) {
        console.error("SOS 자동 계산 중 에러 발생:", e);
        sosValueEl.textContent = "0";
    }
}

// 3. 미니 팝업 UI 생성
function createSosInfoPopup() {
    if (document.getElementById('sosInfoOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'sosInfoOverlay';
    overlay.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.15); z-index: 9998; backdrop-filter: blur(1px);';
    
    const popup = document.createElement('div');
    popup.id = 'sosInfoPopup';
    popup.style.cssText = 'display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 9999; min-width: 260px; border: 2px solid #1A365D; font-family: sans-serif;';
    
    overlay.onclick = hideSosInfo;
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
}

// 4. 정보창 보여주기
function showSosInfo(e) {
    const info = e.target.dataset.sosInfo;
    if (!info) return;

    const overlay = document.getElementById('sosInfoOverlay');
    const popup = document.getElementById('sosInfoPopup');
    
    const parts = info.split(' / ');
    const html = `
        <div style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
            <h4 style="margin:0; color:#1A365D; font-size:16px;">🔍 적용된 SOS 정보</h4>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:14px; color:#555;">
            <div style="display:flex; justify-content:space-between;"><b>작업일자:</b> <span>${parts[0] || '-'} (${parts[1] || '-'})</span></div>
            <div style="display:flex; justify-content:space-between;"><b>작업타입:</b> <span>${parts[2] || '-'}</span></div>
            <div style="display:flex; justify-content:space-between;"><b>CBM:</b> <span>${parts[3] || '-'}</span></div>
        </div>
        <button onclick="hideSosInfo()" style="margin-top:15px; width:100%; padding:8px; background:#1A365D; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">확인</button>
    `;
    
    popup.innerHTML = html;
    overlay.style.display = 'block';
    popup.style.display = 'block';
}

// 5. 정보창 숨기기
function hideSosInfo() {
    document.getElementById('sosInfoOverlay').style.display = 'none';
    document.getElementById('sosInfoPopup').style.display = 'none';
}

// ✨ 아주 중요: 이 파일 안의 함수들을 밖에서도 쓸 수 있게 창문 열어주기!
window.autoCalculateSos = autoCalculateSos;
window.hideSosInfo = hideSosInfo;