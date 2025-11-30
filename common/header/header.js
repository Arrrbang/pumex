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
  // 박스가 아직 없으면(로딩 전이면) 종료
  if (!noticeBox) return;

  try {
    const response = await fetch(NOTICE_API_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    const result = await response.json();

    if (result.ok && result.data.length > 0) {
      const notices = result.data;

      // 1. Notice Box 스타일 강제 설정 (롤링을 위해)
      noticeBox.style.overflow = "hidden";
      noticeBox.style.position = "relative";
      noticeBox.style.display = "block"; // flex 해제
      noticeBox.innerHTML = ""; // 기존 내용 초기화

      // 2. 롤러 컨테이너 생성 (이 친구가 위로 움직입니다)
      const roller = document.createElement("div");
      roller.style.position = "relative";
      roller.style.top = "0";
      roller.style.transition = "top 0.5s ease-in-out"; // 부드러운 이동 효과

      // 3. 공지사항 아이템 생성 및 추가
      notices.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.style.height = "35px"; // 박스 높이와 동일하게 고정
        itemDiv.style.display = "flex";
        itemDiv.style.alignItems = "center";
        itemDiv.style.justifyContent = "center"; // 가운데 정렬

        // 내부 링크 및 배지 스타일
        itemDiv.innerHTML = `
            <a href="${item.url}" target="_blank" style="text-decoration:none; color:#333; display:flex; align-items:center; gap:8px;">
              <span style="background:#333; color:#fff; font-size:0.75rem; padding:2px 8px; border-radius:12px; font-weight:700;">공지</span>
              <span style="font-size:0.9rem; font-weight:500;">${item.title}</span>
            </a>
        `;
        roller.appendChild(itemDiv);
      });

      // 롤러를 박스에 넣기
      noticeBox.appendChild(roller);

      // 4. 롤링 애니메이션 시작 (데이터가 2개 이상일 때만)
      if (notices.length > 1) {
        setInterval(() => {
            // (1) 위로 한 칸 이동 (-35px)
            roller.style.top = "-35px";

            // (2) 이동이 끝난 후 (0.5초 뒤) 처리
            setTimeout(() => {
                roller.style.transition = "none"; // 애니메이션 끄기 (순간 이동을 위해)
                roller.appendChild(roller.firstElementChild); // 맨 위 요소를 맨 아래로 이동
                roller.style.top = "0"; // 위치를 다시 0으로 리셋 (내용이 바뀐 상태라 시각적으로는 이어짐)
                
                // 브라우저가 변경사항을 인지하도록 강제 리플로우
                void roller.offsetWidth; 

                roller.style.transition = "top 0.5s ease-in-out"; // 애니메이션 다시 켜기
            }, 500); // transition 시간(0.5s)과 맞춰야 함
        }, 5000); // 5초마다 반복
      }

    } else {
      // 공지사항 없을 때
      noticeBox.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#777; font-size:0.85rem;">등록된 공지사항이 없습니다.</div>';
    }

  } catch (error) {
    console.error("공지사항 로딩 실패:", error);
  }
}

// 전역 함수 등록 및 실행 로직 (기존 유지)
window.initNoticeRolling = initNoticeRolling;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNoticeRolling);
} else {
  initNoticeRolling();
}
