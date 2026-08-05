/* load_quotation_sum.js */
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

    async function calculateTableTotal(tableElement, outputElementId) {
        if (!tableElement || !outputElementId) return 0;

        let totalKrw = 0;
        const rows = tableElement.querySelectorAll('tbody tr');

        for (const row of rows) {
            // 제목 행 무시
            if (row.classList.contains('section-header-row')) continue;
            // display:none 상태인 행(비어있는 추가비용 등) 무시
            if (row.style.display === 'none') continue;

            const amountCell = row.querySelector('.text-right');
            const curCell = row.querySelector('td.text-center');

            if (!amountCell) continue;

            const amountVal = amountCell.tagName === 'INPUT' ? amountCell.value : amountCell.textContent;
            const amountNum = parseNumber(amountVal);

            let currency = 'KRW';
            if (curCell) {
                currency = (curCell.tagName === 'INPUT' || curCell.tagName === 'SELECT') ? curCell.value : curCell.textContent;
                currency = currency.trim().toUpperCase();
            }

            if (!currency || currency === 'CUR') currency = 'KRW';

            let convertedVal = amountNum;
            if (currency !== 'KRW') {
                const rate = await getRate(currency, 'KRW');
                convertedVal = amountNum * rate;
            }

            totalKrw += convertedVal;
        }

        const totalOutputElem = document.getElementById(outputElementId);
        if (totalOutputElem) {
            const formattedTotal = Math.round(totalKrw).toLocaleString('en-US');
            if (totalOutputElem.tagName === 'INPUT') {
                totalOutputElem.value = formattedTotal;
            } else {
                totalOutputElem.textContent = formattedTotal;
            }
        }

        return totalKrw;
    }

    async function calculateAllTotals() {
        const costTables = document.querySelectorAll('.quote-cost-table');
        
        let originKrw = 0;
        let destKrw = 0;
        let ircKrw = 0;

        if (costTables[0]) originKrw = await calculateTableTotal(costTables[0], 'q_origin_total');
        if (costTables[1]) destKrw = await calculateTableTotal(costTables[1], 'q_destination_total');
        if (costTables[2]) ircKrw = await calculateTableTotal(costTables[2], 'q_irc_total');

        const finalTotalElem = document.getElementById('q_final_total_converted');
        if (finalTotalElem) {
            const grandTotalKrw = originKrw + destKrw + ircKrw;
            const formattedNum = Math.round(grandTotalKrw).toLocaleString('en-US');
            
            // 💡 [핵심] 원본 견적서와 완전히 동일하게 "KRW   금액" 형태로 출력되도록 복구했습니다.
            finalTotalElem.innerHTML = 'KRW&nbsp;&nbsp;&nbsp;' + formattedNum;
        }
    }

    window.calculateAllTotals = calculateAllTotals;

    function initSumCalculator() {
        document.addEventListener('input', function (e) {
            if (e.target.closest('.quote-cost-table')) calculateAllTotals();
        });

        document.addEventListener('change', function (e) {
            if (e.target.closest('.quote-cost-table')) calculateAllTotals();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSumCalculator);
    } else {
        initSumCalculator();
    }
})();