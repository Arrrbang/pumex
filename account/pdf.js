function saveAsPDF() {
    // 1. 캡처 대상 및 숨길 요소 선택
    const element = document.getElementById('result-area');
    const btnPanel = document.getElementById('control-panel');
    const mainLayout = document.querySelector('.main-layout'); 
    const headerPlaceholder = document.getElementById('header-placeholder');
    
    // N열 링크들 선택 (.clickable 클래스)
    const links = document.querySelectorAll('.clickable');
    
    // N열 셀들 선택 (줄바꿈 처리용)
    const nameCells = document.querySelectorAll('.col-name');

    // [신규] 메인 테이블 헤더 선택 (너비 조절용)
    const tableHeaders = document.querySelectorAll('#main-table thead th');

    // 2. [스타일 변경] PDF용으로 잠시 스타일 바꾸기
    // (1) 레이아웃 간섭 요소 숨기기
    if (btnPanel) btnPanel.style.display = 'none';
    if (mainLayout) mainLayout.style.display = 'none';
    if (headerPlaceholder) headerPlaceholder.style.display = 'none';
    
    // (2) 결과 영역만 보이게 설정
    if (element) element.style.display = 'block';

    // (3) 파란색 링크를 검은색 일반 텍스트처럼 변경
    links.forEach(link => {
        link.dataset.originalColor = link.style.color; 
        link.dataset.originalDeco = link.style.textDecoration; 
        
        link.style.color = '#000000'; 
        link.style.textDecoration = 'none'; 
    });

    // (4) N열(업체명) 조건부 줄바꿈
    nameCells.forEach(cell => {
        cell.dataset.originalFontSize = cell.style.fontSize;
        cell.dataset.originalHtml = cell.innerHTML; 
        
        cell.style.fontSize = '11px'; 
        cell.style.whiteSpace = 'nowrap'; 
        
        const isOverflow = cell.scrollWidth > cell.clientWidth;

        cell.style.whiteSpace = 'normal';       
        cell.style.wordBreak = 'keep-all';      
        cell.style.overflowWrap = 'break-word'; 
        cell.style.lineHeight = '1.3';          

        if (isOverflow) {
            let text = cell.innerHTML;
            text = text.replace(/\s*([&(\[])/g, '<br>$1'); 
            cell.innerHTML = text;
        }
    });

    // (5) [신규] PDF 전용 열 너비 적용
    // 순서대로: NO, Code, 업체명, 건수, CUR, CREDIT, DEBIT, BALANCE
    // 빈 문자열("")로 두면 자동 너비(기본값) 유지
    const pdfColWidths = [
        "25px",  // NO
        "55px",  // Code
        "",      // 업체명 (나머지 공간 차지)
        "35px",  // 건수
        "35px",  // CUR
        "80px",  // CREDIT
        "80px",  // DEBIT
        "80px"   // BALANCE
    ];

    tableHeaders.forEach((th, index) => {
        // 원래 너비 백업
        th.dataset.originalWidth = th.style.width;

        // PDF용 너비가 설정되어 있다면 적용
        if (pdfColWidths[index]) {
            th.style.width = pdfColWidths[index];
        }
    });

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

        // N열 복구
        nameCells.forEach(cell => {
            cell.style.whiteSpace = ''; 
            cell.style.wordBreak = '';
            cell.style.overflowWrap = '';
            cell.style.lineHeight = '';
            cell.style.fontSize = ''; 
            
            if (cell.dataset.originalHtml) {
                cell.innerHTML = cell.dataset.originalHtml;
            }
        });

        // [신규] 테이블 헤더 너비 복구
        tableHeaders.forEach(th => {
            th.style.width = th.dataset.originalWidth || "";
        });

        // 화면 폰트 조절 재실행
        if (typeof adjustFontSizeToFit === 'function') {
            adjustFontSizeToFit();
        }
    }
}
