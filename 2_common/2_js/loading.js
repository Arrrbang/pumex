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
            const placeholder = document.getElementById("desktop-header-placeholder");
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
        
    // ==========================================
    // 💡 3. 모바일 헤더(Mobile Header) 로드 로직 (신규 추가!)
    // ==========================================
    const mPlaceholder = document.getElementById("mobile-header-placeholder");

    // 화면에 모바일 헤더 자리가 있을 때만 실행되도록 똑똑하게 조건 처리
    if (mPlaceholder) {
        const M_HEADER_HTML_URL = `${basePath}/3_components/1_header/mobile/header.html`;
        const M_HEADER_JS_URL = `${basePath}/3_components/1_header/mobile/header.js`;
        const M_HEADER_CSS_URL = `${basePath}/3_components/1_header/mobile/header.css`;

        // CSS 로드
        const mHeaderLink = document.createElement("link");
        mHeaderLink.rel = "stylesheet";
        mHeaderLink.href = M_HEADER_CSS_URL;
        document.head.appendChild(mHeaderLink);

        // HTML 로드 및 JS 실행
        fetch(M_HEADER_HTML_URL)
            .then(res => {
                if (!res.ok) throw new Error(`모바일 헤더 로드 실패: ${res.status}`);
                return res.text();
            })
            .then(html => {
                mPlaceholder.innerHTML = html;

                const mScript = document.createElement("script");
                mScript.src = M_HEADER_JS_URL;
                mScript.defer = true;
                document.body.appendChild(mScript);
            })
            .catch(err => console.error("모바일 헤더 로딩 중 오류 발생:", err));
    }

})();