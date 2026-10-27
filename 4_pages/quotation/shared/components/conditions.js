/* mode_type_editor.js */
'use strict';

console.log('✅ CBM/컨테이너 조건 변경 에디터 로드 완료!');

// 팝업용 CSS 동적 삽입 (보험료 산출 팝업 스타일과 통일)
const mteStyle = document.createElement('style');
mteStyle.innerHTML = `
    .mte-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); display: flex; justify-content: center; align-items: center; z-index: 10000; }
    
    .mte-box { background: #fff; width: 95%; max-width: 500px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); padding: 30px; display: flex; flex-direction: column; font-family: 'Noto Sans KR', sans-serif; }
    
    .mte-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f2950; padding-bottom: 12px; margin-bottom: 24px; }
    .mte-header h3 { margin: 0; font-size: 1.35rem; font-weight: 800; color: #0f2950; }
    .mte-btn-close { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #888; line-height: 1; transition: color 0.2s; }
    .mte-btn-close:hover { color: #333; }

    /* 필드 공통 */
    .mte-field-row { display: flex; align-items: stretch; gap: 15px; margin-bottom: 16px; }
    
    /* 좌측 라벨 그룹 */
    .mte-label-group { display: flex; align-items: stretch; width: 160px; flex-shrink: 0; border-radius: 4px; overflow: hidden; }
    .mte-icon { background: #0f2950; color: #fff; width: 44px; display: flex; justify-content: center; align-items: center; font-size: 1.15rem; }
    .mte-label-text { background: #f4f6f9; color: #0f2950; font-weight: 700; font-size: 0.9rem; flex: 1; display: flex; align-items: center; padding-left: 12px; }

    /* 우측 입력창 그룹 */
    .mte-input-group { flex: 1; position: relative; display: flex; align-items: center; }
    .mte-input-group select, .mte-input-group input { width: 100%; padding: 12px 16px; border-radius: 4px; border: 1px solid #cbd5e1; box-sizing: border-box; font-size: 1rem; outline: none; font-family: inherit; color: #333; transition: border-color 0.2s; }
    
    .mte-input-group select { appearance: none; background: url('data:image/svg+xml;utf8,<svg fill="%230f2950" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>') no-repeat right 12px center; background-color: #fff; cursor: pointer; }
    .mte-input-group input { text-align: right; }
    .mte-input-group input:focus, .mte-input-group select:focus { border-color: #0f2950; }
    
    /* 단위 표시 텍스트 */
    .mte-input-unit { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: #0f2950; font-weight: 800; font-size: 0.95rem; pointer-events: none; }

    /* 하단 버튼 */
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
    const savedData = JSON.parse(window.QuotationState.getRaw() || '{}');
    const currentContainer = window.QuotationCalc.containerType(savedData.q_container || '20FT');
    const currentCbm = savedData.q_cbm || '';

    const overlay = document.createElement('div');
    overlay.className = 'mte-overlay';
    
    // 💡 보험료 산출 팝업과 동일한 HTML 구조 및 아이콘 적용
    overlay.innerHTML = `
        <div class="mte-box" onclick="event.stopPropagation()">
            
            <div class="mte-header">
                <h3>견적 조건 변경</h3>
                <button type="button" id="mte-btn-close-x" class="mte-btn-close">&times;</button>
            </div>
            
            <div class="mte-body">
                <!-- 컨테이너 타입 선택 -->
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

                <!-- CBM 입력 -->
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

    const containerSelect=overlay.querySelector('#mte-container');
    const applyButton=overlay.querySelector('#mte-apply');
    containerSelect.replaceChildren(new Option('조회 중…',''));applyButton.disabled=true;
    const params=savedData._fullSearchParams || {};
    window.DestQuotationAPI.fetchContainerTypes(params.countryId || params.country,params.region,params.partner,params.portId || params.poe,params.cargoType)
      .then(items=>{
        if(!overlay.isConnected)return;
        containerSelect.replaceChildren(...items.map(item=>new Option(item.text,item.value)));
        if(items.some(item=>item.value===currentContainer))containerSelect.value=currentContainer;
        applyButton.disabled=!items.length;
      }).catch(error=>{containerSelect.replaceChildren(new Option('조회 실패',''));alert(error.message);});

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

        try {
            if(await applyNewModeType(newContainer, newCbm, savedData)!==false) closeModal();
        } finally {
            btnApply.textContent='재계산 적용';btnApply.style.opacity='';btnApply.style.pointerEvents='';
        }
    });
}

