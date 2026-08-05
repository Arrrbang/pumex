/* Floating_box/scripts/btn_back.js */
(function() {
  document.addEventListener('click', (e) => {
    const btnBack = e.target.closest('#btnBackToSearch');
    if (!btnBack) return;

    // 1. 현재 페이지가 원클릭 견적서인지 확인
    const isOneClickQuo = window.location.pathname.includes('one_click_quo.html');
    // 2. 현재 페이지가 최종 견적서(quotation.html)인지 확인
    const isFinalQuo = window.location.pathname.includes('final_quotation');

    if (isOneClickQuo || isFinalQuo) {
      // 💡 원클릭 견적서 및 최종 견적서 페이지 모두 탭 닫기 실행
      window.close();
    } else {
      // 조회 메인 페이지에서는 강제 새로고침
      window.location.reload();
    }
  });
})();