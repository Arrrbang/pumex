/* 2_result/single/bottom-bar/bottom_bar.js */
(function() {
  'use strict';

  window.BottomBar = {
    updateSummary: function(country, region, company, type, cbm) {
      const setTxt = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (text == null || text === '') ? '-' : String(text);
      };
      
      const buildCbmType = (t, c) => {
        const tStr = String(t || '').trim() || '20FT';
        if (!c && c !== 0) return tStr;
        return `${c} CBM / ${tStr}`;
      };

      setTxt('sumCountry', country);
      setTxt('sumRegion', region);
      setTxt('sumCompany', company);
      setTxt('sumCbmType', buildCbmType(type, cbm));
      // 긴 지역명/나라명도 줄바꿈·말줄임 없이 첫 영역 안에 맞춥니다.
      const fitSummary = () => {
        document.querySelectorAll('#currencySection .summary-text-container .summary-line').forEach(line => {
          const span = line.querySelector('span');
          if (!span || !line.clientWidth) return;
          span.style.fontSize = '';
          const available = line.clientWidth;
          const actual = span.getBoundingClientRect().width;
          if (actual > available) {
            const size = parseFloat(getComputedStyle(span).fontSize);
            span.style.fontSize = `${size * available / actual}px`;
          }
        });
      };
      requestAnimationFrame(fitSummary);
      if (!this._summaryResizeBound) {
        window.addEventListener('resize', fitSummary);
        this._summaryResizeBound = true;
      }
    },

    initTotalCalculator: function(wrapId, totalElementId, type) {
      const wrap = document.getElementById(wrapId);
      const totalValue = document.getElementById(totalElementId);
      
      if (!wrap || !totalValue) return;

      const tableEl = wrap.querySelector('table.result-table');
      const baseCur = tableEl ? (tableEl.dataset.baseCurrency || 'USD').toUpperCase() : 'USD';

      // 셀에서 "환율 변환된 실제 숫자(convertedAmt)"를 최우선으로 가져옵니다.
      function getCellNumber(td){
        if (!td) return 0;
        const src = td.dataset.convertedAmt ?? td.dataset.baseAmt ?? td.dataset.raw ?? '0';
        const v = Number(src);
        return Number.isFinite(v) ? v : 0;
      }

      function updateTotal(){
        let sum = 0;
        // 표 안의 숫자(환율 적용된 숫자)들을 싹 다 더합니다.
        wrap.querySelectorAll('tr.row-basic td.amt').forEach(td => { sum += getCellNumber(td); });
        wrap.querySelectorAll('tr.row-extra input.extra-check:checked').forEach(cb => {
          sum += getCellNumber(cb.closest('tr').querySelector('td.amt'));
        });

        // ✨ 환율 변환기가 켜져있으면, 변환기가 주는 완벽한 포맷(예: ₩130,000)을 그대로 씁니다!
        if (window.CurrencyConverter && window.CurrencyConverter.formatTotalForWrapper) {
            totalValue.textContent = window.CurrencyConverter.formatTotalForWrapper(sum, wrapId) || '0';
        } else {
            // 환율기 연결 전 기본 표시
            if (baseCur === 'KRW') totalValue.textContent = '₩' + Math.floor(sum).toLocaleString('ko-KR');
            else if (baseCur === 'USD') totalValue.textContent = '$' + Number(sum.toFixed(2)).toLocaleString('en-US');
            else if (baseCur === 'EUR') totalValue.textContent = '€' + Number(sum.toFixed(2)).toLocaleString('de-DE');
            else totalValue.textContent = Number(sum.toFixed(2)).toLocaleString() + ' ' + baseCur;
        }

        if (window.CurrencyConverter && window.CurrencyConverter.adjustFontSize) {
          window.CurrencyConverter.adjustFontSize();
        }
      }

      // 환율 변환기가 표를 업데이트할 때마다 이 함수를 부르도록 등록
      wrap._updateTotal = updateTotal;
      
      // 처음 표가 그려질 때 1회 계산
      updateTotal();

      // 사용자가 체크박스를 누를 때 다시 계산
      if (wrap._totalChangeHandler) wrap.removeEventListener('change', wrap._totalChangeHandler);
      wrap._totalChangeHandler = event => {
        if (event.target.matches('input.extra-check')) updateTotal();
      };
      wrap.addEventListener('change', wrap._totalChangeHandler);
    }
  };
})();