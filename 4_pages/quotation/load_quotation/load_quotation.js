/* load_quotation.js */
'use strict';

document.addEventListener('DOMContentLoaded', function () {
    const savedData = sessionStorage.getItem('finalQuotationData');

    if (!savedData) {
        console.warn('불러올 견적 데이터가 없습니다.');
        return;
    }

    try {
        const quotationData = JSON.parse(savedData);
        console.log('[Loaded Quotation Data (Viewer Mode)]', quotationData);

        function adjustFontSizeToFit(element) {
            element.style.whiteSpace = 'nowrap';
            element.style.wordBreak = 'keep-all';
            const parentWidth = element.parentElement.clientWidth;
            let fontSize = 14.4;
            element.style.fontSize = fontSize + 'px';
            while (element.scrollWidth > parentWidth && fontSize > 8) {
                fontSize -= 0.5;
                element.style.fontSize = fontSize + 'px';
            }
        }

        // 1. 기본 항목 텍스트 복원
        Object.entries(quotationData).forEach(function ([id, value]) {
            if (id === 'dynamicRows' || id.startsWith('_')) return; 

            const target = document.getElementById(id);
            if (!target) return; 

            let textValue = String(value || '').trim();

            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                target.value = textValue;
            } else {
                if (textValue.includes('! 출발항')) {
                    textValue = textValue.split('!')[0].trim();
                }

                if (id.startsWith('cur_')) {
                    target.textContent = textValue;
                } else if (id === 'q_origin_add' && !textValue) {
                    target.textContent = '클릭하여 출발지 검색';
                } else {
                    target.innerHTML = textValue || '-';
                    if (target.classList.contains('input_highlight')) {
                        target.classList.add('is-typed');
                    }
                }
            }

            if (id === 'q_mode_type') {
                setTimeout(() => { adjustFontSizeToFit(target); }, 0);
            }
        });

        // 💡 2. 동적 추가 행(add_row) 복원 시 '삭제 버튼' 포함
        if (quotationData.dynamicRows && quotationData.dynamicRows.length > 0) {
            const tables = document.querySelectorAll('.quote-cost-table');

            quotationData.dynamicRows.forEach(rowData => {
                const table = tables[rowData.tableIndex];
                if (!table) return;

                const tbody = table.querySelector('tbody');
                if (!tbody) return;

                const relativeCell = tbody.querySelector('.relative-cell');
                if (relativeCell) {
                    const currentRows = parseInt(relativeCell.getAttribute('rowspan')) || 4;
                    relativeCell.setAttribute('rowspan', currentRows + 1);
                }

                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td style="position: relative; padding-right: 40px;">
                        <div class="section-content input_highlight is-typed" style="min-height: 20px; outline: none;" contenteditable="true">
                            ${rowData.desc}
                        </div>
                        <button type="button" class="remove-row-btn" title="행 삭제">-</button>
                    </td>
                    <td class="text-center" contenteditable="true">${rowData.cur}</td>
                    <td class="text-right input_highlight is-typed amount-input" style="outline: none;" contenteditable="true">
                        ${rowData.amt}
                    </td>
                `;
                tbody.appendChild(newRow);
            });
        }

        // 3. 추가 비용 숨김 처리
        const addAmountVal = quotationData.q_destination_add_amount ? quotationData.q_destination_add_amount.replace(/,/g, '').trim() : '';
        const addRow = document.getElementById('destination-add-row');

        if (addRow) {
            if (!addAmountVal || addAmountVal === '0' || addAmountVal === '0.00') {
                addRow.style.display = 'none';
            }
        }

        // 4. 숫자 콤마 실시간 변환 이벤트
        document.addEventListener('input', function (e) {
            const target = e.target;
            if (target.classList && target.classList.contains('text-right') && target.getAttribute('contenteditable') === 'true') {
                target.classList.add('is-typed');
                let text = target.textContent.replace(/[^0-9]/g, '');
                if (text === '') { target.textContent = ''; return; }
                target.textContent = Number(text).toLocaleString('en-US');
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(target);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });

        // 💡 5. 데이터 복원 후 최초 1회 합계 계산 실행
        setTimeout(() => {
            if (typeof window.calculateAllTotals === 'function') {
                window.calculateAllTotals();
            }
        }, 300);

    } catch (error) {
        console.error('견적 데이터를 불러오는 중 오류가 발생했습니다.', error);
    }
});