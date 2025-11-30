// header.js

// 1. 메뉴 활성화 로직
function setActiveHeaderMenu() {
  const currentURL = window.location.href;
  const destinationMenu = document.getElementById("menu-destination");
  const pumexsosMenu = document.getElementById("menu-sos");
  const provincial_packing_feeMenu = document.getElementById("menu-provincial_packing_fee");
  const trcMenu = document.getElementById("menu-TRC");
  const consoleMenu = document.getElementById("menu-console");
  const supportingdocsMenu = document.getElementById("menu-supporting-documents");

  const destinationURL = "https://arrrbang.github.io/pumex/destinationcost";
  const pumexsosURL = "https://arrrbang.github.io/pumex/sos";
  const provincial_packing_feeURL = "https://arrrbang.github.io/pumex/ExternalPackagingCosts";
  const trcURL = "추후입력";
  const consoleURL = "추후입력";
  const supportingdocsURL = "추후입력";

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
  if (supportingdocsMenu && currentURL === supportingdocsURL) {
    supportingdocsMenu.classList.add("always-on");
  }
  const menus = [
    { id: "menu-destination", url: "[https://arrrbang.github.io/pumex/destinationcost](https://arrrbang.github.io/pumex/destinationcost)" },
    { id: "menu-sos", url: "[https://arrrbang.github.io/pumex/sos](https://arrrbang.github.io/pumex/sos)" },
    { id: "menu-provincial_packing_fee", url: "[https://arrrbang.github.io/pumex/ExternalPackagingCosts](https://arrrbang.github.io/pumex/ExternalPackagingCosts)" },
    { id: "menu-TRC", url: "추후입력" },
    { id: "menu-console", url: "추후입력" },
    { id: "menu-supporting-documents", url: "추후입력" }
  ];

  menus.forEach(m => {
    const el = document.getElementById(m.id);
    if (el && (m.url !== "추후입력") && currentURL.startsWith(m.url)) {
      el.classList.add("always-on");
    }
  });
}

const NOTICE_API_URL = "https://notion-api-hub.vercel.app/api/notice/list"; 

