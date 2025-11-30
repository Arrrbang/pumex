(function() {
    const HEADER_HTML_URL = "https://arrrbang.github.io/pumex/common/header/header.html";
    const HEADER_JS_URL = "https://arrrbang.github.io/pumex/common/header/header.js";

    fetch(HEADER_HTML_URL)
        .then(res => {
            if (!res.ok) throw new Error(`헤더 로드 실패: ${res.status}`);
            return res.text();
        })
        .then(html => {
            // 1. 헤더 HTML 삽입
            const placeholder = document.getElementById("header-placeholder");
            if (placeholder) {
                placeholder.innerHTML = html;
            } else {
                console.warn("#header-placeholder 요소를 찾을 수 없습니다.");
                return;
            }

            // 2. HTML 삽입 후 header.js 동적 로드
            // (HTML이 존재해야 header.js 내부의 로직이 요소를 찾을 수 있음)
            const script = document.createElement("script");
            script.src = HEADER_JS_URL;
            script.defer = true; // HTML 파싱 후 실행 보장
            document.body.appendChild(script);
        })
        .catch(err => console.error("공통 헤더 로딩 중 오류 발생:", err));
})();
