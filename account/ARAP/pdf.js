function saveAsPDF() {
    // 1. 캡처 대상 및 숨길 요소 선택
    const element = document.getElementById('result-area');
    const btnPanel = document.getElementById('control-panel');
    const mainLayout = document.querySelector('.main-layout'); 
    const headerPlaceholder = document.getElementById('header-placeholder');
    
    // 요소 선택
    const links = document.querySelectorAll('.clickable');
    const nameCells = document.querySelectorAll('.col-name');
    const tableHeaders = document.querySelectorAll('#main-table thead th');
    const remarkInputs = document.querySelectorAll('.remark-input');
    
    // Code 열 선택
    const codeCells = document.querySelectorAll('.col-code');

    // 모든 테이블 셀 선택
    const allTableCells = document.querySelectorAll('#main-table th, #main-table td');
    const mainTable = document.getElementById('main-table'); 

    // 2. [스타일 변경] PDF용으로 잠시 스타일 바꾸기
    if (btnPanel) btnPanel.style.display = 'none';
    if (mainLayout) mainLayout.style.display = 'none';
    if (headerPlaceholder) headerPlaceholder.style.display = 'none';
    
    if (element) element.style.display = 'block';

    // (3) 링크 색상 변경
    links.forEach(link => {
        link.dataset.originalColor = link.style.color; 
        link.dataset.originalDeco = link.style.textDecoration; 
        link.style.color = '#000000'; 
        link.style.textDecoration = 'none'; 
    });

    // (4) Code 열 숨기기
    codeCells.forEach(cell => {
        cell.style.display = 'none';
    });

    // (5) [수정] 표 내부 여백 및 정렬 재조정
    allTableCells.forEach(cell => {
        cell.dataset.originalPadding = cell.style.padding;
        cell.dataset.originalFontSize = cell.style.fontSize;
        cell.dataset.originalVerticalAlign = cell.style.verticalAlign;
        cell.dataset.originalLineHeight = cell.style.lineHeight;

        // [핵심] 위아래 패딩 동일하게, 수직 중앙 정렬, 줄간격 타이트하게
        cell.style.padding = '3px 0';  // 위아래 3px, 좌우 0
        cell.style.margin = '0';
        cell.style.lineHeight = '1.0';
        cell.style.fontSize = '10px'; 
        cell.style.verticalAlign = 'middle'; // 수직 중앙 정렬 강제
        cell.style.lineHeight = '1.1';       // 줄간격 최소화 (여백 쏠림 방지)
    });

    // (6) N열(업체명) 줄바꿈 처리
    nameCells.forEach(cell => {
        cell.dataset.originalHtml = cell.innerHTML; 
        
        cell.style.whiteSpace = 'nowrap'; 
        const isOverflow = cell.scrollWidth > cell.clientWidth;

        cell.style.whiteSpace = 'normal';       
        cell.style.wordBreak = 'keep-all';      
        cell.style.overflowWrap = 'break-word'; 
        cell.style.lineHeight = '1.2';          

        if (isOverflow) {
            let text = cell.innerHTML;
            text = text.replace(/\s*([&(\[])/g, '<br>$1'); 
            cell.innerHTML = text;
        }
    });

    // (7) 비고란(input) -> 텍스트(span) 변환
    remarkInputs.forEach(input => {
        const span = document.createElement('span');
        span.innerText = input.value;
        span.style.fontSize = '9px'; 
        
        input.style.display = 'none';
        input.parentNode.appendChild(span);
    });


    // (8) PDF 전용 열 너비 적용
    // Code 열은 0으로 하고, 업체명은 비워둬야 아래 (9)번에서 남은 공간을 차지함
    const pdfColWidths = [
        "25px",   // NO
        "0px",    // Code (숨김)
        "255px",       // 업체명 
        "30px",   // 건수
        "30px",   // CUR
        "65px",   // CREDIT
        "65px",   // DEBIT
        "70px",   // BALANCE
        "150px"   // 비고
    ];

    tableHeaders.forEach((th, index) => {
        th.dataset.originalWidth = th.style.width;
        if (pdfColWidths[index]) {
            th.style.width = pdfColWidths[index];
        }
    });

    // (9) [수정] 테이블 전체 너비 안전값으로 고정 (750px)
    // 790px는 여백 포함 시 A4 너비를 초과하여 잘릴 수 있음. 750px로 줄여서 안전하게 표시.
    mainTable.dataset.originalTableWidth = mainTable.style.width;
    mainTable.style.width = '750px'; 

    // 3. PDF 옵션 설정
    const opt = {
        margin:       [10, 0, 10, 0], 
        filename:     'Summary_Report.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            scrollY: 0 
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // 4. PDF 생성 및 저장 후 복구
    html2pdf().set(opt).from(element).save()
        .then(() => {
            restoreOriginalStyles(); 
        })
        .catch((err) => {
            console.error("PDF 생성 에러:", err);
            restoreOriginalStyles(); 
        });

    // [복구 함수]
    function restoreOriginalStyles() {
        if (btnPanel) btnPanel.style.display = 'flex'; 
        if (mainLayout) mainLayout.style.display = 'flex'; 
        if (headerPlaceholder) headerPlaceholder.style.display = 'block';

        links.forEach(link => {
            link.style.color = link.dataset.originalColor || ''; 
            link.style.textDecoration = link.dataset.originalDeco || '';
        });

        codeCells.forEach(cell => {
            cell.style.display = ''; 
        });

        allTableCells.forEach(cell => {
            cell.style.padding = cell.dataset.originalPadding || '';
            cell.style.fontSize = cell.dataset.originalFontSize || '';
            cell.style.verticalAlign = cell.dataset.originalVerticalAlign || '';
            cell.style.lineHeight = cell.dataset.originalLineHeight || '';
        });

        nameCells.forEach(cell => {
            cell.style.whiteSpace = ''; 
            cell.style.wordBreak = '';
            cell.style.overflowWrap = '';
            cell.style.lineHeight = '';
            
            if (cell.dataset.originalHtml) {
                cell.innerHTML = cell.dataset.originalHtml;
            }
        });

        const remarkCells = document.querySelectorAll('.col-remark');
        remarkCells.forEach(td => {
            const span = td.querySelector('span');
            const input = td.querySelector('input');
            if (span) span.remove();
            if (input) input.style.display = '';
        });

        tableHeaders.forEach(th => {
            th.style.width = th.dataset.originalWidth || "";
        });

        // 테이블 너비 복구
        if (mainTable.dataset.originalTableWidth) {
            mainTable.style.width = mainTable.dataset.originalTableWidth;
        } else {
            mainTable.style.width = '100%'; 
        }

        if (typeof adjustFontSizeToFit === 'function') {
            adjustFontSizeToFit();
        }
    }
}
