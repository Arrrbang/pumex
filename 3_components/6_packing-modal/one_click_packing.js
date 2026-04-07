/* 3_components/6_packing-modal/one_click_packing.js */
(function() {
    const currentScript = document.currentScript.src;
    const basePath = currentScript.substring(0, currentScript.lastIndexOf('/'));

    // ✨ 팝업 내 토글 디자인을 위한 미니 CSS 동적 추가
    const style = document.createElement('style');
    style.innerHTML = `
        .pack-detail-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 0.95em; }
        .pack-detail-label { color: var(--medium-gray); font-weight: 600; }
        .pack-detail-value { color: var(--dark-charcoal); font-weight: 800; }
        .pack-notice-item { margin-top: 10px; border: 1px solid var(--pale-mint-gray); border-radius: 6px; overflow: hidden; text-align: left; }
        .pack-notice-header { background: var(--mint-white); padding: 12px; cursor: pointer; font-weight: 700; font-size: 0.9em; color: var(--deep-teal); display: flex; justify-content: space-between; }
        .pack-notice-content { display: none; padding: 15px; font-size: 0.85em; color: var(--dark-charcoal); background: var(--white); border-top: 1px solid var(--pale-mint-gray); line-height: 1.5; }
        .pack-notice-content.open { display: block; }
        .pack-notice-line { display: flex; gap: 8px; margin-bottom: 6px; }
        .pack-notice-num { font-weight: 800; color: var(--forest-green); flex-shrink: 0; }
    `;
    document.head.appendChild(style);

    document.addEventListener('DOMContentLoaded', async () => {
        const placeholder = document.getElementById('packing-modal-placeholder');
        if (!placeholder) return;

        try {
            const response = await fetch(`${basePath}/one_click_packing.html`);
            placeholder.innerHTML = await response.text();
            initPackingEvents();
            createDetailPopup(); 
        } catch (error) {
            console.error('포장비 팝업 로드 실패:', error);
        }
    });

    // 다음 우편번호 검색기
    function searchAddress() {
        new daum.Postcode({
            oncomplete: function(data) {
                const addr = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
                document.getElementById('packingAddressInput').value = addr;
            }
        }).open();
    }

    // 금액 포맷팅 헬퍼
    function formatMoney(value) {
        if (value === undefined || value === null) return "-";
        if (typeof value === 'number') return value.toLocaleString('ko-KR') + " 원";
        return value; 
    }

    // ✨ 1. 클릭 영역 확장 및 상세 팝업 생성
    function createDetailPopup() {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.15); z-index: 9998; backdrop-filter: blur(1px);';
        
        const popup = document.createElement('div');
        popup.style.cssText = 'display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 25px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid #e0e0e0; z-index: 9999; width: 90%; max-width: 450px; max-height: 80vh; overflow-y: auto; text-align: center;';
        
        popup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid var(--forest-green);">
                <h4 style="margin: 0; color: var(--deep-teal); font-weight: 800; font-size: 1.1em;" id="packDetailTitle">📌 상세 비용 및 확인사항</h4>
                <button id="btnPackDetailClose" style="background: none; border: none; font-size: 24px; line-height: 1; cursor: pointer; color: var(--medium-gray);">&times;</button>
            </div>
            <div id="packDetailContent"></div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        const closePopup = () => { overlay.style.display = 'none'; popup.style.display = 'none'; };
        document.getElementById('btnPackDetailClose').onclick = closePopup;
        overlay.onclick = closePopup;

        // 지방포장비 카드 전체를 버튼으로 만들기
        const packValueEl = document.getElementById('q_cost_local_pack');
        if (packValueEl) {
            const clickableBox = packValueEl.parentElement; 
            clickableBox.style.cursor = 'pointer';
            clickableBox.title = "클릭하여 비용 계산 또는 상세 내역 확인";
            
            clickableBox.style.transition = 'transform 0.1s ease, box-shadow 0.2s';
            clickableBox.onmouseenter = () => {
                clickableBox.style.transform = 'scale(0.98)';
                clickableBox.style.boxShadow = 'inset 0 2px 5px rgba(0,0,0,0.05)';
            };
            clickableBox.onmouseleave = () => {
                clickableBox.style.transform = 'scale(1)';
                clickableBox.style.boxShadow = 'none';
            };
            
            // 박스 클릭 시 분기 처리
            clickableBox.onclick = () => {
                const infoStr = packValueEl.dataset.packInfo;
                if (infoStr) {
                    renderDetailPopup(JSON.parse(infoStr));
                    overlay.style.display = 'block';
                    popup.style.display = 'block';
                } else {
                    // 계산된 게 없으면 검색 팝업 열기
                    const btnOpen = document.getElementById('btnOpenPacking');
                    if (btnOpen) btnOpen.click();
                }
            };
        }
    }

    // ✨ 2. 세부 비용 및 토글 공지사항 렌더링
    function renderDetailPopup(info) {
        const contentDiv = document.getElementById('packDetailContent');
        const titleEl = document.getElementById('packDetailTitle');
        const d = info.data;
        
        titleEl.textContent = `📌 ${info.partner === 'yesg2m' ? 'YESG2M' : 'HANSOL'} 상세 내역`;

        let html = `<div style="margin-bottom: 20px;">`;
        
        // 공통 항목
        html += `<div class="pack-detail-item"><span class="pack-detail-label">포장 작업비</span><span class="pack-detail-value">${formatMoney(d.packingFee)}</span></div>`;
        html += `<div class="pack-detail-item"><span class="pack-detail-label">지역 출장비</span><span class="pack-detail-value">${formatMoney(d.travelFee)}</span></div>`;
        
        // YESG2M 전용 항목
        if (info.partner === 'yesg2m') {
            html += `<div class="pack-detail-item"><span class="pack-detail-label">방문 견적비</span><span class="pack-detail-value">${formatMoney(d.surveyFee)}</span></div>`;
            html += `<div class="pack-detail-item"><span class="pack-detail-label">EV+셔틀 작업비</span><span class="pack-detail-value">${formatMoney(d.shuttleFee)}</span></div>`;
            html += `<div class="pack-detail-item"><span class="pack-detail-label">WOODEN CRATE</span><span class="pack-detail-value">${formatMoney(d.woodenCrateFee)}</span></div>`;
            html += `<div class="pack-detail-item"><span class="pack-detail-label">창고 보관료</span><span class="pack-detail-value">${formatMoney(d.storageFee)}</span></div>`;
            html += `<div class="pack-detail-item"><span class="pack-detail-label">보관화물 상/하차비</span><span class="pack-detail-value">${formatMoney(d.loadingUnloadingFee)}</span></div>`;
        }
        html += `</div>`;

        // 확인사항(Notices) 토글 생성
        if (d.notices && d.notices.length > 0) {
            html += `<h4 style="text-align:left; color:var(--deep-teal); margin-bottom:10px;">💡 확인사항</h4>`;
            d.notices.forEach((notice, idx) => {
                let contentHtml = '';
                if (notice.content) {
                    const lines = notice.content.split('\n').filter(line => line.trim() !== '');
                    contentHtml = lines.map(line => {
                        const trimmed = line.trim();
                        const match = trimmed.match(/^(\[\d+\])\s*(.*)/);
                        if (match) {
                            return `<div class="pack-notice-line"><span class="pack-notice-num">${match[1]}</span><span>${match[2]}</span></div>`;
                        }
                        return `<div class="pack-notice-line"><span>${trimmed}</span></div>`;
                    }).join('');
                } else {
                    contentHtml = '내용 없음';
                }

                html += `
                    <div class="pack-notice-item">
                        <div class="pack-notice-header" onclick="this.nextElementSibling.classList.toggle('open'); this.querySelector('.toggle-icon').textContent = this.nextElementSibling.classList.contains('open') ? '▼' : '▶';">
                            <span>${notice.title}</span>
                            <span class="toggle-icon">▶</span>
                        </div>
                        <div class="pack-notice-content">${contentHtml}</div>
                    </div>
                `;
            });
        }

        contentDiv.innerHTML = html;
    }

    // ✨ 3. 초기 이벤트 세팅 (검색 모달 열기, 계산하기 등)
    function initPackingEvents() {
        const btnOpen = document.getElementById('btnOpenPacking');
        const modal = document.getElementById('packingModalOverlay');
        const btnClose = document.getElementById('btnPackingClose');
        const btnApply = document.getElementById('btnPackingApply');
        const addrInput = document.getElementById('packingAddressInput');
        const cbmInput = document.getElementById('packingCbmInput');

        if (addrInput) addrInput.onclick = searchAddress;
        if (btnClose) btnClose.onclick = () => { modal.style.display = 'none'; };

        if (btnOpen) {
            btnOpen.onclick = () => {
                modal.style.display = 'flex';
                // 배낭에서 CBM 꺼내기
                try {
                    const quoteStr = sessionStorage.getItem('oneClickQuoteData');
                    if (quoteStr) {
                        const quote = JSON.parse(quoteStr);
                        // "15 CBM" 에서 숫자만 추출
                        const parsedCbm = parseFloat(quote.cargo);
                        if (!isNaN(parsedCbm)) cbmInput.value = parsedCbm;
                    }
                } catch(e) {}
            };
        }

        if (btnApply) {
            btnApply.onclick = async () => {
                const partner = document.getElementById('packingPartnerSelect').value;
                const address = addrInput.value.trim();
                const cbm = cbmInput.value.trim();

                if (!address) return alert('포장지 주소를 검색해주세요.');
                if (!cbm) return alert('적용 CBM 값을 찾을 수 없습니다.');

                btnApply.disabled = true;
                let dotCount = 0;
                btnApply.textContent = '비용 계산 중';
                const loadingInterval = setInterval(() => {
                    dotCount = (dotCount + 1) % 4;
                    btnApply.textContent = '비용 계산 중' + '.'.repeat(dotCount);
                }, 400);

                try {
                    // 파트너에 따라 API URL 변경
                    const url = `https://notion-api-hub.vercel.app/api/${partner}/calculate`;
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ address, cbm })
                    });
                    const result = await response.json();

                    if (result.ok) {
                        const packEl = document.getElementById('q_cost_local_pack');
                        if (packEl) {
                            // 핵심: 포장작업비 + 지역출장비 합산
                            let pFee = result.data.packingFee;
                            let tFee = result.data.travelFee;
                            let sum = 0;
                            let isText = false;

                            if (typeof pFee === 'number') sum += pFee; else isText = true;
                            if (typeof tFee === 'number') sum += tFee; else isText = true;

                            // 둘 중 하나라도 "별도 문의" 같은 텍스트면 합계를 문자로 표시
                            packEl.textContent = (isText && sum === 0) ? "별도 문의 필요" : sum.toLocaleString() + '원';
                            
                            // 상세 내역을 팝업에 넘겨주기 위해 태그에 데이터 저장!
                            packEl.dataset.packInfo = JSON.stringify({ partner: partner, data: result.data });
                        }
                        
                        document.dispatchEvent(new CustomEvent('updateQuoteTotal'));
                        modal.style.display = 'none';
                    } else {
                        alert("오류: " + (result.error || "알 수 없는 오류"));
                    }
                } catch (e) {
                    console.error(e);
                    alert("서버 통신 오류가 발생했습니다.");
                } finally {
                    clearInterval(loadingInterval);
                    btnApply.disabled = false;
                    btnApply.textContent = '비용 계산 및 적용하기';
                }
            };
        }
    }
})();