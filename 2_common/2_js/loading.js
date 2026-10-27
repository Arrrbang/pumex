// loading.js 전체 교체
(function() {
    const basePath = window.location.pathname.includes('/pumex/') ? '/pumex' : '';
    // 전 페이지에서 공통 직원정보 모듈 하나를 공유합니다. 인증 서버를 변경하지 않습니다.
    if (!window.PumexUserReady) {
        window.PumexUserReady = window.PumexUser ? Promise.resolve(window.PumexUser) : new Promise((resolve,reject) => {
            const userScript=document.createElement('script');
            userScript.src=`${basePath}/2_common/2_js/user_info.js`;
            userScript.onload=()=>resolve(window.PumexUser);
            userScript.onerror=()=>reject(new Error('공통 사용자 모듈을 불러오지 못했습니다.'));
            document.head.appendChild(userScript);
        });
        window.PumexUserReady.catch(()=>{});
    }


    // ==========================================
    // 1. 데스크탑 헤더(Header) 로드 로직
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
            if (!res.ok) throw new Error(`데스크탑 헤더 로드 실패: ${res.status}`);
            return res.text();
        })
        .then(html => {
            const placeholder = document.getElementById("header-placeholder") || document.getElementById("desktop-header-placeholder") || document.getElementById("mobile-header-placeholder");
            if(placeholder) placeholder.style.setProperty('display','block','important');
            ['desktop-header-placeholder','mobile-header-placeholder'].forEach(id=>{const other=document.getElementById(id);if(other&&other!==placeholder){other.innerHTML='';other.style.setProperty('display','none','important');}});
            if (placeholder) {
                placeholder.innerHTML = html;
            } else {
                console.warn("#desktop-header-placeholder 요소를 찾을 수 없습니다.");
            }

            const script = document.createElement("script");
            script.src = HEADER_JS_URL;
            script.defer = true; 
            document.body.appendChild(script);
        })
        .catch(err => console.error("데스크탑 헤더 로딩 중 오류 발생:", err));


    // ==========================================
    // 2. 푸터(Footer) 로드 로직
    // ==========================================
    const FOOTER_HTML_URL = `${basePath}/3_components/1_footer/footer.html`;
    const FOOTER_CSS_URL = `${basePath}/3_components/1_footer/footer.css`;
    const FOOTER_JS_URL = `${basePath}/3_components/1_footer/footer.js`; // 💡 푸터 JS 경로 추가

    const footerLink = document.createElement("link");
    footerLink.rel = "stylesheet";
    footerLink.href = FOOTER_CSS_URL;
    document.head.appendChild(footerLink);

    fetch(FOOTER_HTML_URL)
        .then(res => {
            if (!res.ok) throw new Error(`푸터 로드 실패: ${res.status}`);
            return res.text();
        })
        .then(html => {
            document.body.insertAdjacentHTML('beforeend', html);

            // 💡 푸터 JS를 동적으로 로드하고 실행
            const footerScript = document.createElement("script");
            footerScript.src = FOOTER_JS_URL;
            footerScript.defer = true;
            document.body.appendChild(footerScript);
        })
        .catch(err => console.error("공통 푸터 로딩 중 오류 발생:", err));
        

})();
