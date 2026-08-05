/* result_origin.js */
'use strict';

window.originCosts = { sos: 0, trc: 0 };

window.calculateOriginTotal = function() {
    const savedData = sessionStorage.getItem('finalQuotationData');
    const quotationData = savedData ? JSON.parse(savedData) : {};
    
    const cbmVal = parseFloat(quotationData.q_cbm) || 1;
    const containerType = (quotationData.q_container || '20FT').toUpperCase();
    const isConsole = containerType.includes('CON') || containerType.includes('LCL');
    
    const rccCost = 10000;
    
    let surchargeCost = 0;
    let surchargeFormula = '';

    if (isConsole) {
        surchargeCost = Math.round((250000 / 55) * cbmVal);
        surchargeFormula = `250,000 / 55 * ${cbmVal} CBM`;
    } else if (containerType.includes('20')) {
        surchargeCost = 200000;
        surchargeFormula = `20FT 고정값`;
    } else {
        surchargeCost = 250000;
        surchargeFormula = `40HC 고정값`;
    }

    const sosCost = window.originCosts.sos || 0;
    const trcCost = window.originCosts.trc || 0;

    const totalOrigin = sosCost + trcCost + rccCost + surchargeCost;

    console.group('%c[q_origin_amount 산출 내역]', 'color: #2c3e50; font-weight: bold; font-size: 14px;');
    console.log(`1. SOS 비용: ${sosCost.toLocaleString()} KRW`);
    console.log(`2. TRC 비용: ${trcCost.toLocaleString()} KRW`);
    console.log(`3. RCC 비용: ${rccCost.toLocaleString()} KRW`);
    console.log(`4. 컨테이너 추가 비용 (${containerType}): ${surchargeCost.toLocaleString()} KRW (계산식: ${surchargeFormula})`);
    console.log(`%c👉 총 합계 (q_origin_amount): ${totalOrigin.toLocaleString()} KRW`, 'color: #e74c3c; font-size: 15px; font-weight: bold;');
    console.groupEnd();

    const originAmountEl = document.getElementById('q_origin_amount');
    if (originAmountEl) {
        const warningEl = document.getElementById('origin_warning_container');
        
        const isWarning = typeof window.updateOriginWarning === 'function' ? window.updateOriginWarning() : false;
        
        // 💡 TRC 계산 통신이 진행 중인지 확인
        const isCalculating = window.isTrcCalculating === true;
        
        // 💡 경고 조건이 있거나 OR 계산 통신이 아직 안 끝났다면 '계산 대기' 유지
        const showPending = isWarning || isCalculating;
        
        originAmountEl.textContent = showPending ? '계산 대기' : totalOrigin.toLocaleString('en-US');
        originAmountEl.classList.add('is-typed');
        
        if (warningEl) {
            originAmountEl.appendChild(warningEl);
            // 💡 느낌표 아이콘은 정보가 부족할 때(isWarning)만 띄우고, 통신 대기(isCalculating) 중일 땐 숨깁니다.
            warningEl.style.display = isWarning ? 'inline-flex' : 'none'; 
        }

        if (typeof window.calculateAllTotals === 'function') {
            window.calculateAllTotals();
        }
    }
};