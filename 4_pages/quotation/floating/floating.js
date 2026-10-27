/* 견적 화면에서 공용 플로팅 메뉴에 필요한 동작을 등록합니다. */
(() => {
  const isLoad=location.pathname.includes('/quotation/load/');
  let loaded=false;
  try { loaded=!!JSON.parse(sessionStorage.getItem('finalQuotationData')||'{}')._notionPageId; } catch (_) {}
  const menu=window.PumexFloating;
  menu.setAction('btnBackToSearch',{label:'조회 화면으로 돌아가기',icon:'icon-back',onClick:()=>{if(isLoad) location.reload(); else window.close();}});
  if(!isLoad || loaded) {
    menu.setAction('btnSaveQuotation',{label:'견적서 출력',icon:'icon-print',onClick:()=>window.print()});
    menu.setAction('btnSaveToNotion',{label:loaded?'노션 덮어쓰기':'노션에 저장',icon:'icon-notion-save'});
  }
  if(isLoad) menu.setAction('btnLoadFromNotion',{label:loaded?'다른 견적 불러오기':'노션에서 불러오기',icon:'icon-notion-load'});
})();
