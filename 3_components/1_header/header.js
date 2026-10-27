/** 2단계 드롭다운 + 3단계 우측 플라이아웃. 기존 공지/사용자/수익설정 로직은 유지합니다. */
function setActiveHeaderMenu() {
  const currentPath=window.location.pathname;
  const menus=[
    {id:'menu-destination',paths:['/DEST_RATE/']},
    {id:'menu-sos',paths:['/sos/']},
    {id:'menu-provincial_packing_fee',paths:['/ExternalPackagingCosts/']},
    {id:'menu-quotation',paths:['/quotation/']},
    {id:'menu-operation',paths:['/bookingmail/','/greenlight/','/review-of-destination-proof/']},
    {id:'menu-ocean',paths:['/ratesearch/']},
    {id:'menu-account',paths:['/account/']}
  ];
  menus.forEach(item=>document.getElementById(item.id)?.classList.toggle('always-on',item.paths.some(path=>currentPath.includes(path))));
  document.querySelectorAll('.GNB-Wrapper .menu-item[href]').forEach(link=>{
    if(new URL(link.href,location.href).pathname===currentPath)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
}

function initHeaderNavigation() {
  const root=document.querySelector('.GNB-Wrapper'),nav=root?.querySelector('.site-menu');
  if(!nav||root.hasAttribute('data-menu-ready'))return;
  root.setAttribute('data-menu-ready','true');
  const nodes=[...nav.querySelectorAll('[data-menu-node]')],states=new Map();
  function close(node){
    const state=states.get(node);if(!state)return;
    clearTimeout(state.timer);node.classList.remove('is-open');state.toggle.setAttribute('aria-expanded','false');state.panel.setAttribute('aria-hidden','true');state.panel.inert=true;
    nodes.filter(child=>child!==node&&node.contains(child)).forEach(close);
  }
  function position(node){
    const state=states.get(node);if(!state)return;
    const panel=state.panel;
    if(window.matchMedia('(max-width:1100px)').matches)return;
    if(node.classList.contains('menu-branch')){
      node.classList.remove('opens-left');panel.style.top='-7px';
      panel.style.maxHeight=`${Math.max(100,innerHeight-24)}px`;
      if(panel.getBoundingClientRect().right>innerWidth-12)node.classList.add('opens-left');
      const r=panel.getBoundingClientRect();
      const adjust=r.top<12?12-r.top:r.bottom>innerHeight-12?innerHeight-12-r.bottom:0;
      if(adjust)panel.style.top=`${-7+adjust}px`;
    }else{
      panel.style.left='-12px';const r=panel.getBoundingClientRect();
      const adjust=r.left<12?12-r.left:r.right>innerWidth-12?innerWidth-12-r.right:0;
      if(adjust)panel.style.left=`${-12+adjust}px`;
    }
  }
  function open(node,source='keyboard'){
    const state=states.get(node);if(!state)return;
    const parent=node.parentElement.closest('[data-menu-node]');if(parent)open(parent,source);
    nodes.filter(other=>other!==node&&other.parentElement===node.parentElement).forEach(close);
    clearTimeout(state.timer);state.source=source;node.classList.add('is-open');state.toggle.setAttribute('aria-expanded','true');state.panel.setAttribute('aria-hidden','false');state.panel.inert=false;position(node);
  }
  function scheduleClose(node){const state=states.get(node);clearTimeout(state.timer);state.timer=setTimeout(()=>{if(!node.contains(document.activeElement))close(node);},180);}
  function items(panel){return [...panel.querySelectorAll('a.menu-item, button.submenu-toggle')].filter(item=>item.closest('[data-menu-panel]')===panel&&!item.disabled);}
  function focusItem(node,last=false){const entries=items(states.get(node).panel);(last?entries.at(-1):entries[0])?.focus();}
  nodes.forEach((node,index)=>{
    const toggle=node.querySelector(':scope > [data-menu-toggle]'),panel=node.querySelector(':scope > [data-menu-panel]');if(!toggle||!panel)return;
    toggle.id ||= `gnb-trigger-${index}`;panel.id ||= `gnb-panel-${index}`;
    toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');panel.setAttribute('aria-labelledby',toggle.id);panel.setAttribute('aria-hidden','true');panel.inert=true;
    states.set(node,{toggle,panel,timer:null,source:null});
    node.addEventListener('pointerenter',event=>{if(event.pointerType==='touch'||window.matchMedia('(max-width:1100px)').matches)return;open(node,'hover');});
    node.addEventListener('pointerleave',event=>{if(event.pointerType==='touch'||window.matchMedia('(max-width:1100px)').matches)return;scheduleClose(node);});
    node.addEventListener('focusout',()=>scheduleClose(node));
    toggle.addEventListener('click',event=>{
      event.preventDefault();const state=states.get(node);
      if(node.classList.contains('is-open')&&state.source!=='hover')close(node);else open(node,'click');
    });
  });
  nav.addEventListener('keydown',event=>{
    const target=event.target,node=target.closest('[data-menu-node]'),state=states.get(node);if(!state)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(node);state.toggle.focus();return;}
    if(target===state.toggle&&(event.key==='ArrowDown'||event.key==='ArrowUp'||(event.key==='ArrowRight'&&node.classList.contains('menu-branch')))){
      event.preventDefault();open(node);focusItem(node,event.key==='ArrowUp');return;
    }
    const panel=target.closest('[data-menu-panel]');
    if(event.key==='ArrowLeft'&&panel?.classList.contains('menu-flyout')){
      event.preventDefault();const branch=panel.parentElement;close(branch);states.get(branch)?.toggle.focus();return;
    }
    if(panel&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      const entries=items(panel),index=entries.indexOf(target);if(index<0||!entries.length)return;
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?entries.length-1:(index+(event.key==='ArrowDown'?1:-1)+entries.length)%entries.length;entries[next].focus();
    }
  });
  nav.addEventListener('click',event=>{if(event.target.closest('a.menu-item[href]'))nodes.forEach(close);});
  document.addEventListener('pointerdown',event=>{if(!nav.contains(event.target))nodes.forEach(close);});
  document.addEventListener('focusin',event=>{if(!nav.contains(event.target))nodes.forEach(close);});
  window.addEventListener('resize',()=>nodes.filter(node=>node.classList.contains('is-open')).forEach(position));
}

const NOTICE_API_URL = "https://notion-api-hub.vercel.app/api/notice/list"; 

async function initNoticeRolling() {
  const noticeBox = document.querySelector('.notice-box');
  if (!noticeBox) return;

  try {
    const response = await fetch(NOTICE_API_URL);
    const result = await response.json();

    if (result.ok && result.data.length > 0) {
      const notices = result.data;

      noticeBox.innerHTML = "";

      const container = document.createElement("div");
      container.className = "notice-rolling-container";

      const headerRow = document.createElement("div");
      headerRow.className = "notice-header-row";

      const viewport = document.createElement("div");
      viewport.className = "notice-viewport";

      const roller = document.createElement("div");
      roller.className = "notice-roller";

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "notice-toggle-btn";
      toggleBtn.innerHTML = "▼";

      const fullList = document.createElement("div");
      fullList.className = "notice-full-list";

      const createItemHTML = (item) => {
        const badgeColor = item.category === "공지" ? "#333" : "#0056b3"; 
        return `
          <a href="${item.url}" target="_blank" class="header-notice-item">
            <span class="notice-badge" style="background:${badgeColor};">${item.category}</span>
            <span class="notice-title-text">${item.title}</span>
          </a>
        `;
      };

      notices.forEach(item => {
        const div = document.createElement("div");
        div.style.height = "35px"; 
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.innerHTML = createItemHTML(item);
        roller.appendChild(div);
      });

      notices.forEach(item => {
        const div = document.createElement("div");
        div.innerHTML = createItemHTML(item);
        fullList.appendChild(div);
      });

      viewport.appendChild(roller);
      headerRow.appendChild(viewport);
      headerRow.appendChild(toggleBtn);
      container.appendChild(headerRow);
      container.appendChild(fullList);
      noticeBox.appendChild(container);

      let isExpanded = false;
      let intervalId = null;
      let currentIndex = 0;
      const itemHeight = 35; 

      const startRolling = () => {
        if (roller.children.length === notices.length && notices.length > 1) {
            const clone = roller.children[0].cloneNode(true);
            roller.appendChild(clone);
        }
        
        if (notices.length > 1) {
            intervalId = setInterval(() => {
                currentIndex++;
                roller.style.transition = "top 0.5s ease-in-out";
                roller.style.top = `-${currentIndex * itemHeight}px`;

                if (currentIndex === notices.length) {
                    setTimeout(() => {
                        roller.style.transition = "none";
                        roller.style.top = "0";
                        currentIndex = 0;
                    }, 500);
                }
            }, 3000);
        }
      };

      const stopRolling = () => {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
      };

      startRolling();

      if (notices.length > 1) {
          toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            isExpanded = !isExpanded;

            if (isExpanded) {
                stopRolling();
                toggleBtn.innerHTML = "▲";
                container.classList.add("expanded");
                
                roller.style.transition = "none";
                roller.style.top = "0";
                currentIndex = 0;
            } else {
                toggleBtn.innerHTML = "▼";
                container.classList.remove("expanded");
                
                startRolling();
            }
          });

          document.addEventListener("click", (e) => {
            if (isExpanded && !container.contains(e.target)) {
                toggleBtn.click();
            }
          });
      } else {
          toggleBtn.style.display = "none"; 
      }

    } else {
      noticeBox.innerHTML = '등록된 공지사항이 없습니다.';
      noticeBox.className = 'notice-box empty-state';
    }

  } catch (error) {
    console.error("공지사항 로딩 실패:", error);
  }
}

