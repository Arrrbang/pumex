/** 견적 화면용 DEST_RATE 연결 모듈.
 * 기존 CostAPI 메서드 인자를 새 국가 ID/항구 ID 기반 API로 연결합니다.
 * api.js 다음에 로드하며 다른 공통 API에는 영향을 주지 않습니다.
 * POE 값은 항구 페이지 ID, 화면 문구는 PORT NAME, 운임 연계값은 PORT CODE입니다.
 * 비용 계산과 결과의 빈 조건 면제 필터는 /api/dest-rate/table에서 수행합니다.
 */
(function () {
 'use strict';
 const normalizeType=value=>['20FT','20DR','20DRY'].includes(String(value||'').trim().toUpperCase())?'20FT':String(value||'').trim();
 const BASE='https://notion-api-hub.vercel.app';
 const idKey=v=>String(v||'').replace(/-/g,'').toLowerCase();
 const isId=v=>/^[a-f0-9]{32}$/i.test(idKey(v));
 const pending=new Map();
 async function get(path,params){
  const url=BASE+path+(params?'?'+new URLSearchParams(params):'');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{
   const response=await fetch(url,{signal:controller.signal,cache:'no-store'});
   const data=await response.json();
   if(!response.ok||!data.ok)throw new Error(data.error||`조회 실패 (${response.status})`);
   return data;
  }finally{clearTimeout(timer);}
 }
 // Short per-page cache for menu data; rejected requests can be retried. Costs are never cached.
 function menu(path,params){
  const key=path+JSON.stringify(params||{}),entry=pending.get(key);
  if(entry&&entry.until>Date.now())return entry.promise;
  const promise=get(path,params);pending.set(key,{promise,until:Date.now()+30000});
  promise.catch(()=>{if(pending.get(key)?.promise===promise)pending.delete(key);});return promise;
 }
 async function countries(){return (await menu('/api/dest-rate/countries')).countries||[];}
 async function country(value){
  const all=await countries(),matches=all.filter(c=>isId(value)?idKey(c.id)===idKey(value):c.name===value);
  if(matches.length!==1)throw new Error('국가를 다시 선택해 주세요. 대표 DB에서 국가를 정확하게 확인할 수 없습니다.');
  return matches[0];
 }
 async function options(value,stage,params){
  const c=await country(value);
  return (await menu(`/api/dest-rate/countries/${encodeURIComponent(c.id)}/tariff-options`,{stage,...params})).options||[];
 }
 async function ports(c,r,partner,cargo,type){return options(c,'poes',{region:r,company:partner,cargo,type:normalizeType(type)});}
 async function port(c,r,partner,cargo,value,type){
  const all=await ports(c,r,partner,cargo,type);
  const matches=all.filter(p=>isId(value)?idKey(p.id)===idKey(value):p.portCode===value||p.name===value);
  if(matches.length!==1)throw new Error('도착항구를 다시 선택해 주세요. 항구를 하나로 확인할 수 없습니다.');
  return matches[0];
 }
 const plain=rows=>rows.map(o=>({value:o.id,text:o.name}));
 const api={
  async fetchCountries(){return countries();},
  async fetchRegions(value){
   const c=await country(value);
   return (await menu(`/api/dest-rate/countries/${encodeURIComponent(c.id)}/regions`)).regions||[];
  },
  async fetchCompanies(c,r){return plain(await options(c,'companies',{region:r}));},
  async fetchCargoTypes(c,r,partner){return plain(await options(c,'cargo-types',{region:r,company:partner}));},
  async fetchPOEs(c,r,partner,cargo,type){return (await ports(c,r,partner,cargo,type)).map(p=>({value:p.id,text:p.name,portCode:p.portCode}));},
  async fetchContainerTypes(c,r,partner,poe,cargo){
   const rows=await options(c,'container-types',{region:r,company:partner,cargo});
   return [...new Set(rows.map(row=>normalizeType(row.id)))].map(value=>({value,text:value}));
  },
  async fetchCosts(c,r,partner,cargo,type,cbm,poe){
   type=normalizeType(type);
   const n=Number(cbm);
   if(!Number.isInteger(n)||n<1||n>68)throw new Error('CBM은 1~68 사이의 정수로 선택해 주세요.');
   if(!r||!partner||!cargo||!type||!poe)throw new Error('조회 조건을 모두 선택해 주세요.');
   const [selectedCountry,selectedPort]=await Promise.all([country(c),port(c,r,partner,cargo,poe,type)]);
   const data=await get('/api/dest-rate/table',{countryId:selectedCountry.id,region:r,company:partner,cargo,portId:selectedPort.id,type,cbm:String(n)});
   if(!Array.isArray(data.rows)||!data.rows.length)throw new Error('선택한 조건에 해당하는 도착지 비용이 없습니다.');
   return {...data,countryId:selectedCountry.id,portId:selectedPort.id};
  }
 };
 window.DestQuotationAPI=api;
 window.CostAPI={...(window.CostAPI||{}),...api};
})();
