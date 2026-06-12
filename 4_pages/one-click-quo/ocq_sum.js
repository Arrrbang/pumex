/* ==========================================================================
   [ocq_sum.js]
   역할: 견적서 화면의 합계 계산 전담

   1) ORIGIN CHARGES
   2) TOTAL FREIGHT
   3) DESTINATION CHARGES
   4) INSURANCE (신규 추가!)
   5) FINAL TOTAL / EXCHANGE RATE
   ========================================================================== */

(function () {
    const KRW_EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/KRW';
    const USD_EXCHANGE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

    let cachedUsdRates = null;
    let cachedUsdRateKrw = 1400;

    function parseMoneyText(value) {
        if (!value) return 0;

        const text = String(value)
            .replace(/,/g, '')
            .replace(/[^\d.-]/g, '')
            .trim();

        const num = Number(text);
        return Number.isFinite(num) ? num : 0;
    }

    function parseCurrencyText(text, fallbackCurrency = 'KRW') {
        if (!text || String(text).includes('조회') || String(text).includes('없음') || String(text).includes('계산 중')) {
            return {
                currency: fallbackCurrency,
                amount: 0
            };
        }

        const raw = String(text);
        const upper = raw.toUpperCase();

        let currency = fallbackCurrency;

        if (upper.includes('USD') || upper.includes('$')) {
            currency = 'USD';
        } else if (upper.includes('EUR') || upper.includes('€')) {
            currency = 'EUR';
        } else if (upper.includes('GBP') || upper.includes('£')) {
            currency = 'GBP';
        } else if (upper.includes('KRW') || upper.includes('₩')) {
            currency = 'KRW';
        }

        return {
            currency,
            amount: parseMoneyText(raw)
        };
    }

    function formatMoneyByCurrency(value, currency) {
        const fractionDigits = currency === 'KRW' ? 0 : 2;

        return Number(value || 0).toLocaleString('en-US', {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        });
    }

    async function fetchUsdRates() {
        if (cachedUsdRates) return cachedUsdRates;

        try {
            const res = await fetch(USD_EXCHANGE_API);

            if (!res.ok) {
                throw new Error('USD 환율 API 호출 실패');
            }

            const data = await res.json();

            cachedUsdRates = data?.rates || {};
            cachedUsdRateKrw = cachedUsdRates.KRW || 1400;

            updateExchangeRateDisplay(cachedUsdRates);

            return cachedUsdRates;
        } catch (error) {
            console.error('[OCQ SUM] USD 환율 정보 업데이트 실패:', error);

            cachedUsdRates = {
                KRW: 1400,
                USD: 1
            };

            cachedUsdRateKrw = 1400;

            updateExchangeRateDisplay(cachedUsdRates);

            return cachedUsdRates;
        }
    }

    function updateExchangeRateDisplay(rates) {
        const rateKRW = rates?.KRW || 1400;

        const usdEl = document.getElementById('disp_rate_usd');
        const eurEl = document.getElementById('disp_rate_eur');
        const gbpEl = document.getElementById('disp_rate_gbp');

        if (usdEl) {
            usdEl.textContent = rateKRW.toLocaleString('ko-KR', {
                maximumFractionDigits: 0
            });
        }

        if (eurEl && rates?.EUR) {
            const eurToKrw = (1 / rates.EUR) * rateKRW;
            eurEl.textContent = eurToKrw.toLocaleString('ko-KR', {
                maximumFractionDigits: 0
            });
        }

        if (gbpEl && rates?.GBP) {
            const gbpToKrw = (1 / rates.GBP) * rateKRW;
            gbpEl.textContent = gbpToKrw.toLocaleString('ko-KR', {
                maximumFractionDigits: 0
            });
        }
    }

    async function convertFromKrw(baseKrw, targetCurrency) {
        if (targetCurrency === 'KRW') {
            return baseKrw;
        }

        try {
            const res = await fetch(KRW_EXCHANGE_API);

            if (!res.ok) {
                throw new Error('KRW 환율 API 호출 실패');
            }

            const data = await res.json();
            const rate = data?.rates?.[targetCurrency];

            if (!rate) {
                throw new Error(`${targetCurrency} 환율 정보 없음`);
            }

            return baseKrw * rate;
        } catch (error) {
            console.error('[OCQ SUM] Origin Charges 환율 변환 실패:', error);
            return baseKrw;
        }
    }

    async function convertFromUsd(baseUsd, targetCurrency) {
        if (targetCurrency === 'USD') {
            return baseUsd;
        }

        try {
            const rates = await fetchUsdRates();
            const rate = rates?.[targetCurrency];

            if (!rate) {
                throw new Error(`${targetCurrency} 환율 정보 없음`);
            }

            return baseUsd * rate;
        } catch (error) {
            console.error('[OCQ SUM] Freight 환율 변환 실패:', error);
            return baseUsd;
        }
    }

    /* ==========================================================================
       1. ORIGIN CHARGES 합계
       ========================================================================== */

    async function updateOriginChargeTotal() {
        const sosEl = document.getElementById('q_cost_sos');
        const trcEl = document.getElementById('q_trucking_total');
        const surchargeEl = document.getElementById('q_cost_surcharge');
        const rccEl = document.getElementById('q_cost_rcc');
        const totalEl = document.getElementById('q_origin_total');
        const currencySelect = document.getElementById('originCurrencySelect');

        if (!totalEl) return;

        const sosValue = parseMoneyText(sosEl?.textContent);
        const trcValue = parseMoneyText(trcEl?.textContent);
        const surchargeValue = parseMoneyText(surchargeEl?.textContent);
        const rccValue = parseMoneyText(rccEl?.textContent);

        const baseKrw = sosValue + trcValue + surchargeValue + rccValue;
        const targetCurrency = currencySelect?.value || 'KRW';

        totalEl.dataset.baseKrw = String(baseKrw);
        totalEl.dataset.currency = targetCurrency;

        const convertedValue = await convertFromKrw(baseKrw, targetCurrency);

        totalEl.innerHTML =
            `<span style="display:none;">${targetCurrency}</span>${formatMoneyByCurrency(convertedValue, targetCurrency)}`;

        document.dispatchEvent(new CustomEvent('originChargeTotalUpdated', {
            detail: {
                baseKrw,
                targetCurrency,
                convertedValue
            }
        }));

        updateFinalTotal();
    }

    function initOriginChargeTotal() {
        observeTextChange('q_cost_sos', updateOriginChargeTotal);
        observeTextChange('q_trucking_total', updateOriginChargeTotal);
        observeTextChange('q_cost_surcharge', updateOriginChargeTotal);
        observeTextChange('q_cost_rcc', updateOriginChargeTotal);

        const currencySelect = document.getElementById('originCurrencySelect');
        if (currencySelect) {
            currencySelect.addEventListener('change', updateOriginChargeTotal);
        }

        updateOriginChargeTotal();
    }

    /* ==========================================================================
       2. TOTAL FREIGHT 합계
       q_ocean_total → q_freight_total
       ========================================================================== */

    async function updateFreightTotal() {
        const oceanEl = document.getElementById('q_ocean_total');
        const freightTotalEl = document.getElementById('q_freight_total');
        const currencySelect = document.getElementById('freightCurrencySelect');

        if (!freightTotalEl) return;

        const baseUsd = parseMoneyText(oceanEl?.textContent);
        const targetCurrency = currencySelect?.value || 'USD';

        freightTotalEl.dataset.baseUsd = String(baseUsd);
        freightTotalEl.dataset.currency = targetCurrency;

        const convertedValue = await convertFromUsd(baseUsd, targetCurrency);

        freightTotalEl.innerHTML =
            `<span style="display:none;">${targetCurrency}</span>${formatMoneyByCurrency(convertedValue, targetCurrency)}`;

        document.dispatchEvent(new CustomEvent('freightTotalUpdated', {
            detail: {
                baseUsd,
                targetCurrency,
                convertedValue
            }
        }));

        updateFinalTotal();
    }

    function initFreightTotal() {
        observeTextChange('q_ocean_total', updateFreightTotal);

        const currencySelect = document.getElementById('freightCurrencySelect');
        if (currencySelect) {
            currencySelect.addEventListener('change', updateFreightTotal);
        }

        updateFreightTotal();
    }

    /* ==========================================================================
       3. FINAL TOTAL / EXCHANGE RATE
       ========================================================================== */

    async function convertToUsd(currency, amount, rates) {
        if (!amount) return 0;

        if (currency === 'USD') return amount;

        if (currency === 'KRW') {
            const krwRate = rates?.KRW || 1400;
            return amount / krwRate;
        }

        if (rates?.[currency]) {
            return amount / rates[currency];
        }

        return 0;
    }

    async function updateFinalTotal() {
        const rates = await fetchUsdRates();
        const rateKRW = rates?.KRW || 1400;

        const originCurrency = document.getElementById('originCurrencySelect')?.value || 'KRW';
        const freightCurrency = document.getElementById('freightCurrencySelect')?.value || 'USD';
        const destCurrency = document.getElementById('destCurrencySelect')?.value || 'KRW';
        
        // ✨ 보험(IRC) 섹션 통화 가져오기 추가
        const ircCurrency = document.getElementById('ircCurrencySelect')?.value || 'KRW';

        const originAmount = parseMoneyText(document.getElementById('q_origin_total')?.textContent);
        const freightAmount = parseMoneyText(document.getElementById('q_freight_total')?.textContent);
        const destAmount = parseMoneyText(document.getElementById('q_summary_subtotal')?.textContent);
        
        // ✨ 보험(IRC) 섹션 금액 가져오기 추가
        const ircAmount = parseMoneyText(document.getElementById('q_irc_subtotal')?.textContent);

        let sumKRW = 0;
        let sumUSD = 0;
        let sumOther = {};

        function addBySelectedCurrency(currency, amount) {
            if (!amount || amount <= 0) return;

            if (currency === 'KRW') {
                sumKRW += amount;
            } else if (currency === 'USD') {
                sumUSD += amount;
            } else {
                sumOther[currency] = (sumOther[currency] || 0) + amount;
            }
        }

        // 선택된 통화 기준으로 각 합계 칸에 배분
        addBySelectedCurrency(originCurrency, originAmount);
        addBySelectedCurrency(freightCurrency, freightAmount);
        addBySelectedCurrency(destCurrency, destAmount);
        // ✨ 보험료도 분배 로직에 탑재!
        addBySelectedCurrency(ircCurrency, ircAmount);

        // EUR 등 기타 통화는 KRW 최종합계에 환산 반영
        let otherToKrw = 0;

        for (const [currency, amount] of Object.entries(sumOther)) {
            if (!amount || amount <= 0) continue;

            if (rates?.[currency]) {
                const amountUsd = amount / rates[currency];
                otherToKrw += amountUsd * rateKRW;
            }
        }

        const finalKrwEl = document.getElementById('final_krw_cost');
        const finalUsdEl = document.getElementById('final_usd_cost');
        const rateEl = document.getElementById('final_exchange_rate');
        const grandTotalEl = document.getElementById('q_final_total_converted');

        if (finalKrwEl) {
            finalKrwEl.textContent = sumKRW.toLocaleString('en-US', {
                maximumFractionDigits: 0
            });
        }

        if (finalUsdEl) {
            finalUsdEl.textContent = sumUSD.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        if (rateEl) {
            rateEl.textContent = `1 USD = ${rateKRW.toLocaleString('ko-KR', {
                maximumFractionDigits: 2
            })} KRW`;
        }

        if (grandTotalEl) {
            const grandTotalKrw = sumKRW + (sumUSD * rateKRW) + otherToKrw;

            grandTotalEl.textContent =
                `${grandTotalKrw.toLocaleString('en-US', {
                    maximumFractionDigits: 0
                })} KRW`;
        }

        console.log('[OCQ SUM] 최종 합계 업데이트:', {
            origin: { currency: originCurrency, amount: originAmount },
            freight: { currency: freightCurrency, amount: freightAmount },
            destination: { currency: destCurrency, amount: destAmount },
            insurance: { currency: ircCurrency, amount: ircAmount }, // 로그에 보험 추가
            result: { sumKRW, sumUSD, sumOther, otherToKrw }
        });
    }

    function initFinalTotal() {
        // ✨ q_irc_subtotal(보험료 합계) 변경 감지 추가
        [
            'q_origin_total',
            'q_freight_total',
            'q_summary_subtotal',
            'q_irc_subtotal'
        ].forEach(id => {
            observeTextChange(id, updateFinalTotal);
        });

        // ✨ ircCurrencySelect(보험료 통화 변경) 감지 추가
        [
            'originCurrencySelect',
            'freightCurrencySelect',
            'destCurrencySelect',
            'ircCurrencySelect'
        ].forEach(id => {
            const selectEl = document.getElementById(id);
            if (selectEl) {
                selectEl.addEventListener('change', updateFinalTotal);
            }
        });

        document.addEventListener('updateQuoteTotal', updateFinalTotal);
        document.addEventListener('originChargeTotalUpdated', updateFinalTotal);
        document.addEventListener('freightTotalUpdated', updateFinalTotal);
        document.addEventListener('destinationChargeTotalUpdated', updateFinalTotal);
        // ✨ ocq_irc.js에서 던지는 costUpdated 이벤트 수신
        document.addEventListener('costUpdated', updateFinalTotal); 

        updateFinalTotal();
    }

    /* ==========================================================================
       공통 유틸
       ========================================================================== */

    function observeTextChange(id, callback) {
        const el = document.getElementById(id);
        if (!el) return;

        const observer = new MutationObserver(callback);

        observer.observe(el, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initOriginChargeTotal();
        initFreightTotal();
        initFinalTotal();
    });

    window.updateOriginChargeTotal = updateOriginChargeTotal;
    window.updateFreightTotal = updateFreightTotal;
    window.updateFinalTotal = updateFinalTotal;
})();