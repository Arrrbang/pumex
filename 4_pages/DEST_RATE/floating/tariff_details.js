/* 결과표 타리프 행의 상세 본문을 비동기로 확인하고, 내용이 있을 때 버튼을 표시합니다. */
(() => {
  'use strict';
  const base='https://notion-api-hub.vercel.app';
  const active=new WeakMap();
  async function attach(wrap, rows, selection) {
    active.get(wrap)?.abort();wrap.querySelectorAll('.tariff-detail-button,.tariff-detail-error').forEach(el=>el.remove());const controller=new AbortController();active.set(wrap,controller);
    const context={...selection},rowIds=new Set(rows.map(r=>r.id).filter(Boolean));
    const timer=setTimeout(()=>controller.abort(),60000);
    try {
      const response=await fetch(`${base}/api/dest-rate/tariff-details/check`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selection:context}),signal:controller.signal,cache:'no-store'});
      const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'상세 내용 확인에 실패했습니다.');
      if(active.get(wrap)!==controller)return;
      let failed=false;
      for(const row of wrap.querySelectorAll('tr[data-row-id]')) {
        const id=row.dataset.rowId;if(!rowIds.has(id))continue;
        if(data.results[id]===null || !(id in data.results)){failed=true;continue;}
        if(!data.results[id])continue;
        const title=row.querySelector('.item-title');if(!title)continue;
        const button=document.createElement('button');button.type='button';button.className='tariff-detail-button';button.textContent='세부확인';
        button.addEventListener('click',e=>{e.stopPropagation();window.DestDocumentPopup.openTariff({id,title:rows.find(x=>x.id===id)?.item||'상세 내용',url:`https://www.notion.so/${id.replace(/-/g,'')}`},context);});title.appendChild(button);
      }
      if(failed)showError('일부 항목의 상세 내용을 확인하지 못했습니다.');
    }catch(e){if(active.get(wrap)===controller)showError(e.name==='AbortError'?'상세 내용 확인 시간이 초과되었습니다.':e.message);}
    finally{clearTimeout(timer);}
    function showError(message){const notice=document.createElement('div');notice.className='tariff-detail-error';notice.setAttribute('role','status');notice.textContent=message+' ';const retry=document.createElement('button');retry.type='button';retry.textContent='다시 확인';retry.onclick=()=>{notice.remove();attach(wrap,rows,context);};notice.appendChild(retry);wrap.prepend(notice);}
  }
  window.DestTariffDetails={attach};
})();
