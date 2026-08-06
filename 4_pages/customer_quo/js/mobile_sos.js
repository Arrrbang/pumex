/* mobile_sos.js */
'use strict';

// =========================================================================
// 💡 [대한민국 법정 공휴일 데이터] (2025~2027년 기준)
// =========================================================================
const KOR_HOLIDAYS = [
    "2025-01-01", "2025-01-28", "2025-01-29", "2025-01-30", "2025-03-01", "2025-03-03", 
    "2025-05-05", "2025-05-06", "2025-06-06", "2025-08-15", "2025-10-03", "2025-10-05", 
    "2025-10-06", "2025-10-08", "2025-10-09", "2025-12-25",
    "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-01", "2026-03-02",
    "2026-05-05", "2026-05-24", "2026-05-25", "2026-06-06", "2026-08-15", "2026-09-24",
    "2026-09-25", "2026-09-26", "2026-10-03", "2026-10-05", "2026-10-09", "2026-12-25",
    "2027-01-01", "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09", "2027-03-01",
    "2027-05-05", "2027-05-13", "2027-06-06", "2027-08-15", "2027-08-16", "2027-09-14",
    "2027-09-15", "2027-09-16", "2027-10-03", "2027-10-09", "2027-10-11", "2027-12-25"
];

function getDayType(dateString) {
    const d = new Date(dateString);
    const day = d.getDay(); 
    const isWeekend = (day === 0 || day === 6);
    const isHoliday = KOR_HOLIDAYS.includes(dateString);
    return (isWeekend || isHoliday) ? '주말/공휴일' : '평일';
}

// =========================================================================
// 💡 [모바일 전용 SOS 요금 조회 함수]
// =========================================================================
async function calculateMobileSos() {
    // 1. 세션 데이터 읽어오기 (조건 변경 시 업데이트된 최신 데이터)
    const savedData = sessionStorage.getItem('finalQuotationData');
    if (!savedData) return;
    
    const quotationData = JSON.parse(savedData);
    if (!quotationData.q_pdate) return; // 포장일 없으면 중단

    // 2. 날짜 파싱 (우선적으로 원본 raw 날짜 속성 확인)
    const pdateEl = document.getElementById('q_pdate');
    let dateVal = '';
    if (pdateEl && pdateEl.getAttribute('data-raw-date')) {
        dateVal = pdateEl.getAttribute('data-raw-date');
    } else {
        dateVal = quotationData.q_pdate.substring(0, 10).replace(/\//g, '-');
    }

    const cbmVal = parseFloat(quotationData.q_cbm) || 1;
    let typeVal = quotationData.q_container || '20FT';

    if (typeVal.includes('20')) typeVal = '20DRY';
    else if (typeVal.includes('40')) typeVal = '40HC';
    else if (typeVal.includes('CON')) typeVal = 'CONSOLE';

    const dayType = getDayType(dateVal);

    console.group('%c[모바일 SOS 데이터 재조회 중...]', 'color: #e67e22; font-weight: bold; font-size: 13px;');
    console.log(`📅 날짜: ${dateVal} (${dayType})`);
    console.log(`📦 타입: ${typeVal}`);
    console.log(`⚖️ 물량(CBM): ${cbmVal}`);

    const API_BASE = "https://notion-api-hub.vercel.app";
    try {
        const params = new URLSearchParams({ date: dateVal, type: typeVal, cbm: cbmVal });
        const res = await fetch(`${API_BASE}/api/sos-rate/outbound?${params.toString()}`);
        const data = await res.json();
        
        if (!window.originCosts) window.originCosts = { sos: 0, trc: 0 };

        if (data && data.ok && data.match && data.match.value != null) {
            const finalSosCost = data.match.value;
            console.log(`%c✅ SOS 금액 갱신: ${finalSosCost.toLocaleString('en-US')} KRW`, 'color: #27ae60; font-size: 13px; font-weight: bold;');
            window.originCosts.sos = finalSosCost;
        } else {
            console.log('%c⚠️ 조건에 맞는 SOS 요금 없음 (0 적용)', 'color: #c0392b; font-weight: bold;');
            window.originCosts.sos = 0;
        }
        
        // 💡 조회 후 종합 합산 로직(result_origin.js) 자동 찌르기
        if (window.calculateOriginTotal) window.calculateOriginTotal();
        
    } catch (e) {
        console.error("❌ SOS 자동 계산 에러:", e);
    }
    console.groupEnd();
}

// =========================================================================
// 💡 [이벤트 연결]
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 화면이 처음 열렸을 때 즉시 1회 실행
    calculateMobileSos();

    // 2. 에디터(mode_type_editor.js)에서 보내는 'change' 신호를 받기 위해 대기
    const pdateEl = document.getElementById('q_pdate');
    if (pdateEl) {
        pdateEl.addEventListener('change', calculateMobileSos);
    }
});