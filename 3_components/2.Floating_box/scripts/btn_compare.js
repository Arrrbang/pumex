/* Floating_box/scripts/btn_compare.js */


(function() {
  // ✨ 견적서 페이지에서는 비교 팝업 스크립트를 아예 작동시키지 않음! (CSS 에러 원천 차단)
  if (window.location.pathname.includes('one_click_quo.html')) return;
  // CSS 경로 설정
  const cssPath = '../../../3_components/2.Floating_box/compare-popup/compare.css'; 
  
  if (!document.querySelector(`link[href="${cssPath}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssPath;
    document.head.appendChild(link);
  }

  // ✨ 점 애니메이션을 위한 엔진 세팅
  const animatedElements = new Map();

  function animateDots(element, text = '로딩중', interval = 250) {
    if (!element) return;
    if (animatedElements.has(element)) clearInterval(animatedElements.get(element));
    
    let dots = 0;
    element.textContent = text;
    
    const intervalId = setInterval(() => {
      dots = (dots + 1) % 4; // 0, 1, 2, 3 무한 반복
      element.textContent = text + '.'.repeat(dots);
    }, interval);
    
    animatedElements.set(element, intervalId);
  }

  function stopAnimateDots(element) {
    if (element && animatedElements.has(element)) {
      clearInterval(animatedElements.get(element));
      animatedElements.delete(element);
    }
  }

  // 클릭 감지기
  document.addEventListener('click', (e) => {
    const btnCompare = e.target.closest('#btnCompare');
    if (!btnCompare) return;

    const country = document.querySelector('#countryCombo input')?.value.trim();
    const region = document.querySelector('#regionCombo input')?.value.trim();

    if (!country || !region) {
      alert("먼저 국가와 지역을 선택한 후 비용 조회를 진행해주세요.");
      return;
    }
    createComparePopupUI(country, region);
  });

  function createComparePopupUI(country, region) {
    if (document.getElementById('comparePopupOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'comparePopupOverlay';
    overlay.className = 'compare-popup-overlay';
    overlay.innerHTML = `
      <div class="compare-popup-modal">
        <h3 class="compare-popup-title">비교할 파트너 선택</h3>
        <div class="compare-form-group"><label class="compare-popup-label">국가/지역</label><input type="text" class="compare-popup-input" value="${country} / ${region}" disabled></div>
        <div class="compare-form-group"><label class="compare-popup-label">파트너 선택</label><select id="popPartner" class="compare-popup-input"><option value="loading">로딩중</option></select></div>
        <div class="compare-form-group"><label class="compare-popup-label">POE 선택</label><select id="popPoe" class="compare-popup-input" disabled><option value="">파트너를 먼저 선택하세요</option></select></div>
        <div class="compare-form-group last-group"><label class="compare-popup-label">화물타입 선택</label><select id="popCargo" class="compare-popup-input" disabled><option value="">POE를 먼저 선택하세요</option></select></div>
        <div class="compare-popup-actions"><button id="btnPopCancel" class="compare-btn-cancel">취소</button><button id="btnPopCompare" class="compare-btn-submit">비교하기</button></div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btnPopCancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    const popPartner = document.getElementById('popPartner');
    const popPoe = document.getElementById('popPoe');
    const popCargo = document.getElementById('popCargo');

    // ✨ 1. 파트너 로딩 애니메이션 시작!
    const partnerOpt = popPartner.querySelector('option');
    animateDots(partnerOpt);

    if(window.CostAPI) {
      window.CostAPI.fetchCompanies(country, region).then(partners => {
        stopAnimateDots(partnerOpt); // 로딩 끝! 엔진 정지
        popPartner.innerHTML = `<option value="">파트너를 선택하세요</option>` + partners.map(p => `<option value="${p}">${p}</option>`).join('');
      });
    } else {
      stopAnimateDots(partnerOpt);
      alert('API 통신 모듈을 찾을 수 없습니다.');
    }

    popPartner.addEventListener('change', async (e) => {
      popPoe.innerHTML = '<option value="loading">로딩중</option>'; 
      popPoe.disabled = true; popCargo.disabled = true;
      if (!e.target.value) return;

      // ✨ 2. POE 로딩 애니메이션 시작!
      const poeOpt = popPoe.querySelector('option');
      animateDots(poeOpt);

      const poes = await window.CostAPI.fetchPOEs(country, region, e.target.value);
      
      stopAnimateDots(poeOpt); // 로딩 끝! 엔진 정지
      popPoe.innerHTML = `<option value="">POE를 선택하세요</option>` + poes.map(p => `<option value="${p}">${p}</option>`).join('');
      popPoe.disabled = false;
    });

    popPoe.addEventListener('change', async (e) => {
      popCargo.innerHTML = '<option value="loading">로딩중</option>'; 
      popCargo.disabled = true;
      if (!e.target.value) return;

      // ✨ 3. 화물타입 로딩 애니메이션 시작!
      const cargoOpt = popCargo.querySelector('option');
      animateDots(cargoOpt);

      const cargos = await window.CostAPI.fetchCargoTypes(country, region, popPartner.value, e.target.value);
      
      stopAnimateDots(cargoOpt); // 로딩 끝! 엔진 정지
      popCargo.innerHTML = `<option value="">화물타입을 선택하세요</option>` + cargos.map(c => `<option value="${c}">${c}</option>`).join('');
      popCargo.disabled = false;
    });

    document.getElementById('btnPopCompare').addEventListener('click', () => {
      const partnerVal = popPartner.value;
      const poeVal = popPoe.value;
      const cargoVal = popCargo.value;

      if (!partnerVal || partnerVal === "loading" || !poeVal || poeVal === "loading" || !cargoVal || cargoVal === "loading") { 
        alert("모두 선택해주세요."); return; 
      }

      const originalData = {
        country: country, region: region,
        company: document.querySelector('#companyCombo input')?.value.trim() || '',
        poe: document.querySelector('#poeCombo input')?.value.trim() || '',
        cargo: document.querySelector('#cargoTypeCombo input')?.value.trim() || '',
        type: document.querySelector('#typeCombo input')?.value.trim() || '20FT',
        cbm: document.getElementById('cbmSelect')?.value ? parseFloat(document.getElementById('cbmSelect').value) : undefined
      };

      const newData = { ...originalData, company: partnerVal, poe: poeVal, cargo: cargoVal };

      document.body.removeChild(document.getElementById('comparePopupOverlay'));

      if(window.CompareController) {
        window.CompareController.execute(originalData, newData);
      } else {
        alert("비교 컨트롤러(CompareController)가 로드되지 않았습니다.");
      }
    });
  }
})();