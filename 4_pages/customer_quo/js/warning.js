/* ./js/warning.js */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 이전 검색 기록 및 입력값 완벽 초기화 (새로고침 시 깨끗하게)
    const fieldsToClear = [
        'q_customer_name', 'q_customer_email', 'q_pdate', 'q_origin_add',
        'country', 'region', 'partner', 
        'cargoType', 'poe', 'containerType', 'cbm'
    ];
    
    fieldsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            el.setAttribute('autocomplete', 'off'); // 자동완성 끄기
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

    // 3. 사용자가 입력을 시작하면 빨간 줄과 느낌표 즉시 제거
    document.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', function() { removeError(this); });
        el.addEventListener('change', function() { removeError(this); });
    });
});

// =========================================================================
// 💡 [추가] 모바일 전용 커스텀 경고 팝업 함수
// =========================================================================
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

// =========================================================================
// 💡 에러 마크 지우개 함수
// =========================================================================
function removeError(el) {
    el.classList.remove('input-error');
    const wrapper = el.parentElement;
    if (wrapper) {
        // 해당 인풋에만 묶인 고유 아이콘 지우기
        const icon = wrapper.querySelector('.error-icon-' + el.id);
        if (icon) icon.remove();
    }
}

// =========================================================================
// 💡 다음 단계 검사 함수
// =========================================================================
window.validateStep = function(step) {
    let isValid = true;
    let firstErrorMsg = '';
    
    // 각 스텝별 필수 입력 ID 모음
    const stepFields = {
        1: [
            { id: 'q_customer_name', name: '고객명', type: '입력' },
            { id: 'q_customer_email', name: '이메일', type: '입력' },
            { id: 'q_pdate', name: '포장일', type: '설정' },
            { id: 'q_origin_add', name: '출발지 주소', type: '검색' }
        ],
        2: [
            { id: 'country', name: '나라', type: '선택' },
            { id: 'region', name: '지역', type: '선택' },
            { id: 'partner', name: '파트너', type: '선택' }
        ],
        3: [
            { id: 'cargoType', name: '화물 타입', type: '선택' },
            { id: 'poe', name: 'POE(도착항)', type: '선택' },
            { id: 'containerType', name: '컨테이너 타입', type: '선택' },
            { id: 'cbm', name: 'CBM(물량)', type: '입력' }
        ]
    };

    const fieldsToCheck = stepFields[step];
    if (!fieldsToCheck) return true;

    // 검사 전 기존 에러 초기화
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
            
            // 첫 번째 에러 메시지 세팅
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
                // ID를 클래스에 포함시켜서 헷갈리지 않게 고유성 부여
                icon.className = `fa-solid fa-circle-exclamation error-icon error-icon-${field.id}`;
                
                // 💡 [핵심 해결] 제목(Label)을 제외하고, 딱 '입력창(Input)'만의 위치와 높이를 계산해서 완벽하게 상하 정중앙에 배치!
                const elTop = el.offsetTop;
                const elHeight = el.offsetHeight;
                icon.style.top = (elTop + (elHeight / 2)) + 'px';
                
                // 드롭다운 및 아이콘 겹침 방지 여백 설정
                if (field.id === 'q_pdate' || field.id === 'q_origin_add') {
                    icon.style.right = '45px'; 
                } else if (field.id === 'cbm') {
                    icon.style.right = '60px'; 
                } else if (el.tagName === 'SELECT') {
                    icon.style.right = '35px'; // 드롭다운 기본 화살표 피하기
                } else {
                    icon.style.right = '15px';
                }
                wrapper.appendChild(icon);
            }
        }
    }

    if (!isValid) {
        showCustomAlert(firstErrorMsg); // 네이티브 alert() 대신 예쁜 팝업 띄우기
    }

    return isValid;
};