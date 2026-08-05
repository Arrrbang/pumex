/* trc.js */
'use strict';

// 💡 TRC 연산 중인지 알려주는 전역 스위치 추가
window.isTrcCalculating = false;

// 1. 카카오 주소 -> 좌표(x,y) 변환기
function getCoords(addr) {
    return new Promise((resolve, reject) => {
        if (!window.kakao?.maps?.services?.Geocoder) {
            reject(new Error('카카오 지도 API 로드 실패'));
            return;
        }
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(addr, (res, status) => {
            if (status === kakao.maps.services.Status.OK && res[0]) resolve(res[0]);
            else reject(new Error("주소 변환 실패"));
        });
    });
}

// 2. POL 드롭다운 세팅 함수 (ofc.js에서 호출됨)
window.setupPolDropdown = function(mappedPoes) {
    const polSelect = document.getElementById('pol_select');
    if (!polSelect) return;

    const safePoes = Array.isArray(mappedPoes) ? mappedPoes : [];
    const hasBus = safePoes.some(v => typeof v === 'string' && v.includes('(BUS)'));
    const hasInc = safePoes.some(v => typeof v === 'string' && v.includes('(INC)'));

    // 💡 1. 사용자가 반드시 직접 고르도록 기본값을 빈 칸("-- 선택하세요 --")으로 강제합니다.
    let optionsHtml = '<option value="">-- 출발항(POL)을 선택하세요 --</option>';
    
    if (hasBus) {
        optionsHtml += '<option value="부산광역시 강서구 신항남로 330" data-prefix="(BUS)">Busan, Korea</option>';
    }
    if (hasInc) {
        optionsHtml += '<option value="인천 연수구 인천신항대로 707" data-prefix="(INC)">Incheon, Korea</option>';
    }
    if (!hasBus && !hasInc) {
        optionsHtml += '<option value="부산광역시 강서구 신항남로 330" data-prefix="(BUS)">Busan, Korea</option>';
        optionsHtml += '<option value="인천 연수구 인천신항대로 707" data-prefix="(INC)">Incheon, Korea</option>';
    }

    polSelect.innerHTML = optionsHtml;

    // 💡 2. 사용자가 직접 클릭해서 항구를 변경할 때만 작동하는 이벤트
    const handlePolChange = () => {
        const selectedOption = polSelect.options[polSelect.selectedIndex];
        if (!selectedOption) return;

        const prefix = selectedOption.getAttribute('data-prefix');
        
        // 해상운임(OFC) 업데이트 연동
        if (typeof window.updateOfcByPrefix === 'function') {
            window.updateOfcByPrefix(prefix);
        }
        
        // 내륙운송료(TRC) 업데이트 연동
        calculateTrcConsole();
    };

    polSelect.removeEventListener('change', handlePolChange);
    polSelect.addEventListener('change', handlePolChange);

    // 🚨 기존에 있던 setTimeout 강제 실행 코드를 완전히 삭제했습니다! (이제 멋대로 불러오지 않습니다)
};

// 3. TRC 비용 계산 및 콘솔 출력 메인 로직
async function calculateTrcConsole() {
    const originEl = document.getElementById('q_origin_add');
    const startAddr = originEl?.getAttribute('data-raw-addr') || originEl?.textContent;
    const polSelect = document.getElementById('pol_select');
    const endAddr = polSelect?.value;
    
    // 주소가 설정 안 됐거나 출발항(POL)이 안 골라졌으면 조용히 중단 (계산 대기 띄우지 않음)
    if (!startAddr || startAddr.includes('클릭하여') || !endAddr) {
        window.originCosts.trc = 0;
        if (typeof window.calculateOriginTotal === 'function') window.calculateOriginTotal();
        return;
    }
    
    // 💡 API 통신 시작 전: 스위치를 켜서 화면에 "계산 대기" 상태 띄우기
    window.isTrcCalculating = true;
    if (typeof window.calculateOriginTotal === 'function') window.calculateOriginTotal();

    const savedData = sessionStorage.getItem('finalQuotationData');
    const quotationData = savedData ? JSON.parse(savedData) : {};
    const cbmVal = parseFloat(quotationData.q_cbm) || 1;
    const containerType = quotationData.q_container || '20FT';
    const isConsole = containerType.includes('CON') || containerType.includes('LCL');
    
    console.group('%c[TRC 내륙운송료 계산 중...]', 'color: #8e44ad; font-weight: bold; font-size: 13px;');
    
    try {
        const startCoords = await getCoords(startAddr);
        const endCoords = await getCoords(endAddr);
        
        const distRes = await fetch(`https://kakao-backend.vercel.app/api/distance?start=${startCoords.x},${startCoords.y}&end=${endCoords.x},${endCoords.y}`);
        const distData = await distRes.json();
        const distanceMeters = distData?.routes?.[0]?.summary?.distance;
        const roundedDist = Math.round(distanceMeters / 1000);
        
        const costRes = await fetch(`https://notion-api-hub.vercel.app/api/trc/cal?distance=${roundedDist}`);
        const costData = await costRes.json();
        
        if (costData && costData.found) {
            let finalCost = 0;
            if (isConsole) {
                const base40 = Number(costData.data.cost40) || 0;
                finalCost = Math.round((base40 / 50) * cbmVal);
            } else if (containerType.includes('20')) {
                finalCost = Number(costData.data.cost20) || 0;
            } else {
                finalCost = Number(costData.data.cost40) || 0;
            }
            window.originCosts.trc = finalCost;
        } else {
            window.originCosts.trc = 0;
        }
        
    } catch (error) {
        console.error('TRC 계산 오류:', error);
        window.originCosts.trc = 0;
    } finally {
        // 💡 API 통신 완료 후: 스위치를 끄고 최종 숫자로 갱신
        window.isTrcCalculating = false;
        if (typeof window.calculateOriginTotal === 'function') window.calculateOriginTotal();
        console.groupEnd();
    }
}

// 4. 이벤트 바인딩
document.addEventListener('DOMContentLoaded', () => {
    const originEl = document.getElementById('q_origin_add');
    if (originEl) {
        originEl.addEventListener('click', () => {
            new daum.Postcode({
                oncomplete: function(data) {
                    const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
                    originEl.textContent = addr;
                    originEl.classList.add('is-typed');
                    originEl.setAttribute('data-raw-addr', addr);
                    
                    calculateTrcConsole();
                }
            }).open();
        });
    }
});