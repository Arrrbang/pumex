/* 3_components/3_sos-modal/one_click_sos.js */
(function() {
    const currentScript = document.currentScript.src;
    const sosBasePath = currentScript.substring(0, currentScript.lastIndexOf('/'));

    document.addEventListener('DOMContentLoaded', async () => {
        const placeholder = document.getElementById('sos-modal-placeholder');
        if (!placeholder) return;

        try {
            const response = await fetch(`${sosBasePath}/one_click_sos.html`);
            const html = await response.text();
            placeholder.innerHTML = html;
            
            initSosEvents();
            createMiniPopup(); 
        } catch (error) {
            console.error('SOS 팝업 로드 실패:', error);
        }
    });

    function createMiniPopup() {
        // 1. 투명한 배경 오버레이
        const overlay = document.createElement('div');
        overlay.id = 'sosInfoOverlay';
        overlay.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.15); z-index: 9998; backdrop-filter: blur(1px);';
        
        // 2. 미니 팝업 창
        const popup = document.createElement('div');
        popup.id = 'sosInfoPopup';
        popup.style.cssText = 'display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid #e0e0e0; z-index: 9999; min-width: 320px; text-align: center;';
        
        popup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0; color: var(--deep-teal); font-weight: 800; font-size: 1.1em;">📌 SOS 적용 상세 정보</h4>
                <button id="btnSosInfoClose" style="background: none; border: none; font-size: 24px; line-height: 1; cursor: pointer; color: var(--medium-gray);">&times;</button>
            </div>
            <div id="sosInfoText" style="font-size: 1.15em; font-weight: 700; color: var(--forest-green); letter-spacing: 0.5px; background: var(--mint-white); padding: 15px; border-radius: 8px;"></div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        const closePopup = () => { overlay.style.display = 'none'; popup.style.display = 'none'; };
        document.getElementById('btnSosInfoClose').onclick = closePopup;
        overlay.onclick = closePopup;

        // ✨ [핵심 수정] 글씨가 아닌 네모 박스 전체를 버튼으로 만듭니다!
        const sosValueEl = document.getElementById('q_cost_sos');
        if (sosValueEl) {
            // 글씨(sosValueEl)를 감싸고 있는 부모 요소(네모 컨테이너)를 찾습니다.
            const clickableBox = sosValueEl.parentElement; 
            
            clickableBox.style.cursor = 'pointer';
            clickableBox.title = "클릭하여 적용된 상세 정보 확인";
            
            // ✨ UX 디테일: 마우스를 올리면 버튼처럼 살짝 들어가는 효과
            clickableBox.style.transition = 'transform 0.1s ease, box-shadow 0.2s';
            clickableBox.onmouseenter = () => {
                clickableBox.style.transform = 'scale(0.98)';
                clickableBox.style.boxShadow = 'inset 0 2px 5px rgba(0,0,0,0.05)';
            };
            clickableBox.onmouseleave = () => {
                clickableBox.style.transform = 'scale(1)';
                clickableBox.style.boxShadow = 'none';
            };
            
            // 박스를 클릭했을 때의 동작
            clickableBox.onclick = () => {
                const info = sosValueEl.dataset.sosInfo; // 정보는 글씨 태그 안에 저장되어 있음
                if (info) {
                    document.getElementById('sosInfoText').textContent = info;
                    overlay.style.display = 'block';
                    popup.style.display = 'block';
                } else {
                    const btnOpenSos = document.getElementById('btnOpenSos');
                    if (btnOpenSos) btnOpenSos.click();
                }
            };
        }
    }

    function initSosEvents() {
        const btnOpenSos = document.getElementById('btnOpenSos');
        const modalOverlay = document.getElementById('sosModalOverlay');
        const btnSosClose = document.getElementById('btnSosClose');
        const btnApply = document.getElementById('btnSosApply');

        if (btnOpenSos) {
            btnOpenSos.onclick = () => {
                modalOverlay.style.display = 'flex';
                const inputDate = document.getElementById('sosDateInput');
                if (inputDate && !inputDate.value) inputDate.value = new Date().toISOString().split('T')[0];

                try {
                    const stateStr = sessionStorage.getItem('lastSearchState');
                    const quoteStr = sessionStorage.getItem('oneClickQuoteData');
                    let cbmVal = null;
                    let typeVal = null;

                    if (stateStr) {
                        const state = JSON.parse(stateStr);
                        if (state.orig) {
                            cbmVal = state.orig.cbm;
                            typeVal = state.orig.type;
                        }
                    } else if (quoteStr) {
                        const quote = JSON.parse(quoteStr);
                        cbmVal = quote.cargo; 
                    }

                    const inputCbm = document.getElementById('sosCbmInput');
                    if (inputCbm && !inputCbm.value && cbmVal) {
                        const parsedCbm = parseFloat(cbmVal);
                        if (!isNaN(parsedCbm)) inputCbm.value = parsedCbm;
                    }

                    const selectType = document.getElementById('sosTypeSelect');
                    if (selectType && typeVal) {
                        const t = typeVal.toUpperCase();
                        if (t.includes('20')) selectType.value = '20DRY';
                        else if (t.includes('40')) selectType.value = '40HC';
                        else if (t.includes('CON')) selectType.value = 'CONSOLE';
                    }
                } catch (err) {
                    console.error('기존 데이터 자동입력 중 오류:', err);
                }
            };
        }

        const closeModal = () => { if (modalOverlay) modalOverlay.style.display = 'none'; };
        if (btnSosClose) btnSosClose.onclick = closeModal;

        if (btnApply) {
            btnApply.onclick = async () => {
                const dateVal = document.getElementById('sosDateInput').value;
                const typeVal = document.getElementById('sosTypeSelect').value;
                const cbmVal = document.getElementById('sosCbmInput').value;

                if (!dateVal || !cbmVal) { alert('날짜와 CBM을 입력해주세요.'); return; }

                btnApply.disabled = true;
                let dotCount = 0;
                btnApply.textContent = '조회 중';
                const loadingInterval = setInterval(() => {
                    dotCount = (dotCount + 1) % 4;
                    btnApply.textContent = '조회 중' + '.'.repeat(dotCount);
                }, 400);

                try {
                    const data = await window.fetchSosRateData(dateVal, typeVal, cbmVal);
                    if (data.ok && data.match?.value != null) {
                        const sosValueEl = document.getElementById('q_cost_sos');
                        if (sosValueEl) {
                            sosValueEl.textContent = data.match.value.toLocaleString() + '원';
                            
                            const dayOfWeek = new Date(dateVal).getDay(); 
                            const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? '주말' : '주중';
                            
                            // ✨ 정보 저장은 꼭 sosValueEl 에 해야 클릭 시 불러올 수 있습니다.
                            sosValueEl.dataset.sosInfo = `${dateVal} / ${dayType} / ${typeVal} / ${cbmVal} CBM`;
                        }
                        
                        document.dispatchEvent(new CustomEvent('updateQuoteTotal'));
                        closeModal();
                    } else {
                        alert('해당 조건의 요금이 없습니다.');
                    }
                } catch (err) {
                    alert('조회 중 오류가 발생했습니다.');
                } finally {
                    clearInterval(loadingInterval);
                    btnApply.disabled = false;
                    btnApply.textContent = '조회 및 적용하기';
                }
            };
        }
    }
})();