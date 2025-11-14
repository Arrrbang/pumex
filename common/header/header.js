const currentURL = window.location.href;

// 메뉴 요소
const destinationMenu = document.getElementById("menu-destination");
const pumexsosMenu = document.getElementById("menu-sos");
const provincial_packing_feeMenu = document.getElementById("menu-provincial_packing_fee");
const TRCMenu = document.getElementById("menu-TRC");
const consoleMenu = document.getElementById("menu-console");

// 연결될 URL
const destinationURL = "https://arrrbang.github.io/pumex/destinationcost/";
const pumexsosURL = "추후입력";
const provincial_packing_feeURL = "추후입력";
const TRCURL = "추후입력";
const consoleURL = "추후입력";

// 현재 URL과 비교하여 활성화
if (currentURL.startsWith(destinationURL)) {destinationMenu.classList.add("always-on");}
if (currentURL === pumexsosURL) pumexsosMenu.classList.add("always-on");
if (currentURL === provincial_packing_feeURL) provincial_packing_feeMenu.classList.add("always-on");
if (currentURL === TRCURL) TRCMenu.classList.add("always-on");
if (currentURL === consoleURL) consoleMenu.classList.add("always-on");
