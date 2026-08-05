/* /pumex/3_components/1_header/mobile/header.js */
'use strict';

// 💡 화면 로드를 기다리지 않고, 스크립트가 삽입되자마자 즉시 함수 실행!
initMobileSidebar();
setActiveMobileMenu();
initMobileUser();

// 1. 사이드바 열기/닫기 & 아코디언 메뉴 로직
function initMobileSidebar() {
    const btnOpen = document.getElementById('m-menu-open');
    const btnClose = document.getElementById('m-menu-close');
    const sidebar = document.getElementById('m-sidebar');
    const overlay = document.getElementById('m-overlay');
    
    // 사이드바 토글 함수
    const toggleSidebar = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
        if(sidebar.classList.contains('open')) {
            document.body.style.overflow = 'hidden'; // 스크롤 방지
        } else {
            document.body.style.overflow = ''; 
        }
    };

    if(btnOpen) btnOpen.addEventListener('click', toggleSidebar);
    if(btnClose) btnClose.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);

    // 아코디언 서브메뉴 로직
    const subMenus = document.querySelectorAll('.has-sub .m-nav-link');
    subMenus.forEach(menu => {
        menu.addEventListener('click', function(e) {
            e.preventDefault();
            const parentLi = this.parentElement;
            
            // 다른 열려있는 메뉴 닫기 (선택 사항)
            document.querySelectorAll('.has-sub.open').forEach(opened => {
                if(opened !== parentLi) opened.classList.remove('open');
            });

            parentLi.classList.toggle('open');
        });
    });
}

// 2. 현재 페이지 메뉴 활성화 표시
function setActiveMobileMenu() {
    const currentPath = window.location.pathname; 
    const menus = [
        { id: "menu-destination", path: "/destinationcost" },
        { id: "menu-sos", path: "/sos" },
        { id: "menu-provincial_packing_fee", path: "/ExternalPackagingCosts" },
        { id: "menu-origin", path: "추후입력" }, 
        { id: "menu-operation", path: "/bookingmail" }, 
        { id: "menu-supporting-documents", path: "/review-of-destination-proof" },
        { id: "menu-account", path: "/account" }
    ];

    menus.forEach(m => {
        const el = document.getElementById(m.id);
        if (el && m.path !== "추후입력" && currentPath.includes(m.path)) {
            el.classList.add("active");
            // 만약 서브메뉴 안에 있다면 부모 아코디언도 열어두기
            if(el.classList.contains('has-sub')) {
                el.classList.add("open");
            }
        }
    });
}

// 4. 모바일 사용자 정보 및 로그아웃
function initMobileUser() {
    const displayUserId = document.getElementById('m-displayUserId');
    const btnLogout = document.getElementById('m-btnLogout');
    const userInfoWrap = document.getElementById('m-userInfoWrap');

    const storedUser = localStorage.getItem('username') || localStorage.getItem('userId'); 
    const token = localStorage.getItem('token');

    if (token && storedUser) {
        if(userInfoWrap) userInfoWrap.style.display = 'flex';
        if(displayUserId) displayUserId.innerText = `@${storedUser} 님`;
    } else {
        if(userInfoWrap) userInfoWrap.style.display = 'none';
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('userId');
            alert('로그아웃 되었습니다.');
            window.location.href = '/pumex/index.html';
        });
    }

    // 상단바 사람 아이콘 클릭 시 사이드바 열기 (편의성)
    const topUserBtn = document.getElementById('m-user-icon');
    if(topUserBtn) {
        topUserBtn.addEventListener('click', () => {
            document.getElementById('m-menu-open').click();
        });
    }
}

// 💡 [추가] 모바일 헤더가 들어가는 모든 페이지에 수익 설정 스크립트 강제 주입
function loadGlobalProfitMarginScript() {
    if (!document.getElementById('global-profit-script')) {
        const script = document.createElement('script');
        script.id = 'global-profit-script';
        // 절대 경로를 사용하여 어느 페이지에서든 정확히 파일을 찾아옵니다.
        script.src = '/pumex/mobile/quotation/js/mobile_profit_margin.js';
        document.body.appendChild(script);
    }
}
loadGlobalProfitMarginScript();