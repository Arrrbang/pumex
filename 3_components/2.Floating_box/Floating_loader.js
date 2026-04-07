/* Floating_box / Floating_loader.js */
const currentScriptUrl = document.currentScript.src;
const floatingBase = currentScriptUrl.substring(0, currentScriptUrl.lastIndexOf('/'));

document.addEventListener('DOMContentLoaded', async () => {
  const cssLink = document.createElement("link");
  cssLink.rel = "stylesheet";
  cssLink.href = `${floatingBase}/Floating.css`; 
  document.head.appendChild(cssLink);

  const htmlPath = `${floatingBase}/Floating_box.html`;
  const scriptsToLoad = [
    `${floatingBase}/scripts/btn_back.js`,
    `${floatingBase}/scripts/btn_compare.js`,
    `${floatingBase}/scripts/btn_oneclick.js`
  ];

  try {
    const response = await fetch(htmlPath);
    if (!response.ok) throw new Error('플로팅 박스 로드 실패');
    document.body.insertAdjacentHTML('afterbegin', await response.text());

    const floatingMenu = document.getElementById('floatingMenu');
    if (floatingMenu) {
      setInterval(() => {
        // ✨ 현재 페이지가 견적서 페이지인지 확인
        const isQuoPage = window.location.pathname.includes('one_click_quo.html');
        
        const single = document.getElementById('resultSection');
        const compare = document.getElementById('resultSectionCompare');
        
        const singleOn = single && !single.hidden;
        const compareOn = compare && !compare.hidden;
        
        // 1. 견적서 페이지면 무조건 보이고, 아니면 조회 결과가 있을 때만 보임
        floatingMenu.hidden = !(isQuoPage || singleOn || compareOn);

        const btnCompare = document.getElementById('btnCompare');
        const btnOneClickA = document.getElementById('btnOneClickA');
        const btnOneClickB = document.getElementById('btnOneClickB');

        // 2. 견적서 페이지에서는 다른 버튼들 싹 숨기기
        if (isQuoPage) {
            if (btnCompare) btnCompare.hidden = true;
            if (btnOneClickA) btnOneClickA.hidden = true;
            if (btnOneClickB) btnOneClickB.hidden = true;
        } else if (compareOn) {
            if (btnCompare) btnCompare.hidden = true;
            if (btnOneClickA) btnOneClickA.hidden = false;
            if (btnOneClickB) btnOneClickB.hidden = false;
        } else if (singleOn) {
            if (btnCompare) btnCompare.hidden = false;
            if (btnOneClickA) btnOneClickA.hidden = false;
            if (btnOneClickB) btnOneClickB.hidden = true;
        }
      }, 300); 
    }
    
    const loadPromises = scriptsToLoad.map(scriptPath => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = scriptPath; 
        script.onload = resolve; 
        script.onerror = () => { resolve(); }; 
        document.body.appendChild(script);
      });
    });

    await Promise.all(loadPromises);

  } catch (error) {
    console.error('플로팅 박스 로딩 오류:', error);
  }
});