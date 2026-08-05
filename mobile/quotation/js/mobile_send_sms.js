/* mobile_send_sms.js */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        const btnSms = e.target.closest('#btnSendSms');
        if (btnSms) {
            // 고객명과 총 금액 가져오기
            const customerName = document.getElementById('q_customer_name')?.textContent?.trim() || '고객';
            const totalAmt = document.getElementById('q_final_total_converted')?.textContent?.trim() || '0';
            const pol = document.getElementById('pol_select')?.value || '한국';
            const poe = document.getElementById('q_dest_port')?.textContent?.trim() || '도착지';
            
            // 💡 발송될 메시지 내용 세팅 (원하시는 문구로 자유롭게 변경하세요)
            const messageText = `안녕하세요 ${customerName} 고객님, PUMEX 해외이사 견적 안내드립니다.\n\n[견적 요약]\n- 출발: ${pol}\n- 도착: ${poe}\n- 예상 총 비용: ${totalAmt} 원\n\n자세한 사항은 담당자에게 문의해 주시기 바랍니다. 감사합니다.`;
            
            // 스마트폰 OS(아이폰/안드로이드)에 따른 문자 프로토콜 분기 처리
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            let smsUri = `sms:?body=${encodeURIComponent(messageText)}`;
            
            // 아이폰(iOS)의 경우 파라미터 연결자가 '&' 임
            if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
                smsUri = `sms:&body=${encodeURIComponent(messageText)}`;
            }

            // 모바일 문자 앱 호출
            window.location.href = smsUri;
        }
    });
});