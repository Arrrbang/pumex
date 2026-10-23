/* DEST_RATE에서만 사용하는 비교 선택 팝업. 원래 CBM·컨테이너를 유지해 비교합니다. */
(() => {
  'use strict';
  const base=new URL('.',document.currentScript.src);
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('compare_popup.css',base);document.head.appendChild(style);
  window.DestComparePopup={open(original,onSubmit,context=''){
    if(document.getElementById('destCompareDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='destCompareDialog';dialog.className='compare-popup-dialog';
    dialog.innerHTML='<form><h2>비교할 업체 선택</h2><p class="fixed-context"></p><label for="cmpCompanyInput">업체</label><select id="cmpCompanyInput" disabled></select><label for="cmpCargoInput">화물타입</label><select id="cmpCargoInput" disabled></select><label for="cmpPortInput">도착항구</label><select id="cmpPortInput" disabled></select><p class="popup-status" role="status" aria-live="polite"></p><div class="popup-actions"><button type="button" class="popup-cancel">취소</button><button type="submit" disabled>비교하기</button></div></form>';
    document.body.appendChild(dialog);
    const originFocus=document.activeElement;
    const form=dialog.querySelector('form'),company=dialog.querySelector('#cmpCompanyInput'),cargo=dialog.querySelector('#cmpCargoInput'),port=dialog.querySelector('#cmpPortInput'),submit=dialog.querySelector('[type=submit]'),status=dialog.querySelector('.popup-status');
    dialog.querySelector('.fixed-context').textContent=`${context || original.region} · ${original.cbm} CBM / ${original.type}`;
    let version=0,abort,choice={...original,company:'',cargo:'',portId:''};
    function fill(select,items,placeholder){select.replaceChildren(new Option(placeholder,''));for(const item of items)select.add(new Option(item.name,item.id));select.disabled=!items.length;}
    function reset(select,text){fill(select,[],text);}
    reset(company,'조회중…');reset(cargo,'업체를 선택하세요');reset(port,'화물타입을 선택하세요');
    function dispose(){++version;abort?.abort();dialog.remove();originFocus?.focus();}
    dialog.addEventListener('cancel',e=>{e.preventDefault();dispose();});dialog.querySelector('.popup-cancel').onclick=dispose;
    async function load(stage,target) {
      const current=++version;abort?.abort();abort=new AbortController();submit.disabled=true;status.textContent='조회중…';
      try {
        const data=await window.DestRateAPI.options(choice,stage,abort.signal);
        if(current!==version||!dialog.isConnected)return;
        if(stage==='companies') {
          const items=data.options.filter(item=>item.name!==original.company);
          fill(target,items,'업체를 선택하세요');status.textContent=items.length?'':'비교할 다른 업체가 없습니다.';
        } else if(stage==='container-types') {
          const supported=data.options.some(item=>item.name===original.type);
          submit.disabled=!supported;status.textContent=supported?'같은 CBM·컨테이너 조건으로 비교합니다.':`선택한 조건은 ${original.type}를 지원하지 않습니다. 화물타입 또는 항구를 바꿔주세요.`;
        } else {fill(target,data.options,stage==='cargo-types'?'화물타입을 선택하세요':'도착항구를 선택하세요');status.textContent=data.options.length?'':'일치하는 항목이 없습니다.';}
      } catch(e) {
        if(current!==version||!dialog.isConnected)return;
        status.textContent=e.name==='AbortError'?'요청 시간이 초과되었습니다. 다시 선택해 주세요.':e.message;
      }
    }
    company.onchange=()=>{choice.company=company.value;choice.cargo='';choice.portId='';reset(cargo,'업체를 선택하세요');reset(port,'화물타입을 선택하세요');++version;abort?.abort();submit.disabled=true;if(choice.company){reset(cargo,'조회중…');load('cargo-types',cargo);}};
    cargo.onchange=()=>{choice.cargo=cargo.value;choice.portId='';reset(port,'화물타입을 선택하세요');++version;abort?.abort();submit.disabled=true;if(choice.cargo){reset(port,'조회중…');load('poes',port);}};
    port.onchange=()=>{choice.portId=port.value;++version;abort?.abort();submit.disabled=true;if(choice.portId)load('container-types');};
    form.onsubmit=e=>{e.preventDefault();if(submit.disabled||!choice.company||!choice.cargo||!choice.portId)return;const result={...choice};dispose();onSubmit(result);};
    dialog.showModal();load('companies',company);
  }};
})();
