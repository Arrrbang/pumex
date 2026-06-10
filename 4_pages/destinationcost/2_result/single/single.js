/* 2_result/single/single.js */
;(function(){
  'use strict';

  const BASE = 'https://notion-api-hub.vercel.app';

// ---------------------------- 공용 유틸 ----------------------------
  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;","<": "&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  }

  // ✨ 드롭다운 점 애니메이션을 기억할 전역 공간 추가
  window.__comboAnimations = window.__comboAnimations || new Map();

  // ✨ 기존 setComboLoading 함수를 점 애니메이션 버전으로 업그레이드!
  function setComboLoading(id, on){
    const root = document.getElementById(id);
    const input = root?.querySelector('input');
    if (!root) return;
    
    // (선택) 기존 CSS 빙글빙글 스피너용 클래스
    root.classList.toggle('is-loading', !!on);

    if (!input) return;

    if (on) {
      // 로딩 시작: 입력창 잠그고 점 애니메이션 시작
      input.disabled = true;
      if (window.__comboAnimations.has(input)) {
        clearInterval(window.__comboAnimations.get(input));
      }
      
      let dots = 0;
      input.value = '로딩중';
      const intervalId = setInterval(() => {
        dots = (dots + 1) % 4;
        input.value = '로딩중' + '.'.repeat(dots);
      }, 250); // 팝업과 동일하게 250ms의 빠른 속도!
      
      window.__comboAnimations.set(input, intervalId);
    } else {
      // 로딩 끝: 애니메이션 끄고 입력창 열기
      if (window.__comboAnimations.has(input)) {
        clearInterval(window.__comboAnimations.get(input));
        window.__comboAnimations.delete(input);
      }
      input.disabled = false;
      // 로딩 글씨 지워주기 (실제 값은 setItems 등에서 바로 덮어씌워짐)
      if (input.value.includes('로딩중')) input.value = ''; 
    }
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
    let val = Number(n);
    if (!Number.isFinite(val)) return '';
    if (val === 0) return '0';
    const fmt = getFmt(columnKey);
    if (/dollar|usd/i.test(fmt)) {
      return '$' + val.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
    }
    if (/won|krw/i.test(fmt)) {
      return '₩' + val.toLocaleString();
    }
    return val.toLocaleString();
  }

  window.CostUI = window.CostUI || {};
  window.CostUI.formatAmount = formatAmount;


function makeController(){
    // 단일 조회(one-partner) 전용 ID로 고정
    const ids = {
      company: 'companyCombo',
      poe: 'poeCombo',
      cargo: 'cargoTypeCombo',
      typeCombo: 'typeCombo',
      cbmSelect: 'cbmSelect',
      btnFetch: 'btnFetch',
      resultSection: 'resultSection',
      tableWrap: 'tableWrap'
    };

    async function loadContainerTypes(){
      const country = getValueSoft('countryCombo');
      const region  = getValueSoft('regionCombo');
      const company = getValueSoft(ids.company);
      const poe     = getValueSoft(ids.poe);
      const cargo   = getValueSoft(ids.cargo);

      const typeAPI = getComboAPI(ids.typeCombo);
      typeAPI.setValue?.('');

      if (!country || !company || !poe || !cargo) {
        typeAPI.setItems([]);
        typeAPI.enable(false);
        return;
      }

      setComboLoading(ids.typeCombo, true);

      try {
        const items = await window.CostAPI.fetchContainerTypes(country, region, company, poe, cargo);
        typeAPI.setItems(items);
        typeAPI.enable(items.length > 0);
      } catch (e) {
        typeAPI.setItems([]);
        typeAPI.enable(false);
      } finally {
        setComboLoading(ids.typeCombo, false);
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
        const companies = await window.CostAPI.fetchCompanies(country, region);
        companyAPI.setItems(companies);
        companyAPI.enable(companies.length>0);
      }catch(e){
        companyAPI.setItems([]); companyAPI.enable(false);
      }finally{
        setComboLoading(ids.company, false);
      }
    }

    async function loadPOEs(){
      const country = getValueSoft('countryCombo');
      const region  = getValueSoft('regionCombo');
      const company = getValueSoft(ids.company);
      const cargo   = getValueSoft(ids.cargo); // ✨ 화물타입(cargo) 값 가져오기 추가
      const poeAPI  = getComboAPI(ids.poe);

      poeAPI.setValue?.('');
      
      // ✨ cargo 조건 추가 (country, region, company, cargo가 모두 있어야 작동)
      if(!country || !region || !company || !cargo) {
        poeAPI.setItems([]);
        poeAPI.enable(false);
        return;
      }

      setComboLoading(ids.poe, true);
      try{
        // ✨ CostAPI.fetchPOEs 인자에 cargo 추가
        const poes = await window.CostAPI.fetchPOEs(country, region, company, cargo);
        poeAPI.setItems(poes);
        poeAPI.enable(poes.length>0);
      }catch(e){
        poeAPI.setItems([]);
        poeAPI.enable(false);
      }finally{
        setComboLoading(ids.poe, false);
      }
    }

    async function loadCargoTypesForPartner(){
      const country = getValueSoft('countryCombo');
      const region  = getValueSoft('regionCombo');
      const partner = getValueSoft(ids.company);
      // ✨ poe 가져오는 부분 삭제

      const cargoAPI = getComboAPI(ids.cargo);
      cargoAPI.setValue?.('');

      // ✨ poe 조건 삭제
      if (!country || !partner){
        cargoAPI.setItems([]);
        cargoAPI.enable(false);
        return;
      }

      setComboLoading(ids.cargo, true);
      try{
        // ✨ CostAPI.fetchCargoTypes 인자에서 poe 삭제
        const items = await window.CostAPI.fetchCargoTypes(country, region, partner);
        cargoAPI.setItems(items);
        cargoAPI.enable(items.length>0);
      }catch(e){
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
      const cargoEl = document.querySelector(`#${ids.cargo} input`) || document.getElementById(ids.cargo);

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

      // 1. 파트너(업체) 선택 시 -> 화물타입 로드
      compEl?.addEventListener('change', async ()=>{
        const poeAPI   = getComboAPI(ids.poe);
        const cargoAPI = getComboAPI(ids.cargo);
        const typeAPI  = getComboAPI(ids.typeCombo);

        // 하위 콤보박스 모두 초기화 및 잠금
        poeAPI.setValue?.('');
        poeAPI.setItems([]);
        poeAPI.enable(false);
        
        typeAPI.setValue?.('');
        typeAPI.setItems([]);
        typeAPI.enable(false);

        cargoAPI.setValue?.('');
        
        // ✨ 화물타입만 불러옵니다 (loadPOEs 삭제)
        await loadCargoTypesForPartner();
      });

      // 2. 화물타입 선택 시 -> POE 로드
      cargoEl?.addEventListener('change', async ()=>{
        const poeAPI  = getComboAPI(ids.poe);
        const typeAPI = getComboAPI(ids.typeCombo);

        // 하위 콤보박스 초기화
        typeAPI.setValue?.('');
        typeAPI.setItems([]);
        typeAPI.enable(false);

        poeAPI.setValue?.('');
        
        // ✨ 화물타입 선택 후 POE를 불러옵니다
        await loadPOEs();
      });

      // 3. POE 선택 시 -> 컨테이너 타입/CBM 로드
      poeEl?.addEventListener('change', async ()=>{
        const typeAPI = getComboAPI(ids.typeCombo);
        typeAPI.setValue?.('');
        
        // ✨ POE가 맨 마지막이므로 여기서 최종 컨테이너 타입을 불러옵니다
        await loadContainerTypes();
      });

      const btn = document.getElementById(ids.btnFetch);
      if (btn && !btn.dataset.bound){
        btn.dataset.bound = '1';
        btn.addEventListener('click', async (ev)=>{
          ev.preventDefault();

          btn.disabled = true;
          btn.classList.add('is-loading');

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

            const data = await window.CostAPI.fetchCosts(country, region, company, cargo, type, cbm, poe);

            Object.assign(numberFormats, data?.numberFormats || {});
            
            const typeCurrency =
              (data?.currencyByType?.[type]) || (data?.meta?.currencyByType?.[type]) ||
              (data?.columns?.[type]?.currency || data?.columns?.[type]?.currencyCode) ||
              (data?.headers?.[type]?.currency || data?.headers?.[type]?.currencyCode) || '';

            let inferredFromFmt = '';
            if (!typeCurrency) {
              const k = String(type || '');
              const nf = data?.numberFormats || {};
              const fmt = nf[k] || nf[k.toUpperCase()] || nf[k.toLowerCase()] || '';
              if (/dollar|usd/i.test(fmt))      inferredFromFmt = 'USD';
              else if (/won|krw/i.test(fmt))    inferredFromFmt = 'KRW';
              else if (/euro|eur/i.test(fmt))   inferredFromFmt = 'EUR';
              else if (/cad/i.test(fmt))        inferredFromFmt = 'CAD';
            }

            defaultCurrency.value = (
              data?.currency || data?.currencyCode || typeCurrency ||
              inferredFromFmt || data?.meta?.currency || data?.meta?.currencyCode || ''
            ).toString().toUpperCase();

            window.BottomBar.updateSummary(country, region, company, type, cbm);
            window.TableRenderer.render(ids.tableWrap, data, type, Boolean(region), cbm);
            window.BottomBar.initTotalCalculator(ids.tableWrap, 'totalDisplayOne', type);

            const btnOneClickA = document.getElementById('btnOneClickA');
            if (btnOneClickA) {
                btnOneClickA.textContent = `${company} 원클릭 견적`;
            }

            if (window.CurrencyConverter) {
              window.CurrencyConverter.init(); 
              window.CurrencyConverter.applyCurrent(); 
            }

            showResultSection(true); 

            if (typeof window.collapseShell === 'function'){
              try{
                await window.collapseShell();
                const bar = document.getElementById('collapsedSummary');
                if (bar) bar.hidden = false;
              }catch(_){}
            }

            // ✨ 화면이 "따닥" 하고 튀는 원인이었던 지연 스크롤(setTimeout) 제거!
            // 지도가 접히면서 빈 공간이 사라지면 결과창이 자연스럽게 맨 위로 올라오므로,
            // 엇박자 없이 깔끔하게 최상단으로 한 번만 맞춰줍니다.
            window.scrollTo({ top: 0, behavior: 'smooth' });

          }catch(e){
            console.error(e);
            alert('조회 중 오류가 발생했습니다.');
          }finally{
            btn.disabled = false;
            btn.classList.remove('is-loading');
          }
        });
      }
    }

    function init(){
      wireEvents();
      if (getValueSoft('countryCombo') && getValueSoft('regionCombo')){
        loadCompanies();
      }
    }

    return { init, ids, loadCompanies, loadPOEs, loadCargoTypesForPartner };
  }

  // ---------------------------- 공개 API ----------------------------
  window.CostUI = window.CostUI || {};
  window.CostUI.one = makeController();

})();