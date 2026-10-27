/* 비교 결과 화면의 플로팅 버튼 연결 */
(() => {
  'use strict';
  function setup() {
    const state=window.DestRateComparison,api=window.DestRateAPI;
    if(!state || !window.PumexFloating)return;
    window.PumexFloating.setAction('btnBackToSingle',{
      label:'단일 결과로 돌아가기',icon:'icon-back',onClick:()=>{
        const url=new URL('../single/index.html',location.href),params=api.params(state.original);
        params.set('aChecks',JSON.stringify(api.checkedIds('tableWrapA')));
        url.search=params.toString();location.assign(url.href);
      }
    });
    window.PumexFloating.setAction('btnCompare',{
      label:'비교 업체 변경하기',icon:'icon-compare',disabled:!state.getData(),onClick:()=>{
        const data=state.getData();
        window.DestComparePopup.open(state.original,selection=>state.changeTarget(selection),data?`${data.region} / ${data.country}`:state.original.region);
      }
    });
  }
  document.addEventListener('dest-rate:compare-ready',setup);
  document.addEventListener('pumex:floating-ready',setup);
  setup();
})();
