/* exchange/currency-converter.js (또는 bottom_result_bar.js) */
;(function () {
  'use strict';

  const API_BASE = 'https://api.exchangerate-api.com/v4/latest/';
  const EXTRA_CODES = ['KRW', 'USD', 'EUR', 'JPY', 'CAD', 'SAR', 'IDR'];

  const state = {
    baseCurrency: null,
    currentCurrency: null,
    ratesCache: {},
  };

  function detectBaseCurrency() {
    const t = document.querySelector('table.result-table');
    return t?.dataset.baseCurrency ? t.dataset.baseCurrency.toUpperCase() : null;
  }

  function detectBaseCurrencyFor(wrapperId) {
    const wrap = document.getElementById(wrapperId);
    const t = wrap?.querySelector('table.result-table');
    return t?.dataset.baseCurrency ? t.dataset.baseCurrency.toUpperCase() : null;
  }

  async function ensureRates(base) {
    base = base.toUpperCase();
    if (state.ratesCache[base]) return state.ratesCache[base];

    const res = await fetch(API_BASE + encodeURIComponent(base));
    if (!res.ok) throw new Error('환율 조회 실패: ' + base);
    const json = await res.json();
    state.ratesCache[base] = json.rates || {};
    return state.ratesCache[base];
  }

  function buildOptions(select, base) {
    if (!select || !base) return;
    let html = `<option value="${base}">[기본] ${base}</option>`;
    const extras = EXTRA_CODES.filter(c => c !== base);
    extras.forEach(code => { html += `<option value="${code}">${code}</option>`; });
    select.innerHTML = html;
  }

  function formatCurrency(amount, code) {
    const v = Number(amount) || 0;
    const c = (code || '').toUpperCase();
    if (c === 'USD') return 'USD $ ' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (c === 'EUR') return 'EUR € ' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (c === 'CAD') return 'CAD C$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (c === 'KRW') return 'KRW ₩ ' + v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    if (c === 'SAR') return 'SAR ﷼ ' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (c === 'IDR') return 'IDR Rp ' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (c === 'CNY') return 'CNY ¥ ' + v.toLocaleString('en-USN', { maximumFractionDigits: 2 });
    if (c === 'JPY') return 'JPY ¥ ' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return v.toLocaleString() + (c ? ' ' + c : '');
  }

  // ✨ 통합된 폰트 자동 축소 로직 (메인 및 비교 페이지 모두 제어)
  function adjustDynamicFontSizes() {
    // 1. 합계 금액 폰트 자동 조절
    const totalEls = document.querySelectorAll('.header-total, .partner-total');
    totalEls.forEach(el => {
      const textLength = el.textContent.trim().length;
      const isCompare = el.classList.contains('partner-total');
      let newSize = isCompare ? 2.0 : 3.7; 

      if (isCompare) {
        if (textLength > 16) newSize = 1.3;
        else if (textLength > 13) newSize = 1.5;
        else if (textLength > 10) newSize = 1.7;
      } else {
        if (textLength > 15) newSize = 2.0;
        else if (textLength > 12) newSize = 2.5;
        else if (textLength > 10) newSize = 3.0;
      }
      el.style.setProperty('font-size', `${newSize}rem`, 'important');
    });

    // 2. 환율 텍스트 폰트 자동 조절 (100px 컨테이너 방어용)
    const rateEls = document.querySelectorAll('.currency-rate');
    rateEls.forEach(el => {
      const textLength = el.textContent.trim().length;
      let newSize = 1.1; // 기본 사이즈

      if (textLength > 16) newSize = 0.7;
      else if (textLength > 13) newSize = 0.85;
      else if (textLength > 11) newSize = 0.95;

      el.style.setProperty('font-size', `${newSize}rem`, 'important');
    });
  }

  function updateRateLabel(base, target, rates, labelId = 'currencyRate') {
    const el = document.getElementById(labelId);
    if (!el) return;
    if (!base || !target) { el.textContent = '-'; return; }
    base = base.toUpperCase(); target = target.toUpperCase();
    let rate = 1;
    if (base !== target && rates && rates[target]) rate = rates[target];
    else if (base !== target) { el.textContent = `${base}/${target} -`; return; }
    el.textContent = `${base}/${target} ${rate.toFixed(4)}`;

    // 환율 텍스트가 갱신될 때마다 폰트 자동 조절 실행!
    adjustDynamicFontSizes();
  }

  // 단일 모드 변환 로직
  async function applyConversion(targetCode) {
    const tables = document.querySelectorAll('table.result-table');
    if (!tables.length) return;
    const base = (tables[0].dataset.baseCurrency || '').toUpperCase();
    if (!base) return;

    state.baseCurrency = base;
    state.currentCurrency = targetCode = (targetCode || base).toUpperCase();
    let rates = null;

    if (targetCode !== base) {
      rates = await ensureRates(base);
      if (!rates[targetCode]) { alert(`환율 정보 없음: ${targetCode}`); return; }
    }

    tables.forEach(table => {
      const baseCur = (table.dataset.baseCurrency || base).toUpperCase();
      table.querySelectorAll('td.amt').forEach(td => {
        const baseAmt = Number(td.dataset.baseAmt ?? td.dataset.raw ?? '0') || 0;
        const used = (targetCode !== baseCur && rates) ? baseAmt * rates[targetCode] : baseAmt;
        td.dataset.convertedAmt = used;
        td.textContent = formatCurrency(used, targetCode);
      });

      table.querySelectorAll('input.row-check').forEach(cb => {
        const baseAmt = Number(cb.dataset.baseAmt || '0') || 0;
        const used = (targetCode !== baseCur && rates) ? baseAmt * rates[targetCode] : baseAmt;
        cb.dataset.amt = String(used);
      });

      const valEl = document.getElementById('totalDisplayOne'); 
      if (table.querySelectorAll('input.row-check').length && valEl) {
        let sum = 0;
        table.querySelectorAll('input.row-check').forEach(cb => {
          if (cb.checked) { const v = Number(cb.dataset.amt || '0'); if (Number.isFinite(v)) sum += v; }
        });
        valEl.textContent = formatCurrency(sum, targetCode);
      }
    });

    updateRateLabel(base, targetCode, rates);
    const singleWrap = document.getElementById('tableWrap');
    if (singleWrap && typeof singleWrap._updateTotal === 'function') {
      try { singleWrap._updateTotal(); } catch (e) {}
    }
  }

  // 비교 모드 전용 변환 로직
  async function applyConversionFor(targetCode, wrapperId, labelId) {
    const wrap = document.getElementById(wrapperId);
    if (!wrap) return;
    const table = wrap.querySelector('table.result-table');
    if (!table) return;

    const base = (table.dataset.baseCurrency || '').toUpperCase();
    if (!base) return;

    state.baseCurrency = base;
    state.currentCurrency = targetCode = (targetCode || base).toUpperCase();
    let rates = null;

    if (targetCode !== base) {
      rates = await ensureRates(base);
      if (!rates[targetCode]) return;
    }

    table.querySelectorAll('td.amt').forEach(td => {
      const baseAmt = Number(td.dataset.baseAmt ?? td.dataset.raw ?? '0') || 0;
      const used = (targetCode !== base && rates) ? baseAmt * rates[targetCode] : baseAmt;
      td.dataset.convertedAmt = used;
      td.textContent = formatCurrency(used, targetCode);
    });

    table.querySelectorAll('input.row-check').forEach(cb => {
      const baseAmt = Number(cb.dataset.baseAmt || '0') || 0;
      const used = (targetCode !== base && rates) ? baseAmt * rates[targetCode] : baseAmt;
      cb.dataset.amt = String(used);
    });

    if (typeof wrap._updateTotal === 'function') {
      try { wrap._updateTotal(); } catch (e) {}
    }
    if (labelId) updateRateLabel(base, targetCode, rates, labelId);
  }

  // 현재 활성화된 화면의 통화 상태 적용
  async function applyCurrent() {
    const baseOne = detectBaseCurrencyFor('tableWrap');
    if (baseOne) {
      const select = document.getElementById('currencySelect');
      if (select) {
        buildOptions(select, baseOne); select.value = baseOne; select.disabled = false;
        document.getElementById('currencySection')?.removeAttribute('hidden');
        await applyConversion(baseOne);
      }
    }

    ['A', 'B'].forEach(async (k) => {
      const wrapId = `tableWrap${k}`;
      const base = detectBaseCurrencyFor(wrapId);
      if (base) {
        const sel = document.getElementById(`currencySelect${k}`);
        if (sel) {
          buildOptions(sel, base); sel.value = base; sel.disabled = false;
          await applyConversionFor(base, wrapId, `currencyRate${k}`);
        }
      }
    });
  }

  function init() {
    const select = document.getElementById('currencySelect');
    if (select && !select.dataset.ccBound) {
      const base = detectBaseCurrency();
      if (base) { buildOptions(select, base); select.value = base; document.getElementById('currencySection')?.removeAttribute('hidden'); select.disabled = false; }
      else select.disabled = true;
      select.dataset.ccBound = '1';
      select.addEventListener('change', () => applyConversion(select.value).catch(console.error));
    }

    ['A', 'B'].forEach(k => {
      const sel = document.getElementById(`currencySelect${k}`);
      if (sel && !sel.dataset.ccBound) {
        sel.dataset.ccBound = '1';
        sel.addEventListener('change', () => applyConversionFor(sel.value, `tableWrap${k}`, `currencyRate${k}`).catch?.(console.error));
      }
    });

    // 화면 처음 로딩 시 폰트 조절 한번 실행
    setTimeout(adjustDynamicFontSizes, 100);
  }

  function formatTotal(sum) {
    const select = document.getElementById('currencySelect');
    const code = (select && select.value) ? select.value : (state.currentCurrency || state.baseCurrency);
    return code ? formatCurrency(sum, code) : null;
  }

  function formatTotalForWrapper(sum, wrapperId) {
    if (sum == null) return null;
    let code = null;
    if (wrapperId === 'tableWrapA') code = document.getElementById('currencySelectA')?.value;
    else if (wrapperId === 'tableWrapB') code = document.getElementById('currencySelectB')?.value;
    else code = document.getElementById('currencySelect')?.value;
    
    code = code || state.currentCurrency || state.baseCurrency;
    return code ? formatCurrency(sum, code) : null;
  }

  // 외부 전역 변수 노출
  window.CurrencyConverter = { 
    init, 
    applyCurrent, 
    formatTotal, 
    formatTotalForWrapper, 
    adjustFontSize: adjustDynamicFontSizes 
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();