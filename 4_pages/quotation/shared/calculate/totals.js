/** One total/rate engine, with small adapters for office tables and field cards. */
(function(){
 'use strict';let revision=0;
 const calc=window.QuotationCalc;
 function entries(section,field){
  if(field)return [...section.querySelectorAll('.m-li-amount')].filter(el=>!el.closest('li')||getComputedStyle(el.closest('li')).display!=='none').map(el=>{
   const spans=el.querySelectorAll('span');return {currency:spans[0]?.textContent,amount:spans[1]?.textContent};
  });
  return [...section.querySelectorAll('tbody tr')].filter(row=>!row.classList.contains('section-header-row')&&row.style.display!=='none').flatMap(row=>{
   const amount=row.querySelector('.text-right'),currency=row.querySelector('td.text-center');
   return amount?[{amount:amount.tagName==='INPUT'?amount.value:amount.textContent,currency:currency?(['INPUT','SELECT'].includes(currency.tagName)?currency.value:currency.textContent):'KRW'}]:[];
  });
 }
 async function total(rows){
  let sum=0;
  for(const row of rows){
   const currency=(row.currency||'KRW').trim().toUpperCase();const amount=calc.number(row.amount);
   if(!amount)continue;
   sum+=amount*await calc.getRate(!currency||currency==='CUR'?'KRW':currency,'KRW');
  }return sum;
 }
 function output(id,text){const el=document.getElementById(id);if(!el)return;if(el.tagName==='INPUT')el.value=text;else el.textContent=text;}
 async function calculateAllTotals(){
  const current=++revision,field=window.QuotationState.mode==='field';
  const sections=[...document.querySelectorAll(field?'.m-cost-card':'.quote-cost-table')];
  const ids=['q_origin_total','q_destination_total','q_irc_total'];
  try{
   const values=await Promise.all(ids.map((id,index)=>sections[index]?total(entries(sections[index],field)):0));
   if(current!==revision)return;
   values.forEach((value,index)=>output(ids[index],Math.round(value).toLocaleString('en-US')));
   output('q_final_total_converted',(field?'':'KRW   ')+Math.round(values.reduce((sum,value)=>sum+value,0)).toLocaleString('en-US'));
  }catch(error){
   if(current!==revision)return;
   ids.forEach(id=>output(id,'조회 실패'));output('q_final_total_converted','환율 조회 실패');console.error(error);
  }
 }
 window.calculateAllTotals=calculateAllTotals;
 function init(){
  const selector='.quote-cost-table,.m-cost-card';
  for(const event of ['input','change'])document.addEventListener(event,e=>{if(e.target.closest(selector))calculateAllTotals();});
  document.addEventListener('click',e=>{if(e.target.closest('.add-row-btn,.remove-row-btn'))setTimeout(calculateAllTotals,50);});
  calculateAllTotals();setTimeout(calculateAllTotals,500);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
