
document.addEventListener('DOMContentLoaded', () => {

    const nameEl = document.getElementById('q_customer_name');

    if (nameEl) {
        // 1. 클릭(포커스)했을 때
        nameEl.addEventListener('focus', function() {
            if (this.textContent.trim() === '클릭하여 고객명 기재') {
                this.textContent = '';
                // 입력 시작하면 클래스 추가하여 글자색 진하게
                this.classList.add('is-typed');
            }
        });

        // 2. 입력이 끝났을 때(포커스 해제)
        nameEl.addEventListener('blur', function() {
            if (this.textContent.trim() === '') {
                this.textContent = '클릭하여 고객명 기재';
                // 다시 가이드 텍스트로 돌아오면 클래스 제거하여 흐리게
                this.classList.remove('is-typed');
            } else {
                // 내용이 있으면 진한 색 유지
                this.classList.add('is-typed');
            }
        });

        // 3. 엔터 방지 로직 (기존 유지)
        nameEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameEl.blur();
            }
        });

        // [초기 설정] 페이지 로드 시 내용이 있으면 진하게 처리
        if (nameEl.textContent.trim() !== '클릭하여 고객명 기재') {
            nameEl.classList.add('is-typed');
        }
    }

    const rawData = sessionStorage.getItem('oneClickQuoteData');
    if (!rawData) {
        alert("견적 데이터가 없습니다. 메인 화면으로 이동합니다.");
        window.location.href = '/pumex/4_pages/destinationcost/1_search/index.html'; 
        return;
    }

    const data = JSON.parse(rawData);

    // [수정] POE(도착항) 정보를 세션에서 가져와서 q_dest_port에 넣기
    // 검색 페이지에서 data.poe 혹은 data.destPort로 넘어올 수 있으므로 둘 다 체크
    const destPortEl = document.getElementById('q_dest_port');
    if (destPortEl) {
        let poeValue = data.destPort || data.poe || '-';
        destPortEl.textContent = poeValue;
    }

    // 파트너 및 기타 정보 매칭
    document.getElementById('q_partner').textContent = data.partner || '-';

    document.getElementById('q_partner').textContent = data.partner || '-';
    let locationStr = data.location || '-';
    if (locationStr.includes('/')) {
        // 슬래시(/)를 기준으로 나누고 양옆 공백 제거
        const parts = locationStr.split('/').map(s => s.trim());
        if (parts.length >= 2) {
            // [1]번(지역)을 앞으로, [0]번(나라)을 뒤로 재조합
            locationStr = `${parts[1]} / ${parts[0]}`;
        }
    }
    document.getElementById('q_location').textContent = locationStr;

    let cargoStr = data.cargo || '-';
    cargoStr = cargoStr.replace(/cbm\s*cbm/ig, 'CBM'); 
    document.getElementById('q_cargo').textContent = cargoStr;

    const destWrap = document.getElementById('q_dest_wrap');
    if (!destWrap || !data.tableHtml) {
        console.error("데이터를 재조회 해주세요.");
        return;
    }

    destWrap.innerHTML = data.tableHtml;
    const tbody = destWrap.querySelector('tbody');
    const initialTotalText = data.destTotal || '0';

    let destBaseCurrency = 'KRW'; 
    const upperTotal = initialTotalText.toUpperCase();
    if (upperTotal.includes('USD') || upperTotal.includes('$')) destBaseCurrency = 'USD';
    else if (upperTotal.includes('EUR') || upperTotal.includes('€')) destBaseCurrency = 'EUR';

    const curCdsEl = document.getElementById('cur_cds');
    const curAddEl = document.getElementById('cur_add');
    const destSelectEl = document.getElementById('destCurrencySelect');

    if (curCdsEl) curCdsEl.textContent = destBaseCurrency;
    if (curAddEl) curAddEl.textContent = destBaseCurrency;
    if (destSelectEl) destSelectEl.value = destBaseCurrency;

    
    // [수정 2] 도착지 비용 환전 함수 추가
    async function calculateDestTotal() {
        const subTotalEl = document.getElementById('q_summary_subtotal');
        const selectEl = document.getElementById('destCurrencySelect');
        if (!subTotalEl || !selectEl) return;

        const baseVal = Number(subTotalEl.dataset.baseValue || 0);
        const targetCurrency = selectEl.value;
        const baseCurrency = destBaseCurrency; 

        if (targetCurrency === baseCurrency) {
            subTotalEl.textContent = baseVal.toLocaleString('en-US');
            return;
        }

        try {
            const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
            if (res.ok) {
                const apiData = await res.json();
                const rate = apiData.rates[targetCurrency];
                if (rate) {
                    const converted = baseVal * rate;
                    subTotalEl.textContent = converted.toLocaleString('en-US', {
                        minimumFractionDigits: targetCurrency === 'KRW' ? 0 : 2,
                        maximumFractionDigits: targetCurrency === 'KRW' ? 0 : 2
                    });
                }
            }
        } catch (e) { console.error("도착지 환율 계산 실패:", e); }
    }
    
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
            let taxTitles = []; // ✨ 누락되었던 TAX 항목명 수집 배열 추가!
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
                        sums.OTC += val; // 기타(OTC) 비용도 혹시 모르니 내부적으로 합산해 둡니다.
                    }
                } else {
                    const type = row.querySelector('.type-select')?.value;
                    const isChecked = row.querySelector('.extra-check') ? row.querySelector('.extra-check').checked : true;
                    if (isChecked && type && sums[type] !== undefined) {
                        sums[type] += val;

                        // 항목 이름(title) 추출 로직을 밖으로 빼서 ADD, TAX 둘 다 쓸 수 있게 수정
                        let title = '항목명 확인 불가';
                        const spans = row.querySelectorAll('.item-title span');
                        spans.forEach(s => { if (!s.classList.contains('toggle-icon')) title = s.textContent.trim(); });

                        if (type === 'ADD') {
                            addItems.push({ name: title, amount: val });
                        } else if (type === 'TAX') {
                            taxTitles.push(title); // ✨ TAX 항목일 경우 배열에 이름 저장
                        }
                    }
                }
            });

            // 금액 렌더링 (안전장치 유지)
            document.getElementById('sum_cds').textContent = sums.CDS.toLocaleString('en-US');
            document.getElementById('sum_add').textContent = sums.ADD.toLocaleString('en-US');
            
            const sumTaxEl = document.getElementById('sum_tax');
            if (sumTaxEl) {
                sumTaxEl.textContent = sums.TAX.toLocaleString('en-US');
            }

            // ADD 리스트 화면 렌더링
            const addListEl = document.getElementById('add_list');
            const addAmtListEl = document.getElementById('add_amt_list');
            if (addListEl && addAmtListEl) {
                if (addItems.length > 0) {
                    addListEl.innerHTML = addItems.map(item => `<div class="otc-item">${item.name}</div>`).join('');
                    addAmtListEl.innerHTML = addItems.map(item => `<div style="font-size: 0.85em; color: var(--medium-gray); padding: 2px 0;">${item.amount.toLocaleString('en-US')}</div>`).join('');
                } else {
                    addListEl.innerHTML = '';
                    addAmtListEl.innerHTML = '';
                }
            }

            // ✨ 누락되었던 TAX 리스트 화면 렌더링 추가!
            const taxListEl = document.getElementById('tax_list');
            if (taxListEl) {
                if (taxTitles.length > 0) {
                    taxListEl.innerHTML = taxTitles.map(t => `<div class="otc-item">${t}</div>`).join('');
                } else {
                    taxListEl.innerHTML = '';
                }
            }

            // OTC 리스트 화면 렌더링
            const otcListEl = document.getElementById('otc_list');
            if (otcListEl) {
                if (otherTitles.length > 0) {
                    otcListEl.innerHTML = otherTitles.map(t => `<div class="otc-item">${t}</div>`).join('');
                } else {
                    otcListEl.innerHTML = '';
                }
            }

            // [수정 3] 소계 계산 후 환전 함수 호출
            const subTotal = sums.CDS + sums.ADD + sums.TAX;
            const subTotalEl = document.getElementById('q_summary_subtotal');
            if (subTotalEl) {
                subTotalEl.dataset.baseValue = subTotal; // 원본 숫자 저장
                calculateDestTotal(); // 환전 로직 실행
            }
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
        // 버튼이 화면에 있을 때만 작동하도록 안전장치 추가
        if (btnToggle && contentToggle && iconToggle) {
            btnToggle.addEventListener('click', () => {
                const isHidden = contentToggle.style.display === 'none';
                contentToggle.style.display = isHidden ? 'block' : 'none';
                iconToggle.textContent = isHidden ? '▲' : '▼';
            });
            contentToggle.style.display = 'none'; 
        }

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
        return num.toLocaleString('ko-KR');
    }

    // [수정된 1. 원가 합산 및 기준값 저장 함수]
    function updateOriginCosts() {
        const sosEl = document.getElementById('q_cost_sos');
        const rccEl = document.getElementById('q_cost_rcc');
        const originTotalEl = document.getElementById('q_origin_total');

        if (!localPackEl || !sosEl || !rccEl || !originTotalEl) return;

        let packVal = parseKrw(localPackEl.textContent);
        let sosVal = parseKrw(sosEl.textContent);
        let rccVal = parseKrw(rccEl.textContent);

        // 조건에 따른 비용 자동 세팅
        if (packVal > 0) {
            sosVal = 200000;
            sosEl.textContent = formatKrw(sosVal);
        }
        if (sosVal > 0) {
            rccVal = 10000;
            rccEl.textContent = formatKrw(rccVal);
        }

        // ★ 핵심: 합계 금액을 원화(KRW) 기준으로 data-base-value에 숨겨둡니다.
        const sumKrw = packVal + sosVal + rccVal;
        originTotalEl.dataset.baseValue = sumKrw; 

        // 합산이 끝난 후 환전 계산 함수 호출!
        calculateOriginTotal(); 
    }

    // [새로 추가되는 2. 통화 변환 및 화면 출력 함수]
    async function calculateOriginTotal() {
        const totalEl = document.getElementById('q_origin_total');
        const selectEl = document.getElementById('originCurrencySelect');
        if (!totalEl || !selectEl) return;

        const baseVal = Number(totalEl.dataset.baseValue || 0); // 아까 저장한 원화 기준 금액
        const targetCurrency = selectEl.value;

        // 1. KRW 선택 시 그대로 출력 (시스템 인식용 span 태그 포함)
        if (targetCurrency === 'KRW') {
            totalEl.innerHTML = `<span style="display:none;">KRW</span>${baseVal.toLocaleString('ko-KR')}`;
            return;
        }

        // 2. 다른 통화(USD, EUR) 선택 시 환전 API 호출
        try {
            const res = await fetch(`https://api.exchangerate-api.com/v4/latest/KRW`);
            if (res.ok) {
                const apiData = await res.json();
                const rate = apiData.rates[targetCurrency];
                if (rate) {
                    const converted = baseVal * rate;
                    totalEl.innerHTML = `<span style="display:none;">${targetCurrency}</span>${converted.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}`;
                }
            }
        } catch (e) { 
            console.error("Origin 환율 계산 실패:", e); 
        }
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
            {
                currency: document.getElementById('destCurrencySelect')?.value || 'KRW',
                amount: Number(document.getElementById('q_summary_subtotal')?.textContent.replace(/,/g, '')) || 0
            }
        ];

        let sumKRW = 0;
        let sumUSD = 0;
        let sumOther = {};

        // 1. 화폐별로 1차 합산 (KRW, USD, 그 외)
        totals.forEach(t => {
            if (t.amount > 0) {
                if (t.currency === 'KRW') sumKRW += t.amount;
                else if (t.currency === 'USD') sumUSD += t.amount;
                else sumOther[t.currency] = (sumOther[t.currency] || 0) + t.amount;
            }
        });

        // 2. 환율 가져오기 (기준을 USD로 잡아서 모든 환율을 파악)
        let rateKRW = 1400; // API 실패 시 기본값
        let rates = {};
        try {
            const res = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
            if (res.ok) {
                const apiData = await res.json();
                rates = apiData.rates; // 모든 통화의 달러 대비 환율표
                
                const rateKRW = rates['KRW'] || 1400;

                // [추가] 왼쪽 환율 표시용 테이블 업데이트
                // 1달러 = 원화
                document.getElementById('disp_rate_usd').textContent = rateKRW.toLocaleString('ko-KR');
                
                // 1유로 = 원화 ( (1 / USD대비유로환율) * 원달러환율 )
                if(rates['EUR']) {
                    const eurToKrw = (1 / rates['EUR']) * rateKRW;
                    document.getElementById('disp_rate_eur').textContent = eurToKrw.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
                }
                
                // 1파운드 = 원화
                if(rates['GBP']) {
                    const gbpToKrw = (1 / rates['GBP']) * rateKRW;
                    document.getElementById('disp_rate_gbp').textContent = gbpToKrw.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
                }
            }
        } catch (e) {
            console.error('환율 정보 업데이트 실패:', e);
        }

        // 3. EUR 등 기타 통화가 있다면 USD로 환전하여 USD 총합에 추가
        for (const [curr, amt] of Object.entries(sumOther)) {
            if (rates[curr]) {
                // 예: 1 USD = 0.91 EUR 라면, 100 EUR / 0.91 = 109.89 USD
                sumUSD += (amt / rates[curr]);
            }
        }

        // 4. 각각의 지정된 HTML 칸에 예쁘게 포맷팅해서 꽂아주기
        const finalKrwEl = document.getElementById('final_krw_cost');
        const finalUsdEl = document.getElementById('final_usd_cost');
        const rateEl = document.getElementById('final_exchange_rate');
        const grandTotalEl = document.getElementById('q_final_total_converted');

        if (finalKrwEl) {
            finalKrwEl.textContent = sumKRW.toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
        if (finalUsdEl) {
            finalUsdEl.textContent = sumUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (rateEl) {
            rateEl.textContent = `1 USD = ${rateKRW.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} KRW`;
        }

        // 5. 최종 총합계 계산 (원화 + (달러 * 실시간 환율))
        if (grandTotalEl) {
            const grandTotalKRW = sumKRW + (sumUSD * rateKRW);
            grandTotalEl.textContent = `${grandTotalKRW.toLocaleString('en-US', { maximumFractionDigits: 0 })} KRW`;
        }
    }

    // ✨ 내륙 운송료 + 해상 운임 합계 계산 (통화 자동 변환)
    async function calculateFreightTotal() {
        // 기존에 만들어두신 parseCurrencyText 함수를 100% 재활용합니다.
        const trc = parseCurrencyText(document.getElementById('q_trucking_total')?.textContent);
        const ofc = parseCurrencyText(document.getElementById('q_ocean_total')?.textContent);
        
        const selectEl = document.getElementById('freightCurrencySelect');
        const targetCurrency = selectEl ? selectEl.value : 'USD';
        const totalEl = document.getElementById('q_freight_total');
        
        if (!totalEl) return;

        // 둘 다 금액이 없으면 0 출력
        if (trc.amount === 0 && ofc.amount === 0) {
            totalEl.textContent = '0';
            return;
        }

        try {
            // 선택된 목표 통화(targetCurrency)를 기준으로 환율 API 호출
            const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${targetCurrency}`);
            if(res.ok) {
                const apiData = await res.json();
                let grandTotal = 0;

                // 1. 내륙운송료(주로 KRW) 환전 및 합산
                if (trc.currency === targetCurrency) {
                    grandTotal += trc.amount;
                } else if (apiData.rates[trc.currency]) {
                    grandTotal += (trc.amount / apiData.rates[trc.currency]);
                }

                // 2. 해상운임(주로 USD) 환전 및 합산
                if (ofc.currency === targetCurrency) {
                    grandTotal += ofc.amount;
                } else if (apiData.rates[ofc.currency]) {
                    grandTotal += (ofc.amount / apiData.rates[ofc.currency]);
                }

                // 3. 통화에 맞게 소수점 포맷팅 후 출력
                totalEl.textContent = grandTotal.toLocaleString('en-US', { 
                    minimumFractionDigits: targetCurrency === 'KRW' ? 0 : 2, 
                    maximumFractionDigits: targetCurrency === 'KRW' ? 0 : 2 
                });
            }
        } catch (e) {
            console.error('TOTAL FREIGHT 환율 변환 실패:', e);
        }
    }

    const observer = new MutationObserver(() => {
        calculateFinalTotal();
        calculateFreightTotal(); // ★ 이 줄이 들어가야 실시간으로 계산됩니다!
    });
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

    const btnFooterBack = document.getElementById('btnFooterBack');
    if (btnFooterBack) {
        btnFooterBack.textContent = '창 닫기 (조회 화면으로)'; 
        btnFooterBack.addEventListener('click', () => window.close());
    }


    const today = new Date();
        const formattedDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
        
        // 이 ID('current_date')가 HTML의 id와 토씨 하나 안 틀리고 똑같아야 합니다.
        const dateEl = document.getElementById('current_date');
        if (dateEl) {
            dateEl.textContent = formattedDate;
        } else {
            console.error("날짜를 넣을 HTML 요소를 찾지 못했습니다. ID를 확인하세요.");
        }

    const freightSelect = document.getElementById('freightCurrencySelect');
        if(freightSelect) {
            freightSelect.addEventListener('change', calculateFreightTotal);
        }

    const destCurrencySelect = document.getElementById('destCurrencySelect');
    if (destCurrencySelect) {
        destCurrencySelect.addEventListener('change', calculateDestTotal);
    }

    const originCurrencySelect = document.getElementById('originCurrencySelect');
    if (originCurrencySelect) {
        originCurrencySelect.addEventListener('change', calculateOriginTotal);
    }
    
    updateOriginCosts();
    calculateFinalTotal(); 
    calculateFreightTotal();

});

/* ==========================================================================
   [TRC 이식 로직] POD 드롭다운 세팅 및 Origin 주소 검색, 자동 운임 계산 (최종본)
   ========================================================================== */

   function initCargoDropdown() {
    const cargoEl = document.getElementById('q_cargo');
    if (!cargoEl) return;

    const rawData = sessionStorage.getItem('oneClickQuoteData');
    if (!rawData) return;
    const data = JSON.parse(rawData);
    const cargoRaw = (data.cargo || '').toUpperCase();

    // CONSOLE 또는 LCL인 경우에만 드롭다운으로 변환
    if (cargoRaw.includes('CON') || cargoRaw.includes('LCL')) {
        const cbmMatch = cargoRaw.match(/([\d.]+)\s*CBM/i);
        const cbmValue = cbmMatch ? parseFloat(cbmMatch[1]) : 1;
        const cbmStr = cbmMatch ? `${cbmMatch[1]} CBM` : cargoRaw;

        // 드롭다운 HTML 삽입
        cargoEl.innerHTML = `
            <select id="q_cargo_select" style="padding: 2px 4px; border-radius: 4px; border: 1px solid #ccc; font-weight: 700; cursor: pointer; color: #1A73E8; outline: none;">
                <option value="console" selected>CONSOLE(40HC) - ${cbmStr}</option>
                <option value="console20">CONSOLE(20DR) - ${cbmStr}</option>
            </select>
        `;

        const selectEl = document.getElementById('q_cargo_select');
        selectEl.addEventListener('change', (e) => {
            // 1. [OFC 연동] OFC 전역 상태 업데이트 (render_quo_ofc.js 쪽 데이터와 동기화)
            if (typeof ofcGlobalState !== 'undefined') {
                ofcGlobalState.consoleBase = (e.target.value === 'console20') ? '20DR' : '40HC';
                if (typeof renderOceanFreight === 'function') renderOceanFreight();
            }
            // 2. [TRC 연동] 내륙 운송료 재계산
            autoCalculateTrc();
        });
    } else {
        cargoEl.textContent = cargoRaw; // FCL은 기존 텍스트 유지
    }
}

// 전역 변수로 CBM 값 추출 (세션 데이터 활용)
const getCbmValue = () => {
    const quoteDataStr = sessionStorage.getItem('oneClickResult');
    const quoteData = quoteDataStr ? JSON.parse(quoteDataStr) : {};
    const cargo = quoteData.cargo || '';
    const match = cargo.match(/([\d.]+)\s*CBM/i);
    return match ? parseFloat(match[1]) : (parseFloat(cargo) || 0);
};

// 1. 카카오 좌표 변환기 헬퍼 함수
function getCoords(addr) {
    return new Promise((resolve, reject) => {
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(addr, (res, status) => {
            if (status === kakao.maps.services.Status.OK) resolve(res[0]);
            else reject(new Error("주소 변환 실패"));
        });
    });
}

// 2. POD 드롭다운 세팅 (OFC JS 파일에서 이 함수를 호출하며 배열을 넘겨줍니다)
// 2. POD 드롭다운 세팅 (one_click_quo_ofc.js에서 호출됨)
window.setupPodDropdown = function(mappedPoes) {
    const podSelect = document.getElementById('pod_select');
    if (!podSelect) return;

    // ✨ [에러 해결 핵심] 넘어온 데이터가 무조건 배열이 되도록 강제 변환 (null, undefined 완벽 방어)
    const safePoes = Array.isArray(mappedPoes) ? mappedPoes : [];

    // 안전하게 변환된 배열(safePoes)에서 (BUS), (INC) 태그 확인
    const hasBus = safePoes.some(v => typeof v === 'string' && v.includes('(BUS)'));
    const hasInc = safePoes.some(v => typeof v === 'string' && v.includes('(INC)'));

    let optionsHtml = '<option value="">-- 도착지 선택 --</option>';
    const optBusanNew = '<option value="부산광역시 강서구 신항남로 330">부산신항 (미국, 유럽 등 장거리)</option>';
    const optBusanOld = '<option value="부산광역시 남구 신선로 294">부산북항 (아시아, 인도네시아 등 단거리)</option>';
    const optIncheon = '<option value="인천 연수구 인천신항대로 707">인천항</option>';

    if (hasBus) optionsHtml += optBusanNew + optBusanOld;
    if (hasInc) optionsHtml += optIncheon;
    
    // 태그가 없거나 오류 시 전체 노출
    if (!hasBus && !hasInc) optionsHtml += optBusanNew + optBusanOld + optIncheon;

    podSelect.innerHTML = optionsHtml;
    
    // 이벤트 리스너가 중복 등록되지 않도록 정리 후 등록
    podSelect.removeEventListener('change', autoCalculateTrc);
    podSelect.addEventListener('change', autoCalculateTrc);
};

// 3. Origin (출발지) 클릭 시 다음 우편번호 검색기 실행
document.addEventListener('DOMContentLoaded', () => {
    const originEl = document.getElementById('q_origin_add');
    if (originEl) {
        originEl.style.cursor = 'pointer';
        originEl.title = '클릭하여 출발지 주소 검색';
        originEl.addEventListener('click', () => {
            new daum.Postcode({
                oncomplete: function(data) {
                    const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
                    originEl.textContent = addr;
                    originEl.classList.add('is-typed');
                    originEl.style.textDecoration = 'none';
                    
                    autoCalculateTrc(); // 주소 입력 완료 시 자동계산 트리거
                }
            }).open();
        });
    }

/* ==========================================================================
   [UI 모듈] CBM 표시 및 컨테이너 타입 드롭다운 제어 (최종 안전버전)
   ========================================================================== */

    function initCargoAndContainerUI() {
        const cbmEl = document.getElementById('q_cbm');
        const containerEl = document.getElementById('q_container');
        if (!cbmEl || !containerEl) return;

        // 1. 데이터 가져오기
        const rawData = sessionStorage.getItem('oneClickQuoteData');
        if (!rawData) return;
        const data = JSON.parse(rawData);
        const cargoRaw = (data.cargo || '').toUpperCase(); // 예: "2 CBM / CONSOLE"

        // 2. CBM 및 타입 파싱
        const cbmMatch = cargoRaw.match(/([\d.]+)\s*CBM/i);
        const cbmVal = cbmMatch ? cbmMatch[0] : "-"; 
        const isConsole = cargoRaw.includes('CON') || cargoRaw.includes('LCL');
        
        // 3. [q_cbm] 업데이트: "2 CBM / SINGLE" 또는 "2 CBM / CONSOLE"
        const typeLabel = isConsole ? "CONSOLE" : "SINGLE";
        cbmEl.textContent = `${cbmVal} / ${typeLabel}`;

        // 4. [q_container] 업데이트: 텍스트 또는 드롭다운 생성
        if (isConsole) {
            // 중복 생성 방지
            if (!document.getElementById('q_container_select')) {
                containerEl.innerHTML = `
                    <select id="q_container_select" style="padding: 2px 4px; border-radius: 4px; border: 1px solid #ccc; font-weight: 700; cursor: pointer; color: #1A73E8; outline: none; font-family: inherit; font-size: 13px;">
                        <option value="console40" selected>CONSOLE (into 40HC)</option>
                        <option value="console20">CONSOLE (into 20DR)</option>
                    </select>
                `;

                // 향후 금액 재계산 연동을 위한 이벤트 리스너
                const selectEl = document.getElementById('q_container_select');
                selectEl.addEventListener('change', (e) => {
                    console.log("컨테이너 타입 변경됨:", e.target.value);
                    
                    // OFC 연동
                    if (typeof ofcGlobalState !== 'undefined') {
                        ofcGlobalState.consoleBase = (e.target.value === 'console20') ? '20DR' : '40HC';
                        if (typeof renderOceanFreight === 'function') renderOceanFreight();
                    }
                    
                    // TRC 연동
                    if (typeof autoCalculateTrc === 'function') autoCalculateTrc();
                });
            }
        } else {
            // FCL(SINGLE)일 경우 기존 텍스트 유지
            let containerText = "20DR";
            if (cargoRaw.includes('40')) containerText = "40HC";
            containerEl.textContent = containerText;
        }
    }

    // 5. 페이지 로드 시 안전하게 실행
    document.addEventListener('DOMContentLoaded', () => {
        // 76번째 줄 등 다른 스크립트의 실행이 끝날 때까지 0.3초 대기 후 덮어쓰기
        setTimeout(initCargoAndContainerUI, 300);
    });

});

// 4. TRC 운임 자동 계산 로직
async function autoCalculateTrc() {
    const originEl = document.getElementById('q_origin_add');
    const podSelect = document.getElementById('pod_select');
    const trcTotalEl = document.getElementById('q_trucking_total');
    
    const startAddr = originEl ? originEl.textContent.trim() : '';
    const endAddr = podSelect ? podSelect.value : '';

    if (!startAddr || startAddr.includes('클릭하여') || !endAddr) return;

    if (trcTotalEl) trcTotalEl.textContent = "계산 중...";

    try {
        const quoteDataStr = sessionStorage.getItem('oneClickResult');
        const quoteData = quoteDataStr ? JSON.parse(quoteDataStr) : {};
        const cargo = (quoteData.cargo || '').toUpperCase();
        const currentCbm = getCbmValue();

        let type = 'cost40';
        if (cargo.includes('CON') || cargo.includes('LCL')) type = 'console';
        else if (cargo.includes('20')) type = 'cost20';

        // 좌표 변환 및 거리 계산
        const startCoords = await getCoords(startAddr);
        const endCoords = await getCoords(endAddr);

        const distRes = await fetch(`https://kakao-backend.vercel.app/api/distance?start=${startCoords.x},${startCoords.y}&end=${endCoords.x},${endCoords.y}`);
        const distData = await distRes.json();
        const roundedDist = Math.round(distData.routes[0].summary.distance / 1000);

        // 노션 API 운임 계산
        const costRes = await fetch(`https://notion-api-hub.vercel.app/api/trc/cal?distance=${roundedDist}`);
        const costData = await costRes.json();

        if (costData.found) {
            let finalCost = 0;
            if (type === 'console') {
                const base40 = Number(costData.data.cost40) || 0;
                finalCost = Math.round((base40 / 50) * (currentCbm || 1));
            } else {
                finalCost = Number(costData.data[type]) || 0;
            }

            const distSpan = document.getElementById('q_route_dist');
            if (distSpan) distSpan.textContent = type === 'console' ? `${roundedDist}km (CBM 비례)` : `${roundedDist}km`;
            trcTotalEl.textContent = finalCost.toLocaleString();
            
            document.dispatchEvent(new CustomEvent('updateQuoteTotal'));
        } else {
            trcTotalEl.textContent = "0";
            alert(`거리(${roundedDist}km)에 해당하는 운임 정보가 DB에 없습니다.`);
        }
    } catch (e) {
        console.error("TRC 자동 계산 실패:", e);
        trcTotalEl.textContent = "0";
        alert('운임 자동 계산 중 오류가 발생했습니다. (API 확인)');
    }
}

