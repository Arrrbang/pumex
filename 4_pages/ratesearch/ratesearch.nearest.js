/* 지도 없이 기존 국가별 좌표 API + 명시적 주소 검색으로 가장 가까운 타리프 지역을 선택합니다. */
(() => {
  'use strict';
  const BASE='https://notion-api-hub.vercel.app';
  const status=document.getElementById('deliveryRegionStatus');
  const cache=new Map();let context=null,version=0,request=null,busy=false,queue=Promise.resolve(),nextStart=0;
  const normalized=value=>String(value||'').trim().toLocaleLowerCase();
  const valid=p=>typeof p.lat==='number'&&typeof p.lng==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
  function distance(a,b){const rad=n=>n*Math.PI/180;const d=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lng-a.lng)/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,d)));}
  function cancel(){version++;request?.abort();request=null;busy=false;if(context){context.button.disabled=false;context.button.textContent='검색';context.list.replaceChildren();}}
  function reset(){cancel();context?.panel.remove();context=null;}
  async function json(url,signal){const r=await fetch(url,{signal,headers:{Accept:'application/json'}});const data=await r.json();if(!r.ok)throw Error(data.error||'지역 검색에 실패했습니다.');return data;}
  // 자동완성 요청 없이 버튼을 누른 경우에만 검색. 동일 요청 캐시 및 요청 간격 확보.
  function geocode(params,signal){
    const q=new URLSearchParams({format:'json',addressdetails:'1',limit:'5',...params});const key=q.toString();
    if(cache.has(key))return Promise.resolve(cache.get(key));
    const task=queue.catch(()=>{}).then(async()=>{
      if(signal.aborted)throw new DOMException('취소됨','AbortError');
      if(cache.has(key))return cache.get(key);
      await new Promise(resolve=>setTimeout(resolve,Math.max(0,nextStart-Date.now())));
      if(signal.aborted)throw new DOMException('취소됨','AbortError');
      nextStart=Date.now()+1100;
      const result=await json(`https://nominatim.openstreetmap.org/search?${q}`,signal);
      if(!Array.isArray(result))throw Error('주소 검색 응답이 올바르지 않습니다.');
      cache.set(key,result);if(cache.size>200)cache.delete(cache.keys().next().value);return result;
    });queue=task;return task;
  }
  async function search(){
    if(!context||busy)return;
    const ctx=context,query=ctx.input.value.trim();if(!query){status.textContent='검색할 지역 또는 주소를 입력해 주세요.';ctx.input.focus();return;}
    cancel();busy=true;const current=version,abort=new AbortController();request=abort;
    const timer=setTimeout(()=>abort.abort(),60000);
    status.textContent='위치 검색중…';ctx.button.disabled=true;ctx.button.textContent='검색중…';ctx.control?.close();
    try{
      // 대표 DB의 표시명(예: 미국(UNITED STATES OF AMERICA))을 지오코더에 그대로 전달하지 않습니다.
      const cleanCountry=ctx.countryName.replace(/\([^)]*\)/g,' ').replace(/（[^）]*）/g,' ').trim();
      const alias=ctx.countryName.match(/\(([^)]*)\)/)?.[1]?.trim();
      let countryHits=await geocode({country:cleanCountry||alias||ctx.countryName,limit:'1'},abort.signal);
      if(!countryHits.length && alias && alias!==cleanCountry)countryHits=await geocode({country:alias,limit:'1'},abort.signal);
      const countryCode=countryHits[0]?.address?.country_code;
      if(!/^[a-z]{2}$/i.test(countryCode||''))throw Error(`국가 검색 실패: ${ctx.countryName}. 대표 DB의 국가명을 확인해 주세요.`);
      const hits=await geocode({q:query,countrycodes:countryCode},abort.signal);
      if(current!==version||context!==ctx)return;
      const matches=hits.filter(hit=>valid({lat:Number(hit.lat),lng:Number(hit.lon)})&&hit.address?.country_code?.toLowerCase()===countryCode.toLowerCase());
      if(!matches.length)throw Error('선택한 국가에서 위치를 찾지 못했습니다. 도시·주 또는 주소를 더 자세히 입력해 주세요.');
      for(const hit of matches){
        const button=document.createElement('button');button.type='button';button.className='nearest-location-option';button.textContent=hit.display_name;
        button.addEventListener('click',()=>{
          if(current!==version||context!==ctx)return;
          return choose(ctx,hit);
        });ctx.list.appendChild(button);
      }
      status.textContent='검색 결과에서 정확한 위치를 선택해 주세요.';

    }catch(error){if(current!==version||context!==ctx)return;status.textContent=error.name==='AbortError'?'가까운 지역 조회 시간이 초과되었습니다. 다시 시도해 주세요.':error.message;}
    finally{clearTimeout(timer);if(current===version){request=null;busy=false;ctx.button.disabled=false;ctx.button.textContent='검색';}}
  }
  async function choose(ctx,hit){
    if(busy||context!==ctx)return;
    cancel();busy=true;const current=version,abort=new AbortController();request=abort;
    const timer=setTimeout(()=>abort.abort(),60000);ctx.button.disabled=true;
    status.textContent='선택한 위치에서 가장 가까운 등록 지역을 조회중…';
    try {
      const locations=await json(`${BASE}/api/dest-rate/countries/${encodeURIComponent(ctx.countryId)}/regions`,abort.signal);
      if(current!==version||context!==ctx)return;
      if(!locations.ok||!Array.isArray(locations.regions))throw Error(locations.error||'등록 지역의 좌표를 가져오지 못했습니다.');
      const available=new Map(ctx.regions.map(region=>[normalized(region.name),region]));
      const candidates=locations.regions.filter(valid).map(point=>({...point,tariff:available.get(normalized(point.name))})).filter(point=>point.tariff);
      if(!candidates.length)throw Error('타리프 지역과 이름이 일치하는 유효한 좌표가 없습니다.');
    const origin={lat:Number(hit.lat),lng:Number(hit.lon)};
    const nearest=candidates.reduce((best,point)=>!best||distance(origin,point)<distance(origin,best)?point:best,null);
    const item={...nearest.tariff,nearest:true,searchedPlace:hit.display_name,distanceKm:distance(origin,nearest)};
    const value=`__nearest__:${item.value}`;
    ctx.nearest={value,item};
    if(ctx.control){
      for(const key of Object.keys(ctx.control.options))if(key.startsWith('__nearest__:'))ctx.control.removeOption(key,true);
      ctx.control.addOption({value,text:`(가장 가까운 지역) ${item.name}`});ctx.control.setValue(value,true);ctx.control.close();
    }else{
      for(const option of [...ctx.select.options])if(option.value.startsWith('__nearest__:'))option.remove();
      ctx.select.add(new Option(`(가장 가까운 지역) ${item.name}`,value));ctx.select.value=value;
    }
    cancel();ctx.onChoose(item);
    status.textContent=`${hit.display_name} → ${item.name} · 직선거리 약 ${Math.round(item.distanceKm).toLocaleString()}km`;
    const credit=document.createElement('a');credit.href='https://www.openstreetmap.org/copyright';credit.target='_blank';credit.rel='noopener noreferrer';credit.textContent=' © OpenStreetMap';status.appendChild(credit);
    } catch(error){if(current!==version||context!==ctx)return;status.textContent=error.name==='AbortError'?'가까운 지역 조회 시간이 초과되었습니다.':`가까운 지역 조회 실패: ${error.message}`;}
    finally{clearTimeout(timer);if(current===version){request=null;busy=false;ctx.button.disabled=false;ctx.button.textContent='검색';}}
  }
  function attach(options){
    reset();const panel=document.createElement('div');panel.className='nearest-location-search';
    const label=document.createElement('label');label.htmlFor='nearestLocationInput';label.textContent='목록에 없는 지역 찾기';
    const row=document.createElement('div');row.className='nearest-location-row';
    const input=document.createElement('input');input.id='nearestLocationInput';input.type='search';input.placeholder='지역 또는 주소 입력';input.autocomplete='off';
    const button=document.createElement('button');button.type='button';button.textContent='검색';button.className='nearest-search';
    const list=document.createElement('div');list.className='nearest-location-list';list.setAttribute('aria-label','위치 검색 결과');
    row.append(input,button);panel.append(label,row,list);options.select.parentElement.appendChild(panel);
    const ctx={...options,control:options.select.tomselect,panel,input,button,list};context=ctx;
    button.addEventListener('click',search);
    input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();search();}});
    input.addEventListener('input',()=>{cancel();status.textContent='';});
  }
  window.RateNearest={attach,reset,cancel,resolve:value=>context?.nearest?.value===value?context.nearest.item:null};
})();
