/* Floating_box/scripts/btn_oneclick.js */
(function() {
  
  function getSafeValue(wrapId) {
    const input = document.querySelector(`#${wrapId} input`);
    return input ? input.value.trim() : '';
  }

  // 💡 비동기(async) 함수로 변경하여 데이터를 백엔드에서 직접 다시 가져옵니다.
  async function handleOneClick(mode, btnElement) {
    
    // 버튼 로딩 상태 표시 (데이터를 챙기는 동안 클릭 방지)
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '<div class="btn-sub-text" style="font-size:0.85rem; margin-top:5px;">데이터 구성 중...</div>';
    btnElement.style.pointerEvents = 'none';

    try {
        let partnerName, actualPoe = ''; 

        // 1. 구형 화면의 입력창 및 텍스트에서 검색 조건 추출
        const country = getSafeValue('countryCombo') || document.getElementById('sumCountry')?.textContent || '';
        const region = getSafeValue('regionCombo') || document.getElementById('sumRegion')?.textContent || '';
        const cargoType = getSafeValue('cargoTypeCombo') || document.getElementById('sumCbmType')?.textContent || '';
        const containerType = getSafeValue('typeCombo') || '20FT';
        
        // CBM 추출 (숫자만 남기기)
        const rawCbm = getSafeValue('cbmCombo_Wrapper') || getSafeValue('cbmCombo2_Wrapper') || document.getElementById('cbmSelect')?.value || '1';
        const cbmVal = rawCbm.replace(/[^0-9.]/g, ''); 

        const defaultPoe = getSafeValue('poeCombo') || '';
        let totalDisplayId;

        // 모드에 따른 파트너명, POE 세팅
        if (mode === 'SINGLE') {
          partnerName = document.getElementById('sumCompany')?.textContent || '-';
          actualPoe = document.getElementById('sumPoe')?.textContent || defaultPoe;
          totalDisplayId = 'totalDisplayOne';
        } else if (mode === 'A') {
          partnerName = document.getElementById('cmpPartnerA')?.textContent || '-';
          actualPoe = document.getElementById('titleA')?.textContent.match(/\(([^)]+)\)/)?.[1] || defaultPoe;
          totalDisplayId = 'totalDisplayA';
        } else if (mode === 'B') {
          partnerName = document.getElementById('cmpPartnerB')?.textContent || '-';
          actualPoe = document.getElementById('titleB')?.textContent.match(/\(([^)]+)\)/)?.[1] || defaultPoe;
          totalDisplayId = 'totalDisplayB';
        }

        let destTotal = document.getElementById(totalDisplayId)?.textContent || '';
        destTotal = destTotal.replace(/[^0-9,.]/g, '').replace(/^,/, '').trim();

        // 💡 2. 핵심 수정: 백엔드 API를 찔러서 원본 데이터를 확실하게 다시 받아옵니다.
        let resultData = {};
        let dataArray = [];
        let currency = 'KRW';

        if (window.CostAPI && typeof window.CostAPI.fetchCosts === 'function') {
            try {
                // 백엔드 재요청 (0.1~0.3초 소요)
                resultData = await window.CostAPI.fetchCosts(country, region, partnerName, cargoType, containerType, cbmVal, actualPoe);
                dataArray = resultData?.rows ? resultData.rows : (Array.isArray(resultData) ? resultData : []);
                currency = resultData?.currency || 'USD';
            } catch(e) {
                console.error('견적 데이터 원본 백업 실패:', e);
            }
        }

        // 3. MODE/TYPE 자동 완성 문구 생성
        const isConsole = containerType.toUpperCase().includes('CON') || containerType.toUpperCase().includes('LCL');
        const modeTypeStr = isConsole 
            ? `Door to Door / ${containerType} (${cbmVal} CBM)`
            : `Door to Door / ${containerType} Single Container (${cbmVal} CBM)`;

        // 4. 새로운 견적서(quotation.html)가 기대하는 데이터 구조로 완벽히 조립
        const quotationData = {
            q_location: region,
            q_dest_port: actualPoe,
            q_cbm: cbmVal,
            q_container: containerType,
            q_mode_type: modeTypeStr,
            cur_cds: currency, 
            
            // 화면의 금액을 최우선으로 매핑
            q_destination_amount: destTotal, 
            
            // ✨ 이제 텅 비어있지 않고 진짜 백엔드 데이터가 들어갑니다! (상세보기, 조건변경 모두 정상작동)
            _fullSearchParams: {
                country: country,
                region: region,
                partner: partnerName,
                cargoType: cargoType,
                poe: actualPoe,
                containerType: containerType,
                cbm: cbmVal
            },
            _fullResultData: dataArray,
            _currency: currency,
            _rawData: resultData
        };

        // 5. 세션 스토리지 저장 및 견적서 페이지 띄우기
        sessionStorage.setItem('finalQuotationData', JSON.stringify(quotationData));
        window.open((window.PUMEX_BASE || '') + '/pumex/4_pages/quotation/final_quotation/quotation.html', '_blank');

    } finally {
        // 창이 열리면 버튼 상태를 원래대로 복구
        btnElement.innerHTML = originalText;
        btnElement.style.pointerEvents = 'auto';
    }
  }

  // ✨ 버튼 클릭 감지
  document.addEventListener('click', (e) => {
    const btnA = e.target.closest('#btnOneClickA');
    const btnB = e.target.closest('#btnOneClickB');

    if (btnA) {
      const compareSec = document.getElementById('resultSectionCompare');
      const isCompareMode = compareSec && !compareSec.hidden;
      
      if (isCompareMode) {
        handleOneClick('A', btnA);      
      } else {
        handleOneClick('SINGLE', btnA); 
      }
    } else if (btnB) {
      handleOneClick('B', btnB);
    }
  });

})();