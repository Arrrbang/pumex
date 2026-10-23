/* 신규 공용 플로팅 메뉴. 구형 2.Floating_box 및 페이지별 업무 로직을 참조하지 않습니다. */
(() => {
  'use strict';
  if(window.PumexFloating) return;
  const base=new URL('.',document.currentScript.src), actions=new Map();
  let menu, fitFrame;
  function fitLabels() {
    if (!menu || menu.hidden) return;
    menu.querySelectorAll('.floating-btn-label').forEach(label => {
      label.classList.remove('is-multiline');
      label.style.fontSize = '';
      const base = parseFloat(getComputedStyle(label).fontSize) || 13.6;
      const minimum = parseFloat(getComputedStyle(menu).getPropertyValue('--floating-min-font')) || 11;
      if (!label.clientWidth) return;
      let size = base;
      while (label.scrollWidth > label.clientWidth + 1 && size > minimum) {
        size = Math.max(minimum, size - 0.5);
        label.style.fontSize = `${size}px`;
      }
      // 최소 글자 크기로도 들어가지 않으면 두 줄로 표시합니다.
      if (label.scrollWidth > label.clientWidth + 1) label.classList.add('is-multiline');
    });
  }
  function scheduleFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(fitLabels);
  }
  window.addEventListener('resize', scheduleFit);
  function render() {
    if(!menu) return;
    menu.replaceChildren();
    for(const [id,action] of actions) {
      if(action.visible===false) continue;
      const button=document.createElement('button');button.id=id;button.type='button';
      button.className=`floating-btn basic-btn ${action.icon || ''}`;
      const label=document.createElement('span');label.className='floating-btn-label';label.textContent=action.label;
      button.appendChild(label);button.title=action.label;button.disabled=!!action.disabled;
      button.addEventListener('click',async()=>{
        try { await action.onClick?.(); } catch(e) { console.error(e); }
      });menu.appendChild(button);
    }
    menu.hidden=!menu.children.length;
    scheduleFit();
  }
  window.PumexFloating={
    setAction(id,action){actions.set(id,action);render();},
    removeAction(id){actions.delete(id);render();},
    clear(){actions.clear();render();}
  };
  async function init() {
    try {
      const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('Floating.css',base);link.onload=scheduleFit;document.head.appendChild(link);
      const r=await fetch(new URL('Floating_box.html',base));if(!r.ok)throw Error('플로팅 메뉴를 불러오지 못했습니다.');
      const template=document.createElement('template');template.innerHTML=await r.text();
      document.body.appendChild(template.content);menu=document.getElementById('floatingMenu');render();
      document.dispatchEvent(new CustomEvent('pumex:floating-ready'));
      if (document.fonts?.ready) document.fonts.ready.then(scheduleFit);
      if (window.ResizeObserver) {
        let lastWidth = 0;
        new ResizeObserver(entries => {
          const width = entries[0].contentRect.width;
          if (width !== lastWidth) { lastWidth=width; scheduleFit(); }
        }).observe(menu);
      }
    } catch(e) {console.error(e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
