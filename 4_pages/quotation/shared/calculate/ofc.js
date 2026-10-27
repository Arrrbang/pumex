/** 견적 공통 해상운임: 새 운임조회와 동일한 booking/rates API 및 평균 규칙.
 * 전체 PORT CODE를 쉼표로 분리하되 BUS/INC/VIA 태그를 보존합니다.
 * POL별로 행 ID를 중복 제거하고 20DR·40HC의 양수 유효값을 각각 평균합니다.
 * 기본운임은 새 rates API, 별도 추가운임은 기존 ofc-costs API(PORT NAME 입력)로 조회합니다.
 */
(function(){
 'use strict';
 const state=window.ofcGlobalState={ofcData:null,extraCosts:[],currency:'USD',validityDate:'',consoleBase:'40HC',ofcDataList:[],extraCostsList:[],status:'loading',error:''};
 function average(rows,key){const numbers=rows.map(row=>row[key]).filter(v=>typeof v==='number'&&Number.isFinite(v)&&v>0);return numbers.length?numbers.reduce((a,b)=>a+b,0)/numbers.length:null;}
 function aggregate(codes,byCode,prefix){
  const unique=new Map();
  for(const code of codes.filter(code=>code.toUpperCase().includes(prefix))){
   for(const row of byCode.get(code)||[]){if(!row.id)throw Error('운임 행 ID가 없습니다.');unique.set(row.id,row);}
  }
  const rows=[...unique.values()];
  return {poeList:codes.filter(code=>code.toUpperCase().includes(prefix)),cost20DR:average(rows,'dr20'),cost40HC:average(rows,'hc40'),currency:'USD',rowCount:rows.length};
 }
 async function load(codes,fetcher=fetch){
  const byCode=new Map();let cursor=0;
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),90000);
  try{
   async function worker(){while(cursor<codes.length){
    const code=codes[cursor++];
    const response=await fetcher('https://notion-api-hub.vercel.app/api/mail/booking/rates?poe='+encodeURIComponent(code),{cache:'no-store',signal:abort.signal});
    const data=await response.json();
    if(!response.ok||!data.ok||!Array.isArray(data.rates))throw Error(data.error||'운임 조회 실패');
    byCode.set(code,data.rates);
   }}
   await Promise.all(Array.from({length:Math.min(3,codes.length)},worker));
   return ['(BUS)','(INC)'].map(prefix=>aggregate(codes,byCode,prefix)).filter(row=>row.poeList.length);
  }catch(error){abort.abort();throw error;}finally{clearTimeout(timer);}
 }
 function amount(data,type,cbm,consoleBase){
  if(!data)return null;
  if(/CON|LCL/.test(type)){const base=consoleBase==='20FT'?data.cost20DR:data.cost40HC;return base===null||base===undefined?null:Math.round(base/(consoleBase==='20FT'?20:50)*cbm);}
  return type.includes('20')?data.cost20DR:type.includes('40')?data.cost40HC:null;
 }
 function extraAmount(item,type){
  const raw=/CON|LCL/.test(type)?item.costCONSOLE:type.includes('20')?item.cost20:type.includes('40')?item.cost40:0;
  const value=Number(raw);return Number.isFinite(value)?value:0;
 }
 function breakdown(type,cbm,base=state.consoleBase){
  const basic=amount(state.ofcData,type,cbm,base);
  const extras=(state.extraCostsList||[]).map(item=>({...item,amount:extraAmount(item,type)}));
  const extraTotal=extras.reduce((sum,item)=>sum+item.amount,0);
  return {basic,extras,extraTotal,total:basic==null?null:basic+extraTotal};
 }
 async function loadExtras(portName,fetcher=fetch){
  if(!portName)throw Error('PORT NAME이 없습니다. 견적 입력부터 다시 조회해 주세요.');
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),90000);
  try{
   const response=await fetcher('https://notion-api-hub.vercel.app/api/ofc/ofc-costs?poe='+encodeURIComponent(portName),{signal:abort.signal,cache:'no-store'});
   const data=await response.json();
   if(!response.ok||!data.ok||!Array.isArray(data.extraCosts))throw Error(data.error||'추가운임 조회 실패');
   const rows=new Map();
   for(const item of data.extraCosts){
    if(!item.id)throw Error('추가운임 행 ID가 없습니다.');
    if(item.currency&&String(item.currency).toUpperCase()!=='USD')throw Error('추가운임 통화를 확인해 주세요. USD 운임과 합산할 수 없습니다.');
    rows.set(item.id,item);
   }
   return [...rows.values()];
  }finally{clearTimeout(timer);}
 }
 function show(text,currency=''){
  const el=document.getElementById('q_freight_amount'),warning=document.getElementById('ofc_warning_container');
  if(el){el.textContent=text;el.classList.add('is-typed');if(warning){el.appendChild(warning);warning.style.display='none';}}
  const cur=document.getElementById('cur_freight');if(cur)cur.textContent=currency;
  window.calculateAllTotals?.();
 }
 window.updateOfcByPrefix=function(prefix){
  state.ofcData=null;
  if(state.status==='loading'){show('운임 조회 중…');return;}
  if(state.status==='error'){show('운임 조회 실패');return;}
  if(!prefix){show('출발항 선택');window.updateOfcWarning?.();return;}
  // An unmatched POL never falls back to another origin's rates.
  const data=state.ofcDataList.find(row=>row.poeList.some(code=>code.toUpperCase().includes(String(prefix).toUpperCase())));
  state.ofcData=data||null;
  const saved=window.QuotationState.get();
  const result=breakdown(String(saved.q_container||'20FT').toUpperCase(),Number(saved.q_cbm)||1).total;
  show(result===null||result===undefined?'등록 운임 없음':result.toLocaleString('en-US',{maximumFractionDigits:2}),result===null||result===undefined?'':'USD');
 };
 async function init(){
  const saved=window.QuotationState.get();
  const raw=saved.q_dest_port_code||saved._rawData?.portCode||'';
  const codes=[...new Set(String(raw).split(',').map(code=>code.trim()).filter(Boolean))];
  try{
   if(!codes.length)throw Error('PORT CODE가 없습니다. 견적 입력 화면부터 다시 조회해 주세요.');
   // setupPolDropdown also wires the shared TRC/POL change event.
   window.setupPolDropdown?.(codes);show('운임 조회 중…');
   const portName=saved._rawData?.poe||saved.q_dest_port||'';
   const [rates,extras]=await Promise.all([load(codes),loadExtras(portName)]);
   state.ofcDataList=rates;state.extraCostsList=extras;state.extraCosts=extras;state.status='ready';
  }catch(error){state.status='error';state.error=error.message;console.error('해상운임 조회 실패:',error);}
  const select=document.getElementById('pol_select');
  const prefix=select?.options[select.selectedIndex]?.getAttribute('data-prefix')||'';
  window.updateOfcByPrefix(prefix);
 }
 window.renderOceanFreight=function(){
  const select=document.getElementById('pol_select');
  window.updateOfcByPrefix(select?.options[select.selectedIndex]?.getAttribute('data-prefix')||'');
 };
 window.QuotationOcean={average,aggregate,load,amount,extraAmount,breakdown,loadExtras};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
