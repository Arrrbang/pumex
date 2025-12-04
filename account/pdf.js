// pdf.js

function saveAsPDF() {
    // 1. 캡처 대상 및 숨길 요소 선택
    const element = document.getElementById('result-area');
    const btnPanel = document.getElementById('control-panel');
    const mainLayout = document.querySelector('.main-layout'); 
    const headerPlaceholder = document.getElementById('header-placeholder');
    
    // N열 링크들 선택 (.clickable 클래스)
    const links = document.querySelectorAll('.clickable');

    // 2. [스타일 변경] PDF용으로 잠시 스타일 바꾸기
    // (1) 레이아웃 간섭 요소 숨기기
    if (btnPanel) btnPanel.style.display = 'none';
    if (mainLayout) mainLayout.style.display = 'none';
    if (headerPlaceholder) headerPlaceholder.style.display = 'none';
    
    // (2) 결과 영역만 보이게 설정
    if (element) element.style.display = 'block';

    // (3) 파란색 링크를 검은색 일반 텍스트처럼 변경
    links.forEach(link => {
        link.style.color = '#000000'; // 검은색
        link.style.textDecoration = 'none'; // 밑줄 제거
    });

    // 3. PDF 옵션 설정
    const opt = {
        margin:       10, 
        filename:     'Summary_Report.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            scrollY: 0 // 스크롤 위치 초기화 (백지 방지)
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // 4. PDF 생성 및 저장 후 복구
    html2pdf().set(opt).from(element).save()
        .then(() => {
            restoreOriginalStyles(); // 성공 시 복구
        })
        .catch((err) => {
            console.error("PDF 생성 에러:", err);
            restoreOriginalStyles(); // 에러 나도 복구
        });

    // [복구 함수] 원래 화면 상태로 되돌리기
    function restoreOriginalStyles() {
        // 레이아웃 복구
        if (btnPanel) btnPanel.style.display = 'block';
        if (mainLayout) mainLayout.style.display = 'flex'; // 원래 flex 레이아웃
        if (headerPlaceholder) headerPlaceholder.style.display = 'block';

        // 링크 스타일 복구 (CSS 스타일로 돌아감)
        links.forEach(link => {
            link.style.color = ''; 
            link.style.textDecoration = '';
        });
    }
}
