// header.js

function setActiveHeaderMenu() {
  const currentURL = window.location.href;

  // 메뉴 요소
  const destinationMenu = document.getElementById("menu-destination");
  const pumexsosMenu = document.getElementById("menu-sos");
  const provincial_packing_feeMenu = document.getElementById("menu-provincial_packing_fee");
  const trcMenu = document.getElementById("menu-TRC");
  const consoleMenu = document.getElementById("menu-console");

  // 연결될 URL
  const destinationURL = "https://arrrbang.github.io/pumex/destinationcost/";
  const pumexsosURL = "https://arrrbang.github.io/pumex/sos/";
  const provincial_packing_feeURL = "추후입력";
  const trcURL = "추후입력";
  const consoleURL = "추후입력";

  // 현재 URL과 비교하여 활성화 (요소 null 방지)
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

// 전역에서 호출할 수 있게 export
window.setActiveHeaderMenu = setActiveHeaderMenu;

// 기존 페이지에서도 자동으로 한 번은 실행되도록
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setActiveHeaderMenu);
} else {
  setActiveHeaderMenu();
}
