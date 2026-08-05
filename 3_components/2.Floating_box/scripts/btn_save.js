/* Floating_box/scripts/btn_save.js */
(function() {
  document.addEventListener('click', (e) => {
    const btnSave = e.target.closest('#btnSaveQuotation');
    if (!btnSave) return;

    // 견적서 출력(인쇄/PDF 출력) 동작 실행
    window.print();
  });
})();