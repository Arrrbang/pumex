document.addEventListener('DOMContentLoaded', function () {
    const addButtons = document.querySelectorAll('.add-row-btn');

    addButtons.forEach(button => {
        button.addEventListener('click', function () {
            const costTable = this.closest('.quote-cost-table');
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
                    <div class="section-content input_highlight" contenteditable="true" spellcheck="false" data-placeholder="클릭하여 항목명 기재" style="min-height: 20px; outline: none;">
                        &nbsp;
                    </div>
                    <button type="button" class="remove-row-btn" title="행 삭제">-</button>
                </td>
                <td class="text-center">KRW</td>
                <td class="text-right input_highlight amount-input" contenteditable="true" spellcheck="false" style="outline: none;">
                    0
                </td>
            `;

            tbody.appendChild(newRow);

            // 💡 AMOUNT 입력 칸 전용 천 단위 쉼표 자동 포맷팅 로직
            const amountCell = newRow.querySelector('.amount-input');
            if (amountCell) {
                amountCell.addEventListener('input', function () {
                    // 1. 스타일 전환을 위한 is-typed 클래스 추가
                    this.classList.add('is-typed');

                    // 2. 숫자 외의 문자 제거 후 천 단위 쉼표 포맷팅
                    let value = this.textContent.replace(/[^0-9]/g, '');
                    if (value === '') {
                        this.textContent = '';
                        return;
                    }
                    let formattedValue = Number(value).toLocaleString('en-US');
                    this.textContent = formattedValue;

                    // 3. 커서가 텍스트 맨 뒤로 풀리는 현상을 막기 위해 커서를 끝으로 이동
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(this);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                });
            }

            // 일반 입력 칸들(항목명 등)에 대한 스타일 전환 이벤트 처리
            const inputHighlights = newRow.querySelectorAll('.input_highlight:not(.amount-input)');
            inputHighlights.forEach(function (element) {
                element.addEventListener('input', function () {
                    this.classList.add('is-typed');
                }, { once: true });
            });

            const firstEditable = newRow.querySelector('[contenteditable="true"]');
            if (firstEditable) {
                firstEditable.focus();
            }

            const removeBtn = newRow.querySelector('.remove-row-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', function () {
                    if (relativeCell) {
                        const currentRows = parseInt(relativeCell.getAttribute('rowspan')) || 4;
                        if (currentRows > 2) {
                            relativeCell.setAttribute('rowspan', currentRows - 1);
                        }
                    }
                    newRow.remove();
                });
            }
        });
    });
});