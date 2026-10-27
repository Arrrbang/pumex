(() => {
  'use strict';
  const BASE = 'https://notion-api-hub.vercel.app';
  const status = document.getElementById('selectionStatus');
  const retry = document.getElementById('retryLoad');
  let country = null, region = null, version = 0, controller;
  let retryAction;
  const selected = { company: null, cargo: null, poe: null, container: null, cbm: null };
  let tariffVersion = 0, tariffController;
  function updateVisibility() {
    const visibility = { country: true, region: !!country, company: !!region,
      cargo: !!selected.company, container: !!selected.cargo, poe: !!selected.container, cbm: !!selected.poe };
    for (const [key, visible] of Object.entries(visibility)) document.getElementById(`${key}Field`).hidden = !visible;
    document.getElementById('tariffGroup').hidden = !region;
    document.getElementById('sizeGroup').hidden = !selected.cargo;
    document.getElementById('destQueryButton').hidden = !(country && region && selected.company && selected.cargo && selected.poe && selected.container && selected.cbm);
  }
  function emit() { updateVisibility(); document.dispatchEvent(new CustomEvent('dest-rate:selection-change',{detail:window.DestRate.getSelection()})); }
  window.DestRate = { getSelection: () => JSON.parse(JSON.stringify({country,region,...selected})) };
  function combo(rootId,onChange) {
    const root = document.getElementById(rootId), input = root.querySelector('input'), list = root.querySelector('.list');
    const dropdownOnly = ['companyCombo','cargoCombo','containerCombo','poeCombo'].includes(rootId);
    if (dropdownOnly) {
      input.readOnly = true;
      input.setAttribute('aria-autocomplete','none');
      input.style.cursor = 'pointer';
    }
    let items = [], matches = [], active = -1, selected = null;
    function loading(on) { root.classList.toggle('is-loading',on); root.setAttribute('aria-busy',String(on)); }
    function close() { list.style.display='none'; input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); }
    function paintActive() {
      [...list.children].forEach((node,i) => node.classList.toggle('is-active',i===active));
      if (active>=0) { input.setAttribute('aria-activedescendant',`${rootId}-item-${active}`); list.children[active]?.scrollIntoView({block:'nearest'}); }
    }
    function choose(item,notify=true) { selected=item;input.value=item?.name || '';close();if(notify)onChange(item); }
    function render() {
      const q = dropdownOnly ? '' : input.value.trim().toLocaleLowerCase();
      matches = items.filter(i => !q || i.name.toLocaleLowerCase().includes(q));active=-1;list.replaceChildren();
      for (const [index,item] of matches.entries()) {
        const node=document.createElement('div');node.className='item';node.id=`${rootId}-item-${index}`;node.role='option';node.textContent=item.name;
        node.addEventListener('mousedown',e=>e.preventDefault());node.addEventListener('click',()=>choose(item));list.appendChild(node);
      }
      if (!matches.length) { const node=document.createElement('div');node.className='item';node.textContent='일치하는 항목이 없습니다.';list.appendChild(node); }
      list.style.display='block';input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');
    }
    input.addEventListener('focus',()=>{ if(!input.disabled)render(); });
    // A selected read-only input can be opened again without clearing its value.
    input.addEventListener('click',()=>{ if(dropdownOnly && !input.disabled)render(); });
    input.addEventListener('input',()=>{ if(selected){selected=null;onChange(null);}render(); });
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){close();return;}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();if(list.style.display!=='block')render();
        if(matches.length){active=(active+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;paintActive();}
      } else if(e.key==='Enter'){e.preventDefault();const item=matches[active>=0?active:0];if(item)choose(item);}
    });
    input.addEventListener('blur',close);
    document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))close();});
    return {
      setItems(arr,placeholder){loading(false);items=arr;selected=null;input.value='';input.placeholder=placeholder;input.disabled=!arr.length;close();},
      disable(placeholder){loading(false);items=[];selected=null;input.value='';input.disabled=true;input.placeholder=placeholder;close();},
      setLoading(){items=[];selected=null;input.value='조회중…';input.disabled=true;close();loading(true);},
      chooseById(id){const item=items.find(i=>i.id===id);if(item)choose(item);}
    };
  }
  const regionsCombo=combo('regionCombo',item=>{
    region=item; resetTariff(0); window.DestRateMap?.focusRegion(item);emit();
    if(item) loadTariff(0);
    if(item)status.textContent=item.hasCoordinates?`${item.name} 선택됨`:`${item.name}: 좌표가 없어 지도에 표시할 수 없습니다.`;
  });
  const stages = [
    { key: 'company', stage: 'companies', label: '파트너', prerequisite: '지역' },
    { key: 'cargo', stage: 'cargo-types', label: '화물타입', prerequisite: '파트너' },
    { key: 'container', stage: 'container-types', label: '컨테이너 타입', prerequisite: '화물타입' },
    { key: 'poe', stage: 'poes', label: 'POE', prerequisite: '컨테이너 타입' }
  ];
  const tariffCombos = stages.map((stage,index) => combo(`${stage.key}Combo`, item => {
    selected[stage.key] = stage.key === 'poe' ? item : (item?.name || null);
    resetTariff(index+1); emit();
    if(item && index+1 < stages.length) loadTariff(index+1);
  }));
  const cbmCombo = combo('cbmCombo', item => { selected.cbm = item ? Number(item.id) : null; emit(); });
  cbmCombo.setItems(Array.from({length:68},(_,i) => ({id:String(i+1),name:`${i+1} CBM`})),'CBM 선택');
  function resetTariff(start) {
    ++tariffVersion; tariffController?.abort(); retry.hidden=true;
    selected.cbm=null; cbmCombo.setItems(Array.from({length:68},(_,i)=>({id:String(i+1),name:`${i+1} CBM`})),'CBM 선택');
    for(let i=start;i<stages.length;i++) {
      selected[stages[i].key]=null;
      tariffCombos[i].disable(`${stages[i].prerequisite}을 먼저 선택하세요`);
    }
  }
  async function loadTariff(index) {
    const stage=stages[index], current=++tariffVersion;
    tariffController?.abort(); const abort=new AbortController(); tariffController=abort;
    const timer=setTimeout(()=>abort.abort(),45000);
    tariffCombos[index].setLoading();
    retry.hidden=true; status.textContent=`${stage.label} 목록을 불러오는 중입니다.`;
    const params=new URLSearchParams({stage:stage.stage,region:region.name});
    for(const key of ['company','cargo']) if(selected[key])params.set(key,selected[key]);
    if(selected.container) params.set('type',selected.container);
    try {
      const data=await json(`/api/dest-rate/countries/${encodeURIComponent(country.id)}/tariff-options?${params}`,abort.signal);
      if(current!==tariffVersion)return;
      tariffCombos[index].setItems(data.options,`${stage.label} 선택`);
      status.textContent=data.options.length?`${stage.label} ${data.options.length}개 중 선택하세요.`:`일치하는 ${stage.label}이 없습니다.`;
    } catch(e) {
      if(current!==tariffVersion)return;
      tariffCombos[index].disable(`${stage.label} 로드 실패`);
      error(e.name==='AbortError'?'요청 시간이 초과되었습니다.':e.message,()=>loadTariff(index));
    } finally {clearTimeout(timer);}
  }
  const countryCombo=combo('countryCombo',item=>selectCountry(item));
  async function json(path,signal) {
    const r=await fetch(`${BASE}${path}`,{signal,cache:'no-store'});
    let data;try{data=await r.json();}catch{throw new Error(`서버 응답을 확인해 주세요. (${r.status})`);}
    if(!r.ok||!data.ok)throw new Error(data.error||`조회 실패 (${r.status})`);
    return data;
  }
  function error(message,action){status.textContent=message;retry.hidden=false;retryAction=action;}
  async function selectCountry(item) {
    const current=++version;controller?.abort();country=item;region=null;resetTariff(0);retry.hidden=true;
    window.DestRateMap?.clear();
    if(item) regionsCombo.setLoading(); else regionsCombo.disable('국가를 먼저 선택하세요');
    emit();
    if(!item){status.textContent='국가를 선택하세요.';return;}
    status.textContent=`${item.name}의 배송지역을 불러오는 중입니다.`;
    controller=new AbortController();const localController=controller;
    const timer=setTimeout(()=>localController.abort(),45000);
    try{
      const data=await json(`/api/dest-rate/countries/${encodeURIComponent(item.id)}/regions`,localController.signal);
      if(current!==version)return;
      country=data.country;
      regionsCombo.setItems(data.regions,'배송 지역 선택');window.DestRateMap?.setRegions(country,data.regions);emit();
      status.textContent=data.regions.length?`${data.regions.length}개 지역${data.invalidCoordinateCount?` · 좌표 미등록/오류 ${data.invalidCoordinateCount}개`:''}`:'등록된 배송지역이 없습니다.';
    }catch(e){
      if(current!==version)return;
      regionsCombo.disable('지역 목록 로드 실패');
      error(e.name==='AbortError'?'요청 시간이 초과되었습니다. 다시 시도해 주세요.':e.message,()=>selectCountry(item));
    }finally{clearTimeout(timer);}
  }
  async function loadCountries(){
    countryCombo.setLoading();retry.hidden=true;status.textContent='국가 목록을 불러오는 중입니다.';
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),45000);
    try{const data=await json('/api/dest-rate/countries',abort.signal);countryCombo.setItems(data.countries,'국가 선택');status.textContent=data.countries.length?'국가를 선택하세요.':'대표 DB에 등록된 국가가 없습니다.';}
    catch(e){countryCombo.disable('국가 목록 로드 실패');error(e.name==='AbortError'?'요청 시간이 초과되었습니다.':e.message,loadCountries);}
    finally{clearTimeout(timer);}
  }
  document.addEventListener('dest-rate:map-select',e=>regionsCombo.chooseById(e.detail.id));
  document.getElementById('destQueryButton').addEventListener('click', () => {
    if(!(country && region && selected.company && selected.cargo && selected.poe && selected.container && selected.cbm)) return;
    const url=new URL('../result/single/index.html',window.location.href);
    url.search=new URLSearchParams({countryId:country.id,region:region.name,company:selected.company,
      cargo:selected.cargo,portId:selected.poe.id,type:selected.container,cbm:String(selected.cbm)}).toString();
    window.open(url.href,'_blank','noopener');
  });
  retry.addEventListener('click',()=>retryAction?.());updateVisibility();loadCountries();
})();
