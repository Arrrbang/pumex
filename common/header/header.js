// 1. 메뉴 활성화 로직 (중복 제거 및 최적화)
function setActiveHeaderMenu() {
  const currentURL = window.location.href;

  // 메뉴 설정 배열 (여기에만 등록하면 자동으로 처리됨)
  const menus = [
    { id: "menu-destination", url: "https://arrrbang.github.io/pumex/destinationcost" },
    { id: "menu-sos", url: "https://arrrbang.github.io/pumex/sos" },
    { id: "menu-provincial_packing_fee", url: "https://arrrbang.github.io/pumex/ExternalPackagingCosts" },
    { id: "menu-TRC", url: "추후입력" }, // 아직 링크 없음
    { id: "menu-console", url: "추후입력" }, // 아직 링크 없음
    { id: "menu-supporting-documents", url: "https://arrrbang.github.io/pumex/review-of-destination-proof" },
    { id: "menu-account", url: "https://arrrbang.github.io/pumex/account" }
  ];

  menus.forEach(m => {
    // 1. 요소가 존재하는지 확인
    const el = document.getElementById(m.id);
    // 2. 링크가 '추후입력'이 아닌지 확인
    // 3. 현재 URL이 해당 메뉴의 URL로 시작하는지 확인
    if (el && m.url !== "추후입력" && currentURL.startsWith(m.url)) {
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

      // 초기화
      noticeBox.innerHTML = "";

      // DOM 요소 생성
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

      // 아이템 HTML 생성 함수
      const createItemHTML = (item) => {
        const badgeColor = item.category === "공지" ? "#333" : "#0056b3"; 
        return `
          <a href="${item.url}" target="_blank" class="notice-item">
            <span class="notice-badge" style="background:${badgeColor};">${item.category}</span>
            <span class="notice-title-text">${item.title}</span>
          </a>
        `;
      };

      // 롤러에 아이템 추가 (상단 한 줄 롤링용)
      notices.forEach(item => {
        const div = document.createElement("div");
        // CSS 클래스로 제어하는 것이 좋으나, JS 동적 생성 구조상 인라인 스타일 유지
        div.style.height = "35px"; 
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.innerHTML = createItemHTML(item);
        roller.appendChild(div);
      });

      // 전체 리스트에 아이템 추가 (확장 시 보여줄 목록)
      notices.forEach(item => {
        const div = document.createElement("div");
        div.innerHTML = createItemHTML(item);
        fullList.appendChild(div);
      });

      // 조립
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
      const itemHeight = 35; // CSS .notice-item의 height와 일치해야 함

      const startRolling = () => {
        // 무한 롤링을 위한 첫 번째 아이템 복제 (이미 복제된 게 없을 때만)
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

      // --- 토글 이벤트 ---
      if (notices.length > 1) {
          toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            isExpanded = !isExpanded;

            if (isExpanded) {
                // 펼침
                stopRolling();
                toggleBtn.innerHTML = "▲";
                container.classList.add("expanded");
                
                // 롤러 초기화 (첫 번째 공지가 보이도록)
                roller.style.transition = "none";
                roller.style.top = "0";
                currentIndex = 0;
            } else {
                // 접힘
                toggleBtn.innerHTML = "▼";
                container.classList.remove("expanded");
                
                startRolling();
            }
          });

          // 외부 클릭 시 닫기
          document.addEventListener("click", (e) => {
            if (isExpanded && !container.contains(e.target)) {
                toggleBtn.click(); // 버튼 클릭 동작을 트리거하여 닫음
            }
          });
      } else {
          toggleBtn.style.display = "none"; // 공지가 1개면 버튼 숨김
      }

    } else {
      // 데이터 없음
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
    // 기존 이벤트 리스너 제거를 위한 노드 복제 (좋은 방법입니다)
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

// 전역 할당
window.setActiveHeaderMenu = setActiveHeaderMenu;
window.initNoticeRolling = initNoticeRolling;
window.initUserHeader = initUserHeader;

// 실행
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
