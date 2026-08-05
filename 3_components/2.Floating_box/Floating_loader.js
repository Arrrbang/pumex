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
    `${floatingBase}/scripts/btn_oneclick.js`,
    `${floatingBase}/scripts/btn_save.js`, 
    `${floatingBase}/scripts/btn_notionsave.js`, 
    `${floatingBase}/scripts/btn_notionload.js`,
    `${floatingBase}/scripts/btn_pdf.js`
  ];

  try {
    const response = await fetch(htmlPath);
    if (!response.ok) throw new Error('플로팅 박스 로드 실패');
    document.body.insertAdjacentHTML('afterbegin', await response.text());

    const floatingMenu = document.getElementById('floatingMenu');
      if (floatingMenu) {
        setInterval(() => {
          const pathname = window.location.pathname;
          const isQuoPage = pathname.includes('one_click_quo.html') || 
                            pathname.includes('final_quotation') || 
                            pathname.includes('load_quotation');
          
          const isFinalQuotation = pathname.includes('final_quotation');
          const isLoadQuotation = pathname.includes('load_quotation');
          
          const single = document.getElementById('resultSection');
          const compare = document.getElementById('resultSectionCompare');
          
          const singleOn = single && !single.hidden;
          const compareOn = compare && !compare.hidden;
          
          floatingMenu.hidden = !(isQuoPage || singleOn || compareOn);

          const btnCompare = document.getElementById('btnCompare');
          
          const btnSaveQuotation = document.getElementById('btnSaveQuotation');
          const btnSaveToNotion = document.getElementById('btnSaveToNotion'); 
          const btnLoadFromNotion = document.getElementById('btnLoadFromNotion');
          const btnOneClickA = document.getElementById('btnOneClickA');
          const btnOneClickB = document.getElementById('btnOneClickB');

          // 💡 세션에 불러온 견적서 데이터가 존재하는지 확인
          let hasLoadedData = false;
          try {
              const sessionData = JSON.parse(sessionStorage.getItem('finalQuotationData') || '{}');
              if (sessionData._notionPageId) hasLoadedData = true;
          } catch(e) {}

          // 견적서 페이지별 버튼 가시성 제어
          if (isQuoPage) {
              if (btnCompare) btnCompare.hidden = true;
              if (btnOneClickA) btnOneClickA.hidden = true;
              if (btnOneClickB) btnOneClickB.hidden = true;

              if (isFinalQuotation) {
                  // 1. 신규/기존 생성 페이지 (final_quotation)
                  if (btnSaveQuotation) btnSaveQuotation.hidden = false;
                  if (btnSaveToNotion) btnSaveToNotion.hidden = false;
                  if (btnLoadFromNotion) btnLoadFromNotion.hidden = true;
              } else if (isLoadQuotation) {
                  // 💡 2. 뷰어 페이지 (load_quotation) 다이내믹 제어
                  if (hasLoadedData) {
                      // 견적서를 불러온 후: 출력 및 덮어쓰기 나타남
                      if (btnSaveQuotation) btnSaveQuotation.hidden = false;
                      if (btnSaveToNotion) btnSaveToNotion.hidden = false;
                      // 💡 다른 견적서도 연속으로 불러올 수 있도록 텍스트만 변경하여 유지
                      if (btnLoadFromNotion) {
                          btnLoadFromNotion.hidden = false;
                          btnLoadFromNotion.textContent = '다른 견적 불러오기';
                      }
                  } else {
                      // 견적서를 불러오기 전 (빈 양식): 오직 불러오기 버튼만 나타남
                      if (btnSaveQuotation) btnSaveQuotation.hidden = true;
                      if (btnSaveToNotion) btnSaveToNotion.hidden = true;
                      if (btnLoadFromNotion) {
                          btnLoadFromNotion.hidden = false;
                          btnLoadFromNotion.textContent = '노션에서 불러오기';
                      }
                  }
              } else {
                  // 기타 견적 페이지
                  if (btnSaveQuotation) btnSaveQuotation.hidden = false;
                  if (btnSaveToNotion) btnSaveToNotion.hidden = false;
                  if (btnLoadFromNotion) btnLoadFromNotion.hidden = false;
              }
          } else {
              if (btnSaveQuotation) btnSaveQuotation.hidden = true;  
              if (btnSaveToNotion) btnSaveToNotion.hidden = true;  
              if (btnLoadFromNotion) btnLoadFromNotion.hidden = true;  
              
              if (compareOn) {
                  if (btnCompare) btnCompare.hidden = true;
                  if (btnOneClickA) btnOneClickA.hidden = false;
                  if (btnOneClickB) btnOneClickB.hidden = false;
              } else if (singleOn) {
                  if (btnCompare) btnCompare.hidden = false;
                  if (btnOneClickA) btnOneClickA.hidden = false;
                  if (btnOneClickB) btnOneClickB.hidden = true;
              }
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