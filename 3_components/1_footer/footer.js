function initResponsiveFooter() {
    const footer = document.querySelector('.common-footer');
    const footerCopy = document.querySelector('.footer-copy');
    const footerInner = document.querySelector('.common-footer-inner');
    
    if (!footer || !footerCopy || !footerInner) return;

    const adjustFooter = () => {
        // 1. 초기화 (기본 스타일 복원)
        footerCopy.style.fontSize = '0.85rem';
        footer.style.height = '';
        footer.style.minHeight = '50px';

        // 2. 가용 너비 계산 (좌우 패딩 고려)
        const availableWidth = footerInner.clientWidth;
        const textWidth = footerCopy.scrollWidth;

        // 3. 텍스트가 박스 너비보다 넘칠 경우 폰트 줄이기 시도 (최소 0.65rem까지)
        if (textWidth > availableWidth) {
            let currentSize = 0.85;
            const minSize = 0.65; // 내가 지정한 마감 한계 폰트 사이즈 (rem)
            
            while (currentSize > minSize && footerCopy.scrollWidth > footerInner.clientWidth) {
                currentSize -= 0.05;
                footerCopy.style.fontSize = `${currentSize}rem`;
            }
        }

        // 4. 그래도 여전히 넘친다면 (최소 폰트까지 줄였는데도 2줄 이상으로 꺾이는 경우) 박스 높이 자동 확장
        // scrollHeight나 줄 바꿈 여부를 감지하여 높이 강제 확장
        setTimeout(() => {
            if (footerCopy.offsetHeight > 30) { // 한 줄 높이를 초과하는 경우 (2줄 이상 래핑 감지)
                footer.style.height = 'auto';
                footer.style.minHeight = '70px'; // 2줄일 때의 넉넉한 높이
                
                // body 패딩도 푸터 높이에 맞춰 동적 조절
                document.body.style.paddingBottom = (footer.offsetHeight + 15) + 'px';
            } else {
                footer.style.height = '50px';
                document.body.style.paddingBottom = '60px';
            }
        }, 50);
    };

    // 로드 직후 실행 및 화면 크기 변경(리사이즈, 모바일 가로/세로 전환) 시 재조정
    adjustFooter();
    window.addEventListener('resize', adjustFooter);
}