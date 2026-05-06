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
                            select.value = 'console40';
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

                        // 1. 상세 주소 (Origin Address) 업데이트
                        const originAddEl = document.getElementById('q_origin_add');
                        if (originAddEl) {
                            originAddEl.textContent = start; // 입력한 출발지 주소 반영
                            originAddEl.classList.add('is-typed'); // 진한 색상 변경
                        }

                        // 2. 출항 포트 (Origin Port) 업데이트 - q_discharge_port로 변경 반영
                        const dischargePortEl = document.getElementById('q_discharge_port');
                        if (dischargePortEl) {
                            let portText = '';
                            // 도착지(end) 주소에 포함된 키워드로 포트명 판별
                            if (end.includes('부산')) {
                                portText = 'BUSAN, KOREA';
                            } else if (end.includes('인천')) {
                                portText = 'INCHEON, KOREA';
                            } else {
                                // 기타 지역은 주소의 앞부분(시/도)을 가져옴
                                portText = `${end.split(' ')[0].toUpperCase()}, KOREA`;
                            }
                            dischargePortEl.textContent = portText;
                            dischargePortEl.classList.add('is-typed'); // 진한 색상 변경
                        }

                        let finalCost = 0;

                        // 🌟 CONSOLE (LCL) 및 기본 계산 로직
                        if (type === 'console40' || type === 'console20') {
                            // CBM이 0이하 거나 에러면 방어코드 (최소 1CBM)
                            if (currentCbmValue <= 0) {
                                alert("견적 데이터에 유효한 CBM 정보가 없어 기본 1 CBM으로 계산합니다.");
                                currentCbmValue = 1;
                            }

                            if (type === 'console') {
                                // 기존 40HC 기준 (50 나누기)
                                const base40Cost = Number(costData.data.cost40) || 0;
                                finalCost = Math.round((base40Cost / 50) * currentCbmValue);
                            } else if (type === 'console20') {
                                // 👇 신규 20DR 기준 (20 나누기)
                                const base20Cost = Number(costData.data.cost20) || 0;
                                finalCost = Math.round((base20Cost / 20) * currentCbmValue);
                            }
                        } else {
                            // FCL 등 기본 운임
                            finalCost = Number(costData.data[type]);
                        }

                        // 결과 렌더링 세팅
                        const shortStart = start.split(' ').slice(0, 3).join(' ');
                        const shortEnd = end.split(' ').slice(0, 3).join(' ');

                        const routeStartEl = document.getElementById('q_route_start');
                        if (routeStartEl) routeStartEl.textContent = `출발지: ${shortStart}`;

                        const routeEndEl = document.getElementById('q_route_end');
                        if (routeEndEl) routeEndEl.textContent = `도착지: ${shortEnd}`;

                        // 결과 텍스트 출력도 console20을 포함하도록 수정
                        if (type === 'console40' || type === 'console20') {
                            document.getElementById('q_route_dist').textContent = `${roundedDist}km (CBM 비례적용)`;
                        } else {
                            document.getElementById('q_route_dist').textContent = roundedDist + 'km';
                        }
                        
                        document.getElementById('q_trucking_total').textContent = finalCost.toLocaleString();

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