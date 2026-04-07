/* 2_result/compare/bottom-bar/bottom_bar.js */
(async function() {
  // ✨ 현재 자기 자신의 파일 위치(URL)를 파악합니다.
  const currentScript = document.currentScript.src;
  const basePath = currentScript.substring(0, currentScript.lastIndexOf('/'));

  try {
    // 1. 같은 폴더에 있는 CSS 로드
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${basePath}/bottom_bar.css`;
    document.head.appendChild(link);

    // 2. 같은 폴더에 있는 HTML 로드
    const response = await fetch(`${basePath}/bottom_bar.html`);
    if (!response.ok) throw new Error('비교 하단바 로드 실패');
    
    const html = await response.text();
    document.body.insertAdjacentHTML('beforeend', html);
    
    // ✨ 처음엔 조용히 숨겨둡니다. (비교 컨트롤러가 나중에 켬)
    const compareBar = document.getElementById('compareBottomBar');
    if (compareBar) compareBar.hidden = true;
    
  } catch (error) {
    console.error(error);
  }
})();