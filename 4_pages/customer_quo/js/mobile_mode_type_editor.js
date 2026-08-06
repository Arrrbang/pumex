/* mobile_mode_type_editor.js */
'use strict';

console.log('📱 모바일 전용 CBM/컨테이너 조건 변경 에디터 로드 완료!');

// 팝업용 CSS 동적 삽입
const mteStyle = document.createElement('style');
mteStyle.innerHTML = `
    .mte-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); display: flex; justify-content: center; align-items: center; z-index: 10000; }
    .mte-box { background: #fff; width: 95%; max-width: 500px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); padding: 30px; display: flex; flex-direction: column; font-family: 'Noto Sans KR', sans-serif; }
    .mte-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f2950; padding-bottom: 12px; margin-bottom: 24px; }
    .mte-header h3 { margin: 0; font-size: 1.35rem; font-weight: 800; color: #0f2950; }
    .mte-btn-close { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #888; line-height: 1; transition: color 0.2s; }
    .mte-btn-close:hover { color: #333; }
    .mte-field-row { display: flex; align-items: stretch; gap: 15px; margin-bottom: 16px; }
    .mte-label-group { display: flex; align-items: stretch; width: 160px; flex-shrink: 0; border-radius: 4px; overflow: hidden; }
    .mte-icon { background: #0f2950; color: #fff; width: 44px; display: flex; justify-content: center; align-items: center; font-size: 1.15rem; }
    .mte-label-text { background: #f4f6f9; color: #0f2950; font-weight: 700; font-size: 0.9rem; flex: 1; display: flex; align-items: center; padding-left: 12px; }
    .mte-input-group { flex: 1; position: relative; display: flex; align-items: center; }
    .mte-input-group select, .mte-input-group input { width: 100%; padding: 12px 16px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; font-size: 1rem; outline: none; font-family: inherit; color: #333; transition: border-color 0.2s; }
    .mte-input-group select { appearance: none; background: url('data:image/svg+xml;utf8,<svg fill="%230f2950" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>') no-repeat right 12px center; background-color: #fff; cursor: pointer; }
    .mte-input-group input { text-align: right; }
    .mte-input-group input:focus, .mte-input-group select:focus { border-color: #0f2950; }
    .mte-input-unit { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: #0f2950; font-weight: 800; font-size: 0.95rem; pointer-events: none; }
    .mte-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    .mte-btn-cancel { padding: 12px 32px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; color: #333; cursor: pointer; font-weight: 700; font-size: 1rem; transition: background 0.2s; }
    .mte-btn-cancel:hover { background: #f1f5f9; }
    .mte-btn-apply { padding: 12px 32px; border-radius: 6px; border: none; background: #0f2950; color: #fff; cursor: pointer; font-weight: 700; font-size: 1rem; transition: opacity 0.2s; }
    .mte-btn-apply:hover { opacity: 0.9; }
`;
document.head.appendChild(mteStyle);

document.addEventListener('DOMContentLoaded', () => {
    const btnEditModeType = document.getElementById('btnEditModeType');
    if (!btnEditModeType) return;

    btnEditModeType.addEventListener('click', () => {
        openModeTypeEditor();
    });
});

