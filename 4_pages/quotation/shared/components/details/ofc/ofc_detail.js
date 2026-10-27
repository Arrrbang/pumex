/* ofc_detail.js */
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. CSS 로드
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '/pumex/4_pages/quotation/shared/components/details/ofc/ofc_detail.css';
    document.head.appendChild(cssLink);

    // 2. HTML 팝업 비동기 로드
    try {
        const response = await fetch('/pumex/4_pages/quotation/shared/components/details/ofc/ofc_detail.html');
        if (response.ok) {
            const htmlText = await response.text();
            const wrapper = document.createElement('div');
            wrapper.innerHTML = htmlText;
            document.body.appendChild(wrapper);

            // 팝업 삽입 후 이벤트 바인딩 실행
            initOfcDetailPopup();
        }
    } catch (e) {
        console.error("OFC 상세 팝업 로드 실패:", e);
    }
});

function initOfcDetailPopup() {
    const btnOpen = document.getElementById('btnOpenOfcDetail');
    const modal = document.getElementById('ofcDetailModal');
    const btnApply = document.getElementById('btn_ofc_apply');
    const btnCloseX = document.getElementById('btn_ofc_close_x');
    
    const tbody = document.getElementById('ofc_detail_tbody');
    const totalEl = document.getElementById('ofc_detail_total');
    const thCurrency = document.getElementById('ofc_th_currency');
    const validityText = document.getElementById('ofc_validity_text');
    
    const consoleToggleBox = document.getElementById('ofc_console_toggle');
    const radios = document.querySelectorAll('input[name="consoleBase"]');

    if (!btnOpen || !modal) return;

    const closeModal = () => { modal.style.display = 'none'; };
    btnApply.addEventListener('click', closeModal);
    btnCloseX.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

    // 전역 상태에 접근하여 화면을 그리는 함수 (콘솔 기준이 바뀌면 다시 그림)
    const renderModalContent = (consoleBaseChoice = '40HC') => {
        // 이전에 ofc.js에서 백엔드를 찌르고 받아둔 전역 객체가 있다고 가정합니다.
        // (만약 window.ofcGlobalState 가 없다면 빈 값으로 방어)
        const state = window.ofcGlobalState || {};
        const ofcData = state.ofcData || null;
        const extraCosts = state.extraCosts || [];
        
        const savedData = window.QuotationState.getRaw();
        const quotationData = savedData ? JSON.parse(savedData) : {};
        
        const containerType = (quotationData.q_container || '20FT').toUpperCase();
        const cbmVal = parseFloat(quotationData.q_cbm) || 1;
        const isConsole = containerType.includes('CON') || containerType.includes('LCL');
        const currency = state.currency || 'USD';

        thCurrency.textContent = currency;

        // 1. 유효기간 텍스트
        if (state.validityDate) {
            validityText.innerHTML = `유효 기간 : ~${state.validityDate} 까지`;
        } else if (ofcData && ofcData.validity && ofcData.validity.end) {
            validityText.innerHTML = `유효 기간 : ~${ofcData.validity.end.replace(/-/g, '/')} 까지`;
        } else {
            validityText.innerHTML = '';
        }

        // 2. 콘솔 토글 박스 제어
        if (isConsole) {
            consoleToggleBox.style.display = 'block';
            radios.forEach(r => {
                r.checked = (r.value === consoleBaseChoice);
            });
        } else {
            consoleToggleBox.style.display = 'none';
        }

        // Use the same calculation as the main result; do not show a partial total as complete.
        const detail=window.QuotationOcean.breakdown(containerType,cbmVal,consoleBaseChoice);
        tbody.replaceChildren();
        const row=(name,value)=>{
            const tr=document.createElement('tr'),label=document.createElement('td'),amount=document.createElement('td');
            label.textContent=name;amount.textContent=value;
            amount.style.textAlign='right';amount.style.fontWeight='700';tr.append(label,amount);tbody.appendChild(tr);
        };
        if(state.status!=='ready'){
            row('해상운임 및 추가운임',state.status==='loading'?'조회 중…':'조회 실패');
            totalEl.textContent='';return;
        }
        if(detail.basic==null){row('OFC (기본 해상운임)','등록 운임 없음');totalEl.textContent='';return;}
        const format=value=>value.toLocaleString('en-US',{maximumFractionDigits:2});
        row('OFC (기본 해상운임 평균)',format(detail.basic));
        detail.extras.forEach(item=>row(item.name||'추가운임',format(item.amount)));
        if(!detail.extras.length)row('추가운임','적용된 추가 운임이 없습니다.');
        const finalCost=detail.total;
        // 5. 총합계 렌더링
        totalEl.innerHTML = `<span style="font-size:0.85rem; margin-right:5px; color:#555;">${currency}</span>${finalCost.toLocaleString('en-US')}`;
    };

    // 모달 오픈 시 실행
    btnOpen.addEventListener('click', () => {
        // 기존 상태 읽어오기 (기본값 40HC)
        const defaultBase = window.ofcGlobalState?.consoleBase || '40HC';
        renderModalContent(defaultBase);
        modal.style.display = 'flex';
    });

    // 라디오 버튼 이벤트 (콘솔 기준 변경 시 재계산)
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // 전역 상태 갱신
            if (!window.ofcGlobalState) window.ofcGlobalState = {};
            window.ofcGlobalState.consoleBase = e.target.value;
            
            // 모달 다시 그리기
            renderModalContent(e.target.value);
            
            // 👉 ofc.js 쪽에 있는 원본 화면 렌더링 함수도 다시 찌르기 (만약 함수가 존재한다면)
            if (typeof window.renderOceanFreight === 'function') {
                window.renderOceanFreight();
            }
        });
    });
}