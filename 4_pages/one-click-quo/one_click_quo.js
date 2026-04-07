/* ==========================================================================
   one-click-quo/one_click_quo.js
   분류 드롭다운 적용 및 요약 테이블 자동 합산 로직
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const rawData = sessionStorage.getItem('oneClickQuoteData');
    if (!rawData) {
        alert("견적 데이터가 없습니다. 메인 화면으로 이동합니다.");
        window.location.href = '/pumex/4_pages/destinationcost/1_search/index.html'; 
        return;
    }

    const data = JSON.parse(rawData);

    // 1. 기본 정보 채우기
    document.getElementById('q_partner').textContent = data.partner || '-';
    document.getElementById('q_location').textContent = data.location || '-';
    let cargoStr = data.cargo || '-';
    cargoStr = cargoStr.replace(/cbm\s*cbm/ig, 'CBM'); 
    document.getElementById('q_cargo').textContent = cargoStr;

    // 2. 표 복구 (✨ 수정된 부분: 타겟을 정확하게 q_dest_wrap으로 잡음)
    const destWrap = document.getElementById('q_dest_wrap');
    if (!destWrap || !data.tableHtml) {
        console.error("표를 넣을 공간을 찾지 못했거나 데이터가 없습니다.");
        return;
    }

    // 통째로 HTML 꽂아넣기
    destWrap.innerHTML = data.tableHtml;

    const tbody = destWrap.querySelector('tbody');
    const initialTotalText = data.destTotal || '0';

    if (tbody) {
        // 통화 감지
        const prefixMatch = initialTotalText.match(/^[^\d\-]+/);
        const suffixMatch = initialTotalText.match(/[^\d]+$/);
        const currencyPrefix = prefixMatch ? prefixMatch[0] : '';
        const currencySuffix = suffixMatch ? suffixMatch[0] : '';
        function formatCurrency(val) {
            return currencyPrefix + val.toLocaleString('en-US') + currencySuffix;
        }

        // 🌟 [기능 1] 상세 리스트 초기 세팅 (드롭다운/체크박스)
        tbody.querySelectorAll('.extra-check').forEach(cb => {
            cb.checked = false;
        });

        tbody.querySelectorAll('tr').forEach(row => {
            const firstTd = row.querySelector('td.sel');
            if (!firstTd) return;

            if (row.classList.contains('row-other')) {
                // '기타 비용' 행: 1열을 체크박스로 변경하되 checked 속성 제거! (기본값: 미체크)
                firstTd.innerHTML = `<label class="sel-check"><input type="checkbox" class="other-check"></label>`;
            } else {
                // 일반/추가 행: 드롭다운 생성
                const isBasic = row.classList.contains('row-basic');
                // 기존에 체크박스가 있던 행인지 확인용
                const hadCheck = row.querySelector('.extra-check') !== null;
                
                const dropdownHtml = `
                    <select class="type-select">
                        <option value="CDS" ${isBasic ? 'selected' : ''}>CDS</option>
                        <option value="ADD" ${(!isBasic && hadCheck) ? 'selected' : ''}>ADD</option>
                        <option value="OTC">OTC</option>
                        <option value="TAX">TAX</option>
                    </select>
                `;
                firstTd.innerHTML = dropdownHtml;
            }
        });

        // 🌟 [기능 2] 요약 표 자동 합산 및 리스트업 함수
        function updateSummary() {
            let sums = { CDS: 0, ADD: 0, TAX: 0, OTC: 0 };
            let otherTitles = [];

            tbody.querySelectorAll('tr').forEach(row => {
                const amtTd = row.querySelector('td.amt');
                const val = Number(amtTd?.dataset.convertedAmt || amtTd?.dataset.baseAmt || amtTd?.dataset.raw || 0);

                if (row.classList.contains('row-other')) {
                    // 기타 비용 항목
                    const isChecked = row.querySelector('.other-check')?.checked;
                    if (isChecked) {
                        let title = '상세 정보';
                        const spans = row.querySelectorAll('.item-title span');
                        spans.forEach(s => { if (!s.classList.contains('toggle-icon')) title = s.textContent.trim(); });
                        otherTitles.push(title);
                    }
                } else {
                    // 분류 항목
                    const type = row.querySelector('.type-select')?.value;
                    const isChecked = row.querySelector('.extra-check') ? row.querySelector('.extra-check').checked : true;
                    
                    if (isChecked && type && sums[type] !== undefined) {
                        sums[type] += val;
                    }
                }
            });

            // 요약 표 금액 업데이트
            document.getElementById('sum_cds').textContent = formatCurrency(sums.CDS);
            document.getElementById('sum_add').textContent = formatCurrency(sums.ADD);
            document.getElementById('sum_tax').textContent = formatCurrency(sums.TAX);
            
            // 🌟 Others Charges 리스트 업데이트
            const otcListEl = document.getElementById('otc_list');
            const otcDivider = document.getElementById('otc_divider');
            
            if (otherTitles.length > 0) {
                otcDivider.style.display = 'block';
                // 단순 점(•) 글자가 아니라, CSS 디자인이 적용된 상자 형태로 출력!
                otcListEl.innerHTML = otherTitles.map(t => `<div class="otc-item">${t}</div>`).join('');
            } else {
                otcDivider.style.display = 'none';
                otcListEl.innerHTML = '';
            }

            // 🌟 도착지 비용 소계 계산 (CDS + ADD + TAX)
            const subTotal = sums.CDS + sums.ADD + sums.TAX;
            document.getElementById('q_summary_subtotal').textContent = formatCurrency(subTotal);
        }

        // 이벤트 바인딩
        tbody.addEventListener('change', (e) => {
            if (e.target.classList.contains('type-select') || e.target.classList.contains('other-check') || e.target.classList.contains('extra-check')) {
                updateSummary();
            }
        });

        // 초기 실행
        updateSummary();

        // 토글 동작
        const btnToggle = document.getElementById('btnListToggle');
        const contentToggle = document.getElementById('toggleContentList');
        const iconToggle = document.getElementById('toggleIconList');
        btnToggle.addEventListener('click', () => {
            const isHidden = contentToggle.style.display === 'none';
            contentToggle.style.display = isHidden ? 'block' : 'none';
            iconToggle.textContent = isHidden ? '▲' : '▼';
        });
        contentToggle.style.display = 'none'; // 기본 숨김

        // 비고란 아코디언 살리기
        tbody.addEventListener('click', function(e) {
            const cell = e.target.closest('.item-cell.has-extra');
            if (!cell || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
            const extraDiv = cell.querySelector('.item-extra');
            const icon = cell.querySelector('.toggle-icon');
            if (extraDiv && icon) {
                const isHidden = extraDiv.style.display === 'none' || extraDiv.style.display === '';
                extraDiv.style.display = isHidden ? 'block' : 'none';
                icon.textContent = isHidden ? '▼' : '▶';
            }
        });
    }

    document.addEventListener('updateQuoteTotal', () => {
        if (typeof updateSummary === 'function') {
            updateSummary();
        }
    });

    const btnFooterBack = document.getElementById('btnFooterBack');
    if (btnFooterBack) {
        // 버튼 이름도 직관적으로 변경 (HTML을 바꾸셔도 됩니다)
        btnFooterBack.textContent = '창 닫기 (조회 화면으로)'; 
        btnFooterBack.addEventListener('click', () => {
            // ✨ [수정] 복잡한 이동 대신, 쿨하게 견적서 창을 닫아버림!
            window.close(); 
        });
    }
});

