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
  // 헤더 HTML이 로드된 후에 실행되어야 하므로 요소를 찾습니다.
  const noticeBox = document.querySelector('.notice-box');
  
  // 아직 박스가 없다면(헤더 로드 전이라면) 종료하고, 
  // index.html의 스크립트에서 헤더 로드 후 다시 호출하도록 합니다.
  if (!noticeBox) return;

  try {
    const response = await fetch(NOTICE_API_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    const result = await response.json();

    if (result.ok && result.data.length > 0) {
      const notices = result.data;

      // (1) Notice Box 스타일 초기화 (CSS 수정 없이 JS로 강제 적용)
      Object.assign(noticeBox.style, {
        overflow: "hidden",
        position: "relative",
        display: "block", // flex 해제하여 내부 div 허용
        padding: "0 20px" // 좌우 여백
      });
      noticeBox.innerHTML = ""; // 기존 내용 비우기

      // (2) 롤러(리스트 컨테이너) 생성
      const roller = document.createElement("div");
      roller.className = "notice-box-list";
      Object.assign(roller.style, {
        position: "relative",
        top: "0",
        transition: "top 0.5s ease-in-out"
      });

      // (3) 아이템 생성 함수 (좌측 정렬 적용)
      const createItem = (item) => {
        const itemDiv = document.createElement("div");
        Object.assign(itemDiv.style, {
          height: "35px", // 박스 높이와 일치
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start" // [핵심] 좌측 정렬
        });

        itemDiv.innerHTML = `
            <a href="${item.url}" target="_blank" style="text-decoration:none; color:#333; display:flex; align-items:center; width:100%;">
              <span style="background:#333; color:#fff; font-size:0.75rem; padding:2px 8px; border-radius:12px; font-weight:700; margin-right:10px; flex-shrink:0;">공지</span>
              <span style="font-size:0.9rem; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</span>
            </a>
        `;
        return itemDiv;
      };

      // (4) 모든 공지사항 추가
      notices.forEach(item => {
        roller.appendChild(createItem(item));
      });

      // [핵심] 데이터 로드 즉시 화면에 표시 (기다림 없음)
      noticeBox.appendChild(roller);

      // (5) 데이터가 2개 이상일 때만 롤링 애니메이션 시작
      if (notices.length > 1) {
        // 끊김 없는 루프를 위해 첫 번째 아이템을 복사해서 맨 뒤에 추가
        const firstClone = createItem(notices[0]);
        roller.appendChild(firstClone);

        const itemHeight = 35; // px
        let currentIndex = 0;

        setInterval(() => {
            currentIndex++;
            
            // 위로 이동
            roller.style.transition = "top 0.5s ease-in-out";
            roller.style.top = `-${currentIndex * itemHeight}px`;

            // 마지막(복사본)에 도달하면 순식간에 처음으로 이동
            if (currentIndex === notices.length) {
                setTimeout(() => {
                    roller.style.transition = "none"; // 애니메이션 끄기
                    roller.style.top = "0";           // 원점 복귀
                    currentIndex = 0;                 // 인덱스 초기화
                }, 500); // transition 시간(0.5s) 후 실행
            }
        }, 3000); // 3초마다 반복
      }

    } else {
      // 공지사항 없을 때
      noticeBox.innerHTML = '<div style="display:flex; align-items:center; justify-content:flex-start; height:100%; color:#777; font-size:0.85rem;">등록된 공지사항이 없습니다.</div>';
    }

  } catch (error) {
    console.error("공지사항 로딩 실패:", error);
  }
}

// 전역 등록
window.initNoticeRolling = initNoticeRolling;

// 페이지 로드 시 실행 (이미 헤더가 있다면 바로 실행)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
      setActiveHeaderMenu();
      initNoticeRolling();
  });
} else {
  setActiveHeaderMenu();
  initNoticeRolling();
}
