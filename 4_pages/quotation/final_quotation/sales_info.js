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

        if (result.ok && result.data) {
            const salesInfo = result.data;

            const englishName = salesInfo.english_name || '';
            const email = salesInfo.email || '';
            const tel = salesInfo.tel || '';
            const dir = salesInfo.dir || '';
            
            // 💡 [핵심] SMS 문자 발송을 위해 한글명과 직책을 세션에 확실히 저장
            const position = salesInfo.position || '';
            const koreanName = salesInfo.korean_name || '';
            sessionStorage.setItem('sms_manager_position', position);
            sessionStorage.setItem('sms_manager_name', koreanName);
            sessionStorage.setItem('sms_manager_tel', tel);
            sessionStorage.setItem('sms_manager_email', email);

            // 화면 요소 매핑 (영문명 표시)
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