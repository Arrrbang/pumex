
document.addEventListener('DOMContentLoaded', () => {
    const rawData = sessionStorage.getItem('oneClickQuoteData');
    if (!rawData) {
        alert("견적 데이터가 없습니다. 메인 화면으로 이동합니다.");
        window.location.href = '/pumex/4_pages/destinationcost/1_search/index.html'; 
        return;
    }

    const data = JSON.parse(rawData);

    document.getElementById('q_partner').textContent = data.partner || '-';
    document.getElementById('q_location').textContent = data.location || '-';
    let cargoStr = data.cargo || '-';
    cargoStr = cargoStr.replace(/cbm\s*cbm/ig, 'CBM'); 
    document.getElementById('q_cargo').textContent = cargoStr;

    function autoFitInfoText() {
        const targetIds = ['q_partner', 'q_location', 'q_cargo'];
        targetIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            
            el.style.fontSize = '1.1rem';
            let currentSize = 1.1;
            
            while (el.scrollWidth > el.clientWidth && currentSize > 0.65) {
                currentSize -= 0.05;
                el.style.fontSize = currentSize + 'rem';
            }
        });
    }

    autoFitInfoText();

    window.addEventListener('resize', autoFitInfoText);

    const destWrap = document.getElementById('q_dest_wrap');
    if (!destWrap || !data.tableHtml) {
        console.error("데이터를 재조회 해주세요.");
        return;
    }

    destWrap.innerHTML = data.tableHtml;
    const tbody = destWrap.querySelector('tbody');
    const initialTotalText = data.destTotal || '0';

    if (tbody) {
        const prefixMatch = initialTotalText.match(/^[^\d\-]+/);
        const suffixMatch = initialTotalText.match(/[^\d]+$/);
        const currencyPrefix = prefixMatch ? prefixMatch[0] : '';
        const currencySuffix = suffixMatch ? suffixMatch[0] : '';
        function formatCurrency(val) {
            return currencyPrefix + val.toLocaleString('en-US') + currencySuffix;
        }

        tbody.querySelectorAll('.extra-check').forEach(cb => { cb.checked = false; });
        tbody.querySelectorAll('tr').forEach(row => {
            const firstTd = row.querySelector('td.sel');
            if (!firstTd) return;

            if (row.classList.contains('row-other')) {
                firstTd.innerHTML = `<label class="sel-check"><input type="checkbox" class="other-check"></label>`;
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
            }
        });

        function updateSummary() {
            let sums = { CDS: 0, ADD: 0, TAX: 0, OTC: 0 };
            let otherTitles = [];
            let addItems = []; 

            tbody.querySelectorAll('tr').forEach(row => {
                const amtTd = row.querySelector('td.amt');
                const val = Number(amtTd?.dataset.convertedAmt || amtTd?.dataset.baseAmt || amtTd?.dataset.raw || 0);

                if (row.classList.contains('row-other')) {
                    const isChecked = row.querySelector('.other-check')?.checked;
                    if (isChecked) {
                        let title = '상세 정보';
                        const spans = row.querySelectorAll('.item-title span');
                        spans.forEach(s => { if (!s.classList.contains('toggle-icon')) title = s.textContent.trim(); });
                        otherTitles.push(title);
                    }
                } else {
                    const type = row.querySelector('.type-select')?.value;
                    const isChecked = row.querySelector('.extra-check') ? row.querySelector('.extra-check').checked : true;
                    if (isChecked && type && sums[type] !== undefined) {
                        sums[type] += val;

                        if (type === 'ADD') {
                            let title = '항목명 확인 불가';
                            const spans = row.querySelectorAll('.item-title span');
                            spans.forEach(s => { if (!s.classList.contains('toggle-icon')) title = s.textContent.trim(); });
                            addItems.push({ name: title, amount: val });
                        }
                    }
                }
            });

            document.getElementById('sum_cds').textContent = formatCurrency(sums.CDS);
            document.getElementById('sum_add').textContent = formatCurrency(sums.ADD);
            document.getElementById('sum_tax').textContent = formatCurrency(sums.TAX);
            
            // ADD 리스트 화면 렌더링
            const addListEl = document.getElementById('add_list');
            const addAmtListEl = document.getElementById('add_amt_list');
            if (addListEl && addAmtListEl) {
                if (addItems.length > 0) {
                    addListEl.innerHTML = addItems.map(item => `<div class="otc-item">${item.name}</div>`).join('');
                    addAmtListEl.innerHTML = addItems.map(item => `<div style="font-size: 0.85em; color: var(--medium-gray); padding: 2px 0;">${formatCurrency(item.amount)}</div>`).join('');
                } else {
                    addListEl.innerHTML = '';
                    addAmtListEl.innerHTML = '';
                }
            }

            const otcListEl = document.getElementById('otc_list');
            if (otcListEl) {
                if (otherTitles.length > 0) {
                    otcListEl.innerHTML = otherTitles.map(t => `<div class="otc-item">${t}</div>`).join('');
                } else {
                    otcListEl.innerHTML = '';
                }
            }

            const subTotal = sums.CDS + sums.ADD + sums.TAX;
            document.getElementById('q_summary_subtotal').textContent = formatCurrency(subTotal);
        }

        tbody.addEventListener('change', (e) => {
            if (e.target.classList.contains('type-select') || e.target.classList.contains('other-check') || e.target.classList.contains('extra-check')) {
                updateSummary();
            }
        });
        updateSummary();

        const btnToggle = document.getElementById('btnListToggle');
        const contentToggle = document.getElementById('toggleContentList');
        const iconToggle = document.getElementById('toggleIconList');
        btnToggle.addEventListener('click', () => {
            const isHidden = contentToggle.style.display === 'none';
            contentToggle.style.display = isHidden ? 'block' : 'none';
            iconToggle.textContent = isHidden ? '▲' : '▼';
        });
        contentToggle.style.display = 'none'; 

        tbody.addEventListener('click', function(e) {
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
    }

    function parseKrw(str) {
        if (!str) return 0;
        return Number(str.replace(/[^0-9]/g, '')) || 0;
    }
    function formatKrw(num) {
        return num.toLocaleString('ko-KR') + '원';
    }

    function updateOriginCosts() {
        const localPackEl = document.getElementById('q_cost_local_pack');
        const sosEl = document.getElementById('q_cost_sos');
        const rccEl = document.getElementById('q_cost_rcc');
        const originTotalEl = document.getElementById('q_origin_total');

        if (!localPackEl || !sosEl || !rccEl || !originTotalEl) return;

        let packVal = parseKrw(localPackEl.textContent);
        let sosVal = parseKrw(sosEl.textContent);
        let rccVal = parseKrw(rccEl.textContent);

        if (packVal > 0) {
            sosVal = 200000;
            sosEl.textContent = formatKrw(sosVal);
        }
        if (sosVal > 0) {
            rccVal = 10000;
            rccEl.textContent = formatKrw(rccVal);
        }

        originTotalEl.textContent = formatKrw(packVal + sosVal + rccVal);
    }

    function parseCurrencyText(text) {
        if (!text || text.includes('조회') || text.includes('없음') || text.includes('-')) return { currency: 'KRW', amount: 0 };
        
        const upper = text.toUpperCase();
        let currency = 'KRW'; 
        
        if (upper.includes('USD') || upper.includes('$')) currency = 'USD';
        else if (upper.includes('EUR') || upper.includes('€')) currency = 'EUR';
        
        const match = text.match(/[\d,.]+/);
        if (!match) return { currency: 'KRW', amount: 0 };
        
        const amount = Number(match[0].replace(/,/g, ''));
        return { currency, amount };
    }

    async function calculateFinalTotal() {
        const totals = [
            parseCurrencyText(document.getElementById('q_origin_total')?.textContent),
            parseCurrencyText(document.getElementById('q_trucking_total')?.textContent),
            parseCurrencyText(document.getElementById('q_ocean_total')?.textContent),
            parseCurrencyText(document.getElementById('q_summary_subtotal')?.textContent)
        ];

        let sums = {};
        totals.forEach(t => {
            if (t.amount > 0) {
                sums[t.currency] = (sums[t.currency] || 0) + t.amount;
            }
        });

        const selectEl = document.getElementById('finalCurrencySelect');
        const targetCurrency = selectEl ? selectEl.value : 'USD';
        const convertedTotalEl = document.getElementById('q_final_total_converted');
        const breakdownEl = document.getElementById('q_final_breakdown');

        if (Object.keys(sums).length === 0) {
            if(convertedTotalEl) convertedTotalEl.textContent = `${targetCurrency} 0`;
            if(breakdownEl) breakdownEl.innerHTML = '';
            return;
        }

        let rates = {};
        try {
            const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${targetCurrency}`);
            if(res.ok) {
                const apiData = await res.json();
                rates = apiData.rates;
            }
        } catch (e) {
            console.error('환율 정보 로딩 실패:', e);
        }

        let grandTotal = 0;
        let breakdownHtml = '';

        for (const [curr, amt] of Object.entries(sums)) {
            let formattedAmt = amt.toLocaleString('en-US', { minimumFractionDigits: curr === 'KRW' ? 0 : 2, maximumFractionDigits: curr === 'KRW' ? 0 : 2 });
            breakdownHtml += `<div>${curr} ${formattedAmt}</div>`;

            if (curr === targetCurrency) {
                grandTotal += amt;
            } else {
                const rate = rates[curr]; 
                if (rate) {
                    grandTotal += (amt / rate); 
                }
            }
        }

        if (convertedTotalEl) {
            let formattedGrand = grandTotal.toLocaleString('en-US', { minimumFractionDigits: targetCurrency === 'KRW' ? 0 : 2, maximumFractionDigits: targetCurrency === 'KRW' ? 0 : 2 });
            convertedTotalEl.textContent = `${targetCurrency} ${formattedGrand}`;
        }
        
        if (breakdownEl) {
            breakdownEl.innerHTML = breakdownHtml;
        }
    }

    const observer = new MutationObserver(() => calculateFinalTotal());
    const config = { childList: true, characterData: true, subtree: true };
    
    ['q_origin_total', 'q_trucking_total', 'q_ocean_total', 'q_summary_subtotal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el, config);
    });

    const finalSelect = document.getElementById('finalCurrencySelect');
    if(finalSelect) {
        finalSelect.addEventListener('change', calculateFinalTotal);
    }

    document.addEventListener('updateQuoteTotal', () => {
        if (typeof updateSummary === 'function') updateSummary();
        updateOriginCosts(); 
    });
    
    updateOriginCosts();
    calculateFinalTotal(); 

    const btnFooterBack = document.getElementById('btnFooterBack');
    if (btnFooterBack) {
        btnFooterBack.textContent = '창 닫기 (조회 화면으로)'; 
        btnFooterBack.addEventListener('click', () => window.close());
    }
});