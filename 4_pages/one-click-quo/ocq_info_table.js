/* ==========================================================================
   [ocq_info_table.js]
   역할: 상단 Master Info Table의 모든 UI 및 데이터 바인딩 전담
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initCustomerName();
    initDate();
    initOriginSearch();
    
    loadMasterInfoFields();

    // 입력 전/후 배경 상태 공통 관리
    initInputHintStates();

    // OFC가 먼저 데이터를 받아둔 경우에만 적용
    // 여기서 []를 넣으면 BUS/INC 판단 전에 전체 항구가 먼저 떠버림
    if (Array.isArray(window.__pendingPolPoes)) {
        window.setupPolDropdown(window.__pendingPolPoes);
        window.__pendingPolPoes = null;
    }
    
    setTimeout(initCargoAndContainerUI, 300);
});

/**
 * 1. [데이터 바인딩] 세션 스토리지에서 파트너, 도착지 등의 정보 로드
 */
function loadMasterInfoFields() {
    const rawData = sessionStorage.getItem('oneClickQuoteData');
    if (!rawData) return;

    try {
        const data = JSON.parse(rawData);

        // 1-1. Partner (포워더/선사)
        const partnerEl = document.getElementById('q_partner');
        if (partnerEl) partnerEl.textContent = data.partner || '-';

        // 1-2. Destination Port (도착항)
        const destPortEl = document.getElementById('q_dest_port');
        if (destPortEl) destPortEl.textContent = data.destPort || data.poe || '-';

        // 1-3. Location (최종 목적지/지역)
        const locationEl = document.getElementById('q_location');
        if (locationEl) locationEl.textContent = data.location || '-';

        // 1-4. Discharge Port Wrap (만약 특정 텍스트를 넣어야 한다면)
        const dischargeEl = document.getElementById('q_discharge_port_wrap');
        if (dischargeEl) {
            // 필요에 따라 data.poe 등을 넣어줍니다.
            dischargeEl.textContent = data.poe || data.destPort || '-';
        }

        // 1-5. Packing Date (포장일) 세팅 및 텍스트/달력 자동 전환 이벤트
            const pdateEl = document.getElementById('q_pdate');
            const pdateBtn = document.getElementById('q_pdate_btn');

            if (pdateEl) {
            let initialDate = data.packingDate || data.pdate || data.date || '';
            
            // 세션에 저장된 날짜가 있으면 달력 형태로 바로 보여줌
            if (initialDate) {
                initialDate = initialDate.replace(/\./g, '-').replace(/\//g, '-');
                pdateEl.type = 'date';
                pdateEl.value = initialDate;
                setInputHintState(pdateEl);
                updatePackingDateWeekday();
            } else {
                pdateEl.type = 'text';
                pdateEl.value = pdateEl.dataset.placeholder || '클릭하여 포장일 설정';
                setInputHintState(pdateEl);
                updatePackingDateWeekday();
            }

            // ✨ 클릭(포커스) 시: 텍스트 칸을 '달력(date)'으로 변환하고 즉시 팝업 띄우기
            pdateEl.addEventListener('focus', function() {
                this.type = 'date';
                try { this.showPicker(); } catch(e) {} // 최신 브라우저는 클릭 즉시 달력 팝업 오픈
            });

            // ✨ 포커스 해제(블러) 시: 날짜를 선택하지 않고 껐다면 다시 텍스트 문구로 복구
            pdateEl.addEventListener('blur', function() {
                if (!this.value) {
                    this.type = 'text';
                    this.value = this.dataset.placeholder || '클릭하여 포장일 설정';
                }

                setInputHintState(this);
                updatePackingDateWeekday();
            });

            // ✨ 날짜가 변경되었을 때: SOS 모듈 백그라운드 자동 재계산
            pdateEl.addEventListener('change', () => {
                setInputHintState(pdateEl);
                updatePackingDateWeekday();

                if (typeof autoCalculateSos === 'function') autoCalculateSos();
            });
        }

        if (pdateBtn) {
            pdateBtn.addEventListener('click', () => {
                pdateEl.type = 'date';
                pdateEl.focus();

                try {
                    pdateEl.showPicker();
                } catch (e) {
                    // 일부 브라우저는 showPicker 미지원
                }
            });
        }

        console.log("✅ 마스터 인포 필드 로드 완료:", data);
    } catch (e) {
        console.error("❌ 마스터 인포 데이터 파싱 실패:", e);
    }
}
/**
 * [공통 입력 안내 상태 관리]
 * - placeholder 상태면 노란 배경 유지
 * - 실제 값이 들어오면 is-typed 추가해서 배경 제거
 */
function setInputHintState(el) {
    if (!el) return;

    const placeholder = el.dataset.placeholder || '';

    let value = '';

    if (el.tagName === 'INPUT') {
        value = String(el.value || '').trim();
    } else {
        value = String(el.textContent || '').trim();
    }

    const isEmpty =
        !value ||
        value === placeholder ||
        value.includes('클릭하여');

    el.classList.toggle('is-typed', !isEmpty);
}

function getKoreanWeekday(dateValue) {
    if (!dateValue) return '';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return weekdays[date.getDay()];
}

function updatePackingDateWeekday() {
    const pdateEl = document.getElementById('q_pdate');
    const weekdayEl = document.getElementById('q_pdate_weekday');

    if (!pdateEl || !weekdayEl) return;

    const value = pdateEl.value;

    if (!value || value.includes('클릭하여')) {
        weekdayEl.textContent = '';
        weekdayEl.classList.add('is-empty');
        return;
    }

    const weekday = getKoreanWeekday(value);

    if (!weekday) {
        weekdayEl.textContent = '';
        weekdayEl.classList.add('is-empty');
        return;
    }

    weekdayEl.textContent = `(${weekday})`;
    weekdayEl.classList.remove('is-empty');
}

function initInputHintStates() {
    const targets = [
        document.getElementById('q_customer_name'),
        document.getElementById('q_origin_add'),
        document.getElementById('q_pdate')
    ];

    targets.forEach(el => {
        if (!el) return;

        setInputHintState(el);

        if (el.tagName === 'INPUT') {
            el.addEventListener('input', () => setInputHintState(el));
            el.addEventListener('change', () => setInputHintState(el));
            el.addEventListener('blur', () => setInputHintState(el));
        } else {
            el.addEventListener('input', () => setInputHintState(el));
            el.addEventListener('blur', () => setInputHintState(el));
        }
    });
}

/**
 * 2. [고객명] 편집 로직
 */
function initCustomerName() {
    const nameEl = document.getElementById('q_customer_name');
    if (!nameEl) return;

    const placeholder = nameEl.dataset.placeholder || '클릭하여 고객명 기재';

    nameEl.addEventListener('focus', function() {
        if (this.textContent.trim() === placeholder) {
            this.textContent = '';
        }
        setInputHintState(this);
    });

    nameEl.addEventListener('blur', function() {
        if (this.textContent.trim() === '') {
            this.textContent = placeholder;
        }
        setInputHintState(this);
    });

    nameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nameEl.blur();
        }
    });

    setInputHintState(nameEl);
}

