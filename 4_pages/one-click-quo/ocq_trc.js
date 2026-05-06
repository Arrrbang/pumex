/* ==========================================================================
   [ocq_trc.js]
   역할: one_click_quo 화면에서 Origin → POL 기준 내륙운송료(TRC) 자동 계산
   - 기존 one_click_trc.js 모듈은 수정하지 않음
   - q_origin_add, pol_select, q_container 값을 읽어 자동 계산
   ========================================================================== */

(function () {
    const TRC_DISTANCE_API = 'https://kakao-backend.vercel.app/api/distance';
    const TRC_COST_API = 'https://notion-api-hub.vercel.app/api/trc/cal';

    function cleanText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function getOriginAddress() {
        const originEl = document.getElementById('q_origin_add');
        const origin = cleanText(originEl?.textContent);

        if (!origin || origin.includes('클릭하여') || origin === '-') {
            return '';
        }

        return origin;
    }

    function getPolAddress() {
        const polSelect = document.getElementById('pol_select');

        if (polSelect && polSelect.value) {
            return cleanText(polSelect.value);
        }

        const wrap = document.getElementById('q_loading_port_wrap');
        const innerSelect = wrap?.querySelector('select');

        if (innerSelect && innerSelect.value) {
            return cleanText(innerSelect.value);
        }

        return '';
    }

    function getCbmValue() {
        const cbmText = cleanText(document.getElementById('q_cbm')?.textContent);
        let match = cbmText.match(/([\d.]+)\s*CBM/i);

        if (match) {
            return parseFloat(match[1]) || 0;
        }

        try {
            const rawData = sessionStorage.getItem('oneClickQuoteData');
            const data = rawData ? JSON.parse(rawData) : {};
            const cargo = cleanText(data.cargo);

            match = cargo.match(/([\d.]+)\s*CBM/i);
            if (match) {
                return parseFloat(match[1]) || 0;
            }

            const parsed = parseFloat(cargo);
            return Number.isFinite(parsed) ? parsed : 0;
        } catch (e) {
            console.warn('[OCQ TRC] CBM 파싱 실패:', e);
            return 0;
        }
    }

    function getTrcTypeFromContainer() {
        const containerEl = document.getElementById('q_container');

        const selectEl =
            document.getElementById('q_container_select') ||
            containerEl?.querySelector('select');

        if (selectEl) {
            const selectedValue = cleanText(selectEl.value).toLowerCase();
            const selectedText = cleanText(selectEl.options[selectEl.selectedIndex]?.textContent).toUpperCase();

            if (selectedValue === 'console20' || selectedText.includes('20DR')) {
                return 'console20';
            }

            if (selectedValue === 'console40' || selectedText.includes('40HC')) {
                return 'console40';
            }
        }

        const containerText = cleanText(containerEl?.textContent).toUpperCase();

        if (containerText.includes('CONSOLE') && containerText.includes('20DR')) {
            return 'console20';
        }

        if (containerText.includes('CONSOLE') && containerText.includes('40HC')) {
            return 'console40';
        }

        if (containerText.includes('20DR') || containerText.includes('20FT') || containerText.includes('20')) {
            return 'cost20';
        }

        if (containerText.includes('40HC') || containerText.includes('40FT') || containerText.includes('40')) {
            return 'cost40';
        }

        return 'cost40';
    }

    function getCoords(addr) {
        return new Promise((resolve, reject) => {
            if (!window.kakao?.maps?.services?.Geocoder) {
                reject(new Error('카카오 지도 Geocoder가 로드되지 않았습니다.'));
                return;
            }

            const geocoder = new kakao.maps.services.Geocoder();

            geocoder.addressSearch(addr, (res, status) => {
                if (status === kakao.maps.services.Status.OK && res && res[0]) {
                    resolve(res[0]);
                } else {
                    reject(new Error(`주소 변환 실패: ${addr}`));
                }
            });
        });
    }

    async function calculateTrcCost(startAddr, endAddr, type) {
        const startCoords = await getCoords(startAddr);
        const endCoords = await getCoords(endAddr);

        const distUrl =
            `${TRC_DISTANCE_API}?start=${startCoords.x},${startCoords.y}&end=${endCoords.x},${endCoords.y}`;

        const distRes = await fetch(distUrl);

        if (!distRes.ok) {
            throw new Error('거리 계산 API 호출 실패');
        }

        const distData = await distRes.json();
        const distanceMeters = distData?.routes?.[0]?.summary?.distance;

        if (!distanceMeters) {
            throw new Error('거리 계산 결과를 찾을 수 없습니다.');
        }

        const roundedDist = Math.round(distanceMeters / 1000);

        const costRes = await fetch(`${TRC_COST_API}?distance=${roundedDist}`);

        if (!costRes.ok) {
            throw new Error('TRC 운임 API 호출 실패');
        }

        const costData = await costRes.json();

        if (!costData?.found) {
            return {
                found: false,
                distanceKm: roundedDist,
                finalCost: 0
            };
        }

        let finalCost = 0;

        if (type === 'console40' || type === 'console20') {
            let cbm = getCbmValue();

            if (!cbm || cbm <= 0) {
                console.warn('[OCQ TRC] 유효한 CBM이 없어 1 CBM으로 계산합니다.');
                cbm = 1;
            }

            if (type === 'console40') {
                const base40 = Number(costData.data.cost40) || 0;
                finalCost = Math.round((base40 / 50) * cbm);
            } else {
                const base20 = Number(costData.data.cost20) || 0;
                finalCost = Math.round((base20 / 20) * cbm);
            }
        } else {
            finalCost = Number(costData.data[type]) || 0;
        }

        return {
            found: true,
            distanceKm: roundedDist,
            finalCost
        };
    }

    function renderTrcResult(result, type) {
        const trcTotalEl = document.getElementById('q_trucking_total');
        const distEl = document.getElementById('q_route_dist');

        if (distEl) {
            distEl.textContent =
                (type === 'console40' || type === 'console20')
                    ? `${result.distanceKm}km (CBM 비례적용)`
                    : `${result.distanceKm}km`;
        }

        if (trcTotalEl) {
            trcTotalEl.textContent = Number(result.finalCost || 0).toLocaleString('ko-KR');
        }

        document.dispatchEvent(new CustomEvent('updateQuoteTotal'));
    }

    window.autoCalculateTrc = async function autoCalculateTrc() {
        const startAddr = getOriginAddress();
        const endAddr = getPolAddress();
        const type = getTrcTypeFromContainer();

        const trcTotalEl = document.getElementById('q_trucking_total');

        if (!startAddr || !endAddr) {
            console.log('[OCQ TRC] Origin 또는 POL 미입력 상태라 계산을 보류합니다.', {
                startAddr,
                endAddr,
                type
            });
            return;
        }

        try {
            if (trcTotalEl) {
                trcTotalEl.textContent = '계산 중...';
            }

            console.log('[OCQ TRC] 자동 계산 시작:', {
                startAddr,
                endAddr,
                type,
                cbm: getCbmValue()
            });

            const result = await calculateTrcCost(startAddr, endAddr, type);

            if (!result.found) {
                if (trcTotalEl) {
                    trcTotalEl.textContent = '0';
                }

                alert(`거리(${result.distanceKm}km)에 해당하는 운임 정보가 DB에 없습니다.`);
                return;
            }

            renderTrcResult(result, type);

            console.log('[OCQ TRC] 자동 계산 완료:', {
                ...result,
                type
            });
        } catch (error) {
            console.error('[OCQ TRC] 자동 계산 실패:', error);

            if (trcTotalEl) {
                trcTotalEl.textContent = '0';
            }

            alert('내륙 운송료 자동 계산 중 오류가 발생했습니다. 주소/API를 확인해주세요.');
        }
    };

    function bindOcqTrcEvents() {
        const polSelect = document.getElementById('pol_select');
        const containerSelect = document.getElementById('q_container_select');
        const btnOpenTrc = document.getElementById('btnOpenTrc');
        const originEl = document.getElementById('q_origin_add');

        if (polSelect) {
            polSelect.addEventListener('change', () => {
                window.autoCalculateTrc();
            });
        }

        if (containerSelect) {
            containerSelect.addEventListener('change', () => {
                window.autoCalculateTrc();
            });
        }

        if (btnOpenTrc) {
            btnOpenTrc.addEventListener('click', () => {
                window.autoCalculateTrc();
            });
        }

        if (originEl) {
            const observer = new MutationObserver(() => {
                window.autoCalculateTrc();
            });

            observer.observe(originEl, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }

        console.log('[OCQ TRC] 이벤트 바인딩 완료');
    }

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(bindOcqTrcEvents, 500);
    });
})();