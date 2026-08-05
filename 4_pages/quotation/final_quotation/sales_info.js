/* sales_info.js */
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE = 'https://notion-api-hub.vercel.app';

    try {
        // 1. localStorage에서 로그인된 사용자 이름/ID 가져오기
        const storedUser = localStorage.getItem('username') || localStorage.getItem('userId');

        if (!storedUser) {
            console.warn('로그인된 사용자 정보를 찾을 수 없습니다. 기본 담당자 정보 유지');
            return;
        }

        console.log('현재 로그인된 사용자 (PASS_ID 조회 대상):', storedUser);

        // 2. 절대 경로로 백엔드 API 호출
        const url = `${API_BASE}/api/sales-info?pass_id=${encodeURIComponent(storedUser)}`;
        console.log('API 요청 URL:', url);

        const response = await fetch(url);
        const result = await response.json();

        console.log('백엔드 응답 결과:', result);

        if (result.ok && result.data) {
            const salesInfo = result.data;

            // 3. 쿼리 결과 속성 매핑 (영문명, E-MAIL, TEL, DIR)
            const englishName = salesInfo.english_name || '';
            const email = salesInfo.email || '';
            const tel = salesInfo.tel || '';
            const dir = salesInfo.dir || '';

            const position = salesInfo.position || '';
            const koreanName = salesInfo.korean_name || '';
            sessionStorage.setItem('sms_manager_position', position);
            sessionStorage.setItem('sms_manager_name', koreanName);
            
            // 4. quotation.html의 HTML 요소에 각각 대입
            const salesNameEl = document.getElementById('sales-name');
            const salesEmailEl = document.getElementById('sales-email');
            const salesTelEl = document.getElementById('sales-tel');
            const salesDirEl = document.getElementById('sales-dir');

            if (salesNameEl && englishName) salesNameEl.textContent = englishName;
            if (salesEmailEl && email) salesEmailEl.textContent = email;
            if (salesTelEl && tel) salesTelEl.textContent = tel;
            if (salesDirEl && dir) salesDirEl.textContent = dir;

            console.log('영업 담당자 정보가 성공적으로 반영되었습니다.');
        } else {
            console.warn('해당 PASS_ID에 일치하는 영업 담당자 정보를 노션에서 찾지 못했습니다:', storedUser);
        }

    } catch (error) {
        console.error('영업 담당자 정보를 불러오는 중 오류가 발생했습니다:', error);
    }
});