/* load_quotation_add_row.js */
document.addEventListener('DOMContentLoaded', function () {
    // 이벤트 위임 방식: 나중에 불러오기로 렌더링된 버튼에도 동작하도록 body에 걸어줍니다.
    document.body.addEventListener('click', function(e) {
        
        // 💡 1. 행 추가 (+) 버튼 클릭 시
        if (e.target.classList.contains('add-row-btn')) {
            const costTable = e.target.closest('.quote-cost-table');
            if (!costTable) return;

            const tbody = costTable.querySelector('tbody');
            if (!tbody) return;

            const relativeCell = tbody.querySelector('.relative-cell');
            if (relativeCell) {
                const currentRows = parseInt(relativeCell.getAttribute('rowspan')) || 4;
                relativeCell.setAttribute('rowspan', currentRows + 1);
            }

            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td style="position: relative; padding-right: 40px;">
                    <div class="section-content input_highlight" contenteditable="true" spellcheck="false" data-placeholder="항목명 기재" style="min-height: 20px; outline: none;">
                        &nbsp;
                    </div>
                    <button type="button" class="remove-row-btn" title="행 삭제">-</button>
                </td>
                <td class="text-center" contenteditable="true">KRW</td>
                <td class="text-right input_highlight amount-input" contenteditable="true" spellcheck="false" style="outline: none;">0</td>
            `;

            tbody.appendChild(newRow);

            // 포커스 이동
            const firstEditable = newRow.querySelector('[contenteditable="true"]');
            if (firstEditable) firstEditable.focus();

            // 계산 트리거
            if (typeof window.calculateAllTotals === 'function') {
                setTimeout(window.calculateAllTotals, 50);
            }
        }

        // 💡 2. 행 삭제 (-) 버튼 클릭 시
        if (e.target.classList.contains('remove-row-btn')) {
            const row = e.target.closest('tr');
            const tbody = row.closest('tbody');
            if (!tbody) return;

            const relativeCell = tbody.querySelector('.relative-cell');
            if (relativeCell) {
                const currentRows = parseInt(relativeCell.getAttribute('rowspan')) || 4;
                if (currentRows > 2) {
                    relativeCell.setAttribute('rowspan', currentRows - 1);
                }
            }
            
            row.remove();
            
            // 계산 트리거
            if (typeof window.calculateAllTotals === 'function') {
                setTimeout(window.calculateAllTotals, 50);
            }
        }
    });
});