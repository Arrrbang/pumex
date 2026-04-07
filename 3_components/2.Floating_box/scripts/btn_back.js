/* Floating_box/scripts/btn_back.js */
(function() {
  document.addEventListener('click', (e) => {
    const btnBack = e.target.closest('#btnBackToSearch');
    if (!btnBack) return;

    // 현재 페이지가 원클릭 견적서인지 확인
    const isQuoPage = window.location.pathname.includes('one_click_quo.html');

    if (isQuoPage) {
      // 1. 견적서 탭에서는 쿨하게 '창 닫기'
      window.close();
    } else {
      // 2. 조회 메인 페이지에서는 찌꺼기 없는 완벽한 초기화를 위해 '강제 새로고침'
      window.location.reload();
    }
  });
})();