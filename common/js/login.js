// login.js

function redirectToLogin(message) {
  if (message) alert(message);
  
  // 스토리지 클리어
  localStorage.removeItem('token'); 
  localStorage.removeItem('username');
  localStorage.removeItem('userId'); // userId도 깔끔하게 삭제

  // [수정 1] 리다이렉션 코드 주석 해제 및 메인 페이지 경로 설정
  // 현재 메인(로그인) 페이지 주소로 이동시킵니다.
  window.location.href = 'https://arrrbang.github.io/pumex/'; 
}

function verifyToken() {
  const token = localStorage.getItem('token'); 
  const currentPath = window.location.pathname; // 현재 경로 확인
  
  // [수정 2] "로그인 페이지가 아닌데 토큰이 없는 경우" 차단 로직 추가
  // 메인 페이지(/pumex/ 또는 /pumex/index.html)가 아닌 곳에 토큰 없이 접근하면 쫓아냅니다.
  // 주의: 로컬 테스트 시 경로가 다를 수 있으니 배포 환경 기준 경로를 확인하세요.
  const isMainPage = currentPath === '/pumex/' || currentPath === '/pumex/index.html';

  if (!token) {
    if (!isMainPage) {
      // 토큰 없이 내부 페이지에 접근 시도 시 강제 로그아웃 처리
      redirectToLogin("로그인이 필요한 페이지입니다.");
    }
    // 메인 페이지라면 토큰이 없어도 괜찮으므로 그냥 종료 (로그인 폼 보여줌)
    return;
  }

  // 3. 토큰 검증 요청
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
        // 검증 성공 시, 아이디 저장 및 헤더 갱신
        if (data.user && data.user.username) {
            localStorage.setItem('username', data.user.username);
            
            if (typeof window.initUserHeader === 'function') {
                window.initUserHeader();
            }
        }
      } else {
        // [수정 3] 토큰 만료/검증 실패 시
        // 기존에는 여기서 redirectToLogin을 호출해도 이동이 안 됐으나, [수정 1] 덕분에 이제 작동함
        redirectToLogin('세션이 만료되었습니다. 다시 로그인해주세요.');
        
        if (typeof window.initUserHeader === 'function') {
            window.initUserHeader();
        }
      }
    })
    .catch((error) => {
      console.error('Token verification failed:', error);
      // 네트워크 에러 시 안전을 위해 로그아웃 처리하거나 유지할지 결정 필요
      // 보안을 위해선 에러 발생 시에도 튕겨내는 것이 안전함
      // redirectToLogin('서버 통신 오류가 발생했습니다.'); 
    });
}

// 스크립트 로드 시 즉시 실행
verifyToken();
