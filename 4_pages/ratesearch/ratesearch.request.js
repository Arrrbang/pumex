/* 운임 미등록/조회 실패 시 요청 표 표시. 저장은 백엔드, 이메일 발송은 Notion 자동화 담당. */
(() => {
 'use strict';
 const BASE='https://notion-api-hub.vercel.app', $=id=>document.getElementById(id);
 const section=$('rateRequest'),form=$('rateRequestForm'),button=$('submitRateRequest'),status=$('requestStatus');
 let version=0,controller=null,loading=false,sending=false,submitted=false,username='';
 const login=()=>localStorage.getItem('username')||'';
 async function json(path,options={}){const r=await fetch(BASE+path,options),data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||`요청 처리 실패 (${r.status})`);return data;}
 function reset(){version++;controller?.abort();controller=null;section.hidden=true;}
 async function options(){
  const current=++version;controller?.abort();const abort=new AbortController();controller=abort;const timer=setTimeout(()=>abort.abort(),60000);
  loading=true;button.disabled=true;$('retryRequestOptions').hidden=true;status.textContent='요청 정보를 조회하고 있습니다.';username=login();
  try{
   if(!username)throw Error('로그인 후 운임을 요청해 주세요.');
   const data=await json(`/api/rate/request/options?${new URLSearchParams({username})}`,{signal:abort.signal,cache:'no-store'});
   if(current!==version)return;
   $('requesterName').textContent=data.requester;$('requestDate').textContent=data.requestDate;
   const select=$('requestContainer');select.replaceChildren(new Option('선택하세요',''));data.containers.forEach(name=>select.add(new Option(name,name)));select.disabled=!data.containers.length;
   if(!data.containers.length)throw Error('요청 DB의 컨테이너 타입 선택지를 먼저 등록해 주세요.');
   status.textContent='';loading=false;button.disabled=submitted;
  }catch(e){if(current!==version)return;status.textContent=e.name==='AbortError'?'요청 정보 조회 시간이 초과되었습니다.':e.message;$('retryRequestOptions').hidden=false;}
  finally{clearTimeout(timer);}
 }
 function show({poe,reason}){
  // 입력 도중 같은 요청 화면 재표시로 작성 내용이 지워지지 않도록 보존합니다.
  if(!section.hidden&&!sending&&!submitted){$('requestPoe').value=poe||'';$('requestReason').textContent=reason||'';return;}
  reset();section.hidden=false;$('rateResults').hidden=true;window.RateHistory?.reset();
  $('requestPoe').value=poe||'';$('requestReason').textContent=reason||'';$('requestWorkDate').value='';$('requesterName').textContent='조회중…';$('requestDate').textContent='';
  submitted=false;button.textContent='운임 요청 등록';options();
 }
 form.addEventListener('submit',async(event)=>{
  event.preventDefault();if(sending||submitted||loading||!form.reportValidity())return;
  if(login()!==username){status.textContent='로그인 계정이 변경되었습니다. 요청 정보를 다시 조회해 주세요.';button.disabled=true;$('retryRequestOptions').hidden=false;return;}
  sending=true;button.disabled=true;button.textContent='등록중…';status.textContent='노션에 운임 요청을 등록하고 있습니다.';
  const current=version;
  try{
   const data=await json('/api/rate/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,poe:$('requestPoe').value.trim(),container:$('requestContainer').value,workDate:$('requestWorkDate').value})});
   if(current!==version)return;
   submitted=true;button.textContent='등록 완료';$('requestDate').textContent=data.requestDate;
   status.textContent='노션에 요청을 등록했습니다. 메일 발송은 노션 자동화에서 처리됩니다.';
  }catch(e){if(current!==version)return;status.textContent=`${e.message} 응답이 끊긴 경우 노션 DB에서 등록 여부를 확인한 후 다시 시도해 주세요.`;button.textContent='운임 요청 등록';}
  finally{sending=false;if(current===version)button.disabled=submitted;}
 });
 $('retryRequestOptions').addEventListener('click',options);
 window.RateRequest={show,reset,isVisible:()=>!section.hidden};
})();
