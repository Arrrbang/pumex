// login.js

function redirectToLogin(message) {
  if (message) alert(message);
  localStorage.removeItem('token'); 
  localStorage.removeItem('username'); // 아이디도 확실히 삭제
  // 필요 시 로그인 페이지로 이동 (현재 페이지가 메인이면 리다이렉트 안 함 등의 분기 가능)
  // window.location.href = '...'; 
}

function verifyToken() {
  const token = localStorage.getItem('token'); 
  
  // 1. 토큰이 없으면 그냥 종료 (헤더는 비로그인 상태 유지)
  if (!token) {
    return;
  }

  // 2. 토큰 검증 요청
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
        // [핵심] 검증 성공 시, 아이디를 스토리지에 저장
        if (data.user && data.user.username) {
            localStorage.setItem('username', data.user.username);
            
            // [중요] 헤더가 이미 로드되어 있다면, 즉시 로그인 정보를 표시하도록 강제 호출!
            if (typeof window.initUserHeader === 'function') {
                window.initUserHeader();
            }
        }
      } else {
        // 토큰 만료 등으로 실패 시
        redirectToLogin('세션이 만료되었습니다. 다시 로그인해주세요.');
        // 헤더 갱신 (로그아웃 상태로 변경)
        if (typeof window.initUserHeader === 'function') {
            window.initUserHeader();
        }
      }
    })
    .catch((error) => {
      console.error('Token verification failed:', error);
      // 네트워크 오류 등은 일단 유지하거나 로그아웃 처리
    });
}

// 스크립트 로드 시 즉시 실행
verifyToken();
