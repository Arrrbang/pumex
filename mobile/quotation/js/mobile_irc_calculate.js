/* mobile_irc_calculate.js */
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = '/pumex/4_pages/quotation/irc_popup/irc_popup.css';
        document.head.appendChild(cssLink);

        const response = await fetch('/pumex/4_pages/quotation/irc_popup/irc_popup.html');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const htmlText = await response.text();
        const wrapper = document.createElement('div');
        wrapper.innerHTML = htmlText;
        document.body.appendChild(wrapper);

        // 팝업 삽입 완료 후 초기화 로직
        initIrcPopup();
    } catch (e) {
        console.error("보험 팝업 HTML을 불러오는데 실패했습니다.", e);
    }
});

function initIrcPopup() {
    const btnOpenIrc = document.getElementById('btnOpenIrc');
    const ircModal = document.getElementById('ircModal');
    const btnCloseX = document.getElementById('btn_irc_close_x');
    const btnCancel = document.getElementById('btn_irc_cancel');
    const btnApply = document.getElementById('btn_irc_apply');
    
    // 💡 통화 및 단위 관련 요소 가져오기
    const currencySelect = document.getElementById('irc_pop_currency');
    const amountUnit = document.getElementById('irc_amount_unit');
    const resultUnit = document.getElementById('irc_result_unit');
    const amountInput = document.getElementById('irc_amount');
    const rateInput = document.getElementById('irc_rate');
    const calcResult = document.getElementById('irc_calculated_amt');
    
    if (!btnOpenIrc || !ircModal) return;

    // 모달 닫기
    const closeIrcModal = () => {
        ircModal.style.display = 'none';
        amountInput.value = '';
        rateInput.value = '';
        calcResult.textContent = '0';
        
        // 닫을 때 통화 초기화 (KRW) 및 여백 원상복구
        if (currencySelect) {
            currencySelect.value = 'KRW';
            amountUnit.textContent = '만 원';
            resultUnit.textContent = 'KRW';
            amountInput.style.paddingRight = '55px'; // 💡 여백 초기화
        }
    };

    btnCloseX.addEventListener('click', closeIrcModal);
    btnCancel.addEventListener('click', closeIrcModal);

    // 모달 열기
    btnOpenIrc.addEventListener('click', (e) => {
        e.stopPropagation(); // 모바일 아코디언이 함께 눌리는 것 방지
        ircModal.style.display = 'flex';
    });

    // 💡 [핵심 추가] 통화 드롭다운 변경 시 텍스트 즉시 변경 로직
    if (currencySelect) {
        currencySelect.addEventListener('change', function() {
            if (this.value === 'USD') {
                amountUnit.textContent = '달러 ($)';
                resultUnit.textContent = 'USD';
                amountInput.style.paddingRight = '75px'; // 💡 글자가 길어지므로 우측 여백을 넉넉하게 확보!
            } else {
                amountUnit.textContent = '만 원';
                resultUnit.textContent = 'KRW';
                amountInput.style.paddingRight = '55px'; // 💡 원래 여백으로 복구
            }
            calculateIrc(); // 통화가 바뀌면 계산도 다시 실행
        });
    }

    // 보험료 계산 (입력할 때마다 실시간)
    const calculateIrc = () => {
        const amtStr = amountInput.value.replace(/,/g, '');
        const amtNum = parseFloat(amtStr) || 0;
        const rateNum = parseFloat(rateInput.value) || 0;
        const curCode = currencySelect ? currencySelect.value : 'KRW';

        let result = 0;
        if (amtNum > 0 && rateNum > 0) {
            // 💡 KRW일 경우 만원 단위(x10000) 곱하기, USD일 경우 숫자 그대로 계산
            const multiplier = curCode === 'USD' ? 1 : 10000;
            result = (amtNum * multiplier) * (rateNum / 100);
        }
        
        // 소수점 둘째 자리까지 표시하도록 설정 (USD일 경우를 대비)
        calcResult.textContent = Number(result.toFixed(2)).toLocaleString('en-US');
    };

    amountInput.addEventListener('input', function() {
        // 숫자 콤마 포맷팅
        let val = this.value.replace(/[^0-9.]/g, ''); // 달러 소수점을 위해 . 허용
        if (val) {
            // 콤마 로직 (소수점 고려)
            const parts = val.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            this.value = parts.join('.');
        }
        calculateIrc();
    });
    
    rateInput.addEventListener('input', calculateIrc);

    // 적용 버튼 클릭
    btnApply.addEventListener('click', () => {
        const amtStr = amountInput.value;
        const rateStr = rateInput.value;
        const calculatedStr = calcResult.textContent;
        const curCode = currencySelect ? currencySelect.value : 'KRW';
        const symbol = curCode === 'USD' ? '$' : '₩';

        const ircInfoElement = document.getElementById('irc_info');
        const qIrcAmountElement = document.getElementById('q_irc_amount');
        const curIrcElement = document.getElementById('cur_irc');

        if (amtStr && rateStr) {
            // 💡 USD는 입력값 그대로 표기, KRW는 '만 원' 단위이므로 뒤에 '0,000'을 붙여서 표기
            const displayAmt = curCode === 'USD' ? amtStr : `${amtStr}0,000`;
            
            if (ircInfoElement) {
                ircInfoElement.textContent = `Insurance Charge(해상적하보험): Insured Value ${symbol}${displayAmt} * Insurance Rate ${rateStr}%`;
            }
            if (qIrcAmountElement) qIrcAmountElement.textContent = calculatedStr;
            if (curIrcElement) curIrcElement.textContent = curCode;

            // 전체 합계 스크립트 재실행
            if (typeof calculateAllTotals === 'function') {
                calculateAllTotals();
            }
        }
        closeIrcModal();
    });
}