// 3. 유저 헤더 초기화
function initUserHeader() {
  const userInfoWrap = document.getElementById('userInfoWrap');
  const displayUserId = document.getElementById('displayUserId');
  const btnLogout = document.getElementById('btnLogout');

  if (!userInfoWrap) return;

  const storedUser = localStorage.getItem('username') || localStorage.getItem('userId'); 
  const token = localStorage.getItem('token');

  if (token && storedUser) {
    userInfoWrap.style.display = 'flex';
    if (displayUserId) displayUserId.innerText = `@${storedUser} 님`;
  } else {
    userInfoWrap.style.display = 'none';
  }

  if (btnLogout) {
    const newBtn = btnLogout.cloneNode(true);
    btnLogout.parentNode.replaceChild(newBtn, btnLogout);
    
    newBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      alert('로그아웃 되었습니다.');
      window.location.href = '/pumex/index.html';
    });
  }
}

window.initHeaderNavigation = initHeaderNavigation;
window.setActiveHeaderMenu = setActiveHeaderMenu;
window.initNoticeRolling = initNoticeRolling;
window.initUserHeader = initUserHeader;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
      initHeaderNavigation();
      setActiveHeaderMenu();
      initNoticeRolling();
      initUserHeader();
  });
} else {
  initHeaderNavigation();
  setActiveHeaderMenu();
  initNoticeRolling();
  initUserHeader();
}

