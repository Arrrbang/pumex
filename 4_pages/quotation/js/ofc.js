/* ofc.js */
'use strict';

window.ofcGlobalState = {
    ofcData: null,
    extraCosts: [],
    currency: 'USD',
    validityDate: '',
    consoleBase: '40HC',
    ofcDataList: [],
    extraCostsList: []
};

document.addEventListener('DOMContentLoaded', async () => {
    const savedData = sessionStorage.getItem('finalQuotationData');
    if (!savedData) return;
    
    const quotationData = JSON.parse(savedData);
    const poe = quotationData.q_dest_port;
    
    if (!poe) return;
    
    console.group('%c[OFC 해상운임 데이터 조회 중...]', 'color: #2980b9; font-weight: bold; font-size: 13px;');
    try {
        const response = await fetch(`https://notion-api-hub.vercel.app/api/ofc/ofc-costs?poe=${encodeURIComponent(poe)}`);
        const result = await response.json();
        
        if (result && result.ok) {
            const targetPoe = result.input?.targetPoe || [];
            
            window.ofcGlobalState.ofcDataList = result.ofcData || [];
            window.ofcGlobalState.extraCostsList = result.extraCosts || [];
            window.ofcGlobalState.extraCosts = result.extraCosts || [];
            window.ofcGlobalState.ofcData = null; 

            let currency = 'USD';
            if (window.ofcGlobalState.ofcDataList.length > 0 && window.ofcGlobalState.ofcDataList[0]?.currency) {
                currency = window.ofcGlobalState.ofcDataList[0].currency;
            } else if (window.ofcGlobalState.extraCostsList.length > 0 && window.ofcGlobalState.extraCostsList[0].currency) {
                currency = window.ofcGlobalState.extraCostsList[0].currency;
            }
            window.ofcGlobalState.currency = currency;
            
            console.groupEnd();

            if (typeof window.setupPolDropdown === 'function') {
                window.setupPolDropdown(targetPoe);
                
                const polSelect = document.getElementById('pol_select');
                if (polSelect) {
                    polSelect.addEventListener('change', function() {
                        const selectedText = this.options[this.selectedIndex]?.text || '';
                        let prefix = '';
                        
                        if (selectedText.includes('부산') || selectedText.toUpperCase().includes('BUSAN')) {
                            prefix = '(BUS)';
                        } else if (selectedText.includes('인천') || selectedText.toUpperCase().includes('INCHEON')) {
                            prefix = '(INC)';
                        }
                        
                        window.updateOfcByPrefix(prefix);
                    });
                }
            }
        } else {
            console.warn('⚠️ OFC 데이터를 찾을 수 없습니다.');
            if (typeof window.setupPolDropdown === 'function') window.setupPolDropdown([]);
            console.groupEnd();
        }
    } catch (e) {
        console.error('OFC API 통신 에러:', e);
        console.groupEnd();
    }
});

/**
 * 💡 운임 계산 및 경고창 토글 로직
 */
window.updateOfcByPrefix = function(prefix) {
    const state = window.ofcGlobalState;
    const freightAmountEl = document.getElementById('q_freight_amount');
    const curFreightEl = document.getElementById('cur_freight');

    // 💡 1. 경고 상태 확인 (warning.js에 작성된 함수 호출)
    const warningEl = document.getElementById('ofc_warning_container');
    const isWarning = typeof window.updateOfcWarning === 'function' ? window.updateOfcWarning() : (!prefix);

    // 💡 2. 데이터가 없거나 항구 선택 전일 때
    if (!prefix || !state.ofcDataList || state.ofcDataList.length === 0) {
        state.ofcData = null;
        if (freightAmountEl) {
            freightAmountEl.textContent = isWarning ? '계산 대기' : ''; // 경고 중이면 POL선택 전
            if (warningEl) {
                freightAmountEl.appendChild(warningEl);
                warningEl.style.display = isWarning ? 'inline-flex' : 'none'; // 아이콘 표시
            }
        }
        if (curFreightEl) curFreightEl.textContent = '';
        if (typeof window.calculateAllTotals === 'function') window.calculateAllTotals();
        return;
    }

    // 데이터 매칭
    state.ofcData = state.ofcDataList.find(data => {
        const poeNames = data.poeList || [];
        return poeNames.some(p => p.toUpperCase().includes(prefix.toUpperCase()));
    }) || state.ofcDataList[0];

    if (state.ofcData?.validity) {
        const rawDate = state.ofcData.validity.end || state.ofcData.validity.start;
        state.validityDate = rawDate ? rawDate.replace(/-/g, '/') : '';
    }

    const savedData = sessionStorage.getItem('finalQuotationData');
    if (!savedData) return;
    const quotationData = JSON.parse(savedData);
    
    const containerType = (quotationData.q_container || '20FT').toUpperCase();
    const cbmVal = parseFloat(quotationData.q_cbm) || 1;
    const isConsole = containerType.includes('CON') || containerType.includes('LCL');
    const consoleBase = state.consoleBase || '40HC';

    // 기본 해상운임 계산
    let baseCost = 0;
    if (isConsole) {
        if (consoleBase === '20FT') {
            baseCost = Math.round(((state.ofcData?.cost20DR || 0) / 20) * cbmVal);
        } else {
            baseCost = Math.round(((state.ofcData?.cost40HC || 0) / 50) * cbmVal);
        }
    } else if (containerType.includes('20')) {
        baseCost = state.ofcData?.cost20DR || 0;
    } else {
        baseCost = state.ofcData?.cost40HC || 0;
    }

    // 추가 비용 계산
    let extraTotal = 0;
    if (state.extraCostsList && state.extraCostsList.length > 0) {
         state.extraCostsList.forEach(item => {
            let currentAmt = 0;
            if (isConsole) {
                currentAmt = item.costCONSOLE || 0;
            } else if (containerType.includes('20')) {
                currentAmt = item.cost20 || 0;
            } else if (containerType.includes('40')) {
                currentAmt = item.cost40 || 0;
            }
            extraTotal += currentAmt;
        });
    }

    const finalOceanCost = baseCost + extraTotal;
    
    // 💡 3. 계산 완료 후 화면 반영 및 아이콘 숨김
    if (freightAmountEl) {
        freightAmountEl.textContent = isWarning ? '계산 대기' : finalOceanCost.toLocaleString('en-US');
        freightAmountEl.classList.add('is-typed');
        
        // 보관했던 아이콘을 다시 붙이고 숨김 처리
        if (warningEl) {
            freightAmountEl.appendChild(warningEl);
            warningEl.style.display = isWarning ? 'inline-flex' : 'none'; 
        }
    }
    
    if (curFreightEl) {
        curFreightEl.textContent = state.currency;
    }

    if (typeof window.calculateAllTotals === 'function') {
        window.calculateAllTotals();
    }
};