/* sos.js */
'use strict';

// =========================================================================
// 💡 [대한민국 법정 공휴일 데이터] (2025~2027년 기준, 명절 및 대체휴일 포함)
// =========================================================================
const KOR_HOLIDAYS = [
    // 2025년
    "2025-01-01", "2025-01-28", "2025-01-29", "2025-01-30", "2025-03-01", "2025-03-03", 
    "2025-05-05", "2025-05-06", "2025-06-06", "2025-08-15", "2025-10-03", "2025-10-05", 
    "2025-10-06", "2025-10-08", "2025-10-09", "2025-12-25",
    // 2026년
    "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-01", "2026-03-02",
    "2026-05-05", "2026-05-24", "2026-05-25", "2026-06-06", "2026-08-15", "2026-09-24",
    "2026-09-25", "2026-09-26", "2026-10-03", "2026-10-05", "2026-10-09", "2026-12-25",
    // 2027년
    "2027-01-01", "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09", "2027-03-01",
    "2027-05-05", "2027-05-13", "2027-06-06", "2027-08-15", "2027-08-16", "2027-09-14",
    "2027-09-15", "2027-09-16", "2027-10-03", "2027-10-09", "2027-10-11", "2027-12-25"
];

// 주말(토,일) 및 공휴일 판별 함수
function getDayType(dateString) {
    const d = new Date(dateString);
    const day = d.getDay(); // 0: 일요일, 6: 토요일
    const isWeekend = (day === 0 || day === 6);
    const isHoliday = KOR_HOLIDAYS.includes(dateString);

    return (isWeekend || isHoliday) ? '주말/공휴일' : '평일';
}

// =========================================================================
// 💡 [SOS 요금 백엔드 조회 로직]
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const pdateEl = document.getElementById('q_pdate');
    if (!pdateEl) return;

    // 날짜 달력에서 선택이 완료될 때마다(change 이벤트) 실행
    pdateEl.addEventListener('change', async () => {
        // 1. 선택된 원본 날짜 가져오기 (이전 스텝에서 추가한 data-raw-date 속성 활용)
        const dateVal = pdateEl.getAttribute('data-raw-date');
        if (!dateVal) return;

        // 2. 앞 페이지(index.html)에서 넘어온 세션 데이터 추출
        const savedData = sessionStorage.getItem('finalQuotationData');
        if (!savedData) {
            console.warn('세션에 저장된 견적 데이터가 없습니다.');
            return;
        }
        
        const quotationData = JSON.parse(savedData);
        const cbmVal = parseFloat(quotationData.q_cbm) || 1;
        let typeVal = quotationData.q_container || '20FT';

        // 백엔드 요청 포맷에 맞게 타입 문자열 변환 (20FT -> 20DRY)[cite: 22]
        if (typeVal.includes('20')) typeVal = '20DRY';
        else if (typeVal.includes('40')) typeVal = '40HC';
        else if (typeVal.includes('CON')) typeVal = 'CONSOLE';

        // 3. 주말/공휴일 판별
        const dayType = getDayType(dateVal);

        // 4. 콘솔에 전송할 데이터 정보 출력 시작
        console.group('%c[SOS 데이터 조회 중...]', 'color: #e67e22; font-weight: bold; font-size: 13px;');
        console.log(`📅 선택된 날짜: ${dateVal} (${dayType})`);
        console.log(`📦 컨테이너 타입: ${typeVal}`);
        console.log(`⚖️ 물량(CBM): ${cbmVal}`);

        // 5. 백엔드 API 직접 호출 (sos_api.js 로직 내장)[cite: 25]
        const API_BASE = "https://notion-api-hub.vercel.app";
        try {
            const params = new URLSearchParams({ date: dateVal, type: typeVal, cbm: cbmVal });
            const res = await fetch(`${API_BASE}/api/sos-rate/outbound?${params.toString()}`);
            const data = await res.json();
            
            console.log('📡 API 원본 응답 결과:', data);

            // 6. 결과값 확인 및 콘솔 최종 출력
            if (data && data.ok && data.match && data.match.value != null) {
                const finalSosCost = data.match.value;
                console.log(`%c✅ 최종 계산된 SOS 금액: ${finalSosCost.toLocaleString('en-US')} KRW`, 'color: #27ae60; font-size: 14px; font-weight: bold;');
                
                // 💡 추가된 부분: 값 저장 및 종합 계산 함수 호출
                window.originCosts.sos = finalSosCost;
                if (window.calculateOriginTotal) window.calculateOriginTotal();
                
            } else {
                console.log('%c⚠️ 해당 조건의 SOS 요금 데이터가 존재하지 않습니다 (결과값 0)', 'color: #c0392b; font-weight: bold;');
                
                // 💡 데이터가 없더라도 0으로 업데이트 후 갱신
                window.originCosts.sos = 0;
                if (window.calculateOriginTotal) window.calculateOriginTotal();
            }
        } catch (e) {
            console.error("❌ SOS 자동 계산 중 통신 에러 발생:", e);
        }
        
        console.groupEnd();
    });
});