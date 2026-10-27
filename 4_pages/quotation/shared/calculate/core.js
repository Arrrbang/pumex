/** Pure shared cost calculations. Tariff row selection and formulas stay on DEST_RATE backend. */
(function(){
 'use strict';
 const containerType=value=>['20FT','20DR','20DRY'].includes(String(value||'').trim().toUpperCase())?'20FT':String(value||'').trim();
 const number=value=>Number.parseFloat(String(value??'').replace(/[^0-9.\-]/g,''))||0;
 function cds(rows,type){return (rows||[]).filter(row=>row.rowType==='CDS').reduce((sum,row)=>sum+number((containerType(type)==='20FT'?(row['20FT']??row['20DR']??row['20DRY']):row[type])),0);}
 function modeType(type,cbm){
  const container=containerType(type||'-').toUpperCase(),consoleType=/CON|LCL/.test(container);
  return `Door to Door / ${container}${consoleType?'':' Single Container'} (${cbm||'-'} CBM)`;
 }
 function sosType(type){return /20/.test(type)?'20DRY':/40/.test(type)?'40HC':/CON|LCL/i.test(type)?'CONSOLE':type;}
 function insurance(amount,rate,currency){
  const value=number(amount),percent=number(rate);
  if(value<=0||percent<=0)return 0;
  const premium=value*(currency==='USD'?1:10000)*percent/100;
  return currency==='USD'?Number(premium.toFixed(2)):Math.round(premium);
 }
 // Shared rate requests; simultaneous card/table calculations reuse the same in-flight promise.
 const rates=new Map();
 async function getRate(base,target='KRW'){
  base=String(base).toUpperCase();target=String(target).toUpperCase();if(base===target)return 1;
  if(!rates.has(base)){
   const request=fetch('https://api.exchangerate-api.com/v4/latest/'+encodeURIComponent(base)).then(async response=>{
    if(!response.ok)throw new Error('환율 조회 실패: '+base);
    const data=await response.json();if(!data.rates)throw new Error('환율 응답 누락: '+base);return data.rates;
   });rates.set(base,request);request.catch(()=>{if(rates.get(base)===request)rates.delete(base);});
  }
  const all=await rates.get(base),rate=all[target];
  if(!Number.isFinite(rate)||rate<=0)throw new Error('환율 누락: '+base+'/'+target);
  return rate;
 }
 window.QuotationCalc={containerType,number,cds,modeType,sosType,insurance,getRate};
})();
