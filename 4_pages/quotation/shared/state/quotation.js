/** One session contract shared with existing floating/save/load components. */
(function(){
 'use strict';
 if(window.QuotationState)return;
 const KEY='finalQuotationData';
 const mode=location.pathname.includes('/field/')?'field':location.pathname.includes('/load/')?'load':'office';
 function getRaw(){return sessionStorage.getItem(KEY);}
 function get(){try{return JSON.parse(getRaw()||'{}');}catch{return {};}}
 function setRaw(value){sessionStorage.setItem(KEY,String(value));}
 function set(value){setRaw(JSON.stringify(value));return value;}
 function build(params,result,extra={}){
  params={...params,containerType:window.QuotationCalc.containerType(params.containerType)};
  if(!result?.ok||!Array.isArray(result.rows)||!result.rows.length)throw new Error('도착지 비용을 먼저 조회해 주세요.');
  const cds=window.QuotationCalc.cds(result.rows,params.containerType);
  return {...extra,q_location:params.region||'',q_dest_port:result.poe||'',q_dest_port_code:result.portCode||'',
   _countryId:result.countryId,_portId:result.portId,q_cbm:params.cbm||'',q_container:params.containerType||'',
   q_mode_type:window.QuotationCalc.modeType(params.containerType,params.cbm),
   cur_cds:result.currency||'USD',q_destination_amount:cds>0?cds.toLocaleString('en-US'):'',
   _fullSearchParams:{...params,countryId:result.countryId,portId:result.portId},
   _fullResultData:result.rows,_currency:result.currency||'USD',_rawData:result};
 }
 window.QuotationState={mode,getRaw,get,setRaw,set,clear:()=>sessionStorage.removeItem(KEY),build};
})();
