(() => {
  'use strict';
  const BASE='https://notion-api-hub.vercel.app';
  const fields=['countryId','region','company','cargo','portId','type','cbm'];
  function read(query= new URLSearchParams(location.search)) {
    return Object.fromEntries(fields.map(key=>[key,query.get(key)||'']));
  }
  function params(selection){return new URLSearchParams(fields.map(key=>[key,String(selection[key]||'')]));}
  async function json(path,signal) {
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),60000);
    const cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});
    if(signal?.aborted)abort.abort();
    try {
      const r=await fetch(`${BASE}${path}`,{cache:'no-store',signal:abort.signal});
      const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'조회에 실패했습니다.');return data;
    } finally {clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
  }
  window.DestRateAPI={read,params,
    costs:(selection,signal)=>json(`/api/dest-rate/table?${params(selection)}`,signal),
    options:(selection,stage,signal)=>{
      const q=new URLSearchParams({stage,region:selection.region});
      for(const key of ['company','cargo','portId','type'])if(selection[key])q.set(key,selection[key]);
      return json(`/api/dest-rate/countries/${encodeURIComponent(selection.countryId)}/tariff-options?${q}`,signal);
    },
    checkedIds:wrapId=>[...document.querySelectorAll(`#${wrapId} tr.row-extra`)].filter(row=>row.querySelector('input.extra-check')?.checked).map(row=>row.dataset.rowId).filter(Boolean),
    restoreChecks:(wrapId,ids)=>document.querySelectorAll(`#${wrapId} tr.row-extra`).forEach(row=>{row.querySelector('input.extra-check').checked=ids.includes(row.dataset.rowId);})
  };
})();
