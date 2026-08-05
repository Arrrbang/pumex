/* destination_popup.js */
'use strict';

// 💡 창을 닫아도 체크된 항목들을 기억하기 위한 전역 배열
window.cdsCheckedItemIds = window.cdsCheckedItemIds || [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. CSS 로드
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '../detail_popup/destination/destination_popup.css';
    document.head.appendChild(cssLink);

    // 2. HTML 팝업 비동기 로드
    try {
        const response = await fetch('../detail_popup/destination/destination_popup.html');
        if (response.ok) {
            const htmlText = await response.text();
            const wrapper = document.createElement('div');
            wrapper.innerHTML = htmlText;
            document.body.appendChild(wrapper);

            // 팝업 삽입 후 이벤트 바인딩 실행
            initCdsDetailPopup();
        }
    } catch (e) {
        console.error("도착지 상세 팝업 로드 실패:", e);
    }
});

function initCdsDetailPopup() {
    const btnOpen = document.getElementById('btnOpenCdsDetail');
    const modal = document.getElementById('cdsDetailModal');
    const btnApply = document.getElementById('btn_cds_apply');
    const btnCloseX = document.getElementById('btn_cds_close_x');
    const tbody = document.getElementById('cds_detail_tbody');
    const totalEl = document.getElementById('cds_detail_total');

    let currentCurrency = 'KRW';
    let currentBaseTotalAmount = 0; // 💡 기본 CDS 비용의 합계를 저장할 변수 추가

    if (!btnOpen || !modal) return;

    // 모달 닫기
    const closeModal = () => { modal.style.display = 'none'; };
    btnCloseX.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

    // 💡 추가 비용(ADD) 체크 시 총 합계(기본 CDS + 선택된 ADD) 실시간 재계산
    const calculateAddItems = () => {
        const checkboxes = document.querySelectorAll('.add-checkbox:checked');
        let totalAddAmt = 0;

        checkboxes.forEach(cb => {
            totalAddAmt += parseFloat(cb.getAttribute('data-amt')) || 0;
        });

        // 💡 하단 합계 영역 업데이트
        const grandTotal = currentBaseTotalAmount + totalAddAmt;
        totalEl.innerHTML = `<span style="font-size:0.85rem; margin-right:5px; color:#555;">${currentCurrency}</span>${grandTotal.toLocaleString('en-US')}`;
    };

    // 모달 열기 및 세션 데이터 읽어서 렌더링
    btnOpen.addEventListener('click', () => {
        const savedData = sessionStorage.getItem('finalQuotationData');
        if (!savedData) {
            alert('조회된 데이터가 없습니다.');
            return;
        }

        const quotationData = JSON.parse(savedData);
        const fullData = quotationData._fullResultData || [];
        currentCurrency = quotationData._currency || 'KRW';
        const typeKey = quotationData.q_container || '20FT';

        let htmlRows = '';
        currentBaseTotalAmount = 0; // 모달 열 때마다 초기화

        if (fullData.length === 0) {
            htmlRows = `<tr><td colspan="3" style="text-align:center; color:#999; padding: 20px;">도착지 상세 비용 내역이 없습니다.</td></tr>`;
        } else {
            // order 기준으로 정렬
            const sortedData = [...fullData].sort((a, b) => (a.order || 999) - (b.order || 999));

            sortedData.forEach(item => {
                const amt = parseFloat(item[typeKey]) || 0;
                const rType = (item.rowType || '').toUpperCase();
                const itemName = item.item || '비용 항목';
                const itemId = item.id || itemName; 
                const extraText = item.extra || '';

                let trContent = '';
                let extraRowHtml = '';
                
                const isChecked = window.cdsCheckedItemIds.includes(itemId) ? 'checked' : '';

                if (rType === 'ADD') {
                    // 💡 ADD 항목: 1번 열을 클릭 영역(add-checkbox-cell)으로 지정
                    const checkboxHtml = `<input type="checkbox" class="add-checkbox" data-id="${itemId}" data-amt="${amt}" data-name="${itemName}" ${isChecked} style="pointer-events: none;">`;
                    trContent = `
                        <td class="add-checkbox-cell" style="text-align: center; vertical-align: middle; cursor: pointer;" title="클릭하여 추가 비용 선택/해제">${checkboxHtml}</td>
                        <td>
                            <div style="font-weight: 600;">${itemName}</div>
                        </td>
                        <td style="text-align: right; font-weight: 600; vertical-align: middle;">${amt.toLocaleString('en-US')}</td>
                    `;
                } else if (rType === 'OTC') {
                    // OTC는 금액 열을 없애고 2번 열 확장. 1열 전체를 토글 영역으로 활용
                    if (extraText) {
                        const iconHtml = `<span class="otc-toggle-icon" style="color: #1A365D; font-size: 0.9em; user-select: none;">▶</span>`;
                        
                        trContent = `
                            <td class="otc-toggle-cell" style="text-align: center; vertical-align: middle; cursor: pointer;" title="클릭하여 상세 내역 보기">${iconHtml}</td>
                            <td colspan="2">
                                <div style="font-weight: 600;">${itemName}</div>
                            </td>
                        `;
                        
                        extraRowHtml = `
                            <tr class="otc-extra-row" style="display: none; background-color: #fafafa;">
                                <td colspan="3" style="padding: 12px 15px 12px 45px; font-size: 0.85rem; color: #666; border-top: 1px dashed #ddd; line-height: 1.5;">
                                    ${extraText.replace(/\n/g, '<br>')}
                                </td>
                            </tr>
                        `;
                    } else {
                        trContent = `
                            <td style="text-align: center; vertical-align: middle;">-</td>
                            <td colspan="2">
                                <div style="font-weight: 600;">${itemName}</div>
                            </td>
                        `;
                    }
                } else if (rType === 'CDS') {
                    // 기본 CDS는 자동 합산
                    currentBaseTotalAmount += amt;
                    trContent = `
                        <td style="text-align: center; vertical-align: middle;"><span style="color:#aaa;">-</span></td>
                        <td>
                            <div style="font-weight: 600;">${itemName}</div>
                        </td>
                        <td style="text-align: right; font-weight: 600; vertical-align: middle;">${amt.toLocaleString('en-US')}</td>
                    `;
                } else {
                    trContent = `
                        <td style="text-align: center; vertical-align: middle;">-</td>
                        <td>
                            <div style="font-weight: 600;">${itemName}</div>
                        </td>
                        <td style="text-align: right; font-weight: 600; vertical-align: middle;">${amt.toLocaleString('en-US')}</td>
                    `;
                }

                htmlRows += `
                    <tr class="main-item-row">
                        ${trContent}
                    </tr>
                    ${extraRowHtml}
                `;
            });
        }

        tbody.innerHTML = htmlRows;

        // 💡 ADD 1열(셀) 클릭 시 체크박스 토글되도록 이벤트 바인딩
        const addCells = document.querySelectorAll('.add-checkbox-cell');
        addCells.forEach(cell => {
            cell.addEventListener('click', function(e) {
                const checkbox = this.querySelector('.add-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    calculateAddItems(); // 체크 상태 변경 후 합계 재계산
                }
            });
        });

        // 1열 셀(칸) 클릭 시 토글 이벤트 작동 (OTC 상세 내용)
        const toggleCells = document.querySelectorAll('.otc-toggle-cell');
        toggleCells.forEach(cell => {
            cell.addEventListener('click', function() {
                const tr = this.closest('tr');
                const extraRow = tr.nextElementSibling;
                const icon = this.querySelector('.otc-toggle-icon');
                
                if (extraRow && extraRow.classList.contains('otc-extra-row')) {
                    const isHidden = extraRow.style.display === 'none';
                    extraRow.style.display = isHidden ? 'table-row' : 'none';
                    if (icon) icon.textContent = isHidden ? '▼' : '▶';
                }
            });
        });

        // 💡 모달 열 때 초기 합계 세팅 (이전에 체크된 ADD가 있으면 포함해서 계산)
        calculateAddItems();
        modal.style.display = 'flex';
    });

    // 적용 및 닫기 버튼 클릭 시
    btnApply.addEventListener('click', () => {
        const checkedBoxes = document.querySelectorAll('.add-checkbox:checked');
        
        // 닫기 직전에 현재 체크되어 있는 ADD 항목들의 ID를 전역 배열에 저장 (유지 기능)
        window.cdsCheckedItemIds = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-id'));

        // 메인 문서(quotation.html)로 넘길 데이터 수집
        let totalAddAmt = 0;
        let selectedNames = [];

        checkedBoxes.forEach(cb => {
            totalAddAmt += parseFloat(cb.getAttribute('data-amt')) || 0;
            selectedNames.push(cb.getAttribute('data-name'));
        });

        const descText = selectedNames.join(', ');
        const amtText = totalAddAmt > 0 ? totalAddAmt.toLocaleString('en-US') : '0';

        // 💡 메인 문서의 기본 CDS 금액도 합계에서 제외된 순수 CDS 비용으로 갱신
        const qDestCdsAmtEl = document.getElementById('q_destination_amount');
        if (qDestCdsAmtEl && currentBaseTotalAmount > 0) {
            qDestCdsAmtEl.textContent = currentBaseTotalAmount.toLocaleString('en-US');
            qDestCdsAmtEl.classList.add('is-typed');
        }

        // 추가 비용 항목 업데이트할 요소들
        const qDestAddEl = document.getElementById('q_destination_add');
        const qDestAddAmtEl = document.getElementById('q_destination_add_amount');
        const curAddEl = document.getElementById('cur_add');
        const addRow = document.getElementById('destination-add-row');

        if (descText && amtText !== '0') {
            if (qDestAddEl) qDestAddEl.textContent = descText;
            if (qDestAddAmtEl) {
                qDestAddAmtEl.textContent = amtText;
                qDestAddAmtEl.classList.add('is-typed');
            }
            if (curAddEl) curAddEl.textContent = currentCurrency; 
            
            if (addRow) addRow.style.display = 'table-row';
        } else {
            if (qDestAddEl) qDestAddEl.textContent = '';
            if (qDestAddAmtEl) qDestAddAmtEl.textContent = '';
            if (addRow) addRow.style.display = 'none';
        }

        closeModal();

        // sum.js 총합계 재계산 트리거
        if (typeof window.calculateAllTotals === 'function') {
            window.calculateAllTotals();
        }
    });
}