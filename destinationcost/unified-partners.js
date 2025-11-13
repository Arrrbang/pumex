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
  function renderTableSingle(wrapId, data, type, isRegionFiltered){
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    let rows = Array.isArray(data?.rows) ? data.rows : [];
    rows = sortByOrder(rows);
    if (!rows.length){
      wrap.innerHTML = '<div class="muted">표시할 데이터가 없습니다.</div>';
      return;
    }
    let thead = '<tr><th>항목</th>';
    if (!isRegionFiltered) thead += '<th>지역</th>';
    thead += `<th class="type-col">${esc(type)}</th><th>비고</th></tr>`;

    let tbody = '';
    for (const r of rows){
      const amt = r?.[type];
      const amtText = formatAmount(amt, type) || '-';
      tbody += '<tr>';
      tbody += `<td>${esc(r.item || '')}</td>`;
      if (!isRegionFiltered) tbody += `<td>${esc(r.region || '')}</td>`;
      tbody += `<td class="amt">${amtText}</td>`;
      tbody += `<td>${r.extra || ''}</td>`;
      tbody += '</tr>';
    }
    wrap.innerHTML = `<table class="result-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  }

  // ---------------------------- 공통 API 호출 ----------------------------
  async function fetchCompanies(country, region){
    const url = `${BASE}/api/companies/by-region?country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}&mode=options`;
    const r = await fetch(url, {cache:'no-store'});
    const j = await r.json();
    return (j.companies || []).filter(Boolean);
  }
  async function fetchPOEs(country, region, company){
    let url = `${BASE}/api/poe/by-company?country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}&company=${encodeURIComponent(company)}&mode=options`;
    let res = await fetch(url, {cache:'no-store'});
    if (!res.ok){
      // fall-through
    }
    let j = await res.json().catch(()=>null);
    let poes = (j?.poes || j?.POE || j?.options || []).filter(Boolean);

    if (!poes.length){
      url = `${BASE}/api/poe/by-region?country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}&mode=options`;
      res = await fetch(url, {cache:'no-store'});
      j = await res.json().catch(()=>null);
      poes = (j?.poes || j?.POE || j?.options || []).filter(Boolean);
    }
    return poes;
  }
  async function fetchCargoTypes(country, region, partner){
    const list = [];
    const bucket = new Set();

    // 1차: cargo-types 서비스
    let url = `${BASE}/api/cargo-types/by-partner?country=${encodeURIComponent(country)}&company=${encodeURIComponent(partner)}${region?`&region=${encodeURIComponent(region)}`:''}&mode=options`;
    let r = await fetch(url, {cache:'no-store'});
    if (r.ok){
      const j = await r.json();
      (j.types || j.options || []).forEach(x => x && bucket.add(String(x)));
    }

    // 보강: 비용 데이터에서 추출
    if (!bucket.size){
      url = `${BASE}/api/costs/${encodeURIComponent(country)}?company=${encodeURIComponent(partner)}${region?`&region=${encodeURIComponent(region)}`:''}&mode=data`;
      r = await fetch(url, {cache:'no-store'});
      const j = await r.json().catch(()=>({}));
      const rows = j?.rows || j?.data || j?.items || j?.results || [];
      for (const row of rows){
        const ms = row?.properties?.["화물타입"]?.multi_select || [];
        ms.forEach(it => it?.name && bucket.add(it.name));
        if (Array.isArray(row?.roles))      row.roles.forEach(x => x && bucket.add(String(x)));
        if (Array.isArray(row?.cargoTypes)) row.cargoTypes.forEach(x => x && bucket.add(String(x)));
        if (row?.cargoType)                 bucket.add(String(row.cargoType));
      }
    }

    return [...bucket].sort((a,b)=> a.localeCompare(b,'ko'));
  }
  async function fetchCosts(country, region, company, cargo, type, cbm){
    const roles = cargo ? [String(cargo).toUpperCase()] : [];
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('company', company);
    if (region) params.set('region', region);
    if (roles.length) params.set('roles', roles.join(','));
    if (!isNaN(cbm)) params.set('cbm', String(cbm));

    const baseUrl = `${BASE}/api/costs/${encodeURIComponent(country)}`;
    const url = `${baseUrl}?${params.toString()}`;
    const res = await fetch(url, { cache:'no-store' });
    const j   = await res.json();

    // 지역 선택 시 공란 지역 병합
    if (region){
      const paramsAll = new URLSearchParams(params);
      paramsAll.delete('region');
      const resAll = await fetch(`${baseUrl}?${paramsAll.toString()}`, { cache:'no-store' });
      const jAll   = await resAll.json().catch(()=>({}));
      const emptyRows = (Array.isArray(jAll?.rows) ? jAll.rows : []).filter(isEmptyRegionRow);
      const primRows  = Array.isArray(j?.rows) ? j.rows : [];
      j.rows = mergeRowsKeepingOrder(primRows, emptyRows);
    }

    // 통화 메타
    Object.assign(numberFormats, j?.numberFormats || {});
    const typeCurrency =
      (j?.currencyByType?.[type]) ||
      (j?.meta?.currencyByType?.[type]) ||
      (j?.columns?.[type]?.currency || j?.columns?.[type]?.currencyCode) ||
      (j?.headers?.[type]?.currency || j?.headers?.[type]?.currencyCode) || '';
    defaultCurrency.value = (
      j?.currency || j?.currencyCode || typeCurrency || j?.meta?.currency || j?.meta?.currencyCode || ''
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
      const cbm     = cbmEl?.value ? Number(cbmEl.value) : undefined;

      const companyA = getValueSoft('companyComboA');
      const cargoA   = getValueSoft('cargoTypeComboA');
      const companyB = getValueSoft('companyComboB');
      const cargoB   = getValueSoft('cargoTypeComboB');

      if (!country){ alert('국가를 선택하세요.'); return; }
      if (!companyA || !companyB){ alert('비교할 두 업체를 모두 선택하세요.'); return; }

      // ✅ A/B를 병렬로 요청하고, 둘 다 끝난 뒤에 동시에 렌더
      const [jA, jB] = await Promise.all([
        fetchCosts(country, region, companyA, cargoA, type, cbm),
        fetchCosts(country, region, companyB, cargoB, type, cbm)
      ]);

      // ✅ A/B 동시 렌더 이후 — 요약칩 갱신
      setSummaryText('sumCountry', country || '-');
      setSummaryText('sumRegion',  region  || '-');
      setSummaryText('sumCbmType', buildCbmTypeText(type, cbm));

      // "파트너A/파트너B" 동시 표기
      const companyLabel = `${companyA || '-'} / ${companyB || '-'}`;
      setSummaryText('sumCompany', companyLabel);

      renderTableSingle('tableWrapA', jA, type, Boolean(region));
      renderTableSingle('tableWrapB', jB, type, Boolean(region));

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
      const values = Array.from({length:60}, (_,i)=> i + 1);
      const sel = document.getElementById(ids.cbmSelect);
      if (sel){
        sel.innerHTML = [
          `<option value="" disabled selected hidden>CBM 선택</option>`,
          ...values.map(v => `<option value="${v}">${v}</option>`)
        ].join('');
      }
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

      const cargoAPI = getComboAPI(ids.cargo);
      cargoAPI.setValue?.('');
      if (!country || !partner){ cargoAPI.setItems([]); cargoAPI.enable(false); return; }

      setComboLoading(ids.cargo, true);
      try{
        const items = await fetchCargoTypes(country, region, partner);
        cargoAPI.setItems(items);
        cargoAPI.enable(items.length>0);
      }catch(e){
        console.warn('loadCargoTypes error:', e);
        cargoAPI.setItems([]); cargoAPI.enable(false);
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
            const cbm     = cbmSel?.value ? Number(cbmSel.value) : undefined;
            const cargo   = getValueSoft(ids.cargo);

            if (!country){ alert('국가를 선택하세요.'); return; }
            if (!company){ alert('업체를 선택하세요.'); return; }

            const data = await fetchCosts(country, region, company, cargo, type, cbm);

            // ✅ one-partner일 때 요약칩 채우기
            if (kind === 'one') {
              setSummaryText('sumCountry', country || '-');
              setSummaryText('sumRegion',  region  || '-');
              setSummaryText('sumCbmType', buildCbmTypeText(type, cbm));
              setSummaryText('sumCompany', company || '-');
            }

            renderTableSingle(ids.tableWrap, data, type, Boolean(region)); // ← A는 tableWrapA, B는 tableWrapB
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
