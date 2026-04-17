/* 3_components/5_trc-modal/one_click_trc.js */
(function() {
    const currentScript = document.currentScript.src;
    const trcBasePath = currentScript.substring(0, currentScript.lastIndexOf('/'));

    // CBM 값을 저장할 전역 변수
    let currentCbmValue = 0;

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
                
                // 도착지(EndAddr)를 직접 검색했을 때, 드롭다운 값을 'custom'으로 유지
                if(targetId === 'trcEndAddr') {
                    const select = document.getElementById('trcEndSelect');
                    if(select && select.value !== addr) {
                        select.value = 'custom';
                    }
                }
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
        const endSelect = document.getElementById('trcEndSelect');

        // 팝업 열기 (배낭 정보로 타입 자동 세팅 및 CBM 추출)
        if (btnOpen) {
            btnOpen.onclick = () => {
                modal.style.display = 'flex';
                try {
                    const quoteStr = sessionStorage.getItem('oneClickQuoteData');
                    if(quoteStr) {
                        const quote = JSON.parse(quoteStr);
                        const cargo = quote.cargo || '';
                        
                        // 🌟 CBM 숫자만 추출 (예: "15 CBM" -> 15)
                        const cbmMatch = cargo.match(/([\d.]+)\s*CBM/i);
                        if (cbmMatch) {
                            currentCbmValue = parseFloat(cbmMatch[1]);
                        } else {
                            currentCbmValue = parseFloat(cargo) || 0;
                        }

                        const select = document.getElementById('trcTypeSelect');
                        if (cargo.toUpperCase().includes('CON') || cargo.toUpperCase().includes('LCL')) {
                            select.value = 'console';
                        } else if (cargo.includes('20')) {
                            select.value = 'cost20';
                        } else if (cargo.includes('40')) {
                            select.value = 'cost40';
                        }
                    }
                } catch(e) {}
            };
        }

        if (btnClose) btnClose.onclick = () => { modal.style.display = 'none'; };

        // 주소창 클릭 시 우편번호 검색
        if (startInput) startInput.onclick = () => searchAddress('trcStartAddr');
        if (endInput) endInput.onclick = () => searchAddress('trcEndAddr');

        // 🌟 도착지 드롭다운 변경 이벤트
        if (endSelect) {
            endSelect.onchange = (e) => {
                const val = e.target.value;
                if (val === 'custom') {
                    // 직접 검색 선택 시 주소창 오픈
                    searchAddress('trcEndAddr');
                } else if (val !== '') {
                    // 신항/북항 선택 시 인풋창에 주소 자동 입력
                    endInput.value = val;
                } else {
                    endInput.value = '';
                }
            };
        }

        // 조회 및 적용 버튼
        if (btnApply) {
            btnApply.onclick = async () => {
                const start = startInput.value;
                const end = endInput.value;
                const type = document.getElementById('trcTypeSelect').value; 

                if (!start || !end) return alert('출발지와 도착지 주소를 모두 확정해주세요.');

                btnApply.disabled = true;
                
                let dotCount = 0;
                btnApply.textContent = '경로 분석 및 운임 계산 중';
                const loadingInterval = setInterval(() => {
                    dotCount = (dotCount + 1) % 4; 
                    btnApply.textContent = '경로 분석 및 운임 계산 중' + '.'.repeat(dotCount);
                }, 400); 

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
                        let finalCost = 0;

                        // 🌟 CONSOLE (LCL) 계산 로직
                        if (type === 'console') {
                            const base40Cost = Number(costData.data.cost40) || 0;
                            
                            // CBM이 0이하 거나 에러면 방어코드 (최소 1CBM)
                            if (currentCbmValue <= 0) {
                                alert("견적 데이터에 유효한 CBM 정보가 없어 기본 1 CBM으로 계산합니다.");
                                currentCbmValue = 1;
                            }
                            
                            // (40HC 금액 / 68) * 화물 CBM -> 소수점 반올림
                            finalCost = Math.round((base40Cost / 68) * currentCbmValue);
                            
                        } else {
                            finalCost = Number(costData.data[type]);
                        }

                        // 결과 렌더링 세팅
                        const shortStart = start.split(' ').slice(0, 3).join(' ');
                        const shortEnd = end.split(' ').slice(0, 3).join(' ');

                        document.getElementById('q_route_start').textContent = `출발지: ${shortStart}`;
                        document.getElementById('q_route_end').textContent = `도착지: ${shortEnd}`;
                        
                        if (type === 'console') {
                            document.getElementById('q_route_dist').textContent = `${roundedDist}km (CBM 비례적용)`;
                        } else {
                            document.getElementById('q_route_dist').textContent = roundedDist + 'km';
                        }
                        
                        document.getElementById('q_trucking_total').textContent = finalCost.toLocaleString() + '원';

                        document.dispatchEvent(new CustomEvent('updateQuoteTotal'));
                        modal.style.display = 'none';
                    } else {
                        alert(`거리(${roundedDist}km)에 해당하는 운임 정보가 DB에 없습니다.`);
                    }

                } catch (e) {
                    console.error(e);
                    alert('주소를 정확히 입력했는지 확인해주세요. (API 호출 에러)');
                } finally {
                    clearInterval(loadingInterval);
                    btnApply.disabled = false;
                    btnApply.textContent = '거리 계산 및 운임 적용하기';
                }
            };
        }
    }
})();