(function() {
    const basePath = window.location.pathname.includes('/pumex/') ? '/pumex' : '';

    // ==========================================
    // 1. 헤더(Header) 로드 로직
    // ==========================================
    const HEADER_HTML_URL = `${basePath}/3_components/1_header/header.html`;
    const HEADER_JS_URL = `${basePath}/3_components/1_header/header.js`;
    const HEADER_CSS_URL = `${basePath}/3_components/1_header/header.css`; 

    const headerLink = document.createElement("link");
    headerLink.rel = "stylesheet";
    headerLink.href = HEADER_CSS_URL;
    document.head.appendChild(headerLink);

    fetch(HEADER_HTML_URL)
        .then(res => {
            if (!res.ok) throw new Error(`헤더 로드 실패: ${res.status}`);
            return res.text();
        })
        .then(html => {
            const placeholder = document.getElementById("header-placeholder");
            if (placeholder) {
                placeholder.innerHTML = html;
            } else {
                console.warn("#header-placeholder 요소를 찾을 수 없습니다.");
            }

            const script = document.createElement("script");
            script.src = HEADER_JS_URL;
            script.defer = true; 
            document.body.appendChild(script);
        })
        .catch(err => console.error("공통 헤더 로딩 중 오류 발생:", err));

    // ==========================================
    // 2. 푸터(Footer) 로드 로직
    // ==========================================
    const FOOTER_HTML_URL = `${basePath}/3_components/1_footer/footer.html`;
    const FOOTER_CSS_URL = `${basePath}/3_components/1_footer/footer.css`;

    // 푸터 CSS 삽입
    const footerLink = document.createElement("link");
    footerLink.rel = "stylesheet";
    footerLink.href = FOOTER_CSS_URL;
    document.head.appendChild(footerLink);

    // 푸터 HTML을 가져와서 body 맨 끝에 자동 삽입
    fetch(FOOTER_HTML_URL)
        .then(res => {
            if (!res.ok) throw new Error(`푸터 로드 실패: ${res.status}`);
            return res.text();
        })
        .then(html => {
            // HTML 문서들을 열어서 placeholder를 적을 필요 없이, JS가 알아서 맨 밑에 끼워 넣습니다!
            document.body.insertAdjacentHTML('beforeend', html);
        })
        .catch(err => console.error("공통 푸터 로딩 중 오류 발생:", err));

})();