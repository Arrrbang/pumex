/* ==========================================================================
   sos_api.js (원래 SOS 페이지와 원클릭 견적서가 함께 사용할 공통 API 파일)
   ========================================================================== */

// 날짜, 타입, CBM을 넘기면 서버에서 요금 데이터를 받아오는 공용 함수
async function fetchSosRateData(dateVal, typeVal, cbmVal) {
    const API_BASE = "https://notion-api-hub.vercel.app";
    
    try {
        const params = new URLSearchParams({ date: dateVal, type: typeVal, cbm: cbmVal });
        const res = await fetch(`${API_BASE}/api/sos-rate/outbound?${params.toString()}`);
        const data = await res.json();
        return data; // 받아온 결과 전체를 그대로 돌려줌
    } catch (e) {
        console.error("SOS API 통신 에러:", e);
        // 에러가 났을 때도 동일한 양식으로 돌려줌
        return { ok: false, error: '서버 통신 중 오류가 발생했습니다.' }; 
    }
}