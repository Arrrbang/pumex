(() => {
  'use strict';
  const BASE='https://notion-api-hub.vercel.app';
  const status=document.getElementById('resultStatus'),retry=document.getElementById('retryResult');
  const query=new URLSearchParams(window.location.search);
  let currency='USD';
  window.DestRateResult = { query: new URLSearchParams(query), data: null };
  window.CostUI=window.CostUI || {};
  window.CostUI.formatAmount=n=>{
    if(n===null || n===undefined) return '-';
    const value=Number(n);if(!Number.isFinite(value))return '-';
    try{return new Intl.NumberFormat('ko-KR',{style:'currency',currency,maximumFractionDigits:currency==='KRW'?0:2}).format(value);}
    catch{return `${value.toLocaleString()} ${currency}`;}
  };
  async function load() {
    document.getElementById('resultFeedback').hidden=false;
    retry.hidden=true;status.textContent='비용을 조회하고 있습니다…';
    document.getElementById('currencySection').hidden=true;
    document.getElementById('tableWrap').replaceChildren();
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),60000);
    try {
      for(const key of ['countryId','region','company','cargo','portId','type','cbm'])if(!query.get(key))throw new Error('조회 조건이 없습니다. 조회 화면에서 다시 선택해 주세요.');
      const response=await fetch(`${BASE}/api/dest-rate/table?${query}`,{signal:abort.signal,cache:'no-store'});
      const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'비용 조회에 실패했습니다.');
      currency=data.currency;
      window.DestRateResult.data=data;
      window.TableRenderer.render('tableWrap',data,data.type,true,data.cbm,Object.fromEntries(query));
      window.BottomBar.updateSummary(data.country,data.region,data.company,data.type,data.cbm);
      try {
        const ids=JSON.parse(query.get('aChecks') || '[]');
        document.querySelectorAll('#tableWrap tr.row-extra').forEach(row => { if(ids.includes(row.dataset.rowId)) row.querySelector('input.extra-check').checked=true; });
      } catch {}
      window.BottomBar.initTotalCalculator('tableWrap','totalDisplayOne',data.type);
      document.getElementById('currencySection').hidden=!data.rows.length;
      const converter=window.CurrencyConverter;
      if(converter && data.rows.length) {
        try {
          await converter.init();
          await converter.applyCurrent();
        } catch(e) {
          console.warn('환율 변환 초기화 실패',e);
          document.getElementById('currencyRate').textContent='환율 조회 실패 · 원 통화';
        }
      } else {
        const select=document.getElementById('currencySelect');select.replaceChildren(new Option(currency,currency));select.disabled=true;
        document.getElementById('currencyRate').textContent='원 통화';
      }
      document.getElementById('tableWrap')._updateTotal?.();
      status.textContent='';
      document.getElementById('resultFeedback').hidden=true;
      document.dispatchEvent(new CustomEvent('dest-rate:result-ready'));
    } catch(e) {
      status.textContent=e.name==='AbortError'?'조회 시간이 초과되었습니다. 다시 시도해 주세요.':e.message;retry.hidden=false;
    } finally {clearTimeout(timer);}
  }
  retry.addEventListener('click',load);load();
})();
