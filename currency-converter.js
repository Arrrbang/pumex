/* currency-converter.js
 * - 통화 드롭다운 생성
 * - Notion 기본 통화(+ KRW / USD / EUR / CAD) 옵션 제공
 * - 결과 표(.result-table) 금액/합계를 선택 통화로 변환
 * - unified-partners.js 의 renderTableSingle 와 연동
 */
;(function () {
  'use strict';

  const API_BASE = 'https://api.exchangerate-api.com/v4/latest/';
  const EXTRA_CODES = ['KRW', 'USD', 'EUR', 'CAD'];

  const state = {
    baseCurrency: null,      // Notion 에서 온 기본 통화 (예: USD)
    currentCurrency: null,   // 드롭다운에서 선택된 통화
    ratesCache: {},          // { base: { USD:1, EUR:0.86, ... } }
  };

  // ---------------- 공통 유틸 ----------------
  function detectBaseCurrency() {
    const t = document.querySelector('table.result-table');
    const code = t?.dataset.baseCurrency || '';
    return code ? code.toUpperCase() : null;
  }

  function detectBaseCurrencyFor(wrapperId) {
    const wrap = document.getElementById(wrapperId);
    if (!wrap) return null;
    const t = wrap.querySelector('table.result-table');
    const code = t?.dataset.baseCurrency || '';
    return code ? code.toUpperCase() : null;
  }

  async function ensureRates(base) {
    base = base.toUpperCase();
    if (state.ratesCache[base]) return state.ratesCache[base];

    const res = await fetch(API_BASE + encodeURIComponent(base));
    if (!res.ok) throw new Error('환율 조회 실패: ' + base);
    const json = await res.json();
    const rates = json.rates || {};
    state.ratesCache[base] = rates;
    return rates;
  }

  function buildOptions(select, base) {
    const baseCode = base.toUpperCase();
    const used = new Set();

    select.innerHTML = '';

    // [기본] USD 처럼 표시
    const optBase = document.createElement('option');
    optBase.value = baseCode;
    optBase.textContent = `[기본] ${baseCode}`;
    select.appendChild(optBase);
    used.add(baseCode);

    // 나머지 통화 추가 (중복은 스킵)
    EXTRA_CODES.forEach((c) => {
      const up = c.toUpperCase();
      if (used.has(up)) return;
      const o = document.createElement('option');
      o.value = up;
      o.textContent = up;
      select.appendChild(o);
      used.add(up);
    });
  }

  function formatCurrency(amount, code) {
    const v = Number(amount) || 0;
    const c = (code || '').toUpperCase();
    if (c === 'USD') return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (c === 'EUR') return '€' + v.toLocaleString('de-DE', { maximumFractionDigits: 2 });
    if (c === 'CAD') return 'C$' + v.toLocaleString('en-CA', { maximumFractionDigits: 2 });
    if (c === 'KRW') return '₩' + v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    return v.toLocaleString() + (c ? ' ' + c : '');
  }

  function formatCurrency(amount, code) {
    const v = Number(amount) || 0;
    const c = (code || '').toUpperCase();
    if (c === 'USD') return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (c === 'EUR') return '€' + v.toLocaleString('de-DE', { maximumFractionDigits: 2 });
    if (c === 'CAD') return 'C$' + v.toLocaleString('en-CA', { maximumFractionDigits: 2 });
    if (c === 'KRW') return '₩' + v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    return v.toLocaleString() + (c ? ' ' + c : '');
  }

  // 🔹 환율 표시 텍스트 업데이트 (예: USD/EUR 0.9234)
  function updateRateLabel(base, target, rates, labelId = 'currencyRate') {
    const el = document.getElementById(labelId);
    if (!el) return;

    if (!base || !target) {
      el.textContent = '-';
      return;
    }

    base   = base.toUpperCase();
    target = target.toUpperCase();

    let rate = 1;

    if (base === target) {
      rate = 1;
    } else if (rates && rates[target]) {
      rate = rates[target];
    } else {
      // 환율 정보를 못 찾으면 코드만 표시
      el.textContent = `${base}/${target} -`;
      return;
    }

    el.textContent = `${base}/${target} ${rate.toFixed(4)}`;
  }


  // ------------- 실제 변환 로직 -------------
  async function applyConversion(targetCode) {
    const tables = document.querySelectorAll('table.result-table');
    if (!tables.length) return;

    const firstTable = tables[0];
    const base = (firstTable.dataset.baseCurrency || '').toUpperCase();
    if (!base) return;

    state.baseCurrency = base;
    state.currentCurrency = targetCode = (targetCode || base).toUpperCase();

    let rates = null;
    if (targetCode !== base) {
      rates = await ensureRates(base);
      if (!rates[targetCode]) {
        alert(`선택한 통화(${targetCode})에 대한 환율 정보를 찾을 수 없습니다.`);
        return;
      }
    }

    tables.forEach((table) => {
      const baseCur = (table.dataset.baseCurrency || base).toUpperCase();

      // 3열 금액 셀 변환
      const amtCells = table.querySelectorAll('td.amt');
      amtCells.forEach((td) => {
        const baseAmt = Number(td.dataset.baseAmt ?? td.dataset.raw ?? '0') || 0;
        let used = baseAmt;

        if (targetCode !== baseCur && rates) {
          const r = rates[targetCode];
          used = baseAmt * r;
        }

        td.dataset.convertedAmt = used;
        td.textContent = formatCurrency(used, targetCode);
      });

      // 체크박스 데이터 갱신 (합계 계산용)
      const checkboxes = table.querySelectorAll('input.row-check');
      checkboxes.forEach((cb) => {
        const baseAmt = Number(cb.dataset.baseAmt || '0') || 0;
        let used = baseAmt;

        if (targetCode !== baseCur && rates) {
          const r = rates[targetCode];
          used = baseAmt * r;
        }

        cb.dataset.amt = String(used);
      });

      // 선택 합계 다시 계산
      const totalBox = table.parentElement?.querySelector('.result-total');
      const valEl = totalBox?.querySelector('.result-total-value');
      if (totalBox && valEl) {
        let sum = 0;
        checkboxes.forEach((cb) => {
          if (cb.checked) {
            const v = Number(cb.dataset.amt || '0');
            if (Number.isFinite(v)) sum += v;
          }
        });
        valEl.textContent = formatCurrency(sum, targetCode);
      }
    });
    updateRateLabel(base, targetCode, rates);
  }

  // ------------- 특정 래퍼(#tableWrapA / #tableWrapB)만 변환 -------------
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
      if (!rates[targetCode]) {
        alert(`선택한 통화(${targetCode})에 대한 환율 정보를 찾을 수 없습니다.`);
        return;
      }
    }

    // 🔹 table 하나만 변환 (기존 로직 그대로)
    const amtCells = table.querySelectorAll('td.amt');
    amtCells.forEach((td) => {
      const baseAmt = Number(td.dataset.baseAmt ?? td.dataset.raw ?? '0') || 0;
      let used = baseAmt;

      if (targetCode !== base && rates) {
        const r = rates[targetCode];
        used = baseAmt * r;
      }

      td.dataset.convertedAmt = used;
      td.textContent = formatCurrency(used, targetCode);
    });

    const checkboxes = table.querySelectorAll('input.row-check');
    checkboxes.forEach((cb) => {
      const baseAmt = Number(cb.dataset.baseAmt || '0') || 0;
      let used = baseAmt;

      if (targetCode !== base && rates) {
        const r = rates[targetCode];
        used = baseAmt * r;
      }

      cb.dataset.amt = String(used);
    });

    const totalBox = table.parentElement?.querySelector('.result-total');
    const valEl   = totalBox?.querySelector('.result-total-value');
    if (totalBox && valEl) {
      let sum = 0;
      checkboxes.forEach((cb) => {
        if (cb.checked) {
          const v = Number(cb.dataset.amt || '0');
          if (Number.isFinite(v)) sum += v;
        }
      });
      valEl.textContent = formatCurrency(sum, targetCode);
    }

    // 🔹 A/B 전용 환율 텍스트 갱신
    if (labelId) {
      updateRateLabel(base, targetCode, rates, labelId);
    }
  }



  // 드롭다운 현재 값으로 다시 적용 (새 조회 후 호출)
  function applyCurrent() {
    const hasA = document.querySelector('#tableWrapA table.result-table');
    const hasB = document.querySelector('#tableWrapB table.result-table');
    const selA = document.getElementById('currencySelectA');
    const selB = document.getElementById('currencySelectB');

    if (hasA && hasB && selA && selB) {
      const baseA = detectBaseCurrencyFor('tableWrapA');
      const baseB = detectBaseCurrencyFor('tableWrapB');

      if (baseA) {
        buildOptions(selA, baseA);
        selA.value = baseA;
        applyConversionFor(selA.value, 'tableWrapA', 'currencyRateA');
        selA.disabled = false;
      } else {
        selA.disabled = true;
      }

      if (baseB) {
        buildOptions(selB, baseB);
        selB.value = baseB;
        applyConversionFor(selB.value, 'tableWrapB', 'currencyRateB');
        selB.disabled = false;
      } else {
        selB.disabled = true;
      }

      // 단일용 섹션은 여기선 신경 안 써도 됨 (resultSection이 hidden이니까)
      return;
    }

    // 🔹 이하 단일 모드 기존 로직 그대로 유지
    const select = document.getElementById('currencySelect');
    if (!select) return;
    if (!select.value) {
      const base = detectBaseCurrency();
      if (!base) return;
      buildOptions(select, base);
      select.value = base;
    }
    document.getElementById('currencySection')?.removeAttribute('hidden');
    select.disabled = false;
    return applyConversion(select.value);
  }



  function init() {
    // 🔹 단일 모드용 드롭다운
    const select = document.getElementById('currencySelect');
    if (select && !select.dataset.ccBound) {
      const base = detectBaseCurrency();
      if (!base) {
        select.disabled = true;
      } else {
        buildOptions(select, base);
        select.value = base;
        document.getElementById('currencySection')?.removeAttribute('hidden');
        select.disabled = false;
      }

      select.dataset.ccBound = '1';
      select.addEventListener('change', () => {
        applyConversion(select.value).catch(console.error);
      });
    }

    // 🔹 A/B 비교 모드용 드롭다운
        const selA = document.getElementById('currencySelectA');
        if (selA && !selA.dataset.ccBound) {
        selA.dataset.ccBound = '1';
        selA.addEventListener('change', () => {
            applyConversionFor(selA.value, 'tableWrapA', 'currencyRateA').catch?.(console.error);
        });
        }

        const selB = document.getElementById('currencySelectB');
        if (selB && !selB.dataset.ccBound) {
        selB.dataset.ccBound = '1';
        selB.addEventListener('change', () => {
            applyConversionFor(selB.value, 'tableWrapB', 'currencyRateB').catch?.(console.error);
        });
     }
  }



  // unified-partners.js 에서 선택 합계 표시할 때 사용
  function formatTotal(sum /*, type */) {
    const select = document.getElementById('currencySelect');
    const code = (select && select.value) ? select.value : (state.currentCurrency || state.baseCurrency);
    if (!code) return null;
    return formatCurrency(sum, code);
  }

  // 전역 노출
  window.CurrencyConverter = {
    init,
    applyCurrent,
    formatTotal,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
