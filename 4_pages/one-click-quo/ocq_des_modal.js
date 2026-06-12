document.addEventListener('DOMContentLoaded', () => {
    // 1. 모달 뼈대 생성 (thead와 colgroup을 동적으로 바꿀 수 있게 비워둡니다)
    const placeholder = document.getElementById('des-modal-placeholder');
    if(placeholder) {
        placeholder.innerHTML = `
        <div id="desModal" class="modal-overlay" style="display: none; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 9999;">
            <div class="modal-content" style="background: #fff; border-radius: 8px; max-width: 550px; width: 90%; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-height: 85vh; display: flex; flex-direction: column;">
                
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--invoice-blue, #1A365D); padding-bottom: 12px; margin-bottom: 20px; flex-shrink: 0;">
                    <h3 id="desModalTitle" style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--invoice-blue, #1A365D);">상세 내역</h3>
                    <button onclick="closeDesModal()" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #999; line-height: 1;">&times;</button>
                </div>
                
                <div class="modal-body" style="overflow-y: auto; flex-grow: 1;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <colgroup id="desModalColgroup"></colgroup>
                        <thead id="desModalThead"></thead>
                        <tbody id="desModalTbody"></tbody>
                    </table>
                </div>

                <div class="modal-footer" style="text-align: right; margin-top: 20px; flex-shrink: 0;">
                    <button onclick="closeDesModal()" style="padding: 10px 25px; background: var(--invoice-blue, #1A365D); color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 1rem;">닫기</button>
                </div>
            </div>
        </div>
        `;
    }

    // 2. 각 돋보기 버튼 클릭 이벤트 연결
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.icon-square-btn');
        if (!btn) return;
        
        if (btn.id === 'btnOpenDesCds') openDesModal('CDS', 'Complete Destination Charges 상세 내역');
        else if (btn.id === 'btnOpenDesAdd') openDesModal('ADD', 'Additional Charge 상세 내역');
        else if (btn.id === 'btnOpenDesTax') openDesModal('TAX', 'Tax & Duty 상세 내역');
        else if (btn.id === 'btnOpenDesOtc') openDesModal('OTC', 'Others Charges 상세 내역');
    });
});

