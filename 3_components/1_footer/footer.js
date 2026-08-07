/* /pumex/3_components/1_footer/footer.js */
'use strict';

function initResponsiveFooter() {
    const footer = document.querySelector('.common-footer');
    const footerCopy = document.querySelector('.footer-copy');
    const footerInner = document.querySelector('.common-footer-inner');
    
    if (!footer || !footerCopy || !footerInner) return;

    const adjustFooter = () => {
        // 1. 초기화 (기본 스타일 복원)
        footerCopy.style.fontSize = '0.85rem';
        footer.style.height = 'auto';
        footer.style.minHeight = '50px';
        document.body.style.paddingBottom = '60px';

        // 2. 가용 너비 계산 (좌우 패딩 고려)
        const availableWidth = footerInner.clientWidth;
        
        // 3. 텍스트가 박스 너비보다 넓을 경우, 폰트를 계속 줄여서 최대한 한 줄로 맞추되
        //    너무 작아져도(예: 0.45rem 미만) 박스 너비를 넘치면 자연스럽게 줄바꿈되도록 허용
        let currentSize = 0.85;
        const minSize = 0.45; // 폴드 전면처럼 좁은 화면을 위해 한계치를 낮춤
        
        while (currentSize > minSize && footerCopy.scrollWidth > availableWidth) {
            currentSize -= 0.02; // 세밀하게 줄임
            footerCopy.style.fontSize = `${currentSize}rem`;
        }

        // 4. 폰트를 줄였음에도 줄바꿈이 일어나서 박스를 벗어나려고 할 때,
        //    푸터 박스 자체의 높이를 글자 높이에 딱 맞춰서 늘려줌 (절대 외부로 안 튀어나감!)
        setTimeout(() => {
            const textHeight = footerCopy.offsetHeight;
            const topBottomPadding = 16; // CSS 상하 패딩(8px * 2) 감안
            const requiredHeight = textHeight + topBottomPadding;

            if (requiredHeight > 50) {
                footer.style.minHeight = `${requiredHeight}px`;
                // 푸터가 늘어난만큼 body 하단 여백도 밀어주어 콘텐츠를 가리지 않게 함
                document.body.style.paddingBottom = `${requiredHeight + 15}px`;
            } else {
                footer.style.minHeight = '50px';
                document.body.style.paddingBottom = '60px';
            }
        }, 50);
    };

    // 로드 직후 실행 및 화면 크기 변경 시 재조정
    adjustFooter();
    window.addEventListener('resize', adjustFooter);
    window.addEventListener('orientationchange', () => {
        setTimeout(adjustFooter, 100);
    });
}

// 스크립트 로드 시 즉시 실행
initResponsiveFooter();