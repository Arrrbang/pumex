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

