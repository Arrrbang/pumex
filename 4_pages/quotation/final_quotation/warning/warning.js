/* warning.js */
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. CSS 로드
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = './warning/warning.css';
    document.head.appendChild(cssLink);

    // 2. HTML 비동기 로드 및 삽입
    try {
        const response = await fetch('./warning/warning.html');
        if (response.ok) {
            const htmlText = await response.text();
            
            // 💡 [1] Origin(출발지 비용) 경고창 세팅
            const originTd = document.getElementById('q_origin_amount');
            if (originTd) {
                originTd.style.position = 'relative';
                const wrapper = document.createElement('div');
                wrapper.innerHTML = htmlText.trim();
                
                const warningEl = wrapper.firstElementChild;
                warningEl.id = 'origin_warning_container'; // 겹치지 않게 고유 ID 부여
                const listEl = warningEl.querySelector('#warning_message_list') || warningEl.querySelector('ul');
                if (listEl) listEl.id = 'origin_warning_message_list';
                
                originTd.appendChild(warningEl);

                if (typeof window.calculateOriginTotal === 'function') {
                    window.calculateOriginTotal();
                }
            }

            // 💡 [2] OFC(해상운임) 경고창 세팅
            const ofcTd = document.getElementById('q_freight_amount');
            if (ofcTd) {
                ofcTd.style.position = 'relative';
                const wrapper = document.createElement('div');
                wrapper.innerHTML = htmlText.trim();
                
                const warningEl = wrapper.firstElementChild;
                warningEl.id = 'ofc_warning_container'; // 겹치지 않게 고유 ID 부여
                const listEl = warningEl.querySelector('#warning_message_list') || warningEl.querySelector('ul');
                if (listEl) listEl.id = 'ofc_warning_message_list';
                
                ofcTd.appendChild(warningEl);

                // 처음 열렸을 때 빈 값('')을 넣어 강제로 경고창을 띄웁니다
                if (typeof window.updateOfcByPrefix === 'function') {
                    window.updateOfcByPrefix('');
                }
            }

            // 값 변경 감시자 실행
            observeInputChanges();
        }
    } catch (e) {
        console.error("Warning HTML 로드 실패:", e);
    }
});

function observeInputChanges() {
    const observer = new MutationObserver(() => {
        if (typeof window.calculateOriginTotal === 'function') {
            window.calculateOriginTotal();
        }
    });

    const targets = [
        document.getElementById('q_origin_add'),
        document.getElementById('q_loading_port_wrap')
    ];

    targets.forEach(target => {
        if (target) {
            observer.observe(target, { childList: true, characterData: true, subtree: true });
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.id === 'pol_select' || e.target.id === 'q_pdate') {
            if (typeof window.calculateOriginTotal === 'function') {
                window.calculateOriginTotal();
            }
        }
    });
}

// 💡 Origin 경고 상태 검사 함수
window.updateOriginWarning = function() {
    const list = document.getElementById('origin_warning_message_list') || document.getElementById('warning_message_list');
    if (!list) return false;

    let messages = [];
    const originAdd = document.getElementById('q_origin_add')?.textContent.trim() || '';
    if (!originAdd || originAdd.includes('클릭하여 출발지 검색') || originAdd === '-') {
        messages.push('포장지가 설정되지 않았습니다.');
    }

    const polSelect = document.getElementById('pol_select');
    if (!polSelect || !polSelect.value || polSelect.value === '' || polSelect.value.includes('--')) {
        messages.push('출발항(POL)이 선택되지 않았습니다.');
    }

    const pdate = document.getElementById('q_pdate')?.value.trim() || '';
    if (!pdate || pdate.includes('포장일 설정')) {
        messages.push('포장일이 설정되지 않았습니다.');
    }

    if (messages.length > 0) {
        list.innerHTML = messages.map(m => `<li>${m}</li>`).join('');
        return true; 
    } else {
        return false; 
    }
};

// 💡 OFC 해상운임 경고 상태 검사 함수 (신규 추가)
window.updateOfcWarning = function() {
    const list = document.getElementById('ofc_warning_message_list');
    if (!list) return false;

    let messages = [];
    const polSelect = document.getElementById('pol_select');
    
    if (!polSelect || !polSelect.value || polSelect.value === '' || polSelect.value.includes('--')) {
        messages.push('출발항(POL)이 선택되지 않았습니다.');
    }

    if (messages.length > 0) {
        list.innerHTML = messages.map(m => `<li>${m}</li>`).join('');
        return true;
    } else {
        return false;
    }
};