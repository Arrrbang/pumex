(function() {
    const basePath = window.location.pathname.includes('/pumex/') ? '/pumex' : '';

    const HEADER_HTML_URL = `${basePath}/3_components/1_header/header.html`;
    const HEADER_JS_URL = `${basePath}/3_components/1_header/header.js`;
    const HEADER_CSS_URL = `${basePath}/3_components/1_header/header.css`; 

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = HEADER_CSS_URL;
    document.head.appendChild(link);

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
                return;
            }

            const script = document.createElement("script");
            script.src = HEADER_JS_URL;
            script.defer = true; 
            document.body.appendChild(script);
        })
        .catch(err => console.error("공통 헤더 로딩 중 오류 발생:", err));
})();