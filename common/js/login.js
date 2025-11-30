/* login.js */

function redirectToLogin(message) {
  alert(message);
  localStorage.removeItem('token'); 
  localStorage.removeItem('username'); // 로그아웃 시 아이디도 삭제
  window.location.href = 'https://arrrbang.github.io/pumex/index.html'; 
}

function verifyToken() {
  const token = localStorage.getItem('token'); 
  if (!token) {
    // 토큰이 없으면 검증할 필요 없이 리턴 (로그인 페이지가 아니면 튕겨내거나 헤더만 비로그인 상태로 둠)
    // 현재 구조상 로그인 페이지가 아니라면 그냥 조용히 리턴하는 게 나을 수도 있습니다.
    // 하지만 보안이 필요한 페이지라면 아래 유지:
    // redirectToLogin('로그인이 필요합니다.'); 
    return;
  }

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
        // [수정] 검증 성공 시, 백엔드에서 받은 username을 스토리지에 저장!
        // 백엔드가 req.user = { username: '...', ... } 형태로 줍니다.
        if (data.user && data.user.username) {
            localStorage.setItem('username', data.user.username);
            
            // 만약 헤더가 이미 로드된 상태라면 즉시 업데이트 (선택사항)
            if (typeof window.initUserHeader === 'function') {
                window.initUserHeader();
            }
        }
      } else {
        redirectToLogin('로그인이 해제되었습니다. 다시 로그인해주세요.');
      }
    })
    .catch((e) => {
      console.error(e);
      // 네트워크 에러 등은 일단 패스하거나 로그아웃 처리
      redirectToLogin('인증 오류가 발생했습니다.');
    });
}

// 페이지 로드 시 실행
verifyToken();
