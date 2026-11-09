(() => {
  'use strict';
  const API_BASE = 'https://notion-api-hub.vercel.app';
  const state = {deliveryRegion:null, arrivalPort:null};
  const $ = id => document.getElementById(id);
  const button = $('searchRates'), feedback = $('rateStatus'), results = $('rateResults');
  let request = null, version = 0;
  window.rateSearchPage = {getSelection:()=>JSON.parse(JSON.stringify(state))};
  async function json(path, signal) {
    const response = await fetch(API_BASE + path, {signal,cache:'no-store'});
    const data = await response.json();
    if (!response.ok || !data.ok) throw Error(data.error || `조회 실패 (${response.status})`);
    return data;
  }
  function resetResult() {
    version++; request?.abort(); request=null; window.RateHistory?.reset();window.RateRequest?.reset();window.RateForwarders?.reset();
    results.hidden=true; feedback.textContent=''; button.textContent='운임 조회';
    button.disabled=!(state.arrivalPort || (state.deliveryRegion && ports.length));
  }
  let ports=[], regionRequest=null, regionVersion=0, countryRequest=null;
  function setOptions(id, options, placeholder, onChange) {
    const select=$(id); select.tomselect?.destroy();
    select.replaceChildren(new Option(placeholder,''));
    const byValue=new Map(options.map(item=>[item.value,item]));
    options.forEach(item=>select.add(new Option(item.name,item.value)));
    select.disabled=!options.length;
    select.onchange=()=>onChange(byValue.get(select.value)||(id==='deliveryRegionSelect'?window.RateNearest?.resolve(select.value):null)||null);
    if((options.length||id==='arrivalPortSelect') && typeof window.TomSelect==='function')new window.TomSelect(select,{
      create:false,maxItems:1,maxOptions:null,placeholder,searchField:['text'],
      render:{no_results:()=>'<div class="no-results">일치하는 항목이 없습니다.</div>'}
    });
    if(id==='arrivalPortSelect'){
      if(select.tomselect)select.tomselect.enable();else select.disabled=false;
      select.tomselect?.on('type',query=>{
        const q=query.trim();const noMatch=q&&!options.some(item=>item.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()));
        $('requestUnknownPort').hidden=!noMatch;
        $('requestUnknownPort').dataset.poe=noMatch?q:'';
        if(noMatch){if(!window.RateRequest?.isVisible())resetResult();window.RateRequest?.show({poe:q,reason:'목록에 없는 도착항구입니다. 운임 요청을 등록할 수 있습니다.'});}
        else if(window.RateRequest?.isVisible()){resetResult();}
      });
    }
  }
  function clearPort() {
    const select=$('arrivalPortSelect');
    if(select.tomselect)select.tomselect.clear(true);else select.value='';
    state.arrivalPort=null;$('requestUnknownPort').hidden=true;
  }
  async function loadRegions() {
    const countryId=$('countrySelect').value;
    window.RateNearest?.reset();
    const current=++regionVersion;regionRequest?.abort();state.deliveryRegion=null;resetResult();
    $('retryRegions').hidden=true;$('deliveryRegionStatus').textContent='';
    setOptions('deliveryRegionSelect',[],countryId?'지역 조회중…':'국가를 먼저 선택하세요',()=>{});
    if(!countryId)return;
    const abort=new AbortController();regionRequest=abort;const timer=setTimeout(()=>abort.abort(),60000);
    try {
      const data=await json(`/api/rate-search/countries/${encodeURIComponent(countryId)}/tariff-regions`,abort.signal);
      if(current!==regionVersion)return;
      if(!Array.isArray(data.options))throw Error('지역 목록 응답이 올바르지 않습니다.');
      setOptions('deliveryRegionSelect',data.options,'배송지역을 선택하세요',item=>{
        window.RateNearest?.cancel();state.deliveryRegion=item;if(item)clearPort();resetResult();
        $('deliveryRegionStatus').textContent='';
      });
      $('deliveryRegionStatus').textContent='';
      window.RateNearest?.attach({
        select:$('deliveryRegionSelect'),countryId,countryName:$('countrySelect').selectedOptions[0]?.textContent||'',
        regions:data.options,
        onChoose:item=>{state.deliveryRegion=item;clearPort();resetResult();}
      });
    }catch(error){if(current!==regionVersion)return;$('deliveryRegionStatus').textContent=error.name==='AbortError'?'지역 조회 시간이 초과되었습니다.':error.message;$('retryRegions').hidden=false;}
    finally{clearTimeout(timer);}
  }
  async function loadCountries() {
    countryRequest?.abort();const abort=new AbortController();countryRequest=abort;
    const timer=setTimeout(()=>abort.abort(),60000);$('retryCountries').hidden=true;
    setOptions('countrySelect',[],'국가 조회중…',()=>{});
    try {
      const data=await json('/api/dest-rate/countries',abort.signal);
      if(!Array.isArray(data.countries))throw Error('국가 목록 응답이 올바르지 않습니다.');
      setOptions('countrySelect',data.countries.map(item=>({...item,value:item.id})),'국가를 선택하세요',()=>{clearPort();loadRegions();});
      $('countryStatus').textContent='';
    }catch(error){$('countryStatus').textContent=error.name==='AbortError'?'국가 조회 시간이 초과되었습니다.':error.message;$('retryCountries').hidden=false;}
    finally{clearTimeout(timer);}
  }
  async function loadPorts() {
    $('retryPorts').hidden=true;
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),60000);
    try {
      const data=await json('/api/rate-search/arrival-ports',abort.signal);
      if(!Array.isArray(data.options))throw Error('항구 목록 응답이 올바르지 않습니다.');
      ports=data.options;
      setOptions('arrivalPortSelect',ports,'도착항구를 선택하세요',item=>{
        $('requestUnknownPort').hidden=true;state.arrivalPort=item;
        if(item){window.RateNearest?.cancel();const select=$('deliveryRegionSelect');if(select.tomselect)select.tomselect.clear(true);else select.value='';state.deliveryRegion=null;}
        resetResult();
      });
      $('arrivalPortStatus').textContent=`도착항구 ${ports.length}개`;
      resetResult();
    }catch(error){$('arrivalPortStatus').textContent=error.name==='AbortError'?'항구 조회 시간이 초과되었습니다.':error.message;$('retryPorts').hidden=false;}
    finally{clearTimeout(timer);}
  }
  function average(rows,field){
    const values=rows.map(row=>row[field]).filter(value=>typeof value==='number'&&Number.isFinite(value)&&value>0);
    return {value:values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null,count:values.length};
  }
  function render(selection, rows){
    const tr=document.createElement('tr');
    const name=document.createElement('th');name.scope='row';name.textContent=selection.name;tr.appendChild(name);
    for(const field of ['dr20','hc40']){
      const result=average(rows,field),td=document.createElement('td');
      const amount=document.createElement('strong');
      amount.textContent=result.value===null?'등록 운임 없음':`$${result.value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
      const count=document.createElement('small');count.textContent=`평균 산정 ${result.count}건`;
      td.append(amount,count);tr.appendChild(td);
    }
    $('averageRateBody').appendChild(tr);results.hidden=false;
  }
  button.addEventListener('click',async()=>{
    const selection=state.deliveryRegion||state.arrivalPort;if(!selection)return;
    // USATL은 (BUS)USATL(VIA LA), (BUS)USATL(VIA SAV) 항구를 모두 포함합니다.
    const matchedPorts=state.deliveryRegion
      ? ports.filter(port=>(selection.poes||[]).some(poe=>poe && (port.codes||[]).some(code=>code.includes(poe))))
      : [selection];
    const codes=[...new Set(matchedPorts.flatMap(port=>port.codes||[]).map(code=>String(code).trim()).filter(Boolean))];
    resetResult();
    if(!codes.length){window.RateRequest?.show({poe:selection.name,reason:'연결된 POE가 없어 운임을 조회할 수 없습니다.'});return;}
    const current=++version, abort=new AbortController();request=abort;
    const timer=setTimeout(()=>abort.abort(),90000);
    button.disabled=true;button.textContent='조회중…';feedback.textContent='해상운임을 조회하고 있습니다.';
    try{
      // 원본 PORT CODE의 (BUS)/(INC)/(VIA ...)를 보존해 부킹메일과 같은 API로 조회.
      // 최대 3개 요청씩 처리하고, 다중 POE/포워더에 중복된 노션 운임 행은 한 번만 평균에 포함.
      const rows=new Map(), byCode=new Map();let cursor=0;
      async function worker(){while(cursor<codes.length){
        const code=codes[cursor++];
        const data=await json(`/api/mail/booking/rates?poe=${encodeURIComponent(code)}`,abort.signal);
        if(!Array.isArray(data.rates))throw Error('운임 응답 형식이 올바르지 않습니다.');
        byCode.set(code,data.rates);
        for(const row of data.rates){if(!row.id)throw Error('운임 행 ID가 없습니다.');rows.set(row.id,row);}
      }}
      await Promise.all(Array.from({length:Math.min(3,codes.length)},()=>worker()));
      if(current!==version)return;
      const hasPrice=[...rows.values()].some(row=>['dr20','hc40'].some(key=>typeof row[key]==='number'&&Number.isFinite(row[key])&&row[key]>0));
      if(!hasPrice){feedback.textContent='';window.RateRequest?.show({poe:selection.name,reason:'등록된 운임이 없습니다. 운임 요청을 등록해 주세요.'});return;}
      $('averageRateBody').replaceChildren();
      for(const port of matchedPorts){
        const unique=new Map();
        for(const code of port.codes||[])for(const row of byCode.get(code)||[])unique.set(row.id,row);
        render(port,[...unique.values()]);
      }
      window.RateHistory?.load(matchedPorts);
      window.RateForwarders?.render(matchedPorts,byCode);
      feedback.textContent=rows.size?`${selection.name} · 운임 ${rows.size}건 조회 완료`:'등록된 운임이 없습니다.';
    }catch(error){
      abort.abort();
      if(current!==version)return;
      window.RateHistory?.reset();results.hidden=true;feedback.textContent='';
      window.RateRequest?.show({poe:selection.name,reason:error.name==='AbortError'?'운임 조회 시간이 초과되었습니다. 다시 조회하거나 운임 요청을 등록할 수 있습니다.':`운임 조회에 실패했습니다. (${error.message}) 다시 조회하거나 운임 요청을 등록할 수 있습니다.`});
    }finally{
      clearTimeout(timer);
      if(current===version){request=null;button.disabled=false;button.textContent='운임 조회';}
    }
  });
  $('requestUnknownPort').addEventListener('click',()=>{resetResult();window.RateRequest?.show({poe:$('requestUnknownPort').dataset.poe,reason:'목록에 없는 도착항구입니다.'});});
  $('retryCountries').addEventListener('click',loadCountries);
  $('retryRegions').addEventListener('click',loadRegions);
  $('retryPorts').addEventListener('click',loadPorts);
  setOptions('deliveryRegionSelect',[],'국가를 먼저 선택하세요',()=>{});
  loadCountries();loadPorts();
})();
