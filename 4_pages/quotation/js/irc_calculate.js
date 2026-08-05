/* irc_calculate.js */
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 외부 CSS 불러오기
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '../irc_popup/irc_popup.css';
    document.head.appendChild(link);

    // 2. 외부 HTML 팝업 비동기로 불러와 바디에 추가하기
    try {
        const response = await fetch('../irc_popup/irc_popup.html');
        if (!response.ok) throw new Error('Network response was not ok');
        const htmlText = await response.text();
        
        const popupWrapper = document.createElement('div');
        popupWrapper.innerHTML = htmlText;
        document.body.appendChild(popupWrapper);

        // HTML이 추가된 후 이벤트 리스너 세팅
        initIrcModalEvents();
    } catch (e) {
        console.error("보험 팝업 HTML을 불러오는데 실패했습니다.", e);
    }
});


function initIrcModalEvents() {
    const btnOpenIrc = document.getElementById('btnOpenIrc');
    const ircModal = document.getElementById('ircModal');
    const popCurrency = document.getElementById('irc_pop_currency');
    const inputAmount = document.getElementById('irc_amount');
    const amountUnit = document.getElementById('irc_amount_unit'); // 💡 단위 텍스트 요소
    const inputRate = document.getElementById('irc_rate');
    const calcAmtText = document.getElementById('irc_calculated_amt');
    const resultUnit = document.getElementById('irc_result_unit');
    
    const btnCancel = document.getElementById('btn_irc_cancel');
    const btnCloseX = document.getElementById('btn_irc_close_x'); 
    const btnApply = document.getElementById('btn_irc_apply');

    const formatNumber = (numStr) => {
        let val = String(numStr).replace(/[^0-9.]/g, '');
        const points = val.split('.');
        if (points.length > 2) val = points[0] + '.' + points.slice(1).join('');
        if (val && !val.endsWith('.')) {
            const parts = val.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join('.');
        }
        return val;
    };
    
    const unformatNumber = (str) => Number(String(str).replace(/,/g, '')) || 0;

    // 모달 닫기
    const closeModal = () => { ircModal.style.display = 'none'; };
    
    // 모달 열기 및 초기화
    if (btnOpenIrc) {
        btnOpenIrc.addEventListener('click', () => { 
            inputAmount.value = '';
            inputRate.value = '';
            calcAmtText.textContent = '0';
            popCurrency.value = 'KRW';
            resultUnit.textContent = 'KRW';
            
            // 💡 창 열 때 초기값 (KRW) 세팅
            if (amountUnit) amountUnit.textContent = '만 원';
            inputAmount.placeholder = '';
            
            ircModal.style.display = 'flex'; 
        });
    }
    
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    if (btnCloseX) btnCloseX.addEventListener('click', closeModal);
    ircModal.addEventListener('click', (e) => { if(e.target === ircModal) closeModal(); });

    // 통화 변경 (KRW ↔ USD 단위 스왑)
    popCurrency.addEventListener('change', (e) => {
        const isUsd = e.target.value === 'USD';
        resultUnit.textContent = e.target.value;
        
        // 💡 단위 및 placeholder 변경
        if (amountUnit) {
            amountUnit.textContent = isUsd ? '달러' : '만 원';
        }
        inputAmount.placeholder = isUsd ? '' : '';
        
        calculatePremium();
    });

    // 보험료 실시간 계산
    const calculatePremium = () => {
        const isUsd = popCurrency.value === 'USD';
        inputAmount.value = formatNumber(inputAmount.value);
        
        let amount = unformatNumber(inputAmount.value);
        
        // 💡 KRW일 경우 입력값에 10,000(만)을 곱함
        if (!isUsd && amount > 0) {
            amount = amount * 10000;
        }
        
        const rate = Number(inputRate.value) || 0;
        let premium = amount * (rate / 100); 
        
        if (isUsd) {
            premium = Number(premium.toFixed(2));
            const parts = premium.toString().split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            calcAmtText.textContent = parts.join('.');
        } else {
            premium = Math.round(premium);
            calcAmtText.textContent = premium.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    };

    inputAmount.addEventListener('input', calculatePremium);
    inputRate.addEventListener('input', calculatePremium);

    // 적용(Apply) 버튼 클릭 시 화면 출력
    btnApply.addEventListener('click', () => {
        const currency = popCurrency.value;
        const rateStr = inputRate.value;
        const premiumStr = calcAmtText.textContent;

        if (!inputAmount.value || !rateStr) {
            alert("보험가액과 요율을 모두 입력해주세요."); 
            return;
        }

        // 💡 외부로 내보낼 때도 10,000 곱해서 포맷팅
        const isUsd = currency === 'USD';
        let amountNum = unformatNumber(inputAmount.value);
        if (!isUsd) {
            amountNum = amountNum * 10000; 
        }
        const finalAmountStr = amountNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        const getCurrencySymbol = (code) => {
            switch ((code || '').toUpperCase()) {
                case 'USD': return '$';
                case 'KRW': return '₩';
                case 'EUR': return '€';
                case 'JPY': return '¥';
                case 'GBP': return '£';
                default: return code;
            }
        };
        const symbol = getCurrencySymbol(currency);

        // 1. irc_info에 곱해진 최종 가액 문자열 반영
        const ircInfoElement = document.getElementById('irc_info');
        if (ircInfoElement) {
            ircInfoElement.textContent = `Insurance Charge(해상적하보험): Insured Value ${symbol}${finalAmountStr} * Insurance Rate ${rateStr}%`;
        }

        // 2. cur_irc 통화 반영
        const curIrcElement = document.getElementById('cur_irc');
        if (curIrcElement) {
            curIrcElement.textContent = currency;
        }

        // 3. q_irc_amount 최종 금액 반영
        const qIrcAmountElement = document.getElementById('q_irc_amount');
        if (qIrcAmountElement) {
            qIrcAmountElement.textContent = premiumStr;
            qIrcAmountElement.classList.add('is-typed');
        }

        closeModal();

        if (typeof window.calculateAllTotals === 'function') {
            window.calculateAllTotals();
        }
    });
}