/* ==========================================================================
   [ocq_des.js]
   역할: DESTINATION CHARGES 기본 데이터 렌더링 / 분류 / 합계 계산 전담

   - sessionStorage.oneClickQuoteData.tableHtml → #q_dest_wrap 삽입
   - CDS / ADD / TAX / OTC 분류 select 생성
   - sum_cds / sum_add / sum_tax / add_list / tax_list / otc_list 업데이트
   - q_summary_subtotal 계산
   - destCurrencySelect 선택 통화에 따라 환율 적용
   - one_click_quo_des.js는 이 파일이 만든 #q_dest_wrap 데이터를 읽어 상세 모달만 표시
   ========================================================================== */

(function () {
    let destBaseCurrency = 'KRW';

    function parseMoneyText(value) {
        if (!value) return 0;

        const text = String(value)
            .replace(/,/g, '')
            .replace(/[^\d.-]/g, '')
            .trim();

        const num = Number(text);
        return Number.isFinite(num) ? num : 0;
    }

    function formatMoneyByCurrency(value, currency) {
        const fractionDigits = currency === 'KRW' ? 0 : 2;

        return Number(value || 0).toLocaleString('en-US', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        });
    }

    function getAmountFromRow(row) {
        const amtTd = row.querySelector('td.amt');

        if (!amtTd) return 0;

        const raw =
            amtTd.dataset.convertedAmt ||
            amtTd.dataset.baseAmt ||
            amtTd.dataset.raw ||
            amtTd.textContent;

        return parseMoneyText(raw);
    }

    function getItemTitleFromRow(row) {
        let title = '항목명 확인 불가';

        const spans = row.querySelectorAll('.item-title span');

        if (spans.length > 0) {
            spans.forEach(span => {
                if (!span.classList.contains('toggle-icon')) {
                    const text = span.textContent.trim();
                    if (text) title = text;
                }
            });

            return title;
        }

        const itemTitle = row.querySelector('.item-title');
        if (itemTitle?.textContent?.trim()) {
            return itemTitle.textContent.trim();
        }

        const firstTextCell = row.querySelector('td:not(.sel):not(.amt)');
        if (firstTextCell?.textContent?.trim()) {
            return firstTextCell.textContent.trim();
        }

        return title;
    }

    function detectBaseCurrency(initialTotalText) {
        const upperTotal = String(initialTotalText || '').toUpperCase();

        if (upperTotal.includes('USD') || upperTotal.includes('$')) return 'USD';
        if (upperTotal.includes('EUR') || upperTotal.includes('€')) return 'EUR';

        return 'KRW';
    }

    async function convertDestinationTotal(baseValue, targetCurrency) {
        if (targetCurrency === destBaseCurrency) {
            return baseValue;
        }

        try {
            const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${destBaseCurrency}`);

            if (!res.ok) {
                throw new Error('도착지 환율 API 호출 실패');
            }

            const data = await res.json();
            const rate = data?.rates?.[targetCurrency];

            if (!rate) {
                throw new Error(`${targetCurrency} 환율 정보 없음`);
            }

            return baseValue * rate;
        } catch (error) {
            console.error('[OCQ DES] 도착지 환율 계산 실패:', error);

            // 환율 실패 시 원본 통화 기준 금액 그대로 표시
            return baseValue;
        }
    }

    async function calculateDestTotal(baseValue) {
        const subTotalEl = document.getElementById('q_summary_subtotal');
        const selectEl = document.getElementById('destCurrencySelect');

        if (!subTotalEl) return;

        const targetCurrency = selectEl?.value || destBaseCurrency;
        const convertedValue = await convertDestinationTotal(baseValue, targetCurrency);

        subTotalEl.dataset.baseValue = String(baseValue);
        subTotalEl.dataset.baseCurrency = destBaseCurrency;
        subTotalEl.dataset.currency = targetCurrency;

        subTotalEl.innerHTML =
            `<span style="display:none;">${targetCurrency}</span>${formatMoneyByCurrency(convertedValue, targetCurrency)}`;

        document.dispatchEvent(new CustomEvent('destinationChargeTotalUpdated', {
            detail: {
                baseValue,
                baseCurrency: destBaseCurrency,
                targetCurrency,
                convertedValue
            }
        }));

        document.dispatchEvent(new CustomEvent('updateQuoteTotal'));
    }

    function normalizeDestinationRows(tbody) {
        tbody.querySelectorAll('.extra-check').forEach(cb => {
            cb.checked = false;
        });

        tbody.querySelectorAll('tr').forEach(row => {
            const firstTd = row.querySelector('td.sel');
            if (!firstTd) return;

            if (row.classList.contains('row-other')) {
                let otherCheck = row.querySelector('.other-check');

                if (!otherCheck) {
                    firstTd.innerHTML = `
                        <label class="sel-check">
                            <input type="checkbox" class="other-check">
                        </label>
                    `;
                }
            } else {
                const isBasic = row.classList.contains('row-basic');
                const hadCheck = row.querySelector('.extra-check') !== null;

                const dropdownHtml = `
                    <select class="type-select">
                        <option value="CDS" ${isBasic ? 'selected' : ''}>CDS</option>
                        <option value="ADD" ${(!isBasic && hadCheck) ? 'selected' : ''}>ADD</option>
                        <option value="OTC">OTC</option>
                        <option value="TAX">TAX</option>
                    </select>
                `;

                firstTd.innerHTML = dropdownHtml;

                if (!isBasic && hadCheck) {
                    let extraCheck = row.querySelector('.extra-check');

                    if (!extraCheck) {
                        extraCheck = document.createElement('input');
                        extraCheck.type = 'checkbox';
                        extraCheck.className = 'extra-check';
                        extraCheck.checked = false;
                        extraCheck.style.display = 'none';
                        row.appendChild(extraCheck);
                    }
                }
            }
        });
    }

    function renderAddList(addItems) {
        const addListEl = document.getElementById('add_list');
        const addAmtListEl = document.getElementById('add_amt_list');

        if (!addListEl || !addAmtListEl) return;

        if (addItems.length > 0) {
            addListEl.innerHTML = addItems
                .map(item => `<div class="otc-item">${item.name}</div>`)
                .join('');

            addAmtListEl.innerHTML = addItems
                .map(item => `<div style="font-size: 0.85em; color: var(--medium-gray); padding: 2px 0;">${formatMoneyByCurrency(item.amount, destBaseCurrency)}</div>`)
                .join('');
        } else {
            addListEl.innerHTML = '';
            addAmtListEl.innerHTML = '';
        }
    }

    function renderTaxList(taxTitles) {
        const taxListEl = document.getElementById('tax_list');
        if (!taxListEl) return;

        taxListEl.innerHTML = taxTitles.length > 0
            ? taxTitles.map(title => `<div class="otc-item">${title}</div>`).join('')
            : '';
    }

    function renderOtcList(otcTitles) {
        const otcListEl = document.getElementById('otc_list');
        if (!otcListEl) return;

        otcListEl.innerHTML = otcTitles.length > 0
            ? otcTitles.map(title => `<div class="otc-item">${title}</div>`).join('')
            : '';
    }

    function getRowType(row) {
        const selectEl = row.querySelector('.type-select');

        if (selectEl) return selectEl.value;

        if (row.classList.contains('row-other')) return 'OTC';

        return '';
    }

    function isRowSelected(row, type) {
        if (type === 'CDS') return true;

        if (type === 'ADD') {
            const check = row.querySelector('.extra-check');
            return check ? check.checked : true;
        }

        if (type === 'TAX') {
            const check = row.querySelector('.extra-check');
            return check ? check.checked : true;
        }

        if (type === 'OTC') {
            const check = row.querySelector('.other-check') || row.querySelector('.extra-check');
            return check ? check.checked : false;
        }

        return false;
    }

    async function updateDestinationSummary() {
        const tbody = document.querySelector('#q_dest_wrap tbody');
        if (!tbody) return;

        const sums = {
            CDS: 0,
            ADD: 0,
            TAX: 0,
            OTC: 0
        };

        const addItems = [];
        const taxTitles = [];
        const otcTitles = [];

        tbody.querySelectorAll('tr').forEach(row => {
            const type = getRowType(row);
            if (!type || sums[type] === undefined) return;

            const selected = isRowSelected(row, type);
            if (!selected) return;

            const amount = getAmountFromRow(row);
            const title = getItemTitleFromRow(row);

            sums[type] += amount;

            if (type === 'ADD') {
                addItems.push({
                    name: title,
                    amount
                });
            } else if (type === 'TAX') {
                taxTitles.push(title);
            } else if (type === 'OTC') {
                otcTitles.push(title);
            }
        });

        const sumCdsEl = document.getElementById('sum_cds');
        const sumAddEl = document.getElementById('sum_add');
        const sumTaxEl = document.getElementById('sum_tax');

        if (sumCdsEl) sumCdsEl.textContent = formatMoneyByCurrency(sums.CDS, destBaseCurrency);
        if (sumAddEl) sumAddEl.textContent = formatMoneyByCurrency(sums.ADD, destBaseCurrency);
        if (sumTaxEl) sumTaxEl.textContent = formatMoneyByCurrency(sums.TAX, destBaseCurrency);

        renderAddList(addItems);
        renderTaxList(taxTitles);
        renderOtcList(otcTitles);

        const subTotal = sums.CDS + sums.ADD + sums.TAX;

        await calculateDestTotal(subTotal);

        console.log('[OCQ DES] 도착지 비용 합계 업데이트:', {
            sums,
            subTotal,
            destBaseCurrency
        });
    }

    function bindDestinationEvents(tbody) {
        tbody.addEventListener('change', e => {
            const target = e.target;

            if (
                target.classList.contains('type-select') ||
                target.classList.contains('extra-check') ||
                target.classList.contains('other-check')
            ) {
                updateDestinationSummary();
            }
        });

        tbody.addEventListener('click', e => {
            const cell = e.target.closest('.item-cell.has-extra');

            if (!cell || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

            const extraDiv = cell.querySelector('.item-extra');
            const icon = cell.querySelector('.toggle-icon');

            if (extraDiv && icon) {
                const isHidden = extraDiv.style.display === 'none' || extraDiv.style.display === '';
                extraDiv.style.display = isHidden ? 'block' : 'none';
                icon.textContent = isHidden ? '▼' : '▶';
            }
        });

        const destCurrencySelect = document.getElementById('destCurrencySelect');

        if (destCurrencySelect) {
            destCurrencySelect.addEventListener('change', () => {
                const subTotalEl = document.getElementById('q_summary_subtotal');
                const baseValue = Number(subTotalEl?.dataset?.baseValue || 0);
                calculateDestTotal(baseValue);
            });
        }
    }

    function initDestinationCharges() {
        const rawData = sessionStorage.getItem('oneClickQuoteData');

        if (!rawData) {
            console.warn('[OCQ DES] oneClickQuoteData가 없습니다.');
            return;
        }

        let data;

        try {
            data = JSON.parse(rawData);
        } catch (error) {
            console.error('[OCQ DES] oneClickQuoteData 파싱 실패:', error);
            return;
        }

        const destWrap = document.getElementById('q_dest_wrap');

        if (!destWrap) {
            console.warn('[OCQ DES] #q_dest_wrap 요소를 찾지 못했습니다.');
            return;
        }

        if (!data.tableHtml) {
            console.error('[OCQ DES] data.tableHtml이 없습니다. 도착지 비용 데이터를 재조회해야 합니다.');
            return;
        }

        destWrap.innerHTML = data.tableHtml;

        const tbody = destWrap.querySelector('tbody');

        if (!tbody) {
            console.error('[OCQ DES] tableHtml 안에서 tbody를 찾지 못했습니다.');
            return;
        }

        const initialTotalText = data.destTotal || '0';
        destBaseCurrency = detectBaseCurrency(initialTotalText);

        const curCdsEl = document.getElementById('cur_cds');
        const curAddEl = document.getElementById('cur_add');
        const destCurrencySelect = document.getElementById('destCurrencySelect');

        if (curCdsEl) curCdsEl.textContent = destBaseCurrency;
        if (curAddEl) curAddEl.textContent = destBaseCurrency;
        if (destCurrencySelect) destCurrencySelect.value = destBaseCurrency;

        normalizeDestinationRows(tbody);
        bindDestinationEvents(tbody);
        updateDestinationSummary();

        console.log('[OCQ DES] 도착지 비용 초기화 완료:', {
            destBaseCurrency,
            data
        });
    }

    document.addEventListener('DOMContentLoaded', initDestinationCharges);

    window.updateDestinationSummary = updateDestinationSummary;
})();