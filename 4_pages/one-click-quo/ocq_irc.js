// ocq_irc.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. 모달(팝업) HTML 구조 정의
    const ircModalHtml = `
    <div id="ircModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index:9999; justify-content:center; align-items:center;">
        <div class="modal-content" style="background:#fff; border-radius:8px; max-width:450px; width:90%; padding:25px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column;">
            
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--invoice-blue, #1A365D); padding-bottom: 12px; margin-bottom: 20px; flex-shrink: 0;">
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--invoice-blue, #1A365D);">보험료 산출</h3>
                <button type="button" id="btn_irc_close_x" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #999; line-height: 1;">&times;</button>
            </div>
            
            <div class="modal-body">
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-size:0.9rem; font-weight:600; color:#555;">통화 선택</label>
                    <select id="irc_pop_currency" style="width:100%; padding:10px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box; font-size:1rem; outline:none; cursor:pointer;">
                        <option value="KRW" selected>KRW (₩)</option>
                        <option value="USD">USD ($)</option>
                    </select>
                </div>

                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-size:0.9rem; font-weight:600; color:#555;">보험가액</label>
                    <input type="text" id="irc_amount" style="width:100%; padding:10px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box; text-align:right; font-size:1rem;" placeholder="예: 300,000,000">
                </div>
                
                <div style="margin-bottom:20px;">
                    <label style="display:block; margin-bottom:5px; font-size:0.9rem; font-weight:600; color:#555;">보험요율 (%)</label>
                    <input type="number" id="irc_rate" step="0.01" style="width:100%; padding:10px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box; text-align:right; font-size:1rem;" placeholder="예: 2.0">
                </div>
                
                <div style="margin-bottom:25px; padding:15px; background:#f4f6f8; border-radius:8px; text-align:right;">
                    <span style="font-size:0.9rem; color:#666; margin-right:10px;">산출된 보험료:</span>
                    <span id="irc_calculated_amt" style="color:var(--invoice-blue, #1A365D); font-size:1.4rem; font-weight:800;">0</span> 
                    <span id="irc_result_unit" style="font-weight:700; color:#333;">KRW</span>
                </div>
            </div>
            
            <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; flex-shrink: 0;">
                <button type="button" id="btn_irc_cancel" style="padding:10px 25px; border-radius:4px; border:1px solid #aaa; background:transparent; color:#555; cursor:pointer; font-weight:700; font-size:1rem;">취소</button>
                <button type="button" id="btn_irc_apply" style="padding:10px 25px; border-radius:4px; border:none; background:var(--invoice-blue, #1A365D); color:#fff; cursor:pointer; font-weight:700; font-size:1rem;">적용</button>
            </div>
        </div>
    </div>
    `;

    // placeholder에 모달 삽입
    const placeholder = document.getElementById('irc-modal-placeholder');
    if (placeholder) {
        placeholder.innerHTML = ircModalHtml;
    }

    // 2. DOM 요소 연결
    const btnOpenIrc = document.getElementById('btnOpenIrc');
    const ircModal = document.getElementById('ircModal');
    const popCurrency = document.getElementById('irc_pop_currency');
    const inputAmount = document.getElementById('irc_amount');
    const inputRate = document.getElementById('irc_rate');
    const calcAmtText = document.getElementById('irc_calculated_amt');
    const resultUnit = document.getElementById('irc_result_unit');
    
    const btnCancel = document.getElementById('btn_irc_cancel');
    const btnCloseX = document.getElementById('btn_irc_close_x'); 
    const btnApply = document.getElementById('btn_irc_apply');

    // 본문 페이지 요소들
    const descIrc = document.getElementById('desc_irc');
    const curIrc = document.getElementById('cur_irc');
    const qCostIrc = document.getElementById('q_cost_irc');
    const qIrcSubtotal = document.getElementById('q_irc_subtotal');
    const ircCurrencySelect = document.getElementById('ircCurrencySelect');

    // 3. 숫자 포맷 유틸
    const formatNumber = (numStr) => {
        let val = numStr.replace(/[^0-9.]/g, '');
        const points = val.split('.');
        if (points.length > 2) val = points[0] + '.' + points.slice(1).join('');
        if (val && !val.endsWith('.')) {
            const parts = val.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join('.');
        }
        return val;
    };
    const unformatNumber = (str) => Number(str.replace(/,/g, '')) || 0;

    // 4. 모달 열기/닫기 이벤트
    btnOpenIrc.addEventListener('click', () => { ircModal.style.display = 'flex'; });
    const closeModal = () => { ircModal.style.display = 'none'; };
    btnCancel.addEventListener('click', closeModal);
    btnCloseX.addEventListener('click', closeModal);

    // 5. 팝업 내 통화 변경 시 실시간 재계산
    popCurrency.addEventListener('change', (e) => {
        resultUnit.textContent = e.target.value;
        calculatePremium();
    });

    // 6. 팝업 내 실시간 보험료 계산
    const calculatePremium = () => {
        const isUsd = popCurrency.value === 'USD';
        inputAmount.value = formatNumber(inputAmount.value);
        const amount = unformatNumber(inputAmount.value);
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

    // 7. 적용 버튼 클릭 시 (메인으로 데이터 전송)
    btnApply.addEventListener('click', () => {
        const currency = popCurrency.value;
        const amountStr = inputAmount.value;
        const rateStr = inputRate.value;
        const premiumStr = calcAmtText.textContent;

        if (!amountStr || !rateStr) {
            alert("보험가액과 요율을 모두 입력해주세요."); return;
        }

        // ✨ 핵심: 메인 표의 드롭다운에서 환율 변환할 때 사용할 수 있도록 '기본 순수 금액'과 '기본 통화'를 html 속성(dataset)에 저장해둡니다.
        const amountNum = unformatNumber(amountStr);
        const rateNum = Number(rateStr) || 0;
        if (qCostIrc) {
            qCostIrc.dataset.baseAmt = amountNum * (rateNum / 100);
            qCostIrc.dataset.baseCur = currency;
        }

        descIrc.textContent = `Insurance (${currency} ${amountStr} * ${rateStr}%)`;
        if (curIrc) curIrc.textContent = currency;
        if (qCostIrc) qCostIrc.textContent = premiumStr;
        if (qIrcSubtotal) qIrcSubtotal.textContent = premiumStr;
        if (ircCurrencySelect) ircCurrencySelect.value = currency;

        document.dispatchEvent(new Event('costUpdated'));
        closeModal();
    });

    // ✨ 8. [신규 추가] 메인 표 드롭다운 통화 변경 시 환율 실시간 변환 로직!
    if (ircCurrencySelect) {
        ircCurrencySelect.addEventListener('change', (e) => {
            const targetCur = e.target.value;
            if (!qCostIrc) return;

            const baseAmt = Number(qCostIrc.dataset.baseAmt || 0);
            const baseCur = qCostIrc.dataset.baseCur || 'KRW';

            // 값이 없으면 텍스트만 바꾸고 리턴
            if (baseAmt === 0) {
                if (curIrc) curIrc.textContent = targetCur;
                return;
            }

            // 하단 환율표(APPLIED EXCHANGE RATES)에서 현재 환율 숫자를 읽어오는 함수
            const getRate = (cur) => {
                if (cur === 'KRW') return 1;
                const el = document.getElementById(`disp_rate_${cur.toLowerCase()}`);
                if (el && el.textContent !== '-') {
                    const rate = Number(el.textContent.replace(/[^0-9.]/g, ''));
                    if (rate > 0) return rate;
                }
                return 1; // 로딩 전이거나 에러 시 기본값
            };

            const rateBase = getRate(baseCur);
            const rateTarget = getRate(targetCur);

            // 환율 적용! (원래 통화 -> KRW -> 바꿀 통화)
            const amtInKrw = baseAmt * rateBase;
            let convertedAmt = amtInKrw / rateTarget;

            // 포맷팅 (USD, EUR는 소수점 2자리 / KRW는 정수)
            let finalStr = '';
            if (targetCur === 'USD' || targetCur === 'EUR') {
                convertedAmt = Number(convertedAmt.toFixed(2));
                const parts = convertedAmt.toString().split('.');
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                finalStr = parts.join('.');
            } else {
                convertedAmt = Math.round(convertedAmt);
                finalStr = convertedAmt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }

            // 표의 금액 글자 업데이트
            if (curIrc) curIrc.textContent = targetCur;
            qCostIrc.textContent = finalStr;
            if (qIrcSubtotal) qIrcSubtotal.textContent = finalStr;

            // 마지막으로 ocq_sum.js가 총합계(Grand Total)를 다시 계산하도록 신호(Event) 전송
            document.dispatchEvent(new Event('costUpdated'));
        });
    }
});