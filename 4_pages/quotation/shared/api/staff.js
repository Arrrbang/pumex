/* sales_info.js */
document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE = 'https://notion-api-hub.vercel.app';

    try {
        const storedUser = localStorage.getItem('username') || localStorage.getItem('userId');

        if (!storedUser) {
            console.warn('로그인된 사용자 정보를 찾을 수 없습니다.');
            return;
        }

        const url = `${API_BASE}/api/sales-info?pass_id=${encodeURIComponent(storedUser)}`;
        const response = await fetch(url);
        const result = await response.json();

        // 💡 [디버깅 로그] 노션에서 실제로 어떤 데이터를 받아왔는지 콘솔에 통째로 출력
        console.log("📌 [Sales Info API 원본 응답 데이터]:", result);

        if (result.ok && result.data) {
            const salesInfo = result.data;

            // 💡 [디버깅 로그] 개별 속성값 확인
            console.log("📌 추출된 직책(position):", salesInfo.position);
            console.log("📌 추출된 한글명(korean_name):", salesInfo.korean_name);

            const englishName = salesInfo.english_name || '';
            const email = salesInfo.email || '';
            const tel = salesInfo.tel || '';
            const dir = salesInfo.dir || '';
            
            const position = salesInfo.position || '';
            const koreanName = salesInfo.korean_name || '';
            
            sessionStorage.setItem('sms_manager_position', position);
            sessionStorage.setItem('sms_manager_name', koreanName);
            sessionStorage.setItem('sms_manager_tel', tel);
            sessionStorage.setItem('sms_manager_email', email);

            const salesNameEl = document.getElementById('sales-name');
            const salesEmailEl = document.getElementById('sales-email');
            const salesTelEl = document.getElementById('sales-tel');
            const salesDirEl = document.getElementById('sales-dir');

            if (salesNameEl && englishName) salesNameEl.textContent = englishName;
            if (salesEmailEl && email) salesEmailEl.textContent = email;
            if (salesTelEl && tel) salesTelEl.textContent = tel;
            if (salesDirEl && dir) salesDirEl.textContent = dir;

        } else {
            console.warn('해당 PASS_ID에 일치하는 영업 담당자 정보를 찾지 못했습니다:', storedUser);
        }

    } catch (error) {
        console.error('영업 담당자 정보를 불러오는 중 오류가 발생했습니다:', error);
    }
});