/**
 * 3. [날짜] 오늘 날짜 기입
 */
function initDate() {
    const dateEl = document.getElementById('current_date');
    if (!dateEl) return;
    const today = new Date();
    dateEl.textContent = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * 4. [Origin] 출발지 주소 검색
 */
function initOriginSearch() {
    const originEl = document.getElementById('q_origin_add');
    if (!originEl) return;

    originEl.style.cursor = 'pointer';
    originEl.onclick = () => {
        new daum.Postcode({
            oncomplete: function(data) {
                const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
                originEl.textContent = addr;
                setInputHintState(originEl);
                if (typeof autoCalculateTrc === 'function') autoCalculateTrc();
            }
        }).open();
    };
}

/**
 * [POL 표시명 관리]
 * - 드롭다운 목록은 기존 항구명으로 보여줌
 * - 선택 후에는 BUSAN, KOREA / INCHEON, KOREA로 표시
 * - 실제 value는 주소 그대로 유지하여 TRC 계산에 사용
 */
function getPolDisplayLabelByValue(value) {
    const addr = String(value || '');

    if (addr.includes('부산')) {
        return 'BUSAN, KOREA';
    }

    if (addr.includes('인천')) {
        return 'INCHEON, KOREA';
    }

    return '';
}

function restorePolOptionLabels(polSelect) {
    if (!polSelect) return;

    Array.from(polSelect.options).forEach(option => {
        const originalLabel = option.dataset.originalLabel;
        if (originalLabel) {
            option.textContent = originalLabel;
        }
    });
}

function applyPolSelectedDisplayLabel(polSelect) {
    if (!polSelect) return;

    const printTextEl = document.getElementById('pol_print_text');
    const selectedOption = polSelect.options[polSelect.selectedIndex];

    if (!selectedOption || !selectedOption.value) {
        if (printTextEl) printTextEl.textContent = '';
        return;
    }

    const displayLabel =
        selectedOption.dataset.displayLabel ||
        getPolDisplayLabelByValue(selectedOption.value);

    if (displayLabel) {
        selectedOption.textContent = displayLabel;
        if (printTextEl) printTextEl.textContent = displayLabel;
    }
}

function bindPolDisplayBehavior(polSelect) {
    if (!polSelect || polSelect.dataset.polDisplayBound === 'Y') return;

    polSelect.dataset.polDisplayBound = 'Y';

    // 드롭다운을 열기 직전에는 다시 기존 항구명으로 복구
    polSelect.addEventListener('mousedown', () => {
        restorePolOptionLabels(polSelect);
    });

    polSelect.addEventListener('focus', () => {
        restorePolOptionLabels(polSelect);
    });

    // 선택 후에는 BUSAN, KOREA / INCHEON, KOREA로 표시
    polSelect.addEventListener('change', () => {
        applyPolSelectedDisplayLabel(polSelect);
    });

    // 포커스가 빠졌을 때도 표시명 유지
    polSelect.addEventListener('blur', () => {
        applyPolSelectedDisplayLabel(polSelect);
    });
}

window.setupPolDropdown = function(mappedPoes) {
    const polSelect = document.getElementById('pol_select');

    if (!polSelect) {
        console.warn('❌ POL select 요소를 찾지 못했습니다. id="pol_select" 확인 필요');
        return;
    }

    const safePoes = Array.isArray(mappedPoes) ? mappedPoes : [];
    const normalizedPoes = safePoes.map(v => String(v).trim().toUpperCase());

    const hasBus = normalizedPoes.some(v => v.includes('(BUS)'));
    const hasInc = normalizedPoes.some(v => v.includes('(INC)'));

    const optBusanNew = `
        <option 
            value="부산광역시 강서구 신항남로 330"
            data-original-label="부산신항 (미국, 유럽 등 장거리)"
            data-display-label="BUSAN, KOREA"
        >
            부산신항 (미국, 유럽 등 장거리)
        </option>
    `;

    const optBusanOld = `
        <option 
            value="부산광역시 남구 신선로 294"
            data-original-label="부산북항 (아시아, 인도네시아 등 단거리)"
            data-display-label="BUSAN, KOREA"
        >
            부산북항 (아시아, 인도네시아 등 단거리)
        </option>
    `;

    const optIncheon = `
        <option 
            value="인천 연수구 인천신항대로 707"
            data-original-label="인천항"
            data-display-label="INCHEON, KOREA"
        >
            인천항
        </option>
    `;

    const options = [];
    options.push(`<option value="">-- 항구 선택 --</option>`);

    if (hasBus) {
        options.push(optBusanNew);
        options.push(optBusanOld);
    }

    if (hasInc) {
        options.push(optIncheon);
    }

    // 진짜 아무 태그도 없을 때만 전체 표시
    if (!hasBus && !hasInc) {
        options.push(optBusanNew);
        options.push(optBusanOld);
        options.push(optIncheon);
    }

    polSelect.innerHTML = options.join('');

    bindPolDisplayBehavior(polSelect);

    polSelect.onchange = () => {
        applyPolSelectedDisplayLabel(polSelect);

        if (typeof autoCalculateTrc === 'function') {
            autoCalculateTrc();
        }
    };

    console.log('✅ POL 드롭다운 세팅 완료:', {
        raw: mappedPoes,
        normalized: normalizedPoes,
        hasBus,
        hasInc
    });
};

/**
 * 6. [Cargo & Container] CBM 파싱 및 드롭다운 생성
 */
function initCargoAndContainerUI() {
    const cbmEl = document.getElementById('q_cbm');
    const containerEl = document.getElementById('q_container');
    const cargoHidden = document.getElementById('q_cargo'); 

    const rawData = sessionStorage.getItem('oneClickQuoteData');
    if (!rawData) return;
    const data = JSON.parse(rawData);
    const cargoRaw = (data.cargo || '').toUpperCase();

    if (cargoHidden) cargoHidden.textContent = cargoRaw;

    const cbmMatch = cargoRaw.match(/([\d.]+)\s*CBM/i);
    const cbmVal = cbmMatch ? cbmMatch[0] : "-"; 
    const isConsole = cargoRaw.includes('CON') || cargoRaw.includes('LCL');
    
    if (cbmEl) cbmEl.textContent = `${cbmVal} / ${isConsole ? "CONSOLE" : "SINGLE"}`;

    if (containerEl) {
        if (isConsole) {
            if (!document.getElementById('q_container_select')) {
                containerEl.innerHTML = `
                    <select id="q_container_select" style="padding: 2px 4px; border-radius: 4px; border: 1px solid #ccc; font-weight: 700; cursor: pointer; color: #1A73E8; outline: none; font-family: inherit; font-size: 13px;">
                        <option value="console40" selected>CONSOLE (into 40HC)</option>
                        <option value="console20">CONSOLE (into 20DR)</option>
                    </select>
                `;

                const selectEl = document.getElementById('q_container_select');
                selectEl.addEventListener('change', (e) => {
                    if (typeof ofcGlobalState !== 'undefined') {
                        ofcGlobalState.consoleBase = (e.target.value === 'console20') ? '20FT' : '40HC';
                        if (typeof renderOceanFreight === 'function') renderOceanFreight();
                    }
                    if (typeof autoCalculateTrc === 'function') autoCalculateTrc();
                });
            }
        } else {
            let containerText = "20FT";
            if (cargoRaw.includes('40')) containerText = "40HC";
            containerEl.textContent = containerText;
        }
    }
}

