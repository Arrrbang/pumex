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
    const response = await fetch(NOTICE_API_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    const result = await response.json();

    if (result.ok && result.data.length > 0) {
      const notices = result.data;

      // 1. Notice Box 스타일
      noticeBox.style.overflow = "hidden";
      noticeBox.style.position = "relative";
      noticeBox.style.display = "block";
      noticeBox.innerHTML = "";

      // 2. 롤러 컨테이너 생성
      const roller = document.createElement("div");
      roller.style.position = "relative";
      roller.style.top = "0";
      roller.style.transition = "top 0.5s ease-in-out";

      // 3. 공지사항 아이템 생성
      notices.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.style.height = "35px";
        itemDiv.style.display = "flex";
        itemDiv.style.alignItems = "center";
        
        // [수정 1] flex-start로 변경하여 왼쪽 정렬
        itemDiv.style.justifyContent = "flex-start"; 

        // [수정 2] a 태그 내부도 왼쪽 정렬 (justify-content: flex-start)
        itemDiv.innerHTML = `
            <a href="${item.url}" target="_blank" style="text-decoration:none; color:#333; display:flex; align-items:center; justify-content:flex-start; width:100%; gap:8px;">
              <span style="background:#333; color:#fff; font-size:0.75rem; padding:2px 8px; border-radius:12px; font-weight:700; flex-shrink:0;">공지</span>
              <span style="font-size:0.9rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</span>
            </a>
        `;
        roller.appendChild(itemDiv);
      });

      noticeBox.appendChild(roller);

      // 4. 롤링 애니메이션
      if (notices.length > 1) {
        setInterval(() => {
            roller.style.top = "-35px";

            setTimeout(() => {
                roller.style.transition = "none";
                roller.appendChild(roller.firstElementChild);
                roller.style.top = "0";
                
                void roller.offsetWidth; 

                roller.style.transition = "top 0.5s ease-in-out";
            }, 500);
        }, 4000);
      }

    } else {
      // 데이터 없을 때도 좌측 정렬
      noticeBox.innerHTML = '<div style="display:flex; align-items:center; justify-content:flex-start; height:100%; color:#777; font-size:0.85rem;">등록된 공지사항이 없습니다.</div>';
    }

  } catch (error) {
    console.error("공지사항 로딩 실패:", error);
  }
}

// 전역 등록 및 실행
window.initNoticeRolling = initNoticeRolling;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNoticeRolling);
} else {
  initNoticeRolling();
}