async function applyNewModeType(newContainer, newCbm, savedData) {
    newContainer=window.QuotationCalc.containerType(newContainer);
    console.group('%c[조건 변경에 따른 백엔드 재조회 및 계산 시작]', 'color: #3498db; font-weight: bold;');
    
    const searchParams = { ...(savedData._fullSearchParams || {}) };
    searchParams.containerType = newContainer;
    searchParams.cbm = newCbm;

    try {
        if (!window.CostAPI?.fetchCosts)throw new Error('도착지 비용 연결 모듈을 불러오지 못했습니다.');
        if (window.CostAPI && typeof window.CostAPI.fetchCosts === 'function') {
            console.log('📡 새로운 조건으로 노션 데이터베이스 재검색 중...', searchParams);
            const responseData = await window.CostAPI.fetchCosts(
                searchParams.countryId || searchParams.country, 
                searchParams.region, 
                searchParams.partner, 
                searchParams.cargoType, 
                newContainer, 
                newCbm, 
                searchParams.portId || searchParams.poe
            );
            
            if(!responseData?.ok)throw new Error('도착지 비용 응답을 확인해 주세요.');
            savedData._currency=responseData.currency;
            savedData.cur_cds=responseData.currency;
            savedData.cur_add=responseData.currency;
            savedData.q_destination_add='';
            savedData.q_destination_add_amount='';
            searchParams.countryId=responseData.countryId;
            searchParams.portId=responseData.portId;
            savedData.q_dest_port_code=responseData.portCode;
            savedData.q_dest_port=responseData.poe;
            savedData._rawData = responseData;
            savedData._fullResultData = responseData?.rows ? responseData.rows : (Array.isArray(responseData) ? responseData : []);
            console.log('📥 백엔드 데이터 수신 완료!');
        }
    } catch (e) {
        console.error('❌ 백엔드 재조회 실패:', e);
        alert(e.message || '비용 재조회 중 통신 오류가 발생했습니다.');
        console.groupEnd();
        return false;
    }

    savedData.q_container = newContainer;
    savedData.q_cbm = newCbm;
    savedData._fullSearchParams = searchParams;

    const isConsole = newContainer.includes('CON') || newContainer.includes('LCL');
    const modeTypeStr=window.QuotationCalc.modeType(newContainer,newCbm);
    
    savedData.q_mode_type = modeTypeStr;

    const newCdsAmount=window.QuotationCalc.cds(savedData._fullResultData,newContainer);
    savedData.q_destination_amount = newCdsAmount > 0 ? newCdsAmount.toLocaleString('en-US') : '';

    window.QuotationState.setRaw( JSON.stringify(savedData));

    // ================== 화면 UI 업데이트 ==================

    const modeTypeEl = document.getElementById('q_mode_type');
    if (modeTypeEl) {
        modeTypeEl.textContent = modeTypeStr;
        modeTypeEl.classList.add('is-typed');
        modeTypeEl.dispatchEvent(new Event('input')); 
    }

    for(const id of ['q_destination_add','q_destination_add_amount']){
        const element=document.getElementById(id);if(element)element.textContent='';
    }
    const addCurrency=document.getElementById('cur_add');if(addCurrency)addCurrency.textContent=savedData._currency;
    const currencyEl=document.getElementById('cur_cds');
    if(currencyEl)currencyEl.textContent=savedData._currency;
    window.cdsCheckedItemIds=[];
    const cdsAmtEl = document.getElementById('q_destination_amount');
    if (cdsAmtEl) {
        cdsAmtEl.textContent = savedData.q_destination_amount;
        cdsAmtEl.classList.add('is-typed');
        cdsAmtEl.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('✅ CDS 화면 갱신 및 총합계 트리거 완료:', savedData.q_destination_amount);
    }

    if (typeof calculateTrcConsole === 'function') calculateTrcConsole();

    await window.calculateQuotationSos?.();
    window.calculateOriginTotal?.();
    const polSelect = document.getElementById('pol_select');
    if (polSelect && typeof window.updateOfcByPrefix === 'function') {
        const selectedOption = polSelect.options[polSelect.selectedIndex];
        const prefix = selectedOption ? selectedOption.getAttribute('data-prefix') : '';
        window.updateOfcByPrefix(prefix);
    }

    window.calculateAllTotals?.();
    console.groupEnd();
}
// Keep the same editor usable on narrow field screens.
const conditionResponsiveStyle=document.createElement('style');
conditionResponsiveStyle.textContent='@media(max-width:500px){.mte-box{padding:18px}.mte-field-row{gap:8px}.mte-label-group{width:120px}.mte-icon{width:32px}.mte-label-text{padding-left:6px;font-size:.8rem}.mte-actions button{padding:12px 18px}}';
document.head.appendChild(conditionResponsiveStyle);
