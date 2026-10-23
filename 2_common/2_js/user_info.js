/** 공통 사용자 상태: 별도 인증 서버의 토큰 검증 → 노션 허브의 직원 프로필 조회. */
(() => {
 'use strict';if(window.PumexUser)return;
 const AUTH='https://backend-beta-lemon.vercel.app',HUB='https://notion-api-hub.vercel.app';
 let authTask=null,authToken=null,authUntil=null,profileTask=null,profileToken=null,profileUntil=null;const profiles=new Map();
 function problem(status,message){return Object.assign(Error(message),{status});}
 async function json(url,options={}){const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),30000);try{
  const r=await fetch(url,{...options,signal:abort.signal,cache:'no-store'}),data=await r.json();if(!r.ok||data.ok===false||data.success===false)throw problem(r.status,data.error||data.message||'조회에 실패했습니다.');return data;
 }finally{clearTimeout(timer);}}
 function clear(){authTask=null;authToken=null;authUntil=null;profileTask=null;profileToken=null;profileUntil=null;profiles.clear();sessionStorage.removeItem('profitMarginRate');}
 async function verifySession(){const token=localStorage.getItem('token');if(!token)throw problem(401,'로그인이 필요합니다.');
  if(authTask&&authToken===token&&(authUntil===null||authUntil>Date.now()))return authTask;authToken=token;authUntil=null;
  const task=json(`${AUTH}/verifyToken`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}}).then(data=>{
   if(localStorage.getItem('token')!==token)throw problem(409,'로그인 계정이 변경되었습니다.');
   if(!data.user?.username)throw problem(401,'로그인 사용자 정보가 없습니다.');
   // 만료 시각은 기존 인증 서버가 발급한 검증 결과에서 가져옵니다.
   if(data.user.exp&&Date.now()>=data.user.exp*1000)throw problem(401,'세션이 만료되었습니다.');
   authUntil=data.user.exp?data.user.exp*1000:Date.now()+30000;
   localStorage.setItem('username',data.user.username);return data.user;
  }).catch(e=>{if(authTask===task){authTask=null;authToken=null;}throw e;});authTask=task;return task;
 }
 async function get(passId){const key=String(passId||'').trim();if(!key)throw problem(400,'직원 아이디가 없습니다.');
  const found=profiles.get(key);if(found&&found.until>Date.now())return found.user;
  const data=await json(`${HUB}/api/user-info?${new URLSearchParams({pass_id:key})}`);profiles.set(key,{user:data.data,until:Date.now()+30000});return data.data;
 }
 async function current(){const token=localStorage.getItem('token');if(profileTask&&profileToken===token&&(profileUntil===null||profileUntil>Date.now())&&(authUntil===null||authUntil>Date.now()))return profileTask;profileToken=token;profileUntil=null;
  const task=(async()=>{const session=await verifySession();const user=await get(session.username);
   if(token!==localStorage.getItem('token'))throw problem(409,'로그인 계정이 변경되었습니다.');
   sessionStorage.setItem('profitMarginRate',String(user.profit||0));
   profileUntil=Date.now()+30000;document.dispatchEvent(new CustomEvent('pumex:user-ready',{detail:user}));return user;
  })().catch(e=>{if(profileTask===task){profileTask=null;profileToken=null;}throw e;});profileTask=task;return task;
 }
 async function list(department){const q=new URLSearchParams();if(department)q.set('department',department);const data=await json(`${HUB}/api/user-info/list?${q}`);for(const user of data.data)profiles.set(user.pass_id,{user,until:Date.now()+30000});return data.data;}
 window.PumexUser={verifySession,current,get,list,clear};
 window.addEventListener('storage',event=>{if(event.key==='token'||event.key==='username'||event.key===null)clear();});
})();
