/* ==========================================================================
   inbound_sos_api.js (INBOUND SOS 공용 API 파일)
   ========================================================================== */

// 날짜, 타입, CBM을 넘기면 서버에서 INBOUND 요금 데이터를 받아오는 공용 함수
async function fetchInboundSosRateData(dateVal, typeVal, cbmVal) {
    const API_BASE = "https://notion-api-hub.vercel.app";
    
    try {
        const params = new URLSearchParams({ date: dateVal, type: typeVal, cbm: cbmVal });
        // ✨ 주의: 주소가 /inbound 로 되어있습니다!
        const res = await fetch(`${API_BASE}/api/sos-rate/inbound?${params.toString()}`);
        const data = await res.json();
        return data; 
    } catch (e) {
        console.error("INBOUND SOS API 통신 에러:", e);
        return { ok: false, error: '서버 통신 중 오류가 발생했습니다.' }; 
    }
}