async function initNoticeRolling() {
  const noticeBox = document.querySelector('.notice-box');
  if (!noticeBox) return;

  try {
    const response = await fetch(NOTICE_API_URL);
    const result = await response.json();

    if (result.ok && result.data.length > 0) {
      const notices = result.data;

      // 1. 스타일 초기화
      Object.assign(noticeBox.style, {
        position: "relative",
        display: "block",
        background: "transparent",
        padding: "0",
        overflow: "visible",
        zIndex: "2000"
      });
      noticeBox.innerHTML = "";

      // 2. 메인 컨테이너
      const container = document.createElement("div");
      Object.assign(container.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        minHeight: "35px",
        backgroundColor: "#e0e0e0",
        borderRadius: "18px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
        boxShadow: "none"
      });

      // 3. 상단 헤더
      const headerRow = document.createElement("div");
      Object.assign(headerRow.style, {
        display: "flex",
        alignItems: "center",
        height: "35px",
        padding: "0 20px",
        boxSizing: "border-box",
        flexShrink: "0"
      });

      const viewport = document.createElement("div");
      Object.assign(viewport.style, {
        flex: "1",
        height: "35px",
        overflow: "hidden",
        position: "relative"
      });

      const roller = document.createElement("div");
      Object.assign(roller.style, {
        position: "relative",
        top: "0",
        transition: "top 0.5s ease-in-out"
      });

      const toggleBtn = document.createElement("button");
      toggleBtn.innerHTML = "▼";
      Object.assign(toggleBtn.style, {
        border: "none",
        background: "none",
        cursor: "pointer",
        padding: "0 0 0 10px",
        fontSize: "0.75rem",
        color: "#555",
        height: "100%",
        display: "flex",
        alignItems: "center"
      });

      const fullList = document.createElement("div");
      Object.assign(fullList.style, {
        display: "none",
        flexDirection: "column",
        padding: "0 20px 10px 20px",
        borderTop: "1px solid #ccc",
        marginTop: "0"
      });

      // [수정] 아이템 생성 함수 (카테고리에 따른 배지 색상 및 텍스트 적용)
      const createItemHTML = (item) => {
        // 카테고리별 색상 설정 (공지: 검정, 정보: 파랑)
        const badgeColor = item.category === "공지" ? "#333" : "#0056b3"; // 원하는 색으로 변경 가능
        
        return `
        <a href="${item.url}" target="_blank" style="text-decoration:none; color:#333; display:flex; align-items:center; width:100%; height:35px;">
          <span style="background:${badgeColor}; color:#fff; font-size:0.75rem; padding:2px 8px; border-radius:12px; font-weight:700; margin-right:10px; flex-shrink:0;">${item.category}</span>
          <span style="font-size:0.9rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</span>
        </a>
      `};

      // 롤러 및 리스트에 추가
      notices.forEach(item => {
        const div = document.createElement("div");
        div.style.height = "35px";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.innerHTML = createItemHTML(item);
        roller.appendChild(div);
      });

      notices.forEach(item => {
        const div = document.createElement("div");
        div.innerHTML = createItemHTML(item);
        fullList.appendChild(div);
      });

      viewport.appendChild(roller);
      headerRow.appendChild(viewport);
      headerRow.appendChild(toggleBtn);
      container.appendChild(headerRow);
      container.appendChild(fullList);
      noticeBox.appendChild(container);

      // --- 롤링 로직 (기존 동일) ---
      let isExpanded = false;
      let intervalId = null;
      let currentIndex = 0;
      const itemHeight = 35;

      const startRolling = () => {
        if (roller.children.length === notices.length && notices.length > 1) {
            const clone = roller.children[0].cloneNode(true);
            roller.appendChild(clone);
        }
        
        if (notices.length > 1) {
            intervalId = setInterval(() => {
                currentIndex++;
                roller.style.transition = "top 0.5s ease-in-out";
                roller.style.top = `-${currentIndex * itemHeight}px`;

                if (currentIndex === notices.length) {
                    setTimeout(() => {
                        roller.style.transition = "none";
                        roller.style.top = "0";
                        currentIndex = 0;
                    }, 500);
                }
            }, 3000);
        }
      };

      const stopRolling = () => {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
      };

      startRolling();

      if (notices.length > 1) {
          toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            isExpanded = !isExpanded;

            if (isExpanded) {
                stopRolling();
                toggleBtn.innerHTML = "▲";
                container.style.borderRadius = "12px";
                container.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                container.style.backgroundColor = "#fff"; 
                container.style.border = "1px solid #ccc";
                headerRow.style.borderBottom = "1px solid #eee";
                fullList.style.display = "flex";
                
                roller.style.transition = "none";
                roller.style.top = "0";
                currentIndex = 0;
            } else {
                toggleBtn.innerHTML = "▼";
                container.style.borderRadius = "18px";
                container.style.boxShadow = "none";
                container.style.backgroundColor = "#e0e0e0"; 
                container.style.border = "none";
                headerRow.style.borderBottom = "none";
                fullList.style.display = "none";
                
                startRolling();
            }
          });

          document.addEventListener("click", (e) => {
            if (isExpanded && !container.contains(e.target)) {
                toggleBtn.click();
            }
          });
      } else {
          toggleBtn.style.display = "none";
      }

    } else {
      noticeBox.innerHTML = '<div style="height:35px; display:flex; align-items:center; padding:0 20px; color:#777; font-size:0.85rem;">등록된 공지사항이 없습니다.</div>';
      noticeBox.style.background = "#e0e0e0";
      noticeBox.style.borderRadius = "999px";
    }

  } catch (error) {
    console.error("공지사항 로딩 실패:", error);
  }
}

// ... (로그인 및 초기화 로직 유지) ...
function initUserHeader() {
  const userInfoWrap = document.getElementById('userInfoWrap');
  const displayUserId = document.getElementById('displayUserId');
  const btnLogout = document.getElementById('btnLogout');

  if (!userInfoWrap) return;

  const storedUser = localStorage.getItem('username') || localStorage.getItem('userId'); 
  const token = localStorage.getItem('token');

  if (token && storedUser) {
    userInfoWrap.style.display = 'flex';
    if (displayUserId) displayUserId.innerText = `@${storedUser} 님`;
  } else {
    userInfoWrap.style.display = 'none';
  }

  if (btnLogout) {
    const newBtn = btnLogout.cloneNode(true);
    btnLogout.parentNode.replaceChild(newBtn, btnLogout);
    
    newBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      alert('로그아웃 되었습니다.');
      window.location.href = 'window.location.href = 'https://arrrbang.github.io/pumex/';
    });
  }
}

window.setActiveHeaderMenu = setActiveHeaderMenu;
window.initNoticeRolling = initNoticeRolling;
window.initUserHeader = initUserHeader;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
      setActiveHeaderMenu();
      initNoticeRolling();
      initUserHeader();
  });
} else {
  setActiveHeaderMenu();
  initNoticeRolling();
  initUserHeader();
}
