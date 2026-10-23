(() => {
  'use strict';
  const api=window.DestRateAPI,q=new URLSearchParams(location.search),original=api.read(q);
  let target={...original,company:q.get('b_company')||'',cargo:q.get('b_cargo')||'',portId:q.get('b_portId')||''};
  const status=document.getElementById('compareStatus'),retry=document.getElementById('compareRetry');
  let dataA,dataB,version=0,request;
  function format(value,currency) {
    if(value===null||value===undefined)return '-';
    try{return new Intl.NumberFormat('ko-KR',{style:'currency',currency,maximumFractionDigits:currency==='KRW'?0:2}).format(value);}
    catch{return `${Number(value).toLocaleString()} ${currency}`;}
  }
  function restoreFromUrl() {try{return JSON.parse(q.get('aChecks')||'[]');}catch{return [];}}
  function notifyMenu() { document.dispatchEvent(new CustomEvent('dest-rate:compare-ready')); }
  window.DestRateComparison = {
    original,
    getData: () => dataA,
    changeTarget(selection) {
      target=selection;
      for(const key of ['company','cargo','portId'])q.set(`b_${key}`,selection[key]);
      q.set('aChecks',JSON.stringify(api.checkedIds('tableWrapA')));
      history.replaceState(null,'',`${location.pathname}?${q}`);load();
    }
  };
  async function load() {
    const current=++version;request?.abort();request=new AbortController();
    status.hidden=false;status.textContent='두 업체의 비용을 조회하고 있습니다…';retry.hidden=true;
    try {
      for(const selection of [original,target])for(const key of ['countryId','region','company','cargo','portId','type','cbm'])if(!selection[key])throw Error('비교 조건이 없습니다. 단일 결과에서 비교 업체를 다시 선택해 주세요.');
      const [a,b]=await Promise.all([api.costs(original,request.signal),api.costs(target,request.signal)]);
      if(current!==version)return;
      dataA=a;dataB=b;
      for(const [wrapId,data] of [['tableWrapA',a],['tableWrapB',b]]) {
        window.CostUI={formatAmount:value=>format(value,data.currency)};
        window.TableRenderer.render(wrapId,data,data.type,true,data.cbm);
      }
      api.restoreChecks('tableWrapA',restoreFromUrl());
      const text=(id,value)=>document.getElementById(id).textContent=value;
      text('titleA',`${a.company} · ${a.poe}`);text('titleB',`${b.company} · ${b.poe}`);
      text('cmpRegion',a.region);text('cmpCountry',a.country);text('cmpCbmType',`${a.cbm} CBM / ${a.type}`);
      text('cmpPartnerA',a.company);text('cmpPartnerB',b.company);
      for(const side of ['A','B'])window.BottomBar.initTotalCalculator(`tableWrap${side}`,`totalDisplay${side}`,original.type);
      document.getElementById('compareBottomBar').hidden=false;
      if(window.CurrencyConverter) {
        try {await window.CurrencyConverter.init();await window.CurrencyConverter.applyCurrent();}
        catch(e){console.warn(e);status.textContent='환율 변환 초기화에 실패했습니다. 원 통화 금액을 확인해 주세요.';}
      } else {
        for(const [side,data] of [['A',a],['B',b]]) {
          const select=document.getElementById(`currencySelect${side}`);select.replaceChildren(new Option(data.currency,data.currency));select.disabled=true;
          text(`currencyRate${side}`,'원 통화');
        }
      }
      for(const side of ['A','B'])document.getElementById(`tableWrap${side}`)._updateTotal?.();
      if(status.textContent==='두 업체의 비용을 조회하고 있습니다…')status.hidden=true;
      notifyMenu();
    } catch(e) {
      if(current!==version)return;
      status.hidden=false;status.textContent=e.name==='AbortError'?'요청 시간이 초과되었습니다. 다시 조회해 주세요.':e.message;retry.hidden=false;
    }
  }
  retry.addEventListener('click',load);notifyMenu();load();
})();
