/* 3_components/5_trc-modal/one_click_trc.js */
(function() {
    const currentScript = document.currentScript.src;
    const trcBasePath = currentScript.substring(0, currentScript.lastIndexOf('/'));

    document.addEventListener('DOMContentLoaded', async () => {
        const placeholder = document.getElementById('trc-modal-placeholder');
        if (!placeholder) return;

        try {
            const response = await fetch(`${trcBasePath}/one_click_trc.html`);
            placeholder.innerHTML = await response.text();
            initTrcEvents();
        } catch (error) {
            console.error('TRC 팝업 로드 실패:', error);
        }
    });

    // 다음 우편번호 검색기
    function searchAddress(targetId) {
        new daum.Postcode({
            oncomplete: function(data) {
                const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
                document.getElementById(targetId).value = addr;
            }
        }).open();
    }

    // 카카오 좌표 변환기
    function getCoords(addr) {
        return new Promise((resolve, reject) => {
            const geocoder = new kakao.maps.services.Geocoder();
            geocoder.addressSearch(addr, (res, status) => {
                if (status === kakao.maps.services.Status.OK) resolve(res[0]);
                else reject(new Error("주소 변환 실패"));
            });
        });
    }

    function initTrcEvents() {
        const btnOpen = document.getElementById('btnOpenTrc');
        const modal = document.getElementById('trcModalOverlay');
        const btnClose = document.getElementById('btnTrcClose');
        const btnApply = document.getElementById('btnTrcApply');

        const startInput = document.getElementById('trcStartAddr');
        const endInput = document.getElementById('trcEndAddr');

        // 팝업 열기 (배낭 정보로 20FT/40FT 자동 세팅)
        if (btnOpen) {
            btnOpen.onclick = () => {
                modal.style.display = 'flex';
                try {
                    const quoteStr = sessionStorage.getItem('oneClickQuoteData');
                    if(quoteStr) {
                        const quote = JSON.parse(quoteStr);
                        const cargo = quote.cargo || '';
                        const select = document.getElementById('trcTypeSelect');
                        if (cargo.includes('20')) select.value = 'cost20';
                        else if (cargo.includes('40')) select.value = 'cost40';
                    }
                } catch(e) {}
            };
        }

        if (btnClose) btnClose.onclick = () => { modal.style.display = 'none'; };

        // 주소창 클릭 시 다음 우편번호 검색 띄우기
        if (startInput) startInput.onclick = () => searchAddress('trcStartAddr');
        if (endInput) endInput.onclick = () => searchAddress('trcEndAddr');

        // 조회 및 적용 버튼
        if (btnApply) {
            btnApply.onclick = async () => {
                const start = startInput.value;
                const end = endInput.value;
                const type = document.getElementById('trcTypeSelect').value; 

                if (!start || !end) return alert('출발지와 도착지 주소를 모두 검색해주세요.');

                // 1. 버튼 잠그기
                btnApply.disabled = true;
                
                // ✨ 2. 로딩 점(...) 애니메이션 타이머 시작
                let dotCount = 0;
                btnApply.textContent = '경로 분석 및 운임 계산 중';
                const loadingInterval = setInterval(() => {
                    dotCount = (dotCount + 1) % 4; // 0, 1, 2, 3 반복
                    btnApply.textContent = '경로 분석 및 운임 계산 중' + '.'.repeat(dotCount);
                }, 400); // 0.4초마다 점 개수 변경

                try {
                    // 1. 좌표 획득
                    const startCoords = await getCoords(start);
                    const endCoords = await getCoords(end);

                    // 2. 카카오 백엔드 (거리 계산)
                    const distRes = await fetch(`https://kakao-backend.vercel.app/api/distance?start=${startCoords.x},${startCoords.y}&end=${endCoords.x},${endCoords.y}`);
                    const distData = await distRes.json();
                    const distanceMeters = distData.routes[0].summary.distance;
                    const roundedDist = Math.round(distanceMeters / 1000);

                    // 3. Notion 백엔드 (요금 계산)
                    const costRes = await fetch(`https://notion-api-hub.vercel.app/api/trc/cal?distance=${roundedDist}`);
                    const costData = await costRes.json();

                    if (costData.found) {
                        const finalCost = costData.data[type];

                        const shortStart = start.split(' ').slice(0, 3).join(' ');
                        const shortEnd = end.split(' ').slice(0, 3).join(' ');

                        document.getElementById('q_route_start').textContent = `출발지: ${shortStart}`;
                        document.getElementById('q_route_end').textContent = `도착지: ${shortEnd}`;
                        document.getElementById('q_route_dist').textContent = roundedDist;
                        document.getElementById('q_trucking_total').textContent = Number(finalCost).toLocaleString() + '원';

                        document.dispatchEvent(new CustomEvent('updateQuoteTotal'));
                        modal.style.display = 'none';
                    } else {
                        alert(`거리(${roundedDist}km)에 해당하는 운임 정보가 DB에 없습니다.`);
                    }

                } catch (e) {
                    console.error(e);
                    alert('주소를 정확히 입력했는지 확인해주세요. (API 호출 에러)');
                } finally {
                    // ✨ 3. 작업이 끝나면 애니메이션 끄고 버튼 원래대로 복구
                    clearInterval(loadingInterval);
                    btnApply.disabled = false;
                    btnApply.textContent = '거리 계산 및 운임 적용하기';
                }
            };
        }
    }
})();