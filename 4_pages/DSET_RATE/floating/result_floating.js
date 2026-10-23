(() => {
  'use strict';
  const base=new URL('.',document.currentScript.src);
  function setup() {
    const result=window.DestRateResult;
    if(!result?.data)return;
    const original=window.DestRateAPI.read(result.query);
    window.PumexFloating.setAction('btnBackToSearch',{label:'조회 화면으로 돌아가기',icon:'icon-back',onClick:()=>window.close()});
    window.PumexFloating.setAction('btnCompare',{label:'다른 업체와 비교하기',icon:'icon-compare',onClick:()=>{
      window.DestComparePopup.open(original,target=>{
        const url=new URL('../result/compare/index.html',base),q=window.DestRateAPI.params(original);
        for(const key of ['company','cargo','portId'])q.set(`b_${key}`,target[key]);
        q.set('aChecks',JSON.stringify(window.DestRateAPI.checkedIds('tableWrap')));
        url.search=q.toString();location.assign(url.href);
      },`${result.data.region} / ${result.data.country}`);
    }});
  }
  document.addEventListener('dest-rate:result-ready',setup);document.addEventListener('pumex:floating-ready',setup);
  setup();
})();
