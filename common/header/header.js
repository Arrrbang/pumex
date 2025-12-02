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
  const supportingdocsURL = "https://arrrbang.github.io/pumex/review-of-destination-proof";

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
    { id: "menu-destination", url: "https://arrrbang.github.io/pumex/destinationcost" },
    { id: "menu-sos", url: "https://arrrbang.github.io/pumex/sos" },
    { id: "menu-provincial_packing_fee", url: "https://arrrbang.github.io/pumex/ExternalPackagingCosts" },
    { id: "menu-TRC", url: "추후입력" },
    { id: "menu-console", url: "추후입력" },
    { id: "menu-supporting-documents", url: "https://arrrbang.github.io/pumex/review-of-destination-proof" }
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

      // 1. 스타일 초기화 대신 내부 비우기
      noticeBox.innerHTML = "";
      // noticeBox 자체에 대한 스타일은 CSS(.notice-box)에서 처리됨

      // 2. 메인 컨테이너 생성 및 클래스 부여
      const container = document.createElement("div");
      container.className = "notice-rolling-container";

      // 3. 상단 헤더 Row
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

      // [수정] 아이템 생성 함수 (HTML 문자열 대신 요소를 생성하여 반환하거나, 문자열 내 클래스 사용)
      const createItemHTML = (item) => {
        // 카테고리별 색상은 동적 데이터이므로 인라인 스타일로 유지하되, 나머지는 클래스로 처리
        const badgeColor = item.category === "공지" ? "#333" : "#0056b3"; 
        
        return `
          <a href="${item.url}" target="_blank" class="notice-item">
            <span class="notice-badge" style="background:${badgeColor};">${item.category}</span>
            <span class="notice-title-text">${item.title}</span>
          </a>
        `;
      };

      // 롤러에 아이템 추가
      notices.forEach(item => {
        const div = document.createElement("div");
        // 높이와 정렬은 .notice-item 클래스가 처리하므로 여기선 래퍼만 생성하거나
        // createItemHTML 내부의 a태그 자체가 notice-item이므로 div는 단순 래퍼 역할만 수행
        // CSS 구조상 roller > div > a 구조를 유지하기 위해 div에 스타일을 줄 필요가 있다면 클래스 추가
        div.style.height = "35px"; // 롤링 계산을 위해 높이 명시 필요할 수 있음
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.innerHTML = createItemHTML(item);
        roller.appendChild(div);
      });

      // 전체 리스트에 아이템 추가
      notices.forEach(item => {
        const div = document.createElement("div");
        div.innerHTML = createItemHTML(item);
        fullList.appendChild(div);
      });

      // DOM 조립
      viewport.appendChild(roller);
      headerRow.appendChild(viewport);
      headerRow.appendChild(toggleBtn);
      container.appendChild(headerRow);
      container.appendChild(fullList);
      noticeBox.appendChild(container);

      // --- 롤링 로직 ---
      let isExpanded = false;
      let intervalId = null;
      let currentIndex = 0;
      const itemHeight = 35; // CSS height와 일치해야 함

      const startRolling = () => {
        // 복제본 생성 로직 (무한 롤링 효과)
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

      // --- 토글 이벤트 리스너 (CSS 클래스 토글로 단순화) ---
      if (notices.length > 1) {
          toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            isExpanded = !isExpanded;

            if (isExpanded) {
                // 펼침 상태
                stopRolling();
                toggleBtn.innerHTML = "▲";
                container.classList.add("expanded"); // CSS 클래스 추가
                
                // 롤러 위치 초기화
                roller.style.transition = "none";
                roller.style.top = "0";
                currentIndex = 0;
            } else {
                // 접힘 상태
                toggleBtn.innerHTML = "▼";
                container.classList.remove("expanded"); // CSS 클래스 제거
                
                startRolling();
            }
          });

          // 외부 클릭 시 닫기
          document.addEventListener("click", (e) => {
            if (isExpanded && !container.contains(e.target)) {
                // 직접 클릭 로직 대신 상태 변경 함수를 호출하거나 버튼을 클릭하게 함
                // 여기서는 기존 로직대로 버튼 클릭 트리거 사용
                toggleBtn.click();
            }
          });
      } else {
          toggleBtn.style.display = "none";
      }

    } else {
      // 데이터가 없을 때
      noticeBox.innerHTML = '등록된 공지사항이 없습니다.';
      noticeBox.className = 'notice-box empty-state'; // CSS 클래스로 스타일 적용
    }

  } catch (error) {
    console.error("공지사항 로딩 실패:", error);
  }
}

// ... (로그인 및 초기화 로직 기존과 동일 유지) ...
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
      window.location.href = 'https://arrrbang.github.io/pumex/';
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
