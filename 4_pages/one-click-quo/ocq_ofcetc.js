/* ==========================================================================
   [ocq_ofcetc.js]
   역할: OFC에서 계산된 Surcharge 값을 Origin Charges 영역으로 이동/표시
   - one_click_quo_ofc.js의 ofcGlobalState를 읽음
   - q_cost_surcharge에 KRW 기준 surcharge 출력
   - ocq_sum.js의 Origin 합계에 포함되도록 updateQuoteTotal 이벤트 발생
   ========================================================================== */

(function () {
    function formatKrw(value) {
        return Number(value || 0).toLocaleString('ko-KR', {
            maximumFractionDigits: 0
        });
    }

    function getCurrentCbm() {
        try {
            const rawData = sessionStorage.getItem('oneClickQuoteData');
            const data = rawData ? JSON.parse(rawData) : {};
            const cargo = String(data.cargo || '');

            const match = cargo.match(/([\d.]+)\s*CBM/i);
            if (match) return parseFloat(match[1]) || 0;

            const parsed = parseFloat(cargo);
            return Number.isFinite(parsed) ? parsed : 0;
        } catch (e) {
            console.warn('[OCQ OFC ETC] CBM 파싱 실패:', e);
            return 0;
        }
    }

    function getConsoleBase() {
        const selectEl = document.getElementById('q_container_select');

        if (selectEl) {
            const value = String(selectEl.value || '').toLowerCase();
            const text = String(selectEl.options[selectEl.selectedIndex]?.textContent || '').toUpperCase();

            if (value === 'console20' || text.includes('20DR')) {
                return '20FT';
            }

            return '40HC';
        }

        if (typeof ofcGlobalState !== 'undefined' && ofcGlobalState.consoleBase) {
            return ofcGlobalState.consoleBase;
        }

        return '40HC';
    }

    function calculateSurchargeKrw() {
        if (typeof ofcGlobalState === 'undefined') {
            return 0;
        }

        const cargo = String(ofcGlobalState.containerType || '').toUpperCase();
        const isConsole = Boolean(ofcGlobalState.isConsole);
        const cbm = Number(ofcGlobalState.cbm || getCurrentCbm() || 1);
        const consoleBase = getConsoleBase();

        let surchargeKrw = 0;

        if (isConsole) {
            if (consoleBase === '20FT') {
                surchargeKrw = Math.round((250000 / 20) * cbm);
            } else {
                surchargeKrw = Math.round((300000 / 50) * cbm);
            }
        } else {
            if (cargo.includes('20')) {
                surchargeKrw = 250000;
            } else if (cargo.includes('40')) {
                surchargeKrw = 300000;
            }
        }

        return surchargeKrw;
    }

    function updateOfcSurchargeToOrigin() {
        const surchargeEl = document.getElementById('q_cost_surcharge');
        if (!surchargeEl) return;

        const surchargeKrw = calculateSurchargeKrw();

        surchargeEl.dataset.baseKrw = String(surchargeKrw);
        surchargeEl.textContent = formatKrw(surchargeKrw);

        document.dispatchEvent(new CustomEvent('ofcSurchargeUpdated', {
            detail: {
                surchargeKrw
            }
        }));

        document.dispatchEvent(new CustomEvent('updateQuoteTotal'));

        if (typeof window.updateOriginChargeTotal === 'function') {
            window.updateOriginChargeTotal();
        }

        console.log('[OCQ OFC ETC] Surcharge → Origin 반영 완료:', {
            surchargeKrw
        });
    }

    function bindEvents() {
        const containerSelect = document.getElementById('q_container_select');

        if (containerSelect) {
            containerSelect.addEventListener('change', () => {
                setTimeout(updateOfcSurchargeToOrigin, 0);
            });
        }

        const oceanEl = document.getElementById('q_ocean_total');
        if (oceanEl) {
            const observer = new MutationObserver(() => {
                updateOfcSurchargeToOrigin();
            });

            observer.observe(oceanEl, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }

        // OFC 렌더링이 끝난 뒤 값을 읽기 위해 약간 지연
        setTimeout(updateOfcSurchargeToOrigin, 700);
    }

    document.addEventListener('DOMContentLoaded', () => {
        bindEvents();
    });

    window.updateOfcSurchargeToOrigin = updateOfcSurchargeToOrigin;
})();