function openModeTypeEditor() {
    const savedData = JSON.parse(sessionStorage.getItem('finalQuotationData') || '{}');
    const currentContainer = savedData.q_container || '20FT';
    const currentCbm = savedData.q_cbm || '';

    const overlay = document.createElement('div');
    overlay.className = 'mte-overlay';
    
    overlay.innerHTML = `
        <div class="mte-box" onclick="event.stopPropagation()">
            <div class="mte-header">
                <h3>견적 조건 변경</h3>
                <button type="button" id="mte-btn-close-x" class="mte-btn-close">&times;</button>
            </div>
            <div class="mte-body">
                <div class="mte-field-row">
                    <div class="mte-label-group">
                        <div class="mte-icon"><i class="fa-solid fa-truck-fast"></i></div>
                        <div class="mte-label-text">컨테이너 타입</div>
                    </div>
                    <div class="mte-input-group">
                        <select id="mte-container">
                            <option value="20FT" ${currentContainer.includes('20') ? 'selected' : ''}>20FT</option>
                            <option value="40HC" ${currentContainer.includes('40') ? 'selected' : ''}>40HC</option>
                            <option value="CONSOLE" ${currentContainer.includes('CON') || currentContainer.includes('LCL') ? 'selected' : ''}>CONSOLE</option>
                        </select>
                    </div>
                </div>
                <div class="mte-field-row">
                    <div class="mte-label-group">
                        <div class="mte-icon"><i class="fa-solid fa-box-open"></i></div>
                        <div class="mte-label-text">총 물량 (CBM)</div>
                    </div>
                    <div class="mte-input-group">
                        <input type="number" id="mte-cbm" value="${currentCbm}" step="1" min="0" style="padding-right: 55px;">
                        <span class="mte-input-unit">CBM</span>
                    </div>
                </div>
            </div>
            <div class="mte-actions">
                <button type="button" class="mte-btn-cancel" id="mte-cancel">취소</button>
                <button type="button" class="mte-btn-apply" id="mte-apply">재계산 적용</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    document.getElementById('mte-cancel').addEventListener('click', closeModal);
    document.getElementById('mte-btn-close-x').addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    document.getElementById('mte-apply').addEventListener('click', async (e) => {
        const btnApply = e.target;
        const newContainer = document.getElementById('mte-container').value;
        const newCbm = document.getElementById('mte-cbm').value;

        btnApply.textContent = '조회 및 계산 중...';
        btnApply.style.opacity = '0.7';
        btnApply.style.pointerEvents = 'none';

        await applyNewModeType(newContainer, newCbm, savedData);
        closeModal();
    });
}

async function applyNewModeType(newContainer, newCbm, savedData) {
    console.group('%c[조건 변경에 따른 백엔드 재조회 및 계산 시작]', 'color: #3498db; font-weight: bold;');
    
    const searchParams = savedData._fullSearchParams || {};
    searchParams.containerType = newContainer;
    searchParams.cbm = newCbm;

    try {
        if (window.CostAPI && typeof window.CostAPI.fetchCosts === 'function') {
            const responseData = await window.CostAPI.fetchCosts(
                searchParams.country, 
                searchParams.region, 
                searchParams.partner, 
                searchParams.cargoType, 
                newContainer, 
                newCbm, 
                searchParams.poe
            );
            
            savedData._rawData = responseData;
            savedData._fullResultData = responseData?.rows ? responseData.rows : (Array.isArray(responseData) ? responseData : []);
        }
    } catch (e) {
        console.error('❌ 백엔드 재조회 실패:', e);
        alert('비용 재조회 중 통신 오류가 발생했습니다.');
    }

    savedData.q_container = newContainer;
    savedData.q_cbm = newCbm;
    savedData._fullSearchParams = searchParams;

    const isConsole = newContainer.includes('CON') || newContainer.includes('LCL');
    const modeTypeStr = isConsole 
        ? `Door to Door / ${newContainer} (${newCbm} CBM)`
        : `Door to Door / ${newContainer} Single Container (${newCbm} CBM)`;
    
    savedData.q_mode_type = modeTypeStr;

    // 도착지 비용 재계산
    let newCdsAmount = 0;
    if (savedData._fullResultData && Array.isArray(savedData._fullResultData)) {
        savedData._fullResultData.forEach(item => {
            if (item.rowType === 'CDS') {
                newCdsAmount += parseFloat(item[newContainer]) || 0;
            }
        });
    }
    savedData.q_destination_amount = newCdsAmount > 0 ? newCdsAmount.toLocaleString('en-US') : '';

    sessionStorage.setItem('finalQuotationData', JSON.stringify(savedData));

    // ================== 화면 UI 및 비용 업데이트 ==================

    // 1. 화면 텍스트 갱신
    const modeTypeEl = document.getElementById('q_mode_type');
    if (modeTypeEl) modeTypeEl.textContent = modeTypeStr;

    const cdsAmtEl = document.getElementById('q_destination_amount');
    if (cdsAmtEl) cdsAmtEl.textContent = savedData.q_destination_amount;

    // 2. 모바일 TRC 내륙운송료 갱신 
    if (typeof calculateTrcConsole === 'function') calculateTrcConsole();

    // 3. 모바일 전용 SOS 재계산 직접 실행 (가장 확실한 방법!)
    if (typeof calculateMobileSos === 'function') {
        await calculateMobileSos();
    }

    // 4. POL 관련 재계산 (해상운임)
    const polSelect = document.getElementById('pol_select');
    if (polSelect && typeof window.updateOfcByPrefix === 'function') {
        const selectedOption = polSelect.options[polSelect.selectedIndex];
        const prefix = selectedOption ? selectedOption.getAttribute('data-prefix') : '';
        window.updateOfcByPrefix(prefix);
    }

    // 5. 모바일 전용 총 합계 스크립트 실행
    if (typeof calculateAllTotals === 'function') {
        setTimeout(calculateAllTotals, 300); // 비동기 데이터 처리를 위해 살짝 딜레이
    }

    console.log('✅ 모바일 조건 변경 완벽 반영 완료!');
    console.groupEnd();
}