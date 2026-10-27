/** Shared SOS fetch and update, used by office and field. */
(function(){
 'use strict';let revision=0;
 async function calculateSos(){
  const data=window.QuotationState.get();
  const raw=document.getElementById('q_pdate')?.getAttribute('data-raw-date');
  const date=(raw||data.q_pdate||'').slice(0,10).replace(/\//g,'-');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
  const current=++revision;
  try{
   const params=new URLSearchParams({date,type:window.QuotationCalc.sosType(data.q_container||'20FT'),cbm:data.q_cbm||1});
   const response=await fetch('https://notion-api-hub.vercel.app/api/sos-rate/outbound?'+params);
   const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'SOS 조회 실패');
   if(current!==revision)return;
   window.originCosts ||= {sos:0,trc:0};window.originCosts.sos=result.match?.value??0;
   window.calculateOriginTotal?.();
  }catch(error){if(current===revision)console.error('SOS 조회 실패:',error);}
 }
 window.calculateQuotationSos=calculateSos;
 window.calculateMobileSos=calculateSos;
 function init(){document.getElementById('q_pdate')?.addEventListener('change',calculateSos);calculateSos();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
