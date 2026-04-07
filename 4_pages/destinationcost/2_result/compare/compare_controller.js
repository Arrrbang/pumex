/* 2_result/compare/compare_controller.js */
window.CompareController = {
  execute: async function(orig, target) {
    const spinner = document.getElementById('compareGlobalSpinner');
    if (spinner) spinner.style.display = 'flex';

    const singlePlaceholder = document.getElementById('single-result-placeholder');
    const resultSec = document.getElementById('resultSection');
    const singleBottomBar = document.getElementById('collapsedSummary'); 
    
    if (singlePlaceholder) singlePlaceholder.style.display = 'none'; 
    if (resultSec) { resultSec.hidden = true; resultSec.classList.remove('show'); }
    if (singleBottomBar) singleBottomBar.hidden = true;

    const comparePlaceholder = document.getElementById('compare-result-placeholder');
    const cmpSec = document.getElementById('resultSectionCompare');
    const compareBottomBar = document.getElementById('compareBottomBar');
    
    if (comparePlaceholder) comparePlaceholder.style.display = 'block'; 
    if (cmpSec) { cmpSec.hidden = false; cmpSec.classList.add('show'); }
    if (compareBottomBar) compareBottomBar.hidden = false;

    const titleA = document.getElementById('titleA');
    const titleB = document.getElementById('titleB');
    if (titleA) titleA.textContent = `[기존] ${orig.company} (${orig.poe})`;
    if (titleB) titleB.textContent = `[비교] ${target.company} (${target.poe})`;

    const btnOneClickA = document.getElementById('btnOneClickA');
    const btnOneClickB = document.getElementById('btnOneClickB');
    if (btnOneClickA) btnOneClickA.textContent = `${orig.company} 원클릭 견적`;
    if (btnOneClickB) btnOneClickB.textContent = `${target.company} 원클릭 견적`;

    try {
      const [resA, resB] = await Promise.all([
        window.CostAPI.fetchCosts(orig.country, orig.region, orig.company, orig.cargo, orig.type, orig.cbm, orig.poe),
        window.CostAPI.fetchCosts(target.country, target.region, target.company, target.cargo, target.type, target.cbm, target.poe)
      ]);

      window.TableRenderer.render('tableWrapA', resA, orig.type, Boolean(orig.region), orig.cbm);
      window.TableRenderer.render('tableWrapB', resB, target.type, Boolean(target.region), target.cbm);

      if(document.getElementById('cmpPartnerA')) document.getElementById('cmpPartnerA').textContent = orig.company;
      if(document.getElementById('cmpPartnerB')) document.getElementById('cmpPartnerB').textContent = target.company;
      if(document.getElementById('cmpRegion')) document.getElementById('cmpRegion').textContent = orig.region || '-';
      if(document.getElementById('cmpCountry')) document.getElementById('cmpCountry').textContent = orig.country || '-';
      if(document.getElementById('cmpCbmType')) document.getElementById('cmpCbmType').textContent = orig.cbm ? `${orig.cbm} CBM / ${orig.type}` : orig.type;

      // ✨ 파트너 A, B 각각의 통화에 맞춰 합계를 구하고 포맷팅하는 로직!
      const setupCalcTotal = (wrapId, displayId, resData) => {
          const wrap = document.getElementById(wrapId);
          const display = document.getElementById(displayId);
          if(!wrap || !display) return;

          const baseCur = (resData?.currency || resData?.currencyCode || 'USD').toUpperCase();

          const updateTotal = () => {
              let sum = 0;
              // 환율 변환기가 적용된 값(convertedAmt)이 있으면 우선 사용!
              wrap.querySelectorAll('tr.row-basic td.amt').forEach(td => {
                  sum += Number(td.dataset.convertedAmt || td.dataset.raw || 0);
              });
              wrap.querySelectorAll('tr.row-extra input.extra-check:checked').forEach(cb => {
                  const td = cb.closest('tr').querySelector('td.amt');
                  sum += Number(td.dataset.convertedAmt || td.dataset.raw || 0);
              });

              // 환율기(CurrencyConverter)가 작동 중이면 전용 포맷 사용, 아니면 기본 통화 심볼 수동 추가
              if (window.CurrencyConverter && window.CurrencyConverter.formatTotalForWrapper) {
                  display.textContent = window.CurrencyConverter.formatTotalForWrapper(sum, wrapId) || '0';
              } else {
                  if (baseCur === 'KRW') display.textContent = '₩' + sum.toLocaleString();
                  else if (baseCur === 'USD') display.textContent = '$' + sum.toLocaleString();
                  else if (baseCur === 'EUR') display.textContent = '€' + sum.toLocaleString();
                  else display.textContent = sum.toLocaleString() + ' ' + baseCur;
              }
          };

          // 환율 변환기가 통화를 바꿀 때 자동으로 호출할 수 있도록 래퍼에 등록!
          wrap._updateTotal = updateTotal; 
          wrap.addEventListener('change', (e) => {
              if(e.target.classList.contains('extra-check')) updateTotal();
          });
          updateTotal();
      };

      setupCalcTotal('tableWrapA', 'totalDisplayA', resA);
      setupCalcTotal('tableWrapB', 'totalDisplayB', resB);

      // 환율 모듈 적용 (이제 여기서 각 테이블의 _updateTotal을 호출해 기호를 달아줍니다!)
      if (window.CurrencyConverter) {
        window.CurrencyConverter.init();
        window.CurrencyConverter.applyCurrent();
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error(err);
      alert('비교 데이터를 가져오는데 실패했습니다.');
    } finally {
      if (spinner) spinner.style.display = 'none';
    }
  }
};