function openDesModal(filterType, title) {
    const modal = document.getElementById('desModal');
    const colgroup = document.getElementById('desModalColgroup');
    const thead = document.getElementById('desModalThead');
    const tbody = document.getElementById('desModalTbody');
    
    document.getElementById('desModalTitle').textContent = title;
    tbody.innerHTML = ''; 

    // ──────────────────────────────────────────
    // 1. 타입에 따른 테이블 헤더(열 개수) 동적 세팅
    // ──────────────────────────────────────────
    let colHtml = '';
    let headHtml = '<tr style="background: #f4f6f8; border-bottom: 1px solid #ddd;">';

    if (filterType === 'CDS') {
        colHtml = `<col style="width: 70%;"><col style="width: 30%;">`;
        headHtml += `<th style="padding: 12px; text-align: left; font-size: 0.9rem; color: #555;">항목명 (Description)</th>
                     <th style="padding: 12px; text-align: right; font-size: 0.9rem; color: #555;">금액 (Amount)</th>`;
    } else if (filterType === 'ADD') {
        colHtml = `<col style="width: 10%;"><col style="width: 60%;"><col style="width: 30%;">`;
        headHtml += `<th style="padding: 12px; text-align: center;"><input type="checkbox" id="modalCheckAll" checked style="cursor:pointer;"></th>
                     <th style="padding: 12px; text-align: left; font-size: 0.9rem; color: #555;">항목명 (Description)</th>
                     <th style="padding: 12px; text-align: right; font-size: 0.9rem; color: #555;">금액 (Amount)</th>`;
    } else { 
        // TAX, OTC는 금액칸 없이 넓게
        colHtml = `<col style="width: 10%;"><col style="width: 90%;">`;
        headHtml += `<th style="padding: 12px; text-align: center;"><input type="checkbox" id="modalCheckAll" checked style="cursor:pointer;"></th>
                     <th style="padding: 12px; text-align: left; font-size: 0.9rem; color: #555;">항목명 (Description)</th>`;
    }
    headHtml += '</tr>';
    
    colgroup.innerHTML = colHtml;
    thead.innerHTML = headHtml;

    // ──────────────────────────────────────────
    // 2. 숨겨진 원본 데이터 파싱 및 행(Row) 생성
    // ──────────────────────────────────────────
    const rows = document.querySelectorAll('#q_dest_wrap tbody tr');
    let hasData = false;

    rows.forEach((row, index) => {
        let rowType = '';
        const selectEl = row.querySelector('.type-select');
        
        if (selectEl) {
            rowType = selectEl.value;
        } else if (row.classList.contains('row-other')) {
            rowType = 'OTC'; 
        }

        if (rowType === filterType) {
            hasData = true;
            
            // 모달 체크박스와 뒷단 데이터의 동기화를 위해 고유 번호 부여
            row.dataset.rowIndex = index;

            // [핵심] 합계 계산을 위해 뒷단에 체크박스가 없다면 강제로 하나 심어줍니다.
            let hiddenCheck = row.querySelector('.extra-check') || row.querySelector('.other-check');
            if (!hiddenCheck) {
                hiddenCheck = document.createElement('input');
                hiddenCheck.type = 'checkbox';
                hiddenCheck.className = row.classList.contains('row-other') ? 'other-check' : 'extra-check';
                hiddenCheck.checked = true; // 기본값
                hiddenCheck.style.display = 'none';
                row.appendChild(hiddenCheck);
            }
            
            // 텍스트 & 참고사항 HTML 원본 추출 (굵기, 줄바꿈 유지)
            let itemName = '상세 정보';
            const spans = row.querySelectorAll('.item-title span');
            spans.forEach(s => {
                if (!s.classList.contains('toggle-icon')) itemName = s.textContent.trim();
            });

            const extraDiv = row.querySelector('.item-extra');
            const extraHtml = extraDiv ? extraDiv.innerHTML : '';
            const hasExtra = !!extraHtml.trim();
            
            // 참고사항이 있을 때만 클릭 아이콘(▶) 렌더링
            const toggleIcon = hasExtra ? `<span class="modal-toggle-icon" style="display:inline-block; width:15px; color: var(--invoice-blue, #1A365D);">▶</span>` : `<span style="display:inline-block; width:15px;"></span>`;

            // 금액 텍스트 추출
            const amtTd = row.querySelector('.amt');
            const amtTxt = amtTd ? amtTd.textContent.trim() : '-';

            // 메인 행(tr) 만들기
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';

            let rowHtml = '';
            if (filterType === 'CDS') {
                rowHtml += `<td style="padding: 12px; font-size: 0.95rem; color: #333; cursor: ${hasExtra ? 'pointer' : 'default'};" class="modal-item-title">${toggleIcon} <strong>${itemName}</strong></td>
                            <td style="padding: 12px; font-size: 1rem; font-weight: 800; text-align: right; color: var(--invoice-blue, #1A365D);">${amtTxt}</td>`;
            } else if (filterType === 'ADD') {
                rowHtml += `<td style="padding: 12px; text-align: center;"><input type="checkbox" class="modal-row-check" data-target-index="${index}" ${hiddenCheck.checked ? 'checked' : ''} style="cursor:pointer;"></td>
                            <td style="padding: 12px; font-size: 0.95rem; color: #333; cursor: ${hasExtra ? 'pointer' : 'default'};" class="modal-item-title">${toggleIcon} <strong>${itemName}</strong></td>
                            <td style="padding: 12px; font-size: 1rem; font-weight: 800; text-align: right; color: var(--invoice-blue, #1A365D);">${amtTxt}</td>`;
            } else { // TAX, OTC
                rowHtml += `<td style="padding: 12px; text-align: center;"><input type="checkbox" class="modal-row-check" data-target-index="${index}" ${hiddenCheck.checked ? 'checked' : ''} style="cursor:pointer;"></td>
                            <td style="padding: 12px; font-size: 0.95rem; color: #333; cursor: ${hasExtra ? 'pointer' : 'default'};" class="modal-item-title">${toggleIcon} <strong>${itemName}</strong></td>`;
            }
            tr.innerHTML = rowHtml;
            tbody.appendChild(tr);

            // [핵심] 참고사항 아코디언 행(tr) 만들기
            if (hasExtra) {
                const trExtra = document.createElement('tr');
                trExtra.style.display = 'none'; // 처음엔 숨겨둠
                trExtra.style.backgroundColor = '#f9fafb';
                
                const colspan = (filterType === 'CDS' || filterType === 'TAX' || filterType === 'OTC') ? 2 : 3;
                trExtra.innerHTML = `<td colspan="${colspan}" style="padding: 12px 15px 12px 35px; font-size: 0.85rem; color: #555; border-bottom: 1px solid #eee; line-height: 1.6;">${extraHtml}</td>`;
                tbody.appendChild(trExtra);

                // 클릭 이벤트 - 참고사항 토글 열기/닫기
                const titleTd = tr.querySelector('.modal-item-title');
                titleTd.addEventListener('click', (e) => {
                    if (e.target.tagName === 'INPUT') return; // 체크박스 눌렀을 땐 아코디언 무시
                    const isHidden = trExtra.style.display === 'none';
                    trExtra.style.display = isHidden ? 'table-row' : 'none';
                    const icon = titleTd.querySelector('.modal-toggle-icon');
                    if (icon) icon.textContent = isHidden ? '▼' : '▶';
                });
            }
        }
    });

    // ──────────────────────────────────────────
    // 3. 체크박스 동기화 & 합계 재계산 이벤트 연동
    // ──────────────────────────────────────────
    const rowChecks = tbody.querySelectorAll('.modal-row-check');
    const checkAll = document.getElementById('modalCheckAll');

    if (checkAll && rowChecks.length > 0) {
        const updateCheckAllState = () => {
            checkAll.checked = Array.from(rowChecks).every(cb => cb.checked);
        };
        updateCheckAllState();

        // 각 행의 체크박스를 눌렀을 때
        rowChecks.forEach(cb => {
            cb.addEventListener('change', function() {
                syncHiddenCheckbox(this.dataset.targetIndex, this.checked);
                updateCheckAllState();
            });
        });

        // 헤더의 [전체 선택] 체크박스를 눌렀을 때
        checkAll.addEventListener('change', function() {
            const isChecked = this.checked;
            rowChecks.forEach(cb => {
                cb.checked = isChecked;
                syncHiddenCheckbox(cb.dataset.targetIndex, isChecked);
            });
        });
    }

    if (!hasData) {
        const colspan = (filterType === 'CDS' || filterType === 'TAX' || filterType === 'OTC') ? 2 : 3;
        tbody.innerHTML = `<tr><td colspan="${colspan}" style="padding: 30px; text-align: center; color: #999; font-weight: 600;">해당 분류의 상세 내역이 없습니다.</td></tr>`;
    }

    modal.style.display = 'flex';
}

// 뒷단(숨겨진 표)의 체크박스를 변경하여 메인 화면의 합계 금액이 자동 계산되도록 찌르는 함수
function syncHiddenCheckbox(rowIndex, isChecked) {
    const rows = document.querySelectorAll('#q_dest_wrap tbody tr');
    const targetRow = Array.from(rows).find(r => r.dataset.rowIndex === String(rowIndex));
    
    if (targetRow) {
        let hiddenCheck = targetRow.querySelector('.extra-check') || targetRow.querySelector('.other-check');
        if (hiddenCheck) {
            hiddenCheck.checked = isChecked;
            // 강제로 'change' 이벤트를 발생시켜 one_click_quo.js 내부의 updateSummary() 로직이 작동하게 만듭니다!
            hiddenCheck.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

function closeDesModal() {
    const modal = document.getElementById('desModal');
    if (modal) modal.style.display = 'none';
}