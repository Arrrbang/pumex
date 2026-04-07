function setActiveHeaderMenu() {

  const currentPath = window.location.pathname; 
  const menus = [
    { id: "menu-destination", path: "/destinationcost" },
    { id: "menu-sos", path: "/sos" },
    { id: "menu-provincial_packing_fee", path: "/ExternalPackagingCosts" },
    { id: "menu-TRC", path: "추후입력" }, 
    { id: "menu-console", path: "추후입력" }, 
    { id: "menu-supporting-documents", path: "/review-of-destination-proof" },
    { id: "menu-account", path: "/account" }
  ];

  menus.forEach(m => {
    const el = document.getElementById(m.id);

    if (el && m.path !== "추후입력" && currentPath.includes(m.path)) {
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

      noticeBox.innerHTML = "";

      const container = document.createElement("div");
      container.className = "notice-rolling-container";

      const headerRow = document.createElement("div");
      headerRow.className = "notice-header-row";

      const viewport = document.createElement("div");
      viewport.className = "notice-viewport";

      const roller = document.createElement("div");
      roller.className = "notice-roller";

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "notice-toggle-btn";
      toggleBtn.innerHTML = "▼";

      const fullList = document.createElement("div");
      fullList.className = "notice-full-list";

      const createItemHTML = (item) => {
        const badgeColor = item.category === "공지" ? "#333" : "#0056b3"; 
        return `
          <a href="${item.url}" target="_blank" class="header-notice-item">
            <span class="notice-badge" style="background:${badgeColor};">${item.category}</span>
            <span class="notice-title-text">${item.title}</span>
          </a>
        `;
      };

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
                container.classList.add("expanded");
                
                roller.style.transition = "none";
                roller.style.top = "0";
                currentIndex = 0;
            } else {
                toggleBtn.innerHTML = "▼";
                container.classList.remove("expanded");
                
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
      noticeBox.innerHTML = '등록된 공지사항이 없습니다.';
      noticeBox.className = 'notice-box empty-state';
    }

  } catch (error) {
    console.error("공지사항 로딩 실패:", error);
  }
}

// 3. 유저 헤더 초기화
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
      window.location.href = '/pumex/index.html';
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