function loadTabletProfitMarginScript() {
  if (!document.getElementById('tablet-profit-script')) {
    const script = document.createElement('script');
    script.id = 'tablet-profit-script';
    // 📁 실제 저장하신 tablet_profit_margin.js의 경로에 맞춰 지정해 주세요
    script.src = '/pumex/4_pages/quotation/shared/calculate/profit.js';
    document.body.appendChild(script);
  }
}
loadTabletProfitMarginScript();
// One navigation tree moves between desktop bar and mobile drawer. No duplicate IDs or menu copies.
(function initResponsiveHeader(){
 const root=document.querySelector('.GNB-Wrapper');if(!root||root.dataset.responsiveReady)return;
 root.dataset.responsiveReady='true';
 const mq=matchMedia('(max-width:1100px)'),drawer=root.querySelector('#m-sidebar'),overlay=root.querySelector('#m-overlay'),openBtn=root.querySelector('#m-menu-open'),closeBtn=root.querySelector('#m-menu-close');
 const nav=root.querySelector('.site-menu'),user=root.querySelector('#userInfoWrap'),gear=root.querySelector('#m-header-gear-btn');
 const anchors=new Map();[nav,user,gear].filter(Boolean).forEach(el=>{const marker=document.createComment('responsive header slot');el.before(marker);anchors.set(el,marker);});
 let previousFocus=null,previousOverflow='',opened=false;
 const focusables=()=>[...drawer.querySelectorAll('a[href],button:not([disabled])')].filter(el=>el.getClientRects().length&&!el.closest('[inert]'));
 function close(restore=true){
  if(!opened)return;opened=false;drawer.hidden=true;overlay.hidden=true;drawer.inert=true;openBtn.setAttribute('aria-expanded','false');document.body.style.overflow=previousOverflow;
  if(restore&&previousFocus?.isConnected)previousFocus.focus();
 }
 function open(){if(!mq.matches||opened)return;opened=true;previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;drawer.hidden=false;overlay.hidden=false;drawer.inert=false;openBtn.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';closeBtn.focus();}
 function layout(){close(false);
  root.querySelectorAll('[data-menu-node]').forEach(node=>{node.classList.remove('is-open');node.querySelector(':scope > [data-menu-toggle]')?.setAttribute('aria-expanded','false');const panel=node.querySelector(':scope > [data-menu-panel]');if(panel){panel.inert=true;panel.setAttribute('aria-hidden','true');}});
  if(mq.matches){document.getElementById('m-nav-slot').append(nav);if(user)document.getElementById('m-user-slot').append(user);if(gear)document.getElementById('m-gear-slot').append(gear);}
  else{for(const el of [nav,user,gear])if(el)anchors.get(el).after(el);}
 }
 openBtn.addEventListener('click',open);root.querySelector('#m-user-icon').addEventListener('click',open);closeBtn.addEventListener('click',()=>close());overlay.addEventListener('click',()=>close());
 drawer.addEventListener('click',e=>{if(e.target.closest('a[href]'))close(false);});
 document.addEventListener('keydown',e=>{if(!opened)return;if(e.key==='Escape'){e.preventDefault();close();}else if(e.key==='Tab'){const all=focusables(),first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 mq.addEventListener('change',layout);drawer.inert=true;layout();
})();
