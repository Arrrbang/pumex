/* mobile_sum.js */
(function () {
    'use strict';

    const API_BASE = 'https://api.exchangerate-api.com/v4/latest/';
    const ratesCache = {};

    async function getRate(base, target) {
        base = base.toUpperCase();
        target = target.toUpperCase();
        if (base === target) return 1;

        if (!ratesCache[base]) {
            try {
                const res = await fetch(API_BASE + encodeURIComponent(base));
                if (!res.ok) throw new Error('환율 조회 실패: ' + base);
                const json = await res.json();
                ratesCache[base] = json.rates || {};
            } catch (e) {
                console.error(e);
                return 1;
            }
        }
        return ratesCache[base][target] || 1;
    }

    function parseNumber(value) {
        if (!value) return 0;
        const cleaned = String(value).replace(/[^0-9.-]+/g, '');
        return parseFloat(cleaned) || 0;
    }

    async function calculateCardTotal(cardElement, outputElementId) {
        if (!cardElement || !outputElementId) return 0;

        let totalKrw = 0;
        // 💡 기존 table, tr 대신 모바일 카드 안의 금액 래퍼(.m-li-amount)를 찾습니다.
        const amountWrappers = cardElement.querySelectorAll('.m-li-amount');

        for (const wrapper of amountWrappers) {
            // 항목이 숨김 처리되어 있다면(예: 비용이 0인 추가비용 행) 계산에서 제외
            if (wrapper.closest('li') && window.getComputedStyle(wrapper.closest('li')).display === 'none') {
                continue;
            }

            // 통화와 금액 span 찾기 (첫번째가 통화, 두번째가 금액)
            const spans = wrapper.querySelectorAll('span');
            if (spans.length < 2) continue;

            let currency = spans[0].textContent.trim().toUpperCase();
            if (!currency || currency === 'CUR') currency = 'KRW';

            const amountVal = spans[1].textContent;
            const amountNum = parseNumber(amountVal);

            let convertedVal = amountNum;
            if (currency !== 'KRW') {
                const rate = await getRate(currency, 'KRW');
                convertedVal = amountNum * rate;
            }

            totalKrw += convertedVal;
        }

        // 각 카드의 헤더 영역에 있는 총합 칸에 값 입력
        const totalOutputElem = document.getElementById(outputElementId);
        if (totalOutputElem) {
            totalOutputElem.textContent = Math.round(totalKrw).toLocaleString('en-US');
        }

        return totalKrw;
    }

    async function calculateAllTotals() {
        // 💡 .quote-cost-table 대신 .m-cost-card 기준으로 3개의 카드를 가져옵니다.
        const costCards = document.querySelectorAll('.m-cost-card');
        
        let originKrw = 0;
        let destKrw = 0;
        let ircKrw = 0;

        if (costCards[0]) originKrw = await calculateCardTotal(costCards[0], 'q_origin_total');
        if (costCards[1]) destKrw = await calculateCardTotal(costCards[1], 'q_destination_total');
        if (costCards[2]) ircKrw = await calculateCardTotal(costCards[2], 'q_irc_total');

        // 하단 고정 Total 바에 최종 합계 입력
        const finalTotalElem = document.getElementById('q_final_total_converted');
        if (finalTotalElem) {
            const grandTotalKrw = originKrw + destKrw + ircKrw;
            finalTotalElem.textContent = Math.round(grandTotalKrw).toLocaleString('en-US');
        }
    }

    // 전역 호출 허용
    window.calculateAllTotals = calculateAllTotals;

    function initSumCalculator() {
        // 입력 이벤트 감지 시 재계산
        document.addEventListener('input', function (e) {
            if (e.target.closest('.m-cost-card')) calculateAllTotals();
        });

        // 1초 뒤에 한 번 더 계산 (비동기로 들어오는 데이터 확실히 잡기 위함)
        setTimeout(calculateAllTotals, 500);
        calculateAllTotals();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSumCalculator);
    } else {
        initSumCalculator();
    }
})();