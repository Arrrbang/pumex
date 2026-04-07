/* Floating_box/scripts/btn_oneclick.js */
(function() {
  
  // ✨ 표 데이터와 합계 금액을 포장해서 넘기는 함수
  function handleOneClick(mode) {
    let partnerName, country, region, cargo, tableWrapId, totalDisplayId;

    if (mode === 'SINGLE') {
      // 1-1. 단일 조회 모드일 때 정보 가져오기
      partnerName = document.getElementById('sumCompany')?.textContent || '-';
      country = document.getElementById('sumCountry')?.textContent || '-';
      region = document.getElementById('sumRegion')?.textContent || '-';
      cargo = document.getElementById('sumCbmType')?.textContent || '-';
      tableWrapId = 'tableWrap';
      totalDisplayId = 'totalDisplayOne';
    } else if (mode === 'A') {
      // 1-2. 비교 모드 (기존 파트너 A)
      partnerName = document.getElementById('cmpPartnerA')?.textContent || '-';
      country = document.getElementById('cmpCountry')?.textContent || '-';
      region = document.getElementById('cmpRegion')?.textContent || '-';
      cargo = document.getElementById('cmpCbmType')?.textContent || '-';
      tableWrapId = 'tableWrapA';
      totalDisplayId = 'totalDisplayA';
    } else if (mode === 'B') {
      // 1-3. 비교 모드 (신규 파트너 B)
      partnerName = document.getElementById('cmpPartnerB')?.textContent || '-';
      country = document.getElementById('cmpCountry')?.textContent || '-';
      region = document.getElementById('cmpRegion')?.textContent || '-';
      cargo = document.getElementById('cmpCbmType')?.textContent || '-';
      tableWrapId = 'tableWrapB';
      totalDisplayId = 'totalDisplayB';
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
      destTotal: destTotal
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