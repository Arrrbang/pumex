/** 기존 인증 서버 유지. 공통 사용자 모듈의 토큰 검증 완료를 기다릴 수 있도록 Promise 공개. */
function redirectToLogin(message){if(message)alert(message);localStorage.removeItem('token');localStorage.removeItem('username');localStorage.removeItem('userId');sessionStorage.removeItem('profitMarginRate');window.PumexUser?.clear();window.location.href='/pumex/';}
async function verifyToken(){
 const main=location.pathname==='/pumex/'||location.pathname==='/pumex/index.html';
 if(!localStorage.getItem('token')){if(!main)redirectToLogin('로그인이 필요한 페이지입니다.');return null;}
 try{
  if(window.PumexUserReady)await window.PumexUserReady;
  let user;
  if(window.PumexUser)user=await window.PumexUser.verifySession();
  else{const response=await fetch('https://backend-beta-lemon.vercel.app/verifyToken',{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'}});const data=await response.json();if(!response.ok||!data.success)throw Object.assign(Error('세션이 만료되었습니다.'),{status:401});user=data.user;localStorage.setItem('username',user.username);}
  if(typeof window.initUserHeader==='function')window.initUserHeader();return user;
 }catch(e){if(e.status===401||e.status===403)redirectToLogin('세션이 만료되었습니다. 다시 로그인해주세요.');else console.error('로그인 상태를 확인하지 못했습니다.',e);throw e;}
}
window.PumexAuthReady=verifyToken();
// 기존 페이지가 Promise를 구독하지 않아도 처리되지 않은 거절이 발생하지 않도록 합니다.
window.PumexAuthReady.catch(()=>{});
