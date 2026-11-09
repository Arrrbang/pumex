/* 포워딩별 운임과 컨테이너별 오름차순 정렬 */
(() => {
  'use strict';
  const section=document.getElementById('forwarderRates'),body=document.getElementById('forwarderRateBody');
  const buttons={dr20:document.getElementById('sortForwarder20'),hc40:document.getElementById('sortForwarder40')};
  const headers={dr20:document.getElementById('sortHeader20'),hc40:document.getElementById('sortHeader40')};
  let entries=[],sortField=null;
  const valid=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
  const amount=value=>valid(value)?`$${value.toLocaleString('en-US',{maximumFractionDigits:2})}`:'-';
  function display(){
    for(const key of ['dr20','hc40']){
      headers[key].setAttribute('aria-sort',sortField===key?'ascending':'none');
      buttons[key].querySelector('span').textContent=sortField===key?'▲':'↕';
    }
    const rows=[...entries];
    if(sortField)rows.sort((a,b)=>{
      const av=a.rate[sortField],bv=b.rate[sortField],aOk=valid(av),bOk=valid(bv);
      if(aOk!==bOk)return aOk?-1:1;
      return (aOk?av-bv:0)||a.index-b.index;
    });
    body.replaceChildren();
    for(const {port,forwarder,rate} of rows){
      const tr=document.createElement('tr');
      for(const value of [port,forwarder,rate.carrier||'-',amount(rate.dr20),amount(rate.hc40),rate.validity||'-']){
        const cell=document.createElement('td');cell.textContent=value||'-';tr.appendChild(cell);
      }
      body.appendChild(tr);
    }
    section.hidden=!rows.length;
  }
  for(const key of ['dr20','hc40'])buttons[key].addEventListener('click',()=>{sortField=key;display();});
  function render(ports,byCode){
    entries=[];sortField=null;
    for(const port of ports){
      const unique=new Map();
      for(const code of port.codes||[])for(const rate of byCode.get(code)||[])if(rate.id)unique.set(rate.id,rate);
      const items=[];
      for(const rate of unique.values()){
        const linked=(rate.linkedForwarders||[]).filter(item=>item&&item.id);
        const forwarders=linked.length?[...new Map(linked.map(item=>[item.id,item])).values()]:[{name:rate.forwarder||'-'}];
        for(const forwarder of forwarders)items.push({port:port.name,forwarder:forwarder.name||'-',rate});
      }
      items.sort((a,b)=>a.forwarder.localeCompare(b.forwarder,'ko')||String(a.rate.carrier||'').localeCompare(String(b.rate.carrier||''),'ko')||((a.rate.dr20||Infinity)-(b.rate.dr20||Infinity)));
      for(const item of items)entries.push({...item,index:entries.length});
    }
    display();
  }
  function reset(){entries=[];sortField=null;display();}
  window.RateForwarders={render,reset};
})();
