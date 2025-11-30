function setActiveHeaderMenu() {
  const currentURL = window.location.href;

  const destinationMenu = document.getElementById("menu-destination");
  const pumexsosMenu = document.getElementById("menu-sos");
  const provincial_packing_feeMenu = document.getElementById("menu-provincial_packing_fee");
  const trcMenu = document.getElementById("menu-TRC");
  const consoleMenu = document.getElementById("menu-console");

  const destinationURL = "https://arrrbang.github.io/pumex/destinationcost";
  const pumexsosURL = "https://arrrbang.github.io/pumex/sos";
  const provincial_packing_feeURL = "https://arrrbang.github.io/pumex/ExternalPackagingCosts";
  const trcURL = "추후입력";
  const consoleURL = "추후입력";

  if (destinationMenu && currentURL.startsWith(destinationURL)) {
    destinationMenu.classList.add("always-on");
  }
  if (pumexsosMenu && currentURL.startsWith(pumexsosURL)) {
    pumexsosMenu.classList.add("always-on");
  }
  if (provincial_packing_feeMenu && currentURL === provincial_packing_feeURL) {
    provincial_packing_feeMenu.classList.add("always-on");
  }
  if (trcMenu && currentURL === trcURL) {
    trcMenu.classList.add("always-on");
  }
  if (consoleMenu && currentURL === consoleURL) {
    consoleMenu.classList.add("always-on");
  }
}

// 🔥 전역 바인딩 + 자동 1회 실행
window.setActiveHeaderMenu = setActiveHeaderMenu;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setActiveHeaderMenu);
} else {
  setActiveHeaderMenu();
}

// ─────────────────────────────────────────────────────────────
// [수정됨] 공지사항 롤링 기능 (URL 수정 완료)
// ─────────────────────────────────────────────────────────────
const NOTICE_API_URL = "https://notion-api-hub.vercel.app/api/notice/list"; 

async function initNoticeRolling() {
  const noticeBox = document.querySelector('.notice-box');
  if (!noticeBox) return;

  try {
    // 1. API 호출
    const response = await fetch(NOTICE_API_URL);
    const result = await response.json();

    if (result.ok && result.data.length > 0) {
      const notices = result.data;
      let currentIndex = 0;

      // 공지사항 표시 함수
      const showNotice = () => {
        const item = notices[currentIndex];
        
        // 페이드 아웃 효과
        noticeBox.style.opacity = 0;
        
        setTimeout(() => {
          // 내용 업데이트
          noticeBox.innerHTML = `
            <a href="${item.url}" target="_blank" class="notice-link">
              <span class="notice-badge">공지</span> ${item.title}
            </a>
          `;
          // 페이드 인 효과
          noticeBox.style.opacity = 1;
        }, 300); 

        // 다음 인덱스 (무한 반복)
        currentIndex = (currentIndex + 1) % notices.length;
      };

      // 2. 초기 실행
      showNotice();

      // 3. 3초마다 반복 실행
      setInterval(showNotice, 3000);

    } else {
      noticeBox.innerHTML = '<span class="notice-empty">등록된 공지사항이 없습니다.</span>';
    }

  } catch (error) {
    console.error("공지사항 로딩 실패:", error);
    // 에러 발생 시 아무것도 표시하지 않음 (혹은 에러 메시지 표시)
    noticeBox.innerHTML = ''; 
  }
}

// 페이지 로드 시 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNoticeRolling);
} else {
  initNoticeRolling();
}
