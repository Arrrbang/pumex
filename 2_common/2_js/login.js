// login.js

function redirectToLogin(message) {
  if (message) alert(message);
  
  // 스토리지 클리어
  localStorage.removeItem('token'); 
  localStorage.removeItem('username');
  localStorage.removeItem('userId'); 

  // ✨ 도메인 주소 싹 빼고 메인 페이지 루트(/pumex/)로만 지정!
  window.location.href = '/pumex/'; 
}

function verifyToken() {
  const token = localStorage.getItem('token'); 
  const currentPath = window.location.pathname; 
  
  // ✨ 현재 경로가 메인 페이지인지 확인할 때도 도메인 없이 폴더 경로만 비교!
  const isMainPage = currentPath === '/pumex/' || currentPath === '/pumex/index.html';

  if (!token) {
    if (!isMainPage) {
      redirectToLogin("로그인이 필요한 페이지입니다.");
    }
    return;
  }

  // 3. 토큰 검증 요청 (API 서버 주소는 외부 통신이므로 https:// 절대경로 유지!)
  fetch('https://backend-beta-lemon.vercel.app/verifyToken', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        if (data.user && data.user.username) {
            localStorage.setItem('username', data.user.username);
            
            if (typeof window.initUserHeader === 'function') {
                window.initUserHeader();
            }
        }
      } else {
        redirectToLogin('세션이 만료되었습니다. 다시 로그인해주세요.');
        
        if (typeof window.initUserHeader === 'function') {
            window.initUserHeader();
        }
      }
    })
    .catch((error) => {
      console.error('Token verification failed:', error);
    });
}

// 스크립트 로드 시 즉시 실행
verifyToken();