/* Floating_box/scripts/btn_oneclick.js */
(function() {
  
  function handleOneClick(mode) {
    let partnerName, country, region, cargo, tableWrapId, totalDisplayId;
    let actualPoe = ''; // ✨ 추가: POE 값을 담을 변수 선언

    if (mode === 'SINGLE') {
      partnerName = document.getElementById('sumCompany')?.textContent || '-';
      country = document.getElementById('sumCountry')?.textContent || '-';
      region = document.getElementById('sumRegion')?.textContent || '-';
      cargo = document.getElementById('sumCbmType')?.textContent || '-';
      tableWrapId = 'tableWrap';
      totalDisplayId = 'totalDisplayOne';
      
      // ✨ 단일 조회 시 POE 값을 가져옴 (예: 결과창 어딘가에 숨겨진 값이나 title에서 추출)
      // 만약 결과창의 제목(title)이 "미국 파트너명 (USLAX) 견적" 이런 식이라면
      // 괄호 안의 값을 추출하는 기존 로직이 맞는지 확인해야 합니다.
      actualPoe = document.querySelector('#poeCombo input')?.value.trim();
      
    } else if (mode === 'A') {
      partnerName = document.getElementById('cmpPartnerA')?.textContent || '-';
      country = document.getElementById('cmpCountry')?.textContent || '-';
      region = document.getElementById('cmpRegion')?.textContent || '-';
      cargo = document.getElementById('cmpCbmType')?.textContent || '-';
      tableWrapId = 'tableWrapA';
      totalDisplayId = 'totalDisplayA';
      
      actualPoe = document.querySelector('#poeCombo input')?.value.trim() || document.getElementById('titleA')?.textContent.match(/\(([^)]+)\)/)?.[1];
      
    } else if (mode === 'B') {
      partnerName = document.getElementById('cmpPartnerB')?.textContent || '-';
      country = document.getElementById('cmpCountry')?.textContent || '-';
      region = document.getElementById('cmpRegion')?.textContent || '-';
      cargo = document.getElementById('cmpCbmType')?.textContent || '-';
      tableWrapId = 'tableWrapB';
      totalDisplayId = 'totalDisplayB';
      
      actualPoe = document.getElementById('titleB')?.textContent.match(/\(([^)]+)\)/)?.[1];
    }

    const location = `${country} / ${region}`;
    const tableWrap = document.getElementById(tableWrapId);
    const tableHtml = tableWrap ? tableWrap.innerHTML : '';
    const destTotal = document.getElementById(totalDisplayId)?.textContent || '0';

    const compareState = {
        orig: {
            country: document.querySelector('#countryCombo input')?.value.trim(),
            region: document.querySelector('#regionCombo input')?.value.trim(),
            company: document.getElementById('cmpPartnerA')?.textContent || document.getElementById('sumCompany')?.textContent,
            poe: document.querySelector('#poeCombo input')?.value.trim() || document.getElementById('titleA')?.textContent.match(/\(([^)]+)\)/)?.[1],
            cargo: document.querySelector('#cargoTypeCombo input')?.value.trim(),
            type: document.querySelector('#typeCombo input')?.value.trim(),
            cbm: document.getElementById('cbmSelect')?.value
        },
        target: (mode === 'A' || mode === 'B') ? {
            company: document.getElementById('cmpPartnerB')?.textContent,
            poe: document.getElementById('titleB')?.textContent.match(/\(([^)]+)\)/)?.[1],
            cargo: document.querySelector('#cargoTypeCombo input')?.value.trim()
        } : null,
        isCompare: (mode === 'A' || mode === 'B')
    };
    sessionStorage.setItem('lastSearchState', JSON.stringify(compareState));
    
    const quoteData = {
      partner: partnerName,
      location: location,
      cargo: cargo,
      tableHtml: tableHtml,
      destTotal: destTotal,
      poe: actualPoe
    };

    // 배낭에 짐 싸고 원클릭 페이지로 출발! (경로는 무조건 한 칸 위로)
    sessionStorage.setItem('oneClickQuoteData', JSON.stringify(quoteData));
    window.open((window.PUMEX_BASE || '') + '/pumex/4_pages/one-click-quo/one_click_quo.html', '_blank');
  }

  // ✨ 버튼 클릭 감지
  document.addEventListener('click', (e) => {
    const btnA = e.target.closest('#btnOneClickA');
    const btnB = e.target.closest('#btnOneClickB');

    if (btnA) {
      // 비교 창이 열려있는지 확인해서 모드를 결정합니다.
      const compareSec = document.getElementById('resultSectionCompare');
      const isCompareMode = compareSec && !compareSec.hidden;
      
      if (isCompareMode) {
        handleOneClick('A');      // 비교 중이면 A 파트너 데이터 가져오기
      } else {
        handleOneClick('SINGLE'); // 단일 조회면 단일 데이터 가져오기
      }
    } else if (btnB) {
      handleOneClick('B');
    }
  });

})();