/*! unified-partners.js
 * One script to handle:
 *  - one-partner (single) : #companyCombo, #poeCombo, #cargoTypeCombo, #typeCombo,  #cbmSelect,  #btnFetch,    #resultSection,        #tableWrap
 *  - two-partner A (left) : #companyComboA, #poeComboA, #cargoTypeComboA, #typeCombo2, #cbmSelect2, #btnFetchTwo, #resultSectionCompare, #tableWrapA
 *  - two-partner B (right): #companyComboB, #poeComboB, #cargoTypeComboB, #typeCombo2, #cbmSelect2, #btnFetchTwo, #resultSectionCompare, #tableWrapB
 *
 * 네임스페이스: window.CostUI
 * 충돌 방지: IIFE + 내부 스코프, 외부로는 init 함수만 노출
 */
;(function(){
  'use strict';

  const BASE = 'https://notion-api-hub.vercel.app';

  // ---------------------------- 공용 유틸 ----------------------------
  function esc(s){
    return String(s==null?'':s).replace(/[&<>\"']/g, m => ({"&":"&amp;","<":"&lt;","<": "&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  }
  function setComboLoading(id, on){
    const root = document.getElementById(id);
    if (!root) return;
    root.classList.toggle('is-loading', !!on);
  }
  function getComboAPI(id){
    const root = document.getElementById(id);
    const input = root?.querySelector('input');
    const list  = root?.querySelector('.list');

    if (window[id] && typeof window[id].setItems === 'function') {
      return {
        setItems: (arr)=>window[id].setItems(arr),
        setValue: (v)=>window[id].setValue?.(v),
        getValue: ()=>window[id].getValue?.(),
        enable:   (on)=>{ if (input) input.disabled = !on; }
      };
    }
    return {
      setItems: (arr)=>{
        if (!list || !input) return;
        list.innerHTML = (arr||[]).map(v=>`<div class="item" data-v="${v}">${v}</div>`).join('');
        list.querySelectorAll('.item').forEach(it=>{
          it.addEventListener('click', ()=>{
            input.value = it.getAttribute('data-v') || '';
            list.style.display = 'none';
            input.dispatchEvent(new Event('change',{bubbles:true}));
          });
        });
        input.addEventListener('focus', ()=>{ list.style.display='block'; });
        input.addEventListener('input', ()=>{ list.style.display='block'; });
        document.addEventListener('pointerdown',(e)=>{ if (!root.contains(e.target)) list.style.display='none'; });
      },
      setValue: (v)=>{ if(input){ input.value = v; input.dispatchEvent(new Event('change',{bubbles:true})); } },
      getValue: ()=> input?.value?.trim() || '',
      enable:   (on)=>{ if (input) input.disabled = !on; }
    };
  }
  function getValueSoft(id){
    const combo = getComboAPI(id);
    const v = combo.getValue?.();
    if (v) return v;
    const el = document.getElementById(id);
    if (el && 'value' in el) return el.value;
    const inp = document.querySelector(`#${id} input`);
    return inp?.value?.trim() || '';
  }

  // ---------------------------- 통화 포맷 ----------------------------
  const numberFormats = {};
  const defaultCurrency = { value: '' };

  function getFmt(columnKey){
    const k = String(columnKey||'');
    return numberFormats[k] || numberFormats[k.toUpperCase()] || numberFormats[k.toLowerCase()] || '';
  }
  function formatAmount(n, columnKey){
    if (n==null || n==='' || isNaN(Number(n))) return '';
    const v = Number(n);
    const fmt = getFmt(columnKey);
    if (/dollar|usd/i.test(fmt)) return '$' + v.toLocaleString('en-US');
    if (/won|krw/i.test(fmt))    return '₩' + v.toLocaleString('ko-KR');
    if (/euro|eur/i.test(fmt))   return '€' + v.toLocaleString('de-DE');
    const code = (defaultCurrency.value||'').toUpperCase();
    if (code === 'USD') return '$' + v.toLocaleString('en-US');
    if (code === 'KRW') return '₩' + v.toLocaleString('ko-KR');
    if (code === 'EUR') return '€' + v.toLocaleString('de-DE');
    return code ? (v.toLocaleString() + ' ' + code) : v.toLocaleString();
  }

  // ---------------------------- 데이터 전처리 ----------------------------
  function isEmptyRegionRow(row){
    const direct = row?.region ?? row?.Region ?? row?.지역;
    const propKo = row?.properties?.지역?.select?.name;
    const v = (direct != null ? direct : propKo) ?? '';
    return String(v).trim() === '';
  }
  function mergeRowsKeepingOrder(primary, extra){
    const out = [];
    const seen = new Set();
    const keyOf = (r)=>{
      const id = r?.id || r?._id || r?.uuid || '';
      const item = r?.item || r?.항목 || '';
      const region = r?.region ?? r?.Region ?? r?.지역 ?? '';
      return id ? `id:${id}` : `k:${item}||${region}`;
    };
    (primary||[]).forEach(r=>{ const k=keyOf(r); if(!seen.has(k)){ seen.add(k); out.push(r);} });
    (extra||[]).forEach(r=>{ const k=keyOf(r); if(!seen.has(k)){ seen.add(k); out.push(r);} });
    return out;
  }
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
    const x = Number(n);
    return Number.isFinite(x) ? x : Infinity;
  }
  function sortByOrder(rows){
    return (rows||[]).map((r,i)=>({r,i,ord:getOrderNumber(r)})).sort((a,b)=> (a.ord-b.ord) || (a.i-b.i)).map(x=>x.r);
  }

  // ---------------------------- 표 렌더 ----------------------------

    // ---------------------------- 표 렌더 ----------------------------

  // Notion row에서 숫자 속성 읽어오기 (직접 필드 + properties.* 지원)
  function getNumberField(row, keys){
    if (!Array.isArray(keys)) keys = [keys];
    // 1) row["MIN COST"], row["MIN_COST"], row["MINCOST"] 등 직접 필드
    for (const k of keys){
      const candKeys = [
        k,
        k.replace(/\s+/g,'_'),
        k.replace(/\s+/g,'')
      ];
      for (const ck of candKeys){
        const v = row?.[ck];
        if (v != null && v !== ''){
          const n = Number(v);
          if (!Number.isNaN(n)) return n;
        }
      }
    }
    // 2) row.properties["MIN COST"] 형태
    const props = row?.properties || {};
    for (const k of keys){
      const candKeys = [
        k,
        k.toUpperCase(),
        k.toLowerCase(),
        k.replace(/\s+/g,'_'),
        k.replace(/\s+/g,'')
      ];
      for (const ck of candKeys){
        const p = props[ck];
        if (p == null) continue;
        if (typeof p === 'object'){
          const n = ('number' in p ? p.number : ('value' in p ? p.value : null));
          if (n != null && !Number.isNaN(Number(n))) return Number(n);
        }else{
          const n = Number(p);
          if (!Number.isNaN(n)) return n;
        }
      }
    }
    return null;
  }

  // CONSOLE 계산: MIN COST + ((CBM - MIN CBM) * PER CBM)
  function computeConsoleAmount(row, cbm){
    if (cbm == null || Number.isNaN(Number(cbm))) return null;
    const minCost = getNumberField(row, ['MIN COST','Min Cost','MIN_COST']);
    const minCbm  = getNumberField(row, ['MIN CBM','Min Cbm','MIN_CBM']);
    const perCbm  = getNumberField(row, [
      'PER CBM','Per Cbm','PER_CBM',
      'PER COST','Per Cost','PER_COST'
    ]);

    if (minCost == null || minCbm == null || perCbm == null) return null;

    const cbmNum = Number(cbm);
    const diff   = cbmNum - minCbm;
    const extraCbm = diff > 0 ? diff : 0; // CBM이 더 작으면 0으로
    return minCost + extraCbm * perCbm;
  }


  // ---------------------------- 표 렌더 (기본표 + 추가표, 하나의 테이블) ----------------------------
  function renderTableSingle(wrapId, data, type, isRegionFiltered, cbm){
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;

    // 0) rows 가져오기
    let rows = Array.isArray(data?.rows) ? data.rows : [];

    // 디버그용(원하면 나중에 지워도 됨)
    console.log('[DEBUG] rows from API:', rows.map(r => r.순서 ?? r.order ?? r.Order), rows);

    // 1) 순서 기준 정렬
    rows = sortByOrder(rows);

    if (!rows.length){
      wrap.innerHTML = '<div class="muted">표시할 데이터가 없습니다.</div>';
      return;
    }

    // 2) "기본/추가" / "표시타입" 헬퍼
    function getBasicType(row){
      return String(row.basicType || '').trim();
    }
    function getDisplayType(row){
      return (
        row.displayType ||    // 백엔드에서 넣어준 값
        row['표시타입']  ||   // 혹시 키 그대로 내려온 경우
        ''
      ).toString().trim();
    }

    // 3) 기본 / 추가 분리
    const basicRows = rows.filter(r => getBasicType(r) === '기본');

    // "추가" + "표시타입 = 테이블"인 행만 두 번째 영역(추가 영역)으로 사용
    const extraRows = rows.filter(r => {
      const isExtra = getBasicType(r) === '추가';
      const disp    = getDisplayType(r);
      return isExtra && disp === '테이블';
    });

    if (!basicRows.length && !extraRows.length){
      wrap.innerHTML = '<div class="muted">표시할 데이터가 없습니다.</div>';
      return;
    }

    const baseCur = (defaultCurrency.value || '').toString().toUpperCase();

    // 4) colgroup (열 너비 통일)
    const colgroup = `
      <colgroup>
        <col class="col-sel">
        <col class="col-item">
        <col class="col-amt">
        <col class="col-extra">
      </colgroup>
    `;

    // 5) 헤더 (한 번만)
    const thead = `
      <tr>
        <th class="sel-col">구분</th>
        <th>항목</th>
        <th class="type-col">${esc(type)}</th>
        <th>비고</th>
      </tr>
    `;

    // 6) 바디: 기본행 → 추가행 순으로 한 테이블에 이어서 출력
    let tbody = '';
    let baseSum = 0;   // 기본행 합계
    // 6-1) 기본 행들 (항상 포함, 체크박스 없음)
    for (const r of basicRows){
      const amt    = r?.[type];
      let rawAmt = Number(amt);
      if (!Number.isFinite(rawAmt)) rawAmt = 0;   // NaN이면 0으로

      const amtTxt = formatAmount(amt, type) || '-';
      const extra  = r.extra || '';
      const item   = r.item || '';

      if (Number.isFinite(rawAmt)) baseSum += rawAmt;

      tbody += `
        <tr class="row-basic">
          <td class="sel">기본</td>
          <td>${esc(item)}</td>
          <td class="amt" data-raw="${rawAmt}" data-base-amt="${rawAmt}">${amtTxt}</td>
          <td>${extra}</td>
        </tr>
      `;
    }

    // 6-2) 추가 행들 (체크박스 있음, 체크된 것만 선택합계에 더함)
    for (const r of extraRows){
      const amt    = r?.[type];
      let rawAmt = Number(amt);
      if (!Number.isFinite(rawAmt)) rawAmt = 0;
      const amtTxt = formatAmount(amt, type) || '-';
      const extra  = r.extra || '';
      const item   = r.item || '';

      tbody += `
        <tr class="row-extra">
          <td class="sel">
            <label class="sel-check">
              <input type="checkbox" class="extra-check" data-raw="${rawAmt}">
            </label>
          </td>
          <td>${esc(item)}</td>
          <td class="amt" data-raw="${rawAmt}">${amtTxt}</td>
          <td>${extra}</td>
        </tr>
      `;
    }
/* ================= [여기서부터 붙여넣기] ================= */

    // [수정됨] 7) 선택 합계 HTML 생성 변수 제거함 (상단에 이미 만들었으므로)

    // 8) 최종 렌더: 테이블만 그리기 (${totalHtml} 제거됨)
    wrap.innerHTML = `
      <table class="result-table" data-base-currency="${esc(baseCur)}">
        ${colgroup}
        <thead>${thead}</thead>
        <tbody>${tbody}</tbody>
      </table>
    `;
      const tableEl = wrap.querySelector('table.result-table');
      if (tableEl && data.currency) {
          tableEl.dataset.baseCurrency = data.currency; // 노션 통화를 테이블 속성에 심음
      }
  
      if (window.CurrencyConverter) {
          window.CurrencyConverter.init();
          window.CurrencyConverter.applyCurrent();
      }
      document.getElementById('currencySection')?.removeAttribute('hidden');
    
    // ---------------------------------------------------------------
    // [추가] 래퍼 ID에 따라 상단 합계 span(totalDisplay...) 찾기
    // ---------------------------------------------------------------
    let targetTotalId = '';
    if (wrapId === 'tableWrap')  targetTotalId = 'totalDisplayOne';      // One-Partner
    else if (wrapId === 'tableWrapA') targetTotalId = 'totalDisplayA'; // Two-Partner A
    else if (wrapId === 'tableWrapB') targetTotalId = 'totalDisplayB'; // Two-Partner B

    const totalValue = document.getElementById(targetTotalId);
    
    // 상단에 합계 표시할 공간이 없으면(HTML 수정 안 됨 등) 여기서 중단
    if (!totalValue) return;


    // [기존 함수 유지] 포맷팅 헬퍼
    function formatTotal(sum){
      let formatted = null;
      if (window.CurrencyConverter && window.CurrencyConverter.formatTotalForWrapper) {
        formatted = window.CurrencyConverter.formatTotalForWrapper(sum, wrapId);
      } else if (window.CurrencyConverter && window.CurrencyConverter.formatTotal) {
        formatted = window.CurrencyConverter.formatTotal(sum, type);
      }
      if (!formatted){
        formatted = sum ? formatAmount(sum, type) : '0';
      }
      return formatted;
    }

    // [기존 함수 유지] 셀에서 숫자 가져오는 헬퍼
    function getCellNumber(td){
      if (!td) return 0;
      const src =
        td.dataset.convertedAmt ??
        td.dataset.baseAmt ??
        td.dataset.raw ??
        '0';
      const v = Number(src);
      return Number.isFinite(v) ? v : 0;
    }

    // ---------------------------------------------------------------
    // [수정] 합계 계산 함수 (하단 대신 상단 totalValue 업데이트)
    // ---------------------------------------------------------------
    function updateTotal(){
      // 1) 기본행 합계 (row-basic)
      let baseSum = 0;
      const baseCells = wrap.querySelectorAll('tr.row-basic td.amt');
      baseCells.forEach(td => {
        baseSum += getCellNumber(td);
      });

      // 2) 추가행 합계 (row-extra 중 체크된 것만)
      let extraSum = 0;
      const extraRows = wrap.querySelectorAll('tr.row-extra');
      extraRows.forEach(tr => {
        const cb = tr.querySelector('input.extra-check');
        if (!cb || !cb.checked) return;

        const td = tr.querySelector('td.amt');
        extraSum += getCellNumber(td);
      });

      const total = baseSum + extraSum;

      // 3) 상단 요소(totalValue) 텍스트 업데이트
      totalValue.textContent = formatTotal(total);
    }

    /* ================= [여기까지 붙여넣기] ================= */

    // 🔹 통화 변경 시 currency-converter.js 에서 다시 호출할 수 있도록 래퍼에 등록
    wrap._updateTotal = updateTotal;
    // 최초 1회 계산
    updateTotal();

    // 체크박스 변경 시마다 합계 갱신
    wrap.querySelectorAll('input.extra-check').forEach(cb=>{
      cb.addEventListener('change', updateTotal);
    });
  }

    // ---------------------------------------------------------------
    // 표시타입 = '기타내용' 전용 2열 결과표
    // ---------------------------------------------------------------
    function renderOtherContentsTable(wrapId, rows){
      const wrap = document.getElementById(wrapId);
      if (!wrap) return;

      if (!Array.isArray(rows) || !rows.length){
        wrap.innerHTML = '<div class="muted">표시할 기타내용이 없습니다.</div>';
        return;
      }

      // 항목 길이에 따라 1열 너비 자동 조절 위해 최대 길이 계산

      const colgroup = `
          <colgroup>
            <col style="width:1px">
            <col style="width:auto">
          </colgroup>
        `;

      let tbody = '';
      for (const r of rows){
        const item = r.item || '';
        const remarkHtml = r.extra || r['참고사항'] || '';

        tbody += `
          <tr>
            <td>${item}</td>
            <td>${remarkHtml}</td>
          </tr>
        `;
      }

      wrap.innerHTML = `
        <table class="result-table other-contents-table">
          ${colgroup}
          <tbody>${tbody}</tbody>
        </table>
      `;
    }


  // ---------------------------- 공통 API 호출 ----------------------------
  // 지역에 해당하는 업체 목록
  async function fetchCompanies(country, region){
    const url = `${BASE}/api/companies/by-region` +
                `?country=${encodeURIComponent(country)}` +
                `&region=${encodeURIComponent(region)}` +
                `&mode=options`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      throw new Error('companies fetch failed: ' + r.status);
    }
    const j = await r.json();
    // 백엔드에서 companies / options 둘 중 하나를 쓸 수 있으니 둘 다 체크
    return (j.companies || j.options || []).filter(Boolean);
  }
  
  // 업체/지역에 해당하는 POE 목록
  async function fetchPOEs(country, region, company){
    let url = `${BASE}/api/poe/by-company` +
              `?country=${encodeURIComponent(country)}` +
              `&region=${encodeURIComponent(region)}` +
              `&company=${encodeURIComponent(company)}` +
              `&mode=options`;
  
    let res = await fetch(url, { cache: 'no-store' });
  
    let j = null;
    if (res.ok) {
      j = await res.json().catch(() => null);
    }
  
    let poes = (j?.poes || j?.POE || j?.options || []).filter(Boolean);
  
    // 업체+지역으로는 값이 없으면, 지역 기준으로 fallback
    if (!poes.length){
      url = `${BASE}/api/poe/by-region` +
            `?country=${encodeURIComponent(country)}` +
            `&region=${encodeURIComponent(region)}` +
            `&mode=options`;
      res = await fetch(url, { cache: 'no-store' });
      j = await res.json().catch(() => null);
      poes = (j?.poes || j?.POE || j?.options || []).filter(Boolean);
    }
  
    return poes;
  }

// 업체(+지역) + POE 에 해당하는 화물타입 목록
async function fetchCargoTypes(country, region, company, poe){
  let url = `${BASE}/api/cargo-types/by-partner` +
            `?country=${encodeURIComponent(country)}` +
            `&company=${encodeURIComponent(company)}` +
            `&poe=${encodeURIComponent(poe)}`;

  if (region){
    url += `&region=${encodeURIComponent(region)}`;
  }
  url += `&mode=options`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok){
    throw new Error('cargo-types fetch failed: ' + res.status);
  }
  const j = await res.json().catch(() => null);
  const types = (j?.types || j?.options || []).filter(Boolean);
  return types;
}


// 기존 fetchCosts 함수를 아래 내용으로 교체
async function fetchCosts(country, region, company, cargo, type, cbm, poe){
  const roles = cargo ? [String(cargo).toUpperCase()] : [];
  const params = new URLSearchParams();
  
  params.set('type', type);
  params.set('company', company);
  if (region) params.set('region', region);
  if (poe) params.set('poe', poe);
  if (roles.length) params.set('roles', roles.join(','));
  if (!isNaN(cbm)) params.set('cbm', String(cbm));

  const baseUrl = `${BASE}/api/costs/${encodeURIComponent(country)}`;
  const url = `${baseUrl}?${params.toString()}`;

  // [수정] 이제 백엔드가 한 번에 다 처리하므로, 단순히 1번만 호출하면 됩니다.
  const res = await fetch(url, { cache:'no-store' });
  const j = await res.json();

  if (j.currency) {
    defaultCurrency.value = j.currency.toUpperCase();
  }
  return j;

  // --- 통화 처리 로직 (기존 유지) ---
  Object.assign(numberFormats, j?.numberFormats || {});

  const typeCurrency =
    (j?.currencyByType?.[type]) ||
    (j?.meta?.currencyByType?.[type]) ||
    (j?.columns?.[type]?.currency || j?.columns?.[type]?.currencyCode) ||
    (j?.headers?.[type]?.currency || j?.headers?.[type]?.currencyCode) || '';

  let inferredFromFmt = '';
  if (!typeCurrency) {
    const k = String(type || '');
    const nf = j?.numberFormats || {};
    const fmt = nf[k] || nf[k.toUpperCase()] || nf[k.toLowerCase()] || '';

    if (/dollar|usd/i.test(fmt))      inferredFromFmt = 'USD';
    else if (/won|krw/i.test(fmt))    inferredFromFmt = 'KRW';
    else if (/euro|eur/i.test(fmt))   inferredFromFmt = 'EUR';
    else if (/cad/i.test(fmt))        inferredFromFmt = 'CAD';
  }

  defaultCurrency.value = (
    j?.currency ||
    j?.currencyCode ||
    typeCurrency ||
    inferredFromFmt ||
    j?.meta?.currency ||
    j?.meta?.currencyCode ||
    ''
  ).toString();

  return j;
}

// ---------- collapsedSummary 업데이트 유틸 ----------
function setSummaryText(id, text){
  const el = document.getElementById(id);
  if (el) el.textContent = (text == null || text === '') ? '-' : String(text);
}
function buildCbmTypeText(type, cbm){
  const t = String(type || '').trim() || '20FT';
  if (!cbm && cbm !== 0) return t;
  return `${cbm} CBM / ${t}`; // "CBM/컨테이너" 칩 형식에 맞춤
}

  // ---------------------------- 컨트롤러 팩토리 ----------------------------
  function bindCompareOrchestratorOnce(){
  const btn = document.getElementById('btnFetchTwo');
  if (!btn || btn.dataset.boundCompare) return;
  btn.dataset.boundCompare = '1';

  btn.addEventListener('click', async (ev)=>{
    ev.preventDefault();
    btn.disabled = true;
    btn.classList.add('is-loading');
    try{
      const country = getValueSoft('countryCombo');
      const region  = getValueSoft('regionCombo');
      const type    = getValueSoft('typeCombo2') || '20FT';
      const cbmEl   = document.getElementById('cbmSelect2');
      const cbm = cbmEl?.value ? parseFloat(cbmEl.value) : undefined;


      const companyA = getValueSoft('companyComboA');
      const cargoA   = getValueSoft('cargoTypeComboA');
      const poeA     = getValueSoft('poeComboA');

      const companyB = getValueSoft('companyComboB');
      const cargoB   = getValueSoft('cargoTypeComboB');
      const poeB     = getValueSoft('poeComboB');

      if (!country){ alert('국가를 선택하세요.'); return; }
      if (!companyA || !companyB){ alert('비교할 두 업체를 모두 선택하세요.'); return; }

      // ✅ A/B를 병렬로 요청하고, 둘 다 끝난 뒤에 동시에 렌더
      const [jA, jB] = await Promise.all([
        fetchCosts(country, region, companyA, cargoA, type, cbm, poeA),
        fetchCosts(country, region, companyB, cargoB, type, cbm, poeB)
      ]);

      // ✅ A/B 동시 렌더 이후 — 요약칩 갱신
      setSummaryText('sumCountry', country || '-');
      setSummaryText('sumRegion',  region  || '-');
      setSummaryText('sumCbmType', buildCbmTypeText(type, cbm));

      // "파트너A/파트너B" 동시 표기
      const companyLabel = `${companyA || '-'} / ${companyB || '-'}`;
      setSummaryText('sumCompany', companyLabel);

      renderTableSingle('tableWrapA', jA, type, Boolean(region), cbm);
      renderTableSingle('tableWrapB', jB, type, Boolean(region), cbm);

      // -----------------------------------------------------------
      // [추가] A/B 각각 '기타내용' 테이블 렌더링 (One-Partner와 동일 로직)
      // -----------------------------------------------------------
      [
        { data: jA, wrapId: 'tableWrapA' },
        { data: jB, wrapId: 'tableWrapB' }
      ].forEach(({ data, wrapId }) => {
        // 1. 기타내용 행 필터링
        const otherRows = (data.rows || []).filter(r => {
          const disp = (r.displayType || r['표시타입'] || '').trim();
          return disp === '기타내용';
        });

        // 2. 출력할 div 찾기 또는 생성 (ID: tableWrapA_other 등)
        const otherWrapId = wrapId + '_other';
        let otherWrap = document.getElementById(otherWrapId);
        
        if (!otherWrap) {
          const baseWrap = document.getElementById(wrapId);
          if (baseWrap) {
            otherWrap = document.createElement('div');
            otherWrap.id = otherWrapId;
            otherWrap.style.marginTop = '2rem';
            // 테이블 래퍼 맨 끝에 추가
            baseWrap.appendChild(otherWrap);
          }
        }

        // 3. 테이블 그리기
        renderOtherContentsTable(otherWrapId, otherRows);
      });

      const headA = document.querySelector('#resultSectionCompare .compare-col:nth-child(1) .compare-head');
      const headB = document.querySelector('#resultSectionCompare .compare-col:nth-child(2) .compare-head');
      if (headA) headA.textContent = companyA || 'A';
      if (headB) headB.textContent = companyB || 'B';

      window.CurrencyConverter?.applyCurrent?.();

      // 비교 섹션 노출(단일 섹션은 숨김)
      const sec = document.getElementById('resultSectionCompare');
      if (sec){ sec.hidden = false; sec.classList.add('show'); }
      const one = document.getElementById('resultSection');
      if (one){ one.classList.remove('show'); one.hidden = true; }

      if (typeof window.collapseShell === 'function'){
        try{
          await window.collapseShell();
          document.getElementById('collapsedSummary')?.removeAttribute('hidden');
        }catch(_){}
      }
    }catch(e){
      console.error(e);
      alert('비교 조회 중 오류가 발생했습니다.');
    }finally{
      btn.disabled = false;
      btn.classList.remove('is-loading');
    }
  });
}

  function makeController(kind /* 'one' | 'A' | 'B' */){
    const ids = (kind === 'one') ? {
      company: 'companyCombo',
      poe: 'poeCombo',
      cargo: 'cargoTypeCombo',
      typeCombo: 'typeCombo',
      cbmSelect: 'cbmSelect',
      btnFetch: 'btnFetch',
      resultSection: 'resultSection',
      tableWrap: 'tableWrap'
    } : (kind === 'A' ? {
      company: 'companyComboA',
      poe: 'poeComboA',
      cargo: 'cargoTypeComboA',
      typeCombo: 'typeCombo2',
      cbmSelect: 'cbmSelect2',
      btnFetch: 'btnFetchTwo',
      resultSection: 'resultSectionCompare',
      tableWrap: 'tableWrapA'
    } : {
      company: 'companyComboB',
      poe: 'poeComboB',
      cargo: 'cargoTypeComboB',
      typeCombo: 'typeCombo2',
      cbmSelect: 'cbmSelect2',
      btnFetch: 'btnFetchTwo',
      resultSection: 'resultSectionCompare',
      tableWrap: 'tableWrapB'
    });

    function setTypeComboFixed(){
      const api = getComboAPI(ids.typeCombo);
      api.setItems(['20FT','40HC','CONSOLE']);
      api.enable(true);
    }
    function setCBMRange(){
      return; 
    }

    async function loadCompanies(){
      const country = getValueSoft('countryCombo');
      const region  = getValueSoft('regionCombo');
      const companyAPI = getComboAPI(ids.company);
      const poeAPI     = getComboAPI(ids.poe);

      companyAPI.setItems([]); companyAPI.enable(false);
      poeAPI.setItems([]);     poeAPI.enable(false);
      if(!country || !region) return;

      setComboLoading(ids.company, true);
      try{
        const companies = await fetchCompanies(country, region);
        companyAPI.setItems(companies);
        companyAPI.enable(companies.length>0);
      }catch(e){
        console.warn('loadCompanies error:', e);
        companyAPI.setItems([]); companyAPI.enable(false);
      }finally{
        setComboLoading(ids.company, false);
      }
    }

    async function loadPOEs(){
      const country = getValueSoft('countryCombo');
      const region  = getValueSoft('regionCombo');
      const company = getValueSoft(ids.company);
      const poeAPI  = getComboAPI(ids.poe);

      poeAPI.setValue?.('');
      if(!country || !region || !company) return;

      setComboLoading(ids.poe, true);
      try{
        const poes = await fetchPOEs(country, region, company);
        poeAPI.setItems(poes);
        poeAPI.enable(poes.length>0);
      }catch(e){
        console.warn('loadPOEs error:', e);
        poeAPI.setItems([]);
      }finally{
        setComboLoading(ids.poe, false);
      }
    }

    async function loadCargoTypesForPartner(){
      const country = getValueSoft('countryCombo');
      const region  = getValueSoft('regionCombo');
      const partner = getValueSoft(ids.company);
      const poe     = getValueSoft(ids.poe);   // 🔥 선택된 POE 값 가져오기
    
      const cargoAPI = getComboAPI(ids.cargo);
      cargoAPI.setValue?.('');
    
      // POE까지 선택되어 있어야 화물타입 로딩
      if (!country || !partner || !poe){
        cargoAPI.setItems([]);
        cargoAPI.enable(false);
        return;
      }
    
      setComboLoading(ids.cargo, true);
      try{
        const items = await fetchCargoTypes(country, region, partner, poe);
        cargoAPI.setItems(items);
        cargoAPI.enable(items.length>0);
      }catch(e){
        console.warn('loadCargoTypes error:', e);
        cargoAPI.setItems([]);
        cargoAPI.enable(false);
      }finally{
        setComboLoading(ids.cargo, false);
      }
    }


    function showResultSection(show){
      const sec = document.getElementById(ids.resultSection);
      if(!sec) return;
      if(show){
        sec.hidden = false;
        sec.classList.add('show');
        // 단일 섹션/비교 섹션 상호 배타 표시
        if (ids.resultSection === 'resultSectionCompare'){
          const one = document.getElementById('resultSection');
          if (one){ one.classList.remove('show'); one.hidden = true; }
        }else{
          const two = document.getElementById('resultSectionCompare');
          if (two){ two.classList.remove('show'); two.hidden = true; }
        }
      }else{
        sec.classList.remove('show');
        sec.hidden = true;
      }
    }

    function wireEvents(){
      const rcEl = document.querySelector('#regionCombo input') || document.getElementById('regionCombo');
      const ctEl = document.querySelector('#countryCombo input')|| document.getElementById('countryCombo');
      const compEl = document.querySelector(`#${ids.company} input`) || document.getElementById(ids.company);
      const poeEl  = document.querySelector(`#${ids.poe} input`) || document.getElementById(ids.poe);

      const resetAll = ()=>{
        const companyAPI = getComboAPI(ids.company);
        const poeAPI     = getComboAPI(ids.poe);
        const cargoAPI   = getComboAPI(ids.cargo);
        companyAPI.setItems([]); companyAPI.setValue?.(''); companyAPI.enable(false);
        poeAPI.setItems([]);     poeAPI.setValue?.('');     poeAPI.enable(false);
        cargoAPI.setItems([]);   cargoAPI.setValue?.('');   cargoAPI.enable(false);
      };

      rcEl?.addEventListener('change', async ()=>{ resetAll(); await loadCompanies(); });
      ctEl?.addEventListener('change', async ()=>{ resetAll(); await loadCompanies(); });

      compEl?.addEventListener('change', async ()=>{
        const poeAPI   = getComboAPI(ids.poe);
        const cargoAPI = getComboAPI(ids.cargo);
        poeAPI.setValue?.('');
        cargoAPI.setValue?.('');
        await loadPOEs();
        await loadCargoTypesForPartner();
      });

        // 🔥 POE 변경 시 화물타입 다시 로딩
        poeEl?.addEventListener('change', async ()=>{
          const cargoAPI = getComboAPI(ids.cargo);
          cargoAPI.setValue?.('');
          await loadCargoTypesForPartner();
        });
  


      // 조회 버튼
      const btn = document.getElementById(ids.btnFetch);

      if (ids.btnFetch === 'btnFetchTwo') return;

      const boundKey = `bound${kind}`;   // data-bound-one / data-bound-a / data-bound-b
      if (btn && !btn.dataset[boundKey]){
        btn.dataset[boundKey] = '1';
        btn.addEventListener('click', async (ev)=>{
          ev.preventDefault();

          // ✅ 버튼 로딩/비활성은 "공유 카운터"로 관리 (A/B가 동시에 돌아도 OK)
          btn.disabled = true;
          btn.classList.add('is-loading');
          btn.dataset.pending = String((+btn.dataset.pending || 0) + 1);

          try{
            const country = getValueSoft('countryCombo');
            const region  = getValueSoft('regionCombo');
            const company = getValueSoft(ids.company);
            const type    = getValueSoft(ids.typeCombo) || '20FT';
            const cbmSel  = document.getElementById(ids.cbmSelect);
            const cbm     = cbmSel?.value ? parseFloat(cbmSel.value) : undefined;
            const cargo   = getValueSoft(ids.cargo);

            const poe     = getValueSoft(ids.poe);

            if (!country){ alert('국가를 선택하세요.'); return; }
            if (!company){ alert('업체를 선택하세요.'); return; }

            const data = await fetchCosts(country, region, company, cargo, type, cbm, poe);

            // ✅ one-partner일 때 요약칩 채우기
            if (kind === 'one') {
              setSummaryText('sumCountry', country || '-');
              setSummaryText('sumRegion',  region  || '-');
              setSummaryText('sumCbmType', buildCbmTypeText(type, cbm));
              setSummaryText('sumCompany', company || '-');
            }

           renderTableSingle(ids.tableWrap, data, type, Boolean(region), cbm);
           // 🔥 표시타입 = '기타내용' 전용 표 렌더
            const otherRows = (data.rows || []).filter(r => {
              const disp = (r.displayType || r['표시타입'] || '').trim();
              return disp === '기타내용';
            });

            // 위치: 기존 표 아래 “tableWrap + '_other'” div에 출력
            const otherWrapId = ids.tableWrap + '_other';
            let otherWrap = document.getElementById(otherWrapId);
            if (!otherWrap){
              const baseWrap = document.getElementById(ids.tableWrap);
              if (baseWrap){
                otherWrap = document.createElement('div');
                otherWrap.id = otherWrapId;
                otherWrap.style.marginTop = '2rem';
                const baseWrap = document.getElementById(ids.tableWrap);
                const totalBox = baseWrap?.querySelector('.result-total');

                if (totalBox) {
                  totalBox.insertAdjacentElement('beforebegin', otherWrap);
                } else {
                  baseWrap.insertAdjacentElement('beforeend', otherWrap);
                }
              }
            }
          renderOtherContentsTable(otherWrapId, otherRows);

            window.CurrencyConverter?.applyCurrent?.();
            showResultSection(true); // resultSectionCompare 표시 유지

            if (typeof window.collapseShell === 'function'){
              try{
                await window.collapseShell();
                const bar = document.getElementById('collapsedSummary');
                if (bar) bar.hidden = false;
              }catch(_){}
            }
          }catch(e){
            console.error(e);
            alert('조회 중 오류가 발생했습니다.');
          }finally{
            // ✅ A/B 각각 끝날 때마다 pending 감소, 0이 되면 로딩/비활성 해제
            const left = (+btn.dataset.pending || 0) - 1;
            btn.dataset.pending = String(Math.max(0, left));
            if (left <= 0){
              btn.disabled = false;
              btn.classList.remove('is-loading');
            }
          }
        });
      }
    }

    function init(){
      setTypeComboFixed();
      setCBMRange();
      wireEvents();
      // 초기 선로딩
      if (getValueSoft('countryCombo') && getValueSoft('regionCombo')){
        loadCompanies();
      }
    }

    return { init, ids, loadCompanies, loadPOEs, loadCargoTypesForPartner };
  }

  // ---------------------------- 공개 API ----------------------------
  window.CostUI = window.CostUI || {};
  window.CostUI.one = makeController('one');
  window.CostUI.twoA= makeController('A');
  window.CostUI.twoB= makeController('B');

  document.addEventListener('DOMContentLoaded', bindCompareOrchestratorOnce);

})();
