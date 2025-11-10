function redirectToLogin(message) {
  alert(message);
  localStorage.removeItem('token'); 
  window.location.href = '../index.html'; 
}

function verifyToken() {
  const token = localStorage.getItem('token'); 
  if (!token) {
    redirectToLogin('로그인이 해제되었습니다. 다시 로그인해주세요.');
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
      if (!data.success) {
        redirectToLogin('로그인이 해제되었습니다. 다시 로그인해주세요.');
      }
    })
    .catch(() => {
      redirectToLogin('Error verifying token. Redirecting to login page.');
    });
}


    verifyToken();
