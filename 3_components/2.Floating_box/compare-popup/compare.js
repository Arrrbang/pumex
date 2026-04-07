/* Floating_box/Floating_2/Floating_2_compare.js */

document.addEventListener('floatingReady', () => {
  const BASE_URL = 'https://notion-api-hub.vercel.app';
  
  // 드롭다운 애니메이션 인터벌을 저장할 Map
  const animatedElements = new Map();

  // ✨ 드롭다운 "로딩중..." 점 애니메이션 함수
  function animateDots(element, text = '로딩중', interval = 100) {
    if (!element) return;
    
    // 이 요소에 이미 애니메이션이 있다면 중지
    if (animatedElements.has(element)) {
      clearInterval(animatedElements.get(element));
    }

    let dots = 0;
    element.textContent = text; // 초기 설정

    const intervalId = setInterval(() => {
      dots = (dots + 1) % 4; // 0, 1, 2, 3
      element.textContent = text + '.'.repeat(dots);
    }, interval);

    animatedElements.set(element, intervalId);
  }

  // ✨ 드롭다운 점 애니메이션 중지 함수
  function stopAnimateDots(element) {
    if (element && animatedElements.has(element)) {
      clearInterval(animatedElements.get(element));
      animatedElements.delete(element);
    }
  }

  // ✨ 글로벌 스피너 표시 함수
  function showGlobalSpinner() {
    const spinner = document.getElementById('compareGlobalSpinner');
    if (spinner) spinner.style.display = 'flex';
  }

  // ✨ 글로벌 스피너 숨김 함수
  function hideGlobalSpinner() {
    const spinner = document.getElementById('compareGlobalSpinner');
    if (spinner) spinner.style.display = 'none';
  }

  // ---------------------------------------------------------
  // [PART 1] index.html 에서 실행되는 로직: 팝업 생성 및 데이터 전송
  // ---------------------------------------------------------
  const btnCompare = document.getElementById('btnCompare') || document.querySelector('#floatingMenu .floating-btn:nth-child(2)');
  
  if (btnCompare && !window.location.pathname.includes('Floating_2_compare.html')) {
    btnCompare.textContent = "다른 업체와 비교하기";
    
    btnCompare.addEventListener('click', async () => {
      const countryInput = document.querySelector('#countryCombo input');
      const regionInput = document.querySelector('#regionCombo input');
      const country = countryInput ? countryInput.value.trim() : '';
      const region = regionInput ? regionInput.value.trim() : '';

      if (!country || !region) {
        alert("먼저 국가와 지역을 선택한 후 비용 조회를 진행해주세요.");
        return;
      }

      createComparePopupUI(country, region);
    });
  }

  function createComparePopupUI(country, region) {
    if (document.getElementById('comparePopupOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'comparePopupOverlay';
    overlay.className = 'compare-popup-overlay'; // CSS 클래스 연결

    overlay.innerHTML = `
      <div class="compare-popup-modal">
        <h3 class="compare-popup-title">비교할 파트너 선택</h3>
        
        <div class="compare-form-group">
          <label class="compare-popup-label">국가 / 지역</label>
          <input type="text" class="compare-popup-input" value="${country} / ${region}" disabled>
        </div>

        <div class="compare-form-group">
          <label class="compare-popup-label">파트너 선택</label>
          <select id="popPartner" class="compare-popup-input">
            <option value="">로딩중...</option>
          </select>
        </div>

        <div class="compare-form-group">
          <label class="compare-popup-label">POE 선택</label>
          <select id="popPoe" class="compare-popup-input" disabled>
            <option value="">파트너를 먼저 선택하세요</option>
          </select>
        </div>

        <div class="compare-form-group last-group">
          <label class="compare-popup-label">화물타입 선택</label>
          <select id="popCargo" class="compare-popup-input" disabled>
            <option value="">POE를 먼저 선택하세요</option>
          </select>
        </div>

        <div class="compare-popup-actions">
          <button id="btnPopCancel" class="compare-btn-cancel">취소</button>
          <button id="btnPopCompare" class="compare-btn-submit">비교하기</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btnPopCancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    const fetchJson = async (url) => {
      const res = await fetch(url, { cache: 'no-store' });
      return res.ok ? await res.json() : {};
    };

    // ✨ 파트너 로딩 중 애니메이션 시작
    const popPartner = document.getElementById('popPartner');
    animateDots(popPartner.querySelector('option'));

    fetchJson(`${BASE_URL}/api/companies/by-region?country=${country}&region=${region}&mode=options`)
      .then(data => {
        // ✨ 파트너 로딩 완료, 애니메이션 중지
        stopAnimateDots(popPartner.querySelector('option'));

        const partners = (data.companies || data.options || []).filter(Boolean);
        popPartner.innerHTML = `<option value="">파트너를 선택하세요</option>` + 
          partners.map(p => `<option value="${p}">${p}</option>`).join('');
      });

    document.getElementById('popPartner').addEventListener('change', async (e) => {
      const partner = e.target.value;
      const popPoe = document.getElementById('popPoe');
      const popCargo = document.getElementById('popCargo');
      
      // ✨ POE 로딩 시작
      popPoe.innerHTML = '<option value="">로딩중...</option>';
      animateDots(popPoe.querySelector('option'));
      popPoe.disabled = true; popCargo.disabled = true;

      if (!partner) return;

      const data = await fetchJson(`${BASE_URL}/api/poe/by-company?country=${country}&region=${region}&company=${partner}&mode=options`);
      let poes = (data.poes || data.POE || data.options || []).filter(Boolean);
      
      // ✨ POE 로딩 완료, 애니메이션 중지
      stopAnimateDots(popPoe.querySelector('option'));
      popPoe.innerHTML = `<option value="">POE를 선택하세요</option>` + 
        poes.map(p => `<option value="${p}">${p}</option>`).join('');
      popPoe.disabled = false;
    });

    document.getElementById('popPoe').addEventListener('change', async (e) => {
      const partner = document.getElementById('popPartner').value;
      const poe = e.target.value;
      const popCargo = document.getElementById('popCargo');

      // ✨ 화물타입 로딩 시작
      popCargo.innerHTML = '<option value="">로딩중...</option>';
      animateDots(popCargo.querySelector('option'));
      popCargo.disabled = true;

      if (!poe) return;

      const data = await fetchJson(`${BASE_URL}/api/cargo-types/by-partner?country=${country}&region=${region}&company=${partner}&poe=${poe}&mode=options`);
      const cargos = (data.types || data.options || []).filter(Boolean);
      
      // ✨ 화물타입 로딩 완료, 애니메이션 중지
      stopAnimateDots(popCargo.querySelector('option'));
      popCargo.innerHTML = `<option value="">화물타입을 선택하세요</option>` + 
        cargos.map(c => `<option value="${c}">${c}</option>`).join('');
      popCargo.disabled = false;
    });

    document.getElementById('btnPopCompare').addEventListener('click', () => {
      const popPartner = document.getElementById('popPartner').value;
      const popPoe = document.getElementById('popPoe').value;
      const popCargo = document.getElementById('popCargo').value;

      if (!popPartner || !popPoe || !popCargo) {
        alert("파트너, POE, 화물타입을 모두 선택해주세요.");
        return;
      }

      const cbmSel = document.getElementById('cbmSelect');
      const cbmVal = cbmSel && cbmSel.value ? parseFloat(cbmSel.value) : undefined;

      const originalData = {
        country: country,
        region: region,
        company: document.querySelector('#companyCombo input')?.value.trim() || '',
        poe: document.querySelector('#poeCombo input')?.value.trim() || '',
        cargo: document.querySelector('#cargoTypeCombo input')?.value.trim() || '',
        type: document.querySelector('#typeCombo input')?.value.trim() || '20FT',
        cbm: cbmVal
      };

      const newData = {
        country: country,
        region: region,
        company: popPartner,
        poe: popPoe,
        cargo: popCargo,
        type: originalData.type, 
        cbm: originalData.cbm
      };

      sessionStorage.setItem('compareOriginal', JSON.stringify(originalData));
      sessionStorage.setItem('compareNew', JSON.stringify(newData));

      window.location.href = './Floating_box/Floating_2/Floating_2_compare.html';
    });
  }


  // ---------------------------------------------------------
  // [PART 2] Floating_2_compare.html 에서 실행되는 로직: 표 렌더링
  // ---------------------------------------------------------
  if (window.location.pathname.includes('Floating_2_compare.html')) {
    const originalData = JSON.parse(sessionStorage.getItem('compareOriginal'));
    const newData = JSON.parse(sessionStorage.getItem('compareNew'));

    if (!originalData || !newData) {
      alert("비교할 데이터가 없습니다. 메인 페이지로 돌아갑니다.");
      window.location.href = '../../index.html';
      return;
    }

    document.getElementById('titleA').textContent = `[기존] ${originalData.company} (${originalData.poe})`;
    document.getElementById('titleB').textContent = `[비교] ${newData.company} (${newData.poe})`;

    async function getCompareCosts(dataObj) {
      const roles = dataObj.cargo ? [String(dataObj.cargo).toUpperCase()] : [];
      const params = new URLSearchParams();
      
      params.set('type', dataObj.type);
      params.set('company', dataObj.company);
      if (dataObj.region) params.set('region', dataObj.region);
      if (dataObj.poe) params.set('poe', dataObj.poe);
      if (roles.length) params.set('roles', roles.join(','));
      
      if (dataObj.cbm !== undefined && dataObj.cbm !== null && !isNaN(dataObj.cbm)) {
        params.set('cbm', String(dataObj.cbm));
      }

      const url = `${BASE_URL}/api/costs/${encodeURIComponent(dataObj.country)}?${params.toString()}`;
      const res = await fetch(url, { cache: 'no-store' });
      return res.ok ? await res.json() : null;
    }

    function getFmt(columnKey, nf){
      const k = String(columnKey||'');
      return nf[k] || nf[k.toUpperCase()] || nf[k.toLowerCase()] || '';
    }

    function formatAmountLocal(n, columnKey, nf, baseCur) {
      if (n==null || n==='' || isNaN(Number(n))) return '';
      const v = Number(n);
      const fmt = getFmt(columnKey, nf);
      if (/dollar|usd/i.test(fmt)) return '$' + v.toLocaleString('en-US');
      if (/won|krw/i.test(fmt))    return '₩' + v.toLocaleString('ko-KR');
      if (/euro|eur/i.test(fmt))   return '€' + v.toLocaleString('de-DE');
      
      if (baseCur === 'USD') return '$' + v.toLocaleString('en-US');
      if (baseCur === 'KRW') return '₩' + v.toLocaleString('ko-KR');
      if (baseCur === 'EUR') return '€' + v.toLocaleString('de-DE');
      return baseCur ? (v.toLocaleString() + ' ' + baseCur) : v.toLocaleString();
    }

    function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

    function renderCompareTable(wrapId, data, dataObj) {
      const wrap = document.getElementById(wrapId);
      if (!wrap) return;

      const type = dataObj.type;
      let rows = Array.isArray(data?.rows) ? data.rows : [];

      function getOrderNumber(row){
        const direct = row?.순서 ?? row?.order ?? row?.Order ?? row?.ORD ?? row?.index ?? row?.seq;
        let n = direct;
        if (n == null){
          const props = row?.properties || {};
          const keys = ['순서','order','Order','ORD','Index','index','Seq','seq'];
          for (const k of keys){
            const v = props?.[k];
            const num = (v && typeof v === 'object') ? (v.number ?? v.value) : v;
            if (num != null){ n = num; break; }
          }
        }
        return Number.isFinite(Number(n)) ? Number(n) : Infinity;
      }
      rows = rows.map((r,i)=>({r,i,ord:getOrderNumber(r)})).sort((a,b)=> (a.ord-b.ord) || (a.i-b.i)).map(x=>x.r);

        if (!rows.length){
          wrap.innerHTML = '<div class="empty-table-msg">표시할 데이터가 없습니다.</div>';
          return;
        }

      function getBasicType(row){ return String(row.basicType || '').trim(); }
      function getDisplayType(row){ return String(row.displayType || row['표시타입'] || '').trim(); }

      const basicRows = rows.filter(r => getBasicType(r) === '기본');
      const extraRows = rows.filter(r => getBasicType(r) === '추가' && getDisplayType(r) === '테이블');
      const otherRows = rows.filter(r => getDisplayType(r) === '기타내용');

      const nf = data?.numberFormats || {};
      const typeCurrency =
        (data?.currencyByType?.[type]) ||
        (data?.meta?.currencyByType?.[type]) ||
        (data?.columns?.[type]?.currency || data?.columns?.[type]?.currencyCode) ||
        (data?.headers?.[type]?.currency || data?.headers?.[type]?.currencyCode) || '';

      let inferredFromFmt = '';
      if (!typeCurrency) {
        const k = String(type || '');
        const fmt = nf[k] || nf[k.toUpperCase()] || nf[k.toLowerCase()] || '';
        if (/dollar|usd/i.test(fmt))      inferredFromFmt = 'USD';
        else if (/won|krw/i.test(fmt))    inferredFromFmt = 'KRW';
        else if (/euro|eur/i.test(fmt))   inferredFromFmt = 'EUR';
        else if (/cad/i.test(fmt))        inferredFromFmt = 'CAD';
      }

      const baseCur = (
        data?.currency ||
        data?.currencyCode ||
        typeCurrency ||
        inferredFromFmt ||
        data?.meta?.currency ||
        data?.meta?.currencyCode ||
        ''
      ).toString().toUpperCase();

      let tbody = '';
      
      for (const r of basicRows) {
        const amt = r?.[type];
        let rawAmt = Number(amt);
        if (!Number.isFinite(rawAmt)) rawAmt = 0;
        const amtTxt = formatAmountLocal(amt, type, nf, baseCur) || '-';
        const item = r.item || r['항목'] || '';
        const extra = r.extra || r['참고사항'] || '';

        const hasExtra = Boolean(extra.trim());
        const cursorClass = hasExtra ? 'has-extra hover-dim' : '';
        const toggleIcon = hasExtra ? `<span class="toggle-icon">▶</span>` : `<span class="toggle-icon"></span>`;
        // ✨ 여기서 esc(extra)를 제거하여 HTML(<br>)이 정상적으로 랜더링되도록 수정!
        const extraHtml = hasExtra ? `<div class="item-extra">${extra}</div>` : '';

        tbody += `
          <tr class="row-basic">
            <td class="sel">기본</td>
            <td class="item-cell ${cursorClass}">
              <div class="item-title">${toggleIcon} <span>${esc(item)}</span></div>
              ${extraHtml}
            </td>
            <td class="amt" data-raw="${rawAmt}" data-base-amt="${rawAmt}">${amtTxt}</td>
          </tr>`;
      }
      
      for (const r of extraRows) {
        const amt = r?.[type];
        let rawAmt = Number(amt);
        if (!Number.isFinite(rawAmt)) rawAmt = 0;
        const amtTxt = formatAmountLocal(amt, type, nf, baseCur) || '-';
        const item = r.item || r['항목'] || '';
        const extra = r.extra || r['참고사항'] || '';

        const hasExtra = Boolean(extra.trim());
        const cursorClass = hasExtra ? 'has-extra hover-dim' : '';
        const toggleIcon = hasExtra ? `<span class="toggle-icon">▶</span>` : `<span class="toggle-icon"></span>`;
        // ✨ 여기서 esc(extra)를 제거
        const extraHtml = hasExtra ? `<div class="item-extra">${extra}</div>` : '';

        tbody += `
          <tr class="row-extra">
            <td class="sel"><label class="sel-check"><input type="checkbox" class="extra-check" data-raw="${rawAmt}"></label></td>
            <td class="item-cell ${cursorClass}">
              <div class="item-title">${toggleIcon} <span>${esc(item)}</span></div>
              ${extraHtml}
            </td>
            <td class="amt" data-raw="${rawAmt}" data-base-amt="${rawAmt}">${amtTxt}</td>
          </tr>`;
      }

      for (const r of otherRows) {
        const item = r.item || '상세 정보';
        const extra = r.extra || r['참고사항'] || '';
        
        const hasExtra = Boolean(extra.trim());
        const cursorClass = hasExtra ? 'has-extra hover-dim' : '';
        const toggleIcon = hasExtra ? `<span class="toggle-icon">▶</span>` : `<span class="toggle-icon"></span>`;
        // ✨ 여기서 esc(extra)를 제거
        const extraHtml = hasExtra ? `<div class="item-extra">${extra}</div>` : '';

        tbody += `
          <tr class="row-other">
            <td class="sel">-</td> 
            <td colspan="2" class="item-cell ${cursorClass}">
              <div class="item-title">${toggleIcon} <span>${esc(item)}</span></div>
              ${extraHtml}
            </td>
          </tr>`;
      }

      wrap.innerHTML = `
        <table class="result-table" data-base-currency="${esc(baseCur)}">
          <colgroup><col class="col-sel"><col class="col-item"><col class="col-amt"></colgroup>
          <thead><tr><th class="sel-col">구분</th><th>항목</th><th class="type-col">${esc(type)}</th></tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      `;

      wrap.querySelectorAll('.item-cell.has-extra').forEach(cell => {
        cell.addEventListener('click', function(e) {
          if (e.target.tagName.toLowerCase() === 'input') return; 
          const extraDiv = this.querySelector('.item-extra');
          const icon = this.querySelector('.toggle-icon');
          if (extraDiv && icon) {
            const isHidden = extraDiv.style.display === 'none' || extraDiv.style.display === '';
            extraDiv.style.display = isHidden ? 'block' : 'none';
            icon.textContent = isHidden ? '▼' : '▶';
          }
        });
      });

      const totalValueEl = document.getElementById(dataObj.targetId);
      function updateTotal() {
        let sum = 0;
        wrap.querySelectorAll('tr.row-basic td.amt').forEach(td => {
          const val = Number(td.dataset.convertedAmt || td.dataset.raw || 0);
          if (Number.isFinite(val)) sum += val;
        });
        wrap.querySelectorAll('tr.row-extra').forEach(tr => {
          const cb = tr.querySelector('input.extra-check');
          if (cb && cb.checked) {
            const td = tr.querySelector('td.amt');
            const val = Number(td.dataset.convertedAmt || td.dataset.raw || 0);
            if (Number.isFinite(val)) sum += val;
          }
        });
        
        if (totalValueEl) {
          if (window.CurrencyConverter && window.CurrencyConverter.formatTotalForWrapper) {
             totalValueEl.textContent = window.CurrencyConverter.formatTotalForWrapper(sum, wrapId) || '0';
          } else {
             totalValueEl.textContent = formatAmountLocal(sum, type, nf, baseCur) || '0';
          }
        }
        
        if (window.CurrencyConverter && window.CurrencyConverter.adjustFontSize) {
          window.CurrencyConverter.adjustFontSize();
        }
      }
      
      wrap._updateTotal = updateTotal;
      wrap.querySelectorAll('input.extra-check').forEach(cb => cb.addEventListener('change', updateTotal));
      updateTotal();
    }

    async function renderCompareTables() {
      const btnCompare = document.getElementById('btnCompare');
      
      // ✨ 글로벌 스피너 표시
      showGlobalSpinner();

      if(btnCompare) btnCompare.textContent = "데이터 불러오는 중...";

      const [resA, resB] = await Promise.all([
        getCompareCosts(originalData),
        getCompareCosts(newData)
      ]);

      while(!document.getElementById('totalDisplayA')) {
        await new Promise(r => setTimeout(r, 50));
      }

      document.getElementById('cmpCountry').textContent = originalData.country || '-';
      document.getElementById('cmpRegion').textContent = originalData.region || '-';
      document.getElementById('cmpCbmType').textContent = originalData.cbm ? `${originalData.cbm} CBM / ${originalData.type}` : originalData.type;
      document.getElementById('cmpPartnerA').textContent = originalData.company;
      document.getElementById('cmpPartnerB').textContent = newData.company;

      originalData.targetId = 'totalDisplayA';
      newData.targetId = 'totalDisplayB';

      // 1. 표를 먼저 완벽하게 그립니다.
      renderCompareTable('tableWrapA', resA, originalData);
      renderCompareTable('tableWrapB', resB, newData);

      // 2. 그려진 표를 찾아 통화 정보를 확실하게 심어줍니다.
      const tableA = document.querySelector('#tableWrapA table');
      const tableB = document.querySelector('#tableWrapB table');
      if (tableA && resA?.currency) tableA.dataset.baseCurrency = resA.currency;
      if (tableB && resB?.currency) tableB.dataset.baseCurrency = resB.currency;

      // 3. 마지막으로 환율 변환 모듈을 깨워서 통화를 세팅하게 합니다!
      if (window.CurrencyConverter) {
        window.CurrencyConverter.init();
        window.CurrencyConverter.applyCurrent();
      }
      
      // ✨ 글로벌 스피너 숨김
      hideGlobalSpinner();

      if(btnCompare) btnCompare.textContent = "다른 업체와 비교하기";
    }

    renderCompareTables();
  }
});