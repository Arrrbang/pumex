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
}

// ─────────────────────────────────────────────────────────────
// 2. [업그레이드] 공지사항 롤링 + 전체보기(토글) 기능
// ─────────────────────────────────────────────────────────────
const NOTICE_API_URL = "https://notion-api-hub.vercel.app/api/notice/list"; 

async function initNoticeRolling() {
  const noticeBox = document.querySelector('.notice-box');
  if (!noticeBox) return;

  try {
    const response = await fetch(NOTICE_API_URL);
    const result = await response.json();

    if (result.ok && result.data.length > 0) {
      const notices = result.data;

      // 1. Notice Box 레이아웃 재설정 (Overlay 방식)
      // 원래 notice-box는 자리만 차지하고, 실제 내용은 'container'가 담당하여 위로 뜸
      Object.assign(noticeBox.style, {
        overflow: "visible", // 내부 요소가 튀어나올 수 있게 허용
        position: "relative",
        display: "block",
        background: "transparent", // 배경색은 내부 컨테이너로 이동
        padding: "0"
      });
      noticeBox.innerHTML = ""; 

      // 2. 실제 배경 및 내용을 담을 컨테이너 (확장 시 커지는 부분)
      const container = document.createElement("div");
      Object.assign(container.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        minHeight: "35px",
        backgroundColor: "#e0e0e0", // 원래 배경색
        borderRadius: "18px",       // 둥근 모서리 유지
        zIndex: "1000",             // 다른 요소 위에 뜨도록
        display: "flex",
        flexDirection: "column",
        padding: "0 20px",
        boxSizing: "border-box",
        transition: "all 0.3s ease",
        boxShadow: "none" // 펼칠 때 그림자 추가 예정
      });

      // 3. 상단 영역 (롤링 뷰포트 + 버튼)
      const headerWrap = document.createElement("div");
      Object.assign(headerWrap.style, {
        display: "flex",
        alignItems: "center",
        height: "35px",
        width: "100%"
      });

      // 3-1. 롤링이 보여질 뷰포트 (마스크)
      const viewport = document.createElement("div");
      Object.assign(viewport.style, {
        flex: "1",
        height: "35px",
        overflow: "hidden",
        position: "relative"
      });

      // 3-2. 롤러 (실제 움직이는 리스트)
      const roller = document.createElement("div");
      Object.assign(roller.style, {
        position: "relative",
        top: "0",
        transition: "top 0.5s ease-in-out"
      });

      // 3-3. 토글 버튼 (▼)
      const toggleBtn = document.createElement("button");
      toggleBtn.innerHTML = "▼";
      Object.assign(toggleBtn.style, {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0 0 0 10px",
        fontSize: "0.8rem",
        color: "#555",
        fontWeight: "bold",
        height: "100%"
      });

      // 아이템 생성 헬퍼 함수
      const createItem = (item) => {
        const itemDiv = document.createElement("div");
        Object.assign(itemDiv.style, {
          height: "35px", 
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start" 
        });

        itemDiv.innerHTML = `
            <a href="${item.url}" target="_blank" style="text-decoration:none; color:#333; display:flex; align-items:center; width:100%; overflow:hidden;">
              <span style="background:#333; color:#fff; font-size:0.75rem; padding:2px 8px; border-radius:12px; font-weight:700; margin-right:10px; flex-shrink:0;">공지</span>
              <span style="font-size:0.9rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</span>
            </a>
        `;
        return itemDiv;
      };

      // 초기 리스트 구성
      notices.forEach(item => roller.appendChild(createItem(item)));
      
      // 조립
      viewport.appendChild(roller);
      headerWrap.appendChild(viewport);
      headerWrap.appendChild(toggleBtn);
      container.appendChild(headerWrap);
      noticeBox.appendChild(container);

      // 4. 로직 상태 관리
      let isExpanded = false;
      let intervalId = null;
      let currentIndex = 0;
      const itemHeight = 35;

      // 롤링 시작 함수
      const startRolling = () => {
        // 복제본이 없다면 추가 (무한 롤링용)
        if (roller.children.length === notices.length) {
            roller.appendChild(createItem(notices[0])); 
        }
        
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
      };

      // 롤링 정지 함수
      const stopRolling = () => {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
      };

      // 초기 롤링 시작 (데이터가 2개 이상일 때만)
      if (notices.length > 1) {
        startRolling();
      } else {
        toggleBtn.style.display = "none"; // 1개면 버튼 숨김
      }

      // 5. 버튼 클릭 이벤트 (펼치기/접기)
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 버블링 방지
        isExpanded = !isExpanded;

        if (isExpanded) {
            // [펼치기 모드]
            stopRolling(); // 롤링 정지
            
            // UI 변경
            toggleBtn.innerHTML = "▲";
            container.style.borderRadius = "12px"; // 펼쳤을 땐 둥근 사각형 느낌
            container.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";
            viewport.style.overflow = "visible"; // 내용 다 보이게
            viewport.style.height = "auto";
            
            // 롤러 초기화 (리스트 정렬)
            roller.style.transition = "none";
            roller.style.top = "0";
            // 복제본 제거 (깔끔한 리스트를 위해)
            if (roller.children.length > notices.length) {
                roller.removeChild(roller.lastElementChild);
            }
            
        } else {
            // [접기 모드]
            toggleBtn.innerHTML = "▼";
            
            // UI 복구
            container.style.borderRadius = "999px"; // 다시 알약 모양
            container.style.boxShadow = "none";
            viewport.style.overflow = "hidden";
            viewport.style.height = "35px";
            
            // 롤링 재개
            currentIndex = 0; // 처음부터 다시 시작
            if (notices.length > 1) startRolling();
        }
      });

      // (선택) 펼쳐진 상태에서 바깥 클릭 시 닫기
      document.addEventListener('click', (e) => {
        if (isExpanded && !container.contains(e.target)) {
            toggleBtn.click(); // 버튼 클릭 동작 트리거
        }
      });

    } else {
      noticeBox.innerHTML = '<div style="display:flex; align-items:center; justify-content:flex-start; height:100%; color:#777; font-size:0.85rem; padding-left:20px;">등록된 공지사항이 없습니다.</div>';
    }

  } catch (error) {
    console.error("공지사항 로딩 실패:", error);
  }
}

// ─────────────────────────────────────────────────────────────
// 3. 로그인 사용자 표시 및 로그아웃
// ─────────────────────────────────────────────────────────────
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
    // 이벤트 중복 방지용 교체
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

// 🔥 전역 객체 등록
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
