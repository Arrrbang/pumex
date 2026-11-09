/* 단일 결과의 비용 문서 목록과 본문·댓글 팝업 */
(() => {
  'use strict';
  const API='https://notion-api-hub.vercel.app';
  let panel,list,panelStatus,retry,key='',selection,documents=[],listRequest,listVersion=0;
  function tag(name,text){const node=document.createElement(name);if(text!==undefined)node.textContent=text;return node;}
  function safeUrl(value){try{const url=new URL(value);return ['https:','http:','mailto:'].includes(url.protocol)?url.href:null;}catch{return null;}}
  function rich(parent,items=[]) {
    for(const item of items) {
      let node=tag('span',item.plain_text ?? item.text?.content ?? '');const a=item.annotations || {};
      if(a.bold)node.style.fontWeight='700';if(a.italic)node.style.fontStyle='italic';
      if(a.underline||a.strikethrough)node.style.textDecoration=[a.underline?'underline':'',a.strikethrough?'line-through':''].filter(Boolean).join(' ');
      if(a.code){node.style.fontFamily='monospace';node.style.background='#eef2ef';}
      const colors={gray:'#787774',brown:'#9f6b53',orange:'#d9730d',yellow:'#cb912f',green:'#448361',blue:'#337ea9',purple:'#9065b0',pink:'#c14c8a',red:'#d44c47'};
      const backgrounds={gray:'#f1f1ef',brown:'#f4eeee',orange:'#faebdd',yellow:'#fbf3db',green:'#edf3ec',blue:'#e7f3f8',purple:'#f6f3f9',pink:'#faf1f5',red:'#fceeed'};
      const color=a.color||'default';if(color.endsWith('_background'))node.style.backgroundColor=backgrounds[color.replace('_background','')]||'';else if(colors[color])node.style.color=colors[color];
      const href=safeUrl(item.href || item.text?.link?.url);
      if(href){const link=tag('a');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.appendChild(node);node=link;}
      parent.appendChild(node);
    }
  }
  function blocks(parent,nodes) {
    let listType='',listElement;
    for(const block of nodes) {
      const data=block.data || {},type=block.type;
      let node;
      if(type==='bulleted_list_item'||type==='numbered_list_item') {
        const nextType=type==='bulleted_list_item'?'ul':'ol';
        if(listType!==nextType){listElement=tag(nextType);parent.appendChild(listElement);listType=nextType;}
        node=tag('li');rich(node,data.rich_text);listElement.appendChild(node);
      } else {
        listType='';
        if(['paragraph','heading_1','heading_2','heading_3','quote','callout','to_do'].includes(type)) {
          node=tag(type.startsWith('heading_')?`h${Number(type.slice(-1))+1}`:type==='quote'?'blockquote':'p');
          if(type==='to_do')node.appendChild(document.createTextNode(data.checked?'☑ ':'☐ '));rich(node,data.rich_text);
        } else if(type==='toggle') {
          node=tag('details');const summary=tag('summary');rich(summary,data.rich_text);node.appendChild(summary);
        } else if(type==='divider') node=tag('hr');
        else if(type==='code'){node=tag('pre');rich(node,data.rich_text);}
        else if(type==='table')node=tag('table');
        else if(type==='table_row'){
          node=tag('tr');for(const cell of data.cells || []){const td=tag('td');rich(td,cell);node.appendChild(td);}
        } else if(['image','file','pdf','bookmark','embed','link_preview','video'].includes(type)) {
          node=tag('p');const url=safeUrl(data.file?.url || data.external?.url || data.url);
          if(url && type==='image' && /^https?:/.test(url)){const image=tag('img');image.src=url;image.loading='lazy';image.alt=(data.caption || []).map(x=>x.plain_text||'').join('');node.appendChild(image);}
          else if(url){const link=tag('a',data.name || '첨부 내용 열기');link.href=url;link.target='_blank';link.rel='noopener noreferrer';node.appendChild(link);}
          rich(node,data.caption);
        } else if(['column','column_list','synced_block'].includes(type))node=tag('div');
        else node=tag('p',type==='child_database'?'하위 데이터베이스는 노션에서 확인해 주세요.':type==='child_page'?`하위 페이지: ${data.title || ''}`:'이 블록은 노션에서 확인해 주세요.');
        parent.appendChild(node);
      }
      if(block.children?.length)blocks(node,block.children);
    }
  }
  async function request(path,options={}) {
    const r=await fetch(`${API}${path}`,{cache:'no-store',...options});
    let data;try{data=await r.json();}catch{throw Error('서버 응답을 확인하지 못했습니다.');}
    if(!r.ok||!data.ok)throw Error(data.error || '요청에 실패했습니다.');return data;
  }
  function position() {
    if(!panel)return;
    const anchor=document.getElementById('floatingMenu');if(!anchor||anchor.hidden){panel.hidden=true;return;}
    panel.hidden=false;
    const rect=anchor.getBoundingClientRect(),bottom=document.getElementById('currencySection');
    const bottomHeight=bottom&&!bottom.hidden?bottom.getBoundingClientRect().height:100;
    let top=rect.bottom+12,left=rect.left;
    if(innerHeight-top-bottomHeight<150){top=Math.max(12,rect.top);left=rect.right+12;}
    const width=Math.min(rect.width*2,innerWidth-24);
    if(left+width>innerWidth-12)left=Math.max(12,innerWidth-width-12);
    panel.style.left=`${left}px`;panel.style.top=`${top}px`;panel.style.width=`${width}px`;
    panel.style.maxHeight=`${Math.max(100,innerHeight-top-bottomHeight-16)}px`;
  }
  function ensurePanel() {
    if(panel)return;
    panel=tag('aside');panel.className='dest-doc-panel';panel.setAttribute('aria-label','비용 관련 문서');
    panel.appendChild(tag('h2','비용 관련 문서'));
    panelStatus=tag('p');panelStatus.setAttribute('role','status');panel.appendChild(panelStatus);
    list=tag('div');list.className='dest-doc-list';panel.appendChild(list);
    retry=tag('button','다시 조회');retry.type='button';retry.hidden=true;retry.onclick=()=>loadDocuments(true);panel.appendChild(retry);
    document.body.appendChild(panel);position();
    if(window.ResizeObserver){const observer=new ResizeObserver(position);const anchor=document.getElementById('floatingMenu');if(anchor)observer.observe(anchor);}
    window.addEventListener('resize',position);
  }
  async function loadDocuments(force=false) {
    const result=window.DestRateResult;if(!result?.data)return;
    const currentSelection=window.DestRateAPI.read(result.query),nextKey=window.DestRateAPI.params(currentSelection).toString();
    ensurePanel();position();
    if(!force&&key===nextKey)return;key=nextKey;selection=currentSelection;
    listRequest?.abort();listRequest=new AbortController();const activeRequest=listRequest;const current=++listVersion;
    panelStatus.textContent='문서를 조회하고 있습니다…';retry.hidden=true;list.replaceChildren();
    const timer=setTimeout(()=>activeRequest.abort(),60000);
    try {
      const data=await request(`/api/dest-rate/cost-documents?${key}`,{signal:activeRequest.signal});
      if(current!==listVersion)return;documents=data.documents;
      panelStatus.textContent=documents.length?'':'연결된 비용 관련 문서가 없습니다.';
      for(const doc of documents){const button=tag('button');button.type='button';button.className='dest-doc-item';button.appendChild(tag('span',doc.title));if(doc.updated)button.appendChild(tag('time',doc.updated.slice(0,10)));button.onclick=()=>openDocument(doc,{...selection});list.appendChild(button);}
    } catch(e){if(current!==listVersion)return;panelStatus.textContent=e.name==='AbortError'?'조회 시간이 초과되었습니다.':e.message;retry.hidden=false;}
    finally{clearTimeout(timer);position();}
  }
  async function openDocument(doc,context,kind='cost-documents') {
    if(document.getElementById('destDocumentDialog'))return;
    const dialog=tag('dialog');dialog.id='destDocumentDialog';dialog.className='dest-doc-dialog';
    const heading=tag('div');heading.className='doc-heading';heading.appendChild(tag('h2',doc.title));
    const close=tag('button','닫기');close.type='button';heading.appendChild(close);dialog.appendChild(heading);
    const body=tag('div');body.className='doc-body';body.textContent='본문을 불러오고 있습니다…';dialog.appendChild(body);
    let commentList,commentStatus,commentRetry;
    if(kind==='tariff-details') {
      const section=tag('section');section.className='doc-comment-history';section.appendChild(tag('h3','기존 댓글'));
      commentStatus=tag('p','댓글을 불러오고 있습니다…');commentStatus.setAttribute('role','status');section.appendChild(commentStatus);
      commentList=tag('div');commentList.className='doc-comment-list';section.appendChild(commentList);
      commentRetry=tag('button','댓글 다시 불러오기');commentRetry.type='button';commentRetry.hidden=true;commentRetry.onclick=()=>loadComments();section.appendChild(commentRetry);dialog.appendChild(section);
    }
    const form=tag('form');form.className='doc-comments';const label=tag('label','댓글 작성');label.htmlFor='destCommentText';form.appendChild(label);
    const input=tag('textarea');input.id='destCommentText';input.maxLength=10000;input.placeholder='문서에 남길 내용을 입력하세요';form.appendChild(input);
    const getUsername=()=>String(localStorage.getItem('username') || '').trim();
    const note=tag('p');note.className='doc-note';
    note.textContent='작성자: 조회중…';form.appendChild(note);
    const actions=tag('div');actions.className='doc-actions';const link=tag('a','노션에서 열기');link.href=safeUrl(doc.url)||'#';link.target='_blank';link.rel='noopener noreferrer';actions.appendChild(link);
    const submit=tag('button','댓글 등록');submit.type='submit';actions.appendChild(submit);form.appendChild(actions);
    const status=tag('p');status.className='doc-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');form.appendChild(status);dialog.appendChild(form);
    let saving=false;const abort=new AbortController();
    let commentsVersion=0;
    async function loadComments() {
      if(!commentList)return;
      const version=++commentsVersion;commentStatus.textContent='댓글을 불러오고 있습니다…';commentRetry.hidden=true;
      try {
        const query=window.DestRateAPI.params(context);
        const data=await request(`/api/dest-rate/tariff-details/${encodeURIComponent(doc.id)}/comments?${query}`,{signal:abort.signal});
        if(!dialog.isConnected||version!==commentsVersion)return;
        commentList.replaceChildren();const comments=Array.isArray(data.comments)?data.comments:[];
        commentStatus.textContent=comments.length?'':'등록된 페이지 댓글이 없습니다.';
        for(const comment of comments){
          const item=tag('article');item.className='doc-comment-item';
          const header=tag('div');header.className='doc-comment-meta';header.appendChild(tag('strong',comment.created_by?.name||'노션 사용자'));
          if(comment.created_time){const date=tag('time');date.dateTime=comment.created_time;const value=new Date(comment.created_time);date.textContent=Number.isNaN(value.valueOf())?'':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(value);header.appendChild(date);}
          item.appendChild(header);const text=tag('p');rich(text,comment.rich_text||[]);item.appendChild(text);commentList.appendChild(item);
        }
      } catch(e){if(!dialog.isConnected||version!==commentsVersion)return;commentStatus.textContent='댓글 조회 실패: '+(e.name==='AbortError'?'요청이 취소되었습니다.':e.message);commentRetry.hidden=false;}
    }

    let authorVersion=0,authorRequest,authorPromise,authorUsername='',authorName='',authorError='';
    function updateAuthor(force=false) {
      const username=getUsername();
      if(!force && username===authorUsername && authorPromise)return authorPromise;
      const current=++authorVersion;authorRequest?.abort();authorRequest=new AbortController();
      authorUsername=username;authorName='';authorError='';
      if(!username){note.textContent='작성자: 로그인 필요';authorPromise=Promise.resolve('');return authorPromise;}
      note.textContent='작성자: 조회중…';
      authorPromise=(async()=>{
        try {
          const data=await request(`/api/oper-info?pass_id=${encodeURIComponent(username)}`,{signal:authorRequest.signal});
          if(current!==authorVersion||!dialog.isConnected)return '';
          if(getUsername()!==username)return '';
          authorName=data.data?.korean_name || '';
          if(!authorName)throw Error('담당자 이름을 확인할 수 없습니다.');
          note.textContent=`작성자: ${authorName}`;return authorName;
        } catch(e) {
          if(current!==authorVersion||!dialog.isConnected)return '';
          authorError=e.message;note.textContent='작성자: 조회 실패';return '';
        }
      })();
      return authorPromise;
    }
    close.onclick=()=>dialog.close();dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});
    const focus=document.activeElement;
    const syncAuthor=event=>{if(!event || !event.key || event.key==='username')updateAuthor(true);};
    window.addEventListener('storage',syncAuthor);const refreshAuthor=()=>updateAuthor(true);
    window.addEventListener('focus',refreshAuthor);
    dialog.addEventListener('close',()=>{abort.abort();authorRequest?.abort();++authorVersion;window.removeEventListener('storage',syncAuthor);window.removeEventListener('focus',refreshAuthor);dialog.remove();focus?.focus();},{once:true});
    document.body.appendChild(dialog);dialog.showModal();updateAuthor();loadComments();
    form.onsubmit=async e=>{
      e.preventDefault();if(saving)return;const username=getUsername();
      if(!username){status.textContent='로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.';return;}
      const text=input.value.trim();if(!text){status.textContent='댓글 내용을 입력해 주세요.';input.focus();return;}
      saving=true;submit.disabled=true;close.disabled=true;input.disabled=true;status.textContent='댓글을 등록하고 있습니다…';
      // 전송 실패 시 자동 재시도하지 않습니다. 중복 댓글을 방지합니다.
      try{
        status.textContent='작성자 정보를 확인하고 있습니다…';
        const name=await updateAuthor(true);
        if(!name)throw Error(authorError || '작성자 이름을 조회하지 못했습니다.');
        if(getUsername()!==username)throw Error('로그인 정보가 변경되었습니다. 다시 눌러주세요.');
        status.textContent='댓글을 등록하고 있습니다…';
        const response=await request(`/api/dest-rate/${kind}/${encodeURIComponent(doc.id)}/comments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selection:context,text,username})});
        input.value='';note.textContent=`작성자: ${response.author?.korean_name || name}`;
        status.textContent='댓글을 등록했습니다.';
        await loadComments();
      }
      catch(e){status.textContent=`${e.message} 노션에서 등록 여부를 확인한 후 다시 시도해 주세요.`;}
      finally{saving=false;submit.disabled=false;close.disabled=false;input.disabled=false;}
    };
    try{
      const query=window.DestRateAPI.params(context);
      const data=await request(`/api/dest-rate/${kind}/${encodeURIComponent(doc.id)}?${query}`,{signal:abort.signal});
      if(!dialog.isConnected)return;body.replaceChildren();blocks(body,data.blocks);
      if(!data.blocks.length)body.appendChild(tag('p','본문이 비어 있습니다.'));
      if(data.truncated)body.appendChild(tag('p','내용이 길어 일부만 표시했습니다. 전체 내용은 노션에서 확인해 주세요.'));
    }catch(e){if(dialog.isConnected)body.textContent=e.name==='AbortError'?'본문 조회가 취소되었습니다.':e.message;}
  }
  window.DestDocumentPopup={openTariff:(doc,context)=>openDocument(doc,context,'tariff-details')};
  document.addEventListener('dest-rate:result-ready',()=>loadDocuments());
  document.addEventListener('pumex:floating-ready',()=>loadDocuments());
  loadDocuments();
})();
