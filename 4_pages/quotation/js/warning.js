/* ./js/warning.js */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 초기화 
    const fieldsToClear = ['country', 'region', 'partner', 'cargoType', 'poe', 'containerType', 'cbm'];
    
    fieldsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            el.setAttribute('autocomplete', 'off');
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
        }
    });

    // 2. 에러 UI용 CSS 동적 삽입
    const style = document.createElement('style');
    style.innerHTML = `
        .input-error {
            border: 2px solid #e74c3c !important;
            background-color: #fffafa !important;
            transition: all 0.2s;
        }
        .error-icon {
            position: absolute;
            transform: translateY(-50%);
            color: #e74c3c;
            font-size: 1.15rem;
            pointer-events: none;
            z-index: 10;
            margin: 0;
            line-height: 1;
            animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popIn {
            0% { transform: translateY(-50%) scale(0); opacity: 0; }
            100% { transform: translateY(-50%) scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

// 3. 실시간 에러 해제 이벤트 등록
    document.body.addEventListener('input', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') removeError(e.target);
    });
    document.body.addEventListener('change', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') removeError(e.target);
    });

    // 💡 [핵심 추가] search.js의 커스텀 드롭다운(searchable-item) 클릭을 감지하여 에러 해제
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('searchable-item') || e.target.classList.contains('searchable-item-nearest')) {
            // 클릭된 드롭다운 항목이 속한 wrapper를 찾습니다.
            const wrapper = e.target.closest('.searchable-select-wrapper');
            if (wrapper) {
                // wrapper 안의 가짜 input과 원래 select의 에러를 모두 지웁니다.
                const inputEl = wrapper.querySelector('input');
                if (inputEl) removeError(inputEl);
            }
        }
    });
});

// 커스텀 경고 팝업 함수
function showCustomAlert(message) {
    const existing = document.getElementById('custom-warning-modal');
    if(existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'custom-warning-modal';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 10005; display: flex; justify-content: center; align-items: center;';

    overlay.innerHTML = `
        <div style="background: #fff; width: 85%; max-width: 320px; border-radius: 12px; padding: 24px 20px 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column; align-items: center; text-align: center;" onclick="event.stopPropagation()">
            <div style="font-size: 2.5rem; color: #e74c3c; margin-bottom: 15px;"><i class="fa-solid fa-circle-exclamation"></i></div>
            <div style="font-size: 1.05rem; color: #333; margin-bottom: 20px; font-weight: 700; line-height: 1.4; word-break: keep-all;">${message}</div>
            <button type="button" id="custom-warning-btn" style="background: #113c5f; color: #fff; border: none; padding: 12px; width: 100%; border-radius: 6px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: opacity 0.2s;">확인</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    document.getElementById('custom-warning-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
}

// 에러 마크 지우개 함수
function removeError(el) {
    el.classList.remove('input-error');
    const wrapper = el.parentElement;
    if (wrapper) {
        const icon = wrapper.querySelector('.error-icon-' + el.id);
        if (icon) icon.remove();
    }
}

// 다음 단계 검사 함수
window.validateStep = function(step) {
    let isValid = true;
    let firstErrorMsg = '';
    
    // 💡 [수정됨] 데스크탑 index.html의 구조에 맞춘 단계별 필수 입력 ID 매핑
    const stepFields = {
        1: [
            { id: 'country', name: '나라', type: '선택' },
            { id: 'region', name: '지역', type: '선택' },
            { id: 'partner', name: '파트너', type: '선택' }
        ],
        2: [
            { id: 'cargoType', name: '화물 타입', type: '선택' },
            { id: 'poe', name: 'POE(도착항)', type: '선택' }
        ],
        3: [
            { id: 'containerType', name: '컨테이너 타입', type: '선택' },
            { id: 'cbm', name: 'CBM(물량)', type: '입력' }
        ]
    };

    const fieldsToCheck = stepFields[step];
    if (!fieldsToCheck) return true;

    fieldsToCheck.forEach(field => {
        const el = document.getElementById(field.id);
        if(el) removeError(el);
    });

    for (let i = 0; i < fieldsToCheck.length; i++) {
        const field = fieldsToCheck[i];
        const el = document.getElementById(field.id);
        if (!el) continue;

        const val = el.value.trim();
        if (!val) {
            isValid = false;
            
            if (!firstErrorMsg) {
                firstErrorMsg = `${field.name}을(를) ${field.type}해 주세요.`;
            }
            
            el.classList.add('input-error');
            
            const wrapper = el.parentElement;
            if (window.getComputedStyle(wrapper).position === 'static') {
                wrapper.style.position = 'relative';
            }
            
            if (!wrapper.querySelector('.error-icon-' + field.id)) {
                const icon = document.createElement('i');
                icon.className = `fa-solid fa-circle-exclamation error-icon error-icon-${field.id}`;
                
                const elTop = el.offsetTop;
                const elHeight = el.offsetHeight;
                icon.style.top = (elTop + (elHeight / 2)) + 'px';
                
                if (field.id === 'cbm') {
                    icon.style.right = '60px'; 
                } else if (el.tagName === 'SELECT') {
                    icon.style.right = '35px'; 
                } else {
                    icon.style.right = '15px';
                }
                wrapper.appendChild(icon);
            }
        }
    }

    if (!isValid) {
        showCustomAlert(firstErrorMsg);
    }

    return isValid;
};